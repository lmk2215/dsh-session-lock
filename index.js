/**
 * dsh-session-lock — Host half.
 *
 * Owns the durable lock state so a page-side `localStorage.clear()` cannot
 * unlock anything:
 *
 *   <DSH_HOME>/session-lock/state.json
 *     secret    PBKDF2-SHA256 digest of the unlock password (never the password)
 *     locked    { [sessionId]: true }
 *     prefs     lockNewSessions / hideLockedTitles / coolingHours / restorePolicy
 *     recovery  windows-password registration + the cooling countdown
 *     meta      last unlock, last reset, failed attempts
 *
 * Two local routes on the Harness web server (same origin as the page):
 *
 *   GET  /session-lock/state    → public snapshot (no digest, no salt)
 *   POST /session-lock/action   → one action per call, returns the new snapshot
 *
 * Recovery channels, all optional and all decided by the user in Settings:
 *   old password   change the password (not a recovery channel)
 *   windows login  validated once with .NET `ValidateCredentials` against the
 *                  local machine; only enabled when that call actually succeeds,
 *                  so a machine without a Windows password simply lacks it
 *   cooling        a countdown the user sets when creating/changing the password;
 *                  when it expires the password is cleared
 */
import { mkdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir, tmpdir } from 'node:os';
import { pbkdf2Sync, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { execFile } from 'node:child_process';

export const inject = ['webServer'];

const VERSION = 1;
const ITERATIONS = 120000;
const MAX_BODY = 32 * 1024;
const MAX_FAILURES = 5;
const FAILURE_LOCK_MS = 30 * 1000;
const ROUTE_STATE = '/session-lock/state';
const ROUTE_ACTION = '/session-lock/action';

const COOLING_CHOICES = [1, 6, 24, 72, 168];
/** When restoring an archived conversation asks for the unlock password. */
const RESTORE_POLICIES = ['all', 'locked', 'off'];

function dshHome() {
  return process.env.DSH_HOME || join(homedir(), '.dsh');
}

function statePaths() {
  const dir = join(dshHome(), 'session-lock');
  return { dir, file: join(dir, 'state.json') };
}

function emptyState() {
  return {
    version: VERSION,
    secret: null,
    locked: {},
    prefs: {
      lockNewSessions: false,
      hideLockedTitles: false,
      coolingEnabled: true,
      coolingHours: 24,
      windowsPasswordEnabled: false,
      restorePolicy: 'off',
    },
    recovery: {
      cooling: { startedAt: null, endsAt: null },
      windows: { enabled: false, verifiedAt: null, account: null },
    },
    meta: {
      lastUnlockAt: null,
      lastResetAt: null,
      failedAttempts: 0,
      lockedUntil: null,
      lastSeenAt: null,
      clockJumpAt: null,
    },
  };
}

function normalize(raw) {
  const base = emptyState();
  if (!raw || typeof raw !== 'object') return base;
  const state = base;
  if (raw.secret && typeof raw.secret.hash === 'string' && typeof raw.secret.salt === 'string') {
    state.secret = {
      salt: raw.secret.salt,
      hash: raw.secret.hash,
      iterations: Number(raw.secret.iterations) || ITERATIONS,
      createdAt: Number(raw.secret.createdAt) || null,
    };
  }
  if (raw.locked && typeof raw.locked === 'object') {
    for (const [id, value] of Object.entries(raw.locked)) if (value === true) state.locked[id] = true;
  }
  if (raw.prefs && typeof raw.prefs === 'object') {
    // Migration from the boolean that shipped first.
    if (raw.prefs.restorePolicy === undefined && raw.prefs.restoreNeedsPassword === true) {
      state.prefs.restorePolicy = 'locked';
    }
    for (const key of Object.keys(state.prefs)) {
      const value = raw.prefs[key];
      if (key === 'coolingHours') {
        const hours = Number(value);
        if (COOLING_CHOICES.includes(hours)) state.prefs.coolingHours = hours;
      } else if (key === 'restorePolicy') {
        if (RESTORE_POLICIES.includes(value)) state.prefs.restorePolicy = value;
      } else if (typeof value === 'boolean') {
        state.prefs[key] = value;
      }
    }
  }
  if (raw.recovery && typeof raw.recovery === 'object') {
    const cooling = raw.recovery.cooling;
    if (cooling && typeof cooling === 'object') {
      state.recovery.cooling = {
        startedAt: Number(cooling.startedAt) || null,
        endsAt: Number(cooling.endsAt) || null,
      };
    }
    const windows = raw.recovery.windows;
    if (windows && typeof windows === 'object') {
      state.recovery.windows = {
        enabled: windows.enabled === true,
        verifiedAt: Number(windows.verifiedAt) || null,
        account: typeof windows.account === 'string' ? windows.account : null,
      };
    }
  }
  if (raw.meta && typeof raw.meta === 'object') {
    for (const key of Object.keys(state.meta)) {
      const value = raw.meta[key];
      if (key === 'failedAttempts') state.meta.failedAttempts = Number(value) || 0;
      else if (typeof value === 'number') state.meta[key] = value;
      else if (value === null) state.meta[key] = null;
    }
  }
  return state;
}

/** Serialised read-modify-write over the state file. */
class Store {
  #cache = null;
  #signature = null;
  #queue = Promise.resolve();

  /**
   * The cache is keyed to the file itself, not just to "have I read it once":
   * anything that edits or deletes state.json outside this process (a manual
   * repair, a restore from backup) is picked up on the next read instead of
   * being silently overwritten by a stale in-memory copy.
   */
  async #load() {
    const { file } = statePaths();
    let signature = 'missing';
    try {
      const stats = await stat(file);
      signature = `${stats.mtimeMs}:${stats.size}`;
    } catch {
      signature = 'missing';
    }
    if (this.#cache !== null && this.#signature === signature) return this.#cache;
    if (signature === 'missing') {
      this.#cache = emptyState();
      this.#signature = 'missing';
      return this.#cache;
    }
    try {
      const text = await readFile(file, 'utf8');
      this.#cache = normalize(JSON.parse(text));
    } catch {
      this.#cache = emptyState();
    }
    this.#signature = signature;
    return this.#cache;
  }

  async #save(state) {
    const { dir, file } = statePaths();
    await mkdir(dir, { recursive: true });
    const temporary = `${file}.${randomUUID()}.tmp`;
    await writeFile(temporary, JSON.stringify(state, null, 2), 'utf8');
    try {
      await rename(temporary, file);
    } catch (error) {
      await unlink(temporary).catch(() => {});
      throw error;
    }
    this.#cache = state;
    try {
      const stats = await stat(file);
      this.#signature = `${stats.mtimeMs}:${stats.size}`;
    } catch {
      this.#signature = null;
    }
  }

  /** Run `work(state)` with exclusive access; its return value is the result. */
  run(work) {
    const started = this.#queue.then(async () => {
      const state = await this.#load();
      const before = JSON.stringify(state);
      const result = await work(state);
      if (JSON.stringify(state) !== before) await this.#save(state);
      return result;
    });
    this.#queue = started.then(
      () => undefined,
      () => undefined,
    );
    return started;
  }
}

