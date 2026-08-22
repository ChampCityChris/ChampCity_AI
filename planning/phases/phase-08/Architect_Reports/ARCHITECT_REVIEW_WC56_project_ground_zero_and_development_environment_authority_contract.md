<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "architect-review",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC56"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC56_project_ground_zero_and_development_environment_authority_contract.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC56_project_ground_zero_and_development_environment_authority_contract.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "reviewKind": "work-card-architect-review",
    "workCardId": "WC56",
    "disposition": "approved_for_operator_validation",
    "gitMutationAuthorized": false
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "WC56 satisfies the systemic ground-zero and development-environment authority contract. Project Planning now treats host development-machine readiness as project state, Phase Planning decomposes missing managed capabilities as foundation work, Formal Work Cards carry a validated capability-only environment contract, and the Implementer prompt treats missing managed capability as remediable work while prohibiting unrelated software installation. WC57 remains responsible for the deterministic Windows provisioning backend.",
    "reviewedAt": "2026-08-21"
  }
}
CHAMPCITY-METADATA -->

# Architect Review — WC56 Project Ground-Zero and Development Environment Authority Contract

## Disposition

Approved for Operator validation.

No repair card is warranted from the implementation or current repository evidence.

## Scope Reviewed

Reviewed WC56 against:

- `planning/phases/phase-08/Work_Cards/WC56_project_ground_zero_and_development_environment_authority_contract.md`
- `planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC56_project_ground_zero_and_development_environment_authority_contract.md`
- `src/shared/developmentEnvironment/developmentEnvironmentContract.ts`
- `src/main/projectPlanning/projectPlanningService.ts`
- `src/main/projectPlanning/projectPlanningDraftBundle.ts`
- `src/main/phasePlanning/phasePlanningService.ts`
- `src/main/phasePlanning/phasePlanningDraftBundle.ts`
- `src/main/workCardPlanning/workCardPlanningService.ts`
- `src/main/workCardBuilding/codexImplementerExecutionService.ts`
- `test/work-card-planning/development-environment-contract.test.cjs`
- focused prompt/contract test evidence named by the Implementer Report

Repository status was verified through ChampCity MCP on branch `feature/phase-04-wc01-repair01-evidence-derived-workflow`. The worktree remains heavily dirty from existing Phase 08 work. No staging, commit, push, reset, clean, stash, rebase, or other Git mutation was performed during this review.

## Findings

### Project ground-zero semantics are corrected at the proper authority level

The Project Planning production prompt now explicitly defines project ground zero as the selected project repository plus the local development machine. It separately requires greenfield implementation state and development-machine readiness to be classified rather than treating an implementation-empty repository as evidence that the host is ready.

Project Profile guidance now asks the Architect to distinguish, where relevant and discoverable:

- installed development capabilities;
- missing development capabilities;
- unverified development capabilities;
- repository-native bootstrap/dependency mechanisms;
- existing project-local agent/build/validation instructions; and
- explicitly externally managed capabilities.

Project Roadmap guidance now requires missing capabilities needed by planned implementation to be sequenced as project work before dependent work. It also prevents speculative foundation bloat by requiring capabilities to derive from approved architecture and intended implementation.

This satisfies the central WC56 architectural decision: host development-environment state is project state, not an implicit Operator prerequisite.

### Phase Planning correctly decomposes machine and repository foundation

Both current Phase Planning prompt paths now state that foundation work includes host environment and repository readiness when applicable. Missing or unverified development capabilities must be established before dependent candidates.

The prompt distinguishes three concepts without conflating them:

```text
managed capability
→ ChampCity provisions and verifies

external capability
→ approved evidence establishes outside ownership; absence blocks

human-interaction boundary
→ ChampCity prepares the action, requests only the necessary human interaction, then resumes
```

The prompt specifically rejects `prerequisite problem` / `Operator must install` semantics merely because ordinary development tooling is absent.

### Formal Work Cards now carry bounded machine-capability authority

WC56 adds the optional `champcity-development-environment` fenced JSON contract and validates it in the normal Formal Work Card draft promotion path through `validateFormalWorkCardBody(...)` and `parseDevelopmentEnvironmentContractFromMarkdown(...)`.

The v1 schema is intentionally capability-only:

- `capabilityId` — required nonblank identifier;
- `versionConstraint` — optional string;
- `profile` — optional string;
- `provisioning` — `managed | external` only.

The parser rejects duplicate blocks, unsupported fields, malformed JSON, unknown provisioning values, and blank capability IDs. Environment-free Work Cards remain valid.

