# Risks

## Current Risks

- The renderer is still a large single-file React implementation, so new Alpha workflow screens should be inserted narrowly.
- Project-level planning files are durable source-of-truth artifacts; in-place updates must be explicit to the Operator.
- Renderer code must not directly read or write local files; planning reads and writes must stay mediated through constrained Electron main/preload IPC.
- Future LLM provider work must remain behind provider abstraction and must not introduce provider SDKs without a dedicated approved Work Card.
- Operator manual validation is still required for acceptance, phase closeout, and product-owner approval.

## High-Risk Routing Rules

Route Work Cards as High Risk when they involve authentication, permissions, payments, data deletion, migrations, secrets, production systems, compliance, broad refactors, provider SDKs, MCP or connector integrations, cloud/deployment automation, or unclear validation.
