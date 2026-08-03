<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 2,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC43-REPAIR01B",
    "repairId": "WC43-REPAIR01B",
    "parentWorkCardId": "WC43"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC43_work_card_intake_workspace_and_transition.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC43_work_card_intake_workspace_and_transition.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC43-REPAIR01A_single_output_review_activation.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC41_domain_specific_architect_handoff_prompt_contracts.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC41_domain_specific_architect_handoff_prompt_contracts.md",
      "revision": 4
    }
  ],
  "workflowData": {
    "title": "Unified Work Card Planning and Executable-Contract Prompt",
    "status": "approved_for_implementation",
    "executionMode": "one bounded workflow-presentation and prompt repair",
    "dependsOn": [
      "WC43-REPAIR01A"
    ],
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC43-REPAIR01B_unified_work_card_planning_and_contract_prompt.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Present intake preparation and Formal Work Card authoring as one Operator-visible Planning workspace, balance the document and browser panes, and install the exact Architect executable-contract prompt in this card.",
    "reviewedAt": "2026-08-02"
  }
}
CHAMPCITY-METADATA -->

# WC43-REPAIR01B — Unified Work Card Planning and Executable-Contract Prompt

Status: Approved for Implementer execution  
Parent: `WC43`  
Depends on: `WC43-REPAIR01A`  
Git mutation: prohibited

## Verified Repository Evidence

The complete current production path was inspected:

```text
Approved Work_Card_Plan metadata.workflowData.candidates
→ selectNextWorkCardCandidate()
→ resolveWorkCardIntakeContext()
→ generateWorkCardIntakeHandoff()
→ canonical Approved non-review intake handoff
→ formalWorkCardArchitectOutputDefinition
→ generic Prepare / Copy / MCP temporary draft / promotion
→ Pending Formal Work Card review
→ Approved Formal Work Card enables Work Card Building
```

The inspected surface includes candidate service logic, current-workflow resolution, existing IPC/preload routes, shared workspace contracts, renderer routing, nested rails, canonical handoff persistence, Architect draft promotion, downstream Work Card eligibility, and relevant service, workflow, renderer, and prompt tests.

Confirmed defects:

1. WC43 correctly built the candidate intake projection and durable handoff, but presents Intake and Planning as two Operator workspaces even though Intake only prepares Planning authority.
2. The Work Card rail exposes separate `Work Card Intake` and `Planning` controls.
3. Formal Work Card Planning uses the generic document grid while also rendering the embedded browser. The document pane is compressed and the browser receives excessive width.
4. The active Formal Work Card prompt enforces headings and candidate context but does not require full production-path inspection, explicit Architect decisions, conditional Operator questions, positive and negative production proof, or an auditable acceptance-to-evidence mapping.

Confirmed preserved value:

- the intake handoff is valid durable non-review evidence;
- the generated Formal Work Card is the actual Implementer instruction after Operator approval;
- the generic Architect-output draft, promotion, revision, and review mechanisms are accepted and must be reused.

## Objective

Provide one Operator-visible `Planning` workspace that spans candidate intake preparation and Formal Work Card authoring, then install the exact Architect prompt below so every generated Formal Work Card is an executable implementation contract rather than a heading-compliant expansion of Phase Planning.

## Runtime Sequence

```text
Approved canonical Work Card candidate
→ Work Card Planning opens in pre-handoff state with selected candidate context
→ Operator selects Prepare Work Card Planning
→ existing generateCurrentHandoff route creates the Approved non-review intake handoff
→ same Planning workspace refreshes into the existing Formal Work Card Architect-output state
→ Operator prepares and copies the exact Architect prompt
→ Architect resolves any material Operator-owned question and writes one temporary Formal Work Card draft
→ existing promotion creates the Pending canonical Formal Work Card
→ Operator reviews and disposes the actual Implementer contract
```

## Required Changes

### 1. One Operator-visible Planning workspace

Keep `work-card-intake` registered for historical handoff classification and compatibility with existing repository documents. Do not delete or migrate existing handoffs.

Change current workflow presentation as follows:

- when the selected candidate has no intake handoff, return `activeWorkspaceId=work-card-planning` with the existing `workCardIntake` projection as the pre-handoff substate;
- do not return `work-card-intake` as the current Operator workspace for new flow resolution;
- remove the separate `Work Card Intake` item from the visible Work Card loop rail;
- the visible `Planning` item represents both pre-handoff preparation and Formal Work Card authoring;
- legacy navigation to `work-card-intake`, if encountered, must resolve or redirect to the same Planning surface without creating another authority path.

