# RWS02 — Define Substantive Workflow Intake Contracts and Questions

**Status:** IMPLEMENTER_READY  
**Depends on:** RWS01 accepted by Operator  
**Type:** Workflow intake semantics / shared contract  
**Baseline reviewed:** `dev` at `aa80474de0ae071662601053b6ce9dbaa4a78cca`  
**Next card:** RWS03 will render/save these intakes through the approved `IntakeWorkspaceShell`.

## Objective

Define the typed intake inputs and ordered intake-question definitions for every **existing-project substantive Workflow** so RWS03 can compose all Workflow intakes from one reviewed semantic contract instead of inventing questions while building UI.

This card is **contract/data only**. It does not render intake UI, persist the four missing intake families, register IPC, or change Architect Assessment/Plan prompts.

## Verified current state

Repository review confirms:

- `WORKFLOW_TYPE_REGISTRY` has six direct-start existing-project substantive Workflows:
  - `feature-capability`
  - `refactor-migration`
  - `integration-composition`
  - `issue-resolution`
  - `infrastructure-platform`
  - `research-prototype`
- Greenfield/Project Creation already has `ProjectIntakeSubmission` and is already on the RWS01 shell.
- Work Intake Routing is routing-only and is not a substantive Workflow intake definition.
- Feature already has a typed `FeatureIntakeInput`.
- Issue already has a typed `IssueIntakeInput`.
- Refactor/Migration, Integration/Composition, Infrastructure/Platform, and Research/Prototype have route-specific discovery/planning profiles but no exact-Workflow typed intake contract.
- The existing profile content is valid semantic source material, but it belongs to the older planning kernel and must not become the new persistence or UI owner.

## Architecture decision

Create:

`src/shared/workflowIntakeContracts.ts`

This module is the shared semantic registry for existing-project Workflow intake.

It must:

1. import and reuse the existing `FeatureIntakeInput` and `IssueIntakeInput` types;
2. define explicit typed input interfaces for the four missing Workflow families;
3. define one immutable ordered intake-field definition for each of the six direct-start existing-project Workflow types;
4. expose a type-safe mapping from Workflow type -> intake input type;
5. contain no renderer, Electron, IPC, database, Project State service, or `window.champcity` dependency.

A lightweight field contract is sufficient:

- field key;
- operator-facing question/label;
- required/optional flag;
- maximum length (8,000 characters);
- optional short help text only where needed to prevent ambiguity/secrets.

Do not build a generic form engine or schema language.

## Preserve existing Feature and Issue semantics

Feature and Issue already have working exact-Workflow intake contracts. Their keys/order must remain unchanged.

### Feature / Capability

Preserve this order and current meaning:

1. `requestedCapability` — Requested capability and outcome
2. `baseline` — Relevant current behavior or baseline
3. `scopeIn` — Scope in
4. `scopeOut` — Scope out
5. `constraints` — Constraints
6. `preservation` — Behavior and contracts to preserve
7. `affectedSurfaces` — Affected surfaces and architecture
8. `evidence` — Known evidence and regression boundary
9. `compatibilityRollout` — Compatibility and rollout concerns

All remain required to match the existing Feature service.

### Issue Resolution

Preserve this order and current meaning:

1. `title` — Issue title
2. `observed` — Observed behavior or failure
3. `expected` — Expected behavior
4. `reproduction` — Reproduction steps
5. `environment` — Environment and context
6. `impact` — Known impact
7. `constraints` — Constraints

All remain required to match the existing Issue service.

Do not modify `featurePlanningContracts.ts`, `issuePlanningContracts.ts`, or their services merely to centralize their existing interfaces.

## New Refactor / Migration intake contract

Define `RefactorMigrationIntakeInput` with this exact ordered semantic set:

1. `transformationObjective` — **Transformation objective and desired end state**  
   What should be materially different when this refactor or migration is complete?  
   Required.

2. `scopeIn` — **Scope in**  
   Which systems, components, runtime boundaries, behaviors, or responsibilities are intended to change?  
   Required.

3. `scopeOut` — **Scope out**  
   Which related changes must remain outside this migration?  
   Required.

4. `targetState` — **Known target architecture or target-state constraints**  
   Record already-adopted destination decisions or constraints. Leave blank when the Architect is expected to derive/recommend the target.  
   Optional.

5. `preservation` — **Behavior, contracts, data, and capabilities to preserve**  
   What must continue to work through and after the transition unless explicitly superseded?  
   Required.

6. `retirement` — **Explicit retirement or supersession expectations**  
   What legacy architecture, runtime, compatibility path, or component is expected to disappear?  
   Optional.

