# Workflow Authority Contract

## Purpose

ChampCity A/I's target-state workflow authority is a relationship-driven kernel that computes one current workflow position from verified repository evidence, explicit human decisions, artifact relationships, repair policy, and role gates.

## Current Implementation Status

This contract describes the target state, not the current implemented guarantee. Phase 06 - Workflow Kernel and Artifact Protocol Replacement is the approved implementation phase that replaces the current projector boundary. Until Phase 06 is implemented and accepted, Artifact Registry and Workflow State are diagnostic/cache, and the app must not be treated as the reliable workflow controller.

## Target Runtime Authority Path

Configured Project + Repository Observer / Manual Refresh -> Verified Artifact Graph + Explicit Decision Overlay + Locked Process Contract -> Relationship-Driven Workflow Kernel -> Current Required Action -> Routed UI.

In the target state, production entry points use this path: application startup, focus/reopen, branch change, project switching, manual refresh, watcher refresh, external artifact writes, and routed in-app writes.

## Selected-Project Boundary

Each configured project has its own repository root, planning root, branch behavior, observer state, scan result, artifact graph, and projection. Repository and artifact operations resolve inside the selected project. Switching projects replaces the complete projection context without rebuilding or relaunching the app. Multi-project dogfooding in Phase 11 must prove no route bleed across projects.

## Repository Evidence

The target repository scanner discovers canonical Markdown/JSON pairs whether they were written by ChampCity A/I or by an external Implementer/LLM. A pair is accepted only after identity, metadata, body, path, revision, and payload-hash verification. Incomplete, invalid, duplicate, cross-project, or conflicting authority blocks visibly.

Historical, archived, and explicitly superseded evidence remains inspectable but cannot control the route. Filesystem timestamps, directory order, suffixes, first/last matches, and report-status strings do not select workflow authority.

## Target Evidence-Derived Transitions

The Phase 06 kernel must recognize exact expected outputs and recompute the current step without synthetic IDs or filename/timestamp/suffix inference:

1. An exact active Implementer Report satisfies Implementer execution and routes its Work Card to Architect Review.
2. An exact Architect Review with explicit validation authorization routes to Operator Validation.
3. A governed Validation Report routes according to its result and Architect-disposition policy.
4. An explicit repair decision selects only its exact repair identity.
5. Repair limits block another numbered repair and require governed disposition.
6. Ambiguity or invalid evidence blocks instead of guessing.

Repeated scans with unchanged evidence should be no-ops. A process restart should reconstruct the same action from the repository.

## Workflow State Disposition

`planning/system/Workflow_State/WORKFLOW_STATE_INDEX.*` is diagnostic/cache until the Phase 06 kernel is rebuilt. If emitted later as a derived cache, it may record the last projection, evidence IDs, projection revision, cache timestamp, observer state, and blockers, but it cannot override a newer verified graph.

## Artifact Registry Disposition

The synchronized Artifact Registry remains a useful durable index for canonical app writes and auditing. Target runtime discovery builds a derived registry view from the verified graph, so prior app registration is not required for visibility. A stale durable Registry cannot hide a valid external pair or override the graph.

## Presentation Boundary

Current Action and the Current Step inspector format the kernel result. They do not reconstruct or authorize a route. Reference navigation is separate and cannot retarget target, sources, expected output, role, or revision.
