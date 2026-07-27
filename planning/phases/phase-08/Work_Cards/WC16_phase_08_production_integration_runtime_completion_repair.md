<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "context-document",
  "artifactRevision": 1,
  "participationRole": "contextOnly",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC16"
  },
  "sourceRevisions": [],
  "workflowData": {
    "workCardId": "WC16",
    "phaseId": "phase-08",
    "title": "Phase 08 Production Integration and Runtime Completion Repair",
    "status": "approved_for_execution_after_committed_handoff",
    "owner": "Implementer",
    "risk": "high",
    "dependsOn": [
      "WC01",
      "WC01A",
      "WC01B",
      "WC02",
      "WC03",
      "WC04",
      "WC05",
      "WC06",
      "WC07",
      "WC08",
      "WC09",
      "WC10",
      "WC11",
      "WC12",
      "WC13",
      "WC14",
      "WC15"
    ],
    "executionAuthorizedBy": "planning/phases/phase-08/IMPLEMENTER_HANDOFF_WC16_phase_08_production_integration_runtime_completion_repair.md",
    "gitMutationAuthorized": false,
    "purpose": "Convert the Phase 08 service-only first pass into one reachable Electron application workflow with real embedded Architect integration, specialized workspace authority, canonical transactions, and production-path tests.",
    "defectSource": "planning/phases/phase-08/Architect_Reviews/ARCHITECT_REVIEW_PHASE08_CONTINUOUS_FIRST_PASS_IMPLEMENTATION.md",
    "activeCorpusBoundary": {
      "retain": [
        "Phase 07 clean-room authority",
        "Phase 08 planning and design authority",
        "Canonical artifacts created by the repaired application"
      ],
      "prohibit": [
        "Pre-Phase 07 planning compatibility",
        "Restoration of deleted historical planning records",
        "Development planning corpus as product fixture authority"
      ]
    },
    "requiredRepairs": [
      "Attach and render a real secure Electron Architect subscription surface",
      "Implement a real supported repository artifact handoff and MCP write-back lane",
      "Wire WC04-WC15 services through constrained main IPC, preload, and renderer controls",
      "Enforce workspace-specific bundle, report-review, validation, and close authority",
      "Correct canonical document classification and context-only participation",
      "Bind writes to main-process-owned mediated repository selection",
      "Use Architect/MCP writes for Architect-authored artifacts instead of placeholder shells",
      "Use one canonical staged transaction for pairs, bundles, revisions, handoffs, and invalidation",
      "Prove the complete post-validation repair loop through production services",
      "Add product-path IPC, preload, renderer, and curated-fixture tests",
      "Implement usable workspace-specific UI and local error states"
    ],
    "requiredWorkspaceFlow": [
      "project-intake-capture",
      "architect-interview",
      "project-planning-review",
      "project-phase-map",
      "phase-interview",
      "phase-planning-bundle",
      "phase-work-card-selection",
      "work-card-intake",
      "work-card-planning",
      "work-card-building-review",
      "work-card-repair",
      "work-card-validation",
      "work-card-close",
      "phase-validation",
      "phase-close",
      "project-validation",
      "project-close"
    ],
    "validation": [
      "npm run typecheck",
      "npm run build",
      "npm test",
      "Non-acceptance application launch smoke",
      "Operator-observed embedded Architect and MCP integration attempt"
    ],
    "hardStopConditions": [
      "Real embedded subscription surface cannot operate under the approved security boundary",
      "Supported repository artifact handoff or MCP write-back is unavailable",
      "A new dependency is required without approval",
      "Continuing requires provider API usage, DOM automation, credential extraction, security bypass, fabricated evidence, or Git mutation"
    ],
    "implementerReport": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC16_phase_08_production_integration_runtime_completion_repair.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "",
    "reviewedAt": null
  }
}
CHAMPCITY-METADATA -->

# Work Card — Phase 08 WC16 Production Integration and Runtime Completion Repair

