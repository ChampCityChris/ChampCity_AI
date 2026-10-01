# RWS05B Implementer Report

Work Card: RWS05B. Approved repository root verified as the primary Dev checkout with repository contract, package and Git metadata. Branch: dev. Entry checkpoint: aab61ed191c7964ba887bb8e25c0f6f5d0c7fe88 (RWS05A). Origin is configured; no fetch or push performed. Unrelated pre-existing changes remain preserved.

## Implementation

Registered ArchitectReviewCycle with only Workflow ID/type, stage kind and application-computed SHA-256 semantic member ID/version digest. Registered exact architect_review_for and review_member relationships. Typed service commands create/revise a bounded exact member set, query the current cycle and projection/disposition, and issue exact-version human Operator Decisions. Generic creation, revision, supersession, review and membership mutation cannot bypass the typed boundary.

Supported owners: Project Creation, Feature, Issue, Migration, Integration, Infrastructure and Research. Stage kinds must match their Workflow type; WIR is rejected. Active current cycle ownership is unique and exact. Semantic membership checks direct and indirect ownership through normal Workflow membership, review cycles, Criterion definitions, Evidence support and RootCause explanations. Historical ownership cannot silently be reassigned. Generic semantic member revision advances the digest/version in the same transaction; supersession invalidates the anchor and requires an active replacement member set. Prior immutable Decision bodies remain unchanged. Replacing membership also advances the cycle and records relationship audit/outbox changes.

Added a typed deterministic in-memory review projection with exact cycle/Workflow identity, disposition, source IDs/versions, readable Markdown and derived filename/path. The service loads and validates the exact SQL member set before rendering; arbitrary supplied prose is not authority. No projection files are written. Extracted the existing exact-version Intake decision evaluator into a shared helper while preserving Intake behavior. Updated the domain architecture. No SQLite table migration or project_state_authority advancement.

Created: src/shared/projectState/architectReviewContracts.ts; this report.
Modified: src/shared/projectState/domainContracts.ts; entityTypeRegistry.ts; relationshipRegistry.ts; projectStateService.ts; workflowIntakeDisposition.ts; test/project-state/domain-contracts.test.cjs; test/project-state/sqlite-store-conformance.test.cjs; docs/architecture/CHAMPCITY_STRUCTURED_PROJECT_STATE_DOMAIN_MODEL.md.
Deleted: none. Intentionally not created: ArchitectDocument/body blob, migration, renderer routes/activation, projection files, dependencies, Greenfield migration or Feature/Issue service rewrites.

## Validation

- npm run typecheck: restricted Windows lane, exit 0 after syntax corrections during implementation. Later closure production build covers the final source.
- npm run validate:plan -- --profile work-item --changes tmp/rws05b-changes.json: restricted lane, exit 0; 44 selected files, one production build.
- npm run test:affected -- --changes tmp/rws05b-changes.json: normal Windows lane established after RWS05A sandbox EPERM. Initial runs exposed a missing new domain fixture and invalid test setup (noncanonical entry workspace, Criterion assembly after Workflow graph attachment, and Evidence reference without a URI scheme). Corrected tests using existing domain contracts. Reruns followed actual changes and preserved stable source for each run.
- Final affected command: normal Windows lane, exit 1; production build passed; 337 test passes, 20 failures; 155627 ms. Domain contracts: 8/8 passed. SQLite conformance including Architect cycle proof: 10/10 passed. No failures in changed capability owners.
- node --test --test-name-pattern="Architect review cycles" test/project-state/sqlite-store-conformance.test.cjs: normal Windows lane; initial fixture failures documented above, corrected run exit 0, 1 pass. Final composed run repeats the complete SQLite owner against the final build.
- git diff --check: exit 0.

Final nonpassing files:
- test/agent-harness/repository-io-hardening.test.cjs
- test/agent-harness/reserved-toolbox-namespace.test.cjs
- test/project-intake/post-submit-review-state.test.cjs
- test/project-state/execution-completion.test.cjs
- test/source-control/managed-project-source.test.cjs
- test/source-control/workflow-integration-service.test.cjs

Failure classification: toolbox/checkout argument expectations; obsolete Work Intake renderer fixture; source-neutral deterministic validation-policy expectations; source adoption fixture failures; and source-backed integration status assertions. Five failing files were also observed in RWS05A. The integration file was newly selected by the broader Project State scope and failed in a path that creates no Architect cycle; no clean-baseline reproduction is claimed. Unrelated production code and fixtures were not changed to make this profile green. The affected profile remains failed, not qualified as a whole.

The existing SQLite owner was extended because grouping, exact-version review and indirect semantic ownership were previously uncovered invariants. Existing registry fixture coverage now includes the new entity. The proof exercises all seven owner types, WIR rejection, idempotence, Project/Workflow isolation, required revision notes, immutable prior Decision bodies, stale review after member revision, exact member replacement, generic bypass rejection, generated SQL projection and existing SQLite persistence. No full/release qualification, external integration acceptance or visual acceptance is claimed.

## Safety and checkpoint

Attributable staged diff reviewed before checkpoint; bounded secret/local-path/generated-artifact scan performed. No credentials, concrete local-machine paths, generated output or unrelated changes staged. Required checkpoint hash pending commit; no push. RWS05A checkpoint remains aab61ed191c7964ba887bb8e25c0f6f5d0c7fe88.

## Remaining work

B introduces no renderer activation. RWS05C, RWS05D, RWS05E and RWS05F remain unimplemented. Next card: RWS05C. This is not the bundle qualification report or Architect/Operator acceptance. Broader failures remain recorded above; no architecture stop condition was identified.
