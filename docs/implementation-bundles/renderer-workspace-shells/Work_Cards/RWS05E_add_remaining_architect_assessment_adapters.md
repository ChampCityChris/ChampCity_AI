# RWS05E — Add Architect Assessment Adapters for Migration, Integration, Infrastructure, and Research

**Status:** IMPLEMENTER_READY
**Bundle:** RWS05 Architect Workspace Family
**Depends on:** RWS05A–RWS05D checkpoints

## Objective

Add the missing Architect Assessment workspace for the four substantive Workflow types that currently stop after Intake:

- Refactor / Migration
- Integration / Composition
- Infrastructure / Platform
- Research / Prototype

All four use the RWS05A Architect shell, RWS05B ArchitectReviewCycle, SQL semantic authority, generated Markdown review projection, and exact-version Operator review.

## Workspace identities

Use these exact next-stage workspaces:

- Refactor / Migration -> `refactor-assessment`
- Integration / Composition -> `integration-assessment`
- Infrastructure / Platform -> `infrastructure-assessment`
- Research / Prototype -> `research-assessment`

Approved current Intake is required before transition from the entry Intake workspace.

Saving/reviewing Intake alone does not auto-advance. The explicit Prepare Architect Assessment action advances to the assessment workspace after approval.

Planning remains Not Ready after assessment approval until the Planning family is built.

## Typed assessment contracts

Create workflow-specific bounded contracts. Do not use one unbounded generic object.

### Refactor / Migration assessment

Must cover at minimum:

- verified current-state findings;
- transformation/target-state recommendation;
- scope in/out;
- preservation obligations;
- retirement/supersession recommendations;
- transition constraints;
- migration sequence/dependencies;
- compatibility/rollback concerns;
- material risks and assumptions;
- unresolved Operator decisions.

Persist current-state/transition facts as Findings, the recommended target/transition design as BoundedSolution, and preservation/compatibility obligations that are objectively reviewable as Criteria.

### Integration / Composition assessment

Must cover at minimum:

- participating-system findings;
- interface/data/control-flow findings;
- reuse recommendations;
- proposed integration boundary/solution;
- access/security constraints;
- compatibility/lifecycle obligations;
- failure/recovery behavior;
- dependencies/risks/assumptions;
- unresolved Operator decisions.

Persist semantic facts as Findings, the integration approach as BoundedSolution, and failure/recovery/compatibility obligations as Criteria where appropriate.

### Infrastructure / Platform assessment

Must cover at minimum:

- current environment/platform findings;
- target platform/operational recommendation;
- ownership/access constraints;
- rollout/cutover constraints;
- state/data recovery obligations;
- network/observability requirements;
- preservation/compatibility obligations;
- dependencies/risks/assumptions;
- unresolved Operator decisions.

Persist observations as Findings, target platform direction as BoundedSolution, and measurable operational/recovery obligations as Criteria.

### Research / Prototype assessment

Must cover at minimum:

- question/hypothesis framing;
- alternatives and unknowns;
- experiment/prototype boundary;
- evidence required;
- recommended experiment approach;
- success/failure criteria;
- timebox/closure rules;
- output disposition recommendation;
- risks/assumptions;
- unresolved Operator decisions.

Persist observations/unknowns as Findings, experiment approach as BoundedSolution, evidence/success/closure obligations as Criteria, and actual supplied evidence through normal Evidence records.

## Architect interaction

For each Workflow:

1. Prepare Architect Assessment from the exact approved WorkflowIntake and relevant Project/SourceBaseline evidence.
2. Right pane remains embedded ChatGPT.
3. Architect output is ingested as the typed structured contract.
4. Application writes semantic SQL records and revises/creates the exact ArchitectReviewCycle.
5. Left pane renders generated Markdown from SQL.
6. Operator Approves / Requests Revision / Rejects the exact cycle revision.
7. Approved assessment marks Intake Completed and Assessment Completed/Open-to-next-boundary on the rail, while Planning remains Not Ready.

No workflow-specific bespoke page geometry.

## Handoff requirements

Prompts must explicitly identify:

- exact Project;
- exact Workflow ID/type;
- exact approved WorkflowIntake ID/version;
- SourceBaseline when present;
- routed provenance as context only;
- accepted Project architecture/Decisions relevant to the assessment;
- required typed output schema.

Do not ask the Architect to emit canonical Markdown.

## Stage rail

Extend the existing substantive Workflow stage rail so it remains available after leaving Intake.

For the four new adapters:

- Intake = Completed once current approved Intake exists;
- Architect Assessment = Open/Awaiting Approval/Completed according to current cycle;
- Planning and later stages = Not Ready.

Feature/Issue rail behavior should align with the same shared model, using Feature Assessment / Root Cause Analysis labels.

Do not redesign the Greenfield rail.

## Existing-project behavior

There is no legacy Architect Assessment implementation for these four Workflow types that requires automatic migration.

If legacy ad-hoc Markdown is discovered, preserve it as historical evidence only. Do not parse it into authority.

## Focused proof

For each of the four Workflow types prove:

1. approved Intake can explicitly prepare assessment;
2. exact assessment workspace is persisted;
3. shared Architect shell renders;
4. ChatGPT is attached;
5. typed output persists to SQL semantic records;
6. generated Markdown renders from SQL;
7. exact-version review works;
8. revision invalidates prior review;
9. no generated Markdown is parsed into authority;
10. approved assessment updates the rail while Planning remains Not Ready.

Also prove Feature/Issue rail behavior remains valid.

## Scope exclusions

Do not implement Planning, Topology, Execution, Validation, or Close for these four Workflows.

## Implementer Report

Write `docs/implementation-bundles/renderer-workspace-shells/Implementer_Reports/RWS05E_IMPLEMENTER_REPORT.md`.

## Checkpoint and continuation

Commit `RWS05E add remaining architect assessment adapters`.

If no bundle stop condition is met, continue directly to RWS05F.
