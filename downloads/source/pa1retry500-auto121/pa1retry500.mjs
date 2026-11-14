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
import { PLAN1_URL, shouldSkipMedia, isTracker, loginFlag, installOpenDiagnostics } from './plan1-common.mjs';
import { LOGIN_TIMEOUT_MS, normalizeTargetUrl, waitForLogin, within } from './startup-link120.mjs';
import { installOpenTimeout } from './open-timeout.mjs';
export { LOGIN_TIMEOUT_MS, normalizeTargetUrl, waitForLogin } from './startup-link120.mjs';

const unique = () => '__retry500_' + randomUUID().replaceAll('-', '');
const isClaim = request => /\/chat\/grabred\/?$/i.test(new URL(request.url()).pathname);
export function formatHanoiClock(at) {
  const date = new Date(at + 7 * 3600000), pad = value => String(value).padStart(2, '0');
  return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())} ${pad(date.getUTCDate())}/${pad(date.getUTCMonth()+1)}/${date.getUTCFullYear()}`;
}
export function determineRunTime(answer = '', now = Date.now()) {
  const input = answer.trim(), window = nextWindow(input ? Number(input) : undefined, now);
  return { currentAt: now, automatic: !input, ...window, enterChatAt: window.startAt - 30000 };
}
export function formatRemaining(ms) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds/3600)} gio ${Math.floor(seconds/60)%60} phut ${seconds%60} giay`;
}
export function nextContinuousWindow(lastStart, now = Date.now()) {
  return nextWindow(undefined, Math.max(lastStart, now));
}
async function waitUntil(at, stopped, pollMs = 250) {
  while (Date.now() < at) {
    if (stopped()) throw Error('STOPPED');
    await delay(Math.min(pollMs, at-Date.now()));
  }
  if (stopped()) throw Error('STOPPED');
}

// One persistent browser session. Socket listeners belong to the session;
// request budgets, first-envelope selection and recovery belong to each round.
export async function createRetrySession(context, page, origin) {
  const session = { context, page, origin, liveSockets: new Set(), lastFrame: 0, skippedMedia: 0, active: null };
  await page.addInitScript(installOpenTimeout);
  page.on('websocket', socket => {
    session.active?.connection();
    socket.on('close', () => session.liveSockets.delete(socket));
    socket.on('socketerror', () => session.active?.socketError());
    socket.on('framereceived', ({ payload }) => {
      session.liveSockets.add(socket); session.lastFrame = Date.now(); session.active?.frame();
      if (payload.length > 524288) return;
      try {
        const event = JSON.parse(typeof payload === 'string' ? payload : payload.toString('utf8'));
        if (event?.type === 'chat_red') session.active?.event(event.data);
      } catch {}
    });
  });
  session.healthy = () => session.liveSockets.size > 0 && Date.now()-session.lastFrame < 60000;
  await context.route('**/*', async route => {
    const request = route.request();
    if (isClaim(request) && (!session.active || !session.active.allow(request))) return route.abort('blockedbyclient');
    if (isTracker(request) || shouldSkipMedia(request)) {
      session.skippedMedia++; return route.abort('blockedbyclient');
    }
    await route.continue();
  });
  return session;
}

export async function prepareRetryUI(session, { startAt, endAt, key, mark, cancelled, initialWarmup = true,
  leadMs = 30000, pollMs = 500, loginTimeoutMs = LOGIN_TIMEOUT_MS, warmupTimeoutMs = 20000 }) {
  const { page } = session, enterAt = startAt-leadMs;
  function check() {
    if (cancelled()) throw Error('STOPPED');
    if (page.isClosed()) throw Error('PAGE_CLOSED');
    if (Date.now() >= endAt) throw Error('WINDOW_ENDED');
  }
  async function until(test, timeoutAt = endAt) {
    while (true) {
      check(); if (await test()) return;
      if (Date.now() >= timeoutAt) throw Error('CHAT_NOT_READY');
      await delay(pollMs);
    }
  }
  async function route(hash, label) {
    check(); mark(label+'-requested');
    await page.evaluate(({hash,endAt}) => { if(Date.now()<endAt)location.hash=hash; }, {hash,endAt});
    await until(() => page.evaluate(hash => location.hash===hash, hash), Math.min(endAt,Date.now()+20000));
    mark(label+'-entered');
  }
  async function ready() {
    await page.evaluate(k => window[k]?.stop(), key);
    const status = await page.evaluate(installFastClick,{key,startAt,endAt});
    await page.evaluate(k => window[k]?.stop(), key);
    return status.inChat && status.supported && status.loggedIn;
  }
  mark('waiting-login');
  await waitForLogin(page,{timeoutMs:loginTimeoutMs,cancelled,pollMs:Math.min(pollMs,250)});
  mark('login-detected');
  if (initialWarmup) {
    await route('#/chatRoom','warm-chat');
    try { await until(ready,Math.min(endAt,Date.now()+warmupTimeoutMs)); }
    catch(error) { check(); if(error.message!=='CHAT_NOT_READY')throw error; mark('warm-chat-not-ready'); }
    if (Date.now()<enterAt) await route('#/','home');
  }
  if (Date.now()<enterAt) await waitUntil(enterAt,cancelled,pollMs);
  await route('#/chatRoom','return-chat');
  await until(ready,Math.min(endAt,Date.now()+20000));
  await until(async()=>session.healthy(),Math.min(endAt,Date.now()+15000));
  check();
  const result=await page.evaluate(installFastClick,{key,startAt,endAt});
  if (!result.loggedIn || !result.supported || !result.inChat) throw Error('CHAT_NOT_READY');
  await page.evaluate(installOpenDiagnostics,key);
  await page.evaluate(installSecondOpen,{key,endAt});
  mark('armed');
}

