import {isTracker,shouldSkipMedia} from './plan1-common.mjs';
const isFavicon=request=>request.method()==='GET'&&new URL(request.url()).pathname==='/favicon.ico';

async function bounded(promise,ms=1500,fallback=null){
  let timer;try{return await Promise.race([promise,new Promise(r=>{timer=setTimeout(()=>r(fallback),ms);})]);}finally{clearTimeout(timer);}
}

// Native Chromium interception lets the browser keep its HTTP cache. No
// cookies, headers, signatures or request bodies are changed or exported.
export async function installBrowserPolicy(context,page,session){
  let cdp,mainFrameId;
  const stats={mode:'native-cdp',httpCacheEnabled:true};
  const claim=request=>/\/chat\/grabred\/?$/i.test(new URL(request.url()).pathname);
  async function fallback(){
    try{await cdp?.send('Fetch.disable');}catch{}
    try{await cdp?.detach();}catch{}
    cdp=null;stats.mode='playwright-fallback';stats.httpCacheEnabled=false;
    await context.route('**/*',async route=>{
      const request=route.request();
      if(claim(request)&&(!session.active||!session.active.allow(request)))return route.abort('blockedbyclient');
      if(isFavicon(request)||isTracker(request)||shouldSkipMedia(request)){session.skippedMedia++;return route.abort('blockedbyclient');}
      return route.continue();
    });
  }
  try{
    cdp=await context.newCDPSession(page);
    cdp.on('Page.frameNavigated',e=>{if(!e.frame.parentId)mainFrameId=e.frame.id;});
    await cdp.send('Page.enable');
    mainFrameId=(await cdp.send('Page.getFrameTree')).frameTree.frame.id;
    cdp.on('Fetch.requestPaused',event=>{
      void(async()=>{
        let body=event.request.postData;
        const request={url:()=>event.request.url,method:()=>event.request.method,
          resourceType:()=>String(event.resourceType).toLowerCase(),postData:()=>body,
          frame:()=>event.frameId===mainFrameId?page.mainFrame():null};
        if(claim(request)){
          if(typeof body!=='string'&&event.networkId){
            try{body=(await cdp.send('Network.getRequestPostData',{requestId:event.networkId})).postData;}catch{}
          }
          if(!session.active||!session.active.allow(request))return cdp.send('Fetch.failRequest',{requestId:event.requestId,errorReason:'BlockedByClient'});
        }
        if(isFavicon(request)||isTracker(request)||shouldSkipMedia(request)){
          session.skippedMedia++;return cdp.send('Fetch.failRequest',{requestId:event.requestId,errorReason:'BlockedByClient'});
        }
        return cdp.send('Fetch.continueRequest',{requestId:event.requestId});
      })().catch(()=>{void cdp?.send('Fetch.failRequest',{requestId:event.requestId,errorReason:'Failed'}).catch(()=>{});});
    });
    const patterns=[{resourceType:'Image',requestStage:'Request'},{resourceType:'Media',requestStage:'Request'},
      {urlPattern:'*/chat/grabred*',requestStage:'Request'},{urlPattern:'*/favicon.ico*',requestStage:'Request'},
      ...['*://googletagmanager.com/*','*://*.googletagmanager.com/*','*://connect.facebook.net/*',
        '*://hotjar.com/*','*://*.hotjar.com/*','*://plausible.qmcapp.com/*'].map(urlPattern=>({urlPattern,requestStage:'Request'}))];
    await cdp.send('Fetch.enable',{patterns});
    await cdp.send('Network.setCacheDisabled',{cacheDisabled:false});
  }catch{await fallback();}
  return {stats,
    async foreground(){
      const result={broughtToFront:false,lifecycleActive:false,windowRestored:false};
      if(cdp){
        try{await cdp.send('Page.setWebLifecycleState',{state:'active'});result.lifecycleActive=true;}catch{}
        try{const w=await cdp.send('Browser.getWindowForTarget');if(w.bounds.windowState==='minimized'){
          await cdp.send('Browser.setWindowBounds',{windowId:w.windowId,bounds:{windowState:'normal'}});result.windowRestored=true;
        }}catch{}
      }
      try{await page.bringToFront();result.broughtToFront=true;}catch{}
      return result;
    }
  };
}

