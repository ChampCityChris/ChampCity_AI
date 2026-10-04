# WSF20-REPAIR04 Implementer Report

## Scope and repository verification

Repair Card WSF20-REPAIR04, parent WSF20, defect WSF20-D14. Verified `Dev/` is the approved primary repository root using its Git metadata, `AGENTS.md`, package configuration and current source. Starting HEAD exactly matches the card baseline: `4ad54324b8b71bff3cace786944413b12c882ab0`. Work performed directly on `dev`. Remote `origin` is configured; locally recorded `origin/dev` was 313 commits behind HEAD with zero incoming commits before this checkpoint. No fetch, push, branch change or worktree creation.

## Changes and prompt boundary

Modified production files:

- `src/shared/architectWorkspaceContracts.ts`: `architectCandidateHandoffContract()` now provides semantic section labels and authoritative field names independently of validator constants. Greenfield retains all fifteen required sections as text collections. Shared Issue and assessment branches retain RootCause fields, exact supplied evidence references, confidence semantics, scalar assessment dimensions and Research outcome relationships.
- `src/main/integrations/workflowCandidateHandoff.ts`: retains the tool/action, stage/scope identity, `candidateJson` argument, application-owned identity/version resolution, materially unresolved questions, submission when sufficient information exists, SQL-generated reviews, human dispositions and Refresh instruction.
- `src/main/projectPlanning/structuredProjectPlanningService.ts`: replaces inline schema notation with facts/direction/criteria field and collection summaries; preserves approved Interview meaning and separation from Phase Map and WorkItems.
- `src/main/phaseMap/structuredPhaseMapService.ts`: summarizes phase fields, dependencies, source references and optional criteria; preserves meaningful outcome boundaries and prohibition on inventing WorkItems.
- `src/main/phasePlanning/structuredPhaseLoopService.ts`: summarizes facts/direction/criteria and candidate fields; explicitly distinguishes Phase Interview from Phase Planning and preserves independently verifiable obligations.
- `src/main/workCardPlanning/structuredWorkItemPlanningService.ts`: describes execution boundary, affected-path and proof collections without parser item limits. Keeps repository-relative path meaning, source-neutral behavior, existing Criteria/dependencies, explicit Operator decomposition, topology relationships and evidence obligations.

Modified tests:

- `test/workflow/workflow-application-service.test.cjs`: replaces template parsing and literal validator-prose assertions with semantic fields/labels, collection versus scalar, Intake governance, Operator authority, unresolved questions and MCP/Refresh assertions. Synthetic candidate construction belongs to the test rather than a model-facing template.
- `test/agent-harness/reserved-toolbox-namespace.test.cjs`: extends the existing seven-stage SQL ingress scenario to assert semantic fields and stage distinctions, shared delivery behavior, absence of transport details, and rejection without SQL mutation of missing/extra fields, scalar versus collection errors, oversized entries/sections/total items/total content/direction, forbidden controls, malformed JSON and oversized MCP input.

Created this report. No files deleted. Intentionally did not create dependencies, migrations, sidecars, candidate schemas, browser changes, project-specific exceptions, new permanent test files or runtime helpers. Supplied untracked bundle cards and other pre-existing untracked documentation remain outside the checkpoint.

### Exact removed/retained text categories

- Removed `Maximum 200 total items`, the UTF-8/JSON-serialized section-array size instruction and the newline-joined `projectPlanningDirection` byte instruction.
- Removed per-entry byte bounds, section/reference/RootCause transport counts, total JSON transport limits and `Byte limits use UTF-8.` from Architect prose.
- Removed `Nonempty text must contain no control characters U+0000-U+0008, U+000B, U+000C or U+000E-U+001F.` from model guidance.
- Removed `Semantic schema template (authoritative field names):`, workflow-specific JSON template headings and full placeholder objects containing `Replace with substantive direction or an explicit unresolved item.` / `Replace with substantive assessment or explicitly unresolved direction.`
- Removed model instructions to run `JSON.stringify(candidate)`; retained the semantic candidate as JSON in the MCP `candidateJson` argument and explicit `workflow_toolbox.submit_stage_candidate` behavior.
- Replaced `implementationBoundaries and proofIntent require 1..32 nonempty entries. affectedPaths allows 0..128 ...` with semantic collection descriptions; path normalization and source-neutral meaning remain.
- Retained `Proposed Architect decisions and recommendations are never Operator Decisions.` and full adopted Project scope/architecture/capability/dependency/acceptance direction. Added the card's generic approved-Intake governance and unresolved Operator question behavior, without fixture or project exceptions.
- Work Item review advisory already contained only meaningful advisory fields, recommendation values and SQL evidence obligations. Its generator `createStructuredWorkItemReviewService()` remains unchanged; the simplified shared delivery block applies to it and the ingress test verifies its fields and non-approval boundary.

Measured Greenfield Architect semantic contract, joining returned lines with double newlines: 2,561 characters before, 1,378 after, a 46% reduction. This measures the semantic contract, not supplied evidence/context or the entire copied handoff.

## Preservation evidence

The complete prefix of `architectWorkspaceContracts.ts` containing types, section definitions, constants and both validators is byte-identical after normalizing line endings to the starting HEAD. SHA-256: `35777821a4ef108e929b5c0c70570c030f9d7c5518e388b32c0116e99a9b5343`.

