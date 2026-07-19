# Implementer Handoff — Phase 07 WC01

## Assignment

Execute:

`champcity-ai/phase-07/work_card/WC01`

Title:

**ChampCity_GPT Portability Review and Shared-Core Architecture Contract**

Authorized revision: `1`

Operator Approval:

`champcity-ai/phase-07/operator_approval/WC01`

Expected Implementer Report:

`champcity-ai/phase-07/implementer_report/WC01`

Recommended Codex setting: use the highest-capability Codex model available; reasoning level `high`.

## Repositories

### Governing project repository

- Workspace ID: `champcity_ai`
- Expected repository: `ChampCityChris/ChampCity_AI`
- Expected baseline commit: `7708682598bc9f66f3f4c8af8da61867aded56bb`
- Current branch name is historical plumbing and is not workflow authority.
- The worktree is intentionally dirty with Phase 06 closeout and Phase 07 planning artifacts. Do not reset, clean, stash, discard, or overwrite unrelated changes.

### Reviewed standalone product repository

- Workspace ID: `champcity_gpt`
- Expected repository: `ChampCityChris/ChampCity_GPT_MCP`
- Expected branch: `dev`
- Expected commit: `780217aa1046ad8d271d13887ba1121bba419362`
- Expected version: `0.3.0`
- Expected worktree: clean
- This repository is strictly read-only during WC01.

Abort before editing if either repository identity or baseline does not match.

## Authority to Read First

Read the synchronized JSON and Markdown pairs for:

1. `planning/phases/phase-07/Phase_Activation.{json,md}`
2. `planning/phases/phase-07/Phase_Planning.{json,md}` — revision 2
3. `planning/phases/phase-07/Work_Card_Plan.{json,md}` — revision 1
4. `planning/phases/phase-07/Operator_Phase_Approval.{json,md}` — revision 1
5. `planning/phases/phase-07/Work_Cards/WC01_champcity_gpt_portability_review_shared_core_architecture_contract.{json,md}` — revision 1
6. `planning/phases/phase-07/Operator_Approvals/OPERATOR_APPROVAL_WC01_champcity_gpt_portability_review_shared_core_architecture_contract.{json,md}` — revision 1
7. `planning/phases/phase-06/Phase_Closeouts/PHASE_06_CLOSEOUT_workflow_kernel_artifact_protocol_replacement.{json,md}`
8. `planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.{json,md}`
9. `planning/project/PROJECT_STATE.{json,md}`
10. `AGENTS.md` or `AGENTS.MD` and the repository validation-lane documentation in both repositories.

Do not rely on branch names, chat summaries, newest-file ordering, or filenames as workflow authority.

## Execution Boundary

Execute P01 through P04 in one governed session while preserving pass-specific evidence.

WC01 is review, architecture-contract, and bounded authority-reconciliation work. It is not shared-core extraction or MCP integration implementation.

### Authorized ChampCity_AI changes

Only changes required by WC01 within:

- affected Phase 06 WC03 Architect Review and Operator Validation records;
- Phase 06 closeout and Phase 07 planning/approval records;
- Project Roadmap and Project State;
- canonical Artifact Registry through existing ChampCity_AI services;
- the obsolete WC06 P04/P05 handoff;
- `test/wc02-repair03/full-workflow-resolver-foundation.test.cjs`;
- WC01 diagnostic, design, role-matrix, and Implementer Report artifacts.

No ChampCity_AI production source changes are authorized.

### ChampCity_GPT boundary

ChampCity_GPT is read-only. Do not modify source, tests, scripts, configuration, documentation, package files, generated output, runtime files, or Git state.

## P01 — Authority Reconciliation

Use existing ChampCity_AI canonical services. Do not directly fabricate or manually splice Registry entries.

Required work:

1. Register and reread through canonical authority:
   - Phase Planning revision 2;
   - Work Card Plan revision 1;
   - Operator Phase Approval revision 1;
   - WC01 revision 1;
   - WC01 Operator Approval revision 1.
2. Register and reread the current Project Roadmap and Project State revisions showing Phase 06 closed and Phase 07 active.
3. Reconcile the Phase 06 Closeout and Phase 07 Activation pairs as explicit lifecycle authority.
4. Retire or replace the placeholder-grade WC03 Architect Review and Operator Validation records. Preserve them as historical evidence only when required; do not treat their placeholder fields or evidence-free `Pass` as acceptance authority.
5. Remove or explicitly supersede:
   - `docs/handoffs/IMPLEMENTER_HANDOFF_PHASE06_WC06_P04_P05_independent_verifier_operator_validation_integration.md`
