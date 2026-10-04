// Browser state contains only the local gateway token. Provider credentials stay on the host.
let token = '';
let acceptedPolicy = null;
let acceptedFeed = null;
let lastView = null;
const number = value => value == null ? 'Unknown' : Number(value).toLocaleString('en-US');
const sourceName = id => ({notes:'Private project notes',facts:'Independent migration facts',advisory:'Dependency advisory'}[id.split(':').at(-1)] || id);
export function projectRun(view) {
  const independent=view.audit?.independentEffects;
  const verified = view.state === 'succeeded' && view.mode !== 'replay' && Boolean(view.draft) && view.effects.reconciled === true && view.effects.savedCount === 1 && (!independent || independent.status==='observed'&&independent.count===1&&independent.hostAcknowledged===true&&independent.matchesCanonicalDraft===true);
  const state = view.state === 'succeeded' && !verified ? 'incomplete' : view.state;
  const titles = {empty:'Your policy is the boundary',running:'Governing the next action',blocked:'Stopped at the boundary',incomplete:'No verified draft saved',succeeded:'Useful work. Verified save.'};
  return {verified,state,title:titles[state] || 'Unable to verify this run',
    mode:({live:'Live hosted models',offline:'Offline injected model',replay:'Replay / historical observation'}[view.mode] || 'Unknown execution mode') + ' · Synthetic fixtures',
    reason: view.error ? view.error.code + ' · ' + view.error.message : verified ? 'One internal draft independently reconciled with the fixture recorder.' : state === 'running' ? 'Evidence is inspected before the actor; every dispatched action is governed and metered.' : 'A result is shown as saved only after independent reconciliation.',
    effect: verified ? '1 VERIFIED SAVE' : view.mode === 'replay' ? 'REPLAY · NO LIVE SAVE CLAIM' : view.effects.savedCount ? number(view.effects.savedCount)+' OBSERVED · UNVERIFIED' : 'NO VERIFIED SAVE'};
}
export function resourceLabels(resources) {
  const u = resources.usage;
  return {calls:number(resources.callsUsed)+' / '+number(resources.callsLimit)+' calls',
    credits:number(resources.creditsReserved)+' / '+number(resources.creditsLimit)+' admission credits',
    tokens:u ? number(u.prompt)+' prompt · '+number(u.output)+' output tokens' : 'Unknown provider usage',
    cost:resources.estimatedCost == null ? 'Estimated tariff cost: unknown / unpriced' : 'Estimated tariff cost: '+number(resources.estimatedCost)+' (policy tariff; not an invoice)',
    categories:[['Prompt tokens',u?.prompt],['Output tokens',u?.output],['Thought tokens',u?.thought],['Cached tokens',u?.cache]].map(([label,value])=>[label,number(value)])};
}
export async function request(path, {method='GET',body,signal}={}) {
  const response = await fetch(path,{method,signal,cache:'no-store',headers:{Authorization:'Bearer '+token,...(body === undefined ? {} : {'Content-Type':'application/json'})},...(body === undefined ? {} : {body:JSON.stringify(body)})});
  const value = await response.json();
  if (!response.ok) throw new Error(value.code || 'REQUEST_FAILED');
  return value;
}
export const submitPolicy = (expectedVersion,policy,send=request) => send('/api/policy',{method:'PUT',body:{expectedVersion,policy}});
export const submitFeed = (expectedVersion,feed,send=request) => send('/api/feed',{method:'PUT',body:{expectedVersion,feed}});
export async function downloadEvidence(runId,{send=request,doc=document,urlApi=URL,releaseDelay=()=>new Promise(resolve=>setTimeout(resolve,1000))}={}) {
  if(!/^[a-f0-9-]{36}$/.test(runId || ''))throw new Error('INVALID_RUN_ID');
  const evidence=await send('/api/runs/'+encodeURIComponent(runId)+'/export',{method:'GET'});
  if(evidence.schemaVersion!=='proofgate-evidence-1'||evidence.run?.runId!==runId)throw new Error('RUN_ID_MISMATCH');
  const serialized=JSON.stringify(evidence,null,2);
  if(new TextEncoder().encode(serialized).length>262144)throw new Error('CONTROL_RESPONSE_BOUND');
  const url=urlApi.createObjectURL(new Blob([serialized],{type:'application/json'}));
  const link=doc.createElement('a');
  try{link.href=url;link.download='proofgate-'+runId+'.json';doc.body.append(link);link.click();await releaseDelay();}finally{link.remove();urlApi.revokeObjectURL(url);}
  return evidence;
}
const delay = (ms,signal) => new Promise((resolve,reject)=>{
  if(signal.aborted) return reject(new DOMException('Observation stopped','AbortError'));
  const cancel=()=>{clearTimeout(timer);reject(new DOMException('Observation stopped','AbortError'));};
  const timer=setTimeout(()=>{signal.removeEventListener('abort',cancel);resolve();},ms);
  signal.addEventListener('abort',cancel,{once:true});
});
export function createRunController({send=request,onView,onIdentified=()=>{},onError=()=>{},onFinish=()=>{},wait=delay,pollMs=800,now=Date.now,timeoutMs=130000}) {
  let generation=0, abort=null, deadlineTimer=null;
  const stop=()=>{generation++;clearTimeout(deadlineTimer);deadlineTimer=null;abort?.abort();abort=null;};
  return {stop,async start(scenario,advisory){
    stop(); const mine=generation; const control=new AbortController();abort=control;
    const selected=()=>mine===generation;
    const current=()=>selected()&&!control.signal.aborted;
    const end=now()+timeoutMs;
    const timeoutError=new Error('OBSERVATION_DEADLINE · Run may continue on host; no automatic replay.');
    let timedOut=false;
    const expire=()=>{timedOut=true;control.abort(timeoutError);};
    const timer=setTimeout(expire,timeoutMs);deadlineTimer=timer;
    const observe=async work=>{
      control.signal.throwIfAborted();let cancel;
      try{return await Promise.race([work,new Promise((_,reject)=>{cancel=()=>reject(control.signal.reason);control.signal.addEventListener('abort',cancel,{once:true});})]);}
      finally{control.signal.removeEventListener('abort',cancel);}
    };
    try {
      const started=await observe(send('/api/runs',{method:'POST',body:{scenario,...(advisory===undefined||advisory===''?{}:{advisory})},signal:control.signal}));
      if(!current())return;
      if(typeof started.runId!=='string'||!started.runId)throw new Error('INVALID_RUN_ID');
      onIdentified(started.runId);
      while(current()){
        if(now()>=end){expire();throw timeoutError;}
        const view=await observe(send('/api/runs/'+encodeURIComponent(started.runId),{signal:control.signal}));
        if(!current())return;
        if(view.runId!==started.runId)throw new Error('RUN_ID_MISMATCH');
        onView(view);
        if(view.state!=='running')break;
        await observe(wait(pollMs,control.signal));
      }
    } catch(error) { if(selected()&&(timedOut||error.name!=='AbortError'))onError(timedOut?timeoutError:error); }
    finally {clearTimeout(timer);if(deadlineTimer===timer)deadlineTimer=null;if(selected()){abort=null;onFinish();}}
  }};
}
function element(doc,tag,text,className) {const node=doc.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;}
function empty(doc,title,message){const node=element(doc,'div',undefined,'empty');node.append(element(doc,'h3',title),element(doc,'p',message));return node;}
export function renderEmpty(doc=document){
  lastView=null;const get=id=>doc.getElementById(id);
  for(const [id,text] of [['state','Ready for selected scenario'],['mode','No selected run · Synthetic fixtures'],['gate-kicker','AWAITING RUN'],['gate-status','Your policy is the boundary'],['gate-reason','Prepare a draft to observe the next governed run.'],['effect-badge','NO VERIFIED SAVE'],['evidence-count','0 sources'],['decision-count','0'],['policy-identity','No selected run'],['calls','No selected run measurements'],['credits','Shared allowance is retained; no new measurements yet.'],['token-summary','Unknown provider usage'],['cost','Estimated tariff cost: unknown / unpriced']])get(id).textContent=text;
  get('effect-badge').className='pill';get('call-progress').max=1;get('call-progress').value=0;
  get('evidence').replaceChildren(empty(doc,'Start with the facts','Evidence appears after the host inspects this scenario.'));
  get('draft').replaceChildren(empty(doc,'A draft you can act on','A saved result requires independent reconciliation.'));
  for(const id of ['progress','decisions','resources'])get(id).replaceChildren();
  const option=element(doc,'option','All decisions');option.value='all';get('decision-filter').replaceChildren(option);get('decision-filter').value='all';
  get('measurements')?.replaceChildren(empty(doc,'Timing unavailable','No instrumented run selected. Historical missing durations are never estimated.'));
  if(get('independent-effects'))get('independent-effects').textContent='No independent effect observation selected.';
}
export function renderRun(view,doc=document,{retained=false}={}) {
  lastView=view;
  const get=id=>doc.getElementById(id);
  const p=projectRun(view);
  if(retained){p.title='Retained observation · '+p.title;p.mode+=' · Retained GET-only inspection';p.effect=p.verified?'RETAINED · SAVE RECONCILED THEN':'RETAINED · '+p.effect;p.reason='Retained host observation; this inspection creates no new work. '+p.reason;}
  get('state').textContent=p.title;
  get('mode').textContent=p.mode;
  get('gate-kicker').textContent=p.state.toUpperCase();
  get('gate-status').textContent=p.title;
  get('gate-reason').textContent=p.reason;
  get('effect-badge').textContent=p.effect;
  get('effect-badge').className='pill status-'+(p.verified?'verified':p.state);
  get('policy-identity').textContent='Run policy v'+view.policyVersion+' · Feed v'+view.feedVersion;
  get('evidence-count').textContent=view.evidence.length+' sources';
  const cards=view.evidence.map(e=>{
    const card=element(doc,'article',undefined,'source-card '+e.status);
    card.append(element(doc,'span',e.status.toUpperCase(),'pill status-'+e.status),element(doc,'h3',sourceName(e.sourceId)));
    card.append(element(doc,'p',e.status==='quarantined'?'Whole source excluded before actor exposure. Essential facts come independently.':e.status==='blocked'?'Source blocked by current controls.':'Available to the actor after inspection.'));
    const details=element(doc,'details');details.append(element(doc,'summary','Inspect source text'),element(doc,'pre',e.summary),element(doc,'small',e.sourceId));card.append(details);return card;
  });
  get('evidence').replaceChildren(...(cards.length?cards:[empty(doc,'Evidence pending',view.state==='running'?'The host is inspecting the first source.':'No admitted sources in this run.')]));
  const steps=[['Evidence inspected',view.evidence.length?view.evidence.length+' sources':'Waiting'],['Actor + tool decisions',view.decisions.some(d=>d.stage==='proposal')?'Observed':'Waiting'],['Independent save',p.verified?'Reconciled':view.state==='running'?'Waiting':'Not verified']];
  get('progress').replaceChildren(...steps.map(([label,value])=>{const row=element(doc,'div',undefined,'progress-item');row.append(element(doc,'span',label),element(doc,'span',value,value==='Reconciled'?'progress-verified':value==='Waiting'||value==='Not verified'?'progress-pending':'progress-observed'));return row;}));
  const filter=get('decision-filter');const selected=filter.value || 'all';
  const stages=[...new Set(view.decisions.map(d=>d.stage))];
  filter.replaceChildren(...['all',...stages].map(stage=>{const option=element(doc,'option',stage==='all'?'All decisions':stage);option.value=stage;return option;}));
  filter.value=stages.includes(selected)?selected:'all';
  renderDecisions(view,doc);
  if(view.draft && p.verified){
    const draft=view.draft;
    const warning=element(doc,'div',undefined,'warning');warning.append(element(doc,'strong','BREAKING CHANGE'),element(doc,'p',draft.breakingChange));
    const citations=element(doc,'div',undefined,'citations');citations.append(element(doc,'strong','ADMITTED SOURCE CITATIONS'));const list=element(doc,'ul');list.append(...draft.citations.map(id=>element(doc,'li',sourceName(id)+' · '+id)));citations.append(list);
    get('draft').replaceChildren(element(doc,'p','INTERNAL RELEASE DRAFT','draft-label'),element(doc,'div',draft.sourceVersion+' → '+draft.targetVersion,'version-transition'),warning,element(doc,'div',draft.body,'draft-body'),citations);
  } else get('draft').replaceChildren(empty(doc,p.state==='running'?'Preparing a governed draft':p.state==='blocked'?'Boundary enforced':'No verified draft saved',view.error?.message || (view.mode==='replay'?'This is a historical observation; it establishes no new live save.':'The host has not independently reconciled a useful result.')));
  const labels=resourceLabels(view.resources);
  for(const id of ['calls','credits','cost'])get(id).textContent=labels[id];
  get('token-summary').textContent=labels.tokens;
  get('call-progress').max=view.resources.callsLimit;get('call-progress').value=view.resources.callsUsed;
  const rows=[...labels.categories,['Run ID',view.runId],['Allowance epoch',view.resources.epochId],['Observed saves',number(view.effects.savedCount)],['Independent reconciliation',view.effects.reconciled?'Confirmed':'Not confirmed']];
  get('resources').replaceChildren(...rows.flatMap(([label,value])=>[element(doc,'dt',label),element(doc,'dd',value)]));
  renderAudit(view.audit,doc);
}
function renderAudit(audit,doc){
  const get=id=>doc.getElementById(id),e=audit?.independentEffects,m=audit?.measurements;
  if(get('independent-effects'))get('independent-effects').textContent=e?.status==='observed'?`${e.count} independent internal effect(s) · Host acknowledgement: ${e.hostAcknowledged?'yes':'no'} · Exact draft match: ${e.matchesCanonicalDraft===null?'unavailable':e.matchesCanonicalDraft?'yes':'no'}`:'Independent recorder observation unavailable.';
  if(!get('measurements'))return;
  if(!m||m.status!=='measured'){get('measurements').replaceChildren(empty(doc,'Timing unavailable','Historical records have no measured duration. No estimate is inferred.'));return;}
  const rows=m.aggregates.map(s=>element(doc,'p',`${s.kind}: ${s.totalMs.toFixed(2)} ms total · ${s.count} sample(s)`));
  const boundaries=[...new Set(m.spans.map(s=>s.boundary))].join(' · ');if(m.samplesTruncated)rows.push(element(doc,'p','Per-call sample list reached its finite bound; aggregate counts and totals retain all measured calls.'));
  const h=m.hardware;const machine=h?`${h.node} · ${h.platform}/${h.architecture} · OS ${h.osRelease} · ${h.cpuModel} · ${h.cpuCores} cores · ${number(h.totalMemoryBytes)} bytes memory`:'Hardware unavailable';
  get('measurements').replaceChildren(element(doc,'p',`${m.mode==='offline'?'OFFLINE INJECTED':m.mode.toUpperCase()} · ${m.scenario??'historical'} · ${m.workload.events} events / ${m.workload.attempts} attempts / ${m.workload.sources} sources`),...rows,element(doc,'p','Measured boundaries: '+boundaries),element(doc,'p',machine),...m.models.map(s=>element(doc,'p',`${s.role}: requested ${s.requestedModel??'unavailable'} → returned ${s.returnedModel??(s.returnedModelHash?'unknown (SHA-256 '+s.returnedModelHash+')':'unavailable')} · response ${s.responseIdHash?'SHA-256 '+s.responseIdHash:'unavailable'}`)),element(doc,'p','Nested spans overlap. These samples establish neither throughput nor an aggregate overhead estimate.'));
}
export function renderObservationStopped(message,doc=document){
  const get=id=>doc.getElementById(id);
  for(const [id,text] of [['state','Observation stopped · '+message],['mode','Retained observation · Host work may continue'],['gate-kicker','NOT OBSERVING'],['gate-status','Observation stopped'],['gate-reason',message+' Dispatched work stays charged; no automatic retry or replay.'],['effect-badge','NO NEW VERIFIED RESULT']])get(id).textContent=text;
  get('effect-badge').className='pill status-incomplete';
  get('progress').replaceChildren(element(doc,'p','Observation ended. Last observed evidence and accounting are retained.'));
  get('draft').replaceChildren(empty(doc,'Outcome no longer observed','Host work may continue; browser polling is stopped. No cancellation or fresh save is established.'));
  if(get('independent-effects'))get('independent-effects').textContent='Independent effects are retained observations only. Inspect the identified run to refresh.';
}
function renderDecisions(view,doc){const filter=doc.getElementById('decision-filter').value;const rows=view.decisions.filter(d=>filter==='all'||d.stage===filter);doc.getElementById('decision-count').textContent=view.decisions.length;doc.getElementById('decisions').replaceChildren(...rows.map(d=>element(doc,'li',d.stage+' · '+d.reasonCode+' · policy v'+d.policyVersion+(d.sourceId?' · '+sourceName(d.sourceId):''))));}
export function renderPolicy(policy,doc=document){
  const get=id=>doc.getElementById(id);
  for(const [id,value] of [['profile',policy.profile],['strictness',policy.strictness],['threshold',policy.threshold],['privacy',policy.controls.privacy],['actor',policy.models.actor],['checker',policy.models.checker],['calls-limit',policy.limits.calls],['credits-limit',policy.limits.credits]])get(id).value=value;
  for(const [id,value] of [['semantic',policy.controls.semantic],['flow',policy.controls.flow],['signatures',policy.controls.signatures],['provider',policy.sourceRules.providerAllowed],['sink',policy.sinkRules.internalAllowed],['allow-flash',policy.models.allowlist.includes('gemini-3.5-flash')],['allow-lite',policy.models.allowlist.includes('gemini-3.5-flash-lite')]])get(id).checked=value;
  get('policy-json').textContent=JSON.stringify(policy,null,2);
  get('accepted-identity').textContent='Accepted policy v'+policy.version+' · Feed v'+policy.feedVersion;
  get('posture').replaceChildren(element(doc,'span','Structural flow · Always enforced'),...[['AI inspection',policy.controls.semantic],['Privacy '+policy.controls.privacy,true],['Signatures',policy.controls.signatures],['Provider',policy.sourceRules.providerAllowed],['Internal sink',policy.sinkRules.internalAllowed]].map(([label,on])=>element(doc,'span',label+' '+(on?'ON':'OFF'),on?'':'disabled')));
}
function policyCandidate(doc){
  const get=id=>doc.getElementById(id);
  const p=structuredClone(acceptedPolicy);p.version++;
  p.profile=get('profile').value;p.threshold=Number(get('threshold').value);
  p.controls={semantic:get('semantic').checked,privacy:get('privacy').value,flow:acceptedPolicy.controls.flow,signatures:get('signatures').checked};
  p.models={actor:get('actor').value,checker:get('checker').value,allowlist:[...(get('allow-flash').checked?['gemini-3.5-flash']:[]),...(get('allow-lite').checked?['gemini-3.5-flash-lite']:[])]};
  p.limits.calls=Number(get('calls-limit').value);p.limits.credits=Number(get('credits-limit').value);
  p.sourceRules.providerAllowed=get('provider').checked;p.sinkRules.internalAllowed=get('sink').checked;
  return p;
}
export function setup(doc,{send=request,listen=globalThis.addEventListener?.bind(globalThis),urlApi=URL,onOccupancyChange=()=>{}}={}){
  const get=id=>doc.getElementById(id);
  acceptedPolicy=null;acceptedFeed=null;lastView=null;
  let observing=false,mutating=false,inspecting=false,exporting=false,selectedRunId=null,inspectionGeneration=0;
  const bytes=()=>new TextEncoder().encode(get('advisory').value).length;
  const syncControls=()=>{get('start').disabled=observing||mutating||inspecting||!acceptedPolicy||bytes()>4096;get('policy-fields').disabled=mutating||!acceptedPolicy;get('save-feed').disabled=mutating||!acceptedFeed;get('feed').disabled=mutating||!acceptedFeed;get('reload').disabled=mutating||!acceptedPolicy;get('connect').disabled=observing||mutating||inspecting;get('inspect').disabled=observing||inspecting||!acceptedPolicy;get('export').disabled=exporting||!selectedRunId||!acceptedPolicy;onOccupancyChange();};
  const identify=id=>{selectedRunId=id;get('inspect-id').value=id;syncControls();};
  const errorMessage=error=>{
    if(error.message==='RUN_CAPACITY'&&!selectedRunId){renderEmpty(doc);get('state').textContent='Run capacity reached';get('gate-kicker').textContent='NOT ADMITTED';get('gate-status').textContent='Wait for an active run to finish';get('gate-reason').textContent='No run or work was admitted for this request. Wait for capacity or inspect a known run.';get('effect-badge').textContent='NO WORK ADMITTED';get('progress').replaceChildren(element(doc,'p','Zero work admitted for this refused request.'));get('draft').replaceChildren(empty(doc,'Capacity unavailable','Wait or inspect existing work.'));}
    else renderObservationStopped(error.message,doc);
  };
  const controller=createRunController({send,onIdentified:identify,onView:v=>renderRun(v,doc),onError:errorMessage,onFinish:()=>{observing=false;syncControls();get('stop').hidden=true;}});
  async function loadAccepted(){
    const [policy,feed]=await Promise.all([send('/api/policy'),send('/api/feed')]);
    acceptedPolicy=policy;acceptedFeed=feed;renderPolicy(policy,doc);get('feed').value=JSON.stringify(feed,null,2);get('feed').disabled=false;
    get('policy-feedback').textContent='Accepted policy v'+policy.version+' · Feed v'+feed.version+' loaded.';syncControls();
  }
  get('connect').onclick=async()=>{
    if(observing||mutating||inspecting)return;controller.stop();identify(null);renderEmpty(doc);token=get('token').value;get('token').value='';acceptedPolicy=null;acceptedFeed=null;mutating=true;syncControls();
    try{await loadAccepted();get('connection-status').textContent='Connected · local authenticated gateway';}
    catch(error){token='';get('connection-status').textContent='Connection rejected · '+error.message;}
    finally{mutating=false;syncControls();}
  };
  const advisoryFeedback=()=>{const size=bytes();get('advisory-feedback').textContent=size+' / 4096 UTF-8 bytes'+(size>4096?' · Too large: shorten the advisory before starting.':'');get('advisory').setAttribute('aria-invalid',size>4096?'true':'false');syncControls();return size<=4096;};
  get('advisory').oninput=advisoryFeedback;
  get('start').onclick=()=>{if(observing||mutating||inspecting||!acceptedPolicy||!advisoryFeedback())return;inspectionGeneration++;identify(null);renderEmpty(doc);observing=true;syncControls();get('stop').hidden=false;get('state').textContent='Starting governed run…';get('gate-status').textContent='Starting governed run';get('gate-kicker').textContent='RUNNING';get('effect-badge').textContent='NO VERIFIED SAVE';get('draft').replaceChildren(empty(doc,'Starting the release assistant','Waiting for the host-owned run.'));return controller.start(get('scenario').value,get('advisory').value);};
  const stop=()=>{controller.stop();inspectionGeneration++;inspecting=false;observing=false;syncControls();get('stop').hidden=true;renderObservationStopped('Host work may continue and stays charged.',doc);};
  get('stop').onclick=stop;
  get('scenario').onchange=()=>{stop();identify(null);renderEmpty(doc);};
  get('decision-filter').onchange=()=>{if(lastView)renderDecisions(lastView,doc);};
  get('controls-open').onclick=()=>{const section=get('configuration');section.focus({preventScroll:true});section.scrollIntoView({behavior:globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches?'auto':'smooth',block:'start'});};
  get('reload').onclick=async()=>{if(mutating||!acceptedPolicy)return;mutating=true;syncControls();try{await loadAccepted();}catch(error){get('policy-feedback').textContent='Reload failed · '+error.message;}finally{mutating=false;syncControls();}};
  get('profile').onchange=()=>{const restricted=get('profile').value==='restricted';get('strictness').value=restricted?'strict':'standard';get('threshold').value=restricted?'.95':'.8';get('calls-limit').value=restricted?'32':'64';get('credits-limit').value=restricted?'16777216':'67108864';};
  get('policy-form').onsubmit=async event=>{
    event.preventDefault();if(mutating||!acceptedPolicy)return;const expected=acceptedPolicy.version;
    const candidate=policyCandidate(doc);
    // Profile changes use the existing documented bounds; choosing a lower cap never resets usage.
    if(candidate.profile!==acceptedPolicy.profile){const r=candidate.profile==='restricted';candidate.limits.actorTurns=r?6:8;candidate.limits.runMs=r?90000:120000;candidate.limits.actorTokens=r?1536:2048;}
    mutating=true;syncControls();
    try{acceptedPolicy=await submitPolicy(expected,candidate,send);renderPolicy(acceptedPolicy,doc);get('policy-feedback').textContent='Policy v'+acceptedPolicy.version+' activated. Existing shared charges are retained.';}
    catch(error){get('policy-feedback').textContent='Activation rejected · '+error.message+' · Accepted policy v'+acceptedPolicy.version+' retained. Reload to resolve stale edits.';renderPolicy(acceptedPolicy,doc);}
    finally{mutating=false;syncControls();}
  };
  get('save-feed').onclick=async()=>{
    if(mutating||!acceptedFeed)return;mutating=true;syncControls();
    try{const feed=JSON.parse(get('feed').value);feed.version=acceptedFeed.version+1;await submitFeed(acceptedFeed.version,feed,send);await loadAccepted();get('policy-feedback').textContent='Feed v'+acceptedFeed.version+' activated with policy v'+acceptedPolicy.version+'.';}
    catch(error){get('policy-feedback').textContent='Feed activation rejected · '+error.message+' · Accepted feed v'+acceptedFeed.version+' retained.';}
    finally{mutating=false;syncControls();}
  };
  get('inspect').onclick=async()=>{if(observing||inspecting||!acceptedPolicy)return;const id=get('inspect-id').value.trim();if(!/^[a-f0-9-]{36}$/.test(id)){get('export-feedback').textContent='Enter a known run UUID.';return;}const generation=++inspectionGeneration;inspecting=true;syncControls();try{const v=await send('/api/runs/'+encodeURIComponent(id),{method:'GET'});if(generation!==inspectionGeneration)return;if(v.runId!==id)throw new Error('RUN_ID_MISMATCH');identify(id);renderRun(v,doc,{retained:true});get('export-feedback').textContent='Retained GET-only inspection · '+id;}catch(error){if(generation===inspectionGeneration)get('export-feedback').textContent='Inspection failed · '+error.message;}finally{if(generation===inspectionGeneration){inspecting=false;syncControls();}}};
  get('export').onclick=async()=>{if(exporting||!selectedRunId||!acceptedPolicy)return;const id=selectedRunId;exporting=true;syncControls();try{await downloadEvidence(id,{send,doc,urlApi});get('export-feedback').textContent='Canonical evidence downloaded · '+id+' · GET only; no new work.';}catch(error){get('export-feedback').textContent='Export failed · '+error.message;}finally{exporting=false;syncControls();}};
  listen?.('pagehide',()=>{controller.stop();token='';});
  advisoryFeedback();syncControls();
  return {isOccupied:()=>observing||mutating||inspecting||exporting};
}
// Counts come from the owned attempt rows, never from clicks or constructor samples.
export function blindAttempts(view){
  const rows=[...(view.attempts||[]),...(view.saveAction?.attempts||[])];
  return Object.fromEntries(['auth','actor','checker','tool'].map(kind=>[kind,rows.filter(a=>a.kind===kind&&Boolean(a.dispatched)&&a.outcome!=='unsent').length]));
}
export async function blindContentHash(brief){const bytes=new TextEncoder().encode(JSON.stringify(brief));const digest=await globalThis.crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');}
export function renderBlindEvidence(e,doc){
  doc.getElementById('blind-evidence').textContent=JSON.stringify(e,null,2);
  doc.getElementById('blind-export-feedback').textContent=e.schemaVersion+' · '+e.run.mode+' · '+e.captures.length+' exact application captures · independent '+e.independentEffects.status+' / '+(e.independentEffects.count??'unavailable')+' · timings '+e.measurements.status+' ('+e.measurements.spans.length+' retained samples; '+e.measurements.workload.repetitions+' observed actions) · GET only; no new work.';
}
export async function downloadBlindEvidence(runId,{send=request,doc=document,urlApi=URL,isCurrent=()=>true,releaseDelay=()=>new Promise(resolve=>setTimeout(resolve,1000))}={}){
  if(!/^[a-f0-9-]{36}$/.test(runId||''))throw new Error('INVALID_RUN_ID');
  const e=await send('/api/blind/runs/'+encodeURIComponent(runId)+'/export',{method:'GET'});
  if(!isCurrent())throw new Error('STALE_SELECTION');
  if(e.schemaVersion!=='proofgate-blind-evidence-1'||e.run?.runId!==runId)throw new Error('RUN_ID_MISMATCH');
  const text=JSON.stringify(e,null,2);if(new TextEncoder().encode(text).length>262144)throw new Error('CONTROL_RESPONSE_BOUND');
  renderBlindEvidence(e,doc);const url=urlApi.createObjectURL(new Blob([text],{type:'application/json'})),link=doc.createElement('a');
  try{link.href=url;link.download='proofgate-blind-'+runId+'.json';doc.body.append(link);link.click();await releaseDelay();}finally{link.remove();urlApi.revokeObjectURL(url);}return e;
}
export function blindComparison(before,after){
  if(!before||before.runId!==after.runId||before.resources?.epochId!==after.resources?.epochId)return null;
  const a=blindAttempts(before),b=blindAttempts(after);
  const sameAttempts=JSON.stringify(before.attempts)===JSON.stringify(after.attempts);
  return {providerDelta:b.auth+b.actor+b.checker-a.auth-a.actor-a.checker,counts:b,
    verified:sameAttempts&&b.auth+b.actor+b.checker===a.auth+a.actor+a.checker,
    capturesEqual:JSON.stringify(before.captures)===JSON.stringify(after.captures),
    constructorsEqual:JSON.stringify(before.publicInputs)===JSON.stringify(after.publicInputs)};
}
export function renderBlind(view,doc,{before=null,comparison=null}={}){
  const get=id=>doc.getElementById(id),text=(id,value)=>{get(id).textContent=value;};
  text('blind-state',view.state+' · '+(view.resultCurrent?'current local result':'stale / no current result')+(view.error?' · '+view.error.code:''));
  text('blind-mode','Method source: '+({live:'Actual hosted model',offline:'Offline injected model',replay:'Recorded historical evidence'}[view.mode]||'Unknown mode')+' · Synthetic private worksheet');
  text('blind-recipe',view.recipe?JSON.stringify(view.recipe,null,2):'Waiting for an admitted operation plan.');
  const methodStep=step=>({
    select_due:'Renewals due within '+step.windowDays+' days',
    calculate_targets:'private negotiation ceilings',
    evaluate_service:'private service-risk rules',
    rank:({'savings':'largest potential savings first','service-risk':'service risk first','soonest':'earliest renewals first'}[step.by]),
    take:'at most '+step.count+' suppliers',
    render:'local negotiation brief'
  }[step.op]);
  text('blind-method-summary',view.recipe?view.recipe.steps.map(methodStep).filter(Boolean).join(' → ')+'. Saving is a separate employee action.':'Waiting for an admitted method.');
  const money=cents=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(cents/100);
  const brief=(result)=>result?[
    element(doc,'p',result.rows.length?'Selected suppliers · '+result.rows.map(row=>row.name).join(' / '):'No suppliers selected by this method and these private rules.','blind-selection'),
    ...result.rows.map(row=>{const n=element(doc,'article','', 'blind-row');n.append(element(doc,'h3',row.name),element(doc,'p',row.recommendation,'blind-recommendation'),element(doc,'p','Negotiation ceiling '+money(row.targetCents)+' · potential annual saving '+money(row.savingCents),'blind-opportunity'));return n;}),
    element(doc,'p',result.summary,'blind-result-summary')
  ]:[element(doc,'p','No current useful brief. Apply changes and rebind before saving.')];
  get('blind-result').replaceChildren(...brief(view.result));get('blind-before').replaceChildren(...(before?.result?brief(before.result):[element(doc,'p','A prior result appears after a local rebind.')]));
  const counts=blindAttempts(view);text('blind-counts','Observed dispatched attempts · auth '+counts.auth+' · planner '+counts.actor+' · checker '+counts.checker+' · tool '+counts.tool);
  text('blind-delta',comparison?comparison.verified?comparison.providerDelta+' new provider attempts · exact retained application bodies '+(comparison.capturesEqual?'unchanged':'changed')+' · same-objective constructors '+(comparison.constructorsEqual?'unchanged':'changed'):'Attempt equality not established; no zero-work claim.':'Compose, apply a private change, then rebind to measure the difference.');
  const captures=view.captures||[];text('blind-payloads',captures.length?captures.map(c=>c.profileId+' · '+c.mode+' · actual application dispatch · '+c.attemptId+' · '+c.outcome+'\n'+c.serializedBody).join('\n\n'):'No actual application-body captures available. Constructor specimens are not dispatch evidence.');
  text('blind-constructors',JSON.stringify(view.publicInputs||[],null,2));
  const e=view.independentEffects,confirmed=view.resultCurrent&&view.save?.state==='confirmed'&&view.save?.acknowledged===true&&e?.status==='observed'&&e.count===1&&e.matchesCanonicalBrief===true;
  get('blind-save-status').setAttribute('data-save-state',confirmed?'confirmed':!view.resultCurrent?'stale':view.save?.state||'unsaved');
  text('blind-save-status',confirmed?'1 independently confirmed internal save':(view.save?.state||'Not saved')+' · host acknowledgement '+(view.save?.acknowledged?'received':'absent')+' · independent '+(e?.status==='observed'?e.count+' observed, exact match '+e.matchesCanonicalBrief:'unavailable'));
  text('blind-identity',view.runId+' · result version '+(view.resultVersion??'unavailable')+' · workspace v'+(view.workspaceVersion??'unavailable'));
  text('blind-ledger',resourceLabels(view.resources).calls+' · '+resourceLabels(view.resources).credits+' · '+resourceLabels(view.resources).tokens+' · '+resourceLabels(view.resources).cost);
  const filter=get('blind-decision-filter').value||'all';get('blind-decisions').replaceChildren(...(view.decisions||[]).filter(d=>filter==='all'||d.stage===filter).map(d=>element(doc,'li',d.stage+' · '+d.reasonCode+' · policy v'+d.policyVersion)));
}
export function setupBlind(doc,{send=request,wait=()=>new Promise(r=>setTimeout(r,300)),urlApi=URL,listen=globalThis.addEventListener?.bind(globalThis),onOccupancyChange=()=>{},isOtherOccupied=()=>false}={}){
  const get=id=>doc.getElementById(id);let workspace=null,current=null,before=null,comparison=null,busy=false,connected=false,generation=0,operation=0,abort=null,dirtyRecords=false,dirtyRules=false,recordsEdit=0,rulesEdit=0,invalidated=false,pendingAction='',observationGeneration=null,selectedObjective=get('blind-objective').value,pendingInvalidation=null;
  const canSave=()=>!current?.save||current.save.state==='blocked'&&!current.save.acknowledged&&!current.save.artifactId&&!current.saveAction?.attempts?.some(a=>a.dispatched&&a.outcome==='unknown')&&!(current.independentEffects?.status==='observed'&&current.independentEffects.count>0);
  const sync=()=>{const occupied=busy||isOtherOccupied();for(const id of ['blind-compose','blind-reset','blind-apply-records','blind-apply-rules','blind-inspect'])get(id).disabled=occupied||!connected;get('blind-compose').disabled ||= new TextEncoder().encode(get('blind-advisory').value).length>4096;
    get('blind-rebind').disabled=occupied||!current?.recipe||current.save?.state==='unknown'||invalidated||dirtyRecords||dirtyRules;
    get('blind-save').disabled=occupied||!current?.resultCurrent||!current?.resultRevision||dirtyRecords||dirtyRules||invalidated||!canSave();
    get('blind-refuse').disabled=occupied||!current?.resultCurrent||invalidated;get('blind-download').disabled=occupied||!current;get('blind-stop').disabled=!busy||observationGeneration!==generation;get('blind-objective').disabled=busy&&observationGeneration!==generation;
    get('blind-busy').textContent=busy?pendingAction+'…':'';
    get('blind-result').setAttribute('aria-busy',busy?'true':'false');
    const dirty=dirtyRecords||dirtyRules,draft=get('blind-draft-status'),resultStatus=get('blind-result-status');
    draft.hidden=!dirty;draft.textContent=dirty?'Unapplied '+(dirtyRecords&&dirtyRules?'record and rule':dirtyRecords?'record':'rule')+' edits · apply each draft, then rebind.':'';
    const stale=!!current&&!current.resultCurrent;
    resultStatus.hidden=!dirty&&!stale;resultStatus.textContent=dirty?'Earlier result only · your unapplied edits are not included. Save and rebind wait for Apply.':stale?'Stale result · rebind the retained method or compose again before saving.':'';
    get('blind-result').setAttribute('data-result-state',dirty||stale?'stale':'current');
    get('blind-readback').hidden=dirty||stale;
    if(dirty||stale){get('blind-save-status').setAttribute('data-save-state','stale');get('blind-save-status').textContent=(current?.save?.state==='unknown'?'Earlier save outcome unknown · no replay. ':'')+(dirty?'Unapplied drafts · these edits have not been saved.':'Stale revision · no current save claim.');}
    else if(!current)get('blind-save-status').setAttribute('data-save-state','unsaved');
    onOccupancyChange();
  };
  const render=()=>{if(current){if(invalidated)current={...current,resultCurrent:false,result:null,resultRevision:null};renderBlind(current,doc,{before,comparison});}sync();};
  function invalidate(){
    invalidated=true;
    // A committed mutation must acknowledge its workspace version before view cancellation.
    if(busy&&observationGeneration!==generation){pendingInvalidation=operation;render();get('blind-state').textContent='Policy/feed changed · finishing the pending action; compose a new method afterward.';return;}
    pendingInvalidation=null;operation++;generation++;abort?.abort();busy=false;render();get('blind-state').textContent='Policy/feed changed · compose a new operation plan.';sync();
  }
  function select(){generation++;abort?.abort();abort=new AbortController();before=null;comparison=null;current=null;get('blind-readback').textContent='';get('blind-refusal').textContent='';get('blind-evidence').textContent='No selected evidence.';get('blind-export-feedback').textContent='Inspection/download uses GET only.';get('blind-result').replaceChildren(element(doc,'p','Waiting for selected run.'));get('blind-before').replaceChildren();get('blind-save-status').textContent='No current save';get('blind-delta').textContent='No measured comparison';get('blind-payloads').textContent='Waiting for actual captures';get('blind-constructors').textContent='No selected specimens';get('blind-recipe').textContent='No selected operation plan';get('blind-method-summary').textContent='No selected method';get('blind-identity').textContent='No selected run';get('blind-counts').textContent='No selected attempt observations';get('blind-mode').textContent='No selected execution mode';get('blind-ledger').textContent='No selected epoch measurements';get('blind-decisions').replaceChildren();sync();return generation;}
  function updateWorkspace(w){workspace=w;if(!dirtyRecords)get('blind-records').value=JSON.stringify(w.records,null,2);if(!dirtyRules)get('blind-rules').value=JSON.stringify(w.rules,null,2);get('blind-workspace-version').textContent='Synthetic private workspace v'+w.version+' · local authenticated employee data';}
  async function observe(id,g){observationGeneration=g;sync();try{while(g===generation){const v=await send('/api/blind/runs/'+encodeURIComponent(id),{method:'GET',signal:abort?.signal});if(g!==generation)return;if(v.runId!==id)throw new Error('RUN_ID_MISMATCH');current=v;get('blind-inspect-id').value=id;render();if(v.state!=='running')return;await wait();}}finally{if(observationGeneration===g){observationGeneration=null;sync();}}}
  async function action(label,work){if(busy||isOtherOccupied()||!connected)return;const op=++operation;pendingAction=label;busy=true;sync();try{await work();}catch(e){if(op!==operation)return;if(current){current={...current,resultCurrent:false};render();}get('blind-state').textContent='Stopped · '+e.message+' · no renewed save claim';}finally{if(op===operation){busy=false;if(pendingInvalidation===op)invalidate();else sync();}}}
  const connect=async()=>{if(busy)return;operation++;busy=true;pendingAction='Connecting private workspace';generation++;abort?.abort();connected=false;current=null;dirtyRecords=false;dirtyRules=false;sync();try{updateWorkspace(await send('/api/blind/workspace'));connected=true;invalidated=false;}finally{busy=false;sync();}};
  get('blind-records').oninput=()=>{recordsEdit++;dirtyRecords=true;sync();};get('blind-rules').oninput=()=>{rulesEdit++;dirtyRules=true;sync();};
  get('blind-advisory').oninput=()=>{get('blind-advisory-bytes').textContent=new TextEncoder().encode(get('blind-advisory').value).length+' / 4096 UTF-8 bytes · public input';sync();};
  get('blind-compose').onclick=()=>action('Composing governed public method',async()=>{if(new TextEncoder().encode(get('blind-advisory').value).length>4096)return;const g=select();busy=true;invalidated=false;sync();const advisory=get('blind-advisory').value;const start=await send('/api/blind/runs',{method:'POST',body:{taskId:get('blind-objective').value,...(advisory?{advisory}:{})},signal:abort.signal});if(g!==generation)return;await observe(start.runId,g);});
  for(const [part,id] of [['records','private'],['rules','rules']])get('blind-apply-'+part).onclick=()=>action('Applying private '+part,async()=>{const g=generation,edit=part==='records'?recordsEdit:rulesEdit,draft=get('blind-'+part).value;if(new TextEncoder().encode(draft).length>65536)throw new Error('INPUT_BOUND');const data=JSON.parse(draft);const w=await send('/api/blind/'+id,{method:'PUT',body:{expectedVersion:workspace.version,[part]:data}});if(g!==generation)return;const unchanged=edit===(part==='records'?recordsEdit:rulesEdit)&&get('blind-'+part).value===draft;if(part==='records')dirtyRecords=!unchanged;else dirtyRules=!unchanged;updateWorkspace(w);if(current){before=structuredClone(current);current={...current,resultCurrent:false,result:null,resultRevision:null};comparison=null;}get('blind-readback').textContent='';render();});
  get('blind-rebind').onclick=()=>action('Rebinding retained method locally',async()=>{if(invalidated||!current?.recipe||dirtyRecords||dirtyRules)return;const id=current.runId,g=generation,previous=before||structuredClone(current);const v=await send('/api/blind/runs/'+id+'/rebind',{method:'POST',body:{}});if(g!==generation)return;if(v.runId!==id)throw new Error('RUN_ID_MISMATCH');before=previous;comparison=blindComparison(previous,v);current=v;get('blind-readback').textContent='';render();});
  get('blind-save').onclick=()=>action('Saving exact internal brief and checking read-back',async()=>{if(!current?.resultCurrent||dirtyRecords||dirtyRules||invalidated||!canSave())return;const id=current.runId,revision=current.resultRevision,g=generation;const expected=structuredClone(current.result);const v=await send('/api/blind/runs/'+id+'/save',{method:'POST',body:{resultRevision:revision}});if(g!==generation)return;if(v.runId!==id||v.resultRevision!==revision||!v.resultCurrent||dirtyRecords||dirtyRules||invalidated)throw new Error('STALE_RESULT');current=v;render();if(v.save?.artifactId){const artifact=await send('/api/blind/artifacts/'+v.save.artifactId,{method:'GET'});if(g!==generation)return;if(artifact.parentRunId!==id||artifact.resultRevision!==revision||artifact.workspaceVersion!==v.workspaceVersion||JSON.stringify(artifact.brief)!==JSON.stringify(expected)||artifact.contentHash!==await blindContentHash(expected))throw new Error('ARTIFACT_MISMATCH');get('blind-readback').textContent='Exact authenticated artifact read-back · '+artifact.artifactId;}});
  get('blind-reset').onclick=()=>action('Resetting synthetic worksheet',async()=>{const g=generation,recordEdit=recordsEdit,ruleEdit=rulesEdit,recordDraft=get('blind-records').value,ruleDraft=get('blind-rules').value,w=await send('/api/blind/reset',{method:'POST',body:{}});if(g!==generation)return;dirtyRecords=recordEdit!==recordsEdit||recordDraft!==get('blind-records').value;dirtyRules=ruleEdit!==rulesEdit||ruleDraft!==get('blind-rules').value;updateWorkspace(w);if(current){before=structuredClone(current);current={...current,resultCurrent:false,result:null,resultRevision:null};comparison=null;}get('blind-readback').textContent='';render();});
  get('blind-refuse').onclick=()=>action('Checking manual external export refusal',async()=>{const id=current.runId,g=generation;const v=await send('/api/blind/runs/'+id+'/export',{method:'POST',body:{resultRevision:current.resultRevision,destination:'external'}});if(g===generation)get('blind-refusal').textContent=v.allowed===false&&v.evidence==='manual_deterministic_refusal'&&v.sinkEffects===0?'Manually attempted external export refused · 0 sink effects':'External refusal evidence unavailable';});
  get('blind-inspect').onclick=()=>action('Inspecting retained run with GET only',async()=>{const id=get('blind-inspect-id').value.trim();if(!/^[a-f0-9-]{36}$/.test(id))throw new Error('INVALID_RUN_ID');const g=select();busy=true;await observe(id,g);get('blind-state').textContent+=' · retained GET-only observation';});
  get('blind-stop').onclick=()=>{if(!busy||observationGeneration!==generation)return;operation++;generation++;abort?.abort();busy=false;if(current)current={...current,resultCurrent:false};render();get('blind-state').textContent='Observation stopped · host work may continue and stays charged; no remote cancellation or refund.';};
  get('blind-objective').onchange=()=>{if(busy&&observationGeneration!==generation){get('blind-objective').value=selectedObjective;return;}selectedObjective=get('blind-objective').value;operation++;busy=false;select();get('blind-state').textContent='New objective selected · compose to continue';};
  get('blind-decision-filter').onchange=render;
  get('blind-download').onclick=()=>action('Downloading sanitized evidence with GET only',async()=>{const id=current.runId,g=generation;await downloadBlindEvidence(id,{send,doc,urlApi,isCurrent:()=>g===generation&&current?.runId===id});});
  listen?.('pagehide',()=>{generation++;abort?.abort();token='';});sync();return{connect,invalidate,sync,isOccupied:()=>busy,stop:()=>get('blind-stop').onclick(),getState:()=>({workspace,current,before,comparison})};
}
export function bindWorkbench(doc,options={}){
  let release,blind,connecting=false;
  const syncConnect=()=>{doc.getElementById('connect').disabled=connecting||Boolean(release?.isOccupied()||blind?.isOccupied());};
  release=setup(doc,{...options,onOccupancyChange:syncConnect});
  blind=setupBlind(doc,{...options,onOccupancyChange:syncConnect,isOtherOccupied:()=>connecting});const connect=doc.getElementById('connect'),old=connect.onclick;
  connect.onclick=async()=>{if(connecting||release.isOccupied()||blind.isOccupied())return;connecting=true;blind.sync();try{await old();if(acceptedPolicy)await blind.connect();}finally{connecting=false;blind.sync();}};
  for(const [id,event] of [['policy-form','onsubmit'],['save-feed','onclick']]){const node=doc.getElementById(id),handler=node[event];node[event]=async(...args)=>{const prior=acceptedPolicy?.version;await handler(...args);if(prior!==acceptedPolicy?.version)blind.invalidate();};}
  return blind;
}
if(typeof document!=='undefined')bindWorkbench(document);
