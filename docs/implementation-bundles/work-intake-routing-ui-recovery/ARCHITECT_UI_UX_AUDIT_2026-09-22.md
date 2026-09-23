# Work Intake Routing UI/UX Audit — 2026-09-22

**Status:** Architect audit complete  
**Scope:** Work Intake, routing, route-specific planning, decomposition, routed Issue Resolution, generic Plan execution, acceptance, integration, and Integration Repair  
**Baseline references:** current Development and Issue Resolution workspaces plus `CHAMPCITY_UI_DESIGN_GOVERNANCE_STANDARD.md`

## Executive conclusion

The Work Intake Routing implementation contains a substantive backend/domain workflow, but its renderer integration deviates materially from ChampCity's established UI architecture.

The primary defect is not visual styling. The new routed lifecycle was implemented as a chain of nested React panels inside one `shellView === "work-intake"` surface instead of as task-oriented Workspaces using the existing navigation, Architect interaction, implementation, review, Repair, and closeout patterns.

The result is functionally dense but operationally confusing:

- Architect-backed stages do not mount the embedded ChatGPT surface;
- internal state labels are exposed directly;
- lifecycle stages are nested inline instead of navigated;
- Issue Resolution is partially duplicated instead of opening the existing Issue workflow;
- generic Plan execution is compressed into one long panel rather than using the Work Card loop interaction model;
- Integration Repair requires manual prompt/JSON patch transfer even though ChampCity already owns an in-product Implementer runtime.

This is a renderer/workflow-composition failure with one bounded backend execution-adapter gap for Integration Repair. It is not evidence that the routing, planning, branch, or execution domain model should be discarded.

## Governing UI invariants

The adopted UI governance requires:

1. existing suitable Workspace patterns are reused before new layout primitives are introduced;
2. the user must be able to answer what they are working on, what is happening, what they can do next, what blocks them, and what the action affects;
3. document + Architect work uses the established document/interaction workspace pattern;
4. implementation uses the established implementation/execution pattern;
5. validation and closeout use explicit evidence/disposition surfaces;
6. internal service state is not itself a user interaction design;
7. one task-oriented Workspace owns the current task instead of stacking entire future lifecycle stages under the same screen.

The Work Intake routing architecture also explicitly states that the current Development Phase/Work Card loop and Issue Fix/Repair loop are source material for the shared execution model and should be adapted/consolidated rather than copied into a bespoke implementation engine.

## Backend/domain assessment

The following parts are substantive and should be preserved:

- seven explicit Work Routes;
- route traits;
- bounded Architect routing-assessment grammar;
- source revisions/digests and stale detection;
- Operator accept/override/request-revision route decisions;
- reroute history and supersession;
- shared planning kernel;
- route-specific planning profiles;
- direct/phased Plan topology;
- optional Work Item decomposition;
- routed Work Item execution;
- machine-owned source checkpoints;
- Plan/Phase acceptance evidence;
- retained integration candidates;
- bounded Integration Repair source scope;
- routed Issue mapping into the existing Issue services.

The current backend already reuses major existing owners. For example:

- routed Work Card planning uses the existing Formal Work Card Architect output definition;
- routed implementation uses `codexImplementerExecutionService`;
- report review/validation/Repair reuse existing Work Card owners;
- routed Issue RCA calls the existing Issue Resolution services;
- integration uses the existing candidate and validation owners.

The repair package therefore focuses on presentation/navigation reuse and small adapter corrections rather than redesigning the domain workflow.

## Root renderer defect

`App.tsx` treats Work Intake as one foreground shell:

`shellView === "work-intake"`

and renders one `WorkIntakeWorkspace`.

That component then nests:

`WorkRoutingAssessmentPanel`
→ `WorkRouteDecisionPanel`
→ `WorkPlanningPanel`
→ `WorkItemDecompositionPanel`
→ `RoutedExecutionPanel`

The Issue route substitutes `WorkIssuePanel`, which itself nests planning and execution.

The existing Architect browser attachment rule does not include Work Intake foreground state. Therefore every routed Architect handoff can prepare/copy a prompt while presenting no in-product LLM surface.

This composition is the main architectural defect.

## Surface-by-surface findings

