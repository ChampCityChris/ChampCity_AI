# Repository Code, Test, and Migration Boundary

## Purpose

This standard defines where production behavior, automated validation, development utilities, and repository migrations belong in ChampCity A/I. It prevents test fixtures and abandoned Work Card utilities from becoming shadow production architecture.

## Authority

This standard applies to all new and modified files under `src/`, `test/`, `scripts/`, build configuration, packaging configuration, and Work Card validation plans.

When a Work Card conflicts with this standard, the conflict must be explicit in the approved Work Card. An Implementer must not silently substitute a different boundary.

## Production Application Code

Production behavior and authority belong under `src/` or another explicitly approved runtime package.

Production code includes:

- workflow and governance authority;
- canonical artifact models and persistence;
- Electron main-process and preload behavior;
- renderer behavior;
- IPC authorization;
- application services;
- supported runtime adapters;
- release-required runtime assets.

Production code must not import from:

- `test/`;
- temporary fixture directories;
- Work-Card-specific migration directories;
- abandoned scripts;
- generated test projects.

A test passing does not authorize production behavior to live in the test or migration implementation.

## Automated Tests

Tests remain in the source repository after release. They are development and regression assets, not packaged application runtime.

Tests should be organized around stable product capabilities, for example:

- governance maintenance;
- workflow routing;
- canonical artifact persistence;
- Architect Bridge;
- IPC policy;
- release packaging.

A Work Card normally updates an existing capability suite. A new permanent suite requires an explicit reason in the Work Card.

Work-Card-named tests may be used during recovery or transition work, but they are not automatically permanent architecture. Their retained value must be reassessed when the capability stabilizes.

Tests may contain:

- assertions;
- deterministic fixtures;
- mocks and fakes;
- temporary repositories;
- failure injection;
- test-only helpers.

Tests must not become an independent implementation of the production workflow catalog, canonical writer, Registry authority, resolver, or permission model.

## Scripts and Development Utilities

`scripts/` may contain:

- build helpers;
- validation launchers;
- release verification;
- supported schema migrations;
- bounded repository maintenance utilities;
- mounted Electron validation harnesses.

Scripts are not production authority unless the application or supported release process explicitly depends on them.

A script under a Work-Card-specific path such as `scripts/migration/wc09/` is presumed to be a bounded implementation or migration utility for that Work Card. It must not be expanded to mirror future production architecture unless a later approved Work Card explicitly promotes and relocates it as a supported capability.

## Supported Migrations

A supported migration exists only when a currently supported installation, repository schema, or release upgrade path requires it.

Supported migrations must be:

- versioned by schema or release boundary rather than only by Work Card ID;
- deterministic;
- idempotent where applicable;
- covered by rollback guidance;
- tested against their declared source and target versions;
- isolated from unrelated future production changes.

A historical or abandoned migration must not import the live workflow action catalog merely to keep its tests synchronized with the current application.

When a new production schema requires migration support, create a new versioned migration step. Do not silently amend an abandoned migration to produce a different historical result.

## Abandoned and Historical Utilities

A failed, abandoned, or superseded Work Card utility may be retained temporarily for diagnosis or forensic review.

It must not:

- remain a required mirror of current production behavior;
- block unrelated production changes;
- receive new feature logic merely to satisfy an obsolete test;
- be treated as a supported upgrade path without explicit authority.

An obsolete test may remain outside the default validation lane for reference. Removal from the default lane requires evidence that no supported compatibility obligation depends on it.

## Work Card Test Declaration

Every implementation Work Card must declare:

- capability suite to update;
- whether a new permanent suite is authorized;
- temporary Work-Card-specific fixtures;
- migration compatibility obligation;
- release-package impact;
- obsolete tests or utilities affected;
- whether any historical utility is intentionally promoted to a supported capability.

The Implementer must stop when these declarations are required for correctness but missing from the approved Work Card.

## Permanent Test Organization And Integrity

Permanent tests live under `test/<stable-capability>/`.

Permanent test paths and filenames do not use Work Card or repair IDs. Work-Card-specific temporary tests are not part of the default lane and must be removed or promoted before Work Card acceptance. Promoted tests are rewritten under a stable capability identity rather than renamed without review.

Assertion-bearing automated tests live under `test/`, not `scripts/`. Scripts may launch tools but may not contain reusable acceptance logic.

Tests exercise production modules and may not reproduce production authority.

The default unit lane uses automatic discovery and may not whitelist selected files.

A wrapper must propagate child-process failure codes.

Deletion of an invalid test does not authorize claiming its former coverage.

## Release Packaging Boundary

The source repository and the released desktop package are different products of the build.

The source repository retains tests, fixtures, planning records, and development utilities needed for continued maintenance.

The packaged desktop application must contain only compiled production code and explicitly required runtime assets.

Unless a release Work Card explicitly proves a runtime requirement, the package must exclude:

- `test/`;
- `tmp/` and generated fixture repositories;
- coverage output;
- source planning corpora;
- development-only validation harnesses;
- abandoned Work-Card migration utilities;
- local logs and environment files;
- source archives and handoff packages.

A release is not ready until package-content validation proves these exclusions.

## Enforcement Requirements

The repository should enforce this standard through current capability tests and release checks, including:

- no imports from `src/` into `test/` or Work-Card-specific migration code;
- no production entry point under `test/`;
- no release package containing test or temporary fixture directories;
- current workflow actions validated by current workflow tests;
- historical migrations validated only against their declared migration contract;
- explicit classification of supported versus historical migrations.

## WC09 Boundary

`scripts/migration/wc09/migrate-artifacts.mjs` and `test/wc09/migration.test.cjs` are Work-Card-specific assets.

They must not be updated solely because a new production workflow action is added. Any continued use must be justified by a current supported migration obligation. Otherwise they remain historical development assets and must not control the current workflow catalog or block unrelated feature implementation.