6. Update the real-corpus lifecycle replay test so it resolves the newest valid closeout/activation authority rather than hard-coding Phase 06 or Phase 07.
7. Reread every reconciled pair through the Registry and report exact revision, payload hash, synchronization, and authoritative status.

Stop immediately if existing canonical services cannot perform these transactions. Report the missing service boundary. Do not create a compatibility writer or manual Registry workaround.

## P02 — Complete ChampCity_GPT Repository Review

Review the complete current first-party implementation at the exact baseline.

Full-text review must cover:

- all first-party runtime source;
- all tests;
- all scripts;
- package, TypeScript, Electron Builder, and build configuration;
- MCP server creation, registration, public exposure, transport, and lifecycle;
- OAuth, DCR, PKCE, access/refresh token lifecycle, scopes, and local stores;
- workspace configuration, routing, and isolation;
- runtime-path and packaged-runtime behavior;
- repository listing, reads, searches, patching, JSON/Markdown writes, attachments, and evidence readers;
- Git inspection and mutating workflows;
- diagnostics, source analysis, validation lanes, and subprocess safety;
- path, symlink, file, secret, and publication safety;
- audit logging and correlation/provenance support;
- standalone Electron launcher, preload, renderer, setup, packaging, promotion, and release behavior;
- all current technical, setup, security, tool, validation, and release documentation.

Historical planning records may be inventoried first. Read full text only where needed to establish current architectural intent, accepted constraints, regressions, or unresolved decisions.

Exclude and report:

- dependencies;
- generated/build/release output;
- binaries;
- logs;
- runtime-local configuration;
- secrets and credential stores;
- ignored transient files.

Coverage evidence must distinguish:

- eligible first-party file count;
- full-text-read count;
- inventory-only count;
- excluded count by reason;
- unreadable or unsupported count;
- hashes or exact paths sufficient to reproduce the review.

A file inventory alone is not a complete review.

For every significant subsystem, classify it as exactly one of:

- `core_reuse`
- `core_with_host_adapter`
- `standalone_host_only`
- `champcity_ai_host_replacement`
- `retire`

Produce:

- subsystem portability table;
- dependency graph;
- runtime-assumption map;
- protected-subsystem preservation matrix;
- tests mapped to protected behavior;
- current blockers to extraction or embedding;
- documentation/version/runtime inconsistencies;
- explicit evidence for each conclusion.

Do not modify ChampCity_GPT to resolve findings.

## P03 — Shared-Core, Dual-Host, and Role Contracts

Define the architecture contract for one separately versioned shared MCP source of truth consumed by:

- ChampCity_GPT standalone host; and
- ChampCity_AI embedded host.

The contract must specify:

- package/repository topology;
- dependency direction;
- public and internal module boundaries;
- host interfaces for configuration, runtime paths, workspace resolution, audit sink, validation profiles, process lifecycle, tool extensions, diagnostics, version reporting, and packaging integration;
- responsibilities retained by ChampCity_GPT;
- responsibilities supplied by ChampCity_AI;
- local-development and production consumption model;
- isolated ports, OAuth stores, token stores, logs, audits, process identity, health, shutdown, and recovery;
- proof strategy showing no copied or fallback MCP implementation remains active;
- compatibility and versioning policy.

Preserve this authority boundary:

- shared core: MCP transport, security, host-neutral tools, diagnostics, and host extension contracts;
- ChampCity_GPT: standalone setup, configuration, user experience, runtime ownership, and packaging;
- ChampCity_AI: workflow state, assignments, Execution Runs, canonical schemas, serialization, hashing, Registry transactions, transitions, and acceptance;
- ChatGPT: bounded role reasoning and typed result submission.

Define role contracts for:

- ChatGPT Architect Agent;
- separate-conversation Independent Verifier Agent;
- human-assisted Operator Validation Agent;
- Codex as the Phase 07 primary Implementer;
- future browser Implementer requirements without implementing them.

The role/tool/permission matrix must classify each capability as:

- existing shared-core capability;
- shared-core capability requiring a host adapter;
- ChampCity_AI-only host service;
- missing capability requiring a later Work Card;
- prohibited capability.

For each role, specify:

- allowed reads;
- allowed writes/submissions;
- assignment identity;
- pass and attempt identity;
- source artifact IDs and payload hashes;
- expected result type and artifact ID;
- idempotency;
- claim and session separation;
- wrong-role rejection;
- stale-result rejection;
- duplicate-result rejection;
- cross-project rejection;
- human acceptance boundary.

## P04 — Migration and Acceptance Package

Define the execution contract for WC02. Do not execute it.

Required topics:

