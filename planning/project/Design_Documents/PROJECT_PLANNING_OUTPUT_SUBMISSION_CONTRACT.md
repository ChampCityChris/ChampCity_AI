<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "context-document",
  "artifactRevision": 4,
  "participationRole": "contextOnly",
  "identity": {
    "contractId": "project-planning-output-submission-v2"
  },
  "sourceRevisions": [
    {
      "path": "planning/project/Design_Documents/PROJECT_INTAKE_LIFECYCLE_AND_WORKSPACE_DEFINITION.md",
      "revision": 1
    },
    {
      "path": "planning/project/Design_Documents/PROJECT_PLANNING_WORKSPACE_DEFINITION.md",
      "revision": 1
    },
    {
      "path": "planning/project/Design_Documents/APPLICATION_OWNED_CANONICAL_DOCUMENT_CONSTRUCTION.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Project Planning Output Submission Contract",
    "contractId": "project-planning-output-submission-v2",
    "status": "approved",
    "consumerRepositories": [
      "ChampCity_AI",
      "ChampCity_GPT"
    ]
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Independent stable cross-repository contract approved by the Operator. It does not depend on WC27 or WC-V1-0202C implementation state.",
    "reviewedAt": "2026-07-29"
  }
}
CHAMPCITY-METADATA -->

# Project Planning Output Submission Contract

Contract ID: `project-planning-output-submission-v2`  
Status: Approved  
Authority: independent shared application/MCP integration contract

## Purpose

Define the exact repository evidence and caller payload used by:

```text
artifact_toolbox.submit_handoff_outputs
```

This contract is independent of both implementation cards. ChampCity_GPT can implement against it before WC27 application code exists. WC27 later emits the same contract in the running ChampCity A/I handoff and performs live integration validation.

Neither implementation card may invent a different protocol.

## Execution Sequence

```text
1. This independent contract is Approved.
2. ChampCity_GPT WC-V1-0202C implements and deterministically validates the toolbox action against contract fixtures.
3. The MCP runtime is integrated and made available.
4. ChampCity A/I WC27 implements repository preflight and emits this contract in the Project Planning handoff.
5. WC27 performs live greenfield and existing-project integration validation.
```

WC-V1-0202C does not wait for WC27 source implementation. WC27 does not begin live toolbox integration until WC-V1-0202C is available.

## Governing Handoff

The MCP action resolves exactly one current canonical Project Planning handoff with:

```text
artifactType=generated-handoff
participationRole=nonReviewHandoff
workflowData.handoffKind=project-planning
Document.Status=Approved
```

The handoff must have exact source revisions for:

- the current Approved Project Intake;
- the associated Approved Architect Interview Prompt;
- the current Approved Project Architect Interview.

The handoff is current only when those exact source revisions remain current and fresh.

## Required Handoff Workflow Data

The canonical handoff `workflowData` must contain exactly these application-owned fields:

```json
{
  "handoffKind": "project-planning",
  "contractId": "project-planning-output-submission-v2",
  "projectProfileTarget": "planning/project/PROJECT_PROFILE.md",
  "projectRoadmapTarget": "planning/project/Project_Roadmap/PROJECT_ROADMAP_<project-slug>.md",
  "reconciliationMode": "greenfield | reconciliation-required | needs-attention",
  "repositoryReviewRequired": true,
  "repositoryReviewContext": "<Operator-provided context or empty string>",
  "legacyPlanningPaths": [],
  "sourceEvidencePaths": [],
  "requiredProfileSections": [
    "Current-State Baseline",
    "Existing Implementation",
    "Legacy Planning Reconciliation",
    "Risks and Unknowns"
  ],
  "requiredRoadmapSections": [
    "Baseline Summary",
    "Work-State Classification",
    "MVP Scope",
    "Sequenced Roadmap",
    "Post-MVP Roadmap",
    "Deferred and Conditional Work",
    "Dependencies and Constraints"
  ]
}
```

Rules:

- `contractId` must match exactly.
- Targets are repository-relative Markdown paths selected by ChampCity A/I.
- `repositoryReviewRequired` is `false` only for a verified greenfield repository.
- All path arrays contain normalized repository-relative paths only.
- Duplicate paths are removed while preserving deterministic order.
- The caller cannot override any workflow-data field.

## Reconciliation Modes

### `greenfield`

Use when Project Intake declares no existing source/planning and the bounded repository preflight confirms no substantive implementation or prior planning baseline.

The Profile must state that no prior implementation baseline exists. Empty legacy and source-evidence arrays are valid.

