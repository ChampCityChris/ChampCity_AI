# WRB01-R01-03 — Restore Checkout-Aware Source Graph, Close Legacy Hub Reachability, and Requalify WRB01

**Depends on:** WRB01-R01-02 checkpoint
**Implementer:** GPT 6.0 Luna Medium

## Objective
Complete the Project-container/RepositoryCheckout split across the currently reachable WRB01 product surface, remove the remaining legacy Development/Issue entry from Current Project Hub, and requalify the repaired bundle.

## 1. Source Graph requires separate Project and Git roots
Current sourceGraph:get and sourceGraph:revisionDetail still pass the non-Git Project container to SourceControlService. That is invalid after WRB01 topology.

Establish an explicit internal split:
- Project container root: SPS/.champcity metadata and Current Project identity;
- Git inspection root: exact managed Dev RepositoryCheckout (one working tree of the shared Repository).

SourceControlService/SourceGraph may be adapted with a projectContainerRoot plus repositoryRoot, or an equivalently explicit bounded contract. Do not make the Project root Git-backed again and do not infer Git by walking parents.

getSourceGraph must enumerate refs/history through the Git checkout while reading structured Workflow metadata from ProjectContainer/.champcity/project-state.sqlite.

getSourceGraphRevisionDetail must inspect the same Repository through the managed Git checkout.

main.ts Source Graph IPC must resolve the managed Dev checkout from the selected Project topology and use it as the Git root. Missing/redirected/non-Git Dev fails closed.

Keep compatibility for tests/internal callers where Project root and Git root are intentionally the same conventional fixture only when the caller explicitly omits the separate Project root; do not add Project-root fallback to the new desktop path.

## 2. Current Work Intake projection
getStructuredWorkIntakeProjection is reachable from the current Hub Start Work surface and currently asks SourceControlService for branches at the non-Git Project root. Resolve its mechanical branch inventory through managed Dev while SPS remains at the Project container. Do not redesign WIR; WRB02 owns routing.

## 3. Remove legacy Hub reachability
WorkflowHubWorkspace must no longer render the 'Continue legacy Development or Issue work' disclosure/cards for a Current Project. Old in-progress workflows are abandoned, not recoverable product mode.

Do not build the replacement multi-instance Hub in this repair. Keep Start Work and Source Control; WRB02 will replace/expand the Hub.

Legacy backend modules may remain for unreplaced surfaces, but the Current Project Hub must not navigate into them.

## 4. Focused proof
Add/extend permanent proof that a successfully registered managed Current Project can:
- return Source Graph containing main/dev refs through the public/current source path;
- report structured metadata as available from Project SPS while Git comes from Dev;
- return revision detail for a known commit;
- keep Project container itself non-Git;
- project structured Work Intake branch information without Git-root failure;
- render no legacy Development/Issue recovery disclosure.

Do not prove this by calling Git directly at the Project container.

## 5. Requalification
Run the repaired WRB01 focused vertical suite: current Project registration/entry, managed-project-source, Greenfield bootstrap, Source Graph projection/current source path, structured Work Intake capture/projection, and capability-map validation.

Run validation planner preview for the exact Repair01 changed paths. Run affected validation only if the selected plan is bounded enough to complete under the repository's lean-test policy; if it selects known broad/deferred legacy families, record the plan and focused evidence rather than repeatedly running a multi-minute historical sweep. Do not claim an affected pass unless it completes.

Rewrite WRB01-05_BUNDLE_QUALIFICATION_REPORT.md as valid UTF-8, replace the pending WRB01-05 checkpoint with 287176637cc8784c4a9552e9305c5795884fbe97, append the three repair checkpoints/results, and state the final qualification evidence accurately.

Write Repair01/Reports/WRB01-R01-03_BUNDLE_REPAIR_REPORT.md with final disposition evidence.

## Stop boundary
Create one checkpoint commit: WRB01-R01-03 restore Current Project source surfaces and requalify bundle. Then STOP. Do not begin WRB02. Human Architect reviews Repair01.