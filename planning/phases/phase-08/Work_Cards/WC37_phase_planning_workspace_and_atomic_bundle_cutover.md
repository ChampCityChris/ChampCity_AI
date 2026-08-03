<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 2,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC37"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC35_phase_interview_workspace_and_draft_ingestion_cutover.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC35-REPAIR01_phase_interview_action_pane_layout.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Phase Planning Workspace and Atomic Bundle Cutover",
    "status": "approved_for_implementation",
    "executionMode": "one bounded production cutover",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC37_phase_planning_workspace_and_atomic_bundle_cutover.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Replace only the active Phase Planning manual-import/direct-save path with a dedicated embedded Architect workspace and one WC30 atomic Phase Planning bundle while preserving the existing candidate schema and downstream selection authority.",
    "reviewedAt": "2026-08-01"
  }
}
CHAMPCITY-METADATA -->

# WC37 — Phase Planning Workspace and Atomic Bundle Cutover

Status: Approved for Implementer execution  
Git mutation: prohibited

## Verified Production State

Phase Planning currently uses the generic lifecycle surface and the complete active direct-save chain:

```text
renderer Phase Planning and Work Card Plan textareas
→ ChampCityApi.savePhasePlanningOutputs
→ preload phasePlanning:saveOutputs
→ main IPC handler
→ savePhasePlanningOutputs()
→ direct canonical bundle write
```

`generatePhasePlanningHandoff()` also injects a fabricated default `WC01 — Initial Work Card` candidate. No application evidence authorizes that candidate.

The existing service already owns the authoritative rules that must be preserved:

- selected phase comes from the Approved Phase Map first-incomplete projection;
- an Approved, fresh Phase Interview is required;
- exact final targets are `Phase_Planning.md` and `Work_Card_Plan.md` for the selected phase;
- the Work Card Plan body contains exactly one `champcity-work-card-plan` fenced JSON block;
- the fenced JSON root is the candidate array consumed by `validateCandidates()`;
- candidate fields, resolution statuses, resolution evidence, uniqueness, and prohibition on persisted completion are application-owned;
- downstream Work Card Intake reads `metadata.workflowData.candidates`, validates it again, and selects the next eligible candidate;
- Phase Planning is complete only when both outputs are readable, fresh, valid, and Approved.

No dedicated Phase Planning workspace model, polling path, embedded review surface, shared review notes, or viewed-both approval gate currently exists. WC37 must create these as part of the cutover; it must not describe them as preserved behavior.

## Objective

```text
Approved Phase Interview makes Phase Planning ready
→ application presents selected-phase planning evidence
→ Operator prepares and copies one Phase Planning handoff
→ embedded Architect creates Phase Planning and Work Card Plan bodies
→ ChatGPT writes two body-only temporary drafts
→ application validates and atomically promotes both outputs
→ Operator reviews both current documents and applies one shared bundle disposition
→ Approved valid bundle makes Work Card Intake ready
```

## Required Changes

### 1. Dedicated Phase Planning workspace

Replace the generic Phase Planning surface with a dedicated dual-pane embedded Architect workspace.

Display:

- selected phase ID, title, order, purpose, dependencies, and source references;
- Approved Project Profile, Project Roadmap, Phase Map, and current Phase Interview paths;
- exact Phase Planning and Work Card Plan targets;
- Prepare and Copy Phase Planning Handoff controls;
- embedded ChatGPT;
- Phase Planning and Work Card Plan selectors;
- automatic polling, output selection, visible failure state, and one synchronized bundle-review region.

Remove the manual textareas and manual Save Architect Output control for Phase Planning only.

### 2. Retire the complete active direct-save route

Remove active production use of:

```text
savePhasePlanningOutputs()
phasePlanning:saveOutputs
ChampCityApi.savePhasePlanningOutputs
PhasePlanningOutputsInput
PhasePlanningOutputsSaveResult
renderer lifecycleArchitectOutputs.phasePlanningMarkdown
renderer lifecycleArchitectOutputs.workCardPlanMarkdown
```

Delete obsolete route contracts when no remaining production consumer requires them. Do not leave a fallback, alias, hidden import route, or duplicate final writer.

