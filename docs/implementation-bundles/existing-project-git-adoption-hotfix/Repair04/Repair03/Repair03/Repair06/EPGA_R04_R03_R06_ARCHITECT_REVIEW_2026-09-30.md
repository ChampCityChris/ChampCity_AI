# EPGA Repair04 / Repair03 / Repair06 Architect Review — 2026-09-30

**Implementation checkpoint:** `3f9fd6368dcf3e131852b0554066e1fe6f9ae2a4`  
**Parent:** `2827265eedfae3e66fbfebd4a2a1b43e9d6d1395`  
**Disposition:** **ACCEPTED — REAL CHAMPCITY_AI QUALIFICATION RETRY AUTHORIZED**

## Review result

Repair06 corrects the local-state category error exposed by real migration `349232e8-fce9-4300-bbf2-8a19fca53d56`.

Existing Project inventory now has three semantic classes:

```text
canonical source
durable ignored/local state
regenerable ignored state
```

Git ignore status is determined before the regenerable-name classifier is applied, so tracked or non-ignored source is never discarded merely because it lives under a generated-looking path.

## Accepted classification

The bounded regenerable classifier includes dependency/build/cache/temp roots such as:

`node_modules`, `dist`, `build`, `out`, `release`, `coverage`, `tmp`, `temp`, `.cache`, `.parcel-cache`, `.vite`, `.turbo`, `.next`, Python cache roots, and `__pycache__`.

Unknown ignored paths default to durable state.

That means the real `node_modules` failure class is no longer conversion authority.

## Durable state transaction accepted

Durable ignored state is now copied into an attempt-local `local-state-snapshot` before destructive Git cutover.

The snapshot is verified using non-following tree digests over entry kind, tree membership, file bytes, and link targets.

After Main/Dev are proven, durable state is copied from the verified snapshot into Dev and verified again.

The old `relocateLocalState()/restoreRelocatedLocalState()` raw-rename transaction is removed.

## Regenerable state behavior accepted

Regenerable state:

- does not enter the baseline;
- is not copied into durable recovery;
- is not materialized into Dev;
- is not rollback authority;
- is cleaned from the Project root on a bounded best-effort basis.

If Windows refuses to remove a regenerable directory such as a live `node_modules`, the conversion records a cleanup warning/residue and continues with managed source authority.

## Mixed-tree cleanup accepted

Root cleanup is manifest-driven rather than recursively deleting entire mixed source directories.

Canonical source removal remains authoritative.

Durable originals are removed only after preservation/materialization is proven; failure becomes non-authoritative residue.

Regenerable cleanup failure is non-authoritative.

Empty manifest parents are pruned separately.

This prevents a locked nested cache from invalidating otherwise-correct source conversion.

## Rollback accepted

Focused rollback proof confirms that a failure after durable materialization restores:

- conventional root Git authority;
- canonical source;
- durable local bytes from the verified local-state snapshot.

Regenerable state is intentionally not required for rollback.

## Validation disposition

The Implementer report records:

- production Windows build pass;
- managed-source owner 23/23 pass;
- Current Project/source-topology/capability owners 32/32 pass;
- focused ignored-state classification pass;
- watcher regression pass;
- repair-plan preview pass;
- `git diff --check` / staged check pass.

Architect code review confirms Repair05 forced root-Git retirement, machine source fencing, project admission, and Source Control/Agent Harness boundaries remain unchanged.

## Qualification authorization

Repair06 is accepted.

The real ChampCity_AI **Open Existing Project -> Accept and Convert** qualification retry is authorized.

Do not manually clean historical failed migration evidence before retry. If the retry fails, preserve the new journal and exact UI error for RCA.
