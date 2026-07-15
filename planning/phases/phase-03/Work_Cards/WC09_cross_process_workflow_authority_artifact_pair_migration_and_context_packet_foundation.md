<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-03/work_card/WC09",
  "artifactType": "work_card",
  "createdAt": "2026-07-14T00:00:00.000Z",
  "jsonPath": "planning/phases/phase-03/Work_Cards/WC09_cross_process_workflow_authority_artifact_pair_migration_and_context_packet_foundation.json",
  "markdownPath": "planning/phases/phase-03/Work_Cards/WC09_cross_process_workflow_authority_artifact_pair_migration_and_context_packet_foundation.md",
  "payload": {
    "kind": "work_card",
    "title": "Work Card: WC09 — Cross-Process Workflow Authority, Artifact Pair Migration, and Context Packet Foundation"
  },
  "payloadHash": "sha256:65ce5fd46cd292a0eb4df58f559e18fbf0197672d914b13fb1576f1a63c3d44b",
  "phaseId": "phase-03",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [
      "champcity-ai/phase-03/architect_review/WC09",
      "champcity-ai/phase-03/implementer_report/WC09",
      "champcity-ai/phase-03/implementer_report/WC09-REPAIR01",
      "champcity-ai/phase-03/work_card/WC09-REPAIR01"
    ],
    "expectedOutputs": [
      "champcity-ai/phase-03/implementer_report/WC09"
    ],
    "sources": [],
    "supersedes": []
  },
  "revision": 5,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-14T00:00:00.000Z",
  "workCardId": "WC09"
}
-->

# Work Card: WC09 — Cross-Process Workflow Authority, Artifact Pair Migration, and Context Packet Foundation

Status: ready_for_implementer
Phase: phase-03 — Workflow Router Screen Correction and Guided Current Action UI
Work Card ID: WC09
Risk level: critical
Recommended model: GPT-5.6 Sol Ultra
Recommended reasoning: Ultra / maximum available

## Purpose

Stabilize ChampCity A/I before any additional route-specific Phase 03 work.

The visible process remains:

`Capture → Frame → Plan → Build → Prove`

This Work Card does not redesign that process. It replaces the fragmented internal authority model with one canonical system used across project intake, planning, phase work, implementation, review, validation, repair, closeout, roadmap update, and next-phase activation.

It also establishes bounded Architect Context Packets and Implementer Execution Packets so token use is controlled by decision reuse and relevant context selection rather than increasingly large prompts.

## Stabilization Escalation

WC08 required six repair passes and the application still remains at:

`Architect review of repair Implementer Report required`

for:

`WC08-REPAIR04 — Controlled Route Recovery and Accurate Route Evidence Authority`

The Operator still cannot complete the governed action through the application.

WC09 is therefore an architecture stabilization escalation:

- Do not create WC08-REPAIR07.
- Do not require WC08 acceptance before beginning WC09.
- Treat the complete WC08 route, report, review, validation, and repair chain as migration input.
- Preserve the historical repair chain for audit, but do not preserve its fragmented runtime behavior.
- The migrated application must make the actual unresolved WC08 action executable.
- WC09 acceptance requires the current WC08 path to work end to end: open current action, enter Architect Review, bind the authoritative Implementer Report, preview, save, and transition to Operator Validation.

The still-broken WC08 state is a blocking WC09 acceptance scenario, not another repair card.

## Product and UI Authority

Codex may refactor internal architecture broadly, but it does not receive product-design authority.

Preserve:

- horizontal Capture → Frame → Plan → Build → Prove visibility;
- compact Current Action panel;
- center workspace ownership of active work;
- Artifacts as the only artifact browser and preview surface;
- reference navigation as non-authoritative context;
- the approved Figma-derived hierarchy and styling direction;
- no new permanent pane, rail, or primary navigation system without Architect approval.

Visible changes are limited to canonical authority status, synchronization blockers, migration status, context-packet controls, and terminology correction.