export async function runRetryRound(session, options) {
  const {context,page,origin}=session;
  const {startAt,endAt=startAt+60000,leadMs=30000,initialWarmup=true,observeOnly=false,
    cancelled=()=>false,pollMs=250,loginTimeoutMs=LOGIN_TIMEOUT_MS,warmupTimeoutMs=20000}=options;
  let stopped=false,armed=false,chosen=false,offered=false,chosenId=null,first=null,allowedClaims=0,finalSnapshot=null;
  let recovery,recoveryTimer,diagnostics,setup;
  const key=unique(),seen=new Set(),records=new Map(),mediaBefore=session.skippedMedia;
  const report={version:4,plan:'plan1',build:'pa1retry500',release:'0.6.1-auto120',startedAt:new Date().toISOString(),
    navigation:[],ws:{connections:0,frames:0,errors:0,events:0},request:null,requests:[],clicks:null,endReason:null,
    mode:observeOnly?'observe-only':'up-to-two-native-clicks',blockedClaimRequests:0,
    delivery:{state:'waiting-event',queuedForReadiness:false,offeredAt:null,readinessWaitMs:null},
    window:{startAt,endAt,enterChatAt:startAt-leadMs},transport:{nativeOpenXhrMinimumMs:30000},
    clock:{timezone:'Asia/Ho_Chi_Minh',currentAt:Date.now(),nextStartAt:startAt,followingStartAt:nextContinuousWindow(startAt,startAt).startAt}};
  const mark=step=>{report.navigation.push({step,at:new Date().toISOString()});console.log(step);};
  let resolveFinished;const finished=new Promise(r=>{resolveFinished=r;});
  const stop=reason=>{if(!stopped){stopped=true;armed=false;report.endReason=reason;resolveFinished();}};
  const shouldStop=()=>stopped||cancelled()||page.isClosed();
  function offerChosen(){
    if(!armed||!chosen||offered||shouldStop()||Date.now()>=endAt)return;
    offered=true;report.delivery.state='offered';report.delivery.offeredAt=new Date().toISOString();
    report.delivery.readinessWaitMs=Math.round(performance.now()-first.mono);
    void page.evaluate(({key,id,at,endAt})=>Date.now()<endAt&&(window[key]?.offer(id,at)??false),{key,id:chosenId,at:report.eventAt,endAt})
      .then(ok=>{if(!ok&&!stopped)stop('click-adapter-unavailable');}).catch(()=>stop('page-unavailable'));
  }
  const active={
    connection(){report.ws.connections++;},frame(){report.ws.frames++;},socketError(){report.ws.errors++;},
    allow(request){
      let id;
      try {id=String(JSON.parse(request.postData()||'{}').red_id);}catch{}
      let main=false;
      try {main=request.frame()===page.mainFrame();}catch{}
      if(observeOnly||shouldStop()||!armed||allowedClaims>=2||!chosenId||id!==chosenId||
        request.method()!=='POST'||new URL(request.url()).origin!==origin||!main){report.blockedClaimRequests++;return false;}
      allowedClaims++;return true;
    },
    event(data){
      report.ws.events++;
      if(!data||!['string','number'].includes(typeof data.red_id))return;
      const id=String(data.red_id);
      if(!id||id.length>256||seen.has(id)||seen.size>=2000)return;
      seen.add(id);
      if(shouldStop()||chosen||Date.now()<startAt||Date.now()>=endAt)return;
      if(['limit_turnover','limit_deposit'].some(k=>data[k]!=null&&Number(data[k])!==0))return;
      chosen=true;chosenId=id;first={id,mono:performance.now()};report.eventAt=new Date().toISOString();
      report.delivery.queuedForReadiness=!armed;
      report.delivery.state=armed?'ready-to-offer':'queued-for-readiness';
      diagnostics?.noteEvent(data,report.eventAt);
      if(observeOnly){report.delivery.state='observed-only';stop('event-observed');return;}
      if(!armed)mark('event-waiting-readiness');
      offerChosen();
    }
  };
  function onRequest(request){
    if(observeOnly||!armed||shouldStop()||records.size>=2||request.method()!=='POST'||!isClaim(request))return;
    let id;try{id=String(JSON.parse(request.postData()||'{}').red_id);}catch{return;}
    if(id!==chosenId||new URL(request.url()).origin!==origin)return;
    const mono=performance.now(),item={number:records.size+1,sentAt:new Date().toISOString(),
      eventToRequestMs:first?Math.round(mono-first.mono):null,httpStatus:null,applicationCode:null,responseMs:null,finishedMs:null,failure:null,state:'pending'};
    let settle;const settled=new Promise(r=>{settle=r;});
    records.set(request,{item,mono,settle,settled});report.requests.push(item);report.request??=item;
    void page.evaluate(k=>window[k]?.snapshot()??null,key).then(v=>{finalSnapshot=v;}).catch(()=>{});
    console.log('Yeu cau '+item.number+' bat dau.');
  }
  function onResponse(response){
    const rec=records.get(response.request());if(!rec)return;
    rec.item.httpStatus=response.status();rec.item.responseMs=Math.round(performance.now()-rec.mono);
    void within(page.evaluate(k=>window[k]?.cancelSecond?.('response-received'),key).catch(()=>{}));
    console.log('Yeu cau '+rec.item.number+': HTTP '+response.status());
  }
  function onFinished(request){const rec=records.get(request);if(!rec)return;
    rec.item.finishedMs=Math.round(performance.now()-rec.mono);rec.item.state='finished';rec.settle();stop('response-finished');}
  function onFailed(request){const rec=records.get(request);if(!rec)return;
    rec.item.finishedMs=Math.round(performance.now()-rec.mono);
    rec.item.failure=request.failure()?.errorText?.match(/\bERR_[A-Z_]{1,60}\b/)?.[0]||'OTHER_NETWORK_ERROR';
    rec.item.state='failed';rec.settle();if([...records.values()].every(r=>r.item.state!=='pending'))stop('request-failed');}
  context.on('request',onRequest);context.on('response',onResponse);context.on('requestfinished',onFinished);context.on('requestfailed',onFailed);
  session.active=active;
  const monitor=setInterval(()=>{
    if(cancelled()||page.isClosed())return stop(cancelled()?'user-stopped':'page-closed');
    if(Date.now()>=endAt&&records.size===0)return stop('window-ended');
    if(Date.now()>=endAt+35000)stop('response-deadline');
  },Math.min(pollMs,100));
  try{
    diagnostics=await attachLatencyDiagnostics(context,page,{startAt,endAt,origin,key:key+'_latency'});
    setup=(async()=>{
      await prepareRetryUI(session,{startAt,endAt,leadMs,key,mark,cancelled:shouldStop,initialWarmup,pollMs,loginTimeoutMs,warmupTimeoutMs});
      if(shouldStop())return;
      armed=true;console.log('DA SAN SANG: ket noi chat dang hoat dong.');offerChosen();
      recovery=createChatRecovery({healthy:session.healthy,
        canObserve:()=>!shouldStop()&&!offered&&Date.now()<endAt,
        canRecover:()=>!shouldStop()&&!chosen&&records.size===0&&Date.now()<endAt,
        ready:async value=>{
          armed=false;
          if(value&&!shouldStop()&&!offered&&records.size===0){
            await page.evaluate(k=>window[k]?.stop(),key);
            const status=await page.evaluate(installFastClick,{key,startAt,endAt});
            await page.evaluate(installOpenDiagnostics,key);await page.evaluate(installSecondOpen,{key,endAt});
            armed=!shouldStop()&&!offered&&status.inChat&&status.supported&&status.loggedIn;
            offerChosen();
          }return armed;
        },log:mark,recover:async()=>{
          if(shouldStop()||chosen||records.size)return;
          if(recovery.snapshot().attempts>1){session.liveSockets.clear();await page.reload({waitUntil:'domcontentloaded',timeout:15000});}
          else{await page.evaluate(()=>{location.hash='#/';});await delay(500);}
          if(!shouldStop()&&!chosen&&!records.size&&Date.now()<endAt)await page.evaluate(()=>{location.hash='#/chatRoom';});
        }});
      recoveryTimer=setInterval(()=>{void recovery.tick().catch(()=>{});},pollMs);
    })().catch(error=>{if(!stopped)stop(['LOGIN_TIMEOUT','CHAT_NOT_READY','WINDOW_ENDED','PAGE_CLOSED','STOPPED'].includes(error.message)?error.message:'setup-failed');});
    await finished;
    if(chosen&&!offered&&!observeOnly)report.delivery.state=Date.now()>=endAt?'window-ended-before-ready':'stopped-before-ready';
    await within(page.evaluate(k=>window[k]?.cancelSecond?.('session-ended'),key).catch(()=>{}));
    if(!cancelled()&&!page.isClosed())await within(Promise.all([...records.values()].map(r=>r.settled)),35000);
    await within((async()=>{
      for(const [request,rec]of records){
        if(rec.item.state!=='finished')continue;
        try{const response=await request.response();if(Number(response.headers()['content-length']||0)>524288)continue;
          const body=await response.body();if(body.length>524288)continue;
          const code=JSON.parse(body.toString('utf8'))?.code;if(Number.isInteger(code)&&Math.abs(code)<10000)rec.item.applicationCode=code;
        }catch{}
      }
    })(),2000);
    report.clicks=await within(page.evaluate(k=>{const v=window[k]?.snapshot()??null;window[k]?.stop();return v;},key).catch(()=>null));
    report.clicks??=finalSnapshot;
    report.diagnostics=await diagnostics.finish();diagnostics=null;
    report.recovery=recovery?.snapshot()??null;report.media={skipped:session.skippedMedia-mediaBefore};
    report.finishedAt=new Date().toISOString();report.clock.nextAfterFinishAt=nextContinuousWindow(startAt,Date.parse(report.finishedAt)).startAt;
    return report;
  }finally{
    stopped=true;armed=false;clearInterval(monitor);clearInterval(recoveryTimer);
    if(session.active===active)session.active=null;
    context.off('request',onRequest);context.off('response',onResponse);context.off('requestfinished',onFinished);context.off('requestfailed',onFailed);
    if(diagnostics)await diagnostics.finish().catch(()=>{});
    await within(page.evaluate(k=>{window[k]?.stop();delete window[k];delete window[k+'_latency'];},key).catch(()=>{}));
    void setup;
  }
}

