# SCF04 — Expose Semantic Source/Hosting MCP and Qualify Retrobovine

**Order:** 4 of 4  
**Depends on:** SCF01, SCF02, SCF03  
**Governing architecture:** `docs/architecture/CHAMPCITY_PRODUCT_CAPABILITY_MODEL.md` and `docs/architecture/CHAMPCITY_SOURCE_CONTROL_PROVIDER_ARCHITECTURE.md`  
**Implementer Report:** `docs/implementation-bundles/source-control-forgejo-bootstrap/Implementer_Reports/SCF04_IMPLEMENTER_REPORT.md`

## Verified Repository Evidence

- `git_toolbox` is RepositoryCheckout-bound for source operations and therefore cannot be the only entry point for a Project that has no RepositoryCheckout yet.
- `project_toolbox` currently exists as a status-only reserved MCP surface and is the natural current location for Project-level source lifecycle actions.
- `integration_toolbox` is also status-only, but repository hosting belongs to Repository & Source Control Management rather than generic external integration.
- Once managed source exists, existing `git_toolbox` actions already provide bounded status, commit/history, fetch, push, and other exact-checkout operations.
- SCF01 provides explicit local source enablement; SCF02/03 provide provider-owned Forgejo provisioning and remote binding.

Re-verify the published MCP registry and active contracts at execution start.

## Objective

Expose the minimum semantic MCP surface required for an agent to take a source-neutral Existing Project through managed local source enablement and configured Forgejo hosting without receiving raw Git initialization/configuration powers.

Then qualify the complete path against `Retrobovine_Media` as the first real Existing Project.

## Required Changes

### 1. Activate Project-level source lifecycle MCP actions

Use `project_toolbox` unless the repository now contains a more specific adopted semantic Repository MCP surface.

Add bounded actions equivalent to:

- `inspect_source_control`
- `enable_source_control`

`inspect_source_control` must return the current semantic state and, when source-neutral promotion is eligible, the SCF01 exact plan.

`enable_source_control` must:

- require files.write authority;
- require the exact current promotion `planId`;
- call the application-owned source-enablement service;
- never accept a filesystem path;
- never accept Git command/branch/remote arguments;
- return bounded managed Repository identity + Main/Dev RepositoryCheckout summaries + model-access projection status.

Do not make generic `git_toolbox` non-checkout-bound simply to solve bootstrap.

### 2. Expose configured repository-hosting semantics

On the same semantic Project/Repository management surface, add actions equivalent to:

- `repository_hosting_status`
- `provision_repository_hosting`

For the first implementation:

- provider must be a registered configured provider ID;
- `forgejo` is supported;
- repository name is bounded;
- hosted visibility is private;
- owner/host/SSH destination come from provider configuration, not model input;
- operation resolves-or-creates the hosted repository, binds the provider-owned remote through SCF02, and persists/returns the bounded hosting ProjectResource/binding metadata.

Do not expose the Forgejo token or raw arbitrary URL.

Do not activate `integration_toolbox` solely to host these actions unless the governing architecture is explicitly revised first.

### 3. Preserve local-first failure semantics

The end-to-end agent flow is deliberately phased:

1. inspect source;
2. enable local managed source;
3. inspect hosting provider;
4. provision/bind Forgejo;
5. use exact Main/Dev RepositoryCheckout IDs with existing `git_toolbox` to push/synchronize.

If steps 3-4 fail, step 2 remains complete and usable.

Do not roll back source because remote provisioning failed.

### 4. Publish checkout access immediately

After source enablement succeeds, the same MCP session must be able to discover/use the newly registered Main/Dev RepositoryCheckouts through `git_toolbox.list_repository_checkouts`.

If the current Agent Harness contract publication model requires a controlled registry-generation update for newly added actions, implement that through the existing publication lifecycle rather than session-specific hacks.

### 5. Keep destructive authority bounded

- files.read may inspect status/plans.
- files.write is required to enable source or provision/bind hosting.
- source enablement requires exact plan state.
- remote replace/remove, if exposed at all, must use SCF02 exact expected binding.
- repository deletion is not in scope.
- public visibility is not in scope.
- arbitrary host/URL/credential input is forbidden.

### 6. Add a deterministic end-to-end fixture acceptance

Before live Retrobovine qualification, add a disposable automated scenario that proves:

source-neutral directory
→ inspect
→ enable managed source
→ RepositoryCheckout publication
→ fake Forgejo provider create/resolve
→ provider-owned remote bind
→ push main/dev to disposable remote
→ verify remote refs.

The fake hosting provider may use a local HTTP fixture plus local bare Git remote; do not require external network in automated tests.

### 7. Real Retrobovine Media acceptance

Use the registered `Retrobovine_Media` ChampCity workspace/project as the live dogfood target.

