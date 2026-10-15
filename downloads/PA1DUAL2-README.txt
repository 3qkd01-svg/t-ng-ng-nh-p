PA1DUAL2 0.8.2 - 2026-10-15

Prediction is exactly the actual selected envelope ID +1 and +2.
Example: actual 14092 -> next API pair 14093/14094.
Then actual 14091 -> next pair 14092/14093, even if higher IDs were also seen.
No maximum-ID anchor, hole rotation, or skipping of previously seen/successful
candidates. Other chat events are logged but cannot replace the selected anchor.
API results do not replace the actual chat anchor. The first startup slot still
learns the native UI request; missing actual chat data requires UI calibration.
Both the prediction anchor and its source are printed and saved in reports.
Old v1 ID-state files are readable, but every startup learns a fresh UI anchor.

Existing features retained: public HTTPS URL input, manual login with a 120s
deadline, standard mobile profile option, one tab, 30s chat lead, bounded recovery,
media reduction, 5min post-round hold, at most 2 API plus 2 UI requests per slot.
Mobile uses Playwright Pixel 7 UA/viewport/touch, not a custom GPM kernel.
Verification is manual. No automatic domain switching or CAPTCHA solver.

Requires Node >=22 and supported Edge/Chrome on Windows.
Stop previous versions, extract ZIP, then run start-pa1dual2.cmd.
First run installs pinned playwright-core 1.63.0 using npm ci.
Reuse the same extracted folder on future runs to keep per-origin ID memory.

Validation: 33 tests passed, none failed/cancelled/skipped (10 source core and
23 extracted-ZIP tests), including the exact 14092 -> 14091 regression with
unrelated higher chat events and real native API dispatch against a local mock.
No authenticated real-site claim or Windows launcher execution tested.
This ID fix does not establish a fix for production HTTP timeouts.
