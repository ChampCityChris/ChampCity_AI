<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-06/work_card/WC02-REPAIR02",
  "artifactType": "work_card",
  "createdAt": "2026-07-17T20:00:00.000Z",
  "jsonPath": "planning/phases/phase-06/Work_Cards/WC02-REPAIR02_phase_approval_recognition_project_display_name_repair.json",
  "markdownPath": "planning/phases/phase-06/Work_Cards/WC02-REPAIR02_phase_approval_recognition_project_display_name_repair.md",
  "parentArtifactId": "champcity-ai/phase-06/work_card/WC02",
  "payload": {
    "kind": "work_card",
    "title": "Work Card: Phase 06 WC02-REPAIR02 — Bounded Protocol Migration Correction and Repository Folder Name Repair"
  },
  "payloadHash": "sha256:afc632964bc7cae78c0857cf6c69c2860df907f0d2677c8caa2442846cac469f",
  "phaseId": "phase-06",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [
      "champcity-ai/phase-06/implementer_report/WC02-REPAIR02"
    ],
    "sources": [
      "champcity-ai/phase-06/architect_review/WC02-REPAIR01",
      "champcity-ai/phase-06/design_document/WC01-kernel-contract-artifact-protocol-source_authority_replacement_inventory",
      "champcity-ai/phase-06/implementer_report/WC02-REPAIR01",
      "champcity-ai/phase-06/operator_approval/Operator_Phase_Approval",
      "champcity-ai/phase-06/operator_approval/WC02-REPAIR02",
      "champcity-ai/phase-06/operator_validation/WC02-REPAIR01"
    ],
    "supersedes": []
  },
  "revision": 5,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-18T01:00:00.000Z",
  "workCardId": "WC02-REPAIR02"
}
-->

# Work Card: Phase 06 WC02-REPAIR02 — Bounded Protocol Migration Correction and Repository Folder Name Repair

Status: approved_for_implementer_execution
Phase: phase-06 — Workflow Kernel and Artifact Protocol Replacement
Work Card: WC02-REPAIR02
Parent Work Card: WC02
Owner: Implementer
Risk: critical
Instruction mode: exact execution; no discretionary scope expansion

## Controlling Direction

This revision governs the remaining WC02-REPAIR02 correction pass.

Execute only the work explicitly listed below. Do not infer adjacent requirements, redesign workflow behavior, or improve unrelated code. A technically possible alternative is not authorized merely because the Implementer considers it cleaner, safer, or more flexible.

If an exact instruction cannot be completed, stop before making substitute changes and report the specific contradiction. Do not narrow, broaden, reinterpret, defer, or replace the approved work.

## Historical Clarification

WC02-REPAIR01 passed the acceptance criteria of WC02-REPAIR01. Operator testing confirmed that the stale Phase 04 route, stale Phase 04 Work Card authoring, and Ad Hoc Work Card continuation were repaired.

The same Operator session produced additional observations:

- Phase 06 Operator Phase Approval was not recognized.
- The active project name displayed incorrectly.

Those observations prompted WC02-REPAIR02 and kept parent WC02 unresolved. They did not convert WC02-REPAIR01 into a failed repair.

The WC02-REPAIR01 validation artifact must remain Operator Validation evidence. It is not Operator Approval evidence.

## Remaining Objective

Complete only these two bounded outcomes:

1. Correct defects introduced by the WC02-REPAIR02 artifact-protocol migration and restore trustworthy migration evidence.
2. Make every configured project display name equal to the final folder name of its repository root.

No broader resolver work is authorized by this revision.

## Authorized Change Set

### A. Migration correction

1. Restore complete, meaningful synchronized content for these three governing artifact pairs:

   - `planning/phases/phase-06/Candidate_Dispositions/CANDIDATE_DISPOSITION_WC01_accept_repaired_wc01_kernel_contract_inventory.{json,md}`
   - `planning/phases/phase-06/Validation_Reports/VALIDATION_REPORT_WC01-REPAIR01_visual_validation_repaired_wc01.{json,md}`
   - `planning/phases/phase-06/Work_Cards/WC02_replace_evidence_derived_workflow_projector_relationship_driven_resolver.{json,md}`

