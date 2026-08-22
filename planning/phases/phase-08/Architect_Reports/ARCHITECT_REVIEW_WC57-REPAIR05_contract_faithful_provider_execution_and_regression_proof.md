<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "architect-review",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC57-REPAIR05",
    "repairId": "WC57-REPAIR05",
    "parentWorkCardId": "WC57"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC57-REPAIR05_contract_faithful_provider_execution_and_regression_proof.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC57-REPAIR05_contract_faithful_provider_execution_and_regression_proof.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Architect Review WC57-REPAIR05 — Contract-Faithful Provider Execution and Regression Proof",
    "disposition": "revision_requested",
    "parentWorkCardId": "WC57",
    "repairId": "WC57-REPAIR05",
    "repairRequired": true,
    "nextRepairId": "WC57-REPAIR06",
    "operatorValidationRequired": false,
    "gitMutationAuthorized": false
  },
  "documentDisposition": {
    "status": "RevisionRequested",
    "notes": "REPAIR05 corrects the FO76 host detector, direct WinGet query/version separation, provider inventory verification, ecosystem adapter defects, and regression expectation. It correctly reports AC10 incomplete. However, the new hand-written WinGet MCP stdio transport uses Content-Length framing instead of MCP stdio newline-delimited JSON-RPC, so AC2 is not satisfied. A final bounded REPAIR06 must replace the hand-written MCP transport with the official MCP client and complete the already-authorized Environment Resolution evidence payload before WC57 Operator validation.",
    "reviewedAt": "2026-08-21"
  }
}
CHAMPCITY-METADATA -->

# Architect Review — WC57-REPAIR05

## Disposition

**Revision requested.**

REPAIR05 materially fixes the provider architecture rejected in REPAIR04, but two mandatory criteria remain incomplete. One is correctly disclosed by the Implementer Report; the other is a protocol defect in the new MCP transport.

## Accepted Work

Preserve the following REPAIR05 changes:

- `windows-x64-host / development-host / external` is detected from the actual host and the FO76 three-requirement regression now ends `ready` on simulated Windows x64.
- direct `winget search` no longer embeds Work Card version/profile expressions in the substring query; version evaluation is separate.
- unknown ordinary provider packages are verified by exact WinGet package identity/version instead of assuming `capabilityId --version`.
- the Visual Studio/MSVC semantic composite verifier remains intact.
- Maven/Gradle wrapper selection, detected Python requirements filename, and uv ownership detection are corrected.
- post-provision UI stage reporting now reflects verification.
- the Implementer Report correctly marks mandatory AC10 incomplete rather than reporting a false pass.

## Blocking Findings

### 1. WinGet MCP transport is still not protocol-faithful

`StdioJsonRpcTransport` writes and parses `Content-Length` framed messages. MCP stdio transport uses one JSON-RPC message per line. The implementation therefore does not satisfy the Work Card requirement to use the actual MCP stdio contract.

The focused test injects a fake `WindowsPackageMcpClient`; it never exercises the production transport and therefore cannot prove AC2.

Required correction: use the official MCP TypeScript client/stdio transport. Do not maintain a second in-repository MCP framing implementation.

### 2. Environment Resolution evidence payload remains unimplemented

`buildCodexEnvironmentResolutionPrompt(_context)` still ignores its context and omits the exact Work Card identity, unresolved managed requirements, provider attempts/candidates, and command/error evidence required by REPAIR05 AC10.

The Approved Work Card already authorizes this edit. A Codex/apply-patch harness refusal is an execution-tool failure, not missing Work Card authorization. The repair must implement the source change through an available authorized editing route or report a true execution-harness blocker; no additional Operator approval is required for the content itself.

### 3. Ecosystem tool handoff is acceptable as foundation, not complete dependency restoration

`managedRequirementsForRepositoryEcosystemTools(...)` now provides the required machine-tool requirements, but current production does not yet execute dependency restoration. This does not require another WC57 subsystem: the helper is sufficient foundation for the approved scope and must not expand REPAIR06.

## WC58 Foundation Decision

Nothing else in REPAIR05 should be changed to prepare for WC58.

WC58 should consume the existing `resolution-required`/`Resolve Environment` boundary and deterministic preflight rerun. It should not absorb WinGet provider mechanics. The only WC57 prerequisite for WC58 is a complete Environment Resolution evidence payload so the richer embedded Codex harness receives the actual unresolved context.

## Final Decision

Create one final bounded repair, `WC57-REPAIR06`, limited to:

```text
official MCP stdio client
+ production protocol-level MCP test
+ exact Environment Resolution evidence payload
+ payload regression test
```

No provider redesign, UI redesign, new ecosystem scope, WC58/App Server work, or Git mutation is authorized in REPAIR06.
