<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/project/supporting_document/RELEASE_POLICY",
  "artifactType": "supporting_document",
  "createdAt": "2026-07-14T00:00:00.000Z",
  "jsonPath": "planning/project/RELEASE_POLICY.json",
  "markdownPath": "planning/project/RELEASE_POLICY.md",
  "payload": {
    "kind": "supporting_document",
    "title": "Release Policy"
  },
  "payloadHash": "sha256:2981b76955a0b6ae707c1d8b61e79e300167c22436d2f02d77f7d96880113d0a",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [],
    "sources": [],
    "supersedes": []
  },
  "revision": 3,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-20T02:02:10.353Z"
}
-->

# Release Policy

## Git Commit Rules

- Use local Git history for meaningful work checkpoints.
- Commit only files created or modified for the approved pass.
- Do not include secrets, local `.env` files, dependency folders, build output, logs, or unrelated changes.

## Tag Naming Rules

- Use annotated local tags for approved release milestones.
- Do not move or recreate an existing tag without explicit operator approval.

## GitHub Push Rules

- Push commits and tags only when a remote is configured and credentials are already available.
- Do not print, request, or store credentials.
- Remote repository URL is `https://github.com/ChampCityChris/ChampCity_AI`.

## Release Packaging Boundary

- The source repository retains tests and development assets.
- The released package contains only production code and required runtime assets.
- Exclude `test/`, `tmp/`, planning corpora, coverage, development harnesses, abandoned migrations, logs, environment files, and handoff archives unless explicitly required.
- Release validation must inspect packaged contents.
- Boundary authority: `docs/architecture/REPOSITORY_CODE_TEST_AND_MIGRATION_BOUNDARY.md`.

## Historical MVP Release Tag Plan

The MVP foundation plan is retained here as a historical release record. Current active work is Alpha app development.

- `v0.1.0-foundation`: project memory, planning scaffold, Electron + TypeScript shell, and design document updates.
- `v0.2.0-work-card-schema`: Work Card schema, Markdown renderer, and file path rules.
- `v0.3.0-capture-frame-review`: capture form, framing workflow, save, and review.
- `v0.4.0-implementer-prompt-flow`: risk router, Implementer execution packet generator, and plan capture.
- `v0.5.0-validation-repair-closeout`: Implementer report capture, validation, repair, closeout, and project-memory update.
- `v1.0.0-mvp`: complete MVP done definition.
