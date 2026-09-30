# Existing Project Git Adoption — Repair04 / Repair03

**Baseline:** `e10bc59e5813cd7be769d1c92b9e71a51200d11b`  
**Status:** **ACTIVE — ARCHITECTURE CORRECTION**

Repair02 was implemented successfully against its card, but the card preserved an invalid subsystem dependency: Source Control currently consults Agent Harness RepositoryCheckout registration state during deterministic Git conversion.

Repair03 corrects the boundary.

Controlling documents:

- `EPGA_R04_R03_ARCHITECT_CORRECTION_2026-09-29.md`
- `EPGA-R04-R03_decouple_source_control_from_agent_harness_model_access.md`

Core invariant:

> ChampCity A/I Source Control owns Git and must function without Agent Harness, MCP, or an LLM. Agent Harness checkout exposure is a downstream model-access projection of application-owned source state.

Do not retry the real ChampCity_AI conversion until Repair03 is implemented and Architect-reviewed.
