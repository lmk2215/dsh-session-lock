# dsh-session-lock

A conversation lock for the DeepSeek Harness sidebar. Lock any conversation and **only the conversation area** is covered by a frosted veil with a password box — the sidebar keeps working, and locked conversations keep running.

## Features

- **One lock per row** in the sidebar; click to lock, click again and enter the password to unlock for good.
- **Conversation area only** — the veil starts at the sidebar's right edge, leaving the sidebar and bottom panel usable.
- **Re-locks automatically** on window blur, `pagehide`, tab hidden, and whenever you switch conversations.
- **Never interrupts work** — the lock is a UI layer. Running turns continue, tokens are still billed, output still lands in the session log. The veil shows a "background task is still running" line.
- **Password lives on the Host** — digest and lock flags are stored in `<DSH_HOME>/session-lock/state.json`, so clearing `localStorage` unlocks nothing.
- **Three recovery paths** — Windows login password (enabled only after a real credential check), a cooling period that clears the password, and changing the password.
- **Defaults** — lock new conversations, hide locked titles, a three-position archive-restore policy, lock everything / unlock everything.

## Install

From the plugin market: **Settings → Plugins → Discover**, search `dsh-session-lock`.

Or from the command line:

```powershell
dsh plugin --profile desktop add github:lmk2215/dsh-session-lock
```

Restart DSH once (the Host half must load), then open **Settings → Conversation Lock** and set a password.

Requires DSH `>= 0.2.0-rc.1` and Node `>= 20`. No build step: the package is the source.

## Recovery

| Channel | Needs | Notes |
| --- | --- | --- |
| Old password | remembering it | That is "change password", not recovery |
| Windows login password | this machine's Windows account password | Verified once through `.NET PrincipalContext('Machine').ValidateCredentials` when you enable it; Microsoft accounts and passwordless machines fail, which is why the channel is opt-in per machine |
| Cooling period | time | Chosen inside the create/change password dialog: 1 / 6 / 24 / 72 / 168 hours. When it expires the password is cleared and every lock released. It cannot be cancelled by hand, but the correct password stops it |

With all three off, the Settings page warns in red: a forgotten password can only end in deleting data.

## Boundaries

This lock is against **someone looking at your screen**.

- Session files live in `~/.dsh/sessions/<workspace>/<sessionId>/session.v4.jsonl.zstd` — zstd is compression, not encryption. Anyone who can sign in as you can read them.
- A cooling period depends on the system clock; moving it forward ends the period early. The plugin records this and shows a warning in Settings.
- PBKDF2-SHA256, random 16-byte salt, 120000 iterations; five wrong attempts lock the input for 30 seconds.
- The two local routes require a custom header, so a cross-site form cannot call them.

## Uninstall

```powershell
dsh plugin --profile desktop remove dsh-session-lock
```

Uninstalling keeps `<DSH_HOME>/session-lock/state.json`; delete that directory if you do not want it.

## License

MIT
