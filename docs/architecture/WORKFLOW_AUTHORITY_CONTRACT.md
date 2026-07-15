# Workflow Authority Contract

## Purpose

ChampCity A/I computes one current workflow position from the selected project’s verified repository evidence. Repository artifacts, the locked process contract, repair policy, role gates, and explicit human decisions are authority. A persisted workflow snapshot is not an independent selector.

## Runtime authority path

Configured Project + Repository Observer / Manual Refresh → Verified Artifact Graph + Explicit Decision Overlay + Locked Process Contract → Evidence-Derived Workflow Projector → Current Required Action → Routed UI.

Every production entry point uses this path: application startup, focus/reopen, branch change, project switching, manual refresh, watcher refresh, external artifact writes, and routed in-app writes.

## Selected-project boundary

Each configured project has its own repository root, planning root, branch behavior, observer state, scan result, artifact graph, and projection. Repository and artifact operations resolve inside the selected project. Switching projects replaces the complete projection context without rebuilding or relaunching the app.

## Repository evidence

The repository scanner discovers canonical Markdown/JSON pairs whether they were written by ChampCity A/I or by an external Implementer/LLM. A pair is accepted only after identity, metadata, body, path, revision, and payload-hash verification. Incomplete, invalid, duplicate, cross-project, or conflicting authority blocks visibly.

Historical, archived, and explicitly superseded evidence remains inspectable but cannot control the route. Filesystem timestamps, directory order, suffixes, first/last matches, and report-status strings do not select workflow authority.

## Evidence-derived transitions

The projector recognizes exact expected outputs and recomputes the current step:

1. An exact active Implementer Report satisfies Implementer execution and routes its Work Card to Architect Review.
2. An exact Architect Review with explicit validation authorization routes to Operator Validation.
3. A governed Validation Report routes according to its result and Architect-disposition policy.
4. An explicit repair decision selects only its exact repair identity.
5. Repair limits block another numbered repair and require governed disposition.
6. Ambiguity or invalid evidence blocks instead of guessing.

Repeated scans with unchanged evidence are no-ops. A process restart reconstructs the same action from the repository.

## Workflow State disposition

`planning/system/Workflow_State/WORKFLOW_STATE_INDEX.*` is historical input and may be emitted in the future as a derived cache or diagnostic snapshot. Production routing does not read it. If a cache is generated, it may record the last projection, evidence IDs, projection revision, cache timestamp, observer state, and blockers, but it cannot override a newer verified graph.

## Artifact Registry disposition

The synchronized Artifact Registry remains a useful durable index for canonical app writes and auditing. Runtime discovery builds a derived registry view from the verified graph, so prior app registration is not required for visibility. A stale durable Registry cannot hide a valid external pair or override the graph.

## Presentation boundary

Current Action and the Current Step inspector format the projector result. They do not reconstruct or authorize a route. Reference navigation is separate and cannot retarget target, sources, expected output, role, or revision.
