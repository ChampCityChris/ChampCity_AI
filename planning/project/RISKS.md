# Risks

## Current Risks

- GitHub remote is not configured, so source control is local only until a remote decision is made.
- Unit tests are not implemented yet; validation is currently limited to TypeScript checks and build output.
- The Electron app currently has only a foundation shell; Work Card persistence and IPC write mediation are planned next.

## High-Risk Routing Rules

Route Work Cards as High Risk when they involve authentication, permissions, payments, data deletion, migrations, secrets, production systems, compliance, broad refactors, or unclear validation.
