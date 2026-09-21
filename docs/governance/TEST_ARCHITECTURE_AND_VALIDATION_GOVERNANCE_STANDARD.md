# Test Architecture and Validation Governance Standard

Status: adopted V2 kickoff governance  
Applies to: ChampCity A/I V2 development and preservation of the frozen V1 baseline

## Purpose

This standard defines how ChampCity A/I tests are designed, selected, executed, reviewed, reported, and retired. It replaces test-count growth and indiscriminate full-suite execution with capability-oriented evidence that gives fast feedback during bounded development and stronger proof at phase and release boundaries.

Tests support engineering judgment; they do not replace it. A passing suite does not establish good architecture, readable code, correct user experience, or Operator acceptance. A failing test is evidence to classify, not an independent authority over product direction.

The Operator remains the only authority over work and disposition. Deterministic tooling may select and execute applicable validation, but neither a test, validation contract, CI service, nor agent may create an approval gate beyond the Operator-directed workflow.

## Baseline Finding

The frozen V1 repository begins V2 planning with a single test command that combines materially different kinds of evidence:

- approximately 930 literal test declarations across 118 test files, with additional generated runtime results;
- fast unit and domain tests;
- source-text and source-order assertions;
- characterization tests;
- filesystem and Git integration;
- HTTP and MCP integration;
- real Electron and child-process behavior;
- Windows lifecycle and packaging behavior;
- performance and reliability soak checks;
- a sixty-second idle measurement;
- tests with timeout allowances ranging through several minutes.

That historical command ran every matching test file serially and duplicated builds. The TVA implementation now exposes composed profiles and an explicit full command; see [Validation Command Lanes](../dev/VALIDATION_COMMAND_LANES.md). The baseline findings below remain historical rationale.

This baseline is not treated as proof that the tests are useless. It is evidence that valuable regression protection has accumulated without a coherent test architecture. The V2 kickoff must preserve useful behavior proof while separating fast development feedback from expensive integration, platform, packaging, and soak evidence.

## Governing Principles

1. **Behavior over implementation shape**  
   Tests should prove observable contracts, state transitions, outputs, containment, failure behavior, or user-visible results. They should not normally prescribe internal function names, source order, exact phrases in production files, or a preferred implementation technique.

2. **Relevant proof over maximum execution**  
   A bounded Work Item must run the tests mapped to the behavior it owns. Running every repository test is not inherently stronger evidence when most results are unrelated to the change.

3. **Fast feedback during implementation**  
   The ordinary edit-test loop must be short enough that an Implementer uses it continuously. Slow proof belongs in deliberately selected lanes.

4. **Stronger proof at wider boundaries**  
   Phase close, platform qualification, packaging, migration rehearsal, and release preparation require broader validation than an individual Work Card.

5. **Failures require attribution**  
   A failure must be classified as an in-scope regression, pre-existing defect, platform incompatibility, infrastructure failure, nondeterminism, or invalid/stale expectation. An exit code alone is not an adequate report.

6. **Tests do not own product decisions**  
   Adopted V2 architecture and Operator direction may intentionally replace frozen V1 behavior. A characterization test cannot veto that decision; it must be explicitly preserved, revised, superseded, or retired with evidence.

7. **Test quantity is not a quality target**  
   Test counts and line coverage may describe the suite, but they are not acceptance criteria. A smaller test that proves a stable boundary is more valuable than many assertions coupled to incidental code.

## Validation Lanes

The repository exposes distinct deterministic commands through its shared planner/executor. The following semantic lane requirements govern those commands.

### Static lane

Purpose:

- type checking;
- schema and contract validation;
- linting or deterministic source analysis where adopted;
- build verification when compilation output is required.

Target duration: under 30 seconds on the supported development workstation.

A validation command must not rebuild identical output more than once in the same lane.

### Fast lane

Purpose:

- pure domain behavior;
- reducers, parsers, resolvers, state transitions, and deterministic services;
- bounded contract checks without real external processes;
- focused regression tests suitable for repeated execution during implementation.

Target duration: under 30 seconds, with an initial maximum of 60 seconds during V2 extraction.

The fast lane must be deterministic, offline, independent of machine-global state, and safe to run repeatedly.

### Affected-capability lane

Purpose:

- execute the fast tests mapped to the capability, package, service, or application surface changed by the current Work Item;
- add narrowly relevant integration tests when the owned boundary requires them.

