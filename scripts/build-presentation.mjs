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
const previewOnly=false; // Final source always requires current actual intention evidence.
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
function note(source,text){return `${text}\n\nSources: ${source}${input?`\nActual original proof date: ${proof.generatedAt}.${intent?` New intention proof date: ${intent.generatedAt}.`:''} Browser capture date: ${input.capturedAt}. Source revision: ${input.sourceRevision}. Browser captures may show later local mutations of the retained actual hosted method, without new composition.`:''}\nDisclosure: Synthetic supplier-renewal prototype. Public objective/capability descriptions and transport metadata remain disclosed. Local host/employee access is trusted. Targets are potential outcomes, never achieved savings. Current package evidence does not establish production security or formal noninterference.`;}
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

// 1: minimal title. The five-word product title meets the <=5-word field limit.
{
 const s=base('',note('.planning/PROJECT.md; .planning/phases/05-blind-workbench/05-CONTEXT.md; TEAM.md','Opening: supplier-renewal work should benefit from AI without giving the hosted models the confidential contract worksheet or private rule bodies.'),true);
 txt(s,'ProofGate: Public Plans, Private Results',64,88,1152,205,44,true,colors.white);
 txt(s,'AI supplies the method.\nThe company keeps its know-how.',64,327,1080,150,32,false,colors.white);
 txt(s,'Blind Workbench: supplier renewal with synthetic contracts',64,606,1000,40,18,false,'#CBDDD5');
}
// 2: concrete business problem, with an actual worksheet capture in the final deck.
{
 const s=base('Supplier renewal needs private know-how',note('src/blind.ts initialPrivate/executeRecipe; .planning/phases/05-blind-workbench/05-CONTEXT.md; current genuine worksheet capture','A proposed quote alone does not determine a negotiation target. The company applies its confidential price ceiling and service threshold locally. All contracts shown are synthetic.'));
 txt(s,'The quote changes.\nPrivate rules set\nthe negotiation target.',64,185,470,210,28,true);
 txt(s,'An employee needs a useful brief\nwithout giving a hosted model\nthe contract register or rule bodies.',64,431,455,145,20);
 if(!previewOnly)await img(s,assets.worksheet,640,158,548,460,'Genuine confidential rule excerpt and zero-attempt local rebind',{left:486,top:798,width:390,height:345});
 else txt(s,'Synthetic fixture example\nCurrent annual price  $120,000\nSupplier quote  $132,000\nPrivate increase ceiling  2%',566,190,630,265,26);
 txt(s,'Synthetic contracts. Negotiation targets are potential outcomes.',64,641,1152,36,17,false,colors.muted);
}
if(!previewOnly){
 // 4: exact actual AI compositions, expressed as editable human-readable steps.
 if(intent){
  const s=base('An employee intention changes the method',note('current validated new-intention proof; pre-registered test/blind-intent-case.json',`The exact public employee request was frozen before observing the model reply. Actual AI chose window60, rank soonest and limit2. The independent intention oracle expected different selected records from the two earlier prepared recipes. No superiority over forms or spreadsheets is claimed.`));
  txt(s,'Within the next 60 days,\nprepare at most two renewals,\nearliest renewals first.',64,170,562,178,26,true);
  txt(s,'Actual AI choices\n60-day window\nEarliest renewal first\nAt most 2 renewals',64,390,548,204,23,true,colors.green);
  txt(s,'Admitted operation method',676,165,540,45,24,true,colors.green);
  txt(s,planText(intent.composition.recipe),676,233,540,346,22);
  txt(s,'One previously unprepared public intention. Company records and rule bodies remain local.',64,631,1152,58,18,false,colors.muted);
 }
 // 5: one evidence image and a large supported zero-attempt delta.
 {
  const r=objective.rebind;
  const s=base('A private change changes the useful brief',note('current proof.objectives negotiation-savings rebind; current new-intention proof when supplied; actual current hero browser screenshot',intent?`Actual new-intention proof changes independently expected potential savings from ${money(sum(intent.rebind.actualBefore))} to ${money(sum(intent.rebind.actualAfter))} in synthetic USD. Private quotes and price rule change. Selected records change from Near/Middle to Middle/Large. Retained actual public bodies, constructors and charged ledger remain identical during the local rebind. Separate save charges are retained. This is a potential negotiation outcome.`:`The frozen original proof separately changes potential saving from ${money(sum(r.actualBefore))} to ${money(sum(r.actualAfter))}. The screenshot and large values show later automated walkthroughs 2 and 3 with the retained actual plan: private Acme quote $128,000 to $130,000 and potential saving $16,000 to $18,000. These are synthetic USD. This represents negotiation opportunity, not achieved saving. The actual captured public body arrays, same-objective planner construction and same-plan checker construction remain unchanged. Retained ledger calls and credits remain identical through this local rebind.`));
  await img(s,assets.hero,64,180,520,415,intent?'Genuine new-intention local result and independent save':'Cropped genuine later automated walkthrough result, with potential savings and exact internal save',{left:912,top:238,width:470,height:670});
  txt(s,intent?`${money(sum(intent.rebind.actualBefore))}\nto ${money(sum(intent.rebind.actualAfter))}`:'$16,000\nto $18,000',602,184,365,150,28,true,colors.green);
  txt(s,intent?'Potential annual savings\nPrivate quotes and rule change\nNear + Middle\nto Middle + Large':'Potential annual savings\nPrivate quote changes\n$128,000 to $130,000',602,350,355,184,21);
  txt(s,intent?'Same admitted actual method\nNew-intention proof, local rebind':'Same retained actual plan\nLater automated walkthroughs',602,542,355,71,17,false,colors.muted);
  txt(s,'0',1000,175,216,100,62,true,colors.green);
  txt(s,'new provider attempts\nin the local rebind',1002,307,214,165,18,true);
  txt(s,'Changed brief\nSame method',1002,507,214,106,20,true);
  txt(s,'The private quote or rule changes locally. The admitted AI method stays the same.',64,639,1152,48,18,false,colors.muted);
 }
// 3: the explicitly assigned native editable factual diagram.
{
 const s=base('Public AI method, local private execution',note('src/blind.ts; src/prompt-profiles.ts; src/model.ts; src/host.ts; fixture/blind-server.ts; fixture/blind-store.ts','The authenticated host sends only public objective/capabilities/admitted advisory or recipe to hosted stateless models. Advisory inspection precedes planner exposure. Whole recipe validation and semantic admission precede private access. A retained admitted recipe executes locally. A separate employee-approved typed MCP internal save uses independent SQLite read-back. All traffic shares current policy and the retained allowance.'));
 txt(s,'HOSTED MODELS RECEIVE APPROVED PUBLIC INPUTS',64,158,1152,32,17,true,colors.green);
 const a=dnode(s,'Public objective\nand capabilities',64,218,208,106);
 const b=dnode(s,'Advisory checker\nAI planner\nRecipe checker',321,206,241,130);
 const c=dnode(s,'Whole-plan gate\nCurrent policy',616,218,220,106);
 connect(s,a,b);connect(s,b,c);
 txt(s,'CONFIDENTIAL WORK STAYS IN THE LOCAL HOST',64,385,630,32,17,true,colors.green);
 const d=dnode(s,'Private records\nand rule bodies',64,458,208,106);
 const e=dnode(s,'Local executor\nUseful brief',616,458,220,106);
 const f=dnode(s,'Employee-approved\ninternal save\nIndependent read-back',903,443,313,137);
 connect(s,c,e,'bottom','top');connect(s,d,e);connect(s,e,f);
 txt(s,'Authenticated host. Shared policy and allowance. No arbitrary code or network operations.',64,631,1152,52,18,false,colors.muted);
}
 // 6: genuine SDK-body evidence, kept distinct from transport metadata.
 {
  const s=base('Actual inputs to the hosted models',note('current proof.observations[].evidence.captures; src/prompt-profiles.ts validatePublicApplicationBody; current payload browser capture','These are actual serialized generateContent application bodies captured at the metered hosted SDK dispatch boundary. Constructor specimens are separate and are not wire evidence. Public objective/capabilities/advisory/recipe remain disclosed. Headers/OAuth are omitted from the capture and transport metadata remains disclosed. This bounded inspection does not establish formal noninterference or conceal all metadata.'));
  await img(s,assets.payload,64,160,720,450,'Cropped genuine browser capture of actual public model body at metered dispatch',input.screenshots.payload?.uncropped?null:(input.screenshots.payload?.crop||{left:65,top:0,width:410,height:740}));
  txt(s,'Public application bodies',840,165,376,96,24,true,colors.green);
  txt(s,'Approved objective\nCapability grammar\nAdmitted public advisory\nProposed operation recipe',840,283,376,180,20);
  txt(s,'No private records, rule bodies\nor computed brief in the\ninspected application bodies.',840,494,376,125,20,true);
  txt(s,'Public task/capability and transport metadata remain disclosed. The local host is trusted.',64,639,1152,54,17,false,colors.muted);
 }
 // 7: current semantic/control/save proof with no unobserved causal claim.
 {
  const s=base('Controls stop a forbidden interaction',note('test/blind-cases.json; current actual proof observations/controls/objectives; https://invariantlabs.ai/blog/mcp-github-vulnerability; current genuine controls browser capture','A harmless synthetic adaptation of Invariant Labs’ GitHub MCP toxic flow tests advisory admission. One frozen observation each covers benign, active, quoted and signature-free paraphrase. Semantic quarantine removes the entire hostile advisory before actor exposure. Budget tightening and stale/manual external-save refusals are separately asserted with unchanged effect counts. A permitted current internal save matches one independently observed exact record for each objective. No causal downstream improvement follows merely from quarantine.'));
  await img(s,assets.controls,64,178,670,422,'Cropped genuine browser capture of current editable control policy',input.screenshots.controls?.uncropped?null:(input.screenshots.controls?.crop||{left:58,top:940,width:1318,height:520}));
  txt(s,'Benign advisory admitted\nHostile paraphrase quarantined',784,166,432,110,20,true,colors.green);
  txt(s,'Budget blocks new dispatch\nStale save adds no effect\nManual external export refused',784,306,432,145,20);
  txt(s,'Internal save: 1 exact\nindependently observed record',784,505,432,98,20,true);
  txt(s,'Whole-source quarantine is an observed control decision. It does not prove downstream causal benefit.',64,639,1152,58,17,false,colors.muted);
 }
 // 8: measured evidence, task fidelity and visible material boundaries.
 {
  const r=objective.rebind.before;
  const identities=[...new Set(proof.observations.flatMap(o=>o.evidence.measurements.spans.filter(s=>s.returnedModel).map(s=>s.returnedModel)))];
  const regression=input.regression&&!/final rerun required|pending/i.test(input.regression.sourceScope||'')?`${input.regression.passed}/${input.regression.total} offline runner checks pass`:'Current regression: awaiting final source check';
  const s=base('Evidence and limits',note('current validated actual proof; integrator regression log; goldman/TASK-CONTRACT.md; .planning/PROJECT.md; package evidence.json','The Goldman task requires deterministic and actual semantic controls, editable policy/model/threshold/budget, realtime audit/export, positive/negative tests, architecture and measured telemetry. The package retains the exact source conflict: brief weights30/20/20/15/15, rules30/20/20/20/10. Rules permit English/Polish, stricter task page and owner choose English. Earlier cutoff is 4 October2026 11:00 Warsaw despite literal PM wording in other source text. The runtime uses owner-funded hosted Vertex synthetic inference with no local LLM. Current captured same-epoch ledger checkpoint: 328 calls and 89,021,463 admission credits, including 10 historical unknown attempts that remain charged and unreplayed. Tariff remains unknown/unpriced. Historical release on/off outcomes are separately dated; both actors succeeded safely and no downstream causal benefit was observed.'));
  txt(s,'Observed proof',64,158,548,46,24,true,colors.green);
  txt(s,intent?'4 original advisory cases, 1 each\n2 original compositions + 1 new intention\nPrivate rebinds add zero new attempts\nExact internal saves observed independently':'4 advisory cases, 1 observation each\n2 actual objective compositions\n2 private rebinds with zero new attempts\n2 exact independent internal saves',64,225,566,212,20);
  txt(s,intent?`24 proof + 16 walkthrough + ${intent.newAttempts.length} intention = ${40+intent.newAttempts.length}\nOriginal combined 36 / 32 forecast exceeded\nModel inference: ${12+intent.newAttempts.filter(a=>['actor','checker'].includes(a.kind)).length} of ${40+intent.newAttempts.length} charged wires`:'24 proof attempts + 12 rehearsal wires = 36\nOriginal combined forecast: 32, exceeded\nModel inference: 12 of the 36 charged wires',64,468,566,124,18,true);
  txt(s,'4 automated walkthroughs; no human rehearsal\n48.93s backup: seven paced UI captures\n10 historical unknowns charged; tariff unpriced',64,597,566,105,17,false,colors.muted);
  txt(s,'Boundary and measurements',688,158,528,46,24,true);
  txt(s,'Synthetic data, owner-funded hosted AI\nNo demonstrated local LLM backend\nTrusted local host and employee\nPotential savings, not achieved savings\nNo production or formal security proof',688,225,528,233,20);
  txt(s,regression,688,488,528,76,18,true);
  txt(s,intent?'One actual composition: 3.66s overall\nHosted spans: 3.65s, local: 1.61ms\nMCP save call: 10.95ms, separate':'Returned: Gemini 3.5 Flash / Flash-Lite\nModel, local and MCP spans stay separate',688,584,528,106,17,false,colors.muted);
 }
}
// 9: concise close with genuine team and no invented individual contributions.
{
 const s=base('',note('TEAM.md; .planning/PROJECT.md; current proof and authentic browser observations','Closing: invite the judge to change a private quote or rule, rebind the retained admitted method, inspect the attempt delta and verify the exact internally saved brief. Team skills are owner-provided, not claims of individual code contributions. Genuine team: Michał Jabłoński, Karol Krawczyk, Kamil Krawczyk, Viktoriia Vinnykova.'),true);
 txt(s,'AI supplies the method.\nThe company keeps its know-how.',64,82,1152,210,42,true,colors.white);
 txt(s,'A judge can change a private quote or rule\nand inspect the useful result.',64,331,1152,114,26,false,colors.white);
 txt(s,'ProofGate',64,536,1110,45,24,true,'#CBDDD5');
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
 await fs.writeFile(path.join(buildDir,`handoff-${outName}.json`),JSON.stringify({status:'awaiting_individual_visual_review',sourceRevision:input.sourceRevision,capturedAt:input.capturedAt,proofGeneratedAt:proof.generatedAt,slideCount:slides.length,font:family,finalPath,finalPdf,receiptPath,renderPaths},null,2)+'\n');
 console.log(JSON.stringify({status:'awaiting_individual_visual_review',slideCount:slides.length,font:family,finalPath,finalPdf,receiptPath,renderDir}));
}
