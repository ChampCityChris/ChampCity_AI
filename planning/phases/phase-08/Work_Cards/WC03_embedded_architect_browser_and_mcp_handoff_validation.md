<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "context-document",
  "artifactRevision": 1,
  "participationRole": "contextOnly",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC03"
  },
  "sourceRevisions": [],
  "workflowData": {
    "workCardId": "WC03",
    "phaseId": "phase-08",
    "title": "Embedded Architect Browser and MCP Handoff Validation",
    "status": "approved_design_execution_deferred",
    "owner": "Implementer after Operator release",
    "risk": "high",
    "dependsOn": [
      "WC01",
      "WC02"
    ],
    "executionAuthorized": false,
    "executionReleaseCondition": "WC01 and WC02 are accepted, controlled WC02 artifacts exist, and the Operator explicitly releases WC03.",
    "gitMutationAuthorized": false,
    "purpose": "Prove a real embedded Architect subscription surface and a real ChampCity MCP-mediated handoff of repo-backed intake artifacts before building the complete interview workspace.",
    "sourceDesignDocuments": [
      "planning/project/Design_Documents/ARCHITECT_INTERVIEW_WORKSPACE_DEFINITION.md",
      "planning/project/Design_Documents/PROJECT_INTAKE_LIFECYCLE_AND_WORKSPACE_DEFINITION.md"
    ],
    "lifecycleLocation": {
      "level": "project",
      "stage": "intake"
    },
    "workspace": {
      "id": "architect-interview",
      "label": "Architect Interview",
      "registryBacked": true,
      "orderBoundary": "After Project Intake Capture"
    },
    "browserRequirements": [
      "Main-process-owned Electron embedded-browser primitive",
      "Interactive Operator sign-in",
      "Dedicated persistent session partition",
      "Remote Node integration disabled",
      "Context isolation enabled",
      "No unrestricted remote preload or filesystem access",
      "Controlled external navigation",
      "No credential, cookie, token, or session-storage extraction"
    ],
    "handoffInputs": [
      "WC02 Architect Interview Prompt Markdown/JSON pair",
      "WC02 Project Intake Markdown/JSON pair",
      "Selected repository identity or MCP workspace reference"
    ],
    "handoffRequirements": [
      "Supported MCP-aware or explicit file-attachment mechanism",
      "No manual prompt retyping or reconstruction",
      "No clipboard-only primary path",
      "No hidden DOM injection or simulated upload",
      "Real embedded Architect session can read saved content"
    ],
    "endToEndProof": {
      "realExternalSurfaceRequired": true,
      "realMcpConnectionRequired": true,
      "output": "Bounded controlled test interview document",
      "requiredEvidence": [
        "Operator-provided unique marker",
        "At least one Project Intake value",
        "Approved repo-relative validation path"
      ]
    },
    "stopConditions": [
      "Architect surface cannot safely run in embedded Electron browser",
      "Authentication requires unsafe credential handling",
      "Saved prompt cannot be exposed through a supported mechanism",
      "ChampCity MCP is unavailable from the embedded Architect session",
      "Architect cannot write the controlled validation artifact",
      "Success would require provider API usage, DOM automation, security bypass, or unapproved dependency"
    ],
    "prohibitedScope": [
      "Final interview document preview or disposition",
      "Final Architect Interview artifact schema",
      "Revision workflow",
      "Project Intake completion progression",
      "Project Planning",
      "Lifecycle transitions or state storage",
      "Provider API integration",
      "DOM automation or credential management",
      "Arbitrary web browsing",
      "Git operations"
    ],
    "validation": [
      "npm run typecheck",
      "npm run build",
      "npm test",
      "Operator-observed real embedded-browser and MCP integration lane"
    ],
    "implementerReport": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC03_embedded_architect_browser_and_mcp_handoff_validation.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "",
    "reviewedAt": null
  }
}
CHAMPCITY-METADATA -->

# Work Card — Phase 08 WC03 Embedded Architect Browser and MCP Handoff Validation

