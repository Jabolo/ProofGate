---
phase: 05-blind-workbench
plan: "03"
status: complete
subsystem: proof-harness
tags: [blind, hosted-gate, validation]
requires: [05-01, 05-02]
provides: [frozen-four-case-fixture, gated-root-runner, strict-proof-validator, offline-fault-tests]
affects: [BLIND-01, BLIND-02, BLIND-03, BLIND-04, BLIND-05]
key-files:
  created: [test/blind-cases.json, test/hosted/blind.test.ts, test/offline/blind-proof.test.ts, scripts/check-blind-proof.mjs]
completed: 2026-10-04
tasks_completed: 3
acceptance: current-independent-gates-and-local-release-passed
---

# Phase 05 Plan 03: Actual proof and verified local delivery

Tasks1–3 are complete for the bounded local phase execution. Current original/new-intention actual proofs,335/335 regression, independent review, SECURED14/14, UI18/24/zero blockers, canonical all26 verification and root local release passed. Historical authoring/pause sections below are retained; this final closure supersedes their pending notices. See05-LIVE-EVIDENCE.md for conserved allowance and historical rehearsal cost correction.

## Implemented and verified

- Exactly four frozen cases, one observation each: benign, active, quoted and signature-free paraphrase. Benign/quoted are reused as the two objective compositions. The synthetic toxic-flow adaptation cites [Invariant Labs' GitHub MCP disclosure](https://invariantlabs.ai/blog/mcp-github-vulnerability), checked against that primary page during authoring.
- Hosted runner uses actual `createHost`/`createModelAdapter`, existing retained databases, public profiles and the host's registered allowance ports. A single guard covers OAuth, generation and MCP reservations/dispatches. Unknown/failed work stops later observations; partial results preserve every attempt and original approval. Existing proof output forbids automatic replay.
- Minimal authorized local arithmetic observations contain hashed identities, integer inputs and rule values, never names or complete briefs. The validator independently recomputes expectations from those local observations. Public exported model bodies continue to exclude private inputs/results.
- Same-objective construction and exact same-plan checker construction remain equal after private quote/rule changes. Original captured body arrays remain byte-identical; epoch/charged counts must stay unchanged during rebind.
- Stale save/manual external refusal are checked against direct read-only effect counts. Exact internal save is independently matched through a separate SQLite reader. Budget denial/restoration runs **before all four hosted compositions** at the original approval ledger with zero new charges/effects. Only calls/credits and monotonic policy versions change during denial; restored policy equals initial accepted policy except version +2. Every actual composition/rebind/save must use the verified restored policy basis. Retained recipes remain current for zero-provider rehearsal.
- `npm run build && node --test dist/test/offline/blind-proof.test.js dist/test/offline/blind.test.js dist/test/offline/blind-evidence.test.js`: **65/65 pass**, zero failures/skips. Includes 33 proof tests (30 named rejection faults), including rejection of composition at the original pre-restoration policy. Test completeness objects are explicitly fabricated offline fixtures and never establish actual hosted acceptance.
- Unmarked hosted command, explicitly `PROOFGATE_LIVE=0 PROOFGATE_BLIND_ROOT=0`, exits 1 with `ROOT_MARKER_REQUIRED`; zero passing skips. This prerequisite check occurs before ADC, token/store reads or network access.

## TDD evidence and deviations

RED target: `independent arithmetic respects private ceiling, saving filter and risk ordering`. The initial oracle stub returned null; the executed assertion expected `[{id:'a',targetCents:10200,savingCents:1800,atRisk:false}]`. Exit 1; one test discovered, one failed with `ERR_ASSERTION`. The initial dist-relative import error is **INVALID_RED** and excluded.

Persisted command, target assertion/TAP excerpt and result: `/tmp/proofgate-05-03-red-evidence.json`. Installed `gsd-tools.cjs check tdd-red-evidence` returns **RED_EVIDENCE_OK**, reason `target_test_failed`. The record transparently notes condensed pretty-print/stack output. Root received the meaningful failure before implementation. SDK persistence/check occurred after GREEN; root explicitly retained sole Git ownership and deferred commits until terminal authoring, so no worker RED/GREEN commits exist. Root must retain this evidence and assess that protocol limitation when integrating.

Two bounded authoring corrections: fix the compiled test's JavaScript import location and detach a fabricated before/after ledger alias so its mutation fault actually differs. The strict validator subsequently gained independent arithmetic/attempt projection checks; affected checks were rerun because those changes warranted verification. No source-core, UI, package or dependency changes were made here.

Root then requested a concrete protocol-order correction: deny/restore before hosted compositions, conserving original allowance and leaving retained recipes admitted under the final current policy. The isolated offline fixture now performs a real zero-dispatch budget denial against its own synthetic retained ledger before composing. That exposed a validator bug requiring a returned model identity even on an intentionally rejected zero-dispatch measurement; identity is now mandatory on resolved generation spans, while the blocked zero-attempt control observation retains its truthful rejected span. Affected build/tests were rerun for these material changes.

## Root checkpoint and operator commands

**Gate: blocking-human / root-owned operational execution.** Task 1 is incomplete until reviewed actual calls and validator acceptance. Child performed no actual provider calls, ADC access, retained live-store reads, Git mutations, shared-state updates, installations or external actions. Root owns local commits, final acceptance and the live listener/stores.

1. Review the four owned files and integrated core fixes. Stop the existing owned port-3100 listener before starting this harness; the harness verifies refusal on that port and must own the sole `createHost` using retained stores. Preserve the token file at `.proofgate/workbench-token` privately; never print it.
2. Existing host/fixture stores must already contain additive Blind tables. If missing, root alone may initialize reviewed additive Blind recorder tables in the retained fixture database (not a fresh store), while conserving release tables and ledger. Missing tables fail preflight. No initialization was performed by the child.
3. From the reviewed workspace, root records a read-only database snapshot into an approval file. This writes only the approval artifact; database access is read-only and no credentials are emitted:

```sh
mkdir -p .proofgate/phase05-proof
PROOFGATE_LIVE=1 PROOFGATE_BLIND_ROOT=1 node scripts/check-blind-proof.mjs --preflight > .proofgate/phase05-proof/approval.tmp && mv .proofgate/phase05-proof/approval.tmp .proofgate/phase05-proof/approval.json
```

Preflight reads current accepted policy/feed, retained attempt IDs/digest/unknown counts, same epoch and charges, hashes for source/fixtures/profiles/schemas, and private workspace hash. It requires two policy-version increments and finite headroom. Predicted conservative maximum is **32 new charged attempts** and `32 × (requestBytes + responseBytes + 16 × max(actorTokens, checkerTokens))` admission credits, capped at **11534336** and existing remaining policy limits. This includes auth/tool traffic and does not reset/replenish anything. Source/fixture changes after approval require new root review/preflight before any actual call.

Approval still describes the original accepted policy/ledger (for example version 14). First the runner establishes blocked budget version 15 and exact restoration version 16 without additional charges/effects; all four hosted compositions and two retained objective rebinds/saves then require version 16. Validator derives the effective composition policy strictly from the verified `controls.policyRestored`, never edits the original approval or allowance ceiling. Approval/result schemas and commands are unchanged.

4. Exact root command and validator:

```sh
PROOFGATE_LIVE=1 PROOFGATE_BLIND_ROOT=1 node --test --test-concurrency=1 dist/test/hosted/blind.test.js
node scripts/check-blind-proof.mjs --input .proofgate/phase05-proof/result.json
```

Stop on any failure. Retain `.proofgate/phase05-proof/result.json`, its charges and partial observations; do not automatically replay. The runner prints progress between finite observations. This child has not executed those marked commands.

## Package handoff interface

Exported `ApprovalSchema` and `ProofSchema` in `scripts/check-blind-proof.mjs` define the strict interfaces. Outer proof version is `proofgate-blind-proof-1`; actual completeness requires `mode: actual_hosted`, `status: complete`, `error: null`. It carries original approval/hash sets; four sanitized `proofgate-blind-evidence-1` observations; two objective rebind/save proofs; local input/value claims; strict policy-budget denial/restoration; all new attempts; same-epoch final ledger and retained-work digests. Public SDK captures carry live hosted dispatch source, actual requested/returned identity, known usage, model/local/MCP spans and exact serialized bodies. Independent save observations bind action/parent/revision/artifact/effect IDs and exact content hash/byte equality. Partial output deliberately fails completeness validation.

Root/package author must explicitly separate approved local private value observations from public exports; raw runtime files stay ignored and no headers/credentials/private complete briefs enter the package. Historical release evidence remains separately labeled. Task 2/3 need actual accepted proof and root-owned browser screenshots/rehearsal; no invented actual visuals were prepared.

README API/scene/proof commands match authored endpoints and pending-gate claims. Its setup omits the newly concrete approval snapshot creation and sole-listener/additive-table prerequisite; report to root for a bounded Plan05-02 documentation repair. No README edit by this child.

## Git and remaining work

Observed starting branch `master`, HEAD `f2838a5`; root dispatched no upstream/remote and no push authorization. Four authoring files remain intentionally untracked for root integration; pre-existing untracked owner artifacts and concurrent core-fixer edits are preserved. Root owns any branch safety decision and all commits. No measured commit actuals or complete-plan metadata are fabricated.

Remaining: root review/actual proof, Tasks 2–3 package/browser inputs, phase REVIEW and canonical verification. No requirement is marked accepted and no shared planning pointer is advanced.

## Self-Check: PASSED for authored checkpoint only

Four owned artifacts exist and TypeScript/affected offline checks pass. Actual proof, live correctness, package, phase acceptance and commits remain unverified/pending. No child agents spawned by this worker.

## Owner pause checkpoint

Actual proof/result COMPLETE:24attempts/6502120credits. Three automated retained-plan browser rehearsals complete,12tool attempts extra; cumulative36 against original32forecast is disclosed. UI/network, final regression/current all26/security/package/deck gates remain incomplete. Package worker edited onlycheck-delivery.mjs (untested v2/current-phase WIP; oldmetadata nowfails). Pitch native builder/script retained privately; only4structure slides inspected, final9slideexport absent; submissionPDF remains historical. Backup49s paced real UI capture MP4 generated but final visual inspection pending. No new paid work; all child lanes stopped/terminal.

## Current execution checkpoint — supersedes the paused delivery notices above

At 2026-10-04T02:48Z, original actual proof24/6502120, new public-intention proof8/2150481 and strict validators pass. Four accurately labeled automated walkthroughs exist (three earlier prepared90-day, one current60-day); zero human rehearsals. Current walk4/1050011 tool charges has zero provider/auth delta, actual $130→$1200→$1060 and exact independent internal save. Historical36/32forecast discrepancy and10charged unknowns remain unchanged; same epoch ends328/89021463, no new paid work during delivery closure.

Source freeze2d2c4c9f171f8085a291d71f20034600d8d3509c; actual full regression335/335, zero failures/skips in .proofgate/phase05-final-regression-6.tap. Independent current code review clean and UI auditverified18/24/zeroUIblockers bind current32-file canonicaldigest0165e767…ec26. One fresh extraction failed334/335 because a refusal fixture became a no-op after legitimate capture freeze; its explicit provisional-scope mutation is repaired, independently rejects CAPTURE_REVISION, and failure is preserved. Root's corrected isolated extraction a811b9d6… sourceZIP passes npmci/build and335/335offline without credentials/private runtime/GSD; absent parser remainsfalse. This is pre-acceptance archive evidence; final accepted documentation/metadata bytes will be rebuilt and independently extracted again.

Current English editablePPTX/nativePDF9slides, pitch/Q&A/reset and clearly labeled48.933333s seven-real-capture pacedbackup exist. All9nativePDFpages inspected by pitchowner androot; actual artifact/content validators pass, ten-entry sanitized presentationZIP staged and exactSHAmanifestmatches. Screenshot andvideo retain accurate separate capture/source identities; notes identify current delivery source without retroactively rebinding older captures. Controls/core/localmethod/effects are actual; peripheral synthetic boundaries remain explicit.

Execution artifacts are delivered. Final phase acceptance remains pending substantive all26 verification (including current21-baseline reassessment), securityT-05-11 evidence closure, installed canonical parsers and root release/final-source checks. No external publication/deployment/submission/push or project license/contact fields are invented. All authoring/review children terminal at this checkpoint; root owns remaining gate integration.

## Final local execution closure — 2026-10-04T03:20Z

At source832e5bac5c3469721cc5a9046be90ba19d1b9d5a, independent code review clean; securitySECURED14/14 with zero open threats; UIverified18/24/zero blockers; both actual installed canonical parsers passed, with current all26 substantive requirements and no overrides/unverified behavior. Root localAcceptanceReportsMatch changed false→true only after persisting returned independent security evidence. Accepted metadata and exact10-entry sanitized presentationZIP5ba812c8416d1a3f15a4bc0c0916bb796477cab7acf9de207d05a7825967d029 passed actual delivery release.

Root regression8 actual335/3350fail0skip28246.04ms. Portable269-entry code archivee491011f4aa49f3584b5b5cef15b43792a462037cbb54a442815188bd1b3fd13 was independently verified/extracted in isolated HOME without private state/credential environment/GSD; locked install/build/offline335/335 passed, absent-parser acceptancefalse. With installedGSD, extracted current Phase04/05 canonical parsers passed. It is pre-final-acceptance documentary archive evidence, not a claim for subsequently changed report/metadata bytes. Root will rebuild/fresh-extract the final report-inclusive archive after serialized state/source/notes reconciliation.

Original24attempt proof,8attempt previously-unprepared intention and4tool current walkthrough remain immutable. Same epoch328calls/89021463credits,10historicalunknowns charged/unreplayed. Original36/32forecast overrun disclosed; no paid call during gate closure. Four automated walkthroughs,0human;48.933333s paced seven-real-capture backup. All9 nativePDFpages inspected; later notes-only identity updates preserve displayed content.

External publication/deployment/submission/messages/push remain unauthorized. Genuine four team members/roles retained; private platform/contact/access fields owner-managed, project license unassigned. Hosted-only/local-model expectation and source scoring/PM conflicts disclosed. Goal final delivery additionally requires exact final archive bytes; no speculative feature work or paid replay. All phase authoring/review/audit children terminal at this checkpoint.
