# WTR02G Repair01 — Require Current Workflow Ownership for Source Lifecycle Records

**Parent card:** WTR02G — Move SourceCheckpoint and IntegrationRecord Ownership to Workflow  
**Implementer:** GPT 6.0 Luna Medium  
**Starting implementation checkpoint:** f327f87b91879b46a26468cf3f7d025603c1b505  
**Architect finding:** canonical ownership was moved to Workflow correctly, but the new source-lifecycle APIs accept superseded or terminal Workflow record IDs within the same lineage instead of requiring the current substantive Workflow record  
**Report:** docs/implementation-bundles/workflow-topology-recovery/Implementer_Reports/WTR02G_REPAIR01_IMPLEMENTER_REPORT.md

## 1. Objective

Keep WTR02G architecture unchanged.

Repair only the exact Workflow-record ownership rule:

> New SourceCheckpoint and IntegrationRecord state must be owned by the current active nonterminal substantive Workflow record in the lineage.

Workflow lineage remains the semantic family.

The exact body workflowId must identify the current owning record, not a historical predecessor.

## 2. Current owner definition

For this repair, a current source-lifecycle Workflow owner is exactly a Workflow record that:

- belongs to the requested lineage;
- entityType = Workflow;
- lifecycleState = active;
- workflowType != work-intake-routing;
- workflowState is neither closed nor cancelled;
- is the unique non-superseded current member of that lineage.

If there is no such record, fail closed.

If more than one such record exists, fail closed as ambiguous state.

Do not infer current ownership from title, Work Intake provenance, SourceLine, branch, or checkout identity.

## 3. ProjectState createSourceCheckpoint

Update:

src/shared/projectState/projectStateService.ts

Before creating a SourceCheckpoint:

1. resolve supplied workflowId;
2. require it is the current source-lifecycle owner for that lineage;
3. require SourceBinding owner is in the same lineage;
4. require SourceBaseline owner is in the same lineage.

If caller supplies:

- superseded predecessor ID;
- closed Workflow ID;
- cancelled Workflow ID;
- WIR ID;

reject before creating the SourceCheckpoint or relationship.

Do not silently rewrite the supplied workflowId inside ProjectStateService.

The caller must supply the correct current owner.

## 4. ProjectState createIntegrationRecord

Apply the same rule to createIntegrationRecord().

The supplied workflowId must be the current active nonterminal substantive Workflow record.

Reject historical or terminal owner IDs before record creation.

IntegrationRecord.body.workflowId must therefore always identify the current owning Workflow record at creation time.

## 5. semanticCheckpointService direct request behavior

Update:

src/main/sourceControl/semanticCheckpointService.ts

request.workflowId must identify the current active nonterminal substantive Workflow record.

If request.workflowId is superseded or terminal:

- return blocked;
- perform no Git mutation;
- create no SourceCheckpoint.

Do not automatically translate a direct caller's historical workflowId to a successor.

Direct APIs require exact current identity.

## 6. structuredWorkflowCheckpointService

Update:

src/main/sourceControl/structuredWorkflowCheckpointService.ts

bindingForWorkflow() and ownership assertions must require the supplied workflowId to be current, active, nonterminal, and substantive.

recordStructuredImplementation() and recordStructuredWorkDisposition() must reject historical/terminal Workflow IDs before recording source lifecycle evidence.

Do not change WIR route-selection behavior; it remains checkpoint not-required.

## 7. Transitional structuredIntegrationService must resolve current lineage owner

The existing structuredIntegrationService entry point still receives intakeId as compatibility input.

Its Work Intake target provenance may point to the original Workflow record even if that Workflow was later superseded.

Therefore this wrapper must resolve:

~~~
Work Intake targetWorkflowId
→ target Workflow lineage
→ unique current active nonterminal substantive Workflow record
~~~

Use that current Workflow ID for:

- SourceBinding owner resolution;
- canonical IntegrationRecord.workflowId;
- existing IntegrationRecord lineage matching;
- query projection where an exact owner ID is needed.

The WIR routes_to relationship remains historical provenance and must not be rewritten merely because the Workflow record was superseded.

## 8. Preserve immutable source anchor

Do not confuse current Workflow ownership with physical source anchoring.

WTR02F remains unchanged:

~~~
physical source anchor = SourceBaseline.workflowId
~~~

So after supersession:

~~~
SourceBaseline.workflowId = original Workflow A
SourceLine = workflow/A
RepositoryCheckout = workflow-A
SourceBinding.workflowId = current Workflow A'
new SourceCheckpoint.workflowId = current Workflow A'
new IntegrationRecord.workflowId = current Workflow A'
~~~

Do not rename or rematerialize the SourceLine/checkout.

## 9. Existing historical records remain historical

Do not rewrite already-persisted SourceCheckpoint or IntegrationRecord records merely because their owning Workflow is later superseded.

This repair governs creation of new source lifecycle records.

Historical records remain evidence of the owner that was current when they were created.

Do not implement record migration.

## 10. Permanent Project State proof

Extend:

test/project-state/source-semantic-references.test.cjs

Required sequence:

