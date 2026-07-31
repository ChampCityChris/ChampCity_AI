<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "architect-report",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC29-REPAIR01",
    "repairId": "WC29-REPAIR01"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC29-REPAIR01_cross_repository_contract_alignment_and_phase_map_live_completion.md",
      "revision": 2
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC29-REPAIR01_phase_map_contract_alignment_and_live_output_detection.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Architect Review - WC29-REPAIR01 Phase Map Contract Alignment and Live Output Detection",
    "disposition": "DeterministicAccepted",
    "operatorValidationPending": true,
    "additionalRepairRequired": false,
    "liveValidationStart": "existing Approved Revisionary Architect Interview"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Deterministic implementation is accepted. Live Revisionary validation remains pending after the Project Planning v2 MCP contract is implemented and promoted.",
    "reviewedAt": "2026-07-30"
  }
}
CHAMPCITY-METADATA -->

# Architect Review — WC29-REPAIR01 Phase Map Contract Alignment and Live Output Detection

## Disposition

`DeterministicAccepted` — Operator running-product validation pending.

No additional ChampCity A/I repair is required from this review.

Revisionary remains intentionally reset to its existing Approved Project Architect Interview. The deleted Project Profile, Project Roadmap, Project Planning handoff, Phase Map handoff, and Phase Map were not migrated, recreated, inspected, or used as compatibility evidence.

## Accepted Implementation

### Phase Map contract

The generated Phase Map handoff now contains exactly the five fields accepted by the current ChampCity_GPT Phase Map contract:

```text
handoffKind
contractId
phaseMapTarget
requiredTitle
requiredDomainBlocks
```

The values align exactly with the current MCP validator:

```json
{
  "handoffKind": "phase-map",
  "contractId": "phase-map-output-submission-v1",
  "phaseMapTarget": "planning/project/Phase_Map/PHASE_MAP_<project-slug>.md",
  "requiredTitle": "Phase Map",
  "requiredDomainBlocks": ["champcity-phase-map"]
}
```

The former alternate authority fields are absent.

### Phase Map domain authority

ChampCity A/I now defines one root schema:

```json
{
  "phases": [
    {
      "phaseId": "phase-01",
      "title": "Foundation",
      "order": 1,
      "purpose": "Establish the project foundation.",
      "dependsOn": [],
      "sourceReferences": []
    }
  ]
}
```

The prompt no longer describes or accepts a top-level phase array. The application validates the required fields, unique IDs and orders, dependency resolution, self-dependency and cycle prohibition, repository-relative source references, and absence of persisted completion state.

### Canonical Phase Map consumer

The application now requires:

```text
metadata.workflowData.phases
```

Missing canonical phase metadata returns the existing malformed projection. The body-only parser and metadata reconstruction fallback were removed. The fenced domain block remains review evidence only.

### Handoff idempotency

The existing and expected handoff metadata are compared through the same revision-excluding projection. Repeated unchanged preparation is byte-idempotent and revision-stable. A genuine Profile or Roadmap revision creates one new handoff revision.

### Open-workspace output detection

The Phase Map workspace now uses the established three-second bounded polling pattern. It includes:

- non-overlapping quiet polling;
- monotonically ordered requests;
- stale completion rejection;
- evidence fingerprint comparison;
- automatic selection and loading of a newly written Phase Map output;
- resolver and current-workflow refresh;
- visible polling errors;
- polling cancellation when leaving the workspace.

The running Electron behavior remains an Operator validation item.

### Project Planning v2 generation

ChampCity A/I now generates only:

```text
project-planning-output-submission-v2
```

with the ordered Roadmap sections:

```text
Baseline Summary
Work-State Classification
MVP Scope
Sequenced Roadmap
Post-MVP Roadmap
Deferred and Conditional Work
Dependencies and Constraints
```

No Project Planning v1 generation, alias, translation, or fallback remains in active ChampCity A/I source.

The current ChampCity_GPT source still uses the Project Planning v1 contract. That is the authorized scope of `WC-V1-0202E`; it is not a defect in this completed A/I repair. The clean Revisionary flow must not be run until the v2 MCP implementation is approved and promoted.

## Independent Validation

```text
npm run typecheck: passed
npm run build: passed
npm test: 143/143 passed
HEAD before/after: a94e0720afb110ed7a0fc748b14cc9799d923099
```

The Phase Map handoff field set was also compared directly with the current ChampCity_GPT `phase-map` validator. The key set and required values match without translation.

## Operator Validation Sequence

After `WC-V1-0202E` is approved and the updated MCP runtime is promoted:

```text
Start from the existing Approved Revisionary Architect Interview
→ prepare a fresh Project Planning handoff
→ submit a fresh Project Profile and full-lifecycle Project Roadmap
→ review and approve the Project Planning bundle
→ prepare a fresh Phase Map handoff
→ submit the Phase Map through submit_handoff_outputs
→ confirm the open Phase Map workspace automatically detects and selects it
→ apply the Phase Map disposition
→ confirm approval advances to the first incomplete mapped phase
```

No Git operation was performed by this review.
