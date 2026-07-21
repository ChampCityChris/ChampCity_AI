# Work Card Plan — Phase 08 Nested Lifecycle and Workspace Recovery

Status: continuous first-pass implementation authorized after handoff commit
Plan revision: 10
Project: ChampCity A/I
Required planning-baseline ancestor: `08f714c276bee6d75496133e42aafa8dfd9b9b80`
Authorized execution start: clean committed HEAD containing the continuous-pass handoff and revision 10 control documents
Second ordered review: Approved
Review record: `planning/phases/phase-08/Architect_Reviews/ARCHITECT_REVIEW_PHASE08_REVISED_SEQUENCE_RELEASE_READINESS.md`
Execution authority: `planning/phases/phase-08/IMPLEMENTER_HANDOFF_PHASE08_CONTINUOUS_FIRST_PASS.md`
Git mutation: not authorized during Implementer execution

## Operator Authorization

The Operator released the complete corrected Phase 08 sequence for one continuous cumulative first-pass Implementer run.

```text
WC01 → WC01A → WC01B
→ WC02 → WC03 → WC04 → WC05
→ WC06 → WC07 → WC08
→ WC09 → WC10 → WC11 → WC12 → WC13
→ WC14 → WC15
```

The handoff and revision 10 control documents must be committed before the Implementer begins. The Implementer records that later clean commit as the actual execution baseline and verifies that the required Phase 08 planning-baseline commit is its ancestor.

The Implementer must not wait for Architect review or Operator validation between cards. One Pending Implementer Report is required for every card that receives a first pass.

Architect review, Operator manual validation, Phase 08 repair-card decisions, and Phase 08 closeout are deferred until the complete first-pass report set exists.

The continuous-pass handoff supersedes pre-release `execution deferred` and `executionAuthorized=false` statements only as execution holds. All card scope, dependency, security, artifact, validation, and reporting requirements remain binding.

## Ordered Work

### WC01 — Nested Lifecycle and Extensible Workspace Registry Foundation

Establish lifecycle vocabulary and the immutable open-ended workspace registry.

### WC01A — Evidence-Derived Lifecycle Projection and Workspace Resolution

Depends on: WC01.

Implement explicit participation roles, stable workspace ownership, evidence-derived current location, selected identity, semantic completion, parent-child return, terminal Project Close, and plain-language resolver evidence.

### WC01B — Artifact Source Revision and Downstream Invalidation

Depends on: WC01A.

Implement monotonic revisions, source-revision references, freshness checks, coordinated invalidation, bundle atomicity, handoff regeneration, and validation precedence.

### WC02 — Project Intake Capture and Architect Interview Prompt Generation

Depends on: WC01, WC01A, WC01B.

Implement `project-intake-capture`, greenfield planning initialization, fixed intake, Approved Operator capture, and the Approved non-review interview prompt.

### WC03 — Embedded Architect Browser and MCP Handoff Validation

Depends on: WC02.

Implement the secure embedded subscription surface and MCP handoff foundation. Operator-observed authentication and live MCP acceptance are deferred; they must not be reported as passed without evidence.

### WC04 — Architect Interview Workspace

Depends on: WC02, WC03 first-pass foundation.

Complete `architect-interview`, canonical interview review/revision, freshness, and Project Intake completion.

### WC05 — Project Planning Workspace

Depends on: WC04.

Replace provisional Project Planning with `project-planning-review`, generate the Approved non-review handoff, and synchronously disposition Project Profile and Roadmap.

### WC06 — Project Building Phase Map Workspace

Depends on: WC05.

Implement `project-phase-map`, Phase Map handoff/review, and computed first-incomplete phase. Phase completion is not persisted in the map.

### WC07 — Phase Interview Workspace

Depends on: WC06, WC03 first-pass foundation.

Implement `phase-interview`, Approved non-review handoff, no-questions path, freshness, and current Approved interview completion.

### WC08 — Phase Planning Bundle Workspace

Depends on: WC07, WC03 first-pass foundation.

