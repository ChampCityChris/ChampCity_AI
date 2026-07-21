<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/project/supporting_document/ENVIRONMENT",
  "artifactType": "supporting_document",
  "createdAt": "2026-07-14T00:00:00.000Z",
  "jsonPath": "planning/project/ENVIRONMENT.json",
  "markdownPath": "planning/project/ENVIRONMENT.md",
  "payload": {
    "kind": "supporting_document",
    "title": "Environment"
  },
  "payloadHash": "sha256:415d88452dd3b0e8320b905d1b1cdf3777236cff74c2d54bbc2f2bfc3398d7d3",
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

# Environment

## Workspace

`<PROJECT_REPO>`

## Git Status Discovered During Audit

- Initial audit found no valid Git repository.
- An empty or non-functional `.git` entry was present.
- Git has since been initialized locally for active Alpha app development.

## Git Remote Status

- Remote repository URL: `https://github.com/ChampCityChris/ChampCity_AI`.
- Repository visibility decision: public.

## Runtime and Tooling

- Package manager: npm.
- Runtime: Node/Electron.
- Language: TypeScript.

## Commands

- Install: `npm install`
- Start: `npm start`
- Build: `npm run build`
- Test: `npm test`
- Typecheck: `npm run typecheck`

## Validation Limits

- `npm test` currently runs the TypeScript typecheck.
- `npm run test:work-cards` builds the app and runs deterministic Work Card fixture verification.
- Manual Electron launch validation may still be required after build/typecheck for UI acceptance.

## Document Disposition
Document.Status=Pending
