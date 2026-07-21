<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-06/diagnostic_report/WC02-full-workflow-resolver-foundation-top-to-bottom-review",
  "artifactType": "diagnostic_report",
  "createdAt": "2026-07-18T02:52:00.000Z",
  "jsonPath": "planning/phases/phase-06/Diagnostic_Reports/DIAGNOSTIC_REPORT_WC02_full_workflow_resolver_foundation_top_to_bottom_review.json",
  "markdownPath": "planning/phases/phase-06/Diagnostic_Reports/DIAGNOSTIC_REPORT_WC02_full_workflow_resolver_foundation_top_to_bottom_review.md",
  "parentArtifactId": "champcity-ai/phase-06/work_card/WC02",
  "payload": {
    "kind": "diagnostic_report",
    "title": "Diagnostic Report: Phase 06 WC02 Resolver Foundation Review"
  },
  "payloadHash": "sha256:f360db6fa9c89b92520688b151f1c20d4a67724c1b5bf747843be97ba4ff774c",
  "phaseId": "phase-06",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [
      "champcity-ai/phase-06/work_card/WC02-REPAIR03"
    ],
    "sources": [
      "champcity-ai/phase-06/design_document/WC01-kernel-contract-artifact-protocol-source-authority-replacement-inventory",
      "champcity-ai/phase-06/operator_validation/WC02",
      "champcity-ai/phase-06/work_card/WC02",
      "champcity-ai/phase-06/work_card_plan/Work_Card_Plan"
    ],
    "supersedes": []
  },
  "revision": 1,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-18T02:52:00.000Z"
}
-->

# Diagnostic Report: Phase 06 WC02 Resolver Foundation Review

Status: complete
Phase: phase-06
Parent Work Card: WC02
Decision: comprehensive rebuild required

## Confirmed Failure

The live app routes to `work_card_authoring_required` for WC02-REPAIR01 and opens Ad Hoc Work Card Capture even though WC02-REPAIR01 and WC02-REPAIR02 already exist.

The direct cause is in the production resolver: after a passing validation, it returns Work Card authoring from the validation's expected output without first checking whether that exact Work Card already exists and traversing its current state.

## System Finding

Workflow authority is duplicated across:

- the relationship resolver;
- process contract and transition engine;
- candidate evidence precedence;
- IPC transition policy;
- current-action route table;
- workflow projection and visibility;
- renderer action and screen maps.

These modules independently decide action, role, screen, expected output, validation result, repair state, or candidate completion. There is no single enforceable workflow authority.

## Repair and Validation Defect

The current model assumes one child repair and a special final repair. It cannot represent the actual sequence:

- REPAIR01 passed;
- later observations authorized REPAIR02;
- REPAIR02 passed;
- parent WC02 remained unresolved;
- a later resolver defect now requires REPAIR03.

Validation outcome, additional observations, Architect disposition, and parent-candidate resolution must be separate fields and decisions. Every Operator Validation must route to Architect disposition.

## Test Defect

The automated suite is green because it mainly uses synthetic fixtures and compares modules derived from the same incomplete contract.

Missing coverage includes:

- a passed repair with new blocking observations;
- an already-existing follow-up repair;
- multiple explicit sequential repairs under one parent;
- the real Phase 04–06 repository evidence chain;
- the routed Electron screen for the current failure.

## Target Foundation

Implement four one-way layers:

1. verified artifact graph for structural verification only;
2. normalized workflow domain for lifecycle, candidates, validations, observations, dispositions, and repairs;
3. one pure kernel that returns one current action or one blocker;
4. thin IPC, writer, projection, and renderer adapters that cannot reinterpret the kernel.

The kernel must own each action's role, screen, output type, sources, target, and transition.

No authority may depend on prose, aliases, first match, timestamp, suffix, directory order, synthetic output IDs, or renderer defaults.

## Required Behavior

- If an exact expected artifact exists, traverse it instead of authoring it.
- Repairs use explicit parent, sequence, trigger, authorizing disposition, and prior-repair relationships.
- Prior repair passes remain valid.
- Multiple linked sequential repairs are valid; competing unlinked repairs block.
- Planned Work Card authoring uses the planned builder.
- Repair authoring uses the repair builder.
- Ad Hoc Work Card Capture is never a routed kernel action.
- Registry and Workflow State remain derived diagnostics.

## Plan Decision

The original WC03 through WC06 scopes are parts of this same foundation. They are absorbed into WC02-REPAIR03.

WC02-REPAIR03 will implement the kernel, replay tests, Registry boundary, UI adapter, and integrated validation in one pass. There will be no intermediate Architect or Operator acceptance between internal sections.

Parent WC02 remains unresolved until WC02-REPAIR03 passes final review, visible Operator validation, and Architect disposition.

## Document Disposition
Document.Status=Pending
