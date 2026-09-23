# SCL01O Implementer Report

## Identity and scope

- Approved repository root: verified as the primary `ChampCity_AI` repository root without recording a workstation path.
- Card: Work Card `SCL01O`, Implement Regression Obligation and Tester State.
- Predecessor: SCL01N checkpoint `a154239f8ca49530fa06f934265cd4cf1b06362a`.
- Branch and remote: `dev`, ahead of `origin/dev`; no push directed.

## Files

- Created: `test/project-state/tester-state-mapping.test.cjs` and this report.
- Modified: `src/shared/projectState/domainContracts.ts`, `src/shared/projectState/entityTypeRegistry.ts`, `src/shared/projectState/projectStateService.ts`, `test/project-state/domain-contracts.test.cjs`, `validation/capability-map.json`.
- Deleted: none.
- Intentionally not created: executable tests as Project State records, copied ValidationCatalog contents, transient test files, or a second test runner.

## Implementation and evidence

RegressionObligation now records the owning capability, invariant statement, risk category, optional source Work Item, and active/quarantined/retired state. Typed creation and state changes preserve revisions; retirement closes the record. Supersession preserves lineage and the source Work Item relationship. A typed TestLifecycleAssessment command records an immutable Validation with the adopted assessment status, exact target version, and an `evaluates` relationship. Its conformance outcome remains inconclusive so an assessment does not become criterion proof.

Typed ImplementationProof records immutable Evidence with an external payload reference and exact source baseline, linked to its Work Item and ImplementationRecord when present. A typed PermanentTestReference records only the ValidationCatalog identity and repository-relative test locator as a ProjectResource. Its immutable `proves` edges can link one reference to multiple obligations, including a successor obligation. The obligation view exposes assessments, implementation proof, permanent references, and relationships after transient executable files are gone. Reserved types and relationships require typed commands; Project State does not read or store executable source.

Six cross-adapter tests cover obligation lifecycle and assessment, immutable implementation proof and source baseline, one permanent reference proving multiple obligations, invalid locator/duplicate rejection, and supersession history.

## Validation

| Command | Lane | Result |
| --- | --- | --- |
| `npm run build` | Normal Windows, static/build | Passed. |
| `node --test test/project-state/tester-state-mapping.test.cjs test/project-state/domain-contracts.test.cjs test/project-state/evidence-validation-freshness.test.cjs` | Normal Windows, focused capability | Final run passed 17/17. Initial run passed 15/17; the lineage assertion expected two records, while the versioned lineage correctly returned four. |
| `node --test test/validation/capability-map.test.cjs` | Normal Windows, catalog | Passed 5/5. |
| `npm run test:affected -- --changes tmp/scl01o-changes.json` | Normal Windows, work-item | Receipt `02f954b7-ea24-4d3f-b843-efce13375dd3` passed in 21 selected test files, zero failure evidence. |
| `git diff --check` | Read-only source check | Passed. |

The work-item profile supplied static/build, fast and affected integration evidence. No external ValidationCatalog or repository file inspection was claimed. No checks were skipped.

## Git and safety

The Operator directed one checkpoint commit for this card. Its hash is pending at report creation and will be reported after commit. The exact staged diff was inspected. `git diff --cached --check` passed; the added-line secret and concrete local-path scan and generated-artifact path scan found zero hits. No push, merge, rebase, reset, clean, restore, or stash was performed.

## Remaining validation and next task

ValidationCatalog remains the authority for executable test metadata; Project State retains semantic references and history. No Operator experiential judgment is required for this card. SCL01P can continue after this checkpoint.
