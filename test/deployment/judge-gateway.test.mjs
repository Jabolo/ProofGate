import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createJudgeGateway} from '../../scripts/judge-gateway.mjs';

const owner = 'private-owner-token-for-tests', code = 'private-judge-code-for-tests', retained = randomUUID();
const listen = server => new Promise(resolve => server.listen(0,'127.0.0.1',()=>resolve('http://127.0.0.1:'+server.address().port)));
const close = server => new Promise(resolve => server.close(resolve));
async function fixture(t, respond = null, options = {}) {
  const dir = mkdtempSync(join(tmpdir(),'judge-gateway-')), requests = [];
  let runState = 'succeeded';
  const run = randomUUID(), artifact = randomUUID();
  const upstream = http.createServer(async(req,res)=>{
    const chunks=[];for await (const chunk of req)chunks.push(chunk);
    requests.push({path:req.url,method:req.method,headers:req.headers,body:Buffer.concat(chunks).toString()});
    res.setHeader('content-type','application/json');
    if(respond) return respond(req,res);
    if(req.url==='/') {res.setHeader('content-type','text/html');res.end('<script type="module" src="/app.js"></script>');return;}
    if(req.method==='POST'&&req.url==='/api/blind/runs'){res.statusCode=202;res.end(JSON.stringify({runId:run}));return;}
    if(req.url.startsWith('/api/blind/artifacts/')){res.end(JSON.stringify({artifactId:artifact,parentRunId:retained}));return;}
    if(req.url.includes('/api/blind/runs/')) {const id=req.url.split('/')[4];res.end(JSON.stringify({runId:id,state:runState,save:{state:'confirmed',artifactId:artifact}}));return;}
    res.end(JSON.stringify({ok:true}));
  });
  const upstreamUrl=await listen(upstream), stateFile=join(dir,'state.json');
  const config={ownerToken:owner,judgeCode:code,stateFile,retainedRun:retained,upstream:upstreamUrl,publicOrigin:'https://proofgate.example',...options};
  let gateway=createJudgeGateway(config), url=await listen(gateway);
  const session=randomUUID();
  async function request(path,method='GET',body=undefined, extra={}) {
    const {headers={},...other}=extra;
    return fetch(url+path,{method,headers:{authorization:'Bearer '+code,...(method==='GET'?{}:{'content-type':'application/json','x-proofgate-session':session,origin:'https://proofgate.example'}),...headers},...(body===undefined?{}:{body:typeof body==='string'?body:JSON.stringify(body)}),...other});
  }
  t.after(async()=>{await close(gateway);await close(upstream);rmSync(dir,{recursive:true,force:true});});
  return {request,requests,stateFile,run,artifact,session,url, setRunState(value){runState=value;},async restart(){await close(gateway);gateway=createJudgeGateway(config);url=await listen(gateway);}};
}