Target duration: under 60 seconds for an ordinary Work Card.

Selection must come from a maintained deterministic impact map or explicit Work Card scope. The Implementer may recommend additions but may not omit mapped tests merely to obtain a pass.

### Integration lane

Purpose:

- repository and filesystem boundaries;
- Git adapters;
- database or durable project-state adapters;
- HTTP, MCP, IPC, runtime adapter, and inter-process contracts;
- recovery behavior that requires controlled child processes.

Target duration: several minutes is acceptable when the lane is deliberately invoked.

Integration tests must use isolated temporary roots, controlled fixtures, bounded processes, and explicit cleanup. They must not depend on a developer's installed application state, active background agent, personal repositories, network access, or historical local artifacts.

### Desktop platform lane

Purpose:

- real Electron startup and shutdown;
- main/preload/renderer vertical paths;
- Windows process, tray, startup, lifecycle, and platform behavior;
- supported desktop environment compatibility.

This lane is run when a Work Item changes the Desktop host or at a defined phase boundary. Platform-specific tests must declare their supported platform and skip clearly elsewhere; they must not fail ambiguously on an unsupported host.

### Packaging lane

Purpose:

- installer generation and metadata;
- installation and uninstall lifecycle;
- packaged executable behavior;
- path, scope, branding, and process identity.

This lane is release-oriented. It is not part of routine unit or Work Card validation unless packaging behavior is the Work Item's explicit scope.

### Migration lane

Purpose:

- deterministic conversion from supported V1 inputs to V2 structured state;
- provenance, conflict, rollback, recovery, and export behavior;
- curated historical shapes that remain contractually supported.

Migration tests must use versioned fixtures. Archived development history is evidence for designing fixtures, not a live test dependency.

### Performance and soak lane

Purpose:

- CPU and memory stability;
- event-loop responsiveness;
- high-volume reconnect or session behavior;
- sustained lifecycle and recovery;
- long idle observations.

This lane is explicit and never part of the routine fast command. Real-time waits, including the existing sixty-second idle sample, belong here. Where equivalent proof can be achieved with a deterministic clock, simulated time is preferred; real elapsed-time measurement is reserved for actual performance qualification.

### Full regression lane

Purpose:

- aggregate all applicable supported-platform lanes for phase and release evidence.

The full lane is not the default Work Card command. It is required only when the active Work Item materially crosses multiple capabilities, at defined phase close, before release qualification, or when the Operator directs it.

“Full” must identify which platform-dependent lanes were included, skipped, or executed separately. A raw aggregate pass count is insufficient.

## Workflow Validation Policy

### Work Card implementation

An ordinary Work Card requires:

1. the static lane;
2. the affected-capability lane;
3. the fast lane when it is not already included;
4. any additional integration or platform lane explicitly mapped to the owned behavior.

The Work Card must name the expected lanes. It must not reflexively require the entire repository suite.

### Repair implementation

A Repair Card requires:

1. a regression test that reproduces the confirmed defect when practical;
2. proof that the regression test fails against the defective behavior or equivalent preserved evidence explaining why fail-before execution is unavailable;
3. the corrected affected-capability lane;
4. tests protecting the relevant previously passed behavior.

A repair does not reopen unrelated failures or require every release lane.

### Phase close

Phase close requires:

- static validation;
- the complete fast lane;
- all affected integration, Desktop, migration, or packaging lanes accumulated by the phase;
- an explicit failure and skip inventory;
- Operator validation where user-visible or otherwise judgment-dependent behavior requires it.

### Release qualification

Release qualification requires all supported release lanes, installation/package proof, known-defect disposition, and a concise machine-readable plus human-readable summary. Repeated execution of an unchanged expensive suite is not required merely to satisfy ceremony; results must be tied to the tested commit and environment.

## Test Design Rules

A permanent test must identify the stable behavior or boundary it protects.

Preferred evidence includes:

- inputs and observable outputs;
- persisted state and lineage;
- emitted events and typed contracts;
- calls across public service or adapter boundaries;
- repository containment and mutation results;
- rendered component behavior using an appropriate test renderer;
- real process behavior in the relevant integration or platform lane.

### Source-text inspection

Reading production source as text and asserting strings, regular expressions, identifier absence, or relative source order is prohibited by default.

