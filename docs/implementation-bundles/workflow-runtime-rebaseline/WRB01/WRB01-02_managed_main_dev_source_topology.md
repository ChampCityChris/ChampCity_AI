# WRB01-02 — Materialize Managed Project/Main/Dev Source Topology

**Implementer:** GPT 6.0 Luna Medium
**Bundle:** WRB01 — Current Project Runtime Foundation
**Execution:** sequentially released; no Architect review required before the next WRB01 card unless a bundle-level blocker is encountered.

Every card requires focused validation, an Implementer Report, one attributable checkpoint commit, then continuation to the next released card. Do not run the broad historical full suite unless selected by the affected-validation planner.

## Depends on
WRB01-01 checkpoint.

## Outcome
Implement the physical source topology already defined by WTR02C/D so the Project root is a non-Git container and Main/Dev are durable sibling RepositoryCheckouts.

## Target topology
Project/
  Main/
  Dev/
  .champcity/repository.git/
  .champcity/checkouts/

## Required behavior
- Add one application-owned topology establishment service using MANAGED_PROJECT_SOURCE_PATHS and RepositoryCheckout contracts.
- For an existing Git repository selected for registration, establish/normalize the managed topology without losing commits, refs, remotes, tracked files, or untracked user content. If safe mechanical normalization cannot be performed, fail with bounded actionable state; never silently copy/delete user source.
- For an already-managed Project, operation is idempotent.
- Repository common metadata belongs at .champcity/repository.git; Main checks out main; Dev checks out dev.
- Main and Dev must be distinct exact Git working-tree roots under the Project container.
- Register Main and Dev RepositoryCheckout descriptors through the WTR02D application control path after they exist.
- Project root itself must not be a Git working tree after successful managed establishment.
- Workflow checkout root may exist but no Workflow checkout is created.

## Existing repository rules
- Preserve repository history/remotes/config required for normal operation.
- Do not invent main/dev history. Existing valid main/dev refs are retained. If dev is absent, bounded policy may create dev from the selected integration baseline only when the operation can prove the intended base; document the exact rule.
- Dirty state is not an authority gate. Do not reject Project registration merely because a checkout contains user changes. Physical moves must preserve them or fail before mutation.

## Focused proof
Use disposable Git fixtures to prove: conventional repository normalization; managed idempotent reopen; Main/Dev exact roots; Project root non-Git; refs/history/remotes preserved; dirty/untracked content preserved; checkout registrations available through Agent Harness; no Workflow checkout created; unsafe redirect/conflict fails without partial destructive state.

## Non-scope
Do not implement Greenfield initial commit/.gitignore policy beyond topology prerequisites, Workflow source materialization, Workflow Hub, or legacy runtime retirement.

## Report and checkpoint
Write Reports/WRB01-02_IMPLEMENTER_REPORT.md. Suggested commit: WRB01-02 establish managed Main Dev topology.