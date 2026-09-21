# ChampCity Test Execution and Validation Architecture

Status: Implemented validation execution architecture; full qualification remains explicit
Evidence date: 2026-09-21

## Purpose

ChampCity must provide fast, deterministic, risk-appropriate validation for ordinary implementation and integration without discarding expensive regression, platform, packaging, or performance evidence.

The repository already defines the right validation governance in `TEST_ARCHITECTURE_AND_VALIDATION_GOVERNANCE_STANDARD.md`, including static, fast, affected-capability, integration, Desktop, packaging, migration, performance/soak, and full-regression lanes. The TVA and test-suite-recovery bundles implement that architecture through the executable schema-4 catalog, registered profiles, bounded scheduler and target-owned candidate adapter.

This document defines the executable architecture that turns the existing governance and `validation/capability-map.json` inventory into actual test selection, scheduling, build reuse, integration gating, and evidence.

## Historical failure evidence (before TVA)

The 2026-09-20 HOTFIX20 integration exceeded 26 minutes of Operator wall-clock time for a routine hotfix-to-`dev` integration.

The pre-TVA source confirmed the expensive path:

- `package.json` maps `npm test` to `test:full`.
- `test:full` runs `npm run build && npm run test:unit:built`.
- `test:unit:built` runs every `test/**/*.test.cjs` file with `--test-concurrency=1`.
- the glob therefore mixes fast domain tests with Git/filesystem integration, real Electron/process tests, platform tests, and performance/soak tests.
- `test/agent-harness/mcp-operational-diagnostics.test.cjs` contains a literal 60-second idle measurement and a two-batch 1,000-session reconnect soak.
- `test/agent-harness/agent-harness-process-boundary.test.cjs` contains many real Electron/service-host/process lifecycle tests with large bounded timeouts and process wait loops.
- `test/agent-harness/mcp-session-lifecycle.test.cjs` contains high-volume churn and session-pressure scenarios in the same executable universe as ordinary regression.
- `.champcity/integration-policy.json` requires `typecheck`, `build`, and `test:unit:built` for every integration candidate.
- `build` already begins with `tsc`, so the integration path runs TypeScript checking once in `typecheck` and again during `build`.
- the integration candidate service executes required checks serially.
- the repository already has a machine-readable capability map with per-test lane, dependencies, platform, duration, and behavior ownership, but no production/development runner consumes `proposedValidationLane` or behavior coverage for test selection.

That historical path is retired. See [Validation Command Lanes](../dev/VALIDATION_COMMAND_LANES.md) for current commands and the TVA Implementer Reports for observed evidence.

## Architectural Decision

ChampCity implements validation as a **planned execution system**.

Conceptually:

```text
Changed source / Work Item / integration candidate
                    |
                    v
            Validation Planner
                    |
       +------------+------------+
       |                         |
 Capability Map             Validation Profile
 ownership / lanes          workflow requirements
 durations / deps           risk boundary
       |                         |
       +------------+------------+
                    |
                    v
             Validation Plan
                    |
          build once if needed
                    |
       +------------+------------+
       |                         |
 parallel-safe cohort      exclusive cohorts
 fast/integration files    process/desktop/soak
       |                         |
       +------------+------------+
                    |
                    v
            Validation Receipt
                    |
                    v
       Workflow / Integration Candidate
```

The canonical question becomes:

> What evidence is required for this exact change at this exact workflow boundary?

It is no longer:

> How do we run every test we have?

## Canonical Validation Concepts

### ValidationCatalog

The deterministic repository-owned catalog of:

- capabilities;
- source-pattern ownership;
- behavior coverage;
- executable test files;
- lane assignment;
- platform dependency;
- process/filesystem/Git/network/timing dependencies;
- estimated/measured duration;
- validation role;
- proof characteristics;
- V2 disposition.

The existing `validation/capability-map.json` becomes the initial ValidationCatalog source.

The catalog is executable configuration, not documentation-only inventory.

### ValidationLane

A semantic execution class with one purpose, scheduling policy, and expected cost.

Canonical lanes remain:

- static;
- fast;
- affected-capability;
- integration;
- desktop-platform;
- packaging;
- migration;
- performance-soak;
- full-regression.

A test file belongs to one primary execution lane. If one file contains materially different lane classes, the file must be split rather than forcing the most expensive behavior into every invocation.

### ValidationProfile

A workflow policy that selects lanes and/or capabilities.

Required profiles include:

- `implementation-fast`
- `work-item`
- `repair`
- `integration-gate`
- `phase-close`
- `release-qualification`
- `full-supported-platform`

