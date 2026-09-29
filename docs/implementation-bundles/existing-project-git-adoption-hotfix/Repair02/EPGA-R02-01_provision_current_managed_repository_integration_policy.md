# EPGA-R02-01 — Provision Current Managed Repository Integration Policy

**Parent:** Existing Project Git Adoption Hotfix / Repair02  
**Starting implementation baseline:** `6200d383d61ff890d86492cb5ed6e3e17b3856d9`  
**Architect correction baseline:** `36bee11de8a74e4b101eb4712bbe577ce9ab83f0`  
**Implementer:** GPT 6.0 Luna Medium

## Objective

Make repository-owned integration policy a standard output of ChampCity managed-repository provisioning.

Do **not** preserve or import the pre-conversion Project-container `.champcity/integration-policy.json`.

Both:

- Existing Project forced normalization; and
- Greenfield managed-repository bootstrap

must generate a fresh current-schema integration policy appropriate to the repository's currently supported validation capability.

This removes the legacy-preservation special case and establishes one generic managed-project contract.

## 1. Ownership boundary

The Project-container namespace:

`<Project>/.champcity/`

is application-owned operational state and is not imported into source during Existing Project conversion.

Examples include:

- Project State;
- repository metadata;
- checkouts;
- runtime evidence;
- migration journals;
- old/foreign ChampCity files.

The repository-owned policy is created separately inside the new managed source baseline at:

`.champcity/integration-policy.json`

After provisioning, the copies visible in Main/Dev are normal version-controlled repository configuration.

Do not infer source ownership merely because an incoming root already contains a file at the same path.

## 2. Supersede legacy policy import

Existing Project forced normalization must not:

- preserve the old policy bytes;
- parse the old policy to decide the new policy;
- special-case ChampCity_AI identity;
- maintain compatibility with historical policy schema versions;
- inspect old Project-container `.champcity` state for policy migration.

The old Project-container `.champcity` state may remain in the migration recovery snapshot if existing recovery mechanics already preserve it, but it does not govern the new Repository.

## 3. Add application-owned policy provisioning service

Add one reusable source-control/project-bootstrap helper equivalent to:

`createManagedRepositoryIntegrationPolicy(sourceRoot)`

It returns the **current** `IntegrationPolicy` document to place into a newly managed repository.

The exact implementation location may vary, but Existing Project adoption and Greenfield bootstrap must call the same provisioner.

Do not duplicate JSON templates across the two flows.

The provisioner owns current defaults, not historical compatibility.

## 4. Add a universal application-owned source-integrity runner

The current policy schema has no universal default because:

- `npm-script` requires repository-specific script names;
- `validation-profile` requires the target repository to contain ChampCity's validation toolkit/catalog/profile authority.

Add one bounded current-schema runner variant:

```ts
{
  kind: "source-integrity",
  timeoutMs: number
}
```

Use an exact application-owned check identity such as:

`champcity-source-integrity`

and lane:

`static`

The source-integrity runner:

- executes no repository code;
- accepts no command/script/path/argument input;
- reuses existing IntegrationCandidate/registered-checkout/source-control invariants;
- verifies the candidate is the exact registered isolated candidate;
- verifies the candidate checkout resolves to the expected candidate revision;
- verifies the candidate checkout is clean;
- verifies candidate/target repository identity is unchanged;
- returns bounded deterministic IntegrationValidationEvidence.

Do not add a shell or arbitrary command adapter.

This becomes the universal minimum integration policy for repositories without a stronger supported validation profile.

## 5. Detect current validation-profile capability

A repository qualifies for the stronger `integration-gate` policy only when the source snapshot contains the exact current authority required by the existing profile adapter.

Use the existing fixed contract rather than loose heuristics.

At minimum prove the required current target-owned inputs exist and are structurally usable:

- fixed `scripts/validation/*` toolkit files required by `loadValidationProfileAuthority`;
- `validation/capability-map.json`;
- `validation/profiles.json`;
- required `package.json` script definitions used by the current profile provider.

Do not select `integration-gate` merely because the repository is Node/npm or has a `test` script.

Do not execute incoming validation code during capability detection.

## 6. Generated policy classes

### A. Generic current managed Repository

Generate:

```json
{
  "schemaVersion": 1,
  "checks": [
    {
      "checkId": "champcity-source-integrity",
      "lane": "static",
      "runner": {
        "kind": "source-integrity",
        "timeoutMs": 60000
      }
    }
  ],
  "requiredIntegrationChecks": [
    "champcity-source-integrity"
  ]
}
```

The exact timeout may differ within existing contract bounds.

No `repair` section is generated.

### B. Current validation-profile-capable Repository

Generate a fresh current policy with one required `integration-gate` validation-profile check.

Use current application constants/contract builders rather than copying the existing ChampCity_AI JSON bytes.

Do not automatically generate project-specific Integration Repair scope.

That scope is semantic project configuration and must be established later through normal managed source/project planning when appropriate.

## 7. Existing Project forced normalization

During conversion:

1. preserve ordinary Project source as Repair01 already does;
2. ignore incoming Project-container `.champcity` as source;
3. determine supported policy class from the preserved ordinary source snapshot;
4. create snapshot `.champcity/` only for the newly generated repository policy;
5. write generated `.champcity/integration-policy.json`;
6. force-add that exact generated file to the canonical baseline even if `.gitignore` ignores `.champcity/`;
7. continue canonical baseline/main/dev creation.

A pre-existing policy with intentionally different content must not survive by accident.

## 8. Greenfield bootstrap

Update `bootstrapProjectSource` so the initial source baseline also contains the generated current integration policy.

Greenfield and adopted Existing Projects must not have different managed-repository policy semantics.

The initial Greenfield policy will normally be the generic source-integrity policy unless the Greenfield source already contains the complete current validation-profile authority before baseline creation.

## 9. Already-managed Projects

Do **not** regenerate or overwrite policy on every open.

Provisioning occurs only when establishing a new managed Repository baseline:

- Greenfield bootstrap; or
- Existing Project forced normalization.

After that boundary, `.champcity/integration-policy.json` is normal repository-owned configuration and changes only through managed source evolution.

A missing/invalid policy in an already-managed Repository remains a repository defect and fails closed through existing integration policy semantics.

## 10. ChampCity_AI conversion expectation

The current ChampCity_AI source contains the exact validation-profile authority required by the existing `integration-gate` adapter.

Therefore the ChampCity-style conversion fixture must prove:

- the old root policy bytes are not imported as authority;
- the provisioner recognizes current validation-profile capability;
- a fresh current integration-gate policy is generated;
- the new baseline contains that generated policy;
- `loadIntegrationPolicyAtCommit(Dev, baseline)` succeeds;
- ordinary integration validation can resolve its target authority.

Project-specific old Integration Repair scope is not imported.

If automatic Integration Repair is later required, establish its current project-specific repair scope through normal managed configuration rather than legacy migration.

## 11. Runtime-state exclusion

Prove the canonical baseline does not accidentally commit application state such as:

- `.champcity/project-state.sqlite`;
- `.champcity/repository.git/**`;
- `.champcity/checkouts/**`;
- `.champcity/migrations/**`;
- runtime attempt/evidence state;
- arbitrary incoming `.champcity/*` files.

Only the newly generated repository-owned integration policy is created under source `.champcity/` by this provisioning step.

## 12. Architecture documentation

Update `PROJECT_INTEGRATION_VALIDATION_POLICY.md` to distinguish:

- Project-container `.champcity` application state; from
- repository-owned `.champcity/integration-policy.json` inside managed source.

Document the new `source-integrity` runner and managed-repository provisioning rule.

Do not rewrite unrelated architecture.

## Permanent proof

At minimum prove:

1. generic existing Git repo with no old policy converts and receives valid source-integrity policy;
2. generic existing repo with arbitrary/invalid old `.champcity/integration-policy.json` does not import those bytes;
3. generic generated policy parses under current schema;
4. generic source-integrity check resolves/runs through production integration policy provider without executing repository code;
5. Greenfield bootstrap receives the same generic policy contract;
6. ChampCity-style repo receives a freshly generated validation-profile integration-gate policy;
7. ChampCity-style generated policy is not byte-preservation of the incoming root policy;
8. `loadIntegrationPolicyAtCommit(Dev, baseline)` succeeds after ChampCity-style conversion;
9. current validation-profile authority is detectable without executing incoming code;
10. incomplete validation toolkit falls back to source-integrity policy rather than producing a broken integration-gate policy;
11. no project-specific `repair` scope is fabricated during bootstrap/adoption;
12. arbitrary incoming Project-container `.champcity` files are not committed;
13. Project State/repository metadata/checkouts/migrations are not committed;
14. reopening a managed project does not regenerate/overwrite its policy;
15. Existing Project conversion/reopen remains idempotent;
16. Greenfield source/bootstrap tests remain passing.

## Validation

Run focused validation only:

- build;
- managed-project-source/adoption tests;
- Greenfield source bootstrap tests;
- integration-policy semantics/provider tests;
- integration candidate test owner needed for the new source-integrity runner;
- Current Project entry tests if entry behavior changes;
- capability-map integrity when ownership changes;
- migration validation-plan preview;
- `git diff --check`.

Do not use broad unrelated full regression as the completion gate.

## Report

Write:

`docs/implementation-bundles/existing-project-git-adoption-hotfix/Repair02/Reports/EPGA-R02-01_IMPLEMENTER_REPORT.md`

The report must state:

- generated generic policy;
- validation-profile capability detection rule;
- ChampCity-style generated policy result;
- legacy-policy non-import proof;
- Greenfield parity result;
- source-integrity runner evidence;
- runtime-state exclusion;
- focused validation results.

## Checkpoint and STOP

Commit:

`EPGA-R02-01 provision managed repository integration policy`

Then STOP for Architect review.

Do not convert the real ChampCity_AI Project until this Repair02 implementation is reviewed and accepted.
