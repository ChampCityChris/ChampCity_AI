# Test Suite Performance Code Review and RCA — 2026-09-20

Status: Architect evidence and implementation basis  
Scope: ChampCity A/I repository test execution, validation selection, and integration-candidate gating  
Operator evidence: HOTFIX20 integration to `dev` exceeded 26 minutes of wall-clock time.

## Executive Finding

The repository does not primarily have a "slow tests" problem. It has a **validation architecture implementation gap**.

The adopted governance already defines separate static, fast, affected-capability, integration, Desktop, packaging, migration, performance/soak, and full-regression lanes. The repository also already maintains `validation/capability-map.json` with per-test lane, dependencies, duration, platform, behavior coverage, and V2 disposition.

However, the actual execution path ignores that architecture:

```text
integration candidate
  -> typecheck
  -> build
  -> every *.test.cjs file
  -> serial execution
```

As a result, routine integration synchronously pays for unrelated expensive evidence including performance/soak and real process/Desktop behavior.

## Implementer Execution Boundary

The RCA necessarily references Git/source-control mechanics because they were visible in the incident. Those references are explanatory evidence, not execution instructions for Astra.

Astra's implementation task is code, tests, validation behavior, and reporting in the repository context supplied by ChampCity. Provider-specific repository placement, concurrent source topology, and integration into `dev` are external infrastructure concerns and must not become card preconditions or stop conditions.

## Code Review Findings

### CRITICAL — Integration policy requires full repository regression for every candidate

Evidence:

`.champcity/integration-policy.json`:

```json
{
  "checkId": "champcity-regression-built",
  "lane": "full-regression",
  "runner": {
    "kind": "npm-script",
    "script": "test:unit:built",
    "timeoutMs": 900000
  }
}
```

and every listed check is in `requiredIntegrationChecks`.

`src/main/planExecution/integrationCandidateService.ts` resolves the required checks and executes them in a serial `for ... of` loop before allowing target advancement.

Impact:

- every ordinary hotfix, Repair, feature, and isolated work integration pays for repository-wide regression;
- integration latency grows with the entire repository rather than the affected behavior;
- expensive tests become a hard source-control critical path;
- concurrent agent throughput collapses at integration even if implementation itself is parallel.

This contradicts the adopted governance statement that full regression is not the default Work Card command and is required at wider boundaries or when explicitly warranted.

### CRITICAL — `test:unit:built` is not a unit lane

Evidence from `package.json`:

```json
"test:unit:built": "node --test --test-concurrency=1 \"test/**/*.test.cjs\""
```

The selected glob contains materially different evidence:

- pure/service/domain tests;
- filesystem and Git integration;
- HTTP/MCP runtime tests;
- real Electron/service-host tests;
- Windows platform tests;
- high-volume reliability tests;
- real-time performance measurements.

Impact:

The name hides the real contract. Any consumer choosing this apparently bounded "unit" script actually chooses the entire supported test corpus.

### CRITICAL — Global serialization makes every test cost additive

Evidence:

`--test-concurrency=1` is hard-coded into the only built test command.

Impact:

- independent pure tests cannot overlap;
- isolated temp-repository tests cannot overlap;
- renderer/service tests cannot overlap;
- all real wait time adds directly to the wall clock.

There is no scheduling distinction between a safe deterministic domain test and a real Electron process test.

### HIGH — Performance/soak proof is in the routine aggregate

Evidence from `test/agent-harness/mcp-operational-diagnostics.test.cjs`:

- two 500-session reconnect batches;
- a literal `setTimeout(..., 60_000)` idle performance sample;
- the idle test has a 75-second test timeout.

The 60-second sleep alone guarantees over one minute of wall clock whenever the file is selected, regardless of whether the candidate changed performance behavior.

Impact:

Performance qualification is transformed from deliberate evidence into a mandatory tax on every integration.

### HIGH — Real Electron/process lifecycle proof is in the routine aggregate

Evidence from `test/agent-harness/agent-harness-process-boundary.test.cjs`:

- many tests launch real Electron/service-host processes;
- individual tests carry `timeout: 180_000`;
- process startup/recovery/exit loops wait up to multi-second deadlines;
- the file verifies real process identity, crash recovery, service-host continuity, startup modes, desktop reconnect behavior, and worker heartbeat behavior.

The timeout is not proof of actual duration, but the file is clearly Desktop/process integration evidence, not an ordinary unit lane.

Impact:

Platform/process evidence executes for source changes unrelated to Desktop/process lifecycle.

### HIGH — Session lifecycle mixes ordinary regression with high-volume churn

`test/agent-harness/mcp-session-lifecycle.test.cjs` contains ordinary lifecycle correctness plus:

- global-cap high-volume repeated session creation;
- ChatGPT-style churn;
- stream pressure scenarios;
- long per-test timeout allowances.

Some of this is legitimate integration regression; some is reliability/volume proof. The current file-level execution model cannot separate those purposes.

### HIGH — Static validation repeats TypeScript compilation

Current integration policy executes:

1. `npm run typecheck` -> `tsc --noEmit`
2. `npm run build` -> starts with `tsc`

Impact:

The same source graph is type-checked twice in the same integration plan.

The test governance standard explicitly requires that a validation command not rebuild identical output more than once in the same lane.

### HIGH — Canonical local validation also duplicates build work

`docs/dev/VALIDATION_COMMAND_LANES.md` and `DEVELOPMENT_GUIDE.md` still prescribe:

```text
npm run typecheck
npm run build
npm test
```

but `npm test` -> `test:full` -> `npm run build` again.

Therefore the documented canonical lane can execute:

- no-emit TypeScript;
- emitting TypeScript/build;
- emitting TypeScript/build again before tests.

The governance document already identified this defect, but the current command reference was never replaced.

### HIGH — Capability map is passive; no runner consumes its lane/ownership data

`validation/capability-map.json` exists and is validated by `test/validation/capability-map.test.cjs`.

Its schema includes:

- `proposedValidationLane`;
- duration;
- platform dependency;
- filesystem/Git/network/process/timing dependencies;
- behavior coverage;
- source patterns;
- V2 disposition;
- execution requirements.

Repository search finds no production/development runner consuming `proposedValidationLane` or behavior coverage to select tests. The map is used as governance evidence and test-authoring guidance, not execution input.

Impact:

The repository has already paid the organizational cost of classifying the suite but receives almost none of the runtime benefit.

### HIGH — Integration runner supports only fixed npm scripts, not validation profiles

`src/main/planExecution/integrationPolicyRunners.ts` supports one runner kind:

`npm-script`

The runner receives:

- candidate root;
- check definition;
- trusted target script definition.

It does not receive immutable integration selection context such as:

- target commit;
- incoming commit;
- candidate commit;
- changed paths/capabilities.

Impact:

The integration policy can select only static named scripts. It cannot mechanically ask "run the affected integration profile for this exact candidate."

That architectural limitation encouraged use of a full-suite script as a safety blanket.

### MEDIUM — Integration checks themselves are serial

`integrationCandidateService.validate()` executes required checks one after another.

This is appropriate when checks mutate/rely on shared build output, but the current policy therefore adds:

```text
typecheck duration
+ build duration
+ full regression duration
```

There is no validation-plan knowledge to collapse redundant static work.

The correct fix is plan-level build reuse, not blindly parallelizing all three commands.

### MEDIUM — Built-output freshness depends on caller discipline

`test:unit:built` assumes `dist` matches source. Documentation explicitly says it is appropriate only when output is known to match current source.

Integration candidate currently establishes that sequence correctly by running build first, but the script itself does not prove freshness.

Impact:

Future lane scripts must not make stale built output an implicit correctness assumption.

### MEDIUM — Test file is currently the scheduling unit, but some files contain multiple proof classes

The capability map has one `proposedValidationLane` per executable test file.

Files that mix functional integration and performance/soak evidence therefore cannot be correctly selected without splitting the file.

This is a structural constraint, not just metadata cleanup.

### MEDIUM — Workflow/card guidance is inconsistent in practice

`src/main/validation/implementationValidationScopeGuidance.ts` correctly says:

