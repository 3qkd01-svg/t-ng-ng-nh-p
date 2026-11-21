# PA1LIGHT15FIX 0.11.2

Repairs initial chat connection recovery in PA1LIGHT15. Recovery now starts while waiting for the first usable connection and UI, rather than only after the first successful setup. The initial connection wait lasts through the round deadline instead of aborting after 15 seconds. A failed global getToken bootstrap is restarted by a normal reload of the same tab; no token endpoint is called directly.

The same three-attempt budget covers initial setup and later losses. Recovery retains the 12-second grace and 15-second minimum interval, cannot overlap itself, and defers for tracked bootstrap requests. T-5s through T+3s protects a still-live socket from UI-only recovery; a confirmed disconnected socket may recover during that interval after the grace/cooldown. Once an envelope is selected or a native Open has been offered, PA1 does not reload. After the budget is exhausted it still observes for a natural reconnection until the round deadline. Readiness requires both recent chat frames and the native authenticated chat UI. An envelope queued before UI readiness remains eligible for the single native Open.

Keeps T-15s chat entry (xx:59:45 Hanoi), minute-57 reload, lightweight chat, one immediate native Open, rate-limit handling, saved URL/login folders, AboveNormal from T-30s through T+60s and the continuous Hanoi schedule. Reports add chatReadiness and recovery states, and distinguish internal cleanup from a user stop.

The verification JSON records the checks performed on a freshly extracted ZIP. Local browser tests do not establish live target latency or guarantee reward acceptance. Native Windows CPU priority changes are not exercised by the Linux test runner; the priority helper is checked with mocked process APIs.

Close the old app before running start-pa1retry500.cmd. To retain private saved login, close the app, copy link-login and cookie-tai-khoan beside the new launcher, and reopen it. These private folders and all user reports are excluded from this download. start-normal-chat.cmd remains the normal-chat alternative.
