<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-03/work_card/WC09-REPAIR02",
  "artifactType": "work_card",
  "createdAt": "2026-07-15T15:50:00.000Z",
  "jsonPath": "planning/phases/phase-03/Work_Cards/WC09-REPAIR02_locked_process_contract_and_evidence_precedence_correction.json",
  "markdownPath": "planning/phases/phase-03/Work_Cards/WC09-REPAIR02_locked_process_contract_and_evidence_precedence_correction.md",
  "parentArtifactId": "champcity-ai/phase-03/work_card/WC09",
  "payload": {
    "kind": "work_card",
    "title": "Repair Work Card: WC09-REPAIR02 Locked Process Contract and Evidence Precedence Correction"
  },
  "payloadHash": "sha256:08511772b8a798d40119b71750eec3559a021d45377d7d1d374558fc29031d3f",
  "phaseId": "phase-03",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [
      "champcity-ai/phase-03/implementer_report/WC09-REPAIR02"
    ],
    "sources": [
      "champcity-ai/phase-03/architect_review/WC09-REPAIR01",
      "champcity-ai/phase-03/implementer_report/WC09-REPAIR01",
      "champcity-ai/phase-03/work_card/WC09-REPAIR01"
    ],
    "supersedes": []
  },
  "revision": 3,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-15T16:30:00.000Z",
  "workCardId": "WC09-REPAIR02"
}
-->

# Repair Work Card: WC09-REPAIR02 — Locked Process Contract and Evidence Precedence Correction

Status: ready_for_implementer
Phase: phase-03
Parent Work Card: WC09
Prior repair: WC09-REPAIR01
Risk level: critical
Recommended model: GPT-5.6 Sol High
Recommended reasoning: High

## Purpose

Make the actual executable workflow conform to the approved process while preserving WC09 artifact authority and WC09-REPAIR01 candidate-loop mechanics.

## Final-repair rule

WC09-REPAIR02 is the final numbered repair under WC09. Do not create WC09-REPAIR03.

If a checkpoint cannot pass, stop, preserve evidence, create a blocked Implementer Report, and return WC09 for Operator-approved stabilization planning. Do not substitute another target, infer authority, broaden scope, or continue around a blocker.

## Locked top-level process

Project Intake -> Project Interview -> Reconciliation Review -> Project Mapping -> Operator Project Approval -> Phase Mapping -> Operator Phase Approval -> Work Card Loop -> Phase Closeout -> Operator Phase Closeout Approval -> Roadmap Update -> Next Phase Activation -> Repeat Phase Mapping / Work Card Loop.

Capture -> Frame -> Plan -> Build -> Prove is presentation grouping only.

## Checkpoints

### 0. Repository and authority audit

Verify repository, branch, lineage, exact Architect artifacts, and canonical pair synchronization. Stop on mismatch.

### 1. Process contract

Create a typed machine-readable contract defining top-level and subordinate actions, owner, required and conditional sources, output, and routes. Derive or validate the executable catalog from it. Do not change production state until independent conformance tests pass.

### 2. Evidence precedence

Implement isolated tests proving: earlier pass -> later blocked/fail -> Architect repair disposition -> active repair -> repair pass. Later controlling evidence must reopen the candidate; historical or superseded evidence cannot resolve it.

### 3. Runtime correction

- Make Project Planning and Roadmap subordinate Project Mapping outputs.
- Remove the separate primary Implementer handoff/execution-packet gate.
- Route approved Work Card directly to Implementer execution and exact Implementer Report.
- Make Phase Interview conditionally required.
- Add governed, human-owned carried-forward, deferred, and cancelled routes.

### 4. Production migration

Only after checkpoints 1–3 pass, register Architect artifacts, run migration inventory/dry-run/apply/verify/idempotence, and derive production state. Production must target WC09-REPAIR02 implementation or its exact report review. Stop if authority differs or is ambiguous.

### 5. Full validation

Run approved validation lanes, repository gates, mounted renderer coverage, safety scans, final diff review, create the canonical Implementer Report pair, commit, and push.

## Acceptance criteria

- Actual top-level action catalog exactly matches the locked process.
- Project Planning, Project Roadmap, Phase Intake, Phase Interview, Phase Planning, Work Card Plan Review, and Implementer Handoff are not unauthorized top-level gates.
- Project Mapping owns its subordinate outputs.
- Operator Work Card Approval routes directly to Implementer execution.
- Implementer Execution Packet remains optional context only.
- Phase Interview is required only when Phase Mapping explicitly marks it required.
- Candidate resolution applies controlling evidence precedence and reopening.
- WC08 is not falsely resolved from stale favorable evidence.
- Carried-forward, deferred, and cancelled have governed human-owned canonical routes.
- Independent tests inspect the real contract and executable catalog.
- WC09 and WC09-REPAIR01 successful infrastructure remains intact.
- No alternate target substitution occurs.
- No WC09-REPAIR03 is created.
- Operator validation is not performed.

## Required report

Create synchronized canonical files:

planning/phases/phase-03/Implementer_Reports/IMPLEMENTER_REPORT_WC09-REPAIR02_locked_process_contract_and_evidence_precedence_correction.md

planning/phases/phase-03/Implementer_Reports/IMPLEMENTER_REPORT_WC09-REPAIR02_locked_process_contract_and_evidence_precedence_correction.json

The report must give checkpoint-by-checkpoint evidence, exact process contract, evidence precedence, production state, validation results, commit, push, and confirmation that no alternate target or WC09-REPAIR03 was created.

## Git

Base: feature/phase-03-wc09-repair01-lifecycle-alignment
Target: feature/phase-03-wc09-repair02-process-contract-evidence-precedence
Commit: Enforce locked process and evidence precedence

Do not merge to dev. Do not push to master. Do not perform Operator validation.
