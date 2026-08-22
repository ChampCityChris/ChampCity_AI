<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC55"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC46-REPAIR17_project_repository_owned_mcp_workspace_route.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC44_local_codex_cli_implementer_execution.md",
      "revision": 2
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC54_codex_full_local_development_authority_and_windows_toolchain_diagnostics.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Selected Project Root MCP Routing and Prompt Policy Cleanup",
    "status": "approved_for_implementation",
    "executionMode": "one bounded authority-routing and prompt-contract repair",
    "confirmedDefect": "MCP prompt routing can read projectRepository from mutable artifact workflowData instead of the application selected project root. A repair Implementer Report changed projectRepository to the descriptive string 'repository root'; the shared route normalizer correctly normalized that wrong input to repository_root, producing a nonexistent MCP workspaceId. The Codex Implementer prompt also contains overbroad local-path and artifact-hygiene restrictions that can encourage unnecessary sanitization and pseudo-security validation not required by the Work Card.",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC55_selected_project_root_mcp_routing_and_prompt_policy_cleanup.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Use the application-selected project root as the sole source for MCP workspaceId construction across every production prompt family. Preserve the root-folder normalization convention. Remove overbroad Codex path/security-hygiene prompt rules while retaining actual secret/credential protection and Work Card authority.",
    "reviewedAt": "2026-08-19"
  }
}
CHAMPCITY-METADATA -->

# WC55 — Selected Project Root MCP Routing and Prompt Policy Cleanup

Status: Approved for Implementer execution  
Phase: `phase-08`  
Git mutation: prohibited

## Confirmed Defects

### 1. Correct normalization is fed the wrong authority source

The intended MCP route convention remains:

```text
selected project root: C:\...\ChampCity_PDL
→ basename: ChampCity_PDL
→ normalize naming convention
→ workspaceId: champcity_pdl
```

The normalization itself is not a fallback and is not defective.

The defect is that shared MCP prompt generation can derive the route from `workflowData.repositoryAuthority.projectRepository` supplied by a mutable artifact. In the live `ChampCity_PDL` repair cycle, the Approved Repair Work Card retained the real project path while Implementer Report revision 2 contained:

```text
repositoryAuthority.projectRepository = "repository root"
```

The advisory review generator then passed that report workflowData into the shared MCP route helper, which normalized `repository root` to `repository_root`. That workspace does not exist.

The Implementer Report is evidence and must never determine application routing authority.

### 2. Codex prompt contains overbroad sanitization/hygiene rules

The current production Codex Implementer prompt contains:

```text
Do not modify files outside this repository root.
Do not write absolute local machine paths into repository artifacts.
Do not introduce secrets, credentials, provider keys, environment-file contents, production endpoints, screenshots, archives, build outputs, or unrelated generated artifacts.
```

These rules exceed the current product contract. They conflict with WC54 full local development authority and can cause an LLM to sanitize legitimate application metadata or invent generic safety/security scans that are not part of Work Card acceptance.

Repository inspection found no separate production generic `security scan` gate in the Architect prompt families. Do not create one.

## Production Prompt Inventory

This repair applies to every current production prompt/handoff family, not only Advisory Architect Review.

Shared MCP routing is consumed by the current Project/Phase/Work Card prompt paths, including:

```text
Architect Interview / Architect MCP handoff manifest
Project Planning
Phase Map
Phase Interview
Phase Planning
Work Card Planning
Repair Work Card
Advisory Work Card Validation review
body-only Architect draft artifact invocations
```

The Codex Implementer execution prompt is separately included for prompt-policy cleanup.

The Implementer must inspect all current production prompt builders before completion and verify that no parallel route or pseudo-security requirement remains outside this inventory.

## Objective

Make routing and prompt authority simple and deterministic:

```text
application-selected project root
→ basename
→ normalize
→ MCP workspaceId
```

No LLM-authored artifact may supply, override, repair, or sanitize the selected root used for MCP routing.

At the same time, reduce the Codex execution prompt to actual implementation authority and real secret protection. Generic security scans, local-path sanitization, and unrelated artifact-type prohibitions must not become implicit completion gates.

