<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 2,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC27"
  },
  "sourceRevisions": [
    {
      "path": "planning/project/Design_Documents/PROJECT_INTAKE_LIFECYCLE_AND_WORKSPACE_DEFINITION.md",
      "revision": 1
    },
    {
      "path": "planning/project/Design_Documents/ARCHITECT_INTERVIEW_WORKSPACE_DEFINITION.md",
      "revision": 1
    },
    {
      "path": "planning/project/Design_Documents/PROJECT_PLANNING_WORKSPACE_DEFINITION.md",
      "revision": 1
    },
    {
      "path": "planning/project/Design_Documents/PROJECT_PLANNING_OUTPUT_SUBMISSION_CONTRACT.md",
      "revision": 2
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC26_project_planning_architect_workspace_and_project_rail_status_completion.md",
      "revision": 3
    }
  ],
  "workflowData": {
    "title": "Project Planning Current-State Reconciliation and Legacy Evidence",
    "status": "approved_waiting_for_mcp_action",
    "dependsOn": [
      "WC26 completed",
      "ChampCity_GPT WC-V1-0202C available"
    ],
    "contractId": "project-planning-output-submission-v1",
    "executionMode": "application implementation and live integration after MCP action availability",
    "recommendedReasoning": "high",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC27_project_planning_current_state_reconciliation_and_legacy_evidence.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "WC27 is approved. The stable cross-repository submission contract already exists and unblocks WC-V1-0202C. WC27 application implementation begins after the MCP action is available.",
    "reviewedAt": "2026-07-29"
  }
}
CHAMPCITY-METADATA -->

# WC27 — Project Planning Current-State Reconciliation and Legacy Evidence

