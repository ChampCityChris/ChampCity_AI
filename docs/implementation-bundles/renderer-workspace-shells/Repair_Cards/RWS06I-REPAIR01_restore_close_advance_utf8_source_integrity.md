# RWS06I-REPAIR01 — Restore Valid UTF-8 Close / Advance Renderer Sources

**Status:** IMPLEMENTER_READY  
**Parent:** RWS06I — Close / Advance / Integration Lifecycle Convergence  
**Failed review checkpoint:** `ce5e5c6ec0c96303cc9af498cef79e304db709e0`  
**Repair type:** source-file integrity defect

## Failed review evidence

Architect source review of RWS06I found invalid/corrupted text bytes in two committed runtime renderer files:

- `src/renderer/app/CloseAdvanceShell.tsx`
- `src/renderer/app/CloseAdvanceWorkspace.tsx`

The repository text reader rejects these files as invalid UTF-8.

Git/source search exposes replacement characters in user-visible strings, including variants of:

```text
Loading SQL close eligibility�
<entity> � revision ... � source-mode
Next: ... � ...
criterion � satisfied � policy
```

These are executable TSX source files, not disposable historical Markdown.

RWS06I's focused lifecycle behavior otherwise reviewed as structurally sound; this repair is limited to source encoding/text integrity.

## Confirmed defect

The committed Close / Advance renderer source is not valid clean UTF-8 and contains corrupted separator characters.

Runtime source should be readable consistently by repository tooling, TypeScript tooling, editors, and future model review.

## Root cause

RWS06I introduced the new Close / Advance components with corrupted non-ASCII separator bytes during file creation/editing.

The defect is textual encoding, not lifecycle semantics.

## Objective

Rewrite the two affected renderer files as valid UTF-8 source while preserving their current RWS06I behavior exactly.

Use plain ASCII punctuation for the affected presentation text so the repair does not depend on ambiguous source encoding.

## Required implementation

### 1. Normalize both files to valid UTF-8

Rewrite:

- `CloseAdvanceShell.tsx`
- `CloseAdvanceWorkspace.tsx`

as valid UTF-8 text.

Replace corrupted decorative separators with simple ASCII-safe presentation such as:

- `...` for loading;
- ` | ` or ` - ` between metadata fields.

Do not preserve the replacement character `�`.

### 2. Preserve Close / Advance behavior

Do not change the semantic behavior introduced by RWS06I:

- exact Workflow/Phase/WorkItem identity;
- expected-version handling;
- SQL-derived eligibility/blockers;
- Close / Keep open dispositions;
- source-backed integration transition;
- source-neutral closure;
- Project Criterion presentation and explicit Operator actions;
- next-destination handling;
- Project/Workflow lifecycle semantics.

Formatting the source for readability is acceptable if behavior is unchanged.

### 3. No adjacent cleanup

Do not use this encoding repair to redesign the shell, styling, button semantics, lifecycle copy, or close logic.

If another defect is discovered while proving this repair, report it separately rather than expanding scope.

## Expected production scope

Exactly:

- `src/renderer/app/CloseAdvanceShell.tsx`
- `src/renderer/app/CloseAdvanceWorkspace.tsx`

Tests should normally be reused unchanged unless existing ownership cannot detect the encoding regression. A new permanent test requires a specific coverage-gap justification.

## Preserve

Do not change:

- `structuredCloseAdvanceService.ts`;
- `closeAdvanceContracts.ts`;
- execution completion;
- integration service;
- SQL lifecycle state;
- Project close behavior;
- Phase Repair behavior;
- RWS06A–H behavior;
- RWS06J preparation;
- unrelated dirty worktree files.

## Regression proof

Prove:

1. both production files can be read by the repository source reader as valid UTF-8;
2. neither file contains Unicode replacement character `�`;
3. TypeScript/build parsing succeeds for the repaired source;
4. existing focused Close / Advance renderer proof still passes;
5. existing RWS06I focused SQL close/advance lifecycle proof remains unchanged.

Do not substitute broad-suite success for this bounded source-integrity proof.

## Validation

Run:

- validation planner preview with exactly the two production paths plus any existing test file actually changed;
- repair profile / affected validation selected by those paths;
- focused Close / Advance shell test owner;
- production build if selected by validation policy;
- `git diff --check`;
- explicit text search confirming no `�` remains in the two repaired files.

Report unrelated failures separately.

## Acceptance criteria

RWS06I-REPAIR01 passes when:

1. both Close / Advance renderer source files are valid UTF-8;
2. no replacement/corruption character remains;
3. repository tooling can inspect both files normally;
4. no RWS06I runtime behavior changes;
5. focused Close / Advance proof passes;
6. changed-path scope remains bounded to this repair.

## Implementer Report

Write:

`docs/implementation-bundles/renderer-workspace-shells/Implementer_Reports/RWS06I_REPAIR01_IMPLEMENTER_REPORT.md`

Include:

- confirmed encoding defect;
- exact files changed;
- textual normalization performed;
- proof the files are valid/readable UTF-8;
- focused regression commands/results;
- tests reused/modified/added with coverage-gap justification;
- unrelated failures;
- deviations or blockers.

## Checkpoint and return path

Commit:

`RWS06I-R01 restore close advance UTF-8 source integrity`

After the bounded repair and proof, return to the existing RWS06 bundle/J qualification workflow. No new approval gate is created by this card.
