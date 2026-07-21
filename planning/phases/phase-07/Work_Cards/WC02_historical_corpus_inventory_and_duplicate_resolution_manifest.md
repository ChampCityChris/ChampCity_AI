# Work Card — Phase 07 WC02 Historical Corpus Inventory and Duplicate Resolution Manifest

Status: pending Operator approval through ChatGPT
Revision: 1
Phase: Phase 07
Plan order: 2
Dependency basis: the Operator rejected WC01-REPAIR03 and explicitly directed progression to WC02
Risk: high
Owner after approval: Implementer
Recommended model: GPT-5.6 Thinking, high reasoning
Implementation authorized: no — separate Operator approval required
Git mutation authorized: no

## Purpose

Create a complete, deterministic, non-destructive inventory of the ChampCity_AI planning corpus and a duplicate-resolution manifest that WC03 can execute without rediscovering or guessing corpus structure.

This Work Card inventories and analyzes. It does not migrate, merge, rename, move, delete, rewrite, register, approve, disposition, or otherwise mutate any governed planning record.

WC03 and later Work Cards remain unauthorized.

## Controlling scope

The complete inventory root is:

```text
planning/
```

Inventory every regular `.json` and `.md` file recursively under that root, including:

- `planning/project/`;
- every `planning/phases/phase-*` directory;
- `planning/archive/`;
- `planning/system/`;
- current Phase 07 bootstrap records;
- canonical artifact pairs;
- legacy pairs;
- unpaired JSON;
- unpaired Markdown;
- malformed JSON;
- malformed or incomplete canonical envelopes;
- historical, archived, superseded, pending, blocked, and active records.

Do not limit inventory to the Artifact Registry, `scanVerifiedArtifactGraph()`, currently valid canonical pairs, active records, or files discoverable through existing application routing. Those sources may be used as evidence, but none is complete enough to define WC02 scope.

### Generated-output exclusions

Exclude only these generated WC02 outputs from the inventory input set:

```text
planning/phases/phase-07/Migration_Manifests/HISTORICAL_CORPUS_INVENTORY_V1.json
planning/phases/phase-07/Migration_Manifests/HISTORICAL_CORPUS_INVENTORY_V1.md
planning/phases/phase-07/Implementer_Reports/IMPLEMENTER_REPORT_WC02_historical_corpus_inventory_and_duplicate_resolution_manifest.md
```

Record those paths in the manifest as `excludedGeneratedPaths`.

No other planning path may be excluded silently. Temporary files matching the repository’s existing temporary-name rules may be omitted, but each omitted temporary path and reason must be reported separately.

Do not follow symbolic links. Record a symbolic link found under `planning/` as an `unsupported_entry` defect with its repository-relative path.

## Required implementation architecture

Implement one supported, versioned migration-analysis capability. Do not extend the historical WC09 migration or any Work-Card-specific migration directory.

### Shared manifest contract

Create:

```text
src/shared/migrations/historicalCorpusInventoryV1.ts
src/shared/migrations/index.ts
```

`historicalCorpusInventoryV1.ts` must export the manifest schema types, constants, validators, stable sorting helpers, and defect-code unions required by this Work Card.

The schema version is exactly:

```text
champcity.historical-corpus-inventory.v1
```

### Main-process migration analyzer

Create:

```text
src/main/migrations/historicalCorpusInventoryV1Service.ts
src/main/migrations/index.ts
```

The service must export these operations or exact semantic equivalents:

```ts
collectHistoricalCorpusInventoryV1(input)
renderHistoricalCorpusInventoryMarkdownV1(manifest)
writeHistoricalCorpusInventoryOutputsV1(input)
checkHistoricalCorpusInventoryOutputsV1(input)
```

The analyzer is a supported repository migration utility for WC02 and WC03. It must not be imported by Electron `main.ts`, preload, renderer, workflow routing, governance approval, or application startup.

### Thin CLI

Create:

```text
scripts/migration/historical-corpus-v1/generate-manifest.mjs
```

