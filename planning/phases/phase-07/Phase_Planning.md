<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-07/phase_planning/Phase_Planning",
  "artifactType": "phase_planning",
  "createdAt": "2026-07-18T21:50:00.000Z",
  "jsonPath": "planning/phases/phase-07/Phase_Planning.json",
  "markdownPath": "planning/phases/phase-07/Phase_Planning.md",
  "payload": {
    "kind": "phase_planning",
    "title": "Phase Planning: phase-07 — Shared MCP Core and Governed ChatGPT Roles"
  },
  "payloadHash": "sha256:f141e4c1118aa9f988581c53e0c8a2228f2ece1fc55993fcef00e0ca958df648",
  "phaseId": "phase-07",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [
      "champcity-ai/phase-07/work_card_plan/Work_Card_Plan"
    ],
    "sources": [
      "champcity-ai/phase-06/phase_closeout/PHASE_06",
      "champcity-ai/phase-06/operator_validation/WC06",
      "champcity-ai/phase-07/phase_activation/phase-07",
      "champcity-ai/phase-05/project_roadmap/WC03",
      "champcity-ai/project/design_document/ARTIFACT_AUTHORITY_MODEL",
      "champcity-ai/project/project_roadmap/PROJECT_ROADMAP_champcity_a_i"
    ],
    "supersedes": []
  },
  "revision": 2,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-18T22:44:44.000Z"
}
-->

# Phase Planning: phase-07

Status: draft_for_operator_review
Project: ChampCity A/I
Phase: phase-07 — Architect Bridge and MCP-First Integration
Phase type: cross-repository architecture, shared-core extraction, and governed agent integration

## Purpose

Extract the reusable ChampCity MCP core from the standalone ChampCity_GPT product, preserve ChampCity_GPT as a fully functional standalone host, embed the same shared core inside ChampCity_AI, and connect that embedded host to ChampCity_AI's canonical workflow services.

Phase 07 will establish ChatGPT subscription conversations as the execution base for the Architect Agent, Independent Verifier Agent, and Operator Validation Agent. Codex remains the primary Implementer during this phase.

The intended architecture is:

```text
                              ┌─ ChampCity_GPT standalone host
Shared ChampCity MCP Core ────┤
                              └─ ChampCity_AI embedded host
```

This phase does not integrate ChampCity_AI with a separately running ChampCity_GPT application. It creates one reusable MCP core consumed by two hosts.

## Accepted Planning Decisions

The Operator accepted the following Phase 07 planning decisions:

1. Create one separately versioned shared MCP package or repository, provisionally named `ChampCity_MCP_Core`. ChampCity_GPT and ChampCity_AI must consume the same source of truth. Source duplication is prohibited.
2. ChampCity_AI will host the shared MCP core as a managed internal process packaged with ChampCity_AI. ChampCity_AI owns start, stop, restart, health checks, and recovery. The standalone ChampCity_GPT executable is not required.
3. The Operator initiates or opens ChatGPT subscription conversations through the ChampCity_AI browser workspace. Phase 07 does not use ChatGPT DOM automation, browser scraping, or provider API execution.
4. Phase 07 implements ChatGPT-based Architect, Independent Verifier, and Operator Validation roles. Codex remains the primary Implementer. A future ChatGPT Implementer contract may be defined, but browser-hosted implementation is not a Phase 07 acceptance requirement.
5. One ChampCity_AI MCP connector serves all supported roles. Role separation is enforced through distinct conversations, exact role packets, and ChampCity_AI authority checks rather than separate public connectors.
6. ChampCity_AI retains workflow state, current-action authority, Execution Runs, role assignment, canonical schemas, serialization, payload hashing, Artifact Registry transactions, transitions, and acceptance authority.
7. Phase 07 proves the embedded integration against the ChampCity_AI project first. Host interfaces must remain reusable, but full multi-project role execution is deferred to Phase 11.
8. ChampCity_GPT must remain a standalone product with its existing configuration, OAuth, workspace, tool, security, packaging, and user-facing behavior preserved unless a later approved migration explicitly changes it.
9. The first end-to-end proof is a controlled Architect assignment compiled by ChampCity_AI, consumed through the embedded MCP core, submitted as a structured Architect result, materialized through ChampCity_AI's canonical artifact service, and followed by a correct workflow transition.

## Product and Authority Boundaries

### Shared ChampCity MCP Core

The shared core owns host-neutral infrastructure:

- MCP protocol registration and dispatch;
- HTTP and supported local transports;
- OAuth, Dynamic Client Registration, PKCE, token lifecycle, and scope enforcement;
- workspace routing interfaces;
- repository path, file, symlink, attachment, and blocked-file security;
- audit infrastructure;
- repository read, search, and bounded change operations;
- Git inspection and guarded Git operation primitives;
- diagnostics and repository-owned validation profile execution;
- host extension interfaces;
- ChatGPT-compatible public tool schema handling.

The shared core must not own ChampCity_AI workflow rules, canonical Artifact Registry state, current-action selection, role assignment, acceptance, or phase lifecycle decisions.

### ChampCity_GPT Standalone Host

The standalone host retains:

- standalone Electron launcher and setup experience;
- generic allowed-root and workspace configuration;
- standalone runtime paths and local configuration;
- standalone OAuth administration and connector setup;
- generic repository tooling;
- standalone packaging, promotion, and release behavior;
- compatibility for users who do not adopt ChampCity_AI.

### ChampCity_AI Embedded Host

The embedded host owns:

- managed MCP process lifecycle;
- ChampCity_AI-specific runtime configuration and health state;
- project and workspace binding;
- current-action and role-packet compilation;
- canonical artifact reads and writes through application services;
- Execution Run and pass context;
- result validation and ingestion;
- Artifact Registry transactions;
- workflow transition decisions;
- Operator-facing bridge status and recovery UI.

The embedded host must use runtime configuration, OAuth stores, logs, audit records, and lifecycle state separate from any standalone ChampCity_GPT installation.

## Required ChampCity_GPT Repository Review

Before extraction or embedding begins, Phase 07 must complete a top-to-bottom ChampCity_GPT review and classify each significant subsystem as:

- `core_reuse`;
- `core_with_host_adapter`;
- `standalone_host_only`;
- `champcity_ai_host_replacement`;
- `retire`.

The review must cover at least:

- package and build topology;
- Electron launcher and preload boundaries;
- MCP server creation, registration, transports, and lifecycle;
- OAuth, DCR, PKCE, token stores, and scopes;
- workspace configuration and routing;
- repository traversal, reads, searches, patching, and attachments;
- Git inspection and mutation tools;
- diagnostics and validation operations;
- audit logging and correlation metadata;
- public tool exposure and ChatGPT schema compatibility;
- security policies and blocked paths;
- runtime paths and packaged behavior;
- tests, release validation, and live connector evidence;
- current documentation and version consistency;
- dependencies on ChampCity_GPT-specific runtime state.

The review must produce a dependency graph, portability map, extraction boundary, host interface specification, security regression plan, and migration sequence. No production extraction begins until this review is accepted.

## ChatGPT-Based Role Model

### Architect Agent

The Architect Agent uses a ChatGPT subscription conversation and receives an exact ChampCity_AI-compiled Architect packet.

Required capability categories:

- current assignment and role packet reads;
- canonical artifact and planning-corpus inspection;
- repository reads, search, Git history, diff, and source analysis;
- screenshot and evidence review;
- structured planning, Work Card, review, disposition, repair, and closeout result submission;
- blocker and inability reporting;
- result-ingestion status.

The Architect Agent does not independently mutate the Artifact Registry or decide application workflow state.

### Independent Verifier Agent

The Independent Verifier uses a separate ChatGPT conversation and exact verifier assignment.

Required capability categories:

- exact Execution Run, pass, attempt, Work Card revision, Acceptance Contract, and Implementer-result binding;
- changed-file and Git evidence inspection;
- named focused and full validation profiles;
- screenshot and evidence-bundle review;
- structured `pass`, `fail`, `blocked`, or `pass_with_observations` submission;
- read-only access to implementation evidence.

The verifier may not mutate implementation evidence, claim the Implementer role for the same pass, or perform Operator acceptance.

### Operator Validation Agent

The Operator Validation Agent uses a ChatGPT subscription conversation to assist the human Operator.

Required capability categories:

- exact validation target and Architect-authorized checklist;
- application-generated validation instructions;
- screenshot, log, and evidence review;
- recording of human-confirmed results;
- missing-evidence detection;
- draft Operator Validation result submission.

The role may not claim a human action occurred without confirmation, approve its own output, accept a Work Card, or close a phase.

### Implementer

Codex remains the primary Implementer during Phase 07.

Phase 07 may define a future browser-hosted Implementer interface, but does not require ChatGPT to perform general source implementation. Any future browser Implementer must support governed multi-file create, update, delete, rename, validation, and exact result submission without self-verification.

## In Scope

