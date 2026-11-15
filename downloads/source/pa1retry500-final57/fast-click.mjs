// Click the site's existing controls. No direct API call, auth copying or retries.
export function installFastClick({ key, startAt, endAt }) {
  const state = { armed: true, phase: 'waiting-event', eventAt: null, cardClickedAt: null,
    openClickedAt: null, reason: null };
  let target = null;
  let room = null;
  let cardClicked = false;
  let stopped = false;
  let observer;
  function finish(reason) {
    stopped = true;
    state.armed = false;
    state.reason = reason;
    observer?.disconnect();
    document.removeEventListener('click', manualClick, true);
    clearTimeout(expiry);
    target = null;
  }
  function visible(el) {
    if (!el || !el.isConnected || el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true') return false;
    const css = getComputedStyle(el);
    return el.getClientRects().length > 0 && css.visibility !== 'hidden' && css.display !== 'none';
  }
  function manualClick(event) {
    if (event.isTrusted && event.target?.closest?.('.getRedPackImgCon, .redBagPending, .redBagAniBox .aniBox')) {
      state.phase = 'stopped';
      finish('manual-click');
    }
  }
  function locateRoom() {
    if (room && !room._isDestroyed) return room;
    const roots = [...document.querySelectorAll('#app, .redBagAniBox, .redBagPending')].map(el => el.__vue__).filter(Boolean);
    const visited = new Set();
    while (roots.length && visited.size < 1000) {
      const vm = roots.pop();
      if (!vm || visited.has(vm)) continue;
      visited.add(vm);
      if (typeof vm.getChatGrabred === 'function' && 'redPackDetail' in vm && 'showGrabRedPack' in vm) return (room = vm);
      roots.push(...(vm.$children || []));
      if (vm.$parent) roots.push(vm.$parent);
    }
    return null;
  }
  function tick() {
    if (stopped || !target) return;
    if (Date.now() >= endAt) { state.phase = 'expired'; finish('window-ended'); return; }
    if (!location.hash.startsWith('#/chatRoom')) { state.phase = 'stopped'; finish('left-chat'); return; }
    const vm = locateRoom();
    if (!vm) return;
    if (!vm.loginStatus) { state.phase = 'stopped'; finish('login-required'); return; }
    // Never dismiss or click an unrelated modal; site permission checks remain intact.
    if (vm.showGrabRedPack && String(vm.redPackDetail?.red_id) === target) {
      const button = vm.$el?.querySelector('.getRedPackImgCon');
      if (!vm.rbIsOpening && visible(button) && !button.classList.contains('rbIsOpening')) {
        state.openClickedAt = new Date().toISOString();
        state.phase = 'open-clicked';
        finish('single-attempt-finished');
        button.click();
      }
      return;
    }
    if (vm.showGrabRedPack || vm.showHasBeenObtained || vm.showRedPackExpired || cardClicked) return;
    let control = null;
    const animation = vm.$el?.querySelector('.redBagAniBox');
    // The animation's handler uses the first item of its own notification list.
    if (String(animation?.__vue__?.redNotifyList?.[0]?.red_id) === target) {
      const button = animation.querySelector('.aniBox');
      if (visible(button)) control = button;
    }
    if (!control) {
      for (const el of vm.$el?.querySelectorAll('.redBag.redBagPending') || []) {
        if (String(el.__vue__?.logItem?.data?.red_id) === target && !el.__vue__?.redStatus && visible(el)) {
          control = el; break;
        }
      }
    }
    if (control) {
      cardClicked = true;
      state.cardClickedAt = new Date().toISOString();
      state.phase = 'waiting-open-button';
      control.click();
    }
  }
  const expiry = setTimeout(() => { if (!stopped) { state.phase = 'expired'; finish('window-ended'); } }, Math.max(0, endAt - Date.now()));
  observer = new MutationObserver(tick);
  document.addEventListener('click', manualClick, true);
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true,
    attributeFilter: ['class', 'style', 'disabled', 'aria-disabled'] });
  // The key and raw ID stay in this temporary browser only and are never exported.
  window[key] = {
    offer(id, observedAt) {
      if (stopped || target || Date.now() < startAt || Date.now() >= endAt || typeof id !== 'string' || !id || id.length > 256) return false;
      target = id;
      state.eventAt = observedAt;
      state.phase = 'waiting-card';
      tick();
      return true;
    },
    snapshot: () => ({ ...state }),
    stop: () => { if (!stopped) { state.phase = 'stopped'; finish('user-stopped'); } },
    ready: () => { const vm = locateRoom(); return { inChat: location.hash.startsWith('#/chatRoom'), supported: !!vm, loggedIn: !!vm?.loginStatus }; }
  };
  return window[key].ready();
}

export function nextWindow(hour, now = Date.now()) {
  const allowed = [11, 13, 15, 17, 19, 21];
  if (hour !== undefined && !allowed.includes(hour)) throw new Error('INVALID_HOUR');
  const vn = new Date(now + 7 * 3600000);
  const midnight = Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate()) - 7 * 3600000;
  const candidates = (hour === undefined ? allowed : [hour]).map(h => midnight + h * 3600000);
  const startAt = candidates.find(t => t > now) ?? candidates[0] + 86400000;
  return { startAt, endAt: startAt + 60000 };
}