import http from 'node:http';
import {readFileSync, writeFileSync, renameSync, mkdirSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash, timingSafeEqual} from 'node:crypto';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const digest = value => createHash('sha256').update(value).digest();
const fail = (status, code) => Object.assign(new Error(code), {status, code});
const RESPONSE_BOUND = 262144, REQUEST_BOUND = 65536;
const own = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).every(k => keys.includes(k));

function requestBody(req) {
  return new Promise((resolveBody, reject) => {
    let bytes = 0, chunks = [], rejected = false;
    req.on('data', chunk => {
      bytes += chunk.length;
      if (bytes > REQUEST_BOUND) { if (!rejected) reject(fail(413, 'JUDGE_INPUT_BOUND')); rejected = true; chunks = []; }
      else if (!rejected) chunks.push(chunk);
    });
    req.on('end', () => { if (!rejected) resolveBody(Buffer.concat(chunks)); });
    req.on('error', () => reject(fail(400, 'JUDGE_REQUEST_FAILED')));
  });
}
async function boundedResponse(response) {
  if (Number(response.headers.get('content-length')) > RESPONSE_BOUND) { await response.body?.cancel(); throw fail(502, 'JUDGE_RESPONSE_BOUND'); }
  const reader = response.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const chunks = []; let bytes = 0;
  for (;;) {
    const part = await reader.read(); if (part.done) break;
    bytes += part.value.byteLength;
    if (bytes > RESPONSE_BOUND) { await reader.cancel(); throw fail(502, 'JUDGE_RESPONSE_BOUND'); }
    chunks.push(Buffer.from(part.value));
  }
  return Buffer.concat(chunks);
}

