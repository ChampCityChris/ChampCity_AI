# Implementer Report — RMCP-REPAIR03B

Status: transport identity repair implemented; checkpoint for Architect review. Live clone acceptance remains blocked by the existing bounded Git timeout.

## Authorized scope and repository verification

The Operator selected Repair Card RMCP-REPAIR03B. Verified `<PROJECT_REPO>` is the primary Dev checkout using its AGENTS.md, package manifest, active card and Git root. Branch: `dev`. Starting HEAD: `d1a2b1f2ecd78359602018cf13c4fdba6c28d1ac`. Origin remains the existing ChampCityChris/ChampCity_AI GitHub remote. The only initial untracked file was this active card. No unrelated source changes were present.

Scope is provider-owned transport identity normalization, existing remote inspection/CAS, and call-scoped HTTP authentication. No dependency, schema, workflow registration, release orchestration, local filesystem boundary, credential storage or credential-input changes were introduced.

## Exact RCA and safe live evidence

The generic parser applied the SCP regex `^(?:git@)?([a-z0-9.-]+):([a-z0-9_.\/-]+)$` before recognizing URL schemes. An ordinary HTTPS URL without an explicit port matches that regex: the scheme becomes the SCP host, and the authority/path becomes its path. Constructing an SSH URL from that match produces an invalid repository path. The generic INVALID_INPUT was raised before Git could run. Explicit non-default ports in the controlled HTTP fixture prevented that match, masking the defect.

Safe structural reason: **`url-misclassified-as-scp`**. The live configured provider's advertised URL was HTTPS, had a `.git` suffix, and matched the old SCP grammar. It contained no username, password, query, fragment, encoded path, trailing slash or installation prefix. The old built parser rejected it. These are observed structural facts, not an assumption that username-only userinfo caused the live failure. Neither the raw URL nor any real credential was logged or included here.

The generic parser now excludes strings containing `://` from SCP interpretation. It preserves SSH/SCP policy and fixes ordinary HTTPS and explicit SSH URL recognition.

## Files and behavior

Modified:

- `src/main/repository/providerOwnedRemote.ts`: bounded HTTP structural parser; separate inspection normalizer; canonical equivalent HTTP identity digest; URL/SCP dispatch correction. Generic provider-owned creation still rejects HTTP userinfo and trailing slashes.
- `src/main/externalProviders/forgejoHostingAdapter.ts`: provider-owned HTTP canonicalization and safe `transportReason` diagnostics; exact host/port/protocol/installation prefix/hosted repository checks; authenticated username-only userinfo verification/removal; equivalent HTTP credential matching with hosted repository verification.
- `src/main/core/gitExecution.ts`: internal call-scoped provider username proof for inspection. Credential injection remains private process environment, never Git arguments/config/MCP results.
- `src/main/externalProviders/repositoryHostingFacade.ts`: compare effective Git destinations with exact configured destinations before credential projection; reject rewrites/multiple destinations; retain fail-closed duplicate-provider ownership.
- `src/main/repository/gitRemoteManagement.ts`: sanitized inspection with provider proof for HTTP usernames; separate canonical identity and exact raw-binding digest; reject ambiguous/rewritten destinations; CAS canonical replacement preserves unrelated remote configuration and fetch refspecs; canonical removal identity support.
- `test/external-providers/forgejo-hosting.test.cjs`: extended existing provider-owned destination and private HTTP transport fixtures, keeping their stable test names.

Created for the checkpoint:

- `docs/implementation-bundles/repository-release-management-mcp/Implementer_Reports/IMPLEMENTER_REPORT_RMCP-REPAIR03B.md`.

Included as the governing task artifact: the initially untracked `docs/implementation-bundles/repository-release-management-mcp/Work_Cards/RMCP-REPAIR03B_repair_forgejo_transport_identity_normalization.md`.

No files deleted. Intentionally not created: permanent new test files, runtime imports from tests, JSON workflow sidecars, migration/compatibility packages, dependencies, releases, distribution artifacts, screenshots or model-visible credential fields. Temporary diagnostics/receipts/change sets remain ignored under `tmp/`.

## Canonicalization, inspection and authentication rules

HTTP parsing rejects controls/whitespace, backslashes, query/fragment delimiters, all encoded path forms, double separators and dot traversal before WHATWG URL normalization can erase evidence. Only HTTPS or explicitly allowed HTTP is supported. The Forgejo adapter requires the configured API protocol, host, effective port, installation prefix, exact inspected owner and requested repository. URL normalizes scheme/host case and default ports. One final slash and optional `.git` suffix normalize to the adapter's `.git` destination.

Username-only userinfo must exactly match the authenticated bounded Forgejo login. Passwords, colon-bearing/encoded/ambiguous userinfo and unrelated usernames are rejected. Canonical provider-owned remotes contain no userinfo. Provider diagnostics return only fixed structural reasons: unsupported-userinfo, unexpected-host, unexpected-port, unexpected-repository-path, query-or-fragment, unsafe-path-encoding or unsupported-transport.

