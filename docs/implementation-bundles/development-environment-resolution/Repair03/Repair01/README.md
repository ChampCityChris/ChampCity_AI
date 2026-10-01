# DER-R03 / Repair01

**Implementation checkpoint:** `8390ff07449bca200ef9bca6311db0b57ff54189`  
**Status:** **ACCEPTED — SIGNAL FORGE OPERATOR RETEST AUTHORIZED**

Controlling card:

`DER-R03-R01_complete_preflight_authority_and_persist_node_path.md`

Architect review:

`ARCHITECT_REVIEW_2026-09-30.md`

Accepted corrections:

- deterministic environment preflight occurs before Codex runtime acquisition;
- null/uncomputed preflight is not implementation-ready;
- fresh Work Cards expose application-owned Prepare Environment independent of Codex;
- process-only Node/npm visibility is reconciled into persistent User PATH when Machine/User PATH omit the validated root;
- persistent PATH writes are verified and idempotent;
- Node/npm remains one toolchain with no standalone npm package resolution;
- parent and Repair01 reports are valid UTF-8.

Next step: Operator retest of the Signal Forge environment/start-implementation path.
