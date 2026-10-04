import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,copyFileSync,rmSync,readdirSync,symlinkSync,existsSync} from 'node:fs';
import {join,dirname,resolve} from 'node:path';
import {tmpdir,homedir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
const root=process.cwd();
const builder=await import(pathToFileURL(resolve('scripts/build-source-package.mjs')).href);
const {SOURCE_FILES,OPTIONAL_REPORTS,CANONICAL_REPORTS,verificationCoveredFiles,safePath,rejectCredentials,collectSourcePackage,buildSourcePackage,verifySourceArchive}=builder;
function fixture(run:(dir:string)=>void){
 const dir=mkdtempSync(join(tmpdir(),'proofgate-source-fixture-'));
 const copy=(name:string)=>{mkdirSync(dirname(join(dir,name)),{recursive:true});copyFileSync(join(root,name),join(dir,name));};
 try{
  for(const n of SOURCE_FILES)copy(n);
  for(const n of OPTIONAL_REPORTS)if(existsSync(join(root,n)))copy(n);
  const lock=JSON.parse(readFileSync('package-lock.json','utf8'));
  for(const path of Object.keys(lock.packages).filter(p=>p)){
   copy(path+'/package.json');
   for(const n of readdirSync(join(root,path)).filter(n=>/^(?:licen[cs]e|copying|notice)(?:[._-].*)?$/i.test(n)))copy(path+'/'+n);
  }
  run(dir);
 }finally{rmSync(dir,{recursive:true,force:true});}
}
test('source package enumerates portable source, documentary inputs and actual third-party credits',()=>{
 const {files,manifest}=collectSourcePackage(root);
 assert.ok(files.has('package-lock.json'));assert.ok(files.has('delivery/third-party/INVENTORY.json'));
 assert.ok(files.has('.planning/phases/05-blind-workbench/05-DELIVERY-CHECK.md'));
 const metadata=JSON.parse(files.get('submission/submission.json'));
 for(const row of [...metadata.evidenceMatrix,...metadata.pivotEvidenceMatrix])for(const path of row.evidence)assert.ok(files.has(path),path);
 assert.ok(files.has('scripts/build-presentation.mjs'));assert.ok(!files.has('submission/presentation.mjs'));assert.ok(files.has('test/offline/source-package.test.ts'));
 assert.ok(![...files.keys()].some((n:string)=>n.startsWith('node_modules/')||n.startsWith('.proofgate/')||n==='submission/proofgate.zip'));
 assert.equal(manifest.revision,'uncommitted-working-tree');assert.match(manifest.sourceDigest,/^[a-f0-9]{64}$/);
 const inventory=JSON.parse(files.get('delivery/third-party/INVENTORY.json'));
 assert.ok(inventory.packages.length>7);assert.ok(inventory.packages.every((p:any)=>p.license&&p.version));
});
test('source path rules refuse private provisioning, traversal and recursive archives',()=>{
 for(const n of ['../outside','/absolute','src/../outside','src\\secret','.proofgate/store.sqlite','.git/config','.env','.env.local','node_modules/pkg/LICENSE','research/private.json','adc.json','config/application_default_credentials.json','secret.pem','workbench-token'])assert.throws(()=>safePath(n),n);
 for(const n of ['src/model.ts','.planning/REQUIREMENTS.md','delivery/third-party/notices/dependencies/zod/LICENSE'])assert.equal(safePath(n),n);
 rejectCredentials(Buffer.from("const credentials={type:'authorized_user',client_secret:'offline-secret',refresh_token:'offline-refresh'};"));
 rejectCredentials(Buffer.from('const guard=/ya29\\.[A-Za-z0-9_-]{12,}/;'));
 for(const value of [JSON.stringify({type:'authorized_user',client_secret:'fixture',refresh_token:'fixture'}),'-----BEGIN '+'PRIVATE KEY-----\nnot-real','ya29.'+'x'.repeat(32),'GOCSPX-'+'x'.repeat(32),'AIza'+'x'.repeat(32),'sk-'+'x'.repeat(32)])assert.throws(()=>rejectCredentials(Buffer.from(value)),/CREDENTIAL_VALUE|PROVISIONING_RECORD/);
});
test('missing lock, missing imported entry, mismatched pins and unsafe documentary references fail closed',()=>fixture(dir=>{
 const lock=readFileSync(join(dir,'package-lock.json'));rmSync(join(dir,'package-lock.json'));assert.throws(()=>collectSourcePackage(dir),/MISSING_INPUT/);writeFileSync(join(dir,'package-lock.json'),lock);
 const host=readFileSync(join(dir,'src/host.ts'));rmSync(join(dir,'src/host.ts'));assert.throws(()=>collectSourcePackage(dir),/MISSING_INPUT/);writeFileSync(join(dir,'src/host.ts'),host);
 writeFileSync(join(dir,'src/host.ts'),Buffer.concat([host,Buffer.from("\nimport './missing-module.js';\n")]));assert.throws(()=>collectSourcePackage(dir),/MISSING_LOCAL_IMPORT/);writeFileSync(join(dir,'src/host.ts'),host);
 const p=JSON.parse(readFileSync(join(dir,'package.json'),'utf8'));p.dependencies.zod='0.0.0';writeFileSync(join(dir,'package.json'),JSON.stringify(p));assert.throws(()=>collectSourcePackage(dir),/LOCK_MISMATCH/);copyFileSync(join(root,'package.json'),join(dir,'package.json'));
 const m=JSON.parse(readFileSync(join(dir,'submission/submission.json'),'utf8'));m.sources.hidden='.proofgate/token';writeFileSync(join(dir,'submission/submission.json'),JSON.stringify(m));assert.throws(()=>collectSourcePackage(dir),/MISSING_DOCUMENTARY_ENTRY/);
 delete m.sources.hidden;m.evidenceMatrix[0].evidence.push('.planning/missing-evidence.md');writeFileSync(join(dir,'submission/submission.json'),JSON.stringify(m));assert.throws(()=>collectSourcePackage(dir),/MISSING_MATRIX_DOCUMENTARY_ENTRY/);
}));
test('source credential scan rejects provisioning records in nested JSON objects and arrays',()=>{
 for(const record of [{type:'authorized_user'},{type:'service_account'},{type:'external_account'},{private_key:'artificial'},{refresh_token:'artificial'},{access_token:'artificial'}]){
  for(const value of [{nested:{entry:record}},{nested:[{harmless:true},record]},[{harmless:true},{nested:[record]}]])assert.throws(()=>rejectCredentials(Buffer.from(JSON.stringify(value))),/PROVISIONING_RECORD/);
 }
 for(const value of [{public:{type:'report',nested:[{message:'private_key is a field name',count:1}]}},[{type:'report',data:[null,1,'public']}],{type:'authorized_user_guide'}])rejectCredentials(Buffer.from(JSON.stringify(value)));
});
test('symlink source paths and credential-bearing public files fail before archive creation',()=>fixture(dir=>{
 rmSync(join(dir,'src/host.ts'));symlinkSync(join(root,'src/host.ts'),join(dir,'src/host.ts'));assert.throws(()=>collectSourcePackage(dir),/SYMLINK_REFUSED/);rmSync(join(dir,'src/host.ts'));copyFileSync(join(root,'src/host.ts'),join(dir,'src/host.ts'));
 writeFileSync(join(dir,'README.md'),'accidentally pasted '+ 'ya29.'+'x'.repeat(40));assert.throws(()=>collectSourcePackage(dir),/CREDENTIAL_VALUE/);
}));
test('deterministic source archive detects extras, changed source and digest corruption',()=>fixture(dir=>{
 const output=join(dir,'.proofgate/source-package-build'),a=buildSourcePackage({root:dir,output});
 assert.match(verifySourceArchive(a.archive,{root:dir}),/passed/);
 // Canonical report coverage is input-dependent: the extracted tree must contain
 // every covered document and whichever exact report the installed resolver picks.
 const extracted=join(output,'extracted'),unzip=spawnSync('python3',['-c',"import zipfile,sys\nwith zipfile.ZipFile(sys.argv[1]) as z:z.extractall(sys.argv[2])",a.archive,extracted],{encoding:'utf8'});assert.equal(unzip.status,0,unzip.stderr);
 for(const report of CANONICAL_REPORTS)if(existsSync(join(dir,report))){
  assert.deepEqual(readFileSync(join(extracted,report)),readFileSync(join(dir,report)),report);
  for(const name of verificationCoveredFiles(readFileSync(join(extracted,report))))assert.deepEqual(readFileSync(join(extracted,name)),readFileSync(join(dir,name)),name);
 }
 const tools=join(process.env.CODEX_HOME||join(homedir(),'.codex'),'gsd-core/bin/gsd-tools.cjs');
 if(existsSync(tools))for(const phase of ['.planning/phases/04-judge-ready-evidence-and-delivery','.planning/phases/05-blind-workbench']){
  const query=(cwd:string)=>{const r=spawnSync(process.execPath,[tools,'query','verification.resolve-file',phase,'--cwd',cwd],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);return JSON.parse(r.stdout).verification_file;};
  const selected=query(extracted);assert.ok(existsSync(selected));assert.equal(selected.slice(extracted.length),query(dir).slice(dir.length));
 }
 const report='.planning/phases/05-blind-workbench/VERIFICATION.md',prior=readFileSync(join(dir,report));
 writeFileSync(join(dir,report),prior.toString().replace(/^covered_files:/m,'covered_files:\n  - ".planning/unlisted-canonical-source.md"'));assert.throws(()=>collectSourcePackage(dir),/MISSING_VERIFICATION_COVERAGE/);writeFileSync(join(dir,report),prior);
 const b=buildSourcePackage({root:dir,output:join(output,'second')});assert.equal(a.sha256,b.sha256);
 writeFileSync(join(dir,'README.md'),readFileSync(join(dir,'README.md'),'utf8')+'\nChanged after archive snapshot\n');assert.throws(()=>verifySourceArchive(a.archive,{root:dir}),/ARCHIVE_DIGEST/);copyFileSync(join(root,'README.md'),join(dir,'README.md'));
 for(const n of ['../escape','.proofgate/token','unexpected.txt','submission/presentation.mjs']){
  const c=buildSourcePackage({root:dir,output:join(output,'fault')});
  const r=spawnSync('python3',['-c',"import zipfile,sys\nwith zipfile.ZipFile(sys.argv[1],'a') as z:z.writestr(sys.argv[2],'fabricated extra')",c.archive,n],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);
  assert.throws(()=>verifySourceArchive(c.archive,{root:dir}),/ARCHIVE_ENTRIES/);
 }
}));
