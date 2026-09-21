# Project Integration Validation Policy

Status: implemented target-owned candidate-aware validation and routed Integration Repair.

## Repository authority and schema

The selected Repository owns `.champcity/integration-policy.json`. This is runtime configuration in the existing `.champcity/` namespace, separate from Work Card validation selection and the metadata under `validation/`. Production does not import runtime code from validation metadata. The registered profile adapter reads bounded target-owned metadata and executes a temporary immutable target toolkit. For one integration, the authoritative policy is the exact blob at the immutable target commit selected by integration-target resolution. Incoming/source working-tree bytes never govern their own candidate.

The version 1 document has three required fields and the optional strict `repair` section described below:

| Field | Contract |
| --- | --- |
| `schemaVersion` | Integer `1`. Other versions fail closed. |
| `checks` | Between 1 and 32 distinct check definitions. |
| `requiredIntegrationChecks` | Between 1 and 32 unique IDs referencing declared checks, in execution order. |

Each check has exactly `checkId`, `lane`, and `runner`. Check IDs start with an ASCII letter or digit and contain at most 80 letters, digits, dots, underscores, or hyphens. Supported semantic lanes are `static`, `fast`, `affected-capability`, `integration`, `desktop-platform`, `packaging`, `migration`, `performance-soak`, and `full-regression`.

The initial runner object has exactly `kind: "npm-script"`, `script`, and `timeoutMs`. Script identities use the same bounds as check IDs, additionally allowing colons. Duration must be an integer from 1 through 900000 milliseconds. Arbitrary command text, paths, arguments, extra fields, and unsupported runner kinds are rejected, including in checks not selected as required. Future ecosystems require an application-owned contract variant and registry adapter; the candidate service continues to consume the same check hooks.

Working-tree policy reads require a UTF-8 JSON ordinary file of at most 65536 bytes. The selected root and every configuration path component are checked for containment and redirection. Symlinks and junctions are rejected. Reads use a bounded buffer and verify the opened file's identity. Target policy resolution instead uses application-owned bounded Git plumbing to read only the fixed repository-relative policy path from an exact commit, without switching a branch or checkout. Missing, malformed, redirected, oversized, and unsupported policies fail closed with fixed messages that do not expose filesystem diagnostics.

## Runner and evidence boundary

`createIntegrationPolicyProvider` supplies a target-aware `validationPolicy` resolver to the main-process `IntegrationCandidateHooks`. The candidate service invokes it only after immutable target resolution and obtains the ordered checks, target-policy SHA-256, and candidate assertion for that target commit. The provider accepts only the selected repository root and exact target commit; it does not accept renderer/model command text or executable registrations. Routed Development uses this provider. Each check receives frozen main-process context identifying repository, target branch/commit, incoming commit, candidate identity/commit, and platform.

For each required target-policy npm check, the provider reads the bounded `package.json` blob at the same target commit and retains the target's exact script string. Before running that check, the provider verifies the isolated checkout's registration and the npm runner requires the candidate's ordinary, bounded `package.json` to contain exactly the same script definition. A missing or changed definition fails closed without execution. The runner launches the host npm toolchain with `shell: false`, the candidate checkout as working directory, and fixed application-owned flags, so the trusted check definition evaluates candidate source. Windows uses the existing standalone Node/npm resolver. No dependency installation occurs.

npm scripts are repository-owned executable code and may themselves contain shell syntax. The adapter does not parse that code or provide an OS sandbox. It pins npm's script interpreter to the platform shell, disables implicit pre/post scripts and workspace expansion, and overrides `if-present` so a missing check cannot succeed silently. The policy cannot supply shell text or change these arguments. Dependencies and the standalone toolchain must already be available to the isolated checkout; unavailable prerequisites fail visibly.

Each check has its policy-bounded deadline and an application-owned combined output ceiling of 1 MiB. Timeout and excess output trigger process-tree termination, with a bounded termination fallback and fixed summary. For an ordinary nonzero exit, at most 64 KiB of transient output is retained for deterministic reduction. The adapter strips control sequences, selects at most six useful lines, bounds each line and the final summary, converts safely derivable candidate paths to repository-relative references, and redacts all remaining absolute user/home/temp paths plus credential-shaped values. Raw stdout/stderr, full logs, and stack traces are never persisted. Results remain within `IntegrationValidationEvidence`: `checkId`, integer/null `exitCode`, and a summary of at most 1200 characters from this adapter. If safe extraction yields nothing useful, the adapter uses a fixed generic failure summary. Failed, timed-out, or incomplete execution cannot validate a candidate or advance its target.

## Policy identity and lifecycle

The SHA-256 of the exact target-commit policy bytes is part of the candidate identity and is stored as `validationPolicySha256` in the canonical candidate Markdown receipt. The target commit also binds the trusted package-script definitions. No evidence sidecar is created. Formatting-only target-policy changes therefore produce a distinct identity for later candidates.

Candidate creation, validation, Integration Repair revalidation, service recreation, and target advancement resolve the policy again from the receipt's exact target commit and require the same target-policy identity and ordered checks. A service using another policy identity, or no policy provider, cannot advance a policy-bound record. Existing target/ref freshness checks independently prevent a stale candidate from advancing after the target branch changes.

An incoming branch may propose a different `.champcity/integration-policy.json`, but that replacement never controls the candidate integrating it. The merged candidate's policy must still parse under the strict supported schema before validation and advancement; missing or invalid replacement policy fails closed. A valid future policy may coexist while the target-owned checks and exact target-owned npm script definitions judge the current candidate. After that candidate integrates, a later candidate may use the new target policy. Replacing a currently governing npm script requires a separately safe transition and cannot be smuggled through the candidate it judges.

