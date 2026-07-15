<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/project/supporting_document/SECURITY_POLICY",
  "artifactType": "supporting_document",
  "createdAt": "2026-07-14T00:00:00.000Z",
  "jsonPath": "planning/project/SECURITY_POLICY.json",
  "markdownPath": "planning/project/SECURITY_POLICY.md",
  "payload": {
    "kind": "supporting_document",
    "title": "Security Policy"
  },
  "payloadHash": "sha256:b96a903c21f593e2b786dfc9038b1ca7f5c2b4db1f93abc5528c5cf64361e73c",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [],
    "sources": [],
    "supersedes": []
  },
  "revision": 1,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-14T00:00:00.000Z"
}
-->

# Security Policy

- Do not store secrets in repo artifacts.
- Do not perform automated code execution without approval.
- Do not add MCP or connector integrations to the Alpha app without a dedicated approved Work Card.
- Do not write credentials into Work Cards, `AGENTS.md`, logs, generated prompts, or generated artifacts.
- Route authentication, payments, data deletion, migrations, secrets, production, and compliance changes as High Risk.
- Electron filesystem writes must be constrained to approved planning paths.
- The Electron renderer process must use context isolation and no unrestricted Node integration.
- Future file writes must be mediated by Electron main/preload IPC.
