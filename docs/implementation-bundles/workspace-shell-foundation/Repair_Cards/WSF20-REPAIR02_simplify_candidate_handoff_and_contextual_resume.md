# WSF20-REPAIR02 — Simplify candidate handoff and contextual resume navigation

**Type:** Repair Card  
**Parent:** WSF20  
**Defects:** WSF20-D09, D10, D11  
**Starting baseline:** `151404c07f44e9c3a3d8a3254946c3421a779a63`

## Objective

Make the Architect/model candidate interaction a single reusable building block before the same duplicated UX spreads across additional workflows.

Target interaction:

```text
Prepare Handoff
→ Copy Handoff
→ ChatGPT conducts the bounded interview/reasoning
→ ChatGPT submits the completed semantic candidate through workflow_toolbox
→ Operator presses Refresh
→ SQL-generated review document appears
→ Operator reviews/disposes
```

There is no separate Regenerate step and no separate Final Draft Handoff.

Also make **Resume current stage** a contextual left-sidebar navigation action that exists only while the Operator is inspecting a non-current workspace.

## Confirmed RCA

### D09 — duplicated candidate controls

In Greenfield Architect Interview:

- `Regenerate Interview Prompt` and `Prepare Handoff` invoke the same `prepare` function.
- `Prepare Final Draft Handoff` only appends the MCP instruction that belongs in the ordinary handoff contract.
- `PhaseInterviewWorkspace` repeats the Final Draft handoff state/action.
- Six recovered candidate shell action components contain copied optional Regenerate/Final Draft APIs.

This is presentation duplication, not distinct workflow behavior.

### D10 — Resume current stage is unconditional local chrome

`GreenfieldWorkspace` hard-codes the Resume button in its workspace header.

It renders on the canonical current stage where it has no purpose and does not use the existing `FigmaSidebar` navigation-action styling.

### D11 — candidate delivery instructions conflict

`architectCandidateHandoffContract()` currently uses phrases such as:

`Return only one JSON object ...`

while `workflowCandidateHandoff()` later says:

`Submit through MCP; do not ask the Operator to paste JSON...`

The first instruction caused the Architect to print the candidate instead of calling MCP. The observed printed payload also contained invalid JSON escaping in a Windows path.

The transport rule must be singular: semantic object is constructed by the model and submitted via MCP. Raw transport JSON is never an Operator-facing deliverable.

## Required correction

### 1. Introduce one shared candidate browser-actions primitive

Extract the duplicated candidate browser action row into one presentation primitive, e.g. `WorkflowCandidateBrowserActions` or equivalently named component.

It owns only presentation/action slots:

- Reload ChatGPT
- Prepare Handoff
- Copy Handoff
- Refresh
- Retry when browser state requires it
- optional contextual next-stage action
- bounded feedback/error presentation

It must **not** expose:

- Regenerate Prompt
- Prepare Final Draft Handoff
- Copy Final Draft Handoff

Candidate shells may wrap/re-export the shared primitive if preserving shell-specific public names is useful, but there must be one implementation of the action row.

Apply it to the recovered Greenfield candidate surfaces that currently duplicate this action contract:

- Architect Interview
- Project Planning
- Project Phase Map
- Phase Interview
- Phase Planning
- Work Card Planning

Do not alter their shell geometry or workflow semantics.

Repair/Review surfaces with genuinely different action sets are not forced into this primitive.

### 2. Remove duplicate handoff state/actions

From `GreenfieldArchitectWorkspace`:

- remove `finalDraftHandoff` state;
- remove Regenerate binding;
- remove Final Draft prepare/copy bindings;
- retain one Prepare Handoff callback;
- retain one Copy Handoff callback;
- retain Refresh.

From `PhaseInterviewWorkspace`:

- remove `finalHandoff` state;
- remove Final Draft prepare/copy bindings;
- normal handoff must already carry the complete MCP delivery instruction.

No candidate adapter should maintain a second renderer-local handoff variant solely to add MCP submission instructions.

### 3. Make MCP submission the sole completion instruction

Refactor shared handoff wording so **semantic schema** and **delivery transport** are separate concepts.

For MCP-backed Greenfield stages:

- describe the exact semantic object the model must construct;
- never say `Return only JSON`, `return structured output`, `paste JSON`, or equivalent;
- explicitly say the candidate is **not** the chat response;
- once the interview/reasoning is complete, call `workflow_toolbox.submit_stage_candidate`;
- pass the semantic candidate using the tool's `candidateJson` argument;
- after successful tool submission, respond only with a short confirmation directing the Operator to Refresh;
- never emit canonical Markdown;
- never require the Operator to manually transfer JSON.

