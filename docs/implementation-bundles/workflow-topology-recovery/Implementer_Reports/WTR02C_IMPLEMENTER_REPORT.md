# WTR02C Implementer Report

## Scope and repository

- Card: WTR02C — Separate Project Container, Repository, SourceLine, and RepositoryCheckout Path Contracts.
- Approved repository root verified as the ChampCity_AI repository; working branch: `dev`.
- Starting SHA: `28f0bd8568005779b63ba3679ae2142e7a3c7b66`.
- Remote status at start: `dev` was ahead of `origin/dev` by 75 commits; no push performed.

## Implementation

- Modified: `src/shared/sourceLifecycleContracts.ts`, `validation/capability-map.json`.
- Created: `src/main/sourceControl/projectSourceTopology.ts`, `test/source-control/source-topology-path-contracts.test.cjs`, and this report.
- The shared `Repository` contract contains only `repositoryId` and provider `"git"`.
- `RepositoryCheckout` carries its application identity, owning repository, SourceLine, role, Project-relative path, and optional Workflow ID. `SourceLine` remains pathless.
- `MANAGED_PROJECT_SOURCE_PATHS` is exactly: metadata `.champcity/repository.git`, Main `Main`, Dev `Dev`, Workflow root `.champcity/checkouts`.
- The main-process resolver requires and canonicalizes an existing Project directory, accepts a non-Git container, does not run Git or create directories, and validates containment and existing path components against symbolic-link/reparse redirects. Missing topology descendants are accepted.
- Workflow paths derive only from canonical lowercase UUIDs. The pure checkout validator enforces role, identity, and canonical Project-relative path contracts.
- Existing test coverage was inspected. No current permanent test owns Project-container topology identity/path contracts, so the focused six-test suite adds the previously uncovered contract proof. The existing source-control service boundary suite was not changed.
- Intentionally not created: physical Git topology/checkouts, MCP registrations or targeting changes, bootstrap changes, persistence entities/migrations, or existing-repository adoption behavior.

## Validation

| Command | Lane | Result |
| --- | --- | --- |
| `npm run build` | Restricted Windows build lane | TypeScript compilation completed; Vite/esbuild failed with `spawn EPERM` (exit 1). Per validation instructions, this was recorded once and rerun in the normal Windows lane. |
| `npm run build` | Normal Windows build lane | Passed (exit 0). Vite emitted only its existing large-chunk advisory. The affected profile also completed its owned production build successfully. |
| `node --test test/source-control/source-topology-path-contracts.test.cjs` | Restricted Windows focused test | Node test runner failed before executing tests with `spawn EPERM` (exit 1); rerun in normal Windows lane. |
| `node --test test/source-control/source-topology-path-contracts.test.cjs` | Normal Windows focused test | Passed 6/6 tests; redirect fixture ran and passed on this Windows host. |
| `npm run validate:plan -- --profile work-item --changes tmp/wtr02c-changes.json` | Normal Windows planner preview | Passed. Exact changed paths were classified; work-item selected the required build, fast, affected, and applicable integration proof, including existing dependent source lifecycle and bootstrap suites. |
| `npm run test:affected -- --changes tmp/wtr02c-changes.json` | Normal Windows work-item profile | Failed overall (exit 1), final receipt `dc73c269-8aea-4d56-9cff-d746c69b7612`, duration 232217 ms. Production build passed and the new topology test passed. Four existing test files failed: `test/source-control/source-graph-projection.test.cjs`, `test/source-control/source-lifecycle-package.test.cjs`, `test/source-control/structured-integration.test.cjs`, and `test/work-intake/greenfield-source-bootstrap.test.cjs`. |
| `node --test test/source-control/source-graph-projection.test.cjs` | Normal Windows diagnostic rerun | Confirmed the source-graph failure: the existing fixture calls removed `state.createSourceBinding()` (`TypeError: state.createSourceBinding is not a function`). This belongs to deferred Workflow-owned graph projection in WTR02H. |
| `git diff --check` | Normal Windows repository check | Passed (exit 0); no whitespace errors. |

The two source-lifecycle failures assert old Work Intake-owned readiness and integration behavior. They fall under deferred Workflow source creation/checkpoint work in WTR02E–WTR02G. The source-graph fixture failure is deferred Workflow-owned graph projection in WTR02H. The greenfield bootstrap failure is in later physical topology/bootstrap work, including WTR03C. These are not failures of the new topology resolver or its focused contract suite. No out-of-scope source behavior was restored to satisfy them.

## Git and safety

- The five attributable files were staged for exact diff and safety review. At report creation, the card-authorized checkpoint commit is the remaining Git mechanic; its resulting hash will be reported separately and this report will not be rewritten to contain its own commit hash.
- Secret, concrete local-path, and generated-artifact safety scan: reviewed all five task files; no credentials, concrete local-machine paths, or generated outputs were found. A keyword scan matched only ordinary capability descriptions containing the words “secrets” and “secret.” Build output remained ignored/generated and outside the change set.

## Remaining work and risks

- Final validation is complete. Create the one authorized checkpoint commit and report its hash separately.
- No Operator manual validation is required by this contract-only card. No external integration, launch, or release evidence is claimed.
- After the authorized WTR02C checkpoint commit, report its hash separately; this report will not be amended solely to contain its own commit hash.