export async function holdThenHome(session,report,{cancelled=()=>false,holdMs=300000,pollMs=250}={}){
  const at=Date.parse(report.finishedAt)+holdMs;
  report.postRun={homeAfterMs:holdMs,holdUntil:new Date(at).toISOString(),homeAt:null,state:'holding-chat'};
  try{
    await waitUntil(at,()=>cancelled()||session.page.isClosed(),pollMs);
    const changed=await within(session.page.evaluate(origin=>{
      if(location.origin!==origin)return false;location.hash='#/';return true;
    },session.origin),2000,false);
    report.postRun.state=changed?'home':'home-unavailable';
    if(changed)report.postRun.homeAt=new Date().toISOString();
  }catch{report.postRun.state='interrupted';}
}

export async function runRetrySchedule(session,{firstWindow,cancelled=()=>false,outputDir,observeOnly=false,
  onReport=()=>{},next=nextContinuousWindow,round=runRetryRound,holdMs=300000,pollMs=250,...roundOptions}={}){
  let window=firstWindow,initialWarmup=true,completed=0;
  while(!cancelled()&&!session.page.isClosed()){
    console.log('Gio hien tai (Ha Noi): '+formatHanoiClock(Date.now()));
    console.log('Phien se chay: '+formatHanoiClock(window.startAt)+'; vao Chat: '+formatHanoiClock(window.startAt-(roundOptions.leadMs??30000)));
    const report=await round(session,{...roundOptions,...window,initialWarmup,observeOnly,cancelled,pollMs});
    initialWarmup=false;completed++;
    report.startup={targetOrigin:session.origin,loginTimeoutMs:LOGIN_TIMEOUT_MS};
    report.continuous={enabled:true,state:'holding-chat',round:completed,nextStartAt:next(window.startAt,Date.now()).startAt};
    let path;
    if(outputDir){
      await mkdir(outputDir,{recursive:true});path=new URL('pa1retry500-'+window.startAt+'-'+Date.now()+'.json',outputDir);
      await writeFile(path,JSON.stringify(report,null,2));console.log('Bao cao: '+path.pathname.split('/').at(-1));
    }
    await onReport(report);
    if(cancelled()||session.page.isClosed()||['LOGIN_TIMEOUT','PAGE_CLOSED','page-closed','user-stopped','STOPPED'].includes(report.endReason)){
      report.continuous.state='stopped';if(path)await writeFile(path,JSON.stringify(report,null,2));return {completed,lastReport:report};
    }
    console.log('Giu chat 5 phut, ve trang chu, TU CHAY dot tiep theo.');
    await holdThenHome(session,report,{cancelled,holdMs,pollMs});
    report.continuous.state=cancelled()||session.page.isClosed()?'stopped':'waiting-next-slot';
    if(path)await writeFile(path,JSON.stringify(report,null,2));
    if(cancelled()||session.page.isClosed())return {completed,lastReport:report};
    window=next(window.startAt,Date.now());
  }
  return {completed};
}

