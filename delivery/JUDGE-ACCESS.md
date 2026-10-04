# Judge demo — no setup required

Open **https://proofgate.michaljablonski.dev/** on your own laptop or phone. No account, password, invitation, configuration, local installation or tunnel setup is required. The application runs on the team’s dedicated GCP host, independently of the owner’s laptop.

The page automatically loads an **actual retained AI-composed method**, whose captured public model inputs are inspectable. A retained observation is labeled; opening the page is not a new AI inference.

## A 60–90 second judge scene

1. Inspect the selected suppliers and negotiation brief.
2. Click **Try a private quote change (+$100)**, which performs the existing Apply and Rebind operations. The private result changes while the retained model captures remain identical, with zero new provider attempts.
3. Try **Attempt external export**, then **Save exact internal brief** and inspect independent read-back.

**Compose AI method** starts new actual hosted inference within the shared allowance. Synthetic data and the fixture company endpoints are disclosed. The planner, enabled AI inspection, deterministic enforcement, local computation, typed MCP save and independent SQLite effects are actual implementation.

## Send these links

- Working prototype: https://proofgate.michaljablonski.dev/
- Source and project description: https://github.com/Jabolo/ProofGate
- English presentation, nine slides: https://raw.githubusercontent.com/Jabolo/ProofGate/main/submission/presentation.pdf
- Clearly labeled backup: https://raw.githubusercontent.com/Jabolo/ProofGate/main/submission/backup.mp4
- HackTribe project, table **B25**: https://hackyeah2026.hacktribe.co/testnamexyz/

The 49-second backup is a paced sequence of actual captured UI frames; it is not a continuous live recording, new inference or latency measurement. Slides and frozen evidence remain dated; the cloud migration is recorded separately.

## Public demonstration boundary

Deliberately **anonymous shared synthetic lab**. The browser automatically obtains a restricted demo capability; this is not employee identity authentication or tenant isolation. Owner bearer/provider credentials stay server-side. Only the Blind workflow and approved run/artifact inspection are exposed. Administrative writes, supporting release execution and unrelated historical runs are denied.

One browser holds a 30-second editing lease; others can inspect, competing edits receive a busy response. Fixed deployment capacity is six shared composition dispatches and twelve shared save dispatches; both are persisted before dispatch. The original cumulative host allowance also applies. Unknown dispatches remain charged and require operator review. Limits never reset on visits or gateway restart.

## Hosting and lifetime

Dedicated **GCP Compute Engine e2-small / Debian12** in the owned hackathon-gdg-wroclaw project, with the same Node22.23.1, preserved SQLite ledger/private synthetic workspace, typed MCP and hosted model adapter. Cloudflare terminates HTTPS; its connector runs on this cloud VM. The app ports3100/3117 bind loopback; only owner SSH is admitted directly. No judge runs a connector or receives credentials.

Unprivileged systemd services supervise host, gateway and connector. The laptop’s original host/gateway/connector are stopped to prevent duplicate live copies of the accounting epoch. Original local stores remain preserved. Do not restart that historical copy while cloud judging is active.

Owner approved **up to USD5 of hosting, at most48hours**. Public demo expires **6 October2026,09:40 Europe/Warsaw**. The temporary VM and its temporary boot disk are configured for automatic deletion after48hours from initial start (approximately6October09:46Warsaw); original source/local backup files remain intact. Actual tariff invoice is not an invented measurement, and the existing AI allowance is separate from hosting cost.

## Team operation — not judge instructions

```sh
gcloud compute ssh proofgate-judges-20261004 --zone=europe-west1-b --project=hackathon-gdg-wroclaw
sudo systemctl status proofgate-host proofgate-gateway proofgate-tunnel
```

Reproduction scripts: scripts/gcp-judge-startup.sh and scripts/gcp-judge-services.sh. Private runtime/source transfer, tokens, ADC, SQLite snapshots and logs are excluded from Git and public packages. Startup refuses to restore a stale transfer over an installed cloud runtime. Cloud service restart preserves current stores and quotas; this is not general crash recovery or production high availability.

Rollback preserves data: stop the cloud connector. Reconcile the latest cloud ledger/effects with the preserved local copy before any local restore; never reuse a stale snapshot to regain allowance. DNS and the tunnel belong only to this demo; leave nameservers/unrelated services unchanged. The approved domain is .dev; .pl/Hostido was not migrated.
