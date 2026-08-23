# RECONSTRUCTION-REPAIR01-REPAIR04 — Prompt-to-Harness Tool Contract Parity

## Repair Type

Temporary pre-dogfood reconstruction repair derived from failed Operator live Project Planning execution after RECONSTRUCTION-REPAIR01-REPAIR03.

This repair is intentionally bounded to MCP tool-call contract drift between ChampCity A/I generated prompts/handoffs and the A/I-owned Agent Harness public tool registry.

## Governing Standard

`planning/project/Design_Documents/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md`

## Parent / Failed Operator Validation

Parent reconstruction repair chain:

- `repair/RECONSTRUCTION_REPAIR01_single_workflow_authority_and_context_document_projection.md`
- `repair/RECONSTRUCTION_REPAIR01-REPAIR01_delete_duplicate_project_planning_authority.md`
- `repair/RECONSTRUCTION_REPAIR01-REPAIR02_project_planning_blocker_banner_presentation.md`
- `repair/RECONSTRUCTION_REPAIR01-REPAIR03_project_planning_gate_boundary_and_baseline_canonical_correction.md`

Operator live Project Planning reached the Architect draft-write step successfully, prepared both complete Project Profile and Project Roadmap bodies, then failed both required MCP calls with:

```text
MCP error -32602: Input validation error: Invalid arguments for tool artifact_toolbox: Invalid input
```

The generated Project Planning instruction required:

```text
artifact_toolbox.create_markdown_artifact
```

The running ChampCity A/I Harness exposes:

```text
artifact_toolbox.write_markdown_artifact
```

The Architect correctly refused to use a legacy/manual fallback and left the draft bundle incomplete.

## Verified Live Harness Tool Inventory

The current running A/I Harness exposes these public toolbox actions:

```text
repo_toolbox
- status
- list_files
- read_file
- inspect_text_file
- read_text_chunk
- read_text_lines
- read_markdown_section
- search_files
- write_markdown_artifact
- write_json_artifact
- propose_patch
- apply_approved_patch

git_toolbox
- status
- diff
- pre_commit_scan
- readiness_summary
- inspect_history
- prepare_branch
- stage_changes
- commit
- push
- integrate_to_dev

artifact_toolbox
- status
- write_markdown_artifact
- write_json_artifact

diagnostics_toolbox
- status
- list_workspaces
- tool_inventory

integration_toolbox
- status

browser_toolbox
- status

knowledge_toolbox
- status

workspace_write_attached_image
- write_attached_image
```

## Full Prompt/Tool Audit Result

Repository-wide inspection of current production prompt/handoff source found only two explicit `toolbox.action` references:

1. `diagnostics_toolbox.list_workspaces` — **VALID** against the live Harness.
2. `artifact_toolbox.create_markdown_artifact` — **INVALID** against the live Harness.

No production prompt currently names actions on `repo_toolbox`, `git_toolbox`, `integration_toolbox`, `browser_toolbox`, `knowledge_toolbox`, or `workspace_write_attached_image`.

The retired names below are not present in production prompt source and must remain retired:

```text
submit_handoff_outputs
save_project_planning_outputs
save_architect_interview_output
```

Therefore this repair does not authorize invention of additional tool names. It corrects the one confirmed stale action family everywhere it is generated and adds parity proof for future prompt/tool changes.

## Confirmed Root Cause

The A/I Harness port standardized generic Markdown persistence on:

```text
artifact_toolbox.write_markdown_artifact
```

with params:

```json
{
  "relativePath": "<repo-relative .md path>",
  "content": "<Markdown content>",
  "overwrite": false
}
```

However the application-owned MCP prompt helper remained on the prior contract:

`src/main/integrations/mcpWorkspacePromptContract.ts`

```text
buildCreateMarkdownArtifactJsonBlock()
action: "create_markdown_artifact"
```

Every Architect-output flow that reused or duplicated that old wording now instructs Browser ChatGPT to call an action the current A/I Harness does not expose.

This is prompt/tool contract drift. It is not a Project Planning workflow defect and it is not an OAuth/routing defect.

## Required Architecture Decision

The canonical Markdown draft-write action for current A/I MCP prompts is:

```text
artifact_toolbox.write_markdown_artifact
```

The required invocation shape is:

```json
{
  "action": "write_markdown_artifact",
  "workspaceId": "<bound workspaceId>",
  "params": {
    "relativePath": "<exact temporary body-only draft path>",
    "content": "<complete body-only Markdown>",
    "overwrite": false
  }
}
```

ChampCity A/I continues to own canonical metadata, final canonical target paths, source revisions, validation, atomic promotion, cleanup, and review/disposition state.

`write_markdown_artifact` writes only the temporary Architect body-only draft identified by the prepared submission. It does not transfer canonical authority to the model.

### Explicit non-solution

Do **not** add `create_markdown_artifact` as a compatibility alias in the Harness.

There must not be two public names for the same draft-write capability merely to preserve stale prompt text. The prompts must conform to the actual current A/I-owned public tool contract.

Do **not** switch Architect prompts to `repo_toolbox.write_markdown_artifact`; the Architect-output draft contract uses `artifact_toolbox.write_markdown_artifact`.

## Exact Production Source Corrections

### A. Shared MCP prompt contract

Modify:

`src/main/integrations/mcpWorkspacePromptContract.ts`

Required changes:

1. Rename:

```text
buildCreateMarkdownArtifactJsonBlock
```

to:

```text
buildWriteMarkdownArtifactJsonBlock
```

2. Change the generated JSON action from:

```text
create_markdown_artifact
```

to:

```text
write_markdown_artifact
```

3. Preserve the existing params exactly:

```text
relativePath
content
overwrite: false
```

4. Preserve exact bound `workspaceId` behavior.

### B. Project Architect Interview prompt sources

Update all stale references/imports in:

- `src/main/architectInterview/architectInterviewDraftPilot.ts`
- `src/main/architectInterview/projectArchitectInterviewPromptWriter.ts`

The conversational interview handoff must remain non-writing. Only the finalization/draft handoff may instruct the Markdown write.

### C. Project Planning prompt sources

Update all stale references/imports in:

- `src/main/projectPlanning/projectPlanningDraftBundle.ts`
- `src/main/projectPlanning/projectPlanningService.ts`

Both Project Profile and Project Roadmap temporary draft invocations must use `artifact_toolbox.write_markdown_artifact`.

Do not change atomic bundle semantics.

### D. Phase Map prompt sources

Update all stale references/imports in:

- `src/main/phaseMap/phaseMapDraftOutput.ts`
- `src/main/phaseMap/phaseMapService.ts`

### E. Phase Interview prompt source

Update stale final-draft references/imports in:

- `src/main/phaseInterview/phaseInterviewDraftOutput.ts`

Do not add a write call to the conversational interview handoff before the finalization step.

### F. Phase Planning prompt sources

Update all stale references/imports in:

- `src/main/phasePlanning/phasePlanningDraftBundle.ts`
- `src/main/phasePlanning/phasePlanningService.ts`

Both Phase Planning and Work Card Plan temporary drafts must use the current action.

### G. Formal Work Card prompt source

Update stale references/imports in:

- `src/main/workCardPlanning/workCardPlanningService.ts`

The exact temporary Formal Work Card draft remains body-only and non-overwriting.

### H. Repair Work Card prompt source

Update stale references/imports in:

- `src/main/workCardRepair/workCardRepairService.ts`

The exact temporary Repair Work Card draft remains body-only and non-overwriting.

## Existing Generated Planning Artifact

The current Approved artifact:

`planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_champcity_a_i.md`

contains a generated reference to the old action.

Do **not** manually revise this Approved current planning artifact in this repair. Changing it would create an unrelated canonical planning revision/freshness consequence during reconstruction.

It is evidence of the old generated contract. Future prompt generation from corrected production source must emit the current action.

## Required Test Corrections

Update tests that positively expect `create_markdown_artifact` to expect `write_markdown_artifact`, including as applicable:

- `test/architect-interview/architect-interview-workspace.test.cjs`
- `test/architect-outputs/architect-output-prompt-contracts.test.cjs`
- `test/architect-outputs/architect-output-workspace-repair.test.cjs`
- `test/project-intake/project-intake-service.test.cjs`
- `test/project-planning/project-planning-service.test.cjs`
- `test/phase-map/phase-map-service.test.cjs`

