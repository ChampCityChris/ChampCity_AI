# Remaining Workspace UI Extraction and Structured-State Migration Audit — 2026-10-01

**Status:** ARCHITECT AUDIT / INPUT TO NEXT MASS-MIGRATION BUNDLE  
**Repository snapshot:** committed baseline `dev` at `aab61ed191c7964ba887bb8e25c0f6f5d0c7fe88` (RWS05A). RWS05B was actively in progress during this audit; uncommitted RWS05B changes were inspected only for awareness and are not treated as accepted baseline.

## Executive finding

The mass-completion direction is viable now that Intake is complete and the Architect family is being migrated under RWS05. The remaining work is substantial but no longer architecturally novel: most remaining Greenfield Markdown artifacts already have an obvious Structured Project State replacement, and most LLM prompt semantics already exist.

The next package should be one sequential implementation bundle with checkpointed cards, reviewed as a whole after implementation. It should not be one giant undifferentiated card.

The major caution is that the current Greenfield workspace list must **not** be copied mechanically into every exact Workflow. Several Greenfield stages are legacy decomposition mechanics rather than universal workflow stages. Exact Workflow planning already carries topology, Phase, WorkItem and Criterion semantics in SQL.

## Current renderer condition

`src/renderer/app/App.tsx` remains 6,733 lines / ~292 KB after RWS05A.

Intake has been extracted. RWS05 is extracting the Architect family. After RWS05, the largest remaining App-owned presentation responsibilities are:

- Project Planning review;
- Project Phase Map shell/composition;
- Phase Interview;
- Phase Planning;
- Work Card Planning;
- generic validation/close action presentation;
- global repository-document selection/review behavior still used as a fallback for Markdown-authoritative workspaces.

Already separate components that still require shell normalization or structured-state cleanup include:

- `WorkflowExecutionWorkspace.tsx` — 283 lines / ~43 KB and combines Work Item map, Architect execution planning, decomposition, Implementer runtime, Tester runtime, validation, phase validation, integration and repair;
- `FeaturePlanningWorkspace.tsx` — provisional combined assessment/plan UI; RWS05 removes/migrates assessment, leaving Plan work;
- `IssueWorkflowPlanningWorkspace.tsx` — provisional combined RCA/plan/evidence UI; RWS05 removes/migrates RCA, leaving Correction Plan work;
- `WorkCardMapWorkspace.tsx`;
- `WorkCardIntakeWorkspace.tsx`;
- `WorkCardBuildingReviewWorkspace.tsx`;
- `WorkCardReportReviewWorkspace.tsx`;
- `WorkCardRepairWorkspace.tsx`;
- `WorkCardCloseWorkspace.tsx`;
- `phaseMapPresentation.tsx` / `FigmaPhaseMapWorkspace`.

These components do not all need extraction from App, but they do need to be evaluated against the shared-shell architecture.

## Remaining workspace-family audit

