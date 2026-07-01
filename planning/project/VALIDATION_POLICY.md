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
