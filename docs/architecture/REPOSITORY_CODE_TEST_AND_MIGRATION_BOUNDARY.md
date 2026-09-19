# Repository Code, Test, and Migration Boundary

Status: current repository source

## Purpose

This document separates product runtime source from tests, temporary workflow records, generated output, and preserved development history.

## Source Precedence

For implementation work, first identify which architecture generation/scope the active Work Item is changing. Then use this order:

1. the active approved Work Card and any explicit handoff;
2. applicable adopted architecture/governance for that generation and scope under `docs/`;
3. other applicable current product/development documentation under `docs/`;
4. current production source under `src/` as implementation evidence;
5. current capability-oriented tests and curated fixtures under `test/` as behavior/evidence constraints.

A V2 target architecture document is not proof that V2 behavior is already implemented. Conversely, a frozen V1 implementation detail or characterization test does not overrule an explicit adopted V2 architecture change. Characterization tests must distinguish behavior intentionally preserved from V1 from behavior deliberately replaced in V2.

When present locally, ignored material under `archive/` is historical evidence only. It is not part of the published source baseline and is not current runtime, schema, migration, test-fixture, or implementation source.

## Production Source Boundary

Production behavior belongs under:

```text
src/main/
src/preload/
src/renderer/
src/shared/
```

User-facing capabilities must use the intended vertical path: a main-process service, constrained IPC handler, typed preload exposure, renderer action, and repository result where persistence applies.

Production code must not import from `test/`, source-repository transition `planning/`, local `archive/`, generated `dist/` output, temporary fixtures, or abandoned scripts. Renderer code must not receive unrestricted filesystem access. Repository selection and filesystem writes remain main-process responsibilities exposed through constrained preload methods.

## Selected Project Workspaces

ChampCity A/I Desktop operates on user-selected repositories. Supported workflow directories such as `planning/` and `issues/` belong to those selected projects and are not inferred from this source repository or its local ignored development history.

Current governed workflow documents use one canonical Markdown file with application-owned metadata. Production must not recreate obsolete formats or treat archived records as compatibility source. An unrecognized or incomplete current record must fail visibly when a mandatory field is required.

Durable records use repository-relative paths or `<PROJECT_REPO>` in committed documentation. Credentials, cookies, access tokens, API keys, `.env` contents, and concrete local-machine paths must not be persisted.

## Test Boundary

Tests remain under `test/` and are not packaged runtime code. Permanent suites should be capability-oriented and exercise the real product path where practical. Direct service and source-structure tests are supporting evidence, not substitutes for IPC/preload/renderer coverage of a user-facing workflow.

Use curated or synthetic workspaces under `test/fixtures/` or temporary test roots. Do not use locally archived ChampCity planning, Issue, or Repair history as a live workflow fixture, and do not change production behavior merely to keep historical fixtures passing.

One-time repository searches and inventories are Architect audit evidence. Disposition and retire them when the audit is complete. Permanent regression tests guard durable behavior, contracts, integrity, security and resource boundaries, process behavior, or true structural dependency rules. Raw source text is not a substitute for semantic behavioral proof. AST or module analysis is appropriate when structure itself is the durable invariant.

## Migration Boundary

A migration is in scope only when an active Work Card names a supported source format and target format. It must be bounded, deterministic, repository-contained, recoverable, and tested against curated fixtures. Do not add compatibility code for records preserved only in local historical archive material.

## Assets, Scripts, and Generated Output

Production branding sources live under `assets/branding/`. Repeatable build and release helpers live under `scripts/`; installer source lives under `packaging/`. Scripts support the product but do not define runtime workflow source.

`node_modules/`, `dist/`, `build/`, `out/`, `release/`, and `coverage/` are generated or dependency state. They remain ignored and outside the source baseline.

## Stop Conditions

Stop and report a blocker when work would require restoring archived behavior, importing runtime behavior from tests or planning records, adding an unapproved migration or dependency, broadening renderer filesystem access, fabricating integration evidence, or performing a Git mutation forbidden by the active Work Card.