The CLI must import the compiled analyzer from `dist/main/migrations/index.js`.

It must accept exactly one mode:

```text
--write
--check
```

Behavior:

- `--write` analyzes the current repository and atomically writes the fixed JSON and Markdown outputs.
- `--check` performs no write and exits nonzero unless the existing outputs exactly equal newly generated deterministic output.
- no argument, multiple modes, or an unknown argument exits nonzero with usage text;
- no arbitrary repository-root or output-path argument is accepted;
- the repository root is `process.cwd()` and must contain `package.json` with name `champcity-ai` plus a `planning/` directory;
- all exposed paths are repository-relative with `/` separators;
- no concrete local machine path may appear in output.

The CLI contains no acceptance assertions. Assertions remain under `test/`.

## Snapshot and non-destructive guarantees

The analyzer must establish a stable source snapshot before producing output.

1. Enumerate the complete input set using the scope above.
2. Read every input file as bytes.
3. Compute a raw SHA-256 for every file.
4. Build the manifest entirely from that snapshot.
5. Immediately before any output write, re-enumerate and re-hash the input set.
6. Abort without writing either output if any input path was added, removed, or changed.
7. Write JSON and Markdown through temporary sibling files followed by atomic rename.
8. If the second output cannot be committed, restore or remove the first output so the pair is not left partially updated.
9. Re-hash the input set after output commit and require it to equal the initial input snapshot.

The output files and excluded Implementer Report path are not part of the input fingerprint.

The manifest must contain:

- `sourceFingerprintBefore`;
- `sourceFingerprintAfter`;
- `sourceSnapshotStable: true`;
- sorted `inputPaths` with raw hashes;
- sorted `excludedGeneratedPaths`;
- sorted `excludedTemporaryPaths`;
- no wall-clock timestamp that changes deterministic output.

The same unchanged input corpus must produce byte-identical JSON and Markdown.

## Logical-record construction

Construct logical records deterministically.

1. Files with the same repository-relative stem and `.json`/`.md` extensions form one candidate pair.
2. An unmatched JSON file is one logical record.
3. An unmatched Markdown file is one logical record.
4. Do not combine files with different stems merely because their titles, Work Card IDs, or content appear related.
5. A duplicate group is analysis metadata. It does not collapse its member logical records.

Each logical record requires a deterministic `recordId` derived from its sorted source paths, not a random UUID.

## Required file-level inventory fields

For every input file record:

- repository-relative path;
- extension;
- byte length;
- raw SHA-256;
- line-ending-normalized text SHA-256 when the bytes are valid UTF-8;
- JSON parse status when extension is `.json`;
- Markdown envelope parse status when extension is `.md`;
- whether the path is under `planning/archive/`;
- whether the file is part of a same-stem pair;
- paired path when present;
- defect codes applying directly to that file.

Do not include absolute paths, OS usernames, machine names, or file-system timestamps.

## Required logical-record fields

For every logical record:

- deterministic `recordId`;
- sorted source paths;
- `pairStatus`;
- `schemaClass`;
- raw file hashes;
- normalized content hashes;
- canonical-pair verification result when applicable;
- observed `artifactId`;
- observed artifact type;
- observed project ID;
- observed phase ID;
- observed Work Card ID;
- observed revision;
- observed status;
- observed parent artifact ID;
- observed relationships;
- declared JSON and Markdown paths when present;
- Registry membership and Registry agreement when resolvable;
- archive-location status;
- identity evidence and identity confidence;
- conflicts among metadata sources;
- defect codes;
- migration-scope classification;
- inbound-reference count;
- duplicate-group IDs;
- unique-evidence locations;
- provenance locations.

Unknown values remain `null`. Do not invent placeholder identities such as `unknown/WC01`.

## Identity extraction precedence

Extract observed identity without discretionary interpretation.

Use this precedence and record the source of every extracted value:

1. a valid synchronized `champcity.artifact.v1` pair;
2. valid canonical JSON when the pair is incomplete or invalid;
3. canonical Markdown envelope metadata;
4. structured legacy JSON fields at the artifact root or `payload.data`;
5. deterministic path candidates;
6. deterministic filename candidates.