Replace provisional Phase Planning with `phase-planning-bundle`, generate the Approved non-review handoff, synchronously disposition the bundle, and enforce the candidate contract.

### WC09 — Phase Building Candidate Selection and Work Card Intake

Depends on: WC08.

Implement distinct `phase-work-card-selection` and `work-card-intake` workspaces, evidence-derived selection, and an Approved non-review handoff.

### WC10 — Formal Work Card Planning Workspace

Depends on: WC09, WC03 first-pass foundation.

Replace provisional Work Card with `work-card-planning`, create one Formal Work Card, return rejected candidates to Phase Planning revision, and invalidate stale downstream evidence after amendment.

### WC11 — Implementer Handoff and Report Review Workspace

Depends on: WC10, WC03 first-pass foundation.

Implement `work-card-building-review`. The current Approved Work Card is the sole Implementer instruction; Architect review is represented by the current Implementer Report disposition.

### WC12 — Work Card Repair Subsystem

Depends on: WC11.

Implement `work-card-repair`. Prove the pre-validation path through automated and non-Operator checks; unit-test the post-validation trigger contract.

### WC13 — Work Card Validation, Close, and Next-Candidate Return

Depends on: WC09, WC11, WC12.

Replace provisional Operator Validation with `work-card-validation`, add `work-card-close`, create immutable Operator-attempt records, integrate the failed-validation repair path, and return to WC09.

### WC14 — Phase Validation and Close Workspace

Depends on: WC13.

Retire provisional Phase Closeout navigation. Implement `phase-validation` and derived `phase-close`, current corpus review, Pending closeout creation, Approved + Close completion, and Approved DoNotClose retention at Validation.

### WC15 — Project Validation and Close Workspace

Depends on: WC14.

Implement `project-validation` and terminal `project-close`, governed corpus review, Pending closeout creation, closure blockers, and Approved + Close terminal completion.

## Shared Contracts

All cards follow:

```text
planning/project/Design_Documents/NESTED_PROJECT_PHASE_WORK_CARD_LIFECYCLE_MODEL.md
planning/project/Design_Documents/EVIDENCE_DERIVED_LIFECYCLE_PROJECTION_AND_WORKSPACE_RESOLUTION.md
planning/project/Design_Documents/ARTIFACT_SOURCE_REVISION_AND_DOWNSTREAM_INVALIDATION.md
planning/project/Design_Documents/PHASE_08_WORKSPACE_INVENTORY_AND_MIGRATION.md
planning/project/Design_Documents/GENERATED_ARCHITECT_HANDOFF_CONTRACT.md
planning/project/Design_Documents/WORK_CARD_CANDIDATE_CONTRACT.md
```

The remaining Operator-confirmed lifecycle and workspace design documents also remain controlling.

## Continuous First-Pass Rules

1. Implement cards in the exact approved order.
2. Read each card's Markdown and JSON immediately before its pass.
3. Run the card's required automated validation.
4. Create the card's Pending Implementer Report.
5. Continue without waiting for review.
6. Do not self-approve reports or Work Cards.
7. Do not create Phase 08 repair cards during this first-pass run.
8. Record deferred Operator and Architect validation truthfully.
9. Continue after a local failure when downstream work remains safe and truthful.
10. Stop only for the hard blockers defined in the continuous-pass handoff.

## Global Constraints

Do not restore approval artifacts or queues, hashes, route tokens, role gates, execution-run authority, fixed workspace-label unions, hidden current lifecycle state, separate execution packets, separate Architect Review approvals, pre-action Validation Records, recursive repairs, duplicate corpus snapshots, provider API substitution, DOM automation, credential extraction, or browser-security bypasses.

Do not stage, commit, push, merge, rebase, tag, reset, clean, restore, or stash during Implementer execution.

## Completion Boundary

The continuous first pass ends after the WC15 Implementer Report and one cumulative summary.

At that point:

- every completed card report remains Pending;
- Architect review remains pending;
- Operator manual validation remains pending;
- Phase 08 closeout remains unauthorized;
- Git mutation remains unauthorized.

## Document Disposition

Document.Status=Approved
