# EPGA Repair03 Architect Review — 2026-09-29

**Reviewed checkpoint:** `07d2e543e6c64ec4214fef7027bf853cefdfb1ab`  
**Disposition:** **ACCEPTED FOR REPAIR03 SCOPE — REAL CONVERSION STILL BLOCKED BY NEW DOWNSTREAM FAILURE**

## Review scope

This review evaluates the Repair03 contract:

- readable-Git source preservation is bounded by source semantics rather than whole-root recursive copying;
- ignored/local state is excluded from the canonical baseline and preserved separately;
- link/junction handling is non-following;
- unreadable-Git fallback remains supported;
- pre-normalization staging failure removes its own partial staging;
- Repair02 managed integration-policy provisioning remains unchanged.

The subsequent real ChampCity_AI conversion failure is evaluated separately below.

## Code review findings

### PASS — canonical source staging is no longer a blind Project-root copy

`gitSourceInventory()` derives tracked source from the Git index and classifies non-tracked entries through bounded NUL-delimited `git check-ignore --stdin`.

Ignored roots are recorded as local state and are not recursively traversed during canonical source materialization.

The previous production defect — recursively walking dependency/build/cache/local trees before applying Git ignore semantics — is removed.

### PASS — tracked and untracked current source semantics are preserved

The manifest keeps:

- tracked paths at current working-tree bytes;
- dirty tracked state;
- non-ignored untracked source;
- source deletion by absence;
- generated repository-owned integration policy.

The canonical index is built explicitly from controlled snapshot entries rather than whole-tree `git add -A`.

### PASS — ignored/local state remains local and uncommitted

Ignored roots are collapsed and relocated into Dev only after baseline and exact Main/Dev topology verification.

Rollback reverses completed local-state relocations before managed candidates are removed.

This keeps ignored local state out of canonical history without requiring recursive source-snapshot traversal of ignored trees.

### PASS — Windows link/junction handling is non-following

Source materialization and fallback use `lstat` classification.

Link targets are preserved as link entries rather than recursively traversed. Canonical link entries are indexed as Git mode `120000`.

The final implementer evidence includes a real Windows junction fixture without a skip.

### PASS — Repair02 policy semantics remain intact

The real failed conversion left a valid preserved source snapshot containing a freshly generated:

`.champcity/integration-policy.json`

with the current `champcity-integration-gate` validation-profile policy.

Incoming Project-container `.champcity` state did not become canonical source authority.

### PASS — pre-normalization cleanup repair is correctly bounded

Repair03 removes the current migration directory when canonical source or generated-policy materialization fails before normalization begins.

The source-staging cleanup does not delete unrelated migration evidence.

## Production qualification evidence

The real ChampCity_AI retry progressed materially farther than the prior failure.

Current on-disk evidence shows:

- the Repair03 source snapshot exists and is readable;
- the generated integration policy exists inside that snapshot;
- the adoption journal reached `stage: "normalizing"`;
- the journal has no baseline revision yet;
- the original conventional root Git remains functional;
- Main and Dev do not exist;
- no relocated `legacy-git-entry` exists.

Therefore the Repair03 source-staging defect is closed. The new failure is downstream in managed Git normalization / rollback.

## New blocking defect — normalization rollback can mask the primary failure

The UI now reports an EPERM / permission-denied failure on:

`.champcity/repository.git`

The surviving migration journal remains:

`stage: "normalizing"`

with:

- `baselineRevision: null`;
- `failureReason: null`;
- no completion receipt.

The current normalization catch path contains an unguarded:

```ts
if (existsEntry(metadata)) fs.rmSync(metadata, { recursive: true, force: true });
```

before it writes the failed journal state.

That cleanup is not ownership-safe and is not failure-isolated.

If the primary normalization operation fails, a Windows EPERM/EBUSY while removing the conversion-created managed repository can throw from rollback itself. That secondary cleanup exception then:

- masks the original normalization failure;
- prevents `failureReason` from being journaled;
- leaves the journal stuck at `normalizing`;
- may partially delete the conversion-created repository before failing.

The real filesystem state is consistent with exactly that class of failure: `.champcity/repository.git` survives as an empty directory while the original root Git remains authoritative.

The exact **primary** normalization failure cannot be recovered from the current evidence because rollback failed before recording it.

## Ownership defect in the same rollback block

The cleanup code also does not explicitly distinguish:

- a managed metadata directory created by the current conversion attempt; from
- pre-existing `.champcity/repository.git` residue that was never successfully relocated.

A failure before ownership transfer must never allow rollback to delete pre-existing metadata merely because the destination path exists.

This needs an explicit attempt-owned resource ledger rather than path-presence cleanup.

## Disposition

Repair03 itself is accepted.

The new EPERM is **not an EPGA-R03-01 implementer defect**. The failing cleanup/cutover behavior predates Repair03 and was not changed by that card.

The real ChampCity_AI conversion remains blocked.

Proceed with Repair04:

`Repair04/EPGA-R04-01_fence_git_authority_cutover_and_make_rollback_failure_safe.md`

Do not retry **Accept and Convert** until Repair04 is implemented and reviewed.