## Governing Decisions

### 1. One logical artifact, two synchronized representations

Markdown and JSON are retained.

They represent one logical artifact revision:

- Markdown is the human-readable review and handoff representation.
- JSON is the machine-readable runtime representation.
- Both are generated from one validated typed domain object.
- Both share artifact identity, schema version, revision, status, relationships, timestamps, and payload hash.
- Pair mismatch is a blocking synchronization error. The application does not guess which file wins.

### 2. No runtime legacy fallback

The running application must not retain:

- alias-based compatibility readers;
- multiple active schemas for the same artifact type;
- permissive fallback parsing;
- authority inferred from filename suffixes, timestamps, directory order, or first match;
- active legacy documents outside the canonical standard.

A one-time migration utility may recognize legacy structures only to migrate them. Runtime code must not import migration-only parsers.

### 3. Existing documents are migrated, not supported indefinitely

Migrate all supported active project and Phase 03 durable artifacts to the canonical standard, including:

- project intake, Architect interview, planning, reconciliation, roadmap, phase map, approvals, and observation registers;
- phase intake, Architect interview, planning documents, Work Card Plan, approvals, and observation registers;
- Work Cards and repair Work Cards;
- Implementer Reports;
- Architect Reviews;
- Validation Reports;
- Route Review Requests;
- closeout, roadmap-update, and activation records where present.

Binary evidence remains attachment evidence referenced by canonical records.

### 4. Canonical Implementer-facing role terminology

`Implementer` is the only active product, UI, schema, code, path, prompt, and artifact term.

Pre-WC09 role terminology is legacy and must be removed from the active application and active durable artifact set.

Migration requirements:

- Rename active `<LEGACY_REPORT_STORAGE>/` directories to `Implementer_Reports/`.
- Rename active `<LEGACY_REPORT_PREFIX>...` files to `IMPLEMENTER_REPORT_...`.
- Rename active schema fields, TypeScript types, functions, IPC channels, renderer APIs, form labels, generated prompts, report headings, validation text, and documentation from legacy role terminology to Implementer-facing role terminology.
- Replace legacy role prompt terminology with `Implementer handoff` or `Implementer execution packet`, according to function.
- Remove runtime aliases that use legacy role terminology, including former report and prompt aliases and legacy storage names.
- Legacy role terms may appear only in migration code and the migration manifest when identifying original names.
- Externally fixed tool names must be isolated behind adapters and not exposed as ChampCity A/I terminology.

The canonical WC09 report path is:

`planning/phases/phase-03/Implementer_Reports/IMPLEMENTER_REPORT_WC09_cross_process_workflow_authority_artifact_pair_migration_and_context_packet_foundation.md`

### 5. Revision model

Use one authoritative Markdown/JSON pair per logical artifact.

Ordinary revisions:

- retain artifact ID and canonical filenames;
- increment revision;
- update timestamps and payload hash;
- rewrite both representations;
- rely on Git history for prior content.

Do not create active `_2`, `_3`, or similar revisions.

Duplicate historical artifacts must be explicitly resolved, blocked, or archived in the migration manifest. Authority may not be inferred.

## Required Cross-Process Architecture

### Canonical artifact envelope

Every durable artifact must use a versioned envelope containing at least:

- artifactId;
- artifactType;
- schemaVersion;
- revision;
- status;
- projectId;
- phaseId where applicable;
- workCardId where applicable;
- parentArtifactId where applicable;
- createdAt;
- updatedAt;
- markdownPath;
- jsonPath;
- payloadHash;
- explicit source, expected-output, superseded, and child relationships where applicable.

Artifact-specific content remains a typed payload.

### Canonical artifact registry

Create one registry that:

- identifies exactly one authoritative revision for each active logical artifact;
- distinguishes active, pending, blocked, superseded, archived, and historical records;
- records source/output and parent/child relationships;
- exposes pair synchronization failures;
- prevents duplicate active authority;
- is updated only through the canonical artifact-pair service;
- serves every process stage.

