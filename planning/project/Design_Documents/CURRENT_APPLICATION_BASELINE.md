<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "context-document",
  "artifactRevision": 1,
  "participationRole": "contextOnly",
  "identity": {},
  "sourceRevisions": [],
  "workflowData": {
    "designDocumentId": "CURRENT_APPLICATION_BASELINE",
    "projectId": "champcity-ai",
    "title": "ChampCity A/I Current Application Baseline",
    "status": "approved_current_state_context",
    "baselineDate": "2026-08-23",
    "implementationAuthority": false,
    "evidenceBasis": [
      "src/",
      "test/",
      "package.json"
    ],
    "planningEvidenceRole": "secondary"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Operator-directed source-first current application baseline. Historical implementation sequence, superseded designs, and abandoned planning paths are intentionally omitted.",
    "reviewedAt": "2026-08-23"
  }
}
CHAMPCITY-METADATA -->

# ChampCity A/I Current Application Baseline

Status: Approved current-state context  
Project: ChampCity A/I  
Baseline date: 2026-08-23  
Implementation authority: none; this document describes the application that exists now

## 1. Purpose and Evidence Standard

This document is the concise current-state baseline for ChampCity A/I. It is intentionally **not** a reconstruction of the development history and does not attempt to preserve every intermediate Work Card, repair sequence, abandoned design, or contradictory path used to reach the current implementation.

The evidence hierarchy for this baseline is:

```text
Current production source under src/
        ↓
Current tests under test/
        ↓
Current package/build configuration
        ↓
Live behavior observed during the current validation session
        ↓
Planning documents only when needed for context
```

Statements about implemented behavior are grounded primarily in the source tree. Historical planning artifacts are not treated as proof that a capability still exists. Future architecture is documented separately in:

```text
planning/project/Design_Documents/FUTURE_APPLICATION_DESIGN.md
```

That document describes intended development. This document describes current implementation.

The repository README materially understates the present application. It still describes an earlier manual planning shell, paired Markdown/JSON authority, and absence of provider/runtime integrations. Those claims no longer match the current source and should not be used as reconstruction authority.

The current worktree is not a clean release baseline. It contains the accepted Phase 08/WC60 implementation and related uncommitted artifacts. This document describes the source as it exists in that working tree; a separate cleanup and Git-baseline pass is still required.

## 2. Executive Baseline

ChampCity A/I is currently a local-first Electron application for directing and evidencing a structured software-development lifecycle. The application combines four implemented systems:

1. **Workflow authority** — project, phase, Work Card, repair, validation, and close progression derived from repository artifacts.
2. **Canonical planning authority** — single-file Markdown artifacts with application-owned metadata, revision, disposition, freshness, and transactional promotion.
3. **Local implementation harness** — a Codex App Server integration that can implement an Approved Work Card, resolve declared development-environment requirements, stream evidence, handle model input requests, and update the reserved Implementer Report.
4. **Browser/MCP harness foundation** — an embedded ChatGPT browser surface plus an A/I-owned MCP server with OAuth, repository tools, bounded artifact writes, patch operations, diagnostics, and current selected-project authority.

The application is no longer merely a prompt organizer. It owns the durable workflow and most of the local operational boundary around model work.

A concise product definition is:

> ChampCity A/I is a local software-development orchestration application that derives the current required workflow step from repository evidence, prepares bounded model handoffs, owns final canonical artifacts, provisions declared development requirements, runs an implementation provider, records proof, and returns final validation decisions to the Operator.

The current application does **not** yet provide the full future Agent Harness described in `FUTURE_APPLICATION_DESIGN.md`. In particular, browser models do not yet have a generic local execution toolbox, generic MCP access remains coupled to the desktop-selected project, and future role-specific subagents are not implemented.

## 3. Runtime, Package, and Process Architecture

### 3.1 Package and stack

The current package is:

```text
name: champcity-ai
version: 0.1.0
product description: ChampCity A/I desktop alpha
```

Primary runtime dependencies are:

```text
Electron 31
React 18
TypeScript 5.5
Vite 6
@modelcontextprotocol/sdk ^1.30.0
@openai/codex ^0.146.0
Zod 4
Tailwind CSS 4
Lucide React
```

The package exposes these primary validation lanes:

```text
npm run typecheck
npm run build
npm test
npm run test:unit
npm run test:full
```

`npm test` performs a production build and then runs the complete Node test corpus serially. Focused test files can also be run directly with Node's test runner.

### 3.2 Electron boundaries

The application uses the standard Electron separation:

```text
src/main/      trusted application services and filesystem/process authority
src/preload/   typed, explicit IPC bridge
src/renderer/  React operator interface
src/shared/    cross-process contracts and pure lifecycle/document logic
```

The renderer does not receive direct Node filesystem authority. It calls a typed `ChampCityApi` exposed through `contextBridge`; the main process performs repository, file-dialog, browser, lifecycle, environment, Codex, and Agent Harness operations.

### 3.3 Startup and shutdown

At application readiness, the main process:

- constructs the Agent Harness service on demand;
- starts the Agent Harness automatically when its persisted configuration is enabled;
- creates the main application window;
- retains the selected repository and runtime settings under Electron `userData`.

Before quit, the main process waits for:

- active Codex implementation/environment-resolution sessions to be interrupted and disposed;
- the Agent Harness HTTP runtime and MCP sessions to close.

The application therefore owns shutdown cleanup for both major model/runtime integrations.