The dormant application-owned `reviseWorkCardPlanCandidates()` utility is outside this cutover unless compilation requires a narrow adjustment. It must not be used as the Architect-output path or as a substitute for atomic bundle revision.

### 3. Remove fabricated candidate authority

The production handoff generator must not accept or default a substantive candidate list.

Remove the default candidate and `defaultCandidate()` production behavior. Before the Architect creates the Work Card Plan, the application may expose only:

- the existing candidate schema;
- allowed resolution statuses;
- validation rules;
- unmistakably non-substantive placeholders in instructional examples.

No real candidate ID, title, purpose, dependency, or status may be invented by the application.

### 4. One WC30 atomic-bundle definition

Add exactly one production output definition:

```text
outputKind: phase-planning-bundle
owningWorkspaceId: phase-planning-bundle
bundleMode: atomic-bundle
slots:
- phase-planning
  draftPathComponent: phase-planning.md
- work-card-plan
  draftPathComponent: work-card-plan.md
```

Use the current Approved Phase Planning handoff as authority for phase identity, exact final targets, and source revisions. Use the shared deterministic identity builder and process-owned explicit request ordinal.

One draft alone must remain a partial draft set and must never create or modify either final output.

### 5. Exact handoff responsibilities

The generated instruction must require the Architect to read:

- Approved Project Profile;
- Approved Project Roadmap;
- Approved Phase Map and selected phase entry;
- Approved current Phase Interview;
- current Approved Phase Planning handoff.

The Phase Planning body must contain:

```text
# Phase Planning
## Phase Objective
## Scope
## Non-Scope
## Inherited Constraints
## Architecture and Implementation Direction
## Major Deliverables
## Dependencies
## Risks and Mitigations
## Validation Strategy
## Acceptance Criteria
## Sequencing Direction
## Deferred Items
## Unresolved Questions
```

The Work Card Plan body must contain exactly one `champcity-work-card-plan` fenced JSON block whose parsed root is an array.

Each array entry is governed only by the existing `WorkCardCandidate` contract:

```text
candidateId
order
title
purpose
dependsOn
resolutionStatus
resolutionReason
evidencePaths
carriedForwardToPhaseId only when required
```

Do not persist completion state. Do not introduce a wrapper object, second schema, or alternate candidate representation.

The handoff must contain exactly two executable generic calls, one per application-issued draft path:

```json
{
  "action": "create_markdown_artifact",
  "workspaceId": "<resolved workspace ID>",
  "params": {
    "relativePath": "<exact temporary draft path>",
    "content": "<complete body-only Markdown>",
    "overwrite": false
  }
}
```

No caller metadata, final-path write, route selector, domain save action, manual import, or file-copy fallback is permitted.

### 6. Shared validation and canonical projection

Before promotion:

- validate the Phase Planning title and required headings;
- require exactly one Work Card Plan domain block;
- parse the domain block as JSON;
- require an array root;
- validate that array through the existing `validateCandidates()` function;
- use that exact validated array when building `metadata.workflowData.candidates` for the canonical Work Card Plan.

The canonical Work Card Plan metadata remains downstream authority. Work Card Intake must continue reading and validating `workflowData.candidates`; it must not reparse the Markdown body as primary authority.

### 7. Atomic creation and guarded revision

Initial creation is allowed only when neither exact final target exists.

Promote both atomically as revision 1 with:

- exact selected-phase identity;
- current handoff-derived source revisions;
- `participationRole=compoundGatingReview`;
- Pending disposition;
- empty notes and null `reviewedAt`.

Synchronized substantive revision is allowed only when both existing outputs are:

- readable canonical Markdown;
- at the exact expected paths;
- exact expected artifact types;
- exact selected-phase identity;
- fresh and source-compatible;
- in the same disposition state with matching review notes;
- both `RevisionRequested`.

Revise both atomically, increment each exactly once, reset both to Pending, clear notes, and set `reviewedAt` to null.

For any partial, malformed, mismatched, mixed-disposition, mixed-note, stale, or otherwise ineligible existing bundle:

- preserve both final files byte-for-byte;
- retain submitted drafts;
- surface Needs Attention;
- install no partial output.

