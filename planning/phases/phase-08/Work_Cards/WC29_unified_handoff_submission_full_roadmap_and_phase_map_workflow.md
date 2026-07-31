<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC29"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Architect_Reports/RCA_PHASE_MAP_HANDOFF_MCP_PERSISTENCE_AND_ROADMAP_SCOPE_GAP.md",
      "revision": 1
    },
    {
      "path": "planning/project/Design_Documents/PROJECT_PLANNING_OUTPUT_SUBMISSION_CONTRACT.md",
      "revision": 2
    }
  ],
  "workflowData": {
    "title": "Unified Handoff Submission, Full Roadmap, and Phase Map Workflow",
    "status": "approved_for_implementation",
    "executionMode": "one bounded application integration pass",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC29_unified_handoff_submission_full_roadmap_and_phase_map_workflow.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Replace retired workflow-specific save actions, strengthen full-roadmap planning, and complete the Phase Map MCP workflow without fallback paths.",
    "reviewedAt": "2026-07-30"
  }
}
CHAMPCITY-METADATA -->

# WC29 — Unified Handoff Submission, Full Roadmap, and Phase Map Workflow

Status: Approved for Implementer execution  
Phase: phase-08  
Git mutation: prohibited

## Objective

Complete the ChampCity A/I migration to the sole canonical MCP output action and correct the Project Roadmap → Phase Map workflow:

1. all active embedded-Architect prompts use `artifact_toolbox.submit_handoff_outputs`;
2. the Project Roadmap represents the complete intended development lifecycle rather than stopping at the MVP boundary;
3. the Phase Map handoff is derived from the approved Profile and full Roadmap rather than a hard-coded skeleton;
4. the Phase Map is saved through MCP and reviewed in the Phase Map workspace;
5. retired save actions and manual output-import fallbacks are absent from active product behavior.

No dependency gate is encoded in this card. The Operator controls when this card is dispatched.

## Required Change 1 — Sole MCP Submission Action

Replace every active ChampCity A/I handoff instruction that names:

```text
save_architect_interview_output
save_project_planning_outputs
```

with:

```text
artifact_toolbox.submit_handoff_outputs
```

Supported active handoff kinds in this card:

```text
architect-interview
project-planning
phase-map
```

Invocation shapes:

```json
{
  "action": "submit_handoff_outputs",
  "workspaceId": "<resolved workspace ID>",
  "params": {
    "handoffKind": "architect-interview",
    "outputs": {
      "architectInterviewMarkdown": "<complete substantive Markdown>"
    }
  }
}
```

```json
{
  "action": "submit_handoff_outputs",
  "workspaceId": "<resolved workspace ID>",
  "params": {
    "handoffKind": "project-planning",
    "outputs": {
      "projectProfileMarkdown": "<complete Project Profile Markdown>",
      "projectRoadmapMarkdown": "<complete Project Roadmap Markdown>"
    }
  }
}
```

```json
{
  "action": "submit_handoff_outputs",
  "workspaceId": "<resolved workspace ID>",
  "params": {
    "handoffKind": "phase-map",
    "outputs": {
      "phaseMapMarkdown": "<complete Phase Map Markdown>"
    }
  }
}
```

The generated instructions must state:

- the handoff kind is a selector, not authority;
- the MCP server derives targets, metadata, identity, source revisions, roles, revisions, and Pending disposition from the current Approved handoff;
- completion is reported only after `saved` or `already_saved`;
- any tool failure leaves the workflow incomplete;
- no retired action, generic Markdown writer, local import field, or manual file-copy fallback is permitted.

## Required Change 2 — Full Project Roadmap Contract

Strengthen Project Planning requirements so `Project Roadmap` covers the complete currently intended development lifecycle.

The Roadmap may distinguish:

```text
MVP
Post-MVP
Deferred
Conditional or evidence-gated future work
```

But it must not collapse all post-MVP development into an unsequenced paragraph.

Required Roadmap behavior:

- every known major workstream from the approved Interview/Profile is either sequenced, explicitly deferred, superseded, or declared conditional;
- MVP phases remain clearly identified;
- post-MVP phases or roadmap stages are separately sequenced at the level supported by current evidence;
- unknown future work is not fabricated;
- the Roadmap remains a project-level development roadmap, not a single-release checklist.

Update the current Project Planning prompt, handoff body, validation rules, and focused tests accordingly.

## Required Change 3 — Phase Map Contract

Remove the hard-coded default phase:

```text
phase-01 / Phase 01 / Initial project building phase
```

The generated Phase Map handoff must not pre-author the substantive Phase Map.

