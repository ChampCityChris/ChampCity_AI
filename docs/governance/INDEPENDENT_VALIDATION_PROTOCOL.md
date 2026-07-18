# Independent Validation Protocol

## Purpose

Independent validation prevents the Implementer from supplying all of its own acceptance evidence.

The independent agent operates in two distinct modes:

1. Implementation Compliance Verification.
2. Operator Validation Execution.

The modes may use the same technical agent in separate runs, but they must not be merged.

## Mode 1 — Implementation Compliance Verification

This mode runs after each material Execution Pass and again after final integration.

The verifier receives:

- the exact Work Card and revision identities;
- the Acceptance Contract requirements assigned to the pass;
- the pass packet fingerprint;
- changed repository paths and diff;
- the Implementer result identity;
- validation commands and raw results;
- relevant production files and tests.

The verifier should inspect production code before relying on the Implementer narrative.

The verifier must:

- run direct tests for the changed architectural layer;
- run contradiction tests required by the Acceptance Contract;
- verify prohibitions behaviorally, not only through text search;
- confirm report claims against exact files, symbols, tests, and commands;
- verify that tests are independent of the combined happy path;
- verify that migration readers are not runtime authority;
- verify that no scope outside the pass was changed.

The verifier must not modify production code.

Allowed decisions:

- `verified_for_next_pass`;
- `changes_required_in_current_pass`;
- `governance_contradiction`.

A green Implementer suite cannot override a verifier failure.

## Mode 2 — Operator Validation Execution

This mode runs only after Architect acceptance authorizes Operator validation.

The Validation Agent may execute reproducible human-validation steps, including:

- launching the application;
- selecting the approved repository;
- inspecting project, phase, Work Card, role, route, screen, and expected output;
- restarting and refreshing;
- switching configured projects;
- confirming blocker behavior;
- exercising view-only navigation;
- recording screenshots, logs, and structured observations.

It creates a draft Operator Validation Report with status:

`validation_executed_awaiting_operator_decision`

The draft report records each step, expected result, observed result, evidence, pass/fail result, anomalies, subjective questions, and recommended disposition.

The Validation Agent may not approve the Work Card, close the phase, or act as the human Operator.

## Human Operator Authority

The human Operator reviews the draft and may:

- approve;
- reject;
- approve with observations;
- add observations;
- request additional validation;
- override the agent's recommendation with rationale.

## Independence Requirements

The verifier and Validation Agent must not:

- share hidden mutable state with the Implementer;
- edit production code during verification;
- weaken acceptance criteria;
- alter tests to make the implementation pass;
- infer missing authority from names, paths, or prior narrative;
- perform final acceptance without explicit human action.

## Evidence Standard

Every failed or passed requirement must identify:

- requirement ID;
- inspected file and symbol;
- independent test or validation step;
- command and execution lane;
- observed output;
- evidence attachment or log, when applicable.
