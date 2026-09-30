# WRB01-05 — Qualify Current Project Runtime and Fence Legacy Current-State Reconstruction

**Implementer:** GPT 6.0 Luna Medium
**Bundle:** WRB01 — Current Project Runtime Foundation
**Execution:** sequentially released; no Architect review required before the next WRB01 card unless a bundle-level blocker is encountered.

Every card requires focused validation, an Implementer Report, one attributable checkpoint commit, then continuation to the next released card. Do not run the broad historical full suite unless selected by the affected-validation planner.

## Depends on
WRB01-04 checkpoint.

## Outcome
Qualify WRB01 as one vertical product outcome and make it impossible for the newly wired Project runtime to reconstruct current Workflow state from legacy Markdown/provider-cutover machinery.

## Required production cleanup
- Remove new/current Project runtime dependencies on structuredProviderCutover, stagedLegacyImporter, legacyEquivalenceVerification, legacyAuthorityInventory, and legacy/structured provider selection.
- Current runtime discovery uses the WRB01 current Project registration contract only.
- Historical Markdown files may remain files/documentation/Evidence; they cannot instantiate current Workflow/WorkItem/Phase/Issue state.
- Do not perform a legacy migration. Old in-progress Workflow artifacts are abandoned.
- Retain old modules only if still called by an unreplaced legacy surface outside the new current Project entry path; if retained, mark them unreachable from current Project runtime and document remaining callers for later retirement. Delete zero-caller code/tests when safe.

## Bundle qualification scenario
Using disposable fixtures, prove:
1. Existing conventional Git Project registers into fresh SPS without importing legacy Workflow Markdown.
2. Managed topology yields non-Git Project root plus Main/Dev checkouts.
3. Existing commits/remotes and dirty/untracked user state survive normalization.
4. Greenfield creates fresh SPS + managed source baseline + tracked .gitignore.
5. New Project lands at Project Intake, not WIR.
6. Existing Project lands at Project/Workflow Hub, not WIR.
7. Reopen is idempotent.
8. MCP repo access uses Project container while Git uses explicit Main/Dev checkout IDs.
9. No WorkIntake or WIR Workflow is created merely by opening/creating a Project.
10. Legacy Markdown cannot become current SPS state.

## Test retirement
Delete or rewrite tests whose only obligation is legacy provider coexistence/cutover on the new current Project path. Do not keep compatibility code solely to keep those tests green.

## Bundle report
Write Reports/WRB01-05_BUNDLE_QUALIFICATION_REPORT.md summarizing all five card checkpoints, final production paths, qualification evidence, remaining deferred runtime, and any dead/legacy callers still intentionally retained.

## Validation
Run focused WRB01 qualification plus affected validation from the exact final changed paths. Do not run the historical full suite unless the planner selects it.

## Checkpoint and STOP
Create one WRB01-05 checkpoint commit, then STOP. Do not begin WRB02. Human Architect reviews the entire WRB01 bundle next.