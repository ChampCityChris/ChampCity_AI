# Artifact Source Revision and Downstream Invalidation

Status: confirmed sequence correction
Project: ChampCity A/I
Confirmed: 2026-07-21

## Purpose

Prevent stale downstream approvals when an approved source document changes.

The application must preserve durable document evidence while making it impossible for a downstream artifact created from an older source revision to remain current solely because its disposition still says `Approved`.

## Revision Identity

Every current workflow artifact pair must contain one monotonic integer:

```text
Artifact.Revision=<positive integer>
```

The synchronized JSON sibling uses:

```json
{
  "artifactRevision": 1
}
```

Revision identity is not a hash. It must not be derived from timestamps, filesystem order, or Git metadata.

## Revision Increment Rule

Increment `artifactRevision` when substantive artifact content or its declared source set changes.

Do not increment solely for a disposition-only change. Operator revision notes and disposition metadata may be updated without changing substantive source revision until the Architect or Operator saves revised artifact content.

## Source Revision References

Every generated downstream artifact must record the current revision of each authoritative source used to create it:

```json
{
  "sourceRevisions": [
    {
      "path": "planning/.../SOURCE.json",
      "revision": 3
    }
  ]
}
```

Markdown must include an equivalent readable source-revision section using repository-relative paths.

## Freshness Evaluation

A downstream artifact is current only when every required source path exists and its current `artifactRevision` matches the recorded source revision.

A mismatched or missing source produces:

```text
freshnessState=stale
```

The application must display the exact stale source and expected/current revision in plain language.

## Coordinated Invalidation

When an approved source is substantively revised, the save operation must identify affected downstream artifacts and stage their disposition reset to `Pending` as one bounded transaction where those artifacts remain part of the current supported workflow.

If the reset cannot complete safely, the source revision must not be reported as fully successful. The application may preserve the revised source and mark downstream artifacts as derived-stale only when rollback is impossible and the error is explicit and recoverable.

Bundle members must invalidate together:

- `Project_Profile` and `Project_Roadmap`;
- `Phase_Planning` and `Work_Card_Plan`.

## Required Invalidation Chain

At minimum:

```text
Project Intake revision
→ Architect Interview Prompt regenerated
→ Project Architect Interview Pending/stale
→ Project Planning bundle Pending/stale
→ Phase Map and all dependent phase/work-card evidence stale

Project Architect Interview revision
→ Project Planning bundle Pending/stale
→ all dependent Project Building and child lifecycle evidence stale

Project Profile or Project Roadmap revision
→ Phase Map Pending/stale
→ dependent Phase and Work Card evidence stale

Phase Map revision
→ affected Phase Interview and all dependent phase/work-card evidence stale

Phase Interview revision
→ Phase Planning bundle Pending/stale
→ dependent Work Card evidence stale

Phase Planning or Work Card Plan revision
→ candidate handoffs regenerated
→ affected Formal Work Cards and later evidence stale

Formal Work Card revision after implementation
→ Implementer Reports, repairs, and Validation Records for the prior revision stale

Implementer Report or repair implementation revision
→ later Validation Records for the prior implementation evidence stale
```

## Candidate Plan Revision

A candidate-state or dependency change after Phase Planning approval is a substantive Work Card Plan revision. Both planning bundle documents return to `Pending`, revision numbers increment as applicable, and downstream candidate evidence is re-evaluated.

## Validation Precedence

A passing Validation Record is current only when it references the current Approved Formal Work Card revision and the latest current Approved implementation or repair report revision.

Any later implementation change invalidates prior passing validation for close purposes without deleting the earlier validation attempt.

## Historical Evidence

Invalidation does not delete or rewrite historical evidence. Earlier reports and validation attempts remain readable and are marked stale/non-current relative to the current source chain.

## Authority Boundary

Do not use content hashes, timestamps, Git commits, execution runs, hidden revision databases, or filesystem order as revision authority.

## Document Disposition

Document.Status=Approved
