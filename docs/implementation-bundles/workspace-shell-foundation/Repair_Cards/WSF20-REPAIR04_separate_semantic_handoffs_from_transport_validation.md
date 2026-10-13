# WSF20-REPAIR04 — Separate semantic handoffs from transport validation

**Type:** Repair Card  
**Parent:** WSF20  
**Defect:** WSF20-D14  
**Starting baseline:** `4ad54324b8b71bff3cace786944413b12c882ab0`

## Objective

Reduce model-facing candidate handoffs to the information required for high-quality reasoning and stage execution while preserving all existing typed validation, SQL authority, MCP ingress and rejection behavior.

The governing boundary is:

```text
model handoff
= semantic intent + stage behavior + meaningful candidate structure

tool/service validator
= exact transport shape + hard bounds + malformed-input rejection
```

This is a shared application rule. Do not add project-specific exceptions.

## Confirmed RCA

`architectCandidateHandoffContract()` currently exposes validator internals directly to the Architect, including:

- per-entry UTF-8 byte limits;
- total candidate byte limits;
- total item counts;
- `projectPlanningDirection` byte limits;
- Unicode control-character rejection ranges;
- full JSON serialization examples.

These constraints are already enforced by:

- `validateGreenfieldArchitectOutput()`;
- `validateArchitectCandidateOutput()`;
- downstream typed candidate parsers;
- `workflow_toolbox.submit_stage_candidate` ingress and candidate-size enforcement.

They are transport safety requirements, not interview/reasoning requirements.

Current tests additionally codify this prompt bloat by asserting literal validator prose such as `Maximum 200 total items`.

## Required correction

### 1. Convert Architect handoff contract to a semantic contract

Refactor `architectCandidateHandoffContract()` so model-facing text contains only:

- required semantic section/field names;
- whether a semantic dimension is a collection or scalar when that distinction matters to meaning;
- stage-specific semantic purpose;
- Operator authority boundaries;
- meaningful evidence/reference obligations;
- unresolved-decision behavior.

For Greenfield Project Creation, keep the fifteen required semantic sections:

- Project Understanding
- Users and Primary Workflows
- Scope
- Non-Scope
- Constraints
- Key Decisions
- Architect Recommendations
- Data and Integration Requirements
- Security, Compliance, and Operational Considerations
- Risks and Dependencies
- Assumptions
- Deferred Decisions
- Unresolved Questions
- Acceptance Direction
- Project Planning Direction

The handoff may identify the authoritative machine field names, but it must not dump a full placeholder JSON object.

### 2. Remove transport-only prose from model prompts

Remove from Architect/model-facing handoffs:

- byte-count limits;
- total transport-size limits;
- total item-count limits;
- UTF-8 implementation details;
- explicit forbidden Unicode/control-character ranges;
- serialization implementation rules that are already handled by the MCP transport;
- full placeholder JSON templates whose sole purpose is satisfying a parser.

Do **not** weaken or remove the corresponding validators.

### 3. Preserve meaningful structural guidance

Do not overcorrect by making candidate shape ambiguous.

The model still needs to know:

- exact semantic field/section names required for the stage;
- required semantic relationships, e.g. facts + direction + criteria;
- distinctions such as Phase Interview must not create Work Card candidates while Phase Planning may;
- exact evidence/reference obligations when those affect reasoning;
- allowed recommendation/decision semantics;
- that Operator Decisions remain Operator-owned.

Use concise schema summaries or field lists rather than validator dumps.

### 4. Keep MCP submission behavior explicit

Retain the shared `workflowCandidateHandoff()` behavioral contract that:

- the semantic candidate is not the chat response;
- the model may ask materially unresolved questions;
- when sufficient information exists, it submits through `workflow_toolbox.submit_stage_candidate`;
- it does not require manual Operator JSON transfer;
- SQL generates review documents;
- after successful submission it directs the Operator to Refresh.

Simplify only redundant transport wording. Do not remove the MCP submission instruction.

### 5. Apply the boundary across shared Greenfield candidate stages

Review and simplify model-facing handoff prose for:

- Architect Interview;
- Project Planning;
- Phase Map;
- Phase Interview;
- Phase Planning;
- Work Card Planning;
- Work Item review advisory.

Do not redesign candidate schemas or stage behavior.

If a stage-specific handoff currently includes hard parser limits solely because its parser enforces them, remove those limits from the prompt and leave them in code.

### 6. Generic Intake-governance wording only

Where scope discipline is needed, use generic application behavior such as:

> The approved Intake is governing scope. Do not infer additional implementation requirements solely from classification or metadata. If supplied context is materially ambiguous or conflicting, preserve the ambiguity as an unresolved Operator question rather than inventing work or selecting a route.

Do not mention:

- `Greenfield_Test`;
- the current test project's two phases/four Work Cards;
- Desktop application as a special case;
- any repository-specific path or fixture.

## Validators are explicitly out of scope

The following behavior must remain unchanged:

- exact fifteen-section Greenfield candidate validation;
- scalar/array validation;
- all existing byte/item limits;
- control-character rejection;
- MCP maximum candidate size;
- typed Project/Phase/WorkItem candidate parsing;
- SQL review-cycle persistence;
- Operator disposition ownership.

No validator should become more permissive merely because its implementation details were removed from the prompt.

## Required tests

Update tests so they prove the **boundary**, not old prompt literals.

At minimum prove:

1. Greenfield Architect handoff includes all fifteen semantic section names.
2. Greenfield Architect handoff includes Operator-authority and unresolved-question behavior.
3. Greenfield Architect handoff includes MCP submission behavior.
4. Greenfield Architect handoff does **not** contain:
   - `Maximum 200 total items`;
   - UTF-8 byte-count instructions;
   - control-character code-point ranges;
   - the full placeholder semantic JSON template.
5. Project Planning / Phase Map / Phase Interview / Phase Planning / Work Card Planning / review advisory handoffs retain required semantic fields and stage distinctions.
6. Those shared handoffs do not leak transport-only validator implementation details where unnecessary.
7. Existing validators still reject:
   - wrong/missing fields;
   - wrong scalar/array types;
   - over-limit entries/candidates;
   - forbidden control characters;
   - malformed candidate JSON.
8. Existing MCP ingress tests still persist valid candidates into SQL.
9. Existing generated review documents remain unchanged for equivalent valid candidates.

Replace any tests that assert validator prose inside the handoff, including the current `Maximum 200 total items` assertion, with semantic-contract assertions.

## Acceptance

Operator should be able to copy the resulting Architect Interview handoff and see a materially shorter prompt whose emphasis is:

1. approved Intake/evidence;
2. interview/reasoning behavior;
3. semantic sections to capture;
4. MCP submission;
5. Operator review boundary.

Mechanical serializer/validator implementation details should no longer dominate the prompt.

## Forbidden changes

- no SQL/domain/schema migration;
- no candidate-field changes;
- no validator relaxation;
- no MCP authorization/tool publication changes;
- no browser changes;
- no project-specific prompt exceptions;
- no D05–D08 work;
- no unrelated prompt optimization or model-specific tuning.

## Implementer report

Write:

`Dev/docs/implementation-bundles/workspace-shell-foundation/Implementer_Reports/WSF20_REPAIR04_IMPLEMENTER_REPORT.md`

Report:

- exact prompt text removed/retained by category;
- affected shared handoff generators;
- proof that validators are byte-for-byte or behaviorally unchanged;
- focused handoff/validator/MCP ingress receipts;
- production build result.

## Checkpoint

`WSF20-R04 separate semantic prompts from transport validation`

After checkpoint, stop for Operator audit.
