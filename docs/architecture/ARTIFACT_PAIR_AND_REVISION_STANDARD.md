# Artifact Pair And Revision Standard

## One Logical Artifact, Two Representations

Every active durable workflow artifact is one typed domain object rendered as synchronized Markdown and JSON:

- Markdown is the human-readable review and handoff representation.
- JSON is the machine-readable runtime representation.

Both representations carry the same envelope metadata and payload hash. A mismatch is blocking; neither representation wins by convention.

## Canonical Envelope

Each canonical artifact contains:

- `artifactId`
- `artifactType`
- `schemaVersion` (`champcity.artifact.v1`)
- `revision`
- `status`
- `projectId`
- optional `phaseId`, `workCardId`, and `parentArtifactId`
- `createdAt` and `updatedAt`
- `markdownPath` and `jsonPath`
- `payloadHash`
- `relationships.sources`
- `relationships.expectedOutputs`
- `relationships.supersedes`
- `relationships.children`
- a typed `payload` with `kind`, `title`, `contentMarkdown`, and artifact-specific `data`

## Hash And Rendering

The payload hash is SHA-256 over recursively key-sorted canonical JSON for the payload only, written as `sha256:<lowercase hex>`. The hash field does not hash itself.

Canonical Markdown starts with a machine-readable `champcity-artifact-envelope` JSON comment and then renders `payload.contentMarkdown`. Pair verification checks:

- strict canonical envelope shape;
- matching paths, identity, revision, status, relationships, timestamps, and hash;
- recomputed JSON payload hash;
- parsed Markdown envelope equality;
- Markdown body equality with `payload.contentMarkdown`.

Changing either body or metadata without regenerating both representations blocks synchronization.

## Registry And Graph Authority

The canonical artifact registry is stored as a synchronized system pair at:

- `planning/system/Artifact_Registry/ARTIFACT_REGISTRY.json`
- `planning/system/Artifact_Registry/ARTIFACT_REGISTRY.md`

For each logical artifact ID, the registry records one indexed revision, its paths, status, relationships, and synchronization result. Active, pending, blocked, superseded, archived, and historical entries are explicit. More than one controlling authority for the same ID is an error.

Runtime discovery scans canonical pairs and builds a verified artifact graph plus derived Registry view. A valid external pair does not require an import or prior app registration. The durable Registry remains a cache/index for app writes and audit; it cannot hide newer verified evidence. Runtime never selects a file because it is newest, first, last, or suffixed.

## Revision Rule

Ordinary updates:

1. retain artifact ID and canonical filenames;
2. increment `revision`;
3. retain `createdAt` and update `updatedAt`;
4. regenerate payload hash and both representations;
5. use Git history for earlier content.

Active `_2`, `_3`, or similar revision filenames are prohibited. Curated migration decisions resolve existing duplicates; ambiguity blocks rather than invoking a suffix rule.

## Write Safety

The pair service validates and renders in memory, stages temporary files, verifies staged content, commits the pair, verifies committed content, updates the registry, and only then permits workflow advancement. Backups are restored on failure. A failure reports the exact stage and leaves the prior authoritative revision in place whenever recovery is possible.

## Migration Boundary

Legacy recognition exists only in the one-time WC09 migration utility. Runtime modules must not import migration parsers, accept alternate schemas, or expose legacy field/path aliases. The migration manifest records source hashes, original paths and terminology, canonical identity and paths, revision, authority decision, rename, archive disposition, blockers, verification, and rollback guidance.