- choose the smallest practical boundary;
- do not make broad/multi-domain suites automatic gates;
- full suite belongs only to work that owns integration/baseline validation.

The Work/Repair Card governance says the same.

Nevertheless HOTFIX20's card explicitly required:

```text
npm run typecheck
npm run build
npm test
```

for a bounded MCP lifecycle Repair.

Impact:

Even after lane governance was adopted, card authors continued to reach for the legacy canonical full command because the executable lane architecture did not exist.

This is both an execution gap and a workflow migration gap.

## Same-Day Regression Delta — Confirmed 2026-09-20

The repository was already slow before the current WIR22 repair sequence. The evidence does **not** support treating the present two-hour Work Card behavior as merely the old baseline.

### Pre-regression reference point

WIR20 recorded:

```text
test/agent-harness/git-mutation-boundary.test.cjs
30 tests
209.52 seconds
```

Approximately 3.5 minutes for one focused integration file was already too slow, but it provides a useful pre-today reference point.

### Regression 1 — Routed lifecycle projection repeatedly reacquires complete planning inventories

WIR22 REPAIR04 introduced/expanded routed direct/phased lifecycle proof and reported:

```text
34 focused tests
766,621 ms
≈ 12.8 minutes
```

REPAIR05 reported:

```text
55 focused tests
897,083 ms
≈ 15.0 minutes
```

Current production source confirms a multiplicative projection cost:

- `loadRoutedDevelopmentExecution()` calls `listPlanningDocuments(workspaceRoot)`, which acquires a full `PlanningRepositorySnapshot`;
- while iterating execution artifacts it calls `evaluateDocumentFreshness(workspaceRoot, ...)`;
- the string-root overload of `evaluateDocumentFreshness` calls `acquirePlanningRepositorySnapshot(workspaceRoot)` again;
- every snapshot acquisition runs `discoverPlanningMarkdownInventory()`, recursively walking `planning/` and `lstat`-ing the inventory even when cached content can be reused;
- routed actions call `loadRoutedDevelopmentExecution()` again as their precondition;
- tests commonly call `query()` immediately before the action to obtain the current fingerprint, causing the projection work to run twice;
- composed lifecycle helpers called from the projection can independently acquire additional planning snapshots.

This bypasses the existing `PlanningProjectionContext` optimization pattern. The repository already contains performance proof requiring one pre-write and one post-write planning inventory scan for comparable Development projection work. Routed execution was added without carrying that architecture forward.

This is a production-path performance regression as well as a test regression.

### Regression 2 — Full production lifecycle replay was added to focused tests

REPAIR06 added a routed application composition case that performs, for each clean/conflicted subcase:

```text
seed routed Intake
→ route decision
→ route assessment
→ approved Plan
→ Work Card Intake
→ Formal Work Card draft/promotion/review
→ Implementer execution
→ source checkpoint
→ Work Item validation
→ close
→ Plan acceptance
→ integration candidate
→ target validation
→ target advancement
→ conflict path + Integration Repair when applicable
```

Measured result:

```text
selected parent + two subcases: 2,184,020 ms ≈ 36.4 minutes
clean subcase:                  820,196 ms ≈ 13.7 minutes
conflicted subcase:          1,363,358 ms ≈ 22.7 minutes
```

The worker in this test is a controlled in-process fake. No live model call explains the delay.

The test therefore magnifies the routed projection/source-control/integration costs by replaying the complete lifecycle twice. Much of the intermediate lifecycle behavior already has owning tests elsewhere.

A full production-path acceptance case remains valuable, but it must not be the ordinary focused regression for every change touching routed Development.

### Regression 3 — Real npm process execution was multiplied across semantic policy scenarios

REPAIR06A introduced the target-owned integration-policy provider and a real `npm-script` runner. Its policy scenarios invoke actual npm processes in isolated candidates.

Timing progression:

```text
WIR20 before policy provider:
  30 tests   209.52 s  ≈ 3.5 min

REPAIR06A:
  43 tests   638.92 s  ≈ 10.6 min

REPAIR06A-REPAIR01:
  46 tests   673.57 s  ≈ 11.2 min

REPAIR06B:
  48 tests 1,117.39 s  ≈ 18.6 min
```

