# -*- coding: utf-8 -*-
"""End-to-end probe of the session-lock Host routes.

The DSH web port changes between launches, so pass it in:

    python tests/api_probe.py 65497

This script writes real state. Run it against a throwaway profile, or expect to
set the password again afterwards. It wipes `state.json` at the end.
"""
import json
import os
import pathlib
import sys
import urllib.request

PORT = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("DSH_PORT", "65497")
BASE = f"http://127.0.0.1:{PORT}/session-lock"
HEADERS = {"content-type": "application/json", "x-dsh-session-lock": "1"}


def call(action, **body):
    request = urllib.request.Request(
        BASE + "/action",
        data=json.dumps({"action": action, **body}).encode(),
        method="POST",
        headers=HEADERS,
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode())


def get():
    request = urllib.request.Request(BASE + "/state", headers=HEADERS)
    with urllib.request.urlopen(request, timeout=10) as response:
        return json.loads(response.read().decode())


def show(label, payload):
    state = payload.get("state") or {}
    prefs = state.get("prefs") or {}
    print(
        f"{label:<28} ok={payload.get('ok')!s:<5} "
        f"err={payload.get('error') or '-':<16}"
        f" hasSecret={state.get('hasSecret')} locked={len(state.get('locked') or {})}"
        f" cooling={state.get('cooling', {}).get('active')}"
        f" restore={prefs.get('restorePolicy')}"
        f" win={state.get('recovery', {}).get('windowsPasswordEnabled')}"
    )


print("initial:", json.dumps(get()["state"]["prefs"], ensure_ascii=False))

show("create password", call("secret.create", password="probe-pass-1", coolingHours=6))
show("verify wrong", call("secret.verify", password="nope"))
show("verify right", call("secret.verify", password="probe-pass-1"))
show("lock.set one", call("lock.set", sessionId="probe-session-a", locked=True))
show("lock.many", call("lock.many", sessionIds=["probe-b", "probe-c"]))
show("restore policy = all", call("prefs.set", patch={"restorePolicy": "all"}))
show("restore policy = locked", call("prefs.set", patch={"restorePolicy": "locked"}))
show("windows register wrong", call("recovery.windows.register", password="definitely-wrong-password"))
show("cooling start", call("recovery.cooling.start"))
show("cooling cancel wrong", call("recovery.cooling.cancel", password="nope"))
show("cooling cancel right", call("recovery.cooling.cancel", password="probe-pass-1"))
show("change password", call("secret.change", oldPassword="probe-pass-1", newPassword="probe-pass-2", coolingHours=0))
show("verify old (should fail)", call("secret.verify", password="probe-pass-1"))
show("verify new", call("secret.verify", password="probe-pass-2"))
show("clear all locks", call("lock.clear", password="probe-pass-2"))
show("restore policy = off", call("prefs.set", patch={"restorePolicy": "off"}))

final = get()["state"]
print("final locked:", final["locked"], "cooling:", final["cooling"]["active"])

state_file = pathlib.Path(os.path.expanduser("~/.dsh/session-lock/state.json"))
if state_file.exists():
    state_file.unlink()
    print("state file wiped:", state_file)
