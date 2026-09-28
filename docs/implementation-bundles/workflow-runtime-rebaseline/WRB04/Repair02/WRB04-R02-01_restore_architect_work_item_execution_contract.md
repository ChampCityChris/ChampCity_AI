# WRB04-R02-01 — Restore Architect WorkItem Execution-Contract Authority

**Parent:** WRB04 Repair02  
**Starting baseline:** `3d4399e563665afbd38426416d12a84989a51470`  
**Implementer:** GPT 6.0 Luna Medium

## Objective

Restore the missing Architect WorkItem-planning boundary between the accepted Work Item Map and Implementer execution.

Required lifecycle:

```text
accepted WorkItem
→ Architect execution-contract elaboration
→ optional typed decomposition
→ exact Implementer contract
→ Implementer
```

Do not create a second Plan engine.

## 1. Persist bounded execution planning in canonical SPS

Extend the existing WorkItem body with optional structured execution-planning fields using the existing registry field vocabulary.

Use bounded optional fields equivalent to:

- `implementationBoundaries: string[]`
- `affectedPaths: string[]`
- `proofIntent: string[]`

Absence means the WorkItem has not yet completed execution planning.

Requirements:

- implementation boundaries: 1..32 bounded text entries;
- proof intent: 1..32 bounded text entries;
- source-backed affected paths: 1..128 normalized repository-relative path entries;
- source-neutral affected paths must be empty;
- no absolute paths, drive-qualified paths, backslashes, `.`, `..`, runtime state, Git internals, dependency/build output, or secret paths;
- no raw Architect transcript or Markdown path becomes authority.

No migration rewrite is required for existing WorkItems; the optional fields are backward-compatible.

## 2. Add one typed WorkItem execution-plan acceptance command

Add an exact command equivalent to:

`acceptWorkItemExecutionPlan(projectId, workflowId, workItemId, expectedVersion, plan)`

Preflight:

- exact current Feature/Issue Workflow;
- exact current WorkItem in that Workflow;
- WorkItem state `planned|ready`;
- no ImplementationRecord;
- no TesterResult/Validation;
- no WorkItem/attempt SourceCheckpoint;
- no active Repair child;
- expected WorkItem version current;
- execution plan bounded and valid.

Success:

- revise only the exact WorkItem;
- preserve planning ownership, objective, dependencies, Criteria, Phase membership, and accepted solution;
- persist the execution-planning fields;
- increment WorkItem version;
- keep the WorkItem pre-execution.

Do not create a second approval entity. The accepted Architect execution contract is part of the exact WorkItem state.

## 3. Restore the Architect WorkItem planning UX

The normal shared Workspace must expose **Plan WorkItem** before **Run Implementer**.

Reuse the existing Architect/browser/handoff pattern where practical.

The Architect handoff must include:

- exact Workflow ID;
- exact WorkItem ID/version;
- WorkItem objective;
- accepted BoundedSolution;
- WorkItem Criteria;
- completion-relevant accepted-solution Criteria;
- Phase context;
- dependencies;
- solution scope/constraints;
- source-backed/source-neutral context;
- bounded current repository context when source-backed.

Ask the Architect to return:

- implementation boundaries;
- affected repository paths;
- focused proof intent;
- whether decomposition is required.

The normal UI must not require the Operator to manually author raw domain JSON as the primary planning experience.

A bounded structured import/debug fallback is acceptable.

## 4. Preserve the existing typed decomposition command

Keep the WRB04-06 exact decomposition path.

Integrate it into WorkItem planning:

- Architect may recommend decomposition;
- Operator reviews the bounded replacement/Criteria/dependency mapping;
- Apply uses the existing atomic typed `decomposeWorkItem` command;
- source WorkItem becomes historical;
- replacements return to execution-planning-needed state.

Do not duplicate the decomposition algorithm.

## 5. Exact Implementer requires the accepted WorkItem execution plan

Remove the hard-coded exact-mode contract values:

- `affectedPaths: []`;
- generic proof intent.

Exact Implementer start must reject a current WorkItem/Repair that has no accepted execution plan.

The contract must consume the persisted:

- implementation boundaries;
- affected paths;
- proof intent.

The contract digest must change when the WorkItem execution plan changes.

## 6. Include all completion-relevant WorkItem obligations

The exact Implementer contract must include required active Criteria owned by:

- the exact WorkItem;
- the exact accepted BoundedSolution implemented by that WorkItem.

Do not let Validator/completion enforce a required solution Criterion that the Implementer was never shown.

Phase-owned Criteria remain Phase-boundary obligations.

## 7. Enforce source-backed affected-path scope

Observed App Server source changes must remain inside the accepted WorkItem affected-path set.

At checkpoint finalization:

- every observed attributable path must match an accepted exact path or accepted directory prefix;
- any out-of-plan path blocks automatic checkpointing and returns bounded inspection/replanning evidence;
- do not silently expand the plan from model output;
- a revised Architect WorkItem plan is required before retry if the implementation legitimately needs broader paths.

Tester retains its separate test-owned path policy.

## 8. Repair WorkItems

Canonical Repair/Fix WorkItems re-enter this same execution-planning boundary before Implementer.

Do not create a private Repair planning engine.

The failure evidence/objective generated by Repair creation is input context for Architect WorkItem planning.

## Permanent proof

Prove at minimum:

1. exact Implementer start rejects an unplanned WorkItem;
2. accepted WorkItem execution plan persists through SQLite reopen;
3. accepted plan changes WorkItem record version and contract digest;
4. source-backed contract contains persisted affected paths/proof intent;
5. source-neutral contract contains no repository path scope;
6. contract includes WorkItem + accepted-solution required Criteria;
7. decomposition replacements require their own execution planning;
8. Repair WorkItem requires the same planning boundary;
9. same-title peer Workflow cannot plan this WorkItem;
10. observed source path outside the accepted scope blocks checkpoint;
11. accepted in-scope changes checkpoint normally;
12. direct and WIR-routed targets use the same planning service;
13. renderer shows Architect WorkItem planning before Run Implementer.

## Non-scope

Do not change:

- Criterion human-decision semantics;
- Phase validation;
- Implementer/Tester runtime interaction UI;
- integration;
- Workflow-family front halves.

## Validation

Run:

- build;
- Project State WorkItem revision/decomposition tests;
- exact Workflow application/IPC tests;
- exact Implementer contract/checkpoint attribution tests;
- shared renderer WorkItem-planning tests;
- WIR target convergence proof for this boundary;
- capability-map integrity;
- exact validation-plan preview;
- `git diff --check`.

## Report/checkpoint

Write:

`docs/implementation-bundles/workflow-runtime-rebaseline/WRB04/Repair02/Reports/WRB04-R02-01_IMPLEMENTER_REPORT.md`

Commit:

`WRB04-R02-01 restore WorkItem execution-contract authority`

Then read WRB04-R02-02 only.