The handoff must contain application-owned contract data sufficient for the Architect and MCP server to produce and validate the Phase Map:

- `handoffKind: phase-map`;
- a stable Phase Map submission contract identifier;
- current Approved Profile path and revision;
- current Approved Roadmap path and revision;
- exact Phase Map output target;
- required Phase Map document heading;
- required `champcity-phase-map` domain-block rules;
- current project identity;
- no production wording referring to a Work Card, repair, implementation pass, compatibility path, or manual fallback.

The substantive phase list must be authored from the approved full Roadmap. Application code may validate it but must not fabricate it.

## Required Change 4 — Phase Map MCP Workflow

Phase Map must use the embedded ChatGPT/MCP flow:

```text
Prepare Phase Map Handoff
→ Copy/Send handoff instruction
→ Architect reads Profile, Roadmap, and handoff through MCP
→ Architect calls submit_handoff_outputs with phaseMapMarkdown only
→ MCP writes canonical Pending Phase Map
→ open Phase Map workspace detects and selects it
→ Operator dispositions the Phase Map
```

Remove the Phase Map manual Markdown output field and local `savePhaseMapOutput` renderer path from active UI/API behavior.

Do not replace it with `write_markdown_artifact`, caller-supplied paths, or another manual import mechanism.

## Required Change 5 — Revisionary Live Validation

Use Revisionary as the controlled running-product validation project.

Required final evidence:

- Project Roadmap is revised to a complete lifecycle roadmap and approved through the Project Planning bundle workflow;
- a new current Phase Map handoff references the revised Roadmap revision;
- embedded ChatGPT submits a substantive Phase Map through `submit_handoff_outputs`;
- MCP returns `saved` or `already_saved`;
- `planning/project/Phase_Map/PHASE_MAP_revisionary.md` exists as canonical Pending Markdown;
- the Phase Map is visible and reviewable in the open Phase Map workspace;
- Operator can approve, reject, or request revision;
- approval advances to the first incomplete mapped phase.

## Authorized Production Surface

Expected changes are limited to:

```text
src/main/projectIntake/projectIntakeService.ts
src/main/architectInterview/architectInterviewService.ts
src/main/projectPlanning/*
src/main/phaseMap/phaseMapService.ts
src/main/main.ts
src/preload/index.ts
src/renderer/app/App.tsx
src/shared/workspaceContracts.ts
focused tests
planning/project/Design_Documents/* only when required to record the active contract
```

Controlled Revisionary planning-artifact revisions are permitted only as running-product evidence through the approved application/MCP workflow. Do not directly hand-author canonical metadata.

## Non-Scope

Do not:

- add compatibility wrappers or fallback calls;
- restore retired MCP action names;
- use `repo_toolbox.write_markdown_artifact` as workflow persistence;
- add caller-supplied target paths or metadata;
- change Phase Map domain semantics beyond what the approved Roadmap requires;
- implement Phase Interview or Phase Planning MCP registry entries in this card;
- add dependencies;
- perform Git operations.

## Required Proof

Record each item as `Proven`, `OperatorValidationPending`, or `NotProven`.

1. Active Architect Interview prompts use only `submit_handoff_outputs`.
2. Active Project Planning prompts use only `submit_handoff_outputs`.
3. Active Phase Map prompts use only `submit_handoff_outputs`.
4. Retired save-action names are absent from active production prompt generation.
5. No active prompt or UI offers a generic Markdown-writer fallback.
6. Project Roadmap validation requires a complete sequenced lifecycle beyond the MVP boundary when supported by approved scope.
7. Revisionary Roadmap is revised and approved as a complete lifecycle roadmap.
8. Phase Map handoff contains no fabricated default phase and no repair/Work Card wording.
9. Phase Map handoff references the current approved Profile and revised Roadmap revisions.
10. Phase Map manual output import is absent from active renderer/preload/main behavior.
11. `submit_handoff_outputs` saves the Revisionary Phase Map and returns `saved` or `already_saved`.
12. The canonical Pending Phase Map is detected and selected in the open workspace.
13. Phase Map disposition works and approval advances repository-derived workflow state.
14. Architect Interview and Project Planning accepted flows still work with the sole new action.
15. Failure of `submit_handoff_outputs` leaves files and workflow state unchanged and visibly incomplete.
16. `npm run typecheck`, `npm run build`, and `npm test` pass in the approved lane.
17. Operator validates the complete Revisionary flow in the running Electron application.

## Completion

Create the Implementer Report only after proof items 1–16 pass. Item 17 may remain `OperatorValidationPending` until the Operator performs the final running-product check.

No Git operation is authorized.
