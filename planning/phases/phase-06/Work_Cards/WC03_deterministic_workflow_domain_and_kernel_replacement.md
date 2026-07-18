<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-06/work_card/WC03",
  "artifactType": "work_card",
  "createdAt": "2026-07-18T08:30:00.000Z",
  "jsonPath": "planning/phases/phase-06/Work_Cards/WC03_deterministic_workflow_domain_and_kernel_replacement.json",
  "markdownPath": "planning/phases/phase-06/Work_Cards/WC03_deterministic_workflow_domain_and_kernel_replacement.md",
  "parentArtifactId": "champcity-ai/phase-06/work_card_plan/Work_Card_Plan",
  "payload": {
    "kind": "work_card",
    "title": "Work Card: Phase 06 WC03 — Deterministic Workflow Domain and Kernel Replacement"
  },
  "payloadHash": "sha256:7a6ec08e2c1d8211e0f93f0f5c49f478eb714fd6c716e338c411e6f0b8a41908",
  "phaseId": "phase-06",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [
      "champcity-ai/phase-06/implementer_report/WC03"
    ],
    "sources": [
      "champcity-ai/phase-06/architect_review/WC02-REPAIR03",
      "champcity-ai/phase-06/candidate_disposition/WC02",
      "champcity-ai/phase-06/design_document/WC01-kernel-contract-artifact-protocol-source-authority-replacement-inventory",
      "champcity-ai/phase-06/diagnostic_report/WC02-full-workflow-resolver-foundation-top-to-bottom-review",
      "champcity-ai/phase-06/implementer_report/WC02-REPAIR03",
      "champcity-ai/phase-06/operator_approval/WC03",
      "champcity-ai/phase-06/work_card/WC02",
      "champcity-ai/phase-06/work_card/WC02-REPAIR03",
      "champcity-ai/phase-06/work_card/WC02-REPAIR04",
      "champcity-ai/phase-06/work_card_plan/Work_Card_Plan"
    ],
    "supersedes": [
      "champcity-ai/phase-06/work_card/WC02",
      "champcity-ai/phase-06/work_card/WC02-REPAIR04"
    ]
  },
  "revision": 2,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-18T08:50:12.000Z",
  "workCardId": "WC03"
}
-->

# Work Card: Phase 06 WC03 — Deterministic Workflow Domain and Kernel Replacement

Status: approved_for_implementer_execution
Phase: phase-06 — Workflow Kernel and Artifact Protocol Replacement
Work Card: WC03
Kind: replacement_candidate
Plan order: 3
Replaces: WC02
Supersedes withdrawn draft: WC02-REPAIR04
Owner: Implementer
Risk: critical
Source-code execution authorized: yes — `champcity-ai/phase-06/operator_approval/WC03`
Push authorized: no

## Purpose

Replace the failed WC02 foundation with a deterministic, code-owned workflow hierarchy, normalized domain, pure kernel, one executable action authority, and thin adapters.

WC03 is a new replacement candidate. It is not a repair of WC02 and not an implicit child card.

## Deterministic Authority Rule

IDs identify records. Typed fields and typed relationships define meaning.

Production code may compare an exact ID supplied by structured authority. It may not derive workflow meaning from characters inside an ID, filename, title, path, suffix, phase number, repair number, timestamp, directory order, first match, compatibility alias, renderer state, or LLM reasoning.

An LLM may draft or review prose only after application code supplies an exact compiled assignment. An LLM may not determine project, phase, Work Card, hierarchy, action, route, screen, expected output, or authorization.

## Required Hard Identity Hierarchy

Create one typed identity model and enforce it in artifact creation, normalization, kernel execution, routed writes, and validation.

### Project

Required: `projectId`, `repositoryBindingId`, `repositoryRootIdentity`, and `projectStatus`.

Display name and repository folder basename are presentation values only.

### Phase

Required: `phaseId`, `projectId`, `phaseSequence`, explicit `predecessorPhaseId`, optional explicit `successorPhaseId`, `phaseStatus`, `activationArtifactId`, and `closeoutArtifactId` when closed.

Do not parse or compare the text `phase-06` to determine lifecycle order.

### Work Card

Required: `workCardArtifactId`, `workCardId`, `workCardKind`, `projectId`, `phaseId`, `planArtifactId`, `planCandidateId`, `planOrder`, `rootCandidateArtifactId`, conditional `parentWorkCardArtifactId`, `workCardStatus`, and `expectedImplementerReportArtifactId`.