- Complete ChampCity_GPT portability and extraction review.
- Creation of the shared MCP core architecture and host interfaces.
- Extraction of reusable MCP infrastructure from ChampCity_GPT without creating a divergent fork.
- Preservation of the standalone ChampCity_GPT host.
- Embedding the shared core into ChampCity_AI as a managed internal process.
- ChampCity_AI UI for embedded MCP lifecycle, connector status, role status, health, and recovery.
- ChampCity_AI host adapters for canonical artifacts, current assignments, Execution Runs, result ingestion, validation, and audit provenance.
- Exact role packets and result contracts for Architect, Independent Verifier, and Operator Validation roles.
- Separate-conversation and wrong-role enforcement.
- A controlled Architect end-to-end proof, followed by Independent Verifier and Operator Validation proofs.
- Explicit manual fallback when the embedded MCP core or ChatGPT connector is unavailable.
- Regression validation for both standalone ChampCity_GPT and embedded ChampCity_AI hosts.

## Out of Scope

- Connecting ChampCity_AI to a separately running ChampCity_GPT desktop application as the permanent architecture.
- Copying ChampCity_GPT source into ChampCity_AI as an independent fork.
- ChatGPT DOM automation, browser scraping, clipboard automation, or provider API execution.
- General ChatGPT-based implementation as the primary Implementer path.
- Automatic human validation or Operator acceptance.
- Full multi-project agent execution and isolation, which remains Phase 11.
- End-user Git abstraction, which remains Phase 12.
- Broad UI redesign outside the embedded MCP and role workspace.
- Public release packaging for ChampCity_AI.
- Unbounded shell, command, process, filesystem, Git, or upstream MCP passthrough.

## Architecture Constraints

1. One shared MCP source of truth must serve both hosts.
2. ChampCity_GPT standalone behavior must remain regression-tested throughout extraction.
3. ChampCity_AI must not depend on a separately installed ChampCity_GPT executable.
4. ChampCity_AI workflow authority must remain inside ChampCity_AI.
5. The shared core must expose host extension interfaces rather than import ChampCity_AI implementation modules.
6. Role permissions must be derived from exact ChampCity_AI assignments, not prompt text or conversation labels.
7. Separate role conversations must not share mutable assignment authority.
8. Result submission must be idempotent and exactly bound to assignment, pass, attempt, source revisions, and expected result type.
9. Canonical artifact materialization and Registry updates must use ChampCity_AI application services.
10. Standalone and embedded runtime stores, ports, logs, OAuth records, and audit trails must not interfere with one another.
11. Missing capability must block visibly; no fallback may silently become authority.
12. Every extraction Work Card must define rollback, compatibility, and dual-host regression evidence.

## Required Success Criteria

Phase 07 succeeds when:

1. The ChampCity_GPT review and portability map are accepted before extraction begins.
2. A separately versioned shared MCP core exists as the single implementation source.
3. ChampCity_GPT consumes the shared core and remains a functional standalone application.
4. ChampCity_AI starts, monitors, restarts, and stops the embedded core without requiring the standalone application.
5. The embedded host uses isolated configuration, OAuth state, logs, audit records, and runtime lifecycle.
6. ChampCity_AI provides exact role packets and server-enforced role boundaries.
7. A ChatGPT Architect conversation completes the controlled assignment and ChampCity_AI materializes the canonical result.
8. A separate ChatGPT Independent Verifier conversation evaluates exact implementation evidence without mutation or self-verification.
9. A ChatGPT Operator Validation conversation assists a human validation pass without performing acceptance.
10. Wrong-role, wrong-assignment, stale-attempt, duplicate-result, and cross-project submissions are rejected.
11. Standalone ChampCity_GPT and embedded ChampCity_AI regression suites both pass after extraction.
12. Operator-visible status clearly shows the active role, assignment, source authority, expected output, connector health, and fallback state.
13. Manual fallback remains available and does not silently change workflow authority.
14. Phase 08 dogfooding re-entry criteria can be evaluated from durable evidence produced by the embedded bridge.

## Exit Condition

Phase 07 exits only after:

- the shared core extraction is accepted;
- both hosts consume the shared core successfully;
- the embedded MCP lifecycle is stable;
- the Architect, Independent Verifier, and Operator Validation end-to-end proofs pass;
- standalone ChampCity_GPT regression is clean;
- role and artifact authority boundaries are proven;
- the Operator approves Phase 08 dogfooding re-entry planning.

## Next Planning Output

Create and review the Phase 07 Work Card Plan.

This planning artifact does not authorize source-code implementation, repository creation, package publication, extraction, embedding, or role execution.
