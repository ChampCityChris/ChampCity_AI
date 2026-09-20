# Project Integration Validation Policy

Status: implemented target-owned provider contract; routed Development orchestration remains WIR22-REPAIR06 work.

## Repository authority and schema

The selected Repository owns `.champcity/integration-policy.json`. This is runtime configuration in the existing `.champcity/` namespace, separate from Work Card validation selection and the metadata under `validation/`. Production never imports the capability map. For one integration, the authoritative policy is the exact blob at the immutable target commit selected by integration-target resolution. Incoming/source working-tree bytes never govern their own candidate.

The version 1 document has exactly three fields:

| Field | Contract |
| --- | --- |
| `schemaVersion` | Integer `1`. Other versions fail closed. |
| `checks` | Between 1 and 32 distinct check definitions. |
| `requiredIntegrationChecks` | Between 1 and 32 unique IDs referencing declared checks, in execution order. |

Each check has exactly `checkId`, `lane`, and `runner`. Check IDs start with an ASCII letter or digit and contain at most 80 letters, digits, dots, underscores, or hyphens. Supported semantic lanes are `static`, `fast`, `affected-capability`, `integration`, `desktop-platform`, `packaging`, `migration`, `performance-soak`, and `full-regression`.

The initial runner object has exactly `kind: "npm-script"`, `script`, and `timeoutMs`. Script identities use the same bounds as check IDs, additionally allowing colons. Duration must be an integer from 1 through 900000 milliseconds. Arbitrary command text, paths, arguments, extra fields, and unsupported runner kinds are rejected, including in checks not selected as required. Future ecosystems require an application-owned contract variant and registry adapter; the candidate service continues to consume the same check hooks.

Working-tree policy reads require a UTF-8 JSON ordinary file of at most 65536 bytes. The selected root and every configuration path component are checked for containment and redirection. Symlinks and junctions are rejected. Reads use a bounded buffer and verify the opened file's identity. Target policy resolution instead uses application-owned bounded Git plumbing to read only the fixed repository-relative policy path from an exact commit, without switching a branch or checkout. Missing, malformed, redirected, oversized, and unsupported policies fail closed with fixed messages that do not expose filesystem diagnostics.

## Runner and evidence boundary

`createIntegrationPolicyProvider` supplies a target-aware `validationPolicy` resolver to the main-process `IntegrationCandidateHooks`. The candidate service invokes it only after immutable target resolution and obtains the ordered checks, target-policy SHA-256, and candidate assertion for that target commit. The provider accepts only the selected repository root and exact target commit; it does not accept renderer/model command text or executable registrations. No routed Development caller is wired by this repair.

For each required target-policy npm check, the provider reads the bounded `package.json` blob at the same target commit and retains the target's exact script string. Before running that check, the provider verifies the isolated checkout's registration and the npm runner requires the candidate's ordinary, bounded `package.json` to contain exactly the same script definition. A missing or changed definition fails closed without execution. The runner launches the host npm toolchain with `shell: false`, the candidate checkout as working directory, and fixed application-owned flags, so the trusted check definition evaluates candidate source. Windows uses the existing standalone Node/npm resolver. No dependency installation occurs.

npm scripts are repository-owned executable code and may themselves contain shell syntax. The adapter does not parse that code or provide an OS sandbox. It pins npm's script interpreter to the platform shell, disables implicit pre/post scripts and workspace expansion, and overrides `if-present` so a missing check cannot succeed silently. The policy cannot supply shell text or change these arguments. Dependencies and the standalone toolchain must already be available to the isolated checkout; unavailable prerequisites fail visibly.

Each check has its policy-bounded deadline and an application-owned combined output ceiling of 1 MiB. Timeout and excess output trigger process-tree termination, with a bounded termination fallback and fixed summary. For an ordinary nonzero exit, at most 64 KiB of transient output is retained for deterministic reduction. The adapter strips control sequences, selects at most six useful lines, bounds each line and the final summary, converts safely derivable candidate paths to repository-relative references, and redacts all remaining absolute user/home/temp paths plus credential-shaped values. Raw stdout/stderr, full logs, and stack traces are never persisted. Results remain within `IntegrationValidationEvidence`: `checkId`, integer/null `exitCode`, and a summary of at most 1200 characters from this adapter. If safe extraction yields nothing useful, the adapter uses a fixed generic failure summary. Failed, timed-out, or incomplete execution cannot validate a candidate or advance its target.

## Policy identity and lifecycle

The SHA-256 of the exact target-commit policy bytes is part of the candidate identity and is stored as `validationPolicySha256` in the canonical candidate Markdown receipt. The target commit also binds the trusted package-script definitions. No evidence sidecar is created. Formatting-only target-policy changes therefore produce a distinct identity for later candidates.

Candidate creation, validation, Integration Repair revalidation, service recreation, and target advancement resolve the policy again from the receipt's exact target commit and require the same target-policy identity and ordered checks. A service using another policy identity, or no policy provider, cannot advance a policy-bound record. Existing target/ref freshness checks independently prevent a stale candidate from advancing after the target branch changes.

An incoming branch may propose a different `.champcity/integration-policy.json`, but that replacement never controls the candidate integrating it. The merged candidate's policy must still parse under the strict supported schema before validation and advancement; missing or invalid replacement policy fails closed. A valid future policy may coexist while the target-owned checks and exact target-owned npm script definitions judge the current candidate. After that candidate integrates, a later candidate may use the new target policy. Replacing a currently governing npm script requires a separately safe transition and cannot be smuggled through the candidate it judges.

Direct application-injected checks used by the existing WIR20/WIR21 fixtures remain supported as an explicit alternative to the production provider. A service cannot combine both sources. The existing clean-checkout, exact-commit, Plan freshness, incoming-history, and target-history checks remain in force. Evidence provides validation results; it does not confer product disposition or publication authority.

## Current ChampCity composition

| Check ID | Lane | Existing npm script | Deadline |
| --- | --- | --- | --- |
| `champcity-typecheck` | `static` | `typecheck` | 120000 ms |
| `champcity-build` | `static` | `build` | 120000 ms |
| `champcity-regression-built` | `full-regression` | `test:unit:built` | 900000 ms |

These checks run serially in this order. The build runs once; the regression check consumes compiled output instead of calling a script that builds again. This wider integration policy does not change the focused validation commands required by an individual Work Card or Repair Card.

The existing `test/agent-harness/git-mutation-boundary.test.cjs` owns policy parsing, containment, exact-commit reads, actual npm execution in disposable registered candidates, target-policy authority, candidate script integrity, controlled policy transition, service recreation/stale-target rejection, sanitized failure evidence, and timeout/output boundaries. Its composition probe uses the current ChampCity policy with controlled fixture script bodies to prove selection and isolation without launching the full repository suite. Actual full-regression evidence is a later integration run, not a claim of this focused repair.