## Required Changes

### 1. Selected project root is the sole MCP route source

Update the shared MCP route contract so MCP workspaceId is always constructed from the `workspaceRoot` argument representing the application-selected project root:

```text
workspaceId = normalizeWorkspaceId(path.basename(path.resolve(workspaceRoot)))
```

Rules:

- `workflowData.projectRepository` and `workflowData.repositoryAuthority.projectRepository` remain repository evidence only.
- Implementer Reports, Architect drafts, Work Cards, Validation Records, or other artifacts must not determine or override MCP workspaceId.
- `.champcity/mcp-workspace-binding.json` is not required for the normal route.
- `mcpWorkspaceBinding` metadata must not override the selected-root naming convention for the normal route.
- Do not add workspace discovery, similarity matching, Git-remote inference, diagnostics search, or cross-workspace fallback.
- If the selected root basename cannot normalize to a valid workspace ID, block prompt generation before emitting a prompt.

Preserve the existing normalization convention established by WC46-REPAIR17.

### 2. Apply the route correction to every production MCP prompt family

Update the shared helper/API and all required call sites so every current production MCP prompt and artifact-tool invocation receives the workspace ID from the selected root.

No prompt family may continue routing from mutable `workflowData`.

The Advisory Architect Review path must specifically stop using Implementer Report workflowData as MCP routing authority.

### 3. Protect application-owned report authority from LLM mutation

The application must not treat Implementer-authored repository authority as valid routing authority.

Add bounded report-integrity enforcement so an Implementer Report cannot silently replace application-owned canonical authority and still be treated as authoritative evidence for routing or lifecycle decisions.

At minimum:

- route selection ignores report repository authority entirely;
- report readiness detects a repository-authority mismatch against current application/approved-contract authority when that authority is present;
- the Implementer prompt explicitly identifies application-owned canonical identity, source revisions, repository authority, and disposition authority as fields the Implementer must not rewrite.

Do not build a new metadata subsystem in this card.

### 4. Clean the Codex Implementer prompt

Remove these current instructions:

```text
Do not modify files outside this repository root.
Do not write absolute local machine paths into repository artifacts.
```

Replace the broad artifact-hygiene prohibition with a narrow real-secret rule equivalent to:

```text
Do not disclose or commit secrets, credentials, authentication tokens, API/provider keys, or private environment-file contents unless the Approved Work Card explicitly requires handling them through an authorized secure mechanism.
```

Do not generically prohibit production endpoints, screenshots, archives, build outputs, absolute paths, caches, installed tools, or other development artifacts. Their legitimacy is determined by the Approved Work Card and project instructions.

Add explicit completion guidance:

```text
No generic security scan, safety scan, path-sanitization scan, or secret-like-string scan is required for Implementer completion unless the Approved Work Card or project validation instructions require it.
A voluntarily run auxiliary scan is supporting evidence only and must not replace or override the Work Card acceptance criteria.
```

Preserve the existing Git-mutation prohibition unless the Work Card authorizes Git mutation.

### 5. Audit all production prompts

Inspect all production prompt/handoff builders, including all shared MCP prompt consumers and the Codex execution prompt.

Remove any equivalent generic path-sanitization or pseudo-security completion gate if found.

Do not remove domain-specific authority, schema, artifact-write, workspace-binding, or secret-protection requirements merely because they contain restrictive language. This is a targeted cleanup, not a blanket deletion of prompt constraints.

## Preserved Behavior

Preserve:

- selected project root and project selection behavior;
- `ChampCity_PDL → champcity_pdl` and equivalent root-folder normalization;
- literal fixed workspaceId in generated MCP prompts;
- prohibition on ChatGPT searching or switching MCP workspaces;
- exact artifact path/revision/SHA verification requirements;
- application-owned canonical artifact promotion and review state;
- Work Card as implementation authority;
- WC54 full local Codex development authority;
- local Codex authentication;
- retry, cancellation, streaming, report-refresh, and validation workflow behavior;
- Git mutation only when explicitly authorized by the Work Card.

## Authorized Surface

Expected production surface:

```text
src/main/integrations/mcpWorkspacePromptContract.ts
src/main/integrations/architectMcpHandoffService.ts
src/main/workCardValidation/workCardValidationService.ts
src/main/workCardBuilding/codexImplementerExecutionService.ts
src/main/workCardBuilding/workCardBuildingReviewService.ts
```

Other existing production prompt-generator files are authorized only as necessary to adapt the shared route helper or remove confirmed equivalent prompt-policy language discovered during the required all-prompt audit.

Focused tests may be updated/added across the existing prompt-contract, Work Card validation, Work Card building, Architect output, Project Planning, Phase Map, Phase Interview, Phase Planning, Work Card Planning, and Repair prompt test suites.

Required report:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC55_selected_project_root_mcp_routing_and_prompt_policy_cleanup.md
```

## Acceptance Criteria

1. `ChampCity_PDL` selected as the actual application workspace root always produces MCP workspaceId `champcity_pdl` regardless of any `projectRepository` string present in an Implementer Report or other mutable artifact.
2. A test reproduces the observed defect: report workflowData containing `projectRepository = "repository root"` cannot cause `repository_root` to appear in the Advisory Architect Review prompt.
3. Advisory Architect Review derives MCP routing from the selected root, not Implementer Report workflowData.
4. Every current production MCP prompt family uses the shared selected-root route and no mutable-artifact route remains.
5. No `.champcity/mcp-workspace-binding.json`, explicit binding metadata, Git remote, diagnostics search, or cross-workspace fallback is required for the normal selected-root route.
6. Generated prompts continue to contain one literal workspaceId and prohibit ChatGPT workspace switching/search.
7. Implementer Report readiness detects application-owned repository-authority mutation instead of silently accepting it as authority.
8. The Codex prompt no longer contains `Do not modify files outside this repository root.`
9. The Codex prompt no longer contains `Do not write absolute local machine paths into repository artifacts.`
10. The broad prohibition on production endpoints/screenshots/archives/build outputs is removed and replaced by narrow secret/credential protection.
11. No generic security/safety/path-sanitization/secret-like-string scan is required as an implicit Implementer completion gate.
12. The Implementer Report lists every production prompt family inspected and records whether any additional equivalent language was found and changed.
13. Existing prompt contract, Codex execution, Work Card validation, retry/cancellation, artifact promotion, and lifecycle tests remain green.
14. `npm run typecheck`, `npm run build`, and `npm test` pass using the normal ChampCity validation lanes.

## Negative Constraints

- Do not remove the selected-root folder-name normalization convention.
- Do not replace it with explicit-binding setup or workspace discovery.
- Do not let Implementer Reports determine MCP routing.
- Do not add a security scanner.
- Do not add a path sanitizer.
- Do not add a generic security approval gate.
- Do not weaken actual secret/credential protection.
- Do not remove Work Card-specific negative constraints.
- Do not redesign unrelated workflow/UI surfaces.
- Do not perform Git mutation.

## Implementer Report Requirements

Report only:

- files changed;
- production prompt families inspected;
- selected-root route implementation and defect-reproduction evidence;
- report-authority integrity behavior;
- exact Codex prompt policy removals/replacement;
- confirmation that no generic security scan gate exists or was added;
- focused tests and full validation results;
- remaining Operator validation.

End with `Document.Status=Pending`.

## Manual Validation

Using the selected `ChampCity_PDL` project:

1. Generate an Advisory Architect Review prompt from the current repair report even if that report contains the descriptive `projectRepository = "repository root"` value.
2. Confirm the generated prompt says:

```text
Bound workspaceId: champcity_pdl
Use ChampCity MCP workspaceId "champcity_pdl" only.
```

3. Confirm `repository_root` does not appear.
4. Send the prompt to embedded ChatGPT and confirm it can read the exact Work Card and Implementer Report from `champcity_pdl` without workspace mismatch.
5. Run a normal Codex Implementer cycle and confirm the production prompt does not instruct Codex to sanitize absolute paths, remain inside the repository for tool installation, or run a generic security/safety scan as a completion requirement.
