# Development Environment Resolution / Repair02

**Implementation checkpoint:** `aadbe64d681e839cc5cae2132fb320713b7253d5`  
**Status:** **ACCEPTED — SIGNAL FORGE RUNTIME RETEST AUTHORIZED**

Controlling card:

`DER-R02_register_ffmpeg_probes_and_remove_universal_version_assumption.md`

Architect review:

`ARCHITECT_REVIEW_2026-09-30.md`

Accepted behavior:

```text
ffmpeg  -> ffmpeg -version
ffprobe -> ffprobe -version
```

Registered executable capabilities probe before provider resolution and are re-probed after provisioning.

Unknown capabilities no longer universally invent `--version`; presence-only requirements use bounded PATH lookup, while unknown version-constrained requirements fail closed unless a semantic adapter can verify the version.

Package inventory is provisioning evidence, not executable-verification authority.

Next step: retest the original Signal Forge Work Card environment preflight on the live Windows host.
