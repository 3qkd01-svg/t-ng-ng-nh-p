import { chromium } from 'playwright-core';
import { createInterface } from 'node:readline/promises';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { installFastClick, nextWindow } from './fast-click.mjs';
import { installSecondOpen } from './second-open.mjs';
import { createChatRecovery } from './chat-recovery.mjs';
import { attachLatencyDiagnostics } from './opt-diagnostics.mjs';
import { LOGIN_TIMEOUT_MS, normalizeTargetUrl, waitForLogin, within } from './startup-link120.mjs';
export { LOGIN_TIMEOUT_MS, normalizeTargetUrl, waitForLogin } from './startup-link120.mjs';

export const PLAN1_URL = 'https://hay8888.ink/mobile/?platfrom=app&device=native#/';

export function formatHanoiClock(at) {
  const date = new Date(at + 7 * 3600000);
  const pad = value => String(value).padStart(2, '0');
  return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())} ${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}/${date.getUTCFullYear()}`;
}

export function determineRunTime(answer = '', now = Date.now()) {
  const input = answer.trim();
  const window = nextWindow(input ? Number(input) : undefined, now);
  return { currentAt: now, automatic: !input, ...window, enterChatAt: window.startAt - 30000 };
}

export function formatRemaining(ms) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds / 3600)} gio ${Math.floor(seconds / 60) % 60} phut ${seconds % 60} giay`;
}

// Keep login verification and envelope controls visible; skip decorative media.
export function shouldSkipMedia(request) {
  if (!['image', 'media'].includes(request.resourceType())) return false;
  return !/(captcha|challenge|turnstile|recaptcha|hcaptcha|verification|verify|geetest|arkose|funcaptcha|redbag|redpack|hongbao|img_rp_)/i.test(request.url());
}

export function isTracker(request) {
  try {
    const host = new URL(request.url()).hostname;
    return /^(www\.)?googletagmanager\.com$|^connect\.facebook\.net$|(^|\.)hotjar\.com$|^plausible\.qmcapp\.com$/i.test(host);
  } catch { return false; }
}

export function installOpenDiagnostics(key) {
  const api = window[key];
  if (!api) return;
  const snapshot = api.snapshot;
  api.snapshot = () => {
    const state = snapshot();
    const roots = [document.querySelector('#app')?.__vue__];
    const seen = new Set();
    let room = null;
    while (roots.length && seen.size < 1000) {
      const vm = roots.pop();
      if (!vm || seen.has(vm)) continue;
      seen.add(vm);
      if (typeof vm.getChatGrabred === 'function' && 'redPackDetail' in vm) { room = vm; break; }
      roots.push(...(vm.$children || []));
    }
    const flag = name => room && name in room ? !!room[name] : null;
    const button = room?.$el?.querySelector('.getRedPackImgCon');
    const visible = !!button && button.getClientRects().length > 0 && getComputedStyle(button).visibility !== 'hidden';
    const artwork = [...(room?.$el?.querySelectorAll('img') || [])].filter(el => /img_rp_/i.test(el.currentSrc || el.src));
    return { ...state, uiAtSnapshot: {
      roomFound: !!room, loggedIn: flag('loginStatus'), member: flag('isMember'),
      openModal: flag('showGrabRedPack'), appDownloadPrompt: flag('showAppDownloadPrompt'),
      alreadyObtainedModal: flag('showHasBeenObtained'), expiredModal: flag('showRedPackExpired'),
      opening: flag('rbIsOpening'), openButtonPresent: !!button, openButtonVisible: visible,
      artworkImages: artwork.length, artworkFailed: artwork.filter(el => el.complete && el.naturalWidth === 0).length
    } };
  };
}

// Read only the UI's login flag. No cookie, password or token is exported.
export function loginFlag() {
  const root = document.querySelector('#app')?.__vue__;
  const flag = root?.$store?.getters?.['user/loginStatus'];
  return flag === true || flag === 1;
}

