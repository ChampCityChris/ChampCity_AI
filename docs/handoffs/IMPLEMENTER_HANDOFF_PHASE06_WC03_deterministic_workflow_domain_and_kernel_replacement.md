# Implementer Handoff: Phase 06 WC03 — Deterministic Workflow Domain and Kernel Replacement

## Recommended Codex Configuration

- Model: strongest available Codex coding model
- Reasoning level: high
- Execution mode: one complete implementation pass

## Role

You are the Implementer for ChampCity A/I Phase 06 WC03.

Implement the approved WC03 replacement foundation exactly as governed. This is not a planning exercise, a diagnostic-only pass, a narrow patch, or a request for another repair card. Complete the approved architecture, migration, integration, testing, and Implementer Report in one pass.

## Repository Verification — Required Before Any Edit

1. Confirm the working directory is the approved repository root `<PROJECT_REPO>`.
2. Run and record:
   - `git rev-parse --show-toplevel`
   - `git remote -v`
   - `git branch --show-current`
   - `git status --short`
3. Confirm the repository is `ChampCityChris/ChampCity_AI`.
4. Abort if the repository root or remote is wrong.
5. Do not print a concrete local machine path in committed artifacts. Use `<PROJECT_REPO>` and repo-relative paths.
6. Do not switch branches, pull, reset, clean, stash, discard, or overwrite existing changes before inspecting them. The repository currently contains approved Phase 06 planning changes that must be preserved.
7. No production source changes existed when WC03 was approved. Treat all pre-existing planning changes as approved governance state, not disposable dirt.
8. Push is not authorized.

## Required Rules to Read First

Read before implementation:

- `AGENTS.md`
- `docs/dev/VALIDATION_COMMAND_LANES.md`

Follow the approved normal Windows validation lane for commands that spawn child processes. Do not repeatedly retry `spawn EPERM` failures in a sandbox.

Do not add or run Playwright. Use the existing unit, repository-gate, real-corpus, and mounted Electron validation lanes required by WC03. Human visual and acceptance checks remain Operator work.

## Exact Governing Authority

Read the synchronized JSON and Markdown pairs for each controlling artifact. JSON is the structured source; Markdown is the human-readable rendering. An unsynchronized pair is blocking.

Primary authority:

- `planning/phases/phase-06/Work_Cards/WC03_deterministic_workflow_domain_and_kernel_replacement.{json,md}`
  - Artifact ID: `champcity-ai/phase-06/work_card/WC03`
  - Approved revision: 2
  - Kind: `replacement_candidate`
- `planning/phases/phase-06/Operator_Approvals/OPERATOR_APPROVAL_WC03_deterministic_workflow_domain_and_kernel_replacement.{json,md}`
  - Artifact ID: `champcity-ai/phase-06/operator_approval/WC03`

Required antecedents:

- `planning/phases/phase-06/Work_Card_Plan.{json,md}`
- `planning/phases/phase-06/Architect_Reviews/ARCHITECT_REVIEW_WC02-REPAIR03_full_workflow_resolver_foundation_rebuild.{json,md}`
- `planning/phases/phase-06/Candidate_Dispositions/CANDIDATE_DISPOSITION_WC02_authorize_full_resolver_foundation_rebuild.{json,md}`
- `planning/phases/phase-06/Work_Cards/WC02-REPAIR04_normalized_domain_single_kernel_authority_repair_route_completion.{json,md}`
- `planning/phases/phase-06/Diagnostic_Reports/DIAGNOSTIC_REPORT_WC02_full_workflow_resolver_foundation_top_to_bottom_review.{json,md}` or the exact existing WC02 diagnostic pair found by artifact ID
- `planning/phases/phase-06/Design_Documents/DESIGN_DOCUMENT_WC01_kernel_contract_artifact_protocol_source_authority_replacement_inventory.{json,md}` or the exact existing WC01 design pair found by artifact ID
- `planning/phases/phase-06/Implementer_Reports/IMPLEMENTER_REPORT_WC02-REPAIR03_full_workflow_resolver_foundation_rebuild.{json,md}`

Use artifact IDs and exact relationships to locate renamed files. Do not infer authority from filenames.

## Current Approved Governance State

Preserve these outcomes:

- WC01 remains resolved.
- WC02 is terminally superseded by WC03; it is not recorded as successfully completed.
- WC02-REPAIR01 remains passed.
- WC02-REPAIR02 remains passed.
- WC02-REPAIR03 remains not accepted.
- WC02-REPAIR04 is superseded before approval and is non-executable.
- WC03 is the active approved replacement candidate.
- The exact expected output is `champcity-ai/phase-06/implementer_report/WC03`.

The existing test baseline before implementation is 61 passing and 2 failing. Both failures are obsolete WC02-era expectations in `test/wc02-repair03/full-workflow-resolver-foundation.test.cjs`:

- one expects WC02-REPAIR03 to remain the current target;
- one expects the Work Card Plan candidate list to remain `[WC01, WC02]`.

Replace those obsolete assertions with independent WC03-governed tests. Do not weaken tests, suppress failures, or preserve WC02-only assumptions as compatibility authority.

## Non-Negotiable Architecture

Implement exactly four one-way layers:

1. **Verified Artifact Graph**
   - Verifies canonical structure, synchronized pairs, identity fields, ownership, relationships, duplicates, cycles, invalid status combinations, and missing required fields.
   - Selects no workflow meaning, candidate, repair, replacement, action, route, screen, or output.

2. **Normalized Workflow Domain**
   - Converts verified records into typed project, phase, Work Card, repair, replacement, approval, report, review, validation, disposition, and lifecycle records.
   - Rejects ambiguity.
   - Performs no filename, title, path, suffix, numeric-ID, timestamp, directory-order, first-match, or LLM inference.

3. **Pure Workflow Kernel**
   - Consumes only normalized domain objects.
   - Has no repository, filesystem, Registry, Workflow State, IPC, Electron, renderer, or LLM dependency.
   - Returns exactly one typed current action or one typed blocker.

4. **Thin Adapters**
   - Repository refresh, projections, IPC, routed writes, visibility, and renderer routing consume the exact kernel result.
   - They may format and verify. They may not reinterpret, infer, alias, default, reroute, or advance a parallel state machine.

## Hard Identity and Hierarchy Requirements

Create and enforce a single typed identity model.

### Project

Require explicit:

- `projectId`
- `repositoryBindingId`
- `repositoryRootIdentity`
- `projectStatus`

Display names and folder basenames are presentation only.

### Phase

Require explicit:

- `phaseId`
- `projectId`
- `phaseSequence`
- `predecessorPhaseId`
- optional `successorPhaseId`
- `phaseStatus`
- `activationArtifactId`
- `closeoutArtifactId` when closed

Never parse or numerically compare `phase-##` to determine authority or succession.

### Work Card

Require explicit:

- `workCardArtifactId`
- `workCardId`
- `workCardKind`
- `projectId`
- `phaseId`
- `planArtifactId`
- `planCandidateId`
- `planOrder`
- `rootCandidateArtifactId`
- conditional `parentWorkCardArtifactId`
- `workCardStatus`
- `expectedImplementerReportArtifactId`

`workCardId` is a display code only.

### Work Card Taxonomy

Implement one code-owned enum with exactly:

- `planned_candidate`
- `repair`
- `replacement_candidate`

There is no generic implicit child Work Card lifecycle. `parentArtifactId` and `relationships.children` remain structural only and cannot authorize execution.

### Repair

Require explicit:

- `rootCandidateArtifactId`
- `parentWorkCardArtifactId`
- `repairSequence`
- conditional `priorRepairArtifactId`
- `triggerArtifactId`
- `authorizingArtifactId`
- `repairWorkCardArtifactId`
- `expectedImplementerReportArtifactId`

Never parse `-REPAIR##`.

### Replacement Candidate

Require explicit:

- `replacementWorkCardArtifactId`
- `replacesWorkCardArtifactId`
- `authorizingDispositionArtifactId`
- `replacementReasonArtifactId`
- `planArtifactId`
- `planOrder`
- `expectedImplementerReportArtifactId`

A replacement terminally supersedes the replaced candidate without treating it as successfully completed.

### Current Action

Every current action must contain exact:

- `actionId`
- `projectId`
- `phaseId`
- `targetArtifactId`
- conditional `targetWorkCardArtifactId`
- `responsibleRole`
- `screenId`
- `sourceArtifactIds`
- `expectedOutputArtifactId`
- `expectedOutputArtifactType`
- `authorizedOperations`
- `stateRevision`

No placeholder or synthetic identity is allowed.

## Typed Relationship Requirements

Normalize generic artifact links into validated typed relationships before kernel execution. Include at least:

- `belongs_to_project`
- `belongs_to_phase`
- `declared_by_plan`
- `implements_candidate`
- `repairs_work_card`
- `follows_repair`
- `triggered_by_validation`
- `authorized_by_review`
- `authorized_by_disposition`
- `replaces_work_card`
- `produces_implementer_report`
- `produces_architect_review`
- `produces_operator_validation`
- `supersedes_artifact`

The kernel must consume typed relationships, not reinterpret generic source arrays.

## One Executable Semantic Authority

One typed action catalog must be the sole executable authority for:

- action IDs;
- workflow stage;
- role;
- screen;
- target rules;
- source rules;
- expected output type and identity rule;
- authorized operations;
- success, repair, failure, and disposition transitions.