## 4. Current Source Ownership Map

The production source is organized by subsystem rather than by historical phase:

```text
src/main/
├── agentHarness/             A/I-owned MCP/OAuth/repository harness
├── architectInterview/       project interview handoffs and drafts
├── architectOutputs/         generic draft submission/promotion/review framework
├── browser/                  embedded ChatGPT WebContentsView
├── currentWorkflow/          repository-derived current-step resolver
├── developmentEnvironment/   Windows capability detection/provisioning
├── documents/                canonical Markdown, transactions, freshness, authority
├── integrations/             MCP workspace binding prompt contract
├── migrations/               legacy paired-artifact migration
├── phaseClose/               phase closeout creation and completion
├── phaseInterview/           phase intake/interview flow
├── phaseMap/                 project phase-map generation and projection
├── phasePlanning/            phase planning + Work Card Plan bundle
├── projectClose/             project closeout and closure blockers
├── projectIntake/            project capture and canonical intake creation
├── projectPlanning/          reconciliation-aware Profile/Roadmap planning
├── workCardBuilding/         Codex execution and Implementer Report review
├── workCardClose/            return/close flow support
├── workCardIntake/           candidate selection and intake handoff
├── workCardLoop/             active Work Card/candidate authority
├── workCardPlanning/         Formal Work Card draft and approval
├── workCardRepair/           evidence-derived repair flow
├── workCardValidation/       advisory review and Operator validation records
├── workspaceSettings.ts      selected repository persistence
└── main.ts                   IPC composition and lifecycle startup
```

The renderer contains the application shell, workflow-specific workspaces, Settings, an execution-context dashboard, review panels, embedded-browser presentation, and document navigation.

## 5. Selected Repository and Repository Authority

### 5.1 Selected project persistence

The Operator selects one repository directory through the desktop UI. The selected path is stored in:

```text
<Electron userData>/workspace-settings.json
```

A selected directory must exist, be a directory, and be readable and writable. Clearing the selection deletes the persisted setting.

### 5.2 Workspace identity

A repository may define an explicit MCP binding at:

```text
.champcity/mcp-workspace-binding.json
```

When present, the binding supplies the stable MCP `workspaceId`, optional label, and optional repository name. When absent, A/I derives a workspace ID from the repository directory name.

Repository authority is copied into canonical workflow metadata and inherited through source revisions so later handoffs, Work Cards, reports, and validation records can be checked against the repository originally authorized by the workflow.

### 5.3 Current limitation

Generic Agent Harness calls currently resolve authority from the **desktop-selected project** at call time. Every MCP call must supply a `workspaceId` exactly matching that selected project. Unknown, different, or stale workspace IDs are denied with `AUTHORITY_DENIED`.

Consequences of the current design:

- Browser ChatGPT can operate on the selected repository.
- Switching the desktop-selected project changes the repository resolved by subsequent generic MCP calls.
- Browser/mobile use against a different repository requires first selecting that repository in the desktop application.
- A persistent multi-workspace MCP registry does not yet exist.
- Separately configured non-repository filesystem roots do not yet exist.

This limitation is accurately documented as future work in `FUTURE_APPLICATION_DESIGN.md`; it is not implemented in this baseline.

## 6. Canonical Planning Artifact Model

### 6.1 Single-file canonical Markdown

Current planning authority is a single Markdown file containing an application-owned metadata preamble:

```text
[canonical metadata opening delimiter]
{ ...canonical JSON metadata... }
[canonical metadata closing delimiter]

<body-only Markdown>
```

The metadata contract contains:

```text
schemaVersion
artifactType
artifactRevision
participationRole
identity
sourceRevisions
workflowData
documentDisposition
```

Supported dispositions are:

```text
Pending
Approved
Rejected
RevisionRequested
```

Supported participation roles are:

```text
gatingReview
compoundGatingReview
nonReviewHandoff
contextOnly
historical
```

Only gating artifacts participate in progression. Context, historical material, and non-review handoffs are visible evidence but do not by themselves block the lifecycle.

### 6.2 Discovery and legacy documents

The planning service recursively inventories `planning/**/*.md`, excludes the central Architect draft area, ignores symlinked entries, and parses canonical metadata.

A Markdown file without a valid canonical preamble is classified as legacy/unmanaged historical evidence rather than silently accepted as current authority. Malformed canonical artifacts remain visible with read errors so reconciliation can report them.

### 6.3 Revision and freshness

A substantive revision:

- increments `artifactRevision`;
- updates source revisions where applicable;
- resets disposition to `Pending`;
- invalidates downstream artifacts that reference the prior revision.

Freshness is derived by comparing every `sourceRevisions` entry with the current repository artifact revision. Missing or changed sources make downstream evidence stale.

Approved coordinated bundles are invalidated together. Current examples are:

```text
Project Profile + Project Roadmap
Phase Planning + Work Card Plan
```

### 6.4 Transactional writes

Canonical documents are written through application-owned writers. Multi-document writes are staged to sibling temporary files, flushed, backed up when replacing existing files, installed, verified, and rolled back if installation or verification fails.

The application verifies both installed metadata and installed body content. This mechanism is used for atomic planning bundles and for coupled approval operations such as approving a Work Card while creating its Implementer Report scaffold.

### 6.5 Generic disposition restrictions

Generic document-disposition IPC cannot modify catalog-owned Architect outputs. Those outputs must be reviewed through their owning workspace so A/I can enforce current revision, bundle, source, and review-state rules.