Path and filename candidates are evidence, not authority. When two sources disagree, retain every candidate and add `identity_conflict`; do not choose one silently.

### Path-derived candidates

The analyzer may derive only:

- phase candidate from an exact `/phases/phase-XX/` path segment;
- Work Card candidate from an exact Work Card token in the filename;
- artifact-type candidate from a fixed directory mapping exported by the shared contract.

The fixed directory mapping must cover existing repository conventions, including Project Intake, interviews, Project Planning, Roadmap, Phase Planning, Work Card Plan, Work Cards, Implementer or Builder Reports, Architect Reviews, Validation Reports, Operator Approvals, Closeout Reports, Reconciliation Reviews, Migration Manifests, supporting documents, and system records.

A path-derived type must be labeled `path_candidate`; it must not overwrite contradictory structured metadata.

Filename suffixes such as `_2`, timestamps, lexical order, directory traversal order, or first match must never determine authority or survivor selection.

## Schema and pair classifications

The manifest must distinguish at minimum:

- valid synchronized canonical pair;
- invalid canonical pair;
- incomplete canonical pair;
- valid canonical JSON with noncanonical or absent Markdown;
- canonical Markdown envelope with absent or invalid JSON;
- parseable legacy JSON/Markdown pair;
- parseable legacy JSON only;
- plain Markdown only;
- malformed JSON;
- malformed Markdown envelope;
- mixed canonical/legacy pair;
- system/index record;
- generated bootstrap control record.

The analyzer may add more specific classes but may not collapse malformed, incomplete, legacy, and canonical records into one generic class.

## Required defect codes

The shared contract must define stable codes for at least:

```text
incomplete_pair
malformed_json
malformed_markdown_envelope
invalid_canonical_artifact
invalid_canonical_pair
payload_hash_mismatch
markdown_body_mismatch
declared_path_mismatch
project_mismatch
phase_mismatch
work_card_mismatch
artifact_type_mismatch
revision_invalid
status_unrecognized
relationship_shape_invalid
registry_missing_entry
registry_stale_entry
registry_path_disagreement
registry_hash_disagreement
duplicate_artifact_id
duplicate_declared_json_path
duplicate_declared_markdown_path
exact_file_content_duplicate
exact_record_content_duplicate
semantic_duplicate_candidate
identity_conflict
inbound_reference_to_missing_record
unsupported_entry
stale_schema
```

Each defect occurrence must identify the affected record IDs and paths. Do not report only aggregate counts.

## Duplicate grouping rules

Create deterministic duplicate groups without using an LLM, title similarity, fuzzy matching, or discretionary judgment.

### Duplicate group kinds

1. `duplicate_artifact_id`
   - two or more logical records expose the same non-empty artifact ID.

2. `duplicate_declared_path`
   - two or more logical records declare the same non-empty JSON path or the same non-empty Markdown path.

3. `exact_file_content_duplicate`
   - two or more different source paths with the same extension have the same raw SHA-256.

4. `exact_record_content_duplicate`
   - two or more logical records have identical normalized structured content and normalized Markdown body content after excluding only physical location fields and Markdown envelope location fields.

5. `semantic_duplicate_candidate`
   - two or more records share the same deterministic semantic key but are not exact-record duplicates.

### Semantic key

Build a semantic key only when all required components are non-conflicting:

```text
projectId | phaseId-or-project | artifactType | workCardId-or-none | parentArtifactId-or-none
```

Do not use title text as part of the semantic key. Records lacking a reliable project ID or artifact type do not receive a semantic key and cannot be placed in a semantic duplicate group.

### Group identity

`duplicateGroupId` must be a deterministic SHA-256 of:

- group kind;
- semantic key when applicable;
- sorted member record IDs.

## Survivor proposals and safety classification

WC02 may propose; it may not decide or mutate.

Each duplicate group must contain:

- group kind;
- sorted member record IDs and paths;
- `resolutionSafety`;
- `proposedCanonicalSurvivorRecordId` or `null`;
- ordered `candidateSurvivorRecordIds`;
- survivor basis;
- unique evidence locations;
- inbound references;
- required reference updates;
- reasons preventing safe resolution.

Allowed `resolutionSafety` values:

```text
safe_exact_consolidation
ambiguous_operator_review
not_a_merge_candidate
```

A group may be `safe_exact_consolidation` only when all of the following are true:

1. members are exact-record duplicates;
2. no member contains a unique structured value or unique Markdown section;
3. no metadata conflict exists except physical path or archive location;
4. one deterministic survivor is selected by this precedence:
   - synchronized valid canonical pair over incomplete or legacy record;
   - non-archive path over archive path;
   - Registry-agreeing path over unregistered or disagreeing path;
   - if all remaining candidates are still equal, lexicographically smallest repository-relative JSON path, then Markdown path;
5. the selected survivor does not require content merging.

All other duplicate groups are `ambiguous_operator_review` unless they are informational overlap that does not represent duplicate logical records.

For an ambiguous group:

- `proposedCanonicalSurvivorRecordId` must be `null`;
- retain deterministic ordered candidates;
- list every conflict and unique evidence location;
- do not call one candidate controlling, canonical, approved, newest, or authoritative.

Existing status, revision, timestamps, suffixes, and Registry authority flags are evidence only and do not independently make a semantic duplicate safe.

## Unique evidence and provenance analysis

For every exact or semantic duplicate group, identify content that appears in one member but not every member.

### Structured content

Recursively compare parseable structured JSON and record unique values by:

- source record ID;
- source path;
- JSON Pointer;
- stable value hash;
- a bounded type-safe preview for scalar values only.

Exclude only physical file paths, envelope paths, payload hash, and file-location metadata from duplicate-content equality. Do not exclude payload data, relationships, decisions, validation results, evidence arrays, reasons, or narrative fields.

### Markdown content

Split Markdown bodies into deterministic heading sections. Record a unique section by:

- source record ID;
- source path;
- heading path;
- normalized section hash;
- line range.

Do not copy complete large narrative sections into the manifest. The source path and line range preserve retrieval.

### Provenance

Record every original path, raw file hash, canonical created/updated timestamps when present, archive location, supersedes relationships, parent relationships, and prior migration-manifest references discovered in the corpus.

## Inbound-reference inventory

Build a complete inbound-reference index for known artifact IDs and known repository-relative paths.

Inspect:

- parsed JSON recursively;
- canonical Markdown envelope JSON;
- raw Markdown body text;
- raw JSON text when parsing fails.

Record each exact reference with:

- source record ID and source path;
- referenced artifact ID or path;
- reference kind: `structured` or `text`;
- JSON Pointer for structured references;
- line number for text references;
- whether the target exists in the inventory;
- duplicate group affected, when applicable.

Do not infer references from approximate text or title similarity.

Every missing exact artifact-ID reference must produce `inbound_reference_to_missing_record`.

## Registry treatment

Read the current Artifact Registry as one source of evidence.

For every logical record that exposes an artifact ID:

- record whether a Registry entry exists;
- compare revision, payload hash, status, JSON path, and Markdown path;
- report each disagreement with a specific defect code.

The Registry does not define the inventory set, does not suppress unregistered records, and does not select duplicate survivors by itself.

Do not modify or regenerate the Registry in WC02.

## Migration-scope classification

Classify each logical record into exactly one:

```text
historical_migration_candidate
current_phase_control
system_index_or_diagnostic
archive_provenance
unsupported_or_unresolved
```

Rules:

- Phase 07 bootstrap Phase Planning, Work Card Plan, approved detailed Work Cards, and their implementation evidence are `current_phase_control`.
- records under `planning/system/` are `system_index_or_diagnostic` unless they are ordinary governed evidence;
- records under `planning/archive/` are `archive_provenance`;
- project and Phase 01–06 governed workflow or evidence records are `historical_migration_candidate` unless unresolved parsing prevents classification;
- malformed or conflicting records that cannot be assigned safely are `unsupported_or_unresolved`.

