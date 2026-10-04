import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {homedir} from 'node:os';
import {createConnection} from 'node:net';
import {createHost} from '../../src/host.js';
import {createModelAdapter,ControlError} from '../../src/model.js';
import {buildPlanner,buildRecipeInspection,publicCapabilities} from '../../src/blind.js';
import {openBlindEffectStore} from '../../fixture/blind-store.js';
const proof=await import(pathToFileURL(resolve('scripts/check-blind-proof.mjs')).href);
const {sha,objectHash,readFrozen,frozenHashes,ApprovalSchema,readOnlySnapshot,assertRoot,PROOF_PATHS,independentValues,valueClaims,localInputs,validateProof}=proof;

async function requireStoppedListener(){await new Promise<void>((ok,fail)=>{const socket=createConnection({host:'127.0.0.1',port:3100});socket.setTimeout(1000);socket.once('connect',()=>{socket.destroy();fail(new Error('STOP_OWNED_LISTENER_3100_FIRST'));});socket.once('error',(error:any)=>{socket.destroy();if(error.code==='ECONNREFUSED')ok();else fail(new Error('LISTENER_STATE_UNVERIFIED'));});socket.once('timeout',()=>{socket.destroy();fail(new Error('LISTENER_STATE_UNVERIFIED'));});});}
test('root-only actual governed Blind proof; prerequisites fail rather than skip',async()=>{
 assertRoot();
 await requireStoppedListener();
 assert.ok(existsSync(PROOF_PATHS.approval),'ROOT_APPROVAL_REQUIRED');
 const approval=ApprovalSchema.parse(JSON.parse(readFileSync(PROOF_PATHS.approval,'utf8'))),current=readOnlySnapshot();
 assert.deepEqual({...current,createdAt:approval.createdAt},approval,'APPROVAL_STALE');
 assert.ok(!existsSync(PROOF_PATHS.result),'EXISTING_PROOF_NOT_REPLAYED: root must retain it and explicitly authorize a distinct recovery');
 const adcPath=process.env.GOOGLE_APPLICATION_CREDENTIALS??resolve(homedir(),'.config/gcloud/application_default_credentials.json');
 assert.ok(existsSync(adcPath),'ADC_REQUIRED');
 const adc=JSON.parse(readFileSync(adcPath,'utf8'));
 assert.ok(adc.type==='authorized_user'&&['client_id','client_secret','refresh_token'].every(k=>typeof adc[k]==='string'&&adc[k].length>0),'ADC_UNSUPPORTED');
 const token=readFileSync(PROOF_PATHS.token,'utf8').trim();assert.ok(token.length>=16,'TOKEN_REQUIRED');
 const fixture=readFrozen(),headers={authorization:'Bearer '+token};
 let host:ReturnType<typeof createHost>,stopped=false,budgetDenialObserved=false;
 const result:any={schemaVersion:'proofgate-blind-proof-1',generatedAt:new Date().toISOString(),mode:'actual_hosted',status:'partial',error:null,approval,hashes:frozenHashes(),observations:[],objectives:[],controls:null,ledgerAfter:approval.ledger,newAttempts:[],retainedAttemptsHashAfter:approval.retainedAttemptsHash,unknownsAfter:approval.unknowns};
 const ledger=()=>({...host.store.db.prepare('SELECT * FROM ledger').get()}) as {id:string;calls:number;credits:number};
 const attempts=()=>host.store.db.prepare('SELECT * FROM attempts ORDER BY id').all() as any[];
 const preserve=()=>{const rows=attempts();result.ledgerAfter=ledger();result.newAttempts=rows.filter(a=>!approval.retainedAttemptIds.includes(a.id));result.retainedAttemptsHashAfter=objectHash(rows.filter(a=>approval.retainedAttemptIds.includes(a.id)));result.unknownsAfter=rows.filter(a=>a.dispatched&&a.outcome==='unknown').length;result.generatedAt=new Date().toISOString();mkdirSync(resolve(PROOF_PATHS.result,'..'),{recursive:true});writeFileSync(PROOF_PATHS.result,JSON.stringify(result,null,2)+'\n',{mode:0o600});};
 const guard=(prospective=0,credit=0)=>{if(stopped)throw new ControlError('PROOF_STOPPED');const l=ledger();if(l.id!==approval.ledger.id||l.calls-approval.ledger.calls+prospective>32||l.credits-approval.ledger.credits+credit>11534336)throw new ControlError('PROOF_CEILING');if(objectHash(attempts().filter(a=>approval.retainedAttemptIds.includes(a.id)))!==approval.retainedAttemptsHash)throw new ControlError('RETAINED_WORK_CHANGED');};
 host=createHost({token,hostDbPath:PROOF_PATHS.host,fixtureDbPath:PROOF_PATHS.fixture,modelAdapter:ports=>{
  // Install guards on the host's actual ports: model OAuth and MCP use the same
  // registered run identity, current clearance, reservation and dispatch path.
  const reserve=ports.reserveAttempt,dispatch=ports.markDispatched,settle=ports.settleAttempt;
  ports.reserveAttempt=input=>{const p=ports.currentClearance(input.runId,input.kind);guard(1,input.requestBytes+p.limits.responseBytes+16*input.outputTokens);try{return reserve(input);}catch(error){if(error instanceof ControlError&&error.code==='ALLOWANCE_EXHAUSTED')budgetDenialObserved=true;throw error;}};
  ports.markDispatched=id=>{guard();dispatch(id);};
  ports.settleAttempt=(id,outcome)=>{settle(id,outcome);if(outcome.outcome==='unknown')stopped=true;};
  return createModelAdapter(ports);
 }});
 const request=async(url:string,method:'GET'|'POST'|'PUT'='GET',payload?:any)=>host.app.inject({url,method,headers,...(payload===undefined?{}:{payload})});
 const get=async(url:string)=>{const response=await request(url);assert.equal(response.statusCode,200,response.body);return response.json();};
 const effectCount=()=>{const reader=openBlindEffectStore(PROOF_PATHS.fixture);try{return Number((reader.db.prepare('SELECT count(*) n FROM blind_effects').get() as any).n);}finally{reader.close();}};
 try{
  assert.deepEqual(ledger(),approval.ledger);guard();
  // Establish denial/restoration before any hosted composition. Every retained
  // recipe is then admitted against the final current policy, ready for rebind.
  const policyBefore=host.store.getPolicy(),ledgerBefore=ledger(),effectsBefore=effectCount(),policyDenied={...policyBefore,version:policyBefore.version+1,limits:{...policyBefore.limits,calls:ledgerBefore.calls,credits:ledgerBefore.credits}};
  const denied=await request('/api/policy','PUT',{expectedVersion:policyBefore.version,policy:policyDenied});assert.equal(denied.statusCode,200,denied.body);
  result.controls={policyBefore,policyDenied,policyRestored:null,ledgerBefore,ledgerDenied:null,ledgerRestored:null,effectsBefore,effectsAfter:null,denial:'ALLOWANCE_EXHAUSTED',blocked:null};preserve();
  try{const start=await request('/api/blind/runs','POST',{taskId:'negotiation-savings',advisory:fixture.cases[0].advisory});assert.equal(start.statusCode,202,start.body);await host.waitForRun(start.json().runId);result.controls.blocked=await get('/api/blind/runs/'+start.json().runId+'/export');assert.equal(result.controls.blocked.run.state,'blocked');assert.ok(budgetDenialObserved,'REAL_HOST_ALLOWANCE_DENIAL_REQUIRED');assert.ok(result.controls.blocked.events.some((e:any)=>e.reasonCode==='CHECKER_FAILED_CLOSED'));result.controls.ledgerDenied=ledger();assert.deepEqual(ledger(),ledgerBefore);assert.equal(effectCount(),effectsBefore);}finally{const policyRestored={...policyBefore,version:policyBefore.version+2};const restored=await request('/api/policy','PUT',{expectedVersion:policyBefore.version+1,policy:policyRestored});assert.equal(restored.statusCode,200,restored.body);result.controls.policyRestored=policyRestored;result.controls.ledgerRestored=ledger();result.controls.effectsAfter=effectCount();preserve();}
  for(const c of fixture.cases){
   assert.equal(stopped,false);const matches=approval.feed.signatures.filter((s:any)=>c.advisory.toLowerCase().includes(s.pattern.toLowerCase())).map((s:any)=>objectHash(s.pattern));if(c.signatureFree)assert.equal(matches.length,0,'PARAPHRASE_MATCHES_SIGNATURE');
   const start=await request('/api/blind/runs','POST',{taskId:c.taskId,advisory:c.advisory});assert.equal(start.statusCode,202,start.body);const id=start.json().runId;await host.waitForRun(id);
   const view=await get('/api/blind/runs/'+id),evidence=await get('/api/blind/runs/'+id+'/export');result.observations.push({caseId:c.id,subjectHash:sha(c.advisory),repetition:1,signatureMatches:matches,evidence});preserve();
   assert.equal(stopped,false,'PAID_FAILURE_STOP');assert.equal(view.state,'succeeded',view.error?.code);assert.equal(evidence.policy.hash,objectHash(result.controls.policyRestored));assert.equal(evidence.admissionBasis?.policyVersion,result.controls.policyRestored.version);assert.equal(evidence.admission.advisoryClassification,c.classification);assert.equal(evidence.admission.advisory,c.admitted?'admitted':'quarantined');
   const planner=JSON.parse(JSON.parse(evidence.captures.find((c:any)=>c.profileId==='blind-planner').serializedBody).contents[0].parts[0].text);assert.equal(planner.advisory,c.admitted?c.advisory:null);
   process.stdout.write(`Blind observation ${c.id}: retained ${ledger().calls-approval.ledger.calls} charged attempts\n`);
  }
  for(const objective of fixture.objectives){
   const observation=result.observations.find((o:any)=>o.caseId===objective.caseId),id=observation.evidence.run.runId;
   // A prior objective changed the private workspace: local rebind updates the
   // original admitted recipe without any model work before the next comparison.
   let view=await get('/api/blind/runs/'+id);if(!view.resultCurrent){const rebound=await request('/api/blind/runs/'+id+'/rebind','POST',{});assert.equal(rebound.statusCode,200,rebound.body);view=rebound.json();}
   const before=await get('/api/blind/runs/'+id+'/export'),w=await get('/api/blind/workspace'),recipe=view.recipe,expectedBefore=valueClaims(independentValues(recipe,w)),actualBefore=valueClaims(view.result.rows);assert.deepEqual(actualBefore,expectedBefore);
   const capturesBefore=objectHash(before.captures),plannerBefore=sha(buildPlanner({stage:'planner',taskId:objective.taskId,capabilities:publicCapabilities,advisory:fixture.cases.find((c:any)=>c.id===objective.caseId).advisory})),checkerBefore=sha(buildRecipeInspection({stage:'recipe-checker',taskId:objective.taskId,capabilities:publicCapabilities,recipe}));
   const ledgerBefore=ledger(),workspaceBeforeHash=objectHash({records:w.records,rules:w.rules}),originalRevision=view.resultRevision;
   const update=await request('/api/blind/private','PUT',{expectedVersion:w.version,records:w.records.map((r:any)=>({...r,quoteCents:r.quoteCents+777777}))});assert.equal(update.statusCode,200,update.body);
   let updated=await get('/api/blind/workspace');const rules=await request('/api/blind/rules','PUT',{expectedVersion:updated.version,rules:{...updated.rules,maxIncreaseBp:updated.rules.maxIncreaseBp===200?400:200}});assert.equal(rules.statusCode,200,rules.body);updated=await get('/api/blind/workspace');
   const staleEffects=effectCount(),stale=await request('/api/blind/runs/'+id+'/save','POST',{resultRevision:originalRevision});assert.equal(stale.json().code,'STALE_RESULT');assert.equal(effectCount(),staleEffects);
   const rebound=await request('/api/blind/runs/'+id+'/rebind','POST',{});assert.equal(rebound.statusCode,200,rebound.body);view=rebound.json();const after=await get('/api/blind/runs/'+id+'/export'),ledgerAfter=ledger();assert.deepEqual(ledgerAfter,ledgerBefore);assert.deepEqual(after.captures,before.captures);
   const expectedAfter=valueClaims(independentValues(recipe,updated)),actualAfter=valueClaims(view.result.rows);assert.deepEqual(actualAfter,expectedAfter);assert.notDeepEqual(actualAfter,actualBefore);
   const externalEffects=effectCount(),external=await request('/api/blind/runs/'+id+'/export','POST',{resultRevision:view.resultRevision,destination:'external'});assert.equal(external.json().code,'EXTERNAL_SINK_DENIED');assert.equal(effectCount(),externalEffects);
   const rebind:any={before,after,ledgerBefore,ledgerAfter,localInputsBefore:localInputs(w),localInputsAfter:localInputs(updated),expectedBefore,actualBefore,expectedAfter,actualAfter,workspaceBeforeHash,workspaceAfterHash:objectHash({records:updated.records,rules:updated.rules}),plannerBefore,plannerAfter:sha(buildPlanner({stage:'planner',taskId:objective.taskId,capabilities:publicCapabilities,advisory:fixture.cases.find((c:any)=>c.id===objective.caseId).advisory})),checkerBefore,checkerAfter:sha(buildRecipeInspection({stage:'recipe-checker',taskId:objective.taskId,capabilities:publicCapabilities,recipe})),capturesBefore,capturesAfter:objectHash(after.captures),staleSave:{code:'STALE_RESULT',effectsBefore:staleEffects,effectsAfter:effectCount()},external:{code:'EXTERNAL_SINK_DENIED',effectsBefore:externalEffects,effectsAfter:effectCount()},saved:null,observer:null};result.objectives.push({...objective,rebind});preserve();
   const save=await request('/api/blind/runs/'+id+'/save','POST',{resultRevision:view.resultRevision});assert.equal(save.statusCode,200,save.body);rebind.saved=await get('/api/blind/runs/'+id+'/export');preserve();assert.equal(stopped,false,'SAVE_UNKNOWN_NOT_REPLAYED');assert.equal(save.json().save?.state,'confirmed');
   const reader=openBlindEffectStore(PROOF_PATHS.fixture);try{const rows=reader.read(id).filter(r=>r.result_revision===view.resultRevision);assert.equal(rows.length,1);const row=rows[0]!;assert.equal(row.content,JSON.stringify(view.result));rebind.observer={status:'observed',count:1,contentHash:objectHash(JSON.parse(row.content)),canonicalHash:objectHash(view.result),exactBytes:true,artifactId:row.id,effectId:row.effect_id,actionRunId:row.action_run_id,parentRunId:row.parent_run_id,resultRevision:row.result_revision};}finally{reader.close();}preserve();
   process.stdout.write(`Blind objective ${objective.taskId}: local change and independent save retained\n`);
  }
  result.status='complete';preserve();validateProof(result);process.stdout.write('Blind proof complete: '+JSON.stringify({newAttempts:result.newAttempts.length,newCredits:result.ledgerAfter.credits-approval.ledger.credits})+'\n');
 }catch(error){stopped=true;result.status='partial';result.error=error instanceof ControlError?error.code:'PROOF_ASSERTION_FAILED';preserve();throw new Error(result.error+'; retained partial proof and charges, no automatic retry');}finally{await host.close();}
});