| Surface | Current implementation | Severity | Finding | Required direction |
| --- | --- | --- | --- | --- |
| Work Intake capture | `WorkIntakeWorkspace.tsx` | Medium | Form largely follows the intake baseline, but after save it keeps the user in the same component and appends all later lifecycle panels underneath. | Keep the form. After successful save, transition into routed navigation at Routing. |
| Routing Assessment | `WorkRoutingAssessmentPanel.tsx` | Critical | Bare buttons, raw states, no embedded Architect, draft path shown as product UI. | Dedicated document + Architect Workspace using the embedded ChatGPT surface and standard Prepare/Copy/Refresh controls. |
| Route Decision | `WorkRouteDecisionPanel.tsx` | High | Raw state, unstructured controls, immediately nests the next workflow. | Present recommendation as readable evidence and an explicit Operator disposition panel. Selection advances navigation; it does not render Planning inline. |
| Route Architect Assessment | `WorkPlanningPanel.tsx` stage=assessment | Critical | Same bare handoff controls, no Architect surface, raw Markdown `pre`, stage switcher exposed. | Dedicated Architect Assessment Workspace with document/chat layout and review disposition. |
| Work Plan | `WorkPlanningPanel.tsx` stage=plan | Critical | Same component manually switches stages and nests decomposition/execution after approval. | Dedicated Plan Workspace. Plan review is its own task; approval unlocks Execution. |
| Work Item Decomposition | `WorkItemDecompositionPanel.tsx` | High | Hidden in `details`, external handoff with no LLM pane, no document-review pattern. | Contextual Architect Workspace launched from current candidate; proposal/review shown as a first-class document decision. |
| Routed Issue | `WorkIssuePanel.tsx` | Critical | Reimplements RCA controls and partial execution inside Work Intake despite already calling existing Issue services. | Open/create the routed Issue, then transition to the existing Issue Resolution rail/workspaces with the routed Issue selected. |
| Generic Plan execution | `RoutedExecutionPanel.tsx` | Critical | Work Item map, Work Card drafting, Codex, report review, validation, Repair, close, acceptance, integration all appear in one long panel. | Recreate the established Work Card loop as routed Workspaces, using the existing execution/review/Repair/close presentation patterns. |
| Work Card Architect handoff | `routedWorkflowService.ts` `prepare` | High | Prepare and copy are collapsed into one routed action, unlike established Architect UX. | Restore separate Prepare and Copy actions while preserving the same underlying ArchitectOutputRuntime. |
| Implement | `RoutedExecutionPanel.tsx` | High | Codex controls are embedded inline among unrelated workflow controls. | Use the established Implement workspace presentation and console. |
| Review & Validation | `RoutedExecutionPanel.tsx` | High | Report, advisory review, validation, and Repair controls are inline. | Use document/evidence selection and `OperatorValidationPresentation` pattern. |
| Repair | `RoutedExecutionPanel.tsx` | High | Repair is another action in the monolith. | Use the established Repair document + Architect workspace pattern. |
| Close / Next | `RoutedExecutionPanel.tsx` | High | Close is a button in the same panel. | Dedicated close/next Workspace with next-item/acceptance progression. |
| Plan/Phase Acceptance | nested `AcceptancePanel` | High | Raw criteria forms embedded in execution panel. | Dedicated validation/acceptance Workspace using closeout/evidence hierarchy. |
| Research completion | `WorkPlanningPanel` nests `RoutedExecutionPanel` | High | Research closure jumps to the same execution monolith even though no Plan exists. | Approved terminal Research advances directly to Integration Workspace. |
| Integration | nested section of `RoutedExecutionPanel` | Critical | Candidate/validation/repair state is low-level and mixed with execution. | Dedicated Integration Workspace with clear candidate status, validation evidence, Integrate/Retry/Abort actions. |
| Integration Repair | textarea JSON patch workflow | Critical | Operator must obtain an agent response and paste raw JSON patches. | Add bounded Integration Repair Implementer runtime support and use the existing Codex execution console; ChampCity retains all Git transitions. |

## Existing patterns to reuse

The repair package must reuse or explicitly adapt these current product patterns:

- `FigmaBrowserPanel` — embedded ChatGPT host.
- `IssueDocumentChatWorkspaceShell` — existing document + Architect two-pane composition; generalize rather than duplicate.
- `FigmaDocumentCard` / `FigmaMarkdownBody` — document presentation.
- `NestedWorkflowRail`, `ContextLoopBar`, `IssueResolutionRail` — lifecycle navigation patterns.
- `WorkCardMapWorkspace` — candidate/map interaction baseline.
- `WorkCardBuildingReviewWorkspace`, `CodexExecutionActions`, `CodexExecutionConsole` — Implement baseline.
- `OperatorValidationPresentation` / `WorkCardReportReviewWorkspace` — review and validation baseline.
- `WorkCardRepairPresentation` — Repair baseline.
- `WorkCardClosePresentation` / `WorkCardCloseWorkspace` — close/next baseline.

