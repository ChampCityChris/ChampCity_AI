# WSF20 — Compose Greenfield from the recovered shell foundation

**Type:** Work Card  
**Bundle:** WSF — Workspace Shell Foundation Recovery  
**Depends on:** WSF01–WSF19 plus WSF03A, WSF05A, WSF14A, WSF15A, WSF16A, and WSF19A accepted at source/automated-review level  
**Operator gate:** this card ends at Operator visual/experiential audit.

## Objective

Replace the current broken Greenfield renderer composition with a Greenfield adapter/orchestrator that assembles the 18 recovered workspace shells plus the Nested Lifecycle Rail.

Do not redesign any shell in this card. WSF20 only wires accepted building blocks to current SQL-backed Greenfield state and actions.

## Required composition

```text
Nested Lifecycle Rail

Project Intake
Architect Interview
Project Planning Review
Project Phase Map

repeat each SQL Phase:
  Phase Interview
  Phase Planning
  Work Card Map

  repeat each SQL Work Card:
    Work Card Intake
    Work Card Planning
    Implement
    Review & Validation
      Work Card Validation (alternate/manual surface under the same rail step)
    Work Card Repair (conditional, repeatable)
    Work Card Close

  Phase Validation
  Phase Close

Project Validation
Project Close
```

The count of Phases, Work Cards, and Repair loops comes from authoritative SQL state. The renderer does not hard-code loop counts.

## Greenfield adapter responsibilities

- resolve the exact current Project Creation Workflow;
- resolve the current Project/Phase/Work Card identities from SQL-backed services;
- consume WSF19A as the sole canonical Greenfield nested-stage resolver;
- map current lifecycle state to the corresponding shell;
- supply shell projections/data;
- supply typed mutation callbacks;
- supply Greenfield-specific LLM instructions/handoffs through shell slots;
- supply nested rail hierarchy/status/navigation;
- reopen/resume at the canonical current workspace;
- support safe inspection/navigation according to accepted rail behavior.

## Shell boundary

No shell may be modified to add Greenfield-only persistence/business logic. If Greenfield cannot be composed using the accepted shell API, stop and return the shell card for correction rather than adding an orchestration hack.

## Preserve

- current SQL/domain authority;
- exact Project/Workflow/Phase/WorkItem identities;
- Git/source binding and current structured state;
- existing server/web migration direction;
- current MCP/test toolbox improvements;
- Operator as final authority;
- current model/runtime services where their behavior is not part of the renderer regression.

## Forbidden changes

- no Feature/Issue/Migration/Integration/Infrastructure/Research renderer work;
- no restoration of Markdown authority;
- no generic Execution/Inspection screen used as a substitute for a recovered shell;
- no deletion of recovered or historical source/tests;
- no new workflow framework;
- no second persisted stage state;
- no generic `workflow-execution` fallback for Greenfield;
- no mandatory WSF18 hop when WSF16 can complete the exact validation cycle;
- no schema migration unless separately authorized after Architect review.

## Automated acceptance

- every Greenfield workspace transition resolves through WSF19A to one of WSF01–WSF19 building blocks;
- source integration is hosted by Project Validation as implemented by WSF06/WSF05A, not by a generic Execution fallback;
- nested Project → Phase → Work Card navigation is present throughout the loop;
- a multi-Phase fixture with multiple Work Cards proves loop repetition rather than one hard-coded pass;
- Repair loop can repeat and returns to the parent Work Card lifecycle correctly;
- reopening resolves the canonical SQL workspace;
- shells contain no service/persistence calls;
- Greenfield adapter contains no copied workspace JSX that belongs in a shell;
- focused restored characterization tests pass;
- exact changed-path validation/build/static checks pass.

## Operator acceptance

This card is **not accepted** until the Operator runs the real application and audits Greenfield.

The Operator must be able to inspect:

- Project Intake;
- Architect Interview;
- Project Planning;
- Phase Map;
- at least one Phase Interview/Planning cycle;
- Work Card Map;
- one complete Work Card lifecycle including Implement, Review & Validation, Validation, and Close;
- Repair workspace if a controlled repair fixture is available;
- Phase Validation/Close;
- Project Validation/Close;
- nested rail navigation and visual parity.

Any material visual/workflow mismatch returns to the owning shell card. Do not repair parity defects by adding one-off logic in Greenfield orchestration.

## Implementer Report

Write `Dev/docs/implementation-bundles/workspace-shell-foundation/Implementer_Reports/WSF20_IMPLEMENTER_REPORT.md`.

Include exact shell mapping, Greenfield adapter files, loop fixture proof, restored characterization results, validation receipts, and a checklist for Operator audit.

## Checkpoint

`WSF20 compose Greenfield from recovered workspace shells`
