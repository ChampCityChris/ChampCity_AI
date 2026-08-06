<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "architect-review",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC46-REPAIR04",
    "repairId": "WC46-REPAIR04",
    "parentWorkCardId": "WC46"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC46-REPAIR04_selected_workspace_target_binding_and_loop_drift_hardening.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR04_selected_workspace_target_binding_and_loop_drift_hardening.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Architect Review - WC46-REPAIR04 Selected Workspace Target Binding and Loop Drift Hardening",
    "status": "ApprovedForOperatorValidation",
    "reviewDisposition": "ApprovedForOperatorValidation",
    "gitMutationPerformed": false
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "WC46-REPAIR04 satisfies the bounded selected-workspace target-binding and Work Card loop drift-hardening repair. Operator manual validation remains required for embedded ChatGPT runtime behavior.",
    "reviewedAt": "2026-08-04T22:23:00-04:00"
  }
}
CHAMPCITY-METADATA -->

# Architect Review — WC46-REPAIR04 Selected Workspace Target Binding and Loop Drift Hardening

Document.Status=ApprovedForOperatorValidation

## Review Disposition

Approved for Operator validation.

WC46-REPAIR04 satisfies the bounded repair contract. The implementation addresses the confirmed operational defect in Formal Work Card prompt target binding and closes the two agreed Work Card-loop anti-drift seams without replacing the global project/phase workflow resolver.

No Git mutation was performed by this Architect review.

## Review Inputs

Governing Work Card:

```text
planning/phases/phase-08/Work_Cards/WC46-REPAIR04_selected_workspace_target_binding_and_loop_drift_hardening.md
```

