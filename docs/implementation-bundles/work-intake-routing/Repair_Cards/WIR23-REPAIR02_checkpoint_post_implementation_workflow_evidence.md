# WIR23-REPAIR02 — Checkpoint Post-Implementation Workflow Evidence

**Parent:** WIR19 / WIR22-REPAIR06 / WIR23  
**Architect finding:** AR-WIR-02 in `ARCHITECT_CODE_REVIEW_2026-09-20.md`  
**Implementer Report:** `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR23-REPAIR02_IMPLEMENTER_REPORT.md`

## Confirmed Defect

The existing machine-owned source checkpoint occurs when implementation source and the current Implementer Report are ready.

Required lifecycle evidence is written afterward: report review disposition, validation, Work Item close, and Phase/Plan acceptance.

There is no later application-owned commit path for those canonical workflow artifacts.

This can leave prior Work Item evidence dirty when the next Work Item begins and leaves final Plan acceptance dirty when integration requires a clean incoming checkout.

## Root Cause

WIR19 established an implementation-source checkpoint but the routed execution completion path later gained additional canonical lifecycle writes without a corresponding durable lifecycle-evidence checkpoint.

The existing branch verifier consequently understands only implementation source-checkpoint lineage.

## Objective

Preserve the existing source checkpoint and add deterministic machine-owned lifecycle-evidence checkpoints that return the Work Intake checkout to a clean, durable state at execution boundaries.

## Architectural Decision

Use two distinct checkpoint semantics:

1. **Source checkpoint** — existing behavior, anchoring exact implementation source and Implementer Report output before review/validation.
2. **Lifecycle-evidence checkpoint** — new deterministic application checkpoint anchoring the canonical workflow evidence created after that source checkpoint.

Do not defer the implementation source checkpoint until the end of the lifecycle. It remains the reviewable source revision.

## Required Changes

1. Introduce a bounded lifecycle-evidence checkpoint contract/receipt with at least:
   - Intake identity;
   - Repository identity;
   - Work branch / SourceLine identity;
   - exact prior head;
   - boundary kind and boundary identity;
   - exact committed canonical artifact paths and content digests;
   - resulting checkpoint identity.
2. The checkpoint service must stage only attributable canonical workflow evidence for the current Intake/boundary.
3. It must reject:
   - unrelated source changes;
   - unrelated repository documents;
   - generated/dependency content;
   - ambiguous or cross-Intake artifacts;
   - unexpected staged state.
4. Emit lifecycle checkpoints at these successful boundaries:
   - Work Item lifecycle complete after required review/validation/close evidence is current;
   - Phase acceptance complete after the approved current Phase closeout;
   - Plan acceptance complete after the approved current Plan closeout.
5. Generalize `workIntakeBranchService.verify()` to accept the existing source-checkpoint receipt and the new lifecycle-evidence receipt as valid application-owned single-parent lineage.
6. The verifier must continue to reject arbitrary commits, foreign Intake/Repository identities, broken `beforeHead` chains, or commits without a recognized machine receipt.
7. Update the active Work Intake head through verification semantics without weakening exact branch ownership.
8. Preserve optional remote synchronization as policy-dependent; local durability must not depend on a remote.

## Required Proof

The production lifecycle must establish these code-level outcomes:

1. Completing Work Item 1 leaves its source and lifecycle evidence durably represented and the Work Intake checkout clean.
2. Work Item 2 can begin from that exact head without treating Work Item 1 lifecycle evidence as unrelated dirty state.
3. A completed Phase can persist its accepted closeout without contaminating the next Phase's source checkpoint.
4. Final approved Plan acceptance receives a lifecycle checkpoint.
5. The integration service sees a clean incoming checkout after Plan completion.
6. Branch verification accepts the exact mixed chain of source and lifecycle checkpoints and rejects an arbitrary unrecognized commit.
7. Existing implementation source checkpoint semantics remain intact.

## Preserve

- The existing implementation source checkpoint.
- Exact source attribution.
- Current Work Item review/validation/Repair/close semantics.
- Direct and phased topology.
- Machine-owned Git/source-control transitions.
- Integration Candidate and Integration Repair behavior.

## Forbidden Changes

- Do not loosen the integration clean-check requirement.
- Do not make the next Work Item source checkpoint silently absorb unrelated prior changes.
- Do not allow arbitrary commits in Work Intake lineage.
- Do not give an agent Git/source-control authority.
- Do not create renderer-owned checkpoint state.
- Do not broaden this card into Research integration or next-Intake base selection.

## Implementer Report

Document the new receipt semantics, exact checkpoint boundaries, branch-lineage rules, production files changed, proof of clean boundary transitions, deviations, and residual risks.

## Return Path

Proceed to WIR23-REPAIR03 after this repair is Architect-reviewed.