// ------------------------------------------------------------------ digest --

function digest(password, salt, iterations) {
  return pbkdf2Sync(password, Buffer.from(salt, 'base64'), iterations, 32, 'sha256').toString('base64');
}

function makeSecret(password) {
  const salt = randomBytes(16).toString('base64');
  return { salt, hash: digest(password, salt, ITERATIONS), iterations: ITERATIONS, createdAt: Date.now() };
}

function secretMatches(secret, password) {
  if (!secret || typeof password !== 'string' || password === '') return false;
  const candidate = digest(password, secret.salt, secret.iterations);
  const left = Buffer.from(candidate, 'base64');
  const right = Buffer.from(secret.hash, 'base64');
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

// -------------------------------------------------------------- settlement --

const CLOCK_JUMP_MS = 5 * 60 * 1000;

/**
 * Advance the state to "now": expire a finished cooling period, remember the
 * latest wall clock we saw, and flag (not block) a forward clock jump so the
 * Settings page can show it. A clock change is a real boundary of this design —
 * an operator who can move the system clock can end a cooling period early.
 */
function settle(state, now = Date.now()) {
  const lastSeen = state.meta.lastSeenAt;
  if (typeof lastSeen === 'number' && now > lastSeen + CLOCK_JUMP_MS) {
    state.meta.clockJumpAt = now;
  }
  if (typeof lastSeen !== 'number' || now > lastSeen) state.meta.lastSeenAt = now;

  const cooling = state.recovery.cooling;
  if (cooling.endsAt !== null && now >= cooling.endsAt) {
    state.secret = null;
    state.locked = {};
    state.recovery.cooling = { startedAt: null, endsAt: null };
    state.meta.lastResetAt = now;
    state.meta.failedAttempts = 0;
    state.meta.lockedUntil = null;
    return { reset: true };
  }
  return { reset: false };
}

function publicState(state, extras = {}) {
  const cooling = state.recovery.cooling;
  const now = Date.now();
  return {
    version: state.version,
    hasSecret: state.secret !== null,
    secretCreatedAt: state.secret ? state.secret.createdAt : null,
    locked: state.locked,
    prefs: state.prefs,
    cooling: {
      active: cooling.endsAt !== null,
      startedAt: cooling.startedAt,
      endsAt: cooling.endsAt,
      remainingMs: cooling.endsAt === null ? 0 : Math.max(cooling.endsAt - now, 0),
    },
    recovery: {
      windowsPasswordEnabled: state.recovery.windows.enabled,
      windowsVerifiedAt: state.recovery.windows.verifiedAt,
      windowsAccount: state.recovery.windows.account,
    },
    meta: {
      lastUnlockAt: state.meta.lastUnlockAt,
      lastResetAt: state.meta.lastResetAt,
      failedAttempts: state.meta.failedAttempts,
      lockedUntil: state.meta.lockedUntil,
      clockJumpAt: state.meta.clockJumpAt,
    },
    account: process.env.USERNAME || process.env.USER || null,
    coolingChoices: COOLING_CHOICES,
    ...extras,
  };
}

// --------------------------------------------------------------- windows pw --

/**
 * Validate a Windows account password for the current user with .NET's
 * `PrincipalContext('Machine').ValidateCredentials`. This is the only check
 * that answers "does this person know this machine's login password".
 *
 * The password travels on the child's stdin, never on its command line.
 * A Microsoft-account or passwordless machine simply fails here — which is
 * exactly why the channel stays disabled until one verification succeeds.
 */
async function validateWindowsPassword(password) {
  const script = `
$ErrorActionPreference = 'Stop'
$pw = [Console]::In.ReadLine()
try {
  Add-Type -AssemblyName System.DirectoryServices.AccountManagement | Out-Null
  $context = New-Object System.DirectoryServices.AccountManagement.PrincipalContext('Machine')
  $ok = $context.ValidateCredentials($env:USERNAME, $pw)
  if ($ok) { [Console]::Out.WriteLine('OK'); exit 0 }
  [Console]::Out.WriteLine('REJECTED'); exit 2
} catch {
  [Console]::Out.WriteLine('ERROR ' + $_.Exception.GetType().Name + ': ' + $_.Exception.Message)
  exit 3
}
`;
  const file = join(tmpdir(), `dsh-session-lock-${randomUUID()}.ps1`);
  await writeFile(file, script, 'utf8');
  try {
    const output = await new Promise((resolve) => {
      const child = execFile(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', file],
        { timeout: 20000, windowsHide: true },
        (error, stdout) => resolve({ error, stdout: String(stdout || '').trim() }),
      );
      if (child.stdin) {
        child.stdin.end(`${password}\n`);
      }
    });
    if (output.stdout === 'OK') return { ok: true };
    if (output.stdout === 'REJECTED') return { ok: false, reason: 'rejected' };
    return { ok: false, reason: 'unsupported', detail: output.stdout.slice(0, 300) };
  } finally {
    await unlink(file).catch(() => {});
  }
}

// ------------------------------------------------------------------ actions --

class Failure extends Error {
  constructor(message, code = 'action-failed') {
    super(message);
    this.code = code;
  }
}

/**
 * Apply the cooling choice made inside the password dialog: 0 disables the
 * channel, a positive choice of COOLING_CHOICES arms it for that many hours,
 * and an omitted value leaves the current preference untouched.
 */
function applyCoolingChoice(state, value) {
  if (value === undefined || value === null) return;
  const hours = Number(value);
  if (hours === 0) {
    state.prefs.coolingEnabled = false;
    return;
  }
  if (!COOLING_CHOICES.includes(hours)) throw new Failure('bad-cooling-hours', 'bad-pref');
  state.prefs.coolingHours = hours;
  state.prefs.coolingEnabled = true;
}

function requirePassword(state, password) {
  if (!state.secret) throw new Failure('no-password-set', 'no-secret');
  if (typeof password !== 'string' || password === '') throw new Failure('password-required', 'password-required');
  if (state.meta.lockedUntil && Date.now() < state.meta.lockedUntil) {
    throw new Failure('too-many-attempts', 'rate-limited');
  }
  if (!secretMatches(state.secret, password)) {
    state.meta.failedAttempts += 1;
    if (state.meta.failedAttempts >= MAX_FAILURES) {
      state.meta.failedAttempts = 0;
      state.meta.lockedUntil = Date.now() + FAILURE_LOCK_MS;
    }
    throw new Failure('wrong-password', 'wrong-password');
  }
  state.meta.failedAttempts = 0;
  state.meta.lockedUntil = null;
  return true;
}

async function runAction(store, body) {
  const action = typeof body.action === 'string' ? body.action : '';
  return store.run(async (state) => {
    settle(state);

    switch (action) {
      case 'secret.create': {
        const password = String(body.password || '');
        if (state.secret) throw new Failure('already-set', 'already-set');
        if (password.length < 4) throw new Failure('password-too-short', 'too-short');
        state.secret = makeSecret(password);
        // No password existed, so any lock flag is a leftover nobody could open.
        state.locked = {};
        applyCoolingChoice(state, body.coolingHours);
        return publicState(state, { ok: true });
      }

      case 'secret.import': {
        // First-run migration of what the earlier page-local build kept in
        // localStorage. Either half may be absent: a digest without locks, or
        // locks without a digest (the user never set a password back then).
        const hasDigest = typeof body.salt === 'string' && typeof body.hash === 'string';
        const hasLocks = body.locked && typeof body.locked === 'object' && Object.keys(body.locked).length > 0;
        if (!hasDigest && !hasLocks) throw new Failure('nothing-to-import', 'bad-import');
        // Idempotent: a repeated migration must not fail just because the digest
        // is already in place — it still has lock flags to merge.
        if (hasDigest && !state.secret) {
          state.secret = {
            salt: body.salt,
            hash: body.hash,
            iterations: Number(body.iterations) || ITERATIONS,
            createdAt: Date.now(),
          };
        }
        if (hasLocks) {
          for (const [id, value] of Object.entries(body.locked)) if (value === true) state.locked[id] = true;
        }
        return publicState(state, { ok: true });
      }

      case 'secret.change': {
        requirePassword(state, body.oldPassword);
        const password = String(body.newPassword || '');
        if (password.length < 4) throw new Failure('password-too-short', 'too-short');
        state.secret = makeSecret(password);
        state.meta.failedAttempts = 0;
        applyCoolingChoice(state, body.coolingHours);
        return publicState(state, { ok: true });
      }

      case 'secret.verify': {
        requirePassword(state, body.password);
        state.meta.lastUnlockAt = Date.now();
        return publicState(state, { ok: true });
      }

      case 'lock.set': {
        const sessionId = String(body.sessionId || '');
        if (sessionId === '') throw new Failure('no-session', 'no-session');
        if (body.locked === false) delete state.locked[sessionId];
        else state.locked[sessionId] = true;
        return publicState(state, { ok: true });
      }

      case 'lock.many': {
        const ids = Array.isArray(body.sessionIds) ? body.sessionIds : [];
        let changed = 0;
        for (const id of ids) {
          if (typeof id === 'string' && id !== '' && state.locked[id] !== true) {
            state.locked[id] = true;
            changed += 1;
          }
        }
        return publicState(state, { ok: true, changed });
      }

      case 'lock.clear': {
        requirePassword(state, body.password);
        state.locked = {};
        state.meta.lastUnlockAt = Date.now();
        return publicState(state, { ok: true });
      }

      case 'prefs.set': {
        const patch = body.patch && typeof body.patch === 'object' ? body.patch : {};
        for (const [key, value] of Object.entries(patch)) {
          if (key === 'coolingHours') {
            const hours = Number(value);
            if (!COOLING_CHOICES.includes(hours)) throw new Failure('bad-cooling-hours', 'bad-pref');
            state.prefs.coolingHours = hours;
          } else if (key === 'restorePolicy') {
            if (!RESTORE_POLICIES.includes(value)) throw new Failure('bad-restore-policy', 'bad-pref');
            state.prefs.restorePolicy = value;
          } else if (typeof state.prefs[key] === 'boolean' && typeof value === 'boolean') {
            state.prefs[key] = value;
          }
        }
        // The Windows channel only exists while a verification is on record; a
        // request to switch it on without one is refused, switching it off clears it.
        if (state.prefs.windowsPasswordEnabled && !state.recovery.windows.enabled) {
          state.prefs.windowsPasswordEnabled = false;
          throw new Failure('windows-password-not-registered', 'not-registered');
        }
        if (state.prefs.windowsPasswordEnabled === false && state.recovery.windows.enabled) {
          state.recovery.windows = { enabled: false, verifiedAt: null, account: null };
        }
        return publicState(state, { ok: true });
      }

      case 'recovery.windows.register': {
        const password = String(body.password || '');
        if (password === '') throw new Failure('password-required', 'password-required');
        const outcome = await validateWindowsPassword(password);
        if (!outcome.ok) {
          state.recovery.windows = { enabled: false, verifiedAt: null, account: null };
          state.prefs.windowsPasswordEnabled = false;
          return publicState(state, {
            ok: false,
            error: outcome.reason,
            detail: outcome.detail || null,
          });
        }
        state.recovery.windows = {
          enabled: true,
          verifiedAt: Date.now(),
          account: process.env.USERNAME || null,
        };
        state.prefs.windowsPasswordEnabled = true;
        return publicState(state, { ok: true });
      }

      case 'recovery.windows.disable': {
        state.recovery.windows = { enabled: false, verifiedAt: null, account: null };
        state.prefs.windowsPasswordEnabled = false;
        return publicState(state, { ok: true });
      }

      case 'recovery.windows.reset': {
        if (!state.recovery.windows.enabled) throw new Failure('channel-disabled', 'channel-disabled');
        const password = String(body.password || '');
        const outcome = await validateWindowsPassword(password);
        if (!outcome.ok) {
          return publicState(state, { ok: false, error: outcome.reason, detail: outcome.detail || null });
        }
        const next = String(body.newPassword || '');
        if (next.length < 4) throw new Failure('password-too-short', 'too-short');
        state.secret = makeSecret(next);
        state.locked = {};
        state.recovery.cooling = { startedAt: null, endsAt: null };
        state.meta.lastResetAt = Date.now();
        state.meta.failedAttempts = 0;
        return publicState(state, { ok: true });
      }

      case 'recovery.cooling.start': {
        if (!state.prefs.coolingEnabled) throw new Failure('channel-disabled', 'channel-disabled');
        if (state.recovery.cooling.endsAt !== null && Date.now() < state.recovery.cooling.endsAt) {
          return publicState(state, { ok: true, alreadyRunning: true });
        }
        const now = Date.now();
        const endsAt = now + state.prefs.coolingHours * 60 * 60 * 1000;
        state.recovery.cooling = { startedAt: now, endsAt };
        return publicState(state, { ok: true, started: true });
      }

      case 'recovery.cooling.cancel': {
        // Only someone who knows the current password may cancel a countdown.
        requirePassword(state, body.password);
        state.recovery.cooling = { startedAt: null, endsAt: null };
        return publicState(state, { ok: true });
      }

      case 'state.refresh': {
        return publicState(state, { ok: true });
      }

      default:
        throw new Failure(`unknown action: ${action}`, 'unknown-action');
    }
  });
}

// ------------------------------------------------------------------- routes --

const ACTION_HEADER = 'x-dsh-session-lock';

function sameOriginGuard(req) {
  return req.headers[ACTION_HEADER] === '1';
}

function sendJson(res, status, payload) {
  const text = JSON.stringify(payload);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(text),
  });
  res.end(text);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new Failure('body-too-large', 'body-too-large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new Failure('bad-json', 'bad-json'));
      }
    });
    req.on('error', reject);
  });
}