Implementer Report:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR04_selected_workspace_target_binding_and_loop_drift_hardening.md
```

Application repository verified through ChampCity MCP:

```text
workspaceId: champcity_ai
repository: ChampCityChris/ChampCity_AI
branch: feature/phase-04-wc01-repair01-evidence-derived-workflow
working tree: dirty
staged files: 0
```

MCP status still shows broad pre-existing WC46-family uncommitted work. This review evaluated the bounded WC46-REPAIR04 implementation against the approved repair card and did not perform staging, commit, push, reset, checkout, clean, stash, merge, rebase, tag, or any other Git mutation.

## Reviewed Production Surface

Reviewed files relevant to the repair:

```text
src/main/workCardPlanning/workCardPlanningService.ts
src/main/workCardIntake/workCardIntakeService.ts
src/main/currentWorkflow/currentWorkflowService.ts
src/main/workCardLoop/workCardLoopAuthorityService.ts
```

Reviewed supporting tests and evidence:

```text
test/work-card-planning/work-card-planning-service.test.cjs
test/work-card-intake/work-card-intake-service.test.cjs
test/workflow/current-execution-context.test.cjs
test/architect-outputs/architect-output-prompt-contracts.test.cjs
```

Reviewed cleanup artifact:

```text
planning/phases/phase-08/Work_Cards/WC46-REPAIR04_placeholder.md
```

The placeholder file remains as a superseded non-canonical notice. It is not part of the approved implementation and should be removed before final repository cleanup or commit. It is not treated as an Implementer failure because it was created during Architect artifact creation before this repair implementation pass.

## Findings

### 1. Selected-workspace target binding is implemented

`workCardPlanningService.ts` now carries a `SelectedWorkspaceTargetDescriptor` inside the Formal Work Card context. The descriptor includes:

```text
repositoryReference: <PROJECT_REPO>
handoffPath
formalWorkCardTargetPath
implementerReportTargetPath
```

`requireFormalWorkCardContext(...)` builds that descriptor from the already validated `workspaceRoot`, the current active Work Card Intake handoff, the Formal Work Card target path, and the Implementer Report target path.

The prepared Formal Work Card Architect instruction now starts by binding the session to the selected project workspace and by requiring exact handoff/target-path verification before repository claims. It instructs the embedded Architect session to use no other workspace and to abort if the selected workspace cannot be verified through the exact paths.

This satisfies the primary target-binding requirement without embedding a concrete local filesystem path.

### 2. Project-specific wrong-target names were removed from generated production prompt text

`workCardPlanningService.ts` no longer emits the project-specific wrong-target names that the Work Card forbade.

Direct MCP search of `src/main/workCardPlanning` for both forbidden strings returned no matches:

```text
ChampCity_AI
champcity_ai
```

The reviewed prompt construction uses generic selected-workspace language instead of referencing the operator's current development repositories.

### 3. Formal Work Card promotion/readback is hardened against mismatched active target evidence

`formalWorkCardArchitectOutputDefinition.resolvePromotionContext(...)` now compares the current active Formal Work Card context against the prepared context across:

```text
source handoff path
source handoff revision
phase ID
Work Card ID
candidate ID
Formal Work Card target path
Implementer Report target path
source revisions
```

A mismatch now throws:

```text
Formal Work Card draft no longer matches the current Work Card Intake handoff.
```

This preserves application-owned control over the draft/promotion path. It also addresses the Work Card's requirement that a draft outside the selected workspace/expected target cannot be silently accepted through the Formal Work Card promotion path.

### 4. Work Card repair routing is moved behind Work Card loop first-right-of-refusal

`currentWorkflowService.getCurrentWorkspaceModel()` now checks whether the current document is a Work Card-loop document. If it is, `workCardLoopAuthorityModel(...)` gets first right of refusal before `repairModelForRevisionRequestedEvidence(...)` can route a repair workspace.

The reviewed detection covers Work Card-loop workspace IDs, selected Work Card IDs, Work Card-loop artifact types, and Work Card path evidence. This satisfies the repair requirement without replacing the global project/phase workflow resolver.

Non-Work-Card project/phase revision routing remains available after that bounded Work Card-loop check.

### 5. Requested-candidate intake context now consumes resolver-owned authority

`resolveWorkCardIntakeContext(...)` remains in place for canonical context construction, which is correct. It still builds source revision data, candidate metadata, handoff path, and Formal Work Card target path.

For explicit candidate requests, the authoritative eligibility decision was moved into `resolveRequestedWorkCardIntakeContext(...)`, which calls:

```text
resolveWorkCardLoopAuthority(workspaceRoot, phaseId, options)
```

It rejects conflict, no-plan, not-applicable, all-complete, different-active, Complete, and Ineligible states using resolver-owned reason/evidence. It allows only resolver-owned Eligible candidates and same-active reusable candidates.

This satisfies the agreed anti-drift hardening requirement while preserving the context-construction function.

### 6. WC46-REPAIR03 live-failure fix remains preserved

The Implementer Report states focused and full test lanes prove the previous live failure remains fixed:

```text
stale WC01 Close evidence
+ WC02 Formal Work Card Approved
→ current workflow resolves WC02 Build Review
```

Inspected code remains consistent with that path: the Work Card loop authority still determines active Work Card state before stale prior-candidate close evidence can own the Work Card loop.

## Acceptance Criteria Mapping

AC1-AC4 pass. Formal Work Card prompt generation uses selected-workspace target binding, includes generic target instructions and exact identifiers, and no longer contains the forbidden project-specific wrong-target names.

AC5-AC6 pass. Formal Work Card promotion/readback compares active target identity and remains intact for valid selected workspace behavior.

AC7-AC8 pass. Work Card-loop repair routing now gives the Work Card loop resolver first right of refusal for Work Card-loop documents while preserving non-Work-Card project/phase revision routing.

AC9-AC11 pass. `resolveWorkCardIntakeContext(...)` remains a context builder but no longer owns requested-candidate eligibility authority. Requested candidates are checked through `resolveWorkCardLoopAuthority(...)`.

AC12-AC16 pass by inspected code plus Implementer-reported focused tests. Work Card Map Begin Planning, same-active continuation, stale-WC01-close/WC02-build routing, Request Repair routing, Close / Next, and all-complete Phase Validation routing are preserved.

AC17 passes by inspected code and Implementer report. No hidden selected-candidate state, route token, close acknowledgement, map sidecar, closeout document, validation mutation, Implementer Report mutation, or alternate persistence was added.

AC18 is reported as passed by the Implementer. I did not rerun commands in this review.

AC19-AC20 pass by inspected changed files and MCP status. No dependency addition or Git mutation was observed.

## Command Evidence

I did not run local build, typecheck, or test commands in this Architect review. The following Implementer-reported command results are treated as reported evidence, not independently reproduced evidence:

```text
npx tsc --noEmit — passed
npx tsc — passed
focused Work Card tests — passed, 41/41
npx vite build — passed in normal Windows lane
full node test lane — passed, 281/281
forbidden prompt-name scan — passed for production prompt source and compiled output
```

## Residual Risks and Operator Validation

Operator validation remains required because the only remaining meaningful risk is embedded ChatGPT runtime behavior in the actual app shell.

The Operator should validate:

```text
selected project workspace outside the application source
→ Work Card Map selects an Eligible Work Card
→ Formal Work Card Architect prompt is prepared
→ prompt uses generic selected-workspace target binding
→ prompt does not name application/developer repositories as wrong targets
→ embedded ChatGPT starts against the selected project workspace
→ Formal Work Card approval routes to the same Work Card's Build Review
→ Request Repair preserves parent Work Card identity
→ Close / Next returns to Work Card Map
→ all-complete routes to Phase Validation
```

## Nonblocking Cleanup Note

The superseded placeholder remains in the repository:

```text
planning/phases/phase-08/Work_Cards/WC46-REPAIR04_placeholder.md
```

It is not a valid Work Card and should be removed before final cleanup. This review does not mark that as an Implementer failure because it was introduced before the Implementer pass.

## Final Disposition

WC46-REPAIR04 is approved for Operator validation.

No further repair is required from this review unless Operator validation shows the embedded ChatGPT runtime still targets the wrong workspace or the selected-workspace prompt binding is insufficient in the running product.
