import test from 'node:test';
import assert from 'node:assert/strict';
// The synthetic objects in this file are fault fixtures, never actual hosted proof.
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {randomUUID} from 'node:crypto';
import {createHost} from '../../src/host.js';
import {createModelAdapter} from '../../src/model.js';
import {initialPrivate,buildPlanner,buildRecipeInspection,publicCapabilities} from '../../src/blind.js';
import {initializeBlindStore} from '../../fixture/blind-store.js';
const {independentValues,valueClaims,localInputs,objectHash,sha,readFrozen,frozenHashes,validateProof,assertRoot,ApprovalSchema}=await import(pathToFileURL(resolve('scripts/check-blind-proof.mjs')).href);
test('independent arithmetic respects private ceiling, saving filter and risk ordering',()=>{
 const data={records:[{id:'a',currentCents:10000,quoteCents:12000,dueDays:10,servicePct:90},{id:'b',currentCents:20000,quoteCents:21000,dueDays:20,servicePct:60}],rules:{maxIncreaseBp:200,minimumSavingCents:1000,minimumServicePct:85}};
 const recipe={version:1,taskId:'negotiation-savings',steps:[{op:'select_due',windowDays:30},{op:'calculate_targets'},{op:'rank',by:'savings'},{op:'render',format:'negotiation-brief'}]};
 assert.deepEqual(independentValues(recipe,data),[{id:'a',targetCents:10200,savingCents:1800,atRisk:false}]);
});
// Fabricated completeness fixture: actual isolated offline SDK envelopes are
// relabeled live ONLY inside this test factory to exercise validator faults.
// No resulting object is written as hosted evidence or copied into a package.
async function fabricatedProof(){
 const dir=mkdtempSync(resolve(tmpdir(),'blind-proof-fabricated-')),token='isolated-proof-fault-token',headers={authorization:'Bearer '+token},fixture=readFrozen();initializeBlindStore(resolve(dir,'effects.sqlite'));
 const host=createHost({token,hostDbPath:resolve(dir,'host.sqlite'),fixtureDbPath:resolve(dir,'effects.sqlite'),modelAdapter:p=>createModelAdapter(p,{credentials:{type:'authorized_user',client_id:'fabricated',client_secret:'fabricated',refresh_token:'fabricated'},wireFetch:async(url,init)=>{
  if(String(url).includes('oauth2'))return Response.json({access_token:'fabricated',expires_in:3600,token_type:'Bearer'});
  const input=JSON.parse(JSON.parse(String(init?.body)).contents[0].parts[0].text),c=fixture.cases.find((c:any)=>c.advisory===input.advisory);
  const response=input.stage==='planner'?{version:1,taskId:input.taskId,steps:[{op:'select_due',windowDays:90},{op:'calculate_targets'},...(input.taskId==='service-risk'?[{op:'evaluate_service'}]:[]),{op:'rank',by:input.taskId==='service-risk'?'service-risk':'savings'},{op:'render',format:'negotiation-brief'}]}:{classification:input.stage==='advisory-checker'?c.classification:'benign',confidence:.99,reasonCode:'fabricated_fixture'};
  return Response.json({candidates:[{finishReason:'STOP',content:{role:'model',parts:[{text:JSON.stringify(response)}]}}],modelVersion:input.stage==='planner'?'gemini-3.5-flash':'gemini-3.5-flash-lite',responseId:'fabricated-response',usageMetadata:{promptTokenCount:12,candidatesTokenCount:6}});
 }})});
 const live=(e:any)=>{e.run.mode='live';for(const c of e.captures){c.mode='live';c.sourceIdentity='hosted_sdk_dispatch';}return e;};
 try{
  // Isolated retained charged work makes the budget-mutation fixture analogous
  // to the real historical ledger, without resetting or creating live stores.
  const retainedId=randomUUID();host.store.db.prepare("INSERT INTO attempts(id,run_id,kind,credits,dispatched,outcome,usage) VALUES(?,?,'auth',1024,1,'known',NULL)").run(retainedId,randomUUID());host.store.db.prepare('UPDATE ledger SET calls=1,credits=1024').run();
  const policy=host.store.getPolicy(),feed=host.store.getFeed(),baseline={...host.store.db.prepare('SELECT * FROM ledger').get()} as any,hashes=frozenHashes();
  const retainedAttemptsHash=objectHash(host.store.db.prepare('SELECT * FROM attempts ORDER BY id').all()),approval=ApprovalSchema.parse({schemaVersion:'proofgate-blind-approval-1',createdAt:new Date().toISOString(),hashes,paths:{host:'.proofgate/hosted-host.sqlite',fixture:'.proofgate/hosted-fixture.sqlite'},policy,feed,ledger:baseline,retainedAttemptsHash,retainedAttemptIds:[retainedId],unknowns:0,ceilings:{newAttempts:32,newCredits:11534336},predicted:{attempts:32,credits:11534336},privateWorkspaceHash:objectHash(initialPrivate())});
  const policyDenied={...policy,version:policy.version+1,limits:{...policy.limits,calls:baseline.calls,credits:baseline.credits}},policyRestored={...policy,version:policy.version+2};host.store.activatePolicy(policy.version,policyDenied);
  const deniedRun=await host.app.inject({url:'/api/blind/runs',method:'POST',headers,payload:{taskId:'negotiation-savings',advisory:fixture.cases[0].advisory}});assert.equal(deniedRun.statusCode,202);await host.waitForRun(deniedRun.json().runId);const blocked=live((await host.app.inject({url:'/api/blind/runs/'+deniedRun.json().runId+'/export',headers})).json());assert.equal(blocked.run.state,'blocked');assert.deepEqual({...host.store.db.prepare('SELECT * FROM ledger').get()},baseline);host.store.activatePolicy(policyDenied.version,policyRestored);
  const observations=[];
  for(const c of fixture.cases){const started=await host.app.inject({url:'/api/blind/runs',method:'POST',headers,payload:{taskId:c.taskId,advisory:c.advisory}});assert.equal(started.statusCode,202);await host.waitForRun(started.json().runId);const response=await host.app.inject({url:'/api/blind/runs/'+started.json().runId+'/export',headers});assert.equal(response.statusCode,200,response.body);observations.push({caseId:c.id,subjectHash:sha(c.advisory),repetition:1,signatureMatches:feed.signatures.filter((s:any)=>c.advisory.toLowerCase().includes(s.pattern.toLowerCase())).map((s:any)=>objectHash(s.pattern)),evidence:live(response.json())});}
  const newAttempts=(host.store.db.prepare('SELECT * FROM attempts ORDER BY id').all() as any[]).filter(a=>a.id!==retainedId),objectives=[];
  for(const objective of fixture.objectives){const before=structuredClone(observations.find(o=>o.caseId===objective.caseId)!.evidence),after=structuredClone(before),saved=structuredClone(before),data=initialPrivate(),changed=initialPrivate();changed.records=changed.records.map(r=>({...r,quoteCents:r.quoteCents+777777}));changed.rules.maxIncreaseBp=400;
   const expectedBefore=valueClaims(independentValues(before.recipe,data)),expectedAfter=valueClaims(independentValues(before.recipe,changed)),actionRunId=randomUUID(),artifactId=randomUUID(),effectId=randomUUID(),resultRevision=randomUUID(),contentHash=sha('fabricated-private-brief');
   const toolAttempts=Array.from({length:4},()=>({id:randomUUID(),run_id:actionRunId,kind:'tool',credits:1,dispatched:1,outcome:'known',usage:null}));newAttempts.push(...toolAttempts);
   saved.save={actionRunId,parentRunId:before.run.runId,resultRevision,state:'confirmed',acknowledged:true,artifactId,attempts:toolAttempts.map(({run_id,...a})=>({...a,dispatched:true}))};
   saved.independentEffects={status:'observed',count:1,hostAcknowledged:true,matchesCanonicalBrief:true,effects:[{artifactId,effectId,actionRunId,parentRunId:before.run.runId,resultRevision,sink:'internal',contentHash}]};saved.saveMeasurements=structuredClone(saved.measurements);saved.saveMeasurements.spans.push({...saved.measurements.spans[0],kind:'mcp',boundary:'mcp_call_entry_to_resolution_or_rejection'});
   const subject=fixture.cases.find((c:any)=>c.id===objective.caseId),planner=sha(buildPlanner({stage:'planner',taskId:objective.taskId,capabilities:publicCapabilities,advisory:subject.advisory})),checker=sha(buildRecipeInspection({stage:'recipe-checker',taskId:objective.taskId,capabilities:publicCapabilities,recipe:before.recipe}));
   const observedLedger={id:before.ledger.epochId,calls:before.ledger.callsUsed,credits:before.ledger.creditsReserved};objectives.push({...objective,rebind:{before,after,ledgerBefore:observedLedger,ledgerAfter:observedLedger,localInputsBefore:localInputs(data),localInputsAfter:localInputs(changed),expectedBefore,actualBefore:expectedBefore,expectedAfter,actualAfter:expectedAfter,workspaceBeforeHash:objectHash(data),workspaceAfterHash:objectHash(changed),plannerBefore:planner,plannerAfter:planner,checkerBefore:checker,checkerAfter:checker,capturesBefore:objectHash(before.captures),capturesAfter:objectHash(after.captures),staleSave:{code:'STALE_RESULT',effectsBefore:0,effectsAfter:0},external:{code:'EXTERNAL_SINK_DENIED',effectsBefore:0,effectsAfter:0},saved,observer:{status:'observed',count:1,contentHash,canonicalHash:contentHash,exactBytes:true,artifactId,effectId,actionRunId,parentRunId:before.run.runId,resultRevision}}});
  }
  const ledgerAfter={...baseline,calls:baseline.calls+newAttempts.length,credits:baseline.credits+newAttempts.reduce((n,a)=>n+a.credits,0)};
  return {schemaVersion:'proofgate-blind-proof-1',generatedAt:new Date().toISOString(),mode:'actual_hosted',status:'complete',error:null,approval,hashes,observations,objectives,controls:{policyBefore:policy,policyDenied,policyRestored,ledgerBefore:baseline,ledgerDenied:baseline,ledgerRestored:baseline,effectsBefore:0,effectsAfter:0,denial:'ALLOWANCE_EXHAUSTED',blocked},ledgerAfter,newAttempts,retainedAttemptsHashAfter:retainedAttemptsHash,unknownsAfter:0};
 }finally{await host.close();}
}
test('fabricated completeness fixture passes strict validation; faults never establish actual hosted acceptance',async(t)=>{
 const fixture=await fabricatedProof();assert.equal(validateProof(fixture).ok,true);
 const faults:[string,(p:any)=>void][]=[
  ['simulated mode',p=>p.mode='offline'],['partial',p=>p.status='partial'],['missing observer',p=>p.objectives[0].rebind.observer=null],['missing objective',p=>p.objectives.pop()],['missing timing',p=>p.observations[0].evidence.measurements.status='unavailable'],['missing capture',p=>p.observations[0].evidence.captures.pop()],
  ['composition before policy restoration',p=>{const e=p.observations[0].evidence;e.policy.version=p.approval.policy.version;e.policy.hash=objectHash(p.approval.policy);e.admissionBasis.policyVersion=p.approval.policy.version;e.admissionBasis.policyHash=e.policy.hash;}],
  ['epoch reset',p=>p.ledgerAfter.id=randomUUID()],['charge reset',p=>p.ledgerAfter.credits=0],['changed fixture',p=>p.hashes.fixture=sha('changed')],['retained unknown changed',p=>p.unknownsAfter++],['replayed attempt',p=>p.newAttempts.push(p.newAttempts[0])],['unknown paid work',p=>p.newAttempts[0].outcome='unknown'],['offline capture',p=>p.observations[0].evidence.captures[0].sourceIdentity='offline_injected_dispatch'],
  ['over credit ceiling',p=>{const extra=11534337-p.ledgerAfter.credits;p.newAttempts[0].credits+=extra;p.ledgerAfter.credits+=extra;}],['private payload',p=>p.observations[0].evidence.captures[0].serializedBody+='PRIVATE_SENTINEL'],['stale basis',p=>p.observations[0].evidence.admissionBasis.policyHash=sha('stale')],['semantic disabled',p=>p.observations[0].evidence.policy.semantic=false],['paraphrase wrong classification',p=>p.observations[3].evidence.admission.advisoryClassification='benign'],
  ['local attempts changed',p=>p.objectives[0].rebind.ledgerAfter={...p.objectives[0].rebind.ledgerAfter,calls:p.objectives[0].rebind.ledgerAfter.calls+1}],['local oracle fabricated',p=>{p.objectives[0].rebind.expectedAfter[0].savingCents++;p.objectives[0].rebind.actualAfter[0].savingCents++;}],['private mutation absent',p=>p.objectives[0].rebind.localInputsAfter=p.objectives[0].rebind.localInputsBefore],['public constructor changed',p=>{p.objectives[0].rebind.plannerBefore=sha('fake');p.objectives[0].rebind.plannerAfter=sha('fake');}],['save mismatch',p=>p.objectives[0].rebind.observer.contentHash=sha('wrong')],['external effect',p=>p.objectives[0].rebind.external.effectsAfter++],['stale effect',p=>p.objectives[0].rebind.staleSave.effectsAfter++],['mutation effect',p=>p.controls.effectsAfter++],['restoration resets charge',p=>p.controls.ledgerRestored.calls=0],['restoration changes limit',p=>p.controls.policyRestored.limits.calls++],['unmodeled field',p=>p.secret='must reject']
 ];
 for(const [name,mutate] of faults)await t.test('rejects '+name,()=>{const changed=structuredClone(fixture);mutate(changed);assert.throws(()=>validateProof(changed),name);});
});
test('root marker prerequisites fail closed without network, ADC or store reads',()=>{
 assert.throws(()=>assertRoot({}),/ROOT_MARKER_REQUIRED/);assert.throws(()=>assertRoot({PROOFGATE_LIVE:'1'}),/ROOT_MARKER_REQUIRED/);assert.doesNotThrow(()=>assertRoot({PROOFGATE_LIVE:'1',PROOFGATE_BLIND_ROOT:'1'}));
});
