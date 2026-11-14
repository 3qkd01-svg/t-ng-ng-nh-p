// Read-only timing diagnostics. IDs are used in memory for correlation only.
export function browserProbe({ key, startAt, endAt, quietStartAt=startAt-5000, quietEndAt=endAt }) {
  window[key]?.stop?.();
  if (Date.now() > endAt + 15000) return;
  const state = { samples: 0, maxDelayMs: 0, delayOver500ms: 0, stalls: [],
    longTasks: 0, maxLongTaskMs: 0, networkWarnings: [], domScans:0, domScansSkipped:0 };
  let timer, observer, stopped = false, lastScan = 0, warningVisible = false;
  const active = () => Date.now() >= startAt - 360000 && Date.now() <= endAt + 15000;
  function schedule() {
    if (stopped || Date.now() > endAt + 15000) { stopped = true; observer?.disconnect(); return; }
    const wait = active() ? 200 : 1000;
    const expected = performance.now() + wait;
    timer = setTimeout(() => {
      if (stopped) return;
      if (active()) {
        const lag = Math.max(0, Math.round(performance.now() - expected));
        state.samples++;
        state.maxDelayMs = Math.max(state.maxDelayMs, lag);
        if (lag >= 500) {
          state.delayOver500ms++;
          state.stalls.push({ at: new Date().toISOString(), delayMs: lag });
          state.stalls.sort((a, b) => b.delayMs - a.delayMs);
          state.stalls.length = Math.min(state.stalls.length, 10);
        }
        const quiet=Date.now()>=quietStartAt&&Date.now()<quietEndAt;
        if(quiet)state.domScansSkipped++;
        if (!quiet && Date.now() - lastScan >= 1000) {
          state.domScans++;
          lastScan = Date.now();
          let found = false;
          for (const el of document.querySelectorAll('.van-toast, .van-notify, .el-message, .ant-message-notice-content')) {
            if (!el.getClientRects().length || getComputedStyle(el).visibility === 'hidden') continue;
            const value = (el.textContent || '').slice(0, 512).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
            if (/mang.*cham|loi mang|ket noi|network|timeout|connection/.test(value)) {
              found = true;
              break;
            }
          }
          if (found && !warningVisible && state.networkWarnings.length < 20) {
            state.networkWarnings.push({ at: new Date().toISOString(), kind: 'network-warning' });
          }
          warningVisible = found;
        }
      }
      schedule();
    }, wait);
  }
  try {
    observer = new PerformanceObserver(list => {
      if (!active()) return;
      for (const task of list.getEntries()) {
        state.longTasks++;
        state.maxLongTaskMs = Math.max(state.maxLongTaskMs, Math.round(task.duration));
      }
    });
    observer.observe({ type: 'longtask', buffered: false });
  } catch {}
  schedule();
  window[key] = { snapshot: () => ({ ...state }),
    stop: () => { stopped = true; clearTimeout(timer); observer?.disconnect(); } };
}

export function serverTimes(event, now = Date.now()) {
  const output = [];
  for (const [scope, obj] of [['event', event], ['data', event?.data]]) {
    if (!obj || typeof obj !== 'object') continue;
    for (const field of ['timestamp', 'ts', 'time', 'created_at', 'create_time', 'send_time']) {
      const value = obj[field];
      let epoch = null;
      if ((typeof value === 'number' || typeof value === 'string') && /^\d{10}(\d{3})?$/.test(String(value))) {
        epoch = Number(value) * (String(value).length === 10 ? 1000 : 1);
      } else if (typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?(?:Z|[+-]\d\d:\d\d)$/.test(value)) {
        epoch = Date.parse(value);
      }
      if (Number.isFinite(epoch) && epoch !== null && Math.abs(epoch - now) < 7 * 86400000) {
        output.push({ field: scope + '.' + field, utc: new Date(epoch).toISOString(), meaning: 'unverified-event-time' });
      } else if (typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(value)) {
        output.push({ field: scope + '.' + field, clockTime: value, timezone: 'unspecified' });
      }
    }
  }
  return output;
}

