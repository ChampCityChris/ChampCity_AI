<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC43-REPAIR02",
    "repairId": "WC43-REPAIR02",
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
      "path": "planning/phases/phase-08/Work_Cards/WC43-REPAIR01B_unified_work_card_planning_and_contract_prompt.md",
      "revision": 2
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC43-REPAIR01B_unified_work_card_planning_and_contract_prompt.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Remove Work Card Heading Gates and Reuse Shared Dual-Pane Layout",
    "status": "approved_for_implementation",
    "executionMode": "one bounded validator-and-layout repair",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC43-REPAIR02_remove_work_card_heading_gates_and_reuse_shared_dual_pane.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Remove H1/H2-based promotion authority from Formal and Repair Work Cards while preserving substantive-body, metadata-boundary, and Repair return-target validation. Delete the Work Card-specific dual-pane implementation and reuse the established shared Architect dual-pane layout.",
    "reviewedAt": "2026-08-02"
  }
}
CHAMPCITY-METADATA -->

# WC43-REPAIR02 — Remove Work Card Heading Gates and Reuse Shared Dual-Pane Layout

Status: Approved for Implementer execution  
Parent: `WC43`  
Git mutation: prohibited

## Verified Repository Evidence

The complete failed production path was inspected:

```text
Approved Work Card Intake handoff
→ work-card-planning Prepare / Copy
→ ChatGPT creates one temporary Formal Work Card draft
→ generic Architect-output polling detects the draft
→ Formal Work Card slot validateBody()
→ validateOneH1Prefix() and validateExactH2s()
→ promotion fails
→ no Pending canonical Work Card exists
→ document pane remains empty
```

The current temporary draft is substantive and follows the approved Work Card method. It also embeds exact heading templates for files the Implementer must create, including architecture and ADR examples. The Formal Work Card validator scans lines inside fenced code blocks as document headings. It therefore treats legitimate embedded examples as additional H1/H2 headings and rejects the draft.

The same H1/H2 implementation is duplicated in `workCardRepairService.ts`, so Repair Work Cards are exposed to the same normal-use defect.

The inspected application path includes the definition-owned prompts, slot validators, generic promotion service, canonical metadata construction, current final target, retry state, renderer selection, shared layout helper, Work Card-specific layout branch, CSS, and relevant production service and renderer tests.

A separate renderer inconsistency is confirmed. WC43-REPAIR01B added a new `work-card-architect-workspace` class with its own width and responsive rules rather than reusing the existing shared `architect-interview-workspace` dual-pane layout used by other embedded Architect workspaces.

## Objective

Remove H1/H2 shape from promotion authority for Formal and Repair Work Cards. Preserve the headings in their Architect prompts as the approved writing template, but make body quality and section adequacy an Architect and Operator review responsibility rather than a hidden application gate.

Delete the Work Card-specific dual-pane implementation and route Formal and Repair Work Card authoring through the existing shared dual-pane layout.

## Runtime Sequence

```text
current Approved handoff and Architect-output submission
→ ChatGPT writes substantive body-only Markdown, including exact examples when needed
→ application rejects only empty body, caller metadata, or Repair return-target conflict
→ application-owned identity, source revisions, workflow data, and Pending disposition are written canonically
→ promoted Work Card becomes the selected document in the shared dual-pane workspace
→ Operator reviews the actual implementation contract and applies the existing disposition
```

For a failed prior submission:

```text
failed draft remains evidence
→ Operator explicitly selects Prepare Handoff
→ existing retry behavior creates a fresh absent draft path
→ ChatGPT writes or reuses corrected substantive content through the fresh path
→ promotion uses the repaired validator
```

Do not add automatic retry, reuse the failed submission path, or mutate the failed draft.

## Required Changes

### 1. Remove Formal Work Card H1/H2 promotion gates

In the active Formal Work Card definition:

- keep `substantiveMarkdown(bodyMarkdown, "Formal Work Card")`;
- remove all body-title and section-heading validation from `validateFormalWorkCardBody()`;
- remove `validateOneH1Prefix()` and `validateExactH2s()` from the Formal Work Card production path;
- do not replace them with a Markdown parser, fence-aware heading counter, warning gate, compatibility validator, or alternate heading requirement;
- retain the approved heading list only as prompt-template content, renamed if necessary so it is not represented as runtime validation authority.

A substantive Formal Work Card body may promote to Pending even when it contains additional H1/H2 examples, uses alternate prose organization, or omits an expected heading. The Operator and Architect determine whether that document meets the Work Card standard.

### 2. Remove Repair Work Card H1/H2 promotion gates

In the active Repair Work Card definition:

- keep substantive non-empty Markdown validation;
- keep caller-metadata delimiter rejection;
- keep the existing requirement that the body contain the exact application-authorized `returnTarget` value;
- remove all body-title and exact-section-heading validation;
- remove `validateOneH1Prefix()` and `validateExactH2s()` from the Repair Work Card production path;
- do not add a replacement heading validator.

Retain the approved Repair headings only as prompt-template guidance.

### 3. Preserve application-owned authority

Do not weaken or relocate:

- final target resolution;
- candidate, Work Card, Repair, parent, phase, origin, evidence, and return-target identity;
- source revisions and freshness;
- absent-target and `RevisionRequested` replacement eligibility;
- artifact revision behavior;
- application-owned canonical metadata;
- Pending disposition after promotion;
- atomic promotion and draft cleanup behavior;
- revision-note delivery;
- exact MCP temporary-draft invocation.

Markdown headings are not authority. Canonical metadata and current repository evidence remain authority.

### 4. Reuse the shared dual-pane layout

Remove the Work Card-specific renderer layout branch and CSS:

```text
workCardArchitectLayoutWorkspaceIds
work-card-architect-workspace
all dedicated work-card-architect-workspace media rules
```

Add `work-card-planning` and `work-card-repair` to the existing shared embedded-Architect dual-pane workspace selection used by Project Planning, Phase Map, Phase Interview, and related workspaces.

The resulting document/browser grid, height behavior, overflow behavior, and responsive stacking must come from the same shared class and CSS rules. Do not create another Work Card-specific selector, class, width ratio, media query, or duplicate style block.

The pre-handoff Work Card Planning substate remains the WC43 candidate preparation surface and must not display the embedded browser until the existing intake handoff has been created.

## Preserved Behavior

Preserve unchanged:

- the exact Formal Work Card Architect prompt installed by WC43-REPAIR01B;
- the current Formal and Repair prompt heading templates;
- the Work Card Intake handoff and unified Planning substate;
- single-output viewed-revision behavior from WC43-REPAIR01A;
- generic Architect-output preparation, polling, promotion, cleanup, review, and retry;
- all canonical metadata identities and workflow data;
- Formal Work Card approval eligibility for Work Card Building;
- Repair return-target semantics and parent ownership;
- all non-Work-Card workspace layouts;
- embedded browser security and attachment behavior;
- no Git operation.

## Authorized Surface

```text
src/main/workCardPlanning/workCardPlanningService.ts
src/main/workCardRepair/workCardRepairService.ts
src/renderer/app/App.tsx
src/shared/workspaces/projectRailPresentation.ts
src/renderer/styles.css
test/work-card-planning/work-card-planning-service.test.cjs
test/architect-outputs/architect-output-workspace-repair.test.cjs
test/renderer/project-rail-presentation.test.cjs
test/renderer/architect-output-workspace-source.test.cjs
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC43-REPAIR02_remove_work_card_heading_gates_and_reuse_shared_dual_pane.md
```

One directly related existing test file may be updated or one focused test file may be added when needed to exercise production promotion behavior. Any adjacent correction must be necessary, documented, preserve the architecture, and be fully tested.

## Risks and Constraints

Removing heading gates intentionally permits a poorly organized but substantive draft to reach Pending review. That is acceptable: Pending is a review state, not approval. The Operator and Architect retain responsibility for rejecting or revising a document that does not meet the Work Card standard.

