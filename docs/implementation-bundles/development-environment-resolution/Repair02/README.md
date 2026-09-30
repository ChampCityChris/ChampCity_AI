# Development Environment Resolution / Repair02

**Status:** ACTIVE

Controlling card:

`DER-R02_register_ffmpeg_probes_and_remove_universal_version_assumption.md`

Signal Forge exposed a second deterministic preflight defect after DER-R01:

```text
ffmpeg / ffprobe
-> no registry adapter
-> generic <capability> --version
-> invalid probe semantics
-> provider fallback / ambiguity
```

Repair02 registers the real reusable probe contracts:

```text
ffmpeg  -> ffmpeg -version
ffprobe -> ffprobe -version
```

and removes the assumption that every unknown executable supports `--version`.

Package inventory remains provisioning evidence; registered executable capabilities must pass their real executable probe before being marked satisfied.

Stop after implementation for Architect review.
