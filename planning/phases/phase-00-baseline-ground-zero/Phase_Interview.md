<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "phase-interview",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-00-baseline-ground-zero"
  },
  "sourceRevisions": [
    {
      "path": "planning/project/PROJECT_PROFILE.md",
      "revision": 1
    },
    {
      "path": "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md",
      "revision": 1
    },
    {
      "path": "planning/project/Phase_Map/PHASE_MAP_champcity_a_i.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-00-baseline-ground-zero/Architect_Handoffs/PHASE_INTERVIEW_ARCHITECT_HANDOFF_phase-00-baseline-ground-zero.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "repositoryAuthority": {
      "projectRepository": "C:\\Users\\chapm\\Projects\\ChampCity_AI"
    }
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "",
    "reviewedAt": "2026-08-23T18:43:03.430Z"
  }
}
CHAMPCITY-METADATA -->

# Phase Interview

## Phase Understanding

Phase 0 is a stabilization and reconciliation phase for the existing ChampCity A/I application, not a greenfield build or a new Harness architecture phase. ChampCity A/I already has a substantial Windows Electron application foundation, including the Project/Phase/Work Card/Repair/Validation lifecycle, canonical single-file Markdown authority, embedded Architect workflow, Codex App Server integration, Windows development-environment provisioning, the A/I-owned MCP/OAuth Harness runtime, renderer workspaces, and capability-oriented tests.

The immediate problem is that the repository baseline is materially dirty and contains a mixture of accepted current implementation, reconstruction/Harness work, documentation drift, intentional historical deletions, and unverified current validation state. Phase 0 must reconcile that state into a clean, understood, freshly validated development baseline before Phase 1 introduces persistent workspace and resource authority.

Historical Phase 01–08 planning completeness is not a reconstruction target. Current production source and current tests determine implemented reality when stale historical planning conflicts with them.

## Phase Objective

Preserve the accepted current implementation and establish development ground zero by reconciling the current repository state, correcting materially stale repository guidance, verifying the repaired Architect prompt-to-Harness contract, verifying required base machine capabilities through the existing development-environment path, running the approved validation path, preserving current MCP/OAuth continuity, and establishing an Operator-approved clean Git baseline.

Phase 0 exits only when later Harness work can begin from a repository and machine baseline whose current state is understood, reproducible, and validated rather than inferred from incomplete historical planning.

## Scope

Phase 0 includes:

- Reconcile pending source, test, planning, reconstruction/Harness, untracked, modified, and deleted repository changes against the approved current implementation baseline.
- Preserve accepted current production behavior and intentional historical cleanup rather than treating all deletions or differences as defects.
- Align active repository instructions and documentation with the current single-file canonical artifact architecture, live MCP/provider integration, current package scripts, existing lifecycle authority, and approved V1 scope.
- Reconcile identified stale material in `README.md`, `AGENTS.md`, `docs/architecture/REPOSITORY_CODE_TEST_AND_MIGRATION_BOUNDARY.md`, `docs/dev/VALIDATION_COMMAND_LANES.md`, and other active instructions where repository evidence demonstrates drift.
- Verify the recent prompt-to-Harness repair across active production prompt generators and focused tests, including the current `artifact_toolbox.write_markdown_artifact` contract and removal of active production reliance on `create_markdown_artifact`.
- Use the existing ChampCity development-environment mechanism to verify Git, Node.js/npm, and any other capability actually required by the current build; provision managed missing requirements through that existing path when necessary.
- Establish repository dependencies from the existing `package-lock.json` and normal npm bootstrap when required.
- Run the approved current validation lanes, including typecheck, build, focused or production-path tests as applicable, the full test lane at the integration gate, and an appropriate launch or integration smoke.
- Preserve current OAuth/client continuity and public MCP configuration without committing credentials, secrets, or machine-local paths.
- Establish an Operator-approved clean Git baseline through the existing development path without depending on future Harness Git-mutation functionality.

## Non-Scope

Phase 0 does not:

- Reconstruct deleted or missing historical Phase 01–08 planning merely to recreate chronology.
- Restore superseded paired Markdown/JSON authority or obsolete manual packet/governance systems.
- Redesign or replace the existing Project/Phase/Work Card/Repair/Validation lifecycle.
- Create a second canonical artifact system, environment provisioner, workflow engine, evidence system, or provider-specific parallel authority path.
- Implement persistent registered-workspace authority independent of foreground project selection.
- Implement bounded non-repository filesystem roots, task/session resource grants, generic Browser-driven local execution, Browser-to-Codex delegation, local-model workers, practical model routing, Browser/UI validation, production Harness Git mutation, background Harness operation, GitHub provider integration, or Windows installer/update/uninstall productization.
- Select future-stage technologies such as a local-model runtime, browser-validation backend, background-service mechanism, or installer/updater stack unless Phase 0 discovers that a choice is strictly necessary to restore the current baseline.
- Treat broad generic MCP federation or managed tunnel/DNS provisioning as Phase 0 work.
- Pre-author Work Cards or replace Phase Planning.

## Inherited Constraints

- Current production source and current tests outrank stale planning or documentation when they conflict about implemented behavior.
- Missing or deleted historical Phase 01–08 artifacts are not backlog unless new approved evidence establishes a real current dependency.
- The existing lifecycle and application-owned canonical single-file Markdown authority must be preserved.
- ChampCity remains the system of record and definition-of-done authority; models remain participants and the Operator retains final product and disposition authority.
- The existing Windows development-environment subsystem remains the single mechanism for capability detection, managed provisioning, UAC-aware installation, environment refresh, and verification.
- Repository readiness must use the existing Node/npm and lockfile path rather than introducing a parallel dependency/bootstrap system.
- Project-local instructions remain implementation guidance only after stale foundation-era statements are reconciled with current V1 authority.
- OAuth transport scope, repository resource authority, execution authority, Git mutation, elevation, and task authority remain distinct concepts; one must not silently imply another.
- Secrets, OAuth values, provider credentials, public-endpoint credentials, and machine-local paths must remain outside repository planning artifacts and ordinary diagnostics.
- Windows is the V1 platform and the current validation baseline must reflect the production Windows path.
- Validation must trace real production paths; source-string assertions or isolated service tests are insufficient as the sole proof for production-visible behavior.
- Phase work must remain decomposable into concise evidence-based Work Cards during Phase Planning rather than becoming one monolithic implementation assignment.

## Dependencies and Prior-Phase Evidence

Phase 0 has no phase dependencies and no approved prior-phase closeout evidence.

Its starting evidence is the approved Project Profile, Project Roadmap, Phase Map, and Phase Interview handoff. Those artifacts establish that Git is operational, the repository is Git-backed, the application already contains substantial accepted production capability, the worktree is materially dirty, current validation has not been freshly executed in the planning pass, and Node.js/npm or other current-build machine requirements must be verified through the existing development-environment path rather than assumed.

Phase 1 depends on Phase 0 producing a clean, understood, freshly validated baseline. Phase 0 therefore acts as the prerequisite boundary between reconstruction/current-state reconciliation and forward Harness architecture work.

## Material Decisions

The following decisions are resolved by approved evidence and the confirmed interview understanding:

1. Phase 0 is reconciliation and stabilization work, not new Harness feature development.
2. Current production source and current tests control implemented-state questions over stale historical planning.
3. Deleted historical Phase 01–08 planning is not to be reconstructed solely for completeness.
4. Accepted current lifecycle, canonical artifact, Architect, Codex, development-environment, Harness/MCP/OAuth, renderer, and testing foundations are to be preserved unless concrete defect evidence requires correction.
5. Machine readiness must be verified through the existing ChampCity development-environment subsystem; no provider-specific or parallel provisioning path is authorized.
6. Current repository validation must be freshly executed before the baseline is accepted for downstream phases.
7. Current OAuth/client/public MCP continuity must be preserved while secrets and local paths remain outside repository artifacts.
8. The clean baseline must be established through the existing development path; Phase 0 must not depend on the future Harness Git-mutation capability.
9. The Operator retains final acceptance of the clean baseline. Detailed reconciliation order, evidence classification, validation sequencing, and technical correction choices are Architect/implementation decisions to be resolved from repository evidence during Phase Planning and execution.

