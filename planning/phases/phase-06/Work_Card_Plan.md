<!-- champcity-artifact-envelope
{"artifactId":"champcity-ai/phase-06/work_card_plan/Work_Card_Plan","artifactType":"work_card_plan","createdAt":"2026-07-17T02:05:00.000Z","jsonPath":"planning/phases/phase-06/Work_Card_Plan.json","markdownPath":"planning/phases/phase-06/Work_Card_Plan.md","payload":{"kind":"work_card_plan","title":"Work Card Plan: phase-06 — Consolidated Resolver Foundation Completion"},"payloadHash":"sha256:7fa6299767b8901f7116f636d4cd0e9d8ceb93bd01ecbbb79f2d45f2c5b31a33","phaseId":"phase-06","projectId":"champcity-ai","relationships":{"children":[],"expectedOutputs":["champcity-ai/phase-06/operator_approval/Operator_Phase_Approval","champcity-ai/phase-06/work_card/WC01","champcity-ai/phase-06/work_card/WC02"],"sources":["champcity-ai/phase-05/project_roadmap/WC03","champcity-ai/phase-06/diagnostic_report/WC02-full-workflow-resolver-foundation-top-to-bottom-review","champcity-ai/phase-06/operator_validation/WC02","champcity-ai/phase-06/phase_activation/phase-06","champcity-ai/phase-06/phase_planning/Phase_Planning"],"supersedes":[]},"revision":5,"schemaVersion":"champcity.artifact.v1","status":"active","updatedAt":"2026-07-18T02:52:00.000Z"}
-->

# Work Card Plan: phase-06 — Consolidated Resolver Foundation Completion

Status: approved
Phase: phase-06 — Workflow Kernel and Artifact Protocol Replacement
Revision: 5
Plan strategy: complete the resolver foundation in one implementation pass

## Rebaseline Decision

The original plan divided one workflow authority across WC02 through WC06. Operator validation demonstrated that this sequencing left the application with a partially replaced foundation and allowed tests to pass while the live application routed to an invalid Work Card authoring screen.

The Phase 06 implementation plan is therefore consolidated.

WC02 remains the single resolver-foundation implementation candidate. WC02-REPAIR03 is the authorized comprehensive repair that completes the full foundation in one pass.

The prior planned scopes of WC03, WC04, WC05, and WC06 are absorbed into WC02-REPAIR03:

- real repository replay and no-fallback gates;
- Artifact Registry and Workflow State diagnostic boundary;
- kernel-to-UI current-action adapter;
- integrated resolver validation and closeout-readiness evidence.

No separate WC03, WC04, WC05, or WC06 Work Card is authorized under this revision.

## Ordered Candidates

### WC01 — Kernel Contract, Artifact Protocol, and Source Authority Replacement Inventory

Status: completed via WC01-REPAIR01.

WC01 remains the accepted design and source-review baseline.

### WC02 — Full Workflow Resolver Foundation

Status: unresolved.

WC02 includes replacement of the prior projector and completion of the complete workflow foundation. WC02-REPAIR03 is the controlling implementation pass.

WC02-REPAIR03 must rebuild, integrate, and validate in one pass:

- verified-evidence normalization;
- project and phase lifecycle resolution;
- candidate resolution;
- sequential repair lineage;
- validation and observation disposition;
- action, role, screen, and output authority;
- IPC and routed writes;
- refresh and cold-start parity;
- real Phase 06 repository replay;
- kernel-to-UI routing;
- removal of duplicate authority and fallbacks.

## Completion Rule

Phase 06 becomes eligible for closeout when:

1. WC01 remains resolved;
2. WC02-REPAIR03 passes Architect Review;
3. Operator validation confirms the rebuilt foundation against the live application;
4. Architect disposition resolves parent WC02;
5. no unresolved resolver-foundation blocker remains.

There is no additional implementation candidate after WC02.

## Implementation Boundary

WC02-REPAIR03 is one complete implementation pass. The Implementer may use internal checkpoints and run tests repeatedly, but must not return partial sections for Architect or Operator acceptance.

One final Implementer Report is required after all authorized production code, tests, repository gates, mounted renderer checks, live repository replay, and documentation updates are complete.

## No-Fallback Rule

The consolidated pass must not retain or add:

- compatibility resolvers;
- duplicate transition engines;
- legacy/current action aliases;
- role-based or screen-based route defaults;
- filename, title, suffix, timestamp, directory-order, or first-match inference;
- synthetic expected-output IDs;
- Ad Hoc Work Card Capture as a routed workflow action;
- alternate Registry or Workflow State authority.

## Next Governed Output

The next implementation authority is:

`champcity-ai/phase-06/work_card/WC02-REPAIR03`
