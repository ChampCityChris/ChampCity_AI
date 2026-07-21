# Work Card Plan — Phase 08 Nested Lifecycle and Workspace Recovery

Status: corrected sequence approved; ready for explicit Operator release decision
Plan revision: 9
Project: ChampCity A/I
Repository baseline: clean baseline verified before correction pass
Second ordered review: Approved
Review record: `planning/phases/phase-08/Architect_Reviews/ARCHITECT_REVIEW_PHASE08_REVISED_SEQUENCE_RELEASE_READINESS.md`
Implementation execution: not authorized
Git mutation: not authorized

## Planning Rule

Work Card design approval does not authorize execution. Cards are released sequentially only after dependencies are accepted and the Operator explicitly releases the active card.

## Approved Corrected Sequence

```text
WC01
→ WC01A
→ WC01B
→ WC02 → WC03 → WC04 → WC05
→ WC06 → WC07 → WC08
→ WC09 → WC10 → WC11 → WC12 → WC13
→ WC14 → WC15
```

### WC01 — Nested Lifecycle and Extensible Workspace Registry Foundation

Defines lifecycle vocabulary and immutable open-ended workspace registry while preserving the provisional clean-room workspaces for later controlled migration.

### WC01A — Evidence-Derived Lifecycle Projection and Workspace Resolution

Depends on: WC01.

Implements explicit document participation roles, stable workspace ownership, evidence-derived location and selected identity, semantic completion predicates, parent-child returns, terminal Project Close, and plain-language resolver evidence.

### WC01B — Artifact Source Revision and Downstream Invalidation

Depends on: WC01A.

Implements monotonic revisions, source-revision references, freshness checks, coordinated invalidation, handoff regeneration, bundle atomicity, and validation precedence.

### WC02 — Project Intake Capture and Architect Interview Prompt Generation

Depends on: WC01, WC01A, WC01B.

Implements `project-intake-capture`, minimal greenfield planning initialization, fixed intake, Approved direct Operator capture, and Approved non-review interview prompt naming the canonical output.

### WC03 — Embedded Architect Browser and MCP Handoff Validation

Depends on: WC02.

High-risk external gate proving the real secure embedded subscription surface, handoff, and MCP write-back. Mocked success is prohibited.

### WC04 — Architect Interview Workspace

Depends on: WC02 and accepted WC03.

Completes `architect-interview`, canonical interview review/revision, freshness, and Project Intake completion.

### WC05 — Project Planning Workspace

Depends on: WC04.

Replaces provisional Project Planning with `project-planning-review`, generates the Approved non-review handoff, and synchronously dispositions current Project Profile and Roadmap.

### WC06 — Project Building Phase Map Workspace

Depends on: WC05.

Implements `project-phase-map`, Phase Map handoff/review, and computed first-incomplete phase. Phase completion is not persisted in the map.

### WC07 — Phase Interview Workspace

Depends on: WC06 and accepted WC03.

Implements `phase-interview`, Approved non-review handoff, no-questions path, freshness, and current Approved interview completion.

### WC08 — Phase Planning Bundle Workspace

Depends on: WC07 and accepted WC03.

Replaces provisional Phase Planning with `phase-planning-bundle`, generates the Approved non-review handoff, synchronously dispositions the bundle, and enforces the candidate contract.

### WC09 — Phase Building Candidate Selection and Work Card Intake

Depends on: WC08.

Implements distinct `phase-work-card-selection` and `work-card-intake` workspaces, evidence-derived selection, and an Approved non-review handoff that cannot gate progression.

### WC10 — Formal Work Card Planning Workspace

Depends on: WC09 and accepted WC03.

Replaces provisional Work Card with `work-card-planning`, creates one Formal Work Card, returns Rejected candidates to Phase Planning revision, and invalidates stale downstream evidence after amendment.

### WC11 — Implementer Handoff and Report Review Workspace

Depends on: WC10 and accepted WC03.

Implements `work-card-building-review` at Building order 10. The current Approved Work Card is the sole Implementer instruction; Architect review is the current Implementer Report disposition.

### WC12 — Work Card Repair Subsystem

Depends on: WC11.

Implements `work-card-repair` at Building order 20. WC12 proves the real pre-validation loop and unit-tests the post-validation contract; WC13 owns real post-validation acceptance.

### WC13 — Work Card Validation, Close, and Next-Candidate Return

Depends on: WC09, WC11, WC12.

Replaces provisional Operator Validation with `work-card-validation`, adds `work-card-close`, creates immutable Operator attempts, proves the real post-validation repair loop, and returns to WC09.

### WC14 — Phase Validation and Close Workspace

Depends on: WC13.

Retires provisional Phase Closeout navigation. Implements `phase-validation` and derived `phase-close`, current corpus review, Pending closeout creation, Approved + Close completion, and Approved DoNotClose retention at Validation.

### WC15 — Project Validation and Close Workspace

Depends on: WC14.

Implements `project-validation` and terminal `project-close`, governed corpus review, Pending closeout creation, closure blockers, and Approved + Close terminal completion.

## Shared Contracts

All cards follow:

- `planning/project/Design_Documents/EVIDENCE_DERIVED_LIFECYCLE_PROJECTION_AND_WORKSPACE_RESOLUTION.md`
- `planning/project/Design_Documents/ARTIFACT_SOURCE_REVISION_AND_DOWNSTREAM_INVALIDATION.md`
- `planning/project/Design_Documents/PHASE_08_WORKSPACE_INVENTORY_AND_MIGRATION.md`
- `planning/project/Design_Documents/GENERATED_ARCHITECT_HANDOFF_CONTRACT.md`
- `planning/project/Design_Documents/WORK_CARD_CANDIDATE_CONTRACT.md`

## Stop Rules

1. Do not execute before dependencies are accepted.
2. Stop on failed acceptance, scope conflict, stale source, or external-capability blocker.
3. Do not implement later-card scope early.
4. A blocked WC03 blocks every later embedded Architect workspace.
5. WC13 owns real post-validation repair-loop acceptance.
6. Current lifecycle location remains evidence-derived.
7. Git mutation requires separate Operator authorization.

## Global Constraints

Do not restore approval artifacts or queues, hashes, route tokens, role gates, execution-run authority, fixed workspace-label unions, hidden current lifecycle state, separate execution packets, separate Architect Review approvals, pre-action Validation Records, recursive repairs, duplicate corpus snapshots, provider API substitution, DOM automation, credential extraction, or browser-security bypasses.

## Release Rule

The second ordered review found no remaining blocking planning defect. WC01 is eligible for an explicit Operator release decision, but it is not currently released.

When released, only WC01 and its approved handoff may be provided to the Implementer. Every later card remains withheld until dependencies are accepted and the Operator releases it.

## Document Disposition

Document.Status=Approved
