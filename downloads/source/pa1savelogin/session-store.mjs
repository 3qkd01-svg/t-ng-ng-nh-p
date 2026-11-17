import {mkdir,readFile,writeFile,rename,unlink,lstat} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {normalizeTargetUrl,within} from './startup-link120.mjs';
import {loginFlag} from './plan1-common.mjs';

const MAX_BYTES=8*1024*1024;
const directory=value=>value instanceof URL?fileURLToPath(value):resolve(value);
const paths=root=>({link:join(directory(root),'link-login','link.json'),session:join(directory(root),'cookie-tai-khoan','session.json')});
async function readJson(path){
  const info=await lstat(path);
  if(!info.isFile()||info.size>MAX_BYTES)throw Error('INVALID_SAVED_FILE');
  return JSON.parse(await readFile(path,'utf8'));
}
function validState(state){
  if(!state||!Array.isArray(state.cookies)||!Array.isArray(state.origins)||state.cookies.length>3000||state.origins.length>100)return false;
  for(const c of state.cookies){
    if(!c||typeof c.name!=='string'||typeof c.value!=='string'||typeof c.domain!=='string'||typeof c.path!=='string'||
      !c.path.startsWith('/')||!Number.isFinite(c.expires)||typeof c.httpOnly!=='boolean'||typeof c.secure!=='boolean'||
      !['Strict','Lax','None'].includes(c.sameSite))return false;
  }
  for(const o of state.origins){
    try{const url=new URL(o.origin);if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.origin!==o.origin)return false;}catch{return false;}
    if(!Array.isArray(o.localStorage)||o.localStorage.length>10000||o.localStorage.some(v=>typeof v?.name!=='string'||typeof v?.value!=='string'))return false;
  }
  return true;
}

// Presence of a valid link file is the first-login marker. A stray cookie
// folder is deliberately ignored when that marker is absent or damaged.
export async function loadSavedLogin(root){
  const files=paths(root);let link;
  try{
    const record=await readJson(files.link);
    if(record.version!==1||typeof record.url!=='string'||!record.url.trim()||record.url.length>8192)throw Error();
    link=normalizeTargetUrl(record.url);
  }catch{return {url:null,storageState:null,status:'first-run'};}
  let session;
  try{session=await readJson(files.session);}catch(error){return {url:link,storageState:null,status:error.code==='ENOENT'?'session-missing':'session-invalid'};}
  if(session?.version!==1||session.targetOrigin!==new URL(link).origin||!validState(session.storageState))
    return {url:link,storageState:null,status:'session-invalid'};
  return {url:link,storageState:session.storageState,status:'available'};
}
export function savedStateFor(saved,target){
  return saved.url&&saved.storageState&&new URL(saved.url).origin===new URL(target).origin?saved.storageState:null;
}

async function atomicJson(path,value){
  const text=JSON.stringify(value,null,2)+'\n';
  if(Buffer.byteLength(text)>MAX_BYTES)throw Error('SAVED_SESSION_TOO_LARGE');
  const temp=path+'.'+randomUUID()+'.tmp';
  try{await writeFile(temp,text,{encoding:'utf8',mode:0o600,flag:'wx'});await rename(temp,path);}
  finally{await unlink(temp).catch(()=>{});}
}

// Export only this app's context cookies and the current page's localStorage.
// This avoids navigating helper tabs or exporting credentials into reports.
export function createLoginPersistence({root,context,page,target,restoreStatus='first-run'}){
  const files=paths(root),origin=new URL(target).origin;
  let window=null,inFlight=null,closed=false,lastSavedAt=null,lastCheckpoint=null;
  const info=()=>({enabled:true,restoreStatus,lastSavedAt,lastCheckpoint:lastCheckpoint?{...lastCheckpoint}:null});
  function result(state,reason){lastCheckpoint={state,reason,at:new Date().toISOString()};return {...lastCheckpoint};}
  async function capture(reason){
    if(closed||page.isClosed())return result('page-unavailable',reason);
    if(!await within(page.evaluate(loginFlag).catch(()=>false),1000,false))return result('not-logged-in',reason);
    const snapshot=await within(Promise.all([context.cookies(),page.evaluate(()=>({
      origin:location.origin,localStorage:Object.keys(localStorage).map(name=>({name,value:localStorage.getItem(name)}))
    }))]).catch(()=>null),3000,null);
    if(!snapshot||closed||page.isClosed())return result('snapshot-unavailable',reason);
    const [cookies,local]=snapshot;
    const state={cookies,origins:[local]};
    if(!validState(state))return result('snapshot-unavailable',reason);
    if(!await within(page.evaluate(loginFlag).catch(()=>false),1000,false))return result('not-logged-in',reason);
    const at=new Date().toISOString();
    await mkdir(join(directory(root),'link-login'),{recursive:true,mode:0o700});
    await mkdir(join(directory(root),'cookie-tai-khoan'),{recursive:true,mode:0o700});
    // Write the session first. Exact-origin binding makes an interrupted pair
    // fall back to manual login rather than restoring a mismatched account.
    await atomicJson(files.session,{version:1,targetOrigin:origin,savedAt:at,storageState:state});
    await atomicJson(files.link,{version:1,url:target,savedAt:at});
    lastSavedAt=at;return result('saved',reason);
  }
  return {info,
    setWindow(value){window=value;},endWindow(){window=null;},
    checkpoint(reason,{force=false}={}){
      if(closed)return Promise.resolve(result('closed',reason));
      if(!force&&window&&Date.now()>=window.startAt-60000&&Date.now()<=window.endAt+35000)
        return Promise.resolve(result('deferred-near-round',reason));
      if(inFlight)return inFlight;
      inFlight=capture(reason).catch(()=>result('save-failed',reason)).finally(()=>{inFlight=null;});
      return inFlight;
    },
    async finish(){closed=true;if(inFlight)await inFlight;return info();}
  };
}
