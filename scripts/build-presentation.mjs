import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const execFileAsync=promisify(execFile);

// Run from the repository root with bundled Node. Rebuilding requires the sanitized
// PITCH_INPUT JSON, its proof files and genuine screenshots, and the installed
// @oai/artifact-tool runtime. Override PRESENTATIONS_SKILL_DIR, RUNTIME_NODE_MODULES,
// RUNTIME_PYTHON and RUNTIME_SOFFICE for an equivalent installed runtime. No dependency
// installation is performed. The PPTX itself remains natively editable.
// Uses only the installed Codex artifact runtime. This file never calls a model,
// reads a live database/token, changes policy, saves a brief or resets a ledger.
const workspaceDir=process.env.PROOFGATE_WORKSPACE||process.cwd();
const SKILL_DIR=process.env.PRESENTATIONS_SKILL_DIR||'/Users/michaljablonski/.codex/plugins/cache/openai-primary-runtime/presentations/26.909.12148/skills/presentations';
const RUNTIME_NODE_MODULES=process.env.RUNTIME_NODE_MODULES||'/Users/michaljablonski/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const RUNTIME_PYTHON=process.env.RUNTIME_PYTHON||'/Users/michaljablonski/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3';
process.env.RUNTIME_NODE_MODULES=RUNTIME_NODE_MODULES;
const requireRuntime=createRequire(path.join(RUNTIME_NODE_MODULES,'__pitch__.cjs'));
const {Presentation,PresentationFile}=await import(pathToFileURL(requireRuntime.resolve('@oai/artifact-tool')).href);
const {resolvePresentationFont,finalizePresentation}=await import(pathToFileURL(path.join(SKILL_DIR,'container_tools/artifact_tool_utils.mjs')).href);
const family=resolvePresentationFont({fontFamily:"Arial"});
const buildDir=path.join(workspaceDir,'.proofgate/presentation-build');
const inputFile=process.env.PITCH_INPUT||path.join(workspaceDir,'.proofgate/phase05-delivery-input/pitch-input.json');
const outName=process.env.PITCH_REVISION||new Date().toISOString().replace(/[:.]/g,'-');
const previewOnly=false; // Both draft and final require validated retained actual intention evidence.
const draftOnly=process.env.PITCH_DRAFT==='true'; // Layout-only use; never declares a new capture or source acceptance.
const RUNTIME_SOFFICE=process.env.RUNTIME_SOFFICE||'/Users/michaljablonski/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/override/soffice';
const colors={paper:'#F5F3EC',ink:'#102D3C',muted:'#465960',green:'#2D6B51',white:'#FFFFFF',red:'#923A35'};
const presentation=Presentation.create({slideSize:{width:1280,height:720}});
let serial=0;
const slides=[];

