# Development Environment Resolution / Repair01

**Implementation checkpoint:** `7fb736276fcc1f50ed66640c73ea3cb669e860b5`  
**Status:** **ACCEPTED — RUNTIME REPRO RETEST AUTHORIZED**

Controlling card:

`DER-R01_probe_before_provider_resolution_and_fix_terminal_ux.md`

Architect review:

`ARCHITECT_REVIEW_2026-09-30.md`

Accepted behavior:

- generically-probeable managed executables are probed before provider/WinGet resolution;
- a satisfied probe immediately satisfies preflight;
- missing/incompatible tools retain provider fallback;
- post-Environment-Resolution deterministic preflight remains authoritative;
- ready state enables Work Card implementation;
- unresolved state remains blocking and warning/amber;
- Environment Resolution does not require or complain about an Implementer Report;
- actual Work Card Implementer Report enforcement remains unchanged.

Next step: retest the original Signal_Forge Greenfield environment-resolution flow.