`workCardId` is a human-readable code and carries no executable meaning.

### Repair

A `repair` must explicitly declare `rootCandidateArtifactId`, `parentWorkCardArtifactId`, `repairSequence`, conditional `priorRepairArtifactId`, `triggerArtifactId`, `authorizingArtifactId`, `repairWorkCardArtifactId`, and `expectedImplementerReportArtifactId`.

Do not parse `-REPAIR##`.

### Replacement Candidate

A `replacement_candidate` must explicitly declare `replacementWorkCardArtifactId`, `replacesWorkCardArtifactId`, `authorizingDispositionArtifactId`, `replacementReasonArtifactId`, `planArtifactId`, `planOrder`, and `expectedImplementerReportArtifactId`.

A replacement terminally supersedes the replaced candidate without recording that candidate as successfully completed.

### Current Action

Every current action must contain exact `actionId`, `projectId`, `phaseId`, `targetArtifactId`, conditional `targetWorkCardArtifactId`, `responsibleRole`, `screenId`, `sourceArtifactIds`, `expectedOutputArtifactId`, `expectedOutputArtifactType`, `authorizedOperations`, and `stateRevision`.

No placeholder or synthetic output identity is allowed.

## Work Card Taxonomy and Child-Card Rule

Implement one code-owned enum with exactly:

- `planned_candidate`;
- `repair`;
- `replacement_candidate`.

There is no implicit generic child Work Card lifecycle.

`parentArtifactId` and `relationships.children` are structural links only. They cannot create an executable child Work Card.

Implementation scaffolding, internal checkpoints, commits, and tests remain inside the governing Work Card. A separate workflow Work Card requires an explicit taxonomy value and explicit governing authority.

Use `repair` only for a bounded correction where the parent architecture and scope remain valid. Use `replacement_candidate` when the architecture, identity model, subsystem boundary, or governing scope must be materially replaced.

## Typed Relationships

Normalize generic artifact links into validated typed relationships before kernel execution. Required kinds include:

- `belongs_to_project`;
- `belongs_to_phase`;
- `declared_by_plan`;
- `implements_candidate`;
- `repairs_work_card`;
- `follows_repair`;
- `triggered_by_validation`;
- `authorized_by_review`;
- `authorized_by_disposition`;
- `replaces_work_card`;
- `produces_implementer_report`;
- `produces_architect_review`;
- `produces_operator_validation`;
- `supersedes_artifact`.

## Four-Layer Architecture

1. **Verified Artifact Graph** verifies synchronized pairs, exact identity, ownership fields, relationships, duplicates, cycles, invalid status combinations, and missing required fields. It selects no workflow meaning.
2. **Normalized Workflow Domain** converts verified records into typed project, phase, candidate, repair, replacement, validation, disposition, and output records. It rejects ambiguity and performs no ID parsing.
3. **Pure Workflow Kernel** consumes only normalized domain objects and returns exactly one typed current action or one typed blocker. It has no repository, filesystem, Registry, Workflow State, IPC, Electron, renderer, or LLM dependency.
4. **Thin Adapters** project and enforce the exact kernel result. They may format and verify, but may not reinterpret, infer, alias, default, reroute, or independently advance state.

## Single Executable Action Authority

One typed action catalog must be the sole executable authority for action IDs, workflow stage, role, screen, target rule, source rule, expected output type, authorized operations, and all transitions.

Delete the duplicate hand-authored `runtimeActions` authority from `processContract.ts`, or generate every process-contract view directly from the catalog without repeated semantic literals.

Delete or reduce every other transition, route, workflow-step, visibility, IPC, and renderer map to generated or presentation-only adapters.

## Prohibited Authority

Production workflow authority must not use:

- regex lists to categorize workflow records;
- parsing of `phase-##`, `WC##`, `-REPAIR##`, filenames, titles, paths, or directories;
- visible-ID numeric inference;
- timestamp, newest-file, or directory-order selection;
- `[0]`, `first()`, or first matching `.find()` selection of controlling evidence;
- title-derived output paths;
- synthetic IDs;
- action aliases or workflow-step/role-derived screen defaults;
- stale Registry or Workflow State override;
- LLM reasoning about identity or current action.

Regex is permitted only to reject malformed human-readable display codes at an input boundary. Passing a regex never establishes meaning or authority.

## Exact Implementer Assignment and Approval

