# WIR23-REPAIR03C-REPAIR04 Implementer Report

## Outcome and repository evidence

Architecture / Performance Repair Work Card `WIR23-REPAIR03C-REPAIR04` is complete.

- Verified the approved repository root and Git top-level as `<PROJECT_REPO>`.
- Branch: `dev`; `origin` is configured. No fetch or remote-freshness claim was made.
- The starting worktree contained unrelated and predecessor-card changes, including existing routed-candidate selection changes in `routedIntegrationService.ts`. They were preserved and are not attributed to this card.

## Implementation

- Added `inspectGitPosition(root)` for receipt branch+exact-HEAD observation only. It runs current-branch and HEAD resolution and does not enumerate local branches, upstream, ahead/behind, or remotes.
- SourceControl receipts retain unchanged before/after shape and meaning while using the lightweight position primitive.
- Successful exact repository-root verification is retained in one promise per `SourceControlService` instance. Concurrent calls share it; failure clears it and is never converted into success. No process-global or cross-service cache exists.
- Added the read-only `history-with-messages` SourceControl operation. It accepts at most 100 commits, uses one bounded Git log observation, validates exact commit and parent IDs, caps total output at 500,000 bytes, and caps each commit message at 20,000 bytes.
- Work Intake checkpoint verification and routed Plan/Research checkpoint scans now parse the batched messages rather than issuing one full SourceControl `commit-message` operation per commit.
- Research checkpoint scanning consumes the binding already verified by `resolveResearchCompletion()` during the same query. A checkpoint mutation still triggers the existing fresh query and verification.
- Lower-level integration checkout, exact-ref, merge-base, merge, candidate commit, and target advancement checks were not changed.

## Attributable files

Modified production:

- `src/main/agentHarness/repository/gitMutations.ts`
- `src/main/sourceControl/sourceControlService.ts`
- `src/shared/sourceControlContracts.ts`
- `src/main/workIntake/workIntakeBranchService.ts`
- `src/main/planExecution/routedIntegrationService.ts`

Modified tests/support and metadata:

- `test/agent-harness/source-control-service-boundary.test.cjs`
- `test/support/integration-semantics.cjs`
- `validation/capability-map.json`

Created:

- `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR23-REPAIR03C-REPAIR04_IMPLEMENTER_REPORT.md`

Deleted: none. Intentionally not created or changed: dependencies, migrations, schemas outside the SourceControl operation union, validation budgets, target-advance policy, Research completion semantics, IntegrationCandidate status semantics, Integration Repair semantics, or archive material.

## Operation-count evidence

The focused normal successful `status()` proof measured:

- first call on one service instance: 6 instrumented bounded-Git calls;
- subsequent call on the same instance: 5 instrumented bounded-Git calls.

From the prior implementation's command structure, the equivalent counts were 13 and 11 respectively: each receipt position performed current branch, all-local-branch inventory, upstream observation, HEAD, and remotes, while first-call verification also repeated on every later operation. The focused result is therefore 13 to 6 for the initial operation and 11 to 5 thereafter. The full owner separately confirms that explicit `branches()` still returns branch, selected upstream/divergence, and remote fields.

Checkpoint messages changed from one `history()` operation plus one receipt-wrapped `readCommitMessage()` SourceControl operation per commit to one receipt-wrapped `historyWithMessages()` operation for the complete bounded lineage. Base ancestry remains a separate exact history observation.

## Validation record

| Exact command | Execution lane | Result |
| --- | --- | --- |
| `npm run typecheck` | Restricted Windows | Exit 0. |
| `npm run build` | Restricted Windows | Exit 1 at Vite/esbuild with documented `spawn EPERM`; not a source failure or pass. |
| `npm run build` | Approved normal Windows | Exit 0; TypeScript, Vite renderer, and branding copy completed. |
| `node --require ./scripts/validation/child-cleanup.cjs --test --test-concurrency=1 --test-reporter=tap test/agent-harness/source-control-service-boundary.test.cjs` | Approved normal Windows | Initial focused expectation reported measured 6 rather than estimated 7; expectation corrected. Final exit 0; 1/1 passed in 12.076 seconds. Full owner telemetry: 204 bounded Git calls. |
| `node --require ./scripts/validation/child-cleanup.cjs --test --test-concurrency=1 --test-reporter=tap test/agent-harness/source-checkpoint-boundary.test.cjs` | Approved normal Windows | Exit 0; 2/2 passed in 63.403 seconds. |
| `node --require ./scripts/validation/child-cleanup.cjs --test --test-concurrency=1 --test-reporter=tap test/agent-harness/work-intake-branch-boundary.test.cjs` | Approved normal Windows | Exit 0; 1/1 passed in 17.805 seconds. |
| `node --require ./scripts/validation/child-cleanup.cjs --test --test-concurrency=1 --test-reporter=tap test/characterization/routed-integration-focus.test.cjs` | Approved normal Windows | Exit 0; 3/3 passed in 15.152 seconds; telemetry: 92 bounded Git calls, 90 fixture Git calls, 2 checkouts. |

The capability map was refreshed only with these measured full-file durations. No full regression, packaging, Desktop launch, visual acceptance, or external integration validation was in scope.

## Git, security, and residual risk

No product-repository Git mutation was authorized or performed. Git mutations exercised by tests were confined to disposable repositories. No secrets, credentials, concrete local-machine paths, generated output, dependency state, or unrestricted filesystem access were introduced. The actual commit hash is not applicable because no commit was directed.

Remaining amplification is operation-specific safety work and the deliberately retained before/after receipt positions. Full branch inventory still occurs when explicitly requested by `branches()` or readiness. No Operator manual validation remains for this non-visual repair.
