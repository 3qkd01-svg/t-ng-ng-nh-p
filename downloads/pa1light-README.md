# PA1LIGHT 0.11.0

Adds selective chat rendering controls to PA1NETFIX 0.10.0 / SAVELOGIN 0.9.0. It keeps the saved URL/session folders, 120-second login limit, minute-57 reload, chat entry at T-3s, one native Open as soon as ready, rate-limit handling and scheduled AboveNormal priority.

A verified Vuex display mutation is filtered before known ordinary text/image/share/game rows are added to the chat log or trigger scrolling. Initial history retains two hidden native boundary rows; its server response and cursors are untouched. Pull-to-load older history is parked in lightweight mode. Envelope events and unrecognized entries are forwarded immediately. Receipt display rows are retained and batched for at most 150ms/128 rows, with the original list cap/order preserved. An envelope flushes pending display rows immediately. Clear/history/mention mutations retain native ordering, including logout cleanup.

WebSocket frames, keepalives, authentication, pinned/private notifications and native HTTP result handling are not filtered. Runtime function/shape checks refuse unsupported stores or rooms; the normal flow remains available. Reports contain only light-mode counters and status, never message content or user identifiers.

Close the previous PA1 first. Run start-pa1retry500.cmd for light chat, or start-normal-chat.cmd for the normal chat view. These are alternatives; do not run both concurrently. Copy private link-login and cookie-tai-khoan folders beside the new launcher if retaining an existing saved session. Login files and public-site source captures are not included in this ZIP.

Validation: 62 tests passed using the extracted ZIP, real Vue/Vuex and the public chat module read on 19 November 2026. Seven mocked PowerShell process scenarios passed; the CPU helper is unchanged. A local 320-event comparison produced 320 Vue updates in normal mode and 10 in light mode; both retained two envelope notifications. These are simulated-renderer measurements, not a production speed or reward-success guarantee. Native Windows priority changes and authenticated live-peak operation have not been tested.
