import {spawn} from 'node:child_process';
import {openSync,closeSync,readFileSync,writeFileSync,existsSync,chmodSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

// This supervisor manages the dedicated gateway and connector, never the owner host or ledger.
const root=fileURLToPath(new URL('..',import.meta.url));
const directory=resolve(root,'.proofgate/deployment');
const pidFile=resolve(directory,'supervisor.pid');
const command=process.argv[2]??'status';
const alive=pid=>{try{process.kill(pid,0);return true;}catch{return false;}};
const pid=()=>{try{return Number(readFileSync(pidFile,'utf8'));}catch{return 0;}};
if(command==='status'){
  console.log(JSON.stringify({supervisorRunning:pid()>0&&alive(pid()),privateDirectory:directory,origin:'http://127.0.0.1:3100',gateway:'http://127.0.0.1:3117'}));
}else if(command==='stop'){
  const current=pid();if(current>0&&alive(current))process.kill(current,'SIGTERM');
  console.log('Judge access supervisor stop requested. Owner host and data preserved.');
}else if(command==='start'){
  if(pid()>0&&alive(pid()))throw new Error('JUDGE_SUPERVISOR_ALREADY_RUNNING');
  const log=openSync(resolve(directory,'supervisor.log'),'a',0o600);
  chmodSync(resolve(directory,'supervisor.log'),0o600);
  const child=spawn(process.execPath,[fileURLToPath(import.meta.url),'supervise',...(process.argv.includes('--gateway-only')?['--gateway-only']:[])],{cwd:root,detached:true,stdio:['ignore',log,log],env:{PATH:process.env.PATH,HOME:process.env.HOME}});
  closeSync(log);writeFileSync(pidFile,String(child.pid),{mode:0o600});child.unref();
  console.log(JSON.stringify({supervisorPid:child.pid,secrets:'private files only',cloudflareConnector:!process.argv.includes('--gateway-only')}));
}else if(command==='supervise'){
  const settings=JSON.parse(readFileSync(resolve(directory,'runtime.json'),'utf8'));
  const children=new Set();let stopping=false;
  const start=(name,binary,args,env={})=>{
    let failures=0;
    const launch=()=>{
      if(stopping)return;
      const output=openSync(resolve(directory,name+'.log'),'a',0o600);chmodSync(resolve(directory,name+'.log'),0o600);
      const child=spawn(binary,args,{cwd:root,stdio:['ignore',output,output],env:{PATH:process.env.PATH,HOME:process.env.HOME,...env}});closeSync(output);children.add(child);
      writeFileSync(resolve(directory,name+'.pid'),String(child.pid),{mode:0o600});
      const ended=()=>{children.delete(child);if(!stopping){failures++;setTimeout(launch,Math.min(30000,1000*2**Math.min(failures,5)));}};
      child.once('error',()=>{console.error(name+' start failed; no credentials logged.');});
      child.once('exit',ended);
    };launch();
  };
  start('gateway',process.execPath,[resolve(root,'scripts/judge-gateway.mjs')],settings);
  if(!process.argv.includes('--gateway-only')){
    const tokenFile=resolve(directory,'tunnel-token');if(!existsSync(tokenFile))throw new Error('TUNNEL_TOKEN_FILE_REQUIRED');
    start('tunnel','/opt/homebrew/bin/cloudflared',['tunnel','--no-autoupdate','--loglevel','warn','run','--token-file',tokenFile]);
  }
  start('awake','/usr/bin/caffeinate',['-i','-s','-w',String(process.pid)]);
  for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{
    stopping=true;for(const child of children)child.kill('SIGTERM');
    setTimeout(()=>{for(const child of children)child.kill('SIGKILL');process.exit(0);},2000).unref();
  });
}else throw new Error('Use start, stop or status.');
