<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC27-REPAIR01",
    "repairId": "WC27-REPAIR01"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC27_project_planning_current_state_reconciliation_and_legacy_evidence.md",
      "revision": 2
    },
    {
      "path": "planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC27_project_planning_current_state_reconciliation_and_legacy_evidence.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Contract Handoff Upgrade and Preflight Authority Stabilization",
    "status": "approved_for_implementation",
    "parentWorkCardId": "WC27",
    "executionMode": "one bounded repair implementation",
    "recommendedReasoning": "high",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC27-REPAIR01_contract_handoff_upgrade_and_preflight_authority_stabilization.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Correct the two live-path defects identified during Architect review. Preserve accepted WC27 behavior and keep live validation inside this repair until complete.",
    "reviewedAt": "2026-07-30"
  }
}
CHAMPCITY-METADATA -->

# WC27-REPAIR01 — Contract Handoff Upgrade and Preflight Authority Stabilization

Status: Approved for Implementer execution  
Parent: WC27  
Repository: `%USERPROFILE%\Projects\ChampCity_AI`  
Expected remote: `ChampCityChris/ChampCity_AI`  
Expected branch: `feature/phase-04-wc01-repair01-evidence-derived-workflow`  
Git mutation: prohibited  
Implementer Report: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC27-REPAIR01_contract_handoff_upgrade_and_preflight_authority_stabilization.md`

## Objective

Correct two defects that block the actual Revisionary Project Planning flow:

1. a pre-WC27 Approved handoff is treated as current even though it lacks the submission contract required by the MCP action;
2. general repository inventory is recomputed during ordinary polling and can silently change workflow authority after handoff approval.

Do not redesign Project Planning or reopen accepted WC26/WC27 behavior.

## Defect 1 — Pre-WC27 Handoff Upgrade

### Current live evidence

Revisionary contains:

```text
planning/project/Project_Planning_Documents/PROJECT_PLANNING_DOCUMENTS_revisionary.md
artifactRevision=1
artifactType=generated-handoff
participationRole=nonReviewHandoff
Document.Status=Approved
workflowData.handoffKind=project-planning
```

It lacks the required WC27 fields:

```text
contractId=project-planning-output-submission-v1
reconciliationMode
repositoryReviewRequired
repositoryReviewContext
legacyPlanningPaths
sourceEvidencePaths
requiredProfileSections
requiredRoadmapSections
```

The application currently reports this as a valid current handoff. The MCP action rejects it with zero matching contract handoffs.

### Required behavior

A Project Planning handoff is current only when all of these are valid:

- exact target path;
- canonical readable Markdown;
- `artifactType=generated-handoff`;
- `participationRole=nonReviewHandoff`;
- `Document.Status=Approved`;
- `workflowData.handoffKind=project-planning`;
- `workflowData.contractId=project-planning-output-submission-v1`;
- exact required workflow-data keys and values;
- exact required Profile and Roadmap section arrays;
- reconciliation mode/repository-review consistency;
- exact current Intake, Prompt, and Interview source revisions;
- freshness.

A readable Approved pre-contract handoff at the exact target is previous handoff evidence. It is not current authority and is not an unsafe collision.

For that state, the workspace must report:

```text
state=ready-for-handoff
railStatus=Ready
canPrepareHandoff=true
canCopyHandoff=false
```

Prepare must:

- write the same exact handoff target;
- increment artifact revision from 1 to 2;
- preserve the exact current source revisions;
- emit the full approved WC27 contract;
- leave no JSON sibling;
- make the new handoff copyable and acceptable to `artifact_toolbox.save_project_planning_outputs`.

Repeated Prepare with unchanged evidence must leave bytes and revision unchanged.

Do not overwrite malformed, unmanaged, wrong-type, wrong-role, identity-conflicting, unsafe, or non-Approved content. Those states remain `Needs Attention`.

## Defect 2 — Preflight Authority Must Stabilize After Handoff

### Current failure

`getProjectPlanningWorkspaceModel()` recomputes the filesystem preflight on every call. The Project Planning renderer calls it every three seconds.

This makes general repository contents hidden runtime authority after an Approved handoff exists and can make the UI disagree with the contract used by the MCP action.

### Required authority rule

Before a current contract handoff exists:

```text
current Intake + Prompt + Interview
→ explicit bounded filesystem preflight
→ proposed reconciliation projection
→ Prepare handoff
```

After a current contract handoff exists:

```text
Approved handoff workflowData
→ reconciliationMode
→ repositoryReviewRequired
→ repositoryReviewContext
→ legacyPlanningPaths
→ sourceEvidencePaths
→ required section arrays
```

Ordinary model refresh, polling, output detection, and bundle review must use the current handoff projection. They must not rescan the repository or silently change reconciliation mode because unrelated files were added or removed.

A substantive Intake, Prompt, or Interview revision invalidates the old handoff through source revisions. The next explicit handoff preparation performs a new preflight and writes one new handoff revision.

Do not introduce a persisted inventory database, hidden repository fingerprint, watcher, or Git-based authority.

## Bounded Preflight

The explicit preflight must be operationally bounded.

Use named constants with these maximums:

```text
MAX_PREFLIGHT_ENTRIES=10000
MAX_PREFLIGHT_EVIDENCE_PATHS=250
```

Requirements:

- stop traversal when either limit is exceeded;
- return `needs-attention` with a visible bounded-limit reason;
- do not write or revise the handoff;
- return only repository-relative paths;
- keep ignored dependency/cache/generated/VCS directories excluded;
- do not run the traversal during ordinary polling after a current contract handoff exists.

## Report Correction

Do not use `artifact_toolbox.current_action_context` as a prerequisite. It is unrelated to `save_project_planning_outputs`.

The live validation prerequisite is:

```text
one current Approved WC27 contract handoff in the selected workspace
```

## Authorized Production Surface

```text
src/main/projectPlanning/projectPlanningContext.ts
src/main/projectPlanning/projectPlanningPreflight.ts
src/main/projectPlanning/projectPlanningService.ts
focused Project Planning tests
```

`src/shared/workspaceContracts.ts` may change only if a narrowly required state field is missing.

No renderer redesign, MCP-server change, Project Intake change, Architect Interview change, migration change, dependency addition, or later-lifecycle implementation is authorized.

## Required Proof

Record each item as `DeterministicallyProven`, `OperatorValidationPending`, or `NotProven`.

1. A pre-WC27 readable Approved handoff is classified as previous evidence, not current authority.
2. That state reports Ready, allows Prepare, and disallows Copy.
3. Prepare upgrades the same target from revision 1 to revision 2 with the complete approved contract.
4. Repeated Prepare after upgrade is byte-idempotent.
5. Malformed, unmanaged, wrong-type, wrong-role, unsafe, or non-Approved handoff content is preserved and produces Needs Attention.
6. A valid current contract handoff supplies the reconciliation projection without rerunning filesystem preflight.
7. Adding or removing ordinary source/planning files after handoff creation does not silently change the model or invalidate the handoff.
8. A substantive Intake, Prompt, or Interview revision invalidates the old handoff and causes the next Prepare cycle to run a new preflight.
9. Preflight stops at 10,000 visited entries or 250 returned evidence paths and reports Needs Attention without writing.
10. Greenfield, existing-source, mismatch, legacy preservation, and target-collision behavior from WC27 remain passing.
11. The Revisionary handoff upgrades successfully in the running application.
12. Embedded ChatGPT calls `artifact_toolbox.save_project_planning_outputs` and receives `saved` or `already_saved`.
13. Both canonical Pending outputs appear in the open Project Planning review bundle with no JSON siblings.
14. Typecheck, build, and tests pass in the approved Windows lane.

Items 11–13 are live Operator-observed evidence. Do not create the final Implementer Report until they pass.

## Non-Scope

Do not:

- edit WC27 requirements;
- modify ChampCity_GPT or the shared submission contract;
- add a manual output-import fallback;
- add automatic repository-change invalidation;
- add Git authority;
- create alternate handoff or output targets;
- migrate or rewrite legacy planning evidence;
- stage, commit, push, merge, reset, clean, stash, tag, package, publish, or promote.

## Completion

Keep WC27-REPAIR01 active until all fourteen proof items are complete. The Implementer Report must include the live Revisionary `saved` or `already_saved` receipt and the observed open-workspace bundle detection result.