`RevisionRequested` requires revision instructions in the specialized review paths.

### 6.6 Legacy paired-artifact migration

A migration service exists for the prior Markdown-plus-JSON format. It can:

- preview paired artifacts;
- detect missing siblings, identity mismatches, malformed metadata, and duplicate active identity;
- convert valid pairs to canonical single-file Markdown;
- delete the legacy JSON sibling after verified promotion.

The migration is explicit, not automatic. It is not the same as the forthcoming documentation cleanup.

## 7. Nested Workflow Engine

### 7.1 Lifecycle levels

The application models three nested lifecycle levels:

```text
Project
Phase
Work Card
```

Each level progresses through applicable stages:

```text
Intake
Planning
Building
Validation
Close
```

Work Card close returns to Phase building/selection. Phase close returns to Project building/phase selection. Project close is terminal.

### 7.2 Repository-derived current step

`currentWorkflowService.ts` is the main resolver. It does not trust a manually saved “current screen” as workflow authority. It derives the current workspace from:

- canonical artifact identity;
- disposition;
- source freshness;
- semantic completion;
- active Phase Map position;
- active Work Card/repair authority;
- report and validation state;
- closeout state.

The resolver returns a `CurrentWorkspaceModel` that drives navigation, execution context, required action, evidence paths, current phase, active Work Card, and destination workspace.

### 7.3 Conflict handling

The resolver exposes explicit attention states when repository evidence is ambiguous, including:

- multiple active Project Intakes;
- malformed canonical evidence;
- multiple active Work Cards or repairs;
- stale or mismatched handoffs;
- partial or unsynchronized bundles;
- identity or exact-target conflicts;
- promotion failures.

The application does not silently pick one conflicting authority path.

## 8. Project Lifecycle

### 8.1 Project Intake

Project Intake captures at minimum:

```text
project name
purpose
desired outcome
project type
repository path
```

Submission creates or revises:

- the canonical Project Intake;
- the associated approved Architect Interview prompt;
- the minimum planning directory structure.

The selected repository becomes the project repository authority. A revised intake invalidates downstream interview evidence.

### 8.2 Project Architect Interview

The project interview flow uses the embedded ChatGPT browser. A/I prepares a bounded prompt from the current intake and prompt artifact. The interview is conversational; finalization is a separate body-only draft step.

The promoted Project Architect Interview must reference the current Intake and prompt revisions and must be Approved before Project Planning can proceed.

### 8.3 Project Planning and reconciliation

Project Planning produces an atomic two-document bundle:

```text
Project Profile
Project Roadmap
```

The application performs repository preflight before allowing the planning bundle:

- scans substantive source/configuration outside ignored build/vendor directories;
- inventories legacy or prior planning evidence;
- detects malformed canonical documents;
- checks exact Profile/Roadmap target collisions;
- compares repository evidence with the Intake's declaration of existing source/planning.

Reconciliation modes are:

```text
greenfield
reconciliation-required
needs-attention
```

If the Intake claims a greenfield repository but source or prior planning is present, planning stops in `needs-attention` rather than ignoring the evidence.

Current required Profile sections include:

```text
Current-State Baseline
Existing Implementation
Legacy Planning Reconciliation
Risks and Unknowns
```

Current required Roadmap sections include:

```text
Baseline Summary
Work-State Classification
MVP Scope
Sequenced Roadmap
Post-MVP Roadmap
Deferred and Conditional Work
Dependencies and Constraints
```

Both documents must be readable, fresh, synchronized, valid, and Approved.

### 8.4 Phase Map

The Phase Map is derived from the Approved Profile and Roadmap. It contains one `champcity-phase-map` JSON block with phase entries containing:

```text
phaseId
title
order
purpose
dependsOn
sourceReferences
```

The application validates non-empty phases, unique IDs/order, dependency references, self-dependencies, and cycles.

Completion is not persisted inside the map. The current phase is the first ordered phase without an Approved `Close` Phase Closeout.

### 8.5 Project close

A project can close only when:

- the current Profile, Roadmap, and Phase Map are Approved and fresh;
- the Phase Map projects all phases complete;
- a current Project Closeout is Approved with `closureDecision=Close`.

## 9. Phase Lifecycle

### 9.1 Phase selection

The application selects the first incomplete phase from the current Phase Map after validating prior dependency closeouts.

### 9.2 Phase Interview

Phase Interview inputs include:

- current Profile;
- current Roadmap;
- current Phase Map;
- selected phase definition;
- dependency Phase Closeouts.

The UI supports a conversational handoff and a separate final-draft handoff. The promoted Phase Interview must be readable, fresh, and Approved.

### 9.3 Phase Planning

Phase Planning produces an atomic bundle:

```text
Phase Planning
Work Card Plan
```

The Work Card Plan contains validated candidates with ordering, dependencies, purpose, and resolution state. Candidate resolution can represent:

```text
Eligible
Complete
Dependency blocked
Deferred
Superseded
Already satisfied
Carried forward
```

Both planning documents must be synchronized, readable, fresh, valid, and Approved before Work Card selection begins.

### 9.4 Phase close

The application creates a canonical Phase Closeout from current phase evidence. A phase is complete only when the latest closeout is fresh, Approved, and records `closureDecision=Close`.

## 10. Work Card Lifecycle

### 10.1 Candidate selection and intake

The Work Card loop projects the candidate map and selects an eligible candidate. It prevents beginning a different candidate while another Work Card is active and reports conflicts when multiple active authorities exist.

