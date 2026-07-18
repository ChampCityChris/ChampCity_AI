<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-06/work_card/WC06/execution_pass_plan/revision-1",
  "artifactType": "execution_pass_plan",
  "createdAt": "2026-07-18T20:45:59.613Z",
  "jsonPath": "planning/phases/phase-06/Execution_Runs/WC06/EXECUTION_PASS_PLAN.json",
  "markdownPath": "planning/phases/phase-06/Execution_Runs/WC06/EXECUTION_PASS_PLAN.md",
  "parentArtifactId": "champcity-ai/phase-06/work_card/WC06",
  "payload": {
    "kind": "execution_pass_plan",
    "title": "Execution Pass Plan - WC06"
  },
  "payloadHash": "sha256:3fab36e12652d6d2c5ffd15f23e1a8cace21709c7c8d92d44164bd518f1ccc8c",
  "phaseId": "phase-06",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [
      "champcity-ai/phase-06/work_card/WC06/execution_run/revision-1"
    ],
    "expectedOutputs": [
      "champcity-ai/phase-06/work_card/WC06/execution_run/revision-1"
    ],
    "sources": [
      "champcity-ai/phase-06/work_card/WC06",
      "champcity-ai/phase-06/operator_approval/WC06",
      "champcity-ai/phase-06/work_card/WC06/acceptance_contract/revision-1"
    ],
    "supersedes": []
  },
  "revision": 1,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-18T20:45:59.613Z",
  "workCardId": "WC06"
}
-->

# Execution Pass Plan - champcity-ai/phase-06/work_card/WC06

- Plan ID: champcity-ai/phase-06/work_card/WC06/execution_pass_plan/revision-1
- Work Card revision: 1
- Approval: champcity-ai/phase-06/operator_approval/WC06
- Acceptance Contract: champcity-ai/phase-06/work_card/WC06/acceptance_contract/revision-1
- Implementation branch: feature/phase-04-wc01-repair01-evidence-derived-workflow
- Pass token budget: 5000

## Passes

### P01 - Trusted activation compiler and authority

Compile strict structured WC06 authority into deterministic Acceptance Contract and Execution Pass Plan records, then start or open exact Execution Runs through trusted main-process authority.

- Requirements: R01-DEFINITION-SCHEMA, R02-EXACT-AUTHORITY, R03-IDEMPOTENT-START
- Global invariants: INV-ROLE-SEPARATION, INV-TRUSTED-MAIN-AUTHORITY, INV-HUMAN-OPERATOR-AUTHORITY
- Prerequisites: none
- Allowed paths: src/shared/executionRuns, src/main/executionRuns, src/main/artifacts, src/main/canonicalRuntime.ts, test/wc06
- Required tests: focused WC06 schema/compiler/authority tests; WC05 execution-run regression tests; Registry load and synchronization verification
- Expected outputs: strict execution-definition schema and compiler; trusted eligible-list operation; trusted start/open operation; canonical Acceptance Contract, Execution Pass Plan, and Execution Run pairs

### P02 - Execution Runs supporting workspace

Expose a Supporting Tools Execution Runs workspace with eligible Work Cards, Start/Open actions, status, blockers, and bounded packet preview while preserving read-only deferred transport boundaries.

- Requirements: R04-SUPPORTING-WORKSPACE, R05-PLAIN-STATES, R06-READ-ONLY-BOUNDARY
- Global invariants: INV-ROLE-SEPARATION, INV-TRUSTED-MAIN-AUTHORITY, INV-HUMAN-OPERATOR-AUTHORITY
- Prerequisites: P01
- Allowed paths: src/main/main.ts, src/preload/index.ts, src/renderer, src/shared/executionRuns, test/wc06
- Required tests: focused WC06 renderer/preload IPC tests; mounted Execution Runs visibility validation
- Expected outputs: Supporting Tools Execution Runs workspace; eligible approved Work Card listing; Start/Open controls; status and bounded packet preview; plain empty and blocked states

### P03 - Test-fixture isolation and end-to-end proof

Isolate mounted Electron tests from normal project persistence, purge repository-internal tmp fixture projects, preserve external projects, and prove restart persistence for the Execution Runs workflow.

- Requirements: R07-TEST-ISOLATION, R08-CONTAMINATION-REPAIR, R09-END-TO-END-PROOF, R10-PRESERVE-ROUTING
- Global invariants: INV-ROLE-SEPARATION, INV-TRUSTED-MAIN-AUTHORITY, INV-HUMAN-OPERATOR-AUTHORITY
- Prerequisites: P01, P02
- Allowed paths: src/main/projects, src/main/canonicalRuntime.ts, src/main/main.ts, scripts, test/wc06, package.json
- Required tests: mounted test-isolation validation; normal application activation and restart validation; existing workflow routing regressions
- Expected outputs: isolated mounted Electron persistence; normal registry contamination repair; visible workflow and restart persistence evidence
