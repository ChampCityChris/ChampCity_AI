# RWS06G — Execution Shell and All Workflow-Type Support

**Status:** IMPLEMENTER_READY  
**Sequence:** follows RWS06F checkpoint

## Objective

Extract the monolithic exact Workflow execution renderer into a reusable Execution Shell and remove the Feature/Issue-only execution restriction.

## Workflow coverage

Exact execution must support:
- feature-capability;
- issue-resolution;
- refactor-migration;
- integration-composition;
- infrastructure-platform;
- research-prototype when an implementation Plan exists.

Project Creation uses the Greenfield adapter but should converge on the same SQL WorkItem execution semantics after RWS06F.

## Backend blocker to remove

Current `workflowExecutionApplicationService.ts` restricts `implementationWorkflowTypes` to Feature and Issue. Replace that restriction with the exact supported implementation Workflow set above and prove workflow-specific invariants.

Research with no implementation Plan must never enter execution.

## Execution Shell

Extract bounded panels for:
- Work Map/readiness;
- exact selected WorkItem;
- Implementer runtime;
- Tester runtime;
- checkpoint/recovery;
- integration state;
- bounded user/MCP elicitation.

The shell receives typed projections/actions. It does not own domain persistence.

## Preserve

Source-neutral/source-backed rules; managed checkout identity; WorkItem dependency readiness; repair ownership; failed-attempt replanning rules; tester/validation/checkpoint protections; integration candidate behavior.

Do not rewrite the execution kernel simply to normalize UI.

## Focused proof

Run one direct and one phased path across representative workflow types, plus focused coverage proving all six exact types pass execution eligibility and Research no-plan closure cannot enter execution.

## Report / checkpoint

Report: `.../Implementer_Reports/RWS06G_IMPLEMENTER_REPORT.md`

Commit: `RWS06G extract execution shell and enable all workflow types`

Continue to RWS06H.