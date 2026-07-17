# Work Card Plan: phase-06

Status: draft_for_operator_review
Phase: phase-06 — Workflow Kernel and Artifact Protocol Replacement
Created: 2026-07-17

This Work Card Plan is not executable by itself. Full Work Cards must be created just in time by the Architect after Operator approval.

## Ordered Candidates

### WC01 — Kernel Contract and Artifact Protocol Baseline

Define the target workflow kernel contract, artifact-transition protocol, supported artifact types, transition inputs, transition outputs, blocking model, and no-fallback invariants.

Dependencies: Phase 06 approval. Priority: critical.

### WC02 — Replace EvidenceDerivedWorkflowProjector with Relationship-Driven Resolver

Replace the hand-coded evidence projector with a resolver that consumes verified artifact relationships and explicit transition rules. Remove synthetic ID construction, filename inference, timestamp inference, suffix inference, and WC-specific completion branches.

Dependencies: WC01. Priority: critical.

### WC03 — Real Phase 04/05 Replay Fixture and No-Fallback Repository Gates

Create real repository replay coverage for Phase 04 and Phase 05 evidence, including repaired-parent completion, WC03 living-doc completion, Phase 05 closeout, and Phase 06 planning activation. Add gates that fail on old/new dual authority and runtime fallback patterns.

Dependencies: WC01, WC02. Priority: critical.

### WC04 — Artifact Registry and Workflow State Diagnostic Boundary

Make Artifact Registry and Workflow State explicitly diagnostic/cache unless and until the kernel defines their target role. Ensure neither can override verified artifact graph evidence.

Dependencies: WC01, WC02. Priority: high.

### WC05 — Kernel-to-UI Current Action Adapter

Connect the new kernel to the current-action presentation layer without letting UI state, reference navigation, stale screen state, or registry cache retarget the action. Include minimal UI usability checks for current action clarity.

Dependencies: WC02, WC03. Priority: high.

### WC06 — Operator Validation of Kernel-Derived Current Action and Phase Closeout Readiness

Perform Operator validation that the kernel-derived current action is accurate, understandable, and based on verified evidence. Confirm no old projector fallback or stale Workflow State authority remains.

Dependencies: WC01–WC05. Priority: critical.

## Candidate Resolution Rule

Phase 06 closes only when every candidate is completed, completed via repair, explicitly deferred, or cancelled by Operator-approved disposition, and the Phase 06 exit condition has been met.