An exception is allowed only when source structure is itself the governed boundary and no more direct deterministic mechanism is reasonably available. Examples may include a narrowly defined forbidden dependency, generated-file exclusion, or build-time ownership rule. Every exception must state:

- the non-negotiable boundary being protected;
- why behavioral or static-analysis proof is unavailable;
- why the assertion is stable across legitimate refactoring;
- the lane in which it belongs.

UI layout, workflow behavior, lifecycle behavior, and service correctness must not be “proved” only by matching source text.

### Mocks and fixtures

Mocks must isolate an external or nondeterministic dependency, not replace the behavior under test. A test that constructs the expected answer inside its mock and then verifies that same answer provides weak evidence.

Fixtures must be minimal, curated, versioned where applicable, and owned by the capability using them. Production code must not be changed merely to accommodate obsolete fixtures.

### Determinism

Routine tests must not depend on:

- uncontrolled wall-clock timing;
- network availability;
- global developer configuration;
- personal filesystem paths;
- previously running processes;
- execution order;
- an uncommitted repository state;
- undocumented Node, Electron, npm, or Windows patch-version behavior.

When an environment distinction is intentional, the test and report must identify it explicitly.

## Protection Against Agent Test Gaming

An Implementer is expected to satisfy the product behavior, not merely the verifier.

The following are prohibited unless the Work Item explicitly requires a legitimate test-governance change:

- weakening an assertion to match defective output;
- deleting, skipping, filtering, or renaming a failing test to obtain a pass;
- adding production branches that recognize test-only inputs or environments;
- duplicating expected strings solely to satisfy source inspection;
- replacing real behavior with a mock;
- reducing fixture realism without disposition;
- changing timeout or retry values solely to hide nondeterminism;
- reporting a focused pass as though the full required lane passed.

Tests that protect the same observable contract or a materially equivalent failure boundary must map to the same capability and behavior identity. A separate executable test, file, test name, implementation path, or fixture is not by itself a separate behavior. Implementers must not create additional behavior IDs to manufacture additional primary proofs, avoid supporting or redundant classification, or make coverage appear more diverse. When similar tests genuinely protect materially different contracts or failure boundaries and therefore receive different behavior IDs, the Implementer Report must identify the tests and explain the substantive behavioral distinction.

When production code and existing tests change in the same Work Item, the Implementer Report must explain each test change and identify whether it reflects:

- newly covered behavior;
- an intentional contract change;
- removal of implementation coupling;
- correction of an invalid expectation;
- retirement of superseded V1 behavior.

The Architect or Design Reviewer must evaluate whether changed tests still discriminate between correct and defective behavior. Test-file changes are evidence to review, not presumed misconduct and not presumed valid merely because the suite passes.

For high-risk domain behavior, mutation testing or deliberate fault injection may be used periodically to assess whether tests detect meaningful defects. It is not required in the routine fast lane.

## Failure Reporting

Every failed validation report must provide, at minimum:

- lane and exact command;
- commit or working-tree identity;
- operating system and relevant runtime versions;
- failing test name and file;
- concise error message;
- expected and actual behavior when available;
- whether the failure reproduces in isolation;
- failure classification;
- affected Work Item relationship;
- next recommended action or explicit statement that no action belongs to the current Work Item.

“Process completed with exit code 1,” a red status badge, or an aggregate count without the causal test is not an acceptable human-facing explanation.

Broader validation may reveal unrelated or pre-existing failures. Those failures must be recorded and routed to the proper capability or issue. They do not automatically invalidate a bounded Work Item whose owned evidence passed.

## Remote Automation and CI

Remote CI is optional infrastructure, not a default requirement and not an authority layer.

No agent may introduce or enable a remote CI workflow as generic repository hygiene without explicit Operator direction. Before adoption, a proposed workflow must establish:

- the exact purpose and triggering events;
- parity with documented local commands;
- supported and pinned environments;
- lane duration and cost;
- stable behavior on a clean machine;
- useful failure summaries;
- notification behavior;
- whether any branch policy consumes the result;
- ownership for investigating failures.

A remote check that only repeats a long local suite and reports an opaque exit code does not meet this standard.

## V2 Kickoff Decomposition Initiative

Test architecture decomposition is front-loaded V2 foundation work. It occurs before broad V2 feature development so that subsequent Work Cards receive fast, trustworthy feedback.