Status: approved for Implementer execution after committed handoff
Owner: Implementer
Phase: phase-08
Risk: high
Depends on: WC01, WC01A, WC01B, WC02–WC15 first-pass implementation and cumulative Architect review
Execution authorization: supplied only by the WC16 Implementer handoff
Git mutation: not authorized
Implementer Report: `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC16_phase_08_production_integration_runtime_completion_repair.md`

## Purpose

Repair the Phase 08 first-pass package by converting its repository-local service modules into one reachable Electron application workflow.

This is a comprehensive production-integration repair. It must complete the runtime path from Project Intake through terminal Project Close, implement the real embedded Architect surface and supported handoff behavior, correct workflow authority defects, and replace service-only acceptance evidence with production-path evidence.

WC16 is a new Phase-level integration card because the defects span WC02 through WC15 and the shared runtime. It is not a child repair of one individual Work Card.

## Controlling Evidence

Read and follow:

- `planning/phases/phase-08/Architect_Reviews/ARCHITECT_REVIEW_PHASE08_CONTINUOUS_FIRST_PASS_IMPLEMENTATION.md`
- `planning/phases/phase-08/Phase_Planning.md`
- `planning/phases/phase-08/Work_Card_Plan.md`
- every current Phase 08 Work Card and Implementer Report required to understand the existing first-pass implementation;
- the current Phase 08 design documents under `planning/project/Design_Documents/`.

The Architect review is the defect source for this repair. Do not rewrite its findings as accepted behavior.

## Active-Corpus Boundary

The repository has been cleared of the pre–Phase 07 planning and superseded project corpus.

WC16 must not:

- restore deleted pre–Phase 07 planning documents;
- write compatibility logic for deleted historical artifact names, approval records, validation reports, route records, or governance subsystems;
- make the application or tests depend on the repository’s development history;
- recreate the old corpus under `planning/archive/` or another scanned planning path;
- use old planning examples as hidden schema authority.

Current authority is limited to the Phase 07 clean-room foundation, Phase 08 planning/design records, and canonical artifacts created by the repaired application.

## Required End-to-End Product Flow

The running application must support the Operator-visible path:

```text
Project Intake Capture
→ Architect Interview
→ Project Planning Bundle
→ Phase Map
→ Phase Interview
→ Phase Planning Bundle
→ Work Card Selection and Intake
→ Formal Work Card Planning
→ Implementer Handoff and Report Review
→ Repair when required
→ Operator Validation
→ Work Card Close and next candidate
→ Phase Validation and Close
→ next phase or Project Validation
→ Project Close
```

Each workspace must invoke its approved production service through constrained main-process IPC and preload contracts. The renderer must provide the required controls, current-state display, document preview, refresh, disposition, revision, and continuation behavior.

A TypeScript module that is imported only by a test is not an implemented product workflow.

## Required Repair 1 — Real Embedded Architect Surface

Implement a real main-process-owned Electron remote-content surface using a primitive supported by the installed Electron version, preferably `WebContentsView` unless repository evidence proves another supported primitive is safer.

The application must:

- attach and render the configured Architect subscription surface inside the approved Architect workspaces;
- use the dedicated persistent partition;
- keep Node integration disabled, context isolation enabled, sandbox enabled, and remote preload absent;
- support normal Operator sign-in through provider UI;
- display actual load, sign-in, ready, handoff-ready, and failure states derived from the attached web contents;
- constrain navigation and external protocols;
- preserve browser usability while local document panes refresh or fail;
- never read, export, log, or persist credentials, cookies, tokens, passwords, or session storage.

A settings object, security summary, URL validator, or status simulation is not acceptance evidence.

### Supported handoff

Implement a real supported path that makes the repository-backed prompt and source artifacts available to the embedded Architect session without manual retyping.

The mechanism may require explicit Operator attachment or confirmation, but it must:

- operate from the actual saved repository files;
- identify the exact expected output pair;
- enable the Architect session to read the handed-off content;
- enable the Architect to write or revise the expected repository artifact through ChampCity MCP;
- avoid DOM injection, credential extraction, hidden browser automation, provider APIs, and clipboard-only primary transfer.

If the real subscription surface or supported handoff is technically impossible under the approved security boundary, stop and report the exact blocker. Do not substitute a manifest or mock and call the requirement implemented.