export async function attachLatencyDiagnostics(context, page, { startAt, endAt, origin, key }) {
  const report = { mode: 'read-only', timingMeaning: 'Chromium CDP receive timestamp, not physical packet arrival',
    cdp: 'unavailable', calibrationUncertaintyMs: null, calibrationSamples: [], connections: [], events: [], selectedEvent: null,
    apiRequests: [], droppedApiRecords: 0, clockEstimates: [], browser: null,
    quietWindow:{startAt:startAt-5000,endAt,periodicCalibrationsDeferred:0},
    node: { samples: 0, maxDelayMs: 0, delayOver500ms: 0 } };
  const near = () => Date.now() >= startAt - 360000 && Date.now() <= endAt + 15000;
  const records = new WeakMap(), ids = new Map(), connections = new Map();
  let selected = null, cdp, clockOffset = null, active = true, calibrating = false, calibratedAt = 0;
  async function calibrate() {
    if (calibrating || !active) return;
    calibrating = true;
    try {
      const before = Date.now();
      const { metrics } = await cdp.send('Performance.getMetrics');
      const after = Date.now(), timestamp = metrics.find(m => m.name === 'Timestamp')?.value;
      if (!Number.isFinite(timestamp)) throw new Error('CLOCK_UNAVAILABLE');
      if (!active) return;
      clockOffset = (before + after) / 2 - timestamp * 1000;
      calibratedAt = after;
      report.calibrationUncertaintyMs = Math.ceil((after - before) / 2);
      report.calibrationSamples.push({ at: new Date(after).toISOString(), uncertaintyMs: report.calibrationUncertaintyMs });
      if (report.calibrationSamples.length > 8) report.calibrationSamples.shift();
    } finally { calibrating = false; }
  }
  // addInitScript alone does not run in the current SPA document and would
  // accumulate a stale sampler on every future reload. Install the active
  // sampler now and again only when this page finishes a real navigation.
  async function installProbe() {
    if (!active || page.isClosed()) return;
    let timeout;
    try {
      await Promise.race([page.evaluate(browserProbe, { key, startAt, endAt }).catch(() => {}),
        new Promise(resolve => { timeout = setTimeout(resolve, 1000); })]);
    } finally { clearTimeout(timeout); }
  }
  const documentLoaded = () => { void installProbe(); };
  page.on('domcontentloaded', documentLoaded);
  await installProbe();
  let expected = performance.now() + 250;
  const timer = setInterval(() => {
    const now = performance.now(), delay = Math.max(0, Math.round(now - expected));
    expected = now + 250;
    if (!near()) return;
    if (report.cdp === 'enabled' && Date.now() - calibratedAt > 30000){
      if(Date.now()>=startAt-5000&&Date.now()<endAt)report.quietWindow.periodicCalibrationsDeferred++;
      else void calibrate().catch(() => {});
    }
    report.node.samples++;
    report.node.maxDelayMs = Math.max(report.node.maxDelayMs, delay);
    if (delay >= 500) report.node.delayOver500ms++;
  }, 250);
  const request = req => {
    if (!active || !near() || !['xhr', 'fetch', 'document'].includes(req.resourceType())) return;
    if (report.apiRequests.length >= 300) { report.droppedApiRecords++; return; }
    let url;
    try { url = new URL(req.url()); } catch { return; }
    const match = url.pathname.match(/\/(chat\/(?:getToken|getChatLog|grabred))\/?$/i);
    const item = { at: new Date().toISOString(), route: match ? '/' + match[1] : req.resourceType() === 'document' ? 'document' : 'other-api',
      sameOrigin: url.origin === origin, method: req.method(), httpStatus: null, responseMs: null, elapsedMs: null, failure: null };
    report.apiRequests.push(item);
    records.set(req, { item, mono: performance.now(), wall: Date.now() });
  };
  const response = res => {
    const rec = records.get(res.request());
    if (!active || !rec) return;
    rec.item.httpStatus = res.status();
    rec.item.responseMs = Math.round(performance.now() - rec.mono);
    const h = res.headers(), date = Date.parse(h.date || ''), received = Date.now();
    if (rec.item.sameOrigin && res.status() === 200 && (!h.age || Number(h.age) === 0) &&
        Number.isFinite(date) && Math.abs(date - received) < 7 * 86400000 && report.clockEstimates.length < 8) {
      report.clockEstimates.push({ at: new Date(received).toISOString(), route: rec.item.route,
        estimatedServerMinusLocalMs: Math.round(date - (rec.wall + received) / 2),
        uncertaintyMs: 1000 + Math.ceil(rec.item.responseMs / 2), source: 'HTTP Date; may be gateway; not clock synchronization' });
    }
  };
  const done = req => { const rec = records.get(req); if (active && rec) rec.item.elapsedMs = Math.round(performance.now() - rec.mono); };
  const failed = req => {
    const rec = records.get(req);
    if (!active || !rec) return;
    rec.item.elapsedMs = Math.round(performance.now() - rec.mono);
    rec.item.failure = req.failure()?.errorText?.match(/\bERR_[A-Z_]{1,60}\b/)?.[0] || 'OTHER_NETWORK_ERROR';
  };
  page.on('request', request); page.on('response', response);
  page.on('requestfinished', done); page.on('requestfailed', failed);
  const fromCdp = timestamp => clockOffset === null ? null : new Date(timestamp * 1000 + clockOffset).toISOString();
  try {
    cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Performance.enable');
    await calibrate();
    report.cdp = 'enabled';
    cdp.on('Network.webSocketCreated', e => {
      if (!active || report.connections.length >= 20) return;
      const item = { createdAt: new Date().toISOString(), handshakeStatus: null, firstFrameAt: null, lastFrameAt: null, frames: 0, closedAt: null };
      connections.set(e.requestId, item); report.connections.push(item);
    });
    cdp.on('Network.webSocketHandshakeResponseReceived', e => {
      const item = connections.get(e.requestId); if (item) item.handshakeStatus = e.response.status;
    });
    cdp.on('Network.webSocketClosed', e => {
      const item = connections.get(e.requestId);
      if (item) item.closedAt = fromCdp(e.timestamp);
      connections.delete(e.requestId);
    });
    cdp.on('Network.webSocketFrameReceived', e => {
      if (!active) return;
      const at = fromCdp(e.timestamp), item = connections.get(e.requestId);
      if (item) { item.firstFrameAt ||= at; item.lastFrameAt = at; item.frames++; }
      const payload = e.response.payloadData;
      if (e.response.opcode !== 1 || payload.length > 524288) return;
      try {
        const event = JSON.parse(payload), id = String(event?.data?.red_id ?? '');
        if (event?.type !== 'chat_red' || !id || id.length > 256 || ids.has(id) || ids.size >= 2000) return;
        const entry = { cdpReceivedAt: at, cdpHandlerAt: new Date().toISOString(), serverTimes: serverTimes(event) };
        ids.set(id, entry);
        if (near() && report.events.length < 20) report.events.push(entry);
      } catch {}
    });
  } catch {
    report.cdp = 'unavailable';
    console.log('Khong bat duoc do CDP; bao cao van ghi API va do tre giao dien.');
  }
  return {
    noteEvent(data, at) { selected = { id: String(data.red_id), at }; },
    async finish() {
      if (selected) {
        const entry = ids.get(selected.id);
        report.selectedEvent = { observerReceivedAt: selected.at, ...(entry || {}),
          cdpToObserverMs: entry?.cdpReceivedAt ? Date.parse(selected.at) - Date.parse(entry.cdpReceivedAt) : null };
      }
      try {
        report.browser = await Promise.race([page.evaluate(k => {
          const probe = window[k]; const state = probe?.snapshot(); probe?.stop(); return state || null;
        }, key), new Promise(resolve => setTimeout(() => resolve({ snapshotTimedOut: true }), 1000))]);
      } catch { report.browser = { pageUnavailable: true }; }
      active = false;
      clearInterval(timer);
      page.off('domcontentloaded', documentLoaded);
      page.off('request', request); page.off('response', response);
      page.off('requestfinished', done); page.off('requestfailed', failed);
      ids.clear(); connections.clear(); selected = null;
      try { await cdp?.detach(); } catch {}
      return report;
    }
  };
}
