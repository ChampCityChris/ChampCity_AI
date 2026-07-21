# Implementer Handoff — Phase 08 Continuous First-Pass Implementation

Status: approved for immediate continuous Implementer execution after this handoff is committed
Project: ChampCity A/I
Repository: `<PROJECT_REPO>`
Expected repository: `ChampCityChris/ChampCity_AI`
Expected branch: `feature/phase-04-wc01-repair01-evidence-derived-workflow`
Required Phase 08 planning-baseline ancestor: `08f714c276bee6d75496133e42aafa8dfd9b9b80`
Authorized execution start: the clean committed HEAD containing this handoff and Phase 08 revision 10 control documents
Execution mode: one continuous cumulative first pass
Git mutation: not authorized during Implementer execution

## Operator Authorization

The Operator authorizes the Implementer to execute the complete corrected Phase 08 sequence in one continuous first-pass implementation run:

```text
WC01 → WC01A → WC01B
→ WC02 → WC03 → WC04 → WC05
→ WC06 → WC07 → WC08
→ WC09 → WC10 → WC11 → WC12 → WC13
→ WC14 → WC15
```

Do not request another Operator release or Architect acceptance between cards.

The individual Work Cards were written before this release and may still contain pre-release statements such as `executionAuthorized=false`, `execution deferred`, or requirements for an explicit later release. This handoff is that explicit later Operator release and supersedes only those pre-release hold statements.

All card scope, dependency, security, artifact, validation, stop-condition, and reporting requirements remain binding.

This handoff supersedes:

`planning/phases/phase-08/IMPLEMENTER_HANDOFF_WC01_nested_lifecycle_extensible_workspace_registry_foundation.md`

## Deferred Governance Model

This is a first-pass implementation run, not card-by-card acceptance.

Until every card has received its first Implementer pass:

- do not wait for Architect review of an Implementer Report;
- do not wait for Operator manual validation;
- do not create Phase 08 Architect Review artifacts for the implementation reports;
- do not disposition an Implementer Report as Approved, Rejected, or RevisionRequested;
- do not create Phase 08 repair Work Cards in response to first-pass findings;
- do not mark a Phase 08 Work Card complete;
- do not perform Phase 08 closeout;
- do not release, package, tag, merge, or push.

Every Implementer Report created by this pass must end with:

```markdown
## Document Disposition

Document.Status=Pending
```

The reports are cumulative evidence checkpoints. They are not gates requiring a response before the next first-pass card begins.

## Starting Verification

Before editing:

1. verify the repository root is `<PROJECT_REPO>`;
2. verify the remote is `ChampCityChris/ChampCity_AI`;
3. verify the branch is `feature/phase-04-wc01-repair01-evidence-derived-workflow`;
4. verify commit `08f714c276bee6d75496133e42aafa8dfd9b9b80` is an ancestor of current `HEAD`;
5. record the actual current `HEAD` as the Implementer execution baseline;
6. verify the current `HEAD` contains this handoff;
7. verify `planning/phases/phase-08/Phase_Planning.md` is revision 10;
8. verify `planning/phases/phase-08/Work_Card_Plan.md` is revision 10;
9. verify the working tree is clean;
10. read `AGENTS.md`;
11. read `docs/architecture/REPOSITORY_CODE_TEST_AND_MIGRATION_BOUNDARY.md`;
12. read `docs/dev/VALIDATION_COMMAND_LANES.md`;
13. read `planning/phases/phase-08/Phase_Planning.md`;
14. read `planning/phases/phase-08/Work_Card_Plan.md`;
15. read `planning/phases/phase-08/Architect_Reviews/ARCHITECT_REVIEW_PHASE08_REVISED_SEQUENCE_RELEASE_READINESS.md`;
16. read all shared contracts listed below.

Abort before editing if the repository, remote, branch, required baseline ancestry, control-document revisions, handoff presence, or clean starting status does not match.

## Shared Contracts

Read and apply throughout the complete run:

