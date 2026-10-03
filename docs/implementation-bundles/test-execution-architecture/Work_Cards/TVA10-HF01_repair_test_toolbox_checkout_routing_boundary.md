# TVA10-HF01 — Repair test_toolbox Checkout Routing Boundary

**Type:** Blocking Hotfix
**Owner:** Agent Harness / MCP Test Execution
**Parent:** TVA10 — Add Bounded Test Execution Capabilities to `test_toolbox`
**Related architecture:** Repository Checkout Orchestration / checkout-bound MCP execution
**Blocks:** reliable Architect/Validator use of `test_toolbox` until accepted
**Implementer Report:** `docs/implementation-bundles/test-execution-architecture/Implementer_Reports/TVA10-HF01_IMPLEMENTER_REPORT.md`

## Incident

A valid public `test_toolbox` execution request currently fails before test selection with:

```text
executionFailed: true
failureReason: "Unsupported toolbox request fields"
selectedFiles: []
```

Observed with a normal call shaped as:

```text
test_toolbox.run_test_file(
  workspaceId = champcity_ai,
  repositoryCheckoutId = exact registered dev checkout,
  testPath = exact catalogued test
)
```

This is not a ValidationCatalog, planner, executor, test-file, or sandbox failure. The fixed child adapter rejects the request before planning because MCP routing metadata is leaking across the process boundary.

## Confirmed source defect

Architect source review established the complete failure path.

### Public contract

`src/main/agentHarness/tools/toolRegistry.ts` correctly makes non-status `test_toolbox` actions checkout-bound:

```ts
function testExecutionAction(name, params) {
  return {
    kind: "test-execution",
    params: withRepositoryCheckoutId(params),
    ...
  };
}
```

The central dispatcher then correctly:

1. requires `repositoryCheckoutId`;
2. resolves that exact registered checkout through `resolveRepositoryCheckoutContext(...)`;
3. replaces `context.root` with the resolved checkout root;
4. establishes the exact repository execution context.

At this point `repositoryCheckoutId` has completed its routing/security purpose.

### Defective dispatch

`testExecutionAction()` currently forwards the entire validated public `params` object unchanged:

```ts
dispatch: ({ context, params: values, signal }) =>
  executeTestToolbox(context, name, values, signal)
```

Therefore `executeTestToolbox()` serializes this child request:

```json
{
  "action": "run_test_file",
  "params": {
    "repositoryCheckoutId": "...",
    "testPath": "test/..."
  }
}
```

### Fixed validation adapter contract

`scripts/validation/toolbox-runner.cjs` intentionally accepts only action-specific execution fields:

```js
run_test_file: ["testPath"]
run_test_pattern: ["testPath", "testNamePattern"]
run_validation_profile: ["profile", "changedPaths", "capabilityIds"]
run_validation_lane: ["lane"]
audit_test_corpus: []
```

Its strict rejection of any additional field is correct:

```text
Unsupported toolbox request fields
```

The runner is deliberately bound to `process.cwd()`; callers must not choose or re-specify repository identity inside the child protocol.

## Root cause

Checkout binding was added to the public MCP/action boundary without separating:

- **routing metadata** used by the Agent Harness to choose the exact registered checkout; from
- **validation execution parameters** accepted by the fixed child adapter.

The registry resolves the checkout correctly but then forwards the already-consumed selector into a lower-trust protocol that intentionally rejects it.

A stale test contract also masked the regression:

`test/agent-harness/reserved-toolbox-namespace.test.cjs` still asserts that non-status `test_toolbox` execution schemas are valid without `repositoryCheckoutId`.

That contradicts the current public contract already asserted by `test/agent-harness/mcp-tool-contract-generation.test.cjs`, where non-status `test_toolbox` actions are checkout-bound.

## Architecture decision

Preserve both boundaries:

```text
MCP caller
  |
  | workspaceId
  | repositoryCheckoutId
  | action-specific params
  v
Agent Harness tool registry
  |
  | validate exact checkout identity
  | resolveRepositoryCheckoutContext()
  | context.root = exact registered checkout root
  | consume/remove repositoryCheckoutId
  v
executeTestToolbox()
  |
  | action-specific params only
  v
fixed toolbox-runner.cjs
  |
  | process.cwd() is the already-bound repository
  | no repository selector accepted
  v
ValidationCatalog -> Planner -> Executor
```

`repositoryCheckoutId` remains required in the public MCP schema for test execution. It must not cross into the fixed validation adapter request.

## Required implementation

### 1. Consume checkout routing metadata before test execution dispatch

Correct `testExecutionAction()` in:

`src/main/agentHarness/tools/toolRegistry.ts`

After the central dispatcher has validated and resolved `repositoryCheckoutId`, pass only action-specific execution parameters to `executeTestToolbox()`.

Expected implementation shape:

```ts
dispatch: ({ context, params: values, signal }) => {
  const { repositoryCheckoutId: _resolvedCheckout, ...executionParams } = values;
  return executeTestToolbox(context, name, executionParams, signal);
}
```

Equivalent bounded code is acceptable, but the ownership rule is not optional:

> checkout identity is consumed at the Agent Harness routing boundary; the validation child receives only its execution contract.

Do not make this a generic stripping rule for Git/release actions. This hotfix owns only `test-execution`.

### 2. Keep the fixed runner strict

Do **not** change `scripts/validation/toolbox-runner.cjs` to accept or ignore `repositoryCheckoutId`.

Do not add checkout fields to `actionKeys`.

Do not add a second repository-resolution path inside `executeTestToolbox()` or the child adapter.

The runner's strict allowlist is a security and architecture boundary and must remain intact.

### 3. Correct the stale public-contract test

Update:

`test/agent-harness/reserved-toolbox-namespace.test.cjs`

Its schema assertions for all non-status `test_toolbox` actions must include an exact `repositoryCheckoutId`.

Required public-schema expectations:

- `status` does not require checkout identity;
- `run_test_file` requires `repositoryCheckoutId`;
- `run_test_pattern` requires `repositoryCheckoutId`;
- `run_validation_profile` requires `repositoryCheckoutId`;
- `run_validation_lane` requires `repositoryCheckoutId`;
- `audit_test_corpus` requires `repositoryCheckoutId`;
- unknown extra fields remain rejected.

Preserve the matching assertions already present in `mcp-tool-contract-generation.test.cjs`.

### 4. Add regression proof for the routing/child boundary

Current tests separately prove public schema and runner strictness but do not prove that checkout routing metadata is consumed before child execution. That uncovered seam caused this incident.

Extend an existing Agent Harness execution/process-boundary owner if practical. Add a new permanent test file only if no existing owner can exercise this boundary without unrelated setup.

The regression must prove:

1. missing `repositoryCheckoutId` is rejected at the public test-execution boundary;
2. unknown/unregistered checkout identity is rejected before validation execution;
3. valid registered checkout identity resolves the exact checkout root;
4. the request delivered to the validation adapter contains the action-specific fields and **does not contain `repositoryCheckoutId`**;
5. `run_test_file` with a valid checkout reaches validation planning/execution instead of returning `Unsupported toolbox request fields`;
6. at least one second request shape (prefer `run_validation_profile` or `run_test_pattern`) uses the same stripping boundary;
7. arbitrary extra execution fields remain rejected.

Do not satisfy item 4 with source-text/regex inspection alone. Exercise the actual registry-to-adapter path or a deterministic process-boundary seam.

## Expected production scope

Production change should normally be limited to:

- `src/main/agentHarness/tools/toolRegistry.ts`

Tests expected to include:

- `test/agent-harness/reserved-toolbox-namespace.test.cjs`;
- an existing Agent Harness MCP/process-boundary test owner as needed for the missing runtime regression;
- `validation/capability-map.json` only if proof ownership/count/resource metadata changes.

Normally unchanged:

- `src/main/agentHarness/test/testToolbox.ts`;
- `scripts/validation/toolbox-runner.cjs`;
- ValidationCatalog/planner/scheduler/executor implementation;
- repository checkout registry/resolution;
- Git toolbox;
- release toolbox.

If production changes exceed this boundary, stop and report the newly proven reason rather than broadening the hotfix.

## Preserve

- exact registered `repositoryCheckoutId` requirement for non-status test execution;
- central checkout resolution and lease/release semantics;
- repository containment;
- `files.write` scope requirement for test execution;
- TVA10's no-shell/no-arbitrary-command boundary;
- fixed child working directory;
- strict action-specific runner allowlists;
- catalog-only test selection;
- validation profile/lane semantics;
- timeout/process-tree cleanup;
- source-context verification;
- bounded/redacted structured evidence;
- Git and release toolbox behavior.

## Forbidden changes

- no optional-checkout compatibility behavior for `test_toolbox`;
- no `repositoryCheckoutId` accepted by `toolbox-runner.cjs`;
- no caller-selected cwd;
- no arbitrary command/executable/environment arguments;
- no second checkout resolver in the validation layer;
- no changes to test classifications/profiles merely to make the hotfix pass;
- no broad Agent Harness routing refactor;
- no unrelated test-suite cleanup;
- no weakening strict unknown-field rejection.

## Validation

Use the normal Windows execution lane if the restricted/sandbox lane returns `spawn EPERM`. A sandbox launch failure is not product proof.

Required focused proof:

1. build/typecheck through the repository-authoritative validation plan selected for the exact changed paths;
2. corrected `reserved-toolbox-namespace.test.cjs`;
3. `mcp-tool-contract-generation.test.cjs`;
4. the runtime/process-boundary regression proving selector consumption;
5. exact changed-path repair profile/planner preview;
6. `git diff --check`.

Then exercise the repaired toolbox through its real public call path using an exact registered checkout:

```text
run_test_file
repositoryCheckoutId = exact registered dev checkout
testPath = one exact catalogued test
```

Acceptance requires that the request progresses beyond child request validation and produces normal selected-file/execution evidence. It must not fail with `Unsupported toolbox request fields`.

A failing selected test is not automatically a hotfix failure if the toolbox correctly executes it and truthfully returns test evidence; choose a small known-green catalogued test for the acceptance call where practical.

Do not run `audit_test_corpus`, full regression, release qualification, or unrelated broad profiles for this hotfix.

## Acceptance criteria

TVA10-HF01 passes when:

1. public non-status `test_toolbox` actions still require exact `repositoryCheckoutId`;
2. the central Agent Harness dispatcher resolves that checkout before execution;
3. `repositoryCheckoutId` is consumed at that boundary and never appears in the child validation request;
4. `toolbox-runner.cjs` remains strict and unchanged in checkout semantics;
5. valid `run_test_file` calls no longer fail with `Unsupported toolbox request fields`;
6. invalid/missing checkout identities continue to fail closed;
7. stale toolbox schema tests agree with the published MCP contract;
8. runtime regression proves the registry-to-adapter boundary rather than only inspecting source;
9. existing validation selection/execution behavior is preserved;
10. focused exact-path validation passes.

## Implementer Report

Write:

`docs/implementation-bundles/test-execution-architecture/Implementer_Reports/TVA10-HF01_IMPLEMENTER_REPORT.md`

Include:

- starting checkpoint;
- exact root cause;
- production/test files changed;
- confirmation that `toolbox-runner.cjs` checkout contract was not widened;
- before/after child request shape;
- public schema proof;
- missing/unknown/valid checkout proof;
- real `run_test_file` result showing the request reached validation execution;
- second action-shape regression result;
- planner/repair-profile receipts;
- any unrelated failures;
- remaining genuine human validation, if any.

## Checkpoint and return path

Commit:

`TVA10-HF01 repair test_toolbox checkout routing boundary`

Do not include concurrent RWS06-REPAIR01 source/test changes in this checkpoint.

After the checkpoint, return to Architect review and re-run the previously blocked focused `test_toolbox` verification against the refreshed Agent Harness.
