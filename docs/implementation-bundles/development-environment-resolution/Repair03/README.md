# Development Environment Resolution / Repair03

**Status:** ACTIVE — APPLICATION-LED ENVIRONMENT REPAIR

Controlling RCA:

`DER_R03_ARCHITECT_RCA_2026-09-30.md`

Controlling repair card:

`DER-R03_application_led_environment_setup_and_node_npm_path_repair.md`

Repair03 restores the intended authority boundary:

```text
ChampCity application
-> refresh Windows environment
-> detect/repair PATH
-> verify/provision toolchains
-> deterministic preflight ready
-> Codex may implement
```

Ordinary environment setup must not run through Codex App Server.

For Node/npm, ChampCity must reuse the existing validated standalone Node/npm resolver, repair User PATH when the toolchain is already installed but not exposed, and provision the Node toolchain only when it is genuinely absent.

`winget search npm` is not an allowed environment-setup path.

Stop after implementation for Architect review.
