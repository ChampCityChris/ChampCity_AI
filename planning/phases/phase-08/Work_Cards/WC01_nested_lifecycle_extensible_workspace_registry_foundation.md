<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "context-document",
  "artifactRevision": 1,
  "participationRole": "contextOnly",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC01"
  },
  "sourceRevisions": [],
  "workflowData": {
    "workCardId": "WC01",
    "phaseId": "phase-08",
    "title": "Nested Lifecycle and Extensible Workspace Registry Foundation",
    "status": "approved_design_execution_deferred",
    "owner": "Implementer after Operator release",
    "risk": "medium",
    "executionAuthorized": false,
    "executionReleaseCondition": "Operator releases the reviewed Phase 08 Work Card sequence for sequential implementation.",
    "gitMutationAuthorized": false,
    "purpose": "Establish the confirmed nested lifecycle vocabulary and an immutable extensible workspace registry without implementing lifecycle behavior.",
    "sourceDesignDocument": "planning/project/Design_Documents/NESTED_PROJECT_PHASE_WORK_CARD_LIFECYCLE_MODEL.md",
    "lifecycle": {
      "levels": [
        "project",
        "phase",
        "workCard"
      ],
      "stages": [
        "intake",
        "planning",
        "building",
        "validation",
        "close"
      ],
      "locationFields": [
        "level",
        "stage"
      ],
      "staticRelationships": [
        "Project Building contains Phase lifecycles",
        "Phase Building contains Work Card lifecycles",
        "Work Card has no child lifecycle",
        "Work Card Close returns to Phase Building",
        "Phase Close returns to Project Building",
        "Project Close is terminal"
      ]
    },
    "workspaceRegistry": {
      "definitionFields": [
        "id",
        "label",
        "location",
        "order"
      ],
      "requirements": [
        "Open-ended stable workspace IDs",
        "Multiple ordered workspaces at one lifecycle location",
        "Deterministic ordering",
        "Duplicate workspace ID rejection",
        "Lookup by ID",
        "Lookup by lifecycle location",
        "Immutable static code configuration"
      ]
    },
    "currentWorkspaceMappings": [
      {
        "label": "Project Planning",
        "level": "project",
        "stage": "planning"
      },
      {
        "label": "Phase Planning",
        "level": "phase",
        "stage": "planning"
      },
      {
        "label": "Work Card",
        "level": "workCard",
        "stage": "planning"
      },
      {
        "label": "Operator Validation",
        "level": "workCard",
        "stage": "validation"
      },
      {
        "label": "Phase Closeout",
        "level": "phase",
        "stage": "close"
      }
    ],
    "expectedProductionFiles": [
      "src/shared/lifecycle/nestedLifecycle.ts",
      "src/shared/workspaces/workspaceRegistry.ts",
      "src/shared/workspaceContracts.ts",
      "src/shared/workspaces/documentWorkspace.ts",
      "src/shared/documents/documentOrder.ts",
      "src/renderer/app/App.tsx"
    ],
    "prohibitedScope": [
      "Lifecycle progression or transition engine",
      "Current lifecycle state or persistence",
      "New visible workspaces",
      "Nested navigation or drill-down",
      "Workspace actions or permissions",
      "Approval authority or artifacts",
      "Route tables, role gates, queues, execution runs, or current-action state",
      "Dependency changes",
      "Git operations"
    ],
    "validation": [
      "npm run typecheck",
      "npm run build",
      "npm test"
    ],
    "implementerReport": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC01_nested_lifecycle_extensible_workspace_registry_foundation.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "",
    "reviewedAt": null
  }
}
CHAMPCITY-METADATA -->

# Work Card — Phase 08 WC01 Nested Lifecycle and Extensible Workspace Registry Foundation

Status: approved implementation design; execution deferred
Owner: Implementer after Operator release
Phase: phase-08
Risk: medium
Execution authorization: withheld until the Phase 08 Work Card sequence is complete
Git mutation: not authorized
Implementer Report: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC01_nested_lifecycle_extensible_workspace_registry_foundation.md`

## Purpose

Establish the Operator-confirmed nested lifecycle and extensible workspace relationship as a shared code foundation.

This Work Card defines vocabulary and structure only. It does not implement lifecycle progression, workflow routing, stage completion, approval behavior, or additional user-facing workspaces.

## Execution Boundary

This Work Card is approved as the first planned Phase 08 implementation unit, but it is not currently authorized for execution.

The Operator and Architect are completing the Phase 08 design and ordered Work Card set before any card is sent to the Implementer.

Do not execute this Work Card until the Operator explicitly releases the Phase 08 Work Cards for sequential implementation.

## Source Design Decision

Read and follow:

`planning/project/Design_Documents/NESTED_PROJECT_PHASE_WORK_CARD_LIFECYCLE_MODEL.md`

The fixed lifecycle hierarchy is:

```text
Project
└── Phase
    └── Work Card
```

Each level uses:

```text
Intake → Planning → Building → Validation → Close
```

Workspace structure is:

```text
Lifecycle location
└── zero or more ordered workspace definitions
```

A lifecycle stage is not limited to one workspace.

## Required Shared Lifecycle Contract

Create a small shared lifecycle module defining only:

```text
LifecycleLevel:
- project
- phase
- workCard

LifecycleStage:
- intake
- planning
- building
- validation
- close

