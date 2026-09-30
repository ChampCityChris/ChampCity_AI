# WRB04-02D — Exact Workflow Checkout and Structured Implementation Checkpoint

**Depends on:** completed WRB04-02C

## Objective

Extend the exact `workflow-work-item` runtime to source-backed WorkItems using the registered Workflow checkout and existing structured checkpoint machinery.

## Required implementation surface

Inspect and, where needed, change only these existing boundaries:

- `src/main/workCardBuilding/codexImplementerExecutionService.ts` — exact selector resolution, source preparation, worker root/policy, App Server file-change attribution, attempt evidence, typed finalization, and checkpoint result projection.
- `src/main/workflow/workflowExecutionApplicationService.ts` and `src/shared/workflowApplicationContracts.ts` — call the existing `prepareExecution(..., {sourceMutating:true})` boundary and return its exact preparation evidence; keep the source-neutral contract path intact.
- `src/main/main.ts` — provide the selected Current Project's Agent Harness checkout-registration port to source materialization if the production service factory currently lacks it.
- `src/main/sourceControl/workflowSourceMaterializationService.ts` and `src/main/sourceControl/semanticCheckpointService.ts` — reuse their existing materialization and checkpoint operations; change them only if a demonstrated contract gap prevents this card's exact-boundary checks.
- Existing tests in `test/work-card-building/codex-implementer-execution-service.test.cjs`, `test/workflow/workflow-execution-application-service.test.cjs`, `test/source-control/semantic-checkpoint-service.test.cjs`, `test/source-control/structured-workflow-checkpoint.test.cjs`, and `test/source-control/workflow-source-materialization.test.cjs`; `validation/capability-map.json` only if its current ownership mapping needs a path update.

Write `docs/implementation-bundles/workflow-runtime-rebaseline/WRB04/Reports/WRB04-02D_IMPLEMENTER_REPORT.md`.

## Execution contract

Determine source capability from the exact Workflow execution projection: `non-source` keeps the unchanged 02C path, while any source-backed Workflow must use `sourceMutation: "required"`. Never accept a renderer/model-supplied source-mutation flag. For source-backed execution, perform this order:

1. Call the shared application's lazy `prepareExecution(..., {sourceMutating:true})` exactly once before beginning the attempt or starting App Server. Extend its result as needed so both first materialization and already-ready reuse return the active SourceBinding and exact `RepositoryCheckout` identity. `prepareExecution` must invoke the existing materializer once for either state: that service creates source on the first call and validates/re-registers the exact existing checkout idempotently on retry. Do not create a second checkout or source line. A blocked/non-ready result ends execution visibly and creates no worker session.
2. Create the source-mutating WorkItem contract only after preparation succeeds. Capture its `sourceRevisionId`, then verify the returned exact `RepositoryCheckout` identity against the SourceBinding (`repositoryCheckoutId`, Workflow owner, source-line ID, role, and managed project-relative path). Verify the resolved checkout is the exact managed Workflow checkout, its Git root is that directory, its current branch is the bound source line, its Git common directory belongs to this Current Project repository, and `HEAD === contract.sourceRevisionId === binding.currentRevisionId`. Reject redirected, unrelated, dirty, or mismatched checkouts before App Server starts.
3. Keep `projectRoot` as the Current Project container for Project State and evidence. Set App Server `workingDirectory`, `writableRoots`, and execution-policy workspace root to the verified checkout root. Do not create a worker copy for source-backed execution. The source-neutral 02C worker-directory behavior remains unchanged.
4. Permit source edits only inside the verified checkout. Collect changed paths solely from completed App Server `file_change` events. Accept only safe repository-relative paths; reject absolute, traversal, separator-ambiguous, protected, or out-of-checkout paths. If any event cannot be attributed completely, retain the attempt packet and do not call the checkpoint service as though the change set were complete.
5. Parse and validate the existing bounded semantic result. Persist its attempt packet and call typed `finishWorkItemAttempt` exactly once before creating a checkpoint. Only `outcome: "implemented"` with complete non-empty attributed paths may call `createImplementationCheckpoint`.
6. Build the checkpoint request from the exact Workflow ID, exact WorkItem's returned ImplementationRecord ID, executionRef as the idempotent boundary ID, exact binding's source-line and checkout IDs, the pre-run revision, and the complete App Server path set. Pass the Current Project container root to the application-owned checkpoint service; do not run Git commands from the Implementer path.
7. Map checkpoint `committed` to the session's committed checkpoint result, including exact checkpoint ID and resulting commit. Map `blocked` and `inspection-required`, missing attribution, no attributable paths, non-implemented outcomes with possible source edits, and thrown/unknown checkpoint outcomes to a visibly blocked session with the service's message and no fabricated commit/receipt. Preserve the packet and typed attempt result in every post-run failure case. Never report `not-required` for a source-backed run.