### `reconciliation-required`

Use when Intake declares existing source/planning or the bounded preflight finds substantive implementation or prior planning evidence.

The Profile and Roadmap must reconcile that evidence using repository-relative references where practical.

### `needs-attention`

Use when Intake and repository evidence conflict, a required target is occupied by unmanaged or malformed content, or the evidence cannot be classified safely.

The MCP action must refuse to write either output for this mode.

## Public Action Input

The public caller supplies only:

```json
{
  "action": "submit_handoff_outputs",
  "workspaceId": "<configured workspace ID>",
  "params": {
    "handoffKind": "project-planning",
    "outputs": {
      "projectProfileMarkdown": "<complete substantive Project Profile Markdown>",
      "projectRoadmapMarkdown": "<complete substantive Project Roadmap Markdown>"
    }
  }
}
```

`handoffKind` is a selector, not authority. The MCP server derives targets, metadata, identity, source revisions, participation roles, revisions, and Pending disposition from the current Approved handoff.

Unknown params, retired save actions, generic Markdown-writer actions, caller-supplied paths, and caller-supplied authority fields are rejected.

## Deterministic Body Validation

The MCP action validates structure, not open-ended document quality.

Project Profile must contain:

```text
# Project Profile
## Current-State Baseline
## Existing Implementation
## Legacy Planning Reconciliation
## Risks and Unknowns
```

Project Roadmap must contain:

```text
# Project Roadmap
## Baseline Summary
## Work-State Classification
## MVP Scope
## Sequenced Roadmap
## Post-MVP Roadmap
## Deferred and Conditional Work
## Dependencies and Constraints
```

Heading matching may tolerate surrounding whitespace but must preserve the exact heading text.

For `greenfield`, `Current-State Baseline` must contain a clear statement that no prior implementation baseline exists.

For `reconciliation-required`, the Profile must contain substantive content under `Existing Implementation` and `Legacy Planning Reconciliation`; the Roadmap must contain substantive content under `Work-State Classification`.

The Roadmap must represent the complete currently intended development lifecycle. It may distinguish MVP, Post-MVP, Deferred, and Conditional or evidence-gated future work, but it must not collapse all post-MVP development into an unsequenced paragraph. Every known major workstream from the approved Interview/Profile is either sequenced, explicitly deferred, superseded, or declared conditional. Unknown future work is not fabricated.

The server does not judge whether the prose is strategically correct. Operator review remains the quality gate.

## Canonical Output Authority

The action derives identity from the verified Intake, Prompt, and Interview evidence.

Both outputs use:

```text
participationRole=compoundGatingReview
Document.Status=Pending
Document.Notes=""
Document.ReviewedAt=null
```

Project Profile:

```text
artifactType=project-profile
```

Project Roadmap:

```text
artifactType=project-roadmap
```

Both source-revision arrays contain:

1. current Project Intake path/revision;
2. current Architect Interview Prompt path/revision;
3. current Project Architect Interview path/revision;
4. current Project Planning handoff path/revision.

No JSON sibling is created.

## Existing Target Rules

- Missing targets begin at artifact revision 1.
- Valid non-Approved targets may be substantively revised.
- A changed body increments the affected artifact revision exactly once.
- A substantive bundle revision returns both outputs to coherent `Pending` review state.
- An identical complete pair returns `already_saved` without rewriting.
- An Approved target blocks overwrite.
- An unmanaged, malformed, wrong-type, wrong-role, identity-mismatched, source-mismatched, unsafe, or escaping target blocks the entire pair.
- No alternate target is selected automatically.

## Atomicity

The Profile and Roadmap are one write transaction.

The action must validate and snapshot both targets, install both, re-read and verify both, and restore or remove both if either installation or verification fails.

A successful response cannot leave only one output installed.

## Authority Boundary

ChampCity A/I owns:

- repository preflight;
- reconciliation mode;
- evidence and target selection;
- required section lists;
- workspace presentation and bundle disposition.

ChampCity_GPT owns:

- strict caller validation;
- current-handoff and source-evidence verification;
- canonical Markdown construction under this contract;
- atomic pair persistence;
- bounded receipt and safe audit output.

Git is not artifact-persistence authority. Browser chat is not durable workflow authority.

## Validation Boundary

WC-V1-0202C may complete deterministic implementation using curated greenfield, reconciliation-required, and needs-attention fixture handoffs conforming to this contract.

Live embedded ChatGPT calls against a WC27-generated handoff are final WC27 integration evidence after the MCP runtime is available.