export async function preparePlan1(page, options) {
  const { startAt, key, endAt, mark, cancelled, frameRecent } = options;
  const enterAt = startAt - (options.leadMs ?? 30000);
  const pause = options.pollMs ?? 500;
  const check = () => {
    if (cancelled()) throw new Error('STOPPED');
    if (page.isClosed()) throw new Error('PAGE_CLOSED');
    if (Date.now() >= endAt) throw new Error('WINDOW_ENDED');
  };
  async function until(test, timeoutAt = endAt) {
    while (true) {
      check();
      if (await test()) return;
      if (Date.now() >= timeoutAt) throw new Error('CHAT_NOT_READY');
      await delay(pause);
    }
  }
  async function route(hash, label) {
    check();
    mark(label + '-requested');
    await page.evaluate(hash => { location.hash = hash; }, hash);
    await until(() => page.evaluate(hash => location.hash === hash, hash), Math.min(endAt, Date.now() + 20000));
    mark(label + '-entered');
  }
  async function ready() {
    // The temporary observer has no offered ID and cannot click during readiness checks.
    await page.evaluate(k => window[k]?.stop(), key);
    const result = await page.evaluate(installFastClick, { key, startAt, endAt });
    await page.evaluate(k => window[k]?.stop(), key);
    return result.inChat && result.supported && result.loggedIn;
  }
  mark('waiting-login');
  await waitForLogin(page, { timeoutMs: options.loginTimeoutMs ?? LOGIN_TIMEOUT_MS, cancelled,
    pollMs: options.pollMs ?? 250 });
  mark('login-detected');
  await route('#/chatRoom', 'warm-chat');
  await until(ready, Math.min(endAt, Date.now() + 20000));
  if (Date.now() < enterAt) {
    await route('#/', 'home');
    while (Date.now() < enterAt) { check(); await delay(Math.min(pause, enterAt - Date.now())); }
    await route('#/chatRoom', 'return-chat');
  } else mark('late-login-stay-in-chat');
  await until(ready, Math.min(endAt, Date.now() + 20000));
  await until(async () => frameRecent(), Math.min(endAt, Date.now() + 15000));
  check();
  const result = await page.evaluate(installFastClick, { key, startAt, endAt });
  if (!result.loggedIn || !result.supported || !result.inChat) throw new Error('CHAT_NOT_READY');
  await page.evaluate(installOpenDiagnostics, key);
  await page.evaluate(installSecondOpen, { key, endAt });
  mark('armed');
}