The materialization adapter must be built from the currently selected Current Project root/ID and its current Agent Harness workspace registration. Do not retain a registration or checkout path across project changes. If the production composition cannot establish this exact context, fail before App Server rather than falling back to the container or another checkout. Keep checkout filesystem paths in the main-process execution context; the shared preparation result may expose RepositoryCheckout's semantic identity and project-relative path but must not expose an unrestricted local filesystem path to renderer/preload consumers.

## Preservation and non-scope

- Preserve 02C source-neutral Feature and Issue behavior, including its isolated worker directory, `not-required` checkpoint, and absence of Git evidence.
- Preserve exact WorkItem/Workflow ownership and ID-based identity; titles are display-only.
- Do not use legacy WorkItem checkpoint capture/finalization, `getCurrentWorkspaceModel`, routed-development, Issue Fix Card, Markdown discovery/report freshness, or source-neutral fallback for a source-backed Workflow.
- Do not let the model/Implementer issue Git mutations. Git staging, commit, and SourceBinding advancement belong only to the structured application checkpoint service.
- Do not change schemas, introduce dependencies, alter unrelated execution selectors, or proceed to WRB04-03 in this card.

## Architecture and constraints

Before execution, call the WRB04-01 lazy source preparation boundary and resolve the exact RepositoryCheckout from the exact SourceBinding. Verify checkout identity, branch/source line, and HEAD revision against `currentRevisionId`. Use that checkout as Codex working directory; keep the Current Project container as the SPS/evidence root.

Attribute only App Server file-change events rooted inside the exact checkout. On successful validated report, finish the typed attempt, create an exact Workflow/WorkItem SourceCheckpoint using application-owned Git mechanics, advance SourceBinding to the exact resulting revision, and preserve ImplementationRecord ↔ SourceCheckpoint evidence. If attribution/checkpoint outcome is uncertain, retain report/attempt evidence and return blocked or inspection-required state. The Implementer must not issue Git mutations itself.

Do not route exact mode through legacy WorkItem checkpoint capture, routed-development, Issue Fix Card, or Markdown state.

## Acceptance

1. Source-backed execution materializes at most once and starts in the registered exact Workflow checkout at the exact bound revision.
2. Project container and execution root remain distinct; unrelated checkout paths are rejected.
3. Exact attributable changes produce a structured SourceCheckpoint and exact SourceBinding revision advance.
4. Attribution failure, checkpoint failure, or uncertain outcomes cannot present a clean implementation checkpoint.
5. ImplementationRecord and checkpoint are linked to the exact WorkItem and Workflow; same-title WorkItems do not collide.
6. Non-source behavior from WRB04-02C remains not-required and creates no Git evidence.

## Validation and report

Run build; focused exact Codex context/finalization tests; structured checkpoint and source-materialization regressions; an exact changed-path `work-item` planner preview; the work-item profile; and `git diff --check`. Use fake App Server adapters and synthetic managed checkouts to prove the prepared bound revision, distinct container/checkout roots, safe event attribution, exact checkpoint linkage/revision advance, failure retention, and unchanged 02C behavior. Reuse/extend current test boundaries where they adequately own the proof; any new permanent test must state the uncovered contract or failure-mode gap it closes. Report implementation-local proof separately from permanent Tester proof, list test reuse/modification/addition and any skipped proof, write the card-specific report at the path above, and commit this card's completion before opening WRB04-03.