The focused target-policy subset alone recorded:

```text
13 tests
207,629.84 ms
≈ 3.46 minutes
```

The semantic scenario matrix now repeatedly pays real process-launch and candidate source-control costs even when the behavior under test is policy identity, stale target rejection, schema transition, or service recreation rather than npm process execution itself.

The real npm adapter requires dedicated conformance proof for:

- trusted script resolution;
- actual candidate cwd;
- lifecycle/pre-post suppression;
- hostile `.npmrc` override resistance;
- timeout/process-tree termination;
- output ceiling;
- bounded/sanitized failure evidence.

Those expensive adapter properties do **not** need to be re-proved through every higher-level semantic integration scenario.

### Regression 4 — Production Integration Repair broadened expensive real-source-control work across preserved scenarios

REPAIR06B routed existing conflict, validation-failure, retry, worker-index, and Operator-decision scenarios through the production repair-policy provider.

That provider adds repeated immutable blob reads, changed-path calculation, checkout ownership verification, policy resolution, source digest checks, and bounded Git process execution.

This is legitimate production behavior, but exercising the complete provider/process stack for the entire semantic scenario matrix transformed a previously slow file into an 18.6-minute test file.

Semantic controller behavior and real provider/process conformance need separate proof boundaries.

### Why this creates two-hour Work Cards

The present validation cost is iterative, not one final run.

A typical repair cycle can become:

```text
focused run 10–20+ min
→ failure
→ correction
→ focused rerun 10–20+ min
→ another production-path run 15–36 min
→ correction
→ rerun
→ required combined regression
```

Two or three correction cycles can consume two hours before the Implementer reaches broader validation.

The full repository gate is still a serious architectural problem, but it is **not sufficient** to explain today's magnitude. Today's routed-projection amplification and heavyweight semantic test composition must be repaired directly.

### Confirmed root-cause hierarchy

1. **New repeated planning snapshot/inventory acquisition in routed projections** — algorithmic production regression.
2. **New full-lifecycle production-path replay inside focused regression** — test composition regression.
3. **New real npm process execution repeated across broad semantic policy scenarios** — adapter-boundary regression.
4. **New production Integration Repair provider exercised across the complete scenario matrix** — real-process/source-control amplification.
5. **Existing global serial execution** — multiplies all of the above.
6. **Existing full-regression integration policy** — makes all unrelated expensive proof a final integration tax.

The TVA implementation is not complete unless it corrects items 1–4 as well as items 5–6.

### Immediate regression-recovery targets

Before claiming general test-architecture success:

- a stable routed projection must use one shared PlanningProjectionContext/inventory scan rather than reacquiring snapshots inside artifact loops;
- a routed mutation may use the minimal bounded pre/post snapshots required for correctness, not repeated independent inventory scans through composed helpers;
- ordinary focused routed-integration proof must not replay the entire planning/implementation/validation lifecycle for every semantic branch;
- one explicit end-to-end lifecycle acceptance may remain in a wider integration profile;
- semantic integration-policy scenarios must not launch real npm unless npm/process behavior is the thing being proved;
- semantic Integration Repair scenarios must use the narrowest provider boundary that still proves the owned behavior;
- the full `git-mutation-boundary.test.cjs` file must first return at least to its pre-today timing envelope, then be optimized further by the remaining TVA cards;
- no ordinary focused test command should contain a 10+ minute single test file after the regression-recovery card.

## Root Cause Analysis

### Primary root cause

**Adopted test-lane architecture was documented and inventoried but never completed as executable repository infrastructure.**

The repository is in an inconsistent transition state:

```text
Governance:
  select relevant lanes
  use capability map
  keep performance/desktop separate
  full suite only at wide boundaries

Execution:
  one glob
  one serial runner
  all test files
  every integration
```

### Secondary root causes

#### 1. Safety was implemented as maximum execution rather than mapped proof

When integration validation was added, the easiest deterministic safe policy was "run everything."

That prevents under-testing, but scales linearly with repository growth and ignores the already-adopted capability map.

#### 2. Classification and execution were designed separately

The capability map records excellent metadata, but there is no ValidationPlanner/Executor consuming it.

