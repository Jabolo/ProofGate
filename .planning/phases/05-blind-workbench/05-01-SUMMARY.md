---
phase: 05-blind-workbench
plan: "01"
status: complete
subsystem: governed-procurement-core
tags: [typescript, fastify, sqlite, mcp, public-planning, local-execution]
requires:
  - phase: 04-evidence-and-local-delivery
    provides: Governed host, persistent admission ledger, model transport and release evidence baseline
provides:
  - Strict public planner/advisory/recipe profiles with exact generation application-body capture
  - Two bounded supplier-renewal objectives with local integer execution and zero-model private rebind
  - Revision-bound fresh save actions and independent durable internal brief/effect observation
affects: [05-02, 05-03]
tech-stack:
  added: []
  patterns: [optional server-owned model profiles, whole-recipe admission, synchronous private mutex with asynchronous save hold, additive SQLite variants]
key-files:
  created: [src/blind.ts, src/prompt-profiles.ts, fixture/blind-store.ts, fixture/blind-server.ts, test/offline/blind.test.ts]
  modified: [src/host.ts, src/model.ts, test/offline/transport.test.ts]
key-decisions:
  - Retain five-argument release prompt behavior; supply Blind generation profiles only through an optional server-owned sixth argument.
  - Refuse rebind/save when the retained policy/feed basis changes, instead of silently requesting another semantic inspection.
  - Treat injected SDK wire transport as offline even though its exact application serialization is captured.
  - Keep random revision identity for save ownership and a persistent increasing resultVersion ordinal for local result history.
requirements-implemented: [BLIND-01, BLIND-02, BLIND-03, BLIND-04]
requirements-completed: []
actuals:
  tokens: 22826
  tasks: 3
  commits: 0
plan_head_before: a6c9d5e3aea8a038eda96a8b4ca2c27e54f6440b
plan_head_after: a6c9d5e3aea8a038eda96a8b4ca2c27e54f6440b
commit_status: pending-root-integration
duration: 14min17s
started: 2026-10-04T00:32:34Z
completed: 2026-10-04
coverage:
  - id: public-composition
    requirement: BLIND-01
    description: Authenticated production routes, whole grammar admission and independent private arithmetic
    verification:
      - kind: integration
        ref: test/offline/blind.test.ts
        status: pass
    human_judgment: false
  - id: public-wire-and-rebind
    requirement: BLIND-02
    description: Exact injected SDK application captures exclude credentials/private fields; private mutation rebind adds zero attempts
    verification:
      - kind: integration
        ref: test/offline/transport.test.ts
        status: pass
      - kind: integration
        ref: test/offline/blind.test.ts
        status: pass
    human_judgment: false
  - id: hybrid-and-save
    requirement: BLIND-04
    description: Fail-closed offline semantic contracts, current policy/deadline races and actual isolated MCP/SQLite effects
    verification:
      - kind: integration
        ref: test/offline/blind.test.ts
        status: pass
    human_judgment: false
---

# Phase 05 Plan 01: Governed Blind Core Summary

**Public-only model composition feeds a dependency-validated local procurement executor; private rebind adds zero model attempts, and fresh internal save actions reconcile exact durable SQLite effects.**

Implementation report: COMPLETE, three tasks implemented and affected offline verification passed. Git/shared-state integration belongs to root and is pending. No Phase 05 acceptance, hosted semantic accuracy, actual hosted procurement composition, UI or deployment claim is made. Requirement acceptance remains with root after the later proof/review/verifier gates.

## Performance and execution evidence

- Started 2026-10-04T00:32:34Z; final code verification finished 00:46:51Z: 14min17s.
- Eight owned source/test files changed; this summary is the ninth owned output.
- Realized source/test diff: 91,304 characters / 4, rounded up = 22,826 estimate-scale tokens. Existing tracked files use `git diff HEAD -- <file>`; newly added owned files use their full content.
- Final command: `npm run build && node --test dist/test/offline/blind.test.js dist/test/offline/transport.test.js dist/test/offline/mutations.test.js dist/test/offline/faults.test.js dist/test/offline/security.test.js dist/test/offline/tracer.test.js`.
- Final result: build passed; **125 tests, 125 passed, zero failed/cancelled/skipped/todo**, runner duration 6,281.658125 ms. Raw final log: `/tmp/proofgate-05-01-verification.log`.
- This affected set includes every per-task requested test file. Root owns the broader regression, review and final acceptance; no broad 186-test rerun occurred here.
- Initial Task 1 GREEN/tracer checks: 11/11, followed by expanded 15/15. Task 2 initial affected set: 47/47. Task 3 initial affected set: 76/76. Later assertions are included in final 125/125.

## Task boundaries and root-owned commits