This classification does not authorize WC03 mutation.

## Required manifest structure

The JSON output must contain at minimum:

```text
schemaVersion
projectId
planningRoot
sourceFingerprintBefore
sourceFingerprintAfter
sourceSnapshotStable
excludedGeneratedPaths
excludedTemporaryPaths
files
records
duplicateGroups
inboundReferences
counts
safeExactConsolidationGroupIds
ambiguousOperatorReviewGroupIds
unresolvedRecordIds
```

`counts` must include:

- total files;
- total logical records;
- complete pairs;
- JSON-only records;
- Markdown-only records;
- malformed JSON files;
- invalid canonical pairs;
- counts by extension;
- counts by artifact type;
- counts by phase;
- counts by status;
- counts by schema class;
- counts by migration-scope class;
- counts by defect code;
- duplicate groups by kind;
- safe exact groups;
- ambiguous groups;
- records with unique evidence;
- inbound references;
- missing-reference defects.

Every aggregate count must be derivable from the detailed arrays. The analyzer must validate its own count invariants before returning a manifest.

## Required Markdown report

Generate the Markdown output deterministically from the JSON manifest. Do not maintain it separately.

It must include:

- schema version and source fingerprint;
- non-destructive verification result;
- complete count summary;
- counts by phase, artifact type, schema class, migration scope, and defect code;
- every duplicate group with safety classification and survivor proposal;
- every ambiguous group and its unresolved reasons;
- unique evidence locations;
- required inbound-reference updates;
- malformed and incomplete records;
- records with unresolved identity conflicts;
- exact generated-output exclusions;
- statement that no corpus mutation was performed.

The Markdown report may summarize the complete file inventory rather than print every file when the JSON contains the complete records. It may not omit any duplicate group, ambiguity, or defect class.

## Output paths

Write exactly:

```text
planning/phases/phase-07/Migration_Manifests/HISTORICAL_CORPUS_INVENTORY_V1.json
planning/phases/phase-07/Migration_Manifests/HISTORICAL_CORPUS_INVENTORY_V1.md
```

These are plain deterministic migration-analysis outputs for the Phase 07 bootstrap. They are not `champcity.artifact.v1` records, are not added to the Artifact Registry, and do not create an application approval or disposition.

Do not create CSV, database, cache, temporary retained output, additional manifest, duplicate report, or sidecar.

## Permanent test declaration

Authorize one new permanent stable-capability test:

```text
test/migration/historical-corpus-inventory.test.cjs
```

Modify:

```text
test/repository/test-suite-integrity.test.cjs
```

only to add the new permanent test to the expected test tree and to enforce the migration boundary below.

No package script change is required because the default Node test lane uses automatic discovery.

### Required behavioral test

The migration test must import compiled migration code from `dist/main/migrations/index.js` and create a temporary repository containing representative fixtures built inside that test file.

It must behaviorally prove:

1. complete enumeration of paired, JSON-only, Markdown-only, archived, malformed, canonical, and legacy records;
2. every fixture input file appears exactly once in the file inventory;
3. same-stem JSON and Markdown form one logical record;
4. malformed JSON remains inventoried and produces the correct defect;
5. an invalid canonical pair is retained and classified, not omitted;
6. duplicate artifact IDs are grouped;
7. exact file and exact record duplicates are grouped deterministically;
8. semantic duplicate candidates are ambiguous when they contain unique structured or Markdown evidence;
9. safe consolidation is assigned only to an exact group with no unique evidence;
10. survivor precedence selects valid canonical, non-archive, Registry-agreeing input in that order;
11. inbound structured and textual references are recorded;
12. missing referenced artifact IDs produce a defect;
13. Registry disagreements are reported without excluding the record;
14. identity conflicts preserve all candidates and do not choose silently;
15. repeated analysis of unchanged input produces deep-equal manifests and byte-identical rendered Markdown;
16. JSON counts equal detailed data;
17. generated outputs and the Implementer Report path are excluded;
18. collection and `--check` behavior do not modify fixture source files;
19. `--write` changes only the two fixed output paths;
20. a stale or manually edited output causes `--check` to fail.

