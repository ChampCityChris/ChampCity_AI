# Implementer Handoff — Phase 07 WC03 Through WC07 Continuous Clean-Room Pass

Status: approved for immediate Implementer execution
Project: ChampCity A/I
Repository: `<PROJECT_REPO>`
Expected remote: `https://github.com/ChampCityChris/ChampCity_AI`
Expected current branch: `feature/phase-04-wc01-repair01-evidence-derived-workflow`
Git mutation: not authorized

## Operator Authorization

The Operator approved WC03, WC04, WC05, WC06, and WC07 for one continuous sequential Implementer pass.

Do not request another approval between Work Cards.

Do not require or create:

- a Work Card hash check;
- an approval artifact;
- an approval token;
- an Execution Run;
- an Independent Verifier packet;
- a validator-agent decision;
- a current-action gate;
- a separate Architect or Operator checkpoint between cards.

The named Work Cards and this handoff are the authorization for the continuous pass.

## Starting Rules

Before editing:

1. verify the approved repository root, remote, branch, and Git status;
2. read `AGENTS.md`, `docs/architecture/REPOSITORY_CODE_TEST_AND_MIGRATION_BOUNDARY.md`, and `docs/dev/VALIDATION_COMMAND_LANES.md`;
3. treat the current dirty Phase 07 planning files as protected baseline state;
4. do not clean, reset, restore, stash, stage, commit, push, merge, rebase, tag, or release;
5. do not modify files outside the repository;
6. do not print concrete local machine paths in reports.

For this run, the five approved Work Cards and this handoff supersede old repository instructions that require one-card-at-a-time approval, Execution Run authority, Independent Verifier progression, approval artifacts, or cryptographic Work Card verification. All ordinary security, path-containment, validation, and truthful-reporting rules remain in force.

## Exact Work Card Sequence

### 1. WC03

Read and implement:

```text
planning/phases/phase-07/Work_Cards/WC03_clean_room_application_source_reset.md
planning/phases/phase-07/Work_Cards/WC03_clean_room_application_source_reset.json
```

Create:

```text
planning/phases/phase-07/Implementer_Reports/IMPLEMENTER_REPORT_WC03_clean_room_application_source_reset.md
```

Do not read the rejected removal-in-place WC03 as current authority.

### 2. WC04

Only after WC03 acceptance criteria and validation pass and the WC03 report exists, read and implement:

```text
planning/phases/phase-07/Work_Cards/WC04_planning_document_discovery_and_disposition_io.md
planning/phases/phase-07/Work_Cards/WC04_planning_document_discovery_and_disposition_io.json
```

Create:

```text
planning/phases/phase-07/Implementer_Reports/IMPLEMENTER_REPORT_WC04_planning_document_discovery_and_disposition_io.md
```

### 3. WC05

Only after WC04 acceptance criteria and validation pass and the WC04 report exists, read and implement:

```text
planning/phases/phase-07/Work_Cards/WC05_workspace_integrated_document_disposition.md
planning/phases/phase-07/Work_Cards/WC05_workspace_integrated_document_disposition.json
```

Create:

```text
planning/phases/phase-07/Implementer_Reports/IMPLEMENTER_REPORT_WC05_workspace_integrated_document_disposition.md
```

### 4. WC06

Only after WC05 acceptance criteria and validation pass and the WC05 report exists, read and implement:

```text
planning/phases/phase-07/Work_Cards/WC06_first_non_approved_document_resolver.md
planning/phases/phase-07/Work_Cards/WC06_first_non_approved_document_resolver.json
```

Create:

```text
planning/phases/phase-07/Implementer_Reports/IMPLEMENTER_REPORT_WC06_first_non_approved_document_resolver.md
```

### 5. WC07

Only after WC06 acceptance criteria and validation pass and the WC06 report exists, read and implement:

```text
planning/phases/phase-07/Work_Cards/WC07_real_corpus_initialization_and_dogfood_validation.md
planning/phases/phase-07/Work_Cards/WC07_real_corpus_initialization_and_dogfood_validation.json
```

Create:

```text
planning/phases/phase-07/Implementer_Reports/IMPLEMENTER_REPORT_WC07_real_corpus_initialization_and_dogfood_validation.md
```

Stop after WC07. Do not perform phase closeout or Operator acceptance.

## Continuous Execution Rules

- Treat each Work Card as a bounded implementation checkpoint inside one continuous run.
- Do not combine acceptance criteria across cards.
- Do not implement later-card scope early.
- Run each card's required validation before writing its report.
- The report must describe only evidence actually produced.
- After a successful report, immediately pull the next Work Card from the repository and continue.
- Do not wait for a reply between successful cards.

## Mandatory Stop Conditions

Stop the continuous run and create the current card's Implementer Report as blocked when:

- required validation fails and cannot be corrected within that card;
- the card requires modification outside its authorized scope;
- a protected planning record would need to be deleted or rewritten beyond the card;
- the selected repository or remote is wrong;
- a required file is missing or contradictory;
- real-corpus preflight in WC07 cannot guarantee safe initialization;
- a Git operation would be required.

Do not continue to the next Work Card after a blocked or failed card.

## Report Boundary

Each of the five reports must independently include:

- repository, remote, branch, and starting status verification;
- files deleted, created, and modified by that card;
- implementation summary tied to that card's acceptance criteria;
- commands run, execution lane, exits, and test counts;
- checks skipped and exact reason;
- non-acceptance launch smoke observations when required;
- security, path-containment, and secret-safety notes;
- remaining Operator manual validation;
- confirmation that no Git operation occurred;
- confirmation that later-card scope was not implemented early.

The report is an evidence checkpoint. It is not an approval gate and does not require a response before continuing.

## Final Response

After WC07, provide one final summary containing:

- whether all five cards completed;
- the five Implementer Report paths;
- final validation results;
- exact real-corpus file and logical-document counts;
- the first resolved document and owning workspace;
- remaining Operator manual validation;
- final Git status and confirmation that no Git mutation occurred.

## Document Disposition

Document.Status=Approved
