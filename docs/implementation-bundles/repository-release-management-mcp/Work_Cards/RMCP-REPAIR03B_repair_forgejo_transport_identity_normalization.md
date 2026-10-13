# RMCP-REPAIR03B — Repair Forgejo Git Transport Identity Normalization

**Classification:** MCP provider transport / Git authentication defect  
**Priority:** Blocker  
**Parent:** RMCP project-independent Git and Forgejo tooling  
**Status:** Ready for Implementer  
**Scope:** Forgejo provider-owned Git transport resolution, existing-remote inspection, and credential projection only

## Objective

Repair the project-independent Forgejo Git transport path so a configured/authenticated Forgejo repository can be cloned, bound, inspected, fetched, pushed, tagged, and verified through ChampCity MCP without weakening the existing credential boundary.

This is a transport-identity repair.

Do not add release orchestration, workflow registration, repository migration, raw shell access, or model-visible credentials.

## Live Failure

The configured Forgejo provider reports:

- configuration: configured
- readiness: ready
- authenticated identity present
- repository metadata inspection succeeds

The first project-independent hosted clone attempt fails before successful Git transport with:

`INVALID_INPUT — Remote destination must be a bounded credential-free Git transport identity.`

A previously configured canonical Forgejo `origin` also cannot be inspected through `git_toolbox.inspect_remote`; it fails at the same remote-destination identity parser.

No remote branch/tag/release mutation is required to reproduce this defect.

## Verified Source Path

The failing path is:

`integration_toolbox.clone_hosted_repository`

→ `ForgejoHostingAdapter.resolveGitRemote(...)`

→ provider-advertised `clone_url` / `ssh_url`

→ `remoteDestinationIdentity(destination)`

→ `createProviderOwnedRemote(...)`

→ `LocalGitRepositoryAccessService.clone(...)`

The failure occurs at the generic remote-destination validation boundary before the clone operation can complete.

The same generic parser is used by:

- `inspectGitRemote()` for existing configured remotes;
- `RepositoryHostingFacade.gitHttpAuthentication()` / Forgejo authentication matching;
- provider-owned remote creation and verification.

Therefore this is not only a clone defect. Any existing Forgejo remote expressed in the rejected-but-valid URL shape can also fail inspection and fail to receive the application-owned Git HTTP credential, producing the earlier symptom:

`fatal: unable to get password from user`

## Root Cause

`remoteDestinationIdentity()` currently treats only one narrow canonical set of Git transport strings as valid.

The live Forgejo server advertises a syntactically valid Git transport form that is usable by Git but is rejected by this parser before the Forgejo adapter can apply provider-specific host/repository policy.

The exact raw provider URL must **not** be dumped into logs or reports merely to diagnose this. The repair must establish the structural mismatch safely and normalize provider-advertised URLs before they cross the generic provider-owned-remote boundary.

Known valid-but-noncanonical forms that must be explicitly evaluated include:

- HTTPS URL with username-only userinfo and no password;
- explicit default port;
- trailing slash after repository path;
- optional `.git` suffix;
- equivalent case normalization of scheme/host;
- Forgejo installations under a URL prefix.

Do not assume one of those examples is the live cause without proving it in the Implementer report using safe structural evidence.

The existing tests use normalized synthetic Forgejo clone URLs and therefore did not exercise the live provider URL shape.

## Architectural Boundary

Three different concerns must remain separate:

1. **Provider advertisement**
   - Forgejo returns a clone URL.
   - The Forgejo adapter knows the authenticated identity, configured namespace, API host, transport policy, and exact hosted repository.

2. **Canonical provider-owned destination**
   - ChampCity converts a provider-advertised URL into one canonical credential-free destination.
   - No password/token/query/fragment survives.
   - The canonical destination must still resolve to the exact configured provider host/port and hosted namespace/repository.

3. **Configured Git remote inspection**
   - Existing repository remotes may contain an older but valid credential-free spelling.
   - Inspection must be able to identify and compare that destination safely so the Operator/Architect can replace it with the provider canonical form using CAS.

Do not solve this by accepting arbitrary Git URLs globally.

## Required Repair

### 1. Add bounded Forgejo URL canonicalization

Inside the Forgejo provider boundary, normalize the provider-advertised Git URL before passing it to `createProviderOwnedRemote`.

For HTTPS/HTTP transport:

- parse using `URL`;
- allow only `https:` and, when explicitly configured, `http:`;
- reject password;
- reject query and fragment;
- reject traversal, encoded traversal, encoded separators, control characters, backslashes, and ambiguous path forms;
- normalize scheme/hostname case;
- normalize default ports without changing non-default explicit ports;
- normalize an optional final slash;
- normalize optional `.git` suffix for identity comparison;
- require the resulting repository path to identify exactly the configured namespace + requested repository, including any explicitly supported installation path prefix;
- never accept a different host, namespace, repository, or port.

If username-only HTTPS userinfo is present:

- treat it as non-secret metadata only if the provider-specific adapter can prove it is consistent with the authenticated/configured Forgejo identity;
- remove it from the canonical destination stored in `ProviderOwnedRemote`;
- never preserve userinfo in the provider-owned canonical remote;
- still reject any password or token-like userinfo.

Do not loosen the generic provider-owned destination contract merely because Forgejo advertised a noncanonical form.

### 2. Preserve strict generic provider-owned remote creation

`createProviderOwnedRemote()` must continue receiving a canonical credential-free destination.

The object handed to Git must contain no:

- password;
- API token;
- OAuth token;
- HTTP Basic credential;
- query string;
- fragment;
- credential helper syntax;
- arbitrary transport helper.

The provider adapter is responsible for normalization before minting the provider-owned remote.

### 3. Repair existing configured remote inspection

`inspectGitRemote()` must be able to inspect an already-configured, valid credential-free Git remote even if its spelling is noncanonical.

Introduce a bounded inspection parser/normalizer rather than forcing every pre-existing remote to already equal the provider canonical output.

Inspection may accept a strictly limited legacy/equivalent form such as verified username-only HTTPS or harmless trailing-slash/default-port spelling, but must still reject:

- password-bearing URLs;
- tokens in userinfo;
- query/fragment credentials;
- ext helpers;
- shell transports;
- URL rewrite ambiguity;
- multiple fetch/push destinations;
- mirrors where the action forbids them;
- traversal/redirect forms.

Return only sanitized structural identity:

- transport;
- host;
- port;
- repository identity;
- canonical/equivalent identity digest;
- current raw-binding digest for CAS.

Do not return raw credentials or an unsafe raw URL.

### 4. Allow CAS replacement of legacy/equivalent remotes

Once `inspectGitRemote()` can safely identify the existing destination, `bind_repository_remote` must be able to replace it with the canonical provider-owned destination using the current exact binding digest.

The replacement must:

- require explicit provider/repository/remote name;
- require exact expected current binding when replacing;
- verify provider-hosted repository state as already implemented;
- write the canonical credential-free destination;
- preserve unrelated Git configuration;
- re-inspect after mutation;
- prove the final destination identity belongs to the configured provider and hosted repository.

Do not silently rewrite remotes during read-only inspection.

### 5. Repair Git HTTP credential matching for equivalent remote spellings

`RepositoryHostingFacade.gitHttpAuthentication()` and the Forgejo adapter currently depend on remote destination parsing.

A pre-existing valid Forgejo HTTPS remote must receive the configured application-owned credential when its normalized structural identity matches:

- configured Forgejo host/port;
- configured namespace;
- requested repository;
- configured HTTPS transport policy.

The match must be based on the safely normalized destination identity, not byte-for-byte raw URL spelling.

If no configured provider owns the destination, return no credential.

If more than one configured provider could own it, fail closed as today.

The credential remains call-scoped and must never appear in:

- Git arguments;
- Git config;
- MCP input/output;
- logs;
- repository remote URL.

### 6. Make clone use the canonical destination

`clone_hosted_repository` must:

1. inspect/authenticate the provider;
2. resolve the hosted repository;
3. canonicalize the provider-advertised Git destination;
4. mint a provider-owned remote;
5. clone through existing bounded Git execution and call-scoped authentication;
6. verify the resulting checkout;
7. return only bounded checkout/provider identity.

The destination directory rules already implemented in `LocalGitRepositoryAccessService.clone()` remain unchanged.

Do not broaden local filesystem access.

### 7. Improve safe diagnostics

The current generic error:

`Remote destination must be a bounded credential-free Git transport identity.`

is insufficient when it originates from a provider-advertised URL.

Add a bounded provider-specific diagnostic/error that identifies the rejected structural reason without exposing credentials or the full raw URL.

Examples of safe reason codes:

- `unsupported-userinfo`
- `unexpected-host`
- `unexpected-port`
- `unexpected-repository-path`
- `query-or-fragment`
- `unsafe-path-encoding`
- `unsupported-transport`

Do not include the token, password, full raw URL, or local filesystem path.

The Implementer report must record the live structural reason code that caused this defect.

## Required Tests

Extend the existing Forgejo hosting/provider-owned remote tests.