A Work Card Intake handoff records:

- phase identity;
- candidate identity and source plan revisions;
- the exact Formal Work Card target;
- inherited repository authority.

### 10.2 Formal Work Card

The Formal Work Card is a single Architect output promoted from a temporary body-only draft. Its preparation is bound to the exact current Work Card Intake handoff and source revisions.

Approval of a Formal Work Card performs a coordinated write that:

1. marks the Work Card Approved; and
2. creates the canonical Implementer Report scaffold at the deterministic report path.

A Work Card is eligible for implementation only when it is readable, fresh, and Approved.

A Formal Work Card may include one strict `champcity-development-environment` JSON block declaring managed or external capability requirements.

### 10.3 Implementation

The current direct implementation provider is the local Codex App Server integration. The implementation service resolves the exact Approved Work Card or Approved Repair Work Card, exact report target, repository root, revisions, and hashes before starting.

Implementation is considered incomplete if Codex finishes without updating the reserved Implementer Report.

### 10.4 Implementer Report review

The application classifies the expected report as:

```text
missing
reserved-skeleton
ready-for-review
invalid
conflict
```

A report is reviewable only when it:

- is canonical and readable;
- has matching phase/Work Card/repair identity;
- references the exact current implementation contract revision;
- inherits matching repository authority;
- is fresh;
- has a reviewable disposition;
- contains substantive implementation evidence rather than headings or placeholders.

Approval of the current report makes Operator validation eligible.

### 10.5 Advisory review and Operator validation

A/I can generate an advisory Architect review prompt containing exact Work Card and report paths, revisions, SHA-256 values, bound workspace identity, and changed-file evidence.

The prompt explicitly states that the advisory model is not the disposition authority. The Operator remains final authority and chooses:

```text
Validate Passed
Request Repair
```

The application writes a canonical Validation Record for the exact Work Card and Implementer Report revision. `Request Repair` requires explicit defect text.

### 10.6 Repair flow

Repairs are derived from current failed evidence. Current repair origins are:

```text
preValidationReportReview
postValidationRecord
```

A repair flow creates or reuses:

- a Repair Architect handoff tied to exact evidence;
- a deterministic Repair Work Card target;
- a temporary body-only Repair Work Card draft;
- an Approved Repair Work Card;
- a repair-specific Implementer Report.

The application checks for competing repair outputs, evidence mismatch, source freshness, repair identity, parent Work Card identity, and return target.

### 10.7 Work Card close

A Work Card closes when the current Validation Record is readable, fresh, and Approved. Control then returns to Phase Work Card selection.

## 11. Architect Browser and Output Promotion

### 11.1 Embedded browser

The application creates an Electron `WebContentsView` for ChatGPT with:

```text
persistent partition: persist:champcity-architect
nodeIntegration: false
contextIsolation: true
sandbox: true
no preload
```

The default allowed origin is `https://chatgpt.com/`. External or disallowed navigation is redirected to the system browser. Authentication popups use the same hardened preferences.

A/I tracks load state, bounds, attachment generation, navigation diagnostics, and an Operator-confirmed sign-in state.

### 11.2 Handoff behavior

Current embedded-browser interaction remains partly manual:

- A/I prepares the exact prompt/handoff;
- the Operator copies and pastes it into the embedded ChatGPT pane;
- ChatGPT writes only the temporary body-only draft through MCP;
- A/I validates and promotes the draft.

The renderer does not treat browser chat text as durable repository authority.

### 11.3 Generic Architect output framework

The production catalog currently supports seven Architect output flows:

```text
Project Architect Interview
Project Planning bundle
Phase Map
Phase Interview
Phase Planning bundle
Formal Work Card
Repair Work Card
```

Draft submissions have deterministic identities and explicit states:

```text
waiting-for-drafts
partial-draft-set
ready-for-promotion
promotion-failed
promoted
superseded
```

Temporary drafts are stored centrally under:

```text
planning/Architect_Drafts/<deterministic-submission-id>/
```

Drafts are body-only Markdown, bounded to 512 KiB, and may not include canonical metadata delimiters. A/I performs domain validation, creates final metadata, promotes single or atomic bundles, verifies final bytes, and cleans the temporary draft.

## 12. Codex App Server Implementation Harness

### 12.1 Runtime integration

The application uses the pinned `@openai/codex` App Server protocol rather than a one-shot CLI wrapper. It supports:

- initialize and runtime-state inspection;
- persistent thread and turn startup;
- streamed command, file-change, MCP, message, and error events;
- turn interruption;
- cleanup and process disposal;
- configuration, MCP status, skill, app, and plugin capability reads where exposed by Codex.

### 12.2 Current execution policy

The current default policy is:

```text
sandbox: danger-full-access
approval policy: on-request
approval reviewer: user
network access: enabled
```

For an approval request owned by the active ChampCity Work Card thread/turn, the transport automatically accepts command, file-change, and permission requests. Unowned, duplicate, or unsupported requests are denied.

This is not a general machine-wide authorization service. Ownership is tied to the active A/I execution session and Approved Work Card context.

### 12.3 User input and MCP elicitation

`request_user_input` and MCP elicitation are separate pending states. The UI returns responses to the exact request ID on the active thread. They are not collapsed into approval or denial.

### 12.4 Evidence and completion

Per-workspace in-memory execution records track:

- Work Card/repair identity and hashes;
- execution kind;
- policy and runtime state;
- streamed event, stderr, final-response, approval, and denial tails;
- pending user input or MCP elicitation;
- cancellation state;
- report-before/report-after evidence;
- terminal state and failure reason.

The implementation provider can also run a bounded Environment Resolution turn. After successful resolution, A/I refreshes the parent process environment and reruns deterministic preflight.

### 12.5 Current limitations

- Codex execution sessions are held in memory and are not reconstructed after application restart.
- The service implements one active execution per selected workspace.
- Browser ChatGPT cannot yet call this as a delegated worker through the Agent Harness.
- Generic browser-driven local process execution is not implemented.

## 13. Development Environment Management

### 13.1 Work Card contract

A Formal or Repair Work Card may declare development requirements in one fenced JSON block:

```text
champcity-development-environment
```

Each requirement contains:

```text
capabilityId
optional versionConstraint
optional profile
provisioning: managed | external
```

The contract rejects unknown fields, malformed versions, unsupported provisioning values, and duplicate requirement identities.

### 13.2 Preflight states

The current preflight states are:

```text
not-required
checking
provisioning
resolution-required
ready
waiting-for-operator
blocked
```

Every requirement records before/after state, action, detected version/profile, commands, provider attempts, blocker classification, retry state, and human-interaction boundary.

### 13.3 Known capability registry

Specialized detection/provisioning exists for:

```text
git
cmake
ninja
nodejs-lts
python 3.12.x
dotnet-sdk 8.x
rust
jdk 21.x
msvc-x64 desktop C++ / x64-cpp20
```

A semantic adapter also recognizes equivalent Visual Studio 2022 MSVC Desktop C++ requirements.

### 13.4 Provider-backed resolution

Unknown or unsupported managed capabilities are resolved through:

1. WinGet MCP discovery when available;
2. direct WinGet searches across configured `winget` and `msstore` sources;
3. exact or unambiguous candidate selection;
4. explicit `resolution-required` when identity is ambiguous or unresolved.

The repository ecosystem provider contributes evidence for native package-manager context.

### 13.5 Provisioning behavior

The Windows provisioner can:

- probe existing tools;
- repair/bootstrap WinGet and WinGet Configuration support;
- install exact or compatible packages silently;
- apply a WinGet Configuration/DSC document for MSVC Desktop C++;
- request UAC elevation through a PowerShell `RunAs` boundary;
- refresh the current process environment;
- semantically re-probe the required capability after installation.

Windows permission and restart are modeled as explicit Operator/OS boundaries rather than generic failures.

### 13.6 Current limitations

- Managed provisioning is Windows-only.
- Ambiguous package identity returns to Agentic Environment Resolution rather than guessing.
- External requirements remain blocked until provided outside ChampCity.
- No general cross-platform environment provider is implemented.

## 14. Agent Harness and MCP Runtime

### 14.1 Service ownership and lifecycle

The A/I-owned harness lives under:

```text
src/main/agentHarness/
```

It is not a runtime dependency on the old ChampCity_GPT repository. The service owns:

- settings;
- OAuth client/code/token state;
- HTTP listener;
- MCP sessions;
- provider/action registry;
- repository and patch operations;
- diagnostics and activity state.

The service exposes start, stop, restart, status, settings save, and legacy OAuth-client import through main-process IPC and the Settings workspace.

### 14.2 Settings

Settings persist at:

```text
<Electron userData>/agent-harness/settings.json
```

Current defaults are:

```text
enabled: true
host: 127.0.0.1
port: 0 (automatic)
publicBaseUrl: null
authentication: oauth-required
```

Only `127.0.0.1` and `localhost` may be used as bind hosts. A public base URL must be HTTPS without credentials, query, or fragment. Public configuration cannot use local unauthenticated mode.

Settings application is last-known-good transactional at the service level: a proposed running configuration is started before it is committed, and the prior runtime/configuration is recovered when the new runtime cannot start.

### 14.3 HTTP and MCP

The runtime uses the official MCP SDK Streamable HTTP server transport. It exposes:

```text
/health
/mcp
/.well-known/oauth-protected-resource
/.well-known/oauth-authorization-server
/oauth/register
/oauth/authorize
/oauth/token
```

Current request bounds are:

```text
MCP request body: 1,000,000 bytes
OAuth request body: 64,000 bytes
```

Stateful MCP sessions retain the OAuth scope used to construct their tool surface. A later request with a lower scope cannot reuse a more-capable session.

### 14.4 OAuth/DCR

The only transport scopes are:

```text
files.read
files.write
```

Current OAuth behavior includes:

- Dynamic Client Registration for public PKCE clients;
- registered redirect validation;
- `response_type=code`;
- PKCE S256;
- short-lived authorization codes;
- 1-hour access tokens;
- 30-day refresh tokens;
- refresh rotation and reuse denial;
- hashed durable access, refresh, and authorization-code values;
- exact supported-scope validation.

DCR scope is registration/default metadata, not a permanent authorization ceiling. A registered client may request either supported scope combination during authorization. Downstream A/I action and workflow authority remains separate.

The current `/oauth/authorize` implementation validates the client, redirect, response type, PKCE challenge, and supported scope, then issues the authorization code and redirects. It does not implement a second A/I admin-password or consent page.

OAuth state persists at:

```text
<Electron userData>/agent-harness/oauth/oauth-store.local.json
```

### 14.5 Legacy connector continuity

