# TVA01 Implementer Report

## Scope and repository

Work Card TVA01. Verified the approved ChampCity_AI repository and the isolated worktree with `git rev-parse --show-toplevel`. Branch: `codex/test-execution-architecture`, based on local `dev` at `05eef38`. The existing local dev branch was 45 commits ahead of origin/dev at initialization; no fetch or push was performed. Operator direction authorizes the worktree, branch, eventual commit and merge into dev and supersedes the manifest's source-control restriction. Active staged bundle instructions were copied from the supplied checkout; that checkout was not modified by this implementation.

## Implementation

Created `scripts/validation/catalog-schema.cjs`, `catalog.cjs`, `planner.cjs`, `executor.cjs`, and `cli.cjs`; created `validation/profiles.json` and `test/validation/validation-runner.test.cjs`. Modified `package.json`, `validation/capability-map.json`, and `test/validation/capability-map.test.cjs`. This report is new. No files deleted. No dependency, integration-policy change, package-default change, production-source edit, or generated output was intentionally added.

Catalog schema remains version 1. The existing strict inventory-field validator is shared with the loader. The loader also validates exact executable-file coverage, safe repository-relative paths, lane/build/platform/duration metadata, capability references, and primary/supporting/preferred proof identity. Profile configuration schema 1 defines all seven required profiles. Until affected selection arrives in TVA05, work-item, repair, integration-gate, and phase-close previews conservatively include their complete declared functional lanes. They are not yet workflow entrypoints. Release and full-supported-platform previews include every primary lane. Profile definitions contain lanes, not a second test list.

Plans are deterministic and include exact files, lane/reason, platform availability, external requirements, build requirement, duration basis, and behavior ownership. The serial executor revalidates selected catalog records, requires an owned build callback for built proof, runs explicit Node files without a glob, bounds output/time, and distinguishes passed, failed, execution-failed, and unavailable results. Unavailable evidence cannot produce a passed receipt. Freshness identity and scheduling remain TVA03/TVA04 work. The preview command is `npm run validate:plan -- --profile <profile>` or `--lane <lane>`.

## Test disposition and proof

- Reused all five original capability-map checks; extracted their inventory helpers without weakening the assertions.
- Added three permanent behavioral contracts for previously uncovered deterministic planning, fail-closed selection, and real serial execution/error/output boundaries. These are new execution infrastructure contracts, not duplicate inventory schema proof.
- No proof consolidated, retired, skipped, or moved to obtain a pass.
- A real failure fixture exposed inherited NODE_TEST_CONTEXT contamination; the executor now removes NODE_TEST_CONTEXT and NODE_OPTIONS from its child environment. The same discriminating fixture subsequently passed.

## Validation

All commands ran from the verified worktree. Normal Windows commands used the installed Node/npm toolchain and the existing dependency junction; no dependencies were installed.

| Command | Lane | Result |
| --- | --- | --- |
| `node --test test/validation/capability-map.test.cjs` | Restricted Windows | Exit 1, spawn EPERM; infrastructure failure recorded once |
| Same command | Normal Windows | Exit 0, 5/5; 110.47 ms before changes |
| `node --test --test-concurrency=1 test/validation/capability-map.test.cjs test/validation/validation-runner.test.cjs` | Normal Windows, focused capability/adapter | Initial 7/8 exposed inherited runner context; corrected result 8/8, exit 0, 1300.23 ms |
| `node --check scripts/validation/<module>.cjs` for catalog, catalog-schema, planner, executor, and cli | Restricted Windows, static | All exit 0 |
| CLI `main(['preview','--profile','implementation-fast'])` and all profile/lane previews in behavioral tests | Restricted/normal Windows, plan-only | Pass; implementation-fast selects 12 files, requires build; no selected files executed by preview |
| `executePlan(planValidation({testPaths:['test/lifecycle/nested-lifecycle.test.cjs']}), {ensureBuild: ... npm run build ...})` | Normal Windows, build then representative fast | Build failed (tsc exit 2; outer command exit 1); test was correctly not executed |

The exact representative invocation was `node -e "const {planValidation}=require('./scripts/validation/planner.cjs'); const {executePlan}=require('./scripts/validation/executor.cjs'); const {execFileSync}=require('node:child_process'); executePlan(planValidation({testPaths:['test/lifecycle/nested-lifecycle.test.cjs']}), {ensureBuild:async()=>execFileSync('cmd.exe',['/d','/s','/c','npm run build'],{stdio:'inherit',windowsHide:true})}).then(r=>{console.log(JSON.stringify(r,null,2));process.exitCode=r.status==='passed'?0:1}).catch(e=>{console.error(e);process.exitCode=1})"`.

The build found existing TS2339 errors in unchanged `src/main/planExecution/routedWorkflowService.ts` lines 142–143: preparedInstruction, promotionError, and submission are accessed on a union containing ArchitectDraftSubmission. This is not caused by TVA01; no production files changed. The optional built-file demonstration therefore has no pass claim. TVA01's changed CommonJS infrastructure and real executor fixtures passed without built output. Route this source defect to the next owned routed-workflow card; do not weaken TypeScript or consume partially emitted dist as a successful build.

The legacy aggregate/full-supported-platform runs were intentionally not executed under the bundle quarantine. No launch smoke, visual acceptance, or external integration claim is made.

## Safety, Git, and next task

No secrets or machine paths added to durable artifacts; test fixtures use OS temporary roots and clean up. Plans contain only repository-relative test paths; output redacts the selected repository root and common credential assignments. No release/publish/push. Branch/worktree creation only so far; implementation commit pending final staged review and bounded safety scan. Actual hash will be reported after commit rather than amending this report.

TVA01's owned focused acceptance is complete. Residual: the pre-existing routedWorkflowService compile failure blocks production-build evidence and must be resolved within an applicable owning scope before later production validation. No visual/product judgment is required for TVA01. Next card is TVA02A per manifest/index ordering (the TVA01 footer's TVA02 reference is superseded by that explicit order).