LifecycleLocation:
- level
- stage
```

Also encode the static containment relationships:

```text
Project Building contains Phase lifecycles.
Phase Building contains Work Card lifecycles.
Work Card has no child lifecycle.
Work Card Close returns to Phase Building.
Phase Close returns to Project Building.
Project Close is terminal.
```

These are descriptive structural relationships. They must not execute transitions or store current state.

## Required Workspace Registry Contract

Create an immutable registry-backed workspace model with at least:

```text
WorkspaceDefinition
- id: open-ended stable string
- label: user-facing string
- location: LifecycleLocation
- order: number
```

The registry must:

- allow multiple workspaces at the same lifecycle location;
- order workspaces deterministically;
- reject duplicate workspace IDs;
- expose lookup by ID;
- expose ordered workspaces for a lifecycle location;
- avoid a fixed exhaustive union of workspace names;
- remain static code configuration in WC01;
- contain no mutable runtime registration, plugin loading, database, or persistence.

## Current Five Workspace Migration

Migrate the existing clean-room workspace definitions into the registry while preserving the current visible labels and order:

```text
Project Planning
Phase Planning
Work Card
Operator Validation
Phase Closeout
```

Use these provisional lifecycle locations:

```text
Project Planning    → Project / Planning
Phase Planning      → Phase / Planning
Work Card           → Work Card / Planning
Operator Validation → Work Card / Validation
Phase Closeout      → Phase / Close
```

These mappings describe the current clean-room surfaces only. They do not claim to be the final workspace inventory.

After migration:

- the renderer must obtain navigation definitions from the registry;
- document workspace classification must use workspace IDs rather than a fixed label union;
- workspace counts and groups must remain correct;
- resolver ownership must still identify the same visible workspace;
- all current labels, order, document grouping, selection, and disposition behavior must remain unchanged.

## Extensibility Proof

Tests must prove that a registry can represent, without changing lifecycle types:

```text
Work Card / Intake
├── Work Card Intake
├── Work Card Intake Review
└── Work Card Intake Approval
```

These test definitions must not be added to the production UI in WC01.

## Authorized Production Scope

Create or modify only the files needed for this foundation, expected to include:

```text
src/shared/lifecycle/nestedLifecycle.ts
src/shared/workspaces/workspaceRegistry.ts
src/shared/workspaceContracts.ts
src/shared/workspaces/documentWorkspace.ts
src/shared/documents/documentOrder.ts
src/renderer/app/App.tsx
```

A narrower implementation is acceptable. Any additional production file requires a direct type consequence and must be identified in the Implementer Report.

## Authorized Test Scope

Modify existing capability-oriented tests or add one shared lifecycle/registry test file. Expected coverage may include:

```text
test/lifecycle/nested-lifecycle.test.cjs
test/workspaces/workspace-document-review.test.cjs
test/resolver/first-non-approved-resolver.test.cjs
test/app-shell/app-shell.test.cjs
```

Do not create a broad Phase-08-specific test island.

## Explicit Non-Goals

Do not implement:

- current lifecycle location;
- lifecycle instance records;
- active project, phase, or Work Card selection;
- transition logic or transition validation;
- stage entry or completion criteria;
- document-to-lifecycle classification beyond preserving existing workspace behavior;
- new visible workspaces;
- nested UI navigation or drill-down;
- workspace-specific actions;
- approval workspaces;
- approval authority or approval artifacts;
- route tables, role gates, queues, execution runs, or current-action state;
- persistence for the workspace registry;
- dependency changes;
- Git operations.

## Required Validation

When execution is later authorized, run the normal Windows validation lane:

```text
npm run typecheck
npm run build
npm test
```

No Playwright or visual redesign is required.

Perform a non-acceptance launch smoke only if needed to confirm the existing five workspace labels and order remain visible. Do not change any real document disposition.

## Acceptance Criteria

WC01 is acceptable only when:

1. the three lifecycle levels are represented exactly;
2. the five lifecycle stages are represented exactly;
3. the parent/child and return relationships are encoded as static structure only;
4. a lifecycle location is represented as level plus stage;
5. workspace IDs are open-ended rather than a fixed exhaustive union;
6. the registry supports multiple ordered workspaces at one lifecycle location;
7. duplicate workspace IDs are rejected;
8. the current five workspace definitions come from the registry;
9. the current five visible labels and order remain unchanged;
10. current document grouping, counts, selection, resolver ownership, and disposition behavior remain unchanged;
11. tests prove three distinct Work Card Intake workspaces can share `Work Card / Intake` without changing lifecycle types;
12. no lifecycle progression, routing, state store, approval authority, or new visible workspace is introduced;
13. typecheck, build, and tests pass;
14. the Implementer Report accurately records the changed files and evidence;
15. no Git mutation occurs.

## Implementer Report Requirements

The report must include:

- repository, remote, branch, and dirty-state verification;
- exact files created and modified;
- final lifecycle and registry type definitions;
- current five registry entries and mappings;
- extensibility test evidence;
- confirmation of unchanged visible workspace behavior;
- validation commands and results;
- confirmation that no lifecycle behavior, state, routing, approval authority, dependency, or Git operation was added;
- remaining Operator manual validation.

The report must end with:

```markdown
## Manual Validation After Architect Review

The Operator should confirm only that the same five clean-room workspace labels remain visible in the same order and existing document review behavior is unchanged.
