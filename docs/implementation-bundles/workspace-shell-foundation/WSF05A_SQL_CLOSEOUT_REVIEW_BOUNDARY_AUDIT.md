# WSF05A-AUDIT — SQL Closeout Candidate / Review Boundary Gap

**Current head:** `97717e2`
**Purpose:** establish the missing structured-state boundary required by recovered Project Validation and Phase Validation workspaces.

## Confirmed gap

The historical Greenfield lifecycle did not close a Project/Phase directly from validation evidence.

It used:

```text
validation evidence/current lifecycle state
→ create proposed Closeout
→ render Closeout document
→ Operator disposition of exact Closeout
→ approved current Close decision
→ lifecycle completes
→ Close workspace
```

Current SQL behavior skips the candidate/review boundary:

```text
validation/criteria satisfied
→ structuredCloseAdvanceService.close()
→ lifecycle mutation
```

Mapping the historical Create Closeout button directly to `close()` changes Operator behavior and erases a reviewed artifact.

## Scope

The same gap exists for:

- Project Validation → Project Close;
- Phase Validation → Phase Close.

Work Card Validation uses a different validation-record lifecycle and is not part of this foundation card.

## Architecture decision

Add one typed `CloseoutReviewCycle` Project State entity.

Body:

- `workflowId`
- `targetEntityId`
- `scope: "project" | "phase"`
- `closureDecision: "Close" | "DoNotClose"`
- `rationale`
- `semanticDigest`
- `layout: { memberIds, sources }`

For `scope=project`, `targetEntityId` is the exact Project Creation Workflow. Closing it completes the Project Creation Workflow; it does **not** retire/close the owning Project record.

For `scope=phase`, `targetEntityId` is the exact Phase.

The cycle retains one identity across revisions. Saving a changed candidate advances its record version and makes prior review stale.

## Review authority

An exact human Operator Decision governs the exact `CloseoutReviewCycle@recordVersion`.

Supported review outcomes:

- approved
- revision_requested
- rejected

An approved current candidate with `closureDecision=Close` atomically performs the applicable lifecycle completion.

An approved `DoNotClose` candidate records the Operator disposition but leaves the target open and the workflow at Validation.

Revision Requested / Rejected leave the target open.

## Freshness

A closeout candidate is current only when all captured source/member record versions still match.

Sources must include the exact target revision and current validation/criterion evidence used to establish close eligibility.

Changing required validation/decision evidence after candidate creation makes the candidate stale and prevents approval/closure until revised.

## Relationships

Add a typed relationship such as:

`closeout_review_for: CloseoutReviewCycle -> Workflow | Phase`

`governs` must allow `Decision -> CloseoutReviewCycle`.

Do not use `Evidence`, `Decision`, or generic `relates_to` as a substitute for the candidate identity.

## Projection/export

Every `CloseoutReviewCycle` has a deterministic non-authoritative Markdown projection containing:

- target/scope;
- closure decision;
- rationale;
- exact source/member revisions;
- validation/criterion summary;
- effective Operator disposition.

The projection is rendered from SQL and is exportable through the standard Markdown export UI. Editing/exporting Markdown never changes SQL.

## No SQLite migration

The current SQLite tables store non-Project `entity_type` as bounded text without an enum constraint. Adding the typed application entity/registry/relationships requires no physical schema migration.

If implementation evidence contradicts this, stop rather than adding a migration under this card.

## Operator clarification during WSF05A

For source-backed Project Creation, review Closeout **after integration**. Execution completion may advance to integration readiness, and successful exact integration returns the still-active Workflow to Project Validation. It does not close that Workflow. A current approved Closeout then atomically closes the Project Creation Workflow and leaves the owning Project active. Source-neutral Project Creation needs no integration. Other workflow families retain their existing integration/closure behavior.
