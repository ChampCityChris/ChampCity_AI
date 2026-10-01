# DER-R03 / Repair01

**Status:** ACTIVE — BLOCKING FOLLOW-UP

Controlling review:

`../DER_R03_ARCHITECT_REVIEW_2026-09-30.md`

Controlling card:

`DER-R03-R01_complete_preflight_authority_and_persist_node_path.md`

This repair closes the two remaining DER-R03 blockers:

1. first deterministic environment preflight must occur before any Codex runtime/model acquisition and must be available independently through the Development Environment UI;
2. a valid Node/npm pair visible only through the current process PATH must be persisted to User PATH when absent from persistent Machine/User PATH.

It also rewrites the parent DER-R03 Implementer Report as valid UTF-8.

Do not Operator-retest Signal Forge until Repair01 is implemented and Architect-reviewed.
