# ISSUE_001-FC02 — Issue Resolution Shell, Issue Discovery, and Intake

## Governing Evidence

Read and preserve:

- `issues/ISSUE_001/ISSUE_RECORD.md`
- `issues/ISSUE_001/ARCHITECT_INVESTIGATION.md`
- `issues/ISSUE_001/ISSUE_RESOLUTION_PLAN.md`
- `issues/ISSUE_001/FIX_CARD_PLAN.md`
- `planning/project/Design_Documents/WORKFLOW_HUB_ARCHITECTURE.md`
- `planning/project/Design_Documents/MULTI_WORKFLOW_ORCHESTRATION_ARCHITECTURE.md`
- `planning/project/Design_Documents/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md`
- validated `ISSUE_001-FC01` Workflow Hub implementation.

## Verified Current State

Current repository state confirms:

- FC01 established shell-level `workflow-hub | workflow | settings` navigation above Development;
- `src/shared/workflowHubContracts.ts` currently registers only `development`;
- `src/renderer/app/App.tsx` renders Development's `NestedWorkflowRail` only when Development is foregrounded;
- project selection now lands on the Workflow Hub rather than invoking Development automatically;
- `issues/ISSUE_001/ISSUE_RECORD.md` already exists as a lightweight non-canonical Issue record;
- existing Development planning/document services remain Development-specific and must not become Issue Resolution authority merely for convenience.

## Objective

Establish Issue Resolution as the second functional peer workflow and implement the Issue Intake/current-Issue surface without implementing Architect Planning or later Issue/Fix Card lifecycle behavior.

After FC02, the Operator can enter Issue Resolution from the Hub, discover/select existing Issues, read an Issue Record, create a new lightweight Issue Record, return to the Hub, and use Settings without disturbing Development state.

## Architecture Decision

Issue Resolution is a peer workflow owned directly by the selected project.

```text
Workflow Hub
├── Development
└── Issue Resolution
```

Use stable workflow identity:

```text
issue-resolution
```

Do not add Issue Resolution stages to Development `workspaceDefinitions` and do not use `currentWorkflowService.ts` as Issue lifecycle authority.

Issue Resolution owns its own navigation. The parent Issue lifecycle is:

```text
Issue Intake
→ Architect Planning
→ Issue Planning
→ Fix Cards
→ Issue Validation
→ Issue Close
```

`Fix Cards` is a parent stage. When implemented later, it owns a nested Fix Card loop:

```text
Fix Card Map
→ Planning
→ Implement
→ Architect Review
→ Fix Card Validation
→ Repair
→ Close / Next
```

`Fix Card Validation` and `Issue Validation` are distinct authority points. Repair belongs to a failed/defective Fix Card implementation, not to aggregate Issue Validation.

FC02 makes only Issue Intake functional. It must establish the navigation structure without pretending later workspaces are implemented.

## Authorized Scope

Inspect/modify only what is needed for:

- workflow registry/entry support for `issue-resolution`;
- Issue-specific shell routing;
- Issue Resolution parent rail/navigation contract;
- Issue-specific sidebar presentation;
- Issue discovery/current-Issue projection;
- read-only presentation of existing `ISSUE_RECORD.md`;
- bounded New Issue creation through application-owned main/preload authority;
- focused tests for those behaviors.

Likely surfaces include:

- `src/shared/workflowHubContracts.ts`;
- `src/renderer/app/App.tsx`;
- `src/renderer/app/figma/FigmaSidebar.tsx`;
- new Issue Resolution renderer/service/shared-contract files;
- `src/main/main.ts` and `src/preload/index.ts` only for bounded Issue service IPC;
- existing repository path/write helpers where useful;
- `src/renderer/styles.css`;
- focused tests.

## Required Behavior

### 1. Register Issue Resolution

Extend the workflow registry to two functional workflows:

```text
development
issue-resolution
```

Issue Resolution card:

- label: `Issue Resolution`;
- description: plain-language problem/fix description;
- Bug or equivalent Lucide icon;
- tags such as `Investigate`, `Fix`, `Verify`;
- entry action: `Open Issue Resolution`.

Do not add placeholder Feature/UI/Graphics/Brainstorm workflows.

### 2. Enter Issue Resolution independently

Selecting Issue Resolution must:

1. set the foreground workflow to `issue-resolution`;
2. load Issue-specific inventory/current-Issue state;
3. render Issue-specific navigation and Intake;
4. not invoke Development resolver/current-workflow authority to determine Issue navigation;
5. not mutate Development artifacts or lifecycle state.

Returning to Development later continues to use the existing Development resolver.

### 3. Issue Resolution navigation

Create an Issue-specific parent rail with:

```text
01 Intake
02 Architect Planning
03 Issue Planning
04 Fix Cards
05 Issue Validation
06 Issue Close
```

