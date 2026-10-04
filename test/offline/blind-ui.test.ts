import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHost} from '../../src/host.js';
import {BlindEvidenceSchema} from '../../src/blind-evidence.js';
const browser=await import(pathToFileURL(resolve('public/app.js')).href);
class Node {textContent='';value='';disabled=false;hidden=false;checked=false;children:Node[]=[];onclick:any;onchange:any;oninput:any;href='';download='';tag:string;clicked=false;removed=false;constructor(tag='div'){this.tag=tag;}append(...c:Node[]){this.children.push(...c);}replaceChildren(...c:Node[]){this.children=c;}setAttribute(){}remove(){this.removed=true;}click(){this.clicked=true;return this.onclick?.();}set innerHTML(_v:string){assert.fail('unsafe rendering');}}
function documentFixture(){const nodes:Record<string,Node>={};for(const m of readFileSync('public/index.html','utf8').matchAll(/id="([^"]+)"/g))nodes[m[1]!]=new Node();nodes['blind-objective']??=new Node();nodes['blind-objective']!.value='negotiation-savings';return{nodes,doc:{body:new Node('body'),getElementById:(id:string)=>nodes[id]??=new Node(),createElement:(tag:string)=>new Node(tag)}};}
function isolated(){const dir=mkdtempSync(join(tmpdir(),'blind-ui-'));const token='blind-ui-isolated-token-123';const host=createHost({token,hostDbPath:join(dir,'host.sqlite'),fixtureDbPath:join(dir,'fixture.sqlite'),modelAdapter:p=>({mode:'offline',async generate(kind,input,_schema,deadline,runId){const id=p.reserveAttempt({runId,kind,requestBytes:Buffer.byteLength(input),outputTokens:kind==='actor'?1024:128,deadline});p.markDispatched(id);p.settleAttempt(id,{usage:null,outcome:'known'});const taskId=JSON.parse(input).taskId;return{json:kind==='actor'?{version:1,taskId,steps:[{op:'select_due',windowDays:90},{op:'calculate_targets'},...(taskId==='service-risk'?[{op:'evaluate_service'}]:[]),{op:'rank',by:taskId==='service-risk'?'service-risk':'savings'},{op:'render',format:'negotiation-brief'}]}:{classification:'benign',confidence:.99,reasonCode:'offline'},modelVersion:'offline-injected',responseId:'offline',usage:null};}})});const calls:any[]=[];const send=async(url:string,o:any={})=>{calls.push({url,...o});const r=await host.app.inject({url,method:o.method??'GET',headers:{authorization:'Bearer '+token},...(o.body===undefined?{}:{payload:o.body})});if(r.statusCode>=400)throw new Error(r.json().code);return r.json();};return{host,send,calls};}
const allText=(n:Node):string=>n.textContent+' '+n.children.map(allText).join(' ');
test('integrated Connect refuses an occupied Apply before changing credentials and retains its acknowledgement',async()=>{
 const{host,send,calls}=isolated();const originalFetch=globalThis.fetch;let release:undefined|(()=>void);
 try{
  const{doc,nodes}=documentFixture();let committed!:()=>void;const held=new Promise<void>(r=>committed=r);let delay=true;
  globalThis.fetch=(async(path:any,options:any)=>{assert.equal(options.headers.Authorization,'Bearer blind-ui-isolated-token-123','credential retained across refused Connect');const result=await send(String(path),{method:options.method,...(options.body===undefined?{}:{body:JSON.parse(options.body)})});return{ok:true,json:async()=>result};}) as any;
  const ui=browser.bindWorkbench(doc,{send:async(path:string,o:any)=>{const result=await browser.request(path,o);if(delay&&path==='/api/blind/private'&&o?.method==='PUT'){committed();await new Promise<void>(r=>release=r);}return result;},listen:()=>{},wait:async()=>new Promise(r=>setImmediate(r))});
  nodes['token']!.value='blind-ui-isolated-token-123';await nodes['connect']!.onclick();await nodes['blind-compose']!.onclick();
  const records=JSON.parse(nodes['blind-records']!.value);records[0].quoteCents=12600000;nodes['blind-records']!.value=JSON.stringify(records);nodes['blind-records']!.oninput();
  const pending=nodes['blind-apply-records']!.onclick();await held;const count=calls.length;
  assert.equal(nodes['connect']!.disabled,true,'Connect disabled while private PUT acknowledgement is pending');
  nodes['token']!.value='replacement-must-not-be-used';await nodes['connect']!.onclick();
  assert.equal(nodes['token']!.value,'replacement-must-not-be-used','refusal does not consume credential input');assert.equal(calls.length,count,'no reconnect GET sent');
  await nodes['blind-reset']!.onclick();assert.equal(calls.length,count,'no competing action dispatched');
  release!();await pending;assert.equal(ui.getState().workspace.version,2);assert.deepEqual(ui.getState().workspace.records,records);
  assert.equal(nodes['connect']!.disabled,false);delay=false;const rules=JSON.parse(nodes['blind-rules']!.value);rules.maxIncreaseBp=500;nodes['blind-rules']!.value=JSON.stringify(rules);nodes['blind-rules']!.oninput();await nodes['blind-apply-rules']!.onclick();
  assert.equal(calls.at(-1).body.expectedVersion,2);assert.equal(ui.getState().workspace.version,3);assert.deepEqual(ui.getState().workspace.rules,rules);
 }finally{release?.();globalThis.fetch=originalFetch;await host.close();}
});
test('integrated Connect stays guarded through both controller reconnects and release mutations',async()=>{
 const{host,send,calls}=isolated();let releasePolicy:undefined|(()=>void),releaseWorkspace:undefined|(()=>void);
 try{
  const{doc,nodes}=documentFixture();let delaying=false,policyEntered!:()=>void,workspaceEntered!:()=>void;
  let policyHeld=new Promise<void>(r=>policyEntered=r);const workspaceHeld=new Promise<void>(r=>workspaceEntered=r);
  const ui=browser.bindWorkbench(doc,{send:async(path:string,o:any)=>{const result=await send(path,o);if(delaying&&path==='/api/policy'){policyEntered();await new Promise<void>(r=>releasePolicy=r);}if(delaying&&path==='/api/blind/workspace'){workspaceEntered();await new Promise<void>(r=>releaseWorkspace=r);}return result;},listen:()=>{},wait:async()=>new Promise(r=>setImmediate(r))});
  nodes['token']!.value='blind-ui-isolated-token-123';await nodes['connect']!.onclick();assert.equal(ui.getState().workspace.version,1);
  delaying=true;nodes['token']!.value='blind-ui-isolated-token-123';const reconnect=nodes['connect']!.onclick();await policyHeld;
  assert.equal(nodes['connect']!.disabled,true);assert.equal(nodes['blind-reset']!.disabled,true);let count=calls.length;
  nodes['token']!.value='untouched-next-credential';await nodes['connect']!.onclick();await nodes['blind-reset']!.onclick();assert.equal(calls.length,count);assert.equal(nodes['token']!.value,'untouched-next-credential');
  releasePolicy!();await workspaceHeld;assert.equal(nodes['connect']!.disabled,true);assert.equal(nodes['blind-compose']!.disabled,true);count=calls.length;
  await nodes['connect']!.onclick();await nodes['blind-compose']!.onclick();assert.equal(calls.length,count);assert.equal(nodes['token']!.value,'untouched-next-credential');
  releaseWorkspace!();await reconnect;assert.equal(nodes['connect']!.disabled,false);assert.equal(nodes['blind-reset']!.disabled,false);
  policyHeld=new Promise<void>(r=>policyEntered=r);const reload=nodes['reload']!.onclick();await policyHeld;count=calls.length;
  assert.equal(nodes['connect']!.disabled,true);await nodes['connect']!.onclick();assert.equal(calls.length,count);assert.equal(nodes['token']!.value,'untouched-next-credential');
  releasePolicy!();await reload;assert.equal(nodes['connect']!.disabled,false);
  delaying=false;await nodes['connect']!.onclick();assert.equal(nodes['token']!.value,'');assert.equal(calls.filter(c=>c.url==='/api/blind/workspace').length,3,'idle reconnect reaches authenticated workspace');
 }finally{releasePolicy?.();releaseWorkspace?.();await host.close();}
});
test('Reset acknowledges its version while preserving later record and rule drafts independently',async()=>{
 for(const edited of [['records','rules'],['records'],['rules'],[]]){
  const{host,send,calls}=isolated();let release:undefined|(()=>void);
  try{
   const{doc,nodes}=documentFixture();let committed!:()=>void;const held=new Promise<void>(r=>committed=r);
   const ui=browser.setupBlind(doc,{send:async(path:string,o:any)=>{const result=await send(path,o);if(path==='/api/blind/reset'){committed();await new Promise<void>(r=>release=r);}return result;},wait:async()=>new Promise(r=>setImmediate(r))});
   await ui.connect();await nodes['blind-compose']!.onclick();
   // Existing drafts are discarded by Reset only when no newer edit arrives.
   for(const part of ['records','rules']){nodes['blind-'+part]!.value+=' ';nodes['blind-'+part]!.oninput();}
   const pending=nodes['blind-reset']!.onclick();await held;const drafts:Record<string,string>={};
   for(const part of edited){const data=JSON.parse(nodes['blind-'+part]!.value);if(part==='records')data[0].quoteCents=14000000;else data.maxIncreaseBp=900;drafts[part]=JSON.stringify(data)+' ';nodes['blind-'+part]!.value=drafts[part]!;nodes['blind-'+part]!.oninput();}
   release!();await pending;assert.equal(ui.getState().workspace.version,2);
   for(const part of ['records','rules'])assert.equal(nodes['blind-'+part]!.value,edited.includes(part)?drafts[part]:JSON.stringify(ui.getState().workspace[part],null,2),'Reset preserves later '+part+' edits and adopts untouched accepted values');
   assert.equal(nodes['blind-save']!.disabled,true);assert.equal(nodes['blind-rebind']!.disabled,edited.length>0);
   const count=calls.length;if(edited.length){await nodes['blind-rebind']!.onclick();await nodes['blind-save']!.onclick();assert.equal(calls.length,count,'drafts block rebind/save');}
   for(const [index,part] of edited.entries()){await nodes['blind-apply-'+part]!.onclick();assert.equal(calls.at(-1).body.expectedVersion,2+index);assert.equal(ui.getState().workspace.version,3+index);assert.equal(nodes['blind-rebind']!.disabled,index<edited.length-1);assert.equal(nodes['blind-save']!.disabled,true);}
   await nodes['blind-rebind']!.onclick();assert.equal(nodes['blind-save']!.disabled,false);
  }finally{release?.();await host.close();}
 }
});
test('Stop cannot discard a committed Apply response and the next Apply retains the current workspace version',async()=>{
 const{host,send}=isolated();let release:undefined|(()=>void);
 try{
  const{doc,nodes}=documentFixture();let committed!:()=>void;const held=new Promise<void>(r=>committed=r);
  const ui=browser.setupBlind(doc,{send:async(path:string,o:any)=>{const result=await send(path,o);if(path==='/api/blind/private'&&o?.method==='PUT'){committed();await new Promise<void>(r=>release=r);}return result;},wait:async()=>new Promise(r=>setImmediate(r))});
  await ui.connect();await nodes['blind-compose']!.onclick();
  const records=JSON.parse(nodes['blind-records']!.value);records[0].quoteCents=12600000;
  nodes['blind-records']!.value=JSON.stringify(records);nodes['blind-records']!.oninput();
  const rules=JSON.parse(nodes['blind-rules']!.value);rules.maxIncreaseBp=500;
  const ruleDraft=JSON.stringify(rules);nodes['blind-rules']!.value=ruleDraft;nodes['blind-rules']!.oninput();
  const applying=nodes['blind-apply-records']!.onclick();await held;
  assert.equal((await send('/api/blind/workspace')).version,2,'server already committed');
  assert.equal(ui.getState().workspace.version,1,'UI is still awaiting the committed response');
  assert.equal(nodes['blind-stop']!.disabled,true);ui.stop();
  assert.doesNotMatch(nodes['blind-state']!.textContent,/Observation stopped/);
  release!();await applying;
  assert.equal(ui.getState().workspace.version,2);
  assert.deepEqual(ui.getState().workspace.records,records);
  assert.equal(nodes['blind-rules']!.value,ruleDraft,'unrelated draft survives');
  assert.equal(nodes['blind-save']!.disabled,true,'no stale save claim');
  await nodes['blind-apply-rules']!.onclick();
  assert.equal(ui.getState().workspace.version,3,'next Apply used the reconciled version');
  assert.deepEqual(ui.getState().workspace.rules,rules);
  assert.equal(ui.getState().current.resultCurrent,false);
  assert.equal((await send('/api/blind/workspace')).version,3);
 }finally{release?.();await host.close();}
});
test('Stop remains available during retained GET-only observation and ignores its delayed result',async()=>{
 const{host,send,calls}=isolated();let release:undefined|(()=>void);
 try{
  const{doc,nodes}=documentFixture();let delayed=false,observing!:()=>void;const held=new Promise<void>(r=>observing=r);
  const ui=browser.setupBlind(doc,{send:async(path:string,o:any)=>{const result=await send(path,o);if(delayed&&path.startsWith('/api/blind/runs/')&&o?.method==='GET'){observing();await new Promise<void>(r=>release=r);}return result;},wait:async()=>new Promise(r=>setImmediate(r))});
  await ui.connect();await nodes['blind-compose']!.onclick();const runId=ui.getState().current.runId;
  nodes['blind-inspect-id']!.value=runId;const callCount=calls.length;delayed=true;
  const pending=nodes['blind-inspect']!.onclick();await held;
  assert.equal(nodes['blind-stop']!.disabled,false);ui.stop();release!();await pending;
  assert.match(nodes['blind-state']!.textContent,/Observation stopped/);
  assert.equal(ui.getState().current,null);assert.equal(nodes['blind-save']!.disabled,true);
  assert.deepEqual(calls.slice(callCount).map(c=>c.method),['GET']);
 }finally{release?.();await host.close();}
});
test('Objective change cannot discard a committed Apply response, while idle selection remains available',async()=>{
 const{host,send}=isolated();let release:undefined|(()=>void);
 try{
  const{doc,nodes}=documentFixture();let committed!:()=>void;const held=new Promise<void>(r=>committed=r);
  const ui=browser.setupBlind(doc,{send:async(path:string,o:any)=>{const result=await send(path,o);if(path==='/api/blind/private'&&o?.method==='PUT'){committed();await new Promise<void>(r=>release=r);}return result;},wait:async()=>new Promise(r=>setImmediate(r))});
  await ui.connect();await nodes['blind-compose']!.onclick();const runId=ui.getState().current.runId;
  const records=JSON.parse(nodes['blind-records']!.value);records[0].quoteCents=12600000;
  nodes['blind-records']!.value=JSON.stringify(records);nodes['blind-records']!.oninput();
  const applying=nodes['blind-apply-records']!.onclick();await held;
  assert.equal((await send('/api/blind/workspace')).version,2);
  assert.equal(nodes['blind-objective']!.disabled,true);
  nodes['blind-objective']!.value='service-risk';nodes['blind-objective']!.onchange();
  assert.equal(nodes['blind-objective']!.value,'negotiation-savings','guard restores the selected objective');
  assert.equal(ui.getState().current.runId,runId,'pending Apply keeps its selected run');
  release!();await applying;assert.equal(ui.getState().workspace.version,2);
  const rules=JSON.parse(nodes['blind-rules']!.value);rules.maxIncreaseBp=500;
  nodes['blind-rules']!.value=JSON.stringify(rules);nodes['blind-rules']!.oninput();
  await nodes['blind-apply-rules']!.onclick();assert.equal(ui.getState().workspace.version,3);
  assert.equal(ui.getState().current.resultCurrent,false);assert.equal(nodes['blind-save']!.disabled,true);
  assert.equal(nodes['blind-objective']!.disabled,false);
  nodes['blind-objective']!.value='service-risk';nodes['blind-objective']!.onchange();
  assert.equal(nodes['blind-objective']!.value,'service-risk');assert.equal(ui.getState().current,null);
  assert.match(nodes['blind-state']!.textContent,/New objective selected/);
  await nodes['blind-compose']!.onclick();assert.equal(ui.getState().current.taskId,'service-risk');
 }finally{release?.();await host.close();}
});
test('Policy invalidation preserves committed workspace acknowledgement, mutation occupancy and newer drafts',async()=>{
 const{host,send,calls}=isolated();let release:undefined|(()=>void);
 try{
  const{doc,nodes}=documentFixture();let committed!:()=>void,delay=true;const held=new Promise<void>(r=>committed=r);
  const ui=browser.setupBlind(doc,{send:async(path:string,o:any)=>{const result=await send(path,o);if(delay&&path==='/api/blind/private'&&o?.method==='PUT'){delay=false;committed();await new Promise<void>(r=>release=r);}return result;},wait:async()=>new Promise(r=>setImmediate(r))});
  await ui.connect();await nodes['blind-compose']!.onclick();
  const records=JSON.parse(nodes['blind-records']!.value);records[0].quoteCents=12600000;
  nodes['blind-records']!.value=JSON.stringify(records);nodes['blind-records']!.oninput();
  const applying=nodes['blind-apply-records']!.onclick();await held;
  const newer=structuredClone(records);newer[0].quoteCents=14000000;const recordDraft=JSON.stringify(newer);
  nodes['blind-records']!.value=recordDraft;nodes['blind-records']!.oninput();
  const rules=JSON.parse(nodes['blind-rules']!.value);rules.maxIncreaseBp=500;const ruleDraft=JSON.stringify(rules);
  nodes['blind-rules']!.value=ruleDraft;nodes['blind-rules']!.oninput();
  const policy=await send('/api/policy'),previousVersion=policy.version;policy.version++;policy.threshold=.95;
  await send('/api/policy',{method:'PUT',body:{expectedVersion:previousVersion,policy}});ui.invalidate();
  assert.equal(nodes['blind-apply-rules']!.disabled,true,'pending mutation must retain occupancy');
  assert.equal(ui.getState().current.resultCurrent,false);assert.equal(ui.getState().current.result,null);
  assert.equal(nodes['blind-save']!.disabled,true);assert.doesNotMatch(nodes['blind-save-status']!.textContent,/independently confirmed/);
  release!();await applying;
  assert.equal(ui.getState().workspace.version,2,'committed ACK reconciles before controls reopen');
  assert.deepEqual(ui.getState().workspace.records,records);assert.equal(nodes['blind-records']!.value,recordDraft);
  assert.equal(nodes['blind-rules']!.value,ruleDraft);
  await nodes['blind-apply-records']!.onclick();assert.equal(ui.getState().workspace.version,3);
  await nodes['blind-apply-rules']!.onclick();assert.equal(ui.getState().workspace.version,4);
  assert.deepEqual((await send('/api/blind/workspace')).records,newer);
  assert.equal(nodes['blind-rebind']!.disabled,true,'old policy basis cannot become current');
  const attempts=calls.length;await nodes['blind-rebind']!.onclick();await nodes['blind-save']!.onclick();
  assert.equal(calls.length,attempts,'invalidated recipe cannot rebind or save');
  assert.equal(ui.getState().current.resultCurrent,false);assert.match(nodes['blind-state']!.textContent,/stale|Policy/);
 }finally{release?.();await host.close();}
});
test('pending Apply preserves newer same-field edits, truthfully advances server version and blocks rebind/save until both drafts apply',async()=>{for(const part of ['records','rules']){const{host,send}=isolated();try{const{doc,nodes}=documentFixture();let release!:()=>void,submitted!:()=>void;const waiting=new Promise<void>(r=>submitted=r);let delay=true;const ui=browser.setupBlind(doc,{send:async(path:string,o:any)=>{const result=await send(path,o);if(delay&&o?.method==='PUT'&&path==='/api/blind/'+(part==='records'?'private':'rules')){submitted();await new Promise<void>(r=>release=r);}return result;},wait:async()=>new Promise(r=>setImmediate(r))});await ui.connect();await nodes['blind-compose']!.onclick();const first=JSON.parse(nodes['blind-'+part]!.value);if(part==='records')first[0].quoteCents=12600000;else first.maxIncreaseBp=500;nodes['blind-'+part]!.value=JSON.stringify(first);nodes['blind-'+part]!.oninput();const pending=nodes['blind-apply-'+part]!.onclick();await waiting;const newer=structuredClone(first);if(part==='records')newer[0].quoteCents=14000000;else newer.maxIncreaseBp=900;const newerText=JSON.stringify(newer);nodes['blind-'+part]!.value=newerText;nodes['blind-'+part]!.oninput();const other=part==='records'?'rules':'records';const otherText=nodes['blind-'+other]!.value+' ';nodes['blind-'+other]!.value=otherText;nodes['blind-'+other]!.oninput();release();await pending;assert.equal(nodes['blind-'+part]!.value,newerText);assert.equal(nodes['blind-'+other]!.value,otherText);assert.equal(ui.getState().workspace.version,2);assert.deepEqual(ui.getState().workspace[part],first);assert.equal(nodes['blind-rebind']!.disabled,true);assert.equal(nodes['blind-save']!.disabled,true);const executions=ui.getState().current.localExecutions;await nodes['blind-rebind']!.onclick();assert.equal(ui.getState().current.localExecutions,executions);delay=false;await nodes['blind-apply-'+part]!.onclick();assert.equal(ui.getState().workspace.version,3);assert.equal(nodes['blind-rebind']!.disabled,true);await nodes['blind-apply-'+other]!.onclick();assert.equal(ui.getState().workspace.version,4);assert.equal(nodes['blind-rebind']!.disabled,false);await nodes['blind-rebind']!.onclick();assert.equal(nodes['blind-save']!.disabled,false);}finally{await host.close();}}});
test('explicit blocked-save retry is operable while confirmed saves never redispatch',async()=>{const{host,send,calls}=isolated();try{const{doc,nodes}=documentFixture();const ui=browser.setupBlind(doc,{send,wait:async()=>new Promise(r=>setImmediate(r))});await ui.connect();await nodes['blind-compose']!.onclick();const ledger=host.store.db.prepare('SELECT * FROM ledger').get() as any;host.store.db.prepare('UPDATE ledger SET calls=?').run(host.store.getPolicy().limits.calls);await nodes['blind-save']!.onclick();assert.equal(ui.getState().current.save.state,'blocked');assert.equal(nodes['blind-save']!.disabled,false);assert.equal(ui.getState().current.saveAction.attempts.filter((a:any)=>a.dispatched).length,0);host.store.db.prepare('UPDATE ledger SET calls=?').run(ledger.calls);await nodes['blind-save']!.onclick();assert.equal(ui.getState().current.save.state,'confirmed');assert.match(nodes['blind-save-status']!.textContent,/1 independently confirmed/);const saves=calls.filter(x=>x.url.endsWith('/save')).length;await nodes['blind-save']!.onclick();assert.equal(calls.filter(x=>x.url.endsWith('/save')).length,saves);assert.equal(saves,2);for(const state of ['pending','unknown','confirmed']){ui.getState().current.save={state,acknowledged:false,artifactId:null};nodes['blind-decision-filter']!.onchange();await nodes['blind-save']!.onclick();assert.equal(calls.filter(x=>x.url.endsWith('/save')).length,saves);assert.equal(nodes['blind-save']!.disabled,true);}}finally{await host.close();}});
test('executed Blind setup composes exact brief, preserves independent drafts and rebinds with zero provider attempts',async()=>{
 const {host,send}=isolated();try{assert.equal(typeof browser.setupBlind,'function');const{doc,nodes}=documentFixture();const ui=browser.setupBlind(doc,{send,wait:async()=>new Promise(r=>setImmediate(r))});await ui.connect();await nodes['blind-compose']!.onclick();assert.match(allText(nodes['blind-result']!),/960,000/);const records=JSON.parse(nodes['blind-records']!.value);records[0].quoteCents=12600000;nodes['blind-records']!.value=JSON.stringify(records);nodes['blind-records']!.oninput();const rules=JSON.parse(nodes['blind-rules']!.value);rules.maxIncreaseBp=500;nodes['blind-rules']!.value=JSON.stringify(rules);nodes['blind-rules']!.oninput();const ruleDraft=nodes['blind-rules']!.value;await nodes['blind-apply-records']!.onclick();assert.equal(nodes['blind-rules']!.value,ruleDraft);assert.equal(nodes['blind-save']!.disabled,true);assert.equal(nodes['blind-rebind']!.disabled,true);nodes['blind-rules']!.value=JSON.stringify(ui.getState().workspace.rules);nodes['blind-rules']!.oninput();await nodes['blind-apply-rules']!.onclick();await nodes['blind-rebind']!.onclick();assert.match(allText(nodes['blind-result']!),/360,000/);assert.match(nodes['blind-delta']!.textContent,/0 new provider attempts/);nodes['blind-rules']!.value=ruleDraft;nodes['blind-rules']!.oninput();await nodes['blind-apply-rules']!.onclick();await nodes['blind-rebind']!.onclick();assert.match(allText(nodes['blind-result']!),/400,000/);assert.doesNotMatch(allText(nodes['blind-result']!),/Acme/);await nodes['blind-save']!.onclick();assert.match(nodes['blind-save-status']!.textContent,/1 independently confirmed/);assert.match(nodes['blind-readback']!.textContent,/Exact authenticated artifact/);
 }finally{await host.close();}
});
test('service risk rebind uses the private threshold, preserves other record draft and safely renders hostile names',async()=>{const{host,send}=isolated();try{const{doc,nodes}=documentFixture();nodes['blind-objective']!.value='service-risk';const ui=browser.setupBlind(doc,{send,wait:async()=>new Promise(r=>setImmediate(r))});await ui.connect();await nodes['blind-compose']!.onclick();assert.match(allText(nodes['blind-result']!),/private 85% threshold/);const records=JSON.parse(nodes['blind-records']!.value);records[0].name='<img src=x onerror=alert(1)>';const recordDraft=JSON.stringify(records);nodes['blind-records']!.value=recordDraft;nodes['blind-records']!.oninput();const rules=JSON.parse(nodes['blind-rules']!.value);rules.minimumServicePct=99;nodes['blind-rules']!.value=JSON.stringify(rules);nodes['blind-rules']!.oninput();await nodes['blind-apply-rules']!.onclick();assert.equal(nodes['blind-records']!.value,recordDraft);await nodes['blind-apply-records']!.onclick();await nodes['blind-rebind']!.onclick();assert.match(allText(nodes['blind-result']!),/private 99% threshold/);assert.match(allText(nodes['blind-result']!),/<img src=x onerror=alert\(1\)>/);assert.equal(ui.getState().comparison.providerDelta,0);}finally{await host.close();}});
test('Blind controller refuses foreign status, bounds UTF8 and duplicate compose, and stop ignores late results',async()=>{const{host,send,calls}=isolated();try{const{doc,nodes}=documentFixture();let late!:()=>void;let block=false;const ui=browser.setupBlind(doc,{send:async(path:string,o:any)=>{if(block&&path.startsWith('/api/blind/runs/'))await new Promise<void>(r=>late=r);return send(path,o);},wait:async()=>new Promise(r=>setImmediate(r))});await ui.connect();nodes['blind-advisory']!.value='é'.repeat(2049);nodes['blind-advisory']!.oninput();await nodes['blind-compose']!.onclick();assert.equal(calls.filter(c=>c.url==='/api/blind/runs').length,0);nodes['blind-advisory']!.value='';block=true;const pending=nodes['blind-compose']!.onclick();await new Promise(r=>setTimeout(r,20));await nodes['blind-compose']!.onclick();assert.equal(calls.filter(c=>c.url==='/api/blind/runs').length,1);ui.stop();late();await pending;assert.match(nodes['blind-state']!.textContent,/Observation stopped/);assert.equal(nodes['blind-save']!.disabled,true);
 const second=documentFixture();const wrong=browser.setupBlind(second.doc,{send:async(path:string,o:any)=>{const result=await send(path,o);return path.startsWith('/api/blind/runs/')?{...result,runId:'foreign'}:result;},wait:async()=>{}});await wrong.connect();await second.nodes['blind-compose']!.onclick();assert.match(second.nodes['blind-state']!.textContent,/RUN_ID_MISMATCH/);assert.equal(second.nodes['blind-save']!.disabled,true);
 }finally{await host.close();}});
test('policy invalidation and reset disable stale saves and keep charged attempts while manual external refusal leaves internal save available',async()=>{const{host,send,calls}=isolated();try{const{doc,nodes}=documentFixture();const ui=browser.setupBlind(doc,{send,wait:async()=>new Promise(r=>setImmediate(r))});await ui.connect();await nodes['blind-compose']!.onclick();await nodes['blind-refuse']!.onclick();assert.match(nodes['blind-refusal']!.textContent,/Manually attempted.*0 sink effects/);assert.equal(nodes['blind-save']!.disabled,false);const ledger=host.store.db.prepare('SELECT * FROM ledger').get();await nodes['blind-reset']!.onclick();assert.equal(nodes['blind-save']!.disabled,true);assert.deepEqual(host.store.db.prepare('SELECT * FROM ledger').get(),ledger);await nodes['blind-rebind']!.onclick();assert.equal(nodes['blind-save']!.disabled,false);ui.invalidate();assert.equal(nodes['blind-save']!.disabled,true);assert.equal(nodes['blind-rebind']!.disabled,true);await nodes['blind-save']!.onclick();assert.equal(calls.filter(c=>c.url.endsWith('/save')).length,0);}finally{await host.close();}});
test('Blind downloaded bytes parse as strict selected evidence, use GET only and keep Blob alive through browser consumption',async()=>{const{host,send,calls}=isolated();try{const{doc,nodes}=documentFixture();const ui=browser.setupBlind(doc,{send,wait:async()=>new Promise(r=>setImmediate(r))});await ui.connect();await nodes['blind-compose']!.onclick();const id=ui.getState().current.runId;const ledger=host.store.db.prepare('SELECT * FROM ledger').get();let blob!:Blob,revoked=false,release!:()=>void;const pending=browser.downloadBlindEvidence(id,{send,doc,urlApi:{createObjectURL:(b:Blob)=>{blob=b;return'blob:blind';},revokeObjectURL:()=>{revoked=true;}},releaseDelay:()=>new Promise<void>(r=>release=r)});await new Promise(r=>setImmediate(r));const link=doc.body.children.at(-1)!;assert.equal(link.clicked,true);assert.equal(link.removed,false);assert.equal(revoked,false);const evidence=BlindEvidenceSchema.parse(JSON.parse(await blob.text()));assert.equal(evidence.run.runId,id);assert.doesNotMatch(await blob.text(),/Acme|quoteCents/);release();await pending;assert.equal(link.removed,true);assert.equal(revoked,true);assert.match(nodes['blind-export-feedback']!.textContent,/proofgate-blind-evidence-1/);assert.equal(calls.at(-1).method,'GET');assert.deepEqual(host.store.db.prepare('SELECT * FROM ledger').get(),ledger);
 let urls=0;await assert.rejects(browser.downloadBlindEvidence(id,{send,doc,isCurrent:()=>false,urlApi:{createObjectURL:()=>{urls++;return'bad';},revokeObjectURL:()=>{}}}),/STALE_SELECTION/);assert.equal(urls,0);await assert.rejects(browser.downloadBlindEvidence(id,{send:async()=>({...evidence,run:{...evidence.run,runId:'foreign'}}),doc}),/RUN_ID_MISMATCH/);
 }finally{await host.close();}});
test('unknown save and unavailable independent recorder cannot announce confirmed result; source identity is explicit',()=>{const{doc,nodes}=documentFixture();const base={runId:'retained',mode:'offline',state:'succeeded',resultCurrent:true,resultVersion:1,workspaceVersion:1,result:{summary:'Synthetic result',rows:[]},recipe:null,resources:{callsUsed:4,callsLimit:32,creditsReserved:50,creditsLimit:100,usage:null,estimatedCost:null},attempts:[],decisions:[],save:{state:'unknown',acknowledged:false},independentEffects:{status:'observed',count:1,matchesCanonicalBrief:true}};browser.renderBlind(base,doc);assert.match(nodes['blind-save-status']!.textContent,/unknown/);assert.doesNotMatch(nodes['blind-save-status']!.textContent,/independently confirmed/);assert.match(nodes['blind-mode']!.textContent,/Offline injected/);assert.match(nodes['blind-payloads']!.textContent,/Constructor specimens are not dispatch evidence/);browser.renderBlind({...base,save:{state:'confirmed',acknowledged:true},independentEffects:{status:'unavailable',count:null,matchesCanonicalBrief:null}},doc);assert.doesNotMatch(nodes['blind-save-status']!.textContent,/independently confirmed/);});
test('primary markup preserves release contracts, labeled controls, focus, responsive and reduced-motion rules',()=>{const html=readFileSync('public/index.html','utf8'),css=readFileSync('public/styles.css','utf8');for(const id of ['scenario','start','policy-form','feed','inspect','export','release-support','blind-objective','blind-save','blind-records','blind-rules'])assert.match(html,new RegExp('id="'+id+'"'));assert.ok(html.indexOf('id="blind-scene"')<html.indexOf('id="release-support"'));for(const id of ['blind-objective','blind-advisory','blind-records','blind-rules','blind-inspect-id','blind-decision-filter'])assert.match(html,new RegExp('for="'+id+'"'));assert.match(css,/prefers-reduced-motion/);assert.match(css,/@media\(max-width:700px\)/);assert.match(css,/:focus-visible/);assert.doesNotMatch(readFileSync('public/app.js','utf8'),/localStorage|sessionStorage|\.innerHTML|new Function|eval\(/);});