function txt(s,text,x,y,w,h,pt=22,bold=false,color=colors.ink,align='left'){
 const shape=s.shapes.add({geometry:'textbox',name:`text-${++serial}`,position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
 shape.text=text;
 shape.text.style={typeface:family,fontSize:pt*4/3,bold,color,alignment:align,verticalAlignment:'top',autoFit:'none',wrap:'square',insets:{left:0,right:0,top:0,bottom:0}};
 return shape;
}
function base(title,notes,dark=false){
 const s=presentation.slides.add();s.background.fill=dark?colors.ink:colors.paper;slides.push(s);
 if(title)txt(s,title,64,44,1152,100,34,true,dark?colors.white:colors.ink);
 s.speakerNotes.textFrame.setText(notes);return s;
}
function note(source,text){return `${text}\n\nSources: ${source}${input?`\nRetained original proof date: ${proof.generatedAt}.${intent?` Retained intention proof date: ${intent.generatedAt}.`:''} Browser capture date: ${input.capturedAt}. Source revision: ${input.sourceRevision}. Capture scope: ${input.captureNotes||"retained GET-only observation; no new inference, rebind or save"}.`:''}\nDisclosure: Synthetic supplier-renewal prototype. Public objective/capability descriptions and transport metadata remain disclosed. Local host/employee access is trusted. Targets are potential outcomes, never achieved savings. Current package evidence does not establish production security or formal noninterference.`;}
async function img(s,file,x,y,w,h,alt,crop){
 const sharp=requireRuntime('sharp');
 const bytes=crop?await sharp(file).extract(crop).png().toBuffer():await fs.readFile(file);s.images.add({blob:bytes,contentType:'image/png',fit:'contain',position:{left:x,top:y,width:w,height:h},alt});
}
function dnode(s,text,x,y,w,h,pt=20){
 const n=s.shapes.add({geometry:'rect',name:`mechanism-${++serial}`,position:{left:x,top:y,width:w,height:h},fill:colors.paper,line:{style:'solid',fill:colors.ink,width:1.5}});
 n.text=text;n.text.style={typeface:family,fontSize:pt*4/3,color:colors.ink,alignment:'center',verticalAlignment:'middle',autoFit:'none',insets:{left:10,right:10,top:10,bottom:10}};return n;
}
function connect(s,a,b,from='right',to='left'){s.shapes.connect(a,b,{kind:'straight',fromSide:from,toSide:to,line:{style:'solid',fill:colors.green,width:2},tail:{type:'arrow',width:'med',length:'med'}});}
function planText(recipe){return recipe.steps.map((step,i)=>{
 const words={select_due:`Select renewals within ${step.windowDays} days`,calculate_targets:'Apply private price ceiling',evaluate_service:'Evaluate private service threshold',rank:`Rank by ${step.by==='savings'?'potential savings':step.by==='service-risk'?'service risk':'renewal date'}`,take:`Keep ${step.count} renewals`,render:'Render the negotiation brief'};
 return `${i+1}. ${words[step.op]}`;
}).join('\n');}
const sum=rows=>rows.reduce((n,r)=>n+r.savingCents,0);
const money=c=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(c/100);
const hash=b=>createHash('sha256').update(b).digest('hex');

let input,proof,intent,objective,assets={};
if(!previewOnly){
 input=JSON.parse(await fs.readFile(inputFile,'utf8'));
 if(!input.sourceRevision||!input.capturedAt||!input.proofFile)throw new Error('CURRENT_INTEGRATOR_INPUT_REQUIRED');
 const root=path.dirname(inputFile);
 proof=JSON.parse(await fs.readFile(path.resolve(root,input.proofFile),'utf8'));
 const {validateProof}=await import(pathToFileURL(path.join(workspaceDir,'scripts/check-blind-proof.mjs')).href);
 const checked=validateProof(proof);if(!checked.ok)throw new Error('ACTUAL_PROOF_REQUIRED');
 objective=proof.objectives.find(o=>o.taskId==='negotiation-savings');
 if(!input.intentionProofFile)throw new Error('CURRENT_ACTUAL_INTENTION_REQUIRED');
 {
  intent=JSON.parse(await fs.readFile(path.resolve(root,input.intentionProofFile),'utf8'));
  const {validateIntentProof}=await import(pathToFileURL(path.join(workspaceDir,'scripts/check-blind-intent-proof.mjs')).href);
  if(!validateIntentProof(intent).ok)throw new Error('ACTUAL_INTENTION_PROOF_REQUIRED');
  if(input.intentionScreenshotRunId!==intent.composition.run.runId)throw new Error('FRESH_INTENTION_SCREENSHOT_ID_REQUIRED');
 }
 for(const name of ['worksheet','hero','payload','controls']){
  if(!input.screenshots?.[name])throw new Error(`GENUINE_SCREENSHOT_REQUIRED_${name}`);
  const spec=input.screenshots[name],file=path.resolve(root,typeof spec==='string'?spec:spec.path);
  const data=await fs.readFile(file);if(data.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw new Error('PNG_REQUIRED');
  if(typeof spec==='object'&&spec.sha256&&hash(data)!==spec.sha256)throw new Error('SCREENSHOT_HASH_MISMATCH');assets[name]=file;
 }
 if(input.regression&&(!(input.regression.passed===input.regression.total)||input.regression.failed!==0||input.regression.skipped!==0))throw new Error('REGRESSION_CLAIM_INVALID');
}

// Nine-slide incumbent style; public goal and useful private result lead.
{
 const s=base('',note('.planning/PROJECT.md; TEAM.md','An employee needs to decide which supplier renewals to negotiate and what to ask for. ProofGate governs actual hosted AI composition, local private calculation and separately approved internal action.'),true);
 txt(s,'ProofGate: Public Plans, Private Results',64,88,1152,205,44,true,colors.white);
 txt(s,'Prepare the right supplier negotiations.\nKeep company facts and rules local.',64,327,1080,150,30,false,colors.white);
 txt(s,'Blind Workbench · synthetic supplier contracts',64,606,1000,40,18,false,'#CBDDD5');
}
{
 const s=base('Which suppliers should we negotiate with?',note('test/blind-intent-case.json; src/blind.ts; actual intention proof','The public request is within 60 days, at most two renewal negotiations, earliest renewals first. Private quotes, current prices and company thresholds decide which records qualify and what the negotiation brief says.'));
 txt(s,'The employee asks',64,165,510,45,24,true,colors.green);
 txt(s,'Within the next 60 days,\nprepare at most two renewals,\nearliest renewals first.',64,236,548,188,27,true);
 txt(s,'The result should tell me who to contact\nand the price ceiling to negotiate.',64,481,548,118,21);
 txt(s,'The company knows',692,165,524,45,24,true,colors.green);
 txt(s,'Private supplier quotes and prices\nPrivate price and service rules\nWhich renewals meet those rules',692,236,524,188,24);
 txt(s,'Those facts determine the selection\nand the useful brief, inside the host.',692,481,524,118,21);
 txt(s,'Public intent is disclosed. The demonstrated records and rule bodies stay local. All records are synthetic.',64,640,1152,55,17,false,colors.muted);
}
{
 const s=base('Actual AI composes an approved method',note('validated actual intention proof; test/blind-intent-case.json','The public request and independent expected selection were frozen before the model reply. Actual AI returned the 60-day / soonest / two method. It chooses approved operations and parameters; it does not invent an algorithm or run arbitrary code.'));
 txt(s,'Public request + capabilities',64,165,530,70,23,true,colors.green);
 txt(s,'AI chose\n60-day window\nEarliest renewal first\nAt most 2 renewals',64,264,498,232,27,true);
 txt(s,'Admitted operations',680,165,536,46,24,true,colors.green);
 txt(s,planText(intent.composition.recipe),680,253,536,318,22);
 txt(s,'The host checks the whole method before private access. No arbitrary code, SQL or network operations.',64,632,1152,65,18,false,colors.muted);
}
{
 const before=intent.rebind.actualBefore,after=intent.rebind.actualAfter;
 const s=base('Private changes produce a different useful brief',note('validated actual intention rebind; genuine retained-run GET result capture','Independent expected results change from Near/Middle to Middle/Large after private quote and price-rule changes. The retained admitted method and captured application bodies stay unchanged. Rebind adds zero provider attempts. The current screenshot observes a retained result and historical save; it establishes no new inference, rebind or save.'));
 txt(s,'Before the private change',64,167,512,44,23,true,colors.muted);
 txt(s,'Near + Middle',64,227,512,70,32,true);
 txt(s,'After quotes and the price rule change',64,334,570,48,22,true,colors.green);
 txt(s,'Middle + Large',64,402,545,75,34,true,colors.green);
 txt(s,'Negotiation ceilings\nMiddle: '+money(after[0].targetCents)+' · Large: '+money(after[1].targetCents),64,505,566,91,22);
 txt(s,money(sum(before))+' → '+money(sum(after))+' potential annual opportunity · synthetic USD',64,635,1152,56,17,false,colors.muted);
 await img(s,assets.hero,676,170,540,338,'Genuine retained result: Middle and Large supplier negotiation brief',input.screenshots.hero?.crop||{left:912,top:238,width:470,height:670});
 txt(s,'0 new provider attempts during local rebind',676,539,540,75,24,true,colors.green);
}
{
 const s=base('ProofGate controls each step',note('src/blind.ts; src/prompt-profiles.ts; src/model.ts; src/host.ts; fixture/blind-server.ts; fixture/blind-store.ts','The hosted checker inspects the advisory before planner exposure and the full method before private access. Deterministic schemas/dependencies/current policy AND actual AI semantic inspection must permit the work. The local host then applies private facts. A separate typed internal-save action uses independent read-back. Authentication, actor, checker and tools share a finite allowance.'));
 txt(s,'PUBLIC INPUT → HOSTED AI → ADMITTED METHOD',64,158,1152,32,17,true,colors.green);
 const a=dnode(s,'Public intent\nand capabilities',64,218,208,106);
 const b=dnode(s,'Advisory checker\nAI planner\nMethod checker',321,206,241,130);
 const c=dnode(s,'Deterministic AND\nactual AI checks',616,218,220,106,18);
 connect(s,a,b);connect(s,b,c);
 txt(s,'PRIVATE FACTS → LOCAL WORK',64,385,530,32,17,true,colors.green);
 const d=dnode(s,'Private records\nand rule bodies',64,458,208,106);
 const e=dnode(s,'Local executor\nUseful brief',616,458,220,106);
 const f=dnode(s,'Employee-approved\ninternal save\nIndependent read-back',903,443,313,137);
 connect(s,c,e,'bottom','top');connect(s,d,e);connect(s,e,f);
 txt(s,'Authenticated host · current policy · finite shared allowance · observable audit and export',64,631,1152,56,18,false,colors.muted);
}
{
 const s=base('Inspect what the hosted models received',note('actual SDK dispatch captures; src/prompt-profiles.ts; dated payload capture','Actual serialized application bodies are captured at metered SDK dispatch. They are different from constructor specimens. The public task, capabilities, admitted advisory and recipe are disclosed. Headers/OAuth are omitted and transport metadata remains disclosed. Local host and employee access are trusted. No arbitrary-secret or formal confidentiality proof is claimed.'));
 await img(s,assets.payload,64,160,640,450,'Historical genuine capture of actual public model application bodies',input.screenshots.payload?.uncropped?null:(input.screenshots.payload?.crop||{left:65,top:0,width:410,height:740}));
 txt(s,'Disclosed public input',760,165,456,46,24,true,colors.green);
 txt(s,'Employee intent and capabilities\nAdmitted public advisory\nProposed approved method',760,249,456,153,22);
 txt(s,'The inspected bodies exclude\nprivate records, rule bodies\nand the computed brief.',760,463,456,137,22,true);
 txt(s,'Task/capability and transport metadata remain disclosed. The local host and employee are trusted.',64,639,1152,56,17,false,colors.muted);
}
{
 const s=base('An internal save must match the actual brief',note('actual intention proof; independent SQLite effects; current genuine controls capture','The permitted registered MCP save was observed previously and independently matched the exact content, artifact and parent/action identities. Current GET capture is observation only. Stale save and deliberately manual external export refusal are separate negative cases. A benign advisory was admitted and the whole hostile paraphrase quarantined before actor exposure. This does not establish downstream causal benefit.'));
 txt(s,'Observed permitted action',64,163,566,47,24,true,colors.green);
 txt(s,'1 exact internal record\nconfirmed independently',64,238,566,119,30,true);
 txt(s,'Employee approves the current brief.\nAn independent reader checks its content\nand artifact / action identities.',64,402,566,151,21);
 txt(s,'Stale save: no added effect\nManual external export: refused',64,591,566,81,20);
 await img(s,assets.controls,680,173,536,266,'Historical genuine editable policy capture',input.screenshots.controls?.uncropped?null:(input.screenshots.controls?.crop||{left:58,top:940,width:1318,height:520}));
 txt(s,'Policy can block new dispatch.\nHostile advisory quarantined as a whole.\nActor, checker and tools share one budget.',680,477,536,149,20,true);
 txt(s,'Save evidence is retained and separately dated. A GET screenshot makes no new save.',680,637,536,56,16,false,colors.muted);
}
{
 const regression=input.regression&&!/final rerun required|pending/i.test(input.regression.sourceScope||'')?input.regression.passed+'/'+input.regression.total+' offline checks in supplied evidence':'Current candidate regression: root-owned gate';
 const accounting=input.accounting||{};
 const s=base('Evidence you can inspect; limits you should know',note('validated original and intention proofs; input accounting; submission/evidence.json; goldman/TASK-CONTRACT.md','Retained evidence: four advisory cases, two prepared compositions and one previously unprepared intention; exact internal saves and zero-attempt local rebinds. Four automated walkthroughs, zero human rehearsals. Backup is 48.933333 seconds and seven paced genuine historical captures, not continuous recording or latency. Original proof24 plus earlier walkthrough12 equals36, exceeding original combined32 forecast. Separately approved intention adds8 wires (3 model,1 auth,4 MCP); fourth walkthrough adds4 MCP, giving48 wires and15 model inferences. Recorded same-epoch checkpoint328 calls/89021463 credits has10 historical charged unknowns. Observed tokens are separate from conservative admission credits; tariff remains unpriced. One intention composition observed3.66s overall, hosted3.65s and local1.61ms; separate MCP save span10.95ms. Those are single observations, not benchmarks. Historical release on/off actors both succeeded safely, so no downstream causal benefit was observed. Source scoring and PM timing conflicts remain in TASK-CONTRACT.'));
 txt(s,'Retained actual evidence',64,166,568,46,24,true,colors.green);
 txt(s,'Hosted AI returned the admitted methods\nLocal rebind changed the selected suppliers\nInternal effects matched independent records\nAudit, captures and measured spans inspectable',64,244,568,221,21);
 txt(s,`${regression}\nUnknown dispatched work stays charged.`,64,497,568,76,19,true);
 txt(s,'Four automated walkthroughs; no human rehearsal\nBackup: seven paced historical UI captures',64,603,568,83,17,false,colors.muted);
 txt(s,'Material limits',704,166,512,46,24,true);
 txt(s,'Synthetic data; trusted host and employee\nHosted-only AI; no demonstrated local LLM\nPeripheral ERP / email integrations mocked\nPotential opportunity, not achieved savings\nNo universal security or confidentiality proof',704,244,512,254,20);
 txt(s,'Historical injection on/off test:\nno causal protection gain established.\nForecast overrun remains in notes and evidence.',704,552,512,135,18,false,colors.muted);
}
{
 const s=base('',note('TEAM.md; current validated proof and retained browser observations','Invite the judge to inspect the public request, change a private quote or rule through the authorized local scene and inspect the selection/brief/provider delta. Fresh actions require root-approved run/admission; retained playback must be labeled. Genuine team names are owner-provided, not invented contribution claims.'),true);
 txt(s,'Choose suppliers.\nPrepare a useful negotiation brief.',64,82,1152,210,42,true,colors.white);
 txt(s,'AI composes the approved method.\nCompany facts and rules determine the result.',64,331,1152,114,26,false,colors.white);
 txt(s,'ProofGate: Public Plans, Private Results',64,536,1110,45,24,true,'#CBDDD5');
 txt(s,'Michał Jabłoński    Karol Krawczyk\nKamil Krawczyk    Viktoriia Vinnykova',64,606,1152,72,18,false,colors.white);
}

await fs.mkdir(buildDir,{recursive:true});
const candidate=path.join(buildDir,`candidate-${outName}.pptx`);
await (await PresentationFile.exportPptx(presentation)).save(candidate);
if(previewOnly){
 for(let i=0;i<slides.length;i++){const b=await presentation.export({slide:slides[i],format:'png',scale:1});await fs.writeFile(path.join(buildDir,`structure-${i+1}.png`),new Uint8Array(await b.arrayBuffer()));}
 console.log(JSON.stringify({status:'private_structure_preview',slides:slides.length,candidate,font:family}));
}else{
 const finalPath=path.join(buildDir,'output',`proofgate-${outName}.pptx`);
 await fs.mkdir(path.dirname(finalPath),{recursive:true});
 const receiptPath=path.join(buildDir,`validation-${outName}.json`);
 await finalizePresentation({workspaceDir,candidatePath:candidate,finalPath,pythonExecutable:RUNTIME_PYTHON,integrityValidatorPath:path.join(SKILL_DIR,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(SKILL_DIR,'container_tools/inspect_presentation_layout_geometry.py'),layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-bullet-geometry','--validate-heading-fit'],explicitTotalSlideCount:9,requiredNativeTableOwnerSlides:[],requiredNativeChartOwnerSlides:[],fontPolicy:{basis:'design',families:[family]},verifyArtifactToolImport:true,receiptPath});
 const renderDir=path.join(buildDir,'renders',outName);await fs.mkdir(renderDir,{recursive:true});
 const renderPaths=[];
 for(let i=0;i<slides.length;i++){const b=await presentation.export({slide:slides[i],format:'png',scale:2});const image=path.join(renderDir,`slide-${i+1}.png`);await fs.writeFile(image,new Uint8Array(await b.arrayBuffer()));renderPaths.push(image);}
 // Native LibreOffice export retains extractable slide text in the PDF.
 const finalPdf=finalPath.replace(/\.pptx$/,'.pdf');
 const nativeDir=path.join(buildDir,'native-pdf',outName);await fs.mkdir(nativeDir,{recursive:true});
 const profile=path.join(buildDir,'libreoffice-profile',outName);
 const converted=await execFileAsync(RUNTIME_SOFFICE,[`-env:UserInstallation=${pathToFileURL(profile).href}`,'--headless','--convert-to','pdf:impress_pdf_Export','--outdir',nativeDir,finalPath],{timeout:120000,maxBuffer:1048576});
 const produced=path.join(nativeDir,path.basename(finalPdf));
 await fs.copyFile(produced,finalPdf);
 const {PDFDocument}=requireRuntime('pdf-lib');const pdf=await PDFDocument.load(await fs.readFile(finalPdf));
 if(pdf.getPageCount()!==9)throw new Error('NATIVE_PDF_SLIDE_COUNT');
 await fs.writeFile(path.join(buildDir,`handoff-${outName}.json`),JSON.stringify({status:draftOnly?'layout_draft_retained_input_only':'awaiting_individual_visual_review',sourceRevision:input.sourceRevision,capturedAt:input.capturedAt,proofGeneratedAt:proof.generatedAt,slideCount:slides.length,font:family,finalPath,finalPdf,receiptPath,renderPaths},null,2)+'\n');
 console.log(JSON.stringify({status:draftOnly?'layout_draft_retained_input_only':'awaiting_individual_visual_review',slideCount:slides.length,font:family,finalPath,finalPdf,receiptPath,renderDir}));
}