### 2. Preserve and reuse WC43 intake behavior

When `activeWorkspaceId=work-card-planning` and `currentModel.workCardIntake` exists:

- render the existing selected-candidate intake content in the Planning workspace;
- label the primary action `Prepare Work Card Planning`;
- state that it creates the application-owned Approved non-review intake handoff;
- call the existing `window.champcity.generateCurrentHandoff()` route;
- prevent duplicate in-flight activation;
- on success refresh repository documents, current workflow model, and Architect-output model;
- require the refreshed current workspace to remain `work-card-planning` with the intake projection removed and Formal Work Card preparation available;
- replace the pre-handoff view in place with the existing Architect action bar and dual-pane authoring/review surface.

Do not add a new IPC, preload route, persistence service, output definition, or review document.

### 3. Work Card Planning layout

For `work-card-planning` and `work-card-repair` after a handoff exists, use a dedicated dual-pane class:

```text
left:  Formal or Repair Work Card document and review — 56%
right: Embedded ChatGPT                         — 44%
```

At normal desktop width, use a minimum readable document column of 560px and browser column of 420px. At constrained width, stack document/review above the browser. Do not change the established layouts for Project Planning, Phase Map, Phase Interview, or Phase Planning.

### 4. Install this exact Formal Work Card Architect prompt

The Implementer must install the following prompt template in the active definition-owned Formal Work Card builder. Replace only the bracketed dynamic values from current context. Do not paraphrase, shorten, expand, or reconstruct the method.

````text
Use ChampCity MCP with repository reference <PROJECT_REPO>.
Resolve the configured workspace ID through diagnostics_toolbox.list_workspaces when it is not already known.

This is the Formal Work Card Architect session.

Read the exact current Approved Work Card Intake handoff:
- path: <SOURCE_HANDOFF_PATH>
- revision: <SOURCE_HANDOFF_REVISION>

Selected Work Card:
- ID: <WORK_CARD_ID>
- title: <CANDIDATE_TITLE>
- candidate context: <CANDIDATE_JSON>

Application-owned outputs:
- final Formal Work Card target: <FINAL_TARGET_PATH>
- temporary body-only draft path: <TEMPORARY_DRAFT_PATH>

Evidence inputs:
<EVIDENCE_PATH_AND_REVISION_LINES>

<CURRENT_OPERATOR_REVISION_INSTRUCTIONS_WHEN_APPLICABLE>

Your job is to create the Architect's executable implementation contract. The Implementer will be responsible for faithful coding and proof, not for deciding what the system should become.

Before drafting:

1. Inspect the complete production path relevant to this candidate, including service or domain logic, main-process IPC exposure, preload exposure, shared contracts, renderer wiring, persistence or canonical writers, downstream consumers, and relevant tests. A layer may be omitted only when repository inspection confirms it is absent or irrelevant; state that limitation in Verified Repository Evidence. Do not claim a complete review when only an obvious surface was inspected.

2. Distinguish:
- verified repository behavior;
- approved planning direction that is not yet implemented;
- unresolved assumptions or Operator-owned choices.

3. Make all Architect-owned decisions needed for this Work Card. Do not ask the Implementer to determine the source of authority, persistence mechanism, output structure, workflow state model, atomicity, retry behavior, review semantics, UI interaction pattern, schema, invocation object, or existing mechanism to reuse.

4. When a material Operator-owned choice remains, ask one primary question at a time in plain language. Provide the recommended answer first with a brief rationale. The Operator may answer `use your recommendation` or `unsure`; treat either as permission to proceed with the best evidence-grounded recommendation. Do not ask questions already resolved by repository evidence or normal architectural judgment. Do not create the draft until material questions are resolved.

5. When no material Operator-owned choice remains, proceed without asking a question.

6. Define the smallest complete buildable outcome and the exact runtime sequence:
existing authoritative evidence
→ authorized application action
→ required state transition
→ persistence or rendering result
→ Operator-visible outcome

Do not restate the Phase Plan except where a specific constraint directly governs this Work Card.

Create one complete Formal Work Card body with exactly this structure:

# <WORK_CARD_ID> — <CANDIDATE_TITLE>
## Verified Repository Evidence
## Objective
## Runtime Sequence
## Required Changes
## Preserved Behavior
## Authorized Surface
## Risks and Constraints
## Acceptance Criteria
## Negative Constraints
## Implementer Report Requirements
## Manual Validation