Settings includes an Operator file-picker action to import the active legacy ChampCity_GPT `oauth-clients.local.json` registry. The importer:

- preserves client IDs exactly;
- validates the full client set before writing;
- merges idempotently;
- rejects conflicting duplicate IDs;
- imports client registrations only;
- does not import legacy access tokens, refresh tokens, authorization codes, or admin credentials.

After import, A/I issues fresh authorization and token state under its own OAuth store.

### 14.6 Public tool surface

Current public tools are:

```text
repo_toolbox
git_toolbox
artifact_toolbox
diagnostics_toolbox
integration_toolbox
browser_toolbox
knowledge_toolbox
workspace_write_attached_image
```

`integration_toolbox`, `browser_toolbox`, and `knowledge_toolbox` are currently status-only foundation providers. They do not yet provide the future capabilities implied by their names.

Current repository actions include:

```text
status
list_files
read_file
inspect_text_file
read_text_chunk
read_text_lines
read_markdown_section
search_files
write_markdown_artifact
write_json_artifact
propose_patch
apply_approved_patch
```

Current Git actions include:

```text
status
diff
pre_commit_scan
readiness_summary
inspect_history (placeholder/deferred)
prepare_branch
stage_changes
commit
push
integrate_to_dev
```

Git mutation actions are registered but denied unless the active A/I authority provider explicitly authorizes mutation. The production service currently supplies `gitMutationAuthorized: false`, so MCP Git mutation is not available.

### 14.7 Tool contracts

The tool registry is the single source for:

- action name;
- read/write classification;
- required OAuth scope;
- exact parameter names and primitive types;
- dispatch implementation.

The same contracts generate the public JSON Schema and the Zod call-time validator. Unsupported actions, missing required fields, and unknown parameters are rejected before provider dispatch; provider validation remains defense in depth.

### 14.8 Repository containment and bounds

Current repository operations enforce:

- repository-relative paths only;
- no drive, UNC, absolute, colon, null-byte, or `..` traversal;
- realpath containment beneath the selected repository root;
- symlink avoidance during traversal;
- skipped `.git`, `node_modules`, `dist`, and `.vite` directories;
- maximum 1,000 listed files;
- maximum 200 search matches;
- search skips binary/null-byte files and files over 500 KiB;
- maximum generic artifact write of 1,000,000 bytes;
- no overwrite unless explicitly requested;
- JSON parse validation for JSON writes.

Text projection supports inline reads for small files and bounded hash/cursor, line-range, and Markdown-section reads for larger files.

### 14.9 Patch workflow

Patch proposals are stored under Agent Harness `userData`, include a SHA-256 and repository root, expire after two hours, and may be used once. Applying a patch requires the exact proposal ID, hash, content, and repository root.

The current patch parser supports a constrained Codex-style `*** Begin Patch` format for adding and updating files. It does not implement a general patch engine for every diff operation.

### 14.10 Attached images

Attached-image writes support PNG, JPEG, and WebP only. The runtime validates actual bytes, MIME, extension, dimensions, pixel count, containment, and non-overwrite behavior.

Current bounds are:

```text
maximum bytes: 5,000,000
maximum width: 4096
maximum height: 4096
maximum pixels: 12,000,000
```

### 14.11 Current operational proof

During the current validation session:

- the existing public identity `https://mcp.champcity.net` was moved from ChampCity_GPT to ChampCity A/I;
- the active legacy OAuth client registry was imported;
- the existing ChatGPT connector completed authorization using the repaired scope semantics;
- A/I correctly denied a repository call while the wrong project was selected;
- after selecting ChampCity_AI, Browser ChatGPT successfully read the REPAIR12 Implementer Report through the A/I-owned MCP runtime.

This is operational evidence in addition to source inspection. It does not by itself prove every tool or failure path.

## 15. Renderer and Operator Interface

### 15.1 Application shell

The renderer uses a left-rail, workspace-oriented interface with light and dark themes. It displays:

- selected project controls;
- current lifecycle position;
- current phase and Work Card execution context;
- workflow workspace navigation;
- current document and disposition state;
- browser/Architect status;
- Agent Harness status.

### 15.2 Workflow workspaces

Visible workflow workspaces currently include:

```text
Project Intake
Architect Interview
Project Planning
Phase Map
Project Validation
Project Close
Phase Interview
Phase Planning
Work Card Selection
Phase Validation
Phase Close
Work Card Intake
Work Card Planning
Implement
Review & Validation
Repair
Operator Validation
Work Card Close
Settings
```

Settings is an application-level UI workspace, not a lifecycle-gating artifact.

### 15.3 Execution context dashboard

The dashboard projects the current phase and Work Card from repository evidence. It shows phase order, purpose, dependencies, current loop step, Work Card state, and active repair identity where applicable.

### 15.4 Review and action surfaces

The renderer provides specialized controls for:

- preparing/copying Architect handoffs;
- final-draft handoffs for interviews;
- reviewing single outputs and atomic bundles;
- selecting Work Card candidates;
- starting/cancelling Codex implementation;
- answering Codex user-input and MCP-elicitation requests;
- requesting advisory Architect review;
- applying Operator validation decisions;
- creating repairs and closeouts;
- returning from Work Card close to candidate selection.

### 15.5 Agent Harness Settings

The Settings workspace provides:

- enabled/automatic-start setting;
- host, port, public URL, and auth mode;
- start, stop, restart, refresh;
- service state and local endpoints;
- current selected-project routing diagnostics;
- OAuth client/token/grant counts;
- public tool inventory;
- recent activity;
- legacy OAuth-client import.

