<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "design-document",
  "artifactRevision": 2,
  "participationRole": "contextOnly",
  "identity": {
    "documentId": "APPLICATION_OWNED_CANONICAL_DOCUMENT_CONSTRUCTION"
  },
  "sourceRevisions": [],
  "workflowData": {
    "status": "single-file architecture replaces paired Markdown/JSON architecture",
    "approvedDate": "2026-07-27"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "",
    "reviewedAt": "2026-07-27T00:00:00.000Z"
  }
}
CHAMPCITY-METADATA -->

# Application-Owned Canonical Document Construction

Status: single-file architecture replaces paired Markdown/JSON architecture
Project: ChampCity A/I
Approved date: 2026-07-27

## Controlling Principle

LLMs and humans supply substantive Markdown content. ChampCity A/I owns canonical workflow authority.

Every governed workflow document is one Markdown file. The file begins with one application-owned `CHAMPCITY-METADATA` JSON comment. The remaining body is human-readable Markdown.

## Application Authority

The application owns path, identity, artifact revision, source revisions, participation role, workflow data, disposition, review metadata, serialization, atomic writing, and parser verification.

Workflow authority is read only from the metadata comment. Markdown body prose, filenames, hidden hashes, route tokens, and sidecar files are not workflow authority.

## Content Producer Boundary

Content producers return substantive Markdown only. They do not write repository files and do not provide metadata delimiters, serialized metadata JSON, target paths, source revisions, disposition, role, or artifact revision.

## Runtime Model

One governed document maps to one canonical Markdown file, one metadata block, one body, one disposition, one artifact revision, and one atomic write.

The previous Markdown/JSON sibling protocol is superseded and must not be used as normal runtime authority.
