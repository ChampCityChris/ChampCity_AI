# EPGA-R01-02 — Simple Warning and Real-Project Qualification

**Parent:** Existing Project Git Adoption Hotfix / Repair01  
**Depends on:** EPGA-R01-01 passing checkpoint/report  
**Implementer:** GPT 6.0 Luna Medium

## Objective

Replace the current migration-state presentation with one simple conversion warning for Git-backed Existing Projects, then prove the complete product path using a repository shaped like ChampCity A/I itself.

This card must not reintroduce Git-state troubleshooting into the landing page.

## 1. Landing behavior

For a selected Existing Project:

### source-neutral

- register as Existing Project without Repository source;
- open Workflow Hub.

### managed-ready

- reopen managed source idempotently;
- register/reopen Current Project;
- open Workflow Hub.

### conversion-required

Show one warning box.

Do not show Git repair diagnostics, branch-state remediation instructions, or a list of conditions the user must fix before opening the Project.

## 2. Warning content

The warning should communicate only the material consequence.

Use wording equivalent to:

> **Convert this project for ChampCity source control?**
>
> ChampCity A/I needs to reorganize this project's Git repository into the source-control layout used by the application. This conversion may change or damage the project's existing Git branch, worktree, and repository configuration.
>
> ChampCity will preserve the current project files and will retain readable Git history where possible. After conversion, ChampCity's managed Git layout becomes authoritative for this project.
>
> If you want to preserve or manually reorganize the current Git repository first, choose Cancel.

Actions:

- **Accept and Convert**
- **Cancel**

Do not add a third "try anyway", "manual repair", "open source-neutral", or branch-selection path.

## 3. Accept behavior

On Accept:

- invoke the exact application-owned forced normalization operation;
- do not ask for another Git approval;
- display one bounded progress/busy state;
- on success:
  - register/reopen Current Project;
  - enter Workflow Hub.

If conversion fails because actual source preservation or destination filesystem work could not complete:

- show the concrete conversion failure;
- do not describe ordinary Git topology as something the user needs to repair;
- retain recovery state/source backup where the backend created it.

## 4. Cancel behavior

Cancel:

- performs no conversion;
- performs no Current Project registration;
- returns to the landing state.

The user can make any manual Git changes they want outside ChampCity and retry later.

## 5. Remove conservative renderer behavior

Delete/supersede UI/controller handling that exposes states such as:

- manual-intervention-required;
- resumable-partial as a user decision;
- malformed Git;
- detached HEAD;
- additional linked worktrees;
- submodule/alternate normalization instructions;
- conflicting branch repair guidance.

Those are no longer product entry states.

Backend diagnostics may remain in logs/receipts where useful, but they do not become admission UX.

## 6. Use the current ChampCity repository shape as a mandatory qualification fixture

Create a curated fixture matching the important characteristics of the actual ChampCity_AI repository at the time of this repair:

- current branch `dev`;
- `main` exists;
- `dev` exists;
- additional historical/work branch refs exist;
- normal origin tracking exists;
- one ordinary primary worktree;
- repository has accumulated real application history rather than a pristine two-commit synthetic shape.

The prior screenshot failure:

`Conventional Git metadata is malformed or could not be inspected. No source migration was applied.`

must be impossible for this fixture.

## 7. Product-level end-to-end acceptance

Prove the actual entry sequence:

```text
landing
→ Open Existing Project
→ choose Git-backed Project
→ conversion warning
→ Accept and Convert
→ forced normalization
→ Current Project registration
→ Workflow Hub
```

Then prove:

```text
close/reopen
→ Open Existing Project
→ same Project
→ managed-ready
→ no conversion warning
→ Workflow Hub
```

## 8. Required realistic variants

In addition to the ChampCity-style fixture, exercise:

1. arbitrary current feature branch;
2. detached HEAD;
3. missing main;
4. missing dev;
5. dirty tracked files;
6. non-ignored untracked source;
7. ignored local files;
8. multiple divergent local branch tips;
9. extra linked worktree metadata;
10. partially unreadable old Git metadata with readable Project files;
11. previous partial ChampCity migration residue.

Every case should reach the warning and conversion path unless actual source preservation cannot be performed.

## 9. Source/history verification after conversion

For successful conversions prove:

- Project source bytes required for the current working Project survived;
- canonical baseline tree represents the accepted current Project source;
- `main` points to canonical baseline;
- `dev` points to canonical baseline;
- readable prior refs/history remain available where import succeeded;
- unreadable legacy Git did not block fresh managed baseline creation;
- Main/Dev exact managed checkout identity is valid;
- Project root no longer uses the old Git state as source authority.

## 10. Regression protection

Preserve:

- Start New Project behavior;
- source-neutral Existing Project behavior;
- already-managed Existing Project reopen;
- no historical Workflow reconstruction;
- exact Current Project/Repository identity registration;
- Workflow Hub entry after Project open.

Do not touch Feature/Issue workspace convergence or WRB05 in this card.

## Validation

Run:

- build;
- focused Existing Project entry tests;
- forced-normalization tests from R01-01;
- landing/controller tests;
- preload/main IPC tests;
- Workflow Hub entry tests;
- capability-map integrity;
- migration validation-plan preview;
- supported desktop smoke if available;
- `git diff --check`.

Do not use broad unrelated full regression as the completion gate.

## Final report

Write:

`docs/implementation-bundles/existing-project-git-adoption-hotfix/Repair01/Reports/EPGA-R01-02_FINAL_REPORT.md`

The report must explicitly state:

- exact warning text/interaction;
- ChampCity-style fixture result;
- arbitrary/detached/missing-main/missing-dev results;
- dirty/untracked/ignored preservation result;
- divergent-branch normalization result;
- unreadable-Git fallback result;
- Main/Dev baseline result;
- reopen/idempotency result;
- any real source-preservation failure still capable of blocking conversion.

## Checkpoint and STOP

Commit:

`EPGA-R01-02 complete warned forced Git normalization`

Then STOP for Architect review.

Do not begin workspace convergence or WRB05.