Status: approved implementation design; execution deferred
Owner: Implementer after Operator release
Phase: phase-08
Risk: high
Depends on: WC01, WC02
Execution authorization: withheld until the Phase 08 Work Card sequence is complete
Git mutation: not authorized
Implementer Report: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC03_embedded_architect_browser_and_mcp_handoff_validation.md`

## Purpose

Prove the highest-risk Project Intake integration before the full Architect Interview workspace is built.

WC03 must establish that ChampCity A/I can host the Operator's authenticated Architect chat in an embedded browser surface and can hand the repository-backed Architect Interview Prompt and required source artifacts to that chat through a supported ChampCity MCP-mediated workflow.

This is a real capability validation card. It must not claim success from a mock page, hard-coded transcript, copied fixture, or simulated MCP response.

## Execution Boundary

This Work Card is approved as the third planned Phase 08 implementation unit, but it is not currently authorized for execution.

Do not execute it until:

1. WC01 and WC02 have been implemented and accepted;
2. a real WC02-generated Project Intake pair and Architect Interview Prompt pair are available in a controlled validation repository;
3. the Operator explicitly releases WC03 as the active card.

## Source Design Decisions

Read and follow:

- `planning/project/Design_Documents/ARCHITECT_INTERVIEW_WORKSPACE_DEFINITION.md`
- `planning/project/Design_Documents/PROJECT_INTAKE_LIFECYCLE_AND_WORKSPACE_DEFINITION.md`

The target lifecycle location is:

```text
Project / Intake
└── Architect Interview
```

WC03 implements the browser and handoff foundation for this workspace. WC04 completes its document-review and disposition behavior.

## Required Workspace Registration

Add one registry-backed visible workspace:

```text
id: architect-interview
label: Architect Interview
location: Project / Intake
order: after Project Intake Capture
```

During WC03, the workspace may show the browser/handoff surface with an explicit notice that interview-document review and disposition arrive in WC04. Do not create a second temporary validation workspace.

## Embedded Browser Requirement

Use a main-process-owned Electron embedded-browser primitive supported by the repository's installed Electron version.

The implementation must:

- display the configured Architect subscription surface inside the application;
- support normal interactive sign-in by the Operator;
- preserve the Architect session using a dedicated persistent Electron session partition;
- keep Node integration disabled in remote content;
- keep context isolation enabled;
- prevent remote content from receiving unrestricted preload or filesystem access;
- open unsupported external protocols and disallowed external destinations through a controlled external-browser decision rather than silently navigating;
- avoid reading, exporting, logging, or writing browser cookies, passwords, access tokens, or session storage;
- avoid packaging credentials or authentication state into repository artifacts.

Do not use an iframe as proof of embedded-browser support. Do not use DOM automation, credential injection, browser extensions, or provider-specific scraping.

## Architect Surface Configuration

The Architect surface URL must be configurable through existing application settings or a small bounded setting added by this card.

The default may target the intended ChatGPT subscription surface, but the code must not describe it as an OpenAI API integration.

The application must display clear states:

```text
Browser unavailable
Sign-in required
Architect surface ready
Handoff unavailable
Handoff ready
Handoff failed
```

Do not infer readiness merely because a page loaded. Readiness must distinguish browser load from MCP handoff capability.

## MCP Handoff Requirement

The WC02-generated Architect Interview Prompt is the authoritative handoff instruction.

The handoff flow must make available to the Architect chat:

- the prompt Markdown document;
- its synchronized JSON sibling when needed by the integration;
- the Project Intake Markdown/JSON pair;
- the selected repository identity or workspace reference needed for ChampCity MCP access.

The supported handoff may require an explicit Operator confirmation or attachment action, but it must not require the Operator to retype or manually reconstruct the prompt content.

The implementation must use a documented supported mechanism, such as:

- an MCP-aware attachment/handoff action exposed by the configured integration;
- a browser file-attachment flow that the Operator explicitly confirms and that uses the saved repo artifact;
- a repo-relative MCP read instruction delivered through an approved integration action.

The Implementer must not choose a mechanism merely because it is convenient. It must prove that the embedded Architect session can actually access the saved prompt and source artifacts.

Clipboard-only transfer, hidden DOM injection, simulated upload, or opening the prompt in a separate text window does not satisfy the primary acceptance criterion.

## End-to-End Validation Artifact

For controlled validation only, the Architect must use the handed-off prompt to write a bounded test interview document back through ChampCity MCP at a designated test-repository path.

The validation artifact must:

- be created by the real Architect session through the real MCP connection;
- contain a unique Operator-provided validation marker;
- cite at least one value from the handed-off Project Intake artifact;
- use a safe repository-relative path approved for the controlled validation;
- be removed only if the Operator explicitly authorizes cleanup.

WC03 does not define the final canonical Architect Interview document format; WC04 does.

## Failure and Stop Conditions

Stop implementation and produce a blocked Implementer Report when any of the following prevents a real proof:

- the Architect subscription surface refuses to run in the supported embedded Electron browser;
- authentication cannot be completed without unsafe credential handling;
- the application cannot expose a saved prompt to the embedded session through a supported mechanism;
- ChampCity MCP is not discoverable or usable from the embedded Architect session;
- the Architect cannot write the bounded validation artifact back to the controlled repository;
- satisfying the requirement would require provider API usage, browser credential extraction, DOM automation, security-control bypass, or an unapproved dependency.

Do not replace a blocked result with mock success. A blocked report leaves WC03 unresolved and prevents WC04/WC05 execution.

## Authorized Production Scope

Expected production files may include:

```text
src/main/browser/architectBrowserService.ts
src/main/integrations/architectMcpHandoffService.ts
src/main/main.ts
src/main/workspaceSettings.ts
src/shared/workspaces/workspaceRegistry.ts
src/shared/workspaceContracts.ts
src/preload/index.ts
src/renderer/app/App.tsx
src/renderer/styles.css
```

A narrower implementation is acceptable. Any additional production file must be directly required by browser ownership, session isolation, handoff capability, or safe IPC and must be identified in the Implementer Report.

No provider SDK or browser-automation dependency is authorized.

## Authorized Test Scope

Automated tests must cover what can be tested without fabricating the external service:

- Architect workspace registry placement;
- allowed/blocked URL handling;
- session-partition configuration;
- safe IPC contracts;
- handoff input validation and repo-relative artifact manifest construction;
- failure-state reporting;
- absence of remote Node integration and unrestricted preload exposure.

Expected test files may include:

```text
test/browser/architect-browser-handoff.test.cjs
test/app-shell/app-shell.test.cjs
test/workspaces/workspace-document-review.test.cjs
```

The real subscription/MCP proof remains Operator-observed manual validation and must not be replaced by a mocked automated test.

## Explicit Non-Goals

Do not implement:

- final dual-pane interview-document preview;
- final Architect Interview artifact schema or canonical path;
- interview disposition controls;
- revision-request workflow;
- Project Intake completion derivation;
- Project Planning prompt or workspace;
- lifecycle progression, current lifecycle storage, or automatic routing;
- provider API integration;
- browser DOM automation or credential management;
- arbitrary web browsing;
- Git operations.

## Required Validation

Run:

```text
npm run typecheck
npm run build
npm test
```

No Playwright is authorized.

Then complete the controlled Operator-observed manual integration lane defined below.

## Acceptance Criteria

WC03 is acceptable only when:

1. `Architect Interview` is registry-backed at Project / Intake after Project Intake Capture;
2. the application hosts the configured real Architect subscription surface inside a main-process-owned embedded browser;
3. the Operator can complete normal interactive authentication without the app reading or storing credentials;
4. remote content has no Node integration, unrestricted preload, or direct filesystem authority;
5. Architect browser session persistence uses a dedicated partition and no secret material is written to project artifacts;
6. browser-load state and MCP-handoff state are shown separately and accurately;
7. a real WC02-generated prompt and Project Intake pair can be handed to the embedded Architect session without manual retyping or reconstruction;
8. the real embedded Architect session can read the handed-off content;
9. the Architect can write the bounded validation artifact back through the real ChampCity MCP connection;
10. the written validation artifact contains the Operator marker and intake-derived value;
11. no mock, DOM injection, credential extraction, provider API, clipboard-only primary path, or unapproved dependency is used as proof;
12. blocked external capability produces a truthful blocked report rather than simulated success;
13. no interview preview/disposition, Project Planning, lifecycle transition, or Git scope is introduced;
14. typecheck, build, and automated tests pass;
15. the Implementer Report records the exact browser primitive, security settings, handoff mechanism, manual evidence, limitations, and remaining Operator validation.

## Implementer Report Requirements

The report must include:

- repository, remote, branch, and dirty-state verification;
- exact files created and modified;
- installed Electron version and selected supported embedded-browser primitive;
- final browser security configuration;
- final session-partition behavior;
- exact MCP handoff mechanism and why it is supported;
- artifact manifest used for the controlled proof;
- automated validation commands and results;
- Operator-observed real integration evidence or exact blocker;
- confirmation that no credentials, API integration, DOM automation, dependency, lifecycle transition, or Git operation was added;
- remaining Operator manual validation.

The report must end with:

```markdown
## Manual Validation After Architect Review

The Operator must personally confirm:

1. the intended Architect subscription surface renders inside the application;
2. sign-in works through normal provider UI;
3. the WC02 prompt and intake artifacts are handed to the correct embedded chat;
4. the Architect can identify the unique validation marker and intake value;
5. the MCP-written validation artifact appears at the approved repo-relative path;
6. no credential, cookie, token, or hidden browser-automation behavior is exposed.