| Family / current workspace | Current UI ownership | Workflow applicability | LLM prompt status | Current authority | Target Structured Project State | Migration disposition |
|---|---|---|---|---|---|---|
| Project Planning — `project-planning-review` | Generic Architect-output/document composition still orchestrated heavily in App | Greenfield Project Creation | **Exists**: `projectPlanningDraftBundle.ts` / `projectPlanningService.ts` | Canonical `project-profile` + `project-roadmap` Markdown bundle | Findings + BoundedSolution + Criteria + Decisions/Relationships, with a review/version anchor if required | Free-form legacy bodies should not be reparsed broadly. Preserve legacy evidence; use deterministic metadata only where safe; fresh structured cycle for ambiguous old projects |
| Workflow Planning / Correction Planning | Feature/Issue provisional components; four remaining types have no exact-workflow Plan adapter yet | Feature, Issue, Migration, Integration, Infrastructure, Research; Research may legitimately close after Assessment with no Plan | **Mostly exists**: Feature/Issue prompts exist; route-specific profiles exist for all seven routes in `workPlanning/profiles/*` | Feature/Issue acceptance already writes SQL graph; generic route kernel still writes canonical Markdown | BoundedSolution + Criterion + Phase + WorkItem + Decision + relationships | Reuse profile prompt semantics. Replace WIR/Markdown identity with exact Workflow identity. Do not duplicate a second planning model |
| Topology / Project Phase Map — `project-phase-map` | `FigmaPhaseMapWorkspace` exists, but shell/review composition remains in App | Greenfield requires Phase Map; exact implementation Workflows already encode direct/phased topology in the accepted planning graph | **Greenfield prompt exists**: `phaseMapService.ts` / `phaseMapDraftOutput.ts`. Exact workflows need no second topology prompt | Greenfield canonical Phase Map Markdown with structured JSON block; exact workflow topology already SQL | Phase + WorkItem membership + dependency relationships + Criteria | Greenfield Phase Map JSON is a strong deterministic migration candidate. Do not introduce a second topology stage for exact workflows |
| Phase Interview — `phase-interview` | Generic Architect-output path in App | Greenfield phased loop only unless a future product decision explicitly adds phase discovery to another workflow | **Exists**: `phaseInterviewDraftOutput.ts` / `phaseInterviewService.ts` | Canonical Phase Interview Markdown | Findings / Decisions / BoundedSolution / Criteria as appropriate, grouped by structured review-cycle semantics | Free-form legacy interview should normally remain historical; run a fresh structured Phase Interview if active state must continue |
| Phase Planning — `phase-planning-bundle` | Generic Architect-output path in App | Greenfield phased loop only; exact Workflow Planning already creates Phases/WorkItems | **Exists**: `phasePlanningDraftBundle.ts` / `phasePlanningService.ts` | Canonical `phase-planning` + `work-card-plan` Markdown bundle; Work Card candidates in structured metadata | Phase + WorkItem + Criterion + dependency relationships; BoundedSolution where needed | Candidate metadata is deterministically migratable. Free-form prose remains historical. Do not create a universal Phase Planning stage for all workflows |
| Work Card Map — `phase-work-card-selection` | Already extracted component | Greenfield work-card loop; exact Workflows use SQL WorkItem map inside execution | No new LLM prompt required | Derived from Greenfield Markdown planning artifacts today | Query SQL Phase/WorkItem graph | UI shell + adapter migration; no new semantic artifact should be needed |
| Work Card Intake — `work-card-intake` | Already extracted component | Greenfield legacy loop only | No independent Architect reasoning should be required; it is a handoff/candidate preparation step | Canonical handoff Markdown | Derived projection from selected SQL WorkItem/Phase/plan context | Prefer eliminating it as canonical state rather than creating a new entity |
| Work Card Planning — `work-card-planning` | Architect/document path in App; service owns workflow | Greenfield work-card loop. Exact Workflows have an analogous per-WorkItem Architect execution-plan step inside `WorkflowExecutionWorkspace` | **Exists**: Greenfield `workCardPlanningService.ts`; exact WorkItem planning prompt currently exists **inline in renderer** | Greenfield Formal Work Card Markdown; exact WorkItem planning writes SQL fields | WorkItem fields (`implementationBoundaries`, `affectedPaths`, `proofIntent`) + Criteria + Decision/review anchor where needed | Migrate Greenfield Formal Work Card semantics to WorkItem. Move exact prompt construction out of renderer into application service. Avoid two WorkItem-planning systems |
| Implement — `work-card-building-review` / exact Workflow execution | Greenfield extracted component; exact `WorkflowExecutionWorkspace` separate but monolithic | All implementation workflows; Research only when a Plan exists | Implementer/Codex orchestration already exists | Greenfield report/document lineage remains MD-heavy; exact Feature/Issue execution is SQL-heavy | WorkItem + ImplementationRecord + Evidence + SourceCheckpoint + TesterResult | Exact execution should be shell cleanup, not a rewrite. Greenfield implementation/report authority should migrate to existing SQL entities |
| Report Review / Validation — `work-card-report-review`, `work-card-validation` | Extracted report component plus App generic action workspace | All executable WorkItems | Tester/validation logic exists; no new Architect planning prompt required | Greenfield implementer/validation Markdown; exact Feature/Issue already SQL Validation/TesterResult | ImplementationRecord + TesterResult + Validation + Evidence + Decisions | Replace generated/approved `validation-record` authority with SQL; Markdown becomes report projection |
| Repair — `work-card-repair` | Extracted component | All executable workflows when a failure requires repair | **Exists**: Greenfield `workCardRepairService.ts`; exact Workflow repair domain exists | Greenfield Repair Work Card Markdown; exact workflows use SQL repair WorkItems/relationships | WorkItem(kind=repair) + repairs relationship + Evidence + Decision + Criteria | Reuse prompt semantics but persist typed repair contract into SQL; generated Repair Card only |
| Work Item Close — `work-card-close` | Extracted component | All executable WorkItems | No LLM required | Greenfield `work-card-close-return-record` Markdown | WorkItem lifecycle + Validation/Decision + relationships/state changes | Replace close-return Markdown authority with structured state; projection optional |
| Phase Validation / Close — `phase-validation`, `phase-close` | App `FigmaActionWorkspace` | Phased workflows; Greenfield definitely, exact phased workflows should use same semantic shell | No new LLM prompt required | Greenfield `phase-closeout` Markdown; exact workflow phase validation already has SQL support | Validation + Criterion status + Phase lifecycle + Decision | Strong SQL target. Avoid separate Markdown closeout authority |
| Project Validation / Close — `project-validation`, `project-close` | App `FigmaActionWorkspace` | Greenfield Project Creation | No LLM required | Canonical project closeout Markdown | Validation + Decision + Project/Workflow lifecycle state + Evidence | Replace closeout Markdown authority with structured state and generated closure report |
| Integration / final Workflow close | Exact Workflow execution component | Feature, Issue, Migration, Integration, Infrastructure; Research if implementation occurred | No new planning prompt | Exact Feature/Issue already Structured Project State; old routed compatibility remains MD-heavy | IntegrationRecord + SourceCheckpoint + Workflow lifecycle | Extend exact execution support to remaining implementation workflow types. Do not pull every legacy routed compatibility artifact into the UI cleanup package unless it blocks exact workflows |

