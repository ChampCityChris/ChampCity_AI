# Phase 08 — Nested Lifecycle and Workspace Recovery

Status: continuous first-pass implementation authorized after handoff commit
Planning revision: 10
Project: ChampCity A/I
Required planning-baseline ancestor: `08f714c276bee6d75496133e42aafa8dfd9b9b80`
Authorized execution start: clean committed HEAD containing the continuous-pass handoff and revision 10 control documents
Second ordered review: Approved
Review record: `planning/phases/phase-08/Architect_Reviews/ARCHITECT_REVIEW_PHASE08_REVISED_SEQUENCE_RELEASE_READINESS.md`
Execution authority: `planning/phases/phase-08/IMPLEMENTER_HANDOFF_PHASE08_CONTINUOUS_FIRST_PASS.md`
Git mutation: not authorized during Implementer execution

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

Each lifecycle level uses:

```text
Intake → Planning → Building → Validation → Close
```

## Corrected Foundation

```text
WC01  lifecycle vocabulary and open-ended workspace registry
WC01A evidence-derived lifecycle and workspace projection
WC01B source revision, freshness, and downstream invalidation
```

Current location, selected phase, selected Work Card, parent-child returns, semantic close, and terminal Project Close are derived from repository evidence. No hidden current-action authority is authorized.

Every document has an explicit participation role. Successful generated handoffs are Approved `nonReviewHandoff` documents and never independent approval gates.

Workflow artifacts use monotonic revision identity and source-revision references. Substantive upstream changes invalidate stale downstream approval while preserving historical evidence.

## Stable Workspace Model

The complete production inventory, deterministic ordering, owning cards, and migration of the five provisional Phase 07 workspaces are defined in:

`planning/project/Design_Documents/PHASE_08_WORKSPACE_INVENTORY_AND_MIGRATION.md`

Phase Building candidate selection and Work Card Intake are distinct workspaces. Work Card Building review precedes repair. Phase and Project Close are derived evidence views without a second disposition action.

## Shared Contracts

The corrected foundation also includes:

- `planning/project/Design_Documents/GENERATED_ARCHITECT_HANDOFF_CONTRACT.md`
- `planning/project/Design_Documents/WORK_CARD_CANDIDATE_CONTRACT.md`
- `planning/project/Design_Documents/EVIDENCE_DERIVED_LIFECYCLE_PROJECTION_AND_WORKSPACE_RESOLUTION.md`
- `planning/project/Design_Documents/ARTIFACT_SOURCE_REVISION_AND_DOWNSTREAM_INVALIDATION.md`

The original Operator-confirmed lifecycle and workspace design documents remain controlling.

## Approved Sequence

```text
WC01 → WC01A → WC01B
→ WC02 → WC03 → WC04 → WC05
→ WC06 → WC07 → WC08
→ WC09 → WC10 → WC11 → WC12 → WC13
→ WC14 → WC15
```

Detailed card paths, dependencies, validation requirements, and continuous-pass rules are authoritative in `planning/phases/phase-08/Work_Card_Plan.md` revision 10 and the continuous-pass handoff.

## Continuous First-Pass Authorization

The Operator released the entire corrected sequence for one cumulative Implementer pass after the handoff and revision 10 control documents are committed.

The Implementer must start from a clean committed HEAD that:

- contains `planning/phases/phase-08/IMPLEMENTER_HANDOFF_PHASE08_CONTINUOUS_FIRST_PASS.md`;
- contains Phase Planning revision 10;
- contains Work Card Plan revision 10; and
- descends from planning-baseline commit `08f714c276bee6d75496133e42aafa8dfd9b9b80`.

The first-pass operating model is:

```text
Implement card
→ run automated validation
→ write Pending Implementer Report
→ continue to next card
```

Until all first passes are complete:

- Architect review is deferred;
- Operator manual validation is deferred;
- Implementer Report disposition remains Pending;
- Phase 08 repair-card creation is deferred;
- Phase 08 closeout is deferred;
- no Git operation is authorized.

The continuous-pass handoff supersedes only prior execution holds. It does not relax card scope, security, artifact, evidence, validation, or truthful-reporting requirements.

WC03's Operator-observed authentication and live MCP acceptance remain deferred. The Implementer must implement and test the safe foundation, record the external lane as pending, and must not substitute mocked success.

WC12 proves the real pre-validation repair path and unit-tests the post-validation trigger contract. WC13 implements automated integration coverage for the complete failed-validation repair path. Operator performance of the manual scenario remains deferred.

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

## Prohibited Architecture

Do not reintroduce approval artifacts or queues, hidden current-action or terminal authority, route tokens, role gates, execution runs, hashes, timestamp precedence, fixed workspace-label unions, separate execution packets, separate Architect Review approvals, pre-action Validation Records, recursive repairs, duplicate corpus snapshots, provider API substitution, browser credential extraction, DOM automation, or browser-security bypasses.

## Implementation Boundary

Implementation is authorized only through:

`planning/phases/phase-08/IMPLEMENTER_HANDOFF_PHASE08_CONTINUOUS_FIRST_PASS.md`

The run begins only after these control-document changes are committed and the repository is clean.

The run ends after WC15 or a documented hard blocker. It does not include Architect acceptance, Operator validation, phase closeout, release work, or Git mutation.

## Document Disposition

Document.Status=Approved
