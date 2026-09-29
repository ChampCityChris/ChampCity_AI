# EPGA-R01-02 Final Report

## Scope and repository verification

- Card: Repair Card `EPGA-R01-02 — Simple Warning and Real-Project Qualification`.
- Approved repository root: verified as `<PROJECT_REPO>`.
- Branch: `dev`.
- Remote: `origin` is configured; the local branch was 177 commits ahead of `origin/dev` at Repair02 start.
- Dependency checkpoint: `621297c` (`EPGA-R01-01 force normalize existing Git into ChampCity topology`).

## Files

Created:

- `docs/implementation-bundles/existing-project-git-adoption-hotfix/Repair01/Reports/EPGA-R01-02_FINAL_REPORT.md`

Modified in the Repair02 qualification pass:

- `test/project-state/current-project-entry.test.cjs`
- `test/source-control/managed-project-source.test.cjs`
- `validation/capability-map.json`

Deleted: none.

Intentionally not created or changed:

- no third warning action, manual-repair route, source-neutral fallback, branch selector, Workflow reconstruction, dependency, schema, Feature/Issue workspace convergence, or WRB05 work;
- no new production mutation was required after the passing Repair01 implementation checkpoint.

## Exact warning and interaction

The landing warning is:

> **Convert this project for ChampCity source control?**
>
> ChampCity A/I needs to reorganize this project's Git repository into the source-control layout used by the application. This conversion may change or damage the project's existing Git branch, worktree, and repository configuration.
>
> ChampCity will preserve the current project files and will retain readable Git history where possible. After conversion, ChampCity's managed Git layout becomes authoritative for this project.
>
> If you want to preserve or manually reorganize the current Git repository first, choose Cancel.

Actions are exactly **Accept and Convert** and **Cancel**. Accept shows the bounded `Converting...` busy label, applies one exact inspected plan, registers/reopens Current Project only after source success, and enters the Workflow Hub route. Cancel clears the selected workspace and performs neither conversion nor Current Project registration.

No branch name, detached-state diagnostic, worktree repair guidance, merge/conflict plan, malformed-Git message, or manual-intervention path is rendered in the warning.

## Qualification results

### ChampCity-style fixture

PASS. The curated fixture uses current branch `dev`, existing `main` and `dev`, an additional historical branch, six accumulated application-history commits, an `origin` remote, and an `origin/dev` tracking ref. Inspection returns `conversion-required`, never the prior malformed-metadata failure. Conversion preserves readable history and the tracking ref as import evidence, creates one canonical baseline, and reopens `managed-ready`.

### Arbitrary, detached, and missing-ref variants

- Arbitrary `feature/arbitrary`: PASS; warning and forced conversion reached.
- Detached HEAD: PASS; warning and forced conversion reached.
- Missing `main`: PASS; warning and forced conversion reached.
- Missing `dev`: PASS; warning and forced conversion reached.

All four produce exact canonical `main` and `dev` after acceptance.

### Dirty, untracked, and ignored preservation

PASS. Dirty tracked content and non-ignored untracked source are present in the canonical baseline tree. Ignored local bytes survive in `Dev`, remain absent from the baseline commit, and do not leave tracked checkout dirtiness. Repository-local automatic CRLF rewriting is disabled so the accepted source bytes do not appear spuriously modified on Windows.

### Divergent branches

PASS. Unique readable `main`, `dev`, and feature tips become parents of one synthetic baseline commit. The accepted current source tree wins directly; no ordinary merge, file conflict, branch repair, or conflict blocker occurs. The readable feature ref remains available.

### Linked worktree and submodule/alternate metadata

PASS. Extra linked-worktree metadata does not block the selected Project. Submodule declaration and object-alternate metadata are treated as import evidence; current Project source still converts. Old branch/worktree administration is no longer authoritative after success.

### Unreadable Git fallback