Before Implementer execution, code must compile an exact assignment containing repository identity, project ID, phase ID, action ID, target Work Card artifact ID, Work Card kind, plan order, replacement/parent/prior IDs when applicable, exact Operator Approval artifact ID, exact source bundle, exact expected Implementer Report artifact ID, authorized production surface, and state revision.

WC03 remains non-executable while pending. `implementer_execution_required` requires an exact active Operator Approval for:

`champcity-ai/phase-06/work_card/WC03`

Approval for WC02, any WC02 repair, or the Phase generally cannot authorize WC03.

Every routed write must verify exact action, role, screen, target, sources, output identity, output type, operation, and state revision. After a primary write, rescan evidence, rebuild the domain, rerun the kernel, and project the result.

## Current Corpus Migration

Perform the minimum deterministic, idempotent, reversible canonical migration needed to add explicit hierarchy fields to the Phase 04–06 corpus.

Preserve stable IDs and historical outcomes. Record WC02 as superseded by WC03, WC02-REPAIR04 as superseded before approval, and WC03 as `replacement_candidate`. Do not create aliases, shadow artifacts, or historical reclassification merely to pass tests.

## Required Real-Repository Proof

Using the selected ChampCity_AI repository, prove:

1. Project and phase identity come from explicit authority.
2. WC01 is resolved.
3. WC02 is terminally superseded by WC03.
4. WC02-REPAIR01 and WC02-REPAIR02 remain passed.
5. WC02-REPAIR03 remains not accepted.
6. WC02-REPAIR04 is superseded and non-executable.
7. WC03 is the pending replacement candidate.
8. Before exact WC03 approval, Implementer execution is blocked.
9. After exact approval, current action targets WC03.
10. After the exact WC03 Implementer Report exists, current action is Architect Review of WC03.
11. Unknown actions display only a blocker.
12. Ad Hoc Work Card Capture is never routed.
13. Cold start, manual refresh, observer refresh, focus refresh, and post-write refresh agree.

## Required Tests and Gates

Add independent coverage for the hard identity schema, explicit phase succession, explicit Work Card kind and plan order, repair and replacement lineage, no implicit child cards, compiled Implementer assignment, graph-to-domain normalization, pure kernel isolation, one executable action authority, no regex categorization, no first-match selection, no synthetic outputs, ambiguity with no selected identity, exact approval isolation, unknown-action blocker, Registry/Workflow State non-authority, project isolation, real corpus replay, and mounted Electron parity.

Repository gates must enforce positive architectural invariants, not only search for selected forbidden strings.

## Authorized Surface

After exact Operator Approval, changes are authorized only where required in workflow, repository, canonical artifact type/validator/builder/migration, minimum IPC/preload/shared types, minimum routed renderer selection, workflow tests, gates, replay scripts, mounted checks, synchronized planning migrations, and the WC03 Implementer Report.

Do not change unrelated UI, onboarding, display-name behavior, MCP, connectors, LLM providers, authentication, deployment, cloud functionality, or unrelated application features.

Do not create another repair of WC02, an implicit child Work Card, compatibility authority, fallback, alias, or shadow. Do not push or perform Operator acceptance.

## Validation and Report

Run the documented normal Windows typecheck, build, complete unit suite, repository gates, real Phase 04–06 replay, selected-repository current-action probe, mounted Electron routing, refresh parity, project isolation, and final git status.

Create:

`planning/phases/phase-06/Implementer_Reports/IMPLEMENTER_REPORT_WC03_deterministic_workflow_domain_and_kernel_replacement.{json,md}`

Artifact ID:

`champcity-ai/phase-06/implementer_report/WC03`

The report must map every acceptance criterion to exact production and independent test evidence.

## Acceptance Criteria

WC03 is acceptable only when all workflow hierarchy meaning is explicit data; IDs are not parsed for authority; the Work Card taxonomy is code-enforced; no implicit child lifecycle exists; a separate normalized domain and pure kernel exist; one catalog is the sole executable semantic authority; duplicate transition and route authority is removed or generated; no synthetic identity, first-match selection, or LLM identity reasoning remains; exact approval authorizes only WC03; the compiled assignment identifies project, phase, card, action, and output; WC02 is terminally superseded; real-corpus and mounted validation pass; the repository is clean; no push occurred; and Operator acceptance was not performed by the Implementer.

## Operator Approval Recorded

WC03 revision 2 is authorized for Implementer execution by `champcity-ai/phase-06/operator_approval/WC03`. This approval does not authorize push or Operator acceptance.
