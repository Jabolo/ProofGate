# 🛡️ ProofGate: Hybrid AI Control Layer for Autonomous Agents

### *Public Plans, Private Results — Enforcing Enterprise Data Privacy, Action Guardrails, and API Budgets on Autonomous Agents*

[![HackYeah 2026](https://img.shields.io/badge/HackYeah%202026-Goldman%20Sachs%20Task-0A192F?style=for-the-badge&logo=goldmansachs&logoColor=white)](https://proofgate.michaljablonski.dev/)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-proofgate.michaljablonski.dev-00C853?style=for-the-badge&logo=googlecloud&logoColor=white)](https://proofgate.michaljablonski.dev/)
[![Tests](https://img.shields.io/badge/Offline%20Tests-339%20Passing%20(100%25)-brightgreen?style=for-the-badge&logo=node.js&logoColor=white)](#-reproducible-audit-runbook--verification-matrix)
[![Architecture](https://img.shields.io/badge/Defense-Hybrid%20Deterministic%20%2B%20Semantic%20AI-blue?style=for-the-badge)](#-security--policy-control-architecture)
[![MCP Protocol](https://img.shields.io/badge/Protocol-Model%20Context%20Protocol%20v1.32-orange?style=for-the-badge)](https://modelcontextprotocol.io/)
[![Runtime](https://img.shields.io/badge/Runtime-Node%2022%20%7C%20TypeScript%206-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](#-developer-quickstart--local-reproduction)

---

## ⚡ Instant Judge & Evaluator Access (First 30 Seconds)

ProofGate controls what AI can see, do and spend. An employee asks which supplier renewals to negotiate and receives a useful brief: actual AI composes approved public steps, and the company-controlled host applies private synthetic records and rules. It is a bounded hybrid control layer for Goldman Sachs' AI Control Layer challenge—not a production security guarantee. The company host and employee are trusted.

* 🌐 **Live Cloud Demo (Zero Setup / Instant Guest):** **[https://proofgate.michaljablonski.dev](https://proofgate.michaljablonski.dev)**  
  *(No account setup: the browser obtains a restricted guest capability for a shared synthetic lab on a dedicated GCP VM, Desk B25. Availability and shared quotas are finite; see [judge access](delivery/JUDGE-ACCESS.md).)*
* 📑 **Official Submission Presentation (9 Slides PDF):** **[View Presentation PDF](https://raw.githubusercontent.com/Jabolo/ProofGate/main/submission/presentation.pdf)**
* 🎥 **49-Second Video Walkthrough (Authentic UI):** **[Watch Backup Video MP4](https://raw.githubusercontent.com/Jabolo/ProofGate/main/submission/backup.mp4)**
* 📊 **Machine-Readable Audit Evidence and Integrity Digests:** [`submission/evidence.json`](submission/evidence.json)
* 💻 **Offline Test Run (No Cloud Keys Needed):**
  ```bash
  git clone https://github.com/Jabolo/ProofGate.git && cd ProofGate
  npm ci --ignore-scripts && npm test
  ```
  Installation needs npm registry access; offline tests need Node 22.23.1 and Python 3. Runtime depends on the machine; this is not a ten-second guarantee.

---

## 💡 The Core Problem & The "Public Plans, Private Results" Paradigm

Enterprises cannot safely adopt autonomous AI agents without solving three existential risks:
1. **Confidential Data Leaks:** Stuffing proprietary vendor quotes, internal pricing rules, and PII into prompts sent to third-party LLMs.
2. **Unconstrained Side-Effects & Poisoned Tool Calls:** Agents executing unauthorized database writes or malicious external network exports when tricked by prompt injections.
3. **Runaway Financial Spending:** Recursive agent loops draining API quotas without host-enforced admission accounting within the owned loop.

ProofGate demonstrates an approach to this tension with **Blind Workbench**: AI chooses steps from a narrow approved operation language; the company implements those steps and applies private worksheet values locally. This does not keep every aspect of company know-how undisclosed: public intent and capability definitions are sent to models.

```mermaid
flowchart TD
    subgraph Public_Cloud["Public Cloud Tier (Google Vertex AI)"]
        AdvisoryChecker["Stateless Advisory Checker\n(Gemini 3.5 Flash-Lite)"]
        Planner["Public Planner\n(Gemini 3.5 Flash)"]
        RecipeChecker["Stateless Method Checker\n(Gemini 3.5 Flash-Lite)"]
    end

    subgraph Company_Boundary["Company-Controlled Host Boundary (Node.js 22 + SQLite)"]
        Employee["Employee Browser\n(Authenticated / Guest)"] -->|Public Goal Only| Gateway["ProofGate Host Identity & Admission"]
        Gateway -->|Public Intent| AdvisoryChecker
        AdvisoryChecker -->|Admitted| Planner
        Planner -->|Declarative Recipe AST| RecipeChecker
        RecipeChecker -->|Admitted Recipe| Interpreter["Local Recipe Interpreter\n(In-Memory AST Execution)"]

        PrivateData[("Private Synthetic Contracts\n& Pricing Rules")] --> Interpreter
        Interpreter -->|Selected Suppliers & Brief| Employee

        Employee -.->|"Private Edits + Rebind\n(0 New LLM Calls)"| Interpreter
        Employee -->|Approve Internal Save| MCPServer["MCP Stdio Child\n(Stripped Credentials / Pinned Catalog)"]
    end

    subgraph Independent_Storage["Independent SQLite Effect Store"]
        MCPServer -->|Write Brief| FixtureDB[("Internal Fixture SQLite")]
        Gateway -.->|Independent Read-Back Reconciliation\n(Exact Content Hash Match)| FixtureDB
    end
```

### The Data Boundary: What Cloud Models See vs. What Stays Inside

| Information Type | Disclosed to Cloud LLMs (Vertex AI Gemini) | Kept Strictly Inside Company Host (Node.js / SQLite) |
| :--- | :--- | :--- |
| **Business Intent** | Abstract public goal (e.g., *"earliest 2 renewals within 60 days"*) | Private worksheet values and employee-visible negotiation result |
| **Supplier Data** | **No private worksheet records in the demonstrated model requests**; supported-name/key checks and PII scanners do not detect arbitrary secrets pasted into public intent | Private supplier names, contract registers, expiration dates, raw quotes |
| **Pricing Formulas** | **None** | Internal margin rules (`maxIncreaseBp`), savings thresholds (`minimumSavingCents`) |
| **Output / Brief** | **No computed brief in the demonstrated model requests**; the host admits only a valid declarative recipe and renders the result locally | Computed supplier targets, price ceilings, and rendered negotiation briefs |
| **Action & Persistence** | **None** (Models have no database access) | Governed local MCP save + independent SQLite read-back verification |

---

## 🏆 Goldman Sachs Evaluation Scorecard

How the bounded demonstrator maps to the five assessed categories. The rules use weights **30/20/20/20/10**; the brief uses **30/20/20/15/15**. Both source vectors are retained in [the task contract](goldman/TASK-CONTRACT.md#scoring-and-source-conflicts). Local acceptance of 26 obligations is engineering evidence, not organizer approval or a predicted score. The table shows the rules weights.

| Evaluation Criterion | Weight | How ProofGate Delivers | Where to Verify |
| :--- | :---: | :--- | :--- |
| **1. Robustness & Guardrails** | **30%** | **Dual Hybrid Inspection:** Deterministic filters (PII, secret regex, strict Zod schemas) run alongside stateless Gemini 3.5 Flash-Lite semantic checking. **Deterministic veto dominates** (semantic allow never overrides deterministic denial). Detected hostile advisories are quarantined before actor exposure in supported cases (a bounded Invariant Labs MCP vulnerability analogue). | `src/host.ts`<br>`test/offline/security.test.ts` |
| **2. Architecture & Performance** | **20%** | **Measured Local Recomputation:** A dated rebind observed 0.297 ms local execution and 1.208 ms host overall; initial execution was 1.613 ms. These single spans are not browser latency or an SLA. Native `node:sqlite` avoids a separate SQLite addon build. The authenticated control API bounds request bodies at 64 KiB and supported projected responses at 256 KiB. Five direct runtime dependencies. | `src/blind.ts`<br>`submission/architecture.svg` |
| **3. Security Reporting & Audit** | **20%** | **Real-Time Telemetry & Inspectable Export:** The dashboard shows policy posture, audit events and monotonic timing spans. Versioned JSON evidence (`proofgate-blind-evidence-1`) and SHA-256 digests support integrity comparisons; they do not establish immutable, signed or authenticated audit history. External exports are refused deterministically with 0 sink effects. | Live Dashboard<br>`submission/evidence.json` |
| **4. Self-Testing Suite** | **20%** | **339 Tests, 100% Offline Passing:** Bounded unit, security and integration suites covering positive operations, adversarial attacks, budget starvation, and independent reconciliation. No cloud credentials or live model network calls during offline execution; installation needs registry access. Counts are executed test cases, not 339 distinct attacks. | Run `npm test`<br>`dist/test/offline/` |
| **5. Implementability & Scalability** | **10%** | **Documented Developer Integration:** Bearer API with asynchronous completion/revision checks, locked dependencies, restricted guest lab access, and shared non-replenishing call/credit admission ledger (`9e1f722a-b94d-4a2e-b37d-384ad9683ffb`). | [Integration Guide](#-minimal-integration-guide)<br>`src/contracts.ts` |

---

## ⏱️ Test ProofGate in 60 Seconds (Live Demo Walkthrough)

Open **[https://proofgate.michaljablonski.dev](https://proofgate.michaljablonski.dev)** on your desktop or phone to test the system live:

1. **Step 1: Inspect Autonomous Planning Without Data Exposure**
   * The page automatically loads an actual AI-composed method (`select_due(60)` → `calculate_targets` → `rank(soonest)` → `take(2)` → `render`).
   * Expand **"What models received"**: Verify that the remote Gemini model received only the public goal and capability grammar—**zero private records or pricing rules**.
2. **Step 2: Change a Private Quote Without Asking AI Again**
   * Click **"Try a private quote change (+$100)"**: it increases Middle's private synthetic quote only, applies the edit and rebinds the retained method. It does not change the company pricing rule.
   * On the retained cloud baseline, potential opportunity changes from **$1,060 to $1,160**. The shared workspace may already have changed; inspect the actual before/after brief rather than assuming fixed numbers.
   * **The Key Proof:** Compare the measured provider-attempt difference and retained model request bodies: the local rebind adds **0 new provider attempts**. This does not mean zero browser/host latency or free hosting.
   * The separate historical **$130 → $1,060 / Near–Middle → Middle–Large** proof changed both private records and the price-ceiling rule from 2% to 4%. The current button does not recreate that experiment.
3. **Step 3: Test Side-Effect Enforcement (Negative & Positive)**
   * Click **"Attempt external export"** ➔ **BLOCKED** with `EXTERNAL_SINK_DENIED` (0 external leaks).
   * Click **"Save exact internal brief"** ➔ **PERMITTED** via typed MCP stdio to internal SQLite with independent read-back.
4. **Step 4: Fresh Hosted AI Composition (Optional)**
   * Click **"Compose AI method"** to trigger fresh live Vertex AI Gemini 3.5 Flash composition and Flash-Lite inspection under the shared allowance.

---

## 🔐 Security & Policy Control Architecture

ProofGate enforces a multi-layer defense-in-depth pipeline. The golden rule: **Deterministic rules strictly dominate semantic AI approvals.**

```mermaid
flowchart TD
  subgraph Input_Gating["Input Gating & Sanitization"]
    UI[Untrusted Employee Advisory / Input] --> PII[Deterministic PII & Secret Scanner]
    PII --> SIG[Deterministic Literal Signature Feed]
    SIG --> CHK[Stateless Semantic AI Checker\nGemini 3.5 Flash-Lite]
  end

  subgraph Admission_Boundary["Admission Decision Boundary"]
    CHK -->|Adversarial / Injected| QUAR[Whole-Source Advisory Quarantine:\n0 Bytes Transmitted to Actor]
    SIG -->|Signature Match| QUAR
    CHK -->|Benign| ADMIT[Admitted Clean Context]
  end

  subgraph Model_Execution["Bounded Model Execution"]
    ADMIT --> ACTOR[Hosted Actor LLM - Gemini 3.5 Flash\nStructured Output Request + Host Validation]
    QUAR --> ACTOR
    ACTOR --> RECIPE[Declarative Operation Recipe AST]
  end

  subgraph Local_Execution["Local Execution & Governed Persistence"]
    RECIPE --> LOCAL[Company-Controlled Host Engine\nPrivate In-Memory Execution]
    LOCAL --> SINK_GATE{Policy Sink Rules}
    SINK_GATE -->|External Sink Request| DENY[Deterministic Refusal:\nEXTERNAL_SINK_DENIED (0 Effects)]
    SINK_GATE -->|Internal Save| MCP[MCP Subprocess\nStdio / Stripped Credentials]
    MCP --> DB[(Private SQLite Store)]
    DB --> RECON[Independent Read-Back Reconciliation:\nDirect SQLite Hash Verification]
  end
```

### The 6 Core Security Pillars

| Security Pillar | Threat / Vector Mitigated | Technical Implementation | Verified In |
| :--- | :--- | :--- | :--- |
| **1. Whole-Source Advisory Quarantine** | Indirect Prompt Injection & MCP Toxic Flow (OWASP LLM01 / LLM06; Invariant Labs disclosure). | When poisoned input is detected, ProofGate zeroes out the entire advisory (`text = ''`, `status = 'quarantined'`). Zero bytes of the quarantined advisory reach the actor; this does not mean the actor receives no safe task context. Clean essential facts are retained independently from trusted fixtures. | `test/offline/security.test.ts` |
| **2. Strict Host Schema Validation** | Unconstrained Agent Output, arbitrary code execution, SQL injection (OWASP LLM02). | Vertex structured-output schemas request declarative recipes (`RecipeSchema`). A model can still emit invalid or free-form content; strict host parsing and whole-recipe validation reject unsupported outputs before private execution. No generated SQL or shell code is executed; the host renders briefs deterministically. | `test/offline/blind.test.ts` |
| **3. Policy & Model Allowlists** | Model spoofing, SSRF, unauthorized model costs. | `config/policy.json` seeds a fresh SQLite store. The current versioned policy and model allowlist are read or updated through `/api/policy` with `expectedVersion`; editing the seed file does not change an existing store. The accepted configured actor/checker are `gemini-3.5-flash` / `gemini-3.5-flash-lite`; policy governs allowed models. Custom `meteredFetch` verifies wire-level Google Vertex destination before sending packets. | `src/model.ts` |
| **4. Deterministic Veto over Semantic AI** | Prompt injection bypassing semantic checkers. | Deterministic PII, secret regex, and literal signatures take absolute precedence over semantic AI approvals. Semantic checker errors/timeouts **fail closed** (`CHECKER_FAILED_CLOSED`); uncertain or below-threshold-confidence verdicts **fail closed** as `CHECKER_UNCERTAIN`. | `test/offline/security.test.ts` |
| **5. Reduced Child Credential Exposure** | Credential harvesting and tool privilege escalation. | MCP child processes use `StdioClientTransport` with deliberately stripped environments and no supplied provider tokens/ADC settings. This is not an OS or network sandbox: the trusted host and filesystem remain part of the boundary. Browser capability tokens are kept in memory. | `fixture/blind-server.ts` |
| **6. Manual Export Refusal & Anti-Exfiltration** | Unauthorized external data exfiltration. | Manual external export requests (`POST /api/blind/runs/:id/export` to external sink) are deterministically rejected with `EXTERNAL_SINK_DENIED` and 0 sink effects. Internal saves require matching server-issued revision UUIDs. | `test/offline/blind.test.ts` |

---

## 🏗️ Technical Architecture & Engineering Elegance

ProofGate is a bounded hackathon implementation with explicit reproduction prerequisites and measured behavior; it does not establish production reliability, scale or universal security:

1. **Native `node:sqlite` (`DatabaseSync` in WAL Mode)**
   - Utilizes Node 22’s built-in SQLite engine (`import { DatabaseSync } from 'node:sqlite'`).
   - **No separate SQLite addon compilation:** Native `node:sqlite` avoids a SQLite addon/toolchain dependency. Installation still needs the pinned compatible Node runtime and npm registry access; archive tooling/tests use Python 3. Instant cross-platform installation is not claimed.
   - Isolated two-tier storage: **Control Plane** (`host.sqlite` for runs, policy snapshots, admission ledger) and **Data Plane** (`fixture.sqlite` for private artifacts and drafts).
2. **Hardened Fastify 5.12.5 Gateway**
   - Bounded payloads: `bodyLimit: 65536` (64 KiB) and `CONTROL_RESPONSE_BOUND = 262144` (256 KiB) bound accepted control requests and supported projected responses; these are not global memory or every-HTTP-response guarantees.
   - Constant-time bearer token authentication using `crypto.timingSafeEqual` uses constant-time comparison for equal-length bearer tokens; this is not a general timing-attack guarantee.
   - Strict Content Security Policy (`default-src 'none'`) and `Cache-Control: no-store`.
3. **Governed Model Context Protocol (MCP SDK 1.32.0)**
   - Pre-flight catalog verification: the host verifies exact tool schemas and names via `client.listTools()` before actor dispatch.
   - **Independent Effect Reconciliation:** The host does not trust the MCP tool's self-reported return. It independently opens SQLite via a direct read-only connection, verifies the effect was written by `caller_id = 'developer'`, and confirms the SHA-256 content hash matches the canonical memory brief.
4. **Metered Google GenAI SDK (`@google/genai` 2.27.0)**
   - Custom `meteredFetch` handler intercepts both model calls and internal Google OAuth2 token exchanges. Unmetered retries are disabled.
   - Enforces `ThinkingLevel.MINIMAL` and `includeThoughts: false` to request concise structured responses; neither setting guarantees response time.
5. **Minimal Production Footprint**
   - ProofGate requires only **5 direct runtime dependencies**: `@google/genai`, `@modelcontextprotocol/sdk`, `fastify`, `google-auth-library`, and `zod`.

---

## 💰 Non-Replenishing Economic Ledger & Accounting Integrity

To prevent API billing vulnerabilities and runaway agent loops, ProofGate enforces durable resource accounting:

- **Unified Epoch ID (`9e1f722a-b94d-4a2e-b37d-384ad9683ffb`):** Shared across actor, checker, OAuth refresh, and MCP tool invocations.
- **Durable Ledger in SQLite:** Stored in `.proofgate/host.sqlite`. Starting a new run, refreshing the browser, or resetting the synthetic worksheet **never replenishes allowance credits**.
- **Conservative Admission Credits:** Reserves serialized request + response wire bytes + 16 bytes per declared output token *before* network dispatch. Unknown dispatched attempts remain charged in the owned allowance epoch and are not automatically replayed. General crash recovery and adversarial database-reset resistance are not claimed.
- **Honest Disclosure of Forecast Overrun:**
  - The original combined forecast was **32 attempts**.
  - Actual charges reached **36 attempts / 9,652,824 credits** (24 proof + 12 automated walkthrough attempts).
  - *Root Cause:* Each automated browser save required 4 MCP tool attempts.
  - *Integrity Decision:* Rather than retroactively rewriting forecasts, ProofGate openly preserves `forecastExceeded: true` in `submission/evidence.json` as an inspectable historical accounting discrepancy, not proof of tamper-proof storage.

---

## 🧪 Reproducible Audit Runbook & Verification Matrix

The core offline suite can run without model credentials or live provider calls **after installation**. `npm ci` needs registry access; use Node 22.23.1 and Python 3. The accepted fresh extraction executed 339/339 tests; duration is environment-dependent.

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm test
```

Historical hosted-proof validators require separately supplied retained proof inputs and their exact source context. A fresh clone does **not** contain the ignored `.proofgate/phase05-proof/result.json` or `.proofgate/phase05-intent-proof/result.json`; their commands below are examples for an evidence workspace, not a fresh-clone promise:

```bash
node scripts/check-blind-proof.mjs --input /path/to/retained-original-result.json
node scripts/check-blind-intent-proof.mjs --input /path/to/retained-intent-result.json
```

Inspect the portable dated observations in [`submission/evidence.json`](submission/evidence.json). Canonical delivery metadata validation additionally requires an installed compatible GSD parser at `$CODEX_HOME/gsd-core/bin/gsd-tools.cjs` (default `~/.codex/gsd-core/bin/gsd-tools.cjs`) and current review/verification reports:

```bash
node scripts/check-delivery.mjs --stage metadata
```

Missing parser or stale report means acceptance is unavailable; it must not be reported as passed. [Portable setup and optional artifact regeneration](delivery/README.md) distinguishes core tests from source/deck/package tooling.

### Verification Matrix

| Verification Gate | Tool / Script | Grounding / Independent Oracle | Result |
| :--- | :--- | :--- | :--- |
| **Offline Test Suite** | `npm test` | Intercepted transports, fixture MCP stdio, Fastify routes | **339 passed, 0 failed, 0 skipped** in the accepted extraction; not a timing promise |
| **Blind Proof** | `check-blind-proof.mjs` | Independent integer arithmetic oracle (`independentValues`), frozen file hashes | **Passed** (24 attempts, 0-attempt rebind, exact SQLite read-back) |
| **Public Intention Proof** | `check-blind-intent-proof.mjs` | Preregistered 60-day fixture (`blind-intent-case.json`) | **Passed, historical** (actual Gemini composition; separate private-record and rule mutation, $130→$1,060) |
| **Delivery & Licenses** | `check-delivery.mjs` | Canonical GSD phase parser (`status: passed`), package lock digests | **Passed** (26/26 obligations traced, 176 production dependency entries with recorded notice digests) |

---

## 💻 Developer Quickstart & Local Reproduction

### Prerequisites
- Node.js **22.23.1** (uses native `node:sqlite`)
- npm **10.9.8**
- Python **3** for source-archive tooling/tests; registry access during installation
- Compatible installed GSD parser for canonical delivery acceptance; presentation regeneration has separate optional runtime prerequisites in [delivery/README.md](delivery/README.md)

### 1. Installation & Build
```sh
npm ci --ignore-scripts
npm run build
npm test
```

### 2. Launch Local Workbench
```sh
export PROOFGATE_TOKEN="$(node -e 'process.stdout.write(require("crypto").randomBytes(24).toString("hex"))')"
echo "Your Private Gateway Token: $PROOFGATE_TOKEN"
npm start
```
1. Open **`http://127.0.0.1:3100`** in your browser.
2. Enter the generated `PROOFGATE_TOKEN` and click **Connect**.
3. Choose **Negotiation opportunities**, enter a public context, and inspect the workbench.

*(Live composition requires separately authorized Vertex access and ADC, e.g. an owner-approved `gcloud auth application-default login` for `hackathon-gdg-wroclaw`. A fresh clone has no retained admitted method: it cannot demonstrate rebind until composition has succeeded or an authorized retained demo workspace has been provisioned. Rebind itself makes no model call; offline tests need no cloud credentials. Do not copy private tokens or runtime databases into the repository.)*

---

## 🔌 Minimal Integration Guide

The bearer API starts composition asynchronously. Poll for completion, require a current server-owned result/revision, then save that exact revision. The following example illustrates the control flow; it is not a fresh-clone live-inference claim or a measured integration-time promise. Hosted use requires authorized credentials and allowance.

```javascript
async function callProofGate(path, method = 'GET', body = undefined) {
  const res = await fetch(`http://127.0.0.1:3100${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${process.env.PROOFGATE_TOKEN}`,
      'Content-Type': 'application/json'
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  if (!res.ok) throw new Error(`ProofGate error: ${res.status}`);
  return res.json();
}

// Public input must contain no company secrets; supported scanners are not universal.
const { runId } = await callProofGate('/api/blind/runs', 'POST', {
  taskId: 'negotiation-savings',
  advisory: 'Select the two earliest supplier renewals within 60 days.'
});

const deadline = Date.now() + 120_000; // Stop polling after this deadline; not a server SLA.
let run;
while (Date.now() < deadline) {
  run = await callProofGate(`/api/blind/runs/${encodeURIComponent(runId)}`);
  if (run.runId !== runId) throw new Error('Run identity mismatch');
  if (run.state !== 'running') break;
  await new Promise(resolve => setTimeout(resolve, 300));
}
if (run?.state !== 'succeeded' || !run.resultCurrent || !run.resultRevision || !run.result) {
  throw new Error('No completed current result; inspect the run before any action');
}

// Concurrent workspace/policy changes are rejected by the host; never auto-retry saves.
const save = await callProofGate(`/api/blind/runs/${encodeURIComponent(runId)}/save`, 'POST', {
  resultRevision: run.resultRevision
});
const effects = save.independentEffects;
if (save.runId !== runId || save.resultRevision !== run.resultRevision || !save.resultCurrent ||
    save.save?.state !== 'confirmed' || !save.save.acknowledged ||
    effects?.status !== 'observed' || effects.count !== 1 || !effects.hostAcknowledged || !effects.matchesCanonicalBrief) {
  throw new Error('Save not independently confirmed; unknown dispatched work stays charged');
}

```

### Core API Endpoints

| Endpoint | Method | Authentication | Description |
| :--- | :---: | :---: | :--- |
| `/api/blind/runs` | `POST` | Bearer Token | Submits public goal; returns server-owned `runId`. |
| `/api/blind/runs/:id` | `GET` | Bearer Token | Inspects admitted recipe, local result, model captures, and ledger. |
| `/api/blind/runs/:id/rebind` | `POST` | Bearer Token | Re-evaluates admitted recipe on mutated private data with **0 model calls**. |
| `/api/blind/runs/:id/save` | `POST` | Bearer Token | Governed MCP save of current server-issued `resultRevision`. |
| `/api/blind/runs/:id/export` | `POST` | Bearer Token | External export attempt (deterministically denied with 0 sink effects). |
| `/api/blind/runs/:id/export` | `GET` | Bearer Token | Downloads sanitized versioned audit JSON (`proofgate-blind-evidence-1`); digests support integrity comparison, not immutable/signed history. |
| `/api/blind/artifacts/:id` | `GET` | Bearer Token | Reads the saved fixture artifact for exact content/revision comparison. |
| `/api/policy` | `GET` / `PUT` | Bearer Token | Reads or atomically updates centralized policy configuration (`expectedVersion`). |

---

## 🔍 Boundary Realities & Honest Disclosures

ProofGate adheres to strict scientific integrity and empirical transparency:

- **Synthetic Records Only:** All supplier contracts, quotes, and pricing rules are synthetic; no access to real proprietary enterprise data is claimed.
- **Hosted Vertex AI Models:** Uses Google Vertex AI (`gemini-3.5-flash` actor / `gemini-3.5-flash-lite` checker). The term "local" refers to the company-controlled Node.js host and SQLite store, not a local LLM.
- **Potential Opportunity vs. Realized Savings:** The $130 to $1,060 numbers represent *potential synthetic negotiation targets*, never claimed as realized enterprise cost savings or ROI.
- **Peripheral ERP Fixtures:** Peripheral enterprise integrations (SAP, ERP, email) are implemented as typed fixture tools behind a governed MCP stdio subprocess; no OS/network sandbox is claimed.
- **Public Prompt Boundary:** Public instructions and capability definitions reach remote models. Secrets accidentally pasted into the public instruction field are *not* protected by the worksheet boundary.
- **Causal Downstream Honesty (Phase 02):** In historical release-assistant A/B tests, while hostile input quarantine successfully protected prompt exposure, both on/off actors produced a safe internal release-preparation draft; this was not downstream code generation, installation or deployment. ProofGate documents this lack of observed downstream causal benefit rather than claiming universal safety.
- **Trusted and Narrow Boundary:** Private worksheet values and company rule implementations stay on the trusted host in this demonstrated DSL; public capability definitions and public instructions do not. Employees can inspect private results, and the host operator remains trusted. This is not universal confidentiality or formal noninterference. The anonymous cloud lab is shared synthetic state, not enterprise authentication or tenant isolation.
- **Walkthrough Reality:** The submission records **4 automated browser walkthroughs and 0 human rehearsals**. The backup video is a paced sequence of 7 authentic UI screenshots, not continuous recording or a latency benchmark.

---

## 👥 Team & Submission Information

* **Team Name:** ProofGate
* **HackYeah 2026 Challenge:** Goldman Sachs — AI Control Layer
* **HackTribe Desk / Table:** **Table B25**

### Team Members
* **Michał Jabłoński** — Team Lead; AI / Data Science, Backend, Databases, Cloud / DevOps, Architecture, Pitching
* **Karol Krawczyk** — AI / Data Science, Backend, Software Architecture & Development
* **Kamil Krawczyk** — AI / Data Science, Backend, Cybersecurity, Cloud / DevOps, Business Strategy
* **Viktoriia Vinnykova** — Design / UX, Frontend, Storytelling, QA & Testing

---

## 📦 Key Deliverables & Links

* 🌐 **Public Live Demo:** [https://proofgate.michaljablonski.dev](https://proofgate.michaljablonski.dev)
* 🐙 **Source Code Repository:** [https://github.com/Jabolo/ProofGate](https://github.com/Jabolo/ProofGate)
* 📑 **Presentation Pitch Deck (PDF):** [`submission/presentation.pdf`](https://raw.githubusercontent.com/Jabolo/ProofGate/main/submission/presentation.pdf)
* 🎥 **49-Second Video Backup:** [`submission/backup.mp4`](https://raw.githubusercontent.com/Jabolo/ProofGate/main/submission/backup.mp4)
* 📋 **Presentation Pitch Notes:** [`submission/pitch.md`](submission/pitch.md)
* 🔬 **Audited Evidence Package:** [`submission/evidence.json`](submission/evidence.json)