1. **Tracer: public composition to exact private brief.** `src/blind.ts`, `src/prompt-profiles.ts`, `src/model.ts`, `src/host.ts`, `test/offline/blind.test.ts`. Added strict public contracts, adapter profiles/captures, authenticated variant-aware routes, host storage and exact default arithmetic. Initial GREEN was rechecked before expansion. Commit: pending root.
2. **Grammar, private mutation/rebind and fail-closed controls.** `src/blind.ts`, `src/prompt-profiles.ts`, `src/host.ts`, `test/offline/blind.test.ts`, `test/offline/transport.test.ts`. Added meaningful windows/rankings/limits, current basis revalidation, private/rule version updates, zero-attempt rebind and SDK serialization/credential assertions. Commit: pending root.
3. **Fresh save action and independent durable effects.** `fixture/blind-store.ts`, `fixture/blind-server.ts`, `src/blind.ts`, `src/host.ts`, `test/offline/blind.test.ts`. Added fixed metered MCP save, additive recorder/read-only observer, fresh action deadline/parent/revision provenance, unknown deduplication and save races. Commit: pending root.

Shared files were not edited by this worker. Root's pre-existing STATE and verification edits, untracked archive/research/handoff/PDF files and `.gsd/` were preserved. Branch is `master`, HEAD `a6c9d5e3aea8a038eda96a8b4ca2c27e54f6440b`, no remote/upstream, no stage/commit/push. Measured HEAD range contains **0 commits**, intentionally pending the plan's root-only Git handoff. Root must replace commit metrics/hashes after integration; this worker created no Git ledger or Git metadata.

## TDD evidence

The following are durable excerpts from real failing assertions before each task's implementation. Node TAP discovery reported one named test and one assertion failure in each RED run. The installed `check tdd-red-evidence` parser returned **RED_EVIDENCE_OK** for all three records.

| Task | Named failing test | Command | Expected / actual | Record |
|---|---|---|---|---|
| 1 | Blind authenticated governed composition produces exact private negotiation brief | `npm run build && node --test dist/test/offline/blind.test.js` | authenticated route 401 / missing route 404 | `/tmp/proofgate-05-01-task1-red.json` |
| 2 | private quote and rule rebind changes results without provider attempts | `npm run build && node --test --test-name-pattern="private quote and rule rebind" dist/test/offline/blind.test.js` | private update 200 / missing route 404 | `/tmp/proofgate-05-01-task2-red.json` and `.log` |
| 3 | revision bound save uses a fresh action after composition expiry and exact durable observation | `npm run build && node --test --test-name-pattern="revision bound save" dist/test/offline/blind.test.js` | save 200 / missing route 404 | `/tmp/proofgate-05-01-task3-red.json` and `.log` |

Task 1's record contains the original tool transcript's assertion excerpt; its parser validation was recorded after initial GREEN. Tasks 2 and 3 persisted raw TAP logs and passed the parser before implementation. No RED/GREEN commits were made because the approved plan assigns all Git work to root. These sequencing/commit limitations are explicit rather than claiming ordinary per-task executor commits.

## Verified behavior

- Public starts reject unauthenticated requests and extra private fields without dispatch. Public constructors/body validation reject unknown fields, known synthetic private identities/fields and sentinels; they accept no workspace, rules, results, revision, run identity, timestamp or private-derived hash parameter. This is a bounded inspected workflow boundary, not generic confidentiality detection.
- Default 90-day negotiation result: Acme saving **960,000 cents**, Northstar **640,000**, Harbor **400,000**; Cedar excluded. Both objectives permit independently tested 30/90-day windows, rankings and limits. Service risk uses local private thresholds and changed private service data. Duplicate/incomplete/unsupported/dependency-invalid recipes invoke zero private reads.
- Changing Acme quote to **12,600,000** yields Northstar 640,000 / Harbor 400,000 / Acme 360,000 savings. Changing private permitted increase to **500 basis points** then yields Northstar 400,000 / Harbor 250,000 with Acme below the minimum. Retained inputs/captures and provider-attempt rows stay unchanged during rebind. Workspace versions and resultVersion ordinals increase; reset does not clear the sequence or ledger.
- Existing Invariant Labs toxic-agent-flow analogue metadata is read from `test/phase02-cases.json`. Synthetic active/paraphrased advisory verdicts quarantine the entire source before planner input; quoted/benign contracts retain it. Offline verdict fixtures test wiring and admission, not remote classifier accuracy or downstream causal improvement.
- Deterministic denial wins over semantic allow for current provider/model/budget/threshold/deadline state. Changed policy/feed basis refuses local rebind/save with `NEW_COMPOSITION_REQUIRED`; no concealed provider call occurs. Four Blind compositions and release starts share the same four active slots/no queue; fifth requests create no charged work.
- The installed SDK under injected wire emits three exact serialized generation bodies; host captures equal wire bodies under metered generation attempt IDs. OAuth is charged separately and is absent from capture; headers/access token/client secret are absent. Injected wire is labeled **offline**. Supplied adapters report their actual `mode`; constructor specimens are distinct from actual application dispatch evidence.
- Real isolated stdio save produces exactly one brief and one effect observed from a separately opened read-only SQLite connection. Bytes, caller, parent/action IDs, result revision, workspace version and internal sink match. Saving after the original composition deadline registers a fresh save-only action in the same epoch and leaves the original deadline unchanged. Save-only identity rejects actor/checker/auth authority.
- Foreign/stale/extra-destination saves, budget/sink/feed/deadline races and concurrent edit/save requests create zero additional effects. Lost save acknowledgement retains charged unknown work and one separately observed effect; GET does not convert it into acknowledged/confirmed success, and duplicate save/rebind never redispatches it.
- Additive host/fixture initialization preserves a reopened ledger and historical Blind rows plus seeded release drafts/effects. Tests use only temporary SQLite files and synthetic credentials; no retained `.proofgate/` files, live listener, ADC/token, production data or paid provider transport was accessed.