export async function runPlan1(testOptions={}){
  const rl=testOptions.readline??createInterface({input:process.stdin,output:process.stdout});
  let browser,stopped=false;
  try{
    console.log('PA1RETRY500 AUTO120 0.6.1: giu tin khi chat vua noi lai; 1 tab, tu lap 11/13/15/17/19/21 gio Ha Noi.');
    const link=await rl.question('Link HTTPS (Enter de dung link hien tai): ');
    const target=testOptions.target??normalizeTargetUrl(link);
    const selected=(await rl.question('Trinh duyet 1=Edge, 2=Chrome [1]: ')).trim();
    const suggested=determineRunTime();console.log('Gio hien tai (Ha Noi): '+formatHanoiClock(suggested.currentAt));
    console.log('Khung ke tiep: '+formatHanoiClock(suggested.startAt));
    const answer=(await rl.question('Gio bat dau 11/13/15/17/19/21; Enter=dot ke tiep: ')).trim();determineRunTime(answer);
    const observeOnly=testOptions.observeOnly??((await rl.question('Che do 1=Bam Mo + thu sau 500ms, 2=Chi quan sat [1]: ')).trim()==='2');
    browser=await(testOptions.launch??(options=>chromium.launch(options)))({channel:selected==='2'?'chrome':'msedge',headless:false,
      args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
    const context=await browser.newContext({viewport:null,acceptDownloads:false,serviceWorkers:'block'}),page=await context.newPage();
    const session=await createRetrySession(context,page,new URL(target).origin);
    page.on('close',()=>{stopped=true;});browser.on('disconnected',()=>{stopped=true;});
    void rl.question('Nhan Enter bat ky luc nao de DUNG TOAN BO LICH: ').then(()=>{stopped=true;}).catch(()=>{stopped=true;});
    console.log('Tu dang nhap va xac minh CAPTCHA/OTP; cho toi da 120 giay sau buoc mo trang.');
    try{await page.goto(target,{waitUntil:'domcontentloaded',timeout:60000});}catch{if(stopped)return;console.log('Trang tai cham; dang cho dang nhap.');}
    await waitForLogin(page,{timeoutMs:testOptions.loginTimeoutMs??LOGIN_TIMEOUT_MS,cancelled:()=>stopped});
    const schedule=determineRunTime(answer);console.log('Da dang nhap. Lich se TU TIEP TUC sau moi phien.');
    return await runRetrySchedule(session,{firstWindow:testOptions.window??{startAt:schedule.startAt,endAt:schedule.endAt},
      outputDir:testOptions.outputDir??new URL('./reports/',import.meta.url),observeOnly,cancelled:()=>stopped,...testOptions.scheduleOptions});
  }catch(error){
    const messages={PUBLIC_HTTPS_URL_REQUIRED:'Can link HTTPS, khong kem mat khau trong link.',INVALID_HOUR:'Gio khong hop le.',LOGIN_TIMEOUT:'Het 120 giay chua dang nhap. Da dung va dong trinh duyet.'};
    if(stopped||['STOPPED','PAGE_CLOSED'].includes(error.message))console.log('Da dung chuong trinh.');
    else{console.error(messages[error.message]??'Khong chay duoc. Kiem tra Node.js 22+ va Edge/Chrome.');process.exitCode=1;}
  }finally{stopped=true;rl.close();if(browser)await browser.close().catch(()=>{});}
}
if(process.argv[1]===fileURLToPath(import.meta.url))await runPlan1();
