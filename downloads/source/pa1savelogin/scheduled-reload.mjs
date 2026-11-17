import {setTimeout as delay} from 'node:timers/promises';
import {LOGIN_TIMEOUT_MS,waitForLogin,within} from './startup-link120.mjs';

export const RELOAD_LEAD_MS=180000;

// One normal reload in the existing tab. Late starts never trigger a catch-up
// reload next to publication. No credentials, request body or response is read.
export function createScheduledReload(session,{startAt,enterAt,mark=()=>{},cancelled=()=>false,
  pollMs=250,reloadLeadMs=RELOAD_LEAD_MS,reloadTimeoutMs=30000,loginTimeoutMs=LOGIN_TIMEOUT_MS}){
  const scheduledAt=startAt-reloadLeadMs;
  const report={scheduledAt:new Date(scheduledAt).toISOString(),
    state:Date.now()<=scheduledAt?'waiting':'skipped-missed',
    requestedAt:null,finishedAt:null,loginConfirmedAt:null,failure:null,loadingStopped:null};
  let stopped=false,task;
  const cancelledNow=()=>stopped||cancelled();
  function check(){
    if(cancelledNow())throw Error('STOPPED');
    if(session.page.isClosed())throw Error('PAGE_CLOSED');
  }
  async function execute(){
    try{
      check();
      if(report.state!=='waiting'){mark('scheduled-reload-skipped-missed');return;}
      while(Date.now()<scheduledAt){check();await delay(Math.min(pollMs,scheduledAt-Date.now()));}
      check();
      // A sleeping machine or delayed setup must not reload near the claim.
      if(Date.now()>scheduledAt+5000||Date.now()>=enterAt-500){
        report.state='skipped-late';mark('scheduled-reload-skipped-late');return;
      }
      report.state='loading';report.requestedAt=new Date().toISOString();
      mark('scheduled-reload-requested');
      session.liveSockets.clear();session.lastFrame=0;
      let reloaded=true;
      try{
        await session.page.reload({waitUntil:'domcontentloaded',
          timeout:Math.min(reloadTimeoutMs,Math.max(1,enterAt-Date.now()-500))});
      }catch(error){
        check();reloaded=false;report.failure=error.name==='TimeoutError'?'TIMEOUT':'RELOAD_ERROR';
        report.loadingStopped=await within(session.browserPolicy.stopLoading().catch(()=>false),1000,false);
        mark('scheduled-reload-failed');
      }
      check();report.finishedAt=new Date().toISOString();report.state='checking-login';
      await waitForLogin(session.page,{timeoutMs:loginTimeoutMs,cancelled:cancelledNow,pollMs:Math.min(pollMs,250)});
      check();report.loginConfirmedAt=new Date().toISOString();
      report.state=reloaded?'reloaded':'reload-failed-login-confirmed';
      mark('scheduled-reload-login-confirmed');
    }catch(error){
      if(!stopped)report.state=error.message==='LOGIN_TIMEOUT'?'login-timeout':'interrupted';
      throw error;
    }
  }
  return {report,run:()=>task??=execute(),stop(){
    stopped=true;
    if(['waiting','loading','checking-login'].includes(report.state))report.state='interrupted';
  }};
}
