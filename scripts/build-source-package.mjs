import {readFileSync,writeFileSync,mkdirSync,lstatSync,realpathSync,readdirSync,existsSync} from 'node:fs';
import {resolve,join,relative,isAbsolute,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {PAYLOAD,CURRENT_SOURCE_FILES,licenseInventory} from './check-delivery.mjs';

// Deliberately enumerated, rather than git archive, recursive repository traversal,
// or a caller-controlled inclusion list. The strict presentation ZIP is separate.
export const SOURCE_FILES=[
 'package.json','package-lock.json','tsconfig.json','README.md','TEAM.md','delivery/README.md','.gitignore',
 'src/blind-evidence.ts','src/blind.ts','src/contracts.ts','src/host.ts','src/model.ts','src/prompt-profiles.ts',
 'fixture/blind-server.ts','fixture/blind-store.ts','fixture/server.ts','config/policy.json','config/signatures.json',
 'public/app.js','public/index.html','public/styles.css',
 'scripts/check-blind-proof.mjs','scripts/check-blind-intent-proof.mjs','scripts/check-delivery.mjs','scripts/build-source-package.mjs','scripts/build-presentation.mjs',
 'test/blind-cases.json','test/blind-intent-case.json','test/cases.json','test/phase02-cases.json',
 ...['ablation','blind-intent','blind','semantic','tracer'].map(n=>`test/hosted/${n}.test.ts`),
 ...['advisory','blind-evidence','blind-intent-proof','blind-proof','blind-ui','blind','delivery','evidence','faults','mutations','phase02-harness','review','security','source-package','tracer','transport','workbench'].map(n=>`test/offline/${n}.test.ts`),
 'goldman/README.md','goldman/TASK-CONTRACT.md','goldman/VISION-ALIGNMENT.md',
 '.planning/REQUIREMENTS.md',
 '.planning/phases/01-end-to-end-governed-workbench/VERIFICATION.md',
 '.planning/phases/02-hybrid-threat-and-data-controls/LIVE-EVIDENCE.md',
 '.planning/phases/02-hybrid-threat-and-data-controls/VERIFICATION.md',
 '.planning/phases/03-judge-policy-and-budget-mutations/VERIFICATION.md',
 '.planning/phases/04-judge-ready-evidence-and-delivery/04-01-PLAN.md',
 '.planning/phases/04-judge-ready-evidence-and-delivery/04-01-SUMMARY.md',
 '.planning/phases/04-judge-ready-evidence-and-delivery/04-02-PLAN.md',
 '.planning/phases/04-judge-ready-evidence-and-delivery/04-02-SUMMARY.md',
 '.planning/phases/05-blind-workbench/05-01-PLAN.md',
 '.planning/phases/05-blind-workbench/05-01-SUMMARY.md',
 '.planning/phases/05-blind-workbench/05-02-PLAN.md',
 '.planning/phases/05-blind-workbench/05-02-SUMMARY.md',
 '.planning/phases/05-blind-workbench/05-03-PLAN.md',
 '.planning/phases/05-blind-workbench/05-03-SUMMARY.md',
 '.planning/phases/05-blind-workbench/05-DELIVERY-CHECK.md',
 ...PAYLOAD.map(n=>`submission/${n}`),'submission/SHA256SUMS',
].sort();
export const OPTIONAL_REPORTS=[
 '.planning/phases/04-judge-ready-evidence-and-delivery/VERIFICATION.md',
 '.planning/phases/04-judge-ready-evidence-and-delivery/04-VERIFICATION.md',
 '.planning/phases/04-judge-ready-evidence-and-delivery/REVIEW.md',
 '.planning/phases/04-judge-ready-evidence-and-delivery/04-SECURITY.md',
 '.planning/phases/04-judge-ready-evidence-and-delivery/04-UI-REVIEW.md',
 '.planning/phases/05-blind-workbench/VERIFICATION.md',
 '.planning/phases/05-blind-workbench/05-VERIFICATION.md',
 '.planning/phases/05-blind-workbench/REVIEW.md',
 '.planning/phases/05-blind-workbench/05-REVIEW.md',
 '.planning/phases/05-blind-workbench/05-SECURITY.md',
 '.planning/phases/05-blind-workbench/05-UI-REVIEW.md',
];
export const CANONICAL_REPORTS=[
 '.planning/phases/04-judge-ready-evidence-and-delivery/VERIFICATION.md',
 '.planning/phases/04-judge-ready-evidence-and-delivery/04-VERIFICATION.md',
 '.planning/phases/05-blind-workbench/VERIFICATION.md',
 '.planning/phases/05-blind-workbench/05-VERIFICATION.md',
];
const sha=v=>createHash('sha256').update(v).digest('hex');
const fact=(v,c)=>{if(!v)throw new Error(c);};
export function safePath(name){
 fact(typeof name==='string'&&!isAbsolute(name)&&!name.includes('\\')&&!/[\x00-\x1f]/.test(name)&&name.split('/').every(p=>p&&p!=='.'&&p!=='..'),'UNSAFE_PATH');
 fact(!name.split('/').some(p=>/^(?:\.git|\.proofgate|\.env(?:\..*)?|node_modules|\.local-runtime|\.gsd|research|\.cache)$/i.test(p)),'PRIVATE_PATH');
 fact(!/(?:application_default_credentials|(?:^|\/)(?:adc|credentials|workbench-token)(?:[.-]|$)|\.(?:sqlite(?:-wal|-shm)?|pem|key)$)/i.test(name),'PRIVATE_PATH');
 return name;
}
function readSafe(root,name,{dependencyNotice=false}={}){
 if(!dependencyNotice)safePath(name);
 fact(typeof name==='string'&&!isAbsolute(name)&&!name.includes('\\')&&name.split('/').every(p=>p&&p!=='.'&&p!=='..'),'UNSAFE_PATH');
 const base=realpathSync(root),path=join(base,name);let parent=base;
 for(const p of name.split('/')){parent=join(parent,p);fact(existsSync(parent),'MISSING_INPUT:'+name);fact(!lstatSync(parent).isSymbolicLink(),'SYMLINK_REFUSED:'+name);}
 const stat=lstatSync(path);fact(stat.isFile()&&stat.size>0&&stat.size<=32*1024*1024,'UNSAFE_FILE:'+name);
 fact(realpathSync(path).startsWith(base+sep),'UNSAFE_PATH');return readFileSync(path);
}
export function rejectCredentials(bytes,{sourcePath}={}){
 let text=bytes.toString('utf8');
 // Two existing literal test canaries are explicitly artificial. Restrict the
 // exception to those exact values in those exact tests; all other content scans.
 const fixtures={'test/offline/evidence.test.ts':['sk','canary','credential','secret','123456789'].join('-'),'test/offline/security.test.ts':['sk','syntheticSecret123456'].join('-')};
 if(fixtures[sourcePath])text=text.replaceAll(fixtures[sourcePath],'ARTIFICIAL_OFFLINE_CANARY');
 // Key names, regex guards and intentionally synthetic offline auth fixtures are
 // source code. Actual provisioning records and credential-shaped values are not.
 fact(!/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bya29\.[A-Za-z0-9_-]{12,}|\bsk-[A-Za-z0-9_-]{20,}|\bAIza[A-Za-z0-9_-]{25,}|\b1\/\/[A-Za-z0-9_-]{30,}|\bGOCSPX-[A-Za-z0-9_-]{20,}/.test(text),'CREDENTIAL_VALUE');
 if(/^[\s]*[\[{]/.test(text)){
  let parsed;try{parsed=JSON.parse(text);}catch{return;}
  const pending=[parsed];
  while(pending.length){
   const value=pending.pop();if(value===null||typeof value!=='object')continue;
   fact(!['authorized_user','service_account','external_account'].includes(value.type),'PROVISIONING_RECORD');
   fact(!Object.hasOwn(value,'private_key')&&!Object.hasOwn(value,'refresh_token')&&!Object.hasOwn(value,'access_token'),'PROVISIONING_RECORD');
   for(const child of Object.values(value))if(child!==null&&typeof child==='object')pending.push(child);
  }
 }
}
function validateLocalImports(files){
 for(const [name,bytes] of files){
  if(!/\.(?:ts|mjs|js)$/.test(name))continue;
  const source=bytes.toString('utf8');
  for(const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)['"](\.[^'"\r\n]+)['"]/g)){
   let target=relative('.',resolve(name.slice(0,name.lastIndexOf('/')+1),match[1])).split(sep).join('/');
   // Scripts import built application modules. Their source must still be present.
   if(target.startsWith('dist/'))target=target.slice(5);
   const candidates=[target,target.replace(/\.js$/,'.ts')];
   fact(candidates.some(n=>files.has(n)),'MISSING_LOCAL_IMPORT:'+name);
  }
 }
}
export function verificationCoveredFiles(bytes){
 const front=bytes.toString('utf8').match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
 fact(front,'VERIFICATION_COVERAGE');
 const list=front.match(/^covered_files:[ \t]*\r?\n((?:[ \t]+[^\r\n]+\r?\n?)+)/m)?.[1];
 fact(list,'VERIFICATION_COVERAGE');
 const names=list.trimEnd().split(/\r?\n/).map(line=>{
  const raw=line.match(/^[ \t]+-[ \t]+(.+?)[ \t]*$/)?.[1];fact(raw,'VERIFICATION_COVERAGE');
  let name=raw;if(raw.startsWith('"')){try{name=JSON.parse(raw);}catch{throw new Error('VERIFICATION_COVERAGE');}}
  return safePath(name);
 });
 fact(names.length>0&&new Set(names).size===names.length,'VERIFICATION_COVERAGE');return names;
}
export function collectSourcePackage(root,{revision='uncommitted-working-tree'}={}){
 fact(revision==='uncommitted-working-tree'||/^[a-f0-9]{40}$/.test(revision),'REVISION');
 const files=new Map();
 for(const name of SOURCE_FILES){const b=readSafe(root,name);rejectCredentials(b,{sourcePath:name});files.set(name,b);}
 for(const name of OPTIONAL_REPORTS)if(existsSync(join(root,name))){const b=readSafe(root,name);rejectCredentials(b);files.set(name,b);}
 for(const report of CANONICAL_REPORTS)if(files.has(report))for(const name of verificationCoveredFiles(files.get(report)))fact(files.has(name),'MISSING_VERIFICATION_COVERAGE:'+name);
 fact(CURRENT_SOURCE_FILES.every(n=>files.has(n)),'MISSING_SOURCE_ENTRY');
 validateLocalImports(files);
 const pkg=JSON.parse(files.get('package.json')),lock=JSON.parse(files.get('package-lock.json'));
 fact(lock.lockfileVersion===3&&lock.packages?.['']?.name===pkg.name,'LOCK_MISMATCH');
 for(const [name,pin] of Object.entries({...pkg.dependencies,...pkg.devDependencies}))fact(lock.packages[`node_modules/${name}`]?.version===pin,'LOCK_MISMATCH');
 const metadata=JSON.parse(files.get('submission/submission.json'));
 fact(Object.values(metadata.sources).every(n=>typeof n==='string'&&files.has(n)),'MISSING_DOCUMENTARY_ENTRY');
 for(const row of [...metadata.evidenceMatrix,...metadata.pivotEvidenceMatrix]){
  fact(Array.isArray(row.evidence)&&row.evidence.length>0&&row.evidence.every(n=>typeof n==='string'&&files.has(n)),'MISSING_MATRIX_DOCUMENTARY_ENTRY');
 }
 const inventory=licenseInventory(root);
 fact(JSON.stringify(inventory.direct)===JSON.stringify(metadata.licenses.direct)&&JSON.stringify(inventory.production)===JSON.stringify(metadata.licenses.production),'LICENSE_INVENTORY_MISMATCH');
 const packages=[];
 for(const [path,entry] of Object.entries(lock.packages).filter(([p])=>p).sort(([a],[b])=>a.localeCompare(b))){
  fact(/^node_modules\/(?:[@A-Za-z0-9._/-]+)$/.test(path)&&!path.split('/').includes('..'),'DEPENDENCY_PATH');
  const installed=JSON.parse(readSafe(root,`${path}/package.json`,{dependencyNotice:true}));
  fact(installed.version===entry.version&&typeof installed.license==='string'&&installed.license!=='UNLICENSED','DEPENDENCY_LICENSE');
  const notices=[];
  for(const n of readdirSync(join(root,path)).filter(n=>/^(?:licen[cs]e|copying|notice)(?:[._-].*)?$/i.test(n)).sort()){
   const src=`${path}/${n}`;fact(lstatSync(join(root,src)).isFile(),'DEPENDENCY_NOTICE');
   const bytes=readSafe(root,src,{dependencyNotice:true});rejectCredentials(bytes);
   const target=safePath(`delivery/third-party/notices/${path.replaceAll('node_modules/','dependencies/')}/${n}`);
   files.set(target,bytes);notices.push({path:target,sha256:sha(bytes)});
  }
  packages.push({name:installed.name,version:installed.version,license:installed.license,lockPath:path,scope:entry.dev?'development':'production',notices});
 }
 files.set('delivery/third-party/INVENTORY.json',Buffer.from(JSON.stringify({schemaVersion:'proofgate-third-party-1',projectLicense:metadata.licenses.project,packages},null,2)+'\n'));
 const sorted=[...files.keys()].sort();
 const manifest={schemaVersion:'proofgate-source-package-1',revision,sourceDigest:sha(JSON.stringify(Object.fromEntries(sorted.map(n=>[n,sha(files.get(n))])))),files:sorted.map(path=>({path,sha256:sha(files.get(path)),bytes:files.get(path).length})),acceptance:'Portable source snapshot; external canonical GSD acceptance remains fail-closed without its installed parser. Archive is not phase acceptance.'};
 files.set('delivery/SOURCE-MANIFEST.json',Buffer.from(JSON.stringify(manifest,null,2)+'\n'));
 return {files,manifest};
}
const pythonBuild=`import sys,json,base64,zipfile,hashlib,stat\nfrom pathlib import Path\na=json.load(sys.stdin);p=Path(sys.argv[1]);p.parent.mkdir(parents=True,exist_ok=True)\nwith zipfile.ZipFile(p,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:\n for n,b in sorted(a.items()):\n  i=zipfile.ZipInfo(n,date_time=(1980,1,1,0,0,0));i.create_system=3;i.external_attr=(stat.S_IFREG|0o644)<<16;i.compress_type=zipfile.ZIP_DEFLATED;z.writestr(i,base64.b64decode(b))\nprint(hashlib.sha256(p.read_bytes()).hexdigest())`;
const pythonVerify=`import sys,json,zipfile,hashlib,stat\np=sys.argv[1];expected=json.load(sys.stdin)\nwith zipfile.ZipFile(p) as z:\n infos=z.infolist();names=[i.filename for i in infos]\n assert len(names)==len(set(names)) and sorted(names)==sorted(expected),'ARCHIVE_ENTRIES'\n assert sum(i.file_size for i in infos)<=128*1024*1024,'ARCHIVE_BOUND'\n for i in infos:\n  n=i.filename;assert not n.startswith('/') and '\\\\' not in n and all(x not in ('','.', '..') for x in n.split('/')),'UNSAFE_PATH'\n  assert not stat.S_ISLNK(i.external_attr>>16),'SYMLINK_REFUSED'\n  b=z.read(i);assert len(b)==expected[n]['bytes'] and hashlib.sha256(b).hexdigest()==expected[n]['sha256'],'ARCHIVE_DIGEST'\nprint('source archive: passed')`;
function runPython(python,program,args,input){const r=spawnSync(python,['-c',program,...args],{input:JSON.stringify(input),encoding:'utf8',timeout:30000,maxBuffer:8*1024*1024});fact(!r.error&&r.status===0,'ARCHIVE_TOOL_FAILED:'+String(r.stderr||r.error?.message).slice(0,1000));return r.stdout.trim();}
export function verifySourceArchive(archive,{root,python='python3',revision='uncommitted-working-tree'}={}){
 fact(root,'SOURCE_ROOT_REQUIRED');const {files}=collectSourcePackage(root,{revision});
 return runPython(python,pythonVerify,[resolve(archive)],Object.fromEntries([...files].map(([n,b])=>[n,{sha256:sha(b),bytes:b.length}])));
}
export function buildSourcePackage({root=process.cwd(),output=join(root,'.proofgate/source-package-build/draft'),python='python3',revision='uncommitted-working-tree'}={}){
 const {files,manifest}=collectSourcePackage(root,{revision}),dir=resolve(output);
 fact(dir!==resolve(root)&&!SOURCE_FILES.some(n=>resolve(root,n)===dir),'OUTPUT_PATH');mkdirSync(dir,{recursive:true});
 const archive=join(dir,'proofgate-source.zip');
 const digest=runPython(python,pythonBuild,[archive],Object.fromEntries([...files].map(([n,b])=>[n,b.toString('base64')])));
 const result=verifySourceArchive(archive,{root,python,revision});
 writeFileSync(join(dir,'proofgate-source.zip.sha256'),`${digest}  proofgate-source.zip\n`);
 writeFileSync(join(dir,'source-package-report.json'),JSON.stringify({schemaVersion:'proofgate-source-build-report-1',status:'draft',revision,sourceDigest:manifest.sourceDigest,archiveSha256:digest,files:files.size,archiveVerification:result,freshExtraction:'not run by builder; independent npm ci/build/offline proof required'},null,2)+'\n');
 return {archive,sha256:digest,sourceDigest:manifest.sourceDigest,files:files.size,status:'draft'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{const args=process.argv.slice(2),opts={};for(let i=0;i<args.length;i+=2){fact(['--root','--output','--python','--revision','--verify'].includes(args[i])&&args[i+1],'ARGUMENTS');opts[args[i].slice(2)]=args[i+1];}
  if(opts.verify)process.stdout.write(verifySourceArchive(opts.verify,{root:opts.root||process.cwd(),python:opts.python,revision:opts.revision})+'\n');else process.stdout.write(JSON.stringify(buildSourcePackage(opts))+'\n');
 }catch(e){process.stderr.write('Source package refused: '+(e instanceof Error?e.message:'INVALID')+'\n');process.exitCode=1;}
}
