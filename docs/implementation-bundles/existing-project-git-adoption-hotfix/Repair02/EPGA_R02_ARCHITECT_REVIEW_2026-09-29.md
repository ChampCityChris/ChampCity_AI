# EPGA Repair02 Architect Review — 2026-09-29

**Reviewed checkpoint:** `000b9707c7ebf0c18c2e44ec89587e4d2cb217ed`  
**Disposition:** **ACCEPTED — GO FOR REAL CHAMPCITY_AI UI CONVERSION**

## Review scope

This review evaluates only the Repair02 product contract:

- no legacy Project-container `.champcity` import as source;
- fresh current managed-repository integration policy provisioning;
- one shared provisioner for Existing Project adoption and Greenfield bootstrap;
- generic source-integrity policy for repositories without the current validation-profile authority;
- stronger integration-gate policy only when current validation-profile authority is present;
- no fabricated project-specific Integration Repair scope;
- managed reopen does not regenerate repository policy.

No additional Git edge-state expansion is introduced by this review.

## Code review findings

### PASS — one generic provisioner owns new managed-repository policy

`managedRepositoryIntegrationPolicy.ts` owns current policy creation for both Existing Project conversion and Greenfield bootstrap.

There is no duplicated JSON template between the two flows.

### PASS — legacy Project-container .champcity state is not imported

Existing Project normalization copies ordinary source, then removes any copied snapshot `.champcity` tree before provisioning the new repository-owned policy.

The incoming root policy, Project State, migration state, checkout metadata, arbitrary files, and repository metadata do not govern the new managed baseline.

### PASS — generic repositories receive an actually generic minimum policy

Repositories without the current validation-profile authority receive:

- `champcity-source-integrity`;
- lane `static`;
- runner `source-integrity`;
- no repository script execution;
- no project-specific paths;
- no Integration Repair scope.

The production runner verifies registered candidate identity, exact candidate revision, candidate cleanliness, and absence of conflicts.

It accepts no executable command/script/path input.

### PASS — validation-profile policy is capability-derived, not project-name-derived

The stronger policy is selected by the presence of the fixed current validation-profile authority:

- required validation toolkit files;
- capability catalog;
- profiles document;
- bounded build/typecheck definitions.

No ChampCity_AI project identity check exists.

The current ChampCity_AI source qualifies for this current stronger policy.

### PASS — current policy is generated rather than preserved

The ChampCity-style fixture intentionally supplies different legacy policy bytes.

After conversion, the baseline contains a newly generated integration-gate policy and no `repair` section.

The test proves the generated policy differs from the old bytes and is loadable through the production `loadIntegrationPolicyAtCommit` path.

### PASS — policy is force-tracked despite .champcity ignore semantics

Existing Project canonical baseline creation force-adds `INTEGRATION_POLICY_PATH`.

Greenfield bootstrap also force-adds the generated policy with the initial baseline.

Only the repository-owned policy is intentionally source-tracked under the source checkout's `.champcity` namespace.

### PASS — managed reopen does not regenerate policy

Provisioning occurs only at the new managed-repository baseline boundary.

The managed-ready path bypasses policy generation.

Greenfield proof also modifies the managed policy and confirms bootstrap/reopen does not overwrite it.

## Validation evidence

The Implementer report records passing normal-Windows focused validation:

- Existing Project managed-source/adoption owner;
- Greenfield source bootstrap owner;
- integration-policy/source-integrity semantics;
- integration-profile gate;
- integration candidate semantics;
- capability-map integrity;
- production build;
- migration validation-plan preview;
- `git diff --check`.

During Architect review, the connected validation runner was still occupied by the prior multi-file validation invocation after the client-side batch call timed out, so a second independent execution could not be started. This is a runner serialization condition, not contradictory test evidence.

Static Architect review directly inspected the production provisioner, source-integrity runner, policy provider, policy schema, Existing Project call site, Greenfield call site, and focused test assertions.

## Known non-blocking consequence

The generated validation-profile policy intentionally does **not** recreate ChampCity_AI's old project-specific Integration Repair `repair` section.

Consequences:

- ordinary target validation/integration remains supported;
- a future integration requiring automatic Integration Repair will fail closed because no repair scope is configured;
- the old repair scope is not preserved as legacy state;
- a current project-specific repair scope should be established later through normal managed repository configuration if/when that capability is required.

This is the deliberate Repair02 contract and is not a conversion safety defect.

## Conversion disposition

The previous integration-policy baseline-loss blocker is closed.

The real ChampCity_AI project may now be converted through the UI using:

**Accept and Convert**

Expected result:

```text
current conventional ChampCity_AI source
→ source preservation snapshot
→ old Project-container .champcity excluded from source
→ current integration-gate policy generated
→ canonical baseline created
→ main = baseline
→ dev = baseline
→ managed Main/Dev topology verified
→ Current Project registered
→ Workflow Hub
```

After conversion, reopening the same Project should classify it as managed-ready and should not present the conversion warning again.

## Post-conversion verification

After the UI reports success, Architect should inspect the resulting managed topology before any further development work:

- Project root has no authoritative conventional `.git`;
- `.champcity/repository.git` is the common repository;
- Main is exact `main`;
- Dev is exact `dev`;
- main and dev begin at the same canonical baseline;
- Dev baseline contains freshly generated `.champcity/integration-policy.json`;
- Current Project/Repository identity resolves;
- repository status is coherent.

This is verification of the destructive conversion result, not another approval gate.
