# WIR-UX06 — Rebuild Integration and Bounded Integration Repair Execution

**Status:** IMPLEMENTER_READY  
**Depends on:** WIR-UX05B, WIR-UX04B  
**Type:** Integration UX + bounded runtime adapter repair

## Objective

Replace the Integration section/manual JSON patch protocol in `RoutedExecutionPanel` with a dedicated Integration Workspace and an in-product bounded Integration Repair Implementer execution.

## Governing invariant

ChampCity owns Git state, candidate construction, patch application, repair commit, and validation.

The Integration Repair model supplies semantic source resolution only. The Operator must not shuttle raw JSON patches between applications.

## Part A — Integration Workspace

Create:

`src/renderer/app/RoutedIntegrationWorkspace.tsx`

Present:

- target branch;
- incoming Work Intake branch;
- completion kind (Plan or Research);
- candidate status in human terms;
- source checkpoint summary as optional detail;
- required validation checks and pass/fail summaries;
- Integrate / Retry Validation / Abort Candidate where eligible;
- Operator-decision-required state when applicable.

Research completion uses this same Workspace and omits Plan/Work Item language.

No Work Item implementation controls appear here.

## Part B — Integration Repair execution adapter

### Existing gap

`codexImplementerExecutionService` supports Work Card/Fix Card/routed-development contexts only and assumes an implementation contract + Implementer Report.

Integration Repair has a different contract:

- current `IntegrationRepairAttempt`;
- bounded editable source;
- exact starting hashes;
- governing intent/contracts;
- no Implementer Report;
- no agent-owned Git.

### Required runtime design

Add an Integration Repair execution owner without pretending it is a Work Card.

Extend the shared execution kind with:

`integration-repair`

Add selector identity:

`{ ownerKind: "integration-repair", intakeId, candidateId, repairId }`

Represent execution context as a discriminated union so existing Work Card/Issue/routed-development paths retain their current required fields.

The Integration Repair context contains:

- intakeId;
- candidateId;
- repairId;
- current repair attempt/prompt identity;
- bounded editable paths + starting hashes;
- isolated execution root;
- no Implementer Report requirement.

### Isolated execution root

Do **not** run the agent directly against the integration candidate checkout.

Create a temporary isolated repair workspace containing only the editable source files at the prepared starting bytes. The repair prompt already carries governing intent, diffs, failed validation, and contracts.

Run Codex with cwd at this isolated repair workspace.

Do not expose repository Git administration there.

### Completion

On successful agent completion:

1. enumerate only the declared editable paths;
2. reject any unexpected created path;
3. compute replacement content/deletion and construct `IntegrationRepairPatch[]` using the prepared starting SHA-256 values;
4. call the existing `applyRepairPatch` against the retained candidate;
5. call `completeRepair`;
6. let existing application code mechanically commit and rerun validation;
7. remove the temporary repair workspace.

If the agent indicates incompatible accepted intent/scope, preserve the current Operator-decision action; do not apply source.

### Runtime UI

The Integration Workspace switches to an Integration Repair Implementer subview when repair is required.

Reuse:

- `CodexExecutionActions`;
- `CodexExecutionConsole`;
- model/reasoning selection;
- cancel/interruption/input/approval presentation.

Primary action: **Run Integration Repair**.

Remove:

- raw repair prompt as the main UI;
- JSON patch textarea;
- **Apply source patch** Operator action.

Prompt/evidence may remain inspectable in secondary detail.

## Security/authority constraints

The Integration Repair runtime must not:

- run in the project root;
- run in the candidate Git checkout;
- gain a Git tool path;
- alter files outside declared editable paths;
- fabricate an Implementer Report;
- advance the target branch.

Existing `IntegrationRepairController` remains the sole source patch/Git/validation owner.

## Bounded continuation

Continue through Codex execution-service type refactoring required to support the discriminated context. Preserve existing Work Card/Issue/routed-development behavior exactly.

Do not fall back to the old copy/paste JSON protocol if the first context refactor is inconvenient.

## Validation

Add focused service tests proving:

- Integration Repair execution sees only bounded editable source;
- unexpected file creation fails closed;
- changed/deleted editable files convert to exact patch inputs;
- candidate bytes are unchanged until application patch step;
- application commits/revalidates through existing controller;
- no Implementer Report is required;
- existing three Codex owner kinds still pass their focused tests.

Renderer proof:

- Integration is a dedicated stage;
- Research wording remains research-specific;
- no JSON patch textarea exists;
- repair-required state exposes Codex execution surface;
- operator-decision state remains explicit.

Do not run the full suite.