Status: Approved; waiting for MCP action availability  
Phase: phase-08  
Git mutation: prohibited  
Implementer Report: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC27_project_planning_current_state_reconciliation_and_legacy_evidence.md`

## Execution Sequence

```text
Approved cross-repository submission contract
→ ChampCity_GPT WC-V1-0202C implementation and deterministic validation
→ MCP runtime integration and availability
→ WC27 application implementation
→ live greenfield and existing-project integration validation
```

The controlling contract already exists at:

`planning/project/Design_Documents/PROJECT_PLANNING_OUTPUT_SUBMISSION_CONTRACT.md`

WC-V1-0202C does not wait for WC27 source implementation. WC27 does not begin application integration until the MCP action is available. Neither card may invent a different protocol.

## Objective

Make Project Planning start from the selected repository's verified current state rather than assuming every project is greenfield. Preserve legacy source and planning records as evidence without migrating, rewriting, deleting, or promoting them into workflow authority.

The standard outputs remain:

```text
Project Profile
Project Roadmap
```

No separate reconciliation lifecycle stage or mandatory reconciliation artifact is introduced.

## Required Product Flow

```text
Approved Intake + Approved Interview
→ bounded repository preflight
→ Greenfield | Reconciliation Required | Needs Attention
→ Architect reviews relevant repository evidence through ChampCity MCP
→ Project Profile records the verified baseline
→ Project Roadmap begins from that baseline
→ artifact_toolbox.save_project_planning_outputs writes both outputs atomically
→ WC26 workspace detects and presents the pair
→ Operator reviews and dispositions the synchronized bundle
```

Git state is not planning authority.

## Required Change 1 — Repository Preflight

Derive one of three states from the selected workspace filesystem and canonical evidence:

### `greenfield`

Use when Intake declares no existing source/planning and the bounded inventory finds no substantive implementation or prior planning beyond the current ChampCity-generated Intake, Prompt, Interview, and handoff family.

### `reconciliation-required`

Use when Intake declares existing source/planning or the bounded inventory finds substantive source code or prior planning evidence.

Repository review is mandatory before outputs are saved.

### `needs-attention`

Use when:

- Intake says greenfield but substantive source/planning exists;
- an exact required output target is occupied by unmanaged, malformed, or identity-conflicting content;
- current canonical evidence is stale, unreadable, conflicting, or ambiguous.

Explain the condition and block output creation. Do not silently correct Intake, move files, or overwrite evidence.

## Required Change 2 — Bounded Inventory

Classify only what is needed to direct Project Planning:

- substantive source/configuration outside dependency, cache, generated-output, package, and VCS internals;
- current canonical ChampCity planning artifacts;
- unmanaged or historical planning Markdown;
- malformed canonical planning documents;
- exact Project Profile and Roadmap target collisions.

Return repository-relative evidence only. Do not persist an inventory database or inspect Git to determine project state.

## Required Change 3 — Emit the Approved Submission Contract

Extend the Project Planning handoff to conform exactly to:

`PROJECT_PLANNING_OUTPUT_SUBMISSION_CONTRACT.md`

The handoff must provide:

```text
contractId
reconciliationMode
repositoryReviewRequired
repositoryReviewContext
current canonical source paths and revisions
legacyPlanningPaths
sourceEvidencePaths
Project Profile target
Project Roadmap target
requiredProfileSections
requiredRoadmapSections
```

Do not change field names, mode names, required headings, or authority rules without Operator approval.

The copied instruction must tell the Architect to:

1. inspect required repository evidence through ChampCity MCP;
2. distinguish verified implementation from declared intent;
3. reconcile materially relevant legacy planning;
4. produce both complete document bodies;
5. call `artifact_toolbox.save_project_planning_outputs`;
6. remain incomplete until the action returns `saved` or `already_saved`.

No manual document-body import fallback is permitted.

## Required Change 4 — Project Profile Baseline

For an existing repository, the Profile must cover:

- verified purpose and actual implementation state;
- technologies, major components, and entry points;
- implemented, incomplete, defective, or abandoned capabilities;
- existing planning evidence;
- adopted, superseded, contradicted, or unresolved prior decisions;
- risks, ambiguity, and known limitations;
- repository-relative evidence references where practical.

For a greenfield repository, the Profile must explicitly state that no prior implementation baseline exists.

The Profile is the durable reconciled baseline.

## Required Change 5 — Baseline-Aware Roadmap

The Roadmap must begin from the Profile baseline and distinguish, as applicable:

```text
Already implemented
Partially implemented
Planned but not implemented
Superseded
Deferred
New work
```

Do not restate implemented capabilities as greenfield work or silently carry abandoned plans forward.

## Required Change 6 — Legacy Planning Evidence

Legacy or unmanaged planning documents are evidence, not authority.

- preserve them unchanged;
- do not migrate, canonicalize, rename, archive, delete, or disposition them;
- do not let filename or location advance lifecycle state;
- expose relevant paths to the Architect;
- reconcile material records inside the Project Profile.

Permitted Profile classifications:

```text
Adopted
Partially adopted
Superseded
Contradicted by current implementation
Historical context only
Unresolved
```

These classifications are findings in the new Profile, not dispositions written to legacy files.

## Required Change 7 — Exact Target Collision

When unmanaged, malformed, or identity-conflicting content occupies either exact required target:

- block creation;
- preserve the file unchanged;
- identify the exact repository-relative collision;
- require Operator resolution before canonical output creation.

No automatic overwrite, rename, migration, archival, or alternate target is authorized.

## Required Change 8 — Toolbox Integration

Use:

```text
artifact_toolbox.save_project_planning_outputs
```

The caller supplies only complete Profile and Roadmap Markdown bodies. All target, identity, source-revision, reconciliation, metadata, and disposition authority comes from the Approved handoff contract.

The application must detect both externally saved outputs through the WC26 refresh path. Exact MCP failures must remain visible and incomplete. Do not restore manual output-import textareas.

## Required Change 9 — Freshness

A substantive revision to current Intake, Interview Prompt, or Architect Interview invalidates the prior Project Planning handoff and outputs through source-revision freshness.

A changed general repository inventory does not automatically create hidden invalidation. A new planning revision is initiated when the Operator or Architect determines the baseline materially changed.

## Authorized Surface

```text
src/main/projectPlanning/*
src/main/currentWorkflow/currentWorkflowService.ts                 [only if required]
src/main/main.ts
src/preload/index.ts
src/shared/workspaceContracts.ts
src/renderer/app/App.tsx
src/renderer/styles.css                                             [only if required]
focused Project Planning and preflight tests
```

A bounded filesystem-classification helper is authorized. No Git dependency or hidden persistence is allowed.

## Non-Scope

Do not:

- modify the approved cross-repository contract;
- create a reconciliation workspace or mandatory reconciliation artifact;
- perform broad semantic source analysis;
- migrate or rewrite legacy planning;
- use Git as authority;
- create alternate output targets;
- add provider APIs or DOM automation;
- add manual import fallbacks;
- implement later lifecycle workspaces;
- add dependencies;
- perform Git operations.

## Required Evidence

Record each item as `Proven`, `OperatorValidationPending`, or `NotProven`.

1. Greenfield fixture resolves `greenfield` and requires an explicit no-baseline Profile.
2. Existing-source fixture resolves `reconciliation-required` without requiring Git.
3. Intake/source mismatch resolves `needs-attention` and blocks output creation.
4. Legacy planning files remain byte-for-byte unchanged.
5. Relevant legacy and source-evidence paths appear in the handoff.
6. The handoff exactly matches `project-planning-output-submission-v1`.
7. Profile and Roadmap requirements match the contract headings.
8. An unmanaged exact-target collision blocks without modifying the file.
9. Embedded ChatGPT calls `artifact_toolbox.save_project_planning_outputs` with both bodies.
10. The MCP action creates both canonical Pending outputs atomically with no JSON siblings.
11. The open workspace detects both outputs and preserves WC26 bundle review.
12. Upstream substantive revision makes the prior handoff and outputs stale.
13. Project Intake and Architect Interview do not regress.
14. Typecheck, build, and tests pass in the approved lane.

Items 9–11 require the implemented and available MCP action. Any `NotProven` item remains in WC27; do not create a repair merely to move ordinary corrections.

## Completion

Create the Implementer Report after deterministic evidence passes and live items 9–11 have been validated. No Git operation is authorized.