### Provider-advertised HTTPS variants

Test accepted provider-specific normalization for:

- canonical HTTPS URL;
- username-only HTTPS URL whose username matches provider identity;
- explicit default HTTPS port;
- trailing slash;
- optional `.git` suffix;
- supported installation-prefix form if the product supports one.

Verify all accepted variants produce the same canonical repository identity where appropriate.

### Rejections

Reject:

- HTTPS password;
- token-looking/password userinfo;
- unrelated username when provider policy requires identity match;
- query token;
- fragment;
- unrelated host;
- unrelated port;
- unrelated namespace;
- unrelated repository;
- encoded slash/backslash;
- dot traversal / encoded dot traversal;
- ext/helper transports;
- ambiguous multiple destinations.

### Existing remote compatibility

Create a local repository with a valid noncanonical Forgejo remote spelling.

Verify:

- `inspect_remote` succeeds and returns sanitized identity;
- binding digest is stable for the actual config;
- call-scoped authentication matches the configured provider;
- no credential appears in args/config/results;
- `bind_repository_remote` can CAS-replace it with canonical provider destination;
- post-replacement inspection verifies exact provider identity.

### Clone

Against the existing controlled private HTTP/HTTPS Forgejo fixture:

- provider status ready;
- hosted repository inspect succeeds;
- `clone_hosted_repository` succeeds with the same URL shape that previously failed;
- cloned checkout has expected branch/HEAD;
- token is absent from destination/config/result;
- failed auth leaves no false success claim.

### Regression

Keep green:

- ordinary Git remote parsing;
- SSH/SCP Forgejo path;
- GitHub remote behavior;
- provider-owned remote CAS;
- local checkout containment;
- portable repository context;
- no raw shell/credential input.

## Live Qualification

Use the currently configured Forgejo connection after automated fixtures pass.

Read-only qualification first:

1. `provider_status(forgejo)` → ready.
2. inspect the configured hosted repository.
3. resolve/validate the live provider Git transport through the repaired path.
4. inspect an existing local Forgejo remote if present.

Then perform a **disposable clone only** under a trusted temporary destination.

Do not push a real branch/tag as part of repair acceptance.

Expected:

- clone succeeds;
- exact hosted repository identity is preserved;
- credential is not present in remote URL/config/output;
- cloned refs match the selected hosted repository.

Delete the disposable qualification clone after evidence capture if the existing bounded cleanup operation safely supports it; otherwise report its location internally without adding it to source control.

## Acceptance Criteria

1. Configured/authenticated Forgejo provider remains `ready`.
2. Existing hosted repository inspection remains functional.
3. The live provider-advertised HTTPS clone URL is safely normalized rather than rejected.
4. `clone_hosted_repository` succeeds against the live configured Forgejo repository using a disposable trusted destination.
5. No credential appears in the clone URL, Git config, MCP result, logs, or Implementer report.
6. Existing valid noncanonical Forgejo remotes can be inspected.
7. Existing remote inspection reports sanitized identity and exact CAS binding.
8. Provider-aware Git HTTP authentication recognizes an equivalent pre-existing Forgejo remote.
9. Push/fetch/tag authentication no longer falls through to interactive password prompting solely because of URL spelling.
10. Provider remote replacement can canonicalize an existing remote with exact expected binding.
11. Raw password/token/query/fragment URLs remain rejected.
12. Unrelated host/namespace/repository destinations remain rejected.
13. SSH behavior remains unchanged unless a verified equivalent normalization is required.
14. GitHub behavior remains unchanged.
15. No workflow Project or `repositoryCheckoutId` dependency is introduced.
16. No release/build orchestration is introduced.
17. JSON/Zod/MCP contracts remain consistent.
18. Existing Forgejo and Git fixture suites pass.

## Non-Goals

Do not:

- publish branches, tags, releases, or feeds as part of this repair;
- add arbitrary URL input to MCP;
- expose provider credentials;
- relax host/repository ownership checks;
- add shell or raw Git argument passthrough;
- register an external repository as a ChampCity Project;
- alter release sequencing;
- hardcode a consumer repository into product code.

## Implementer Report

Return:

- exact source-level RCA;
- safe structural reason the live Forgejo URL failed validation;
- files changed;
- canonicalization rules;
- existing-remote compatibility rules;
- credential-matching behavior;
- automated test commands/results;
- disposable live clone qualification result;
- proof credentials were absent from outputs/config;
- checkpoint commit.

Do not include the real Forgejo token or a raw credential-bearing URL.

## Stop Condition

Checkpoint this repair only and return for Architect code review.
