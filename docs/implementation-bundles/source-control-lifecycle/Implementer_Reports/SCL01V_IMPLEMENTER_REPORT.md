# SCL01V Implementer Report

## Identity and scope

- Approved repository root: verified as the primary `ChampCity_AI` repository root without recording a workstation path.
- Card: Work Card `SCL01V`, Implement Equivalence and Shadow-Read Verification.
- Predecessor: SCL01U checkpoint `e9c20b6bbf12c26f48486df319e787bb042121fd`.
- Branch and remote: `dev`, ahead of `origin/dev`; no push directed.

## Files

- Created: `src/main/migrations/legacyEquivalenceVerification.ts`, `test/migration/legacy-equivalence-verification.test.cjs`, and this report.
- Modified: `src/main/migrations/stagedLegacyImporter.ts`, `validation/capability-map.json`.
- Deleted: none.
- Intentionally not created: an authority cutover, a dual writer, a mutation by shadow read, or an inference of missing legacy Validation facts.

## Implementation and evidence

Verification re-inventories the selected workspace and refuses stale or altered source before opening the staged candidate. It binds its result to the snapshot digest and identifier, importer version, and actual SQLite schema version. It checks the candidate path and read-only schema version, then renders Structured Project State projections for imported Work Intakes, Work Items, Repairs, Fixes, and Validations. Projection digests normalize the generated timestamp. The comparison uses the source snapshot's exact metadata and the staged records/relationships for Project identity, active Intakes, route and workflow stage, dispositions, work and phase stage, historical Evidence fidelity, source lineage, dependency and Phase edges, open Repair parentage, Validation state, and source bindings.

Every mismatch has a code, severity, path, expected value, and actual value. Projection formatting differs from original human-authored Markdown and is explicitly nonblocking. Source staleness, semantic changes, missing proof, and invalid bindings block cutover eligibility. Optional shadow-read mode runs the same comparison without invoking a Project State mutation; the fixture confirms the staged SQLite file remains byte-identical.

The importer was corrected within this card to transcribe explicit document dispositions into Decisions, Work Intake route history into RouteAssessments and Decisions, source bindings into SourceBinding records, and approved/closed work stage from explicit document status and close records. Importer and schema versions now accompany its staged receipt. Missing legacy Validation performer/method facts remain a blocking equivalence finding rather than a guessed typed Validation. A synthetic routed workflow with an approved Work Card, explicit Validation and source binding has zero blocking mismatches. Separate fixtures prove semantic mismatch and stale source block eligibility.

## Validation

| Command | Lane | Result |
| --- | --- | --- |
| `npm run build` | Normal Windows, static/build | Passed after verifier and importer corrections; final profiles rebuilt final source. |
| `node --test test/migration/legacy-equivalence-verification.test.cjs test/migration/staged-legacy-importer.test.cjs` | Normal Windows, focused migration fixtures | Passed 4/4. |
| `node --test test/validation/capability-map.test.cjs` | Normal Windows, catalog | Passed 5/5. |
| `npm run test:migration` | Normal Windows, migration | Final receipt `d9c7a6d0-e001-449e-8f80-628a2a59d418` passed 9/9 in four selected migration files. |
| `npm run test:affected -- --changes tmp/scl01v-changes.json` | Normal Windows, work-item | Final receipt `0ca4f08b-118b-41fe-a52a-41f498e96e82` passed 110/110 in 21 selected files with stable source and zero failures. |
| `git diff --check` | Read-only source check | Passed. |

The work-item profile supplied final static/build, fast, affected and applicable integration evidence. No real user workspace was migrated or cut over, and no external integration or release result is claimed. No required check was skipped.

## Git and safety

The Operator directed one checkpoint commit for this card. Its hash is pending at report creation and will be reported after commit. The exact staged diff was inspected. `git diff --cached --check` passed; the added-line secret and concrete local-path scan and generated-artifact path scan found zero hits. No push, merge, rebase, reset, clean, restore, or stash was performed.

## Remaining validation and next task

Legacy documents lacking explicit Validation facts remain historical Evidence and cause a blocking equivalence result. Their semantic interpretation requires source evidence or an Operator decision before cutover; this verifier does not claim eligibility for an unexamined workspace. No Operator experiential judgment is required for these deterministic fixtures. Continue to SCL01W after this checkpoint.
