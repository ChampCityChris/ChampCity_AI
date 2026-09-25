# WRB01-03 — Establish Greenfield Source Bootstrap and Gitignore Baseline

**Implementer:** GPT 6.0 Luna Medium
**Bundle:** WRB01 — Current Project Runtime Foundation
**Execution:** sequentially released; no Architect review required before the next WRB01 card unless a bundle-level blocker is encountered.

Every card requires focused validation, an Implementer Report, one attributable checkpoint commit, then continuation to the next released card. Do not run the broad historical full suite unless selected by the affected-validation planner.

## Depends on
WRB01-02 checkpoint.

## Outcome
Replace Project-root Git bootstrap with Greenfield bootstrap into the managed Repository/Main/Dev topology and establish ordinary .gitignore behavior from the first source revision.

## Required behavior
- Refactor projectSourceBootstrap to target the managed repository metadata/Main/Dev topology rather than initializing .git at Project root.
- Greenfield bootstrap creates deterministic initial main revision and dev integration line using the established managed topology.
- The initial tracked tree includes a normal repository-root .gitignore in Main/Dev source, not an application-side ignore substitute.
- Baseline .gitignore must at minimum exclude ChampCity machine/runtime state that can appear inside source checkouts and ordinary dependency/build artifacts already established by repository policy. Reuse existing repository ignore policy if present; do not invent a giant language-specific template.
- Main and Dev begin from the same initial revision.
- Register Main/Dev checkout descriptors through the WTR02D path.
- Project root remains non-Git.

## Idempotence
Reopening an already-compatible Greenfield bootstrap succeeds without new commits. Conflicting history/topology fails closed.

## Focused proof
Prove empty Project bootstrap, deterministic initial revision, Main/Dev sibling checkouts, Project root non-Git, .gitignore tracked from baseline, ignored files do not appear in status, ordinary non-ignored files do appear, reopen is idempotent, and conflicting preexisting source fails without overwrite.

## Non-scope
Do not create Project Creation Workflow/intake UI, Workflow SourceLines, or migrate existing repository ignore rules beyond preserving them.

## Report and checkpoint
Write Reports/WRB01-03_IMPLEMENTER_REPORT.md. Suggested commit: WRB01-03 establish greenfield managed source baseline.