The renderer polls Harness status periodically and reports lifecycle/settings errors without receiving direct filesystem authority.

## 16. Persistence and State Boundaries

ChampCity A/I currently has no general database. Durable state is divided as follows.

### 16.1 Repository-owned durable state

```text
planning/**/*.md                     canonical workflow and context artifacts
planning/Architect_Drafts/**         temporary body-only model drafts
source, tests, package/config files  implementation and validation authority
.champcity/mcp-workspace-binding.json optional explicit workspace identity
```

### 16.2 Electron userData

```text
workspace-settings.json
agent-harness/settings.json
agent-harness/oauth/oauth-store.local.json
agent-harness/generated/pending-patches.local.json
persist:champcity-architect browser partition
```

### 16.3 In-memory runtime state

```text
current MCP sessions/transports
Agent Harness recent activity and listener handle
Codex execution sessions and event tails
active pending user-input/MCP-elicitation requests
embedded-browser attachment/load state
```

Application restart does not currently reconstruct active Codex or MCP sessions. Durable workflow recovery comes from repository artifacts, not provider session memory.

## 17. Test and Validation Baseline

The source repository contains focused suites covering:

- Agent Harness core, runtime, OAuth, schema, containment, settings, and renderer behavior;
- app shell and preload boundaries;
- Architect browser, output, draft promotion, and freshness;
- canonical Markdown, transactions, migration, disposition, and source invalidation;
- project/phase/work-card lifecycle and resolver behavior;
- project reconciliation and real-corpus dogfooding;
- Work Card loop, repair, validation, building review, and close behavior;
- development environment detection, provisioning, UAC, provider resolution, and environment refresh;
- Codex App Server protocol, execution, approvals, user input, MCP elicitation, cancellation, and report evidence;
- renderer workspaces and production proof paths.

The package full-test lane remains broad and increasingly expensive. The current source does not yet define a fully separated fast/focused/full test architecture in package scripts; focused lanes are invoked directly by card-specific commands.

This baseline creation did not rerun the complete test suite. Recent bounded repairs reported successful typecheck, production build, and focused Agent Harness suites, and the live MCP read succeeded. Those results are operational context, not a substitute for the future clean-baseline validation pass.

## 18. Current Authority and Safety Boundaries

Implemented boundaries include:

1. **Application-owned final artifacts** — models write body-only drafts; A/I owns canonical metadata, revisions, promotion, and dispositions.
2. **Freshness gates** — Approved but stale evidence does not count as complete.
3. **Selected repository authority** — generic repository access is contained to the selected project and exact workspace ID.
4. **OAuth transport scopes** — read and write tool surfaces are filtered by `files.read` and `files.write`.
5. **Provider action authority** — tool contracts classify read, artifact write, patch write, Git inspection, and Git mutation separately.
6. **Git mutation separation** — Git mutation remains denied in the current Agent Harness even when OAuth grants `files.write`.
7. **Path/realpath containment** — repository and image operations reject traversal and resolved escapes.
8. **Browser isolation** — the embedded ChatGPT surface has no Node integration or preload bridge.
9. **Codex session ownership** — native approval requests must belong to the active Work Card thread/turn.
10. **Operator validation authority** — advisory models do not approve final validation; the Operator records Validate Passed or Request Repair.
11. **Windows human boundaries** — UAC and restart requirements are surfaced as explicit human interaction.

These controls do not amount to a general enterprise policy engine. The current application intentionally avoids a second semantic risk-review or compliance layer.

## 19. Current Known Limitations and Non-Implemented Capabilities

The following are not currently implemented, notwithstanding historical plans or future design language:

### Resource authority

- persistent MCP registry for multiple repositories;
- repository access independent of the desktop-selected project;
- configured non-repository host filesystem roots;
- task/session-specific resource grants.

### Browser implementation

- generic local execution toolbox exposed through MCP;
- browser-started build/test/debug processes;
- browser-to-Codex worker delegation;
- browser-session persistence owned by A/I;
- fully automated handoff submission to embedded ChatGPT.

### Roles and agents

- distinct Architect/Implementer/Verifier/Validator role enforcement;
- per-role capability grants or revocation;
- local-model worker;
- automatic model routing.

### Tool providers

- functional Browser/Knowledge/Integration MCP providers beyond status foundation;
- Playwright UI validation provider;
- external MCP federation manager;
- Git history implementation in the A/I Agent Harness;
- Agent Harness Git mutation in production.

### Host/runtime

- managed public tunnel/DNS lifecycle;
- whole-machine filesystem access;
- cross-platform development-environment provisioning;
- durable restart recovery for active Codex or MCP sessions;
- general database-backed state.

### Repository operations

- fully general patch/delete/move engine through MCP;
- comprehensive secret scanning—the current pre-commit scan is a bounded heuristic based largely on filenames/extensions;
- broad binary artifact management.

### Documentation

- current README alignment;
- cleaned active planning corpus;
- clean Git baseline for the reconstructed application state.

## 20. Reconstruction and Documentation Cleanup Guidance

The current Project Planning preflight is explicitly reconciliation-aware. When this repository is put back through A/I intake:

- the Intake should declare that existing source and prior planning are present;
- source/configuration evidence will cause `reconciliation-required` rather than greenfield planning;
- malformed canonical documents or exact target collisions can block planning;
- historical and legacy planning files can enlarge the reconciliation corpus even when they no longer describe the product.

