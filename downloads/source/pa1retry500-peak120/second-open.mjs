// One additional native-button click, 500 ms after the first Open click.
export function installSecondOpen({ key, endAt }) {
  const api = window[key];
  if (!api) return;
  const original = { offer: api.offer, stop: api.stop, snapshot: api.snapshot };
  const state = { delayMs: 500, status: 'waiting-first-open', dueAt: null, clickedAt: null, actualDelayMs: null, reason: null };
  let target = null, timer = null, done = false, scheduled = false;
  function cancel(reason) {
    if (done) return;
    done = true; clearTimeout(timer);
    document.removeEventListener('click', onClick, true);
    state.status = 'skipped'; state.reason = reason; target = null;
  }
  function room() {
    const stack = [document.querySelector('#app')?.__vue__], seen = new Set();
    while (stack.length && seen.size < 1000) {
      const vm = stack.pop();
      if (!vm || seen.has(vm)) continue;
      seen.add(vm);
      if (typeof vm.getChatGrabred === 'function' && 'redPackDetail' in vm) return vm;
      stack.push(...(vm.$children || []));
    }
    return null;
  }
  function schedule() {
    if (done || scheduled || !target) return;
    const first = original.snapshot().openClickedAt;
    if (!first) return;
    scheduled = true; state.status = 'scheduled';
    const firstAt = Date.parse(first);
    state.dueAt = new Date(firstAt + 500).toISOString();
    timer = setTimeout(() => {
      if (done) return;
      if (Date.now() >= endAt || !location.hash.startsWith('#/chatRoom')) return cancel('outside-chat-window');
      const vm = room();
      if (!vm?.loginStatus) return cancel('login-required');
      if (vm.showHasBeenObtained || vm.showRedPackExpired || vm.showAppDownloadPrompt) return cancel('result-or-permission-modal');
      if (!vm.showGrabRedPack || String(vm.redPackDetail?.red_id) !== target) return cancel('matching-open-modal-unavailable');
      const button = vm.$el?.querySelector('.getRedPackImgCon');
      if (vm.rbIsOpening || button?.classList.contains('rbIsOpening')) return cancel('native-opening-lock');
      if (!button?.isConnected || button.hasAttribute('disabled') || button.getAttribute('aria-disabled') === 'true') return cancel('button-disabled-or-missing');
      const css = getComputedStyle(button);
      if (!button.getClientRects().length || css.display === 'none' || css.visibility === 'hidden') return cancel('button-hidden');
      done = true; document.removeEventListener('click', onClick, true);
      state.status = 'clicked'; state.clickedAt = new Date().toISOString();
      state.actualDelayMs = Date.now() - firstAt;
      target = null;
      button.click();
    }, Math.max(0, firstAt + 500 - Date.now()));
  }
  function onClick(event) {
    if (!event.target?.closest?.('.getRedPackImgCon, .redBagPending, .redBagAniBox .aniBox')) return;
    if (event.isTrusted) { cancel('manual-click'); return; }
    schedule();
  }
  document.addEventListener('click', onClick, true);
  api.offer = (id, at) => {
    if (!target && !done) target = id;
    const accepted = original.offer(id, at);
    if (!accepted && !scheduled) cancel('first-offer-rejected');
    schedule(); return accepted;
  };
  api.snapshot = () => { schedule(); return { ...original.snapshot(), secondOpen: { ...state } }; };
  api.cancelSecond = cancel;
  api.stop = () => { cancel('stopped'); original.stop(); };
}