Apply these section rules:

- Verified Repository Evidence identifies the actual files, functions, routes, persistence, downstream consumers, and tests inspected. It separates confirmed behavior from planning intent and assumptions.
- Objective defines one bounded outcome.
- Runtime Sequence states the exact production path and state transition.
- Required Changes embeds exact approved prompt text, schemas, invocation objects, metadata shapes, or required sequences when practical. The Implementer installs the decision rather than inventing it.
- Preserved Behavior states accepted authorities and invariants that must not be reopened.
- Authorized Surface lists expected production and test files. Permit only a narrowly necessary adjacent correction that preserves the architecture, is documented, and is fully tested.
- Acceptance Criteria prove the actual production path. Require positive and negative proof, state before and after the action, final repository bytes or rendered projection, failure handling, retry behavior when relevant, and downstream readiness. Source-string checks may support wiring but cannot be primary runtime proof.
- Negative Constraints prohibit alternate persistence, retired fallbacks, duplicate authority, unauthorized compatibility wrappers, duplicate schemas, manual imports, unnecessary migration, unrelated workspace changes, and Git operations unless explicitly authorized.
- Implementer Report Requirements map every acceptance criterion to concrete evidence, list all changed files and adjacent corrections, identify production paths exercised, commands and results, Operator validation remaining, scope expansion, and residual risk.
- Manual Validation contains only visual, interactive, timing-sensitive, or embedded-browser checks that require the running product.

Before writing the draft, verify:

exact requested production behavior
+ preserved behavior intact
+ safe failure paths
+ no unauthorized parallel mechanism
+ auditable automated proof
= ready for Operator review

Do not include application metadata delimiters, canonical metadata, source revisions, final-write metadata, route selectors, fallback fields, hidden authority values, or placeholder content in the body.
ChampCity A/I owns validation, canonical metadata, promotion, final writes, review state, and cleanup.

When the complete body is ready, call artifact_toolbox.create_markdown_artifact exactly once:

```json
{
  "action": "create_markdown_artifact",
  "workspaceId": "<resolved workspace ID>",
  "params": {
    "relativePath": "<TEMPORARY_DRAFT_PATH>",
    "content": "<complete body-only Formal Work Card Markdown>",
    "overwrite": false
  }
}
```

After the draft is created, respond with a concise draft-created confirmation. If the action fails, report the exact failure and remain incomplete.
````

Dynamic substitution rules:

- `<CANDIDATE_JSON>` is the exact serialized current candidate from the Approved intake handoff.
- `<EVIDENCE_PATH_AND_REVISION_LINES>` uses current `context.sourceRevisions` and includes one `- path: ... revision: ...` line per source.
- `<CURRENT_OPERATOR_REVISION_INSTRUCTIONS_WHEN_APPLICABLE>` is omitted for initial creation and contains the exact current notes for `RevisionRequested` replacement.
- The generated prompt contains exactly one executable `create_markdown_artifact` invocation and no final-path write.

### 5. Existing Pending Formal Work Cards

Do not rewrite, delete, or silently revise an existing Pending Formal Work Card when this repair is installed. The new prompt governs future creation and an Operator-authorized `RevisionRequested` replacement. Existing canonical bytes remain unchanged until the normal review process acts on them.

## Preserved Behavior

Preserve unchanged:

- canonical Work Card Plan candidate authority and candidate-selection rules;
- WC43 `resolveWorkCardIntakeContext()` and shared target construction;
- Approved `work-card-intake-handoff` metadata, path, source revisions, non-review role, and persistence;
- existing `currentWorkflow:generateHandoff` and generic Architect-output IPC/preload routes;
- Formal Work Card definition, temporary draft paths, promotion, revision, canonical metadata, review, and downstream building eligibility;
- `RevisionRequested` note delivery;
- WC43-REPAIR01A single-output viewed-revision correction;
- all unrelated project, phase, Work Card building, validation, close, and repair behavior.

## Authorized Surface

