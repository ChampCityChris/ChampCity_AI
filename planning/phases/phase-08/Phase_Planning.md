# Phase 08 — Nested Lifecycle and Workspace Recovery

Status: corrected planning approved; ready for explicit Operator release decision
Planning revision: 9
Project: ChampCity A/I
Repository baseline: clean baseline verified before correction pass
Second ordered review: Approved
Review record: `planning/phases/phase-08/Architect_Reviews/ARCHITECT_REVIEW_PHASE08_REVISED_SEQUENCE_RELEASE_READINESS.md`
Implementation execution: not authorized
Git mutation: not authorized

## Phase Purpose

Restore the nested Project, Phase, and Work Card product lifecycle on the Phase 07 clean-room document-disposition foundation without restoring rejected governance architecture.

```text
Project
├── Intake
├── Planning
├── Building
│   └── Phase
│       ├── Intake
│       ├── Planning
│       ├── Building
│       │   └── Work Card
│       │       ├── Intake
│       │       ├── Planning
│       │       ├── Building
│       │       ├── Validation
│       │       └── Close
│       ├── Validation
│       └── Close
├── Validation
└── Close
```

Each level uses:

```text
Intake → Planning → Building → Validation → Close
```

## Corrected Foundation

```text
WC01  lifecycle vocabulary and open-ended workspace registry
WC01A evidence-derived lifecycle and workspace projection
WC01B source revision, freshness, and downstream invalidation
```

Current location, selected phase, selected Work Card, parent-child returns, semantic close, and terminal state are derived from current repository evidence. No hidden current-action authority is authorized.

Every document has an explicit participation role. Successful generated handoffs are Approved `nonReviewHandoff` documents and never independent approval gates.

Workflow artifacts use monotonic revision identity and source-revision references. Substantive upstream changes invalidate stale downstream approval while preserving historical evidence.

## Stable Workspace Model

The complete 17-workspace production inventory, deterministic order, owning cards, and retirement of the five provisional Phase 07 entries are defined in:

`planning/project/Design_Documents/PHASE_08_WORKSPACE_INVENTORY_AND_MIGRATION.md`

Phase Building candidate selection and Work Card Intake are distinct. Work Card Building review precedes repair. Phase and Project Close are derived evidence views without a second disposition action.

## Generated Handoff Contract

Canonical paths and treatment are defined in:

`planning/project/Design_Documents/GENERATED_ARCHITECT_HANDOFF_CONTRACT.md`

Every successful handoff is Approved, non-review, revisioned, source-referenced, regenerable, and names its exact expected output pair.

## Candidate Contract

The Approved Work Card Plan uses:

```text
candidateId
order
title
purpose
dependsOn[]
resolutionStatus
resolutionReason
evidencePaths[]
```

Persisted resolution values are `planned`, `deferred`, `superseded`, `alreadySatisfied`, and `carriedForward`. Completion remains derived. Candidate changes after approval return the Phase Planning bundle to Pending and invalidate downstream work.

## Phase Map Completion

The Phase Map persists phase identity, order, purpose, dependencies, and source references only. Phase completion is computed from current Approved Close Phase Closeouts.

## Repair Acceptance Boundary

WC12 proves the real pre-validation repair path and unit-tests the post-validation trigger contract. WC13 proves the real failed-validation → repair → new validation attempt path after production Validation Records exist.

## Close Semantics

```text
Phase Close complete
= current Phase_Closeout Approved
  AND closureDecision=Close

Project Close complete
= current Project_Closeout Approved
  AND closureDecision=Close
```

Approved `DoNotClose` remains current at Validation.

## Approved Ordered Sequence

```text
WC01 → WC01A → WC01B
→ WC02 → WC03 → WC04 → WC05
→ WC06 → WC07 → WC08
→ WC09 → WC10 → WC11 → WC12 → WC13
→ WC14 → WC15
```

Detailed dependencies, stop rules, paths, and release boundaries are authoritative in `planning/phases/phase-08/Work_Card_Plan.md` revision 9.

## Authoritative Design Corpus

The original seven lifecycle/workspace designs remain controlling together with these correction contracts:

- `EVIDENCE_DERIVED_LIFECYCLE_PROJECTION_AND_WORKSPACE_RESOLUTION.md`
- `ARTIFACT_SOURCE_REVISION_AND_DOWNSTREAM_INVALIDATION.md`
- `PHASE_08_WORKSPACE_INVENTORY_AND_MIGRATION.md`
- `GENERATED_ARCHITECT_HANDOFF_CONTRACT.md`
- `WORK_CARD_CANDIDATE_CONTRACT.md`

All are under `planning/project/Design_Documents/`.

## Prohibited Architecture

Do not reintroduce approval artifacts or queues, hidden current-action/active-level/terminal authority, route tokens, role gates, execution runs, hashes, timestamp precedence, fixed workspace-label unions, separate execution packets, separate Architect Review approvals, pre-action Validation Records, recursive repairs, duplicate corpus snapshots, provider API substitution, browser credential extraction, DOM automation, or browser-security bypasses.

## Implementation Boundary

The corrected sequence passed the second ordered Architect review. WC01 is eligible for an explicit Operator release decision but has not been released.

Implementation begins only after the Operator explicitly releases WC01. Each later card remains withheld until dependencies are accepted and the Operator releases it.

Git mutation remains separately unauthorized.

## Document Disposition

Document.Status=Approved
