# TSR09 Work Card Implementer Report

Status: complete; all 147 permanent tests have validated schema-4 resource ownership, and isolated Git, process, filesystem, and endpoint use is no longer treated as global exclusivity.

## Scope and repository verification

- Card: Work Card TSR09, Reclassify Execution Safety by Owned Resource.
- The working directory and Git top level were verified as the approved `<PROJECT_REPO>`.
- Branch: `dev`, tracking `origin/dev`; TSR08 starting point was commit `0818948`. Remote freshness was not fetched.
- No product production behavior, dependency, migration, compatibility path, test lifecycle, or Tester engine changed. The existing scheduler algorithm and concurrency ceiling are unchanged.

## Files changed

Modified:

- `validation/capability-map.json`
- `scripts/validation/catalog-schema.cjs`
- `scripts/validation/catalog.cjs`
- `scripts/validation/planner.cjs`
- `scripts/validation/executor.cjs`
- `test/validation/capability-map.test.cjs`
- `test/validation/validation-runner.test.cjs`
- `test/support/validation-fixture.cjs`
- `test/agent-harness/integration-profile-gate.test.cjs`
- `docs/architecture/CHAMPCITY_TEST_EXECUTION_AND_VALIDATION_ARCHITECTURE.md`

Created: this report.

Deleted: none.

Intentionally not created: a resource-aware replacement scheduler, new test lifecycle, broad test rewrites, dependencies, branches, worktrees, JSON sidecars, generated output, or shared-repository mutation fixtures.

## Schema and planner result

The ValidationCatalog advances from schema 3 to schema 4. Every test now has a non-empty, sorted `execution.ownedResources` array selected from:

- `pure-stateless`;
- `repository-readonly`;
- `temp-filesystem-isolated`;
- `isolated-git-fixture`;
- `bounded-child-process`;
- `loopback-dynamic-endpoint`;
- `electron-desktop`;
- `packaging`;
- `performance-soak`;
- `shared-global-state-exclusive`.

The validator rejects missing, empty, unknown, contradictory, dependency-incomplete, or scheduling-incompatible declarations. `pure-stateless` cannot be combined with another resource. Git, process, network, Electron, and filesystem dependency declarations must resolve to a compatible resource owner. Exclusive resource types must use their matching existing scheduler mode. The planner exposes the exact resource list, and the executor rejects a plan whose resource ownership differs from the validated catalog.

No scheduling algorithm changed. The existing modes and cohort implementation remain intact; this card corrects the evidence feeding them.

## Corpus audit and counts

The card described TVA04's earlier corpus approximately. The exact TSR09 starting catalog contained 147 permanent files:

| Scheduling mode | Before | After |
| --- | ---: | ---: |
| `parallel-safe` | 10 | 132 |
| `exclusive-process` | 122 | 0 |
| `exclusive-desktop` | 10 | 10 |
| `exclusive-packaging` | 2 | 2 |
| `exclusive-performance` | 3 | 3 |

Resource requirements overlap by design:

| Owned resource | Files |
| --- | ---: |
| `pure-stateless` | 9 |
| `repository-readonly` | 47 |
| `temp-filesystem-isolated` | 94 |
| `isolated-git-fixture` | 27 |
| `bounded-child-process` | 26 |
| `loopback-dynamic-endpoint` | 13 |
| `electron-desktop` | 10 |
| `packaging` | 2 |
| `performance-soak` | 3 |
| `shared-global-state-exclusive` | 0 |

The source audit distinguished repository reads from mutable writes, inspected actual temporary-root and fixture construction, checked Git-using files for global configuration or current-repository mutation, and traced real server/runtime listeners. Git proof uses isolated temporary repositories and repository-local configuration. Child processes are bounded by their owners and validation cleanup. Real network owners use port `0` or a unique temporary control address; fixed endpoints found in test text are asserted model values rather than bound listeners. Four stale dependency flags were corrected to record real dynamically owned network use in the two MCP integration owners and two MCP performance owners.

## Retained exclusive categories

- Desktop/platform — 10 files. These retain `exclusive-desktop` because they own or characterize Electron/Desktop runtime, Windows startup/power/environment behavior, platform provisioning/elevation, or supported-workstation process initialization. Their Windows and lifecycle state remains intentionally isolated even when their temp files or child processes are individually owned.
- Packaging — 2 files. These retain `exclusive-packaging` because installer/package source and output ownership must not overlap another packaging run or Desktop qualification.
- Performance/soak — 3 files. These retain `exclusive-performance` because timing, throughput, idle, and resource measurements require a quiet serial measurement cohort.
- Shared global/process — 0 files. No permanent test was found that mutates the selected source repository, global Git configuration, a fixed bound port, or another mutable machine-global resource. `exclusive-process` remains a valid fail-closed schema mode for future evidence-backed cases, but process creation alone no longer selects it.

## Validation

| Exact command | Lane | Result |
| --- | --- | --- |
| `node --test --test-reporter=tap --test-concurrency=1 test/validation/capability-map.test.cjs` | Normal Windows focused catalog/schema | Exit 0; 5/5 passed in 109.8074 ms. Exact 147-file coverage and negative schema cases passed. |
| `node --test --test-reporter=tap --test-concurrency=1 --test-name-pattern="validation plans|validation planning rejects" test/validation/validation-runner.test.cjs` | Normal Windows focused planner preview | Exit 0; 2/2 passed in 684.5781 ms. Resource ownership is deterministic and invalid catalogs fail closed. |
| Integration-gate renderer-change preview through `scripts/validation/cli.cjs` | Restricted planner preview | Exit 0; 26 selected tests formed one `parallel-safe` cohort at concurrency 2 with `pure-stateless`, `repository-readonly`, and `temp-filesystem-isolated` resources. No tests executed. |
| Direct schema-4 ValidationCatalog load and corpus count | Restricted catalog/schema lane | Exit 0; 147 tests, 132 parallel-safe, 10 Desktop, 2 packaging, 3 performance, and 0 exclusive-process. |
| Catalog delta audit against `HEAD:validation/capability-map.json` | Restricted read-only lane | `spawnSync git EPERM`; recorded once and not counted as a source failure. |
| Same catalog delta audit | Normal Windows read-only lane | Exit 0; changes were constrained to schema version, owned resources, scheduling classifications/reasons, and the four reviewed network dependency flags. |
| `node --check` for the eight changed CJS files | Restricted syntax lane | Exit 0 for every file. |
| Source/resource audit across all catalogued test files | Restricted read-only audit | Exit 0 for 147 files; every Git and network dependency resolved to its explicit owned resource, with no global Git configuration or `process.chdir` use found. |

No full test corpus, full profile, packaging run, Desktop launch, or performance/soak run was performed. This card intentionally stops at catalog/schema/planner preview.

## Git, security, and residual risk

- The Operator authorized a completion commit. Its hash is pending in this artifact and is reported after commit without amending solely for its own hash.
- No push, merge, rebase, tag, reset, clean, restore, stash, new branch, or worktree was performed.
- The staged safety review found no credentials, concrete local-machine paths, or generated artifacts; the sole keyword match was this report's description of that review.
- Operator manual validation: none; acceptance is deterministic and non-visual.
- Residual risk: resource metadata is a reviewed declaration. Future tests that add a fixed port, shared repository mutation, global configuration, or machine-global resource must declare `shared-global-state-exclusive` or another matching exclusive resource before execution.
- Recommended next task: TSR10.
