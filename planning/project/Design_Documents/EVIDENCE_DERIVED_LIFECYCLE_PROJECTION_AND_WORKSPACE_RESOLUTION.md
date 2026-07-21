# Evidence-Derived Lifecycle Projection and Workspace Resolution

Status: confirmed sequence correction
Project: ChampCity A/I
Confirmed: 2026-07-21

## Purpose

Define how ChampCity A/I derives the current lifecycle location and workspace from durable repository documents without persisting a hidden current-action, active-phase, active-Work-Card, or terminal-state record.

This contract replaces the flat rule “first discovered non-Approved document is current” with a semantic projection over the approved nested lifecycle.

## Lifecycle Model

```text
Project
└── Phase
    └── Work Card
```

Each level uses:

```text
Intake → Planning → Building → Validation → Close
```

## Document Participation Roles

Every discovered logical document must receive one explicit role from deterministic artifact classification:

```text
gatingReview
compoundGatingReview
nonReviewHandoff
contextOnly
historical
```

Meanings:

- `gatingReview`: a reviewable document whose effective disposition may block its owning workspace.
- `compoundGatingReview`: one member of a named bundle whose semantic completion predicate may require multiple documents or fields.
- `nonReviewHandoff`: a generated, viewable, regenerable instruction document that does not require independent approval.
- `contextOnly`: current supporting evidence that never becomes the current review target by itself.
- `historical`: retained evidence excluded from current lifecycle projection.

Participation role must be visible in the document detail model and resolver explanation. It must not be an invisible exception.

## Workspace Ownership

Document-to-workspace ownership is defined by an explicit artifact contract registry. Path-pattern classification may be used as an implementation mechanism, but the resulting artifact type, participation role, and owning workspace must be deterministic and testable.

The resolver must not depend on user-facing workspace labels as type authority.

## Evidence-Derived Projection

The resolver must derive:

```text
current lifecycle level
current lifecycle stage
current workspace ID
selected project identity
selected phase identity, when applicable
selected Work Card identity, when applicable
plain-language reason
blocking or completion evidence
```

The resolver evaluates lifecycle locations in canonical nested order, including:

- workspace order within the same lifecycle location;
- Project Building entry into the first incomplete Phase;
- Phase Building entry into the first eligible Work Card candidate;
- Work Card Close return to Phase Building;
- Phase Close return to Project Building;
- Project Validation entry when every required phase is closed;
- terminal Project Close.

## Semantic Completion Predicates

Disposition alone is insufficient for compound close records.

```text
Phase Close complete
= Phase_Closeout.Document.Status=Approved
  AND closureDecision=Close

Project Close complete
= Project_Closeout.Document.Status=Approved
  AND closureDecision=Close
```

`Approved + DoNotClose` remains current at the corresponding Validation location.

Planning bundles complete only when all required logical documents are valid, synchronized, current, and Approved.

## Selected Identity

Selected phase identity is derived from the Approved `Phase_Map` plus current Approved Phase Closeout evidence.

Selected Work Card identity is derived from the Approved `Work_Card_Plan`, candidate dependencies and resolution status, Formal Work Card evidence, Implementer Report evidence, repair evidence, and current Validation Records.

No global active-phase or active-Work-Card field is authorized.

## Direct Navigation

A visible Continue or Return action may target the resolver-derived next location. The action must re-evaluate repository evidence before navigation and must not write hidden routing state.

## Resolver Explanation

For every current location, the application must expose a plain-language explanation containing:

- lifecycle level and stage;
- workspace label and stable ID;
- selected phase or Work Card, when applicable;
- document or semantic predicate that blocks progression;
- source paths used for the decision;
- stale-source or invalid-document diagnostics.

## Authority Boundary

Do not introduce route tables as workflow authority, role gates, execution runs, approval queues, target hashes, decision timelines, persisted current-action records, or filesystem/timestamp precedence.

## Document Disposition

Document.Status=Approved
