<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC46-REPAIR15",
    "repairId": "WC46-REPAIR15",
    "parentWorkCardId": "WC46"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC46-REPAIR13_project_intake_repository_persistence.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC46-REPAIR13_project_intake_repository_persistence.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Repository Authority Propagation Across Canonical Documents",
    "status": "approved_for_implementation",
    "executionMode": "one systemic prospective repository-authority propagation repair after WC46-REPAIR13 validation",
    "parentWorkCardId": "WC46",
    "confirmedDefect": "WC46-REPAIR13 persists projectRepository in new Project Intake and the Project Architect Interview Prompt, but downstream canonical documents and generated handoffs do not consistently inherit repository authority. New project flows can therefore lose the project repository and explicit MCP workspace binding before later Architect prompts are generated.",
    "rootCause": "Repository authority is not modeled as a shared canonical packet. Individual document writers construct workflowData locally, so Project Intake repository authority is not propagated through Project Interview, Project Planning, Phase, Work Card, Validation, Repair, and Close documents.",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR15_repository_authority_propagation.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Add prospective repository-authority propagation across canonical workflow documents. Do not migrate legacy documents and do not reintroduce inferred MCP workspace fallbacks.",
    "reviewedAt": "2026-08-06"
  }
}
CHAMPCITY-METADATA -->

# WC46-REPAIR15 — Repository Authority Propagation Across Canonical Documents

Status: Approved for Implementer execution  
Parent: `WC46`  
Git mutation: prohibited

## Confirmed Defect

New Project Intake now persists `projectRepository`, but repository authority still drops out of the downstream document chain.

Confirmed source facts:

- `projectRepository` is currently produced only by `src/main/projectIntake/projectIntakeService.ts`.
- `Project Intake` body and workflowData now carry the normalized repository value after WC46-REPAIR13.
- `Project Architect Interview Prompt` workflowData receives the same value through the existing `intakeContent` spread.
- Repository search found no production propagation of `projectRepository` into later Project Planning, Phase, Work Card, Validation, Repair, Phase Closeout, or Project Closeout document metadata.
- WC46-REPAIR12 correctly removed inferred MCP workspace fallbacks. Missing explicit MCP workspace binding must still block MCP prompt generation; it must not be repaired by inference.

## Objective

Create prospective repository-authority propagation for the canonical workflow chain.

Repository authority means one shared packet with two separate meanings:

```text
projectRepository
→ normalized project repository root captured at Project Intake
→ project identity / write-root evidence

mcpWorkspaceBinding
→ explicit MCP tool workspace binding only
→ mcpWorkspaceId, label, repositoryName, branch, gitBacked
→ never inferred from projectRepository, Git, folder name, remote, diagnostics, or artifact search
```

Every new canonical document after Project Intake must either inherit this packet into `metadata.workflowData.repositoryAuthority` or explicitly preserve equivalent top-level fields if an existing contract requires them. Prefer one shared `repositoryAuthority` object for new propagation.

## Runtime Sequence

```text
New Project Intake submitted
→ projectRepository is normalized and persisted
→ explicit MCP binding is read from project/app binding when present
→ repositoryAuthority is written to Project Intake metadata
→ Project Architect Interview Prompt inherits repositoryAuthority
→ Project Architect Interview inherits repositoryAuthority
→ Project Planning handoff/Profile/Roadmap inherit repositoryAuthority
→ Phase Map, Phase Interview, Phase Planning, Work Card Plan inherit repositoryAuthority
→ Work Card Intake, Formal Work Card, Implementer Report, Validation Record, Repair Handoff, Repair Work Card inherit repositoryAuthority
→ Phase Closeout and Project Closeout inherit repositoryAuthority
→ MCP prompts use explicit mcpWorkspaceBinding when present and fail closed when absent
```

## Required Changes

### 1. Add a shared repository-authority helper

Create a narrowly named main/shared helper to read, validate, and merge repository authority.

Approved locations include:

```text
src/main/documents/repositoryAuthority.ts
src/main/projectIntake/repositoryAuthority.ts
src/shared/documents/repositoryAuthority.ts
```

The helper must support:

```text
buildRepositoryAuthorityFromProjectIntake(...)
inheritRepositoryAuthorityFromSources(...)
mergeRepositoryAuthorityIntoWorkflowData(...)
requireRepositoryAuthorityForPrompt(...)
```

