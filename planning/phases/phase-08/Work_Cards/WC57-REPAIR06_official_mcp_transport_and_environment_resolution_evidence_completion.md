<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC57-REPAIR06",
    "repairId": "WC57-REPAIR06",
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
    },
    {
      "path": "planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC57-REPAIR05_contract_faithful_provider_execution_and_regression_proof.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Official MCP Transport and Environment Resolution Evidence Completion",
    "status": "approved_for_implementation",
    "executionMode": "one final bounded WC57 repair",
    "parentWorkCardId": "WC57",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC57-REPAIR06_official_mcp_transport_and_environment_resolution_evidence_completion.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Complete only the two mandatory REPAIR05 gaps: replace the hand-written WinGet MCP framing client with the official MCP TypeScript stdio client and implement the already-authorized exact Environment Resolution evidence payload. Preserve all accepted REPAIR05 behavior.",
    "reviewedAt": "2026-08-21"
  }
}
CHAMPCITY-METADATA -->

# WC57-REPAIR06 — Official MCP Transport and Environment Resolution Evidence Completion

Status: Approved for Implementer execution  
Parent: `WC57`  
Depends on: `WC57-REPAIR05` Architect review  
Git mutation: prohibited

## Purpose

Finish WC57 without reopening its architecture.

REPAIR06 has exactly two implementation obligations.

## Required Changes

### 1. Replace the hand-written WinGet MCP transport with the official MCP client

- Add the current compatible official `@modelcontextprotocol/sdk` dependency.
- Delete the in-repository `StdioJsonRpcTransport` framing implementation.
- Keep `winget mcp` only as discovery of `WindowsPackageManagerMCPServer.exe`.
- Connect to that executable through the official MCP stdio client/transport.
- Discover the advertised `find` tool and call it with the package identity query.
- Normalize candidates behind the existing `WindowsPackageMcpClient` boundary.
- Close owned client/process resources deterministically.
- Preserve direct `winget search` fallback when MCP discovery/connect/tool/call fails.

Do not invent or maintain another MCP wire protocol implementation.

### 2. Complete the Environment Resolution evidence payload

`buildCodexEnvironmentResolutionPrompt(...)` must use the current execution context and preflight evidence.

Include, bounded to relevant unresolved requirements:

- exact Approved Work Card path, revision, and SHA-256;
- unresolved managed `capabilityId`, version constraint, and profile;
- provider attempts and candidate identities;
- relevant command summaries, exit codes, and concise stderr/error evidence;
- existing Environment Resolution authority and negative constraints.

The Approved Work Card already authorizes this payload. Do not request another Operator approval for the edit or for sending this technical evidence to the embedded Codex resolver.

If one editing mechanism fails, use another authorized repository editing mechanism where available. If the implementation harness prevents all authorized edits, report a harness blocker; do not reinterpret that failure as missing Work Card authority.

## Required Proof

1. Production contains no hand-written MCP stdio framing implementation for WinGet package discovery.
2. A protocol-level test exercises the production `WindowsPackageMcpClient` through the official MCP stdio transport against a bounded fake MCP server or equivalent injected official transport.
3. The test proves initialize/tool discovery/`find`/close behavior and direct WinGet fallback on MCP failure.
4. Environment Resolution prompt tests assert exact Work Card path/revision/hash, unresolved requirement/constraint/profile, provider candidate evidence, and failed-command evidence.
5. Existing FO76 ready-path, host incompatibility, direct WinGet, provider inventory, UAC/restart, ecosystem, UI-stage, typecheck, build, and full tests remain green.

## Acceptance Criteria

1. Official MCP SDK/stdio transport is used for WinGet MCP communication.
2. No `Content-Length` or other custom MCP framing remains in this provider path.
3. Direct WinGet fallback remains functional.
4. `buildCodexEnvironmentResolutionPrompt(...)` no longer ignores its context.
5. Exact unresolved environment evidence reaches the resolver prompt.
6. No additional Operator authorization is introduced for an already-Approved Work Card.
7. All accepted REPAIR05 behavior remains unchanged.
8. No WC58/App Server implementation is introduced.
9. No Git mutation is performed.
10. The Implementer Report marks any unimplemented criterion incomplete; no residual-limitation pass is permitted.

## Implementer Report

Required path:

`planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC57-REPAIR06_official_mcp_transport_and_environment_resolution_evidence_completion.md`

Leave `Document.Status=Pending`.
