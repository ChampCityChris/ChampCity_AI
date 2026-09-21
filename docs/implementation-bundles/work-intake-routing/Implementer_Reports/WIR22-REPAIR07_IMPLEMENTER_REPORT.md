# WIR22-REPAIR07 Implementer Report

Repair Card: WIR22-REPAIR07 — Connect Issue completion to shared integration. Implementation complete by source inspection; runtime proof **NOT TESTED** under explicit Operator instruction to perform no more testing this run.

Verified approved `<PROJECT_REPO>`, branch `codex/work-intake-routing-finish`, baseline `2bc43c4f2c59588ef73f32a7ee8ad2abb1b01184`. `origin` configured, no upstream/fetch or remote freshness claim. Parent WIR22 changes are intentionally present and excluded from this checkpoint.

Inspected evidence: `projectIssueExecution` discarded its generic executor input; `getIssueCorrectionExecution` already owned current Fix/Repair close and aggregate validation evidence; the routed integration caller only loaded non-Issue bindings. This missing application adapter prevented Issue completion from reaching WIR20/WIR21 machinery.

The Issue adapter now also returns its existing input with an evidence fingerprint derived from the same current projection. The Issue service exposes that input plus exact terminal Fix/Repair contract paths through its existing lifecycle readers. Its existing public execution projection and fingerprints remain unchanged. The routed integration caller normalizes either owner, uses the generic executor, and requires every terminal implementation's matching contract/hash and machine checkpoint before candidate creation. Existing candidate, policy, semantic Repair and source-control owners retain all operations. The caller can read its owned current Repair for the parent UI. A retained aborted exact candidate now reports not-ready until Plan or source identity changes, rather than offering a recreation that the candidate owner rejects.

Modified: `src/main/planExecution/issueExecutionAdapter.ts`, `src/main/issueResolution/issueResolutionService.ts`, `src/main/planExecution/routedIntegrationService.ts`. Created: this report and the corresponding Repair Card. Deleted: none. Intentionally not created: alternate Issue executor, acceptance state, Git path, schema/migration, dependencies, test fixtures or UI surface. Parent WIR22 owns the UI connection.

Read-only source inspection used bounded file reads and searches. Exact staged-diff and secret/local-path/generated-artifact inspection accompanies this checkpoint. No typecheck, build, test, launch or visual check ran: the Operator explicitly prohibited further testing, including this repair's proposed focused validation. No tests were added, changed, consolidated or retired. Earlier REPAIR06 proof is retained as historical evidence and is not represented as testing these later changes.

Checkpoint: `WIR22-REPAIR07: Connect Issue Completion to Shared Integration`; hash pending at report write. Only the five attributable files are staged; parent changes remain preserved. No push/tag/release or merge during this card. No secrets, concrete machine paths, generated output or workflow sidecars are included.

Residual validation: Issue completion/integration and shared non-Issue regression after this adapter change remain unverified. Resume WIR22 using these contracts; no between-card Operator approval gate. Final merge into `dev` remains authorized after the sequence.
