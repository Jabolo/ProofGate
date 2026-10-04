import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync,writeFileSync,readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createHost } from '../../src/host.js';
import { openEffectStore } from '../../fixture/server.js';
// Persistent acceptance ledger; rerunning this command does NOT reset allowance.
const token='hosted-test-token-123456789';
const host=createHost({token,hostDbPath:'.proofgate/hosted-host.sqlite',fixtureDbPath:'.proofgate/hosted-fixture.sqlite'});
// Integrator authorized a same-epoch 128-call acceptance allowance after real
// failed runs. Credits and usage are retained; no allowance is replenished.
const priorLedger=host.store.db.prepare('SELECT * FROM ledger').get();
const currentPolicy=host.store.getPolicy();
if(currentPolicy.limits.calls===64){host.store.activatePolicy(currentPolicy.version,{...currentPolicy,version:currentPolicy.version+1,limits:{...currentPolicy.limits,calls:128}});assert.deepEqual(host.store.db.prepare('SELECT * FROM ledger').get(),priorLedger);console.log(JSON.stringify({policyActivation:{before:currentPolicy.version,after:host.store.getPolicy().version,callsLimit:128,retainedLedger:true}}));}
test.after(async()=>{await host.close();});
for(const scenario of ['clean','hostile','missing'] as const)test(`LIVE Vertex ${scenario}: actual actor/checker, MCP and independent effect`,async()=>{
 const start=await host.app.inject({method:'POST',url:'/api/runs',headers:{authorization:`Bearer ${token}`},payload:{scenario}});assert.equal(start.statusCode,202);const runId=start.json().runId;
 const v=await host.waitForRun(runId);const attempts=host.store.db.prepare('SELECT id,kind,credits,dispatched,outcome,usage FROM attempts WHERE run_id=?').all(runId);const events=host.store.db.prepare('SELECT stage,reason,details FROM events WHERE run_id=?').all(runId);
 mkdirSync('.proofgate/evidence',{recursive:true});const caseHash=createHash('sha256').update(readFileSync('test/cases.json')).digest('hex');writeFileSync(`.proofgate/evidence/${runId}.json`,JSON.stringify({scenario,caseHash,view:v,attempts,events,accountingScope:'runId'},null,2));
 console.log(JSON.stringify({scenario,runId,state:v.state,error:v.error?.code??null,sharedCalls:v.resources.callsUsed,sharedCredits:v.resources.creditsReserved,runCalls:attempts.filter((a:any)=>a.outcome!=='unsent').length,runCredits:attempts.filter((a:any)=>a.outcome!=='unsent').reduce((n:number,a:any)=>n+Number(a.credits),0),effects:v.effects,usage:v.resources.usage}));
 assert.equal(v.mode,'live');assert.equal(v.state,scenario==='missing'?'incomplete':'succeeded',JSON.stringify({code:v.error?.code,decisions:v.decisions}));
 const effects=openEffectStore('.proofgate/hosted-fixture.sqlite');try{const rows=effects.read(runId);assert.equal(rows.length,scenario==='missing'?0:1);if(rows[0]){assert.deepEqual(JSON.parse(rows[0].content),v.draft);assert.match(v.draft!.breakingChange,/configureAsync/);assert.ok(v.draft!.citations.includes(`${runId}:facts`));assert.equal(rows[0].sink_id,'internal');}}finally{effects.close();}
 assert.ok(attempts.some((a:any)=>a.kind==='actor'&&a.dispatched===1));assert.ok(attempts.some((a:any)=>a.kind==='checker'&&a.dispatched===1));assert.ok(attempts.some((a:any)=>a.kind==='tool'&&a.dispatched===1));
 assert.equal(v.evidence.find(e=>e.sourceId.endsWith(':advisory'))?.status,scenario==='hostile'?'quarantined':'admitted');
});
