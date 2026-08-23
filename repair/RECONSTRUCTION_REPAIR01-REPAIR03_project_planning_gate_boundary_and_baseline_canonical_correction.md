# RECONSTRUCTION-REPAIR01-REPAIR03 — Project Planning Gate Boundary and Baseline Canonical Correction

## Repair Type

Temporary pre-dogfood reconstruction repair derived from failed Operator live validation of the RECONSTRUCTION-REPAIR01 repair chain.

This repair is intentionally narrow. It corrects one malformed retained context document and one Project Planning preflight boundary defect. It does not redesign Project Planning, repository review, or the Harness.

## Governing Standard

`planning/project/Design_Documents/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md`

The card follows the retained Repair Card rules: evidence-derived defect, bounded correction, preservation of passed behavior, focused regression proof, no unrelated redesign, and no Git mutation unless separately authorized.

## Parent Repair / Failed Validation

Parent repair chain:

- `repair/RECONSTRUCTION_REPAIR01_single_workflow_authority_and_context_document_projection.md`
- `repair/RECONSTRUCTION_REPAIR01-REPAIR01_delete_duplicate_project_planning_authority.md`
- `repair/RECONSTRUCTION_REPAIR01-REPAIR02_project_planning_blocker_banner_presentation.md`

Latest Implementer Report:

`repair/Implementer_Reports/IMPLEMENTER_REPORT_RECONSTRUCTION_REPAIR01-REPAIR02_project_planning_blocker_banner_presentation.md`

Operator live validation after REPAIR02 showed:

- Project Planning correctly uses the new authoritative blocker banner.
- Project Planning reports `Needs Attention`.
- Exact blocker reason: `Malformed canonical planning evidence must be resolved before Project Planning: planning/project/Design_Documents/CURRENT_APPLICATION_BASELINE.md.`
- The banner evidence also includes a long list of unrelated repository source/config paths.

REPAIR02 banner presentation itself passed live validation. Do not reopen or redesign it.

## Confirmed Defect 1 — Current Application Baseline Is Not Parseable Canonical Markdown

`planning/project/Design_Documents/CURRENT_APPLICATION_BASELINE.md` begins with one valid canonical metadata block, but its body later contains a literal documentation example using the reserved strings:

```text
<!-- CHAMPCITY-METADATA
...
CHAMPCITY-METADATA -->
```

`src/shared/documents/canonicalMarkdown.ts` intentionally rejects any second occurrence of the canonical metadata opening or closing delimiter anywhere in the file.

Therefore the baseline self-description causes the application to classify the baseline as `read-error`, and the planning integrity preflight correctly detects it as malformed planning evidence.

This is a document-content defect. Do not weaken the canonical parser.

## Confirmed Defect 2 — Project Planning Preflight Conflates Planning Gate Evidence With Repository Context

`src/main/projectPlanning/projectPlanningPreflight.ts` currently performs two different jobs in one result:

1. planning-integrity checks;
2. repository/source discovery for reconciliation context.

It then merges these into one blocker evidence collection:

```text
sourceEvidencePaths
+ legacyPlanningPaths
+ malformedPlanningPaths
+ targetCollisions
→ evidencePaths
```

The same preflight also makes repository/source discovery capable of producing `Needs Attention`, including the existing greenfield/source mismatch rule.

This violates the intended authority boundary.

## Required Authority Boundary

The architecture for this repair is explicit:

```text
PLANNING INTEGRITY GATE
scope: planning/ only
purpose: determine whether canonical planning prerequisites are structurally valid enough to proceed

REPOSITORY RECONCILIATION CONTEXT
scope: repository outside planning/
purpose: inform the Architect what existing implementation/configuration may require reconciliation

Repository context is not an approval gate.
```

Project Planning exists specifically to reconcile the approved planning intent with the repository that actually exists. Discovery of source/configuration outside `planning/` must not itself prevent Project Planning from starting.

## Repair Objective

After repair:

1. `CURRENT_APPLICATION_BASELINE.md` is readable canonical `contextOnly` Markdown again without changing its substantive architecture/current-state meaning.
2. Project Planning planning-integrity blockers are derived only from `planning/` evidence.
3. Repository source/config discovery may still set reconciliation context and `repositoryReviewRequired`, but it cannot independently produce `Needs Attention` or appear as evidence for an unrelated planning-integrity blocker.
4. The current cleaned ChampCity A/I corpus resolves Project Planning as `Ready` / `ready-for-handoff` with `canPrepareHandoff=true`.

## Authorized Scope

### 1. Correct the baseline body only

Authorized artifact:

`planning/project/Design_Documents/CURRENT_APPLICATION_BASELINE.md`

Replace the literal reserved delimiter example in the body with a representation that communicates the same format without containing the exact reserved opening or closing delimiter strings.

