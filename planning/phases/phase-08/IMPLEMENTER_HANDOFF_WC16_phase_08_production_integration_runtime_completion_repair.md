# Implementer Handoff — Phase 08 WC16 Production Integration and Runtime Completion Repair

Status: approved for immediate Implementer execution after this handoff and WC16 are committed
Project: ChampCity A/I
Repository: `<PROJECT_REPO>`
Expected repository: `ChampCityChris/ChampCity_AI`
Expected branch: `feature/phase-04-wc01-repair01-evidence-derived-workflow`
Required cleanup baseline in repository history: `3d66ba22f22f76efb7b1ee06ad6b237fc30908fa`
Starting working tree: clean
Git mutation: not authorized during implementation

## Operator Authorization

The Operator authorizes one comprehensive WC16 repair pass.

Implement:

```text
planning/phases/phase-08/Work_Cards/WC16_phase_08_production_integration_runtime_completion_repair.md
planning/phases/phase-08/Work_Cards/WC16_phase_08_production_integration_runtime_completion_repair.json
```

Create one report:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC16_phase_08_production_integration_runtime_completion_repair.md
```

Do not request another release before beginning WC16. Do not split the repair into unapproved subcards merely because it spans multiple existing service modules. The Work Card explicitly authorizes cross-cutting production integration within its stated boundary.

## Starting Verification

Before editing:

1. verify the repository and branch shown above;
2. verify the repository is clean;
3. verify the cleanup baseline commit is present in the current history;
4. verify this handoff and the WC16 Markdown/JSON pair are present in the committed repository;
5. read `AGENTS.md`;
6. read `docs/architecture/REPOSITORY_CODE_TEST_AND_MIGRATION_BOUNDARY.md`;
7. read `docs/dev/VALIDATION_COMMAND_LANES.md`;
8. read the WC16 Work Card immediately before implementation;
9. read `planning/phases/phase-08/Architect_Reviews/ARCHITECT_REVIEW_PHASE08_CONTINUOUS_FIRST_PASS_IMPLEMENTATION.md`;
10. verify that the deleted pre–Phase 07 planning and superseded project corpus has not returned.

Abort before editing if the repository, branch, clean starting status, committed WC16 authority, or active-corpus boundary is wrong.

## Execution Objective

Convert the Phase 08 first-pass modules into one working Electron product path.

The pass must prioritize production reachability and product authority over adding more isolated services or tests.

```text
service implementation
+ main IPC
+ preload contract
+ renderer action and workspace
+ canonical repository artifact behavior
+ production-path test
= implemented workflow
```

A service that is callable only from a direct Node test remains incomplete.

## Mandatory Repair Order

Use this internal execution order unless repository evidence requires a narrower prerequisite correction:

```text
1. Active-corpus and classifier cleanup
2. Canonical artifact transaction foundation
3. Main-owned repository selection authority
4. Real embedded Architect browser surface
5. Supported handoff and MCP write-back path
6. Project Intake and Architect Interview runtime completion
7. Project Planning and Phase Map runtime completion
8. Phase Interview and Phase Planning runtime completion
9. Work Card selection, planning, building review, and repair runtime completion
10. Operator Validation, Work Card Close, Phase Close, and Project Close runtime completion
11. Full post-validation repair loop
12. Product-path test and launch-smoke completion
```

Do not use this ordering to weaken any WC16 acceptance criterion.

## Active-Corpus Rule

The old planning corpus was intentionally removed to prevent obsolete governance and artifact conventions from influencing the application.

Do not:

- restore deleted phase-01 through phase-06 records;
- restore superseded project/system planning records;
- create compatibility code for deleted approval, validation, route, workflow-state, execution-run, or artifact-registry formats;
- use Git history as runtime input;
- use the repository’s active development planning corpus as a test project fixture.

Use a curated test-only clean-room fixture for product workflow tests.

## Embedded Architect Stop Boundary

WC16 requires an actual attached Electron remote-content surface and an attempted supported handoff/MCP write-back lane.

Stop and write a blocked report when:

- ChatGPT cannot be embedded under the approved security settings;
- normal sign-in cannot operate without unsafe credential handling;
- no supported artifact handoff or MCP write-back path exists;
- meeting the requirement would require provider APIs, DOM automation, browser extensions, credential extraction, security bypass, or an unapproved dependency.

Do not continue by replacing the required capability with:

- a settings object;
- a filename manifest;
- a fake browser status;
- a placeholder chat pane;
- a copied transcript;
- a mock MCP response;
- a clipboard-only primary workflow.

A truthful blocker is an acceptable pass outcome. Fabricated integration is not.

## Production Integration Rules

- Wire every approved operation through purpose-built main IPC and preload methods.
- Keep renderer filesystem authority constrained.
- Use workspace-specific actions rather than one universal disposition action where authority differs.
- Remove generic independent disposition from coordinated Project and Phase planning bundles.
- Ensure semantic close requires Approved plus `closureDecision=Close`.
- Keep context records non-gating.
- Correct `Validation_Records` and every canonical artifact’s workspace ownership.
- Remove application-generated placeholder Architect documents from the normal production path.
- Use one staged transaction mechanism for all authoritative multi-file writes.
- Preserve failed validation attempts and repair evidence.
- Do not create hidden current lifecycle state.

## Test Authority

The final test suite must include production-path coverage for:

- main handler registration and service invocation;
- preload exposure and restriction;
- renderer-visible workspace actions;
- coordinated bundle authority;
- classification and resolver ownership;
- repository selection binding;
- canonical transaction rollback;
- full failed-validation repair loop;
- representative Project → Phase → Work Card → Phase Close → Project Close fixture progression.

Direct service unit tests remain useful but cannot be the sole acceptance evidence.

Do not use Playwright.

## Validation

Run:

```text
npm run typecheck
npm run build
npm test
```

Then perform the non-acceptance launch smoke required by WC16.

Attempt the Operator-observed embedded Architect lane. Record the result exactly as passed, failed, or blocked. Do not infer success from page-load configuration or automated unit tests.

## Mandatory Stop Conditions

Stop and write the WC16 Pending report when:

- starting verification fails;
- the active deleted corpus would need to be restored;
- a new dependency is required without approval;
- the embedded Architect or handoff requirement hits the hard blocker described above;
- repository containment or credential safety cannot be maintained;
- the cumulative source cannot typecheck or build and cannot be repaired within WC16 scope;
- continuing would require prohibited architecture or fabricated evidence;
- a Git operation would be required.

## Report Requirements

The WC16 Implementer Report must include every item required by the Work Card and must clearly state one outcome:

```text
Implemented
Partially implemented with exact unresolved defects
Blocked with exact blocker
```

The report must not describe WC02–WC15 as accepted merely because their service modules remain present.

The report must end with:

```markdown
## Document Disposition

Document.Status=Pending
```

## Completion Boundary

Stop after the WC16 report and final response.

Do not:

- conduct Architect acceptance on your own report;
- conduct final Operator Phase 08 acceptance;
- create Phase 08 closeout;
- stage, commit, push, merge, rebase, tag, reset, clean, restore, or stash;
- package or release the application.

## Final Response

Provide:

- WC16 outcome;
- Implementer Report path;
- exact source and test files created, modified, and deleted;
- final typecheck, build, and test results with counts;
- launch-smoke result;
- embedded Architect and MCP integration result;
- unresolved blockers or defects;
- remaining Operator manual validation;
- final repository status;
- confirmation that deleted pre–Phase 07 compatibility was not restored;
- confirmation that no Git operation occurred.

## Document Disposition

Document.Status=Approved