## Required Repair 2 — Complete Runtime Wiring

Expose the approved WC04–WC15 operations through bounded main IPC and preload methods. Implement renderer actions for them.

At minimum, production paths must exist for:

- loading and refreshing the canonical Architect Interview pair;
- interview revision and disposition;
- Project Planning handoff, bundle review, revision, and shared disposition;
- Phase Map handoff, review, revision, disposition, and first-incomplete projection;
- Phase Interview handoff, review, revision, and disposition;
- Phase Planning handoff, bundle review, candidate editing/revision, and shared disposition;
- Work Card candidate selection and Intake handoff;
- Formal Work Card review, revision, rejection return, and disposition;
- exact Approved Work Card Implementer handoff and Implementer Report review;
- repair generation, review, handoff, report review, and return target;
- Operator Validation Record creation, editing, evidence, disposition, and immutable attempts;
- Work Card Close and return to candidate selection;
- Phase corpus review, Phase Closeout creation/revision/disposition, and derived Close;
- Project corpus review, Project Closeout creation/revision/disposition, and derived terminal Close.

Do not expose arbitrary filesystem operations through IPC. Each action must be purpose-built and repository-contained.

## Required Repair 3 — Workspace-Specific Authority

Remove or disable the generic single-document disposition action wherever the approved workflow requires specialized authority.

Specifically:

- Project Profile and Project Roadmap must use one coordinated bundle action;
- Phase Planning and Work Card Plan must use one coordinated bundle action;
- Phase and Project close must require both Approved disposition and `closureDecision=Close`;
- Validation Records must be created only after Operator action;
- Implementer Report disposition must represent Architect review and must not create a separate Architect Review approval artifact;
- successful non-review handoffs must remain non-gating;
- context-only records must never become current lifecycle gates.

The runtime must prevent mixed bundle disposition states instead of merely detecting them after a generic action creates them.

## Required Repair 4 — Canonical Document Classification

Correct classification and ownership using explicit canonical artifact metadata first, with narrowly bounded canonical-path fallback only where necessary for existing Phase 07 clean-room files.

Required ownership includes:

```text
Project Intake                  → project-intake-capture
Project Architect Interview     → architect-interview
Project Profile/Roadmap         → project-planning-review
Phase Map                       → project-phase-map
Phase Interview                 → phase-interview
Phase Planning/Work Card Plan   → phase-planning-bundle
Work Card Intake handoff        → work-card-intake, non-review
Formal Work Card                → work-card-planning
Implementer Report              → work-card-building-review
Repair Work Card                → work-card-repair
Validation_Record               → work-card-validation
Phase_Closeout                  → phase-validation or phase-close by semantics
Project_Closeout                → project-validation or project-close by semantics
```

Observations, risks, decisions, change logs, design documents, reports about the development process, and other context records must be `contextOnly` or otherwise non-gating unless a current approved design explicitly makes them lifecycle authority.

Remove filename compatibility branches whose only purpose was supporting deleted pre–Phase 07 artifacts.

## Required Repair 5 — Repository Selection Authority

The renderer must not choose an arbitrary write root by submitting a path string.

Bind project writes to a main-process-owned repository selection established through the mediated folder chooser or an equivalent opaque selection reference.

Requirements:

- renderer receives display information and a constrained selection reference, not general write authority;
- submission uses the selected repository maintained by the main process;
- stale, missing, changed, or inaccessible selections fail locally;
- the optional repository-review-context field remains optional when existing source/planning is Yes;
- generated durable artifacts continue to redact concrete local paths where required.

## Required Repair 6 — Architect-Authored Outputs

Remove the behavior in which the application treats placeholder document shells as completed Architect output.

For Architect-authored artifacts—including Architect Interview, Project Profile, Project Roadmap, Phase Map, Phase Interview, Phase Planning, Work Card Plan, Formal Work Card, and repair Work Cards—the normal production path is:

```text
application creates Approved non-review handoff
→ embedded Architect receives sources
→ Architect writes the substantive Pending artifact pair through MCP
→ application refreshes and presents that repository content for Operator review
```