Examples of acceptable representation include abstract placeholders such as:

```text
[canonical metadata opening delimiter]
{ ...canonical JSON metadata... }
[canonical metadata closing delimiter]
```

Requirements:

- preserve the document's substantive current-state content;
- preserve its role as `contextOnly` reference material;
- do not weaken `parseCanonicalMarkdownDocument()`;
- do not allow duplicate metadata blocks in canonical documents;
- do not modify `FUTURE_APPLICATION_DESIGN.md` or the Work Card standard unless a directly related parse defect is independently proven.

This is a defect correction to an already-approved context artifact. Do not turn this into a broader document rewrite.

### 2. Separate planning-gate evidence from repository context

Primary production surface:

`src/main/projectPlanning/projectPlanningPreflight.ts`

Related surfaces only as required by existing type/contracts/tests:

- `src/main/projectPlanning/projectPlanningContext.ts`
- `src/main/projectPlanning/projectPlanningService.ts`
- relevant Project Planning tests.

Required behavior:

- planning-integrity blocking evidence must come only from `planning/` artifacts/targets;
- `malformedPlanningPaths`, planning target collisions, duplicate/current canonical planning conflicts, and other existing planning-folder integrity defects may continue to block as already designed;
- `sourceEvidencePaths` must remain separate repository-reconciliation context and must not be merged into blocker `evidencePaths` merely because source exists;
- source/config discovery outside `planning/` must not by itself return `needs-attention`;
- an Intake/source mismatch such as `hasExistingSourceOrPlanning=false` plus substantive source must no longer be a blocking gate;
- that mismatch should instead force or preserve `reconciliation-required` / `repositoryReviewRequired=true` so the Architect reconciles the repository during Project Planning;
- no source/config file outside `planning/` may appear in the Project Planning blocker banner unless a future separately authorized blocker explicitly governs that non-planning resource.

### 3. Preserve repository context acquisition without expanding it

This repair does **not** authorize a new comprehensive repository-analysis engine.

`collectSourceEvidencePaths()` may remain as bounded repository context discovery for the existing Project Planning handoff. Do not broaden it into another gate, crawler, validator, approval layer, or hidden state store in this repair.

A later Harness/context feature may improve repository inspection depth. That is out of scope here.

## Required Acceptance Criteria

### AC1 — Baseline parses successfully

The actual current file:

`planning/project/Design_Documents/CURRENT_APPLICATION_BASELINE.md`

must be readable through the production canonical planning-document path with:

```text
documentReadState = readable
participationRole = contextOnly
effectiveDisposition = Approved
```

No duplicate-metadata or extra-closing-delimiter read error remains.

### AC2 — Canonical parser integrity is preserved

Existing parser tests proving duplicate metadata opening/closing delimiters are rejected must continue to pass.

Do not change the parser to make the baseline pass.

### AC3 — Planning blocker evidence is planning-only

Create a focused fixture containing:

- valid Approved Intake/Prompt/Interview;
- one malformed canonical file under `planning/`;
- substantive source/config files outside `planning/`.

Project Planning must report `Needs Attention` because of the malformed planning file.

Its blocker `reason` and `evidencePaths` must identify the malformed planning evidence and must not include unrelated `src/`, `test/`, package/config, README, AGENTS, or other non-planning paths.

### AC4 — Repository source cannot independently block Project Planning

Create or update the existing greenfield/source mismatch fixture:

```text
Project Intake declares no existing source/planning
+ substantive source exists outside planning/
```

Expected result after repair:

```text
state = ready-for-handoff
railStatus = Ready
canPrepareHandoff = true
reconciliationMode = reconciliation-required
repositoryReviewRequired = true
```

Source discovery may appear in `sourceEvidencePaths` / repository review context, but it must not produce `Needs Attention`.

### AC5 — Existing-source reconstruction remains reconciliation-required

For the current intended reconstruction shape with existing source and Approved Intake/Interview:

```text
reconciliationMode = reconciliation-required
repositoryReviewRequired = true
state = ready-for-handoff
canPrepareHandoff = true
```

### AC6 — Real planning integrity defects still block

Preserve existing blocking behavior for actual `planning/` integrity failures, including as applicable:

- malformed canonical planning evidence;
- exact Project Profile/Roadmap target collisions;
- duplicate active canonical prerequisite artifacts;
- stale required lifecycle planning sources;
- partial/mismatched Project Profile + Roadmap review bundles.

Do not weaken these protections merely to make Project Planning proceed.

### AC7 — Blocker banner remains a transparent presentation

Do not modify the REPAIR02 banner authority or placement.

When a genuine planning-integrity blocker exists, the banner continues to show the authoritative reason and planning-only evidence.

When no planning-integrity blocker exists, the banner does not render and `Prepare Project Planning Handoff` remains controlled by the authoritative Project Planning model.