export async function runPlan1(testOptions = {}) {
  const rl = testOptions.readline ?? createInterface({ input: process.stdin, output: process.stdout });
  let recoveryTimer, recovery;
  const liveSockets = new Set();
  let browser, page, timer, diagnostics, stopped = false, armed = false, finalSnapshot = null;
  let first = null, sentRequest = null, sentMono = null, lastFrame = 0;
  let chosen = false, chosenId = null, allowedClaims = 0;
  const requestRecords = new Map();
  let finish;
  const finished = new Promise(resolve => { finish = resolve; });
  const key = '__plan1_' + randomUUID().replaceAll('-', '');
  const report = { version: 2, plan: 'plan1', build: 'pa1retry500', release: '0.5.2-clock120', startedAt: new Date().toISOString(),
    navigation: [], ws: { connections: 0, frames: 0, errors: 0, events: 0 },
    request: null, requests: [], clicks: null, endReason: null, media: { skipped: 0 } };
  const seen = new Set();
  const mark = step => {
    report.navigation.push({ step, at: new Date().toISOString() });
    console.log(step);
  };
  const stop = reason => { report.endReason ||= reason; stopped = true; armed = false; finish(); };
  try {
    console.log('PA1RETRY500 CLOCK120 0.5.2 - gio Ha Noi, tu xac dinh dot ke tiep; login 120 giay.');
    const link = await rl.question('Link HTTPS (Enter de dung link hien tai): ');
    const target = testOptions.target ?? normalizeTargetUrl(link);
    report.startup = { targetOrigin: new URL(target).origin, loginTimeoutMs: LOGIN_TIMEOUT_MS };
    const selected = (await rl.question('Trinh duyet 1=Edge, 2=Chrome [1]: ')).trim();
    const suggested = determineRunTime('', (testOptions.now ?? Date.now)());
    console.log('Gio hien tai (Ha Noi UTC+7): ' + formatHanoiClock(suggested.currentAt));
    console.log('Gio chay ke tiep neu de trong: ' + formatHanoiClock(suggested.startAt));
    const answer = (await rl.question('Gio 11/13/15/17/19/21; Enter=TU CHON DOT KE TIEP: ')).trim();
    determineRunTime(answer); // Validate before asking for the operating mode.
    const observeOnly = testOptions.observeOnly ?? ((await rl.question('Che do 1=Thu them sau 500ms, 2=Chi quan sat [1]: ')).trim() === '2');
    // Refresh after both prompts: the user may have crossed a scheduled hour
    // while answering. Never reuse the earlier suggestion as the actual plan.
    const schedule = determineRunTime(answer, (testOptions.now ?? Date.now)());
    const window = testOptions.window ?? { startAt: schedule.startAt, endAt: schedule.endAt };
    report.mode = observeOnly ? 'observe-only' : 'up-to-two-native-clicks';
    report.blockedClaimRequests = 0;
    const leadMs = testOptions.leadMs ?? 30000;
    report.window = { ...window, enterChatAt: window.startAt - leadMs };
    report.clock = { timezone: 'Asia/Ho_Chi_Minh', currentAt: schedule.currentAt,
      selection: schedule.automatic ? 'automatic-next-slot' : 'selected-hour',
      nextStartAt: window.startAt, waitMs: Math.max(0, window.startAt - schedule.currentAt),
      followingStartAt: determineRunTime('', window.startAt).startAt };
    console.log('Gio hien tai khi chot lich: ' + formatHanoiClock(schedule.currentAt));
    console.log('Phien nay se chay: ' + formatHanoiClock(window.startAt) + (schedule.automatic ? ' (tu dong)' : ' (gio ban chon)'));
    console.log('Con cho: ' + formatRemaining(window.startAt - schedule.currentAt));
    console.log('Vao lai Chat: ' + formatHanoiClock(window.startAt - leadMs));
    console.log('Het cho hong bao moi: ' + formatHanoiClock(window.endAt));
    const launch = testOptions.launch ?? (options => chromium.launch(options));
    browser = await launch({ channel: selected === '2' ? 'chrome' : 'msedge', headless: false,
      args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
    const context = await browser.newContext({ viewport: null, acceptDownloads: false, serviceWorkers: 'block' });
    await context.route('**/*', async route => {
      const req = route.request();
      if (/\/chat\/grabred\/?$/i.test(new URL(req.url()).pathname)) {
        let id = null;
        try { id = String(JSON.parse(req.postData() || '{}').red_id); } catch {}
        if (observeOnly || stopped || allowedClaims >= 2 || !chosenId || id !== chosenId) {
          report.blockedClaimRequests++; return route.abort('blockedbyclient');
        }
        allowedClaims++;
      }
      if (isTracker(req)) { report.media.skipped++; return route.abort('blockedbyclient'); }
      if (shouldSkipMedia(route.request())) {
        report.media.skipped++;
        await route.abort('blockedbyclient');
      } else await route.continue();
    });
    console.log('GIAM TAI ANH/VIDEO: BAT.');
    page = await context.newPage();
    diagnostics = await attachLatencyDiagnostics(context, page, { ...window, origin: new URL(target).origin, key: key + '_latency' });
    page.on('close', () => stop('page-closed'));
    page.on('websocket', socket => {
      report.ws.connections++;
      socket.on('close', () => { liveSockets.delete(socket); });
      socket.on('socketerror', () => { report.ws.errors++; });
      socket.on('framereceived', ({ payload }) => {
        liveSockets.add(socket);
        lastFrame = Date.now();
        report.ws.frames++;
        if (payload.length > 524288) return;
        try {
          const event = JSON.parse(typeof payload === 'string' ? payload : payload.toString('utf8'));
          if (event?.type !== 'chat_red') return;
          report.ws.events++;
          const data = event.data;
          if (!data || !['string', 'number'].includes(typeof data.red_id)) return;
          const id = String(data.red_id);
          if (!id || id.length > 256 || seen.has(id) || seen.size >= 2000) return;
          seen.add(id);
          if (!armed || stopped || chosen || Date.now() < window.startAt || Date.now() >= window.endAt) return;
          if (['limit_turnover', 'limit_deposit'].some(k => data[k] != null && Number(data[k]) !== 0)) return;
          chosen = true; // Reserve the first candidate synchronously, even if the page is slow.
          chosenId = id;
          first = { id, mono: performance.now() };
          report.eventAt = new Date().toISOString();
          diagnostics.noteEvent(data, report.eventAt);
          if (observeOnly) { stop('event-observed'); return; }
          page.evaluate(({ key, id, at }) => window[key]?.offer(id, at) ?? false, { key, id, at: report.eventAt })
            .then(ok => { if (!ok && !stopped) stop('click-adapter-unavailable'); })
            .catch(() => stop('page-unavailable'));
        } catch {}
      });
    });
    context.on('request', request => {
      if (observeOnly || !armed || stopped || requestRecords.size >= 2 || request.method() !== 'POST') return;
      if (!/\/chat\/grabred\/?$/i.test(new URL(request.url()).pathname)) return;
      let id;
      try { id = String(JSON.parse(request.postData() || '{}').red_id); } catch { return; }
      if (id !== chosenId) return;
      const mono = performance.now();
      const item = { number: requestRecords.size + 1, sentAt: new Date().toISOString(),
        eventToRequestMs: first ? Math.round(mono - first.mono) : null,
        httpStatus: null, applicationCode: null, responseMs: null, finishedMs: null, failure: null, state: 'pending' };
      let settle;
      const settled = new Promise(resolve => { settle = resolve; });
      requestRecords.set(request, { item, mono, settled, settle });
      report.requests.push(item);
      if (!sentRequest) { sentRequest = request; sentMono = mono; report.request = item; }
      page.evaluate(k => window[k]?.snapshot() ?? null, key).then(value => { finalSnapshot = value; }).catch(() => {});
      console.log('Yeu cau ' + item.number + ' bat dau.');
    });
    context.on('response', response => {
      const rec = requestRecords.get(response.request());
      if (!rec) return;
      rec.item.httpStatus = response.status();
      rec.item.responseMs = Math.round(performance.now() - rec.mono);
      page.evaluate(k => window[k]?.cancelSecond?.('response-received'), key).catch(() => {});
      console.log('Yeu cau ' + rec.item.number + ': HTTP ' + response.status());
    });
    context.on('requestfinished', request => {
      const rec = requestRecords.get(request);
      if (!rec) return;
      rec.item.finishedMs = Math.round(performance.now() - rec.mono);
      rec.item.state = 'finished'; rec.settle();
      stop('response-finished');
    });
    context.on('requestfailed', request => {
      const rec = requestRecords.get(request);
      if (!rec) return;
      rec.item.finishedMs = Math.round(performance.now() - rec.mono);
      rec.item.failure = request.failure()?.errorText?.match(/\bERR_[A-Z_]{1,60}\b/)?.[0] || 'OTHER_NETWORK_ERROR';
      rec.item.state = 'failed'; rec.settle();
      if ([...requestRecords.values()].every(r => r.item.state !== 'pending')) stop('request-failed');
    });
    console.log('Tu dang nhap va xac minh CAPTCHA/OTP. Cho toi da 120 giay sau buoc mo trang.');
    const stopInput = rl.question('Nhan Enter bat ky luc nao de DUNG: ').then(() => stop('user-stopped')).catch(() => stop('input-closed'));
    timer = setTimeout(() => stop('window-ended'), Math.max(0, window.endAt + 15000 - Date.now()));
    const setup = (async () => {
      try { await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 60000 }); }
      catch { if (stopped) return; console.log('Trang tai cham; dang cho dang nhap.'); }
      if (stopped) return;
      console.log('Bat dau cho dang nhap: toi da 120 giay.');
      await preparePlan1(page, { ...window, leadMs, key, mark, loginTimeoutMs: testOptions.loginTimeoutMs ?? LOGIN_TIMEOUT_MS,
        cancelled: () => stopped, frameRecent: () => liveSockets.size > 0 && Date.now() - lastFrame < 60000 });
      if (!stopped) {
        armed = true;
        console.log('DA SAN SANG: ket noi chat dang hoat dong.');
        recovery = createChatRecovery({
          healthy: () => liveSockets.size > 0 && Date.now() - lastFrame < 60000,
          canRecover: () => !stopped && !chosen && !sentRequest && !page.isClosed() && Date.now() < window.endAt,
          ready: async value => {
            armed = false;
            if (value && !stopped && !chosen && !sentRequest) {
              await page.evaluate(k => window[k]?.stop(), key);
              const status = await page.evaluate(installFastClick, { key, ...window });
              await page.evaluate(installOpenDiagnostics, key);
              await page.evaluate(installSecondOpen, { key, endAt: window.endAt });
              armed = !stopped && !chosen && status.inChat && status.supported && status.loggedIn;
            }
            console.log(armed ? 'DA SAN SANG: ket noi da khoi phuc.' : 'MAT KET NOI: chua san sang.');
            return armed;
          },
          log: mark,
          recover: async () => {
            if (stopped || chosen || sentRequest) return;
            if ((recovery?.snapshot().attempts ?? 0) > 1) {
              liveSockets.clear();
              await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
              if (!stopped && !chosen && !sentRequest && Date.now() < window.endAt)
                await page.evaluate(() => { location.hash = '#/chatRoom'; });
              return;
            }
            await page.evaluate(() => { if (location.hash === '#/chatRoom') location.hash = '#/'; });
            await delay(500);
            if (stopped || chosen || sentRequest || Date.now() >= window.endAt) return;
            await page.evaluate(() => { location.hash = '#/chatRoom'; });
          }
        });
        recoveryTimer = setInterval(() => { void recovery.tick().catch(() => {}); }, 250);
      }
    })().catch(error => { if (!stopped) stop(['CHAT_NOT_READY','WINDOW_ENDED','PAGE_CLOSED','LOGIN_TIMEOUT'].includes(error.message) ? error.message : 'setup-failed'); });
    await finished;
    await within(page.evaluate(k => window[k]?.cancelSecond?.('session-ended'), key).catch(() => {}));
    // No new click after a result; let already-started requests settle for the report.
    if (report.endReason !== 'user-stopped' && report.endReason !== 'page-closed') {
      const waiting = new AbortController();
      try { await Promise.race([Promise.all([...requestRecords.values()].map(r => r.settled)), delay(15000, null, { signal: waiting.signal })]); }
      finally { waiting.abort(); }
    }
    const bodyTask = (async () => {
      for (const [request, rec] of requestRecords) {
        if (rec.item.state !== 'finished') continue;
        try {
          const response = await request.response();
          if (Number(response.headers()['content-length'] || 0) > 524288) continue;
          const body = await response.body();
          if (body.length > 524288) continue;
          const code = JSON.parse(body.toString('utf8'))?.code;
          if (Number.isInteger(code) && Math.abs(code) < 10000) rec.item.applicationCode = code;
        } catch {}
      }
    })();
    await Promise.race([bodyTask, delay(2000)]);
    try {
      report.clicks = await Promise.race([page.evaluate(k => { const api = window[k]; api?.stop(); return api?.snapshot() ?? null; }, key), delay(1000, null)]);
    } catch {}
    report.clicks ||= finalSnapshot;
    report.diagnostics = await diagnostics.finish();
    diagnostics = null;
    report.recovery = recovery?.snapshot() ?? null;
    report.finishedAt = new Date().toISOString();
    report.clock.finishedAt = Date.parse(report.finishedAt);
    report.clock.nextAfterFinishAt = determineRunTime('', report.clock.finishedAt).startAt;
    console.log('Gio hien tai khi dung: ' + formatHanoiClock(report.clock.finishedAt));
    console.log('Khung tiep theo neu chay lai: ' + formatHanoiClock(report.clock.nextAfterFinishAt));
    const output = testOptions.outputDir ?? new URL('./reports/', import.meta.url);
    await mkdir(output, { recursive: true });
    const name = 'pa1retry500-' + Date.now() + '.json';
    await writeFile(new URL(name, output), JSON.stringify(report, null, 2));
    console.log('Da dung: ' + report.endReason + '. Bao cao: reports/' + name);
    if (report.endReason === 'LOGIN_TIMEOUT') console.log('Het 120 giay chua dang nhap: da dung va dong trinh duyet. Mo lai de thu tiep.');
    else {
      console.log('Ket qua thanh cong/that bai xem tren trang. Nhan Enter de dong trinh duyet.');
      if (!page.isClosed()) await stopInput;
    }
    void setup; // Errors are handled; cancelled prevents future navigation/arming.
    return report;
  } catch (error) {
    console.error(error.message === 'PUBLIC_HTTPS_URL_REQUIRED' ? 'Can link HTTPS, khong kem ten dang nhap/mat khau trong link.' :
      error.message === 'INVALID_HOUR' ? 'Gio khong hop le.' : 'Khong khoi dong duoc. Kiem tra Edge/Chrome va Node.js 22 tro len.');
    process.exitCode = 1;
  } finally {
    stopped = true;
    clearTimeout(timer);
    clearInterval(recoveryTimer);
    liveSockets.clear();
    seen.clear();
    first = null; chosenId = null; requestRecords.clear();
    rl.close();
    if (diagnostics) await diagnostics.finish().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await runPlan1();