export function apply(ctx) {
  const store = new Store();
  const webServer =
    ctx && ctx.webServer
      ? ctx.webServer
      : ctx && typeof ctx.get === 'function'
        ? ctx.get('webServer')
        : null;

  if (!webServer) return;

  const register = () => {
    const disposers = [];

    disposers.push(
      webServer.register({
        kind: 'exact',
        path: ROUTE_STATE,
        handler: async (req, res) => {
          if (req.method !== 'GET') {
            sendJson(res, 405, { ok: false, error: 'method-not-allowed' });
            return;
          }
          if (!sameOriginGuard(req)) {
            sendJson(res, 403, { ok: false, error: 'forbidden' });
            return;
          }
          try {
            const state = await store.run((draft) => {
              settle(draft);
              return publicState(draft);
            });
            sendJson(res, 200, { ok: true, state });
          } catch (error) {
            sendJson(res, 500, { ok: false, error: String((error && error.message) || error) });
          }
        },
      }),
    );

    disposers.push(
      webServer.register({
        kind: 'exact',
        path: ROUTE_ACTION,
        handler: async (req, res) => {
          if (req.method !== 'POST') {
            sendJson(res, 405, { ok: false, error: 'method-not-allowed' });
            return;
          }
          if (!sameOriginGuard(req)) {
            sendJson(res, 403, { ok: false, error: 'forbidden' });
            return;
          }
          try {
            const body = await readBody(req);
            const state = await runAction(store, body || {});
            sendJson(res, 200, { ok: state.ok !== false, state });
          } catch (error) {
            const code = error instanceof Failure ? error.code : 'action-failed';
            const message = String((error && error.message) || error);
            sendJson(res, 200, { ok: false, error: code, message });
          }
        },
      }),
    );

    // Hand the page its own origin, so the client never has to guess whether
    // it is served from http://127.0.0.1:PORT or a custom scheme.
    try {
      const origin = webServer.getOrigin();
      disposers.push(
        webServer.tapIndex((html) => {
          const tag = `<script>window.__DSH_SESSION_LOCK_ORIGIN__=${JSON.stringify(origin)}</script>`;
          return html.includes('</head>') ? html.replace('</head>', `${tag}</head>`) : `${tag}${html}`;
        }),
      );
    } catch {
      // No listener yet: the client falls back to its own location origin.
    }

    return () => {
      for (const dispose of disposers) {
        try {
          dispose();
        } catch {
          /* already gone */
        }
      }
    };
  };

  if (typeof ctx.effect === 'function') ctx.effect(register, 'session-lock: routes');
  else register();
}