The application may show a waiting state before the pair exists. It must not create an empty or heading-only review document and imply that the Architect completed it.

Operator-authored records such as Project Intake, Validation Records, Phase Closeout, and Project Closeout may be created from structured application forms.

## Required Repair 7 — Canonical Atomic Artifact Transactions

Use one canonical staged transaction mechanism for synchronized artifact creation, revision, source-reference updates, coordinated bundle writes, handoff regeneration, and downstream invalidation.

The transaction must:

- validate every target and source before replacing any file;
- stage all new bytes before target replacement;
- preserve unrelated document content;
- prevent partial Markdown/JSON pairs;
- prevent partial planning bundles;
- roll back every replaced file when a later replacement fails;
- report a truthful recoverable error when complete rollback cannot be guaranteed;
- verify the final synchronized state before reporting success.

Do not leave separate direct-write helpers in each service with subtly different rollback rules.

## Required Repair 8 — Full Post-Validation Repair Loop

Prove through production services and runtime-accessible actions:

```text
Operator creates validation attempt
→ Operator records RevisionRequested failure
→ application exposes post-validation repair action
→ repair Work Card is created against original parent
→ repair Implementer Report is created and reviewed
→ Approved repair report returns parent to Validation
→ Operator creates a new numbered validation attempt
→ earlier failed attempt remains unchanged
→ current Approved attempt closes the parent Work Card
```

The test must invoke the same service and IPC contracts used by the application. A direct second-attempt creation that skips repair does not satisfy this criterion.

## Required Repair 9 — Product-Path Test Authority

Retain useful service unit tests, but add production-path tests that prove:

- main IPC handlers invoke the intended services;
- preload exposes only the approved purpose-built methods;
- renderer workspace controls call those methods and use specialized disposition authority;
- every visible workspace has a reachable production action or an honest waiting/read-only state;
- resolver-selected workspace IDs exist in the production registry;
- Project and Phase bundles cannot be independently approved through the renderer;
- Validation Records classify and display in Work Card Validation;
- Project Intake and Architect Interview display in their own workspaces;
- the post-validation repair loop uses the full production chain;
- context-only files cannot become gates;
- the curated clean-room fixture progresses through representative Project, Phase, Work Card, repair, validation, and close evidence.

Replace any test that uses the repository’s development `planning/` corpus as product fixture authority with a curated fixture under `test/fixtures/` or another test-only path outside scanned production planning.

Source-string assertions may supplement behavioral tests but cannot serve as acceptance evidence for runtime wiring.

No Playwright is authorized. Use the existing Node/Electron-compatible test strategy, mounted renderer tests where practical, and controlled manual validation.

## Required Repair 10 — UI and Error Behavior

The application must provide a usable workspace experience, not seventeen undifferentiated tabs backed by one generic document view.

Requirements:

- workspace-specific primary actions and eligibility explanations;
- dual-pane Architect/document review where specified;
- independent previews for bundle documents with one shared disposition control;
- grouped corpus browsers for Phase and Project Validation;
- local read, parse, sibling, MCP, browser, and write failures;
- preservation of last readable document content on transient refresh failure;
- clear waiting states when Architect output does not yet exist;
- no raw JSON requirement for ordinary Operator decisions;
- no automatic claim of completion from test output or chat state.

## Authorized Production Scope

WC16 may modify any current Phase 08 source or test file directly required to complete the integrated runtime.

Expected areas include:

```text
src/main/main.ts
src/main/browser/
src/main/integrations/
src/main/documents/
src/main/projectIntake/
src/main/architectInterview/
src/main/projectPlanning/
src/main/phaseMap/
src/main/phaseInterview/
src/main/phasePlanning/
src/main/workCardIntake/
src/main/workCardPlanning/
src/main/workCardBuilding/
src/main/workCardRepair/
src/main/workCardValidation/
src/main/phaseClose/
src/main/projectClose/
src/preload/index.ts
src/renderer/app/App.tsx
src/renderer/styles.css
src/shared/
test/
```

