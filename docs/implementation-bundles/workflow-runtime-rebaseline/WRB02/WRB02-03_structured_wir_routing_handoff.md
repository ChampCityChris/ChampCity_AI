# WRB02-03 — Move WIR Architect Routing and Operator Handoff onto Structured Project State

**Depends on:** WRB02-02 checkpoint
**Implementer:** GPT 6.0 Luna Medium

## Objective

Replace the Current Project WIR's legacy Markdown/WorkIntakeBranch authority with one complete structured routing loop:

`saved Work Intake → embedded Architect assessment → Operator accept/override/request revision → exact target Workflow creation → routes_to provenance → WIR close → target open`.

The existing two-column Architect workspace UX is reused. Structured Project State is the only routing authority. Markdown is temporary Architect draft/generated projection evidence only.

## 1. Current WIR route set

Existing-Project WIR supports exactly:
- feature-change;
- refactor-migration;
- integration-composition;
- infrastructure-platform;
- research-prototype;
- issue-resolution.

Greenfield is not selectable/recommendable in WIR. New Project enters Project Creation directly.

Apply this rule in the Current WIR application service and the typed Project State route-assessment/decision boundary. Do not remove the broader `greenfield` planning profile if later Greenfield planning still consumes it.

## 2. Structured routing service

Create a Current Project structured routing service under `src/main/workflow/` or `src/main/workIntake/` that operates from:
- Current Project ID;
- exact WorkIntake ID;
- its exact initiated WIR Workflow ID.

It must never call `readWorkIntake()`, `WorkIntakeBranchService`, or require a Work Intake Git branch.

Required model returned to the renderer:
- exact intake and WIR IDs;
- Work Intake request/outcome/constraints/evidence context;
- latest promoted RouteAssessment, if any;
- latest Operator review state;
- prepared Architect instruction/submission status;
- selected target route only after final handoff;
- target Workflow ID only after handoff;
- closed/open WIR state.

## 3. Architect handoff uses SPS-generated intake projection

Reuse the existing Architect Output runtime and embedded ChatGPT/browser interaction rather than inventing a text box.

Before preparing a routing handoff:
- render the Work Intake from SPS using `ProjectStateService.renderView({ projectionType: "work-intake" })` or an equivalently deterministic one-way projection;
- write/update that generated Markdown under a bounded generated projection path in the Project container;
- mark/copy language must make clear the projection is non-authoritative;
- use the WorkIntake recordVersion as the semantic source revision for freshness.

Architect draft files may remain under the established central `planning/Architect_Drafts` runtime.

The prepared prompt must:
- use the bound Project-container MCP workspace;
- state that WIR is advisory routing only and owns no source;
- include only the six WIR routes above;
- instruct the Architect not to perform target-specific planning during routing;
- if a source Repository is available, allow inspection of current managed Dev through `repo_toolbox` Project-relative `Dev/...` paths and explicit `git_toolbox` checkout selection;
- if source is unavailable/nonexistent, continue from Work Intake/Project evidence rather than block.

## 4. Assessment draft format and promotion

Retain the approved left-side recommendation content:
- recommended route;
- traits;
- concise rationale;
- optional alternate route with ambiguity explanation;
- optional human-readable inspected evidence notes.

Do not require source file evidence paths in order to promote an assessment. Source may be unavailable and WIR must remain usable.

Promotion must deterministically record one SPS `RouteAssessment` with:
- recommendation;
- traits;
- rationale;
- alternate when present;
- evidenceIds only for actual SPS Evidence records; empty is valid.

Markdown promotion must not itself become route authority.

Promotion-to-SPS synchronization must be idempotent. Use the Architect submission ID as a Project State mutation correlation ID (or an equivalently durable operation identity) and prove refresh/reload cannot create duplicate RouteAssessment records.

Freshness:
- Work Intake recordVersion changing after preparation makes the draft stale;
- if a Dev HEAD was successfully captured as optional source evidence at preparation, a changed Dev HEAD makes that prepared assessment stale;
- inability to inspect source at preparation is not a blocker and creates no source-freshness obligation.

## 5. Operator controls and revision request

Reuse the established WorkRoutingWorkspace two-column layout and controls:
- Accept Recommendation;
- Override Route;
- Request Revised Assessment;
- Prepare Handoff;
- Copy Handoff;
- Refresh.

Do not expose raw internal state names.

