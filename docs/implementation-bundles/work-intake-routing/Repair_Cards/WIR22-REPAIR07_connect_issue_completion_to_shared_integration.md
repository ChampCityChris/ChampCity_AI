# WIR22-REPAIR07 — Connect Issue completion to shared integration

Parent: WIR22 canonical routed execution cutover. Authorized by the Operator's explicit permission to repair necessary omitted adapters without a new product decision.

## Inspected defect and root cause

`getIssueCorrectionExecution` derives current correction completion, including aggregate Issue validation. `projectIssueExecution` constructs the generic executor input but only returns the projection. `routedIntegrationService` loads only non-Issue Development bindings, so the canonical Issue route cannot invoke the existing candidate/Integration Repair owner after completion. This is an inspected missing adapter, not a new workflow requirement.

## Bounded correction

Expose the existing Issue adapter's execution input and exact terminal Fix/Repair contract identities through the Issue service. Normalize that evidence into the existing routed integration caller, preserving current Intake/Plan/branch identity and generic executor completion. Use the same candidate, validation-policy, repair-policy, checkpoint receipt and source-control owners. Make aborted candidate status truthful rather than offering an impossible identical recreation. Expose reading the current Integration Repair for the parent UI.

Inspect/modify only `src/main/planExecution/issueExecutionAdapter.ts`, `src/main/issueResolution/issueResolutionService.ts`, `src/main/planExecution/routedIntegrationService.ts`, and these card/report artifacts. Preserve Issue lifecycle/validation/close decisions, direct/phased semantics, REPAIR06 checkpoint behavior and policy boundaries. No new engine, canonical state, Phase, Git command path, dependency or product policy.

## Acceptance and evidence

The existing complete/fresh Issue evidence supplies shared integration; incomplete or stale evidence cannot advance a target. Every terminal Fix/Repair contract requires its matching machine checkpoint. Non-Issue callers retain their same owner path. Aborted exact candidates remain visibly unavailable until evidence or source refs change. Required validation would be typecheck/build and the existing Issue lifecycle, Development lifecycle and Git-boundary suites; **all execution is explicitly skipped under the Operator's later instruction to do no more testing this entire run**. Inspect source only and report the resulting verification gap honestly. No tests are added, rewritten or retired.

## Report and return

Write `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR22-REPAIR07_IMPLEMENTER_REPORT.md`. Create one Operator-authorized bounded checkpoint, preserving the parent WIR22 edits, then resume WIR22. Final merge into `dev` remains after the authorized sequence; no push/tag/release.
