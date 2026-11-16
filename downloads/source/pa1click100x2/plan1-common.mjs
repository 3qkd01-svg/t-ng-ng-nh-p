export const PLAN1_URL = 'https://hay8888.ink/mobile/?platfrom=app&device=native#/';

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
