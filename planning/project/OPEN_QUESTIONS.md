<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/project/supporting_document/OPEN_QUESTIONS",
  "artifactType": "supporting_document",
  "createdAt": "2026-07-14T00:00:00.000Z",
  "jsonPath": "planning/project/OPEN_QUESTIONS.json",
  "markdownPath": "planning/project/OPEN_QUESTIONS.md",
  "payload": {
    "kind": "supporting_document",
    "title": "Open Questions"
  },
  "payloadHash": "sha256:2e67a4052e8b3eaacee79f8a77210ff65f80188a1083e7a5b39755a4e7339047",
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

# Open Questions

## Questions

- These are not blockers for the next planning-documents step, but they should remain open profile fields until resolved.
- First, how should ChampCity A/I expose and explain ChampCity MCP setup to non-developer users without overwhelming them?
- Recommended default: the app should present MCP as a required local connector for the guided Alpha workflow, with simple status checks and plain-language explanations.
- Second, should subscription-surface automation beyond MCP be built as browser automation, clipboard automation, desktop overlay/helper, staged copy/paste queue, or some combination of these?
- Recommended default: treat this as a later design/research phase. MCP-mediated repo access is the primary Alpha integration path.
- Third, should Beta require Mac/Linux support, or is Windows public release enough for Beta?
- Recommended default: Windows public release is enough for Beta. Mac/Linux can follow after the workflow is proven.
- Fourth, should screenshots be stored directly in the repo, stored in an app-controlled evidence folder, or referenced by path?
- Recommended default: use an app-controlled evidence folder under the project planning structure, with repo-safe filenames and no hidden external dependency.
- Operator uncertainty: I am unsure how to code a solution for integrating this application with the subscription versions of ChatGPT or Claude

## Owner

The Operator owns final answers. The Architect may help frame options before implementation.