```text
src/main/currentWorkflow/currentWorkflowService.ts
src/main/workCardPlanning/workCardPlanningService.ts
src/shared/workspaceContracts.ts
src/shared/workspaces/projectRailPresentation.ts
src/renderer/app/App.tsx
src/renderer/app/NestedWorkflowRail.tsx
src/renderer/app/WorkCardIntakeWorkspace.tsx
src/renderer/styles.css
test/work-card-intake/work-card-intake-service.test.cjs
test/work-card-planning/work-card-planning-service.test.cjs
test/workflow/current-execution-context.test.cjs
test/renderer/work-card-intake-workspace.test.cjs
test/renderer/project-rail-presentation.test.cjs
test/renderer/architect-output-workspace-source.test.cjs
test/architect-outputs/architect-output-prompt-contracts.test.cjs
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC43-REPAIR01B_unified_work_card_planning_and_contract_prompt.md
```

A narrowly necessary adjacent renderer helper or test is acceptable when documented and fully tested. No main-process IPC, preload, canonical writer, schema, or migration change is authorized.

## Risks and Constraints

The repair must simplify the Operator workflow without deleting durable evidence or creating an automatic hidden write. The intake handoff remains an explicit application action and repository artifact. The new prompt may ask zero questions when evidence resolves the card; it must not force ceremonial interviews.

## Acceptance Criteria

1. Before an intake handoff exists, the current workflow resolves to `work-card-planning` with the exact WC43 intake projection.
2. The visible Work Card rail contains one `Planning` item and no separate `Work Card Intake` item.
3. The pre-handoff Planning state renders the selected candidate and `Prepare Work Card Planning`, with no document review, disposition control, or embedded browser.
4. The action uses the existing `generateCurrentHandoff` production route and creates the same Approved non-review handoff bytes and Formal Work Card target semantics as WC43.
5. After success, the same visible Planning workspace refreshes to the existing Formal Work Card Architect-output state; it does not navigate through another Operator workspace.
6. Ineligible or failed candidate selection creates no handoff or draft submission.
7. A generation failure leaves the pre-handoff Planning state intact and displays the exact error.
8. Formal Work Card Planning uses the specified 56/44 document/browser layout at normal desktop width and stacks document above browser when constrained.
9. Other Architect workspace layouts remain unchanged.
10. The active generated prompt matches the exact template above except for defined dynamic substitutions.
11. Prompt proof includes full-path inspection instructions, Architect decision ownership, conditional Operator questions, one bounded outcome, positive and negative production proof, preserved behavior, authorized surface, negative constraints, auditable report requirements, and Operator-only manual validation.
12. The prompt contains exactly one temporary-draft invocation with `overwrite=false`, includes exact revision notes when applicable, and contains no final-path write.
13. An existing Pending Formal Work Card remains byte-identical after installation.
14. Production-path tests cover pre-handoff Planning, successful handoff generation, same-workspace state transition, failure/no-mutation behavior, rail presentation, prompt output, and unchanged downstream Formal Work Card eligibility. Source-string tests alone are insufficient.
15. Typecheck, TypeScript build, Vite build, focused tests, and the complete Node test lane pass in the approved normal Windows environment.
16. No Git operation occurs.

## Negative Constraints

Do not:

- delete or migrate existing intake handoffs;
- add a second handoff, prompt, persistence, or review mechanism;
- auto-generate the intake handoff without the Operator action;
- add IPC or preload routes;
- change candidate selection, completion, or dependency semantics;
- rewrite existing Pending Formal Work Cards;
- force questions when no material Operator choice remains;
- let the Implementer choose architecture, authority, persistence, state, retry, review, UI, prompt, schema, or invocation design;
- change unrelated workspaces;
- add dependencies, Playwright, migration machinery, compatibility wrappers, or Git operations.

## Implementer Report Requirements

Create:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC43-REPAIR01B_unified_work_card_planning_and_contract_prompt.md
```

Map every acceptance criterion to concrete proof. Report all changed files, any adjacent correction and why it was necessary, the exact installed prompt or its verified digest and dynamic substitutions, production paths exercised, before/after workflow states, repository bytes or rendered output checked, positive and negative tests, commands and results, Operator validation remaining, scope expansion, and residual risk.

## Manual Validation

Operator validation must confirm:

1. The Work Card loop shows one Planning step.
2. Planning first displays the selected candidate and prepares the intake handoff without leaving the workspace.
3. The same workspace then exposes Prepare/Copy and Embedded ChatGPT.
4. The document pane is wider than the browser and readable at normal desktop width.
5. The copied prompt follows the exact Architect contract method and asks questions only when a material Operator-owned decision remains.
6. A newly generated or Operator-requested revised Formal Work Card is concise, bounded, implementation-ready, and aligned with the approved standard.
