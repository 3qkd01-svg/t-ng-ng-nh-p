PA1DUAL2 FINAL 0.9.0 - 2026-10-23

Objective: accurate ID prediction and fast dispatch/response observation.
The next pair remains exactly actual selected ID +1 and +2, each once per slot.
No maximum-ID anchor, hole rotation, or skipping previously seen candidates.
One authenticated tab; no credential copying or extra authentication headers.
Manual login and verification, 120s deadline after navigation, HTTPS URL input,
standard mobile choice (Pixel 7 profile on Windows Chromium, not a GPM kernel).
Schedule 11/13/15/17/19/21 Hanoi, enter chat 30s early, hold chat five minutes
after a round, then return home. Two API plus at most two native UI requests;
second UI Open remains 500ms after first and respects the site's opening lock.

Changes:
- One browser invocation to initialize and dispatch the native API pair.
- Local nonblocking attribution binding before XHR.send; the route guard no
  longer queries the renderer for request attribution. Missing metadata is
  bounded to 200ms and rejected rather than guessed.
- Report cleanup is bounded when renderer commands are unresponsive.
- Chat health remains observed during HTTP requests; recovery navigation waits
  until requests end. Grace 12s, cooldown 15s, maximum three recovery attempts.
- Browser latency sampling runs in the current SPA document and after reload;
  stale samplers expire and are stopped at round end.
- observation report section records pair correctness, actual match, counts,
  dispatch offset, API gap, lead over chat and maximum route attribution wait.

Validation: 43 tests passed with none failed/cancelled/skipped (18 source unit
and 25 extracted-ZIP tests). Includes native auth/signature preservation,
request limits, IDs out of order, blocked renderer commands, reload, chat
recovery after HTTP completion, two-minute login, mobile and per-origin state.
Fresh ZIP installed using npm ci and the pinned playwright-core 1.63.0 lockfile.
No authenticated real-site claim or Windows launcher execution tested.
This cannot guarantee target-server responsiveness or reward receipt.

Requires Node.js >=22 and supported Edge/Chrome on Windows. Stop older versions
before opening start-pa1dual2.cmd from the extracted folder. Reuse the same
folder in future to retain per-origin ID memory. Startup always learns UI first.
No CAPTCHA solver, automatic domain switching or changes to site permissions.
