<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "architect-report",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "reportId": "RCA_PHASE_MAP_HANDOFF_MCP_PERSISTENCE_AND_ROADMAP_SCOPE_GAP"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC28-REPAIR01_project_selector_phase_map_embedded_architect_and_browser_transition.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "RCA — Phase Map Handoff, MCP Persistence, and Roadmap Scope Gap",
    "status": "operator_confirmed_defect",
    "crossRepository": true,
    "affectedRepositories": [
      "ChampCity_AI",
      "ChampCity_GPT",
      "Revisionary"
    ]
  },
  "documentDisposition": {
    "status": "Pending",
    "notes": "Requires explicit sequencing of Revisionary Roadmap revision, an independent Phase Map output-submission contract, ChampCity_GPT MCP action implementation, and ChampCity_AI integration.",
    "reviewedAt": null
  }
}
CHAMPCITY-METADATA -->

# RCA — Phase Map Handoff, MCP Persistence, and Roadmap Scope Gap

## Executive Finding

The current Phase Map workflow is not a complete Architect handoff. It combines a hard-coded one-phase skeleton, repair-session wording, and a manual local output-import path. It does not follow the established Architect Interview and Project Planning pattern in which the embedded Architect saves canonical output through ChampCity MCP.

This is not an ordinary WC28-REPAIR01 correction because that repair explicitly prohibited adding or modifying a Phase Map MCP persistence action.

## Finding 1 — The Generated Handoff Contains a Hard-Coded Skeleton

The current `generatePhaseMapHandoff()` defaults to:

```text
phaseId: phase-01
title: Phase 01
purpose: Initial project building phase.
dependsOn: []
```

That default is persisted into the generated Phase Map handoff as authoritative `workflowData.phases`.

Revisionary's actual generated handoff therefore contains only one generic phase even though its approved Project Roadmap contains a detailed development sequence.

Root cause:

- Phase Map generation does not derive phase candidates from the approved Roadmap;
- the handoff embeds a fabricated default phase instead;
- the Architect prompt is then asked to produce output using a handoff whose only structured phase evidence is that skeleton.

Required correction:

- remove the fabricated default phase from production Phase Map handoff generation;
- require the Architect to derive the phase map from the complete approved Project Profile and Project Roadmap;
- the application must validate the resulting `champcity-phase-map` block rather than pre-authoring the phase structure.

## Finding 2 — Development-Session Language Leaks Into the Product Prompt

The copied instruction states:

```text
Do not call or invent an MCP save action for Phase Map in this repair.
```

This is invalid product behavior because:

- the prompt refers to the current application workflow as a `repair`;
- implementation-card scope language leaked into a project-facing Architect prompt;
- the prompt tells the Architect to return content for manual Operator handling instead of completing the repository write.

Production prompts must describe the project workflow, not the Work Card that happened to implement it.

## Finding 3 — Phase Map Uses a Manual Save Path Instead of MCP Persistence

The current flow is:

```text
Prepare handoff
→ copy prompt
→ Architect returns Markdown in chat
→ Operator copies Markdown into Phase Map output field
→ application saves canonical file
```

The established workflow pattern is:

```text
Prepare approved handoff
→ embedded Architect reads exact repository inputs
→ Architect produces complete substantive output
→ Architect calls a purpose-built ChampCity MCP action
→ MCP writes the canonical Pending artifact
→ application detects and presents it for review
```

Required architecture:

- define an independent approved `phase-map-output-submission-v1` contract;
- implement `artifact_toolbox.save_phase_map_output` in ChampCity_GPT;
- caller supplies only the complete substantive Phase Map Markdown body;
- MCP resolves the current Approved Phase Map handoff and exact output target;
- MCP owns canonical metadata, identity, source revisions, role, revision, and Pending disposition;
- identical retry returns `already_saved`;
- substantive revision follows the same reviewed-output protections established for Project Planning;
- ChampCity_AI removes the manual Phase Map body-import field after the MCP path is proven.

## Finding 4 — The Revisionary Roadmap Is Detailed Through MVP but Does Not Sequence Full Post-MVP Development

The approved Revisionary Project Roadmap contains detailed Phase 0 through Phase 11 planning for MVP delivery and beta release. It then collapses all later development into one prose section:

```text
Post-MVP — Enterprise architecture and deferred capabilities
```

That section lists possible enterprise and deferred capabilities but does not provide ordered phases, dependencies, or exit criteria.

Therefore the Roadmap is not literally limited to MVP content, but the Operator's substantive concern is valid: only MVP development is fully sequenced. Post-MVP development is not roadmapped at the same level of authority.

Required planning correction before final Phase Map generation:

- revise the Project Roadmap so the intended full development horizon is explicit;
- distinguish committed post-MVP phases from optional future capabilities;
- provide sequence, dependencies, scope boundaries, and exit criteria for each committed post-MVP phase;
- keep truly speculative capabilities in a separate deferred/opportunity section;
- then generate the Phase Map from that revised Approved Roadmap.

## Correct Dependency Sequence

The work must be sequenced without a circular dependency:

```text
1. Operator approves the full-development Roadmap requirement.
2. Revisionary Project Planning bundle is revised and re-approved.
3. Independent Phase Map output-submission contract is approved.
4. ChampCity_GPT implements save_phase_map_output against fixtures and the contract.
5. ChampCity_AI integrates the action and updates the Phase Map handoff prompt.
6. Revisionary generates a new Phase Map handoff from the revised Roadmap.
7. Embedded Architect saves the canonical Pending Phase Map through MCP.
8. Operator reviews and dispositions the Phase Map in ChampCity A/I.
```

Neither repository implementation card should wait for the other's unimplemented code to define the contract. The independent contract is the shared authority.

## Immediate Scope Boundary

WC28-REPAIR01 should correct only:

- overlapping project-selector controls;
- missing Phase Map disposition controls after a Pending output exists;
- preservation of the accepted browser transition fix.

Do not ask that Implementer to fabricate the new MCP action or revise Revisionary's Roadmap inside WC28-REPAIR01.
