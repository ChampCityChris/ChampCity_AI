<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-03/work_card/WC09-REPAIR01",
  "artifactType": "work_card",
  "createdAt": "2026-07-15T13:50:00.000Z",
  "jsonPath": "planning/phases/phase-03/Work_Cards/WC09-REPAIR01_canonical_lifecycle_alignment_and_multi_work_card_loop_completion.json",
  "markdownPath": "planning/phases/phase-03/Work_Cards/WC09-REPAIR01_canonical_lifecycle_alignment_and_multi_work_card_loop_completion.md",
  "parentArtifactId": "champcity-ai/phase-03/work_card/WC09",
  "payload": {
    "kind": "work_card",
    "title": "Repair Work Card - WC09-REPAIR01 Canonical Lifecycle Alignment and Multi-Work-Card Loop Completion"
  },
  "payloadHash": "sha256:42bcc1054f2edd1da2ecf21bbb7bfa42d1377680d859f66c63befc2eec3460ab",
  "phaseId": "phase-03",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [
      "champcity-ai/phase-03/implementer_report/WC09-REPAIR01"
    ],
    "expectedOutputs": [
      "champcity-ai/phase-03/implementer_report/WC09-REPAIR01"
    ],
    "sources": [
      "champcity-ai/phase-03/architect_review/WC09",
      "champcity-ai/phase-03/work_card/WC09"
    ],
    "supersedes": []
  },
  "revision": 2,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-15T14:10:00.000Z",
  "workCardId": "WC09-REPAIR01"
}
-->

# Repair Work Card: WC09-REPAIR01 — Canonical Lifecycle Alignment and Multi-Work-Card Loop Completion

Status: ready_for_implementer
Phase: phase-03 — Workflow Router Screen Correction and Guided Current Action UI
Parent Work Card: WC09 — Cross-Process Workflow Authority, Artifact Pair Migration, and Context Packet Foundation
Repair ID: WC09-REPAIR01
Risk level: high

## Repair Trigger

Architect review of WC09 determined that its canonical artifact, registry, migration, routed-action, terminology, and context-packet foundations are substantive, but the persisted lifecycle does not match the locked process authority.

Primary Architect Review:

`planning/phases/phase-03/Architect_Reviews/ARCHITECT_REVIEW_WC09_cross_process_workflow_authority_artifact_pair_migration_and_context_packet_foundation.md`

## Purpose

Correct the canonical lifecycle without undoing WC09's successful authority refactor.

The repaired lifecycle must follow:

`Project Intake -> Project Interview -> Reconciliation Review -> Project Mapping -> Operator Project Approval -> Phase Mapping -> Operator Phase Approval -> Work Card Loop -> Phase Closeout -> Operator Phase Closeout Approval -> Roadmap Update -> Next Phase Activation -> Repeat Phase Mapping / Work Card Loop`

## Required Repair

### 1. Align Phase Mapping with the approved process

Remove `phase_intake_required` as an Operator workflow gate.

Do not require the Operator to complete a separate Phase Intake screen after Phase Mapping.

Do not treat `phase_architect_interview_required` as a mandatory standalone top-level workflow step.

Phase Mapping owns the phase-planning bundle. Architect-owned questions or an internal Phase Interview artifact may be generated dynamically when required, but they are subordinate to Phase Mapping and cannot become a separate Operator gate.

The canonical Phase Mapping route must produce or reconcile the required phase-planning evidence, including:

- Phase planning authority.
- Work Card candidate plan.
- Any Architect interview artifact actually required for the phase.
- Expected Operator Phase Approval.

After the required Phase Mapping bundle is authoritative and synchronized, route to Operator Phase Approval.

### 2. Implement a real multi-candidate Work Card Loop

Add canonical phase execution state that knows:

- The approved ordered Work Card candidate list.
- Which candidates have full Work Cards.
- Which candidate is the earliest unresolved candidate.
- Candidate resolution status.
- Active Work Card and active repair.
- Whether closeout eligibility is satisfied.

After a passing Work Card or repair validation:

- Evaluate the approved Work Card Plan.
- Route to full Work Card authoring for the earliest unresolved candidate.
- Do not route to Phase Closeout while any candidate remains unresolved.

Recognize these candidate resolutions as closeout-eligible:

- completed;
- completed via repair;
- carried forward;
- deferred;
- cancelled.

Do not treat an artifact's mere presence or historical status as candidate resolution.

### 3. Enforce closeout eligibility

Phase Closeout may be selected only when every approved mapped candidate is resolved under the permitted statuses.

If the candidate plan is missing, unsynchronized, ambiguous, or contains an unresolved candidate, Phase Closeout must be blocked with a clear owner and correction action.

### 4. Correct human decision ownership

Use the established roles:

- Architect performs Roadmap Update after approved closeout.
- Operator performs Next Phase Activation or records the no-next-phase decision.
- Application validates evidence, writes canonical state, and enforces transitions; it does not make these human decisions.

Keep all other role ownership aligned with the Role Gate Contract.

### 5. Reconcile active repair-chain state

Derive the open/active repair chain from canonical registry authority.

Historical, archived, superseded, or non-controlling repair Work Cards must not appear in `activeRepairArtifactIds`.

For the current WC08 bootstrap state, the chain must clearly identify the controlling unresolved target and retain other repairs only as history/evidence.

### 6. Remove hard-coded bootstrap authority

The canonical workflow state must not be hard-coded to WC08-REPAIR04 or any specific project example.

Derive the persisted current action from canonical registry authority, current phase execution state, Architect Review disposition, and the latest active Work Card or repair obligation.