### Canonical workflow-state index

Create one project workflow-state record covering the complete lifecycle and identifying:

- current project stage;
- active phase;
- current action ID;
- responsible role;
- authoritative target artifact ID;
- required source artifact IDs;
- expected output artifact ID and type;
- success, failure, and repair routes;
- blocking conditions;
- open repair chain;
- closeout, roadmap, and next-phase state.

Screens and services may not independently reconstruct current state from directory scans.

### Cross-process routed-action contract

Create one typed routed-action contract consumed by every routed screen. It must include:

- action identity and workflow stage;
- responsible role;
- authoritative target identity;
- authoritative source identities;
- expected output identity;
- success, failure, and repair routes;
- binding source;
- blocking ambiguity or synchronization state.

The same contract must control:

- Current Action presentation;
- workspace selection;
- form initialization;
- source selection;
- preview;
- save;
- post-save workflow transition.

Reference navigation must use a separate type and state path and cannot replace the routed target.

### Cross-process role gates

Enforce consistently:

- Operator captures intent, reviews and approves planning, performs validation, and approves closeout.
- Architect frames, plans, creates Work Cards, reviews Implementer Reports, determines validation disposition, and creates repairs.
- Implementer executes approved Work Cards and creates Implementer Reports.
- Application enforces current action, artifact authority, role gates, and transition evidence.

A routed screen must match the responsible role and expected output.

### Canonical artifact-pair service

All active artifact writers must use one service that:

1. validates the typed payload;
2. assigns or resolves artifact identity and revision;
3. renders canonical JSON;
4. renders Markdown;
5. calculates the shared payload hash;
6. writes both representations as one governed operation;
7. verifies pair consistency;
8. updates the registry;
9. updates workflow state only after pair and registry success;
10. returns a blocking partial-write error on failure.

Process-specific writers must migrate to this service or be removed from active use.

## One-Time Repository Migration

Create a deterministic migration tool and run it against the current repository.

Required behavior:

- inventory active workflow documents;
- identify logical artifact type and relationships;
- convert each supported artifact to the canonical envelope and payload;
- regenerate synchronized Markdown/JSON pairs;
- consolidate ordinary revisions into one authoritative pair;
- migrate legacy role terminology and paths to Implementer-facing role terminology;
- update every canonical relationship and registry entry to renamed paths;
- generate Markdown and JSON migration manifests;
- move superseded or non-authoritative files outside active discovery;
- record unresolved authority conflicts as canonical blockers;
- verify no active legacy schema document remains;
- verify runtime code imports no migration-only parser;
- verify active runtime code, UI, schemas, prompts, and documents contain no legacy role terminology.

The migration must support dry-run, apply, rollback guidance, and idempotence validation.

## Context Packet and Token-Burn Foundation

### Architect Context Packet

Support manual copy/paste packets for at least:

- just-in-time Work Card creation;
- Implementer Report review;
- validation disposition and repair creation;
- phase closeout decision.

Each packet contains:

- concise stable project contract summary;
- current authoritative workflow state;
- exact decision requested;
- controlling sources or bounded summaries;
- relevant open observations;
- changed evidence since prior decision;
- included and excluded artifact manifest with reasons;
- estimated token count and largest contributors.

Resolved and unrelated history is excluded by default.

### Implementer Execution Packet

Each packet contains:

- current Work Card delta;
- applicable architecture and UI contract references;
- exact acceptance criteria;
- controlling sources;
- relevant observations;
- repository and branch facts;
- validation-lane references;
- expected Implementer Report artifact;
- included and excluded artifact manifest;
- estimated token count and largest contributors.

Permanent rules already in `AGENTS.md` and `VALIDATION_COMMAND_LANES.md` are referenced rather than repeated.

Complete repair history and unrelated reports are excluded by default.

### Context budgets

Add configurable default budgets for both packet types.