Preserve tests that correctly prove the conversational Architect/Phase Interview handoffs contain **no** draft-write action before finalization.

Any test currently asserting that a final draft handoff must *not* contain `write_markdown_artifact` because the former contract expected `create_markdown_artifact` must be corrected.

## Required Prompt-to-Live-Tool Parity Regression

Add a focused regression under the existing Architect-output prompt contract test surface, or a new narrowly named test file, that proves prompt/tool parity.

The test must use the production A/I Agent Harness registry as the action authority, via `createAgentHarnessToolRegistry(...).listTools("files.read files.write")` or an equivalent production contract projection.

Required proof:

1. Build the public toolbox/action inventory from production Harness code.
2. Generate the prepared/final draft instructions for every active production Architect-output flow represented by `productionArchitectOutputCatalog`:
   - Project Architect Interview finalization;
   - Project Planning;
   - Phase Map;
   - Phase Interview finalization;
   - Phase Planning bundle;
   - Formal Work Card;
   - Repair Work Card.
3. Extract every explicit `toolbox.action` reference from those generated instructions.
4. Assert every referenced toolbox exists in the production registry.
5. Assert every referenced action exists on that toolbox.
6. Assert all generated Markdown draft JSON invocation blocks use:

```text
artifact_toolbox
+ action = write_markdown_artifact
```

7. Assert no production generated instruction contains:

```text
artifact_toolbox.create_markdown_artifact
create_markdown_artifact
```

8. Preserve the valid `diagnostics_toolbox.list_workspaces` contract wherever it is intentionally included.

The parity regression must fail if a future prompt names an action that the live Harness does not expose.

## Source-Level Stale Contract Elimination

After implementation:

- there must be **zero** `create_markdown_artifact` references under `src/main/`;
- `buildCreateMarkdownArtifactJsonBlock` must no longer exist;
- all production prompt generators must use the renamed write helper/current action;
- no `create_markdown_artifact` alias may be added to `src/main/agentHarness/tools/toolRegistry.ts`.

Tests may mention the retired string only in explicit negative assertions proving it is absent.

## Required Acceptance Criteria

### AC1 — Live Project Planning action contract is corrected

A freshly generated Project Planning draft instruction must contain two invocations of:

```text
artifact_toolbox.write_markdown_artifact
```

with exact Project Profile and Project Roadmap temporary draft paths and `overwrite: false`.

It must not contain `create_markdown_artifact`.

### AC2 — All active Architect-output draft prompts use the live action

Every active production Architect-output draft/finalization instruction that writes a Markdown draft uses `artifact_toolbox.write_markdown_artifact` and the production invocation shape.

Conversational pre-finalization interview prompts remain non-writing.

### AC3 — Shared helper is renamed and current

`buildWriteMarkdownArtifactJsonBlock()` exists and emits `action: "write_markdown_artifact"`.

`buildCreateMarkdownArtifactJsonBlock()` does not exist.

### AC4 — No Harness alias or duplicate authority

The Agent Harness continues to expose exactly the current artifact writer contract. `artifact_toolbox.create_markdown_artifact` is not added.

### AC5 — Prompt/tool parity is automatically enforced

The new parity regression proves all explicit toolbox/action references emitted by active Architect-output prompts exist in the production Harness registry.

### AC6 — Existing draft/promotion authority is preserved

Temporary drafts remain body-only, repository-relative, non-overwriting writes. ChampCity A/I remains the sole owner of final canonical metadata, target paths, validation, revisioning, promotion, cleanup, and disposition.

### AC7 — Existing workspace binding contract is preserved

Every generated MCP JSON invocation continues to use the exact bound `workspaceId` supplied by `buildMcpWorkspaceBindingPromptBlock` / the shared binding contract.

### AC8 — Retired action names stay retired

Do not restore or emit:

```text
submit_handoff_outputs
save_project_planning_outputs
save_architect_interview_output
create_markdown_artifact
```

in production generated tool instructions.

