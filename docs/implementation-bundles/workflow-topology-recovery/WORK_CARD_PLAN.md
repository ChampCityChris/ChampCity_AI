# Workflow Topology Recovery — Repair Work Card Plan

**Package ID:** WTR  
**Status:** Adopted milestone map; bounded cards released one at a time after Architect review  
**Target Implementer:** GPT 6.0 Luna Medium  
**Architecture:** `docs/architecture/CHAMPCITY_WORKFLOW_INSTANCE_AND_EXECUTION_KERNEL_ARCHITECTURE.md`  
**Operator decisions:** `OPERATOR_DECISIONS_2026-09-23.md`  
**Architect audit:** `ARCHITECT_AUDIT_2026-09-23.md`

## 1. Package objective

Correct the SCL/WIR topology drift while preserving the useful Structured Project State, planning profiles, execution runtime, source-control mechanics, and integration machinery already implemented.

The package must produce:

- independent multi-instance Workflow types;
- optional routing-only WIR;
- direct Workflow entry;
- one-time Greenfield Project Creation;
- Existing Project Registration without legacy Workflow import;
- exact SourceBaseline capture at Workflow creation;
- lazy Workflow SourceLine/checkout materialization;
- non-Git Project containers with permanent Main/Dev checkouts;
- MCP access to non-Git Project roots and explicit Git checkout targeting;
- bespoke Workflow intake/assessment/planning;
- one shared post-plan execution kernel;
- one current Structured Project State runtime;
- no legacy Workflow migration/coexistence product mode;
- no duplicate post-plan Workspace families.

## 2. Phase 2 calibration governance

This package is intentionally different from the prior SCL continuous run.

Execution is strictly:

```text
Architect authors one bounded card
→ Luna Medium implements only that card
→ focused validation
→ Implementer Report
→ checkpoint commit
→ Architect code/evidence review
→ bounded repair when required
→ next card is authored/released
```

There is no continuous multi-card authorization.

The 25 WTR numbers below are **milestones**, not executable cards. Actual implementation is performed through smaller lettered subcards.

Card-authoring rules:

- one coherent contract or production path per card;
- exact owned surface named in the card;
- explicit non-scope;
- no “refactor as appropriate” escape hatch;
- do not preserve obsolete behavior merely to keep retired tests green;
- focused tests plus validation-planner work-item profile;
- no broad historical suite by default;
- one Implementer Report and one attributable checkpoint commit per card;
- Architect review is mandatory before releasing the next card.

## 3. Bounded card map

The subcard map is an execution forecast. Only the next approved card is authoritative for implementation. Later subcards may be split further after Architect review of prior work, but they must not be silently combined.

### WTR01 — Workflow domain contracts

- **WTR01A — Establish canonical Workflow type registry and repeatability metadata.**
- **WTR01B — Normalize Workflow instance body contract and validation.**
- **WTR01C — Add WIR-to-target Workflow provenance relationship and remove substantive ownership assumptions.**
- **WTR01D — Qualify same-type Workflow multiplicity at the domain/service boundary.**

### WTR02 — Repository, checkout, MCP, and source ownership contracts

- **WTR02A — Establish immutable Workflow SourceBaseline semantic contract and typed capture.**
- **WTR02B — Convert SourceBinding semantic ownership from Work Intake to Workflow/SourceBaseline.**
- **WTR02C — Separate Project container, Repository, SourceLine, and RepositoryCheckout path contracts.**
- **WTR02D — Allow MCP workspace registration/tooling for non-Git Project roots and explicit Git checkout targets.**
- **WTR02E — Generalize work-source naming/creation from WorkIntake owner to Workflow owner.**
- **WTR02F — Implement lazy Workflow SourceLine and checkout materialization from exact baseline.**
- **WTR02G — Move source checkpoints and IntegrationRecord ownership from WorkIntake to Workflow.**
- **WTR02H — Project Source Graph metadata by Workflow identity rather than WorkIntake identity.**

### WTR03 — Fresh Project bootstrap and legacy abandonment

- **WTR03A — Define Existing Project Registration state contract and service.**
- **WTR03B — Initialize fresh Structured Project State without legacy Workflow import.**
- **WTR03C — Establish/normalize Project container plus permanent Main/Dev checkout topology.**
- **WTR03D — Establish Greenfield repository `.gitignore` baseline policy and bootstrap proof.**
- **WTR03E — Fence old Workflow artifacts as historical Evidence only; no current-state reconstruction.**

