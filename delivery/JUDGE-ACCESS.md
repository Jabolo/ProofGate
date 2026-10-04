# Public judge access

Open **https://proofgate.michaljablonski.dev/**. No account, password, invitation or manual code is required. The browser automatically enters the public guest demonstration and loads a retained method composed by actual hosted models.

1. Inspect the AI-selected method and its captured public application inputs.
2. Change a synthetic private quote, apply it, then choose **Rebind locally**. Observe a changed brief with zero new provider attempts and unchanged retained application captures.
3. Attempt an external export, then save the current brief internally and inspect independently confirmed read-back.

**Compose method** can start a new actual hosted composition within the shared allowance. Loading or rebinding the retained method does not invoke the provider. A retained observation is labeled; it is not a fresh AI inference.

## Access boundary

This is deliberately an **anonymous, shared synthetic laboratory**, not isolated company accounts. The public guest capability is automatically issued to visitors; it is not a secret password or proof of user identity. The actual owner bearer and provider credentials stay on the host. Original authenticated host controls and its cumulative allowance remain in force.

Only the Blind workflow, approved run/artifact inspection and read-only policy/feed are exposed. Administrative writes, supporting release execution and unrelated historical runs are denied. One browser holds a three-minute editing lease; other browsers may inspect, but competing edits receive a busy response. This is coordination, not tenant isolation.

Deployment admission is fixed at **six shared composition dispatches and twelve shared save dispatches**, persisted before dispatch and retained across gateway restarts. The original cumulative host ledger additionally limits all actor/checker/tool work. Unknown dispatched work stays charged and blocks further public mutations pending owner review. Anyone discovering the URL can use the finite demo allowance; visits do not grant unlimited paid calls.

Configured public guest expiry: **5 October 2026, 23:59:59 Europe/Warsaw**. This is a local configuration limit, not a recurring scheduler.

## Hosting and operation

Cloudflare Tunnel terminates HTTPS and routes only to `127.0.0.1:3117`, the dedicated guest gateway; the owner host remains at `127.0.0.1:3100`. The existing Node/SQLite/MCP implementation runs on this computer. This is not a cloud-independent deployment: **keep this computer powered, awake and online, with the owner host running**.

The local supervisor restarts the dedicated gateway/connector after process exits and uses `caffeinate` to prevent idle system sleep. It does not restart or reset the original owner host, change its policy, rotate credentials, erase the ledger or establish recovery guarantees.

From the project directory:

```sh
node scripts/judge-access.mjs status
node scripts/judge-access.mjs start
node scripts/judge-access.mjs stop
node --test test/deployment/judge-gateway.test.mjs
```

`start` requires the preserved private `.proofgate/deployment/runtime.json`, judge capability, tunnel token and owner-token file. Secrets, runtime state, PID files and logs remain inside ignored `.proofgate/`; they are not included in source or delivery packages. Never print or paste the tunnel token into a command argument. The connector reads it through `--token-file`.

If the original host exits, restore it with its **existing hosted database paths and allowance epoch**, not a new database. Inspect the existing local startup configuration; do not use a reset as a spending workaround. Expiry/unknown dispatch changes require owner review.

Rollback without deleting data: stop the supervisor. To remove routing, remove only the newly created `proofgate.michaljablonski.dev` CNAME and `proofgate-judges` tunnel through the authorized Cloudflare account. Do not change nameservers or unrelated DNS records.

## Domain choice

The owner approved `.dev`, which is already an active zone on the accessible Cloudflare account. `.pl` uses Hostido nameservers and was not migrated. No unrelated service or DNS zone was changed.

The frozen selection package and its historical evidence remain dated. This deployment is an additive delivery step; it does not change their measurements or claim a new human rehearsal.
