<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "architect-report",
  "artifactRevision": 1,
  "participationRole": "contextOnly",
  "identity": {
    "phaseId": "phase-08",
    "documentId": "ARCHITECT_IMPLEMENTER_BOUNDED_CHECKPOINT_PROTOCOL"
  },
  "sourceRevisions": [],
  "workflowData": {
    "title": "Architect–Implementer Bounded Checkpoint Protocol",
    "status": "proposed"
  },
  "documentDisposition": {
    "status": "Pending",
    "notes": "Proposed balance between single-edit micromanagement and oversized one-pass implementation.",
    "reviewedAt": null
  }
}
CHAMPCITY-METADATA -->

# Architect–Implementer Bounded Checkpoint Protocol

## Problem

Single-edit instructions are too slow. Large one-pass Work Cards allow architectural drift and permit the Implementer to substitute tests or partial evidence for the required product result.

## Operating model

Keep one Work Card and one continuous Implementer task. Divide execution into two or three capability-sized blocks, not separate Work Cards and not one block per file.

A block contains one complete defect chain or one externally observable capability, normally touching three to six production files.

Example:

```text
Block 1 — domain service and persistence
Block 2 — IPC, preload, renderer, and progression
Block 3 — actual running-product proof and bounded correction
```

## Checkpoint trigger

A checkpoint occurs only at a decision boundary:

- a production contract has been replaced and all callers must now use it;
- the next block depends on the current block's architecture being correct;
- repository evidence contradicts the Work Card;
- the running product does not behave as the implemented source predicts.

Routine compilation errors and ordinary local edits do not trigger Architect review.

## Checkpoint record

Use the existing pending Implementer Report. Do not create another lifecycle artifact.

The Implementer adds one concise section:

```text
Checkpoint.Block=<number>
Checkpoint.Status=ArchitectReviewRequired
Requirements completed:
Exact files changed:
Observed product or service result:
Next block:
Contradictions or deviations:
```

The checkpoint is advisory implementation guidance. It does not approve the Work Card, create a new lifecycle level, or replace final Implementer Report disposition.

## In-app Architect review

The Work Card Building workspace detects `Checkpoint.Status=ArchitectReviewRequired` and presents `Review Implementation Checkpoint`.

The generated handoff instructs the embedded Architect to read through ChampCity MCP:

- the approved Work Card;
- the current checkpoint section;
- the production diff for the listed files;
- the exact requirement evidence.

The Architect returns one of:

```text
Continue — current block matches the Work Card; execute the stated next block.
Correct — apply listed corrections before continuing.
Stop — repository evidence proves a contradiction, scope change, or unsafe continuation.
```

The Architect response is written into the same Implementer Report checkpoint section. The Implementer reads that repository response and resumes the same task.

## Current platform constraint

The embedded ChatGPT browser cannot presently be trusted to receive and send messages automatically without an API or browser automation. The practical near-term design is one Operator click to open/copy the generated checkpoint handoff and one click to import the Architect response. The Operator does not relay technical content or rewrite findings.

A future supported transport may automate those clicks, but the repository checkpoint remains the durable exchange boundary.

## Completion rule

The final Implementer Report is written only after all blocks are complete and the required running-product path has been exercised.

Checkpoint review prevents drift during implementation. Final Work Card acceptance remains based on the complete requirement-to-evidence contract and actual product behavior.
