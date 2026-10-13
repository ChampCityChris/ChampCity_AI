# WSF03A-AUDIT — Architect/Planning Candidate Ingress Gap

**Current head:** `3bbbaf342f93a6e105b355e259ce29105eb57f3e`  
**Purpose:** document the missing reusable bridge between embedded ChatGPT Architect output and current SQL-backed stage services.

## Finding

The RWS structured-state migration successfully created typed SQL candidate/save services, but it did not rebuild the production response-ingress path that previously connected the embedded Architect workflow to persisted work.

Instead, RWS introduced renderer-owned JSON textareas for most structured stages. WSF03 correctly removed the Architect Interview JSON textarea while recovering the historical shell, which exposed the missing transport boundary directly.

This is a shared architecture gap, not a WSF04-only UI problem.

## Historical architecture

Before structured SQL authority, the application used the Architect Output runtime:

```text
prepare handoff
→ embedded ChatGPT
→ bounded Architect_Drafts submission
→ validate draft/output
→ promote result
→ workspace refresh/review
```

The files were authoritative or promotable Markdown at that time.

The structured-state architecture explicitly required that transport stop being authority:

```text
prepare handoff from SQL
→ embedded ChatGPT
→ bounded typed candidate transport
→ validate exact candidate
→ persist SQL semantic records/review cycle
→ generate Markdown review projection from SQL
→ Operator disposition
```

RWS05C explicitly authorized reuse of the existing temporary transport but required typed validation and SQL persistence before reviewability. That bridge was not implemented; candidate entry remained renderer-owned.

## Gap matrix

| Stage | Historical output transport | Current SQL application service | Current renderer workaround | Required reusable bridge |
|---|---|---|---|---|
| Architect Interview | Architect output runtime / Interview draft | `structuredArchitectWorkspaceService.save` | WSF03 now has no ingress; pre-WSF used Structured JSON textarea | workflow candidate ingress → Architect save |
| Project Planning | Project Profile + Roadmap draft bundle | `structuredProjectPlanningService.save` | `PlanReviewShell` JSON textarea | workflow candidate ingress → Project Planning save |
| Project Phase Map | Phase Map draft output | `structuredPhaseMapService.save` | `PlanReviewShell` JSON textarea | workflow candidate ingress → Phase Map save |
| Phase Interview | Phase Interview draft output | `structuredPhaseLoopService.save(..., interview)` | generic JSON textarea | workflow candidate ingress → Phase Interview save |
| Phase Planning | Phase Planning + Work Card Plan bundle | `structuredPhaseLoopService.save(..., planning)` | generic JSON textarea | workflow candidate ingress → Phase Planning save |
| Work Card Planning | Formal Work Card draft output | `structuredWorkItemPlanningService.save` | WorkItem JSON/decomposition textarea | workflow candidate ingress → WorkItem Planning save |
| Work Card Repair | Repair Work Card draft output | Repair WorkItem + structured WorkItem planning contract | generic Execution/repair path | same WorkItem candidate ingress using exact Repair WorkItem |

## Existing reusable assets

The repository still contains the prior Architect transport machinery:

- `architectOutputRuntimeService.ts`
- `architectDraftSubmissionService.ts`
- `productionArchitectOutputCatalog.ts`
- Project Planning / Phase Map / Phase Interview / Phase Planning / Formal Work Card / Repair Work Card draft definitions.

Those mechanics are historical evidence and may supply useful bounded-submission/freshness patterns, but canonical Markdown promotion must not be restored.

The current Agent Harness already reserves `workflow_toolbox` as a public MCP namespace. It is currently status-only/unimplemented.

## Architecture decision

Implement one reusable application ingress port through `workflow_toolbox`.

Preferred public action:

`submit_stage_candidate`

Required bounded inputs:

- exact `workflowId`;
- semantic `stage` enum;
- optional exact `scopeEntityId` for Phase/WorkItem stages;
- bounded `candidateJson`.

The LLM supplies semantic content. ChampCity supplies/verifies mechanical identity and freshness from current authoritative state.

The ingress service:

1. resolves exact bound Project/workspace;
2. resolves current Workflow/stage/scope;
3. parses and validates the stage-specific candidate contract;
4. injects/validates exact Workflow/Phase/WorkItem IDs, source revisions and expected current versions where the application already owns them;
5. calls the existing structured stage save service;
6. creates/revises the SQL review candidate only;
7. creates no Operator approval;
8. returns bounded candidate/review identity/status;
9. allows the renderer to refresh and show the SQL-generated human-readable review projection.

## Authority boundary

The MCP candidate action is equivalent to the Architect/model supplying a proposed draft. It is **not** an Operator Decision.

It may create/revise proposed semantic records and their review cycle exactly as the current renderer Save buttons do.

Approve / Revision Requested / Reject remain explicit human Operator actions in the application.

## Markdown boundary

- model-authored Markdown is not authoritative;
- generated Markdown remains one-way SQL → human review projection;
- no generated Markdown is parsed back into authority;
- historical Architect draft files may remain as evidence;
- a temporary JSON file transport is unnecessary if MCP can submit the typed candidate directly.

## Building-block consequence

Once this ingress exists, the seven recovered shells need no JSON editor. Their common loop becomes:

```text
Prepare/Copy handoff
→ embedded ChatGPT uses workflow_toolbox.submit_stage_candidate
→ shell Refresh
→ generated review document appears
→ Operator disposition
```

That is the reusable building block required before WSF04 can continue.
