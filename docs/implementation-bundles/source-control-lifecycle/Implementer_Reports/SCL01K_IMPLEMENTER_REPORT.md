# SCL01K Implementer Report

## Identity and scope

- Approved repository root: verified as the primary `ChampCity_AI` repository root without recording a workstation path.
- Card: Work Card `SCL01K`, Implement Evidence, Validation, and Freshness.
- Predecessor: SCL01J checkpoint `d3736eae78c4198208f62f1f0f1165a6535cca78`.
- Branch and remote: `dev`, ahead of `origin/dev`; no push directed.

## Files

- Created: `test/project-state/evidence-validation-freshness.test.cjs` and this report.
- Modified: `src/shared/projectState/domainContracts.ts`, `src/shared/projectState/entityTypeRegistry.ts`, `src/shared/projectState/projectStateService.ts`, `test/project-state/decision-disposition.test.cjs`, `test/project-state/domain-contracts.test.cjs`, `validation/capability-map.json`.
- Deleted: none.
- Intentionally not created: payload blob columns, a payload storage provider, a mutable proof status field, or an Operator disposition from Validation.

## Implementation and evidence

Validation now records exact target identity and record version, optional source baseline, and one of the supported validation modes. Its performer, time and result remain application-owned and immutable. The service rejects a stale caller-supplied target version. `getValidationFreshness` compares the issued binding with the current target version/lifecycle and supplied current source baseline; prior proof stays queryable after either changes. The `evaluates` relationship is checked as part of the binding.

Criterion now retains descriptive `verificationIntent` text and declares a separate closed `validationPolicy` class: deterministic, semantic AI, visual human, deferred Phase visual, or Operator Decision. The typed command enforces matching modes and a human performer for visual proof. `getCriterionValidationStatus` uses the latest fresh matching result; a later failure displaces an earlier pass, and stale results do not satisfy proof. Deferred visual proof becomes completion relevant at a Phase criterion. An Operator Decision criterion cannot be satisfied by a Validation alone. The preceding Decision requirement query reads the explicit policy field.

Evidence stores an application-owned identity, captured principal/time and native provenance, media type, digest, size and a reference to externally held payload bytes. Inline `data:` content and bare repository paths are rejected as payload references. Evidence is immutable after creation. The existing `supports` relationship and `getEvidence` query let a Validation UI retrieve linked Evidence by canonical ID.

Six cross-adapter tests cover version and baseline staleness, retained history, Evidence identity and immutable metadata, policy classes, latest result semantics and deferred Phase proof. Existing Decision, domain and service tests remain passing.

## Validation

| Command | Lane | Result |
| --- | --- | --- |
| `npm run build` | Normal Windows, static/build | Passed. |
| `node --test test/project-state/evidence-validation-freshness.test.cjs test/project-state/domain-contracts.test.cjs test/project-state/service-boundary.test.cjs test/project-state/revision-history-lineage.test.cjs test/project-state/decision-disposition.test.cjs` | Normal Windows, focused capability | Passed 23/23 tests. |
| `node --test test/validation/capability-map.test.cjs` | Normal Windows, catalog | Passed 5/5 tests. |
| `npm run test:affected -- --changes tmp/scl01k-changes.json` | Normal Windows, work-item | Final receipt `688b1e05-66c6-41fc-8d24-2b8a46e8e5f2` passed 98/98 tests in 17 selected files, zero failure evidence. |
| `git diff --check` | Read-only source check | Passed. |

The work-item profile supplied static/build, fast and affected integration evidence. The payload storage provider was not connected or claimed as external integration evidence.

## Git and safety

The Operator directed one checkpoint commit for this card. Its hash is pending at report creation and will be reported after commit. The exact staged diff was inspected. `git diff --cached --check` passed; the added-line secret and concrete local-path scan and generated-artifact path scan found zero hits. No push, merge, rebase, reset, clean, restore, or stash was performed.

## Remaining validation and next task

The external payload owner must produce and verify Evidence digests and resolve payload references; this card governs immutable metadata and identity. Callers evaluating an already observed target version should supply `targetRecordVersion`, and source-dependent checks should supply the current source baseline at query time. No Operator experiential judgment is required for this card. SCL01L can continue after this checkpoint.
