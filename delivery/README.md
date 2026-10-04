# ProofGate portable local source

Start with the supplier-renewal employee goal: choose which renewals to negotiate
and prepare a useful brief. Actual hosted AI composes an approved public method;
the company-controlled host applies private synthetic records and rules to select
suppliers and calculate negotiation targets. Potential opportunity is not achieved
savings. The root README and `submission/pitch.md` show the short scene and its
inspectable control/effect evidence.

This supplementary source archive makes the application rebuildable without a
repository URL. It is separate from the strict presentation archive in
`submission/`. Nothing here publishes, deploys or submits the project.

The current story screenshot is a GET-only rendering of a consistent snapshot of
retained actual run `360c040e-16a1-4f81-ac76-1e1ec4ef6195`, captured at
2026-10-04T07:54:36.814Z against source
`6b370219999590423716e793fc50c89d7b1b9fcd`. It shows the existing Middle/Large
brief and earlier independent save; it performs no new inference, rebind or save.
Actual composition, private-change proofs, four automated walkthroughs and the
paced historical backup keep their original dates. A separate GET-only native
Chrome observation at 2026-10-04T08:01:00.333Z exercised Tab traversal, Enter
opening/closing the private-contract disclosure and focus reaching its records
editor; widths1440/768/390 retained labels and no horizontal overflow. The earlier
GSD browser Tab attempt was unverified. These are focused checks, not a full
accessibility certification, and historical observations retain their dates.
The full screenshot includes a separately owned judge-access banner. This local
source task does not certify or synchronize an external deployment.

The source snapshot contains the actual TypeScript application and fixture tools,
HTML/JS workbench, locked dependency graph, all offline and opt-in hosted tests,
policy configuration, setup documentation, presentation source and sanitized
documentary evidence used by the delivery tests, including every evidence-matrix
reference and its retained baseline verification reports. Phase 04/05 verification
coverage documents and the prefixed report aliases used by the canonical resolver
are preserved explicitly. The source builder refuses a report whose covered input
is absent from its allowlist; this checks package completeness without granting
phase acceptance. Only explicitly enumerated
files are included. Third-party license texts and the installed dependency
inventory are preserved under `delivery/third-party/`; the project itself has no
assigned open-source license. Team attribution remains in `TEAM.md`.

## Reproduce the offline build

Use Node **22.23.1**, npm and an empty extraction directory. Verify the adjacent
archive SHA256 before extraction, inspect the ZIP paths, then extract it. Run from
the extracted repository root:

```sh
(cd delivery && shasum -a 256 -c proofgate-source.zip.sha256)
unzip delivery/proofgate-source.zip -d proofgate-local
cd proofgate-local
npm ci --ignore-scripts --no-audit --no-fund
npm run build
npm run eval:offline
```

If the archive and digest were delivered without the surrounding directory,
run `shasum -a 256 -c proofgate-source.zip.sha256` in their directory and adjust
the extraction path accordingly. The digest line uses the adjacent ZIP basename;
when starting in the original repository run the checksum inside `delivery/`:

```sh
(cd delivery && shasum -a 256 -c proofgate-source.zip.sha256)
```

`npm ci` needs registry access; dependencies are not vendored. Python 3 standard
library is needed by the source archive tests and builder. No credential, model
account or private runtime database is needed for offline tests. The ready-run
`npm test` command also performs the build and the offline suite. Opt-in hosted
tests refuse missing authorization and credentials; do not run `eval:hosted` as
a fresh-build check. Offline tests use synthetic injected models and temporary
stores; they do not establish fresh hosted AI evidence.

An installed canonical GSD parser is an additional **phase acceptance** dependency,
not an application build dependency. Without it, delivery acceptance remains
false and its offline test exercises that refusal. Content/release validation
also requires the documented PDF/image tooling; it must fail closed when that
tooling or fresh canonical acceptance is absent. Do not treat a successful
offline build as renewed phase acceptance.

## Run the demonstrated application

Follow the root `README.md` for authenticated host/fixture setup, hosted-only
synthetic Vertex configuration and retained-budget operation. The archive omits
tokens, ADC, `.env`, SQLite stores, model transport logs, `node_modules`, Git
history, private research and owner PDFs. Supply your own legitimate account and
authorization to perform hosted inference. A retained recipe can be recomputed
locally, but this source archive contains no live host database or saved session.
The demonstrated local execution boundary is a company-controlled host; it is
not a local LLM. No budget or database reset is authorized by this archive.

Retain the scoped controls and their limits: public instructions are disclosed to
the checker and admitted text to the planner; arbitrary pasted secrets are outside
that protection boundary. Deterministic and enabled actual AI inspection both
govern admission. Actor, checker, authentication and tools share a finite allowance;
unknown dispatched work stays charged and is not replayed. Peripheral ERP/email
integrations are mocked. Observed tokens, unpriced tariff estimates and admission
credits remain distinct; the original forecast overrun stays disclosed.

## Root final packaging and independent proof

The editable presentation generator is `scripts/build-presentation.mjs`; it stays
outside the strict nine-asset submission directory. The delivered PPTX is also
editable without rerunning that generator. Regenerating the deck is an optional
authoring operation, separate from the ordinary Node application build.

The generator uses the Codex bundled presentation skill/artifact runtime and
LibreOffice for native PDF export. These tools are not bundled in this source
archive and are not required by `npm ci`, the application build or offline tests.
Use an already installed compatible runtime and the documented presentation
skill setup; this archive does not install tools or grant hosted-model access.
Inputs must be reviewed sanitized pitch/proof JSON and genuine screenshots,
never account credentials or an invented fresh observation. Supply their paths
and the installed runtime explicitly from the repository root:

```sh
PROOFGATE_WORKSPACE="$PWD" \
PITCH_INPUT=<sanitized-pitch-input.json> \
PRESENTATIONS_SKILL_DIR=<installed-presentation-skill> \
RUNTIME_NODE_MODULES=<installed-runtime-node_modules> \
RUNTIME_PYTHON=<installed-runtime-python> \
RUNTIME_SOFFICE=<installed-libreoffice> \
<installed-runtime-node> scripts/build-presentation.mjs
```

The exact sanitized inputs and rendered-slide inspection belong to the root
presentation handoff. The generator's source and delivered editable deck are
included; private runtime locations and provisioning are excluded. A fresh
core-build success alone does not prove optional deck regeneration.

Freeze source and sanitized documentary inputs first. From the original
workspace with the exact locked dependencies installed, the root integrator runs:

```sh
node scripts/build-source-package.mjs --output delivery --revision <frozen-40-character-commit>
node scripts/build-source-package.mjs --verify delivery/proofgate-source.zip --root . --revision <frozen-40-character-commit>
(cd delivery && shasum -a 256 -c proofgate-source.zip.sha256)
```

The builder never invokes Git or reads provisioning. Its default revision is
`uncommitted-working-tree` and its report says **draft**. The caller supplies the
frozen revision only after independently checking it. The report records the
payload digest, archive digest and exact entry count; it does not claim fresh
extraction or acceptance. Root must independently extract into an empty
directory with no private `.proofgate` or inherited credentials, run the commands
above, inspect actual output and retain the evidence. Any source change requires
rebuilding and re-verifying the final archive. The deterministic manifest checks
every payload byte; extra archive entries, symlinks, unsafe paths, missing source,
unlocked pins and detected credential-shaped contents are refused.

The source archive builder deliberately requires the complete installed locked
dependency metadata/license inventory when recreating the archive. It does not
bundle dependencies themselves, and unknown future source files are not
automatically included. Review and update its explicit allowlist when adding
application modules or required documentary inputs.