## Prompt inventory conclusion

The prompt problem is much smaller than the persistence/UI problem.

Already available:

- Greenfield Project Planning prompt/handoff;
- Greenfield Phase Map prompt/handoff;
- Greenfield Phase Interview prompt/handoff;
- Greenfield Phase Planning prompt/handoff;
- Greenfield Formal Work Card planning prompt/handoff;
- Greenfield Repair Work Card prompt/handoff;
- Feature Assessment/Plan prompts;
- Issue RCA/Correction Plan prompts;
- generic route-specific assessment/plan profile content for Greenfield, Feature, Migration, Integration, Infrastructure, Research and Issue;
- exact WorkItem Architect execution-plan prompt, although it is incorrectly embedded in `WorkflowExecutionWorkspace.tsx` instead of application/service code.

The next bundle should therefore **reuse and relocate prompt semantics**, not rewrite them wholesale.

The biggest prompt/orchestration duplication is:

- Feature/Issue exact-workflow services have their own prompt construction;
- `workPlanningKernel.ts` has a profile-driven prompt model for all routes but remains Work-Intake/route-decision keyed and canonical-Markdown oriented.

The target should be one profile-driven exact-Workflow planning prompt layer using the existing route profiles as content.

## SQL readiness and backend blockers

### Planning graph

Structured Project State already has `WorkflowPlanningGraph` and `acceptWorkflowPlanningGraph()`.

It creates/owns:

- BoundedSolution;
- Criterion;
- optional Phase records;
- WorkItem records;
- dependencies and ownership relationships;
- Operator planning-acceptance Decision.

This graph already supports every active substantive implementation Workflow **except** Work Intake Routing and Project Creation.

Feature and Issue already use it.

Therefore Migration, Integration, Infrastructure and Research do not need a new SQL planning model. They need exact-Workflow plan adapters and review-before-acceptance semantics.

### Execution kernel blocker

`workflowExecutionApplicationService.ts` currently declares:

`implementationWorkflowTypes = new Set(["feature-capability", "issue-resolution"])`

This is the largest concrete blocker to claiming end-to-end completion for Migration, Integration, Infrastructure and Research.

The planning graph can create their WorkItems/Phases, but the exact execution service currently refuses them.

The mass package must explicitly extend and prove the execution application boundary for:

- refactor-migration;
- integration-composition;
- infrastructure-platform;
- research-prototype when an implementation Plan exists.

Do not hide this behind UI adapters.

### Greenfield mismatch

`acceptWorkflowPlanningGraph()` explicitly rejects `project-creation`.

That is not automatically a defect. Greenfield currently has a different planning decomposition:

Project Planning -> Phase Map -> Phase Planning -> Work Cards.

Do not extend `acceptWorkflowPlanningGraph` to Project Creation merely to make the models look symmetrical. First preserve the Greenfield stage semantics while moving each artifact to the equivalent SQL records. A later simplification may collapse redundant stages after behavior is proven.

## Recommended shared shells after RWS05

The remaining UI should converge on a small number of shell families, not one component per legacy workspace ID:

| Shared shell | Consumers |
|---|---|
| **Plan Review Shell** | Greenfield Project Planning; Feature Planning; Issue Correction Planning; Migration/Integration/Infrastructure/Research Planning |
| **Topology / Work Map Shell** | Greenfield Phase Map; SQL Phase/WorkItem map for exact workflows; Work Card/WorkItem selection views |
| **Scoped Architect Work Shell** | Greenfield Phase Interview and WorkItem planning where an Architect interaction is needed; reuse RWS05 Architect shell rather than inventing another two-column shell |
| **Execution Shell** | Greenfield Work Card implementation and all exact Workflow WorkItem execution |
| **Review / Validation Shell** | Implementer report review, Tester results, WorkItem validation, Phase validation, Project validation |
| **Repair Shell** | Greenfield and exact Workflow repair WorkItems; likely an adapter over Architect + execution/review primitives rather than a wholly distinct geometry |
| **Close / Advance Shell** | WorkItem close, Phase close, Project close, exact Workflow integration/close |

Phase Interview and Phase Planning should remain Greenfield-specific adapters unless later evidence establishes a need for them elsewhere.

Work Card Intake should become a derived preparation state rather than a universal canonical workspace.

## Code-review findings that should shape the mass package

### 1. App.tsx is still the main architecture debt

At 6,733 lines, App still mixes:

- application routing;
- browser-host lifecycle;
- document inventory selection;
- workspace refresh orchestration;
- stage-specific action state;
- validation/close actions;
- workspace presentation helpers.

The next package should remove stage-specific presentation and state ownership aggressively, while leaving genuine application routing/host mechanics.

### 2. The repository-document abstraction is now a migration liability

The generic App document state (`selectedDocumentId`, `selectedDocument`, `documents:read`) assumes repository Markdown identity.

RWS04 already demonstrated that SQL-backed projections cannot safely masquerade as repository documents.

Each migrated family should expose its own typed review projection to its shell. Do not keep adapting SQL IDs into the global legacy document selection model.

### 3. There are currently two planning architectures

The old route kernel is profile-driven but Markdown-authoritative.

The newer exact Feature/Issue planning path is Workflow-ID/SQL-authoritative.

The mass package should converge these rather than add more adapters around both.

Reuse the seven route profiles as prompt/content policy, but make exact Workflow identity and Structured Project State the orchestration authority.