Before export, the application must:

- estimate total tokens;
- identify largest contributors;
- warn when budget is exceeded;
- require explicit Operator acknowledgment for over-budget export;
- save the context manifest beside the packet.

No provider API is required.

## Required Documentation

Create or update:

- `docs/architecture/WORKFLOW_AUTHORITY_CONTRACT.md`
- `docs/architecture/ARTIFACT_PAIR_AND_REVISION_STANDARD.md`
- `docs/architecture/ROUTED_ACTION_CONTRACT.md`
- `docs/architecture/ROLE_GATE_CONTRACT.md`
- `docs/architecture/CONTEXT_PACKET_AND_TOKEN_BUDGET_STANDARD.md`
- README language defining Markdown and JSON as synchronized representations of one logical artifact
- active documentation and examples using Implementer-facing role terminology only

## Required Implementation Sequence

Before substantive edits, create an implementation-plan section in the draft Implementer Report covering:

1. repository inventory and migration dry-run;
2. canonical domain types;
3. artifact-pair service and registry;
4. workflow-state and routed-action contracts;
5. role gates;
6. one-time document and terminology migration;
7. runtime cutover and removal of legacy paths;
8. WC08 end-to-end route restoration;
9. Architect and Implementer packet compilers;
10. integration tests, rollback, and safety plan.

Do not solve this with additional compatibility wrappers.

## Acceptance Criteria

### Migration and terminology

- All supported active project and Phase 03 workflow artifacts are canonical.
- Every active logical artifact has one synchronized Markdown/JSON pair.
- Every pair has matching ID, revision, status, relationships, and payload hash.
- Registry contains exactly one authoritative revision per active artifact.
- Runtime discovery accepts canonical schemas only.
- Runtime compatibility readers and alias fallback parsing are removed.
- Active report storage uses `Implementer_Reports/`.
- Active report filenames use `IMPLEMENTER_REPORT_...`.
- Active runtime code, UI, schemas, generated prompts, and documents contain no legacy role aliases.
- Legacy parsing and legacy-role-name recognition exist only in migration code.
- `_2`, `_3`, and similar active revisions are no longer produced.
- Migration manifest records every rename, migration, archive, block, and resulting artifact identity.

### Workflow

- One workflow-state index covers Capture → Frame → Plan → Build → Prove.
- Every routed process screen receives one authoritative routed-action contract.
- Reference navigation cannot override routed targets.
- Role gates are consistent across project, phase, implementation, review, validation, repair, and closeout flows.
- State advances only after canonical artifact-pair and registry success.
- Missing, conflicting, or unsynchronized authority blocks with a clear owner and next action.
- The migrated WC08 Architect Review action is executable and transitions to Operator Validation after save.
- Parent WC08, WC08-REPAIR05, reference selection, or legacy paths cannot override the WC08-REPAIR04 target.
- No active route remains blocked solely because of historical WC08 document structure.
- No WC08-REPAIR07 is created.

### Context packets

- Required Architect packet scenarios generate successfully.
- Implementer packet generation works for a current Work Card.
- Each packet saves included and excluded artifact manifests.
- Each packet reports estimated tokens and largest contributors.
- Resolved and unrelated history is excluded by default.
- Stable repository rules are referenced rather than duplicated.
- Over-budget export requires explicit acknowledgment.
- Packet generation works without provider APIs.

## Cross-Process Validation Matrix

Add deterministic tests for at least:

1. Project Intake → Architect Interview.
2. Architect Interview → Project Planning/Reconciliation.
3. Project Planning → Operator Project Approval.
4. Project Approval → Phase Mapping.
5. Phase Planning → Operator Phase Approval.
6. Phase Approval → first unresolved Work Card candidate.
7. Work Card approval → Implementer handoff.
8. Implementer Report → exact Architect Review target.
9. Architect Review → Operator Validation only after authorization.
10. Failed or partial validation → Architect disposition and repair creation.
11. Passing validation → next unresolved candidate.
12. Final candidate resolution → Phase Closeout.
13. Closeout approval → Roadmap update.
14. Roadmap update → next-phase activation.
15. Conflicting or unsynchronized artifacts → blocked authority, never inference.
16. Reference navigation cannot override any routed target.
17. Current WC08 Architect Review completes and transitions to Operator Validation.
18. Architect packets include only decision-relevant authority.
19. Implementer packets include only execution-relevant authority.
20. Over-budget export requires acknowledgment.
21. Runtime rejects legacy schemas after migration.
22. Runtime and active artifacts contain no legacy role terminology.

Use mounted renderer or component integration tests for stateful routed workflows. Source-regex assertions alone are insufficient.

## Out of Scope

- Do not redesign the process map.
- Do not redesign the complete UI shell.
- Do not grant Codex unapproved visual or navigation authority.
- Do not finish every later route-specific form.
- Do not implement direct ChatGPT, Codex, MCP, connector, or provider API invocation.
- Do not implement multi-project workspace management.
- Do not add a database or cloud service.
- Do not preserve runtime legacy schemas or legacy role aliases.
- Do not create WC08-REPAIR07.
- Do not perform Operator acceptance.
- Do not merge to `dev`.
- Do not push to `master`.

## Validation Expectations

- Read `AGENTS.md` and `docs/dev/VALIDATION_COMMAND_LANES.md`.
- Run approved TypeScript, unit, build, and focused validation lanes.
- Add migration dry-run, apply, rollback-guidance, and idempotence tests.
- Add pair-hash and synchronization tests.
- Add registry single-authority tests.
- Add cross-process workflow integration tests.
- Add mounted renderer tests for representative routed screens and the current WC08 route.
- Add Architect and Implementer packet relevance and budget tests.
- Verify runtime code does not import migration-only parsers.
- Verify no active legacy schema or legacy-role-named artifact remains after migration.
- Run secret, concrete-path, generated-junk, and unrelated-change scans.
- Do not install or use Playwright unless separately approved.

## Required Implementer Report

Create:

`planning/phases/phase-03/Implementer_Reports/IMPLEMENTER_REPORT_WC09_cross_process_workflow_authority_artifact_pair_migration_and_context_packet_foundation.md`

The report must include:

- repository, branch, and remote verification;
- implementation architecture and sequencing;
- files created, modified, migrated, archived, renamed, and removed;
- canonical artifact envelope and payload schemas;
- registry behavior;
- workflow-state index behavior;
- routed-action behavior across process categories;
- role-gate enforcement;
- migration inventory and manifest summary;
- Legacy-to-Implementer-facing role terminology and path migration summary;
- confirmation runtime legacy fallbacks and legacy role aliases were removed;
- proof the migrated WC08 route completes and transitions to Operator Validation;
- Markdown/JSON synchronization and revision behavior;
- Architect packet behavior and token estimates;
- Implementer packet behavior and token estimates;
- UI non-regression explanation;
- validation commands and results;
- skipped checks and reasons;
- unresolved migration blockers;
- safety scan results;
- remaining dirty or untracked files;
- commit hash and push status;
- confirmation `dev` and `master` were not modified;
- residual risks;
- recommended next action using role-owned language.

## Branch and Git Requirements

Base branch:

`feature/phase-03-wc08-repair06-current-action-architect-review-binding`

Target branch:

`feature/phase-03-wc09-cross-process-workflow-stabilization`

Commit message:

`Stabilize cross-process workflow and artifact authority`

Push the feature branch only.

Do not merge to `dev`.

Do not push to `master`.

## Next Action Ownership

Architect owns this Work Card and the architectural and product/UI boundaries.

Implementer executes the migration and refactor and creates the canonical Implementer Report.

Architect reviews the report and source changes.

Operator performs acceptance only after Architect authorization.

No remaining Phase 03 route-specific Work Card begins until WC09 is accepted.