## Downstream UI/API contract

All `/api/*` routes retain existing bearer authentication and sanitized errors.

| Route | Strict request / response purpose |
|---|---|
| `POST /api/blind/runs` | `{taskId:"negotiation-savings"|"service-risk",advisory?:string}` → 202 `{runId}` |
| `GET /api/blind/runs/:id` | State, actual adapter mode, synthetic label, recipe, result/current revision, resultVersion, workspaceVersion, advisory status/verdicts, localExecutions, decisions, constructor publicInputs, actual application captures, parent attempts/resources, save/saveAction and independentEffects |
| `GET /api/blind/workspace` | `{synthetic:true,version,records,rules}`; private local authenticated state |
| `PUT /api/blind/private` | `{expectedVersion,records}` → current workspace; records update only |
| `PUT /api/blind/rules` | `{expectedVersion,rules}` → current workspace; rules update only |
| `POST /api/blind/reset` | `{}` → synthetic initial workspace at a higher version; conserved ledger/history |
| `POST /api/blind/runs/:id/rebind` | `{}` → updated run; no provider work; changed inspection basis requires new composition |
| `POST /api/blind/runs/:id/save` | `{resultRevision}` → run with separate save acknowledgement and independent observation |
| `GET /api/blind/artifacts/:id` | Immutable authenticated internally saved brief and provenance |
| `POST /api/blind/runs/:id/export` | `{resultRevision,destination:"external"}` → labeled manual deterministic refusal, zero sink effects |

`publicInputs` are constructor evidence, **not wire captures**. `captures` carry `attemptId`, `profileId`, `serializedBody`, `mode`, `evidence:"actual_application_dispatch"`, dispatch status and actual attempt outcome. `resources` report the whole existing epoch; `attempts` belong to composition; `saveAction.attempts` belong to the separate action. Actual hosted work is not established by offline SDK serialization.

Mutation/reset hides old `result` and `resultRevision` (`resultCurrent:false`) until rebind; old saved artifacts remain immutable. Save states are `pending`, `confirmed`, `unknown`, `blocked`. `independentEffects.status` is observed/unavailable, count is nullable, acknowledgement is separate, and exact-match is nullable. Unknown may have an observed matching effect while remaining unacknowledged. Release/Blind/save-action route mismatches reject before wrong projection/observer work.

## Deviations and decisions

1. **[Rule 1 — Bug] Synchronous mutex release.** The added four-composition test exposed an asynchronous mutex holding after a synchronous local bind and rejecting parallel admitted calculations. Synchronous work now releases immediately; the mutex still spans asynchronous saving. Final capacity/mutex assertions pass.
2. **[Rule 3 — Blocking interface mismatch] SDK system instruction shape.** The installed SDK serializes `systemInstruction` with optional `role:"user"`. Strict capture validation was adjusted to that observed source/transport shape; extra fields remain rejected and the response schema is pinned to the known public Recipe/Verdict schema.
3. **Execution ownership:** approved plan and owner instructions require root-only Git/shared state. Per-task commits, STATE/ROADMAP/REQUIREMENTS updates and final metadata commit are pending root. No installation, new dependency, worktree, scheduler or architecture change outside the accepted plan was introduced.
4. Public grammar/profile schemas were introduced cohesively during the tracer, then expanded/verified during Task 2 rather than splitting the same contracts into temporary tiers. Task file ownership stayed within the approved bounds.

No authentication gate, goal-blocking stub, skipped test, unrun requested offline verification or security surface outside the plan's threat register was found. Initial null/in-progress values and intermediate integer row fields are runtime initialization; admitted recipes fully calculate/render them before result projection.

## Remaining work and limitations

Root must integrate selected commits/shared planning, run independent review and broader regression, then advance 05-02 UI/evidence and 05-03 bounded actual hosted proof/local delivery. Hosted supplier-planner capability and checker classification, browser usability, causal benefit, live storage integration, external deployment and Phase 05 acceptance remain unproven here. No children were spawned; child state: none.

## Self-Check: PASSED

All eight declared source/test files and this summary exist. Final build and 125 affected tests passed. HEAD/branch/remote inspection confirms no worker commit/stage/push. Existing unrelated edits/untracked files remain present. Commit existence checks are not applicable until root commits the completed implementation.
