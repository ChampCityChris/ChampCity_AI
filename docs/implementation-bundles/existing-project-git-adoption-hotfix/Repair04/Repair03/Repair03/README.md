# Existing Project Git Adoption — Repair04 / Repair03 / Repair03

**Repair03 checkpoint:** `b1d4942e2c149417157fea76a9809a76d684cc80`  
**Repair04 checkpoint:** `b8cc37753da54e0b5e79ce758442ab4389a55618`  
**Status:** **ACCEPTED — REAL CHAMPCITY_AI QUALIFICATION RETRY AUTHORIZED**

## Controlling acceptance

`Repair04/EPGA_R04_R03_R04_ARCHITECT_REVIEW_2026-09-30.md`

## Accepted architecture

- Source Control owns Git and source-topology transitions.
- A neutral cross-process machine source-operation fence coordinates deterministic source transitions.
- Agent Harness/MCP/model-access operations consume that fence as clients.
- Agent Harness does not authorize Source Control.
- Existing Project admission is canonical across landing/sidebar Open/Change routes.
- Clear Project returns to landing.
- Project Intake cannot silently switch the Current Project repository.

## Model-access topology

Before conversion, a conventional Git Project may expose one deterministic conventional RepositoryCheckout.

After successful managed conversion:

```text
main -> Main
dev  -> Dev
```

The conventional root projection is retired idempotently.

Agent Harness workspace/source reconciliation now obeys the neutral shared source fence, and public MCP checkout discovery reflects the same current projection.

## Next action

Run the real ChampCity_AI Existing Project qualification retry through the normal application UI.

Do not manually clean preserved migration evidence before the retry.