## Clarification Required

No. Approved project evidence resolved the material Phase 0 context, scope, non-scope, constraints, dependency state, risks, acceptance direction, and planning inputs without requiring an additional Operator-owned design decision.

The Operator confirmed the resulting phase-understanding summary without correction.

## Material Questions and Answers

No material clarification questions were required or asked during the Phase Interview.

The Architect presented the evidence-grounded Phase 0 understanding for confirmation, and the Operator responded: `Confirmed`.

## Architect Recommendations

- Treat reconciliation as evidence classification rather than blanket cleanup. Every material current change or deletion should be understood as accepted implementation, intentional cleanup, required correction, or unresolved evidence before the baseline is declared clean.
- Preserve current production behavior by default. Reopen implemented foundations only when current source, tests, validation, or approved V1 authority demonstrates an actual defect or contradiction.
- Correct active documentation that could materially misdirect later model workers, but do not spend Phase 0 reconstructing historical documentation that no longer participates in current authority.
- Use the existing development-environment subsystem for all current-build capability verification and managed remediation.
- Validate progressively through the repository-retained lanes, ending with the integration-level production path and appropriate launch/integration smoke before baseline acceptance.
- Keep prompt/Harness action-name verification explicit because the recently repaired Markdown-writer contract is a known source of prior drift.
- Preserve working MCP/OAuth/public-endpoint continuity during cleanup and verify it after relevant changes without exposing secret material.
- Require a final explainable Git state: a clean repository alone is insufficient if changes were removed or retained without evidence explaining why.
- Carry unresolved future-architecture choices forward to their assigned later phases rather than opportunistically deciding or implementing them during baseline cleanup.

## Risks and Unknowns

- The dirty worktree contains both accepted current implementation and intentional historical cleanup, creating a risk that legitimate work could be reverted or obsolete material restored during reconciliation.
- Current automated validation status is unknown because the planning pass inspected test source but did not freshly execute typecheck, build, focused tests, the full test lane, or launch/integration smoke.
- Node.js/npm installation state, repository dependency installation state, and any additional current-build machine capability remain unverified until the development-environment path probes them.
- Stale README, architecture-boundary, validation, instruction, and historical prompt text can misdirect models toward obsolete paired-artifact or pre-MCP assumptions if left active.
- Repository cleanup can accidentally damage OAuth/client continuity or public MCP configuration if local configuration and protected credentials are confused with repository-owned state.
- A visually clean Git tree could conceal incorrect reconciliation if intentional deletions, accepted reconstruction changes, or current source behavior are not understood before acceptance.
- Validation can produce false confidence if limited to isolated unit/service tests rather than the approved production-path lanes and integration smoke.
- Future architecture gaps identified in Project Planning may tempt scope expansion during cleanup; implementing them in Phase 0 would blur the baseline boundary and make later failures harder to attribute.

## Assumptions

- The approved Project Profile, Project Roadmap, Phase Map, and Phase Interview handoff remain the controlling project evidence for Phase 0.
- The current production source and current capability-oriented tests remain the best evidence of implemented behavior when historical planning conflicts with them.
- Git remains operational as established by approved project evidence.
- The existing development-environment subsystem remains functional enough to perform or drive required capability verification and managed provisioning during Phase 0.
- Current package scripts and the existing lockfile remain the repository-native build and dependency path unless Phase 0 discovers evidence of a current defect.
- Current OAuth/client/public MCP configuration represents accepted continuity to preserve; Phase 0 is not intended to redesign that subsystem.
- No prior-phase closeout evidence is required because Phase 0 has no dependencies.
- No new Operator-owned product decision is required before Phase Planning begins.

## Acceptance Direction

Phase 0 should be considered complete only when evidence demonstrates all of the following:

- The repository state is clean, understood, and reviewable rather than merely free of Git changes.
- Material retained, corrected, and deleted current changes have been reconciled against approved current architecture and production evidence.
- Accepted production foundations remain intact unless an evidence-backed correction was required.
- Active repository instructions and documentation no longer materially contradict current single-file canonical authority, live MCP/provider integration, current package scripts, or approved V1 scope.
- Active production Architect-output prompts and focused contract tests align with the live Harness action surface, including `artifact_toolbox.write_markdown_artifact` and the absence of active `create_markdown_artifact` reliance.
- Git, Node.js/npm, dependency state, and any other current-build capability required for validation are verified through the existing development-environment path as ready, provisioned, explicitly external, or genuinely blocked with evidence.
- Repository dependencies are established through the existing npm/lockfile path where needed.
- The approved validation lanes have been freshly executed, including typecheck, build, applicable focused and production-path tests, the full integration test gate, and an appropriate launch/integration smoke.
- Current OAuth/client/public MCP continuity is preserved and no credentials, secrets, or machine-local paths have been committed into repository artifacts.
- The resulting Git baseline is explicitly accepted by the Operator through the existing development workflow and does not depend on future Harness Git-mutation functionality.
- The baseline is sufficiently stable that Phase 1 failures can be attributed to Phase 1 work rather than unresolved reconstruction state.

## Inputs Required for Phase Planning

Phase Planning should use:

- The actual current Git status, diff, untracked-file inventory, and relevant history needed to classify the dirty baseline.
- Current production source and capability-oriented tests as primary implementation evidence.
- The approved Project Profile, Project Roadmap, Phase Map, and this confirmed Phase Interview.
- The current `package.json`, `package-lock.json`, package scripts, and repository-native npm bootstrap path.
- `AGENTS.md`, `README.md`, `docs/architecture/REPOSITORY_CODE_TEST_AND_MIGRATION_BOUNDARY.md`, `docs/dev/VALIDATION_COMMAND_LANES.md`, and other active repository instructions identified as potentially stale.
- Current production Architect prompt generators and focused prompt/Harness contract tests, especially the Markdown artifact writer contract.
- The existing Windows development-environment capability registry, probing, provider-resolution, provisioning, UAC, refresh, and semantic verification path.
- Current repository test and validation lanes needed to define progressive and final acceptance evidence.
- Current MCP/OAuth/public-endpoint configuration boundaries necessary to preserve continuity without placing secrets or local paths into planning or source artifacts.
- Evidence sufficient to distinguish intentional historical planning deletions from accidental loss or current-authority defects.

## Deferred Items

The following remain deferred to their assigned later phases or conditional roadmap work:

- Persistent registered-workspace authority independent of foreground desktop selection.
- Provider-neutral capability/session/resource-grant kernel expansion.
- Bounded non-repository filesystem-root authority.
- Generic Browser-driven local execution.
- Harness exposure of the development-environment subsystem for Browser implementation sessions beyond the current Phase 0 verification need.
- Context packs, reusable skills, expanded observability, and durable execution evidence architecture.
- Direct Browser ChatGPT Implementer MVP and Browser-primary dogfooding.
- Browser/UI validation provider implementation.
- Codex specialist/fallback worker delegation through the shared worker model.
- Bounded local-model worker selection and implementation.
- Production non-gating Harness Git mutation/history lifecycle.
- Optional GitHub remote-provider integration.
- Optional background Harness runtime.
- Practical model/reasoning quota/cost-aware routing.
- Windows packaging, onboarding, update, uninstall, and release productization.
- Integrated V1 acceptance on ChampCity A/I and a separate real project.
- Cross-platform releases, team/multi-user collaboration, cloud-hosted execution, advanced predictive routing, broad generic MCP federation, full native Windows computer-use, non-GitHub remote providers, and other post-V1 or conditional work.

## Unresolved Questions

No material Operator-owned questions remain unresolved for Phase 0.

Technical unknowns that must be converted into evidence during Phase Planning and implementation include the precise classification of each current worktree change, current validation pass/fail state, current Node.js/npm and dependency readiness, and any additional current-build capability discovered by the production validation path. These are investigation and implementation questions within the confirmed phase scope, not reasons to reopen the Phase Interview unless they reveal a new material Operator-owned scope or product decision.
