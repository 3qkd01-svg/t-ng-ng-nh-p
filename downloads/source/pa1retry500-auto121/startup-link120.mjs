import { setTimeout as delay } from 'node:timers/promises';

export const LOGIN_TIMEOUT_MS = 120000;
export function normalizeTargetUrl(input, fallback = 'https://hay8888.ink/mobile/?platfrom=app&device=native#/') {
  try {
    const url = new URL((input.trim() || fallback).replaceAll('\\&', '&').replaceAll('&amp;', '&'));
    if (url.protocol !== 'https:' || url.username || url.password) throw Error();
    if (!url.hash) url.hash = '#/';
    return url.href;
  } catch { throw Error('PUBLIC_HTTPS_URL_REQUIRED'); }
}

export async function within(promise, ms = 1000, fallback = null) {
  let timer;
  try { return await Promise.race([promise, new Promise(resolve => { timer = setTimeout(() => resolve(fallback), ms); })]); }
  finally { clearTimeout(timer); }
}

// Bound manual login independently of renderer responsiveness. Never export
// a password, cookie or token; only read the page's existing login flag.
export async function waitForLogin(page, { timeoutMs = LOGIN_TIMEOUT_MS, cancelled = () => false, pollMs = 250 } = {}) {
  let finished = false, timer, monitor;
  const started = performance.now();
  function check() {
    if (cancelled()) throw Error('STOPPED');
    if (page.isClosed()) throw Error('PAGE_CLOSED');
    if (performance.now() - started >= timeoutMs) throw Error('LOGIN_TIMEOUT');
  }
  const limit = new Promise((_, reject) => {
    timer = setTimeout(() => reject(Error('LOGIN_TIMEOUT')), timeoutMs);
    monitor = setInterval(() => { try { check(); } catch (error) { reject(error); } }, Math.min(pollMs, 100));
  });
  const detect = (async () => {
    while (!finished) {
      check(); let loggedIn = false;
      try { loggedIn = await page.evaluate(() => {
        const flag = document.querySelector('#app')?.__vue__?.$store?.getters?.['user/loginStatus'];
        return flag === true || flag === 1;
      }); } catch {}
      if (finished) return;
      check(); if (loggedIn) return;
      await delay(Math.min(pollMs, Math.max(1, timeoutMs - (performance.now() - started))));
    }
  })();
  try { await Promise.race([detect, limit]); }
  finally { finished = true; clearTimeout(timer); clearInterval(monitor); }
}
