#!/usr/bin/env bash
# Install host/gateway first. Only the integrator explicitly starts the connector.
set -euo pipefail
umask 077
if [[ $(id -u) != 0 ]]; then echo 'Root is required to manage systemd services.' >&2; exit 1; fi
runtime_root=/opt/proofgate
private_root=${runtime_root}/.proofgate
deployment_root=${private_root}/deployment
command=${1:-status}
case "$command" in
  install)
    for required in dist/src/host.js dist/fixture/blind-server.js config/policy.json public/index.html scripts/judge-gateway.mjs .proofgate/workbench-token .proofgate/hosted-host.sqlite .proofgate/hosted-fixture.sqlite .proofgate/deployment/runtime.json .proofgate/deployment/adc.json .proofgate/deployment/judge-code .proofgate/deployment/tunnel-token .proofgate/deployment/judge-state.json; do
      [[ -f ${runtime_root}/${required} ]] || { echo "Missing runtime file: ${required}" >&2; exit 1; }
    done
    python3 - <<'PY'
import json
from pathlib import Path
root = Path('/opt/proofgate')
deployment = root / '.proofgate/deployment'
settings = json.loads((deployment / 'runtime.json').read_text())
settings.update({
    'JUDGE_OWNER_TOKEN_FILE': str(root / '.proofgate/workbench-token'),
    'JUDGE_CODE_FILE': str(deployment / 'judge-code'),
    'JUDGE_STATE_FILE': str(deployment / 'judge-state.json'),
    'JUDGE_UPSTREAM': 'http://127.0.0.1:3100',
    'JUDGE_PORT': '3117'
})
if len((root / '.proofgate/workbench-token').read_text().strip()) < 16:
    raise SystemExit('Owner token missing or invalid')
adc = json.loads((deployment / 'adc.json').read_text())
if adc.get('type') != 'authorized_user' or not all(isinstance(adc.get(k), str) and adc[k] for k in ['client_id', 'client_secret', 'refresh_token']):
    raise SystemExit('Existing authorized-user ADC required by the bounded model adapter')
(deployment / 'runtime.json').write_text(json.dumps(settings, indent=2) + '\n')
(deployment / 'runtime.json').chmod(0o600)
PY
    install -d -o root -g root -m 0755 /usr/local/lib/proofgate
    cat > /usr/local/lib/proofgate/start-host <<'SH'
#!/usr/bin/env bash
set -euo pipefail
umask 077
cd /opt/proofgate
export PROOFGATE_TOKEN="$(cat /opt/proofgate/.proofgate/workbench-token)"
export PROOFGATE_HOST_DB=/opt/proofgate/.proofgate/hosted-host.sqlite
export PROOFGATE_FIXTURE_DB=/opt/proofgate/.proofgate/hosted-fixture.sqlite
export GOOGLE_APPLICATION_CREDENTIALS=/opt/proofgate/.proofgate/deployment/adc.json
exec /usr/local/bin/node dist/src/host.js
SH
    cat > /usr/local/lib/proofgate/start-gateway.mjs <<'JS'
import {readFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
const env = JSON.parse(readFileSync('/opt/proofgate/.proofgate/deployment/runtime.json', 'utf8'));
const child = spawn('/usr/local/bin/node', ['/opt/proofgate/scripts/judge-gateway.mjs'], {cwd:'/opt/proofgate', stdio:'inherit', env:{PATH:process.env.PATH, HOME:'/opt/proofgate', ...env}});
for (const signal of ['SIGTERM','SIGINT']) process.on(signal, () => child.kill(signal));
child.once('error', () => {console.error('Judge gateway could not start.');process.exit(1);});
child.once('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
JS
    chmod 0755 /usr/local/lib/proofgate/start-host
    chmod 0644 /usr/local/lib/proofgate/start-gateway.mjs
    for service in host gateway tunnel; do
      case "$service" in
        host) executable='/usr/local/lib/proofgate/start-host'; after='network-online.target'; wants='network-online.target' ;;
        gateway) executable='/usr/local/bin/node /usr/local/lib/proofgate/start-gateway.mjs'; after='network-online.target proofgate-host.service'; wants='proofgate-host.service' ;;
        tunnel) executable='/usr/bin/cloudflared tunnel --no-autoupdate --loglevel warn run --token-file /opt/proofgate/.proofgate/deployment/tunnel-token'; after='network-online.target proofgate-gateway.service'; wants='network-online.target proofgate-gateway.service' ;;
      esac
      cat > "/etc/systemd/system/proofgate-${service}.service" <<UNIT
[Unit]
Description=ProofGate judge ${service}
After=${after}
Wants=${wants}
StartLimitIntervalSec=0

[Service]
Type=simple
User=proofgate
Group=proofgate
WorkingDirectory=/opt/proofgate
Environment=PATH=/usr/local/bin:/usr/bin:/bin
Environment=HOME=/opt/proofgate
ExecStart=${executable}
Restart=always
RestartSec=3
TimeoutStopSec=15
KillMode=control-group
UMask=0077
NoNewPrivileges=true
PrivateTmp=true
ProtectHome=true
ProtectSystem=strict
ReadWritePaths=/opt/proofgate/.proofgate
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
UNIT
    done
    chown -R proofgate:proofgate "$private_root"
    find "$private_root" -type d -exec chmod 0700 {} +
    find "$private_root" -type f -exec chmod 0600 {} +
    systemctl daemon-reload
    systemctl enable proofgate-host.service proofgate-gateway.service
    systemctl restart proofgate-host.service proofgate-gateway.service
    ready=false
    for attempt in {1..30}; do
      if curl --fail --silent --output /dev/null --max-time 2 http://127.0.0.1:3117/api/judge/access; then ready=true; break; fi
      sleep 1
    done
    if [[ $ready != true ]]; then echo 'Judge bootstrap readiness failed; connector remains stopped.' >&2; exit 1; fi
    # Preserve quotas/ledger on every restart. No connector starts before root cutover.
    echo 'Host and gateway installed. Connector awaits explicit cutover.'
    ;;
  cutover)
    systemctl is-active --quiet proofgate-host.service
    systemctl is-active --quiet proofgate-gateway.service
    systemctl enable --now proofgate-tunnel.service
    ;;
  status)
    systemctl is-active proofgate-host.service proofgate-gateway.service proofgate-tunnel.service
    ;;
  stop-connector)
    systemctl disable --now proofgate-tunnel.service
    ;;
  *) echo 'Use install, cutover, status or stop-connector.' >&2; exit 1 ;;
esac