```text
planning/project/Design_Documents/NESTED_PROJECT_PHASE_WORK_CARD_LIFECYCLE_MODEL.md
planning/project/Design_Documents/EVIDENCE_DERIVED_LIFECYCLE_PROJECTION_AND_WORKSPACE_RESOLUTION.md
planning/project/Design_Documents/ARTIFACT_SOURCE_REVISION_AND_DOWNSTREAM_INVALIDATION.md
planning/project/Design_Documents/PHASE_08_WORKSPACE_INVENTORY_AND_MIGRATION.md
planning/project/Design_Documents/GENERATED_ARCHITECT_HANDOFF_CONTRACT.md
planning/project/Design_Documents/WORK_CARD_CANDIDATE_CONTRACT.md
planning/project/Design_Documents/PROJECT_INTAKE_LIFECYCLE_AND_WORKSPACE_DEFINITION.md
planning/project/Design_Documents/ARCHITECT_INTERVIEW_WORKSPACE_DEFINITION.md
planning/project/Design_Documents/PROJECT_PLANNING_WORKSPACE_DEFINITION.md
planning/project/Design_Documents/PHASE_MAP_PHASE_INTAKE_AND_PHASE_PLANNING_WORKSPACE_DEFINITION.md
planning/project/Design_Documents/WORK_CARD_LIFECYCLE_REVIEW_REPAIR_AND_VALIDATION_WORKSPACE_DEFINITION.md
planning/project/Design_Documents/PHASE_AND_PROJECT_VALIDATION_CLOSE_WORKSPACE_DEFINITION.md
```

The corrected Phase 08 documents supersede conflicting normal-flow requirements in historical planning records.

Do not restore the rejected legacy governance architecture.

## Exact Card and Report Sequence

### 1. WC01

Read:

```text
planning/phases/phase-08/Work_Cards/WC01_nested_lifecycle_extensible_workspace_registry_foundation.md
planning/phases/phase-08/Work_Cards/WC01_nested_lifecycle_extensible_workspace_registry_foundation.json
```

Create:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC01_nested_lifecycle_extensible_workspace_registry_foundation.md
```

### 2. WC01A

Read:

```text
planning/phases/phase-08/Work_Cards/WC01A_evidence_derived_lifecycle_projection_and_workspace_resolution.md
planning/phases/phase-08/Work_Cards/WC01A_evidence_derived_lifecycle_projection_and_workspace_resolution.json
```

Create:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC01A_evidence_derived_lifecycle_projection_and_workspace_resolution.md
```

### 3. WC01B

Read:

```text
planning/phases/phase-08/Work_Cards/WC01B_artifact_source_revision_and_downstream_invalidation.md
planning/phases/phase-08/Work_Cards/WC01B_artifact_source_revision_and_downstream_invalidation.json
```

Create:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC01B_artifact_source_revision_and_downstream_invalidation.md
```

### 4. WC02

Read:

```text
planning/phases/phase-08/Work_Cards/WC02_project_intake_capture_and_architect_interview_prompt_generation.md
planning/phases/phase-08/Work_Cards/WC02_project_intake_capture_and_architect_interview_prompt_generation.json
```

Create:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC02_project_intake_capture_and_architect_interview_prompt_generation.md
```

### 5. WC03

Read:

```text
planning/phases/phase-08/Work_Cards/WC03_embedded_architect_browser_and_mcp_handoff_validation.md
planning/phases/phase-08/Work_Cards/WC03_embedded_architect_browser_and_mcp_handoff_validation.json
```

Create:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC03_embedded_architect_browser_and_mcp_handoff_validation.md
```

WC03 first-pass rule: implement the secure browser and handoff foundation and complete every automated validation that does not fabricate the external service. Operator-observed authentication, prompt attachment, and MCP write-back acceptance are deferred. Record them as pending manual validation rather than claiming success.

Continue to later cards unless WC03 establishes a concrete platform or security blocker that makes the shared embedded-browser component unsafe or technically impossible to use without prohibited substitution.

### 6. WC04

Read:

```text
planning/phases/phase-08/Work_Cards/WC04_architect_interview_workspace.md
planning/phases/phase-08/Work_Cards/WC04_architect_interview_workspace.json
```

Create:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC04_architect_interview_workspace.md
```

### 7. WC05

Read:

```text
planning/phases/phase-08/Work_Cards/WC05_project_planning_workspace.md
planning/phases/phase-08/Work_Cards/WC05_project_planning_workspace.json
```