- creation and ownership of the shared repository/package;
- extraction order by subsystem;
- host adapter introduction order;
- ChampCity_GPT migration sequence;
- ChampCity_AI embedding prerequisites;
- temporary development linking and final versioned consumption;
- removal of old direct implementations and fallback paths;
- rollback checkpoints;
- dual-host regression requirements;
- OAuth and connector validation;
- runtime-store and port collision tests;
- packaging and release ownership;
- public tool exposure compatibility;
- risk register;
- unresolved Operator decisions;
- exact WC02 entry and stop conditions.

## Required Output Pairs

Create and register synchronized pairs at these exact paths:

1. `planning/phases/phase-07/Diagnostic_Reports/DIAGNOSTIC_REPORT_WC01_champcity_gpt_portability_extraction_review.{json,md}`
2. `planning/phases/phase-07/Design_Documents/DESIGN_DOCUMENT_WC01_shared_mcp_core_dual_host_architecture_contract.{json,md}`
3. `planning/phases/phase-07/Design_Documents/DESIGN_DOCUMENT_WC01_governed_role_tool_permission_matrix.{json,md}`
4. `planning/phases/phase-07/Implementer_Reports/IMPLEMENTER_REPORT_WC01_champcity_gpt_portability_review_shared_core_architecture.{json,md}`

Use these artifact identities:

- `champcity-ai/phase-07/diagnostic_report/WC01`
- `champcity-ai/phase-07/design_document/WC01-shared-mcp-core-dual-host-architecture`
- `champcity-ai/phase-07/design_document/WC01-role-tool-permission-matrix`
- `champcity-ai/phase-07/implementer_report/WC01`

The Implementer Report must include:

- exact repository identities and baselines;
- complete review coverage accounting;
- subsystem classifications;
- dependencies and runtime assumptions;
- gaps and risks;
- protected controls and associated tests;
- host interfaces;
- role/tool/permission summary;
- migration and rollback plan;
- unresolved decisions;
- files changed;
- commands run and execution lane;
- validation performed and skipped;
- Registry state and pair synchronization;
- final Git status for both repositories;
- confirmation that ChampCity_GPT remained unmodified.

Do not claim WC01 acceptance. Submit for Architect review.

## Validation

Before running validation, read each repository's validation-lane documentation.

ChampCity_AI:

- run typecheck;
- run focused lifecycle/artifact tests including the corrected real-corpus test;
- run the full repository test lane unless an unrelated documented harness failure remains;
- verify Registry load and all new/updated pair synchronization;
- do not use Playwright.

ChampCity_GPT:

- verify exact `dev` branch, commit `780217aa1046ad8d271d13887ba1121bba419362`, version `0.3.0`, and clean worktree before and after review;
- do not package, promote, mutate OAuth/DCR state, or run live connector changes.

## Prohibited Actions

Do not:

- create or publish `ChampCity_MCP_Core`;
- move, copy, or extract MCP production source;
- change ChampCity_GPT files;
- embed MCP into ChampCity_AI;
- implement new MCP tools or role execution;
- alter OAuth, transport, public endpoint, packaging, or release behavior;
- introduce browser automation, DOM automation, scraping, provider APIs, generic shell, or generic command execution;
- stage, commit, merge, push, tag, package, release, or perform Operator acceptance;
- reset, clean, stash, discard, or broadly rewrite the existing ChampCity_AI worktree.

No fallback implementation is authorized.

## Stop Conditions

Stop and report instead of proceeding when:

- exact Work Card or approval authority cannot be verified;
- canonical registration/reread requires new production architecture;
- the complete review coverage cannot be demonstrated;
- source duplication would be required;
- standalone ChampCity_GPT compatibility cannot be preserved;
- a protected subsystem change is required;
- an unresolved Operator decision prevents a precise extraction contract;
- ChampCity_GPT becomes dirty;
- unrelated ChampCity_AI changes appear during execution.

## Manual Validation After Codex

The human Operator should review only:

1. Whether the WC01 diagnostic accurately describes the complete ChampCity_GPT repository and identifies any omitted first-party areas.
2. Whether every major subsystem classification is understandable and defensible.
3. Whether the shared-core boundary preserves ChampCity_GPT as a standalone product.
4. Whether ChampCity_AI remains the sole workflow and canonical artifact authority.
5. Whether Architect, Independent Verifier, and Operator Validation permissions match the intended human/agent boundaries.
6. Whether unresolved decisions are presented plainly before WC02 is authored.

## Remaining Passes for Phase 07

After WC01 Implementer output:

- Architect review of WC01 evidence and architecture contracts;
- Operator review of any unresolved decisions;
- WC01 acceptance or bounded repair;
- just-in-time authoring and approval of WC02;
- WC02 through WC08 remain dependency-blocked.
