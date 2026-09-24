# WTR02C Repair01 — Tighten RepositoryCheckout Identity Contract Validation

**Parent card:** WTR02C — Separate Project Container, Repository, SourceLine, and RepositoryCheckout Path Contracts  
**Implementer:** GPT 6.0 Luna Medium  
**Starting implementation checkpoint:** `0d179986917fc909bcf6e33e4dace56c33c50918`  
**Architect finding:** the topology split is correct, but the RepositoryCheckout validator uses a weaker Workflow UUID shape than Project State, rejects valid SourceLine identities containing provider-ref separators, and accepts unsupported runtime fields  
**Report:** `docs/implementation-bundles/workflow-topology-recovery/Implementer_Reports/WTR02C_REPAIR01_IMPLEMENTER_REPORT.md`

## 1. Objective

Keep the WTR02C topology design unchanged and correct only the runtime identity validator so it matches ChampCity's established semantic contracts.

No topology materialization, MCP behavior, bootstrap behavior, or source lifecycle behavior belongs in this repair.

## 2. Finding A — Workflow UUID validation is weaker than ChampCity Entity ID validation

Current WTR02C uses:

```ts
/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
```

This enforces lowercase shape but accepts values that cannot be ChampCity Entity IDs, including invalid UUID version/variant forms.

Project State's established canonical ID vocabulary is structurally:

```text
8 hex
-
4 hex
-
version nibble 1–8 + 3 hex
-
variant nibble 8/9/a/b + 3 hex
-
12 hex
```

WTR02C requires an exact canonical application Workflow identity, not merely a UUID-shaped string.

### Required correction

Use one local canonical lowercase Workflow ID predicate equivalent to:

```regex
^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$
```

Do not make it case-insensitive. WTR02C intentionally requires canonical lowercase path identity.

Apply the same predicate consistently in:

- `resolveManagedWorkflowCheckoutPath()`;
- Workflow-role `RepositoryCheckout` validation.

Do not broaden Project State UUID policy in this repair.

## 3. Finding B — SourceLine identity is not the same vocabulary as Repository identity

Current WTR02C applies one regex:

```ts
/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/
```

to all three:

- `repositoryCheckoutId`;
- `repositoryId`;
- `sourceLineId`.

That is too strict for `sourceLineId`.

Current valid ChampCity SourceLines can map to provider refs such as:

```text
work-intake/<slug>-<digest>
workflow/<id>
feature/<name>
```

and the source lifecycle architecture explicitly distinguishes provider-neutral SourceLine identity from Repository identity while allowing Git provider branch/ref mappings.

### Required correction

Keep the bounded opaque identifier rule for:

- `repositoryCheckoutId`;
- `repositoryId`.

Validate `sourceLineId` using the existing bounded source-reference semantics:

- string;
- non-empty;
- maximum 512 characters;
- no whitespace;
- no control characters.

A slash is allowed.

Do not interpret the value as a filesystem path.

Do not run Git ref validation here. Provider-specific validation belongs to RepositoryService/provider mechanics.

### Required proof

A Workflow RepositoryCheckout with:

```text
sourceLineId = "workflow/a1b2c3d4-e5f6-4789-8abc-0123456789ab"
```

must validate when all other fields are canonical.

Also prove whitespace/control-containing SourceLine IDs reject.

## 4. Finding C — RepositoryCheckout runtime validator accepts unsupported fields

The shared contract intentionally excludes absolute host paths:

```ts
interface RepositoryCheckout {
  repositoryCheckoutId;
  repositoryId;
  sourceLineId;
  role;
  projectRelativePath;
  workflowId?;
}
```

Current runtime validation ignores extra object keys.

That means a JavaScript/runtime payload such as:

```js
{
  ...validCheckout,
  hostRoot: "C:/machine-specific/path"
}
```

can currently return `valid: true`.

That weakens WTR02C's contract boundary that absolute host-local paths remain main-process-only and do not enter the shared/persistable RepositoryCheckout contract.

### Required correction

The runtime validator must require an ordinary object with exactly these allowed fields:

```text
repositoryCheckoutId
repositoryId
sourceLineId
role
projectRelativePath
workflowId
```

Required fields:

```text
repositoryCheckoutId
repositoryId
sourceLineId
role
projectRelativePath
```

`workflowId` is optional at the structural layer and then constrained by role.

Reject:

- arrays;
- non-ordinary objects;
- missing required fields;
- unsupported extra fields.

Do not introduce a generic schema framework.

## 5. Preserve WTR02C topology behavior

Do not change:

- `Repository` interface shape;
- `RepositoryCheckout` interface shape;
- `RepositoryCheckoutRole`;
- `ManagedProjectSourcePaths`;
- `MANAGED_PROJECT_SOURCE_PATHS`;
- Project topology resolver output;
- non-Git Project-root support;
- redirect/symlink protection;
- path containment rules;
- SourceLine interface;
- physical topology behavior.

This is validator hardening only.

## 6. Focused permanent proof

Modify only:

`test/source-control/source-topology-path-contracts.test.cjs`

Extend the existing permanent test suite.

Required additions:

### Canonical Workflow ID

1. existing canonical lowercase version/variant Workflow UUID still passes;
2. UUID-shaped value with invalid version nibble rejects;
3. UUID-shaped value with invalid variant nibble rejects;
4. nil/all-zero UUID rejects;
5. uppercase remains rejected.

Examples may include:

```text
00000000-0000-0000-0000-000000000000
a1b2c3d4-e5f6-0789-8abc-0123456789ab
a1b2c3d4-e5f6-4789-7abc-0123456789ab
```

### SourceLine identity vocabulary

6. Workflow checkout with slash-bearing SourceLine identity validates;
7. sourceLineId with whitespace rejects;
8. sourceLineId with control character rejects;
9. sourceLineId longer than 512 rejects.

### Exact runtime object shape

10. extra `hostRoot` field rejects;
11. extra arbitrary field rejects;
12. array input rejects;
13. object missing a required field rejects.

Do not create another permanent test file.

## 7. Expected files

Production:

- `src/main/sourceControl/projectSourceTopology.ts`

Test:

- `test/source-control/source-topology-path-contracts.test.cjs`

Report:

- `docs/implementation-bundles/workflow-topology-recovery/Implementer_Reports/WTR02C_REPAIR01_IMPLEMENTER_REPORT.md`

`validation/capability-map.json` may change only if the permanent test count/basis must be updated accurately.

No other production file should change.

## 8. Explicit non-scope

Do not:

- modify source naming;
- modify `workSourceNaming.ts`;
- modify SourceLine creation;
- modify `WorkSourceOwner`;
- add Repository/RepositoryCheckout Project State entities;
- create Main/Dev/Workflow checkouts;
- run Git from the topology resolver;
- modify MCP/workspace behavior;
- modify `projectSourceBootstrap.ts`;
- change managed worktree behavior;
- implement WTR02D+;
- repair deferred WTR02E/F/G/H integration fixtures.

## 9. Validation

Required:

1. `npm run build`;
2. `node --test test/source-control/source-topology-path-contracts.test.cjs`;
3. validation planner preview for exact final changed paths;
4. `npm run test:affected -- --changes <exact-changed-path manifest>`;
5. `git diff --check`.

Focused Repair01 proof must pass.

Affected failures that are solely the already-documented deferred WTR02E/F/G/H or WTR03C behaviors may remain classified as deferred. Do not restore obsolete Work Intake source materialization.

## 10. Implementer Report

Write:

`docs/implementation-bundles/workflow-topology-recovery/Implementer_Reports/WTR02C_REPAIR01_IMPLEMENTER_REPORT.md`

Include:

- starting SHA;
- exact files changed;
- canonical Workflow ID rule;
- SourceLine identity rule;
- exact RepositoryCheckout object-shape rule;
- focused test count/result;
- affected-validation result and deferred failures if any;
- explicit confirmation that topology resolution/materialization/MCP/bootstrap behavior did not change.

Do not edit the committed report afterward solely to add the checkpoint hash.

## 11. Checkpoint and stop

After implementation, validation, report, and safety scan, create exactly one attributable checkpoint commit.

Suggested subject:

`WTR02C Repair01 tighten checkout identity validation`

No additional Operator Git approval is required.

Then stop. Do not begin WTR02D.