### AC8 — No new gate or approval layer

Do not introduce:

- repository approval status;
- repository validation disposition;
- source-review completion gate;
- new persistent reconciliation state;
- second Project Planning authority;
- filename-specific ChampCity A/I bypass logic.

Repository review is Architect context, not another Operator approval gate.

## Preserved Passed Behavior

Preserve all passed RECONSTRUCTION-REPAIR01 behavior:

- semantic document workspace projection;
- `contextOnly`, `historical`, `nonReviewHandoff`, and noncanonical documents are not lifecycle review targets;
- single Project Planning authority through `getProjectPlanningWorkspaceModel()`;
- Project Planning rail consumes that authoritative model before and after workspace navigation;
- exact blocker banner remains directly below the Project Planning workspace header;
- Profile + Roadmap atomic draft/promotion/review workflow remains unchanged;
- canonical source-revision/freshness checks for actual lifecycle artifacts remain intact;
- Agent Harness/MCP/OAuth behavior remains untouched.

## Forbidden Changes

Do not:

- weaken or remove duplicate metadata delimiter protection in the canonical parser;
- rewrite the baseline beyond the exact self-description defect;
- make `CURRENT_APPLICATION_BASELINE.md` a gating lifecycle artifact;
- delete repository reconciliation context merely to make the gate pass;
- expand source discovery into a new comprehensive repository scanner in this repair;
- add an approval/disposition for repository source;
- reintroduce renderer/shared Project Planning state calculation;
- modify the approved Intake or Architect Interview;
- create Project Profile/Roadmap placeholders;
- restore historical Phase 01–08 planning;
- redesign Project Planning UI;
- modify Harness/OAuth/MCP behavior;
- perform Git stage/commit/push/branch mutation unless separately authorized by the Operator.

## Required Files / Areas to Inspect

At minimum inspect:

- `planning/project/Design_Documents/CURRENT_APPLICATION_BASELINE.md`
- `src/shared/documents/canonicalMarkdown.ts`
- `src/main/documents/planningDocumentService.ts`
- `src/main/projectPlanning/projectPlanningPreflight.ts`
- `src/main/projectPlanning/projectPlanningContext.ts`
- `src/main/projectPlanning/projectPlanningService.ts`
- `test/documents/canonical-markdown-document.test.cjs`
- `test/project-planning/project-planning-service.test.cjs`
- `test/reconstruction/reconstruction-repair01.test.cjs`
- REPAIR02 blocker-banner test only for preservation if touched indirectly.

## Focused Validation

Do not run the entire historical suite by default.

Required validation:

```text
npm run typecheck
npm run build
node --test --test-concurrency=1 test/documents/canonical-markdown-document.test.cjs test/documents/planning-document-service.test.cjs test/project-planning/project-planning-service.test.cjs test/reconstruction/reconstruction-repair01.test.cjs test/renderer/project-planning-blocker-banner.test.cjs
```

Add the minimum focused regression coverage needed to prove AC1, AC3, and AC4.

Report exact command results and any environment-specific rerun lane.

## Required Implementer Report

Write:

`repair/Implementer_Reports/IMPLEMENTER_REPORT_RECONSTRUCTION_REPAIR01-REPAIR03_project_planning_gate_boundary_and_baseline_canonical_correction.md`

The report must include:

- repository/branch/status verification;
- exact live validation failure being repaired;
- baseline duplicate-delimiter root cause;
- exact preflight code path that mixed source context into planning blocker evidence;
- files changed;
- exact baseline body correction;
- before/after preflight semantics for source discovery;
- proof that repository source cannot independently block Project Planning;
- proof that true planning defects still block;
- focused commands/results;
- deviations/blockers;
- remaining Operator live validation;
- confirmation of no Git mutation unless separately authorized.

## Required Operator Live Validation

After Architect review passes:

1. Launch ChampCity A/I against the current cleaned reconstruction corpus.
2. Verify Project Intake and Architect Interview remain Completed.
3. Verify `CURRENT_APPLICATION_BASELINE.md` no longer produces malformed canonical planning evidence.
4. Verify Project Planning shows `Ready` before entering the workspace.
5. Enter Project Planning and verify it remains `Ready`.
6. Verify no blocker banner is shown for repository source/config existence alone.
7. Verify `Prepare Project Planning Handoff` is enabled.
8. Prepare the Project Planning handoff and continue the normal reconstruction workflow.

A separate synthetic blocker demonstration is not required for Operator validation if the focused tests prove planning-only blocker evidence and preserve the already-validated REPAIR02 banner behavior.

## Return Path

After implementation, return this repair for Architect code review and then Operator live validation.

If it passes, the Operator may archive/remove the temporary repair artifacts and continue Project Planning inside ChampCity A/I.
