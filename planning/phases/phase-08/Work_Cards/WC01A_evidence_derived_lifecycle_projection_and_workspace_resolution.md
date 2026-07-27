<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "context-document",
  "artifactRevision": 1,
  "participationRole": "contextOnly",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC01A"
  },
  "sourceRevisions": [],
  "workflowData": {
    "workCardId": "WC01A",
    "phaseId": "phase-08",
    "title": "Evidence-Derived Lifecycle Projection and Workspace Resolution",
    "status": "approved_design_execution_deferred",
    "owner": "Implementer after Operator release",
    "risk": "high",
    "dependsOn": [
      "WC01"
    ],
    "executionAuthorized": false,
    "gitMutationAuthorized": false,
    "purpose": "Replace the flat first-non-approved resolver with evidence-derived nested lifecycle and stable workspace resolution.",
    "sourceDesignDocuments": [
      "planning/project/Design_Documents/NESTED_PROJECT_PHASE_WORK_CARD_LIFECYCLE_MODEL.md",
      "planning/project/Design_Documents/EVIDENCE_DERIVED_LIFECYCLE_PROJECTION_AND_WORKSPACE_RESOLUTION.md",
      "planning/project/Design_Documents/PHASE_08_WORKSPACE_INVENTORY_AND_MIGRATION.md",
      "planning/project/Design_Documents/GENERATED_ARCHITECT_HANDOFF_CONTRACT.md"
    ],
    "participationRoles": [
      "gatingReview",
      "compoundGatingReview",
      "nonReviewHandoff",
      "contextOnly",
      "historical"
    ],
    "requiredCapabilities": [
      "workspace ownership by stable ID",
      "evidence-derived lifecycle location",
      "selected phase and Work Card identity",
      "semantic close predicates",
      "parent-child returns",
      "terminal Project Close",
      "plain-language evidence explanation"
    ],
    "prohibitedScope": [
      "later workspace UI",
      "source invalidation",
      "persisted current action",
      "route tokens",
      "role gates",
      "execution runs",
      "approval queues",
      "hashes",
      "Git operations"
    ],
    "validation": [
      "npm run typecheck",
      "npm run build",
      "npm test"
    ],
    "implementerReport": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC01A_evidence_derived_lifecycle_projection_and_workspace_resolution.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "",
    "reviewedAt": null
  }
}
CHAMPCITY-METADATA -->

# Work Card — Phase 08 WC01A Evidence-Derived Lifecycle Projection and Workspace Resolution

Status: approved implementation design; execution deferred
Owner: Implementer after Operator release
Phase: phase-08
Risk: high
Depends on: WC01
Execution authorization: withheld
Git mutation: not authorized
Implementer Report: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC01A_evidence_derived_lifecycle_projection_and_workspace_resolution.md`

## Purpose

Replace the flat first-non-approved-document resolver with an evidence-derived lifecycle projection that understands the nested Project, Phase, and Work Card lifecycle, explicit document participation roles, stable workspace ownership, semantic completion predicates, and parent/child return behavior.

## Source Designs

- `planning/project/Design_Documents/NESTED_PROJECT_PHASE_WORK_CARD_LIFECYCLE_MODEL.md`
- `planning/project/Design_Documents/EVIDENCE_DERIVED_LIFECYCLE_PROJECTION_AND_WORKSPACE_RESOLUTION.md`
- `planning/project/Design_Documents/PHASE_08_WORKSPACE_INVENTORY_AND_MIGRATION.md`
- `planning/project/Design_Documents/GENERATED_ARCHITECT_HANDOFF_CONTRACT.md`

## Required Implementation

Implement:

- explicit participation roles: `gatingReview`, `compoundGatingReview`, `nonReviewHandoff`, `contextOnly`, `historical`;
- explicit artifact-type to workspace-ID ownership;
- current lifecycle level, stage, and stable workspace ID derived from repository evidence;
- selected phase and Work Card identity derived from approved documents;
- deterministic workspace ordering within a lifecycle location;
- semantic planning-bundle and closeout completion predicates;
- Work Card Close return to Phase Building;
- Phase Close return to Project Building;
- terminal Project Close;
- plain-language resolver explanation with evidence paths;
- direct Continue/Return targets that re-evaluate evidence before navigation.

Generated non-review handoffs must be visible but excluded from gating review selection.

## Migration Boundary

The current flat `firstNonApprovedResolver` may remain as an internal primitive only where useful, but it must not remain the product authority after WC01A. The new resolver must consume WC01 registry IDs rather than fixed workspace labels.

WC01A must support the complete stable inventory contract even though later cards add the corresponding production workspaces incrementally. Missing later workspaces must produce a clear not-yet-implemented state rather than route to an unrelated provisional workspace.

## Explicit Non-Goals

Do not implement later workspace UIs, source revision invalidation, hidden current-state persistence, route tokens, role gates, execution runs, approval queues, hashes, provider integration, or Git operations.

## Required Validation

```text
npm run typecheck
npm run build
npm test
```

Tests must cover non-review handoff exclusion, multiple workspaces at one location, compound close predicates, parent/child returns, selected identity, terminal close, malformed evidence, and plain-language explanations.

## Acceptance Criteria

1. Current lifecycle location is derived from documents rather than persisted state.
2. Stable workspace IDs, not labels, carry ownership.
3. Non-review handoffs cannot trap progression.
4. Approved `DoNotClose` remains current at Validation.
5. Approved `Close` completes the corresponding Close stage.
6. Work Card and Phase returns follow the nested lifecycle.
7. Selected phase and Work Card identities are evidence-derived.
8. Resolver output explains the decision and evidence paths.
9. No rejected governance architecture is restored.
10. Typecheck, build, and tests pass.
11. No Git mutation occurs.

## Implementer Report Requirements

Record repository verification, changed files, final participation and ownership contracts, resolver examples for every lifecycle level, semantic close tests, handoff exclusion tests, validation results, and confirmation that no persisted current-action authority was introduced.

The report must end with `Document.Status=Pending`.

## Manual Validation After Architect Review

The Operator should confirm that representative Project, Phase, Work Card, repair, Validation, Phase Close, and Project Close corpora resolve to the expected workspace with a readable explanation.
