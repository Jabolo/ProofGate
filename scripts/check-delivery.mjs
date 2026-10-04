import { readFileSync, readdirSync, realpathSync, lstatSync, existsSync } from 'node:fs';
import { resolve, join, relative, isAbsolute, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';

export const PAYLOAD=['architecture.svg','backup.mp4','evidence.json','pitch.md','presentation.pdf','presentation.pptx','rehearsal.md','submission.json','workbench.png'];
export const REQUIRED_CHECKS=['desktop','tablet','mobile','keyboard','reduced-motion','export-download','utf8','policy-feed-mutation','stopped-observation','capacity'];
const title='ProofGate: Public Plans, Private Results';
export const PENDING_ACCEPTANCE='Pending root regression, review, security/UI/source audit and canonical verification parser.';
export const LOCAL_ACCEPTANCE='Accepted locally by root: regression, review, security/UI/source audit and canonical verification passed.';
export const CURRENT_PHASE='.planning/phases/05-blind-workbench/';
export const CURRENT_SOURCE_FILES=['src/host.ts','src/model.ts','src/contracts.ts','src/blind.ts','src/blind-evidence.ts','src/prompt-profiles.ts','fixture/blind-store.ts','fixture/blind-server.ts','public/app.js','public/index.html','public/styles.css','scripts/check-blind-proof.mjs','scripts/check-delivery.mjs','test/offline/delivery.test.ts','test/hosted/blind.test.ts','test/blind-cases.json','README.md','test/blind-intent-case.json','test/hosted/blind-intent.test.ts','test/offline/blind-intent-proof.test.ts','scripts/check-blind-intent-proof.mjs','fixture/server.ts','config/policy.json','config/signatures.json','package.json','package-lock.json','.planning/REQUIREMENTS.md','scripts/build-source-package.mjs','test/offline/source-package.test.ts','delivery/README.md','test/offline/blind-ui.test.ts','scripts/build-presentation.mjs'];
const sha=value=>createHash('sha256').update(value).digest('hex');
const fail=code=>{throw new Error(code);};
const requireThat=(condition,code)=>{if(!condition)fail(code);};
const equal=(a,b,code)=>requireThat(JSON.stringify(a)===JSON.stringify(b),code);
const object=(value,keys,code)=>{requireThat(value&&typeof value==='object'&&!Array.isArray(value),code);equal(Object.keys(value).sort(),[...keys].sort(),code);};
const text=(value,code)=>requireThat(typeof value==='string'&&value.trim().length>0&&value.length<=20000,code);
const words=value=>value.trim().split(/\s+/u).length;
const hash=value=>requireThat(typeof value==='string'&&/^[a-f0-9]{64}$/.test(value),'HASH');
const date=value=>requireThat(typeof value==='string'&&/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(value)&&Number.isFinite(Date.parse(value)),'DATE');
export function measurementAggregatesMatch(measurements){
 return ['deterministic','checker','actor','mcp','overall'].every(kind=>{
  const spans=measurements.spans.filter(s=>s.kind===kind),a=measurements.aggregates.find(s=>s.kind===kind),total=spans.reduce((n,s)=>n+s.durationMs,0);
  if(!a)return spans.length===0;
  return measurements.samplesTruncated?a.count>=spans.length&&a.totalMs+0.01>=total:a.count===spans.length&&Math.abs(a.totalMs-total)<0.01;
 });
}
const secrets=/(?:-----BEGIN (?:RSA |EC )?PRIVATE KEY-----|\bya29\.[A-Za-z0-9_-]{12,}|\bsk-[A-Za-z0-9_-]{16,}|\bAIza[A-Za-z0-9_-]{20,}|"(?:private_key|client_secret|refresh_token|access_token|thoughtSignature|rawReasoning|authorization)"\s*:)/i;
function safeText(value){requireThat(!secrets.test(value),'SENSITIVE_CONTENT');requireThat(!/(?:guaranteed (?:universal|safety|security)|prevents? all (?:attacks|injections)|100% (?:safe|accurate)|unlimited free|production[- ]ready|operational local inference)/i.test(value),'UNSUPPORTED_CLAIM');}
function safeData(value){safeText(JSON.stringify(value));const scan=v=>{if(typeof v==='string')safeText(v);else if(v&&typeof v==='object')Object.values(v).forEach(scan);};scan(value);}
function file(base,name,max=4*1024*1024){
 requireThat(typeof name==='string'&&!isAbsolute(name)&&!name.split(/[\\/]/).some(part=>!part||part==='.'||part==='..'),'UNSAFE_PATH');
 const root=realpathSync(base),path=resolve(root,name);
 const rel=relative(root,path);requireThat(rel&&!rel.startsWith(`..${sep}`)&&!isAbsolute(rel),'UNSAFE_PATH');
 requireThat(existsSync(path),'MISSING_INPUT');const stat=lstatSync(path);requireThat(stat.isFile()&&!stat.isSymbolicLink()&&stat.size>0&&stat.size<=max,'UNSAFE_FILE');
 const actual=realpathSync(path);requireThat(actual.startsWith(root+sep),'UNSAFE_PATH');return readFileSync(path);
}
const json=(base,name)=>JSON.parse(file(base,name).toString('utf8'));
export function localAcceptanceReportsMatch(root){
 try{
  // Final acceptance uses the installed canonical parser, including its current-input
  // staleness check. Exit zero alone also accompanies stale/unparseable reports.
  const tools=join(process.env.CODEX_HOME||join(homedir(),'.codex'),'gsd-core/bin/gsd-tools.cjs');
  const query=args=>{
   const result=spawnSync(process.execPath,[tools,'query',...args,'--cwd',resolve(root)],{cwd:root,encoding:'utf8',timeout:10000,maxBuffer:1024*1024});
   requireThat(!result.error&&result.status===0,'ACCEPTANCE_PARSER');
   const parsed=JSON.parse(result.stdout);
   requireThat(parsed&&typeof parsed==='object'&&!Array.isArray(parsed)&&!Object.hasOwn(parsed,'error'),'ACCEPTANCE_PARSER');
   return parsed;
  };
  const front=name=>{file(root,name);return query(['frontmatter','get',name]);};
  const report=phase=>{
   const selected=query(['verification.resolve-file',phase]).verification_file;
   requireThat(typeof selected==='string'&&relative(resolve(root),selected).split(sep).join('/').startsWith(phase),'ACCEPTANCE_REPORTS');
   const name=relative(resolve(root),selected);file(root,name);
   const status=query(['verification.status',phase]);
   requireThat(status.status==='passed'&&status.staleCheckIndeterminate!==true,'ACCEPTANCE_REPORTS');
   return front(name);
  };
  const baseline='.planning/phases/04-judge-ready-evidence-and-delivery/';report(baseline);
  const priorReview=front(baseline+'REVIEW.md'),priorSecurity=front(baseline+'04-SECURITY.md');file(root,baseline+'04-UI-REVIEW.md');
  requireThat(priorReview.status==='clean'&&priorSecurity.status==='verified'&&(priorSecurity.threats_open===0||priorSecurity.threats_open==='0'),'ACCEPTANCE_REPORTS');
  const verification=report(CURRENT_PHASE),review=front(CURRENT_PHASE+'REVIEW.md'),security=front(CURRENT_PHASE+'05-SECURITY.md'),ui=front(CURRENT_PHASE+'05-UI-REVIEW.md');
  requireThat(typeof verification.covered_digest==='string'&&/^v2:sha256:[a-f0-9]{64}$/.test(verification.covered_digest)&&Array.isArray(verification.covered_files)&&CURRENT_SOURCE_FILES.every(name=>verification.covered_files.includes(name)),'CURRENT_FINGERPRINT');
  const ids=[...phase04RequirementIds(file(root,'.planning/REQUIREMENTS.md').toString('utf8')),...phase05RequirementIds(file(root,'.planning/REQUIREMENTS.md').toString('utf8'))].sort();
  requireThat(Array.isArray(verification.requirements_verified),'CURRENT_REQUIREMENTS');equal([...verification.requirements_verified].sort(),ids,'CURRENT_REQUIREMENTS');
  for(const audit of [review,security,ui])equal(audit.covered_digest,verification.covered_digest,'CURRENT_AUDIT_FINGERPRINT');
  return review.status==='clean'&&security.status==='verified'&&(security.threats_open===0||security.threats_open==='0')&&ui.status==='verified';
 }catch{return false;}
}
export function phase04RequirementIds(source){
 const defined=[...source.matchAll(/^- \[[ x]\] \*\*([A-Z]+-\d+)\*\*:/gm)].map(match=>match[1]);
 const traceability=source.split(/^## Traceability\r?$/m)[1]?.split(/^## /m)[0]??'';
 const owners=[...traceability.matchAll(/^\|\s*([A-Z]+-\d+)\s*\|\s*Phase\s+(\d+)\s*\|\s*[^|]+\s*\|\s*$/gm)].map(match=>({id:match[1],phase:Number(match[2])}));
 requireThat(new Set(defined).size===defined.length&&new Set(owners.map(row=>row.id)).size===owners.length,'REQUIREMENTS');
 equal([...defined].sort(),owners.map(row=>row.id).sort(),'REQUIREMENTS');
 // This package covers the 21 baseline obligations owned by Phases 01–04.
 // Later acceptance owners stay outside its matrix, even when appended to this document.
 const baseline=owners.filter(row=>row.phase>=1&&row.phase<=4).map(row=>row.id);
 requireThat(baseline.length===21,'REQUIREMENTS');return baseline;
}
export function phase05RequirementIds(source){
 phase04RequirementIds(source);
 const ids=[...source.matchAll(/^\|\s*([A-Z]+-\d+)\s*\|\s*Phase\s+5\s*\|\s*[^|]+\s*\|\s*$/gm)].map(m=>m[1]);
 equal([...ids].sort(),['BLIND-01','BLIND-02','BLIND-03','BLIND-04','BLIND-05'],'CURRENT_REQUIREMENTS');return ids;
}
function reference(root,name){requireThat(!name.startsWith('node_modules/')&&!name.startsWith('.proofgate/'),'RUNTIME_REFERENCE');file(root,name);}
export function licenseInventory(root){
 const pkg=json(root,'package.json'),lock=json(root,'package-lock.json');
 function inventory(path,entry){
  const metadataPath=join(root,path,'package.json');const installed=existsSync(metadataPath)?JSON.parse(readFileSync(metadataPath,'utf8')):null;
  requireThat(!installed||installed.version===entry.version,'INSTALLED_VERSION_MISMATCH');
  const notices=installed?readdirSync(join(root,path)).filter(name=>/^(?:licen[cs]e|copying|notice)(?:[._-].*)?$/i.test(name)).sort().flatMap(name=>{
   const noticePath=join(path,name);const stat=lstatSync(join(root,noticePath));return stat.isFile()&&!stat.isSymbolicLink()?[{path:noticePath,sha256:sha(readFileSync(join(root,noticePath)))}]:[];
  }):[];
  return {path,name:installed?.name??path.split('node_modules/').at(-1),version:entry.version,license:installed?.license??entry.license??'unavailable',metadata:installed?'installed':'lock-only',notices};
 }
 const production=Object.entries(lock.packages).filter(([path,entry])=>path&&!entry.dev).sort(([a],[b])=>a.localeCompare(b)).map(([path,entry])=>inventory(path,entry));
 const direct=Object.entries({...pkg.dependencies,...pkg.devDependencies}).sort(([a],[b])=>a.localeCompare(b)).map(([name,version])=>{
  const path=`node_modules/${name}`,entry=lock.packages[path];requireThat(entry?.version===version,'DIRECT_PIN_MISMATCH');return {...inventory(path,entry),scope:pkg.dependencies[name]?'production':'development'};
 });return {direct,production};
}
function metadata(root,directory){
 const m=json(directory,'submission.json');safeData(m);
 object(m,['schemaVersion','language','title','description','team','architecture','artifacts','setup','sources','licenses','evidenceMatrix','pivotEvidenceMatrix','currentAssessment','retainedExperiment','limitations','demo','delivery'],'METADATA_FIELDS');
 equal(m.schemaVersion,'proofgate-submission-3','METADATA_VERSION');equal(m.language,'en','LANGUAGE');equal(m.title,title,'TITLE');requireThat(words(m.title)<=5,'TITLE_WORDS');text(m.description,'DESCRIPTION');requireThat(words(m.description)<=500,'DESCRIPTION_WORDS');
 object(m.team,['name','members'],'TEAM');equal(m.team.name,'ProofGate','TEAM');
 const teamSource=file(root,'TEAM.md').toString('utf8');const members=[...teamSource.matchAll(/^\| ([^|]+) \| ([^|]+) \|$/gm)].filter(match=>match[1].trim()!=='Member'&&!/^-+$/.test(match[1].trim())).map(match=>({name:match[1].trim(),role:match[2].trim()}));
 requireThat(members.length===4,'TEAM_SOURCE');equal(m.team.members,members,'GENUINE_TEAM');text(m.architecture,'ARCHITECTURE');equal(m.artifacts,PAYLOAD,'ARTIFACT_ALLOWLIST');
 object(m.sources,['team','requirements','contracts','host','model','fixture','policy','feed','cases','historicalCases','phase02Evidence','phase03Verification','phase04Tests','blind','blindEvidence','blindCases','blindTests','proofValidator','deliverySourceCheck','blindIntentionCases','blindIntentionTests','blindIntentionValidator'],'SOURCES');
 equal(m.sources.team,'TEAM.md','TEAM_REFERENCE');equal(m.sources.requirements,'.planning/REQUIREMENTS.md','REQUIREMENTS_REFERENCE');for(const ref of Object.values(m.sources))reference(root,ref);
 object(m.setup,['node','npm','commands','environment','hosted','stores','api','demo'],'SETUP');equal(m.setup.node,'22.23.1','NODE');equal(m.setup.npm,'10.9.8','NPM');
 equal(m.setup.commands,{install:'npm ci --ignore-scripts',build:'npm run build',test:'npm test',start:'npm start',metadata:'node scripts/check-delivery.mjs --stage metadata',content:'node scripts/check-delivery.mjs --stage content',release:'node scripts/check-delivery.mjs --stage release'},'COMMANDS');
 const pkg=json(root,'package.json');equal(pkg.scripts.test,'npm run build && npm run eval:offline','READY_COMMAND');equal(pkg.scripts['eval:offline'],'node --test dist/test/offline/*.test.js','OFFLINE_COMMAND');equal(pkg.scripts['eval:hosted'],'node --test --test-concurrency=1 dist/test/hosted/*.test.js','HOSTED_COMMAND');
 object(m.setup.environment,['PROOFGATE_TOKEN','PROOFGATE_HOST_DB','PROOFGATE_FIXTURE_DB','GOOGLE_APPLICATION_CREDENTIALS','PROOFGATE_ARTIFACT_PYTHON'],'ENVIRONMENT');for(const value of Object.values(m.setup.environment))text(value,'ENVIRONMENT');
 object(m.setup.hosted,['provider','project','location','actor','checker','credentials','funding','offline'],'HOSTED');equal([m.setup.hosted.provider,m.setup.hosted.project,m.setup.hosted.location,m.setup.hosted.actor,m.setup.hosted.checker],['Vertex AI','hackathon-gdg-wroclaw','global','gemini-3.5-flash','gemini-3.5-flash-lite'],'HOSTED');for(const key of ['credentials','funding','offline'])text(m.setup.hosted[key],'HOSTED');
 object(m.setup.stores,['host','fixture','persistentEpoch','reset','recovery'],'STORES');equal([m.setup.stores.host,m.setup.stores.fixture,m.setup.stores.persistentEpoch,m.setup.stores.reset],['.proofgate/host.sqlite','.proofgate/fixture.sqlite',true,false],'STORES');text(m.setup.stores.recovery,'RECOVERY');
 const endpoints=['POST /api/runs','GET /api/runs/:id','GET /api/runs/:id/export','GET /api/policy','PUT /api/policy','GET /api/feed','PUT /api/feed','POST /api/blind/runs','GET /api/blind/runs/:id','GET /api/blind/workspace','PUT /api/blind/private','PUT /api/blind/rules','POST /api/blind/runs/:id/rebind','POST /api/blind/runs/:id/save','GET /api/blind/artifacts/:id','GET /api/blind/runs/:id/export','POST /api/blind/runs/:id/export','POST /api/blind/reset'];
 requireThat(Array.isArray(m.setup.api),'API');equal(m.setup.api.map(item=>item.request),endpoints,'API');for(const endpoint of m.setup.api){object(endpoint,['request','authentication','contract'],'API');equal(endpoint.authentication,'Bearer local gateway token','API_AUTH');text(endpoint.contract,'API_CONTRACT');}
 requireThat(Array.isArray(m.setup.demo)&&m.setup.demo.length>=3,'DEMO');m.setup.demo.forEach(step=>text(step,'DEMO'));
 object(m.licenses,['project','noticePolicy','direct','production'],'LICENSES');equal(m.licenses.project,'Owner decision pending; no project open-source license assigned.','PROJECT_LICENSE');text(m.licenses.noticePolicy,'NOTICES');const inventory=licenseInventory(root);equal(m.licenses.direct,inventory.direct,'DIRECT_LICENSES');equal(m.licenses.production,inventory.production,'PRODUCTION_LICENSES');
 const requirements=phase04RequirementIds(file(root,m.sources.requirements).toString('utf8'));
 requireThat(Array.isArray(m.evidenceMatrix)&&m.evidenceMatrix.length===requirements.length,'MATRIX');requireThat(new Set(m.evidenceMatrix.map(row=>row.id)).size===requirements.length,'MATRIX_IDS');equal([...m.evidenceMatrix.map(row=>row.id)].sort(),[...requirements].sort(),'MATRIX_IDS');
 const finalized=m.delivery?.acceptance===LOCAL_ACCEPTANCE;
 if(finalized)requireThat(localAcceptanceReportsMatch(root),'ACCEPTANCE_REPORTS');
 const rows=(matrix,expected,status)=>{
  requireThat(Array.isArray(matrix)&&matrix.length===expected.length&&new Set(matrix.map(row=>row.id)).size===expected.length,'MATRIX');equal(matrix.map(row=>row.id).sort(),[...expected].sort(),'MATRIX_IDS');
  for(const row of matrix){object(row,['id','status','evidence','limit'],'MATRIX_ROW');equal(row.status,status,'MATRIX_ACCEPTANCE');requireThat(Array.isArray(row.evidence)&&row.evidence.length>0,'MATRIX_EVIDENCE');row.evidence.forEach(ref=>reference(root,ref));text(row.limit,'MATRIX_LIMIT');}
 };
 rows(m.evidenceMatrix,requirements,'accepted_prior_phase');
 const pivot=phase05RequirementIds(file(root,m.sources.requirements).toString('utf8'));
 rows(m.pivotEvidenceMatrix,pivot,finalized?'accepted_current_phase':'pending_root_acceptance');
 object(m.currentAssessment,['status','requirements','acceptanceOwner','publicIntention'],'CURRENT_ASSESSMENT');requireThat(['pending_actual_proof','actual_proof_pending_acceptance','accepted_current_phase'].includes(m.currentAssessment.publicIntention),'INTENTION_STATUS');if(finalized)equal(m.currentAssessment.publicIntention,'accepted_current_phase','INTENTION_STATUS');equal(m.currentAssessment.status,finalized?'accepted_current_phase':'pending_root_acceptance','CURRENT_ASSESSMENT');equal([...m.currentAssessment.requirements].sort(),[...requirements,...pivot].sort(),'CURRENT_REQUIREMENTS');equal(m.currentAssessment.acceptanceOwner,'Root integrator; current Phase05 canonical verification reassesses all 26 obligations.','CURRENT_OWNER');
 object(m.retainedExperiment,['reference','recordHash','fixture','fixtureHash','collectedDate','checkerRunId','comparisonId','observations','arms','conclusion','inventory'],'EXPERIMENT');equal(m.retainedExperiment.reference,m.sources.phase02Evidence,'EXPERIMENT_SOURCE');equal(m.retainedExperiment.recordHash,sha(file(root,m.sources.phase02Evidence)),'EXPERIMENT_HASH');equal(m.retainedExperiment.fixtureHash,sha(file(root,m.sources.historicalCases)),'FIXTURE_HASH');equal(m.retainedExperiment.fixture,m.sources.historicalCases,'FIXTURE_REFERENCE');equal(m.retainedExperiment.collectedDate,'2026-10-03','EXPERIMENT_DATE');
 const history=file(root,m.sources.phase02Evidence).toString('utf8');requireThat(history.includes(m.retainedExperiment.checkerRunId)&&history.includes(m.retainedExperiment.comparisonId),'EXPERIMENT_IDENTITY');equal(m.retainedExperiment.conclusion,'Source exposure changes; no observed downstream causal benefit.','CAUSAL_LIMIT');
 const expected=[['benign','benign','admitted',1350],['active','active','quarantined',931],['quoted','quoted','admitted',774],['paraphrased','active','quarantined',974]];equal(m.retainedExperiment.observations.map(o=>[o.subject,o.classification,o.admission,o.durationMs]),expected,'OBSERVATIONS');m.retainedExperiment.observations.forEach(o=>{object(o,['subject','classification','admission','durationMs','attempts'],'OBSERVATION');equal(o.attempts,1,'OBSERVATION_COUNT');});
 equal(m.retainedExperiment.arms,[{inspection:'on',runId:'220d24d5-bd53-479d-ae44-ebb95d6e344e',actorExposure:'whole advisory excluded',independentEffects:1},{inspection:'off',runId:'9bf72fd5-772c-4655-8ef3-c839aa7a8e1a',actorExposure:'advisory admitted, 117 characters',independentEffects:1}],'ARMS');
 const historicalHashes=[...history.matchAll(/^- `([^`]+)` — SHA-256 `([a-f0-9]{64})`/gm)].map(match=>({path:match[1],sha256:match[2]}));equal(m.retainedExperiment.inventory,historicalHashes,'HISTORICAL_HASHES');
 requireThat(Array.isArray(m.limitations)&&m.limitations.length>=8,'LIMITATIONS');for(const item of m.limitations)text(item,'LIMITATION');const limits=m.limitations.join(' ').toLowerCase();for(const phrase of ['synthetic','preparation-only','no observed downstream causal benefit','unknown','unpriced','hosted-only','conceptual','no reset','offline','restart'])requireThat(limits.includes(phrase),'MISSING_LIMIT');
 object(m.demo,['scriptReference','rehearsalReference','backupReference','backupMode','newSaveFromBackup'],'DEMO_REFERENCES');equal(m.demo,{scriptReference:'pitch.md',rehearsalReference:'rehearsal.md',backupReference:'backup.mp4',backupMode:'paced_real_capture_sequence',newSaveFromBackup:false},'DEMO_REFERENCES');
 object(m.delivery,['workingDemoTarget','rehearsalWindow','finalTarget','externalActions','access','acceptance'],'DELIVERY');equal(m.delivery.externalActions,'Not authorized: publication, deployment, submission, messaging and Git push.','EXTERNAL_BOUNDARY');requireThat(finalized||m.delivery.acceptance===PENDING_ACCEPTANCE,'ACCEPTANCE');equal(m.delivery.access,{teamContact:'Owner-managed private fields; no email or Discord invented.',judgeAccess:'Pending owner decision; no external deployment or organizer access established.'},'EXTERNAL_ACCESS');for(const key of ['workingDemoTarget','rehearsalWindow','finalTarget'])text(m.delivery[key],'TIMELINE');return m;
}
const pythonInspection=String.raw`
import sys, json, hashlib, os, stat, tempfile, zipfile, re, subprocess, shutil
import xml.etree.ElementTree as ET
from pathlib import Path
from pypdf import PdfReader
from PIL import Image
directory=Path(sys.argv[1]); stage=sys.argv[2]; payload=json.loads(sys.argv[3])
reader=PdfReader(directory/'presentation.pdf')
assert not reader.is_encrypted and 1 <= len(reader.pages) <= 10, 'PDF_PAGE_COUNT'
pages=[]
for page in reader.pages:
 assert float(page.mediabox.width)>float(page.mediabox.height), 'PDF_LANDSCAPE'
 text=page.extract_text() or ''; assert len(text.strip())>20, 'PDF_TEXT'; pages.append(text)
assert 'ProofGate' in pages[0], 'PDF_TITLE'
with Image.open(directory/'workbench.png') as image:
 assert image.format=='PNG' and image.width>=600 and image.height>=400, 'SCREENSHOT'
 image.verify()
with Image.open(directory/'workbench.png') as image: width,height=image.size
with zipfile.ZipFile(directory/'presentation.pptx') as deck:
 names=deck.namelist(); assert len(names)==len(set(names)), 'PPTX_DUPLICATE'
 assert all(n in names for n in ['[Content_Types].xml','ppt/presentation.xml']), 'PPTX_STRUCTURE'
 assert sum(i.file_size for i in deck.infolist())<=32*1024*1024, 'PPTX_BOUND'
 slides=sorted(n for n in names if re.fullmatch(r'ppt/slides/slide[0-9]+.xml',n)); assert len(slides)==len(pages), 'PPTX_SLIDE_COUNT'
 for name in names:
  assert not name.startswith('/') and '..' not in Path(name).parts, 'PPTX_PATH'
  if name.endswith('.xml') or name.endswith('.rels'): ET.fromstring(deck.read(name))
 decktext='\n'.join(''.join(ET.fromstring(deck.read(n)).itertext()) for n in slides)
 assert 'ProofGate: Public Plans, Private Results' in decktext, 'PPTX_TITLE'
 assert all('http://schemas.openxmlformats.org/officeDocument/2006/relationships/image' not in deck.read(n).decode() or 'TargetMode="External"' not in deck.read(n).decode() for n in names if n.endswith('.rels')), 'PPTX_EXTERNAL_IMAGE'
probe=shutil.which('ffprobe'); assert probe, 'MEDIA_TOOLING_REQUIRED'
media=json.loads(subprocess.run([probe,'-v','error','-select_streams','v:0','-show_entries','stream=codec_name,width,height:format=duration','-of','json',str(directory/'backup.mp4')],check=True,capture_output=True,text=True,timeout=10).stdout)
assert len(media['streams'])==1 and media['streams'][0]['codec_name']=='h264', 'BACKUP_VIDEO'
video=media['streams'][0]
result={'pages':len(pages),'text':'\n'.join(pages)+'\n'+decktext,'width':width,'height':height,'backup':{'width':video['width'],'height':video['height'],'seconds':float(media['format']['duration'])}}
if stage=='release':
 expected=payload+['SHA256SUMS']
 with zipfile.ZipFile(directory/'proofgate.zip') as archive, tempfile.TemporaryDirectory(prefix='proofgate-delivery-unzip-') as temporary:
  entries=archive.infolist(); assert sorted(i.filename for i in entries)==sorted(expected), 'ZIP_ENTRIES'
  assert sum(i.file_size for i in entries)<=32*1024*1024, 'ZIP_BOUND'
  for entry in entries:
   assert entry.filename in expected and not entry.is_dir() and not stat.S_ISLNK(entry.external_attr>>16) and not entry.flag_bits&1, 'ZIP_UNSAFE'
   data=archive.read(entry); assert data==(directory/entry.filename).read_bytes(), 'ZIP_CONTENT'
   extracted=Path(temporary)/entry.filename; extracted.write_bytes(data)
   assert hashlib.sha256(extracted.read_bytes()).digest()==hashlib.sha256((directory/entry.filename).read_bytes()).digest(), 'ZIP_HASH'
print(json.dumps(result))
`;
export function inspectArtifacts(directory,stage){
 const python=process.env.PROOFGATE_ARTIFACT_PYTHON;requireThat(python&&isAbsolute(python)&&existsSync(python),'ARTIFACT_TOOLING_REQUIRED');
 const r=spawnSync(python,['-c',pythonInspection,directory,stage,JSON.stringify(PAYLOAD)],{encoding:'utf8',timeout:20000,maxBuffer:1024*1024});requireThat(!r.error&&r.status===0,'ARTIFACT_INSPECTION_FAILED');return JSON.parse(r.stdout);
}
export function sourceSnapshot(root){return Object.fromEntries([...CURRENT_SOURCE_FILES].sort().map(name=>[name,sha(file(root,name))]));}
function baselineEvidence(e,m,EvidenceExportSchema){
 object(e,['schemaVersion','source','canonicalExports','retainedExperiment','captures','rehearsal'],'BASELINE_ENVELOPE');equal(e.schemaVersion,'proofgate-delivery-evidence-1','BASELINE_VERSION');object(e.source,['revision','collectedAt'],'BASELINE_SOURCE');requireThat(/^[a-f0-9]{40}$/.test(e.source.revision),'REVISION');date(e.source.collectedAt);equal(e.retainedExperiment,m.retainedExperiment,'RETAINED_EXPERIMENT');
 requireThat(Array.isArray(e.canonicalExports)&&e.canonicalExports.length>=1&&e.canonicalExports.length<=3,'BASELINE_COUNT');const ids=new Set(),epochs=new Set();let saved=false;
 for(const value of e.canonicalExports){const parsed=EvidenceExportSchema.safeParse(value);requireThat(parsed.success,'BASELINE_EXPORT');const x=parsed.data;equal(x.run.mode,'live','BASELINE_MODE');requireThat(!ids.has(x.run.runId),'DUPLICATE_RUN');ids.add(x.run.runId);epochs.add(x.ledger.epochId);equal(x.policy.hash,sha(JSON.stringify(x.policy.snapshot)),'POLICY_HASH');equal(x.policy.snapshot.feedVersion,x.feed.version,'FEED_IDENTITY');
  requireThat(x.independentEffects.status==='observed'&&x.independentEffects.count===x.independentEffects.effects.length,'INDEPENDENT_EFFECTS');
  if(x.run.state==='succeeded'){requireThat(x.draft&&x.independentEffects.count===1&&x.independentEffects.matchesCanonicalDraft===true&&x.independentEffects.hostAcknowledged,'SAVE_RECONCILIATION');equal(x.draft.contentHash,x.independentEffects.effects[0].contentHash,'DRAFT_HASH');saved=true;}
  equal(x.measurements.mode,x.run.mode,'MEASUREMENT_MODE');equal(x.measurements.workload.events,x.events.length,'EVENT_COUNT');equal(x.measurements.workload.attempts,x.attempts.length,'ATTEMPT_COUNT');
  if(x.measurements.status==='measured')requireThat(x.measurements.hardware&&x.measurements.spans.length>0&&measurementAggregatesMatch(x.measurements),'MEASUREMENT_AGGREGATE');else requireThat(x.measurements.spans.length===0&&x.measurements.aggregates.length===0&&x.measurements.hardware===null,'UNAVAILABLE_MEASUREMENT');
 }
 requireThat(saved&&epochs.size===1,'BASELINE_USEFUL_SAME_EPOCH');object(e.captures,['desktop','tablet','mobile'],'BASELINE_CAPTURES');for(const c of Object.values(e.captures)){object(c,['sha256','width','height'],'CAPTURE');hash(c.sha256);requireThat(Number.isInteger(c.width)&&c.width>0&&Number.isInteger(c.height)&&c.height>0,'CAPTURE_DIMENSIONS');}
 const r=e.rehearsal;object(r,['observedAt','sourceRevision','epochId','runIds','checks','backup'],'BASELINE_REHEARSAL');date(r.observedAt);equal(r.sourceRevision,e.source.revision,'BASELINE_REVISION');equal(r.epochId,[...epochs][0],'BASELINE_EPOCH');equal([...r.runIds].sort(),[...ids].sort(),'BASELINE_RUNS');requireThat(Array.isArray(r.checks),'BROWSER_CHECKS');equal(r.checks.map(c=>c.id).sort(),[...REQUIRED_CHECKS].sort(),'BROWSER_CHECKS');for(const c of r.checks){object(c,['id','result','details'],'BROWSER_CHECK');equal(c.result,'passed','BROWSER_RESULT');text(c.details,'BROWSER_DETAILS');}object(r.backup,['mode','recordedAt','establishesNewSave'],'BASELINE_BACKUP');equal(r.backup.mode,'recorded','BASELINE_BACKUP');date(r.backup.recordedAt);equal(r.backup.establishesNewSave,false,'BACKUP_SAVE');return [...epochs][0];
}
export function validateCurrentWalkthrough(value,intention,epoch){
 object(value,['record','allocation','recordSha256','captureHashes'],'CURRENT_WALKTHROUGH');const w=value.record,a=value.allocation;
 hash(value.recordSha256);equal(value.recordSha256,sha(JSON.stringify(w,null,2)+'\n'),'CURRENT_WALKTHROUGH_HASH');
 object(a,['createdAt','purpose','ceilings','baseline','wrapper'],'CURRENT_ALLOCATION');date(a.createdAt);text(a.purpose,'CURRENT_ALLOCATION');equal(a.ceilings,{newToolAttempts:4,newCredits:1310720,newModelAttempts:0,newAuthAttempts:0},'CURRENT_ALLOCATION');equal(a.wrapper,'.proofgate/phase05-delivery-input/current-ui-host.mjs','CURRENT_ALLOCATION');
 const counters=c=>{object(c,['ledger','unknowns','provider'],'CURRENT_COUNTERS');object(c.ledger,['id','credits','calls'],'CURRENT_LEDGER');equal(c.ledger.id,epoch,'CURRENT_EPOCH');for(const n of [c.ledger.credits,c.ledger.calls,c.unknowns,c.provider])requireThat(Number.isSafeInteger(n)&&n>=0,'CURRENT_COUNTERS');};counters(a.baseline);
 object(w,['schemaVersion','status','error','kind','humanRehearsal','composition','runId','startedAt','endedAt','elapsedMs','steps','before','after','newAttempts','newCredits','newProviderAttempts','limitations'],'CURRENT_WALKTHROUGH_RECORD');equal(w.schemaVersion,'proofgate-current-walkthrough-1','CURRENT_WALKTHROUGH_VERSION');equal(w.status,'complete','CURRENT_WALKTHROUGH_STATUS');equal(w.error,null,'CURRENT_WALKTHROUGH_STATUS');equal(w.kind,'automated_browser_walkthrough','CURRENT_WALKTHROUGH_KIND');equal(w.humanRehearsal,false,'CURRENT_HUMAN_REHEARSAL');equal(w.composition,'retained_actual_hosted','CURRENT_COMPOSITION');requireThat(intention.status==='complete'&&intention.proof,'CURRENT_ACTUAL_METHOD_REQUIRED');equal(w.runId,intention.proof.composition.run.runId,'CURRENT_RUN');date(w.startedAt);date(w.endedAt);equal(w.elapsedMs,Date.parse(w.endedAt)-Date.parse(w.startedAt),'CURRENT_TIMING');requireThat(w.elapsedMs>0&&Date.parse(a.createdAt)<=Date.parse(w.startedAt)+10,'CURRENT_ALLOCATION_TIME');
 counters(w.before);counters(w.after);equal(w.before,a.baseline,'CURRENT_BASELINE');equal(w.before.ledger,intention.proof.ledgerAfter,'CURRENT_PROOF_LEDGER');equal(w.after.unknowns,w.before.unknowns,'CURRENT_UNKNOWN');equal(w.after.provider,w.before.provider,'CURRENT_PROVIDER_DELTA');equal(w.newProviderAttempts,0,'CURRENT_PROVIDER_DELTA');equal(w.newAttempts,w.after.ledger.calls-w.before.ledger.calls,'CURRENT_ATTEMPTS');equal(w.newCredits,w.after.ledger.credits-w.before.ledger.credits,'CURRENT_CREDITS');equal(w.newAttempts,4,'CURRENT_ATTEMPTS');requireThat(w.newCredits>0&&w.newCredits<=a.ceilings.newCredits,'CURRENT_CREDITS');
 requireThat(Array.isArray(w.steps)&&w.steps.length===7,'CURRENT_STEPS');requireThat(Array.isArray(value.captureHashes)&&value.captureHashes.length===7,'CURRENT_CAPTURES');value.captureHashes.forEach(hash);let previous=-1;
 for(const [i,step] of w.steps.entries()){
  object(step,['name','elapsedMs','path','status','counters'],'CURRENT_STEP');text(step.name,'CURRENT_STEP');requireThat(Number.isFinite(step.elapsedMs)&&step.elapsedMs>=previous&&step.elapsedMs<=w.elapsedMs,'CURRENT_TIMING');previous=step.elapsedMs;equal(step.path,`.proofgate/phase05-delivery-input/current-backup-step-${i+1}.png`,'CURRENT_CAPTURE_REFERENCE');counters(step.counters);equal(step.counters,i===6?w.after:w.before,'CURRENT_STEP_COUNTERS');
  object(step.status,['busy','delta','draft','readback','refusal','result','save','saveState','state'],'CURRENT_STATUS');for(const val of Object.values(step.status))requireThat(typeof val==='string','CURRENT_STATUS');equal(step.status.busy,'','CURRENT_BUSY');
 }
 const s=w.steps.map(x=>x.status);requireThat(s[0].result.includes('$130.00')&&s[0].result.includes('Near Supplier')&&s[0].result.includes('Middle Supplier'),'CURRENT_INITIAL_RESULT');requireThat(s[1].draft.includes('Unapplied record edits')&&s[1].saveState==='stale','CURRENT_DRAFT_GUARD');requireThat(s[2].result.includes('No current useful brief')&&s[2].state.includes('stale'),'CURRENT_APPLIED_GUARD');requireThat(s[3].result.includes('$1200.00')&&s[4].result.includes('$1060.00')&&s[4].result.includes('Middle Supplier')&&s[4].result.includes('Large Supplier'),'CURRENT_CHANGED_RESULT');
 for(const i of [0,3,4,5,6])requireThat(s[i].delta.includes('0 new provider attempts')&&s[i].delta.includes('unchanged'),'CURRENT_REBIND_DELTA');requireThat(s[5].refusal.includes('0 sink effects')&&s[6].readback.includes('Exact authenticated artifact read-back')&&s[6].save==='1 independently confirmed internal save'&&s[6].saveState==='confirmed','CURRENT_INDEPENDENT_SAVE');requireThat(Array.isArray(w.limitations)&&w.limitations.length>=3,'CURRENT_LIMITATIONS');w.limitations.forEach(x=>text(x,'CURRENT_LIMITATIONS'));return {newAttempts:w.newAttempts,newCredits:w.newCredits,newProviderAttempts:w.newProviderAttempts,epochId:epoch};
}
export async function validateEvidenceEnvelope(e,m,{root=process.cwd(),verifySource=true,screenshotBytes,backupBytes}={}){
 safeData(e);object(e,['schemaVersion','source','retainedBaseline','retainedExperiment','pivotProof','publicIntention','walkthroughs','currentWalkthrough','accounting','captures','browser','backup'],'EVIDENCE_ENVELOPE');equal(e.schemaVersion,'proofgate-delivery-evidence-3','EVIDENCE_VERSION');
 object(e.source,['scope','revision','collectedAt','coveredFiles'],'SOURCE_IDENTITY');requireThat(['provisional_worktree','frozen_local_source'].includes(e.source.scope),'SOURCE_SCOPE');requireThat(/^[a-f0-9]{40}$/.test(e.source.revision),'REVISION');date(e.source.collectedAt);object(e.source.coveredFiles,CURRENT_SOURCE_FILES,'CURRENT_SOURCE_FILES');Object.values(e.source.coveredFiles).forEach(hash);if(verifySource)equal(e.source.coveredFiles,sourceSnapshot(root),'CURRENT_SOURCE_STALE');
 const contracts=join(root,'dist/src/contracts.js');requireThat(existsSync(contracts),'BUILD_REQUIRED');const {EvidenceExportSchema}=await import(pathToFileURL(contracts).href);
 equal(e.retainedExperiment,m.retainedExperiment,'RETAINED_EXPERIMENT');const baselineEpoch=baselineEvidence(e.retainedBaseline,m,EvidenceExportSchema);
 const q=e.pivotProof;object(q,['sourceRevision','sha256','originalFileSha256','fixture','proof'],'PIVOT_PROOF');hash(q.originalFileSha256);equal(q.originalFileSha256,sha(JSON.stringify(q.proof,null,2)+'\n'),'ORIGINAL_PROOF_HASH');requireThat(/^[a-f0-9]{40}$/.test(q.sourceRevision),'PIVOT_REVISION');hash(q.sha256);equal(q.sha256,sha(JSON.stringify(q.proof)),'PIVOT_HASH');equal(q.fixture,json(root,'test/blind-cases.json'),'PIVOT_FIXTURE');
 const {validateProof}=await import(pathToFileURL(join(root,'scripts/check-blind-proof.mjs')).href);let proof;try{proof=validateProof(q.proof,q.proof.approval.hashes,q.fixture);}catch{fail('PIVOT_PROOF_INVALID');}requireThat(proof.ok,'PIVOT_PROOF_INVALID');equal(proof.epochId,baselineEpoch,'RETAINED_EPOCH');
 const intention=e.publicIntention;object(intention,['status','proof','fixture','accounting'],'INTENTION');requireThat(['pending','complete'].includes(intention.status),'INTENTION_STATUS');
 let intent=null;
 if(intention.status==='pending'){equal(intention.proof,null,'PENDING_INTENTION');equal(intention.fixture,null,'PENDING_INTENTION');equal(intention.accounting,null,'PENDING_INTENTION');equal(m.currentAssessment.publicIntention,'pending_actual_proof','INTENTION_STATUS');}
 else{requireThat(intention.proof&&intention.fixture,'INTENTION_REQUIRED');equal(intention.fixture,json(root,'test/blind-intent-case.json'),'INTENTION_FIXTURE');const {validateIntentProof}=await import(pathToFileURL(join(root,'scripts/check-blind-intent-proof.mjs')).href);try{intent=validateIntentProof(intention.proof,intention.proof.approval.hashes,intention.fixture);}catch{fail('INTENTION_PROOF_INVALID');}requireThat(intent.ok&&intent.epochId===proof.epochId,'INTENTION_PROOF_INVALID');equal(intention.proof.approval.originalProofHash,q.originalFileSha256,'INTENTION_ORIGINAL_PROOF');equal(intention.proof.approval.preparedRecipes,q.proof.objectives.map(o=>o.rebind.before.recipe),'INTENTION_PREPARED_CONTRAST');requireThat(m.currentAssessment.publicIntention!=='pending_actual_proof','INTENTION_STATUS');
  const ia=intention.accounting;object(ia,['allocation','actual','checkpoint'],'INTENTION_ACCOUNTING');equal(ia.allocation,{newAttempts:12,newCredits:4325376},'INTENTION_ALLOCATION');equal(ia.allocation,intention.proof.approval.ceilings,'INTENTION_ALLOCATION');object(ia.actual,['newAttempts','newCredits','modelAttempts','authAttempts','toolAttempts'],'INTENTION_ACCOUNTING');equal(ia.actual.newAttempts,intent.newAttempts,'INTENTION_ACCOUNTING');equal(ia.actual.newCredits,intent.newCredits,'INTENTION_ACCOUNTING');equal(ia.actual.modelAttempts,intention.proof.newAttempts.filter(a=>['actor','checker'].includes(a.kind)).length,'INTENTION_MODEL_ATTEMPTS');equal(ia.actual.authAttempts,intention.proof.newAttempts.filter(a=>a.kind==='auth').length,'INTENTION_AUTH_ATTEMPTS');equal(ia.actual.toolAttempts,intention.proof.newAttempts.filter(a=>a.kind==='tool').length,'INTENTION_TOOL_ATTEMPTS');equal(ia.actual.newAttempts,ia.actual.modelAttempts+ia.actual.authAttempts+ia.actual.toolAttempts,'INTENTION_ACCOUNTING');
  const ic=ia.checkpoint;object(ic,['observedAt','scope','epochId','callsUsed','creditsReserved','unknowns','activeRuns'],'INTENTION_CHECKPOINT');date(ic.observedAt);equal(ic.scope,'dated_checkpoint','INTENTION_CHECKPOINT');equal(ic.epochId,intent.epochId,'INTENTION_EPOCH');equal(ic.callsUsed,intention.proof.ledgerAfter.calls,'INTENTION_LEDGER');equal(ic.creditsReserved,intention.proof.ledgerAfter.credits,'INTENTION_LEDGER');equal(ic.unknowns,intention.proof.unknownsAfter,'INTENTION_UNKNOWN');equal(ic.activeRuns,0,'INTENTION_ACTIVE_RUNS');
 }
 requireThat(Array.isArray(e.walkthroughs)&&e.walkthroughs.length===3,'WALKTHROUGH_COUNT');const rounds=new Set();
 for(const w of e.walkthroughs){object(w,['kind','humanRehearsal','round','startedAt','finishedAt','elapsedMs','runId','composition','quoteCents','steps','body'],'WALKTHROUGH');equal(w.kind,'automated_browser_walkthrough','WALKTHROUGH_KIND');equal(w.humanRehearsal,false,'HUMAN_REHEARSAL');requireThat(Number.isInteger(w.round)&&w.round>=1&&w.round<=3&&!rounds.has(w.round),'WALKTHROUGH_ROUND');rounds.add(w.round);date(w.startedAt);date(w.finishedAt);equal(Date.parse(w.finishedAt)-Date.parse(w.startedAt),w.elapsedMs,'WALKTHROUGH_TIMING');requireThat(w.elapsedMs>0&&q.proof.objectives.some(o=>o.rebind.before.run.runId===w.runId),'WALKTHROUGH_RUN');equal(w.composition,'retained actual hosted composition; not recomputed during walkthrough','WALKTHROUGH_COMPOSITION');requireThat(Number.isInteger(w.quoteCents)&&w.quoteCents>=0,'WALKTHROUGH_QUOTE');requireThat(Array.isArray(w.steps)&&w.steps.length===7,'WALKTHROUGH_STEPS');let previous=-1;
  for(const step of w.steps){object(step,['name','elapsedMs','status'],'WALKTHROUGH_STEP');text(step.name,'WALKTHROUGH_STEP');requireThat(Number.isFinite(step.elapsedMs)&&step.elapsedMs>=previous&&step.elapsedMs<=w.elapsedMs,'WALKTHROUGH_TIMING');previous=step.elapsedMs;object(step.status,['busy','delta','readback','refusal','save','state'],'WALKTHROUGH_STATUS');equal(step.status.busy,false,'WALKTHROUGH_BUSY');for(const key of ['delta','readback','refusal','save','state'])requireThat(typeof step.status[key]==='string','WALKTHROUGH_STATUS');}
  requireThat(w.steps[4].status.delta.includes('0 new provider attempts')&&w.steps[4].status.delta.includes('unchanged')&&w.steps[5].status.refusal.includes('0 sink effects')&&w.steps[6].status.readback.includes('Exact authenticated artifact read-back')&&w.steps[6].status.save==='1 independently confirmed internal save','WALKTHROUGH_OUTCOME');object(w.body,['connection','counts','ledger','scrollOverflow','text'],'WALKTHROUGH_BODY');equal(w.body.scrollOverflow,false,'WALKTHROUGH_OVERFLOW');for(const key of ['connection','counts','ledger','text'])text(w.body[key],'WALKTHROUGH_BODY');
 }
 const current=validateCurrentWalkthrough(e.currentWalkthrough,intention,proof.epochId);
 const a=e.accounting;object(a,['scope','proofAttempts','proofCredits','rehearsalAttempts','rehearsalCredits','totalNewAttempts','totalNewCredits','combinedForecast','forecastExceeded','checkpoint','limits'],'ACCOUNTING');equal(a.scope,'original_proof_and_three_later_walkthroughs','ACCOUNTING_SCOPE');equal(a.proofAttempts,proof.newAttempts,'PROOF_ACCOUNTING');equal(a.proofCredits,proof.newCredits,'PROOF_ACCOUNTING');equal(a.rehearsalAttempts,12,'WALKTHROUGH_ACCOUNTING');equal(a.rehearsalCredits,3150704,'WALKTHROUGH_ACCOUNTING');equal(a.totalNewAttempts,a.proofAttempts+a.rehearsalAttempts,'TOTAL_ACCOUNTING');equal(a.totalNewCredits,a.proofCredits+a.rehearsalCredits,'TOTAL_ACCOUNTING');equal(a.combinedForecast,32,'FORECAST');equal(a.forecastExceeded,a.totalNewAttempts>a.combinedForecast,'FORECAST_DISCLOSURE');
 const c=a.checkpoint;object(c,['observedAt','scope','epochId','callsUsed','creditsReserved','unknownsRetained','retainedAttemptsHash','unknownsReplayed'],'ACCOUNTING_CHECKPOINT');date(c.observedAt);equal(c.scope,'dated_checkpoint','ACCOUNTING_SCOPE');equal(c.epochId,proof.epochId,'ACCOUNTING_EPOCH');requireThat(Number.isInteger(c.callsUsed)&&c.callsUsed>=q.proof.ledgerAfter.calls+a.rehearsalAttempts&&Number.isInteger(c.creditsReserved)&&c.creditsReserved>=q.proof.ledgerAfter.credits+a.rehearsalCredits,'CHECKPOINT_ACCOUNTING');equal(c.unknownsRetained,q.proof.unknownsAfter,'UNKNOWN_ACCOUNTING');equal(c.retainedAttemptsHash,q.proof.retainedAttemptsHashAfter,'RETAINED_ACCOUNTING');equal(c.unknownsReplayed,false,'UNKNOWN_REPLAY');object(a.limits,['calls','credits'],'ACCOUNTING_LIMITS');equal(a.limits,{calls:q.proof.approval.policy.limits.calls,credits:q.proof.approval.policy.limits.credits},'ACCOUNTING_LIMITS');requireThat(c.callsUsed<=a.limits.calls&&c.creditsReserved<=a.limits.credits,'CHECKPOINT_LIMITS');
 object(e.captures,['kind','capturedAt','sourceRevision','desktop','captureSource','retainedPrevious'],'CAPTURES');equal(e.captures.kind,'actual_authenticated_retained_run_get_only','CAPTURE_KIND');date(e.captures.capturedAt);
 const cs=e.captures.captureSource;object(cs,['scope','revision','uiHashes','runId','composition','getOnly','establishesNewSave'],'CAPTURE_SOURCE');requireThat(['provisional_current_worktree','frozen_local_source'].includes(cs.scope),'CAPTURE_SOURCE');equal(e.captures.sourceRevision,cs.revision,'CAPTURE_REVISION');if(cs.scope==='provisional_current_worktree')equal(cs.revision,null,'CAPTURE_REVISION');else equal(cs.revision,e.source.revision,'CAPTURE_REVISION');equal(cs.runId,intention.proof.composition.run.runId,'CAPTURE_RUN');equal(cs.composition,'retained_actual_hosted','CAPTURE_COMPOSITION');equal(cs.getOnly,true,'CAPTURE_GET_ONLY');equal(cs.establishesNewSave,false,'CAPTURE_SAVE');object(cs.uiHashes,['public/app.js','public/index.html','public/styles.css'],'CAPTURE_SOURCE');Object.values(cs.uiHashes).forEach(hash);if(verifySource)for(const [name,value]of Object.entries(cs.uiHashes))equal(value,e.source.coveredFiles[name],'CAPTURE_SOURCE_STALE');
 const pc=e.captures.retainedPrevious;object(pc,['kind','capturedAt','sourceRevision','desktop'],'PREVIOUS_CAPTURE');equal(pc.kind,'actual_retained_ui_capture','PREVIOUS_CAPTURE');date(pc.capturedAt);equal(pc.sourceRevision,q.sourceRevision,'PREVIOUS_CAPTURE');object(pc.desktop,['sha256','width','height'],'PREVIOUS_CAPTURE');hash(pc.desktop.sha256);requireThat(Number.isInteger(pc.desktop.width)&&pc.desktop.width>0&&Number.isInteger(pc.desktop.height)&&pc.desktop.height>0,'PREVIOUS_CAPTURE');
 object(e.captures.desktop,['sha256','width','height'],'CAPTURE');hash(e.captures.desktop.sha256);requireThat(Number.isInteger(e.captures.desktop.width)&&e.captures.desktop.width>=600&&Number.isInteger(e.captures.desktop.height)&&e.captures.desktop.height>=400,'CAPTURE_DIMENSIONS');if(screenshotBytes)equal(e.captures.desktop.sha256,sha(screenshotBytes),'CAPTURE_HASH');
 object(e.browser,['capturedAt','sourceRevision','viewports','assertions','limitations'],'BROWSER');date(e.browser.capturedAt);requireThat(e.browser.sourceRevision===q.sourceRevision||e.browser.sourceRevision===e.source.revision,'BROWSER_REVISION');requireThat(Array.isArray(e.browser.viewports)&&e.browser.viewports.length===3,'VIEWPORTS');equal(e.browser.viewports.map(v=>v.width).sort((a,b)=>a-b),[390,768,1440],'VIEWPORTS');for(const v of e.browser.viewports){object(v,['label','width','scrollWidth','horizontalOverflow','controlsLabeled','tokenBlank','save'],'VIEWPORT');equal(v.horizontalOverflow,false,'VIEWPORT_OVERFLOW');equal(v.scrollWidth,v.width,'VIEWPORT_OVERFLOW');equal(v.controlsLabeled,true,'VIEWPORT_LABELS');equal(v.tokenBlank,true,'CAPTURE_TOKEN');text(v.save,'VIEWPORT_SAVE');}
 object(e.browser.assertions,['passed','total','consoleErrors','failedRequests','resolution'],'BROWSER_ASSERTIONS');for(const key of ['passed','total','consoleErrors','failedRequests'])requireThat(Number.isInteger(e.browser.assertions[key])&&e.browser.assertions[key]>=0,'BROWSER_ASSERTIONS');requireThat(e.browser.assertions.passed<=e.browser.assertions.total,'BROWSER_ASSERTIONS');object(e.browser.assertions.resolution,['status','details','failedNetwork'],'BROWSER_RESOLUTION');requireThat(['pending','explained','resolved'].includes(e.browser.assertions.resolution.status),'BROWSER_RESOLUTION');text(e.browser.assertions.resolution.details,'BROWSER_RESOLUTION');
 const network=e.browser.assertions.resolution.failedNetwork;
 if(e.browser.assertions.resolution.status==='pending')equal(network,null,'BROWSER_RESOLUTION');
 else if(e.browser.assertions.resolution.status==='explained'){
  equal([e.browser.assertions.passed,e.browser.assertions.total,e.browser.assertions.consoleErrors,e.browser.assertions.failedRequests],[3,4,0,1],'RETAINED_BROWSER_ASSERTIONS');object(network,['count','entries'],'FAILED_NETWORK');requireThat(Array.isArray(network.entries),'FAILED_NETWORK');equal(network.count,network.entries.length,'FAILED_NETWORK');equal(network.count,e.browser.assertions.failedRequests,'FAILED_NETWORK');
  for(const n of network.entries){object(n,['failed','failureText','method','resourceType','responseBody','status','timestamp','url'],'FAILED_NETWORK_ENTRY');equal(n.failed,true,'FAILED_NETWORK_ENTRY');equal(n.method,'GET','FAILED_NETWORK_ENTRY');equal(n.status,404,'FAILED_NETWORK_ENTRY');equal(n.resourceType,'Other','FAILED_NETWORK_ENTRY');equal(n.url,'http://127.0.0.1:3100/favicon.ico','FAILED_NETWORK_ENTRY');equal(n.failureText,'','FAILED_NETWORK_ENTRY');equal(n.responseBody,'','FAILED_NETWORK_ENTRY');requireThat(Number.isFinite(n.timestamp)&&n.timestamp>=0,'FAILED_NETWORK_ENTRY');}
 }else{equal(network,null,'BROWSER_RESOLUTION');equal([e.browser.assertions.passed,e.browser.assertions.total,e.browser.assertions.consoleErrors,e.browser.assertions.failedRequests],[4,4,0,0],'RESOLVED_BROWSER_ASSERTIONS');}
 requireThat(Array.isArray(e.browser.limitations)&&e.browser.limitations.length>0,'BROWSER_LIMITATIONS');e.browser.limitations.forEach(x=>text(x,'BROWSER_LIMITATIONS'));
 const b=e.backup;object(b,['scope','kind','sha256','capturedAt','sourceRevision','seconds','width','height','captureCount','captureHashes','captureSource','continuousRecording','establishesNewSave','inspection','retainedPrevious'],'BACKUP');equal(b.scope,'current_intention_walkthrough','BACKUP_SCOPE');equal(b.captureHashes,e.currentWalkthrough.captureHashes,'BACKUP_CAPTURE_HASHES');equal(b.capturedAt,e.currentWalkthrough.record.endedAt,'BACKUP_CAPTURE_TIME');object(b.retainedPrevious,['scope','sha256','seconds','capturedAt','sourceRevision','inspectedAt','framesChecked'],'PREVIOUS_BACKUP');equal(b.retainedPrevious.scope,'recorded_alternate_prepared_workflow','PREVIOUS_BACKUP');hash(b.retainedPrevious.sha256);date(b.retainedPrevious.capturedAt);date(b.retainedPrevious.inspectedAt);equal(b.retainedPrevious.framesChecked,7,'PREVIOUS_BACKUP');equal(b.retainedPrevious.seconds,49,'PREVIOUS_BACKUP');equal(b.kind,'paced_real_ui_capture_sequence','BACKUP_KIND');hash(b.sha256);if(backupBytes)equal(b.sha256,sha(backupBytes),'BACKUP_HASH');date(b.capturedAt);object(b.captureSource,['scope','revision','uiHashes','runId'],'BACKUP_CAPTURE_SOURCE');equal(b.captureSource.scope,'provisional_current_worktree','BACKUP_CAPTURE_SOURCE');equal(b.captureSource.revision,null,'BACKUP_CAPTURE_SOURCE');equal(b.sourceRevision,b.captureSource.revision,'BACKUP_REVISION');equal(b.captureSource.runId,intention.proof.composition.run.runId,'BACKUP_CAPTURE_RUN');object(b.captureSource.uiHashes,['public/app.js','public/index.html','public/styles.css'],'BACKUP_CAPTURE_SOURCE');Object.values(b.captureSource.uiHashes).forEach(hash);requireThat(Number.isFinite(b.seconds)&&b.seconds>0&&b.seconds<=300&&Number.isInteger(b.width)&&b.width>0&&Number.isInteger(b.height)&&b.height>0&&Number.isInteger(b.captureCount)&&b.captureCount===7,'BACKUP_DIMENSIONS');equal(b.continuousRecording,false,'BACKUP_RECORDING');equal(b.establishesNewSave,false,'BACKUP_SAVE');object(b.inspection,['status','inspectedAt','framesChecked'],'BACKUP_INSPECTION');requireThat(['pending','inspected'].includes(b.inspection.status),'BACKUP_INSPECTION');if(b.inspection.status==='pending'){equal(b.inspection.inspectedAt,null,'BACKUP_INSPECTION');equal(b.inspection.framesChecked,0,'BACKUP_INSPECTION');}else{date(b.inspection.inspectedAt);requireThat(Number.isInteger(b.inspection.framesChecked)&&b.inspection.framesChecked>=b.captureCount,'BACKUP_INSPECTION');}
 return {proof,intent,current};
}
async function content(root,directory,m,stage){
 for(const name of PAYLOAD)file(directory,name,['.pdf','.pptx'].some(ext=>name.endsWith(ext))?16*1024*1024:4*1024*1024);
 const svg=file(directory,'architecture.svg').toString('utf8');safeText(svg);requireThat(/<svg\b/.test(svg)&&!/<(?:script|foreignObject|image)\b|\bon\w+\s*=|(?:href|url)\s*[=(]/i.test(svg),'UNSAFE_SVG');for(const label of ['host','checker','actor','MCP','SQLite','reconciliation','private','public'])requireThat(svg.toLowerCase().includes(label.toLowerCase()),'ARCHITECTURE_LABEL');
 const e=json(directory,'evidence.json'),{proof,intent,current}=await validateEvidenceEnvelope(e,m,{root,screenshotBytes:file(directory,'workbench.png'),backupBytes:file(directory,'backup.mp4')});
 const rehearsal=file(directory,'rehearsal.md').toString('utf8'),pitch=file(directory,'pitch.md').toString('utf8');for(const value of [rehearsal,pitch])safeText(value);
 for(const value of [e.pivotProof.sourceRevision,proof.epochId,...e.walkthroughs.map(w=>w.runId),'automated','no new live save','36','32','6502120','3150704','48.933333','1050011','328','not continuous','hosted-only'])requireThat(rehearsal.includes(value),'REHEARSAL_TEXT');
 for(const phrase of ['synthetic','hosted','private','potential','unknown','5:00'])requireThat(pitch.toLowerCase().includes(phrase),'PITCH_CONTENT');
 const inspected=inspectArtifacts(directory,stage);safeText(inspected.text);requireThat(inspected.text.includes(title),'PDF_EXACT_TITLE');for(const phrase of ['synthetic','hosted','unknown','causal','potential'])requireThat(inspected.text.toLowerCase().includes(phrase),'PDF_LIMITS');
 equal(inspected.width,e.captures.desktop.width,'SCREENSHOT_DIMENSIONS');equal(inspected.height,e.captures.desktop.height,'SCREENSHOT_DIMENSIONS');requireThat(Math.abs(inspected.backup.seconds-e.backup.seconds)<0.1&&inspected.backup.width===e.backup.width&&inspected.backup.height===e.backup.height,'BACKUP_MEDIA');
 if(stage==='release'){
  equal(m.delivery.acceptance,LOCAL_ACCEPTANCE,'CURRENT_ACCEPTANCE_REQUIRED');equal(e.source.scope,'frozen_local_source','FROZEN_SOURCE_REQUIRED');equal(e.captures.captureSource.scope,'frozen_local_source','FROZEN_CAPTURE_SOURCE_REQUIRED');requireThat(current.newProviderAttempts===0,'CURRENT_PROVIDER_DELTA');requireThat(localAcceptanceReportsMatch(root),'ACCEPTANCE_REPORTS');requireThat(intent?.ok,'INTENTION_REQUIRED');requireThat(e.browser.assertions.resolution.status!=='pending','BROWSER_RESOLUTION_REQUIRED');equal(e.backup.inspection.status,'inspected','BACKUP_INSPECTION_REQUIRED');
  const expected=PAYLOAD.map(name=>`${sha(file(directory,name,['.pdf','.pptx'].some(ext=>name.endsWith(ext))?16*1024*1024:4*1024*1024))}  ${name}`).join('\n')+'\n';equal(file(directory,'SHA256SUMS').toString('utf8'),expected,'MANIFEST');file(directory,'proofgate.zip',32*1024*1024);equal(readdirSync(directory).sort(),[...PAYLOAD,'SHA256SUMS','proofgate.zip'].sort(),'UNDECLARED_ARTIFACT');
 }
}
export async function validateDelivery({root=process.cwd(),directory=join(root,'submission'),stage='metadata'}={}){
 requireThat(['metadata','content','release'].includes(stage),'STAGE');const m=metadata(root,directory);if(stage!=='metadata')await content(root,directory,m,stage);return {stage,status:'passed'};
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(new URL(import.meta.url).pathname)){
 try {const args=process.argv.slice(2),options={};requireThat(args.length%2===0,'ARGUMENTS');for(let i=0;i<args.length;i+=2){const key=args[i];requireThat(['--stage','--root','--directory'].includes(key)&&!Object.hasOwn(options,key.slice(2)),'ARGUMENTS');options[key.slice(2)]=args[i+1];}const result=await validateDelivery(options);console.log(`delivery ${result.stage}: passed`);}
 catch(error){console.error(`delivery: ${/^[A-Z_]+$/.test(error.message)?error.message:'INVALID_INPUT'}`);process.exitCode=1;}
}