### Step 1: Inventory and classify

Create a machine-readable inventory of every V1 test file with:

- capability ownership;
- current test count;
- proposed lane;
- estimated or measured duration;
- platform dependency;
- process, filesystem, Git, network, and timing dependencies;
- source-inspection use;
- V2 disposition: preserve, rewrite, split, migrate, quarantine, or retire.

The inventory is evidence, not a permanent bureaucracy. It should drive scripts and impact mapping mechanically.

### Step 2: Establish lanes without losing evidence

Introduce separate scripts for static, fast, affected-capability, integration, Desktop, packaging, migration, performance/soak, and full regression execution.

Initially, existing tests may be moved or selected without rewriting behavior. The objective is to stop forcing unrelated expensive proof through the routine loop while preserving the frozen V1 baseline.

### Step 3: Remove validation duplication

Ensure ordinary validation performs one required typecheck/build sequence. Tests that consume built output should reuse the same verified build rather than rebuilding implicitly.

### Step 4: Audit source-inspection tests

Review every source-text assertion. Replace it with behavioral, rendered, contract, or proper static-analysis proof where practical. Retain only documented exceptions.

Priority begins with renderer and workflow tests because they contain the largest concentration of implementation-coupled checks.

### Step 5: Build the capability impact map

Map packages, services, adapters, and application surfaces to their required fast and integration tests. Selection should become deterministic from changed paths plus explicit Work Item scope.

The impact map must fail visibly when a changed area has no classification. It must not silently fall back to an expensive full suite as a permanent substitute for missing ownership.

### Step 6: Quarantine nondeterministic and environment-sensitive tests

A quarantined test remains visible and owned. Quarantine is not a pass and not deletion. Each item needs a reason, reproduction evidence, destination lane, and repair or retirement disposition.

Platform-specific tests must be executed on the supported platform rather than being treated as universal unit tests.

### Step 7: Measure the resulting system

Record:

- fast-lane duration;
- affected-lane duration by capability;
- full supported-platform duration;
- flaky or environment-sensitive failure rate;
- source-inspection test count;
- duplicated build time;
- failures caught before Architect review;
- failures that were invalid or unrelated to the change.

The target is useful signal per minute, not maximum test execution.

## V1 Preservation During V2 Extraction

The frozen V1 suite is a source of characterization evidence, not the design authority for V2.

Each extracted capability must disposition relevant V1 tests:

- **Preserve** when behavior remains a V2 contract.
- **Rewrite** when the behavior remains but the test is implementation-coupled.
- **Migrate** when the test belongs with a new Product Core or adapter boundary.
- **Split** when one file combines multiple lanes or capabilities.
- **Quarantine** when evidence is valuable but currently nondeterministic or environment-bound.
- **Retire** when adopted V2 architecture intentionally supersedes the behavior.

Retirement must identify the replaced behavior or redundant proof. It does not require retaining obsolete executable tests indefinitely.

## Relationship to Existing Standards

This standard governs test architecture and validation selection.

- `docs/dev/VALIDATION_COMMAND_LANES.md` remains the current V1 command reference until V2 kickoff decomposition replaces its monolithic automated lane.
- `docs/architecture/REPOSITORY_CODE_TEST_AND_MIGRATION_BOUNDARY.md` defines source precedence, production/test separation, and the distinction between frozen V1 characterization and adopted V2 architecture.
- `docs/governance/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md` requires validation mapped to owned behavior and prevents unrelated failures from becoming automatic Work Item gates.

Where the current V1 command reference requires indiscriminate full-suite execution, this adopted V2 governance standard controls new V2 planning and implementation. The V1 reference should be revised as part of the kickoff decomposition rather than informally reinterpreted by individual agents.

## Required Outcome

V2 development begins only after the repository has:

1. a bounded fast lane suitable for continuous Implementer use;
2. capability-to-test impact mapping;
3. explicit integration, Desktop, packaging, migration, performance/soak, and full lanes;
4. removal of duplicate build execution;
5. documented disposition of source-inspection and environment-sensitive tests;
6. validation reporting that explains causes rather than presenting opaque exit codes;
7. Work Card templates that request relevant proof instead of automatic full-suite repetition.

The result should make correct implementation easier to prove, defective implementation harder to disguise, and routine agent work materially faster without discarding hard-earned regression knowledge.