FC02 rules:

- Intake is functional/current;
- later parent stages are visible but unavailable/non-navigable;
- unavailable stages do not create placeholder artifacts or fake status;
- `NestedWorkflowRail` does not render in Issue Resolution;
- no Development Phase/Work Card semantics appear in this rail.

The rail/navigation contract must also define the nested Fix Card loop that later cards will activate beneath `Fix Cards`:

```text
Fix Card Map
Planning
Implement
Architect Review
Fix Card Validation
Repair
Close / Next
```

FC02 does not implement those nested workspaces, but it must not define a lifecycle model that omits or collapses them.

### 4. Issue-specific sidebar

While Issue Resolution is foregrounded, show:

- `Workflows` return control;
- current project;
- `Current Issue` ID/title or `No issue selected`;
- Settings;
- Theme.

Do not show Current Phase, Current Work Card, or Development loop state.

### 5. Discover Issues

Application-owned Issue discovery must inspect only immediate project-owned directories beneath `issues/` matching:

```text
ISSUE_<numeric id>
```

Requirements:

- deterministic numeric ordering;
- ignore unrelated files/directories;
- do not scan `planning/` or `repair/` for Issue ownership;
- do not follow path traversal/symlink escape outside the selected repository;
- use `ISSUE_RECORD.md` when present;
- extract a readable title from the H1 when possible, otherwise fall back to Issue ID;
- surface missing/unreadable record state without rewriting it;
- do not infer severity, priority, assignee, SLA, Open/Resolved, or other lifecycle state in FC02.

### 6. Select current Issue

- If Issues exist and no valid session selection exists, select the highest numeric Issue by default.
- `ISSUE_001` therefore opens by default in the current repository when it is the only Issue.
- Preserve the selected Issue when moving Issue Resolution → Hub → Issue Resolution during the same session.
- Preserve it when entering Development and later returning through the Hub.
- Changing or clearing project clears Issue inventory/selection from the prior project.

Selection is UI/session state, not repository lifecycle authority.

### 7. Present existing Issue Record

For the selected Issue:

- show Issue ID/title and record path;
- render `ISSUE_RECORD.md` read-only using existing Markdown presentation where practical;
- surface read/missing errors clearly;
- opening/discovering the record must not rewrite, normalize, canonicalize, or add metadata to it as a side effect.

Editing/deleting/renaming existing Issues is outside FC02.

Do **not** introduce a pre/post hash or byte-identity gate for the bootstrap Issue Record. The behavioral requirement is simply that read/discovery actions do not write to existing Issue records.

### 8. Create a new lightweight Issue

Provide `New Issue` with these bounded fields:

- Title — required;
- Issue — required;
- Current Consequence — required;
- Needed Capability / Expected Outcome — optional;
- Discovery Context — optional.

Do not ask for root cause, implementation files, Fix Card decomposition, severity, assignee, sprint, SLA, or technical solution.

On submit, application-owned main/service authority must:

1. inspect existing numeric Issue directories;
2. allocate highest ID + 1;
3. format at least three digits (`ISSUE_002` etc.);
4. create `issues/<ISSUE_ID>/ISSUE_RECORD.md` with overwrite disabled;
5. refresh discovery and select the new Issue.

Created Markdown is intentionally lightweight, not canonical lifecycle metadata:

```text
# ISSUE_NNN — <Title>

## Issue
...

## Current Consequence
...

## Needed Capability
...

## Discovery Context
...

## Status
Issue recorded. Architect Planning pending.
```

Optional empty sections may be omitted. Do not create sidecars or later lifecycle artifacts.

### 9. Discovery context is not causal parentage

Narrative Discovery Context may mention Development, a Phase, or Work Card. Do not turn that into:

- Phase/Work Card parentage;
- Repair identity;
- failed Development disposition;
- Development Validation linkage.

The Issue belongs directly to the project.

### 10. Workflow state isolation

While Issue Resolution is foregrounded:

- no Development-only workspace body or rail renders because a remembered Development `activeWorkspaceId` exists;
- Development-only polling/effects do not continue invoking Work Card/Architect/Project Planning lifecycle actions as hidden workflow authority;
- shell-level Agent Harness status may continue;
- entering Issue Resolution does not clear/reset Development lifecycle state.

### 11. Workflows and Settings round trips

Support:

```text
Issue Resolution → Workflows → same Issue selection on return
Issue Resolution → Settings → same Issue Resolution Intake/selection
Workflow Hub → Settings → Workflow Hub
Development → Settings → same Development workspace
```

Settings return must preserve the actual peer workflow caller rather than assuming only Hub or Development exist.

## Preservation Requirements

Preserve:

- validated FC01 Hub and Development entry/return behavior;
- Development project/phase/Work Card/Repair/validation/close behavior;
- Development state while Issue Resolution is foregrounded;
- existing Issue records from incidental discovery/read writes;
- selected-project authority;
- Settings/theme behavior;
- Agent Harness, MCP, Codex App Server, execution, and catastrophic host-action guard behavior;
- existing planning/repair artifact paths.

## Forbidden Changes

FC02 does not authorize:

- Architect Planning or `ARCHITECT_INVESTIGATION.md` generation;
- Issue Resolution Planning / Fix Card Plan generation;
- Fix Card Planning, Implement, Review, Fix Card Validation, Repair, or Close/Next implementation;
- Issue Validation or Issue Close implementation;
- canonical Issue schema/database/JSON sidecar/hidden lifecycle store;
- editing/deleting/renaming/migrating existing Issues;
- ingestion of `issues/` into Development planning-document resolver/classifier;
- generic workflow-engine/BPMN infrastructure;
- Issue queue/ticketing/assignment/severity/SLA/sprint features;
- new repository/Git/execution/evidence/MCP/agent-session subsystem;
- new package dependencies unless separately approved;
- unnecessary dependency restoration;
- terminating active ChampCity for implementation/validation;
- Git mutation.

## Acceptance Criteria

1. Hub exposes exactly `development` and `issue-resolution` as functional peer workflows.
2. Issue Resolution opens without using Development lifecycle resolver authority for Issue navigation.
3. Issue Resolution renders its own parent rail: Intake, Architect Planning, Issue Planning, Fix Cards, Issue Validation, Issue Close; only Intake is functional in FC02.
4. The Issue navigation contract explicitly retains a nested Fix Card loop with Fix Card Validation, Repair, and Close/Next as distinct later steps.
5. Development `NestedWorkflowRail`, Current Phase, Current Work Card, and Development lifecycle state are absent from Issue Resolution presentation.
6. Existing `ISSUE_001` is discovered and its record is presented read-only without a discovery/open write side effect.
7. Default/current Issue selection and cross-Hub/Development session preservation work as specified; project switching clears prior Issue state.
8. New Issue creates only the next `issues/ISSUE_NNN/ISSUE_RECORD.md` through application-owned authority with overwrite disabled.
9. New Issue content does not create automatic Development/Repair parentage or canonical sidecars.
10. Renderer receives no generic filesystem write capability.
11. Development-specific background lifecycle effects do not operate as hidden authority while Issue Resolution is foregrounded.
12. Settings and Workflows return to the correct peer workflow state.
13. Dark/Light and normal/narrow layouts remain usable.
14. No FC03–FC09 functionality or unrelated workflow subsystem is implemented.

## Tests and Validation

Add focused coverage, preferably:

```text
test/issue-resolution/issue-resolution-service.test.cjs
test/renderer/issue-resolution-shell.test.cjs
```

Update FC01 Hub tests only where the functional registry intentionally changes from one workflow to two.

Run and report:

```text
npm run build
node --test test/issue-resolution/issue-resolution-service.test.cjs
node --test test/renderer/issue-resolution-shell.test.cjs
node --test test/renderer/workflow-hub-shell.test.cjs
node --test test/renderer/figma-redesign-shell.test.cjs
node --test test/renderer/agent-harness-settings-workspace.test.cjs
node --test test/lifecycle/nested-lifecycle.test.cjs
```

Use focused tests at the smallest relevant boundary. Broader unrelated failures are evidence to classify, not automatic FC02 blockers.

## Implementer Report

Write:

`issues/ISSUE_001/Implementer_Reports/IMPLEMENTER_REPORT_ISSUE_001-FC02_issue_resolution_shell_issue_discovery_and_intake.md`

Report:

- repository state inspected;
- files changed;
- Issue service discovery/create path;
- peer-workflow and rail ownership implementation;
- proof that Issue entry does not invoke Development authority;
- proof that existing Issue discovery/read does not write the record;
- temporary-fixture proof for next-ID allocation and overwrite protection;
- workflow/Settings state-isolation proof;
- exact test/build results;
- deviations/blockers;
- Operator live-validation steps.

## Operator Live Validation

Verify:

1. Hub shows Development and Issue Resolution cards.
2. Enter Issue Resolution and confirm Issue-specific rail/sidebar, with no Development rail/state.
3. Confirm `ISSUE_001` is selected and readable.
4. Hub round-trip preserves selected Issue.
5. Development round-trip preserves both Development state and selected Issue.
6. Settings returns to Issue Resolution when opened from Issue Resolution.
7. Create one test Issue only if the Operator wants to validate real-repository creation; automated tests should use temporary repositories.
8. Check Dark/Light and narrow/normal layout.

## Return Path

After implementation, return FC02 for Architect code/evidence review and Operator validation. If passed, proceed to `ISSUE_001-FC03` through the manual bootstrap path. Do not implement FC03 opportunistically.