7. `transitionConstraints` — **Transition, cutover, rollback, and coexistence constraints**  
   Capture downtime, dual-running, migration-window, recovery, deployment, sequencing, or rollback requirements known to the Operator.  
   Required.

8. `knownEvidence` — **Known evidence, risks, or prior decisions**  
   Point the Architect toward material decisions, documents, prior attempts, known risks, or evidence that should shape repository review.  
   Optional.

## New Integration / Composition intake contract

Define `IntegrationCompositionIntakeInput` with this exact ordered semantic set:

1. `integrationOutcome` — **Integration outcome**  
   What coordinated capability or user/Operator outcome should the combined systems provide?  
   Required.

2. `systemsInScope` — **Systems, services, tools, or components in scope**  
   Identify the material participants the Operator expects this work to connect or compose.  
   Required.

3. `reuseExpectations` — **Existing capabilities or components to prefer/reuse**  
   Identify known components, gateways, services, or provider capabilities that should be characterized before custom replacement.  
   Optional.

4. `interfacesAndFlows` — **Required interfaces, data flows, and control flows**  
   Describe the externally meaningful exchanges or interactions that must work.  
   Required.

5. `accessConstraints` — **Authentication, authorization, and access constraints**  
   Describe ownership/access requirements only; never capture credentials, tokens, passwords, or secrets.  
   Optional.

6. `compatibilityLifecycle` — **Compatibility, version, upgrade, and lifecycle constraints**  
   Capture known compatibility/support/version requirements or lifecycle expectations.  
   Optional.

7. `failureRecovery` — **Failure, retry, health, and recovery expectations**  
   What failure behavior, containment, health evidence, or recovery outcome matters?  
   Required.

8. `scopeOut` — **Scope out and custom-code boundaries**  
   Identify related integrations/features that are not authorized and any known limits on custom implementation.  
   Required.

9. `knownEvidence` — **Known characterization evidence or gaps**  
   Record known test evidence, capability gaps, prior characterization, or unresolved external constraints.  
   Optional.

## New Infrastructure / Platform intake contract

Define `InfrastructurePlatformIntakeInput` with this exact ordered semantic set:

1. `operationalOutcome` — **Operational outcome**  
   What environment/platform/deployment capability should exist when this work is complete?  
   Required.

2. `environmentScope` — **Environment and topology in scope**  
   Identify the hosts, runtimes, deployments, packaging, networks, or operational surfaces intended to change.  
   Required.

3. `targetState` — **Known target platform or operational state**  
   Record already-decided target topology/platform constraints; leave blank if the Architect should recommend them.  
   Optional.

4. `ownershipAccess` — **Ownership and access boundaries**  
   Capture who operates, authorizes, restores, or depends on the affected environment and any material access constraints.  
   Optional.

5. `rolloutConstraints` — **Provisioning, rollout, cutover, and downtime constraints**  
   Capture sequencing, maintenance-window, deployment, update, or availability requirements.  
   Required.

6. `stateRecovery` — **State protection, backup, rollback, and recovery requirements**  
   Identify state at risk and required restoration/recovery outcomes.  
   Required.

7. `networkObservability` — **Networking, health, and observability requirements**  
   Capture material connectivity, monitoring, health, or operational visibility expectations.  
   Optional.

8. `preservationCompatibility` — **Compatibility and behavior to preserve**  
   Identify product/operational behavior and compatibility that must remain intact.  
   Required.

9. `scopeOut` — **Scope out**  
   Identify product features or unrelated platform improvements not authorized by this intake.  
   Required.

10. `knownEvidence` — **Known environment evidence or constraints**  
    Record known capability/preflight evidence, operational limitations, or prior decisions useful to Architect review.  
    Optional.

## New Research / Prototype intake contract

Define `ResearchPrototypeIntakeInput` with this exact ordered semantic set:

1. `questionHypothesis` — **Question or hypothesis**  
   What bounded question, uncertainty, or feasibility claim should this work answer?  
   Required.

2. `decisionEnabled` — **Decision this research should enable**  
   What Operator/product/architecture decision should become possible from the evidence?  
   Required.

3. `alternativesUnknowns` — **Alternatives and important unknowns**  
   Identify material alternatives or uncertainties already known.  
   Optional.

4. `experimentBoundary` — **Experiment or prototype boundary**  
   What may be explored or prototyped, and what must remain outside the investigation?  
   Required.

5. `requiredEvidence` — **Evidence required**  
   What observations, measurements, demonstrations, comparisons, or findings would be useful to the decision?  
   Required.

6. `successFailureCriteria` — **Success, failure, and inconclusive criteria**  
   Define how the investigation should distinguish useful success, failure, or insufficient evidence.  
   Required.