Do not broaden this pass to Project Planning, Phase Map, Phase Interview, Phase Planning, or Work Card Plan validators. If another heading-based promotion defect occurs after this repair, the remaining H1/H2 validation system should be reviewed for complete removal in a separately authorized pass.

## Acceptance Criteria

1. A substantive Formal Work Card containing additional literal H1 and H2 examples inside fenced blocks promotes through the real Architect-output service to the exact Pending canonical target.
2. A substantive Formal Work Card without the former exact H1/H2 shape is not rejected for heading structure.
3. An empty Formal Work Card and a Formal Work Card containing application metadata delimiters are rejected before final mutation; the draft is retained and the absent or existing final target remains byte-identical.
4. A substantive Repair Work Card containing additional H1/H2 examples promotes when its exact authorized `returnTarget` value is present.
5. A substantive Repair Work Card is not rejected for title or section-heading structure.
6. An empty Repair Work Card, caller-metadata body, or body missing the exact authorized `returnTarget` is rejected without final mutation; existing final bytes remain unchanged.
7. Formal and Repair prompts still provide their approved section templates and exact temporary-draft invocation, but no production validator treats those headings as authority.
8. The current problematic Formal Work Card fixture, or a byte-equivalent heading structure, passes the repaired production validation path; a helper-only validator test is insufficient.
9. After successful promotion, the current workspace model exposes the Pending document and the renderer can select and display it for review.
10. `work-card-planning` and `work-card-repair` use the same shared dual-pane class and CSS rules as the established embedded Architect workspaces.
11. The Work Card-specific layout set, class, and dedicated media rules are absent.
12. The pre-handoff Planning substate remains browser-free and continues to create the same Approved non-review intake handoff.
13. Existing single-output review activation, bundle viewing, revision, retry, metadata, disposition, and downstream Work Card Building behavior remain passing.
14. Positive and negative proof exercises the real preparation, draft detection, slot validation, canonical promotion, no-mutation failure, workspace projection, and renderer-layout paths. Source-string assertions are supplemental only.
15. Typecheck, TypeScript build, Vite build, focused tests, and the complete Node test lane pass in the approved normal Windows environment.
16. No Git operation occurs.

## Negative Constraints

Do not:

- repair the current draft by changing its substantive content solely to satisfy heading validation;
- add a fence-aware, AST-based, warning-only, compatibility, or alternate heading gate;
- make Markdown headings canonical identity or workflow authority;
- remove substantive-body or metadata-delimiter validation;
- remove the Repair `returnTarget` agreement check;
- change prompts, schemas, metadata, paths, dispositions, review semantics, promotion timing, retry identity, IPC, preload, or MCP behavior;
- add automatic failed-draft reuse or automatic retry;
- add another layout helper, CSS class, ratio, or workspace-specific media query;
- change unrelated workspaces;
- perform Git operations.

## Implementer Report Requirements

Create:

```text
planning/phases/phase-08/Implementer_Reports/
IMPLEMENTER_REPORT_WC43-REPAIR02_remove_work_card_heading_gates_and_reuse_shared_dual_pane.md
```

Map every acceptance criterion to concrete proof. Report:

- every created and modified file;
- exact validator code removed and validation retained;
- production promotion cases exercised for Formal and Repair Work Cards;
- final path, metadata, disposition, and no-mutation evidence;
- layout code removed and shared layout reused;
- commands and results;
- any necessary adjacent change and why it was required;
- automated proof completed;
- Operator validation remaining;
- scope expansion and residual risk;
- confirmation that no alternate validator, authority, persistence, retry, prompt, or layout mechanism was introduced.

## Manual Validation

After Architect approval, the Operator must:

1. select `Prepare Handoff` to create a fresh Formal Work Card submission after the retained failed draft;
2. create the substantive draft containing any necessary embedded heading examples;
3. confirm promotion succeeds and the Pending Work Card appears in the document pane;
4. confirm the document and Embedded ChatGPT panes match the same shared dual-pane proportions used by the other Architect workspaces;
5. confirm the pre-handoff Planning candidate surface remains browser-free;
6. review and disposition the actual Work Card normally.