The test must use actual files and compiled analyzer behavior. It must not recreate duplicate classification, survivor selection, reference extraction, count calculation, or rendering inside the test.

### Test integrity additions

Add assertions to `test/repository/test-suite-integrity.test.cjs` that:

- exactly eight permanent test files exist after WC02;
- `test/migration/historical-corpus-inventory.test.cjs` is included in automatic discovery;
- no test path contains a Work Card or repair ID;
- the migration test imports from `dist/main/migrations` and not `src/`;
- the CLI imports from `dist/main/migrations/index.js`;
- the CLI contains no `assert` import and no `node:test` import;
- the supported migration directory is exactly `scripts/migration/historical-corpus-v1/`;
- WC02 does not modify or import `scripts/migration/wc09/`;
- no application production entry point imports the historical-corpus migration module.

These source-boundary checks supplement, but do not replace, the behavioral migration test.

## Authorized files

Create:

```text
src/shared/migrations/historicalCorpusInventoryV1.ts
src/shared/migrations/index.ts
src/main/migrations/historicalCorpusInventoryV1Service.ts
src/main/migrations/index.ts
scripts/migration/historical-corpus-v1/generate-manifest.mjs
test/migration/historical-corpus-inventory.test.cjs
planning/phases/phase-07/Migration_Manifests/HISTORICAL_CORPUS_INVENTORY_V1.json
planning/phases/phase-07/Migration_Manifests/HISTORICAL_CORPUS_INVENTORY_V1.md
planning/phases/phase-07/Implementer_Reports/IMPLEMENTER_REPORT_WC02_historical_corpus_inventory_and_duplicate_resolution_manifest.md
```

Modify only:

```text
test/repository/test-suite-integrity.test.cjs
```

No other file is authorized.

## Files and subsystems that must remain unchanged

Do not modify:

- `package.json`;
- `AGENTS.md`;
- repository architecture or governance documents;
- Artifact Registry files;
- any existing planning artifact other than the two generated outputs and WC02 Implementer Report;
- WC01, WC01 repair Work Cards, or their reports;
- existing seven permanent test files other than the expressly authorized integrity-file addition;
- Electron main, preload, renderer, IPC, routing, governance, or execution-run code;
- canonical artifact writer or verifier;
- `scanVerifiedArtifactGraph()`;
- Governance Repair services;
- `scripts/migration/wc09/`;
- any file under `planning/archive/`.

## Prohibited behavior

Do not:

- move, rename, rewrite, canonicalize, register, archive, merge, or delete a corpus source;
- change a source record’s status, schema, revision, identity, relationship, or payload;
- set `pending_operator_disposition` in WC02;
- create an Operator decision;
- treat an old approval as a current WC01 decision;
- choose a survivor for an ambiguous group;
- use AI similarity, fuzzy text matching, title matching, or manual curation to create duplicate groups;
- use Registry authority, timestamps, numbered suffixes, lexical order, or current status as sole survivor authority;
- edit generated JSON or Markdown manually after the analyzer writes it;
- hide malformed or unpaired files because they fail canonical validation;
- read outside `<PROJECT_REPO>/planning` except repository identity files needed by the fixed CLI;
- expose absolute paths;
- add a database, package dependency, network request, provider, MCP call, or external service;
- add application UI;
- perform Git staging, commit, push, reset, clean, stash, restore, merge, rebase, tag, release, or history rewriting.

## Required execution and validation sequence

Use the documented normal Windows lane.

Run in this order:

```text
npm run typecheck
npm run build
node scripts/migration/historical-corpus-v1/generate-manifest.mjs --write
node scripts/migration/historical-corpus-v1/generate-manifest.mjs --check
npm run test:unit
npm run test:repository
npm run test:renderer:built
npm run test:full
npm run validate:codex:unit
npm run validate:codex:build
npm run validate:codex
node scripts/migration/historical-corpus-v1/generate-manifest.mjs --check
```

Do not use Playwright.

No failed, skipped, cancelled, bypassed, or todo test is permitted.

The final `--check` must pass after the Implementer Report exists because that path is an explicit generated-output exclusion.

Record parent and child exit codes for every wrapper command.

## Implementer Report

Create only:

```text
planning/phases/phase-07/Implementer_Reports/IMPLEMENTER_REPORT_WC02_historical_corpus_inventory_and_duplicate_resolution_manifest.md
```

The report must include:

- repository, remote, branch, starting HEAD, WC02 Work Card hash, and initial/final status;
- exact files created and modified;
- exact analyzer symbols and schema version;
- source fingerprint before and after;
- JSON and Markdown output hashes;
- total input files and logical records;
- complete count summary by phase, type, schema, migration scope, defect, and duplicate kind;
- number and IDs of safe exact groups;
- number and IDs of ambiguous groups;
- every malformed, incomplete, unresolved-identity, and missing-reference record ID;
- proof that every input file appears once;
- proof that aggregate counts reconcile to detailed arrays;
- proof that no source file hash changed;
- proof that only the two output files were written by the generator;
- proof that `--check` detects stale output and passes on current output;
- test name and exact behavioral evidence for every required test item;
- exact validation commands, lanes, parent/child exits, and test counts;
- confirmation that no corpus migration, Registry mutation, disposition assignment, application approval, or Git mutation occurred;
- confirmation that WC03 and later Work Cards were not implemented.

Do not create a JSON Implementer Report sidecar.

## Acceptance criteria

WC02 is acceptable only when:

1. every in-scope planning JSON and Markdown file is inventoried exactly once;
2. malformed, incomplete, legacy, canonical, archive, system, and bootstrap records remain visible;
3. all required identity, schema, pair, relationship, Registry, path, hash, status, and provenance fields are present;
4. identity conflicts preserve competing evidence and do not silently choose;
5. all required defect codes are represented in the schema and emitted when applicable;
6. duplicate groups are deterministic and use only the approved exact rules;
7. semantic grouping does not use titles, fuzzy matching, AI judgment, or manual curation;
8. safe consolidation is limited to exact records with no unique evidence or unresolved conflict;
9. ambiguous groups have no proposed canonical survivor;
10. unique structured values and Markdown sections are locatable by source path and pointer or line range;
11. inbound artifact-ID and path references are indexed, including missing targets;
12. Registry evidence is compared but does not define inventory inclusion or survivor authority;
13. migration-scope classification covers every logical record exactly once;
14. every aggregate count reconciles to detailed manifest data;
15. unchanged source input produces byte-identical JSON and Markdown;
16. source mutation during generation aborts without partial output;
17. `--write` changes only the two fixed output paths;
18. `--check` is read-only and detects stale output;
19. no source corpus file, Registry file, application artifact, or Git state is mutated;
20. one new permanent migration test is added and all prior permanent tests remain intact;
21. all required validation commands pass with zero failed, skipped, cancelled, bypassed, or todo tests;
22. the Implementer Report provides exact evidence for every criterion;
23. WC03 and later scope remains untouched.

## Manual validation after Architect review

The Operator should review the generated Markdown manifest and confirm:

1. the total file and logical-record counts are credible for the visible repository corpus;
2. at least one malformed or incomplete record remains visible rather than being dropped;
3. at least one safe exact duplicate group shows no unique evidence and a deterministic survivor basis;
4. at least one ambiguous semantic group shows unique evidence and no proposed survivor;
5. inbound-reference updates identify the source records that WC03 would need to rewrite;
6. archive provenance is visible separately from active or historical migration candidates;
7. the report states that no source record was changed.

WC02 remains unresolved until implemented, reviewed, and accepted by the Operator. WC03 through WC13 remain unauthorized.