The Implementer may consolidate or delete redundant first-pass services and tests when the final integrated design makes them unnecessary. Identify every deletion in the report.

No new dependency is authorized without stopping and obtaining explicit approval.

## Explicit Non-Goals

Do not:

- restore pre–Phase 07 planning compatibility;
- restore rejected governance, approval, route, execution-run, hash, or role-gate systems;
- use provider APIs;
- automate ChatGPT through DOM scripting;
- extract or persist browser credentials;
- add hidden current-lifecycle state;
- create separate Implementer execution packets;
- create separate Architect Review approval artifacts;
- create duplicate corpus snapshots as authority;
- perform release packaging or Phase 08 closeout;
- perform Git operations.

## Validation

Run the normal Windows lane:

```text
npm run typecheck
npm run build
npm test
```

Also perform a non-acceptance application launch smoke to confirm:

- the application opens;
- all 17 workspace definitions are reachable without a blank renderer;
- Project Intake submission is usable;
- the embedded Architect surface is visibly attached or the exact truthful blocker is shown;
- specialized workspace actions appear where expected;
- the generic single-document disposition path is not available where it would violate bundle or close authority.

### Required manual integration lane

Before the Implementer may report WC16 as fully implemented, the Operator-observed WC03 lane must be attempted:

1. embedded subscription surface renders;
2. normal sign-in works;
3. saved prompt/source artifacts are handed to the correct chat through the supported mechanism;
4. Architect reads an Operator-provided marker and source value;
5. Architect writes a bounded artifact through ChampCity MCP;
6. the application refreshes and displays that artifact;
7. no credential or automation violation occurs.

The Implementer must report this lane as passed, failed, or blocked. It must not report it as passed without Operator-observed evidence.

## Acceptance Criteria

WC16 is acceptable only when:

1. pre–Phase 07 compatibility is absent from current runtime and tests;
2. a real secure embedded Architect surface is attached and visible, or a truthful hard blocker stops the pass;
3. the supported handoff and MCP write-back lane is attempted and accurately reported;
4. WC04–WC15 services are reachable through constrained main IPC, preload, and renderer controls;
5. every approved workspace has correct specialized behavior and authority;
6. Project and Phase planning bundles cannot enter mixed disposition states through the application;
7. Validation Records, Project Intake, Architect Interview, closeouts, and context records classify correctly;
8. renderer-submitted arbitrary repository paths cannot control writes;
9. the existing-project repository-review note remains optional;
10. Architect-authored outputs come from Architect/MCP writes rather than placeholder shells;
11. one canonical staged transaction governs pair, bundle, revision, handoff, and invalidation writes;
12. the full post-validation repair loop is proven through the production path;
13. product-path tests exercise IPC, preload, renderer actions, and curated lifecycle fixtures;
14. the development planning corpus is not used as product fixture authority;
15. typecheck, build, and all tests pass;
16. the application launch smoke completes without blank or inaccessible required workspaces;
17. no prohibited architecture, dependency, Git operation, or fabricated evidence is introduced;
18. the Implementer Report accurately distinguishes completed, deferred, failed, and blocked evidence.

## Implementer Report Requirements

The report must include:

- repository, remote, branch, execution baseline, and starting clean status;
- exact files created, modified, and deleted;
- final main IPC and preload contract inventory;
- final workspace-to-runtime-action map;
- embedded-browser primitive and actual attachment architecture;
- actual handoff mechanism and Operator-observed result;
- canonical transaction design and rollback evidence;
- corrected classification table;
- repository-selection authority design;
- explanation of how Architect-authored content reaches each review workspace;
- full post-validation repair-loop evidence;
- product-path test inventory and final test counts;
- launch-smoke observations;
- unresolved defects or blockers;
- remaining Operator manual validation after Architect review;
- confirmation that deleted pre–Phase 07 compatibility was not restored;
- confirmation that no Git operation occurred.

The report must end with:

```markdown
## Manual Validation After Architect Review

Operator acceptance will be designed after the Architect reviews the WC16 report and repository evidence. Do not treat the WC16 integration lane as final Phase 08 acceptance or closeout.