Existing HTTP inspection allows equivalent harmless case/default-port/final-slash/suffix spellings. Username inspection additionally requires the configured provider's private call-scoped authentication resolver; an unverified username fails closed. Fetch/push effective URLs must each equal their actual configured values and have one destination. Inspection returns structural identities/digests and tracking metadata, never raw URLs or username/credential fields. The CAS binding also covers raw fetch values, explicit raw push values, effective values, mirror values and refspecs, so a spelling-only or explicit-push-binding change cannot reuse a stale CAS digest. Inspection never rewrites configuration.

Replacement requires explicit provider, repository and remote name, plus exact expected binding, and retains hosted repository verification and the config lock. Only URL/pushURL fields are replaced; unrelated remote fields and existing fetch mappings are preserved. The result is re-inspected against the provider-owned identity. Mirrors remain forbidden for mutations/ref inspection that already prohibited them.

Authentication checks normalized provider protocol/host/port/prefix/namespace and verifies the requested hosted repository. It removes verified username metadata while retaining the safe actual path spelling for Git's URL-scoped HTTP header. Unowned destinations receive no credential; duplicate provider ownership fails closed. Redirects remain disabled. Public JSON/Zod/MCP input contracts are unchanged.

## Validation

All successful process-heavy executions used the normal Windows lane and the installed Node/npm/Git toolchain. Restricted execution of `npm run test:repair -- --changes tmp/rmcp03b-changes.json` returned `spawn EPERM` (build step exit null, receipt failed, dependent proof blocked). It was recorded once and rerun normally. Restricted credential-store qualification also returned REPOSITORY_PROVIDER_NOT_READY; its normal-lane rerun succeeded. A read-only safety helper's nested Git spawn returned EPERM; exporting the diff through the shell and scanning it without child processes resolved that restriction.

- `npm run test:repair -- --changes tmp/rmcp03b-changes.json --preview`: restricted read-only lane, exit 0; selected 51 files, including static/build, all fast, affected capability and integration proof. Declared preserved capabilities: repository-hosting, release-and-git-operations, agent-harness-repository-operations.
- `npm run test:repair -- --changes tmp/rmcp03b-changes-final.json --preview`: restricted read-only lane, exit 0 after report creation; all eight checkpoint paths classified and the same 51 test files selected. Only documentation changed after the runtime proof.
- Initial normal `npm run test:repair -- --changes tmp/rmcp03b-changes.json`: stopped (exit 1) after focused proof exposed an authentication ownership gap; no pass is claimed. The initial focused Forgejo run was likewise stopped after that failure. A named provider-owned-destination diagnostic failed because credentials could match a different repository path under the namespace without hosted metadata verification. The implementation now verifies the requested hosted repository, and the fixture returns 404 for absent identities.
- `npm run build`: normal lane, exit 0 after correction. TypeScript, renderer and asset build passed; existing renderer chunk-size advisory only. This supplied current output for focused diagnosis; the final composed run subsequently owned its own fresh build.
- `node --test test/external-providers/forgejo-hosting.test.cjs`: normal lane, exit 0; **8/8 passed**, zero cancelled/skipped, 221,192 ms. Includes controlled private HTTP clone, exact branch/HEAD, fetch/push/tag authentication, canonical/legacy comparison, exact CAS and secret absence. An action-name/timing-only diagnostic confirmed progress and was stopped after it served that purpose.
- Final `npm run test:repair -- --changes tmp/rmcp03b-changes.json`: normal lane, exit **1**. Receipt `5e285c3b-13b8-41d3-8c70-71766b1891d3`, sourceStable **true**, fresh build 20,066 ms, total 1,567,967 ms. **49/51 files passed; 432 tests: 429 passed, 1 failed, 2 cancelled, 0 skipped.** All static/build, fast and affected-capability files passed. Forgejo was **8/8** within this composed run (233,157 ms). GitHub, remote/tag, Git qualification, provider Settings, repository context and containment evidence passed.
- The composed failures were timing failures: the extended lifecycle scenario exceeded 600,000 ms; local provider-owned CAS exceeded its 90,000-ms scenario limit; local pull failed a create_branch_from_ref Git command at its unchanged 15,000-ms deadline. The extended direct-transform scenario passed. No semantic transport assertion failed in the final composed receipt.
- `node --require ./scripts/validation/child-cleanup.cjs --test --test-name-pattern="RMCP01 provider-owned remote CAS|RMCP01 local pull" test/agent-harness/git-toolbox-local-operations.test.cjs`: normal lane, exit **0**, **2/2 passed**, zero cancelled/skipped. CAS/clone passed in 63,889 ms; pull/merge/rebase recovery passed in 280,622 ms; process total 345,139 ms. Source/build remained unchanged. An initial invocation without the leading `./` on the preload path exited 1 before running tests; that command was corrected.
- `node --require ./scripts/validation/child-cleanup.cjs --test --test-name-pattern="unregistered selected Git checkout supports" test/agent-harness/git-toolbox-extended-operations.test.cjs`: normal lane, exit **0**, **1/1 passed**, zero cancelled/skipped; lifecycle 451,535 ms, process total 451,926 ms. Thus all three scenarios that failed on timing in the composed run passed serially on unchanged source/build. No test timeout was increased.

