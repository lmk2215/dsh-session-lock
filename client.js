/**
 * dsh-session-lock — Client half.
 *
 * Slot contributions
 *   sidebar.workspaces.session.row.action  lock / unlock row button
 *   shell.overlay                          blurred veil + password box, dialogs
 *   settings.section                       the 对话锁 settings page
 *
 * State lives in the Host (`<DSH_HOME>/session-lock/state.json`) behind two
 * same-origin routes; this file keeps only the temporary "already showed it"
 * passes, which are memory-only and die on blur, hide, and session switch.
 */
window.__ModuleLoader__.load({
  id: 'dsh-session-lock',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    // ------------------------------------------------------------------ i18n --
    const STRINGS = {
      zh: {
        rowLock: '锁定对话',
        rowLocked: '已锁定 · 点击输入密码解锁',
        veilTitle: '该对话已锁定',
        veilDesc: '输入密码后可以查看内容。离开对话、切到后台或窗口失焦会立即重新锁定。',
        veilHint: '要永久解锁，请到左侧侧边栏点该对话的解锁按钮。',
        forgotEntry: '忘记密码？',
        password: '密码',
        unlock: '查看',
        wrong: '密码不正确',
        empty: '请输入密码',
        rateLimited: '尝试次数过多，请稍后再试',
        failed: '操作失败，请重试',
        setupTitle: '设置解锁密码',
        setupDesc: '第一次使用会话锁，先设置一个解锁密码；之后每个锁定的对话都用它解锁。',
        setupPassword: '设置密码（至少 4 位）',
        setupConfirm: '再输入一次',
        save: '保存并锁定',
        saveOnly: '保存密码',
        cancel: '取消',
        close: '关闭',
        mismatch: '两次输入的密码不一致',
        tooShort: '密码至少 4 位',
        unlockTitle: '永久解锁该对话',
        unlockDesc: '输入解锁密码后，这个对话会取消锁定状态。',
        confirmUnlock: '永久解锁',
        running: '后台任务仍在运行，锁屏不影响它的执行',
        waiting: '后台任务在等你的确认',
        // settings page
        settingsTitle: '对话锁',
        settingsDesc: '锁定对话后只遮挡对话区；侧边栏照常可用，锁定不影响正在运行的任务。',
        statusHeading: '状态',
        statusSecret: '解锁密码',
        statusSecretSet: '已设置（{when}）',
        statusSecretNone: '尚未设置',
        statusLockedCount: '已锁定对话',
        statusLastUnlock: '上次解锁',
        statusLastReset: '上次重置',
        statusClockJump: '检测到系统时间被向前调整（{when}）：冷静倒计时可能因此提前结束。',
        never: '无',
        changeHeading: '修改密码',
        changeDesc: '修改后所有已锁定的对话继续使用新密码。',
        changeButton: '修改密码',
        changeNeedSecret: '请先设置一个解锁密码。',
        changeTitle: '修改解锁密码',
        oldPassword: '旧密码',
        newPassword: '新密码（至少 4 位）',
        repeatNew: '重复新密码',
        changeConfirm: '保存新密码',
        recoveryHeading: '忘记密码时的找回方式',
        recoveryDesc: '两种通道各自独立，可在设置密码时或之后启用。全都不启用时，忘记密码只能删除数据。',
        windowsChannel: 'Windows 登录密码',
        windowsChannelDesc: '用本机的 Windows 账户密码校验。只有在这台机器真的能用 Windows 密码登录时才能启用；微软账户或无密码的机器不可用。',
        windowsEnabled: '已启用（账户 {account}，验证于 {when}）',
        windowsNotEnabled: '未启用',
        windowsEnable: '验证并启用',
        windowsDisable: '停用',
        windowsDialogTitle: '验证 Windows 登录密码',
        windowsDialogDesc: '输入这台电脑当前的 Windows 登录密码。验证通过后才会启用这个找回通道；密码不会保存。',
        windowsPassword: 'Windows 登录密码',
        windowsVerify: '验证',
        windowsFailed: '验证未通过：这台机器可能没有 Windows 密码，或使用的是微软账户。',
        windowsResetTitle: '用 Windows 密码重置',
        windowsResetDesc: '校验通过后，解锁密码会被清空、所有锁一起解除，然后用下面的新密码接管。',
        coolingChannel: '强制冷静后清空',
        coolingChannelDesc: '启动冷静后开始倒计时；到时间自动清空密码并解除全部锁。冷静期间无法手动取消，只有输入正确密码能中止。',
        coolingHours: '冷静时长',
        coolingHoursUnit: '小时',
        coolingStart: '启动冷静',
        coolingRunning: '冷静进行中，剩余 {left}',
        coolingDialogTitle: '启动强制冷静',
        coolingDialogDesc: '将启动 {hours} 小时倒计时。到期后解锁密码被清空、所有锁解除。期间不可手动取消；输入正确密码可中止。',
        coolingConfirm: '确认启动',
        coolingCancel: '输密码中止冷静',
        coolingEnable: '启用这个通道',
        coolingPickLabel: '忘记密码时：强制冷静',
        coolingPickHint: '到期后自动清空密码并解除全部锁。选「关闭」则不放行这条路。',
        coolingOff: '关闭',
        coolingDisabled: '未启用（在设置密码 / 修改密码时选择）',
        coolingArmed: '已启用：{hours} 小时，启动后到期清空密码',
        coolingCancelTitle: '中止冷静',
        coolingCancelDesc: '输入当前解锁密码即可中止倒计时并保留密码。',
        coolingFinished: '冷静已结束：密码已清空，全部锁已解除。',
        prefsHeading: '默认设置',
        lockNewSessions: '新对话默认上锁',
        lockNewSessionsDesc: '新建的对话自动加锁；当前这个会话先给一张临时通行证，离开后即锁。',
        hideLockedTitles: '锁定后隐藏侧边栏标题',
        hideLockedTitlesDesc: '已锁定的对话在侧边栏显示为模糊标题，旁人看不到名称。',
        restorePolicyTitle: '从归档恢复对话时',
        restorePolicyDesc: '恢复时要不要先输解锁密码。切换档位本身也需要密码。',
        restorePolicyAll: '所有归档的',
        restorePolicyLocked: '仅已锁定的',
        restorePolicyOff: '不需要密码',
        restoreGateTitle: '恢复已锁定的对话',
        restoreGateDesc: '这个对话处于锁定状态，恢复它需要先输入解锁密码。',
        prefGateTitle: '修改这个设置',
        prefGateDesc: '为了不让旁人改掉它，修改这个设置需要先输入解锁密码。',
        lockAllButton: '一键上锁',
        lockAllDesc: '给当前所有对话加锁（{count} 个）。',
        lockAllDone: '已锁定 {count} 个对话',
        unlockAllButton: '一键解锁',
        unlockAllDesc: '输入密码后解除全部锁。',
        unlockAllTitle: '一键解锁全部对话',
        unlockAllDesc2: '输入解锁密码，所有锁定的对话会一起解锁。',
        dangerHeading: '警告',
        dangerNoRecovery: '当前没有启用任何找回通道：忘记密码后无法恢复，只能删除会话数据。',
        dangerSamePassword: '提示：解锁密码就是防止旁人查看的最后一道门，别和 Windows 密码设成同一个。',
        disabled: '未设置密码时不可用',
        noSecretToast: '尚未设置解锁密码',
      },
      en: {
        rowLock: 'Lock this conversation',
        rowLocked: 'Locked — click to enter the password',
        veilTitle: 'This conversation is locked',
        veilDesc: 'Enter the password to read it. Leaving, switching away, or losing focus locks it again.',
        veilHint: 'To unlock permanently, use the unlock button on this conversation’s sidebar row.',
        forgotEntry: 'Forgot the password?',
        password: 'Password',
        unlock: 'View',
        wrong: 'Wrong password',
        empty: 'Enter the password',
        rateLimited: 'Too many attempts — try again shortly',
        failed: 'Something went wrong, try again',
        setupTitle: 'Set an unlock password',
        setupDesc: 'First lock. Choose one password; every locked conversation uses it.',
        setupPassword: 'Password (at least 4 characters)',
        setupConfirm: 'Enter it again',
        save: 'Save and lock',
        saveOnly: 'Save password',
        cancel: 'Cancel',
        close: 'Close',
        mismatch: 'The two passwords differ',
        tooShort: 'Use at least 4 characters',
        unlockTitle: 'Unlock this conversation permanently',
        unlockDesc: 'Enter the unlock password to remove the lock from this conversation.',
        confirmUnlock: 'Unlock',
        running: 'A background task is still running; the lock does not stop it',
        waiting: 'A background task is waiting for your approval',
        settingsTitle: 'Conversation Lock',
        settingsDesc: 'A locked conversation blurs only the conversation area; the sidebar stays usable and running tasks keep running.',
        statusHeading: 'Status',
        statusSecret: 'Unlock password',
        statusSecretSet: 'set ({when})',
        statusSecretNone: 'not set',
        statusLockedCount: 'Locked conversations',
        statusLastUnlock: 'Last unlock',
        statusLastReset: 'Last reset',
        statusClockJump: 'The system clock was moved forward ({when}); a cooling countdown may end early.',
        never: 'never',
        changeHeading: 'Change password',
        changeDesc: 'Locked conversations keep working with the new password.',
        changeButton: 'Change password',
        changeNeedSecret: 'Set an unlock password first.',
        changeTitle: 'Change the unlock password',
        oldPassword: 'Current password',
        newPassword: 'New password (at least 4 characters)',
        repeatNew: 'Repeat the new password',
        changeConfirm: 'Save password',
        recoveryHeading: 'Recovery when the password is lost',
        recoveryDesc: 'Two independent channels. With none enabled, a forgotten password can only end in deleting data.',
        windowsChannel: 'Windows login password',
        windowsChannelDesc: 'Validates this machine’s Windows account password. It can only be enabled where Windows password login actually works; Microsoft accounts and passwordless machines cannot use it.',
        windowsEnabled: 'Enabled (account {account}, verified {when})',
        windowsNotEnabled: 'Not enabled',
        windowsEnable: 'Verify and enable',
        windowsDisable: 'Disable',
        windowsDialogTitle: 'Verify the Windows login password',
        windowsDialogDesc: 'Enter this PC’s current Windows login password. The channel is enabled only when the check passes; the password is never stored.',
        windowsPassword: 'Windows login password',
        windowsVerify: 'Verify',
        windowsFailed: 'Verification failed: this machine may have no Windows password, or uses a Microsoft account.',
        windowsResetTitle: 'Reset with the Windows password',
        windowsResetDesc: 'When the check passes the unlock password is cleared, every lock is released, and the new password below takes over.',
        coolingChannel: 'Cooling period, then clear',
        coolingChannelDesc: 'Start a countdown; when it expires the password is cleared and every lock is released. It cannot be cancelled by hand — only the correct password stops it.',
        coolingHours: 'Cooling period',
        coolingHoursUnit: 'hours',
        coolingStart: 'Start cooling',
        coolingRunning: 'Cooling: {left} left',
        coolingDialogTitle: 'Start the cooling period',
        coolingDialogDesc: 'Starts a {hours}-hour countdown. When it expires the password is cleared and all locks are released. It cannot be cancelled by hand; entering the correct password stops it.',
        coolingConfirm: 'Start',
        coolingCancel: 'Stop with the password',
        coolingEnable: 'Enable this channel',
        coolingPickLabel: 'If the password is lost: cooling period',
        coolingPickHint: 'When it expires the password is cleared and every lock released. Choose off to drop this path.',
        coolingOff: 'Off',
        coolingDisabled: 'Not enabled (choose it while setting or changing the password)',
        coolingArmed: 'Enabled: {hours} hours; once started it clears the password at the end',
        coolingCancelTitle: 'Stop the cooling period',
        coolingCancelDesc: 'Enter the current unlock password to stop the countdown and keep the password.',
        coolingFinished: 'Cooling finished: the password is cleared and every lock is released.',
        prefsHeading: 'Defaults',
        lockNewSessions: 'Lock new conversations',
        lockNewSessionsDesc: 'A new conversation is locked automatically; the current one gets a temporary pass until you leave it.',
        hideLockedTitles: 'Hide locked titles in the sidebar',
        hideLockedTitlesDesc: 'Locked conversations show a blurred title in the sidebar.',
        restorePolicyTitle: 'Restoring from the archive',
        restorePolicyDesc: 'Whether restoring asks for the unlock password first. Switching the position itself needs the password.',
        restorePolicyAll: 'Every archived one',
        restorePolicyLocked: 'Locked ones only',
        restorePolicyOff: 'No password',
        restoreGateTitle: 'Restore a locked conversation',
        restoreGateDesc: 'This conversation is locked; enter the unlock password to restore it.',
        prefGateTitle: 'Change this setting',
        prefGateDesc: 'To keep bystanders from switching it, changing this setting needs the unlock password.',
        lockAllButton: 'Lock everything',
        lockAllDesc: 'Lock every conversation currently known ({count}).',
        lockAllDone: 'Locked {count} conversations',
        unlockAllButton: 'Unlock everything',
        unlockAllDesc: 'Enter the password to release every lock.',
        unlockAllTitle: 'Unlock every conversation',
        unlockAllDesc2: 'Enter the unlock password; every locked conversation is released.',
        dangerHeading: 'Warning',
        dangerNoRecovery: 'No recovery channel is enabled: a forgotten password cannot be recovered, only deleted.',
        dangerSamePassword: 'Tip: this password is the last door against onlookers — do not reuse your Windows password.',
        disabled: 'Unavailable until a password is set',
        noSecretToast: 'No unlock password yet',
      },
    };

    let t = (key, vars) => interpolate(STRINGS.zh[key] ?? key, vars);

    function interpolate(text, vars) {
      if (!vars) return text;
      return text.replace(/\{(\w+)\}/g, (whole, name) =>
        vars[name] === undefined ? whole : String(vars[name]),
      );
    }

    function installStrings(ctx) {
      const locale = ctx && ctx.locale;
      if (!locale || typeof locale.register !== 'function') return;
      try {
        for (const [id, dict] of Object.entries(STRINGS)) {
          locale.register('dsh-session-lock', id, dict);
        }
        if (typeof locale.bind === 'function') {
          const bound = locale.bind('dsh-session-lock');
          t = (key, vars) => {
            let value;
            try {
              value = bound(key);
            } catch {
              value = undefined;
            }
            return interpolate(typeof value === 'string' && value !== '' ? value : (STRINGS.zh[key] ?? key), vars);
          };
        }
      } catch {
        /* keep the zh fallback */
      }
    }

    // ------------------------------------------------------------------- api --
    const ORIGIN =
      (typeof window !== 'undefined' && window.__DSH_SESSION_LOCK_ORIGIN__) ||
      (typeof location !== 'undefined' ? location.origin : '');
    const BASE = `${String(ORIGIN).replace(/\/+$/, '')}/session-lock`;

    async function getState() {
      const response = await fetch(`${BASE}/state`, {
        method: 'GET',
        credentials: 'same-origin',
        headers: { accept: 'application/json', 'x-dsh-session-lock': '1' },
      });
      const payload = await response.json();
      if (!payload || payload.ok !== true || !payload.state) {
        throw new Error((payload && payload.error) || `state failed (${response.status})`);
      }
      return payload.state;
    }

    async function post(action, body) {
      const response = await fetch(`${BASE}/action`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json', 'x-dsh-session-lock': '1' },
        body: JSON.stringify({ action, ...(body || {}) }),
      });
      const payload = await response.json();
      if (!payload) throw new Error('empty response');
      return payload;
    }

    // ----------------------------------------------------------------- store --
    const LEGACY_KEY = 'dsh-session-lock:v1';
    let snapshot = { ready: false, state: null, error: null };
    const listeners = new Set();

    function publish(next) {
      snapshot = next;
      for (const listener of [...listeners]) {
        try {
          listener();
        } catch {
          /* ignore */
        }
      }
    }

    function useStore() {
      return React.useSyncExternalStore(
        (listener) => {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        () => snapshot,
        () => snapshot,
      );
    }

    let refreshing = null;

    async function refresh() {
      if (refreshing) return refreshing;
      refreshing = (async () => {
        try {
          const state = await getState();
          publish({ ready: true, state, error: null });
          maybeMigrate(state);
          return state;
        } catch (error) {
          publish({ ready: true, state: snapshot.state, error: String((error && error.message) || error) });
          return snapshot.state;
        } finally {
          refreshing = null;
        }
      })();
      return refreshing;
    }

    async function act(action, body) {
      const payload = await post(action, body);
      if (payload.state) publish({ ready: true, state: payload.state, error: null });
      return payload;
    }

    function readLegacy() {
      try {
        const raw = localStorage.getItem(LEGACY_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        const locked = {};
        if (data && data.locked && typeof data.locked === 'object') {
          for (const [id, value] of Object.entries(data.locked)) if (value === true) locked[id] = true;
        }
        const secret =
          data && data.secret && typeof data.secret.hash === 'string' && typeof data.secret.salt === 'string'
            ? { salt: data.secret.salt, hash: data.secret.hash, iterations: Number(data.secret.iterations) || 120000 }
            : null;
        return { locked, secret };
      } catch {
        return null;
      }
    }

    function clearLegacy() {
      try {
        localStorage.removeItem(LEGACY_KEY);
      } catch {
        /* ignore */
      }
    }

    let migrating = false;

    /**
     * Move what the earlier page-local build kept in localStorage into the Host.
     * Runs after every successful read and is idempotent: once the Host holds a
     * password and the local copy is gone, this becomes a no-op. Retrying instead
     * of running once at mount is deliberate — a page that loaded while the Host
     * route was still absent must not lose the old digest for good.
     */
    async function maybeMigrate(state) {
      if (migrating) return;
      const legacy = readLegacy();
      if (!legacy) return;
      const hasLocks = Object.keys(legacy.locked || {}).length > 0;
      const hasDigest = Boolean(legacy.secret) && !(state && state.hasSecret);
      if (!hasLocks && !hasDigest) {
        if (state && state.hasSecret) clearLegacy();
        return;
      }
      migrating = true;
      try {
        const payload = await post('secret.import', {
          salt: legacy.secret ? legacy.secret.salt : undefined,
          hash: legacy.secret ? legacy.secret.hash : undefined,
          iterations: legacy.secret ? legacy.secret.iterations : undefined,
          locked: legacy.locked,
        });
        if (payload && payload.state) publish({ ready: true, state: payload.state, error: null });
        if (payload && payload.ok !== false) clearLegacy();
      } catch {
        /* keep localStorage: the next refresh retries */
      } finally {
        migrating = false;
      }
    }

    // ------------------------------------------------- temporary visibility --
    const tempUnlocked = new Set();
    let tempVersion = 0;
    const tempListeners = new Set();

    function bumpTemp() {
      tempVersion += 1;
      for (const listener of [...tempListeners]) {
        try {
          listener();
        } catch {
          /* ignore */
        }
      }
    }

    function useTempVersion() {
      return React.useSyncExternalStore(
        (listener) => {
          tempListeners.add(listener);
          return () => tempListeners.delete(listener);
        },
        () => tempVersion,
        () => tempVersion,
      );
    }

    function clearTemp() {
      if (tempUnlocked.size === 0) return;
      tempUnlocked.clear();
      bumpTemp();
    }

    function grantTemp(sessionId) {
      if (typeof sessionId !== 'string' || sessionId === '') return;
      tempUnlocked.add(sessionId);
      bumpTemp();
    }

    // -------------------------------------------------------------- dialogs --
    let dialog = null;
    let dialogVersion = 0;
    const dialogListeners = new Set();

    function openDialog(next) {
      dialog = next;
      dialogVersion += 1;
      for (const listener of [...dialogListeners]) {
        try {
          listener();
        } catch {
          /* ignore */
        }
      }
    }

    function closeDialog() {
      openDialog(null);
    }

    function useDialog() {
      React.useSyncExternalStore(
        (listener) => {
          dialogListeners.add(listener);
          return () => dialogListeners.delete(listener);
        },
        () => dialogVersion,
        () => dialogVersion,
      );
      return dialog;
    }

    // -------------------------------------------------------- restore gate --
    const restoreGate = { pending: null };

    /** Ask for the password before an archived *locked* conversation comes back. */
    function requestRestoreGate(sessionId) {
      return new Promise((resolve) => {
        restoreGate.pending = { sessionId, resolve };
        openDialog({ mode: 'restore', sessionId });
      });
    }

    function settleRestore(allowed) {
      const pending = restoreGate.pending;
      restoreGate.pending = null;
      closeDialog();
      if (pending) pending.resolve(allowed);
    }

    /**
     * Wrap `unarchiveSession` on both Workspace service faces. Only a locked
     * conversation is gated, and only while the preference is on; everything
     * else passes straight through to the original method.
     */
    function installRestoreGate(ready) {
      const patched = [];
      for (const name of ['uiWorkspace', 'workspaces']) {
        const service = ready ? ready[name] : null;
        if (!service || typeof service.unarchiveSession !== 'function') continue;
        const original = service.unarchiveSession;
        const replacement = function gatedUnarchive(sessionId, ...rest) {
          const state = snapshot.state;
          const policy = state && state.prefs ? state.prefs.restorePolicy : 'off';
          const locked = Boolean(state && state.locked && state.locked[sessionId]);
          const needs = policy === 'all' || (policy === 'locked' && locked);
          if (!needs) return original.call(this, sessionId, ...rest);
          return requestRestoreGate(sessionId).then((allowed) =>
            allowed ? original.call(this, sessionId, ...rest) : undefined,
          );
        };
        try {
          service.unarchiveSession = replacement;
          if (service.unarchiveSession !== replacement) continue;
        } catch {
          // A frozen service face simply keeps the archive page ungated.
          continue;
        }
        patched.push({ service, original });
      }
      return () => {
        for (const entry of patched) {
          try {
            entry.service.unarchiveSession = entry.original;
          } catch {
            /* service went away */
          }
        }
      };
    }

    // ---------------------------------------------------------- session id --
    function sessionIdOf(binding) {
      const session = binding && binding.hooks ? binding.hooks.session : undefined;
      let view = null;
      try {
        if (session && typeof session.getSnapshot === 'function') view = session.getSnapshot();
      } catch {
        view = null;
      }
      const candidate =
        (view && typeof view === 'object' && 'sessionId' in view ? view.sessionId : undefined) ??
        (typeof (binding && binding.key) === 'string' ? binding.key : undefined) ??
        (binding && binding.props && typeof binding.props.sessionId === 'string' ? binding.props.sessionId : undefined);
      return typeof candidate === 'string' && candidate !== '' ? candidate : null;
    }

    const noopSubscribe = () => () => {};
    const noopSnapshot = () => null;

    function useCurrentBinding(uiSession) {
      const source = uiSession && uiSession.adapter ? uiSession.adapter.current : null;
      const subscribe = React.useCallback(
        (onChange) => {
          if (!source || typeof source.subscribe !== 'function') return () => {};
          const dispose = source.subscribe(onChange);
          return typeof dispose === 'function' ? dispose : () => {};
        },
        [source],
      );
      const read = React.useCallback(
        () => (source && typeof source.getSnapshot === 'function' ? source.getSnapshot() : null),
        [source],
      );
      return React.useSyncExternalStore(
        source ? subscribe : noopSubscribe,
        source ? read : noopSnapshot,
        noopSnapshot,
      );
    }

    // ------------------------------------------------------------- geometry --
    /**
     * The veil covers the conversation area only: it starts where the sidebar
     * column ends. `data-shell-overlay` is laid down by the layout itself, so the
     * anchor survives the slot wrapper the overlay entry renders inside.
     */
    function useMainBox(ref) {
      const [box, setBox] = React.useState(null);
      React.useEffect(() => {
        const node = ref.current;
        if (!node) return undefined;

        const layerOf = () => {
          let element = node.parentElement;
          for (let depth = 0; depth < 12 && element; depth += 1) {
            if (typeof element.hasAttribute === 'function' && element.hasAttribute('data-shell-overlay')) {
              return element;
            }
            element = element.parentElement;
          }
          return document.querySelector('[data-shell-overlay]');
        };

        const layer = layerOf();
        const frame = layer ? layer.parentElement : null;

        const read = () => {
          if (!frame) {
            setBox({ left: 0, top: 0, width: window.innerWidth, height: window.innerHeight });
            return;
          }
          let sidebar = Number.NaN;
          try {
            const computed = window.getComputedStyle(frame).gridTemplateColumns || '';
            const first = Number.parseFloat(computed);
            if (Number.isFinite(first)) sidebar = first;
          } catch {
            sidebar = Number.NaN;
          }
          if (!Number.isFinite(sidebar)) {
            const inline = Number.parseFloat(frame.style.gridTemplateColumns || '');
            if (Number.isFinite(inline)) sidebar = inline;
          }
          if (!Number.isFinite(sidebar)) {
            for (const child of frame.children) {
              if (child.hasAttribute && child.hasAttribute('data-shell-overlay')) continue;
              const width = child.getBoundingClientRect ? child.getBoundingClientRect().width : 0;
              if (Number.isFinite(width) && width > 0 && width < window.innerWidth * 0.6) {
                sidebar = width;
                break;
              }
            }
          }
          if (!Number.isFinite(sidebar) || sidebar < 0) return;
          const rect = frame.getBoundingClientRect();
          const next = {
            left: Math.round(rect.left + sidebar),
            top: Math.round(rect.top),
            width: Math.max(Math.round(rect.width - sidebar), 0),
            height: Math.max(Math.round(rect.height), 0),
          };
          if (next.width <= 0 || next.height <= 0) return;
          setBox((prev) =>
            prev !== null &&
            Math.abs(prev.left - next.left) < 0.5 &&
            Math.abs(prev.top - next.top) < 0.5 &&
            Math.abs(prev.width - next.width) < 0.5 &&
            Math.abs(prev.height - next.height) < 0.5
              ? prev
              : next,
          );
        };

        read();
        const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(() => read()) : null;
        if (observer && frame) observer.observe(frame);
        const mutations = typeof MutationObserver === 'function' ? new MutationObserver(() => read()) : null;
        if (mutations && frame) {
          mutations.observe(frame, { attributes: true, attributeFilter: ['style', 'data-sidebar-collapsed'] });
        }
        window.addEventListener('resize', read);
        return () => {
          if (observer) observer.disconnect();
          if (mutations) mutations.disconnect();
          window.removeEventListener('resize', read);
        };
      }, [ref]);
      return box;
    }

    // ------------------------------------------------------------ hide titles --
    const TITLE_MARK = 'data-dsl-title-blurred';

    /**
     * Optional privacy: blur the row text of locked conversations. The row is
     * found from our own button, and only spans without a control are blurred so
     * the lock button stays clickable.
     */
    function applyTitleBlur(enabled, locked) {
      const buttons = document.querySelectorAll('.dsl-rowButton[data-session-id]');
      for (const button of buttons) {
        const row = button.parentElement && button.parentElement.parentElement;
        if (!row) continue;
        const sessionId = button.getAttribute('data-session-id');
        const shouldBlur = enabled && sessionId !== null && locked[sessionId] === true;
        for (const child of row.children) {
          if (!(child instanceof HTMLElement)) continue;
          if (child.querySelector && child.querySelector('button')) continue;
          if (shouldBlur) {
            if (child.tagName === 'SPAN' && child.style.filter === '') {
              child.style.filter = 'blur(4px)';
              child.setAttribute(TITLE_MARK, '');
            }
          } else if (child.hasAttribute(TITLE_MARK)) {
            child.style.filter = '';
            child.removeAttribute(TITLE_MARK);
          }
        }
      }
    }

    function useTitleBlur(enabled, locked) {
      React.useEffect(() => {
        if (typeof document === 'undefined') return undefined;
        const run = () => {
          try {
            applyTitleBlur(enabled, locked);
          } catch {
            /* never break the sidebar over an optional decoration */
          }
        };
        run();
        const observer = typeof MutationObserver === 'function' ? new MutationObserver(run) : null;
        if (observer) observer.observe(document.body, { childList: true, subtree: true });
        return () => {
          if (observer) observer.disconnect();
          try {
            applyTitleBlur(false, {});
          } catch {
            /* ignore */
          }
        };
      }, [enabled, locked]);
    }

    // ----------------------------------------------------------------- icons --
    function LockIcon({ open }) {
      return h(
        'svg',
        { width: 14, height: 14, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true, style: { display: 'block' } },
        h('rect', { x: 2.6, y: 7.1, width: 10.8, height: 6.8, rx: 1.7, stroke: 'currentColor', strokeWidth: 1.3 }),
        open
          ? h('path', { d: 'M5.2 7.1V5.4a2.9 2.9 0 0 1 5.5-1.2', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round' })
          : h('path', { d: 'M5.2 7.1V5.3a2.8 2.8 0 0 1 5.6 0v1.8', stroke: 'currentColor', strokeWidth: 1.3, strokeLinecap: 'round' }),
      );
    }

    // ------------------------------------------------------------- formatting --
    function formatWhen(value) {
      if (!value) return t('never');
      try {
        return new Date(value).toLocaleString();
      } catch {
        return t('never');
      }
    }

    function formatLeft(ms) {
      if (!Number.isFinite(ms) || ms <= 0) return '0m';
      const totalMinutes = Math.ceil(ms / 60000);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    }

    // --------------------------------------------------------- small controls --
    function Switch({ checked, onChange, label, disabled }) {
      return h(
        'button',
        {
          type: 'button',
          role: 'switch',
          'aria-checked': checked ? 'true' : 'false',
          'aria-label': label,
          disabled,
          className: 'dsl-switch',
          'data-on': checked ? 'true' : 'false',
          onClick: () => {
            if (!disabled) onChange(!checked);
          },
        },
        h('span', { className: 'dsl-switch-knob' }),
      );
    }

    function Row({ title, description, children, tone }) {
      return h(
        'div',
        { className: 'dsl-row', 'data-tone': tone || 'default' },
        h(
          'div',
          { className: 'dsl-row-text' },
          h('div', { className: 'dsl-row-title' }, title),
          description ? h('div', { className: 'dsl-row-desc' }, description) : null,
        ),
        h('div', { className: 'dsl-row-control' }, children),
      );
    }

    function SectionTitle({ children }) {
      return h('div', { className: 'dsl-section-title' }, children);
    }

    // ------------------------------------------------- sidebar row button --
    function SessionLockButton(props) {
      const sessionId = props && typeof props.sessionId === 'string' ? props.sessionId : null;
      const store = useStore();
      if (!sessionId) return null;
      const state = store.state;
      const hasSecret = Boolean(state && state.hasSecret);
      const locked = Boolean(hasSecret && state.locked && state.locked[sessionId]);
      const label = t(locked ? 'rowLocked' : 'rowLock');
      return h(
        'button',
        {
          type: 'button',
          className: 'dsl-rowButton',
          'data-session-id': sessionId,
          'data-locked': locked ? 'true' : 'false',
          'aria-label': label,
          title: label,
          onClick: (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (locked) {
              openDialog({ mode: 'session-unlock', sessionId });
            } else if (!hasSecret) {
              openDialog({ mode: 'setup', sessionId });
            } else {
              act('lock.set', { sessionId, locked: true }).catch(() => {});
            }
          },
        },
        h(LockIcon, { open: locked }),
      );
    }

    // ----------------------------------------------------------- lock veil --
    function RunningBadge({ useSessionStatus, sessionId }) {
      const status = useSessionStatus((map) =>
        map && typeof map.get === 'function' ? map.get(sessionId) : undefined,
      );
      if (!status) return null;
      if (status.running) {
        return h('div', { className: 'dsl-status', role: 'status' }, h('span', { className: 'dsl-dot' }), t('running'));
      }
      if (status.pendingInteraction) {
        return h(
          'div',
          { className: 'dsl-status', role: 'status' },
          h('span', { className: 'dsl-dot dsl-dot--idle' }),
          t('waiting'),
        );
      }
      return null;
    }

    function LockVeil({ sessionId, statusBadge }) {
      const rootRef = React.useRef(null);
      const box = useMainBox(rootRef);
      const [value, setValue] = React.useState('');
      const [error, setError] = React.useState('');
      const [busy, setBusy] = React.useState(false);
      const inputRef = React.useRef(null);

      React.useEffect(() => {
        const node = inputRef.current;
        if (node) {
          try {
            node.focus();
          } catch {
            /* ignore */
          }
        }
      }, []);

      const submit = async (event) => {
        if (event) event.preventDefault();
        if (busy) return;
        if (value === '') {
          setError(t('empty'));
          return;
        }
        setBusy(true);
        setError('');
        try {
          const result = await act('secret.verify', { password: value });
          if (result.ok) {
            setValue('');
            grantTemp(sessionId);
          } else {
            setValue('');
            setError(t(result.error === 'rate-limited' ? 'rateLimited' : 'wrong'));
          }
        } catch {
          setError(t('failed'));
        }
        setBusy(false);
      };

      return h(
        'div',
        {
          ref: rootRef,
          className: 'dsl-veil',
          style: box
            ? { left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px` }
            : { left: 0, top: 0, right: 0, bottom: 0, visibility: 'hidden' },
        },
        h(
          'form',
          { className: 'dsl-card', onSubmit: submit, role: 'form', 'aria-label': t('veilTitle') },
          h('div', { className: 'dsl-title' }, t('veilTitle')),
          h('div', { className: 'dsl-hint' }, t('veilDesc')),
          h('input', {
            ref: inputRef,
            className: 'dsl-input',
            type: 'password',
            value,
            autoComplete: 'current-password',
            placeholder: t('password'),
            'aria-label': t('password'),
            onChange: (event) => {
              setValue(event.target.value);
              if (error) setError('');
            },
          }),
          h('div', { className: 'dsl-error', role: 'alert' }, error),
          h(
            'div',
            { className: 'dsl-actions' },
            h('button', { className: 'dsl-btn', type: 'submit', 'data-primary': 'true', disabled: busy }, t('unlock')),
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'dsl-link',
              onClick: () => openDialog({ mode: 'forgot' }),
            },
            t('forgotEntry'),
          ),
          h('div', { className: 'dsl-hint dsl-hint--quiet' }, t('veilHint')),
          statusBadge,
        ),
      );
    }

    // -------------------------------------------------------------- dialogs --
    function Field({ label, value, onChange, autoFocus, type }) {
      return h('input', {
        className: 'dsl-input',
        type: type || 'password',
        value,
        autoComplete: 'off',
        autoFocus: Boolean(autoFocus),
        placeholder: label,
        'aria-label': label,
        onChange: (event) => onChange(event.target.value),
      });
    }

    /**
     * A native modal `<dialog>`.
     *
     * `showModal()` promotes the element into the browser's top layer, which is
     * the only layer that cannot be covered by z-index — the Settings page is
     * itself a modal, and a plain fixed overlay inside the frame loses to it.
     */
    function Modal({ title, description, children, footer, onClose }) {
      const ref = React.useRef(null);
      React.useEffect(() => {
        const node = ref.current;
        if (!node) return undefined;
        try {
          if (typeof node.showModal === 'function' && !node.open) node.showModal();
          else if (!node.open) node.setAttribute('open', '');
        } catch {
          node.setAttribute('open', '');
        }
        return () => {
          try {
            if (node.open) node.close();
          } catch {
            /* already detached */
          }
        };
      }, []);
      return h(
        'dialog',
        {
          ref,
          className: 'dsl-dialog',
          onCancel: (event) => {
            event.preventDefault();
            onClose();
          },
          onMouseDown: (event) => {
            if (event.target === ref.current) onClose();
          },
        },
        h(
          'form',
          {
            className: 'dsl-card dsl-card--dialog',
            method: 'dialog',
            onSubmit: (event) => event.preventDefault(),
          },
          h('div', { className: 'dsl-title' }, title),
          description ? h('div', { className: 'dsl-hint' }, description) : null,
          children,
          footer ? h('div', { className: 'dsl-actions' }, footer) : null,
        ),
      );
    }

    /** Cooling choice shown inside the create/change dialogs. */
    function CoolingChoice({ value, onChange }) {
      const options = [0, 1, 6, 24, 72, 168];
      return h(
        'div',
        { className: 'dsl-field' },
        h('div', { className: 'dsl-field-label' }, t('coolingPickLabel')),
        h(
          'div',
          { className: 'dsl-hours' },
          options.map((hours) =>
            h(
              'button',
              {
                key: hours,
                type: 'button',
                className: 'dsl-chip',
                'data-active': value === hours ? 'true' : 'false',
                onClick: () => onChange(hours),
              },
              hours === 0 ? t('coolingOff') : `${hours}${t('coolingHoursUnit')}`,
            ),
          ),
        ),
        h('div', { className: 'dsl-hint dsl-hint--quiet' }, t('coolingPickHint')),
      );
    }

    function DialogBody({ request }) {
      const store = useStore();
      const prefs = (store.state && store.state.prefs) || { coolingEnabled: true, coolingHours: 24 };
      const [cooling, setCooling] = React.useState(null);
      const [first, setFirst] = React.useState('');
      const [second, setSecond] = React.useState('');
      const [third, setThird] = React.useState('');
      const [error, setError] = React.useState('');
      const [busy, setBusy] = React.useState(false);
      const key = request ? `${request.mode}:${request.sessionId || ''}` : '';

      React.useEffect(() => {
        setFirst('');
        setSecond('');
        setThird('');
        setError('');
        setBusy(false);
        setCooling(null);
      }, [key]);

      const coolingValue =
        cooling === null ? (prefs.coolingEnabled ? prefs.coolingHours : 0) : cooling;

      if (!request) return null;
      const mode = request.mode;
      const close = () => {
        if (busy) return;
        if (mode === 'restore') {
          settleRestore(false);
          return;
        }
        closeDialog();
      };

      const finish = (message) => {
        if (message) setError(message);
      };

      const guard = async (work) => {
        if (busy) return;
        setBusy(true);
        setError('');
        try {
          await work();
        } catch (reason) {
          setError(t('failed'));
        }
        setBusy(false);
      };

      const submitSetup = () =>
        guard(async () => {
          if (first.length < 4) return finish(t('tooShort'));
          if (first !== second) return finish(t('mismatch'));
          const created = await act('secret.create', { password: first, coolingHours: coolingValue });
          if (!created.ok) return finish(t(created.error === 'too-short' ? 'tooShort' : 'failed'));
          if (request.sessionId) await act('lock.set', { sessionId: request.sessionId, locked: true });
          closeDialog();
        });

      const submitSessionUnlock = () =>
        guard(async () => {
          const result = await act('secret.verify', { password: first });
          if (!result.ok) return finish(t(result.error === 'rate-limited' ? 'rateLimited' : 'wrong'));
          await act('lock.set', { sessionId: request.sessionId, locked: false });
          grantTemp(request.sessionId);
          closeDialog();
        });

      const submitChange = () =>
        guard(async () => {
          if (second.length < 4) return finish(t('tooShort'));
          if (second !== third) return finish(t('mismatch'));
          const result = await act('secret.change', {
            oldPassword: first,
            newPassword: second,
            coolingHours: coolingValue,
          });
          if (!result.ok) {
            if (result.error === 'wrong-password') return finish(t('wrong'));
            if (result.error === 'rate-limited') return finish(t('rateLimited'));
            return finish(t(result.error === 'too-short' ? 'tooShort' : 'failed'));
          }
          closeDialog();
        });

      const submitUnlockAll = () =>
        guard(async () => {
          const result = await act('lock.clear', { password: first });
          if (!result.ok) return finish(t(result.error === 'rate-limited' ? 'rateLimited' : 'wrong'));
          closeDialog();
        });

      const submitWindowsRegister = () =>
        guard(async () => {
          const result = await act('recovery.windows.register', { password: first });
          if (!result.ok) return finish(t('windowsFailed'));
          closeDialog();
        });

      const submitWindowsReset = () =>
        guard(async () => {
          if (second.length < 4) return finish(t('tooShort'));
          if (second !== third) return finish(t('mismatch'));
          const result = await act('recovery.windows.reset', { password: first, newPassword: second });
          if (!result.ok) return finish(t('windowsFailed'));
          closeDialog();
        });

      const submitCoolingCancel = () =>
        guard(async () => {
          const result = await act('recovery.cooling.cancel', { password: first });
          if (!result.ok) return finish(t(result.error === 'rate-limited' ? 'rateLimited' : 'wrong'));
          closeDialog();
        });

      const submitCoolingStart = () =>
        guard(async () => {
          await act('recovery.cooling.start');
          closeDialog();
        });

      const submitRestoreGate = () =>
        guard(async () => {
          const result = await act('secret.verify', { password: first });
          if (!result.ok) return finish(t(result.error === 'rate-limited' ? 'rateLimited' : 'wrong'));
          if (request.sessionId) grantTemp(request.sessionId);
          settleRestore(true);
        });

      const submitPrefGate = () =>
        guard(async () => {
          const result = await act('secret.verify', { password: first });
          if (!result.ok) return finish(t(result.error === 'rate-limited' ? 'rateLimited' : 'wrong'));
          await act('prefs.set', { patch: request.patch || {} });
          closeDialog();
        });

      const cancelButton = (label) =>
        h(
          'button',
          { key: 'cancel', className: 'dsl-btn', type: 'button', onClick: close, disabled: busy },
          label || t('cancel'),
        );

      if (mode === 'setup') {
        return h(
          Modal,
          {
            title: t('setupTitle'),
            description: t('setupDesc'),
            onClose: close,
            footer: [cancelButton(), h('button', { key: 'ok', className: 'dsl-btn', type: 'button', 'data-primary': 'true', disabled: busy, onClick: submitSetup }, t('save'))],
          },
          h(Field, { label: t('setupPassword'), value: first, onChange: setFirst, autoFocus: true }),
          h(Field, { label: t('setupConfirm'), value: second, onChange: setSecond }),
          h(CoolingChoice, { value: coolingValue, onChange: setCooling }),
          h('div', { className: 'dsl-error', role: 'alert' }, error),
        );
      }

      if (mode === 'session-unlock') {
        return h(
          Modal,
          {
            title: t('unlockTitle'),
            description: t('unlockDesc'),
            onClose: close,
            footer: [cancelButton(), h('button', { key: 'ok', className: 'dsl-btn', type: 'button', 'data-primary': 'true', disabled: busy, onClick: submitSessionUnlock }, t('confirmUnlock'))],
          },
          h(Field, { label: t('password'), value: first, onChange: setFirst, autoFocus: true }),
          h('div', { className: 'dsl-error', role: 'alert' }, error),
        );
      }

      if (mode === 'change') {
        return h(
          Modal,
          {
            title: t('changeTitle'),
            onClose: close,
            footer: [cancelButton(), h('button', { key: 'ok', className: 'dsl-btn', type: 'button', 'data-primary': 'true', disabled: busy, onClick: submitChange }, t('changeConfirm'))],
          },
          h(Field, { label: t('oldPassword'), value: first, onChange: setFirst, autoFocus: true }),
          h(Field, { label: t('newPassword'), value: second, onChange: setSecond }),
          h(Field, { label: t('repeatNew'), value: third, onChange: setThird }),
          h(CoolingChoice, { value: coolingValue, onChange: setCooling }),
          h('div', { className: 'dsl-error', role: 'alert' }, error),
        );
      }

      if (mode === 'unlock-all') {
        return h(
          Modal,
          {
            title: t('unlockAllTitle'),
            description: t('unlockAllDesc2'),
            onClose: close,
            footer: [cancelButton(), h('button', { key: 'ok', className: 'dsl-btn', type: 'button', 'data-primary': 'true', disabled: busy, onClick: submitUnlockAll }, t('confirmUnlock'))],
          },
          h(Field, { label: t('password'), value: first, onChange: setFirst, autoFocus: true }),
          h('div', { className: 'dsl-error', role: 'alert' }, error),
        );
      }

      if (mode === 'windows-register') {
        return h(
          Modal,
          {
            title: t('windowsDialogTitle'),
            description: t('windowsDialogDesc'),
            onClose: close,
            footer: [cancelButton(), h('button', { key: 'ok', className: 'dsl-btn', type: 'button', 'data-primary': 'true', disabled: busy, onClick: submitWindowsRegister }, t('windowsVerify'))],
          },
          h(Field, { label: t('windowsPassword'), value: first, onChange: setFirst, autoFocus: true }),
          h('div', { className: 'dsl-error', role: 'alert' }, error),
        );
      }

      if (mode === 'windows-reset') {
        return h(
          Modal,
          {
            title: t('windowsResetTitle'),
            description: t('windowsResetDesc'),
            onClose: close,
            footer: [cancelButton(), h('button', { key: 'ok', className: 'dsl-btn', type: 'button', 'data-primary': 'true', disabled: busy, onClick: submitWindowsReset }, t('windowsVerify'))],
          },
          h(Field, { label: t('windowsPassword'), value: first, onChange: setFirst, autoFocus: true }),
          h(Field, { label: t('newPassword'), value: second, onChange: setSecond }),
          h(Field, { label: t('repeatNew'), value: third, onChange: setThird }),
          h('div', { className: 'dsl-error', role: 'alert' }, error),
        );
      }

      if (mode === 'cooling-start') {
        const hours = request.hours || 24;
        return h(
          Modal,
          {
            title: t('coolingDialogTitle'),
            description: t('coolingDialogDesc', { hours }),
            onClose: close,
            footer: [cancelButton(), h('button', { key: 'ok', className: 'dsl-btn', type: 'button', 'data-danger': 'true', disabled: busy, onClick: submitCoolingStart }, t('coolingConfirm'))],
          },
          h('div', { className: 'dsl-error', role: 'alert' }, error),
        );
      }

      if (mode === 'cooling-cancel') {
        return h(
          Modal,
          {
            title: t('coolingCancelTitle'),
            description: t('coolingCancelDesc'),
            onClose: close,
            footer: [cancelButton(), h('button', { key: 'ok', className: 'dsl-btn', type: 'button', 'data-primary': 'true', disabled: busy, onClick: submitCoolingCancel }, t('confirmUnlock'))],
          },
          h(Field, { label: t('password'), value: first, onChange: setFirst, autoFocus: true }),
          h('div', { className: 'dsl-error', role: 'alert' }, error),
        );
      }

      if (mode === 'restore') {
        return h(
          Modal,
          {
            title: t('restoreGateTitle'),
            description: t('restoreGateDesc'),
            onClose: close,
            footer: [cancelButton(), h('button', { key: 'ok', className: 'dsl-btn', type: 'button', 'data-primary': 'true', disabled: busy, onClick: submitRestoreGate }, t('confirmUnlock'))],
          },
          h(Field, { label: t('password'), value: first, onChange: setFirst, autoFocus: true }),
          h('div', { className: 'dsl-error', role: 'alert' }, error),
        );
      }

      if (mode === 'pref-lock') {
        return h(
          Modal,
          {
            title: t('prefGateTitle'),
            description: t('prefGateDesc'),
            onClose: close,
            footer: [cancelButton(), h('button', { key: 'ok', className: 'dsl-btn', type: 'button', 'data-primary': 'true', disabled: busy, onClick: submitPrefGate }, t('save'))],
          },
          h(Field, { label: t('password'), value: first, onChange: setFirst, autoFocus: true }),
          h('div', { className: 'dsl-error', role: 'alert' }, error),
        );
      }

      if (mode === 'forgot') {
        return h(ForgotBody, { onClose: close });
      }

      return null;
    }

    /** The "forgot the password" chooser: only channels the Host actually allows. */
    function ForgotBody({ onClose }) {
      const store = useStore();
      const state = store.state || {};
      const windowsReady = Boolean(state.recovery && state.recovery.windowsPasswordEnabled);
      const coolingReady = Boolean(state.prefs && state.prefs.coolingEnabled);
      return h(
        Modal,
        {
          title: t('recoveryHeading'),
          description: t('recoveryDesc'),
          onClose,
          footer: h('button', { className: 'dsl-btn', type: 'button', onClick: onClose }, t('close')),
        },
        h(
          'button',
          {
            type: 'button',
            className: 'dsl-choice',
            disabled: !windowsReady,
            onClick: () => openDialog({ mode: 'windows-reset' }),
          },
          h('span', { className: 'dsl-choice-title' }, t('windowsChannel')),
          h('span', { className: 'dsl-choice-desc' }, t('windowsChannelDesc')),
        ),
        h(
          'button',
          {
            type: 'button',
            className: 'dsl-choice',
            disabled: !coolingReady,
            onClick: () => openDialog({ mode: 'cooling-start', hours: state.prefs ? state.prefs.coolingHours : 24 }),
          },
          h('span', { className: 'dsl-choice-title' }, t('coolingChannel')),
          h('span', { className: 'dsl-choice-desc' }, t('coolingChannelDesc')),
        ),
      );
    }

    function DialogHost() {
      const request = useDialog();
      useStore();
      if (!request) return null;
      return h(DialogBody, { request, key: `${request.mode}:${request.sessionId || ''}` });
    }

    // ------------------------------------------------------------ settings --
    function SettingsSection(props) {
      // Split so the session hook is never called conditionally: this shell only
      // chooses which body to render, and each body owns its own hook order.
      return props && typeof props.useSessions === 'function'
        ? h(SettingsBodyWithSessions, { useSessions: props.useSessions })
        : h(SettingsBody, { sessions: null });
    }

    function SettingsBodyWithSessions({ useSessions }) {
      const sessions = useSessions((list) => list);
      return h(SettingsBody, { sessions });
    }

    function SettingsBody({ sessions }) {
      const store = useStore();
      const state = store.state;
      const sessionIds = React.useMemo(() => {
        if (!sessions || !sessions.byId) return [];
        return Object.keys(sessions.byId);
      }, [sessions]);

      const cooling = state ? state.cooling : { active: false, remainingMs: 0 };
      const lockedCount = state ? Object.keys(state.locked || {}).length : 0;
      const hasSecret = Boolean(state && state.hasSecret);
      const prefs = (state && state.prefs) || {
        lockNewSessions: false,
        hideLockedTitles: false,
        coolingEnabled: true,
        coolingHours: 24,
        windowsPasswordEnabled: false,
        restorePolicy: 'off',
      };
      const recovery = state && state.recovery ? state.recovery : { windowsPasswordEnabled: false };
      const meta = (state && state.meta) || {};
      const noRecovery = !recovery.windowsPasswordEnabled && !prefs.coolingEnabled;

      const setPref = (patch) => {
        act('prefs.set', { patch }).catch(() => {});
      };

      if (!store.ready) {
        return h('div', { className: 'dsl-settings' }, h('div', { className: 'dsl-hint' }, '…'));
      }

      if (store.error && !state) {
        return h(
          'div',
          { className: 'dsl-settings' },
          h(SectionTitle, null, t('settingsTitle')),
          h('div', { className: 'dsl-error' }, store.error),
        );
      }

      return h(
        'div',
        { className: 'dsl-settings' },
        h('div', { className: 'dsl-settings-head' }, t('settingsTitle')),
        h('div', { className: 'dsl-hint dsl-settings-desc' }, t('settingsDesc')),

        h(SectionTitle, null, t('statusHeading')),
        h(
          'div',
          { className: 'dsl-panel' },
          h(
            'div',
            { className: 'dsl-kv' },
            h('span', null, t('statusSecret')),
            h(
              'span',
              null,
              hasSecret ? t('statusSecretSet', { when: formatWhen(state.secretCreatedAt) }) : t('statusSecretNone'),
            ),
          ),
          h('div', { className: 'dsl-kv' }, h('span', null, t('statusLockedCount')), h('span', null, String(lockedCount))),
          h('div', { className: 'dsl-kv' }, h('span', null, t('statusLastUnlock')), h('span', null, formatWhen(meta.lastUnlockAt))),
          h('div', { className: 'dsl-kv' }, h('span', null, t('statusLastReset')), h('span', null, formatWhen(meta.lastResetAt))),
          meta.clockJumpAt
            ? h('div', { className: 'dsl-hint dsl-hint--warn' }, t('statusClockJump', { when: formatWhen(meta.clockJumpAt) }))
            : null,
        ),

        h(SectionTitle, null, t('changeHeading')),
        h(
          'div',
          { className: 'dsl-panel' },
          h(
            Row,
            { title: t('changeButton'), description: hasSecret ? t('changeDesc') : t('changeNeedSecret') },
            h(
              'button',
              {
                type: 'button',
                className: 'dsl-btn',
                disabled: !hasSecret,
                onClick: () => openDialog({ mode: 'change' }),
              },
              hasSecret ? t('changeButton') : t('disabled'),
            ),
          ),
        ),

        h(SectionTitle, null, t('recoveryHeading')),
        h('div', { className: 'dsl-hint dsl-settings-desc' }, t('recoveryDesc')),
        h(
          'div',
          { className: 'dsl-panel' },
          h(
            Row,
            {
              title: t('windowsChannel'),
              description: recovery.windowsPasswordEnabled
                ? t('windowsEnabled', {
                    account: recovery.windowsAccount || '—',
                    when: formatWhen(recovery.windowsVerifiedAt),
                  })
                : t('windowsChannelDesc'),
            },
            recovery.windowsPasswordEnabled
              ? h(
                  'button',
                  {
                    type: 'button',
                    className: 'dsl-btn',
                    onClick: () => {
                      act('recovery.windows.disable').catch(() => {});
                    },
                  },
                  t('windowsDisable'),
                )
              : h(
                  'button',
                  {
                    type: 'button',
                    className: 'dsl-btn',
                    onClick: () => openDialog({ mode: 'windows-register' }),
                  },
                  t('windowsEnable'),
                ),
          ),
          h(
            Row,
            {
              title: t('coolingChannel'),
              description: cooling.active
                ? t('coolingRunning', { left: formatLeft(cooling.remainingMs) })
                : prefs.coolingEnabled
                  ? t('coolingArmed', { hours: prefs.coolingHours })
                  : t('coolingDisabled'),
            },
            cooling.active
              ? h(
                  'button',
                  {
                    type: 'button',
                    className: 'dsl-btn',
                    onClick: () => openDialog({ mode: 'cooling-cancel' }),
                  },
                  t('coolingCancel'),
                )
              : h(
                  'button',
                  {
                    type: 'button',
                    className: 'dsl-btn',
                    'data-danger': 'true',
                    disabled: !prefs.coolingEnabled,
                    onClick: () => openDialog({ mode: 'cooling-start', hours: prefs.coolingHours }),
                  },
                  t('coolingStart'),
                ),
          ),
        ),

        h(SectionTitle, null, t('prefsHeading')),
        h(
          'div',
          { className: 'dsl-panel' },
          h(
            Row,
            { title: t('lockNewSessions'), description: t('lockNewSessionsDesc') },
            h(Switch, {
              checked: prefs.lockNewSessions,
              label: t('lockNewSessions'),
              onChange: (value) => setPref({ lockNewSessions: value }),
            }),
          ),
          h(
            Row,
            { title: t('hideLockedTitles'), description: t('hideLockedTitlesDesc') },
            h(Switch, {
              checked: prefs.hideLockedTitles,
              label: t('hideLockedTitles'),
              onChange: (value) => setPref({ hideLockedTitles: value }),
            }),
          ),
          h(
            Row,
            {
              title: t('restorePolicyTitle'),
              description: hasSecret ? t('restorePolicyDesc') : t('disabled'),
            },
            h(
              'div',
              { className: 'dsl-hours' },
              ['all', 'locked', 'off'].map((policy) =>
                h(
                  'button',
                  {
                    key: policy,
                    type: 'button',
                    className: 'dsl-chip',
                    'data-active': (prefs.restorePolicy || 'off') === policy ? 'true' : 'false',
                    disabled: !hasSecret,
                    onClick: () => openDialog({ mode: 'pref-lock', patch: { restorePolicy: policy } }),
                  },
                  t(
                    policy === 'all'
                      ? 'restorePolicyAll'
                      : policy === 'locked'
                        ? 'restorePolicyLocked'
                        : 'restorePolicyOff',
                  ),
                ),
              ),
            ),
          ),
          h(
            Row,
            {
              title: t('lockAllButton'),
              description: t('lockAllDesc', { count: sessionIds.length }),
            },
            h(
              'button',
              {
                type: 'button',
                className: 'dsl-btn',
                disabled: sessionIds.length === 0 || !hasSecret,
                onClick: () => {
                  act('lock.many', { sessionIds }).catch(() => {});
                },
              },
              t('lockAllButton'),
            ),
          ),
          h(
            Row,
            { title: t('unlockAllButton'), description: t('unlockAllDesc') },
            h(
              'button',
              {
                type: 'button',
                className: 'dsl-btn',
                disabled: lockedCount === 0 || !hasSecret,
                onClick: () => openDialog({ mode: 'unlock-all' }),
              },
              t('unlockAllButton'),
            ),
          ),
        ),

        noRecovery
          ? h(
              'div',
              { className: 'dsl-panel dsl-panel--danger' },
              h('div', { className: 'dsl-row-title' }, t('dangerHeading')),
              h('div', { className: 'dsl-hint' }, t('dangerNoRecovery')),
              h('div', { className: 'dsl-hint dsl-hint--quiet' }, t('dangerSamePassword')),
            )
          : null,
      );
    }

    // -------------------------------------------------------- overlay root --
    const seenSessions = new Set();
    let primed = false;

    function OverlayRoot({ uiSession, useSessionStatus, useSessions }) {
      const binding = useCurrentBinding(uiSession);
      const sessionId = sessionIdOf(binding);
      const store = useStore();
      useTempVersion();
      const state = store.state;
      const sessions = typeof useSessions === 'function' ? useSessions((list) => list) : null;

      // Leaving the app — blur, hide, page unload — drops every temporary pass.
      React.useEffect(() => {
        const relock = () => clearTemp();
        const onVisibility = () => {
          if (document.visibilityState === 'hidden') clearTemp();
        };
        window.addEventListener('blur', relock);
        window.addEventListener('pagehide', relock);
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
          window.removeEventListener('blur', relock);
          window.removeEventListener('pagehide', relock);
          document.removeEventListener('visibilitychange', onVisibility);
        };
      }, []);

      // Switching conversations invalidates the previous pass.
      const previous = React.useRef(sessionId);
      React.useEffect(() => {
        if (previous.current === sessionId) return;
        if (previous.current) tempUnlocked.delete(previous.current);
        previous.current = sessionId;
        bumpTemp();
      }, [sessionId]);

      // "Lock new conversations": a session id appearing after the first snapshot
      // is a new conversation. It gets locked and the one you are looking at
      // keeps a temporary pass, so creating a conversation is not a password prompt.
      React.useEffect(() => {
        if (!state || !state.prefs || !state.prefs.lockNewSessions || !state.hasSecret) {
          if (sessions && sessions.byId) {
            for (const id of Object.keys(sessions.byId)) seenSessions.add(id);
            primed = true;
          }
          return;
        }
        if (!sessions || !sessions.byId) return;
        const ids = Object.keys(sessions.byId);
        if (!primed) {
          for (const id of ids) seenSessions.add(id);
          primed = true;
          return;
        }
        for (const id of ids) {
          if (seenSessions.has(id)) continue;
          seenSessions.add(id);
          act('lock.set', { sessionId: id, locked: true })
            .then(() => {
              if (id === sessionId) grantTemp(id);
            })
            .catch(() => {});
        }
      }, [state && state.prefs && state.prefs.lockNewSessions, sessions, sessionId]);

      // Countdowns advance without a reload.
      React.useEffect(() => {
        const timer = window.setInterval(() => {
          refresh();
        }, 20000);
        return () => window.clearInterval(timer);
      }, []);

      React.useEffect(() => {
        refresh();
      }, []);

      const lockedMap = state && state.locked ? state.locked : {};
      useTitleBlur(Boolean(state && state.prefs && state.prefs.hideLockedTitles), lockedMap);

      // A lock flag without a password is unopenable: treat it as unlocked so a
      // half-configured state can never trap someone out of their conversation.
      const locked = Boolean(
        state && state.hasSecret && sessionId && lockedMap[sessionId] && !tempUnlocked.has(sessionId),
      );
      const statusBadge =
        locked && typeof useSessionStatus === 'function' ? h(RunningBadge, { useSessionStatus, sessionId }) : null;

      return h(
        React.Fragment,
        null,
        locked ? h(LockVeil, { key: sessionId, sessionId, statusBadge }) : null,
        h(DialogHost, null),
      );
    }

    // ---------------------------------------------------------------- style --
    const CSS_TEXT = `
.dsl-rowButton{width:16px;height:16px;flex:none;display:inline-flex;align-items:center;justify-content:center;padding:0;border:none;background:0 0;cursor:pointer;border-radius:var(--dsw-radius-xs,4px);color:var(--dsw-alias-label-tertiary,currentColor)}
.dsl-rowButton:hover{color:var(--dsw-alias-label-primary,currentColor)}
.dsl-rowButton[data-locked="true"]{color:var(--dsw-alias-state-warn-primary,#e0a11b)}
.dsl-veil{position:fixed;z-index:1;display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;pointer-events:auto;background:color-mix(in srgb,var(--dsw-alias-bg-base,#14161b) 58%,transparent);backdrop-filter:blur(18px) saturate(.72);-webkit-backdrop-filter:blur(18px) saturate(.72)}
.dsl-card{width:min(380px,100%);box-sizing:border-box;display:flex;flex-direction:column;gap:10px;padding:20px;border-radius:var(--dsw-radius-lg,14px);border:.5px solid var(--dsw-alias-border-l2,rgba(127,127,127,.28));background:var(--dsw-alias-bg-overlay,var(--dsw-alias-bg-layer-1,#1c1f26));color:var(--dsw-alias-label-primary,#e8e8ea);box-shadow:0 18px 48px rgba(0,0,0,.38);font-size:13px;line-height:20px}
.dsl-card--dialog{width:min(420px,100%);max-height:86vh;overflow:auto}
.dsl-title{font-size:14px;font-weight:600;line-height:22px}
.dsl-hint{color:var(--dsw-alias-label-secondary,#a9adb5);font-size:12px;line-height:18px}
.dsl-hint--quiet{color:var(--dsw-alias-label-tertiary,#8b9098)}
.dsl-hint--warn{color:var(--dsw-alias-state-warn-primary,#e0a11b);margin-top:6px}
.dsl-input{box-sizing:border-box;width:100%;height:36px;padding:0 10px;border-radius:var(--dsw-radius-md,8px);border:.5px solid var(--dsw-alias-border-l4,rgba(127,127,127,.4));background:var(--dsw-alias-button-elevated-fill,rgba(127,127,127,.08));color:inherit;outline:none;font-size:14px;line-height:20px}
.dsl-input:focus{border-color:var(--dsw-alias-brand-primary,#4d6bfe)}
.dsl-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:2px}
.dsl-btn{height:32px;padding:0 14px;border-radius:var(--dsw-radius-md,8px);border:.5px solid var(--dsw-alias-border-l3,rgba(127,127,127,.34));background:0 0;color:inherit;cursor:pointer;font-size:13px;line-height:20px;white-space:nowrap}
.dsl-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.12))}
.dsl-btn[data-primary="true"]{border-color:transparent;background:var(--dsw-alias-brand-primary,#4d6bfe);color:#fff}
.dsl-btn[data-danger="true"]{border-color:var(--dsw-alias-state-error-primary,#f05d5d);color:var(--dsw-alias-state-error-primary,#f05d5d)}
.dsl-btn:disabled{opacity:.45;cursor:default}
.dsl-link{align-self:flex-start;padding:0;border:none;background:0 0;color:var(--dsw-alias-link,var(--dsw-alias-brand-primary,#4d6bfe));font-size:12px;cursor:pointer}
.dsl-link:hover{text-decoration:underline}
.dsl-field{display:flex;flex-direction:column;gap:6px;padding-top:2px}
.dsl-field-label{font-size:12px;line-height:17px;color:var(--dsw-alias-label-secondary,#a9adb5)}
.dsl-error{min-height:16px;color:var(--dsw-alias-state-error-primary,#f05d5d);font-size:12px;line-height:16px}
.dsl-status{display:flex;align-items:center;gap:6px;margin-top:2px;color:var(--dsw-alias-label-secondary,#a9adb5);font-size:12px;line-height:16px}
.dsl-dot{width:6px;height:6px;flex:none;border-radius:50%;background:var(--dsw-alias-state-success-primary,#3fb950);animation:dsl-pulse 1.5s ease-in-out infinite}
.dsl-dot--idle{background:var(--dsw-alias-state-warn-primary,#e0a11b)}
@keyframes dsl-pulse{0%{opacity:1}50%{opacity:.35}100%{opacity:1}}
.dsl-dialog{position:fixed;inset:0;width:100%;height:100%;max-width:none;max-height:none;margin:0;padding:24px;border:none;box-sizing:border-box;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.42);color:inherit;font:inherit;pointer-events:auto;overscroll-behavior:contain}
.dsl-dialog::backdrop{background:rgba(0,0,0,.42)}
.dsl-dialog:not([open]){display:none}
.dsl-choice{display:flex;flex-direction:column;gap:4px;text-align:left;padding:12px;border-radius:var(--dsw-radius-md,8px);border:.5px solid var(--dsw-alias-border-l2,rgba(127,127,127,.28));background:0 0;color:inherit;cursor:pointer}
.dsl-choice:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.1))}
.dsl-choice:disabled{opacity:.45;cursor:default}
.dsl-choice-title{font-size:13px;font-weight:600}
.dsl-choice-desc{font-size:12px;line-height:17px;color:var(--dsw-alias-label-secondary,#a9adb5)}
.dsl-settings{display:flex;flex-direction:column;gap:8px;padding:4px 2px 32px;box-sizing:border-box;max-width:720px}
.dsl-settings-head{font-size:16px;font-weight:600;line-height:24px;margin-top:4px}
.dsl-settings-desc{margin-bottom:4px}
.dsl-section-title{margin-top:18px;color:var(--dsw-alias-label-tertiary,#8b9098);font-size:12px;line-height:18px;letter-spacing:.02em}
.dsl-panel{display:flex;flex-direction:column;border-radius:var(--dsw-radius-lg,12px);border:.5px solid var(--dsw-alias-border-l2,rgba(127,127,127,.24));background:var(--dsw-alias-bg-layer-1,rgba(127,127,127,.04));padding:4px 14px;box-sizing:border-box}
.dsl-panel--danger{border-color:var(--dsw-alias-state-error-primary,#f05d5d);padding:12px 14px;gap:4px;margin-top:12px}
.dsl-kv{display:flex;justify-content:space-between;gap:16px;padding:9px 0;font-size:13px;line-height:20px;border-bottom:.5px solid var(--dsw-alias-border-l1,rgba(127,127,127,.14))}
.dsl-kv:last-child{border-bottom:none}
.dsl-kv>span:first-child{color:var(--dsw-alias-label-secondary,#a9adb5)}
.dsl-row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:11px 0;border-bottom:.5px solid var(--dsw-alias-border-l1,rgba(127,127,127,.14))}
.dsl-row:last-child{border-bottom:none}
.dsl-row-text{display:flex;flex-direction:column;gap:2px;min-width:0}
.dsl-row-title{font-size:13px;line-height:20px}
.dsl-row-desc{font-size:12px;line-height:17px;color:var(--dsw-alias-label-tertiary,#8b9098)}
.dsl-row-control{flex:none;display:flex;align-items:center;gap:8px}
.dsl-hours{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
.dsl-chip{height:28px;padding:0 10px;border-radius:999px;border:.5px solid var(--dsw-alias-border-l3,rgba(127,127,127,.34));background:0 0;color:inherit;font-size:12px;cursor:pointer}
.dsl-chip[data-active="true"]{border-color:transparent;background:var(--dsw-alias-brand-primary,#4d6bfe);color:#fff}
.dsl-chip:disabled{opacity:.45;cursor:default}
.dsl-switch{position:relative;width:40px;height:22px;flex:none;border-radius:999px;border:.5px solid var(--dsw-alias-border-l3,rgba(127,127,127,.4));background:var(--dsw-alias-bg-layer-2,rgba(127,127,127,.18));cursor:pointer;padding:0;transition:background .15s var(--ds-ease-in-out,ease)}
.dsl-switch[data-on="true"]{background:var(--dsw-alias-brand-primary,#4d6bfe);border-color:transparent}
.dsl-switch-knob{position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;transition:transform .15s var(--ds-ease-in-out,ease);box-shadow:0 1px 2px rgba(0,0,0,.3)}
.dsl-switch[data-on="true"] .dsl-switch-knob{transform:translateX(18px)}
.dsl-switch:disabled{opacity:.45;cursor:default}
@media (prefers-reduced-motion:reduce){.dsl-dot,.dsl-switch,.dsl-switch-knob{animation:none;transition:none}}
`;

    // ---------------------------------------------------------------- apply --
    function effect(ctx, fn, label) {
      if (ctx && typeof ctx.effect === 'function') return ctx.effect(fn, label);
      return fn();
    }

    function apply(ctx) {
      effect(
        ctx,
        () => {
          const tag = document.createElement('style');
          tag.dataset.plugin = 'dsh-session-lock';
          tag.dataset.pluginCss = 'dsh-session-lock:client';
          tag.textContent = CSS_TEXT;
          document.head.appendChild(tag);
          return () => {
            tag.remove();
          };
        },
        'dsh-session-lock: styles',
      );

      const wire = (ready) => {
        installStrings(ready);
        refresh().catch(() => {});

        const register = () => {
          ready.slots.inject('shell.overlay', () =>
            ready.slots.register(
              { name: 'shell.overlay', id: 'dsh-session-lock-veil', order: 1000 },
              (props) =>
                h(OverlayRoot, {
                  uiSession: ready.uiSession,
                  useSessionStatus: props ? props.useSessionStatus : undefined,
                  useSessions: props ? props.useSessions : undefined,
                }),
            ),
          );

          ready.slots.inject('sidebar.workspaces.session.row.action', () =>
            ready.slots.register(
              { name: 'sidebar.workspaces.session.row.action', id: 'dsh-session-lock', order: 150 },
              SessionLockButton,
            ),
          );

          ready.slots.inject('settings.section', () =>
            ready.slots.register(
              {
                name: 'settings.section',
                id: 'session-lock',
                order: 26,
                label: () => '对话锁',
              },
              SettingsSection,
            ),
          );
        };
        effect(ready, register, 'dsh-session-lock: mounts');
        effect(ready, () => installRestoreGate(ready), 'dsh-session-lock: restore gate');
      };

      if (typeof ctx.inject === 'function') {
        ctx.inject(['slots', 'uiSession', 'locale', 'uiWorkspace', 'workspaces'], wire);
      } else {
        wire(ctx);
      }
    }

    return { apply };
  },
});