The data model exists without its runtime.

#### 3. Test file boundaries predate lane architecture

Slow performance tests and functional tests accumulated in the same files. File-level lane selection therefore cannot isolate cost.

#### 4. One global concurrency rule was used to avoid flakiness

`--test-concurrency=1` is a conservative stabilization mechanism. It also serializes hundreds of tests that are safe to run concurrently.

The suite lacks explicit execution-safety metadata, so the runner cannot distinguish them.

#### 5. Legacy canonical commands remained authoritative in daily use

The governance standard says the old command reference should be replaced during V2 kickoff decomposition. It was not.

Agents and Architects therefore continue to copy old validation commands into new cards.

#### 6. Integration policy lacks candidate-aware validation planning

The integration runner cannot derive affected capabilities from exact target/incoming/candidate revisions. Full regression became the only generic "safe" fixed npm script.

## Why HOTFIX20 Exposed the Problem

HOTFIX20 was small in source scope but changed MCP lifecycle behavior and added substantial regression proof.

Implementation was isolated correctly, but final integration entered the repository-wide validation gate.

At that point integration cost became dominated by unrelated repository evidence rather than HOTFIX20's changed behavior.

The Operator experienced the result as "Git merge took 26+ minutes." Mechanically, Git merge itself is not the expensive operation. ChampCity's integration workflow synchronously coupled target advancement to a monolithic serial validation suite.

From the Operator's perspective that distinction does not matter: the product operation "integrate completed work" took over 26 minutes. Therefore the architectural responsibility is ChampCity's.

## Contributing Architecture Debt

The current setup effectively creates this scaling law:

```text
integration latency
≈ build duplication
+ sum(duration of every test file)
+ real-time waits
+ process launch/cleanup waits
```

Because all test files are serial, adding an unrelated new test makes every future integration slower.

That is structurally unsustainable for the intended multi-agent model. Five agents can implement concurrently, but if each completed implementation must queue behind a 10–30 minute global regression, the integration gate becomes the throughput bottleneck.

## Target State

The repair is not "delete slow tests."

Target state:

- capability map drives execution;
- build/static work occurs once per validation plan;
- fast/affected tests execute continuously;
- safe files run with bounded parallelism;
- real Electron/process tests execute only in Desktop/integration profiles where relevant;
- performance/soak executes deliberately;
- integration uses changed-path/capability-aware validation;
- full regression remains explicit phase/release evidence;
- every omitted test is omitted because policy assigned it to another lane, not because an agent chose to skip it;
- validation receipts explain exactly what ran and why.

## Immediate Performance Expectations

The adopted governance already sets:

- static <30 s;
- fast <30 s, temporary max 60 s;
- ordinary affected capability <60 s.

The target architecture additionally sets:

- ordinary integration gate target <3 minutes;
- review threshold at 5 minutes.

A candidate that legitimately requires Desktop platform, packaging, performance, or full-regression evidence may exceed that target, but the plan must say so before execution and explain why.

## Repair Boundaries

This initiative must not:

- remove regression tests solely because they are slow;
- weaken target-owned integration validation;
- turn IntegrationCandidate into an unvalidated fast-forward;
- hide platform or performance regressions;
- introduce network-dependent test execution;
- install a new third-party test framework without demonstrated necessity;
- rewrite product source merely to make old tests cheaper;
- use test-count reduction as an acceptance metric.

## Recommended Implementation Order

1. make the capability map executable through a ValidationPlanner/Executor;
2. establish real lane commands without deleting tests;
3. split known mixed-lane files;
4. remove duplicate build/typecheck work;
5. add explicit safe/exclusive scheduling and bounded parallelism;
6. implement affected-capability selection;
7. provide integration runner context and switch integration to `integration-gate`;
8. update developer/card/workflow validation commands;
9. audit redundant/source-proxy tests after the execution architecture is stable;
10. enforce duration budgets and measure regressions.

## Disposition

This is an architecture/implementation deficiency, not a single flaky test or isolated HOTFIX20 problem.

A dedicated bounded implementation bundle is required before normal multi-agent V2 work continues to scale.
