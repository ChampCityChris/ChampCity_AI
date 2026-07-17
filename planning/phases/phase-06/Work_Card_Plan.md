<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-06/work_card_plan/Work_Card_Plan",
  "artifactType": "work_card_plan",
  "schemaVersion": "champcity.artifact.v1",
  "revision": 3,
  "status": "active",
  "projectId": "champcity-ai",
  "phaseId": "phase-06",
  "createdAt": "2026-07-17T02:05:00.000Z",
  "updatedAt": "2026-07-17T02:20:00.000Z",
  "jsonPath": "planning/phases/phase-06/Work_Card_Plan.json",
  "markdownPath": "planning/phases/phase-06/Work_Card_Plan.md",
  "payloadHash": "sha256:b53607e3715facd12a4186e63be82697f913ea6511cc34f7c001476e1251cf8a",
  "relationships": {
    "sources": [
      "champcity-ai/phase-06/phase_planning/Phase_Planning",
      "champcity-ai/phase-06/phase_activation/phase-06",
      "champcity-ai/phase-05/roadmap_rebaseline/WC03"
    ],
    "expectedOutputs": [
      "champcity-ai/phase-06/approval/Operator_Phase_Approval"
    ],
    "supersedes": [],
    "children": []
  },
  "payload": {
    "kind": "work_card_plan",
    "title": "Work Card Plan: phase-06"
  }
}
-->

# Work Card Plan: phase-06

Status: draft_for_operator_review
Phase: phase-06 — Workflow Kernel and Artifact Protocol Replacement
Created: 2026-07-17
Updated: 2026-07-17

This Work Card Plan is not executable by itself. Full Work Cards must be created just in time by the Architect after Operator approval.

## Phase 06 Code Review Rule

WC01 creates the full source-authority Replacement Inventory. WC02 through WC05 must begin by consuming that inventory and performing a scoped code-review checkpoint for the files they will touch before editing source code.

For WC02 through WC05, the Work Card and Implementer Report must state:

- WC01 inventory entries consumed;
- files/code paths reviewed before editing;
- inventory entries confirmed;
- inventory entries narrowed, amended, or newly discovered;
- classification for each touched file: Preserve, Migrate, Replace, Delete, or Defer;
- named supported consumer for any preserved compatibility path;
- old/new dual-authority risk;
- tests or gates added to prevent fallback authority.

If a later Work Card discovers a workflow-authority code path not covered by WC01, it must either amend the inventory as part of that Work Card or stop for Architect disposition before implementation continues. No implementation Work Card may silently preserve an old authority path because it exists.

WC06 is validation-focused. It does not require another full code review unless validation exposes a specific defect. WC06 must include no-source-change verification for the validation artifact pass and evidence review proving WC01 through WC05 completed the required replacement, deletion, and no-fallback work.

## Ordered Candidates

### WC01 — Kernel Contract, Artifact Protocol, and Source Authority Replacement Inventory

Define the target workflow kernel contract, artifact-transition protocol, supported artifact types, transition inputs, transition outputs, blocking model, and no-fallback invariants.

WC01 must also perform a source-code authority review before any replacement implementation begins. The review must identify current workflow, artifact, registry, workflow-state, repository-refresh, routed-action, current-action, and UI-adapter code paths that must be preserved, migrated, replaced, deleted, or deferred.

Minimum source review scope:

- `src/main/workflow/`
- `src/shared/workflow/`
- `src/main/workCards/`
- `src/shared/workCards/`
- `src/main/repository/`
- `src/main/projects/`
- relevant IPC, preload, and renderer current-action bindings
- repository gates and tests under `scripts/` and `test/`

Required WC01 output includes a Replacement Inventory with, at minimum, these fields for each affected module or code path:

- existing file/module
- current responsibility
- current authority problem, if any
- classification: Preserve, Migrate, Replace, Delete, or Defer
- named supported consumer, if preserving compatibility
- migration requirement
- deletion/removal requirement
- tests or gates needed to prevent old/new dual authority
- later Work Card that owns the implementation change

No source-code changes are authorized in WC01. WC01 reviews, classifies, and defines the target contract. WC02 begins replacement implementation from the approved WC01 contract and inventory.

Dependencies: Phase 06 approval. Priority: critical.

### WC02 — Replace EvidenceDerivedWorkflowProjector with Relationship-Driven Resolver

Replace the hand-coded evidence projector with a resolver that consumes verified artifact relationships and explicit transition rules. Remove synthetic ID construction, filename inference, timestamp inference, suffix inference, and WC-specific completion branches.

WC02 must include a targeted code-review checkpoint against the WC01 Replacement Inventory before implementation. The checkpoint must verify the replacement classification and migration/deletion path for the workflow resolver surface, including `evidenceDerivedWorkflowProjector`, transition engine, process contract, route table, routed action services, and routed process invocation services.

Dependencies: WC01. Priority: critical.

### WC03 — Real Phase 04/05 Replay Fixture and No-Fallback Repository Gates

Create real repository replay coverage for Phase 04 and Phase 05 evidence, including repaired-parent completion, WC03 living-doc completion, Phase 05 closeout, and Phase 06 planning activation. Add gates that fail on old/new dual authority and runtime fallback patterns.

WC03 must include a scoped code-review checkpoint for test and repository-gate authority. The checkpoint must identify old WC09 branch-scope assumptions, obsolete changed-file-scope gates, and any tests that encode projector fallback behavior. The review should cover repository gates under `scripts/` and relevant test suites under `test/`.

Dependencies: WC01, WC02. Priority: critical.

### WC04 — Artifact Registry and Workflow State Diagnostic Boundary

Make Artifact Registry and Workflow State explicitly diagnostic/cache unless and until the kernel defines their target role. Ensure neither can override verified artifact graph evidence.

WC04 must include a scoped authority review of registry, workflow-state, repository-refresh, and verified artifact graph code paths. The review must prove which Registry/Workflow State paths are preserved as diagnostic/cache, which are migrated, and which must be blocked from runtime authority.

Dependencies: WC01, WC02. Priority: high.

### WC05 — Kernel-to-UI Current Action Adapter

Connect the new kernel to the current-action presentation layer without letting UI state, reference navigation, stale screen state, or registry cache retarget the action. Include minimal UI usability checks for current action clarity.

WC05 must include a scoped UI/IPC code-review checkpoint before implementation. The checkpoint must identify route bindings, current-action presentation code, reference navigation behavior, preload/main IPC boundaries, and renderer state that could accidentally retarget workflow authority.

Dependencies: WC02, WC03. Priority: high.

### WC06 — Operator Validation of Kernel-Derived Current Action and Phase Closeout Readiness

Perform Operator validation that the kernel-derived current action is accurate, understandable, and based on verified evidence. Confirm no old projector fallback or stale Workflow State authority remains.

WC06 is not a full code-review Work Card. It must review evidence from WC01 through WC05, verify no source-code changes are made during the validation artifact pass, and confirm that any source-code review needed for discovered defects is routed to a repair Work Card rather than silently performed inside validation.

Dependencies: WC01–WC05. Priority: critical.

## Candidate Resolution Rule

Phase 06 closes only when every candidate is completed, completed via repair, explicitly deferred, or cancelled by Operator-approved disposition, and the Phase 06 exit condition has been met.
