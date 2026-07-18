# Execution Pass Protocol

## Purpose

Execution Passes divide a large approved Work Card into bounded agent jobs without creating additional Work Cards, repairs, candidates, approvals, or Operator handoffs.

The Work Card remains the complete governance contract. The Execution Pass Plan is subordinate implementation procedure.

## Operator Experience

The normal Operator interaction is:

1. Approve the Work Card once.
2. Start the Execution Run.
3. Review only governance contradictions, scope exceptions, repeated failures, and final validation evidence.
4. Approve, reject, or add observations to the final Operator Validation Report.

Routine pass packets must be compiled and dispatched by the application. The Operator must not be required to copy and paste each packet.

## Required Records

An Execution Run uses:

- one approved Work Card;
- one exact Operator Approval;
- one machine-readable Acceptance Contract;
- one Execution Pass Plan;
- one Execution Run ledger;
- one result and one independent verification result for each attempt.

Pass packets may be transient. The durable ledger records packet fingerprint, included requirement IDs, source revisions, result identity, verification decision, and timestamps.

## Pass Packet Budget

A pass packet contains only:

- exact Work Card, revision, approval, Acceptance Contract, run, pass, and attempt identities;
- the pass objective;
- requirements assigned to the pass;
- the compact global invariants assigned to the pass;
- allowed repository paths;
- required tests;
- expected pass outputs;
- exact relevant source summaries;
- verified prior pass results;
- unresolved verifier findings for a correction attempt;
- permanent protocol references.

Do not repeat the complete Work Card, all historical repairs, both copies of synchronized artifact prose, unrelated source files, or the complete Acceptance Contract.

Default target: 2,000–5,000 instruction tokens and no more than the approved pass budget. Over-budget packets must block automatic dispatch unless the approved plan explicitly permits an exception.

## Execution Run State

The controller advances through:

`planned → packet_compiled → implementer_running → implementer_complete → verifier_running → verified → next pass`

A verifier decision of `changes_required_in_current_pass` stays on the same pass and creates a new bounded attempt.

A decision of `governance_contradiction` stops the run for Operator and Architect review.

An Execution Run may not skip independent verification, advance on an Implementer self-assessment, or treat a pass as Work Card acceptance.

## Checkpoints

Substantial passes should create local git checkpoints after independent verification. Checkpoints are rollback boundaries, not workflow approvals.

Push, merge, release, Work Card acceptance, and Operator acceptance remain governed separately.

## Human Intervention

Stop for human attention only when:

- authority artifacts conflict;
- the requested change exceeds the approved surface;
- a new dependency or destructive migration requires approval;
- repeated attempts fail under the configured retry policy;
- the verifier reports a governance contradiction;
- the complete Work Card is ready for Architect and Operator review.

Ordinary implementation defects produce another bounded attempt, not another Operator handoff.

## Context Isolation

Each pass should run in a fresh agent invocation. The invocation receives the compiled packet, current repository facts, and required prior pass summaries—not the accumulated chat transcript.

## Prohibited Uses

An Execution Pass must not:

- modify Work Card scope;
- authorize source changes;
- create repair or replacement lineage;
- resolve a Work Card or phase;
- defer an assigned requirement to another Work Card;
- perform Operator acceptance;
- act as a hidden compatibility or migration exception.
