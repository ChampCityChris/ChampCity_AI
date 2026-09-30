# Development Environment Resolution / Repair01

**Status:** ACTIVE

Controlling card:

`DER-R01_probe_before_provider_resolution_and_fix_terminal_ux.md`

This repair addresses the Greenfield Work Card environment blocker where a generically-probeable executable such as `ffprobe` is already installed but ChampCity skips its deterministic probe, falls directly into ambiguous provider resolution, and remains blocked after Environment Resolution.

The repair also fixes misleading terminal UX:

- Environment Resolution does not require an Implementer Report;
- ready environment state enables Work Card implementation;
- unresolved environment state is warning/amber, not green;
- actual Work Card Implementer Report enforcement remains unchanged.

Stop after implementation for Architect review.
