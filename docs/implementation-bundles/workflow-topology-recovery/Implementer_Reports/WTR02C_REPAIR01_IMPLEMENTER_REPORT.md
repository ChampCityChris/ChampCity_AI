# WTR02C Repair01 Implementer Report — Tighten Checkout Identity Validation

## Scope and repository state

- Approved repository root was verified as the current ChampCity_AI repository root; durable paths below are repository-relative.
- Card: WTR02C Repair01.
- The card lists starting checkpoint `0d179986917fc909bcf6e33e4dace56c33c50918`. The actual starting `HEAD` observed before edits was `ee19acf6240dc252c9e8508841f8a4007aaa6a7c`; these do not match.
- Branch: `dev`, tracking `origin/dev`, 77 commits ahead at start. No remote changes were made.
- Expected files changed: `src/main/sourceControl/projectSourceTopology.ts`, `test/source-control/source-topology-path-contracts.test.cjs`, and this report. No other production file, test file, or validation metadata changed.

## Implementation

- A single lowercase canonical Workflow ID predicate now requires the RFC-shaped version nibble `1–8` and variant nibble `8/9/a/b`. Both managed checkout path resolution and Workflow-role checkout validation use it. Uppercase remains invalid.
- `repositoryCheckoutId` and `repositoryId` retain the bounded opaque identifier rule. `sourceLineId` now accepts any non-empty string up to 512 characters without whitespace or Unicode control characters, including slash-bearing provider-neutral references; it is not treated as a path or Git ref.
- Runtime checkout validation now accepts only non-array ordinary objects (including null-prototype records), requires the five contract fields as own properties, and rejects unsupported string or symbol keys. Optional `workflowId` remains constrained by role.
- Permanent proof was extended in the existing topology contract suite for invalid UUID versions/variants/nil/uppercase in both resolver and Workflow-role validation, slash-bearing SourceLine IDs, whitespace/control/length rejection, unsupported keys, arrays, missing fields, and non-ordinary objects.
- Project topology resolution output and physical behavior, materialization, MCP, bootstrap, and source lifecycle behavior were not changed.

## Validation

| Command | Lane and result |
| --- | --- |
| `npm run build` | Restricted lane hit documented `spawn EPERM` while Vite/esbuild spawned. Normal Windows rerun passed (exit 0); Vite emitted its existing large-chunk warning. The final affected run also included a fresh successful production build. |
| `node --test test/source-control/source-topology-path-contracts.test.cjs` | Restricted lane hit `spawn EPERM`. Final normal Windows run passed: 6 tests, 0 failures, 0 skipped. |
| `npm run validate:plan -- --profile work-item --changes tmp/wtr02c-repair01-changes.json` | Preview completed for the exact final three changed paths and selected the work-item proof set. An earlier preview attempt before creating the manifest returned ENOENT and was corrected. |
| `npm run test:affected -- --changes tmp/wtr02c-repair01-changes.json` | Final normal Windows work-item run, receipt `c4056b8e-13ff-4078-a3df-5ee49ebdbd24`, 233,498 ms, exit 1. Production build passed. The only failure evidence was the three already-deferred source-control fixtures listed below; the Repair01 focused suite passed independently. |
| `git diff --check` | Passed on the final unstaged diff and again on the exact staged diff before commit. |

Deferred affected failures:

- `test/source-control/source-graph-projection.test.cjs`: legacy Source Graph fixture behavior awaits Workflow-keyed projection in WTR02H.
- `test/source-control/source-lifecycle-package.test.cjs`: fixture expects Work Intake-owned ready source materialization, deferred to WTR02E/F and related WTR02G lifecycle work.
- `test/source-control/structured-integration.test.cjs`: fixture expects ready Work Intake source materialization and related lifecycle projection, deferred to WTR02E/F/G.

These failures match the deferred behaviors already documented in WTR02C and prior bundle reports. No obsolete Work Intake materialization was restored. The required validation planner preview was run; broader unselected proof and external integration evidence were not required by this repair.

## Git, safety, and remaining work

- Git mutation is limited to the single card-required checkpoint commit on `dev`; no push, merge, rebase, tag, reset, clean, restore, or stash was performed.
- Pre-commit staged-diff review, secret/local-path/generated-artifact scan, and `git diff --check` passed. Commit hash is pending and will be reported after commit rather than editing this report afterward.
- No secrets, credentials, concrete local-machine paths, or generated output are included in durable artifacts. No Operator manual validation is required for this validator-only repair. Residual validation failures are the three deferred fixtures above.
- Recommended next task is to continue the bundle's separately scoped WTR02D work only when directed; this repair does not begin WTR02D.
