<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/project/design_document/PHASE_MAP_AND_PHASE_PLANNING_FLOW",
  "artifactType": "design_document",
  "createdAt": "2026-07-14T00:00:00.000Z",
  "jsonPath": "planning/project/Design_Documents/PHASE_MAP_AND_PHASE_PLANNING_FLOW.json",
  "markdownPath": "planning/project/Design_Documents/PHASE_MAP_AND_PHASE_PLANNING_FLOW.md",
  "payload": {
    "kind": "design_document",
    "title": "Phase Map and Phase Planning Flow"
  },
  "payloadHash": "sha256:08e3b55ed4becb8c53683193615f7e5b10068042c566576b3e5c2d2829d462e0",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [],
    "sources": [],
    "supersedes": []
  },
  "revision": 2,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-14T00:00:00.000Z"
}
-->

# Phase Map and Phase Planning Flow

Status: Updated for Phase 02 WC08
Prepared: 2026-07-02
Project: ChampCity A/I

## Purpose

This note records the corrected operator flow for Phase 02 WC07 and the artifact authority boundary added by Phase 02 WC08. It supersedes the old normal path where Phase Planning Documents required Compatibility Phase Intake and completed Phase Architect Interview output.

## Corrected Flow

```text
Project Planning Documents + Repository Reconciliation + Project Roadmap
-> Generate Phase Map
-> Select mapped phase
-> Generate Phase Planning Documents
-> Work Card Plan Review
-> Architect drafts Formal Work Card
-> Operator approves Formal Work Card
-> Generate Implementer Execution Packets only from approved Formal Work Cards
```

## Screen Responsibilities

### Phase Map Composer

- Consumes saved Project Planning Documents, Repository Reconciliation, and Project Roadmap sources.
- Derives mapped phase records from the selected Project Roadmap.
- Displays roadmap facts and existing generated phase artifacts as context.
- Does not show or require a phase dropdown.
- Persists paired Phase Map artifacts under `planning/project/Phase_Map/`.

### Phase Planning Documents Generator

- Consumes an existing Phase Map and the source files referenced by that map.
- Lets the Operator select a mapped phase from mapped phase records.
- Defaults to the roadmap-recommended current/next phase when available.
- Generates paired Phase Planning Documents, Work Card Plan, and phase-scoped backlog artifacts through constrained IPC.
- Allows optional inline phase-specific clarification answers.
- Marks generated Phase Planning Documents and Work Card Plans as Draft / Pending Review / Not Active unless later approved through the proper Operator workflow.

### Work Card Plan Review

- Consumes Phase Planning Documents, the saved Work Card Plan, Phase Map context, and the phase-scoped backlog when available.
- Presents planned entries as proposed/planned cards, not executable Formal Work Cards.
- Labels planned entries as Proposed / Not Executable until Operator approval and materialization support exists.
- Scaffolds future Operator decisions: Draft this Work Card, skip/defer, rename, reorder, merge, split, mark superseded, or mark already satisfied.
- Does not write files under `Work_Cards/` in WC08 and does not generate Implementer Execution Packets.

### Ad Hoc Work Card Capture

- Replaces the old user-facing Capture label for the existing out-of-cycle Work Card capture screen.
- Is reserved for one-off, repair, emergency, or operator-discovered work.
- Is not the normal next step after phase planning.
- Uses manual/ad hoc authority: local Work Card ID, title, and phase fields control the saved draft. The header Work Card selector is hidden on this screen to avoid silently mixing selected Work Card context with a new ad hoc draft.

## Artifact Authority Model

- Project Plan / Roadmap = proposed end-to-end project progression.
- Phase Map = structured phase status and phase-selection authority.
- Phase Planning Documents = draft or approved plan for a selected phase.
- Work Card Plan = proposed Work Card count, order, names, and rough intent.
- Formal Work Cards = approved executable units saved under `Work_Cards/`.
- Implementer Execution Packet = build instruction generated from an approved Formal Work Card.
- Implementer Report = Implementer result.
- Human Validation Report = Operator evidence and decision.
- Closeout Report = phase-level acceptance and transition authority.

## Review And Activation Boundary

- The app may generate next-phase planning artifacts before or during closeout.
- Those artifacts must remain Draft / Pending Review / Not Active until an explicit Operator decision.
- Work Card Plans must not automatically create Formal Work Cards.
- Formal Work Cards require a separate Operator approval step.
- Phase Closeout must record a Next Phase Activation decision.
- Next Phase Activation decisions include Activate next phase, Defer next phase, Revise roadmap first, Carry unresolved current-phase items forward, and Close current phase without activation.
- Phase 03 draft artifacts may live under `planning/phases/phase-03/`, but they are not active and are not executable Work Cards.

## Legacy Compatibility

- Phase Intake is not a normal input for this flow.
- Phase Architect Interview is optional downstream clarification only after roadmap/reconciliation context establishes the selected phase.
- Compatibility Phase Intake source, Phase Architect Interview Prompt source, and completed Phase Architect Interview output may remain available in an Advanced / Legacy section.
- The normal path must not require pasted completed Phase Architect Interview output.

## Data Model Boundary

The app must distinguish:

- existing generated phase artifacts;
- mapped roadmap phases;
- planned phase document bundles.
- planned Work Card entries that are proposed, already satisfied, superseded, deferred, implemented but not validated, or validated but not closed.

Existing phase folders can provide context, but they are not the authoritative list of future selectable phases. The Phase Map is the selectable phase authority for the generator. Phase Map records do not activate a phase by themselves.

## Validation Notes

- Automated validation must use the lane documented in `docs/dev/VALIDATION_COMMAND_LANES.md`.
- Manual Operator validation must confirm that Phase Map Composer has no phase dropdown and that the generator phase selector is populated from mapped phase records.
- WC07 does not authorize Phase 03 activation or Phase 02 closeout.
- WC08 does not close Phase 02, activate Phase 03, or create Phase 03 Formal Work Cards.
