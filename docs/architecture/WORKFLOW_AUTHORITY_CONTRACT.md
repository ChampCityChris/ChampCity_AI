# Workflow Authority Contract

## Purpose

ChampCity A/I uses one persisted workflow-state index for the complete `Capture → Frame → Plan → Build → Prove` lifecycle. Screens and process services consume this index; they do not reconstruct authority from directory order, filenames, modification times, suffixes, or whichever artifact the Operator last viewed.

## Canonical State

The workflow-state index records:

- project ID, current stage, active phase, and monotonic state revision;
- current action ID and responsible role;
- authoritative target artifact ID;
- required source artifact IDs;
- expected output artifact ID and type;
- success, failure, and repair routes;
- blocking conditions and their owning role;
- open repair chain;
- authoritative Work Card Plan identity and synchronization status;
- ordered candidate execution state, including full Work Card authority and explicit resolution evidence;
- earliest unresolved candidate, active Work Card, active repair, and closeout eligibility;
- closeout, roadmap-update, and next-phase state;
- the complete routed-action contract used by the active workspace.

The canonical pair is stored at:

- `planning/system/Workflow_State/WORKFLOW_STATE_INDEX.json`
- `planning/system/Workflow_State/WORKFLOW_STATE_INDEX.md`

## Transition Rule

A transition is committed only in this order:

1. Validate the role and routed-action contract.
2. Validate the typed output payload.
3. Stage both output representations.
4. Verify pair identity, metadata, body, and payload hash.
5. Commit the output pair.
6. Commit the artifact registry revision.
7. Commit the next workflow-state revision.

Failure at any step blocks the transition and reports a partial-write or authority error. A failed output, registry update, or state update cannot be treated as workflow evidence.

## Lifecycle Coverage

The state machine covers these governed transitions:

1. Project Intake → Project Interview.
2. Project Interview → Reconciliation Review.
3. Reconciliation Review → Project Mapping.
4. Project Mapping → Operator Project Approval.
5. Project Approval → Phase Mapping.
6. Phase Mapping bundle → Operator Phase Approval.
7. Phase Approval → first unresolved Work Card candidate.
8. Work Card approval → Implementer handoff.
9. Implementer Report → Architect Review of that exact report.
10. Authorized Architect Review → Operator Validation.
11. Failed or partial validation → Architect disposition and, when authorized, repair creation.
12. Passing validation → next unresolved candidate.
13. Final candidate resolution → Phase Closeout.
14. Operator closeout approval → Architect Roadmap Update.
15. Architect Roadmap Update → Operator Next Phase Activation.
16. Next Phase Activation → repeated Phase Mapping and Work Card Loop.

Conflicting, missing, or unsynchronized evidence yields a blocked action. It never yields an inferred transition.

Phase intake, Architect interview evidence, phase planning, and the Work Card candidate plan belong to the Phase Mapping bundle. They may be written as subordinate artifacts but are not standalone top-level gates. Phase Closeout remains blocked until every approved candidate has one explicit closeout-eligible resolution: `completed`, `completed_via_repair`, `carried_forward`, `deferred`, or `cancelled`.

## Derived Production State and WC08 Regression

Migration derives the production action from the synchronized Work Card Plan, registry authority, candidate resolution evidence, Architect Review disposition, and the one controlling active repair. It never seeds a named example as permanent production authority. Historical, archived, superseded, or non-controlling repairs remain evidence and do not enter `activeRepairArtifactIds`.

WC08-REPAIR04 remains a deterministic regression fixture: its exact Implementer Report must bind to its exact Architect Review, and a successful review advances that fixture to `operator_validation_required`. Reference selection, timestamps, or neighboring repair artifacts cannot retarget either production state or the fixture.

## Presentation Boundary

The Current Action panel is a presentation projection of canonical state. The horizontal process map remains `Capture → Frame → Plan → Build → Prove`; the center workspace owns active work; Artifacts remains the artifact browser and preview surface. Support navigation may open reference context but cannot modify authority.