### 4. Planning candidate review still needs the same lesson learned from Intake/Architect

For exact Feature/Issue today, the accepted `WorkflowPlanningGraph` becomes SQL only at acceptance; the pre-acceptance candidate is still draft/UI transport.

For the final pattern, the reviewable Plan candidate should exist as bounded structured state before Operator disposition, with an exact review revision and generated Markdown projection.

Do not treat raw textarea content or temporary Markdown as the review authority.

### 5. Exact execution is much farther along than Greenfield

Do not rewrite `WorkflowExecutionApplicationService` as part of a generic Markdown migration.

It already owns WorkItems, execution planning fields, ImplementationRecords, TesterResults, Validation, SourceBinding/Checkpoint and integration state in SQL.

The work there is:

- expand supported Workflow types beyond Feature/Issue;
- extract the giant renderer into shared shells/panels;
- move the inline Architect WorkItem prompt out of the renderer;
- bridge Greenfield Work Card execution into the same SQL model where practical.

### 6. Legacy migration should remain intentionally lossy when prose is the only source

Deterministically migrate:

- canonical metadata;
- typed JSON blocks;
- Phase Map phase structures;
- Work Card candidate metadata;
- validation/close metadata where exact semantics can be reconstructed.

Do not reverse-engineer arbitrary prose into canonical semantic records.

When deterministic reconstruction is impossible, preserve the legacy document as historical evidence and require a fresh current structured cycle.

## Recommended next implementation package

After RWS05 is accepted, create one sequential bundle, tentatively **RWS06 — Remaining Workspace and Structured-State Completion**, with checkpointed cards executed without intermediate Architect review:

1. Planning family foundation and shared Plan Review Shell; exact-Workflow plan candidate/review SQL; adapt Feature/Issue + Migration/Integration/Infrastructure/Research; Greenfield Project Planning SQL adapter.
2. Topology / Work Map family; migrate Greenfield Phase Map to Phase/relationship SQL; unify map presentation without adding redundant exact-workflow topology prompts.
3. Greenfield Phase loop migration; Phase Interview on the existing Architect shell; Phase Planning to SQL Phase/WorkItem/Criteria; remove canonical Phase Planning authority.
4. WorkItem planning/contract migration; convert Greenfield Formal Work Card to SQL WorkItem contract; move exact WorkItem Architect prompt from renderer to service; eliminate canonical Work Card Intake as authority.
5. Execution shell convergence; extract `WorkflowExecutionWorkspace` into bounded shared panels; extend exact execution to Migration/Integration/Infrastructure/Research; bridge Greenfield Work Card implementation to SQL.
6. Review / Validation / Repair family convergence; SQL Validation/Evidence/TesterResult/Repair WorkItem authority; generated Markdown reports only.
7. Close / lifecycle family; SQL WorkItem/Phase/Project/Workflow closure and Decisions; generated closeout reports only.
8. App.tsx final cleanup + legacy document authority retirement + project-wide structured-authority readiness audit + full bundle qualification.

Review the whole RWS06 sequence after card 8.

## Pushback / constraints on the mass-completion idea

The mass bundle is appropriate now, with four constraints:

1. **Do not universalize every Greenfield workspace ID.** Phase Interview, Phase Planning and Work Card Intake are Greenfield-specific legacy lifecycle mechanics unless evidence proves another workflow needs them.
2. **Do not combine all work into one commit/card.** Use one sequential bundle with bounded checkpoints so failures can be isolated while still avoiding Architect review after every card.
3. **Do not migrate prose by inference.** Structured/machine-readable legacy state may migrate; free-form legacy Markdown remains historical and active work reruns through the new structured workflow.
4. **Do not claim end-to-end workflow completion until the execution kernel supports the four remaining implementation workflow types.** The current hard-coded Feature/Issue restriction is a real backend blocker, not a UI issue.

With those constraints, the mass-completion approach is preferable to another series of small one-workspace repairs.
