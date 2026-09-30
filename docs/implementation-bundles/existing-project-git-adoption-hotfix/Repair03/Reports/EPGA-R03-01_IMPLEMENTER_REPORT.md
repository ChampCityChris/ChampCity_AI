# EPGA-R03-01 Implementer Report

## Scope and repository

- Approved repository root: verified from the active primary checkout before mutation; no alternate workspace was used and no concrete machine path is persisted here.
- Card: Repair Card `EPGA-R03-01 — Bound Source Staging and Preserve Local State`.
- Branch: `dev`.
- Starting HEAD: `2fc62fa5c49ca07fc35966978b2841757958b551` (`Release Repair03 bounded source staging repair`).
- Remote: `origin` is configured for the governed repository; the branch began 183 commits ahead of `origin/dev`.
- Initial working tree: clean.

## Files

Created:

- `docs/implementation-bundles/existing-project-git-adoption-hotfix/Repair03/Reports/EPGA-R03-01_IMPLEMENTER_REPORT.md`

Modified:

- `src/main/agentHarness/repository/boundedGit.ts`
- `src/main/sourceControl/existingProjectGitAdoptionService.ts`
- `test/source-control/managed-project-source.test.cjs`
- `validation/capability-map.json`

Deleted: none.

Intentionally not created or changed:

- no dependency, schema, IPC, preload, renderer, packaging, migration-format, or product-state taxonomy change;
- no guessed package/directory special case or ChampCity_AI identity check;
- no compatibility path, integration-policy semantic change, Integration Repair scope, or policy regeneration on managed reopen;
- no JSON report sidecar, generated output, dependency state, screenshot, or real-Project conversion;
- no Current Project entry change, so its entry tests were not selected.

## Implementation result

Readable Git source is now classified from a bounded manifest rather than copied from the whole working directory. The service obtains tracked paths from the Git index, then performs a non-following `lstat` walk whose entries are classified through NUL-delimited `git check-ignore --stdin`. It includes tracked current working-tree entries and non-ignored untracked entries, excludes Project-container `.champcity`, `.git`, `Main`, and `Dev`, and never descends into an ignored root. Bounded Git gained bounded-pipeline stdin support solely to make this ignore classification path-safe without shell execution or newline parsing.

Ignored/local state is recorded as collapsed relocation roots. Only after the canonical snapshot, baseline, and exact managed Main/Dev checkouts have been proven are those entries renamed into Dev. An ignored dependency/cache directory is moved as one entry; its interior is not enumerated by canonical staging. Nested ignored entries inside source-bearing directories are moved to the matching Dev-relative parent. On a later conversion failure, completed moves are reversed before managed candidates are removed. If reversal itself fails, the managed Dev candidate is retained under conversion-owned recovery evidence instead of deleting the remaining local state.

All source/fallback copying and inspection classifies entries with `lstat`. Links and junctions are recreated from their link target text and are never recursively followed. Windows junction creation falls back to the junction type when ordinary symlink creation is unavailable. Canonical baseline construction no longer lets `git add` traverse reparse points: it inventories the controlled snapshot without following links, stages ordinary files explicitly, hashes each link target text, and writes the link entry to the Git index as mode `120000`. The unreadable-Git fallback uses the same non-following copier and explicit link indexing.

Pre-normalization canonical-source or generated-policy failure now removes only the current attempt's `existing-project-normalization-<uuid>` directory before returning a bounded phase/path diagnostic. The original `.git`, source, refs, remotes, and Main/Dev absence remain unchanged; no journal is written, `recoveryStaging` remains false, and immediate reinspection returns the same usable plan. Diagnostics distinguish canonical source manifest/materialization, local-state preservation/relocation, and generated policy materialization without absolute paths or source contents.

Repair02 semantics remain unchanged. Incoming Project-container `.champcity` state is excluded, the application generates the current repository-owned policy after source materialization, the policy is force-included through explicit baseline indexing, capable fixtures still receive `champcity-integration-gate`, generic fixtures receive `champcity-source-integrity`, and managed reopen remains idempotent.

## Validation evidence

| Command | Lane | Result |
| --- | --- | --- |
| `npm run build` | restricted sandbox | Exit 1 after TypeScript passed; Vite/esbuild hit the documented `spawn EPERM`. This is execution-lane evidence, not a source failure. |
| `npm run build` | normal Windows production build | Final exit 0; TypeScript, Vite production build, and branding copy passed. Vite transformed 1666 modules; only the existing chunk-size advisory was emitted. |
| `node --test --test-concurrency=1 test/source-control/managed-project-source.test.cjs test/source-control/source-topology-path-contracts.test.cjs test/agent-harness/integration-policy-semantics.test.cjs test/agent-harness/repository-io-hardening.test.cjs test/validation/capability-map.test.cjs` | normal Windows focused capability/integration | Exit 0, 48/48 passed with no skips. This includes the 256-file ignored tree plus junction, tracked link entry, dirty tracked bytes, non-ignored untracked source, ignored-state exclusion/relocation, unreadable-Git link fallback, exact topology, post-relocation rollback, failed-staging cleanup/reinspection, Repair02 policy load/provider behavior, bounded Git behavior, and capability-map integrity. |
| `node --test --test-concurrency=1 --test-name-pattern="partly and fully unreadable|manifest materialization failure" test/source-control/managed-project-source.test.cjs` | normal Windows final focused rerun | Exit 0, 2/2 passed after the final unreadable-Git fallback handling adjustment. |
| `npm run test:migration -- --preview` | validation-plan preview | Exit 0; selected the owned migration test plus production-build static step without executing unrelated migration proof. |
| `git diff --check` | repository hygiene | Exit 0 before report creation; repeated during final staged review. |

Intermediate focused runs exposed two Windows-specific defects before final proof: generic Node copy could not recreate a junction without symlink privilege, and whole-snapshot `git add` would traverse a Windows junction. The implementation was corrected to recreate the junction explicitly and index links as mode `120000`; the final Windows suite above passes both cases without a skipped fixture.

Skipped by scope:

- Current Project entry tests: no entry-controller, registration-ordering, landing, IPC, preload, or renderer behavior changed.
- broad/full regression, packaging, Electron launch, and release qualification: explicitly outside the Repair Card completion gate.
- real ChampCity_AI UI conversion: explicitly prohibited before Architect review.

## Git, security, and residual risk

- Required checkpoint commit: pending at report creation. The actual hash is reported after commit rather than amended into this artifact.
- No push, merge, rebase, tag, reset, clean, stash, or real ChampCity_AI Project conversion was performed.
- Final staged review covers only the five files listed above. Secret, credential, `.env` content, concrete local-path, generated-artifact, dependency-state, and whitespace scans are required immediately before the checkpoint commit.
- No repository code is executed during source classification or materialization; Git is invoked directly through the bounded non-shell process runner.
- Operator manual validation: none claimed. Architect review remains required by the card STOP condition.
- Residual risk: filesystem types that the supported Node runtime does not expose as link-like through `lstat` remain dependent on platform classification. The proved supported-Windows junction/reparse shape and ordinary symbolic-link semantics are non-following.

## Recommended next task

Architect review of the `EPGA-R03-01 bound source staging and preserve local state` checkpoint. Do not retry the real ChampCity_AI UI conversion until this Repair03 implementation is reviewed and accepted.
