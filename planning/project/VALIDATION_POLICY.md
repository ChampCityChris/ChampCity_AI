<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/project/supporting_document/VALIDATION_POLICY",
  "artifactType": "supporting_document",
  "createdAt": "2026-07-14T00:00:00.000Z",
  "jsonPath": "planning/project/VALIDATION_POLICY.json",
  "markdownPath": "planning/project/VALIDATION_POLICY.md",
  "payload": {
    "kind": "supporting_document",
    "title": "Validation Policy"
  },
  "payloadHash": "sha256:ce0b33a8318443a65badcf498dfdb10302442c1a4463945ad8442fccd51fae06",
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

# Validation Policy

## Automated Validation

- Unit-test Work Card schema and serialization.
- Test prompt composition with fixed example cards.
- Test risk-router examples.
- Confirm Markdown files are readable outside the app.
- Confirm no secrets are written to Work Cards or `AGENTS.md`.
- Confirm the Electron renderer cannot perform arbitrary filesystem writes.

## Manual Validation

- Manually validate the end-to-end flow with one bug and one feature once the Work Card workflow exists.
- Confirm captured Implementer reports include files changed, checks run, skipped checks, manual validation, and residual risks.

## Current Automated Checks

- `npm run typecheck`
- `npm run build`
- `npm test`
- `npm run test:work-cards` when the build environment allows it.

## WC08 Validation Note

- For Phase 02 WC08, automated validation must use the documented validation lane in `docs/dev/VALIDATION_COMMAND_LANES.md`.
- Manual Operator validation must confirm that next-phase planning artifacts are labeled Draft / Pending Review / Not Active, that Work Card Plans do not create Formal Work Cards, that Work Card Plan Review presents proposed entries as Not Executable, that Phase Closeout includes a Next Phase Activation decision, and that Ad Hoc Work Card Capture is not presented as the normal next step after phase planning.
- Manual Operator validation must confirm Ad Hoc Work Card Capture explains manual/ad hoc field authority and does not silently combine a selected Work Card with newly entered phase/work-card values.
- Implementers may run non-acceptance smoke checks, but Operator acceptance and Phase 02 closeout remain Operator-owned.