Profiles are application/repository-owned configuration. AI workers may not weaken profiles to obtain a pass.

### ValidationPlan

A deterministic expanded plan produced from:

- exact source revision/checkouts;
- changed paths;
- Work Item/capability scope;
- ValidationProfile;
- ValidationCatalog;
- platform/environment capabilities.

The plan records:

- build/static steps;
- selected test files;
- why each file was selected;
- lane;
- execution cohort;
- expected/known duration;
- platform skip/requirement;
- external capability requirement.

### ValidationRun

One execution of a ValidationPlan against an exact source state.

### ValidationReceipt

Bounded machine-owned evidence containing:

- source revision/checkpoint;
- profile;
- selected capabilities;
- selected test files/lanes;
- build identity where applicable;
- exact command/runner identity;
- start/end/duration;
- exit result;
- pass/fail/skip counts where available;
- bounded failure evidence;
- lane and file duration metrics;
- platform/environment facts;
- selection rationale.

AI-generated prose is not the authoritative execution receipt.

## Build and Compilation Architecture

### Build once per validation plan

A ValidationPlan must not perform identical TypeScript compilation multiple times.

Current duplication:

```text
typecheck -> tsc --noEmit
build     -> tsc -> vite -> assets
```

For workflows that already require the production build, successful `tsc` inside the build is the TypeScript correctness proof for that plan unless a materially different no-emit configuration is introduced later.

The integration gate should therefore normally use one static/build step, not `typecheck` followed by a build that reruns the same compiler.

### Built-test contract

Tests that import `dist/**` may run against already-built output only when the ValidationExecutor itself owns or verifies that build in the same plan.

User-facing canonical commands should not depend on a developer remembering whether `dist` is fresh.

Standalone `*:built` commands may remain as internal/advanced primitives, but profile commands must establish freshness mechanically.

## Lane Execution Architecture

### Static

Includes source compilation/build, schema/catalog integrity, and deterministic static analysis.

Target: under 30 seconds on the supported development workstation.

### Fast

Pure/bounded deterministic tests with no real Electron process, long real-time wait, external capability, package installation, or platform-global state.

Target: under 30 seconds; temporary V2 extraction ceiling 60 seconds.

Fast is the default repeated developer/Implementer feedback lane.

### Affected capability

Selects proof mapped to changed capabilities and explicit Work Item scope.

Target: under 60 seconds for an ordinary Work Item.

Selection is mechanical. Missing ownership fails visibly; it does not silently become "run everything."

### Integration

Repository, filesystem, Git provider, MCP/HTTP/IPC, runtime adapter, durable state, and controlled child-process boundaries.

Integration is selected only when the changed capabilities require it or when a workflow profile explicitly requires repository-wide integration sentinels.

Target: bounded several-minute evidence, not routine tens-of-minutes execution.

### Desktop platform

Real Electron/Windows lifecycle and desktop-host proof.

Run when the changed capability owns Desktop/platform behavior or at the appropriate phase/release boundary.

Do not include in ordinary cross-platform fast execution.

### Packaging

Release-oriented packaging and installed executable proof only.

### Migration

Versioned migration fixture proof.

### Performance/soak

Long elapsed-time, high-volume, resource stability, and real performance qualification.

Performance/soak is never selected merely because `npm test` was invoked.

The current 60-second idle sample and reconnect soaks belong here.

### Full regression

An orchestrator of applicable lanes, not a raw glob.

Full regression is explicit phase/release/Operator-directed evidence. It reports lane composition separately.

## Mixed-Lane Test File Rule

File-level lane selection cannot be trustworthy when a file mixes cheap functional proof with long performance or platform scenarios.

Therefore:

- performance/soak cases must not share an executable file with ordinary fast/integration tests when that causes the entire file to be selected together;
- real Electron/platform cases should live in explicit Desktop/platform files;
- packaging proof remains under packaging;
- long real-time timing tests remain performance/soak unless the real elapsed time itself is the contract;
- where simulated clocks provide equivalent functional proof, use simulated time in ordinary lanes and reserve wall-clock measurement for performance qualification.

Initial mandatory splits include the 60-second operational idle measurement and high-volume reconnect soak from ordinary operational diagnostics execution.

The HOTFIX20 session churn proof should be reviewed for separation of functional admission behavior from performance/soak volume proof.

## Scheduling and Parallelism

The current `--test-concurrency=1` setting makes every test file additive.

ChampCity uses explicit resource ownership rather than treating any filesystem, Git, network, or child-process use as global state.

Every executable test file declares one or more schema-4 `ownedResources` values:

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