The Formal Work Card Architect prompt explicitly prohibits embedding installer commands, package IDs, download URLs, vendor bootstrap scripts, registry keys, executable paths, or absolute machine paths in the Architect-owned capability block. This preserves the intended separation:

```text
Architect
→ decides what capability is required

application-owned provisioner
→ decides how supported capability is detected/provisioned/verified
```

Necessary managed machine setup is explicitly treated as authorized implementation work rather than unrelated workspace modification.

### Implementer authority is bounded correctly

The current Codex Implementer prompt now says that a missing managed capability is not by itself a blocker, directs the Implementer to use the application-owned provisioner when available, and requires verification before continuing.

It also explicitly states:

- repository-native dependency installation/restoration is normal implementation work when required;
- package/dependency absence alone is not a reason to return setup to a nontechnical Operator;
- unrelated tools must not be installed merely because they might be useful;
- provisioning authority remains bounded by the Approved Work Card and project-local instructions; and
- UAC/authentication/license/purchase/hardware interactions are resumable human boundaries rather than technical setup transferred to the Operator.

This is the correct authority boundary. WC56 does not create an arbitrary software-install permission surface.

### WC57 boundary is preserved

No installer backend, package-download mechanism, WinGet integration, vendor-specific installation logic, or second provisioning subsystem was introduced by WC56. That work remains correctly isolated to WC57.

This sequencing matters because WC56 defines the semantic and structured authority that WC57 will consume.

## Automated Validation Evidence

Implementer-reported validation:

- `npm run typecheck`: passed.
- `npm run build`: passed in the normal Windows validation lane after the documented sandbox EPERM condition.
- focused WC56 suite: 47/47 passed after one prompt wording assertion was corrected.
- full `npm test`: 337/337 passed in the normal Windows lane.

Direct repository inspection confirmed the production parser is wired into Formal Work Card body validation and the current Project Planning, Phase Planning, Formal Work Card, and Codex prompt text contains the required WC56 semantics.

The Architect did not independently execute the npm validation commands during this review.

## Acceptance Criteria Assessment

1. **Pass** — Project Planning treats development-machine state as project baseline state.
2. **Pass** — Project Roadmap guidance schedules missing required capabilities before dependent work.
3. **Pass** — Phase Planning defines foundation as host environment plus repository foundation where applicable.
4. **Pass** — Missing ordinary tooling is not automatically externalized to the Operator.
5. **Pass** — Formal Work Cards support one optional v1 environment block.
6. **Pass** — parser rejects malformed/duplicate blocks and accepts environment-free cards.
7. **Pass** — only `managed` and `external` provisioning classifications are accepted.
8. **Pass** — installer mechanics are explicitly excluded from the Architect-owned block.
9. **Pass** — necessary managed machine setup is explicitly authorized implementation work.
10. **Pass** — Implementer prompt treats missing managed capability as remediable work.
11. **Pass** — Implementer provisioning remains bounded by approved capability/project instructions.
12. **Pass** — repository-native dependency bootstrap/restore is normal implementation work when required.
13. **Pass** — genuine human boundaries are resumable interaction points.
14. **Pass** — no provisioning backend was introduced; WC57 boundary remains intact.
15. **Pass** — Implementer reports current regression/lifecycle tests green.
16. **Pass** — Implementer reports typecheck/build/full test lanes green.

## Non-Blocking Concern

`validateDevelopmentEnvironmentContract(...)` verifies that `capabilityId` is nonblank but returns the original string rather than a trimmed/canonicalized identifier. A value such as `" cmake "` would therefore pass the nonblank check and remain distinct from `"cmake"` at runtime.

This is not a WC56 acceptance failure because WC56 does not define the capability registry or resolution backend. WC57 should normalize or reject noncanonical capability identifiers before registry lookup and should similarly define how optional version/profile strings are normalized.

## Required Operator Validation

Use the current product to generate representative planning/work-card prompts for:

1. a greenfield project with an unverified required toolchain;
2. an established project whose required development environment is already verified; and
3. a Formal Work Card that requires at least one unverified managed machine capability.

Confirm:

- greenfield planning schedules environment establishment rather than assuming host readiness;
- established-project planning does not create redundant setup work;
- the Formal Work Card contains one valid `champcity-development-environment` block;
- the card states capability requirements rather than installer mechanics; and
- the card does not tell the Operator to manually install ordinary development tooling.

WC57 should not be considered validated merely because WC56 passes. WC57 must independently prove the deterministic provisioning path and resumable human-interaction behavior.

## Final Disposition

WC56 is approved for Operator validation. No repair Work Card is recommended. No Git mutation was performed during review.