### WTR04 — Workflow instance application service

- **WTR04A — Create/get/list Workflow instances by Project/type/state.**
- **WTR04B — Workflow current-Workspace and lifecycle transitions.**
- **WTR04C — Stable display identity and multi-instance inventory projection.**
- **WTR04D — Production IPC/service boundary for exact Workflow instance selection.**

### WTR05 — Workflow-owned assessment and planning

- **WTR05A — Replace WIR-scoped planning context with Workflow-scoped planning context.**
- **WTR05B — Bind existing planning profiles to Workflow Definitions.**
- **WTR05C — Persist planning output as canonical BoundedSolution/WorkItem/Phase/Criterion relationships.**
- **WTR05D — Qualify Research evidence-only closure without execution-plan manufacture.**

### WTR06 — Routing-only WIR

- **WTR06A — Reduce WIR state machine to intake/routing/handoff/closed.**
- **WTR06B — Create target Workflow from accepted route and preserve WIR provenance.**
- **WTR06C — Make direct Workflow creation and WIR handoff converge on one target creation service.**
- **WTR06D — Replace WIR renderer navigation with routing-only Workspaces.**

### WTR07 — Project Creation / Greenfield

- **WTR07A — Restore Start New Project → Project Intake / Greenfield entry.**
- **WTR07B — Persist Project Intake and Architect product understanding in Structured Project State.**
- **WTR07C — Greenfield planning emits canonical execution semantics.**
- **WTR07D — Establish initial source topology without WIR ownership.**

### WTR08 — Shared Structured execution service

- **WTR08A — Create WorkflowExecutionService projection over WorkItems/Phases/Criteria.**
- **WTR08B — Work Item implementation attempt and completion commands.**
- **WTR08C — Shared Validation/Evidence/Repair lifecycle commands.**
- **WTR08D — Shared Phase progression/completion commands.**
- **WTR08E — Connect Workflow execution checkpoints to Workflow SourceBinding.**

### WTR09 — Shared Work Item Map and Work Card Planning

- **WTR09A — Shared WorkItemMap projection and Workspace.**
- **WTR09B — Shared WorkItemPlanning/decomposition Workspace.**
- **WTR09C — Move Development map/planning onto shared Workspaces.**
- **WTR09D — Move Issue Fix map/planning onto shared Workspaces.**
- **WTR09E — Remove routed map/planning ownership after callers move.**

### WTR10 — Shared Implement Workspace

- **WTR10A — Shared Implement Workspace contract over Workflow/WorkItem context.**
- **WTR10B — Move Development and Issue implementation callers to shared runtime path.**
- **WTR10C — Retire Routed/Issue-specific implementation wrappers after caller migration.**

### WTR11 — Shared Review & Validation Workspace

- **WTR11A — Shared ReviewValidation projection/Workspace over canonical Validation/Evidence.**
- **WTR11B — Move Development and Issue review callers to shared Workspace.**
- **WTR11C — Retire Routed/Issue-specific review-validation wrappers.**

### WTR12 — Shared Repair and Close / Next

- **WTR12A — Shared Repair Workspace over Repair WorkItem relationships.**
- **WTR12B — Shared CloseNext Workspace and deterministic return projection.**
- **WTR12C — Move Development/Issue/Routed callers and retire duplicate wrappers.**

### WTR13 — Shared Phase close and Integration

- **WTR13A — Shared Phase Validation/Close Workspace over canonical Criteria.**
- **WTR13B — Shared Workflow Integration service/Workspace over Workflow SourceBinding.**
- **WTR13C — Replace manual repository evidence-path acceptance with canonical Evidence selection.**
- **WTR13D — Reuse Integration Repair under Workflow ownership.**

### WTR14 — Feature / Capability front half

- **WTR14A — Feature instance Intake/assessment direct-entry path.**
- **WTR14B — Feature planning profile → shared execution normalization.**

### WTR15 — Refactor / Migration front half

- **WTR15A — Migration Intake/current-target-state assessment.**
- **WTR15B — Migration/cutover/retirement planning → shared execution normalization.**

### WTR16 — Integration / Composition front half

- **WTR16A — Characterize-first Integration Intake/assessment.**
- **WTR16B — Build-versus-integrate planning → shared execution normalization.**

### WTR17 — Infrastructure / Platform front half