1. create Workflow A + ready SourceBinding;
2. supersede A → A';
3. attempt createSourceCheckpoint(... workflowId=A ...) and prove rejection;
4. create SourceCheckpoint with workflowId=A' and prove success;
5. prove body.workflowId = A';
6. attempt createIntegrationRecord(... workflowId=A ...) and prove rejection;
7. create IntegrationRecord with workflowId=A' and prove success;
8. prove body.workflowId = A';
9. create a closed/cancelled substantive Workflow and prove it cannot own a new SourceCheckpoint or IntegrationRecord.

No WIR provenance should be required for these checks.

## 11. Direct semantic checkpoint proof

Extend:

test/source-control/semantic-checkpoint-service.test.cjs

At least one focused case must prove:

- Workflow A source is materialized;
- A is superseded to A';
- checkpoint request using A is blocked before Git mutation;
- equivalent request using A' succeeds against the same WTR02F physical SourceLine/checkout;
- physical source anchor remains A;
- no alternate A' branch/checkout is created.

This proves exact owner identity and immutable physical anchor coexist correctly.

## 12. Structured wrapper proof

Extend:

test/source-control/structured-workflow-checkpoint.test.cjs

Prove historical Workflow IDs are rejected by:

- recordStructuredImplementation();
- recordStructuredWorkDisposition();

Current successor ID remains accepted.

Do not change route-selection not-required behavior.

## 13. Transitional integration supersession proof

Extend:

test/source-control/structured-integration.test.cjs

Create/route to Workflow A, establish its immutable source baseline, then supersede to A' before canonical IntegrationRecord creation.

Required:

- WIR provenance may still point to A;
- structuredIntegrationService resolves lineage to A';
- IntegrationRecord.body.workflowId = A';
- SourceBaseline.workflowId remains A;
- Workflow checkout/source line remain anchored to A;
- no canonical IntegrationRecord is created with historical A ownership.

Keep old IntegrationCandidateRecord intake compatibility unchanged.

## 14. Expected production scope

Expected production files:

- src/shared/projectState/projectStateService.ts
- src/main/sourceControl/semanticCheckpointService.ts
- src/main/sourceControl/structuredWorkflowCheckpointService.ts
- src/main/sourceControl/structuredIntegrationService.ts

Expected tests:

- test/project-state/source-semantic-references.test.cjs
- test/source-control/semantic-checkpoint-service.test.cjs
- test/source-control/structured-workflow-checkpoint.test.cjs
- test/source-control/structured-integration.test.cjs

Report:

- docs/implementation-bundles/workflow-topology-recovery/Implementer_Reports/WTR02G_REPAIR01_IMPLEMENTER_REPORT.md

No other production file should normally change.

## 15. Explicit non-scope

Do not:

- change SourceBaseline;
- change WTR02F physical source identity;
- change RepositoryCheckout materialization;
- change Source Graph identity;
- change SourceReadiness;
- rewrite routes_to provenance;
- redesign integration candidate records;
- redesign Integration Repair;
- change Main/Dev topology;
- implement WTR02H;
- implement WTR03+.

## 16. Acceptance criteria

Repair01 is complete only when:

1. superseded Workflow ID cannot own a new SourceCheckpoint;
2. superseded Workflow ID cannot own a new IntegrationRecord;
3. terminal Workflow ID cannot own new source lifecycle records;
4. current successor can own new records for the same lineage;
5. semantic checkpoint direct API blocks historical IDs before Git mutation;
6. structured implementation/disposition wrappers reject historical IDs;
7. transitional WIR integration resolves historical target provenance to the current Workflow owner;
8. physical SourceLine/RepositoryCheckout remains anchored to immutable SourceBaseline.workflowId;
9. no Source Graph or later integration-kernel work is introduced.

## 17. Validation

Required:

1. npm run build;
2. node --test test/project-state/source-semantic-references.test.cjs;
3. node --test test/source-control/semantic-checkpoint-service.test.cjs;
4. node --test test/source-control/structured-workflow-checkpoint.test.cjs;
5. node --test test/source-control/structured-integration.test.cjs;
6. node --test test/source-control/workflow-source-materialization.test.cjs;
7. validation planner preview for the exact changed-path manifest;
8. npm run test:affected -- --changes <exact-changed-path manifest>;
9. git diff --check.

WTR02G-owned focused proof must pass.

WTR02H/WTR03C failures may remain classified as deferred.

## 18. Implementer Report

Write:

docs/implementation-bundles/workflow-topology-recovery/Implementer_Reports/WTR02G_REPAIR01_IMPLEMENTER_REPORT.md

Include:

- starting SHA;
- exact files changed;
- current-owner resolution rule;
- direct Project State historical/terminal rejection proof;
- semantic checkpoint historical-ID rejection proof;
- structured wrapper proof;
- integration supersession/current-owner proof;
- explicit confirmation that physical source anchor remains SourceBaseline.workflowId;
- focused validation;
- deferred failures by owning later card;
- confirmation that Source Graph and integration candidate compatibility contracts were not redesigned.

Do not edit the committed report afterward solely to add its own checkpoint hash.

## 19. Git checkpoint and stop boundary

After implementation, validation, report, exact staged-diff inspection, and safety scan, create exactly one attributable checkpoint commit.

Suggested subject:

WTR02G Repair01 require current Workflow source owner

No additional Operator Git approval is required.

Then STOP.

Do not begin WTR02H.