The catalog validator rejects missing, empty, unknown, contradictory, or dependency-incomplete resource declarations. `pure-stateless` is exclusive of every other resource. Git fixtures must be repository-local and isolated; network endpoints must be dynamically owned; child processes must be bounded. Mutable selected-repository or machine-global state is represented explicitly as `shared-global-state-exclusive` and fails closed into serial process execution.

Each executable test file receives an execution mode:

- `parallel-safe`
- `exclusive-process`
- `exclusive-desktop`
- `exclusive-performance`
- `exclusive-packaging`

Execution mode remains the scheduler input. Resource ownership is the audited evidence for that mode: isolated resources may use `parallel-safe`; Desktop, packaging, performance, and shared-global resources require their matching exclusive mode.

### Parallel-safe cohort

Independent fast and isolated integration files run with bounded file-level concurrency. A unique temporary root, isolated temporary Git repository, bounded child process, or dynamically allocated loopback endpoint does not by itself require global serialization.

The initial ceiling must be conservative and configurable; four workers is a reasonable implementation starting point, but the Work Card must measure and choose the supported workstation default.

### Exclusive cohorts

Tests that intentionally own real Electron/Desktop state, packaging output, timing/resource measurement, or mutable machine-global/selected-repository state run serially within their explicit lane. `exclusive-process` is reserved for the last category rather than used as a synonym for process creation.

Parallelization is not allowed to create flakiness merely to improve a benchmark.

## Deterministic Affected-Capability Selection

### Inputs

- exact target/base revision;
- exact candidate/current revision;
- changed repository-relative paths;
- Work Item explicit capability scope if available;
- ValidationCatalog source patterns and capability dependency graph.

### Algorithm

1. calculate changed paths mechanically;
2. match changed paths to capability `sourcePatterns`;
3. add explicitly owned Work Item capabilities;
4. traverse declared capability dependencies according to validated direction;
5. select preferred/primary proof for each affected behavior;
6. include additional integration proof required by the selected profile;
7. de-duplicate files;
8. reject unclassified changed source visibly;
9. produce deterministic sorted ValidationPlan evidence.

A changed documentation-only surface may legitimately select no runtime tests when policy says documentation proof is sufficient.

A changed shared/runtime/source-control surface may select broader integration proof.

The planner does not use AI judgment to decide which mapped test can be skipped.

## Integration Gate Architecture

### Current defect

Every IntegrationCandidate requires:

```text
typecheck
build
full serial repository regression
```

This directly contradicts the adopted validation governance for ordinary bounded work and makes source integration operationally expensive.

### Target integration profile

A normal integration candidate uses `integration-gate`:

```text
resolve exact target + incoming revisions
        |
        v
calculate target→candidate changed paths
        |
        v
validation catalog integrity
        |
        v
one production build/static proof
        |
        v
affected fast proof
        |
        v
affected integration proof
        |
        v
small repository-wide integration sentinels required by policy
        |
        v
candidate clean/source unchanged check
```

It explicitly excludes by default:

- Desktop platform lane;
- packaging lane;
- migration lane unless affected;
- performance/soak;
- unrelated capabilities;
- full-regression aggregate.

Those lanes may be added when changed capability/policy requires them.

### Integration runner context

The IntegrationPolicy runner must receive application-owned immutable context sufficient for deterministic selection:

- target revision;
- incoming revision;
- candidate revision;
- repository identity;
- platform/environment facts.

Repository policy still cannot inject arbitrary command text.

A `validation-profile` runner kind or equivalent application-owned adapter should replace the use of a fixed full-suite npm script for ordinary integration.

## Full Regression Architecture

Full regression remains valuable, but its role changes.

It runs:

- at defined phase close;
- before release qualification;
- for broad cross-cutting changes explicitly classified as full-regression risk;
- when directed by the Operator.

It executes each applicable lane using that lane's scheduling policy and reports durations separately.

Performance/soak may be a release/qualification component without blocking every development integration.

A full regression failure is attributable to the lane/file/capability that failed, not merely an opaque aggregate exit code.

## Package Script Contract

Target script vocabulary should distinguish convenience profiles from built primitives.

Illustrative target:

```text
validate:static
test:fast
test:fast:built
test:affected
test:integration
test:integration:built
test:desktop
test:packaging
test:migration
test:performance
test:full
```

`npm test` should become the ordinary bounded developer profile, not an alias for every repository test. The explicit full command remains available and documented.

Exact script names are implementation detail, but semantic separation is required.

## Validation Planner and Executor Ownership

A repository-owned deterministic validation module/script layer should own:

- capability catalog parsing;
- lane/profile selection;
- changed-path selection;
- scheduling;
- Node test-runner invocation;
- bounded result collection;
- duration metrics;
- receipts.

The same planner semantics must be usable by:

- local developer commands;
- Work Item completion;
- Repair validation;
- IntegrationCandidate validation;
- phase close;
- release qualification;
- future CI.

This prevents five different workflows from rebuilding their own test selection logic.

## MCP and Agent Boundary

AI workers should not manually enumerate test files when a ValidationPlan can be produced mechanically.

Future `validation_toolbox` or equivalent MCP façade may expose:

- preview validation plan;
- run approved profile;
- inspect validation receipt;
- inspect capability/test ownership.

The model may interpret failures and propose repairs. It does not choose to omit required mapped evidence.

## Capability Map Evolution

The existing capability map is valuable and should be retained.

Required additions/reconciliation may include:

- execution safety/exclusivity metadata;
- measured duration refresh;
- explicit profile/sentinel membership where behavior ownership alone is insufficient;
- deterministic schema version bump if fields change.

The map must remain exact: every executable permanent `*.test.cjs` file has one record.

The map is no longer passive governance evidence; the runner must consume it.

## Source-Inspection and Redundant Proof

Source-text/proxy tests are not the primary cause of the 26-minute integration delay, but they remain a maintenance cost and may duplicate behavioral proof.

The existing governance still applies:

- preserve legitimate static structural contracts;
- rewrite implementation-coupled source assertions when behavioral/rendered proof exists;
- consolidate redundant proof explicitly;
- retire superseded V1 characterization only with documented replacement evidence.

Performance optimization must not hide regressions by deleting valuable tests.

## Failure Attribution

Validation failure output must identify:

- profile/lane;
- selected test file;
- affected capability/behavior when mapped;
- bounded assertion/error evidence;
- execution/environment failure separately from source failure;
- elapsed duration.

Integration must not persist unbounded test output.

## Performance Budgets

Initial architecture budgets:

| Boundary | Target |
| --- | ---: |
| Static/build | < 30 s |
| Fast lane | < 30 s; temporary ceiling 60 s |
| Ordinary affected-capability | < 60 s |
| Ordinary integration gate | target < 3 min; hard review threshold 5 min |
| Performance/soak | explicit; no routine merge budget |
| Full supported-platform regression | measured and optimized, but not a routine integration gate |

A budget miss is evidence to investigate. It is not permission to skip required proof.

RCO/Work Intake integration should surface the selected profile and expected/measured cost before a long validation starts.

## Observability

Each lane/profile run records:

- total duration;
- build duration;
- scheduler wait;
- per-file duration where technically reliable;
- selected file count;
- parallel/exclusive cohort counts;
- slowest tests/files;
- failed/skipped counts.

Historical duration is used to detect regressions and maintain reasonable estimates in the catalog.

## Migration Strategy

This architecture must be implemented without a big-bang deletion of tests.

1. build the runner around the existing catalog;
2. create real lane commands while preserving all tests;
3. split known mixed-lane files;
4. remove duplicate build work;
5. introduce bounded parallel execution;
6. implement affected selection;
7. switch integration candidates from full regression to the integration profile;
8. update local/workflow commands;
9. optimize/rewrite redundant and source-proxy tests with evidence;
10. measure and enforce budgets.

The integration-gate profile is implemented. Full supported-platform/release qualification remains explicit and was not executed during the TVA bundle quarantine.

## Safety Invariants

1. No test is omitted merely because it is slow; it must be assigned to an intentional lane/profile.
2. Missing source ownership fails visibly.
3. Integration cannot advance from an unvalidated exact candidate.
4. Parallel execution may not share uncontrolled mutable global state.
5. Built tests may not silently consume stale `dist`.
6. Performance/soak results may not be represented as ordinary functional proof.
7. A full regression command must state which lanes/platforms were included.
8. AI cannot mutate the required ValidationPlan merely to obtain a pass.
9. Existing regression evidence is preserved until replacement/consolidation is proved.
10. Validation cost is an architectural metric, not an accepted unbounded tax on every Git/source-control operation.

## Explicit Non-Goals

This architecture does not:

- weaken validation to make Git appear faster;
- remove performance, Electron, packaging, or integration proof;
- require a third-party test framework;
- require CI before local development can function;
- make test count a quality metric;
- make every test parallel;
- turn capability-map maintenance into manual approval bureaucracy.

The objective is **higher signal per minute with stronger attribution**, so ordinary development and integration remain fast while expensive evidence runs at the boundary where it is actually meaningful.
