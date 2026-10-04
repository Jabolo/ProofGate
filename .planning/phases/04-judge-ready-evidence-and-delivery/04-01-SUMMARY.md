---
phase: 04-judge-ready-evidence-and-delivery
plan: "01"
subsystem: evidence-and-workbench
tags: [authenticated-export, independent-effects, measurements, offline-integration]
status: complete
implementation-tasks-completed: 2
requirements-completed: []
requirements-supported: [OBS-01, OBS-03, TEST-01]
requires:
  - phase: 03-judge-policy-and-budget-mutations
    provides: Accepted current control and allowance enforcement
provides:
  - Bounded canonical export and independently reopened effect observations
  - Actual persisted monotonic spans and historical unavailable disclosure
  - Executed operator interaction repairs and GET-only retained evidence controls
affects: [04-02, final-review, security, browser-acceptance]
tech-stack:
  added: []
  patterns: [strict named-field projection, read-only reconciliation, bounded monotonic samples]
key-files:
  created: [test/offline/evidence.test.ts]
  modified: [src/contracts.ts, src/host.ts, src/model.ts, public/app.js, public/index.html, public/styles.css, test/offline/workbench.test.ts]
key-decisions:
  - Preserve host acknowledgement separately from independent effect observation; unknown dispatch stays charged and unreplayed.
  - Timing aggregates retain actual counts and totals when the finite per-call sample list truncates; nested spans overlap.
actuals:
  tokens: null
  tasks: 2
  commits: 0
  measurement-note: Root must populate realized diff chars/4 and commit ledger after its Git boundary; no harness token measurement is claimed.
plan_head_before: 7ace88cb34afc23b56e22d1a3d7081d47ce63f86
plan_head_after: 7ace88cb34afc23b56e22d1a3d7081d47ce63f86
completed: 2026-10-04
---

# Phase 04 Plan 01: Canonical Evidence and Operator Controls Summary

## Current integrator reconciliation — 4 October 2026

Both implementation tasks are integrated. Source fixes are recorded in b8a6668, 1d56b54, b7da627 and 9a6b388; final local delivery is 5c5fa03. The pause commit 140f024 preserved remaining WIP and did not claim acceptance. The resumed root regression reports 186/186, zero failures/skips, 13,208.31475 ms in `.proofgate/phase04-resumed-regression.tap`. Existing actual exports, independent effects and desktop/tablet/mobile observations remain in LIVE-EVIDENCE.md; no new hosted call or browser observation was fabricated during resumption. Historical delegated checkpoints below describe their then-current scope, not unfinished source work. Canonical phase verification remains the independent final gate.

Authenticated canonical export reports independently reopened actual fixture effects and measured spans; operator controls support concurrent observation and versioned edits without creating extra work.

Both implementation tasks are complete within the delegated source scope. This summary remains **partial until root integrates commits and finishes its review/acceptance gates**. It grants no Phase 04 acceptance, live evidence, deployment or submission claim.

## Accomplishments and evidence

