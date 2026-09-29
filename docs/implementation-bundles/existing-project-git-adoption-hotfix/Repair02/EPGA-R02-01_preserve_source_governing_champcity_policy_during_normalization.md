# EPGA-R02-01 — Preserve Source-Governing ChampCity Policy During Forced Normalization

**Parent:** Existing Project Git Adoption Hotfix  
**Depends on:** EPGA Repair01 checkpoint `6200d383d61ff890d86492cb5ed6e3e17b3856d9`  
**Architect review:** `Repair01/EPGA_R01_ARCHITECT_REVIEW_2026-09-29.md`  
**Implementer:** GPT 6.0 Luna Medium

## Objective

Repair one blocking omission in Existing Project forced normalization:

`.champcity/integration-policy.json`

is source-governing repository configuration and must survive conversion into the new canonical Main/Dev baseline.

Continue excluding application-owned runtime state under `.champcity/`.

Do not broaden this card into another Git migration redesign.

## Root cause

The current converter preserves Project source with:

`copySourceContents(source, destination, sourceIsProjectRoot=true)`

which excludes the entire root `.champcity/` tree.

That is correct for application runtime state but incorrect for the repository-owned integration policy.

The new baseline therefore drops the exact file later required by:

- `loadIntegrationPolicy(repositoryRoot)`;
- `loadIntegrationPolicyAtCommit(repositoryRoot, targetCommit)`;
- exact Workflow integration and Integration Repair.

Because the repository `.gitignore` ignores `.champcity/`, merely copying the policy into the snapshot is insufficient. Baseline construction must deliberately force-add this exact source-owned path.

## 1. Define the source-owned ChampCity path

Reuse:

`INTEGRATION_POLICY_PATH`

from `src/shared/integrationPolicyContracts.ts`.

Do not duplicate the literal path in multiple migration functions when the shared contract already owns it.

For this repair, the only approved source-owned `.champcity` path is:

`.champcity/integration-policy.json`

Do not interpret the rest of `.champcity/` as source.

## 2. Preserve the policy in the source snapshot

When the selected Project source contains `.champcity/integration-policy.json`:

- accept only an ordinary non-symlink file;
- enforce the existing integration-policy size bound;
- copy exact bytes into the preservation snapshot at the same repository-relative path;
- do this even when the general source copy excludes `.champcity/`.

If the file is absent:

- conversion remains valid for Projects that do not define an integration policy unless another existing product contract requires one;
- do not fabricate a policy.

If the path exists but is redirected, oversized, or unreadable:

- fail conversion before destructive normalization;
- preserve the original Project/Git authority.

## 3. Include it in the canonical baseline

The baseline builder must force-add the exact source-owned policy path when present in the snapshot.

This is required because the repository ignore rules may contain:

`.champcity/`

Do not make all `.champcity` paths eligible.

Required result:

```text
baseline tree
  .champcity/integration-policy.json
```

with exact preserved bytes.

## 4. Keep runtime state out of source

Prove the canonical baseline does **not** acquire application runtime state such as:

- `.champcity/project-state.sqlite`;
- `.champcity/repository.git/**`;
- `.champcity/checkouts/**`;
- `.champcity/migrations/**`;
- runtime attempt/evidence files;
- other arbitrary Project-local ChampCity state.

Only the explicitly source-owned policy path is admitted by this repair.

## 5. Main/Dev and Project-container result

After successful conversion:

- Main baseline contains the policy;
- Dev baseline contains the policy;
- `git show <baseline>:.champcity/integration-policy.json` returns the preserved bytes;
- the Project-container `.champcity` tree may continue to hold application-owned state;
- do not move Project State into Dev source.

Do not create a second policy authority.

The repository/commit copy is the source-governing policy used by integration.

## 6. Prove the real consumer

Add focused proof using the production integration-policy reader.

After converting a ChampCity-style fixture:

- obtain the baseline revision;
- call `loadIntegrationPolicyAtCommit(devRoot, baselineRevision)`;
- prove the policy parses and contains the expected required integration check.

This is stronger than only asserting that a file exists.

## 7. Unreadable-old-Git fallback

When old Git administration is partially or fully unreadable but current Project files are readable:

- if the known integration-policy file exists at the selected Project source path, preserve it into the fresh managed baseline;
- this must not depend on `git ls-files` successfully reporting it as tracked.

The forced-normalization fallback must therefore still produce a usable integration policy for ChampCity_AI-style source.

## Permanent proof

Use the existing managed-project-source test owner.

At minimum prove:

1. ChampCity-style conversion preserves exact `.champcity/integration-policy.json` bytes;
2. baseline commit contains the policy despite `.champcity/` ignore rule;
3. Main checkout contains the policy;
4. Dev checkout contains the policy;
5. `loadIntegrationPolicyAtCommit(Dev, baseline)` succeeds;
6. expected integration check is present after parsing;
7. `.champcity/project-state.sqlite` is not committed;
8. migration journal/repository/checkouts are not committed;
9. unreadable old Git fallback still preserves the known policy file;
10. a redirected/oversized policy fails before destructive normalization;
11. Projects without the policy still follow the existing conversion contract;
12. reopen remains `managed-ready` and idempotent.

## Validation

Run only focused validation:

- build;
- `test/source-control/managed-project-source.test.cjs`;
- exact integration-policy provider test owner if one exists and is directly affected;
- Current Project entry test if production entry code changes;
- capability-map integrity if test ownership changes;
- migration validation-plan preview;
- `git diff --check`.

Do not run broad unrelated regression as the completion gate.

## Report

Write:

`docs/implementation-bundles/existing-project-git-adoption-hotfix/Repair02/Reports/EPGA-R02-01_IMPLEMENTER_REPORT.md`

The report must state:

- source-owned `.champcity` path policy;
- exact baseline preservation proof;
- production `loadIntegrationPolicyAtCommit` proof;
- runtime-state exclusion proof;
- unreadable-Git fallback proof;
- focused validation results.

## Checkpoint and STOP

Commit:

`EPGA-R02-01 preserve integration policy during Git normalization`

Then STOP for Architect review.

Do not convert the real ChampCity_AI Project until this Repair02 implementation is reviewed and accepted.