// Pause only promotional animations/media. Envelope controls, verification
// controls and their ancestors are excluded; no app timer or socket is paused.
export function applyBrowserPeak({key,enterAt,endAt}){
  if(Date.now()<enterAt||Date.now()>=endAt)return null;
  const protect='.getRedPackImgCon,.redBagAniBox,.redBagPending,[class*="captcha"],[id*="captcha"],[class*="verify"],[id*="verify"]';
  const protectedUrl=/(captcha|challenge|turnstile|recaptcha|hcaptcha|verification|verify|geetest|arkose|funcaptcha|redbag|redpack|hongbao|img_rp_)/i;
  const protectedElement=el=>!!el?.closest?.(protect)||!!el?.querySelector?.(protect);
  const state=window[key]??={animations:new Set(),media:new Map()};
  for(const el of document.querySelectorAll('.banner,.home-banner,.notice-marquee,.carousel')){
    if(protectedElement(el))continue;
    for(const animation of el.getAnimations?.({subtree:true})??[]){
      if(animation.playState==='running'&&!protectedElement(animation.effect?.target)){
        state.animations.add(animation);animation.pause();
      }
    }
  }
  for(const el of document.querySelectorAll('video,audio')){
    if(protectedElement(el)||protectedUrl.test(el.currentSrc||el.src||''))continue;
    if(!state.media.has(el))state.media.set(el,{autoplay:el.autoplay,preload:el.preload,playing:!el.paused});
    el.autoplay=false;el.preload='none';el.pause();
  }
  return {visibility:document.visibilityState,focused:document.hasFocus(),pausedAnimations:state.animations.size,parkedMedia:state.media.size};
}
export function restoreBrowserPeak(key){
  const state=window[key];if(!state)return false;
  for(const a of state.animations)try{if(a.playState==='paused')a.play();}catch{}
  for(const [el,s]of state.media)try{el.autoplay=s.autoplay;el.preload=s.preload;if(s.playing)void el.play()?.catch(()=>{});}catch{}
  delete window[key];return true;
}

export function createPeakWindow(session,{key,startAt,endAt,leadMs=30000,cancelled=()=>false}){
  const enterAt=startAt-leadMs,report={enabled:true,network:{...session.browserPolicy.stats},
    enterAt,quietStartAt:startAt-5000,quietEndAt:endAt,activations:[],recoveryDeferrals:0};
  let stopped=false,busy=false;const timers=[];
  async function activate(label){
    if(stopped||busy||cancelled()||session.page.isClosed()||Date.now()<enterAt||Date.now()>=endAt)return;
    busy=true;
    try{
      const foreground=await bounded(session.browserPolicy.foreground());
      if(stopped||cancelled())return;
      const browser=await bounded(session.page.evaluate(applyBrowserPeak,{key,enterAt,endAt}).catch(()=>null));
      if(!stopped)report.activations.push({at:new Date().toISOString(),label,foreground,browser});
    }finally{busy=false;}
  }
  return {report,activate,
    start(){
      for(const [at,label]of [[enterAt,'chat-entry'],[startAt-3000,'before-publication']]){
        timers.push(setTimeout(()=>{void activate(label);},Math.max(0,at-Date.now())));
      }
    },
    deferRecovery(){
      const now=Date.now();
      const blocked=session.bootstrapBusy()||(now>=startAt-5000&&now<startAt+3000);
      if(blocked)report.recoveryDeferrals++;
      return blocked;
    },
    async finish(){
      stopped=true;for(const t of timers)clearTimeout(t);
      report.restored=await bounded(session.page.evaluate(restoreBrowserPeak,key).catch(()=>false),1500,false);
      return report;
    }
  };
}