Update `architectCandidateHandoffContract()` wording for Project Creation and any other MCP-backed Architect path without changing its validator/schema.

Review the stage-specific Greenfield handoff prose in:

- structured Project Planning;
- Phase Map;
- Phase Interview;
- Phase Planning;
- Work Card Planning;
- Work Item review advisory.

Replace ambiguous phrases such as `return structured semantic output` / `Submit semantic candidate JSON` with schema language that cannot reasonably be interpreted as "print the JSON in chat."

Do not change candidate field names, validation limits, SQL save services, or MCP tool contract.

### 4. Preserve interview behavior without a Final Draft handoff

The initial Architect/Phase Interview handoff must tell ChatGPT:

- ask only materially unresolved questions;
- continue the conversation as needed;
- when sufficient information exists, construct the exact semantic candidate and submit it through MCP;
- do not print the candidate as the final answer;
- after successful submission, tell the Operator the candidate is ready for Refresh.

This single handoff must support the complete interview from start to submission.

### 5. Move Resume current stage into the left sidebar

Remove `Resume current stage` from the `GreenfieldWorkspace` header.

Add a bounded optional workflow-context action slot to `FigmaSidebar` using the existing `figma-sidebar-action` styling.

Greenfield supplies this action **only when the selected workspace is not the canonical SQL workspace and is therefore inspection/presentation navigation**.

Behavior:

- canonical current stage selected → no Resume action visible;
- alternate manual Work Card Validation surface selected and explicitly considered actionable by current Greenfield rules → no unnecessary Resume action solely because the stage ID differs;
- completed/future read-only inspection → sidebar shows **Resume current stage**;
- clicking it invokes Greenfield's existing SQL `refresh()/resume` path and returns to the exact canonical stage;
- changing Workflow/unmounting Greenfield clears the contextual sidebar action.

Do not create another persisted navigation field.

### 6. Remove redundant local workflow header chrome

The Greenfield local header may retain the Workflow title only if needed for context.

Do not duplicate global/sidebar **Workflows** navigation or Resume actions above the nested rail when those controls are supplied by the left sidebar.

Preserve the nested Project / Phase / Work Card rail immediately adjacent to the workflow content.

## Focused proof

Add/extend tests that prove:

1. shared candidate action primitive renders exactly one Prepare and one Copy action;
2. no recovered Greenfield candidate action source contains `Regenerate Interview Prompt` or `Final Draft Handoff`;
3. Architect Interview and Phase Interview have no second renderer-local handoff state;
4. Greenfield Architect handoff contains MCP submission instructions and no `Return only one JSON object` instruction;
5. Project Planning / Phase Map / Phase Interview / Phase Planning / Work Card Planning Greenfield handoffs contain no instruction to print/return candidate JSON;
6. candidate validators and MCP submission schema remain unchanged;
7. successful MCP candidate submission remains SQL-authoritative and Refresh exposes the generated review document;
8. canonical Greenfield stage renders no Resume control;
9. read-only inspected stage exposes Resume in the left sidebar;
10. clicking sidebar Resume returns to the SQL canonical stage;
11. manual Work Card Validation remains an allowed alternate surface without an unnecessary Resume warning/control;
12. Greenfield workspace header contains no duplicate Resume button;
13. candidate action primitive has no service/SQL ownership.

Run the existing candidate-ingress owners, recovered Architect/Phase/Planning renderer owners, Greenfield composition/navigation owner, sidebar renderer owner, and production build.

## Operator acceptance

After checkpoint, Operator should verify in the real application:

- Architect Interview shows a simple browser action row: Reload, Prepare Handoff, Copy Handoff, Refresh plus only genuine contextual actions;
- no Regenerate or Final Draft controls;
- initial handoff can carry an interview through completion and ChatGPT submits through MCP without printing JSON;
- Refresh reveals Architect Review;
- Resume current stage is absent while on current stage;
- when inspecting another rail stage, Resume appears as a normal left-sidebar action and returns to current SQL stage.

## Forbidden changes

- no SQL/domain/schema changes;
- no candidate schema/field changes;
- no browser security changes;
- no new renderer-local canonical navigation state;
- no D05–D08 repair work;
- no rebuilding other workflow families;
- no raw JSON candidate entry UI.

## Implementer report

Write:

`Dev/docs/implementation-bundles/workspace-shell-foundation/Implementer_Reports/WSF20_REPAIR02_IMPLEMENTER_REPORT.md`

Report D09–D11 separately, shared primitive adoption list, exact handoff wording tests, sidebar resume proof, focused receipts, build result, and remaining Operator audit items.

## Checkpoint

`WSF20-R02 simplify candidate handoff and contextual resume`

After checkpoint, stop for Operator audit.
