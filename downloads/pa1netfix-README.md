# PA1NETFIX 0.10.0

Built from PA1SAVELOGIN 0.9.0. Keeps saved URL/session files and the 120-second manual login limit. Uses the existing 11/13/15/17/19/21 Hanoi schedule, reloads once at minute 57, and enters chat three seconds before each round.

The program selects the first new eligible chat envelope and clicks its native Open control once as soon as the UI is ready. It adds no 100ms delay or second 500ms attempt. It never releases a pending flag to force another Open. HTTP 429 respects Retry-After; a recognized rate-limit notice prevents a new claim. Network failures are recorded separately from native timeout/abort events and do not trigger retransmission by the application.

Finite native Open timeouts shorter than 60 seconds are extended to 60 seconds; unlimited timeout 0 is preserved. Reports retain safe server messages and classify missing results as unknown. Response parsing cannot update an already-finalized outcome asynchronously.

On Windows, a separate watcher requests AboveNormal priority for this PA1 browser tree and its Node controller from T-30s to T+60s every round. It restores saved priorities on expiry, Stop or owner exit, preserves higher/external priority changes, and reports unavailable/incomplete operations. It changes neither CPU affinity nor power plans or hardware clocks.

Close the previous PA1 before starting this release. To retain login, copy the private link-login and cookie-tai-khoan folders beside the new launcher. These folders are never included in the release ZIP. Run start-pa1retry500.cmd with Node.js 22+ and an installed Edge/Chrome on supported Windows.

Validation: 46 Node/browser tests passed against the extracted release; seven mocked PowerShell process scenarios passed. Native Windows priority changes and live target claims have not been tested. This release does not guarantee server availability or reward acceptance.