All production differences are within handoff generation. Typed parsers, MCP candidate size/authorization/publication, SQL persistence, review document generators and Operator disposition code are unchanged. Equivalent valid candidates therefore enter the same persistence and document-generation paths. Existing Greenfield service tests verify ordered section projections and identical rematerialized Markdown after manual file alteration/deletion. The seven-stage MCP test verifies valid SQL review persistence with unchanged Decision records until explicit Operator review. No review-format change is introduced.

## Validation receipts

| Command / check | Execution lane | Result |
| --- | --- | --- |
| `npm run test:repair -- --changes tmp/wsf20-r04-changes.json --preview` | Restricted Windows | Exit 0; repair profile selected the changed paths and explicitly preserved `agent-harness-mcp-runtime`. |
| `npm run test:repair -- --changes tmp/wsf20-r04-changes.json` | Restricted Windows | Exit 1; production step blocked by `spawn EPERM`. Recorded once, then rerun in normal Windows. |
| Same repair command | Normal Windows | Exit 1; 70/75 test files passed, five failed; duration 586,162 ms. Both changed test files passed. This is not a full profile pass. |
| Profile-owned `npm run build` | Normal Windows | Exit 0; production TypeScript, Vite renderer and branding build passed in 13,348 ms. |
| `node --test test/agent-harness/reserved-toolbox-namespace.test.cjs test/workflow/workflow-application-service.test.cjs` | Normal Windows, current profile build | Exit 0; 30 tests passed, zero failed/skipped; 36,352 ms. Includes all seven candidate stages, rejection without SQL mutation and SQL review rematerialization. |
| `node` via stdin, Architect validator matrix | Restricted Windows, no child processes | Exit 0; six valid Architect shapes and 38 rejected wrong-field/type/byte/control variants, including multibyte UTF-8 and representative forbidden control points. Issue references and all seven stages covered in the focused suites. |
| Baseline diagnostic command below | Normal Windows | Exit 1; two pass and three fail out of five selected scenarios. |
| `node --test --test-name-pattern="submodule and alternate metadata|Feature source-backed vertical" test/source-control/managed-project-source.test.cjs test/source-control/workflow-integration-service.test.cjs` | Normal Windows | Exit 0; both representative source-control scenarios pass individually on current code. |
| `git diff --check` | Restricted Windows | Exit 0; no whitespace errors. |

Exact baseline diagnostic command:

```text
node --require ./tmp/wsf20-r04-baseline-preload.cjs --test --test-name-pattern="Agent Harness HTTP runtime serves|repo_toolbox and workspace-only|SQLite Project State: reviewed Workflow planning graph|submodule and alternate metadata|Feature source-backed vertical" test/agent-harness/agent-harness-runtime.test.cjs test/agent-harness/repository-io-hardening.test.cjs test/project-state/execution-completion.test.cjs test/source-control/managed-project-source.test.cjs test/source-control/workflow-integration-service.test.cjs
```

Normal Windows, exit 1; five selected scenarios, two pass and three fail. The ignored preload compiles the six changed production modules from starting HEAD into the Node module cache, using repository TypeScript compiler options. It does not rewrite source or built files. Three representative failures reproduce with baseline handoffs; both source-control scenarios pass on baseline and current code in isolated diagnostics.

Broader-profile failures:

- `test/agent-harness/agent-harness-runtime.test.cjs`: registered workspace tool discovery expectation differs from current repository-checkout metadata; representative failure reproduced with baseline modules.
- `test/agent-harness/repository-io-hardening.test.cjs`: workspace-only Git status expects success but receives false; representative failure reproduced with baseline modules.
- `test/project-state/execution-completion.test.cjs`: six scenarios reject unavailable deterministic ValidationCatalog proof for source-neutral workflows; one representative reproduced with baseline modules.
- `test/source-control/managed-project-source.test.cjs`: seven failures include candidate repository preparation/Git failures. Representative submodule case passes on baseline and current code individually; broader failures remain unresolved.
- `test/source-control/workflow-integration-service.test.cjs`: six integration outcomes are failed instead of integrated in the composed profile. Representative Feature case passes on baseline and current code individually; broader failures remain unresolved.

No fixes to these outside-scope runtime/domain/source-control failures were made. Individual diagnostic passes do not replace the failed composed receipt. No release qualification, packaging, launch smoke, external browser integration or visual acceptance was claimed; these are outside this prompt repair. Machine receipts/logs and baseline diagnostic helpers remain ignored under `tmp/`. A first optional prompt-size diagnostic using Node to spawn Git hit `spawnSync git EPERM`; corrected by reading the baseline with Python and measuring with child-free Node. A restricted process-inventory diagnostic received access denied; normal Windows inventory succeeded. Neither failure was counted as a validation pass.

## Git, security and audit handoff

Checkpoint required by the approved card: `WSF20-R04 separate semantic prompts from transport validation`. Commit hash pending creation; report the actual hash after commit without amending solely to insert it here. Stage only the six modified production files, two modified test files and this report. No push.

Exact staged implementation and report reviewed. Bounded added-line scans for credential/private-key signatures and concrete machine, home and temporary paths passed. Staged-path scan passed: only nine attributable source/test/report files, no generated output or dependency artifacts. `git diff --cached --check` passed. All unrelated untracked documents remain unstaged.

Remaining Operator audit: inspect the copied Architect Interview handoff for emphasis and length, then audit the checkpoint. No semantic-contract blocker remains in the focused evidence. Broader profile failures remain a qualification limitation and need a separately scoped runtime/source-control/test follow-up; their full cause has not been asserted. Stop after checkpoint as required by the card.