Direct application-injected checks used by the existing WIR20/WIR21 fixtures remain supported as an explicit alternative to the production provider. A service cannot combine both sources. The existing clean-checkout, exact-commit, Plan freshness, incoming-history, and target-history checks remain in force. Evidence provides validation results; it does not confer product disposition or publication authority.

## Current ChampCity composition

### Bounded Integration Repair scope

The optional version-1 `repair` section contains `allowedEditableRoots` (1–32 exact repository-relative boundaries), optional `protectedPaths` (0–32 boundaries), and `sources` (0–14 distinct Markdown paths with role `architecture` or `contract`). An exact file can be a leaf boundary. Empty/root-wide boundaries, glob syntax, traversal, path aliases and extra fields are rejected. Absence of this section preserves validation-only policy use; production Integration Repair fails closed without it.

`createIntegrationRepairPolicyProvider` resolves the target-commit policy using the current candidate, verified Intake branch binding and completed approved Plan. It adds exactly one current canonical Intake and Plan from the main-process loader. Supplemental documents must match the target's immutable text and the candidate's current ordinary files, allowing only CRLF/LF checkout conversion. All configured paths are checked for containment and redirection; deleted or not-yet-created edit leaves may be absent. Governing context remains bounded to 80,000 characters.

Editable source is the union of current conflicts and incoming changed paths since the common merge base, filtered through allowed/protected boundaries. Target-only changes do not broaden the repair set. Renames contribute both endpoints. The deterministic set must contain 1–32 files. An out-of-policy conflict, empty/excessive set, missing/stale/redirected evidence, or changed policy requires Operator/replanning. Intake, Plan, all governing documents, policy/administrative state, Git metadata, dependency/generated output and protected boundaries are never editable. No model or renderer selects paths.

The provider re-resolves policy before applying or committing a prepared patch, including after service recreation. Existing source digests, starting hashes, index/HEAD guards and retry ownership remain enforced by the Integration Repair controller. Repair requires unchanged target-policy text in both incoming and candidate checkouts, permitting CRLF/LF checkout conversion only; additional whitespace or content changes still fail. The receipt continues to bind the exact target-blob SHA-256. A proposed policy transition may be validated normally but cannot govern its own semantic repair.

ChampCity allows `src`, `test`, `scripts`, `assets` and `packaging`; it explicitly protects `docs`, `planning`, `validation`, `package.json` and `package-lock.json`. Its supplemental sources are this contract and `CHAMPCITY_WORK_INTAKE_ROUTING_AND_PLANNING_ARCHITECTURE.md`. Routed Development uses the same repair provider and profile identity.

### Candidate-aware profile adapter

The second registered runner shape is exactly kind: validation-profile, profile, and timeoutMs. Profile must be one of the application-registered implementation-fast, work-item, repair, integration-gate, phase-close, release-qualification or full-supported-platform identities. Timeout remains bounded by 900000 ms. Policy cannot inject commands, executable paths, arguments or test lists.

ChampCity now requires one champcity-integration-gate check in the integration lane, selecting integration-gate with a 900000 ms failure ceiling. The architecture target is under three minutes, with a five-minute review threshold; the failure ceiling does not raise either budget. The gate owns one build, affected fast/integration proof and catalog-integrity sentinel. Default selection excludes Desktop, packaging, unaffected migration, performance and full regression. Target profiles can explicitly add migration or Desktop/packaging lanes for their owning capability. A target policy may deliberately select full-supported-platform or release-qualification; those plan all applicable lanes.

The application computes target-to-candidate changed paths with bounded exact-revision Git plumbing and no rename collapsing, preserving both endpoints. The planner never shells out to Git. Candidate creation and repair revalidation use the current committed candidate revision, while target and incoming identities stay fixed.

At resolution, the provider reads the fixed validation toolkit files, catalog, profiles and required build/typecheck definitions from the exact target commit. It hashes that authority and materializes only the fixed toolkit files in a private temporary directory under the candidate's application-owned Git storage. No incoming toolkit code is imported or executed as the judge. The host standalone Node toolchain runs this snapshot with context and metadata on stdin. The directory is removed after completion. No workflow evidence JSON sidecar or dependency install is created.

The proposed candidate catalog must pass exact executable coverage. Target-owned capabilities, primary/complementary proof and existing test files cannot be removed. Target source patterns and execution/lane restrictions remain authoritative; incoming catalog additions may broaden proof. A path unclassified by target ownership blocks the candidate even if incoming metadata attempts to classify it. Proposed future profiles must also pass their complete supported schema, but target profiles select the current run. Toolkit/profile/catalog updates can therefore be proposed without replacing the code or requirements judging that update. Retiring required target proof needs a separately governed target-policy transition. Unknown ownership never falls back silently to full regression.

The snapshot checks candidate build/typecheck definitions against target-trusted strings and uses fixed host npm, interpreter, no pre/post scripts, no workspace expansion and no if-present fallback. Candidate working-tree cleanliness and exact commit are independently checked before/after validation and before target advancement. Stale target/incoming refs still block advancement. Integration Repair invokes the same target authority with its new candidate commit; previous validation does not certify a new repair.

Profile evidence is stored inside the existing canonical candidate Markdown record: registered profile identity, authority hash, exact revisions, run identity, bounded selected test paths, excluded lanes, elapsed time and status. Raw subprocess output is never persisted. The profile process has a bounded deadline/output size and descendant termination. Unavailable/incomplete/failed evidence cannot validate or advance a candidate.

Focused ownership is split among integration-profile-gate, integration-policy-semantics, integration-npm-adapter, integration-repair-provider/controller/source semantics, and routed integration composition tests. Full supported-platform qualification remains explicit post-bundle work; focused adapter fixtures do not claim whole-repository acceptance.
