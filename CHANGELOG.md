# Changelog

## 0.2.0

The first published version. Everything below ships in it.

**Lock**
- Lock button on every sidebar conversation row (between archive and pin).
- A locked conversation blurs only the conversation area; the sidebar stays visible and clickable.
- The blur geometry follows the frame's own grid track, so resizing, collapsing, and dragging the sidebar all track correctly.
- Re-locks on window blur, `pagehide`, tab hidden, and whenever the open conversation changes.
- The veil reports background activity (`running` / `waiting for approval`) without revealing content. Locking never pauses the agent loop.

**Host-backed state**
- Password digest, lock flags, and preferences live in `<DSH_HOME>/session-lock/state.json`.
- A page-side `localStorage.clear()` cannot unlock anything.
- Two same-origin routes (`GET /session-lock/state`, `POST /session-lock/action`) behind a custom-header guard.
- The in-memory cache is keyed to the file's mtime+size, so an external edit or delete is picked up instead of being overwritten.
- PBKDF2-SHA256, random 16-byte salt, 120000 iterations. Five wrong attempts lock the input for 30 seconds.

**Settings → 对话锁**
- Status (password set, locked count, last unlock, last reset, clock-jump warning).
- Change password (current / new / repeat).
- Recovery channels:
  - **Windows login password**, enabled only after a real `.NET PrincipalContext('Machine').ValidateCredentials` check passes; the password travels on the child process's stdin and is never stored. Microsoft accounts and passwordless machines simply fail the check, so the channel stays off.
  - **Cooling period**, chosen inside the password dialog (1 / 6 / 24 / 72 / 168 hours, or off). When it expires the password is cleared and every lock released. It cannot be cancelled by hand; entering the correct password stops it.
- Defaults: lock new conversations, hide locked titles in the sidebar, restore-from-archive policy (`all` / `locked` / `off` — switching the position needs the password), lock everything, unlock everything.

**Dialog layers**
- Every dialog is a native `<dialog>` in the browser top layer, so a dialog opened from Settings is never covered by the Settings page.

**Migration**
- A digest written by the pre-0.2 page-local build in `localStorage` is imported into the Host on first read, idempotently, and the local copy is removed.

## Unreleased

- Nothing yet.
