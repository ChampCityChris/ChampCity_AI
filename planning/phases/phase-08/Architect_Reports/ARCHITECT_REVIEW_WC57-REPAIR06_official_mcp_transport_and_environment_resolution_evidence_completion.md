<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "architect-review",
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
      "path": "planning/phases/phase-08/Work_Cards/WC57-REPAIR06_official_mcp_transport_and_environment_resolution_evidence_completion.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC57-REPAIR06_official_mcp_transport_and_environment_resolution_evidence_completion.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Architect Review WC57-REPAIR06 — Official MCP Transport and Environment Resolution Evidence Completion",
    "disposition": "approved_for_operator_validation",
    "parentWorkCardId": "WC57",
    "repairId": "WC57-REPAIR06",
    "repairRequired": false,
    "operatorValidationRequired": true,
    "gitMutationAuthorized": false
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "REPAIR06 satisfies both remaining WC57 repair obligations. Production WinGet MCP communication now uses the official @modelcontextprotocol/sdk Client and StdioClientTransport with no custom MCP framing in the provider path; protocol-level regression proof exercises the production client against an official-SDK fake stdio server and verifies initialize, tool discovery, find, close, and direct WinGet fallback. Environment Resolution now receives the exact Approved Work Card identity plus bounded unresolved managed requirement/provider/command evidence. The full reported validation lane is green at 393/393. No further WC57 repair is required; WC57 is approved for Operator validation.",
    "reviewedAt": "2026-08-22"
  }
}
CHAMPCITY-METADATA -->

# Architect Review — WC57-REPAIR06

## Disposition

**Approved for Operator validation.**

REPAIR06 completes the two mandatory gaps left by REPAIR05 without reopening WC57 architecture.

## Evidence Reviewed

The approved REPAIR06 Work Card required exactly two corrections: replace the hand-written WinGet MCP transport with the official MCP TypeScript stdio client, and complete the Environment Resolution evidence payload.

Current repository evidence satisfies both.

### 1. Official MCP transport replacement is complete

`src/main/developmentEnvironment/windowsPackageProviderResolver.ts` now imports and uses:

```text
@modelcontextprotocol/sdk/client/index.js → Client
@modelcontextprotocol/sdk/client/stdio.js → StdioClientTransport
```

`StdioWindowsPackageMcpClient.find(...)` now:

- launches the discovered WinGet MCP executable through the official `StdioClientTransport`;
- connects with the official MCP `Client`;
- performs tool discovery with `listTools(...)`;
- selects the advertised `find` tool;
- invokes `find` with the package identity query;
- normalizes returned package candidates behind the existing application-owned boundary; and
- closes the client deterministically in `finally`.

The prior hand-written `StdioJsonRpcTransport` and `Content-Length` framing implementation are absent from the production provider path.

`package.json` and `package-lock.json` both declare `@modelcontextprotocol/sdk` `^1.30.0` as an application dependency.

### 2. Protocol-level regression proof is now at the correct seam

`test/fixtures/fake-winget-mcp-server.cjs` uses the official MCP `Server` and `StdioServerTransport`; it is not a hand-written wire shim.

`test/development-environment/windows-development-environment-provisioner.test.cjs` launches the production `StdioWindowsPackageMcpClient` against that bounded server and verifies the observed sequence:

```text
initialized
→ tools/list
→ tools/call(find, query=cmake)
→ close
```

A separate regression verifies that an MCP call failure falls through to direct `winget search` and still resolves the package. This corrects the REPAIR05 weakness where an injected fake client bypassed the production transport entirely.

### 3. Environment Resolution evidence payload is complete

`buildCodexEnvironmentResolutionPrompt(context)` no longer ignores its context.

The prompt now includes:

- exact Approved Work Card path;
- artifact revision;
- SHA-256;
- only unresolved managed requirements;
- `capabilityId`;
- requested version constraint;
- requested profile;
- before/after state and action;
- blocker type and blocker text;
- provider attempts, outcomes, queries, summaries, and candidates; and
- bounded command, exit-code, stdout, and stderr/error evidence.

The existing Environment Resolution authority and negative constraints remain intact.

The focused regression asserts the exact Work Card path/revision/hash, unresolved capability/version/profile, both provider attempts, candidate package identities, failed `winget mcp` command evidence, exit code, stderr, and the prohibition against substituting project architecture or approved capability identity.

### 4. Accepted REPAIR05 behavior remains preserved

The Implementer Report records:

- focused development-environment suite: 30/30 passed;
- focused Codex execution suite: 16/16 passed;
- build: passed in the normal Windows lane; and
- full package test lane: 393/393 passed.

The report also confirms no WC58/App Server implementation and no Git mutation were performed. Current repository status independently shows the existing dirty Phase 08 worktree with zero staged files; this review makes no claim that the overall worktree is clean.

## Acceptance Criteria

1. **Pass** — official MCP SDK/stdio transport is used for WinGet MCP communication.
2. **Pass** — custom `Content-Length`/MCP framing is removed from this provider path.
3. **Pass** — direct WinGet fallback remains functional.
4. **Pass** — Environment Resolution uses its execution context.
5. **Pass** — exact unresolved environment evidence reaches the resolver prompt.
6. **Pass** — no new Operator authorization was introduced into the product flow.
7. **Pass** — accepted REPAIR05 behavior remains green in focused/full validation.
8. **Pass** — no WC58/App Server implementation was introduced.
9. **Pass** — no Git mutation was performed.
10. **Pass** — the final Implementer Report accurately represents completion state.

## Residual Risk / Operator Validation

The protocol regression intentionally uses a bounded fake MCP server rather than a live WinGet MCP server, which the Work Card explicitly allowed. That is not a repair blocker.

WC57 now needs the real Operator validation it was designed to reach: execute the actual development-environment flow against the FO76 Collector host-toolchain Work Card and confirm the application can detect/provision/verify the required Windows x64 host, CMake, and Visual Studio/MSVC desktop C++ capability, including UAC only when Windows genuinely requires elevation.

Any defect found in that live validation should be treated as new runtime evidence against WC57 rather than reopening already-passed REPAIR06 criteria without evidence.

## Final Decision

**WC57-REPAIR06 is Approved. No REPAIR07 is required. Parent WC57 is approved for Operator validation.**