For reconstruction, the intended active context should be limited to:

```text
CURRENT_APPLICATION_BASELINE.md
FUTURE_APPLICATION_DESIGN.md
WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md
current source and tests
current package/build configuration
```

Historical planning material should be archived outside the active planning corpus or otherwise made non-authoritative before intake. This baseline deliberately does not preserve development chronology; its purpose is to let reconciliation start from the product that actually exists.

## 21. Source Evidence Inventory

The principal production evidence inspected for this baseline includes:

```text
package.json
README.md

src/main/main.ts
src/preload/index.ts
src/shared/workspaceContracts.ts
src/shared/lifecycle/nestedLifecycle.ts
src/shared/workspaces/workspaceRegistry.ts

src/shared/documents/canonicalMarkdown.ts
src/shared/documents/documentDisposition.ts
src/shared/documents/documentOrder.ts
src/shared/documents/lifecycleArtifact.ts
src/main/documents/planningDocumentService.ts
src/main/documents/canonicalMarkdownDocumentWriter.ts
src/main/documents/artifactTransaction.ts
src/main/documents/repositoryAuthority.ts
src/main/migrations/pairedArtifactsToCanonicalMarkdownV1.ts

src/main/projectIntake/projectIntakeService.ts
src/main/architectInterview/**
src/main/architectOutputs/**
src/main/projectPlanning/projectPlanningContext.ts
src/main/projectPlanning/projectPlanningPreflight.ts
src/main/projectPlanning/projectPlanningService.ts
src/main/phaseMap/phaseMapService.ts
src/main/phaseInterview/phaseInterviewService.ts
src/main/phasePlanning/phasePlanningService.ts
src/main/workCardIntake/workCardIntakeService.ts
src/main/workCardLoop/**
src/main/workCardPlanning/workCardPlanningService.ts
src/main/workCardBuilding/workCardBuildingReviewService.ts
src/main/workCardRepair/workCardRepairService.ts
src/main/workCardValidation/workCardValidationService.ts
src/main/phaseClose/phaseCloseService.ts
src/main/projectClose/projectCloseService.ts
src/main/currentWorkflow/currentWorkflowService.ts

src/main/browser/architectBrowserService.ts
src/main/workCardBuilding/codexAppServerProtocol.ts
src/main/workCardBuilding/codexAppServerTransport.ts
src/main/workCardBuilding/codexImplementerExecutionPolicy.ts
src/main/workCardBuilding/codexImplementerExecutionService.ts

src/shared/developmentEnvironment/developmentEnvironmentContract.ts
src/main/developmentEnvironment/developmentEnvironmentCapabilityRegistry.ts
src/main/developmentEnvironment/developmentEnvironmentPreflightService.ts
src/main/developmentEnvironment/windowsDevelopmentEnvironmentProvisioner.ts
src/main/developmentEnvironment/windowsPackageProviderResolver.ts
src/main/developmentEnvironment/repositoryEcosystemProvider.ts
src/main/developmentEnvironment/windowsEnvironmentRefresh.ts

src/main/agentHarness/core/**
src/main/agentHarness/repository/**
src/main/agentHarness/runtime/**
src/main/agentHarness/tools/toolRegistry.ts
src/main/agentHarness/workspace/workspaceAuthority.ts

src/renderer/app/App.tsx
src/renderer/app/ExecutionContextDashboard.tsx
src/renderer/app/figma/**
src/renderer/app/workCard*/**
src/renderer/styles.css

test/**
```

## 22. Durable Current Invariants

The following invariants are present in the current implementation and should survive reconstruction:

1. The repository, not a model conversation, is the durable system of record.
2. Canonical planning authority is single-file Markdown with application-owned metadata.
3. A/I owns final artifact paths, identity, revisions, source links, promotion, and disposition.
4. Browser models write temporary body-only drafts, never final canonical metadata.
5. Progression requires current, readable, fresh, semantically complete evidence.
6. Atomic planning bundles are reviewed and written together.
7. Only one Work Card/repair authority may be active without conflict.
8. An Approved Work Card is the implementation contract; the Implementer Report is evidence.
9. Final Work Card validation belongs to the Operator.
10. Repair authority must be derived from exact failed evidence and return to the parent workflow.
11. Development requirements are declared in the Work Card and verified before implementation.
12. Codex approval automation applies only to requests owned by the active Work Card session.
13. OAuth is a coarse read/write transport boundary, not the future agent-role system.
14. `files.write` does not imply Git mutation authority.
15. Repository access remains path-contained and currently selected-project-bound.
16. Application shutdown owns cleanup of Codex and Agent Harness runtimes.
17. Historical planning evidence may inform reconciliation but must not override current source behavior.

## 23. Baseline Conclusion

ChampCity A/I currently has a substantial, integrated foundation:

```text
repository-derived workflow
+ canonical planning authority
+ reconciliation-aware project planning
+ project/phase/Work Card loops
+ evidence-derived repairs and validation
+ embedded ChatGPT Architect surface
+ Codex App Server implementation harness
+ managed Windows development environment
+ A/I-owned OAuth/MCP repository harness
+ persistent Settings and live public connector
```

Its next development problem is not reconstructing every historical planning step. The immediate problem is establishing a clean repository/document baseline and feeding this accurate current-state description, together with the separate future design, through the application's own intake and reconciliation workflow.

That is the transition point from externally reconstructed history to A/I-owned development going forward.