Do not hardcode its path in product code.

Required live sequence:

1. verify Retrobovine is genuinely source-neutral before mutation;
2. inspect and record the exact source-enablement plan;
3. confirm known generated/cache state is classified out of canonical source;
4. enable managed source through the new semantic MCP action;
5. verify Project root is non-Git and managed `Main` / `Dev` exist;
6. verify MCP immediately reports both RepositoryCheckout IDs;
7. inspect configured Forgejo provider status;
8. resolve or create private empty `forgejo-admin/Retrobovine_Media` through the configured provider;
9. bind the provider-owned SSH remote as the managed Repository's `origin`;
10. push the intended `main` and `dev` refs using existing bounded Git MCP operations;
11. verify Forgejo remote refs match exact local commits;
12. verify no generated junk or credential/local-only state entered the initial baseline;
13. verify no manual Git shell command or Forgejo browser/UI action was required.

If the live Forgejo owner is no longer `forgejo-admin`, use the configured provider owner and record the discrepancy in the Implementer Report rather than changing product code to match this card text.

### 8. Bundle qualification

Run the smallest relevant canonical regression set for:

- managed source bootstrap/adoption;
- Current Project registration;
- RepositoryCheckout publication;
- Git mutation/remote operations;
- Agent Harness MCP contract publication;
- Forgejo hosting provider;
- source-neutral workflow compatibility.

Then run the repository's designated bundle/final qualification lane once.

Do not repeatedly run the full suite during the individual substeps.

## Architecture Constraints

- Operator remains the only authority. Exact plan IDs/preconditions are concurrency/staleness controls, not a new approval layer.
- No manual approval gate for background Git/hosting mechanics once the Operator has invoked the semantic action.
- No raw `git init`, `git remote add`, token, host, or URL parameters in MCP.
- No browser automation.
- No Retrobovine-specific code.
- No source rollback on optional remote failure.
- Do not disturb unrelated WSF or other active work.
- One final SCF04 checkpoint commit after deterministic and live acceptance evidence is complete.

## Primary Surface to Inspect

- `src/main/agentHarness/tools/toolRegistry.ts`
- `src/main/agentHarness/workspace/workspaceAccess.ts`
- `src/main/modelAccess/projectModelAccessCoordinator.ts`
- SCF01 source-enablement service/contracts
- SCF02 hosting/binding service/contracts
- SCF03 Forgejo provider
- MCP contract publication/fingerprint tests
- `test/agent-harness`
- `test/source-control`
- `test/project-state`

## Acceptance Criteria

1. A model with files.read can inspect source/hosting state without mutation.
2. A model with files.write can explicitly enable source using an exact current plan.
3. The source-enable action works before any RepositoryCheckout exists and does not require a fake checkout ID.
4. Newly created Main/Dev checkouts become usable in the same active ChampCity model-access lifecycle.
5. Forgejo provisioning accepts provider ID + bounded repository identity, not arbitrary remote URL/token.
6. A private empty hosted repository can be resolved/created and bound to `origin`.
7. Existing `git_toolbox` can push the managed source after binding.
8. Remote provisioning failure leaves local managed source healthy.
9. Retrobovine Media passes the live sequence with no manual shell/UI bootstrap.
10. No cache/generated or credential/local-only state is present in the initial Retrobovine baseline.
11. No Forgejo credential appears in MCP output, logs, reports, Project State, or repository history.
12. Source-neutral Projects not opting into source control continue to function.
13. Published MCP contract inventory/fingerprint is current after the new actions are added.
14. Final designated repository qualification passes or any unrelated pre-existing failure is explicitly isolated with evidence.

## Validation

Minimum focused automated proof:

- `npm run typecheck`
- source-control managed bootstrap/adoption tests;
- Current Project/model-access tests;
- Git mutation remote-binding tests;
- Agent Harness tool-contract/publication tests;
- Forgejo provider tests;
- new end-to-end disposable source-neutral → hosted remote scenario.

Then run the designated final/bundle qualification lane once.

Live proof:

- Retrobovine Media acceptance described above.

## Implementer Report

Record:

- exact starting commit / isolated checkout;
- published MCP action contracts;
- permission/precondition behavior;
- deterministic fixture results;
- Forgejo provider status without secrets;
- Retrobovine before/after topology;
- initial baseline commit and exact local/remote main/dev refs;
- excluded generated/local-only state evidence by bounded paths/counts only;
- test commands/results;
- final qualification;
- deviations/blockers;
- checkpoint commit.

Do not record tokens or credential-bearing URLs.

## Post-Implementation

Stop after SCF04 checkpoint and report the bundle ready for Architect code review. Do not begin ChampCity's own GitHub-to-Forgejo migration under this bundle.
