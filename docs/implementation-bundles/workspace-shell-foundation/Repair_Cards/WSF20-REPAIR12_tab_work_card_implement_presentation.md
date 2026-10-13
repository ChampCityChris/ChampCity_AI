# WSF20-REPAIR12 — Make Work Card Implement readable and actionable

**Type:** Repair Card  
**Parent:** WSF20  
**Defects:** WSF20-D30, WSF20-D31  
**Starting baseline:** `1dd01650cfbe3950f4871726f10199da912cd9c0`

> Existing dirty Forgejo hotfix files on `dev` are unrelated to this card. Do not stage, amend, or modify them as part of R12.

## Objective

Keep the recovered two-column Implement workspace, but separate overloaded content into clear presentation tabs and restore visible footer controls.

No execution/domain behavior changes.

## Required correction

### 1. Visible footer actions

Style the footer actions as real buttons using existing ChampCity action vocabulary.

At minimum:

- **Refresh** = secondary action;
- **Continue to Review & Validation** = primary/forward action when enabled;
- disabled state must remain visibly a button, not plain text;
- keyboard focus and hover remain obvious.

Do not rely on generic bare-button styling.

### 2. Left pane tabs

Split the left Implement column into two local presentation tabs:

**Implement** — default
- model selection;
- reasoning selection;
- primary Implement / Cancel controls;
- environment/preflight status;
- last-run summary;
- current actionable blocker/readiness.

**Context**
- Work Card ID/title;
- approved contract identity/revision;
- parent Work Card when applicable;
- attempt/report identity and state;
- source/checkpoint context needed for inspection.

Do not duplicate the same fields across both tabs unless a compact summary is required.

### 3. Right pane tabs

Split the current `CodexExecutionConsole` into bounded tabs using the existing tab visual language:

**Status** — default when idle/completed/failed
- Codex availability;
- run type;
- state/elapsed;
- checkpoint state;
- failure/retry message;
- compact post-run outcome.

**Interaction**
- pending approval;
- pending user input;
- pending MCP elicitation.
- If any interaction is pending, select or clearly highlight this tab automatically.

**Diagnostics**
- runtime diagnostics;
- approval tail;
- runtime denial tail;
- event tail;
- stderr/error tail;
- final response tail.

A failure must remain visible from Status without requiring the Operator to hunt through Diagnostics.

### 4. Presentation-only state

Tab selection is renderer-local presentation state only.

- no SQL persistence;
- no workflow authority;
- changing tabs must not trigger service calls;
- WorkItem/attempt identity changes reset tabs to the appropriate default.

### 5. Geometry

Preserve one primary two-column row plus intrinsic footer.

Each column owns its own tab header and one scrollable active body. Hidden tab bodies must not consume layout height.

No nested giant document/report row.

## Focused proof

Prove:

1. footer Refresh and Continue render with explicit button classes and disabled/focusable semantics;
2. left pane exposes Implement + Context tabs;
3. right pane exposes Status + Interaction + Diagnostics tabs;
4. only the active tab body is rendered/occupies height;
5. pending approval/input/MCP makes Interaction visible/selected or prominently indicated;
6. failed/checkpoint-blocked state is readable on Status;
7. Diagnostics retains all existing tails/runtime evidence;
8. tab changes make zero `window.champcity` calls;
9. read-only inspection permits tab switching but not mutation;
10. before Run, running, failed and completed geometry stay within the recovered two-column workspace;
11. R11 single-action Implement behavior remains unchanged.

Run focused Implement renderer, hidden App geometry, Greenfield composition, and static/build owners that do not require unrelated dirty Forgejo files.

## Operator acceptance

Open the current failed Implement attempt and verify:

- footer controls look like buttons;
- left pane defaults to Implement and can switch to Context;
- right pane separates Status / Interaction / Diagnostics;
- the checkpoint failure is understandable on Status;
- logs no longer bury the actionable state;
- no workflow state changes when switching tabs.

## Forbidden changes

- no checkpoint/source semantics changes;
- no SQL/domain/schema changes;
- no attempt lifecycle changes;
- no Review & Validation redesign;
- no Forgejo hotfix files;
- no browser/MCP/prompt changes.

## Implementer report

Write:

`Dev/docs/implementation-bundles/workspace-shell-foundation/Implementer_Reports/WSF20_REPAIR12_IMPLEMENTER_REPORT.md`

## Checkpoint

`WSF20-R12 tab Work Card Implement presentation`

Then stop for Operator audit.
