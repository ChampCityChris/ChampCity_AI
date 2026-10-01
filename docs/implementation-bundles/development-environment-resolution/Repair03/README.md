# Development Environment Resolution / Repair03

**DER-R03 implementation:** `453a950946eaec108b805418323e17ca0cb0432e`  
**DER-R03-R01 implementation:** `8390ff07449bca200ef9bca6311db0b57ff54189`  
**Status:** **ACCEPTED — SIGNAL FORGE OPERATOR RETEST AUTHORIZED**

Controlling RCA:

`DER_R03_ARCHITECT_RCA_2026-09-30.md`

Original repair:

`DER-R03_application_led_environment_setup_and_node_npm_path_repair.md`

Blocking Architect review:

`DER_R03_ARCHITECT_REVIEW_2026-09-30.md`

Accepted follow-up:

`Repair01/DER-R03-R01_complete_preflight_authority_and_persist_node_path.md`

Repair01 Architect review:

`Repair01/ARCHITECT_REVIEW_2026-09-30.md`

Accepted authority boundary:

```text
ChampCity application
-> deterministic environment preflight / PATH repair / provisioning
-> environment ready
-> only then Codex runtime/model acquisition
-> implementation
```

Normal environment setup no longer runs through Codex App Server.

Node/npm uses one validated toolchain. Persistent Machine/User PATH is authoritative for future visibility; process-only Node exposure is reconciled to User PATH before reinstall is considered.

Next step: Operator retest Signal Forge.
