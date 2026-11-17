// One extra same-card + native Open cycle, 500ms after the actual first Open.
// Only the client-side pending flag may be released; result/login checks stay.
export function installSecondOpen({key,endAt}){
  const api=window[key];if(!api)return;
  const original={offer:api.offer,stop:api.stop,snapshot:api.snapshot};
  const state={delayMs:500,status:'waiting-first-open',dueAt:null,cardClickedAt:null,
    clickedAt:null,actualDelayMs:null,reason:null,openingFlagReleased:false,openingFlagReleaseCount:0};
  let target=null,timer=null,poll=null,expiry=null,observer=null,done=false,scheduled=false,cycling=false;
  let firstAt=null,dueMono=null,vm=null,originalBusy=false,responseSeen=false;
  function visible(el){
    if(!el?.isConnected||el.hasAttribute('disabled')||el.getAttribute('aria-disabled')==='true')return false;
    const css=getComputedStyle(el);return !!el.getClientRects().length&&css.visibility!=='hidden'&&css.display!=='none';
  }
  function cleanup(){clearTimeout(timer);clearTimeout(poll);clearTimeout(expiry);observer?.disconnect();document.removeEventListener('click',onClick,true);}
  function hasResult(room){return room.showHasBeenObtained||room.showRedPackExpired||room.showAppDownloadPrompt;}
  function cancel(reason){
    if(reason==='response-received')responseSeen=true;
    if(done)return;
    done=true;cleanup();state.status='skipped';state.reason=reason;
    if(originalBusy&&!responseSeen&&reason!=='manual-click'&&vm&&!vm._isDestroyed&&
      String(vm.redPackDetail?.red_id)===target&&!hasResult(vm)&&vm.rbIsOpening===false){
      try{vm.rbIsOpening=true;}catch{}
    }
    target=null;
  }
  function room(){
    const stack=[document.querySelector('#app')?.__vue__],seen=new Set();
    while(stack.length&&seen.size<1000){const value=stack.pop();if(!value||seen.has(value))continue;seen.add(value);
      if(typeof value.getChatGrabred==='function'&&'redPackDetail'in value)return value;
      stack.push(...(value.$children||[]));
    }return null;
  }
  function valid(){
    if(done)return false;
    if(Date.now()>=endAt||!location.hash.startsWith('#/chatRoom')){cancel('outside-chat-window');return false;}
    if(!vm?.loginStatus||vm._isDestroyed){cancel('login-required');return false;}
    if(!vm.$el?.isConnected){cancel('room-detached');return false;}
    if(hasResult(vm)){cancel('result-or-permission-modal');return false;}
    if(String(vm.redPackDetail?.red_id)!==target){cancel('matching-open-modal-unavailable');return false;}
    return true;
  }
  function releasePending(){
    if(vm.rbIsOpening!==true)return true;
    if(state.openingFlagReleaseCount>=2)return false;
    try{vm.rbIsOpening=false;state.openingFlagReleaseCount++;
      const released=vm.rbIsOpening===false;state.openingFlagReleased||=released;
      if(released)vm.$forceUpdate?.();return released;
    }catch{return false;}
  }
  function chooseSameCard(){
    for(const el of vm.$el?.querySelectorAll('.redBag.redBagPending')||[]){
      if(String(el.__vue__?.logItem?.data?.red_id)===target&&!el.__vue__?.redStatus&&visible(el))return el;
    }
    const animation=vm.$el?.querySelector('.redBagAniBox'),button=animation?.querySelector('.aniBox');
    return String(animation?.__vue__?.redNotifyList?.[0]?.red_id)===target&&visible(button)?button:null;
  }
  function tryOpen(){
    clearTimeout(poll);poll=null;if(!valid())return;
    const button=vm.$el?.querySelector('.getRedPackImgCon');
    if(!releasePending())return cancel('pending-flag-not-released');
    if(vm.showGrabRedPack&&visible(button)&&!button.classList.contains('rbIsOpening')&&vm.rbIsOpening!==true){
      done=true;cleanup();state.status='clicked';state.clickedAt=new Date().toISOString();
      state.actualDelayMs=Date.now()-firstAt;state.reason='second-card-and-open-clicked';target=null;button.click();return;
    }
    poll=setTimeout(tryOpen,25);
  }
  function begin(){
    if(done)return;
    if(performance.now()<dueMono){timer=setTimeout(begin,Math.max(1,Math.ceil(dueMono-performance.now())));return;}
    vm=room();if(!valid())return;
    if(!vm.showGrabRedPack)return cancel('matching-open-modal-unavailable');
    const card=chooseSameCard();if(!card)return cancel('same-card-unavailable');
    originalBusy=vm.rbIsOpening===true;
    if(!releasePending())return cancel('pending-flag-not-released');
    cycling=true;state.status='waiting-second-open';state.cardClickedAt=new Date().toISOString();
    observer=new MutationObserver(()=>{if(cycling&&!done)tryOpen();});
    observer.observe(vm.$el,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style','disabled','aria-disabled']});
    expiry=setTimeout(()=>cancel('second-open-not-ready'),Math.min(1500,Math.max(1,endAt-Date.now())));
    card.click();Promise.resolve().then(tryOpen);
  }
  function schedule(){
    if(done||scheduled||!target)return;
    const first=typeof api.firstOpenAt==='function'?api.firstOpenAt():original.snapshot().openClickedAt;if(!first)return;
    firstAt=Date.parse(first);if(!Number.isFinite(firstAt))return cancel('first-open-time-unavailable');
    scheduled=true;state.status='scheduled';state.dueAt=new Date(firstAt+500).toISOString();
    dueMono=performance.now()+Math.max(0,firstAt+500-Date.now());
    timer=setTimeout(begin,Math.max(0,firstAt+500-Date.now()));
  }
  function onClick(event){
    if(!event.target?.closest?.('.getRedPackImgCon,.redBagPending,.redBagAniBox .aniBox'))return;
    if(event.isTrusted){cancel('manual-click');return;}schedule();
  }
  document.addEventListener('click',onClick,true);
  api.offer=(id,at)=>{if(!target&&!done)target=id;const accepted=original.offer(id,at);
    if(!accepted&&!scheduled)cancel('first-offer-rejected');schedule();return accepted;};
  api.snapshot=()=>{schedule();return {...original.snapshot(),secondOpen:{...state}};};
  api.cancelSecond=cancel;
  api.stop=()=>{cancel('stopped');original.stop();};
}