`Request Revised Assessment`:
- requires bounded rationale/instructions;
- records an Operator Decision in SPS governing the current RouteAssessment with outcome `revision_requested` (or an equivalently explicit typed route-review decision);
- keeps WorkIntake and WIR active;
- next Architect handoff includes the revision instructions;
- does not create a target Workflow.

## 6. Accept/override performs atomic WIR handoff

Add a typed Project State handoff command that reuses the WRB02-01 substantive Workflow creation primitive.

Inputs include:
- exact WorkIntake/WIR identity;
- exact current RouteAssessment ID;
- disposition accept or override;
- selected WIR route;
- rationale;
- target Workflow title (default from bounded Work Intake request unless the UI supplies a bounded title);
- optional source seed resolved before the Project State transaction.

Required transaction semantics:
1. verify active WorkIntake and its exact active WIR;
2. verify current RouteAssessment belongs to that WorkIntake;
3. accept must use the assessment recommendation; override may choose another supported WIR route;
4. record the human Operator route Decision in SPS;
5. create exactly one independent target Workflow of the mapped canonical type using the shared substantive creation primitive;
6. if source-backed, create its exact Dev SourceBaseline + unprepared SourceBinding in the same transaction;
7. create immutable `WIR routes_to target` provenance;
8. close the WorkIntake and WIR immediately;
9. return the exact target Workflow ID.

No WIR SourceBaseline/SourceBinding/SourceLine may be created.

Resolve optional source seed before the transaction:
- no Repository → no source seed;
- source-backed → exact managed Dev branch commit;
- dirty/untracked Dev is not a gate;
- unavailable/invalid Dev prevents target creation because a source-backed substantive Workflow must not be created without its exact baseline. The WIR remains open and the Operator decision is not partially recorded.

Retry after a failed preflight must be safe.

## 7. Route handoff does not reuse an existing target

For WRB02, every accepted/overridden WIR creates one new independent target Workflow instance. Do not guess that an existing same-type Workflow should absorb the work.

Future explicit merge/attach behavior, if desired, requires its own Operator-facing feature.

## 8. Renderer transition

After accept/override succeeds:
- refresh Workflow inventory;
- select the returned target Workflow ID;
- leave the WIR foreground;
- open the exact target Workflow instance shell from WRB02-02.

The closed WIR remains visible in Hub history with provenance to the target.

Request revision remains in the WIR routing workspace.

## 9. Structured Work Intake presentation cleanup

For `projection.authority === "structured"`, remove old source-owner language/controls from `WorkIntakeWorkspace`:
- no `Integrate into branch` selector;
- no text claiming ChampCity creates a Work Intake branch;
- no source-preparation retry UI for `not-applicable`;
- do not require baseBranch/baseCommit for save.

The structured intake should collect routing intent/context only. Legacy fallback rendering may remain isolated if still required outside Current Project runtime.

## 10. Permanent proof

Create/extend focused proof for:
- Architect handoff works for source-backed and non-source Projects;
- supported WIR route set excludes greenfield;
- promotion records one SPS RouteAssessment and refresh is idempotent;
- Work Intake revision stales prepared assessment;
- optional captured Dev HEAD change stales source-backed assessment;
- source-unavailable preparation remains allowed;
- request revision creates no target and keeps WIR open;
- accept creates correct target type, route Decision, `routes_to`, closes WorkIntake/WIR, and returns exact target;
- override creates the selected alternate target type;
- direct-start and routed target source semantics have the same baseline/binding shape;
- source-backed target baseline is exact Dev commit; no work SourceLine/checkout is materialized;
- non-source routed target has no source records;
- failed source preflight leaves WIR open with no partial route Decision/target;
- two separate WIRs can route to two independent same-type target Workflows;
- structured routing UI contains embedded Architect browser/handoff controls and no Work Intake branch/source-preparation controls.

## Non-scope

Do not implement target-specific planning, reuse an existing target Workflow, materialize target source, build shared execution, or migrate old Markdown routing history into SPS.

## Validation

Run build, Project State WIR routing tests, new structured routing service tests, Work Intake capture tests, routing renderer tests, Workflow application tests, validation-plan preview, bounded affected lanes if reasonable, and `git diff --check`.

## Report/checkpoint

Write `docs/implementation-bundles/workflow-runtime-rebaseline/WRB02/Reports/WRB02-03_IMPLEMENTER_REPORT.md`.

Suggested commit: `WRB02-03 establish structured WIR routing handoff`.

Then proceed directly to WRB02-04.