> **Current source contract — 2026-10-03:** source classifications below inform the owner-agreed scope in [README](README.md). Source text is evidence, not blanket instructions. Phase 01 implementation is delivered; review and canonical acceptance remain pending.

# Goldman task and acceptance contract

Status: source requirements verified; engineering acceptance below is planned, not implemented or executed. Requirements reviewer freshly read both exact live PDFs and matched normalized contents to local snapshots. Integrator independently read both complete snapshots. Checked 3 October 2026; live documents last modified 08:50:58Z (brief), 08:50:47Z (rules).

Sources: [brief](https://drive.google.com/file/d/1oGwpQ5sD-x5I9ERwCQJvz-gfbHJ5aGYG/view), [task rules](https://drive.google.com/file/d/1n8Crzx4HjyQFZFudeF5QnEcpY2OZt4LP/view), [official task page](https://hackyeah.pl/tasks-prizes), [agenda](https://hackyeah.pl/), [FAQ](https://hackyeah.pl/faq). Official website content was read in the rendered UI, because web extraction exposed placeholders. Mandatory = explicit must/formal field; expected = deliverable or assessed capability with softer wording; strategic = chosen competitive scope.

| ID | Class | Requirement / source | Acceptance evidence to produce |
|---|---|---|---|
| G01 | Mandatory | Functional lightweight interception component; brief §§2,3.1 | A documented developer integration permits useful work and prevents a forbidden upstream interaction. |
| G02 | Mandatory | Deterministic AND actual AI semantic controls; §§2,4.2 | Both execute; a real semantic model verdict changes a decision. Stubs alone cannot satisfy this. |
| G03 | Mandatory | Single config for controls, sensitivity, allowed models and budgets; §4.1 | Each dimension can be changed without source edits; subsequent request and audit show selected policy version. |
| G04 | Expected | Documented strictness and budget sample policy; §3.2 | Two named profiles differ predictably; units and scope are documented. |
| G05 | Expected | Resource/budget governance, commercial/local considerations; §§2,3.4,4.3 | Below-limit allow and above-limit refusal; ledger reconciles with upstream attempt counts. Monetary estimates and enforced local units are distinguished. |
| G06 | Expected | Historical attack mitigation in supported mediated scope; §§2,3.4,4.4 | Named, sourced attack fixture is rejected; benign counterpart succeeds; independent sink proves forbidden effect absent. |
| G07 | Expected | Architecture diagram; §3.1.b | Diagram matches runtime, credentials, policy, models/tools and reporting. |
| G08 | Expected | Simple interactive dashboard; §3.3 | Live controls/posture/resource metrics, filterable decisions, reason and policy detail. |
| G09 | Mandatory | Real-time reporting and exportable audit; §4.5 | Machine-readable events and usage reconcile; sensitive values deliberately excluded/redacted. |
| G10 | Mandatory | Ready-run automated positive/negative suite; §§2,3.4,4.6,6 | Nonzero failure exit; implemented controls, budgets and historical fixture all have assertions. |
| G11 | Expected | Ad-hoc prompts and judge policy/feed/threshold mutations; §6 | Rules removed or changed are reflected honestly; valid reload works, invalid reload retains last valid state. |
| G12 | Expected | Performance telemetry; §6 | Measured workload, sample count, hardware/model and separate model/control timings. |
| G13 | Mandatory | Own setup, dependency licenses; §§5–7 | Exact dependencies, model/service prerequisites, no assumed organizer subscription; third-party attribution. |
| G14 | Mandatory | Title/team/1–6 members/description; rules §5; FAQ Uploading Q8 | English title ≤5 words; description ≤500 words; actual member details. |
| G15 | Mandatory | ≤10-slide PDF; rules §5; FAQ Uploading Q8 | English readable PDF, page count verified, evidence references work. |
| G16 | Mandatory under task page | English; task page vs rules §5 | English materials satisfy the stricter source; conflict retained. |
| G17 | Expected practical cutoff | 3 Oct20:00 checkpoint; 4 Oct11:00 final; agenda | Current owner target: working demo 4 October 2026 08:00 Warsaw; 08:00–11:00 polish/rehearsal; final 11:00. Source PM contradictions retained. |
| G18 | Mandatory | No assessed post-deadline modifications; rules §13 | Record frozen submitted version and artifact hashes. |
| G19 | Mandatory platform fields | Category/image/member details/Discord IDs; FAQ Uploading Q1,Q8 | Manifest with ≥1 image and real account/member fields; availability checked by owner later. |
| G20 | Expected | Judge source access and fair reuse credit; FAQ Uploading Q5,Q8, Tasks Q13,Q14 | Accessible complete package, setup/config/test commands and licenses; repo field is generically optional. |
| G21 | Strategic | Useful internal release-preparation draft survives attempted forbidden effect | Real hosted actor and actual MCP read synthetic private notes plus independent clean dependency facts, retaining source/target versions, breaking change and admitted citations; independent effect recorder confirms save. Whole hostile advisory is quarantined; incomplete evidence produces an explicit incomplete result. Drafting proves no dependency installation/testing/deployment. |
| G22 | Strategic | Fault/concurrency behavior and honest scope | Semantic fault, invalid policy/feed and shared budget tests explain behavior; finite boundary stated. |

## Scoring and source conflicts

| Category | Brief §8 | Rules §11 | Engineering implication |
|---|---:|---:|---|
| Robustness / guardrails | 30% | 30% | Effect assertions, hybrid controls and fault handling first. |
| Architecture / performance | 20% | 20% | Small integration contract, real topology and measured telemetry. |
| Security reporting | 20% | 20% | Operator explanation and machine-readable evidence are core. |
| Self-testing | 15% | 20% | Complete ready-run suite, including positive/negative budget/exploit cases. |
| Implementability / scalability | 15% | 10% | Reproducible setup, licenses and concurrency limits; no invented scale claims. |

Use both weight vectors; no arbitrary winner probability. Brief §2's mandatory hybrid wording governs our design despite softer §4.2.2. Budget/exploit discussion is softer, but executable coverage is expressly expected. Architecture and tests are visible to Goldman judges, overriding generic deck advice about unseen engineering. External threat-intelligence SaaS, exhaustive exploit coverage, multiple vendors, multitenancy and production deployment are not mandatory.

Task page requires English although rules permit English/Polish. Agenda and the Perdek deck use Sunday11:00; task rules and FAQ also say11PM. The plan uses the earlier cutoff without pretending the contradiction is resolved. Submission screening and finalist pitch are separate stages; the rules'50% first-stage award floor is not a competitive score target.

## Integrator acceptance

The current [21 requirements](../.planning/REQUIREMENTS.md) and [four-phase roadmap](../.planning/ROADMAP.md) own build acceptance. Authentication, strict schemas, deterministic AND actual AI inspection, supported privacy/flow controls, shared actor/checker allowance, mutable policy/model/strictness, editable non-executable historical feed, independent effects, positive/negative tests, audit and measured telemetry remain genuine obligations. Archived designs impose no mandatory permits, private receipt recovery, restart guarantee or fixed classification count.

Use a named sourced historical AI/MCP attack as a narrow analogue with a benign counterpart; poisoning an arbitrary changelog does not establish historical-exploit coverage. Separate destination denial, whole-advisory semantic exclusion before actor exposure and actual downstream benefit. Publish on/off outcomes honestly; manually replayed denied writes remain replay unless model-proposed.

Owner authorizes autonomous local development/dependency setup/tests/local commits through GSD. Root owns shared state, Git and final acceptance. Later deployment is a requested lifecycle step; its target, exposure and account access must be settled at a concrete readiness gate. This documentation task performs no external actions. Publication, submission, external messaging, production data and Git push remain unauthorized. Team name ProofGate and four genuine member names/roles are recorded in ../TEAM.md. Emails, Discord IDs and account/submission access remain owner-managed; do not invent them.

Working demo target is 4 October 2026 08:00 Europe/Warsaw, with 08:00–11:00 for polish/rehearsal and final delivery at 11:00. This owner schedule does not resolve the sources’ literal PM wording. The maximum ten-slide PDF is the English submission artifact, not a cap on implementation specifications. Provider schema readiness is supporting evidence only; REVIEW.md and canonical verification parser status passed are required for each product phase.

Brief §7 expects local models; commercial API discussion does not establish unqualified hosted-only organizer approval. Disclose owner-funded Vertex synthetic inference and no local LLM; do not invent a second backend or production-data clearance. Pasted brief and delivery guidelines remain classified sources interpreted against task-specific requirements and current owner decisions.