Equivalent names are acceptable if behavior is clear and tested.

### 2. Seed repositoryAuthority at Project Intake

For new Project Intake submissions, write repository authority into metadata workflowData.

Required minimum shape:

```json
{
  "repositoryAuthority": {
    "projectRepository": "<normalized project root>",
    "mcpWorkspaceBinding": {
      "mcpWorkspaceId": "<explicit id>",
      "label": "<optional>",
      "repositoryName": "<optional>",
      "branch": "<optional>",
      "gitBacked": true
    }
  }
}
```

`mcpWorkspaceBinding` may be absent when no explicit binding exists. Its absence must not trigger fallback inference.

Preserve the top-level `workflowData.projectRepository` added by WC46-REPAIR13 for compatibility.

### 3. Propagate repositoryAuthority prospectively across document writers

Every new canonical document below must inherit repository authority from its authoritative source documents and write it to metadata workflowData:

```text
project-architect-interview-prompt
project-architect-interview
project-planning generated-handoff
project-profile
project-roadmap
phase-map generated-handoff
phase-map
phase-interview generated-handoff
phase-interview
phase-planning generated-handoff
phase-planning
work-card-plan
work-card-intake-handoff
formal-work-card
implementer-report
validation-record
repair generated-handoff
repair-work-card
phase-closeout
project-closeout
```

Generated MCP prompts must continue to use the explicit `mcpWorkspaceBinding`. If a prompt requires MCP and repositoryAuthority lacks explicit `mcpWorkspaceBinding`, prompt generation must fail closed before emitting the prompt.

### 4. Do not migrate legacy documents

Do not rewrite existing legacy Project Intake, Project Profile, Phase, Work Card, report, validation, repair, or closeout documents solely to add repository authority.

Prospective generation only. Existing documents without repository authority may continue to be readable, but new downstream prompt generation that requires MCP must fail closed if no explicit binding can be found from current authority.

### 5. Keep Project Repository separate from MCP workspaceId

Do not use `projectRepository` to synthesize or repair `mcpWorkspaceId`.

Repository path/root is not tool-routing identity. Explicit MCP binding remains the only MCP workspace source.

## Preserved Behavior

Preserve unchanged:

- WC46-REPAIR12 no-fallback MCP workspace binding behavior;
- WC46-REPAIR13 Project Intake body and top-level `workflowData.projectRepository` behavior;
- existing document paths, artifact types, revision behavior, sourceRevisions, dispositions, and promotion semantics;
- Project Intake conflict detection and no-migration policy;
- generated prompt body structure except repository-authority preflight data needed by existing MCP binding behavior;
- Work Card loop authority, repair routing, validation authority, close/next routing, and Codex behavior;
- no Git mutation.

## Authorized Surface

Production files authorized:

```text
src/main/projectIntake/projectIntakeService.ts
src/main/architectInterview/architectInterviewDraftPilot.ts
src/main/architectInterview/architectInterviewService.ts
src/main/projectPlanning/projectPlanningContext.ts
src/main/projectPlanning/projectPlanningService.ts
src/main/projectPlanning/projectPlanningDraftBundle.ts
src/main/phaseMap/phaseMapService.ts
src/main/phaseMap/phaseMapDraftOutput.ts
src/main/phaseInterview/phaseInterviewService.ts
src/main/phaseInterview/phaseInterviewDraftOutput.ts
src/main/phasePlanning/phasePlanningService.ts
src/main/phasePlanning/phasePlanningDraftBundle.ts
src/main/workCardIntake/workCardIntakeService.ts
src/main/workCardPlanning/workCardPlanningService.ts
src/main/workCardBuilding/workCardBuildingReviewService.ts
src/main/workCardValidation/workCardValidationService.ts
src/main/workCardRepair/workCardRepairService.ts
src/main/phaseClose/phaseCloseService.ts
src/main/projectClose/projectCloseService.ts
src/main/integrations/mcpWorkspacePromptContract.ts
src/main/integrations/architectMcpHandoffService.ts
src/shared/workspaceContracts.ts
```

One new shared helper file is authorized under `src/main` or `src/shared`.

Tests authorized:

```text
test/project-intake/project-intake-service.test.cjs
test/architect-interview/architect-interview-workspace.test.cjs
test/project-planning/project-planning-service.test.cjs
test/phase-interview/phase-interview-service.test.cjs
test/phase-map/phase-map-service.test.cjs
test/phase-planning/phase-planning-service.test.cjs
test/work-card-intake/work-card-intake-service.test.cjs
test/work-card-planning/work-card-planning-service.test.cjs
test/work-card-building/work-card-building-review-service.test.cjs
test/work-card-validation/work-card-validation-service.test.cjs
test/work-card-repair/work-card-repair-service.test.cjs
test/workflow/production-service-proof.test.cjs
test/support/canonical-markdown-fixtures.cjs
```

A new focused repository-authority propagation test file is authorized if cleaner.

Durable report required:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR15_repository_authority_propagation.md
```

## Acceptance Criteria

1. A shared repository-authority helper exists and is used by document writers instead of one-off local field copies.
2. New Project Intake metadata includes `workflowData.repositoryAuthority.projectRepository` and preserves top-level `workflowData.projectRepository`.
3. New Project Architect Interview Prompt metadata includes the same repositoryAuthority.
4. New Project Architect Interview output metadata inherits repositoryAuthority.
5. New Project Planning handoff, Project Profile, and Project Roadmap metadata inherit repositoryAuthority.
6. New Phase Map handoff/output, Phase Interview handoff/output, Phase Planning handoff/output, and Work Card Plan metadata inherit repositoryAuthority.
7. New Work Card Intake handoff, Formal Work Card, Implementer Report, Validation Record, Repair handoff, and Repair Work Card metadata inherit repositoryAuthority.
8. New Phase Closeout and Project Closeout metadata inherit repositoryAuthority.
9. MCP prompt generation uses only explicit `repositoryAuthority.mcpWorkspaceBinding` or other explicit app/project binding already authorized by WC46-REPAIR12.
10. Missing `mcpWorkspaceBinding` still fails closed for MCP prompt generation; no fallback inference is introduced.
11. Tests prove a prospective new-project chain carries repositoryAuthority from Project Intake into at least Project Planning handoff/Profile/Roadmap and Work Card Intake/Formal Work Card.
12. Tests prove Project Repository is not used as MCP workspaceId.
13. No legacy migration is performed.
14. No unrelated UI, workflow routing, repair, validation, close, or Codex behavior changes are introduced.
15. No Git mutation is performed.

## Negative Constraints

Do not:

- migrate or backfill legacy documents;
- infer `mcpWorkspaceId` from `projectRepository`, folder name, Git remote, repository name, diagnostics, or artifact search;
- emit MCP prompts without explicit MCP binding;
- add duplicate competing repository-authority field names beyond preserving required top-level `projectRepository` compatibility;
- make ChatGPT responsible for repairing missing repository authority;
- change MCP server behavior;
- redesign workspace-selection UI;
- alter unrelated lifecycle rails, browser panes, validation decisions, repair routing, close routing, or Codex execution;
- perform Git staging, commit, push, reset, clean, stash, checkout, pull, rebase, merge, or tag.

## Return Target

```text
WC46-REPAIR15 implementation complete
→ planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC46-REPAIR15_repository_authority_propagation.md
→ Architect review
→ Operator validation
→ return to active WC46 workflow according to existing resolver authority
```

## Implementer Report Requirements

The Implementer Report must include:

- exact files changed;
- repository-authority helper summary;
- document-family propagation matrix showing each required artifact type and whether repositoryAuthority is written;
- proof that no legacy migration was performed;
- proof that no MCP workspace fallback was reintroduced;
- validation commands, working directory, exit codes, and result summaries;
- acceptance-criteria mapping;
- skipped validation or residual risk.

The report must remain `Pending` for Architect/Operator review.

## Manual Validation

1. Create a new project with explicit MCP binding.
2. Confirm Project Intake, Project Architect Interview Prompt, Project Architect Interview, Project Planning handoff/Profile/Roadmap, and one Work Card Intake/Formal Work Card all contain repositoryAuthority metadata.
3. Confirm MCP prompts use the explicit workspaceId from repositoryAuthority binding.
4. Remove or omit explicit MCP binding in a separate temporary project and confirm MCP prompt generation fails closed.
5. Confirm no legacy document was migrated solely for repositoryAuthority.
