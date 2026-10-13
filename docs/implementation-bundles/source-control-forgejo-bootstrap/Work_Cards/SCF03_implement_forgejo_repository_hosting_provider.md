# SCF03 — Implement Forgejo Repository Hosting Provider

**Order:** 3 of 4  
**Depends on:** SCF02  
**Governing architecture:** `docs/architecture/CHAMPCITY_REPOSITORY_AND_SOURCE_LAYOUT_DECISION.md` and SCF02 provider contract  
**Implementer Report:** `docs/implementation-bundles/source-control-forgejo-bootstrap/Implementer_Reports/SCF03_IMPLEMENTER_REPORT.md`

## Verified Repository / Provider Evidence

- ChampCity currently has no Forgejo repository-hosting adapter.
- `integration_toolbox` is still a status-only compatibility surface and is not the correct internal domain boundary for repository hosting.
- Existing External MCP Provider infrastructure is for consuming MCP providers. Forgejo repository provisioning can be implemented directly as a bounded Service Host adapter.
- Current Forgejo releases expose API operations for creating a repository for the authenticated user and for an organization. Verify the exact target-instance Swagger/OpenAPI at execution time.
- Forgejo push-to-create is disabled by default and must not be enabled by this bundle as a workaround.
- The intended first real target is a self-hosted Forgejo instance with SSH Git transport.

Re-verify target-version API details before implementation.

## Objective

Implement Forgejo as the first `RepositoryHostingProvider` from SCF02.

The provider must be application-configured, idempotent, private-by-default for this bundle, credential-safe, and capable of creating/resolving an empty hosted repository and returning a validated provider-owned SSH remote identity.

## Required Changes

### 1. Add application-owned Forgejo provider configuration

Configuration belongs to the Service Host/deployment profile, not to Project source.

Represent at minimum:

- Forgejo API base URL;
- provider ID = `forgejo`;
- configured owner/namespace;
- owner kind = authenticated user or organization;
- preferred Git transport = SSH;
- optional expected SSH host/port policy;
- credential reference/resolver;
- explicit policy for whether insecure HTTP API transport is allowed.

Do not hardcode `192.168.100.27`, `forgejo-admin`, SSH port `2222`, or Retrobovine repository names into provider code.

### 2. Bound credential handling

Introduce only the minimum credential resolver seam needed by this provider.

Production credential material must be obtained inside the Service Host process.

Acceptable first-bundle implementation:

- a bounded injected credential resolver;
- optionally an environment/deployment-secret bootstrap behind that resolver if no general secure settings facility exists yet.

Not acceptable:

- token in Project State;
- token in repository files;
- token in MCP input;
- token in logs/receipts;
- token embedded in remote URLs;
- model-visible provider configuration containing the secret.

Sanitize all provider errors before crossing the application boundary.

### 3. Provider status / identity proof

Provider status must prove enough to distinguish:

- not configured;
- configured but unreachable;
- authentication required/failed;
- ready.

When authenticating, resolve the current Forgejo user and verify the configured user namespace when owner kind is `user`.

For the first implementation, do not use an admin-create-on-behalf-of-arbitrary-user API. A user namespace must correspond to the authenticated Forgejo identity.

Organization ownership must verify the configured organization is accessible before creation.

### 4. Inspect repository idempotently

Implement exact repository lookup by configured owner + bounded repository name.

The provider must distinguish:

- repository absent;
- repository exists and matches requested owner/name;
- repository exists but violates required policy;
- access denied / ambiguous provider response.

Do not infer existence from HTML/browser state.

### 5. Create a private empty repository

For this bundle, hosted creation is private-only from the MCP/product surface.

Use the target Forgejo API equivalent of:

- authenticated user: `POST /api/v1/user/repos`;
- organization: `POST /api/v1/orgs/{org}/repos`.

Required semantics:

- exact bounded repository name;
- private repository;
- no README/license/template/bootstrap commit from Forgejo;
- no `auto_init`;
- intended default source line = `main` where the target API supports that setting;
- no push-to-create dependency.

Use the smallest request accepted by the target Forgejo version and verify the created repository afterward.

If the exact repository already exists and matches the configured owner/policy, return it idempotently rather than creating a duplicate.

### 6. Resolve and validate the provider-owned Git remote

Prefer the provider/API-advertised SSH clone identity when available.

Validate before returning it to SCF02 binding mechanics:

- SSH scheme/transport is allowed;
- host matches configured provider policy;
- port matches configured policy when constrained;
- owner and repository path exactly match the resolved hosted repository;
- no credentials/password/token are embedded;
- no query/fragment or unexpected alternate destination.

Return only bounded hosted metadata and a provider-owned remote object.

### 7. Explicit insecure-HTTP policy

The current homelab target may be reachable by plain HTTP.

Do not silently treat credential-bearing HTTP as equivalent to HTTPS.

If HTTP support is necessary for the first self-hosted deployment:

- require an explicit Service Host configuration flag permitting insecure API transport for that configured endpoint;
- surface degraded/insecure status clearly;
- never allow the model to toggle that policy;
- keep HTTPS as the normal/default policy.

Do not broaden this into arbitrary private-network discovery.

## Architecture Constraints

- No browser automation.
- No Forgejo UI scraping.
- No External MCP Gateway requirement.
- No push-to-create.
- No generic Forgejo administration surface.
- No issue/PR/Actions features.
- No public repository creation in this bundle.
- No hardcoded Atomic Forge instance values.
- No raw provider token in any returned object.
- Bound response size and sanitize server-provided error text.

## Primary Surface to Inspect

- SCF02 repository-hosting contracts/service
- Service Host configuration/deployment settings surfaces
- existing external-provider error sanitization patterns where reusable without coupling domains
- ProjectResource/source-control services
- HTTP/fetch utility conventions
- tests around provider configuration and secret redaction

## Acceptance Criteria

1. Unconfigured Forgejo reports `not-configured` without network activity.
2. Ready status authenticates against the configured instance and proves expected user/org authority.
3. A bounded private empty repository can be created.
4. Re-running create for the same existing matching repository is idempotent.
5. User namespace creation refuses a configured owner that does not match the authenticated user.
6. Organization creation uses the configured organization path and verifies access.
7. The created repository has no Forgejo-generated initial source commit.
8. Returned remote identity is SSH, provider-owned, host/owner/repo validated, and credential-free.
9. API tokens never appear in logs, thrown cross-boundary messages, reports, Project State, or MCP-visible values.
10. HTTP API use is rejected unless explicit Service Host insecure-transport policy allows the configured endpoint.
11. Push-to-create configuration is untouched.
12. Provider failure does not alter local Git source.

## Validation

Minimum:

- `npm run typecheck`
- deterministic provider unit tests with a fake HTTP server;
- status/auth classification tests;
- current-user create request test;
- organization create request test;
- idempotent existing-repository test;
- private + no-auto-init request assertion;
- remote validation/rejection tests;
- token/error redaction tests;
- insecure HTTP policy test.

Do not make the automated suite depend on the live homelab Forgejo instance. Live instance qualification belongs to SCF04.

## Implementer Report

Record target Forgejo API/version evidence consulted, provider/config contracts, credential resolver boundary, endpoints used, idempotence behavior, remote validation, security behavior, tests, commands/results, deviations/blockers, and checkpoint commit. Never include the actual token.

## Post-Implementation

Checkpoint SCF03 only. Then read SCF04.
