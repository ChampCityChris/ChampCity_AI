# ISSUE_001-FC03 — Issue Architect Planning

## Governing Evidence

Read and preserve:

- `issues/ISSUE_001/ISSUE_RECORD.md`
- `issues/ISSUE_001/ARCHITECT_INVESTIGATION.md`
- `issues/ISSUE_001/ISSUE_RESOLUTION_PLAN.md`
- `issues/ISSUE_001/FIX_CARD_PLAN.md`
- validated FC02 Fix Card and Implementer Report
- `planning/project/Design_Documents/MULTI_WORKFLOW_ORCHESTRATION_ARCHITECTURE.md`
- `planning/project/Design_Documents/WORKFLOW_HUB_ARCHITECTURE.md`
- `planning/project/Design_Documents/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md`

## Verified Current State

Repository inspection confirms:

- FC02 provides peer workflow `issue-resolution`, Issue discovery/current-Issue selection, Issue Intake, and the Issue-specific parent rail.
- only Intake is currently functional; Architect Planning is present but unavailable.
- `src/main/issueResolution/issueResolutionService.ts` owns Issue-domain filesystem behavior outside the Development planning resolver.
- the existing embedded ChatGPT/browser foundation can be reused, but `App.tsx` currently attaches it only to Development Architect-enabled surfaces.
- the existing Development Architect-output workspace service is coupled to Development `WorkspaceId`, `listPlanningDocuments(...)`, canonical planning slots, and Development disposition behavior. Do not use that coupling as Issue lifecycle authority.
- `src/main/integrations/mcpWorkspacePromptContract.ts` already owns the MCP workspace-binding block and live `artifact_toolbox.write_markdown_artifact` invocation shape.
- `issues/ISSUE_001/ARCHITECT_INVESTIGATION.md` is the bootstrap example of the required plain-Markdown Issue Architect output.

## Objective

Make **Architect Planning** the second functional Issue Resolution stage.

For a selected readable Issue, the Operator must be able to open an Issue-specific Architect Planning workspace, use the existing embedded Browser GPT/ChatGPT surface to inspect the selected repository through ChampCity MCP, and produce the Issue-owned:

`issues/<ISSUE_ID>/ARCHITECT_INVESTIGATION.md`

Do this without introducing Development Phase/Work Card parentage, a second browser subsystem, or an unnecessary formal approval gate.

## Architecture Decisions

### Issue-owned stage

Ownership is:

```text
Selected Project
→ Issue Resolution
→ selected ISSUE_NNN
→ Architect Planning
→ ARCHITECT_INVESTIGATION.md
```

Do not add Issue Architect Planning to Development `workspaceDefinitions`, `NestedWorkflowRail`, `currentWorkflowService.ts`, or the Development planning-document classifier/resolver.

### Reuse shared Browser/MCP infrastructure

Reuse the existing embedded browser foundation, bounds/reload/retry behavior, clipboard pattern, MCP workspace-binding helpers, and `artifact_toolbox.write_markdown_artifact` contract.

Use a bounded Issue-specific Architect Planning service/projection rather than forcing Issue artifacts through Development Architect-output authority.

### Temporary draft → application-owned final

Browser GPT writes only a temporary body-only draft under the Issue domain, for example:

`issues/Architect_Drafts/<submission-id>/architect-investigation.md`

using `artifact_toolbox.write_markdown_artifact` with `overwrite: false`.

ChampCity validates that exact prepared draft and promotes it to:

`issues/<ISSUE_ID>/ARCHITECT_INVESTIGATION.md`

with overwrite disabled, then cleans the successful temporary submission when safe.

Do not create canonical metadata, JSON sidecars, or Development dispositions for this plain Issue artifact.

### No ordinary-judgment approval gate

Browser GPT may ask one material Operator question at a time only when a genuine Operator-owned choice remains. Repository evidence and normal Architect judgment do not require additional approval questions.

Once material choices are resolved, the Architect completes the investigation. FC04 owns Issue Planning.

## Authorized Scope

Expected surfaces:

- `src/shared/issueResolutionContracts.ts`
- `src/main/issueResolution/*`
- `src/main/integrations/mcpWorkspacePromptContract.ts` only for shared-helper reuse/narrow extension
- `src/main/main.ts`
- `src/preload/index.ts`
- typed shared IPC contracts
- `src/renderer/app/App.tsx`
- `src/renderer/app/IssueResolutionRail.tsx`
- one bounded Issue Architect Planning renderer component
- existing embedded Architect browser components/coordination only as needed for reuse
- `src/renderer/styles.css`
- focused tests

Do not redesign Development Architect outputs or the Workflow Hub.

## Required Behavior

### 1. Architect Planning navigation

After FC03:

```text
01 Intake              functional
02 Architect Planning  functional for a selected readable Issue
03 Issue Planning      unavailable
04 Fix Cards           unavailable
05 Issue Validation    unavailable
06 Issue Close         unavailable
```