Create:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC05_project_planning_workspace.md
```

### 8. WC06

Read:

```text
planning/phases/phase-08/Work_Cards/WC06_project_building_phase_map_workspace.md
planning/phases/phase-08/Work_Cards/WC06_project_building_phase_map_workspace.json
```

Create:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC06_project_building_phase_map_workspace.md
```

### 9. WC07

Read:

```text
planning/phases/phase-08/Work_Cards/WC07_phase_interview_workspace.md
planning/phases/phase-08/Work_Cards/WC07_phase_interview_workspace.json
```

Create:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC07_phase_interview_workspace.md
```

### 10. WC08

Read:

```text
planning/phases/phase-08/Work_Cards/WC08_phase_planning_bundle_workspace.md
planning/phases/phase-08/Work_Cards/WC08_phase_planning_bundle_workspace.json
```

Create:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC08_phase_planning_bundle_workspace.md
```

### 11. WC09

Read:

```text
planning/phases/phase-08/Work_Cards/WC09_phase_building_work_card_candidate_selection_and_intake_context.md
planning/phases/phase-08/Work_Cards/WC09_phase_building_work_card_candidate_selection_and_intake_context.json
```

Create:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC09_phase_building_work_card_candidate_selection_and_intake_context.md
```

### 12. WC10

Read:

```text
planning/phases/phase-08/Work_Cards/WC10_formal_work_card_planning_workspace.md
planning/phases/phase-08/Work_Cards/WC10_formal_work_card_planning_workspace.json
```

Create:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC10_formal_work_card_planning_workspace.md
```

### 13. WC11

Read:

```text
planning/phases/phase-08/Work_Cards/WC11_work_card_building_implementer_handoff_and_report_review_workspace.md
planning/phases/phase-08/Work_Cards/WC11_work_card_building_implementer_handoff_and_report_review_workspace.json
```

Create:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC11_work_card_building_implementer_handoff_and_report_review_workspace.md
```

### 14. WC12

Read:

```text
planning/phases/phase-08/Work_Cards/WC12_work_card_repair_subsystem.md
planning/phases/phase-08/Work_Cards/WC12_work_card_repair_subsystem.json
```

Create:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC12_work_card_repair_subsystem.md
```

WC12 first-pass rule: complete and validate the real pre-validation repair path. Unit-test the post-validation trigger contract. Do not claim the real post-validation loop is proven until WC13.

### 15. WC13

Read:

```text
planning/phases/phase-08/Work_Cards/WC13_work_card_validation_close_and_next_candidate_return.md
planning/phases/phase-08/Work_Cards/WC13_work_card_validation_close_and_next_candidate_return.json
```

Create:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC13_work_card_validation_close_and_next_candidate_return.md
```

WC13 owns automated integration coverage for the complete failed validation → repair → new validation attempt path. Operator performance of the final manual validation scenario remains deferred.

### 16. WC14

Read:

```text
planning/phases/phase-08/Work_Cards/WC14_phase_validation_and_close_workspace.md
planning/phases/phase-08/Work_Cards/WC14_phase_validation_and_close_workspace.json
```

Create:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC14_phase_validation_and_close_workspace.md
```

### 17. WC15

Read:

```text
planning/phases/phase-08/Work_Cards/WC15_project_validation_and_close_workspace.md
planning/phases/phase-08/Work_Cards/WC15_project_validation_and_close_workspace.json
```

