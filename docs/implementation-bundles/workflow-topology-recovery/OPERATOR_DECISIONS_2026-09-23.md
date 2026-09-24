# Workflow Topology Recovery — Operator Decisions

**Date:** 2026-09-23  
**Status:** Governing decisions for WTR repair-card authoring

1. **Initial Workflow type set is accepted.** The initial canonical set is Project Creation / Greenfield, Feature / Capability, Refactor / Migration, Integration / Composition, Infrastructure / Platform, Research / Prototype, Issue Resolution, and Work Intake Routing. Future types may include UI Builder, Art Asset Creation, and Sound Studio.

2. **WIR owns no implementation SourceLine.** WIR persists routing state, creates the selected substantive Workflow, links provenance, and closes. The target Workflow owns any SourceBaseline, SourceLine, checkout, checkpoints, and integration.

3. **Existing repository onboarding uses one-time Existing Project Registration.** A repository with no current Structured Project State gets a lightweight Project registration Workspace, then enters the Workflow Hub. Old Workflow state is not imported.

4. **Project Creation / Greenfield is one-time per Project.** Subsequent work uses repeatable Workflow types.

5. **WTR milestones are not executable cards.** The roadmap remains milestone-oriented, but actual GPT 6.0 Luna Medium cards are smaller bounded subcards. Each card is implemented, validated, reported, committed, and Architect-reviewed before the next card is released.

6. **Substantive Workflows capture exact source baseline at creation and materialize source lazily.** An established Project records the exact current `dev` SourceRevision when the Workflow is created. A SourceLine/RepositoryCheckout is created only when the Workflow actually requires repository mutation. Research and similar Workflows may therefore close without a branch.

7. **Preferred physical Project layout uses a non-Git Project container.** Permanent sibling `Main/` and `Dev/` worktrees represent the two durable Project SourceLines. Application-managed Workflow checkouts live under `.champcity/checkouts/`. Shared Git metadata may live under `.champcity/repository.git/`.

8. **MCP Project workspace and Git repository are separate concepts.** MCP must expose a non-Git-backed Project container for normal file/repository tools. Git tools operate against an explicit Repository/RepositoryCheckout target.

9. **Greenfield Git bootstrap must establish normal `.gitignore` behavior.** Normal mechanical staging already respects `.gitignore`. New repository bootstrap must create/preserve a sensible repository `.gitignore` before the initial baseline commit rather than beginning from an ignore-less empty tree.

10. **Legacy Workflow instances are abandoned, not migrated.** There is no semantic migration/cutover obligation for in-progress old Workflows. Work that still matters is restarted as a new current Workflow, with old files used only as Evidence/context where useful.