- Intake remains navigable.
- Architect Planning is unavailable when no Issue is selected or its Issue Record is unreadable/missing.
- switching Intake ↔ Architect Planning preserves current Issue selection.
- Hub/Settings round trips preserve the selected Issue/current Issue stage during the same project/session.
- project change/clear removes the prior project's Issue Architect state.
- Issue navigation never invokes the Development resolver.

### 2. Architect Planning workspace

Show:

- Issue ID/title and source `ISSUE_RECORD.md` path;
- read-only Issue evidence;
- Architect Planning status;
- final `ARCHITECT_INVESTIGATION.md` target path;
- Prepare Handoff / Copy Handoff controls when no investigation exists;
- the existing embedded ChatGPT/Browser GPT surface with existing reload/retry behavior;
- an existing `ARCHITECT_INVESTIGATION.md` read-only when present.

Do not show Development Phase/Work Card status, Development disposition controls, or Development Architect-output slots.

### 3. Existing investigation

Recognize the regular file:

`issues/<ISSUE_ID>/ARCHITECT_INVESTIGATION.md`

When present:

- present it read-only;
- treat Architect Planning as completed for presentation;
- do not rewrite, canonicalize, regenerate, or overwrite it by opening the workspace.

`ISSUE_001/ARCHITECT_INVESTIGATION.md` must work without migration.

### 4. Prepare / Copy Handoff

Prepare Handoff must generate an Issue-specific Browser GPT instruction containing:

- the shared MCP workspace binding block;
- exact Issue ID and `ISSUE_RECORD.md` source path;
- exact final investigation path;
- exact temporary draft path;
- direction to inspect relevant production/runtime/test evidence through the bound ChampCity MCP workspace;
- required output structure below;
- the exact `artifact_toolbox.write_markdown_artifact` invocation using the bound `workspaceId`, temporary path, complete body, and `overwrite: false`.

Prepare does not create the final investigation.

Copy Handoff copies only the currently prepared instruction using the existing application clipboard pattern. If none exists, fail clearly.

### 5. Browser GPT investigation contract

The handoff must instruct the Architect to:

1. read the exact Issue Record;
2. inspect the complete relevant repository/runtime path through the bound MCP workspace;
3. determine whether the Issue is confirmed, unsupported/not confirmed, or should be reframed as Feature/Development work;
4. identify root cause when confirmed instead of restating the symptom;
5. identify relevant current authority/architecture;
6. state correction direction without prematurely decomposing Fix Cards;
7. protect accepted behavior/authority;
8. identify material risks/constraints;
9. distinguish verified evidence from Issue claims/inference;
10. ask only genuinely material Operator questions, then create the draft when resolved.

Require body-only Markdown:

```text
# ISSUE_NNN — Architect Investigation

## Purpose
## Issue Assessment
## Repository Evidence Inspected
## Confirmed Current Architecture
## Root Cause
## Required Architecture
## Preservation Rules
## Risks and Constraints
## Architect Conclusion
```

`Architect Conclusion` states whether to proceed to Issue Planning, stop because the Issue is unsupported, or reframe into another workflow.

Do not include canonical metadata, Development parentage, or placeholder text.

### 6. Draft validation/promotion

Track only the active prepared submission and exact expected temporary draft.

Before promotion require:

- substantive Markdown;
- correct selected-Issue H1;
- all required H2 sections;
- no application metadata delimiters or obviously empty placeholder sections.

Then:

- atomically promote/write to the exact final investigation path with overwrite disabled;
- never ingest unrelated files from `issues/Architect_Drafts/`;
- never overwrite an existing final investigation;
- clean a successful temporary submission when safe;
- surface validation/promotion failure without changing Issue Record or Development state;
- allow retry through a fresh prepared submission rather than requiring manual internal-draft repair.

### 7. Embedded browser and workflow isolation

While Issue Architect Planning is foregrounded:

- attach the existing Architect browser to the Issue workspace host;
- reuse current show/hide/bounds/reload/retry/cleanup infrastructure;
- leaving Architect Planning detaches/hides it through existing cleanup behavior;
- do not create a second BrowserView/session/provider;
- do not activate Development Architect-output polling, Work Card projections, or Development lifecycle actions because a Development `activeWorkspaceId` remains remembered.

When an investigation exists, Issue Planning remains unavailable until FC04.

## Preservation Requirements

Preserve:

- validated FC01 Hub behavior;
- validated FC02 Issue shell, Intake, discovery, selection, parent rail, nested Fix Card loop contract, and peer-workflow Settings/Hub behavior;
- Development project/phase/Work Card/Repair/validation/close authority;
- existing embedded Architect browser behavior in Development;
- MCP workspace binding and live artifact-tool contract;
- existing Issue records/investigations from incidental read/open writes;
- Agent Harness/Codex/execution/catastrophic-host-action behavior;
- current planning/repair artifact paths.

## Forbidden Changes

FC03 does not authorize:

- Issue Resolution Planning, Fix Card Plan, or Fix Card creation;
- Fix Card Implement/Review/Validation/Repair/Close;
- Issue Validation or Issue Close;
- ingestion of `issues/` into Development planning/current-workflow authority;
- making Development `productionArchitectOutputCatalog` a fake Issue lifecycle registry if that requires Development planning semantics;
- direct Browser GPT writes to final `ARCHITECT_INVESTIGATION.md`;
- a second browser/provider/session subsystem;
- canonical Issue schema/database/JSON sidecars;
- a formal approval/disposition gate for ordinary Architect Investigation output;
- editing/deleting/renaming existing Issue artifacts;
- generic workflow-engine infrastructure;
- unrelated workflow implementations;
- new dependencies unless separately approved;
- unnecessary dependency restoration;
- terminating active ChampCity for validation;
- Git mutation.

## Acceptance Criteria

1. Intake and Architect Planning are functional Issue stages; later stages remain unavailable.
2. Architect Planning requires a selected readable Issue and does not require Development Phase/Work Card state.
3. Issue Architect Planning does not invoke Development resolver/current-workflow authority or render Development navigation/state.
4. The workspace shows current Issue evidence, Architect state/target/actions, and the existing embedded ChatGPT surface.
5. Existing `ISSUE_001/ARCHITECT_INVESTIGATION.md` is consumed read-only without migration or incidental rewrite.
6. Prepare Handoff contains exact Issue source/target, MCP binding, repository-inspection contract, required output headings, exact temporary draft path, and live `artifact_toolbox.write_markdown_artifact` invocation with `overwrite: false`.
7. Copy Handoff uses only the current prepared instruction and clearly fails if none exists.
8. The Architect prompt requires evidence inspection, assessment/root cause/architecture/preservation, and only material Operator questions.
9. Browser GPT is instructed to write only the temporary draft, never the final investigation directly.
10. A valid draft promotes atomically to the exact Issue final path; invalid/unrelated drafts do not promote; existing finals are never overwritten.
11. Promotion creates no canonical metadata, sidecar, Development disposition/parentage, or FC04 artifact.
12. Invalid promotion is visible and retryable through a fresh submission without corrupting Issue/Development state.
13. The existing embedded browser foundation is reused with no second browser subsystem.
14. Development-only Architect/Work Card polling remains inactive while Issue Architect Planning is foregrounded.
15. Settings/Hub/Intake round trips preserve valid Issue Architect context; project switching clears prior-project Issue context.
16. Existing Development plus FC01/FC02 behavior remains intact.
17. No FC04–FC09 functionality is implemented.

## Tests and Validation

Add focused tests, preferably:

```text
test/issue-resolution/issue-architect-planning-service.test.cjs
test/renderer/issue-architect-planning-workspace.test.cjs
```

Update existing Issue shell tests only where Architect Planning intentionally becomes functional.

Run and report:

```text
npm run build
node --test test/issue-resolution/issue-architect-planning-service.test.cjs
node --test test/renderer/issue-architect-planning-workspace.test.cjs
node --test test/issue-resolution/issue-resolution-service.test.cjs
node --test test/renderer/issue-resolution-shell.test.cjs
node --test test/renderer/workflow-hub-shell.test.cjs
node --test test/renderer/agent-harness-settings-workspace.test.cjs
node --test test/lifecycle/nested-lifecycle.test.cjs
```

Run one additional existing Architect-browser test only if needed to prove shared browser reuse.

Tests are evidence, not independent authority. Classify unrelated failures by causal relevance. Do not use the full historical suite as an FC03 gate without a concrete FC03 integration reason.

## Implementer Report

Write:

`issues/ISSUE_001/Implementer_Reports/IMPLEMENTER_REPORT_ISSUE_001-FC03_issue_architect_planning.md`

Include:

- repository state and files changed;
- Issue Architect service/projection and navigation path;
- proof Issue Architect Planning is not Development planning/current-workflow authority;
- embedded-browser reuse path;
- exact MCP handoff/temp-draft/final-promotion model;
- proof existing `ISSUE_001/ARCHITECT_INVESTIGATION.md` is read-only;
- temporary-fixture proof for valid promotion, invalid-draft rejection, overwrite protection, and retry;
- proof the prompt never directs Browser GPT to the final path;
- proof Development-only lifecycle polling is inactive in Issue Architect Planning;
- exact commands/results, deviations/blockers, causally classified unrelated failures, and remaining live validation.

## Operator Live Validation

Confirm:

1. `ISSUE_001` moves between Intake and Architect Planning and displays its existing investigation correctly.
2. an Issue without an investigation shows Prepare/Copy Handoff and the embedded ChatGPT surface.
3. the prepared prompt is Issue-specific, not Development Phase/Work Card language.
4. Settings/Workflows return to the correct Issue Architect context.
5. entering Development and returning preserves both workflows' state.
6. Dark/Light and normal/narrow layouts remain usable.

A real new Architect Investigation need not be created solely for visual validation if fixture proof covers promotion and the Operator does not want a durable test artifact.

## Return Path

Return FC03 for Architect code/evidence review and Operator live validation.

If FC03 passes, proceed to `ISSUE_001-FC04`. Do not implement Issue Planning opportunistically inside FC03.
