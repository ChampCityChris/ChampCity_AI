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

1. Project Intake → Project Architect Interview.
2. Interview → Project Planning and Repository Reconciliation.
3. Project Planning → Operator Project Approval.
4. Project Approval → Phase Mapping.
5. Phase Planning → Operator Phase Approval.
6. Phase Approval → first unresolved Work Card candidate.
7. Work Card approval → Implementer handoff.
8. Implementer Report → Architect Review of that exact report.
9. Authorized Architect Review → Operator Validation.
10. Failed or partial validation → Architect disposition and, when authorized, repair creation.
11. Passing validation → next unresolved candidate.
12. Final candidate resolution → Phase Closeout.
13. Closeout approval → Roadmap update.
14. Roadmap update → next-phase activation.

Conflicting, missing, or unsynchronized evidence yields a blocked action. It never yields an inferred transition.

## WC08 Stabilization State

The WC09 migration seeds the unresolved action with WC08-REPAIR04 as the authoritative target, its exact Implementer Report as the required source, and the WC08-REPAIR04 Architect Review as the expected output. Successful review save advances the canonical state to `operator_validation_required`. WC08, WC08-REPAIR05, reference selection, timestamps, and superseded paths cannot retarget that action.

## Presentation Boundary

The Current Action panel is a presentation projection of canonical state. The horizontal process map remains `Capture → Frame → Plan → Build → Prove`; the center workspace owns active work; Artifacts remains the artifact browser and preview surface. Support navigation may open reference context but cannot modify authority.