### 8. Polling and explicit retry

The renderer quiet-poll path must call the promotion-capable Phase Planning workspace-model/status path before listing documents and comparing fingerprints.

Polling must not generate a handoff, create a submission, or advance the request ordinal.

After promotion failure:

- polling remains failed;
- failed drafts remain present;
- one explicit Prepare/Copy retry creates one new pair of absent draft paths using the next ordinal;
- the prior failed drafts remain untouched.

### 9. Synchronized review introduced by this cutover

Create one Phase Planning bundle review operation modeled on the validated Project Planning bundle review:

- both exact current outputs must be readable, fresh, identity-valid, and synchronized;
- the Operator must view both current artifact revisions before approval is enabled;
- one disposition and one notes value are applied atomically to both outputs;
- `RevisionRequested` requires non-empty revision instructions;
- mixed dispositions or notes surface Needs Attention;
- no generic single-document disposition control may govern this workspace.

Approval must make the existing `getPhasePlanningCompletion()` pass and allow the unchanged downstream candidate-selection logic to resolve Work Card Intake.

## Authorized Surface

```text
src/main/phasePlanning/phasePlanningService.ts
one adjacent Phase Planning draft-bundle definition/orchestration module
src/main/main.ts only for Phase Planning model/prepare/copy/review IPC and retired route removal
src/preload/index.ts only for matching Phase Planning API replacement
src/main/currentWorkflow/currentWorkflowService.ts only for promotion-capable Phase Planning status exposure
src/shared/workspaceContracts.ts only for Phase Planning workspace model and retired route-contract removal
src/renderer/app/App.tsx
one or more adjacent Phase Planning renderer/polling modules
src/renderer/styles.css
focused Phase Planning service, bundle, renderer production-path, runtime-wiring, and downstream-selection tests
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC37_phase_planning_workspace_and_atomic_bundle_cutover.md
```

Do not alter WC30 algorithms, Phase Map selection, Phase Interview behavior, candidate semantics, Work Card selection rules, Formal Work Card generation, later Work Card workspaces, MCP, global rails, or the WC36 dashboard.

## Required Proof

1. Exactly five production Architect output definitions exist.
2. No production default candidate or fabricated `WC01` remains.
3. The full Phase Planning manual/direct-save chain is absent from active renderer, shared API, preload, IPC, and service wiring.
4. The handoff contains exactly two executable generic draft-write calls with `overwrite:false`.
5. The dedicated workspace presents selected-phase evidence, embedded ChatGPT, and two document selectors.
6. One draft alone creates or modifies no final output.
7. Two valid drafts promote both outputs atomically and automatically without manual refresh.
8. The Work Card Plan block requires an array root and is validated by the existing candidate validator.
9. The exact validated candidate array is projected into `metadata.workflowData.candidates`.
10. Downstream `selectNextWorkCardCandidate()` continues using canonical metadata and existing rules.
11. A malformed draft creates no partial final bundle and retains both drafts.
12. An eligible synchronized `RevisionRequested` bundle revises both outputs once and resets both to Pending.
13. Partial or ineligible existing outputs remain byte-identical.
14. Explicit retry uses two fresh paths and preserves failed drafts; polling creates no retry.
15. One review operation applies identical disposition, notes, and review timestamp to both outputs.
16. Approval is disabled until both current revisions have been viewed.
17. Approved valid bundle makes Work Card Intake ready through unchanged candidate selection.
18. Existing Project Planning, Phase Map, Phase Interview, dashboard, and later lifecycle behavior remain unchanged.
19. Tests execute the production workspace model and renderer polling path; helper-only and source-string proof is insufficient.
20. Typecheck, build, and complete tests pass in the normal Windows lane.
21. Operator running-product validation remains pending.

## Non-Scope

Do not create Formal Work Cards, add candidate editing UI, change candidate resolution semantics, revise candidate ordering rules, redesign rails or dashboard, add persistence beyond canonical documents, migrate historical documents, add dependencies, or perform Git operations.

## Completion

Create the Implementer Report only after proof items 1–20 pass. Do not claim Operator running-product validation.