- **D-01 / OBS-01:** Strict `proofgate-evidence-1` export at authenticated `GET /api/runs/:id/export`, sharing the collector with optional status audit. Export retains bounded identities, control settings, hashes/admission basis, ordered run events/attempts, separately labeled whole-epoch accounting and independently reopened fixture effects. Named fields exclude raw source/private draft prose, arbitrary details/diagnostic keys, headers, thought/signature payloads and paths. Feed patterns are hashed; unsafe identity strings are null or sanitized. Current snapshots explicitly say `current_accepted`.
- **D-02 / OBS-03:** Actual monotonic spans measure synchronous current-clearance/selected draft checks, checker and actor generate entry to resolution/rejection, MCP tool calls and processRun through cleanup. Deterministic samples exclude awaited work and nested deterministic samples are suppressed. Persisted hardware excludes hostname/user/path; model samples retain bounded requested/returned identities. Counts, totals, samples, boundaries, timestamps, mode and workload are disclosed. Sample truncation is explicit and preserves aggregate totals/counts. Nested timing categories overlap; no throughput or subtraction-based overhead claim. Historical absent instrumentation stays unavailable.
- **D-03:** Independent observation and mutation state permits policy/feed PUT while one run is observed; captured expectedVersion and stale behavior remain. Stop updates gate/progress/result/effects/mode and retains identity/accounting without claiming cancellation or fresh success; late responses are invalidated. RUN_CAPACITY before identification says no work was admitted. TextEncoder enforces 4096 UTF-8 bytes before POST. Known-run inspection and bound JSON Blob download use GET only, label retained views and revoke object URLs. Fresh audit mismatch/unavailable recorder prevents a renewed verified-save display.
- **D-04 / TEST-01 contribution:** Five new isolated HTTP/actual stdio/SQLite evidence cases plus executed fake-DOM setup/form/render/download tests. ASCII, multibyte and emoji limits, actual lost save acknowledgement, auth/encoded paths/foreign caller, credential canaries, oversized sanitized response, missing historical duration/recorder and failed checker spans are exercised. No installed packages or config defaults changed. Conventional `npm test`, package attribution and final delivery remain Plan 04-02 responsibilities.

## Executed checks

| Command | Verified result |
|---|---|
| Phase03 installed `verification.status` parser | `status: passed`; Phase03 REVIEW prerequisite present |
| Build + initial evidence/faults/transport | 39/39 passed |
| Build + expanded evidence suite | 5/5 passed |
| Build + workbench/evidence/mutations | 47/47 passed before final audit/truncation refinements |
| Final `npm run build && npm run eval:offline` | 171/171 passed, zero fail/cancel/skip/todo, exit 0, 9.61 seconds whole command |

Final executable output: `.proofgate/phase04-source-final-offline.log`. The final whole command used a 60-second process-group timeout wrapper; timeout did not occur. New evidence tests always close their owned host/stdio work and remove only their unique temporary directory. No live stores or funded calls were accessed.

## TDD Gate Compliance

- Export RED: real clean HTTP/stdio workflow reached the intended endpoint assertion, HTTP 404 versus expected 200. `.proofgate/phase04-source-red-export.json` validates as `RED_EVIDENCE_OK`.
- UI RED: after introducing a testable setup dependency seam and fixing fake-DOM initialization/cleanup, the intended interaction assertion failed because policy fields were disabled during observation (`true !== false`). `.proofgate/phase04-source-red-ui.json` validates as `RED_EVIDENCE_OK`. Earlier missing-seam/fixture errors were replaced and do not authorize GREEN.
- GREEN: focused checks and the final full offline suite passed. No separate refactor was required. Per-task/TDD Git commits are pending the sole root integrator's boundary; this worker performed no Git mutations.

## Deviations and limitations

- Root explicitly owns Git and shared state; source changes remain awaiting integration. `actuals.commits: 0` and base/head identify the delegated source baseline, not a fabricated completion history. Root must replace commit metadata and token char proxy after integration.
- The optional audit projection extends existing RunView without requiring old client fixtures to supply it. Existing control defaults, admission credit caps, unknown charges, host-rendered draft and no-replay behavior are preserved.
- No known TODO/FIXME/stub or skipped test was found in the owned files. Unavailable values represent actual missing observations, not simulated provider success.
- Final actual desktop/tablet/mobile, keyboard/reduced-motion captures, hosted measured evidence, code review, declared security closure, source/all-requirement audit and canonical Phase04 verification remain root-owned. Injected DOM/model checks establish implementation behavior only.
- Deadline remains 4 October 2026: working demo 08:00 Warsaw, polish/rehearsal 08:00–11:00, final 11:00. No external actions or acceptance were inferred from local tests.

## Self-Check: PASSED (delegated implementation scope)

All eight owned source/test files and three ignored executable-evidence files exist; final log reports 171 tests, 171 passes and no skips. Phase acceptance and commit/state checks are intentionally pending root integration. Children: none.