Remove the duplicate hand-authored `runtimeActions` semantic authority from `processContract.ts`, or generate all contract projections directly from the single catalog without repeated semantic literals.

Delete or reduce all other transition, route, workflow-step, visibility, IPC, and renderer maps to generated or presentation-only adapters.

The prior disagreement where `operator_validation_required.success` could lead to both Architect disposition and Work Card authoring must be impossible.

## Prohibited Runtime Authority

Do not use any of the following to determine workflow meaning or control:

- regex categorization lists;
- parsing `phase-##`, `WC##`, or `-REPAIR##`;
- filenames, titles, paths, or directory names;
- visible-ID numeric inference;
- timestamps or newest-file selection;
- directory or scan order;
- `[0]`, `first()`, first matching `.find()`, or equivalent first-match authority;
- title-derived output paths;
- synthetic or placeholder IDs;
- action aliases;
- workflow-step-derived, role-derived, or fallback screen selection;
- stale Registry or Workflow State authority;
- LLM reasoning about project, phase, hierarchy, action, route, screen, output, or authorization.

Regex may reject a malformed display code at an input boundary. Passing a regex never establishes category, hierarchy, sequence, or authority.

## Exact Approval and Implementer Assignment

The only approval that authorizes WC03 is:

`champcity-ai/phase-06/operator_approval/WC03`

Approval for WC02, a WC02 repair, or Phase 06 generally cannot authorize WC03.

Compile an exact Implementer assignment containing:

- repository identity;
- project ID;
- phase ID;
- action ID;
- target WC03 artifact ID;
- `replacement_candidate` kind;
- plan order 3;
- replaced candidate ID;
- exact Operator Approval artifact ID;
- exact source bundle;
- exact expected Implementer Report artifact ID;
- authorized production surface;
- state revision.

Every routed write must verify exact action, role, screen, target, sources, output identity, output type, operation, and state revision. After a primary write, rescan repository evidence, rebuild the domain, rerun the kernel, and project the next action.

## Required Current-Corpus Migration

Perform only the minimum Phase 04–06 migration required to prove and operate WC03.

The migration must be:

- deterministic;
- idempotent;
- reversible;
- pair-synchronized;
- stable-ID preserving;
- historical-outcome preserving.

Explicitly represent:

- WC02 superseded by WC03;
- WC02-REPAIR04 superseded before approval;
- WC03 as `replacement_candidate`;
- explicit project and phase hierarchy;
- explicit candidate, repair, and replacement identities and relationships needed by the WC03 proof corpus.

Do not attempt an uncontrolled migration of the entire historical project corpus. A separately governed full historical migration follows successful WC03 acceptance.

Do not create aliases, shadows, compatibility readers, or historical reclassification merely to make tests pass.

## Production Surface

Changes are authorized only where required within:

- workflow modules;
- repository verification and refresh modules;
- canonical artifact types, validators, builders, and minimum migration tooling;
- minimum main/preload IPC and shared types;
- minimum routed renderer selection;
- workflow tests and independent architecture tests;
- repository gates;
- real-corpus replay scripts;
- mounted Electron checks;
- synchronized Phase 04–06 planning migrations;
- the WC03 Implementer Report.

Do not change unrelated UI layout or styling, onboarding, display-name behavior, MCP, connectors, LLM providers, authentication, deployment, cloud functionality, or unrelated application features.

Do not create another WC02 repair, an implicit child Work Card, fallback, alias, compatibility authority, or shadow artifact.

## Required Tests and Gates

Add independent positive and negative coverage for:

- hard project identity;
- explicit phase succession;
- exact Work Card kind and plan order;
- repair lineage;
- replacement lineage;
- no implicit child Work Cards;
- compiled Implementer assignment;
- graph-to-domain normalization independent of the kernel;
- pure-kernel tests with domain objects and no repository access;
- exactly one executable action authority;
- no regex categorization authority;
- no filename, title, path, suffix, timestamp, or order inference;
- no first-match selection;
- no synthetic output identities;
- ambiguity returns a blocker with no selected identity;
- exact approval isolation;
- unknown action displays only a blocker;
- Registry and Workflow State are non-authoritative;
- project isolation;
- WC02 superseded by WC03;
- WC02-REPAIR04 non-executable;
- WC03 approved and routed to Implementer execution;
- exact WC03 Implementer Report routes to Architect Review;
- no normal route opens Ad Hoc Work Card Capture;
- refresh and restart parity;
- mounted Electron parity against the selected real repository or a byte-for-byte copied corpus preserving exact canonical relationships.

Repository gates must enforce positive architectural invariants, not merely search for a few forbidden strings.

## Required Real-Repository Proof

Prove from the selected repository:

1. Project and phase identity come from explicit structured authority.
2. WC01 is resolved.
3. WC02 is terminally superseded by WC03.
4. WC02-REPAIR01 and WC02-REPAIR02 remain passed.
5. WC02-REPAIR03 remains not accepted.
6. WC02-REPAIR04 is superseded and non-executable.
7. WC03 is the active approved replacement candidate.
8. Exact WC03 approval is required and recognized.
9. Current action targets Implementer execution for WC03 before the report exists.
10. After the exact WC03 Implementer Report exists, current action is Architect Review of WC03.
11. Unknown actions display only a blocker.
12. Ad Hoc Work Card Capture is never routed.
13. Cold start, manual refresh, observer refresh, focus refresh, and post-write refresh agree.
14. Project switching cannot bleed evidence or route state.

## Required Validation

Use the documented normal Windows lane. Run and report the exact lane and result for:

- `npm run typecheck`
- `npm run build`
- complete unit suite
- repository gates
- real Phase 04–06 replay
- live selected-repository current-action probe
- mounted Electron routed-screen checks
- cold-start/manual/observer/focus/post-write refresh parity
- project-switch isolation
- `npm test`
- final `git status --short`

Do not report success based on a sandbox-only `spawn EPERM` result.

Do not perform Operator acceptance or create accepted Operator Validation records.

## Required Implementer Report

Create the synchronized pair:

- `planning/phases/phase-06/Implementer_Reports/IMPLEMENTER_REPORT_WC03_deterministic_workflow_domain_and_kernel_replacement.json`
- `planning/phases/phase-06/Implementer_Reports/IMPLEMENTER_REPORT_WC03_deterministic_workflow_domain_and_kernel_replacement.md`

Artifact ID:

`champcity-ai/phase-06/implementer_report/WC03`

The report must include:

- approved repository root verification without printing the concrete local path;
- branch and remote verification;
- initial repository state and preserved pre-existing changes;
- governing artifacts read;
- scoped code-review findings before edits;
- exact architecture before and after;
- hard identity schema;
- Work Card taxonomy;
- typed relationship model;
- normalized-domain API;
- pure-kernel API;
- exact Implementer assignment model;
- duplicate semantic authorities deleted or generated from the catalog;
- inference, regex-authority, fallback, alias, synthetic-ID, and first-match paths removed;
- migration inventory, dry run, apply result, idempotence, reversibility, and files migrated;
- files created, modified, and intentionally not created;
- independent tests and repository gates added;
- exact commands, execution lanes, and results;
- real-repository and mounted Electron evidence;
- checks skipped and exact reason;
- manual Operator validation still required;
- residual risks;
- security and secret-safety notes;
- final repository status;
- intended commit message;
- whether a commit was created;
- commit hash according to `AGENTS.md` reporting rules;
- confirmation that no push occurred.

## Commit and Push

Create a local implementation commit after all required validation passes and the report pair is synchronized. Use a plain WC03 commit message.

Do not push.

Do not amend a report solely to insert its own commit hash. Follow the Commit Hash Reporting Rule in `AGENTS.md`.

## Stop Conditions

Stop only for a genuine contradiction between the approved WC03 authority and repository facts that cannot be resolved without changing scope or governance.

The following are not stop conditions:

- large change volume;
- difficult migration work;
- failing tests during implementation;
- obsolete WC02 tests;
- tool inconvenience;
- sandbox `spawn EPERM` before rerunning in the approved lane;
- the need to delete or replace old workflow modules inside the authorized surface.

Do not return a partial implementation or request intermediate acceptance. Complete the full pass or report a precise, evidence-backed governing contradiction.

## Manual Validation After Codex

Human Operator checks only, after Architect acceptance:

1. Launch ChampCity A/I against the real ChampCity_AI repository.
2. Confirm the current action explicitly identifies project `champcity-ai`, phase `phase-06`, and Work Card `WC03` without relying on visible-code interpretation.
3. Confirm the routed screen is the Implementer execution surface for WC03 before the report exists.
4. Confirm no WC02 repair or Ad Hoc Work Card Capture surface is selected.
5. After the WC03 Implementer Report is present, confirm the routed action and screen are Architect Review of WC03.
6. Confirm an unknown action displays a visible blocker and no normal workflow screen.
7. Restart and refresh the application and confirm the same result.
8. Switch between configured projects and confirm no route or evidence bleed.
9. Review the migration evidence and confirm historical outcomes were preserved.

## Remaining Passes for Phase 06

After WC03 implementation:

1. Architect review of the complete WC03 implementation and Implementer Report.
2. Operator validation only if Architect review accepts WC03.
3. Architect disposition resolving WC03 and determining Phase 06 closeout readiness.
4. If WC03 passes, create a separately governed Work Card for full historical-corpus migration to the accepted schema; do not fold that uncontrolled migration into this pass.
