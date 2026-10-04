import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync,readFileSync,existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join,resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { createHost } from '../../src/host.js';
import { DraftPlanSchema,MIGRATION,PolicySchema } from '../../src/contracts.js';
import type { HostPorts,ModelAdapter } from '../../src/model.js';
import { openEffectStore } from '../../fixture/server.js';
const token='phase02-offline-token-123456789';
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
export function advisorySetup(verdict='benign'){
 const dir=mkdtempSync(join(tmpdir(),'proofgate-advisory-'));const fixture=join(dir,'fixture.sqlite');const captured:{kind:string;input:string}[]=[];
 const model=(ports:HostPorts):ModelAdapter=>({mode:'offline',async generate(kind,input,_schema,deadline,runId){
  captured.push({kind,input});const id=ports.reserveAttempt({runId,kind,requestBytes:Buffer.byteLength(input),outputTokens:kind==='actor'?2048:256,deadline});ports.markDispatched(id);
  const payload=JSON.parse(input);const evidence=payload.evidence as {sourceId:string;text:string}[]|undefined;
  const json=kind==='checker'?{classification:verdict,confidence:0.99,reasonCode:'offline_phase02'}:payload.nextAction==='read_project_context'?{kind:'tool',tool:'read_project_context',args:{projectId:'proofgate-demo'}}:payload.nextAction==='read_dependency_evidence'?{kind:'tool',tool:'read_dependency_evidence',args:{dependency:'ProofLib',sourceVersion:'1.0.0',targetVersion:'2.0.0'}}:payload.nextAction==='incomplete'?{kind:'incomplete',reason:'Required facts missing'}:{kind:'tool',tool:'save_internal_draft',args:{draft:DraftPlanSchema.parse({sourceVersion:'1.0.0',targetVersion:'2.0.0',migration:MIGRATION,preparationStatus:'draft_only',steps:['plan_await_initialization'],citations:evidence!.filter(e=>!e.sourceId.endsWith(':advisory')).map(e=>e.sourceId)})}};
  ports.settleAttempt(id,{usage:null,outcome:'known'});ports.emit({runId,stage:kind,reasonCode:'model_response',inputHash:sha(input),modelVersion:'offline-phase02',responseId:'offline'});return {json,modelVersion:'offline-phase02',responseId:'offline',usage:null};
 }});
 const host=createHost({token,hostDbPath:join(dir,'host.sqlite'),fixtureDbPath:fixture,modelAdapter:model});return {host,fixture,captured};
}
export async function advisoryStart(host:ReturnType<typeof createHost>,advisory?:unknown,extras={}){const r=await host.app.inject({method:'POST',url:'/api/runs',headers:{authorization:`Bearer ${token}`},payload:{scenario:'clean',...(advisory===undefined?{}:{advisory}),...extras}});return r;}
export function advisoryEffects(fixture:string,runId:string){if(!existsSync(fixture))return [];const s=openEffectStore(fixture);try{return s.read(runId);}finally{s.close();}}
test('controller delivers exact custom advisory through authenticated HTTP and actual stdio effect',async()=>{
 const {host,fixture,captured}=advisorySetup();const path=resolve('public/app.js');const {createRunController}=await import(path);const subject='Custom synthetic advisory: retain the breaking change.';const bodies:unknown[]=[];let final:any;const errors:unknown[]=[];
 try{const controller=createRunController({send:async(url:string,o:any={})=>{if(o.body)bodies.push(o.body);const r=await host.app.inject({method:o.method??'GET',url,headers:{authorization:`Bearer ${token}`},payload:o.body});assert.ok(r.statusCode<300,r.body);if(o.method==='POST')await host.waitForRun(r.json().runId);return r.json();},onView:(v:any)=>{final=v;},onError:(e:unknown)=>errors.push(e),wait:async()=>{}});
 await controller.start('clean',subject);assert.deepEqual(errors,[]);assert.deepEqual(bodies,[{scenario:'clean',advisory:subject}]);assert.equal(final.mode,'offline');assert.equal(final.state,'succeeded');assert.equal(advisoryEffects(fixture,final.runId).length,1);assert.deepEqual(JSON.parse(advisoryEffects(fixture,final.runId)[0]!.content),final.draft);assert.ok(captured.some(x=>x.kind==='checker'&&JSON.parse(x.input).subject===subject));
 const contexts=host.store.db.prepare("SELECT details FROM events WHERE run_id=? AND stage='actor_context'").all(final.runId) as any[];const responses=host.store.db.prepare("SELECT details FROM events WHERE run_id=? AND stage='actor' AND reason='model_response'").all(final.runId) as any[];assert.equal(contexts.length,3);assert.deepEqual(contexts.map(x=>JSON.parse(x.details).inputHash),responses.map(x=>JSON.parse(x.details).inputHash));assert.ok(contexts.every(x=>JSON.parse(x.details).sources.every((s:any)=>s.sourceId.startsWith(final.runId+':')&&s.contentHash.length===64)));
 await controller.start('clean','');assert.deepEqual(bodies[1],{scenario:'clean'});
 }finally{await host.close();}
});
test('invalid advisory and forged authority create zero runs and charge zero attempts',async()=>{const {host}=advisorySetup();try{for(const input of ['',12,'a'.repeat(4097),'é'.repeat(2049)])assert.equal((await advisoryStart(host,input)).statusCode,400);for(const extra of [{callerId:'admin'},{sourceId:'foreign'},{audiences:['public']},{tools:[]},{sinkId:'public'}])assert.equal((await advisoryStart(host,'benign',extra)).statusCode,400);assert.equal((host.store.db.prepare('SELECT count(*) n FROM runs').get() as any).n,0);assert.equal((host.store.db.prepare('SELECT count(*) n FROM attempts').get() as any).n,0);assert.equal((host.store.db.prepare('SELECT calls FROM ledger').get() as any).calls,0);}finally{await host.close();}});
test('finite schema ceilings expand without changing accepted defaults or existing charges',async()=>{const {host}=advisorySetup();try{const p=host.store.getPolicy();const disk=JSON.parse(readFileSync('config/policy.json','utf8'));assert.deepEqual(p,disk);const ledger=host.store.db.prepare('SELECT * FROM ledger').get();host.store.db.prepare('UPDATE ledger SET calls=7,credits=12345').run();const before=host.store.db.prepare('SELECT * FROM ledger').get();assert.ok(PolicySchema.safeParse({...p,limits:{...p.limits,calls:512,credits:134217728}}).success);for(const limits of [{...p.limits,calls:513},{...p.limits,credits:134217729}])assert.equal(PolicySchema.safeParse({...p,limits}).success,false);assert.deepEqual(host.store.db.prepare('SELECT * FROM ledger').get(),before);assert.equal((ledger as any).id,(before as any).id);assert.deepEqual(host.store.getPolicy(),disk);}finally{await host.close();}});