The CLI rejected `--concurrency 4` with exit 1 and no proof, despite its mention in the validation-lanes document. The final run used the supported default scheduler (receipt concurrency 4, resource-pool limits honored). No validation infrastructure was changed.

The composed receipt remains **failed**; serial reruns are supporting independent evidence and do not turn that receipt into a pass. Its advisory budget is **review-required**, target/review threshold 60,000 ms. Slowest files: extended operations 819,175 ms, local operations 450,818 ms, Git qualification 322,810 ms, Forgejo 233,157 ms, source checkpoint boundary 92,189 ms. Architect review should disposition the timing/budget evidence before wider integration qualification.

No packaging, installer, release/full profile or visual desktop acceptance was performed: those surfaces are outside this transport repair. No separate no-emit typecheck was prepended; fresh production builds own TypeScript proof. No real hosted branch/tag mutation was part of validation. Machine receipts, focused outputs and diagnostic scripts remain ignored local evidence.

## Live qualification

The connected desktop MCP reported Forgejo configured/ready and successfully listed/inspected the selected hosted repository. Read-only structural qualification used application metadata and the existing OS credential store privately.

The repaired build's local MCP HTTP runtime exercised the production tool registry without Project or repositoryCheckoutId registration. Provider status was ready, hosted repository ID `4` inspected successfully, and its advertised HTTPS destination resolved to the canonical provider-owned identity. The existing local `origin` safely inspected and matched the provider identity. Authenticated read-only ref inspection succeeded and matched hosted `main` commit `45c88bc996b2b5bdaa9f96109a2229c98d2aee9b`; credentials were absent from results.

**Disposable live clone did not qualify.** Four disposable attempts reached bounded Git execution, but the diagnosed underlying failure was `GIT_TIMEOUT` at the existing `GIT_COMMAND_TIMEOUT_MS = 15_000` limit. Local clone's existing failure wrapper returned GIT_EXECUTION_FAILED. The final attempt reproduced the timeout after validation load was removed. No live clone success, completed checkout, matching cloned refs or live push/tag success is claimed. The repair did not extend timeouts, add shallow/partial clone modes, or weaken checkout containment to bypass this acceptance requirement.

Four partial disposable checkouts remain under trusted temporary roots. Their four Git config files were privately checked; none contained the real token or Basic-encoded credential. There is no approved bounded cleanup operation for these ordinary partial clone directories in the existing toolkit, so they were preserved as the card directs. Exact locations are retained only in ignored local qualification records, outside this committed report/source control. No existing consumer repository remote was mutated. No real branch, tag, release or feed was pushed/published.

The running desktop's already-loaded code was not replaced; live repaired-code evidence comes from the rebuilt local MCP runtime. Architect integration and normal host restart are needed before that process uses this checkpoint.

## Safety and checkpoint

The exact repair diff was reviewed. The source/report whitespace check passed; the governing card retains four original Markdown hard-break lines, which the full diff check flags as trailing spaces. An extra report EOF blank line was removed. Bounded scans of additions found no private-key blocks, recognized credential literals or concrete home/machine paths. All checkpoint files decoded as valid UTF-8. The final staged set is restricted to the eight listed repair/card/report files; generated output, temporary scripts/receipts, provider settings, credential state and qualification directories are excluded. Real credential/Basic-encoded absence was checked privately in all four partial clone configs and live read-only results; controlled fixtures additionally assert absence from Git args/config and MCP results. No real token or raw provider URL was printed or placed in this report.

Checkpoint hash: pending at report creation; actual hash is returned after commit without amending this report merely to record its own hash. No push is authorized or performed. Only this repair's attributable files and governing card/report are included.

## Remaining acceptance and recommended next task

Return for Architect review of the transport repair. Live acceptance criteria requiring a successful disposable clone remain **unmet** because of the existing 15-second execution limit. Readiness, metadata, exact provider resolution, existing remote inspection and authenticated live refs are observed successes; fixture clone/CAS/fetch/push/tag coverage is automated evidence, not a substitute for successful live clone qualification.

The Architect should disposition the bounded clone-duration failure in a separate scoped follow-up or explicitly authorize a clone execution-budget change before requalification. No policy exception or visual Operator acceptance was inferred. Do not broaden this checkpoint into release orchestration or a real remote mutation.
