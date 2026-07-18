# Execution Run Orchestration Architecture

## Objective

Reduce agent context dilution and Operator handoff burden by converting one approved Work Card into a deterministic sequence of bounded Implementer and Independent Verifier jobs.

The Work Card remains the governing unit. Execution Runs and passes are subordinate orchestration records.

## Core Components

### Acceptance Contract Compiler

Converts the approved Work Card into stable requirement IDs, global invariants, prohibited substitutions, required behavioral tests, and pass assignments.

### Execution Pass Planner

Groups requirements into bounded passes with exact objectives, repository surfaces, prerequisites, tests, outputs, and token budgets.

### Execution Run Controller

Maintains one run ledger and advances only after independent verification.

### Pass Packet Compiler

Builds a compact fresh-context packet from the current pass, exact authority, relevant sources, and verified prior results. It references permanent rules rather than duplicating them.

### Implementer Adapter

Dispatches the compiled packet to the configured coding agent and records the result. External integration is an adapter concern and is not part of the pure controller.

### Independent Verifier Adapter

Dispatches a separate adversarial verification job against the exact pass result. It cannot modify production code.

### Operator Validation Executor

After Architect acceptance, executes the approved running-application validation procedure and drafts a report for human decision.

## State Model

Execution Run:

- planned;
- running;
- changes required;
- Operator attention required;
- blocked by governance contradiction;
- failed;
- complete.

Execution Pass:

- planned;
- packet compiled;
- Implementer running;
- Implementer complete;
- verifier running;
- verified;
- changes required;
- governance contradiction;
- execution failure.

The controller automatically retries the same pass after `changes_required_in_current_pass`. It never advances on Implementer self-assessment alone.

## Durable Versus Transient Data

Durable:

- Work Card and approval;
- Acceptance Contract;
- Execution Pass Plan;
- Execution Run ledger;
- pass result references;
- independent verification results;
- final Implementer Report;
- draft Operator Validation Report;
- human Operator decision.

Transient or reproducible:

- complete packet prose;
- selected source excerpts;
- agent transport envelopes.

The ledger retains the packet fingerprint, included requirement IDs, source identities and revisions, attempt, role, and result identity.

## Context Budget

Each agent invocation is fresh. It receives only the current packet and current repository state.

The compiler should target 2,000–5,000 instruction tokens and a bounded source context selected by exact pass relevance. The complete Work Card is not repeated when the Acceptance Contract and pass definition already carry the applicable requirements.

Synchronized JSON and Markdown pairs are verified by code and represented once in compiled context.

## Operator Boundary

The Operator approves the Work Card once and reviews exceptions and final evidence. Routine packet compilation, dispatch, verification, correction attempts, and pass advancement are automated.

## First Implementation Slice

The initial implementation provides:

- Acceptance Contract types and validation;
- Execution Pass Plan types and validation;
- deterministic Execution Run state transitions;
- bounded Implementer packet compilation;
- bounded Independent Verifier packet compilation;
- token estimation and packet fingerprinting;
- automatic same-pass correction and next-pass advancement.

Deferred adapters:

- persistent Execution Run artifact writer;
- application IPC and UI;
- Codex/agent dispatch integration;
- automatic git checkpoints;
- Operator Validation execution UI and evidence capture.
