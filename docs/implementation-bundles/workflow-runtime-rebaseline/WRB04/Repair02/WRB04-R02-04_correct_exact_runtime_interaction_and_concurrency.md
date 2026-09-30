# WRB04-R02-04 — Correct Exact Runtime Interaction and Concurrency Presentation

**Parent:** WRB04 Repair02  
**Depends on:** WRB04-R02-03 passing checkpoint/report  
**Implementer:** GPT 6.0 Luna Medium

## Objective

Make the shared Feature/Issue execution Workspace faithfully expose the exact Implementer/Tester runtime contract without reintroducing legacy serialization or losing valid interaction shapes.

This card is renderer/runtime-presentation repair only.

## 1. Reuse one bounded interaction component family

Extract/reuse the established bounded panels for:

- approval;
- user input;
- MCP elicitation.

Both legacy Work Card UI and exact Workflow UI may use the same presentation components.

Do not route exact Workflow execution through legacy Work Card authority to reuse the UI.

## 2. Support option and free-text user questions

`CodexPendingUserInputModel.questions[].options` may be empty.

For Implementer and Tester:

- when options exist, render a bounded select;
- when options are empty, render a text input;
- require every pending question to have a non-empty answer before submit;
- preserve exact question IDs;
- submit answers only through the existing exact response APIs.

Prove mixed option/free-text request sets.

## 3. Preserve exact Implementer identity on every interaction

Implementer actions must carry:

- exact Workflow ID;
- exact WorkItem ID;
- request ID.

Wire and prove:

- approval;
- denial;
- user input;
- MCP elicitation accept/decline/cancel;
- execution cancel.

A request from Workflow A must not be answerable from Workflow B.

## 4. Preserve exact Tester identity on every interaction

Tester actions must carry:

- exact Workflow ID;
- exact WorkItem ID;
- exact ImplementationRecord ID;
- request ID where applicable.

Wire and prove:

- approval;
- denial;
- user input;
- execution cancel.

Do not invent Tester MCP elicitation.

## 5. Replace raw MCP elicitation JSON as the normal UX

Use `CodexPendingMcpElicitationModel.fields` to render bounded controls.

Support declared:

- field IDs;
- required fields;
- scalar text;
- bounded option sets.

Build the accepted content from those controls.

A raw JSON debug fallback may remain behind a clearly secondary affordance, but it must not be the primary normal interaction.

Respect `responseSupported` and `unsupportedReason`.

## 6. Remove UI-level global serialization of exact runs

Do not disable **Run Implementer** solely because `CodexManagedRuntimeStatus.busy` is true.

That flag includes any active exact run and is also needed by legacy/global execution semantics.

For exact Workflow UI:

- disable when this exact WorkItem session is already running/waiting;
- disable when Tester/source-mutation lease on the same exact Workflow prevents start;
- otherwise allow the start request to reach the exact runtime;
- if shared exact capacity is exhausted, display the runtime's bounded capacity error.

Do not increase the backend maximum exact-run capacity.

Do not weaken same-checkout cross-role lease protection.

## 7. Runtime status

The Workspace should make visible:

- exact Implementer state;
- exact Tester state;
- current pending interaction type;
- failure reason;
- bounded status/event tail where already available;
- global runtime unavailability/selection blocker.

Do not dump full raw transcripts.

## 8. Polling/reopen truthfulness

Polling must continue while an exact session is:

- running;
- waiting for approval/input/elicitation.

If the app process restarts and the external model session is gone:

- do not render an old in-memory request as actionable;
- preserve durable attempt/Tester evidence;
- surface truthful rerunnable/inspection status from the exact service.

## Permanent proof

At minimum prove:

1. Implementer free-text question renders a text input and resumes after answer;
2. Tester free-text question renders a text input and resumes after answer;
3. mixed option/free-text request submits exact answer map;
4. approval/denial remains exact-identity scoped;
5. MCP elicitation uses declared field controls;
6. unsupported elicitation cannot submit an invented response;
7. Implementer cancel affects only exact owner;
8. Tester cancel affects only exact owner/implementation;
9. two independent exact Workflows can start while backend exact capacity remains;
10. one exact run does not disable another merely because global `busy` is true;
11. same Workflow source-mutating roles still cannot overlap;
12. exact capacity exhaustion returns a visible bounded reason;
13. legacy global execution behavior remains unchanged;
14. reopen after process loss does not expose stale pending interaction.

## Non-scope

Do not change:

- WorkItem execution planning;
- Criterion human semantics;
- Phase validation;
- integration;
- exact backend concurrency limit.

## Validation

Run:

- build;
- exact Implementer interaction tests;
- exact Tester interaction tests;
- reusable interaction component tests;
- shared renderer interaction tests;
- exact concurrent Workflow presentation tests;
- same-checkout lease regression;
- restart truthfulness proof;
- capability-map integrity;
- exact validation-plan preview;
- `git diff --check`.

## Report/checkpoint

Write:

`docs/implementation-bundles/workflow-runtime-rebaseline/WRB04/Repair02/Reports/WRB04-R02-04_IMPLEMENTER_REPORT.md`

Commit:

`WRB04-R02-04 correct exact runtime interaction UX`

Then read WRB04-R02-05 only.
