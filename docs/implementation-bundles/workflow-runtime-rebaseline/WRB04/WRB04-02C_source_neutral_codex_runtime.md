# WRB04-02C — Exact Source-Neutral Codex WorkItem Runtime

**Depends on:** completed WRB04-02B

## Objective

Add a `workflow-work-item` Codex/App Server execution mode for explicitly source-neutral WorkItems. Reuse transport, model selection, approval, event, and runtime mechanics while resolving all identity from the exact Current Project, Workflow, WorkItem, and execution contract.

## Architecture and constraints

The selector is `{ ownerKind: "workflow-work-item", workflowId, workItemId }`. Resolve exact current Workflow ownership, WorkItem eligibility/version, accepted solution/phase/criteria, contract digest, and typed executionRef through the shared application service. Feature and Issue share the selector/context path.

This card supports only contracts explicitly marked source-neutral. Reject any source-mutating request before App Server start. Keep Current Project container root distinct from worker working directory; never use the container as a fake source repository. Store one bounded application-owned attempt report/evidence packet per executionRef under `.champcity` runtime evidence. Parse and validate semantic completion, then use typed finish-attempt finalization. Do not promote implementation-local proof to ValidationCatalog.

Exact mode must bypass `getCurrentWorkspaceModel`, `resolveRoutedImplementerContext`, `resolveIssueFixCardCodexExecutionContext`, legacy Markdown discovery/report freshness, and legacy checkpoint capture/finalization. Keep existing legacy selector behavior unchanged pending WRB04-05.

## Acceptance

1. Exact Feature and Issue selectors resolve by canonical WorkItem ID, including same-title cases.
2. Ineligible items cannot start; source-mutating non-source work is rejected before the fake App Server is called.
3. Fake App Server tests prove exact prompt/context, distinct Current Project root and execution policy, and no legacy resolver invocation.
4. A valid source-neutral result writes one attempt packet, records the immutable ImplementationRecord, transitions to `validation_pending`, and returns checkpoint `not-required` without SourceCheckpoint/Git fabrication.
5. Partial/failed completion remains historical and does not become validation-ready.

## Validation and report

Run build, focused exact Codex adapter and typed-attempt tests, source-neutral proof, exact changed-path validation-plan preview, work-item profile, and `git diff --check`. Use injected fake App Server adapters; no live model call. Report test reuse/modification/addition and any coverage gap. Write the card-specific report and commit before proceeding to WRB04-02D.