Create:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC15_project_validation_and_close_workspace.md
```

Stop after the WC15 report and final cumulative summary. Do not conduct Architect review, Operator validation, Phase 08 closeout, release preparation, or Git operations.

## Continuous First-Pass Rules

- Treat each Work Card as a distinct implementation checkpoint inside one cumulative source tree.
- Read the current card's Markdown and JSON immediately before implementing it.
- Do not combine card acceptance criteria or report evidence.
- Do not implement later-card scope early merely for convenience.
- Use the source produced by earlier cards as the starting point for later cards.
- Run every automated validation required by the current card before writing its report.
- Attempt to correct failures within the current card's authorized scope.
- After writing the current Pending report, immediately continue to the next card without waiting for a reply.
- Operator-observed manual validation, external authentication, live MCP browser use, visual acceptance, and Architect report disposition are deferred.
- Do not describe deferred checks as passed.
- Do not use mocked external-service behavior as proof of real integration.
- Do not create hidden compatibility fallbacks to make a test pass.

When a later card exposes a defect in an earlier first-pass implementation, the Implementer may modify earlier-card files only when directly necessary to satisfy the current card's approved dependency. Record the cumulative correction in the current report and final summary. Do not create a repair Work Card during this first-pass run.

## Continue Versus Stop Rules

A failed card-level automated check does not automatically end the continuous first pass.

Continue when:

- the failure is accurately recorded;
- the repository remains safe and understandable;
- later cards can still be implemented without fabricating success;
- continued work does not require prohibited architecture or scope expansion.

Stop the entire run only for a hard blocker:

- repository, remote, branch, or required baseline-ancestry mismatch;
- the committed handoff or revision 10 control documents are absent;
- the initial working tree is not clean;
- a required Work Card or governing contract is missing or contradictory;
- a required Git mutation would be necessary;
- repository path containment or credential safety cannot be maintained;
- a card requires prohibited provider API, DOM automation, credential extraction, or security bypass;
- the cumulative source becomes non-buildable in a way that cannot be corrected within approved current or prerequisite scope;
- WC03 proves the embedded-browser/MCP architecture unsafe or technically impossible and later embedded workspaces cannot be truthfully implemented;
- continuing would require fabricating evidence or claiming unperformed validation.

When stopping, create the current card's Pending Implementer Report with the exact blocker and do not create reports for cards that received no implementation pass.

## Report Requirements

Each of the 17 reports must independently include:

- repository, remote, branch, actual execution-baseline commit, and starting status verification;
- confirmation that the required Phase 08 planning-baseline commit is an ancestor;
- the card's first-pass outcome: implemented, partially implemented, or blocked;
- exact files created, modified, and deleted by that card;
- implementation summary tied to that card's acceptance criteria;
- commands run, validation lane, exit results, and test counts;
- failed or deferred checks and exact reasons;
- security, repository-containment, and secret-safety notes;
- external or Operator-observed validation deferred to the later review cycle;
- known defects or follow-up questions for Architect review;
- confirmation that no Git operation occurred;
- confirmation that later-card scope was not intentionally implemented early;
- terminal `Document.Status=Pending`.

Do not copy a generic report body across cards. Each report must describe the evidence produced by that card's actual first pass.

## Validation Strategy

At each card, run the card's required Windows validation lane. Unless a card establishes a narrower explicit lane, use:

```text
npm run typecheck
npm run build
npm test
```

The continuous pass may accumulate tests and implementation. Record the full cumulative test count and current result in each report.

Do not use Playwright unless a Work Card expressly authorizes it. None currently do.

Do not convert an Operator manual validation step into an automated acceptance claim.

## Prohibited Actions

Do not:

- clean, reset, restore, stash, stage, commit, push, merge, rebase, tag, or release;
- modify files outside `<PROJECT_REPO>`;
- print concrete local machine paths in reports;
- create approval tokens, approval artifacts, execution runs, route tokens, role gates, hashes, or independent-verifier gates;
- restore rejected legacy workflow or governance subsystems;
- create separate Implementer Execution Packets;
- create separate Architect Review approval artifacts;
- self-approve Implementer Reports;
- conduct Phase 08 Operator acceptance on the Operator's behalf;
- silently skip a Work Card;
- claim all cards completed when later cards did not receive a first pass.

## Final Cumulative Response

After WC15, or after a hard stop, provide one final cumulative summary containing:

- actual execution-baseline commit;
- exact cards that received a first pass;
- first-pass outcome for each card;
- all created Implementer Report paths;
- cumulative source and test files changed;
- final typecheck, build, and test results with test counts;
- unresolved automated failures;
- deferred Architect-review items;
- deferred Operator manual-validation items;
- deferred WC03 external integration evidence;
- any earlier-card files revised during later-card work and why;
- final repository status;
- confirmation that no Git mutation occurred;
- a clear statement that Architect review and Operator validation remain pending for the complete report set.

## Document Disposition

Document.Status=Approved
