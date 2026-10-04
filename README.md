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

ProofGate is a lightweight, zero-trust hybrid control layer designed for Goldman Sachs' AI Control Layer challenge at HackYeah 2026. It gives autonomous agents meaningful reasoning autonomy while enforcing strict enterprise control over data, tools, and spending.

* 🌐 **Live Cloud Demo (Zero Setup / Instant Guest):** **[https://proofgate.michaljablonski.dev](https://proofgate.michaljablonski.dev)**  
  *(Opens immediately on any browser or mobile device — no login, password, token, or configuration required. Hosted on dedicated GCP VM, Desk B25.)*
* 📑 **Official Submission Presentation (9 Slides PDF):** **[View Presentation PDF](https://raw.githubusercontent.com/Jabolo/ProofGate/main/submission/presentation.pdf)**
* 🎥 **49-Second Video Walkthrough (Authentic UI):** **[Watch Backup Video MP4](https://raw.githubusercontent.com/Jabolo/ProofGate/main/submission/backup.mp4)**
* 📊 **Machine-Readable Cryptographic Audit Evidence:** [`submission/evidence.json`](submission/evidence.json)
* 💻 **10-Second Offline Test Run (Zero Cloud Keys Needed):**
  ```bash
  git clone https://github.com/Jabolo/ProofGate.git && cd ProofGate
  npm ci --ignore-scripts && npm test
  ```

---

## 💡 The Core Problem & The "Public Plans, Private Results" Paradigm

Enterprises cannot safely adopt autonomous AI agents without solving three existential risks:
1. **Confidential Data Leaks:** Stuffing proprietary vendor quotes, internal pricing rules, and PII into prompts sent to third-party LLMs.
2. **Unconstrained Side-Effects & Poisoned Tool Calls:** Agents executing unauthorized database writes or malicious external network exports when tricked by prompt injections.
3. **Runaway Financial Spending:** Recursive agent loops draining API quotas without strict, non-bypassable admission accounting.

ProofGate solves this with **Blind Workbench** — a strict architectural separation:

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
        Employee -->|Approve Internal Save| MCPServer["Isolated MCP Stdio Child\n(No Credentials / Pinned Catalog)"]
    end

    subgraph Independent_Storage["Independent SQLite Effect Store"]
        MCPServer -->|Write Brief| FixtureDB[("Internal Fixture SQLite")]
        Gateway -.->|Independent Read-Back Reconciliation\n(Exact Content Hash Match)| FixtureDB
    end
```

### The Data Boundary: What Cloud Models See vs. What Stays Inside

| Information Type | Disclosed to Cloud LLMs (Vertex AI Gemini) | Kept Strictly Inside Company Host (Node.js / SQLite) |
| :--- | :--- | :--- |
| **Business Intent** | Abstract public goal (e.g., *"earliest 2 renewals within 60 days"*) | Specific corporate contract strategy & internal annotations |
| **Supplier Data** | **None** (Blocked by `AdvisorySchema` and PII scanners) | Private supplier names, contract registers, expiration dates, raw quotes |
| **Pricing Formulas** | **None** | Internal margin rules (`maxIncreaseBp`), savings thresholds (`minimumSavingCents`) |
| **Output / Brief** | **None** (LLM outputs declarative JSON recipe only) | Computed supplier targets, price ceilings, and rendered negotiation briefs |
| **Action & Persistence** | **None** (Models have no database access) | Governed local MCP save + independent SQLite read-back verification |

---

## 🏆 Goldman Sachs Evaluation Scorecard

How ProofGate delivers across the 5 official competition criteria (*RULES AI Control Layer.pdf* & Goldman Sachs Task Contract):

| Evaluation Criterion | Weight | How ProofGate Delivers | Where to Verify |
| :--- | :---: | :--- | :--- |
| **1. Robustness & Guardrails** | **30%** | **Dual Hybrid Inspection:** Deterministic filters (PII, secret regex, strict Zod schemas) run alongside stateless Gemini 3.5 Flash-Lite semantic checking. **Deterministic veto dominates** (semantic allow never overrides deterministic denial). Whole-source advisory quarantine neutralizes prompt injections (Invariant Labs MCP vulnerability analogue). | `src/host.ts`<br>`test/offline/security.test.ts` |
| **2. Architecture & Performance** | **20%** | **Sub-Millisecond Recomputation:** Local in-memory AST execution runs in `<1ms`. Node 22 native `node:sqlite` in WAL mode eliminates C++ compilation dependencies. Lightweight Fastify gateway with strict 64 KiB request and 256 KiB response bounds. Only 5 runtime dependencies. | `src/blind.ts`<br>`submission/architecture.svg` |
| **3. Security Reporting & Audit** | **20%** | **Real-Time Telemetry & Tamper-Evident Export:** Live web dashboard displays policy posture, audit trail, monotonic timing spans, and immutable JSON evidence (`proofgate-blind-evidence-1`) with SHA-256 cryptographic hashes. External exports are refused deterministically with 0 sink effects. | Live Dashboard<br>`submission/evidence.json` |
| **4. Self-Testing Suite** | **20%** | **339 Tests, 100% Offline Passing:** Comprehensive unit, security, and integration suites covering positive operations, adversarial attacks, budget starvation, and independent reconciliation. 0 cloud credentials or network required. | Run `npm test`<br>`dist/test/offline/` |
| **5. Implementability & Scalability** | **10%** | **Zero-Config Developer Experience:** 10-line fetch integration, locked dependencies, zero-config guest access, and shared non-replenishing call/credit admission ledger (`9e1f722a-b94d-4a2e-b37d-384ad9683ffb`). | [Integration Guide](#-minimal-integration-guide)<br>`src/contracts.ts` |

---

## ⏱️ Test ProofGate in 60 Seconds (Live Demo Walkthrough)

Open **[https://proofgate.michaljablonski.dev](https://proofgate.michaljablonski.dev)** on your desktop or phone to test the system live:

1. **Step 1: Inspect Autonomous Planning Without Data Exposure**
   * The page automatically loads an actual AI-composed method (`select_due(60)` → `calculate_targets` → `rank(soonest)` → `take(2)` → `render`).
   * Expand **"What models received"**: Verify that the remote Gemini model received only the public goal and capability grammar—**zero private records or pricing rules**.
2. **Step 2: Test Zero-Cost Local Recomputation ($130 → $1,060)**
   * Click **"Try a private quote change (+$100)"**.
   * Private synthetic supplier quotes update, and company price ceiling increases from 2% to 4%.
   * The supplier selection changes from Near/Middle to Middle/Large, and the brief recalculates instantly in `<1ms`.
   * **The Key Proof:** Look at the provider attempt counter: **0 new provider attempts, 0 token spend, 0 added latency**.
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
    ADMIT --> ACTOR[Hosted Actor LLM - Gemini 3.5 Flash\nStrict OpenAPI Schema Lock]
    QUAR --> ACTOR
    ACTOR --> RECIPE[Declarative Operation Recipe AST]
  end

  subgraph Local_Execution["Local Execution & Sandboxed Persistence"]
    RECIPE --> LOCAL[Company-Controlled Host Engine\nPrivate In-Memory Execution]
    LOCAL --> SINK_GATE{Policy Sink Rules}
    SINK_GATE -->|External Sink Request| DENY[Deterministic Refusal:\nEXTERNAL_SINK_DENIED (0 Effects)]
    SINK_GATE -->|Internal Save| MCP[Sandboxed MCP Subprocess\nStdio Transport / Zero Credentials]
    MCP --> DB[(Private SQLite Store)]
    DB --> RECON[Independent Read-Back Reconciliation:\nDirect SQLite Hash Verification]
  end
```

### The 6 Core Security Pillars

| Security Pillar | Threat / Vector Mitigated | Technical Implementation | Verified In |
| :--- | :--- | :--- | :--- |
| **1. Whole-Source Advisory Quarantine** | Indirect Prompt Injection & MCP Toxic Flow (OWASP LLM01 / LLM06; Invariant Labs disclosure). | When poisoned input is detected, ProofGate zeroes out the entire advisory (`text = ''`, `status = 'quarantined'`). Zero bytes reach the actor model. Clean essential facts are retained independently from trusted fixtures. | `test/offline/security.test.ts` |
| **2. Strict JSON Schema Lock** | Unconstrained Agent Output, arbitrary code execution, SQL injection (OWASP LLM02). | Models are constrained via native Vertex AI OpenAPI schemas to discriminated union ASTs (`RecipeSchema`). Models cannot generate free-form SQL, shell commands, or unvetted text. Host renders briefs deterministically. | `test/offline/blind.test.ts` |
| **3. Policy & Model Allowlists** | Model spoofing, SSRF, unauthorized model costs. | Centralized in versioned `config/policy.json`. Models locked to `gemini-3.5-flash` and `gemini-3.5-flash-lite`. Custom `meteredFetch` verifies wire-level Google Vertex destination before sending packets. | `src/model.ts` |
| **4. Deterministic Veto over Semantic AI** | Prompt injection bypassing semantic checkers. | Deterministic PII, secret regex, and literal signatures take absolute precedence over semantic AI approvals. If the semantic checker encounters an error, timeout, or uncertainty, it **fails closed** (`CHECKER_FAILED_CLOSED`). | `test/offline/security.test.ts` |
| **5. Credential & Process Isolation** | Credential harvesting and tool privilege escalation. | MCP child processes run via `StdioClientTransport` with stripped environments—zero Google ADC credentials, zero API tokens, and zero network access. Browser uses transient in-memory tokens only. | `fixture/blind-server.ts` |
| **6. Manual Export Refusal & Anti-Exfiltration** | Unauthorized external data exfiltration. | Manual external export requests (`POST /api/blind/runs/:id/export` to external sink) are deterministically rejected with `EXTERNAL_SINK_DENIED` and 0 sink effects. Internal saves require matching server-issued revision UUIDs. | `test/offline/blind.test.ts` |

---

## 🏗️ Technical Architecture & Engineering Elegance

ProofGate is engineered for production reliability, minimal overhead, and absolute reproducibility:

1. **Native `node:sqlite` (`DatabaseSync` in WAL Mode)**
   - Utilizes Node 22’s built-in SQLite engine (`import { DatabaseSync } from 'node:sqlite'`).
   - **Zero C++ compilation toolchains:** Eliminates `better-sqlite3`, `sqlite3`, `node-gyp`, and Python build dependencies, guaranteeing instant, cross-platform installation.
   - Isolated two-tier storage: **Control Plane** (`host.sqlite` for runs, policy snapshots, admission ledger) and **Data Plane** (`fixture.sqlite` for private artifacts and drafts).
2. **Hardened Fastify 5.12.5 Gateway**
   - Bounded payloads: `bodyLimit: 65536` (64 KiB) and `CONTROL_RESPONSE_BOUND = 262144` (256 KiB) prevent buffer bloat and memory exhaustion.
   - Constant-time bearer token authentication using `crypto.timingSafeEqual` blocks timing attacks.
   - Strict Content Security Policy (`default-src 'none'`) and `Cache-Control: no-store`.
3. **Sandboxed Model Context Protocol (MCP SDK 1.32.0)**
   - Pre-flight catalog verification: the host verifies exact tool schemas and names via `client.listTools()` before actor dispatch.
   - **Independent Effect Reconciliation:** The host does not trust the MCP tool's self-reported return. It independently opens SQLite via a direct read-only connection, verifies the effect was written by `caller_id = 'developer'`, and confirms the SHA-256 content hash matches the canonical memory brief.
4. **Metered Google GenAI SDK (`@google/genai` 2.27.0)**
   - Custom `meteredFetch` handler intercepts both model calls and internal Google OAuth2 token exchanges. Unmetered retries are disabled.
   - Enforces `ThinkingLevel.MINIMAL` and `includeThoughts: false` for sub-second, direct structured JSON responses.
5. **Minimal Production Footprint**
   - ProofGate requires only **5 direct runtime dependencies**: `@google/genai`, `@modelcontextprotocol/sdk`, `fastify`, `google-auth-library`, and `zod`.

---

## 💰 Non-Replenishing Economic Ledger & Accounting Integrity

To prevent API billing vulnerabilities and runaway agent loops, ProofGate enforces durable resource accounting:

- **Unified Epoch ID (`9e1f722a-b94d-4a2e-b37d-384ad9683ffb`):** Shared across actor, checker, OAuth refresh, and MCP tool invocations.
- **Durable Ledger in SQLite:** Stored in `.proofgate/host.sqlite`. Starting a new run, refreshing the browser, or resetting the synthetic worksheet **never replenishes allowance credits**.
- **Conservative Admission Credits:** Reserves serialized request + response wire bytes + 16 bytes per declared output token *before* network dispatch. Unknown dispatched attempts remain permanently charged and are never replayed.
- **Honest Disclosure of Forecast Overrun:**
  - The original combined forecast was **32 attempts**.
  - Actual charges reached **36 attempts / 9,652,824 credits** (24 proof + 12 automated walkthrough attempts).
  - *Root Cause:* Each automated browser save required 4 MCP tool attempts.
  - *Integrity Decision:* Rather than retroactively rewriting forecasts, ProofGate openly preserves `forecastExceeded: true` in `submission/evidence.json` as empirical proof of tamper-evident accounting.

---

## 🧪 Reproducible Audit Runbook & Verification Matrix

Anyone can independently verify the entire ProofGate control layer locally with **zero cloud credentials and zero network access**:

```bash
# 1. Complete offline test suite (339 assertions pass in ~40 seconds)
npm test

# 2. Phase 05 original proof validator & independent arithmetic oracle
node scripts/check-blind-proof.mjs --input .proofgate/phase05-proof/result.json

# 3. Public 60-day intention proof validator
node scripts/check-blind-intent-proof.mjs --input .proofgate/phase05-intent-proof/result.json

# 4. Delivery compliance, requirement traceability (26/26) & package license audit
node scripts/check-delivery.mjs --stage metadata
```

### Verification Matrix

| Verification Gate | Tool / Script | Grounding / Independent Oracle | Result |
| :--- | :--- | :--- | :--- |
| **Offline Test Suite** | `npm test` | Intercepted transports, fixture MCP stdio, Fastify routes | **339 passed, 0 failed, 0 skipped** (~41s) |
| **Blind Proof** | `check-blind-proof.mjs` | Independent integer arithmetic oracle (`independentValues`), frozen file hashes | **Passed** (24 attempts, 0-attempt rebind, exact SQLite read-back) |
| **Public Intention Proof** | `check-blind-intent-proof.mjs` | Preregistered 60-day fixture (`blind-intent-case.json`) | **Passed** (Actual Gemini 3.5 Flash composition, $130→$1,060 private mutation) |
| **Delivery & Licenses** | `check-delivery.mjs` | Canonical GSD phase parser (`status: passed`), package lock digests | **Passed** (26/26 obligations traced, 176 package notice digests checked) |

---

## 💻 Developer Quickstart & Local Reproduction

### Prerequisites
- Node.js **22.23.1** (uses native `node:sqlite`)
- npm **10.9.8**

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

*(Note: Live hosted inference requires authorized Vertex AI ADC credentials via `gcloud auth application-default login` for project `hackathon-gdg-wroclaw`. Offline tests and local rebinds require zero credentials.)*

---

## 🔌 Minimal Integration Guide

Developers can integrate ProofGate in under 10 lines of code via its bearer-authenticated API:

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

// 1. Dispatch public business intent (models see zero private data)
const { runId } = await callProofGate('/api/blind/runs', 'POST', {
  taskId: 'negotiation-savings',
  advisory: 'Select the two earliest supplier renewals within 60 days.'
});

// 2. Observe admitted recipe and locally computed brief
const run = await callProofGate(`/api/blind/runs/${runId}`);

// 3. Save exact brief through governed MCP tool with independent SQLite verification
const save = await callProofGate(`/api/blind/runs/${runId}/save`, 'POST', {
  resultRevision: run.resultRevision
});
```

### Core API Endpoints

| Endpoint | Method | Authentication | Description |
| :--- | :---: | :---: | :--- |
| `/api/blind/runs` | `POST` | Bearer Token | Submits public goal; returns server-owned `runId`. |
| `/api/blind/runs/:id` | `GET` | Bearer Token | Inspects admitted recipe, local result, model captures, and ledger. |
| `/api/blind/runs/:id/rebind` | `POST` | Bearer Token | Re-evaluates admitted recipe on mutated private data with **0 model calls**. |
| `/api/blind/runs/:id/save` | `POST` | Bearer Token | Governed MCP save of current server-issued `resultRevision`. |
| `/api/blind/runs/:id/export` | `POST` | Bearer Token | External export attempt (deterministically denied with 0 sink effects). |
| `/api/blind/runs/:id/export` | `GET` | Bearer Token | Downloads sanitized, tamper-evident cryptographic audit JSON (`proofgate-blind-evidence-1`). |
| `/api/policy` | `GET` / `PUT` | Bearer Token | Reads or atomically updates centralized policy configuration (`expectedVersion`). |

---

## 🔍 Boundary Realities & Honest Disclosures

ProofGate adheres to strict scientific integrity and empirical transparency:

- **Synthetic Records Only:** All supplier contracts, quotes, and pricing rules are synthetic; no access to real proprietary enterprise data is claimed.
- **Hosted Vertex AI Models:** Uses Google Vertex AI (`gemini-3.5-flash` actor / `gemini-3.5-flash-lite` checker). The term "local" refers to the company-controlled Node.js host and SQLite store, not a local LLM.
- **Potential Opportunity vs. Realized Savings:** The $130 to $1,060 numbers represent *potential synthetic negotiation targets*, never claimed as realized enterprise cost savings or ROI.
- **Peripheral ERP Fixtures:** Peripheral enterprise integrations (SAP, ERP, email) are implemented as typed fixture tools behind a sandboxed MCP stdio subprocess.
- **Public Prompt Boundary:** Public instructions and capability definitions reach remote models. Secrets accidentally pasted into the public instruction field are *not* protected by the worksheet boundary.
- **Causal Downstream Honesty (Phase 02):** In historical release-assistant A/B tests, while hostile input quarantine successfully protected prompt exposure, downstream code generation succeeded identically in both on/off arms. ProofGate documents this lack of observed downstream causal benefit rather than claiming universal safety.
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
