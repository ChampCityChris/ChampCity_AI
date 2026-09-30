# WRB01-R01-02 — Preserve Branch Semantics During Managed Repository Adoption

**Depends on:** WRB01-R01-01 checkpoint
**Implementer:** GPT 6.0 Luna Medium

## Objective
Make conventional repository adoption preserve not only file bytes and refs but the branch context to which dirty tracked/untracked working state belongs. Remove the unnecessary dev-already-exists gate for ordinary main-only repositories.

## 1. Preflight current checkout identity
Before any filesystem/Git mutation, inspect the exact conventional repository's current branch.

Supported adoption states:
- current branch main;
- current branch dev.

Detached HEAD or any other current branch must fail before mutation with bounded actionable state. Do not move its working-tree bytes into Main or Dev.

## 2. Preserve dirty state on the matching durable checkout
If current branch is main:
- create Main as the no-checkout/mixed-reset receiver;
- move the original working-tree source entries into Main;
- create Dev as the normal durable dev checkout.

If current branch is dev:
- create Dev as the no-checkout/mixed-reset receiver;
- move the original working-tree source entries into Dev;
- create Main as the normal durable main checkout.

Dirty tracked and untracked bytes must remain associated with the same branch identity after adoption. The other durable checkout must represent its own branch cleanly.

## 3. Main-only repository policy
main is required.

If dev is absent and current branch is main, create refs/heads/dev at the exact main revision in the copied managed metadata before materializing Dev. Do not mutate the original conventional .git before adoption succeeds. Verification may expect exactly this one added local ref; all pre-existing refs/remotes/tags must remain unchanged.

If dev is absent in any state where a deterministic main baseline cannot be proven, fail before source movement.

Do not create/rename main from master or another branch in this repair.

## 4. Rollback
Any failure before successful adoption must restore the original conventional repository and its source bytes. A newly created managed dev ref exists only in copied metadata and disappears with rollback. Checkout-registration failure after successful physical adoption may remain retryable through existingManaged, but must not corrupt source.

## 5. Permanent proof
Extend managed-project-source.test.cjs with at least:
- current main + existing dev + dirty/untracked → dirty state remains in Main;
- current dev + dirty/untracked → dirty state remains in Dev and Main reflects main;
- main-only repository → adoption creates dev at exact main revision and succeeds;
- current feature/other branch → fails before mutation and original .git/source/current branch remain unchanged.

Keep redirect/conflict/idempotent tests.

## Non-scope
Do not support arbitrary feature-branch adoption, create Workflow checkouts, alter Current Project identity, or implement WRB02.

## Report/checkpoint
Write Repair01/Reports/WRB01-R01-02_IMPLEMENTER_REPORT.md. Suggested commit: WRB01-R01-02 preserve managed adoption branch semantics. Then proceed directly to R01-03.