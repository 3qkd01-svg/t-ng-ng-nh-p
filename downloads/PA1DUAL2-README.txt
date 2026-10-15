PA1DUAL2 0.8.1 - 2026-10-15

Enter a public HTTPS URL, select Edge/Chrome, select Windows (1) or standard
Mobile (2), then enter the API offset in ms (default 50).
Login and CAPTCHA/OTP verification are manual in the browser. After navigation,
login confirmation has a 120-second deadline. The schedule starts only after
confirmation. Expiry stops and closes the browser; reopen the launcher to retry.
The standard Mobile choice uses Playwright's Pixel 7 UA/viewport/touch profile.
The engine remains Chromium on Windows, not a custom GPM kernel or real Android.
There is no automatic domain switching, verification solver or bypass.
State is scoped to each origin and old unscoped files are preserved.
The original UI/API limits, schedule, recovery and media rules remain in place.

Requires Node.js >=22 and supported Edge/Chrome on Windows.
Stop older versions first. Run start-pa1dual2.cmd from the extracted folder.
First launch installs playwright-core 1.63.0 with npm ci from the pinned lockfile.
Enter stops the program after the initial startup questions.

Validation: 29 tests passed (7 source core + 22 extracted-ZIP tests), none failed
or skipped. Includes Chromium against local fixtures, login expiry with short
test deadlines, stalled evaluation, user-supplied URL, mobile UA/touch/viewport,
origin-scoped state, UI/API concurrency, request limits and socket recovery.
No real authenticated reward claim and no Windows launcher execution tested.
A fresh download folder has separate state. Reuse the same launcher folder
on later starts to retain ID history. See HUONG-DAN.txt for details.
