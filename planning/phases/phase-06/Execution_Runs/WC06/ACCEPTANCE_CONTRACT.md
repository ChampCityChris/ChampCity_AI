<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-06/work_card/WC06/acceptance_contract/revision-1",
  "artifactType": "acceptance_contract",
  "createdAt": "2026-07-18T20:45:59.613Z",
  "jsonPath": "planning/phases/phase-06/Execution_Runs/WC06/ACCEPTANCE_CONTRACT.json",
  "markdownPath": "planning/phases/phase-06/Execution_Runs/WC06/ACCEPTANCE_CONTRACT.md",
  "parentArtifactId": "champcity-ai/phase-06/work_card/WC06",
  "payload": {
    "kind": "acceptance_contract",
    "title": "Acceptance Contract - WC06"
  },
  "payloadHash": "sha256:40f92b8dc4c6d7c26878e8d002b8f128abbaa70b39e384d21274c95697145aee",
  "phaseId": "phase-06",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [
      "champcity-ai/phase-06/work_card/WC06/execution_pass_plan/revision-1"
    ],
    "expectedOutputs": [
      "champcity-ai/phase-06/work_card/WC06/execution_pass_plan/revision-1"
    ],
    "sources": [
      "champcity-ai/phase-06/work_card/WC06"
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

# Acceptance Contract - champcity-ai/phase-06/work_card/WC06

- Contract ID: champcity-ai/phase-06/work_card/WC06/acceptance_contract/revision-1
- Work Card revision: 1

## Global Invariants

- INV-ROLE-SEPARATION: Architect defines authority; Implementer changes production code; verifier and Operator decisions remain separate.
- INV-TRUSTED-MAIN-AUTHORITY: Renderer intent cannot supply canonical Contract, Plan, lifecycle event, result, or decision data.
- INV-HUMAN-OPERATOR-AUTHORITY: No agent or UI grants final human Operator acceptance.

## Requirements

### R01-DEFINITION-SCHEMA - required_behavior

Strict structured definitions compile deterministically. Unknown or missing fields block. Parsing Markdown, titles, or filenames is prohibited.

- Authorized passes: P01
- Noncompliant substitutions: Markdown parsing; title parsing; filename parsing; directory-order inference; legacy field fallback
- Required behavioral tests: Valid definitions compile deterministically.; Unknown definition fields block.; Missing definition fields block.

### R02-EXACT-AUTHORITY - required_behavior

Activation resolves exact synchronized Work Card, revision, approval, dependency, project, and phase authority. Artifact existence alone is insufficient.

- Authorized passes: P01
- Noncompliant substitutions: Loose file lookup; unregistered pair authority; wrong-revision approval; wrong-project or wrong-phase activation
- Required behavioral tests: Wrong Work Card blocks.; Wrong revision blocks.; Wrong approval blocks.; Wrong project or phase blocks.; Unsatisfied dependency blocks.

### R03-IDEMPOTENT-START - required_behavior

Starting the exact same run twice returns the existing run without semantic mutation. A conflicting existing run blocks.

- Authorized passes: P01
- Noncompliant substitutions: Overwrite existing run; create duplicate run; mutate exact existing run on repeat start
- Required behavioral tests: Exact repeat start is idempotent.; Conflicting existing run blocks.

### R04-SUPPORTING-WORKSPACE - required_behavior

Supporting Tools provides an Execution Runs workspace with eligible Work Cards, Start/Open actions, status, and bounded packet preview.

- Authorized passes: P02
- Noncompliant substitutions: Developer-only route; current-action-only hidden panel; manual packet copy as the primary workflow
- Required behavioral tests: UI lists eligible Work Cards.; UI exposes Start Execution Run and Open Execution Run.; UI previews bounded next packet.

### R05-PLAIN-STATES - required_behavior

Empty and blocked states explain the missing exact authority in plain language.

- Authorized passes: P02
- Noncompliant substitutions: Raw exception-only UI; silent disabled controls
- Required behavioral tests: Empty state explains no eligible cards.; Blocked state identifies missing exact authority.

### R06-READ-ONLY-BOUNDARY - prohibition

No queue, process, raw-event, completion, verifier-decision, or Operator-acceptance controls may exist, including dormant or feature-flagged versions.

- Authorized passes: P02
- Noncompliant substitutions: Dormant queue control; feature-flagged completion control; renderer lifecycle event mutation
- Required behavioral tests: UI and preload do not expose queue, process, completion, verifier-decision, or acceptance controls.

### R07-TEST-ISOLATION - required_behavior

Mounted Electron tests use isolated project-workspace persistence and clean up their fixture projects.

- Authorized passes: P03
- Noncompliant substitutions: Normal userData reuse in mounted tests; fixture roots left selected after test run
- Required behavioral tests: Mounted tests use isolated persistence.; Mounted tests clean fixture projects in finally or cleanup paths.

### R08-CONTAMINATION-REPAIR - required_behavior

Normal startup removes project roots contained under the host ChampCity_AI repository's tmp directory while preserving external user projects. Do not use a hard-coded fixture-name blacklist.

- Authorized passes: P03
- Noncompliant substitutions: Hard-coded fixture-name blacklist; purging external user projects; leaving repo tmp roots selectable
- Required behavioral tests: Internal repository tmp roots are purged from normal registry.; External user projects are preserved.; Real ChampCity_AI is selected after repair.

### R09-END-TO-END-PROOF - required_evidence

The normal application demonstrates Start Execution Run, persistent status, and bounded packet preview without transport controls.

- Authorized passes: P03
- Noncompliant substitutions: Unit-only proof; transport controls hidden by CSS only
- Required behavioral tests: Mounted visible workflow starts WC06 run.; Restart reopens same run.; No transport or acceptance controls are present.

### R10-PRESERVE-ROUTING - required_behavior

Existing workflow routing and current-action semantics must remain unchanged.

- Authorized passes: P03
- Noncompliant substitutions: Broad workflow reroute; bypassing current-action obligations
- Required behavioral tests: Existing WC04, WC05, and WC09 regression coverage remains present and passing.

## Document Disposition
Document.Status=Pending