PASS. Both a repository with a malformed local ref and a fully foreign/unreadable `.git` administration directory reach the warning and complete with a fresh managed baseline. Current source bytes survive. Readable refs are retained when individual import succeeds; unreadable metadata does not block source conversion.

### Previous partial migration residue

PASS. Pre-existing `Main`, `Dev`, and `.champcity/repository.git` residue is relocated into the application-owned migration recovery directory before canonical destinations are created. The selected current source becomes authoritative and the relocated user bytes remain recoverable.

### Main/Dev baseline and root authority

PASS. `main` and `dev` resolve to the same new baseline revision. `Main` and `Dev` are exact worktrees sharing `.champcity/repository.git`, RepositoryCheckout identities register deterministically, and no root `.git` remains authoritative.

### Product entry and reopen

PASS. The real renderer entry controller was executed over the constrained preload/main handlers and real adoption, Agent Harness, Project State, and checkout-registration services:

```text
inspect selected Git Project
→ one consent-required result
→ Accept and Convert
→ forced normalization
→ one Current Project registration
→ Workflow Hub route contract
```

The same Project was then inspected and opened again:

```text
managed-ready
→ ready result
→ same Current Project identity
→ no conversion warning
→ Workflow Hub route contract
```

No historical Work Intake or Workflow was reconstructed.

### Remaining legitimate blockers

Conversion can still fail when the selected source directory cannot be read, application-owned source staging cannot be created or copied, managed repository/checkouts cannot be written, a filesystem failure prevents a provably recoverable source copy, or conflicting destination content cannot be relocated safely. The pre-mutation staging-failure fixture proves that source and original Git remain unchanged when preservation cannot begin.

## Validation evidence

| Command | Lane | Result |
| --- | --- | --- |
| `npm run build` | normal Windows production build | PASS, exit 0; TypeScript, Vite production bundle (1,666 modules), and branding copy completed. Existing chunk-size warning only. |
| `node --test test/source-control/managed-project-source.test.cjs` | normal Windows realistic forced-normalization integration | PASS, 10/10, exit 0; 61.579 s. |
| `node --test test/project-state/current-project-entry.test.cjs` | normal Windows controller/preload/main/Project State/Hub-route integration | PASS, 13/13, exit 0; 30.539 s. |
| `node --test test/renderer/workflow-hub-shell.test.cjs` | normal Windows rendered warning/controller/Workflow Hub capability | PASS, 23/23, exit 0; 0.839 s. |
| `node --test test/app-shell/app-shell.test.cjs` | normal Windows application-shell regression | PASS, 11/11, exit 0. |
| `node --test test/validation/capability-map.test.cjs` | normal Windows validation integrity | PASS, 5/5, exit 0. |
| `npm run test:migration -- --preview` | normal Windows migration validation-plan preview | PASS, exit 0; migration lane and production-build ownership resolved. |
| `npm run test:desktop -- --preview` | normal Windows desktop-platform availability preview | Preview completed. The broad 11-test desktop lane reports missing `git-cli` capability for two unrelated entries, so it is not a supported complete smoke/acceptance lane for this card and was not represented as a pass. |
| `git diff --check` | read-only Git hygiene | PASS, exit 0. |

The deterministic controller-to-main integration is the available product-path acceptance for this card. No live Electron-window or Operator visual acceptance is claimed.

## Git and safety

- Repair01 checkpoint: `621297c`.
- Required Repair02 checkpoint: pending at report creation; the actual hash is reported after commit and is intentionally not amended into this same artifact.
- Push, merge, rebase, tag, reset, clean, restore, and stash: not performed.
- Secret scan: no credentials, tokens, private keys, cookies, `.env` content, or secret-shaped additions found.
- Local-path scan: no concrete local-machine path is persisted; durable references are repository-relative or use `<PROJECT_REPO>`.
- Generated output and dependency state remain outside source control.

## Stop disposition

EPGA-R01-01 and EPGA-R01-02 are complete. Stop for Architect review. Do not begin workspace convergence or WRB05.