test('public HTML is labeled by injected UI; unauthenticated and owner API credentials cannot enter',async t=>{
  const f=await fixture(t);
  const html=await(await f.request('/')).text();assert.match(html,/judge-ui\.js/);assert.equal(html.includes(owner),false);
  assert.equal((await f.request('/api/policy','GET',undefined,{headers:{authorization:''}})).status,401);
  assert.equal((await f.request('/api/policy','GET',undefined,{headers:{authorization:'Bearer '+owner}})).status,401);
  const result=await f.request('/api/policy');assert.equal(result.status,200);assert.equal(f.requests.at(-1).headers.authorization,'Bearer '+owner);
  assert.equal(f.requests.at(-1).headers['x-proofgate-session'],undefined);
});
test('deliberate public guest bootstrap gives only restricted demo access without a login',async t=>{
  const f=await fixture(t);
  const bootstrap=await f.request('/api/judge/access','GET',undefined,{headers:{authorization:''}});
  assert.equal(bootstrap.status,200);
  const guest=await bootstrap.json();assert.equal(guest.identity,'public_guest');assert.equal(guest.sharedWorkspace,true);assert.equal(guest.judgeCode,code);assert.notEqual(guest.judgeCode,owner);
  assert.equal((await f.request('/api/blind/workspace','GET',undefined,{headers:{authorization:'Bearer '+guest.judgeCode}})).status,200);
  assert.equal((await f.request('/api/policy','PUT',{}, {headers:{authorization:'Bearer '+guest.judgeCode}})).status,403);
  assert.equal(f.requests.filter(r=>r.path==='/api/judge/access').length,0);
});
test('exact allowlist rejects administrator writes, release runs, encoded paths and unsupported queries',async t=>{
  const f=await fixture(t);
  for(const [path,method] of [['/api/policy','PUT'],['/api/feed','PUT'],['/api/runs','POST'],['/api/blind/runs/'+randomUUID(),'GET'],['/api/%62lind/workspace','GET'],['/api/blind/workspace?x=1','GET']])assert.equal((await f.request(path,method,method==='GET'?undefined:{})).status,403,path);
  assert.equal(f.requests.length,0);
});
test('writes require JSON, valid same-origin/session and strictly approved public goals',async t=>{
  const f=await fixture(t);
  assert.equal((await f.request('/api/blind/reset','POST',{}, {headers:{origin:'https://evil.example'}})).status,403);
  assert.equal((await f.request('/api/blind/reset','POST',{}, {headers:{'content-type':'text/plain'}})).status,415);
  assert.equal((await f.request('/api/blind/reset','POST',{}, {headers:{'x-proofgate-session':'bad'}})).status,400);
  assert.equal((await f.request('/api/blind/runs','POST',{taskId:'negotiation-savings',extra:'bad'})).status,400);
  assert.equal((await f.request('/api/blind/runs','POST',{taskId:'secret-exfiltration'})).status,400);
  assert.equal(f.requests.length,0);
});
test('composition quota is charged before dispatch and cannot reset on restart',async t=>{
  const f=await fixture(t);
  for(let i=0;i<6;i++)assert.equal((await f.request('/api/blind/runs','POST',{taskId:'negotiation-savings'})).status,202);
  assert.equal(JSON.parse(readFileSync(f.stateFile)).compositions,6);
  await f.restart();
  assert.equal((await f.request('/api/blind/runs','POST',{taskId:'service-risk'})).status,429);
  assert.equal(f.requests.filter(r=>r.method==='POST'&&r.path==='/api/blind/runs').length,6);
});
test('unknown dispatched failure remains charged and freezes further mutations even across restart',async t=>{
  const f=await fixture(t,(_req,res)=>{res.statusCode=503;res.end('{"code":"UNAVAILABLE"}');});
  assert.equal((await f.request('/api/blind/runs','POST',{taskId:'negotiation-savings'})).status,503);
  assert.equal(JSON.parse(readFileSync(f.stateFile)).compositions,1);
  await f.restart();
  const response=await f.request('/api/blind/runs','POST',{taskId:'negotiation-savings'});
  assert.equal(response.status,409);assert.equal((await response.json()).code,'JUDGE_UNKNOWN_DISPATCH_OWNER_REVIEW');assert.equal(f.requests.length,1);
});
test('lease excludes another session, and running composition excludes even the same session after 202',async t=>{
  const f=await fixture(t);
  assert.equal((await f.request('/api/blind/reset','POST',{})).status,200);
  assert.equal((await f.request('/api/blind/reset','POST',{}, {headers:{'x-proofgate-session':randomUUID()}})).status,409);
  f.setRunState('running');assert.equal((await f.request('/api/blind/runs','POST',{taskId:'service-risk'})).status,202);
  assert.equal((await f.request('/api/blind/reset','POST',{})).status,409);
  f.setRunState('succeeded');assert.equal((await f.request('/api/blind/reset','POST',{})).status,200);
});
test('save dispatches bounded to twelve and artifact read-back follows an allowed parent only',async t=>{
  const f=await fixture(t);
  assert.equal((await f.request('/api/blind/artifacts/'+f.artifact)).status,403);
  assert.equal((await f.request('/api/blind/runs/'+retained)).status,200);
  assert.equal((await f.request('/api/blind/artifacts/'+f.artifact)).status,200);
  for(let i=0;i<12;i++)assert.equal((await f.request('/api/blind/runs/'+retained+'/save','POST',{resultRevision:randomUUID()})).status,200);
  await f.restart();assert.equal((await f.request('/api/blind/runs/'+retained+'/save','POST',{})).status,429);
  assert.equal((await f.request('/api/blind/artifacts/'+randomUUID())).status,403);
});
test('request and upstream response bounds are enforced without unbounded buffering',async t=>{
  const f=await fixture(t,(_req,res)=>res.end('x'.repeat(262145)));
  assert.equal((await f.request('/api/blind/private','PUT','x'.repeat(65537))).status,413);
  assert.equal(f.requests.length,0);
  const response=await f.request('/api/blind/workspace');assert.equal(response.status,502);assert.equal((await response.json()).code,'JUDGE_RESPONSE_BOUND');
});
test('redirects and owner credential in upstream body are blocked rather than forwarded',async t=>{
  const f=await fixture(t,(req,res)=>{if(req.url==='/api/policy'){res.statusCode=302;res.setHeader('location','https://evil.example');res.end();}else res.end(JSON.stringify({secret:owner}));});
  assert.equal((await f.request('/api/policy')).status,502);
  const response=await f.request('/api/feed');assert.equal(response.status,502);assert.equal((await response.text()).includes(owner),false);
});
test('expired access and corrupt persistent state fail closed',async t=>{
  const f=await fixture(t,null,{expiresAt:'2020-01-01T00:00:00Z'});assert.equal((await f.request('/api/policy')).status,403);
  writeFileSync(f.stateFile,'{}');await assert.rejects(f.restart(),/JUDGE_STATE_INVALID/);
});
test('streamed upstream body also obeys the response bound',async t=>{
  const f=await fixture(t,(_req,res)=>{res.write('x'.repeat(200000));res.end('x'.repeat(65000));});
  const response=await f.request('/api/blind/workspace');assert.equal(response.status,502);assert.equal((await response.json()).code,'JUDGE_RESPONSE_BOUND');
});
test('dispatch timeout is bounded, remains charged and is never automatically replayed',async t=>{
  const f=await fixture(t,(_req,res)=>setTimeout(()=>res.end('{"ok":true}'),50),{timeoutMs:5});
  assert.equal((await f.request('/api/blind/runs','POST',{taskId:'service-risk'})).status,502);
  assert.equal(JSON.parse(readFileSync(f.stateFile)).compositions,1);
  assert.equal((await f.request('/api/blind/reset','POST',{})).status,409);
  assert.equal(f.requests.length,1);
});
test('artifact payload cannot substitute a different private run after admission',async t=>{
  const id=randomUUID();
  const f=await fixture(t,(req,res)=>res.end(JSON.stringify(req.url.includes('/artifacts/')?{artifactId:id,parentRunId:randomUUID()}:{runId:retained,state:'succeeded',save:{artifactId:id}})));
  assert.equal((await f.request('/api/blind/runs/'+retained)).status,200);
  const response=await f.request('/api/blind/artifacts/'+id);assert.equal(response.status,502);assert.equal((await response.json()).code,'JUDGE_ARTIFACT_MISMATCH');
});

test('abandoned judge lease expires after thirty seconds without resetting quotas',async t=>{
  let clock=10000;const f=await fixture(t,null,{now:()=>clock});
  assert.equal((await f.request('/api/blind/reset','POST',{})).status,200);
  const other=randomUUID();clock+=29999;
  assert.equal((await f.request('/api/blind/reset','POST',{}, {headers:{'x-proofgate-session':other}})).status,409);
  clock+=2;
  assert.equal((await f.request('/api/blind/reset','POST',{}, {headers:{'x-proofgate-session':other}})).status,200);
  const state=JSON.parse(readFileSync(f.stateFile));assert.equal(state.compositions,0);assert.equal(state.saves,0);
});