7. `timeboxClosure` — **Timebox, expiration, or closure condition**  
   When should the research stop even if the result is negative or inconclusive?  
   Required.

8. `outputDisposition` — **Prototype/output disposition constraints**  
   State whether output is expected to be disposable, potentially reusable only after later approval, or presently undecided.  
   Optional.

## Registry invariants

Export one immutable `WORKFLOW_INTAKE_DEFINITIONS` (name may vary only if equally explicit) keyed by the six direct-start existing-project Workflow types.

It must satisfy:

- exactly one definition for every `WORKFLOW_TYPE_REGISTRY` entry where `directStart === true`;
- no definition for `project-creation` or `work-intake-routing`;
- definition Workflow type matches its key;
- field keys are unique within each Workflow;
- field order is stable;
- every field has max length 8,000;
- Feature/Issue definitions use their existing input keys exactly.

The registry is semantic configuration, not workflow authority. `WORKFLOW_TYPE_REGISTRY` remains authoritative for Workflow identity/entry workspace.

## Relationship to existing planning profiles

Do not delete or rewrite the existing WorkPlanning profiles in this card.

The four new intake definitions must remain semantically compatible with their existing profile content:

- Refactor/Migration: current/target delta, preservation, transition, cutover, rollback, retirement.
- Integration/Composition: characterization/reuse, contracts/flows, access, lifecycle/failure, demonstrated gaps.
- Infrastructure/Platform: operational delta, topology, ownership, rollout, recovery, networking/health, compatibility.
- Research/Prototype: bounded question, evidence, decision, experiment boundary, success/failure, closure, output classification.

Do not copy the old `discoveryQuestions` verbatim into the Operator intake. The intake captures Operator-owned intent/context; the later Architect workspace owns repository-derived investigation.

## Required production areas

Create:

- `src/shared/workflowIntakeContracts.ts`

Modify only if required for type export/import consistency:

- existing shared contract/index surfaces.

Do **not** modify renderer workspaces, `App.tsx`, main-process services, preload, IPC, SQLite/Project State persistence, or planning profile behavior.

## Focused proof

Prefer extending the existing owner:

`test/project-state/workflow-type-registry.test.cjs`

Add proof that:

1. the intake-definition registry covers exactly the six direct-start existing-project Workflow types;
2. Greenfield Project Creation and Work Intake Routing are excluded;
3. field keys are unique and ordered definitions are nonempty;
4. all field limits are 8,000;
5. Feature and Issue retain their existing key order;
6. the four new Workflow families expose the exact keys specified above.

Do not create a new permanent test file unless the existing registry owner cannot prove this contract; if a new test is necessary, the Implementer Report must state the precise coverage gap.

Inspect `validation/capability-map.json` before changing it. Update catalog/path ownership only if the new shared file is otherwise unclassifiable; do not broaden validation scope gratuitously.

## Validation

Create an exact changed-path JSON input and run:

- `npm run validate:plan -- --profile work-item --changes tmp/rws02-changes.json`
- `npm run test:affected -- --changes tmp/rws02-changes.json`
- focused `node --test test/project-state/workflow-type-registry.test.cjs` after a current build if the composed lane does not provide clear file-level proof;
- `git diff --check`.

Do not run full/release qualification.

## Acceptance criteria

1. All four previously missing substantive Workflow intake interfaces exist as explicit typed contracts.
2. All six direct-start existing-project Workflows have one ordered immutable intake definition.
3. Feature and Issue intake keys/semantics are unchanged.
4. The exact new questions above are represented without implementer-authored substitutes.
5. Greenfield and Work Intake Routing are not folded into the existing-project registry.
6. No renderer, persistence, IPC, Architect prompt, planning profile, or workflow-state behavior changes.
7. Focused registry proof and work-item validation for the owned scope pass, with unrelated broader failures reported rather than repaired.

## Implementer Report

Write:

`docs/implementation-bundles/renderer-workspace-shells/Implementer_Reports/RWS02_IMPLEMENTER_REPORT.md`

Report:

- baseline/root verification;
- exact contract/definition files changed;
- final field keys and required/optional disposition by Workflow;
- confirmation Feature/Issue were preserved;
- confirmation no UI/persistence/prompt behavior changed;
- tests reused/extended/new with any new-test coverage-gap justification;
- exact validation results;
- deviations/blockers.

## Checkpoint and STOP

Create one attributable checkpoint commit:

`RWS02 define substantive workflow intake contracts`

Then STOP for Architect review before RWS03 adds persistence/rendering adapters and places all substantive Workflow intakes onto the approved `IntakeWorkspaceShell`.
