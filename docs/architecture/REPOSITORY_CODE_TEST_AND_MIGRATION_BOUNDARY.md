# Repository Code, Test, and Migration Boundary

Status: current clean-room authority
Project: ChampCity A/I
Applies to: Phase 07 and later

## Purpose

This document defines which repository content may influence production behavior, tests, migrations, and implementation decisions after the Phase 07 clean-room reset.

The active application must be built from the current source and current approved planning corpus. Deleted pre–Phase 07 planning records, superseded project records, abandoned scripts, and rejected governance systems are not compatibility targets.

## Authority Order

For current implementation work, use this order:

1. the active approved Work Card and its explicit handoff;
2. current Phase 08 design documents and control records;
3. this repository boundary and `docs/dev/VALIDATION_COMMAND_LANES.md`;
4. current production source under `src/`;
5. current capability-oriented tests and curated fixtures.

Repository history is preservation evidence only. It is not runtime input, schema authority, or permission to restore deleted architecture.

The final legacy section of `AGENTS.md` that references deleted execution-pass and independent-verification protocol files is superseded for the Phase 07/08 clean-room build. Those deleted protocol files are not required and must not be restored unless a future Operator-approved Work Card expressly reintroduces them.

## Production Source Boundary

Production behavior belongs under:

```text
src/main/
src/preload/
src/renderer/
src/shared/
```

A feature is not implemented merely because a service module exists. Product implementation requires the approved vertical path:

```text
main-process service
→ constrained IPC handler
→ typed preload method
→ renderer-visible workspace action
→ durable repository result
```

Direct imports from tests do not establish production reachability.

Production code must not import from:

- `test/`;
- temporary fixture directories;
- planning Work Cards or Implementer Reports;
- deleted or abandoned scripts;
- repository history;
- build outputs under `dist/`;
- legacy migration directories.

## Active Planning Corpus Boundary

The active planning corpus is intentionally limited to the clean-room and current Phase 08 authority.

Do not restore or support deleted:

- phase-01 through phase-06 records;
- legacy approval artifacts;
- workflow-state indexes;
- execution-run records;
- role gates or route-token models;
- hash-based artifact authority;
- obsolete project-state, reconciliation, backlog, or router models;
- superseded project/system planning documents.

The application may read the selected project workspace’s current `planning/` directory. It must not treat the ChampCity_AI development repository’s historical planning population as the default product project or as a schema catalog.

Unrecognized context records must not become lifecycle gates by default. Gating behavior requires an explicit current artifact type and participation role.

## Test Boundary

Tests remain in the source repository but are not packaged runtime authority.

Use capability-oriented suites under `test/`. Work Card identifiers may appear in reports and evidence, but permanent tests should describe the capability being protected rather than recreate one test island per Work Card.

Product-path acceptance requires coverage of the actual path used by the application, including where applicable:

- main IPC registration and invocation;
- preload exposure and restriction;
- renderer-visible actions and state;
- repository containment;
- coordinated multi-document writes;
- resolver and workspace ownership;
- launch behavior.

Direct service tests are supporting evidence only. They cannot be the sole proof for a user-facing workflow.

Use a curated clean-room fixture under a dedicated test fixture location, such as:

```text
test/fixtures/clean-room-project/
```

Do not use the repository’s live development `planning/` corpus as the primary workflow fixture. Tests must not force production code to accommodate deleted historical formats.

Mocks may prove local failure handling. They may not prove a real embedded browser, authentication, external handoff, MCP discovery, or MCP write-back.

## Migration Boundary

A migration is authorized only when the active Work Card identifies a current supported source format and a current target format.

A valid migration must be:

- bounded to named artifacts or schema versions;
- deterministic;
- repository-contained;
- rollback-safe or recoverable;
- tested against curated fixtures;
- removable after its supported upgrade boundary expires, when appropriate.

Do not create migration or compatibility code for deleted pre–Phase 07 artifacts. Do not inspect Git history to infer legacy fields at runtime. Missing current mandatory fields must produce a visible local error rather than trigger a hidden compatibility reader.

## Artifact and Transaction Boundary

Markdown and JSON siblings represent one logical document revision. Authoritative writes must preserve pair synchronization.

Multi-document decisions, source revisions, handoff regeneration, and downstream invalidation must use one canonical staged transaction boundary. Separate successful writes must not leave partially updated workflow authority.

Application-generated placeholder shells are not substitutes for Architect-authored documents where the approved workflow requires Architect output.

## Repository and Filesystem Safety

- Renderer code receives no unrestricted filesystem access.
- Repository selection and writes are owned by the main process and exposed through constrained preload methods.
- A renderer-supplied arbitrary path is not write authority.
- Durable records use repository-relative paths or `<PROJECT_REPO>`.
- Do not persist credentials, cookies, access tokens, API keys, `.env` contents, or concrete local machine paths.
- Do not write outside the selected repository.

## Scripts and Tooling

Scripts are implementation support, not product authority. A deleted historical script must not be restored merely because an old package entry or document refers to it.

At the time of this clean-room boundary restoration, `package.json` still contains stale references to deleted files under `scripts/`. The active repair Work Card may remove those stale entries or create a new minimal current helper only when genuinely required. Do not restore the deleted legacy scripts from repository history as a shortcut.

## Stop Conditions

Stop and report a blocker when implementation would require:

- restoring deleted pre–Phase 07 compatibility;
- importing production authority from tests or planning documents;
- adding a migration without a current source/target obligation;
- broadening renderer filesystem access;
- bypassing the canonical artifact transaction boundary;
- fabricating embedded-browser, MCP, or external-service evidence;
- adding an unapproved dependency;
- changing Git state when Git mutation is not authorized.

## Review Standard

Architect and Implementer review must trace each acceptance criterion through the actual running product path. Passing service tests, typecheck, and build are necessary but do not establish that an Operator can use the feature.
