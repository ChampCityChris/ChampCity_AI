# Workflow Runtime Recovery — Post-WTR02 Re-Baseline

**Date:** 2026-09-24  
**Baseline:** dev at f72bc436cd55de39671977de790b139a611e096c  
**Disposition:** WTR01–WTR02 foundations accepted; WTR03–WTR25 micro-card forecast superseded by vertical implementation bundles.

## 1. Why the execution plan changes now

WTR01 and WTR02 corrected the foundational ownership errors: Workflow is a first-class multi-instance Project-owned domain object, and source lifecycle ownership belongs to substantive Workflow lineage rather than Work Intake. WTR02H closes that foundation with Workflow-keyed Source Graph projection.

The remaining work is reorganized around usable vertical outcomes rather than dozens of micro-contract cards. The calibration objective has been met: bounded cards, focused validation, Implementer Reports, and attributable checkpoints work. Human Architect review moves to bundle boundaries.

## 2. Bundle execution governance

Each bundle contains approximately 3–5 sequential cards. Luna executes each released card, runs focused validation, writes its Implementer Report, creates one attributable checkpoint commit, and proceeds directly to the next released card. After the bundle qualification card Luna stops for human Architect review.

Luna stops early only for an architectural contradiction, an invariant that cannot be satisfied without crossing bundle scope, a current-bundle failure that cannot be bounded inside the owning card, repository state inconsistent with the prior checkpoint, or a destructive/unapproved external action. Ordinary implementation defects are corrected inside the owning card and reported.

## 3. Re-baselined remaining bundles

### WRB01 — Current Project Runtime Foundation
Outcome: selecting a Project establishes one current Structured Project State runtime and coherent managed Project source topology. Existing Project Registration and Greenfield Project Creation no longer enter WIR or legacy migration.

### WRB02 — Workflow Application, Inventory, and Routing
Outcome: users create/list/open exact Workflow instances directly; WIR is routing-only and hands off to the same target creation service.

### WRB03 — Workflow Planning Normalization
Outcome: Workflow-specific intake/assessment/planning writes canonical SPS WorkItems/Phases/Criteria. Initial qualification families are Feature/Capability and Issue Resolution plus WIR-routed Feature convergence.

### WRB04 — Shared Execution Kernel and Workspaces
Outcome: Feature and Issue execute through one post-plan runtime and one reusable Workspace family from Work Item Map through integration/repair.

### WRB05 — Product Completion, Remaining Workflow Front Halves, and Retirement
Outcome: Greenfield completes through the shared kernel; remaining front halves use the proven normalization contract; Hub/Source Control present concurrent instances; obsolete runtime/migration paths retire; final qualification runs. This bundle may be split after WRB04 based on the actual shared-kernel surface.

## 4. Current-state findings driving WRB01

- startNewProjectFromLanding() still routes to work-intake.
- Existing Project selection opens Workflow Hub without an explicit Existing Project Registration runtime.
- selectedStructuredProjectId() still uses the legacy/structured provider-generation row as runtime selection.
- structuredProviderCutover, legacy inventory/equivalence/import, and legacy write-fence machinery still exist.
- projectSourceBootstrap still initializes Git directly in the Project root.
- WTR02C/D established the non-Git Project-container and explicit RepositoryCheckout contracts, but current Project bootstrap has not adopted them.
- Workflow Hub still exposes Development/Issue recovery plus Start Work/WIR.
- projectWorkflowStateFacade contains useful SPS Project creation semantics but is not the production Project entry runtime.

## 5. WRB01 hard boundary

WRB01 establishes one current SPS Project runtime, Existing Project Registration, Greenfield Project Creation entry, managed Project/Main/Dev physical source topology, and a hard fence against legacy Workflow reconstruction. Historical Markdown may remain documentation/Evidence. WRB01 does not build the final Workflow Hub, shared execution kernel, Workflow-specific planning front halves, or WIR handoff.