# EPGA-HF03 — Landing Migration Consent and End-to-End Qualification

**Parent:** Existing Project Git Adoption Hotfix  
**Depends on:** EPGA-HF02 passing checkpoint/report  
**Implementer:** GPT 6.0 Luna Medium

## Objective

Wire Existing Project Git adoption into the actual landing-page product path and prove that a user can open, migrate, reopen, and continue using a real Git-backed Project.

This card owns:

- landing inspection/application orchestration;
- migration warning with Accept/Cancel;
- Current Project registration after migration;
- end-to-end Existing Project qualification.

Do not add Workflow or governance semantics.

## 1. Replace the current direct register call

Current landing flow:

```text
chooseWorkspaceFolder
→ registerCurrentProject("existing")
→ fatal topology guard
```

Replace with:

```text
chooseWorkspaceFolder
→ inspect Existing Project Git adoption
→ source-neutral / managed-ready / conventional-auto
      → apply safe adoption when needed
      → register Current Project
      → Workflow Hub
→ migration-consent-required
      → render migration warning
      → Accept or Cancel
→ resumable-partial
      → resume safe migration
      → register Current Project
      → Workflow Hub
→ manual-intervention-required
      → show exact diagnostic
      → no Project/source mutation
```

## 2. Add typed preload/IPC entry points

Expose bounded actions equivalent to:

- `inspectExistingProjectGitAdoption()`
- `applyExistingProjectGitAdoption(planId)`

The selected workspace root remains main-process authority.

Renderer never supplies filesystem paths, branch refs, commit IDs, merge strategies, or working-file inventories.

## 3. Migration warning

When `requiresConsent = true`, render one clear warning surface on the landing page.

Use the existing landing/action visual language.

Do not use a raw browser confirm box.

The warning shows only bounded migration facts:

- current branch;
- proposed main baseline action;
- proposed dev action;
- whether active branch will be integrated into dev;
- staged/unstaged/untracked counts;
- whether non-ignored working changes will be captured in an adoption snapshot;
- preserved refs/history/remotes statement;
- manual conflict fallback statement.

Example language:

```text
ChampCity needs to migrate this Git repository into its managed project layout.

Your Git history, branches, tags, remotes, and working files will be preserved.

Proposed changes:
• main: create from master at <short revision>
• dev: create from main, then integrate feature/current
• working changes: capture 4 non-ignored files in the adoption baseline

ChampCity will not merge unrelated branches or discard conflicts.
```

Actions:

- **Accept Migration**
- **Cancel**

## 4. Accept behavior

Accept:

1. disables duplicate action while pending;
2. calls apply with exact current planId;
3. if plan is stale, refresh inspection and require renewed consent;
4. on migration success, call Current Project registration;
5. activate Workflow Hub.

Do not ask for another Operator approval after migration succeeds.

## 5. Cancel behavior

Cancel:

- performs no migration;
- performs no Current Project registration;
- clears pending migration plan;
- returns to ordinary landing state.

The user may manually merge/commit/normalize Git and retry.

## 6. Automatic behavior

No warning is shown for:

- source-neutral project;
- already managed-ready project;
- conventional-auto migration;
- exact resumable-partial recovery where no new semantic source decision is required.

Routine topology mechanics remain application-owned.

## 7. Manual-intervention presentation

For a manual state:

- show concise exact reason;
- state that no source migration was applied;
- preserve selected-folder context only as transient UI feedback;
- provide no “force open as source-neutral” escape hatch.

Examples:

- additional linked worktrees must be normalized manually;
- submodule/alternate topology unsupported;
- active merge conflict requires manual Git resolution;
- managed and conventional repository identities conflict.

## 8. Existing Project registration

After source adoption succeeds:

- register Current Project once;
- attach canonical Repository ProjectResource for Git-backed Project;
- do not reconstruct historical Workflow state from Markdown;
- go directly to Workflow Hub.

For source-neutral Existing Project:

- register without Repository ProjectResource;
- go directly to Hub.

## 9. Reopen idempotency

Close/reopen the application and select the same migrated Project.

Expected:

- inspection = managed-ready;
- no migration warning;
- no Git rewrite;
- same Project identity;
- same Repository identity;
- same Main/Dev checkout identities;
- Workflow Hub opens.

Repeated opens must remain idempotent.

## 10. Realistic migration fixtures

Use curated fixtures representing ordinary user repositories, not only pristine synthetic layouts.

At minimum:

### Fixture A — clean conventional main

- main + dev;
- remote;
- tags/extra branches;
- opens with no warning if no semantic normalization needed.

### Fixture B — dirty dev

- tracked dirty + untracked;
- migration warning because working state will be captured;
- Accept preserves bytes and reaches Hub.

### Fixture C — active feature branch

- main/dev exist;
- feature contains commits beyond dev;
- warning shows active-branch → dev integration;
- Accept migrates and reaches Hub.

### Fixture D — active feature merge conflict

- warning;
- Accept attempts bounded migration;
- merge conflict returns manual state;
- original authoritative source remains intact.

### Fixture E — no main branch

- master/default branch exists;
- warning proposes main creation at exact revision;
- Accept preserves master and creates main/dev topology.

### Fixture F — interrupted prior ChampCity migration

- known partial managed state from HF02 journal/stages;
- Open Existing Project resumes automatically;
- reaches Hub.

### Fixture G — already managed

- opens Hub directly and changes no Git state.

## 11. Product-level acceptance

The qualification must exercise the actual landing orchestration rather than only calling the source service directly.

Prove:

```text
launch/landing state
→ choose Existing Project
→ inspect
→ migrate/confirm when needed
→ Current Project registration
→ Workflow Hub
```

Then reopen the same Project and prove direct managed reopen.

If Electron window automation is unavailable, exercise the renderer/controller + actual IPC/service boundary deterministically and state the visual limitation exactly.

## 12. Regression protection

Preserve:

- Start New Project greenfield flow;
- non-Git Existing Project registration;
- existing Project source-neutral behavior;
- no historical Workflow reconstruction;
- exact RepositoryCheckout registration;
- Work Intake/Workflow Hub behavior after project opens.

## Validation

Run:

- build;
- Existing Project entry tests;
- managed-project-source migration/recovery tests;
- landing renderer/controller tests;
- actual IPC/preload migration path tests;
- registration retry/idempotency tests;
- migration-profile validation plan;
- supported desktop smoke if available;
- `git diff --check`.

Do not use a broad unrelated full suite as the acceptance gate.

## Final report

Write:

`docs/implementation-bundles/existing-project-git-adoption-hotfix/Reports/EPGA-HF03_FINAL_REPORT.md`

Include:

- migration-state matrix;
- warning/consent behavior;
- refs/remotes/history preservation;
- branch normalization results;
- dirty working-state results;
- partial migration recovery;
- Cancel/no-mutation proof;
- stale-plan rejection;
- registration/Hub result;
- reopen/idempotency result;
- unsupported/manual states;
- desktop evidence/limitations.

## Checkpoint and STOP

Commit:

`EPGA-HF03 complete Existing Project Git adoption hotfix`

Then STOP for Architect review.

Do not start WRB04 workspace convergence or WRB05.
