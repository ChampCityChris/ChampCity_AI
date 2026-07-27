<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "context-document",
  "artifactRevision": 1,
  "participationRole": "contextOnly",
  "identity": {},
  "sourceRevisions": [],
  "workflowData": {
    "designDocumentId": "WORK_CARD_CANDIDATE_CONTRACT",
    "projectId": "champcity-ai",
    "title": "Work Card Candidate Contract",
    "status": "confirmed_sequence_correction",
    "fields": [
      "candidateId",
      "order",
      "title",
      "purpose",
      "dependsOn",
      "resolutionStatus",
      "resolutionReason",
      "evidencePaths"
    ],
    "resolutionStatusValues": [
      "planned",
      "deferred",
      "superseded",
      "alreadySatisfied",
      "carriedForward"
    ],
    "completedDerived": true,
    "planRevisionEffects": [
      "increment Work_Card_Plan revision",
      "set Phase_Planning and Work_Card_Plan Pending",
      "invoke downstream invalidation",
      "require synchronized bundle approval"
    ],
    "rejectedFormalWorkCardReturn": "Phase Planning bundle revision"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "",
    "reviewedAt": null
  }
}
CHAMPCITY-METADATA -->

# Work Card Candidate Contract

Status: confirmed sequence correction
Project: ChampCity A/I
Confirmed: 2026-07-21

## Purpose

Define the canonical Work Card candidate record used by the Approved `Work_Card_Plan`, Phase Building candidate selection, Phase Validation, and plan revision.

## Candidate Fields

Each candidate must contain in both synchronized planning documents where represented:

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

Optional fields may include expected outcome, split/merge notes, and `carriedForwardToPhaseId`.

## Resolution Status

Persisted values are:

```text
planned
deferred
superseded
alreadySatisfied
carriedForward
```

`completed` is not manually persisted as candidate authority. Completion is derived from current Approved Formal Work Card, current Approved implementation evidence, and current Approved Validation Record after the latest repair.

## Evidence Requirements

- `planned`: no resolution evidence required.
- `deferred`: requires reason and Operator-reviewed evidence path.
- `superseded`: requires reason and replacement candidate or document path.
- `alreadySatisfied`: requires evidence paths proving the outcome already exists and has been accepted.
- `carriedForward`: requires reason, target phase ID, and evidence path.

Candidate IDs are stable within a phase and are the identity used by Formal Work Cards and dependencies.

## Dependency Rules

`dependsOn[]` references candidate IDs from the same Approved Work Card Plan unless an explicit cross-phase dependency is represented by a repository path and phase ID.

A planned candidate is eligible only when every declared predecessor is derived complete or explicitly resolved in a way that permits continuation.

## Plan Revision

Changing candidate order, dependency, purpose, title, resolution status, reason, or evidence after Phase Planning approval is a substantive Work Card Plan revision.

The change must:

1. increment the Work Card Plan artifact revision;
2. return both `Phase_Planning` and `Work_Card_Plan` to a coherent `Pending` review state;
3. invoke downstream freshness and invalidation rules;
4. require synchronized bundle approval before candidate selection resumes.

## Rejected Formal Work Card

A Rejected Formal Work Card does not complete or permanently strand the candidate. The visible correction action returns to Phase Planning bundle revision so the candidate can be revised, deferred, superseded, or otherwise resolved.

## Phase Validation

Phase Validation may begin only when every candidate is either:

- derived complete; or
- explicitly `deferred`, `superseded`, `alreadySatisfied`, or `carriedForward` with required evidence.

## Authority Boundary

Do not create a separate candidate queue, hidden active-candidate field, manually assigned completed status, timestamp precedence, or execution-run authority.