/** Dedicated loopback proxy. Owner credential never crosses the public boundary. */
export function createJudgeGateway({ownerToken, judgeCode, stateFile, retainedRun = null, upstream = 'http://127.0.0.1:3100', publicOrigin = null, expiresAt = null, timeoutMs = 130000, now = Date.now}) {
  const origin = new URL(upstream);
  if (origin.protocol !== 'http:' || !['127.0.0.1', '[::1]', 'localhost'].includes(origin.hostname) || origin.pathname !== '/' || origin.search || origin.username || origin.password) throw new Error('JUDGE_UPSTREAM_MUST_BE_LOOPBACK');
  if (typeof ownerToken !== 'string' || ownerToken.length < 16 || typeof judgeCode !== 'string' || judgeCode.length < 16 || ownerToken === judgeCode) throw new Error('JUDGE_DISTINCT_CREDENTIALS_REQUIRED');
  if (retainedRun && !uuid.test(retainedRun)) throw new Error('JUDGE_RETAINED_RUN_INVALID');
  const expiry = expiresAt ? Date.parse(expiresAt) : Infinity;
  if (Number.isNaN(expiry)) throw new Error('JUDGE_EXPIRY_INVALID');
  timeoutMs = Math.max(1, Math.min(130000, timeoutMs));
  let state;
  try { state = JSON.parse(readFileSync(stateFile, 'utf8')); }
  catch (e) { if (e.code !== 'ENOENT') throw new Error('JUDGE_STATE_INVALID'); state = {version:1, compositions:0, saves:0, runs:[], artifacts:{}, lease:null, activeRun:null}; }
  if (state.version !== 1 || !Number.isSafeInteger(state.compositions) || state.compositions < 0 || state.compositions > 6 || !Number.isSafeInteger(state.saves) || state.saves < 0 || state.saves > 12 || !Array.isArray(state.runs) || state.runs.length > 16 || state.runs.some(id => !uuid.test(id)) || !own(state.artifacts, Object.keys(state.artifacts ?? {})) || Object.entries(state.artifacts).some(([id, run]) => !uuid.test(id) || !state.runs.includes(run)) || (state.lease !== null && (!uuid.test(state.lease?.session) || !Number.isFinite(state.lease?.until)))) throw new Error('JUDGE_STATE_INVALID');
  state.activeRun ??= null;
  state.pendingDispatch ??= null;
  if (state.activeRun && !state.runs.includes(state.activeRun)) throw new Error('JUDGE_STATE_INVALID');
  if (![null,'compose','save'].includes(state.pendingDispatch)) throw new Error('JUDGE_STATE_INVALID');
  function persist() {
    mkdirSync(dirname(stateFile), {recursive:true, mode:0o700});
    const temporary = stateFile + '.tmp';
    writeFileSync(temporary, JSON.stringify(state), {mode:0o600});
    renameSync(temporary, stateFile);
  }
  if (retainedRun && !state.runs.includes(retainedRun)) state.runs.push(retainedRun);
  persist();
  let mutationBusy = false;
  const judgeDigest = digest(judgeCode);
  function route(method, path) {
    if (method === 'GET' && ['/', '/app.js', '/styles.css', '/judge-ui.js'].includes(path)) return {kind:'static'};
    if (method === 'GET' && ['/api/policy', '/api/feed', '/api/blind/workspace', '/api/judge/status'].includes(path)) return {kind:'read'};
    if (method === 'PUT' && ['/api/blind/private', '/api/blind/rules'].includes(path)) return {kind:'write'};
    if (method === 'POST' && path === '/api/blind/reset') return {kind:'write'};
    if (method === 'POST' && path === '/api/blind/runs') return {kind:'compose'};
    const run = path.match(/^\/api\/blind\/runs\/([0-9a-f-]{36})(?:\/(export|rebind|save))?$/);
    if (run && uuid.test(run[1]) && state.runs.includes(run[1])) {
      if (method === 'GET' && (!run[2] || run[2] === 'export')) return {kind:'read', run:run[1]};
      if (method === 'POST' && ['rebind','save','export'].includes(run[2])) return {kind:run[2] === 'save' ? 'save' : 'write', run:run[1]};
    }
    const artifact = path.match(/^\/api\/blind\/artifacts\/([0-9a-f-]{36})$/);
    if (method === 'GET' && artifact && uuid.test(artifact[1]) && state.artifacts[artifact[1]] && state.runs.includes(state.artifacts[artifact[1]])) return {kind:'read', artifact:artifact[1]};
    return null;
  }
  const server = http.createServer(async (req, res) => {
    let admittedMutation = false;
    const send = (status, body, type = 'application/json; charset=utf-8') => {
      res.writeHead(status, {'content-type':type, 'cache-control':'no-store', 'x-content-type-options':'nosniff', 'referrer-policy':'no-referrer', 'content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"});
      res.end(body);
    };
    try {
      const path = req.url ?? '';
      if (!path.startsWith('/') || /[%\\?#]/.test(path) || path.includes('..') || path.includes('//')) throw fail(403, 'JUDGE_ROUTE_DENIED');
      // Deliberately public, low-privilege demo access; this is not identity authentication.
      if (req.method === 'GET' && path === '/api/judge/access') {
        if (now() >= expiry) throw fail(403, 'JUDGE_ACCESS_EXPIRED');
        send(200, JSON.stringify({judgeCode, expiresAt, sharedWorkspace:true, identity:'public_guest'})); return;
      }
      const isApi = path.startsWith('/api/');
      if (isApi) {
        const header = req.headers.authorization;
        if (typeof header !== 'string' || !header.startsWith('Bearer ') || header.length > 1024 || !timingSafeEqual(digest(header.slice(7)), judgeDigest)) throw fail(401, 'JUDGE_AUTH_REQUIRED');
        if (now() >= expiry) throw fail(403, 'JUDGE_ACCESS_EXPIRED');
      }
      const admitted = route(req.method, path);
      if (!admitted) throw fail(403, 'JUDGE_ROUTE_DENIED');
      if (path === '/judge-ui.js') { send(200, readFileSync(new URL('./judge-ui.js', import.meta.url)), 'text/javascript; charset=utf-8'); return; }
      if (path === '/api/judge/status') {
        send(200, JSON.stringify({synthetic:true, sharedWorkspace:true, retainedRun, compositionsRemaining:6-state.compositions, savesRemaining:12-state.saves, activeSessionUntil:state.lease?.until ?? null, expiresAt})); return;
      }
      const writes = ['write','compose','save'].includes(admitted.kind);
      let body;
      if (writes) {
        const requestOrigin = req.headers.origin;
        const expectedOrigin = publicOrigin ?? 'http://' + req.headers.host;
        if (requestOrigin && requestOrigin !== expectedOrigin) throw fail(403, 'JUDGE_ORIGIN_DENIED');
        if (!/^application\/json(?:\s*;.*)?$/i.test(req.headers['content-type'] ?? '')) throw fail(415, 'JUDGE_JSON_REQUIRED');
        const raw = await requestBody(req);
        let parsed; try { parsed = JSON.parse(raw.toString()); } catch { throw fail(400, 'JUDGE_JSON_INVALID'); }
        if (admitted.kind === 'compose' && (!own(parsed, ['taskId','advisory']) || !['negotiation-savings','service-risk'].includes(parsed.taskId) || ('advisory' in parsed && (typeof parsed.advisory !== 'string' || Buffer.byteLength(parsed.advisory) > 4096)))) throw fail(400, 'JUDGE_GOAL_INVALID');
        const session = req.headers['x-proofgate-session'];
        if (typeof session !== 'string' || !uuid.test(session)) throw fail(400, 'JUDGE_SESSION_REQUIRED');
        if (mutationBusy || state.lease && state.lease.until > now() && state.lease.session !== session) throw fail(409, 'JUDGE_SHARED_LAB_BUSY');
        if (state.pendingDispatch) throw fail(409, 'JUDGE_UNKNOWN_DISPATCH_OWNER_REVIEW');
        mutationBusy = true; admittedMutation = true;
        if (state.activeRun) {
          const active = await fetch(origin.origin + '/api/blind/runs/' + state.activeRun, {headers:{authorization:'Bearer '+ownerToken}, redirect:'manual', signal:AbortSignal.timeout(timeoutMs)});
          if (!active.ok) throw fail(409, 'JUDGE_ACTION_IN_FLIGHT');
          let view; try { view = JSON.parse((await boundedResponse(active)).toString()); } catch { throw fail(409, 'JUDGE_ACTION_IN_FLIGHT'); }
          if (view.runId !== state.activeRun || view.state === 'running') throw fail(409, 'JUDGE_ACTION_IN_FLIGHT');
          state.activeRun = null; persist();
        }
        if (admitted.kind === 'compose' && state.compositions >= 6 || admitted.kind === 'save' && state.saves >= 12) throw fail(429, 'JUDGE_QUOTA_EXHAUSTED');
        state.lease = {session, until:now()+180000};
        if (admitted.kind === 'compose') state.compositions++;
        if (admitted.kind === 'save') state.saves++;
        if (admitted.kind === 'compose' || admitted.kind === 'save') state.pendingDispatch = admitted.kind;
        persist(); body = raw;
      }
      const response = await fetch(origin.origin + path, {method:req.method, headers:{...(isApi ? {authorization:'Bearer '+ownerToken} : {}), ...(writes ? {'content-type':'application/json'} : {})}, ...(body ? {body} : {}), redirect:'manual', signal:AbortSignal.timeout(timeoutMs)});
      if (response.status >= 300 && response.status < 400) throw fail(502, 'JUDGE_UPSTREAM_REDIRECT_DENIED');
      let result = await boundedResponse(response);
      if (result.includes(Buffer.from(ownerToken))) throw fail(502, 'JUDGE_UPSTREAM_SECRET_DENIED');
      if (isApi && response.ok) {
        let value; try { value = JSON.parse(result.toString()); } catch { throw fail(502, 'JUDGE_UPSTREAM_INVALID'); }
        if (admitted.kind === 'compose') {
          if (!uuid.test(value.runId)) throw fail(502, 'JUDGE_UPSTREAM_RUN_INVALID');
          if (!state.runs.includes(value.runId)) state.runs.push(value.runId);
          state.activeRun = value.runId;
          state.pendingDispatch = null;
          persist();
        }
        if (admitted.run && !path.endsWith('/export') && value.runId !== admitted.run) throw fail(502, 'JUDGE_RUN_MISMATCH');
        if (admitted.run && state.activeRun === admitted.run && value.state && value.state !== 'running') {state.activeRun = null; persist();}
        if (admitted.run && uuid.test(value.save?.artifactId ?? '')) { state.artifacts[value.save.artifactId] = admitted.run; persist(); }
        if (admitted.kind === 'save' && value.save?.state !== 'unknown') {state.pendingDispatch = null; persist();}
        if (admitted.artifact && (value.artifactId !== admitted.artifact || value.parentRunId !== state.artifacts[admitted.artifact])) throw fail(502, 'JUDGE_ARTIFACT_MISMATCH');
      }
      if (isApi && response.status >= 400 && response.status < 500 && ['compose','save'].includes(admitted.kind)) {state.pendingDispatch = null; persist();}
      if (path === '/' && response.ok) result = Buffer.from(result.toString().replace('<script type="module" src="/app.js">', '<script src="/judge-ui.js"></script><script type="module" src="/app.js">'));
      send(response.status, result, response.headers.get('content-type') ?? 'application/octet-stream');
    } catch (e) { send(e.status ?? 502, JSON.stringify({code:e.code ?? 'JUDGE_UPSTREAM_FAILED'})); }
    finally { if (admittedMutation) mutationBusy = false; }
  });
  server.requestTimeout = 150000; server.headersTimeout = 15000; server.maxHeadersCount = 32;
  return server;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const secret = name => readFileSync(process.env[name], 'utf8').trim();
  const server = createJudgeGateway({ownerToken:secret('JUDGE_OWNER_TOKEN_FILE'), judgeCode:secret('JUDGE_CODE_FILE'), stateFile:process.env.JUDGE_STATE_FILE ?? '.proofgate/judge-state.json', retainedRun:process.env.JUDGE_RETAINED_RUN ?? null, upstream:process.env.JUDGE_UPSTREAM ?? 'http://127.0.0.1:3100', publicOrigin:process.env.JUDGE_PUBLIC_ORIGIN ?? null, expiresAt:process.env.JUDGE_EXPIRES_AT ?? null});
  server.listen(Number(process.env.JUDGE_PORT ?? 3117), '127.0.0.1', () => process.stdout.write('ProofGate judge gateway ready on loopback.\n'));
  for (const signal of ['SIGTERM','SIGINT']) process.on(signal, () => server.close(() => process.exit(0)));
}