2. Use commit `f71c98b7b3f033656a1266f04a5dd9b9802fb2b2` as the immutable pre-migration source for their human-readable bodies. Preserve their historical meaning. Apply only canonical envelope, artifact-type, ID, relationship, and current-status corrections already required by the approved target protocol.

3. Correct the WC02-REPAIR01 Operator Validation pair in place:

   - artifact family remains `operator_validation`;
   - validation outcome records that WC02-REPAIR01 passed its own acceptance criteria;
   - the phase-approval and project-name findings are recorded as additional Operator observations;
   - the record identifies WC02-REPAIR02 as the follow-up repair for parent WC02;
   - the record must not say WC02-REPAIR01 failed, partially failed, or supplied approval authority.

4. Rebuild the Implementer Report migration inventory from immutable Git evidence:

   - “before” values come from `f71c98b7b3f033656a1266f04a5dd9b9802fb2b2`;
   - implementation changes are compared against `999104d7151bf6b7733ea6788836f7b7b751f654` and `ca4e9a072a4f3e3c121831f0a861ea659f89b62f`;
   - each row must contain path, true pre-migration artifact ID, true pre-migration artifact type, gate role, resulting artifact ID, resulting artifact type, classification, exact action, and reason;
   - the WC02-REPAIR01 validation row must be classified as Operator Validation evidence, not approval evidence.

5. Repair human-readable prose changed by blind terminology replacement:

   - compare each migration-modified `payload.contentMarkdown` body with its pre-migration body at `f71c98b7b3f033656a1266f04a5dd9b9802fb2b2`;
   - restore historical quotations, old-versus-target comparisons, findings, and approved instructions where their meaning was changed;
   - do not run global or recursive terminology replacement over `payload.contentMarkdown`;
   - do not alter historical facts merely to remove old terminology from prose;
   - machine-governing IDs, types, statuses, and relationships remain on the approved target protocol.

6. Add a repository gate that fails when a required canonical artifact has:

   - missing `payload.contentMarkdown`;
   - an empty or whitespace-only body;
   - the literal body `undefined` or `null`;
   - a Markdown representation whose human-readable body is empty, `undefined`, or `null`.

7. Update the existing WC02-REPAIR02 Implementer Report pair in place. Do not create a second report, suffix copy, compatibility report, or replacement artifact.

### B. Repository folder display name

The project display-name rule is exactly:

```ts
const displayName = path.basename(repositoryRoot);
```

Required changes:

1. In `src/main/projects/projectWorkspaceRegistry.ts`, derive `displayName` only from the final folder name of the resolved repository root.
2. Delete every code path used only to derive a project display name from:

   - `PROJECT_PROFILE`;
   - Markdown headings;
   - project metadata fields;
   - `package.json.productName`;
   - `package.json.description`;
   - `package.json.name`;
   - request-supplied display names;
   - any other metadata or fallback source.

3. Do not add a precedence chain. Do not add a fallback. Do not add a configurable alternate name.
4. Do not change project ID derivation except where code must be separated from deleted display-name logic.
5. During `ProjectWorkspaceRegistry.initialize`, before returning the registry, rewrite every persisted configured project's `displayName` to `path.basename(project.repositoryRoot)` and persist the registry atomically when any name changed.
6. New project registration must persist the same repository-folder basename.
7. Required regression cases:

   - repository root ending in `ChampCity_AI` displays exactly `ChampCity_AI`;
   - repository root ending in `ChampCity_GPT` displays exactly `ChampCity_GPT`;
   - package description, package name, product name, profile title, profile body, and request display name cannot change the displayed name;
   - an already-persisted long package-description name is corrected on initialization.

## Authorized Files

Production source changes are limited to:

- `src/main/projects/projectWorkspaceRegistry.ts`

Test and validation changes are limited to:

- existing project-workspace registry tests;
- the repository gate that validates canonical human-readable bodies and the focused migration-preservation checks;
- the existing migration utility only when required to prevent recurrence of body/prose corruption.

Planning changes are limited to:

- the artifact pairs explicitly named in this Work Card;
- migration-modified governing pairs that require semantic restoration from the immutable baseline;
- the existing WC02-REPAIR02 Implementer Report pair;
- registry/index artifacts that must be synchronized because an authorized canonical pair changed.

## Explicitly Prohibited Changes

Do not modify:

- `src/main/workflow/relationshipDrivenWorkflowResolver.ts`
- `src/shared/workflow/processContract.ts`
- `src/shared/workflow/transitionEngine.ts`
- `src/shared/workCards/currentActionRouteTable.ts`
- `src/main/workflow/processIpcPolicy.ts`
- validation routing semantics
- observation-disposition semantics
- candidate-resolution semantics
- repair-lineage semantics
- project onboarding behavior
- current-action selection behavior
- phase lifecycle selection behavior
- renderer navigation or layout

Do not:

- create WC02-REPAIR03;
- create any new Work Card;
- create compatibility aliases, shadows, duplicate artifacts, or fallback readers;
- mark a controlling artifact historical to make a test pass;
- use first-match, newest-file, title, filename, suffix, timestamp, or directory-order inference;
- change a requirement because a tool command is rejected;
- substitute a narrower or broader implementation;
- perform unrelated cleanup or refactoring;
- push any commit.

## Stop Conditions

Stop and report before further edits if:

- the immutable baseline lacks the source body needed to restore a named artifact;
- two baseline artifacts claim the same controlling identity;
- an exact authorized change would require modification of a prohibited workflow module;
- the repository root folder basename cannot be obtained from `repositoryRoot`;
- validation reveals a separate resolver or product-design defect.

A stop condition does not authorize an alternative implementation.

## Required Validation

Use the documented normal Windows validation lane.

Run:

- `npm run typecheck`
- `npm run build`
- `npm run test:unit`
- `npm run test:repository`
- `npm run test:renderer:built`
- `npm test`

Also verify:

- all three named restored pairs have meaningful synchronized bodies;
- the WC02-REPAIR01 validation records a pass with additional observations;
- the migration inventory uses true pre-migration evidence;
- no package/profile/request metadata can affect project display names;
- persisted bad names are corrected to repository-folder basenames;
- no prohibited workflow file changed.

## Required Implementer Report Update

Revise only:

`planning/phases/phase-06/Implementer_Reports/IMPLEMENTER_REPORT_WC02-REPAIR02_full_gating_artifact_protocol_migration_project_display_name_repair.{json,md}`

The revised report must include:

- reviewed baseline and implementation commits;
- exact files changed;
- restored artifact bodies;
- corrected WC02-REPAIR01 validation semantics;
- corrected migration inventory;
- project display-name code removed;
- persisted-name normalization behavior;
- tests added or changed;
- all command results;
- any stop condition encountered;
- final Git status;
- implementation commit hash after commit creation.

Do not describe unperformed work as complete. Do not request Operator validation. Architect review remains required.

## Acceptance Criteria

- The three named governing pairs contain meaningful synchronized human-readable bodies.
- Historical and approved prose retains its original meaning.
- The migration inventory is a truthful pre/post audit based on immutable Git evidence.
- WC02-REPAIR01 is recorded as passed with additional observations and remains `operator_validation`.
- Required canonical bodies cannot be missing, empty, `undefined`, or `null` without failing repository validation.
- Every configured project displays exactly the basename of its repository root.
- `ChampCity_AI` displays as `ChampCity_AI`.
- `ChampCity_GPT` displays as `ChampCity_GPT`.
- No metadata, request value, precedence rule, or fallback can alter a project display name.
- Persisted incorrect names are corrected during registry initialization.
- No prohibited workflow-authority file or behavior is changed.
- The existing Implementer Report pair is revised in place.
- The repository is clean after the report-only finalization commit.

## Document Disposition
Document.Status=Pending
