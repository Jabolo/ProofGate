import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {BlindSaveArgsSchema,BlindSaveResultSchema,BlindSaveMetaSchema} from '../src/blind.js';
import {BLIND_BUSY_MS} from './blind-store.js';
async function main(){
 const path=process.env.PROOFGATE_FIXTURE_DB,runId=process.env.PROOFGATE_RUN_ID,parent=process.env.PROOFGATE_PARENT_RUN_ID,revision=process.env.PROOFGATE_RESULT_REVISION;
 const deadline=Number(process.env.PROOFGATE_RUN_DEADLINE),version=Number(process.env.PROOFGATE_WORKSPACE_VERSION);
 if(!path||!runId||!parent||!revision||!Number.isSafeInteger(deadline)||!Number.isSafeInteger(version))throw new Error('FIXTURE_METADATA');
 const db=new DatabaseSync(path);const boundedBusy=()=>{const left=deadline-Date.now();if(left<=0)throw new Error('FIXTURE_DEADLINE');db.exec(`PRAGMA busy_timeout=${Math.min(BLIND_BUSY_MS,Math.floor(left/5))}`);};boundedBusy();
 const server=new McpServer({name:'proofgate-blind-fixture',version:'0.1.0'});
 server.registerTool('save_internal_brief',{description:'Save one current approved synthetic brief to the internal recorder',inputSchema:BlindSaveArgsSchema,outputSchema:BlindSaveResultSchema},async(args,extra)=>{
  const meta=BlindSaveMetaSchema.parse(extra._meta);if(meta.runId!==runId||meta.parentRunId!==parent||meta.resultRevision!==revision||meta.workspaceVersion!==version)throw new Error('OWNERSHIP');const {brief}=BlindSaveArgsSchema.parse(args);const content=JSON.stringify(brief);if(Buffer.byteLength(content)>32768)throw new Error('BRIEF_BOUND');const artifactId=randomUUID();boundedBusy();db.exec('BEGIN IMMEDIATE');try{boundedBusy();db.prepare('INSERT INTO blind_briefs VALUES(?,?,?,?,?,?,?)').run(artifactId,runId,parent,revision,version,meta.callerId,content);boundedBusy();db.prepare('INSERT INTO blind_effects VALUES(?,?,?,?,?)').run(randomUUID(),runId,artifactId,revision,'internal');boundedBusy();db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}const result={artifactId};return{content:[{type:'text' as const,text:JSON.stringify(result)}],structuredContent:result};
 });await server.connect(new StdioServerTransport());
}
if(process.argv[1]===fileURLToPath(import.meta.url))main().catch(()=>{console.error('Blind fixture failed closed');process.exitCode=1;});