After this Architect Review and WC09-REPAIR01 Work Card are registered:

- The real project workflow must identify WC09-REPAIR01 as the controlling current implementation obligation.
- The routed action must be the appropriate Implementer handoff/execution action for WC09-REPAIR01.
- WC08-REPAIR04 remains a deterministic regression scenario, not the permanently seeded production current action.
- Migration or application restart must not reset the real project back to the WC08 bootstrap example.

### 7. Preserve WC09 foundations

Do not regress:

- canonical Markdown/JSON pair service;
- payload hashes and synchronization blocking;
- artifact registry single authority;
- canonical runtime-only schemas;
- migration-only legacy parsing;
- Implementer terminology and `Implementer_Reports/IMPLEMENTER_REPORT_...`;
- routed-action binding;
- reference navigation isolation;
- role-gate enforcement;
- WC08-REPAIR04 exact Architect Review binding;
- Architect and Implementer context packets;
- token estimates, manifests, and over-budget acknowledgment;
- existing approved UI layout and process map.

## Acceptance Criteria

- The canonical success lifecycle matches the locked process baseline.
- No Operator Phase Intake action appears after Phase Mapping.
- Any Phase Interview behavior is subordinate to Architect-owned Phase Mapping and is not a standalone Operator gate.
- Operator Phase Approval follows completion of the authoritative Phase Mapping bundle.
- Passing validation of a non-final candidate routes to the next unresolved candidate.
- Passing validation of the final candidate routes to Phase Closeout.
- Closeout remains blocked while any mapped candidate is unresolved.
- Carried-forward, deferred, cancelled, completed, and completed-via-repair statuses are evaluated explicitly.
- Roadmap Update is Architect-owned.
- Next Phase Activation is Operator-owned.
- Application role remains enforcement-only for those human decisions.
- Active repair-chain IDs match canonical active/pending/blocked authority and exclude historical/superseded repairs.
- The WC08 regression scenario still previews/saves the exact WC08-REPAIR04 Architect Review and advances to Operator Validation in deterministic test state.
- Production workflow state is derived from canonical authority and is not hard-coded to WC08-REPAIR04.
- After the WC09 Architect Review and WC09-REPAIR01 Work Card are registered, the real current action identifies WC09-REPAIR01 as the controlling implementation obligation.
- Context-packet behavior and token budgets remain intact.
- No legacy runtime schema or terminology compatibility is reintroduced.
- `IMPLEMENTER_REPORT_WC09-REPAIR01_canonical_lifecycle_alignment_and_multi_work_card_loop_completion.md` exists.

## Required Tests

Add deterministic tests for:

1. Locked project workflow spine.
2. Phase Mapping bundle to Operator Phase Approval without Operator Phase Intake.
3. Optional/dynamic Architect interview evidence without a separate Operator gate.
4. Two or more ordered Work Card candidates.
5. Passing first candidate routes to next candidate authoring.
6. Passing final candidate routes to closeout.
7. Unresolved candidate blocks closeout.
8. Carried-forward/deferred/cancelled/completed-via-repair resolution handling.
9. Architect Roadmap Update role gate.
10. Operator Next Phase Activation role gate.
11. Historical repair IDs excluded from active repair chain.
12. WC08 Architect Review to Operator Validation preservation in deterministic fixture state.
13. Production workflow bootstrap derives the actual current obligation and does not hard-code WC08-REPAIR04.
14. Registration of the WC09 Architect Review and WC09-REPAIR01 pair routes the real project to WC09-REPAIR01 Implementer work.
15. Artifact registry, pair synchronization, migration boundary, terminology, and context-packet preservation.

Mounted renderer coverage is required for any stateful UI behavior changed by this repair.

## Out of Scope

- Do not redesign Capture → Frame → Plan → Build → Prove.
- Do not redesign the horizontal process rail.
- Do not finish all later route-specific screens.
- Do not reintroduce legacy schema or terminology fallback.
- Do not create WC08-REPAIR07.
- Do not implement provider APIs, databases, cloud services, or Playwright.
- Do not merge to `dev`.
- Do not push to `master`.
- Do not perform Operator validation.

## Required Implementer Report

Create:

`planning/phases/phase-03/Implementer_Reports/IMPLEMENTER_REPORT_WC09-REPAIR01_canonical_lifecycle_alignment_and_multi_work_card_loop_completion.md`

The report must include:

- Root cause of lifecycle drift.
- Canonical action catalog changes.
- Phase Mapping boundary changes.
- Multi-candidate state model and selection algorithm.
- Closeout eligibility logic.
- Roadmap Update and Next Phase Activation role corrections.
- Repair-chain reconciliation.
- Removal of hard-coded WC08 production bootstrap and derivation of actual current project state.
- Preserved WC09 authority/migration/context-packet behavior.
- Files changed.
- Validation commands and results.
- Skipped checks.
- Safety scans.
- Commit hash and push status.
- Confirmation `dev` and `master` were not modified.
- Architect Review instructions.

## Branch and Git Requirements

Base branch:

`feature/phase-03-wc09-cross-process-workflow-stabilization`

Target branch:

`feature/phase-03-wc09-repair01-lifecycle-alignment`

Commit message:

`Align canonical lifecycle and Work Card loop`

Push the feature branch only.

## Next Action Ownership

Architect created this repair Work Card.

Implementer executes WC09-REPAIR01 and creates the Implementer Report.

Architect reviews the report.

Operator validates only after Architect authorization.

No later Phase 03 Work Card begins until WC09 and WC09-REPAIR01 are accepted.