## Preserved Passed Behavior

Preserve without redesign:

- RECONSTRUCTION-REPAIR01 through REPAIR03 behavior;
- Project Planning single authority and planning-only gate boundary;
- Project Planning blocker banner;
- Architect-output atomic/single draft promotion behavior;
- current OAuth/DCR/session behavior;
- current A/I MCP SDK transport;
- artifact toolbox `write_markdown_artifact` implementation and validation;
- repository/workspace binding rules;
- Agent Harness selected-project authority as currently implemented;
- current Interview conversational-finalization separation.

## Forbidden Changes

Do not:

- add `create_markdown_artifact` as an alias;
- add a second Markdown artifact writer;
- switch Architect-output drafts to `repo_toolbox.write_markdown_artifact`;
- change draft paths or final canonical targets;
- allow overwrite for Architect-output drafts;
- bypass the application-owned draft promotion service;
- manually rewrite the current Approved Project Architect Interview Prompt artifact;
- modify OAuth, MCP transport, workspace authority, Git, execution, or future Harness expansion;
- broaden this repair into tool redesign;
- perform Git stage/commit/push/branch mutation unless separately authorized by the Operator.

## Required Files / Areas to Inspect

At minimum inspect all files named in the Exact Production Source Corrections section plus:

- `src/main/agentHarness/tools/toolRegistry.ts`
- `src/main/architectOutputs/productionArchitectOutputCatalog.ts`
- `test/agent-harness/agent-harness-core.test.cjs`
- `test/architect-outputs/architect-output-prompt-contracts.test.cjs`

Use repository-wide search after implementation to prove stale production action references are gone.

## Focused Validation

Do not run the entire historical suite by default.

Required minimum validation:

```text
npm run typecheck
npm run build
node --test --test-concurrency=1 test/agent-harness/agent-harness-core.test.cjs test/architect-outputs/architect-output-prompt-contracts.test.cjs test/architect-outputs/architect-output-workspace-repair.test.cjs test/architect-interview/architect-interview-workspace.test.cjs test/project-intake/project-intake-service.test.cjs test/project-planning/project-planning-service.test.cjs test/phase-map/phase-map-service.test.cjs test/phase-interview/phase-interview-service.test.cjs test/phase-planning/phase-planning-service.test.cjs test/work-card-planning/work-card-planning-service.test.cjs test/work-card-repair/work-card-repair-service.test.cjs
```

If the parity regression is placed in a new dedicated test file, include it explicitly in the command and report it.

Also report source-search proof that `src/main/` contains zero `create_markdown_artifact` references after implementation.

## Required Implementer Report

Write:

`repair/Implementer_Reports/IMPLEMENTER_REPORT_RECONSTRUCTION_REPAIR01-REPAIR04_prompt_to_harness_tool_contract_parity.md`

The report must include:

- repository/branch/status verification;
- exact live Project Planning failure;
- live Harness tool inventory used as contract evidence;
- complete production prompt-source audit result;
- exact source files changed;
- proof of shared helper rename;
- proof all active Architect-output flows use `write_markdown_artifact`;
- parity regression design/result;
- proof `src/main/` contains zero stale `create_markdown_artifact` references;
- focused command results;
- deviations/blockers;
- remaining Operator live validation;
- confirmation of no Git mutation unless separately authorized.

## Required Operator Live Validation

After Architect review passes:

1. Restart/reload ChampCity A/I with the repaired build while the A/I Harness remains the active MCP server.
2. Return to Project Planning.
3. Prepare a fresh Project Planning draft handoff/submission.
4. Send the generated instruction to Browser ChatGPT.
5. Verify both temporary Project Profile and Project Roadmap drafts are created through `artifact_toolbox.write_markdown_artifact` without `-32602` input-validation failure.
6. Verify ChampCity A/I detects both drafts and promotes the atomic Project Planning bundle normally.
7. Continue normal Profile/Roadmap review.

Do not manually create the drafts or use legacy/fallback actions during validation.

## Return Path

After implementation, return this repair for Architect code review and then Operator live validation.

If it passes, continue Project Planning and archive/remove the temporary reconstruction repair artifacts as previously planned.
