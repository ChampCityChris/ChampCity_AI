# Repository/release MCP execution clarification

Date: 2026-10-12

The Operator authorized execution of this bundle and clarified that repository and release capabilities are general infrastructure. Sosaria is the RMCP05 qualification case, not a restriction on product behavior.

The Operator also clarified that the LLM should handle access setup without requiring manual Trusted Local Git Root configuration for each repository. This supersedes the original bundle restriction that MCP must never add access roots.

RMCP01 therefore includes typed `inspect_local_git_access` and `configure_local_git_access` actions. Configuration uses the existing Operator-delegated `files.write` scope, an exact expected configuration digest, explicit add/remove semantics, and at most 32 canonical directories. The application owns and persists this policy outside repositories. Inspection/results expose counts and opaque configuration identities without filesystem paths. Root removal revokes subsequent handle access.

This amendment does not introduce an additional authority principal, per-repository approval gate, workflow registration prerequisite, generic shell, provider-token argument, or model-visible credential. Provider authentication remains application-managed. Provider/release behavior must remain independent of the source repository's workflow registration and hosting origin.

Affected MCP/runtime regression fixtures are maintained against current adopted checkout/runtime contracts during qualification. Obsolete fixtures must not cause restoration of implicit workspace Git targeting. Production workflow behavior remains outside this bundle's implementation scope. The affected Work Intake fixture now submits only current form fields; its source-ownership assertions remain intact, and no production workflow behavior changed.

## Repository Context Binding and Isolation

The Operator amended RMCP01 to require explicit repository selection for external Architects. Discovery remains independent of workflow registration. `select_repository_context` takes a discovered `repositoryHandle` and optional `localCheckoutHandle` or active `branchName`, returns verified available worktrees, selected checkout, active branch and HEAD, and never changes branches as a side effect of selection. Branch mutation remains a separate bounded Git action.

Context belongs to a transport-owned MCP session identity, never a model-supplied client name or session argument. Session operations serialize selection against Git execution. Routine local Git actions still require an explicit checkout handle from the selected repository. Selecting another repository is the only way to switch; failed selection clears the previous context. Existing registered Project/RepositoryCheckout contracts remain unchanged.

The existing `LocalGitRepositoryAccessService` owns this state and reuses its filesystem, Git identity and worktree verification. No new repository-management service, Git implementation, Project, intake, workflow, SQL Project State record or managed source layout is introduced. Routine results identify both selected and targeted checkout. Missing selection, repository mismatch and stale context have distinct errors. Movement, replacement, expiry, access revocation or removal of the selected checkout requires rediscovery and reselection; reconnecting starts without context. Rediscovery requirements belong to the affected session, and an intact sibling checkout selected by another session remains usable.
