# SCL01B Implementer Report

## Identity and scope

- Approved repository root: verified as the primary `ChampCity_AI` repository root without recording a workstation path.
- Card: Work Card `SCL01B`, Relationship Registry and Domain Invariants.
- Predecessor: SCL01A checkpoint `19f3c950c68c47c7b1d2a4342874b4ef1b23221a`.
- Branch and remote: `dev`, ahead of `origin/dev`; no push directed.

## Files

- Created: `src/shared/projectState/relationshipRegistry.ts`, `src/shared/projectState/domainInvariants.ts`, and this report.
- Modified: `src/shared/projectState/entityTypeRegistry.ts`, `test/project-state/domain-contracts.test.cjs`, `validation/capability-map.json`.
- Deleted: none.
- Intentionally not created: persistence adapter, runtime predicate registration, cross-project relationship fallback, hard-delete operation, and new test file.

## Implementation and evidence

Registered canonical directed relationship predicates, including Work Intake routing/source, checkpoint, integration and regression proof edges. Creation verifies registered predicate, endpoint existence/type, Project ownership, canonical identity/time and principal. Immutable provenance edges cannot be ended. Revision rules require stable identity, Project, type and lineage, one-version advancement, preserved creation provenance, and allowed lifecycle movement. Decisions, issued Validations, immutable attempt records and relied-upon Evidence reject content revision. Supersession retains the terminal predecessor and gives the active successor a new identity with shared lineage. Hard deletion is prohibited by a typed domain error.

Extended the existing Project State domain test with two materially distinct invariant scenarios, rather than creating another test owner. Corrected the SCL01A registry policy so Evidence can be revised before reliance but is immutable once relied upon.

## Validation

| Command | Lane | Result |
| --- | --- | --- |
| `node scripts/validation/cli.cjs preview --profile work-item --changes tmp/scl01b-changes.json` | Restricted Windows, planner preview | Passed; nine selected test files and one build. |
| `npm run test:affected -- --changes tmp/scl01b-changes.json` | Normal Windows, work-item | First run failed TypeScript build: the base domain error code property had a literal type incompatible with specialized error codes. Corrected the type and tightened lineage direction checks. Final run passed; receipt `b049895b-0cce-4770-8e7d-688ce0030533`, build and nine selected test files passed, zero failure evidence. |
| `git diff --check` | Read-only source check | Passed. |

The normal Windows lane was used directly because this sandbox previously returned `spawn EPERM`. No launch smoke, external integration, packaging, or full-suite run was in this card's scope.

## Git and safety

The Operator directed one checkpoint commit for this card. Its hash is pending at report creation and will be reported after commit. The exact six-file staged diff was inspected; `git diff --cached --check` passed. The staged added-line scan found zero secret and concrete local-path hits, and the staged path scan found zero generated-artifact hits. No push, merge, rebase, reset, clean, restore, or stash was performed.

## Remaining validation and next task

No Operator experiential judgment is required for this domain rule card. SCL01C will define the asynchronous store port and in-memory conformance adapter.
