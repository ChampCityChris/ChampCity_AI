# WSF05A Implementer Report

Architecture Foundation Work Card WSF05A. Verified the approved Dev repository root from its AGENTS contract and WSF05 HEAD 97717e2. Branch dev; origin is the configured ChampCityChris/ChampCity_AI remote. No fetch, push, release, dependency change or SQLite migration. Checkpoint pending: `WSF05A add structured closeout review foundation`.

## Implemented boundary

Added one typed CloseoutReviewCycle for Project/Phase, with exact Workflow/target, scope, Close/DoNotClose, bounded rationale, semantic digest, and member/source revisions. closeout_review_for binds its exact typed target; governs supports exact Operator Decisions. Generic creation, revision, supersession, Decision recording/correction and relationship creation cannot impersonate the typed Closeout commands.

saveCloseoutCandidate captures current close eligibility and SQL evidence without closing anything. The identity remains stable across revisions; the new record version invalidates prior disposition. getCloseoutReview rematerializes the captured historical sources and effective exact-version disposition. recordCloseoutReview requires a human Operator, the exact candidate version, unchanged target/evidence/relationships, and current eligibility. Approval of Close writes the Decision, target lifecycle mutation, audit and outbox atomically. Approval of DoNotClose, rejection and revision requests preserve the open target.

The Workflow evidence digest includes exact source versions, membership/semantic relationships, candidate decision and rationale. Added evidence, changed target versions, changed source bindings and changed semantic membership invalidate freshness. Candidate/review commands compare captured evidence inside the write transaction. The terminal review tolerates only its own one-version target closure when checking the captured evidence; historical source revisions remain readable.

The deterministic Markdown view names target/version, decision/rationale, source revisions, Criterion/Validation/Tester/source/integration evidence and effective disposition. Its document is a PlanningDocumentDetail, directly usable by FigmaDocumentCard and its existing full-Markdown export action. Generated Markdown is non-authoritative; there is no Closeout file ingestion or required filesystem artifact.

The main application service and typed IPC/preload expose save/get/review. Structured Close / Advance rejects direct Greenfield Project/Phase closure; direct execution completion cannot close source-neutral Project Creation, and direct Phase completion cannot bypass review. WorkItem close is unchanged. Other-family renderer code is untouched.

Operator clarified source-backed ordering: Closeout review occurs after integration. Existing source preparation, checkpoint lineage and exact integration gates remain. Successful Project Creation integration returns the still-open Workflow to project-validation; only reviewed Closeout closes it. The owning Project remains active and registered, with structured provider authority. Other workflow families retain their integration closure behavior.

## Files

Created src/shared/projectState/closeoutReviewContracts.ts and closeoutReviewSnapshot.ts, and this report. Modified domainContracts.ts, entityTypeRegistry.ts, relationshipRegistry.ts and projectStateService.ts; main structuredCloseAdvanceService.ts and workflowApplicationIpc.ts; shared workspaceContracts.ts and preload/index.ts; existing domain-contracts and phase-planning-service tests. Added the active WSF05A card/audit to the checkpoint, including the Operator ordering clarification. No existing source/test deleted; no migration, generated Closeout, JSON authority sidecar, shell redesign, other-family renderer, dependency or generated build output created for commit. Other untracked bundle inputs and the prior WSF06 STOP report remain preserved.

## Validation

- `npm run typecheck`: restricted Windows lane, exit 0 for initial implementation.
- Initial focused planner/executor invocation through `node -e`: restricted Windows build returned spawn EPERM, downstream checks blocked. Recorded once; reran in the normal Windows lane. Initial normal receipt dda34048-d2a6-48ec-8a69-de31ddb71c7f passed its owned production build and seven focused files.
- `npm run validate:plan -- --profile work-item --changes tmp/wsf05a-changes.json`: exit 0, exact attributable production/test change set, 81 selected files. The first attempt to assemble that input with Node child_process hit spawnSync git EPERM; PowerShell's direct Git read assembled the same input successfully.
- `npm run test:affected -- --changes tmp/wsf05a-changes.json`: normal Windows lane, exit 1, receipt e31ceb93-42e3-4f60-9365-84f28c9a3fb2, 338792 ms. Owned production build passed; 598 passing, 20 failing, one skipped test. Four failed files: repository-io-hardening (one assertion), execution-completion (six source-neutral deterministic-proof failures), managed-project-source (seven Git-preparation failures), workflow-integration-service (six other-family integration failures). These suites were also reported by WSF03A; no claim that every individual failure has been independently baseline-isolated. No unrelated-family repair was attempted. This broader receipt is failed, not acceptance evidence.
- Final `node tmp/wsf05a-focused.cjs`: normal Windows lane, exit 0; receipt ca61277c-2f69-4821-9b1c-9ce01c72ab18. Executor-owned current production build and 41/41 tests across eight files passed: Phase close, Phase planning/SQL lifecycle, Project close, domain contracts, projection/export, SQLite store conformance, memory store conformance, document-card full content/export. This followed the final document-type/export shape and audit-field correction, plus additional target-staleness/nonhuman-review checks.
- Final exact affected-plan preview: same command above, exit 0. `git diff --check`: exit 0.

Extended existing semantic test owners; no new permanent test file or new test case count. The existing SQL completion fixture now exercises both source-neutral multi-Phase/multi-WorkItem/Repair traversal and real source-backed Git checkpoint/integration traversal through the reviewed boundary. It proves open-on-create, all three nonclosing dispositions, candidate revision invalidation, stale target and newly added evidence rejection, generic-decision and nonhuman approval rejection, exact peer ownership, injected transaction rollback of Decision plus closure, Project/Phase closure, direct-service bypass rejection, unchanged WorkItem close, active owning Project, no required Closeout Markdown and continued Project registration. Existing document-card tests prove full Markdown export and existing store suites prove transaction/version behavior.

## Safety and remaining work

Exact staged diff inspected; bounded secret/local-path/generated-artifact scan and staged diff check passed. Existing Markdown hard-break trailing spaces in the two newly tracked card inputs were normalized before the final check. No credentials or machine-specific paths added. Only attributable files are staged. The checkpoint hash is reported after commit rather than amending this report.

No WSF05A bundle stop condition remains. Continue WSF06, then sequential cards. Broader failed qualification remains open. Native Operator visual/experiential acceptance and complete Greenfield composition are WSF20 work; not claimed here.