Reuse refers to interaction architecture and suitable shared presentation components. It does not require forcing incompatible legacy domain types into the routed domain.

## Target routed Workspace model

The canonical Work Intake path should present these top-level stages:

1. **Intake**
2. **Routing**
3. **Architect Assessment**
4. **Plan**
5. **Execution**
6. **Integration**

Availability is evidence-driven.

Execution uses a nested Work Item loop modeled on the existing Work Card loop:

1. Work Item Map
2. Planning
3. Implement
4. Review & Validation
5. Repair
6. Close / Next
7. Acceptance when the current Plan/Phase boundary requires it

The renderer may project availability from backend evidence but must not create route/topology/eligibility authority.

### Route-specific exceptions

**Issue Resolution**

After the Operator selects `issue-resolution`, create/open the routed Issue through the existing bridge and move the Operator into the existing Issue Resolution workflow. Do not maintain a second Issue RCA/planning/Fix Card presentation under Work Intake.

When correction work is complete, return to the Work Intake Integration stage for the retained Work Intake branch/candidate.

**Research / Prototype**

If the approved Research assessment closes with `no-implementation-plan-required`, skip Plan and Execution and advance directly to Integration.

## Integration Repair runtime gap

The current Integration Repair controller is sound about source/Git authority:

- it produces bounded editable paths;
- records starting hashes;
- binds accepted intent/contracts;
- constrains the retained integration candidate;
- application code applies/commits/validates source resolution;
- the agent must not perform Git transitions.

The UI defect exists because no in-product Implementer execution owner is defined for Integration Repair.

The current Codex execution service supports:

- Development Work Card;
- Issue Fix Card;
- routed-development Work Item.

Its execution context assumes a Work Card/Fix Card contract and Implementer Report. Integration Repair therefore needs a separate bounded execution context, not a fake Work Card.

The final repair package must add an `integration-repair` execution kind/selector bound to the retained candidate checkout and current `IntegrationRepairAttempt`. It must:

- execute with cwd at the candidate checkout;
- provide the existing bounded repair prompt;
- limit allowed source to the repair policy;
- prohibit Git state transitions through the execution contract;
- on successful completion, collect/validate changed editable source against the prepared snapshot;
- let ChampCity mechanically commit and revalidate;
- not require an Implementer Report artifact;
- surface incompatible accepted intent as the existing Operator-decision path.

## Test audit

Current permanent renderer proof is insufficient and in one place protects the wrong composition:

- `test/renderer/research-routed-integration.test.cjs` explicitly asserts that `WorkPlanningPanel` contains `RoutedExecutionPanel`.
- `test/architect-outputs/architect-output-workspace-repair.test.cjs` proves route-decision control visibility but not the routed workspace interaction model.
- no current owner proves that Work Intake Architect stages mount the embedded ChatGPT surface;
- no current owner proves stage navigation rather than nested lifecycle rendering;
- no current owner proves Issue routing transitions into the existing Issue Resolution workspace;
- no current owner proves Integration Repair is executable without manual JSON patch transfer.

The repair should replace wrong structural expectations instead of adding another permanent test layer around them.

## Repair sequence

Execute the cards in this package sequentially:

1. WIR-UX01 — routed Workspace shell/navigation foundation.
2. WIR-UX02 — Routing Assessment and Operator Route Decision.
3. WIR-UX03 — route-specific Architect Assessment and Plan.
4. WIR-UX04A — Work Item decomposition UX.
5. WIR-UX04B — Issue route handoff into existing Issue Resolution.
6. WIR-UX05A — Work Item Map, Planning, and Implement.
7. WIR-UX05B — Review/Validation, Repair, Close/Next, and Acceptance.
8. WIR-UX06 — Integration and bounded Integration Repair execution.
9. WIR-UX07 — end-to-end routed UI qualification and obsolete renderer-test cleanup.

## Completion standard

The routed UI repair is complete when an Operator can start Work and traverse the applicable lifecycle without:

- interpreting internal state enums;
- finding a separate external LLM window;
- manually reconstructing which stage comes next;
- scrolling through future lifecycle stages on the current task screen;
- re-entering an existing Issue workflow through duplicate controls;
- pasting raw Integration Repair JSON;
- losing access to the embedded Architect where an Architect handoff is required.

The backend route, planning, execution, branch, and integration semantics remain authoritative and should not be rewritten merely to satisfy renderer layout.