- **WTR17A — Infrastructure Intake/operational-topology assessment.**
- **WTR17B — Provision/rollout/recovery planning → shared execution normalization.**

### WTR18 — Research / Prototype front half

- **WTR18A — Research question/hypothesis/evidence Intake.**
- **WTR18B — Research closure or research WorkItem normalization.**

### WTR19 — Issue Resolution current-state conversion

- **WTR19A — Represent Issue inventory as multiple Issue Resolution Workflow instances.**
- **WTR19B — Preserve Issue Intake/evidence/reproduction/RCA in Structured Project State.**
- **WTR19C — Normalize correction planning into shared WorkItems/Phases/Criteria.**
- **WTR19D — Remove bespoke post-plan Issue execution ownership.**

### WTR20 — Complete Greenfield through shared execution

- **WTR20A — Route approved Greenfield implementation state into shared execution kernel.**
- **WTR20B — Close Project Creation into Workflow Hub without a private execution loop.**

### WTR21 — Multi-instance Workflow Hub

- **WTR21A — Workflow Hub inventory projection grouped by Workflow Definition.**
- **WTR21B — Direct `+ Start <Workflow>` actions and multiple visible instances.**
- **WTR21C — Exact instance open/switch behavior without singleton active-workflow assumptions.**
- **WTR21D — Remove legacy Development/Issue recovery disclosure.**

### WTR22 — Workflow-aware Source Control graph

- **WTR22A — Render Workflow type/title/state for each SourceLine.**
- **WTR22B — Qualify simultaneous same-type and cross-type Workflow SourceLines.**

### WTR23 — Duplicate execution retirement

- **WTR23A — Remove obsolete WIR/Routed post-plan services and Workspaces with zero callers.**
- **WTR23B — Remove obsolete Development/Issue post-plan wrappers superseded by shared Workspaces.**

### WTR24 — Legacy runtime/migration retirement

- **WTR24A — Remove legacy inventory/import/equivalence/provider-cutover runtime.**
- **WTR24B — Remove legacy/structured authority selection and obsolete compatibility tests/capability records.**
- **WTR24C — Verify repository Markdown is documentation/Evidence/projection only, never current Workflow authority.**

### WTR25 — Package qualification

- **WTR25A — Multi-instance domain/source lifecycle qualification.**
- **WTR25B — Cross-workflow shared execution qualification.**
- **WTR25C — Targeted UI qualification: Existing Project Registration, Workflow Hub, shared execution, Source Control.**
- **WTR25D — Final dead-code/duplicate-path audit and package closeout.**

## 4. Required package qualification scenario

At final qualification, one Project must simultaneously contain at least:

- Issue A;
- Issue B;
- Issue C;
- Feature A;
- Feature B;
- Migration A;
- Research A;
- WIR A routing to one additional substantive Workflow.

The final proof must establish:

1. all are independent Workflow identities;
2. all remain queryable concurrently;
3. direct and WIR-created Workflows converge on the same target contract;
4. every substantive source-backed Workflow captures an exact baseline;
5. each Workflow requiring source mutation can own an independent SourceLine;
6. no Workflow must close before another is created/planned;
7. at least two Workflow types execute through the same post-plan kernel;
8. Repair and Review/Validation use the same shared Workspace contracts across Workflow types;
9. Source Graph shows simultaneous Workflow-owned lines;
10. Project container root is usable through MCP without being Git-backed;
11. Main/Dev are durable sibling checkouts;
12. normal `.gitignore` behavior is preserved from repository bootstrap onward;
13. New Project enters Project Creation, not WIR;
14. an unregistered existing repository enters Existing Project Registration;
15. no legacy Workflow/provider mode is exposed;
16. old repository Workflow artifacts do not become current Project State;
17. retired execution/migration components have no production callers.

## 5. Immediate release boundary

**WTR01 and WTR02A are closed. WTR02B Repair01 production changes passed Architect review; WTR02B Repair02 is the only card currently authored/released for implementation.**

The Operator has authorized the one attributable card-local checkpoint commit required by this WTR package after each card's bounded implementation, validation, and Implementer Report. That routine checkpoint does not require a second Git approval.

No WTR02C or later card is implementation-authorized until:

- WTR02B Repair02 is implemented by Luna Medium;
- focused validation/report/checkpoint are complete;
- the Architect reviews Repair02;
- WTR02B is formally closed;
- the Architect authors/releases the next bounded card.
