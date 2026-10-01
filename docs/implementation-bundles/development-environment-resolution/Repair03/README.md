# Development Environment Resolution / Repair03

**Implementation checkpoint:** `453a950946eaec108b805418323e17ca0cb0432e`  
**Status:** **BLOCKED — FOLLOW-UP REPAIR REQUIRED**

Controlling RCA:

`DER_R03_ARCHITECT_RCA_2026-09-30.md`

Controlling repair card:

`DER-R03_application_led_environment_setup_and_node_npm_path_repair.md`

Architect review:

`DER_R03_ARCHITECT_REVIEW_2026-09-30.md`

## Accepted direction

DER-R03 successfully removes model-driven Environment Resolution and establishes application-owned Node/npm, PATH, FFmpeg, and ffprobe repair/verification.

## Remaining blockers

1. First deterministic preflight still occurs only after `CodexRuntimeManager.acquire()`; a fresh Work Card with unavailable Codex has no cached preflight and no environment-retry control.
2. Node/npm persistent PATH repair is skipped if the pair is visible only through the current process PATH even though Machine/User PATH do not contain the validated root.
3. The committed DER-R03 Implementer Report is not valid UTF-8 and cannot be read by repository text tooling.

Do not Operator-retest Signal Forge until a bounded Repair03/Repair01 is implemented and reviewed.
