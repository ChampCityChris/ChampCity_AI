<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "phase-planning",
  "artifactRevision": 1,
  "participationRole": "compoundGatingReview",
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
      "path": "planning/phases/phase-00-baseline-ground-zero/Phase_Interview.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-00-baseline-ground-zero/Architect_Handoffs/PHASE_PLANNING_ARCHITECT_HANDOFF_phase-00-baseline-ground-zero.md",
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
    "reviewedAt": "2026-08-23T18:56:05.951Z"
  }
}
CHAMPCITY-METADATA -->

# Phase Planning

## Phase Objective

Phase 0 establishes a clean, understood, reproducible development ground zero for the existing ChampCity A/I application. The phase preserves accepted current production behavior, reconciles the materially dirty reconstruction worktree without restoring superseded history, aligns active repository guidance with the current architecture, verifies the repaired Architect-to-Harness artifact-writing contract, establishes required current-build machine and repository readiness through the existing ChampCity development-environment and npm/lockfile paths, executes fresh production-path validation, preserves current MCP/OAuth/public-endpoint continuity, and concludes with an Operator-approved clean Git baseline.

The phase is complete only when later Harness architecture work can begin from verified machine and repository state rather than inferred readiness or incomplete historical planning.

## Scope

Phase 0 includes:

- Classify material modified, deleted, and untracked repository state against current production source, current tests, approved planning, and intentional historical cleanup before deciding what to retain, correct, or remove.
- Preserve accepted lifecycle, canonical single-file Markdown, Architect, Codex, development-environment, Agent Harness/MCP/OAuth, renderer, and test foundations unless current evidence establishes a concrete defect.
- Verify current-build host capabilities through the existing ChampCity development-environment mechanism. Git is already evidenced as operational; Node.js/npm, repository dependency state, and any additional capability actually required by the current build must be converted from unverified state into verified ready, managed-provisioned, explicitly external, or evidence-backed blocked state before dependent validation.
- Establish repository dependencies through the existing `package.json` / `package-lock.json` and repository-native npm bootstrap when required.
- Reconcile active guidance that could materially misdirect later model workers, including `README.md`, `AGENTS.md`, `docs/architecture/REPOSITORY_CODE_TEST_AND_MIGRATION_BOUNDARY.md`, `docs/dev/VALIDATION_COMMAND_LANES.md`, and other active instructions proven stale by current evidence.
- Verify the recent prompt-to-Harness repair across active production prompt generators and focused contract tests, including use of `artifact_toolbox.write_markdown_artifact` and removal of active production reliance on `create_markdown_artifact`.
- Execute the approved progressive validation path: typecheck, build, applicable focused and production-path tests, the full integration test gate, and an appropriate launch or integration smoke.
- Preserve accepted OAuth/client/public MCP continuity while keeping credentials, secrets, and machine-local paths outside repository artifacts and ordinary diagnostics.
- Establish an explainable, clean Git baseline through the existing development path and obtain the required Operator acceptance without depending on the future Harness Git-mutation capability.

## Non-Scope

Phase 0 does not:

- Reconstruct deleted or missing historical Phase 01–08 planning solely to recreate chronology or visual completeness.
- Restore paired Markdown/JSON canonical authority, obsolete manual packet processes, superseded governance systems, or other historical authority paths.
- Redesign the existing Project/Phase/Work Card/Repair/Validation lifecycle or introduce a second workflow, canonical artifact, environment, evidence, or provider-specific authority system.
- Implement persistent registered-workspace authority, provider-neutral session/resource-grant expansion, bounded non-repository filesystem roots, generic Browser-driven local execution, Browser-to-Codex delegation, context-pack/skills architecture, Browser/UI validation, local-model workers, practical model routing, production Harness Git mutation, GitHub provider integration, background Harness operation, or Windows installer/update/uninstall productization.
- Select later-stage browser-validation, local-model, background-runtime, installer, updater, or broad MCP-federation technologies unless evidence shows a choice is strictly necessary to restore the current baseline.
- Move external provider, public-endpoint, DNS, tunnel, or authentication ownership into ChampCity merely because Phase 0 must preserve continuity.
- Preempt later Work Cards by implementing forward Harness architecture during baseline reconciliation.

## Inherited Constraints

- Current production source and current capability-oriented tests control implemented-state questions when stale planning or documentation conflicts with them.
- Missing or deleted historical Phase 01–08 artifacts are not backlog absent new approved evidence of a current dependency.
- ChampCity remains the system of record and definition-of-done authority; models remain participants and the Operator retains final product/disposition authority.
- The existing lifecycle and application-owned canonical single-file Markdown architecture must be preserved.
- The existing Windows development-environment subsystem is the single path for capability detection, managed provisioning, provider-backed resolution, UAC-aware installation, environment refresh, and semantic verification.
- Required managed development capabilities are ChampCity work. Their absence must not be converted into a generic instruction for the Operator to perform manual installation.
- Repository readiness must use the existing Node/npm and lockfile mechanism rather than creating a parallel dependency/bootstrap system.
- OAuth transport scope, repository resource authority, execution authority, Git mutation authority, elevation, and task authority remain distinct; one does not silently imply another.
- Secrets, provider credentials, OAuth values, public-endpoint credentials, and machine-local paths must remain outside repository planning artifacts and ordinary diagnostics.
- Windows is the V1 production platform and Phase 0 validation must exercise the current Windows production path.
- Validation must trace the production path; source-string assertions or isolated service tests cannot serve as the sole proof of production-visible behavior.
- The clean baseline must be established through the existing development path; Phase 0 cannot depend on the future production Harness Git-mutation service.
- Work must remain decomposed into concise evidence-based Work Cards with explicit preservation and validation boundaries.

## Architecture and Implementation Direction

Phase 0 is evidence-first stabilization. Reconciliation must classify each material current change as accepted implementation, intentional cleanup, required correction, or unresolved evidence before the baseline is declared clean. A clean-looking Git tree is not sufficient if retained or removed changes are not explainable.

Machine readiness and repository readiness are separate but coordinated concerns. The first implementation candidate must use the existing development-environment subsystem to verify the current-build capability set before validation work depends on it. Git is already evidenced as operational. Node.js/npm, dependency installation state, and any additional current-build capability discovered by the repository-native production path begin as unverified. Managed capabilities are detected, provisioned when necessary through the existing ChampCity path, environment-refreshed, and semantically verified by ChampCity. The repository dependency substrate is then established through the existing lockfile-controlled npm path when needed. No parallel package manager, build system, provider-specific installer, or ad hoc environment path is authorized.

External capabilities remain explicitly external when approved evidence establishes outside ownership. For this phase, Browser ChatGPT/model-provider availability and credentials and the currently configured public MCP endpoint/DNS/tunnel infrastructure remain external continuity boundaries unless later approved scope changes their lifecycle ownership. An unavailable external capability blocks only the operation that genuinely depends on it and must be surfaced as an external condition; it does not transfer workflow or repository authority away from ChampCity.

Human interaction is a narrow boundary, not a substitute for managed work. When a managed capability legitimately requires Windows elevation, ChampCity must prepare the installation or remediation action, request only the required UAC confirmation, and resume verification afterward. At phase close, ChampCity must prepare the final explainable Git state and request the Operator's acceptance of that baseline; the Operator is not expected to manually perform routine environment or repository operations simply because human acceptance is required.

Repository reconciliation must preserve one authority path. Intentional historical planning deletions remain deletions unless current evidence establishes a live dependency. Active documentation is corrected only where drift can misdirect implementation, validation, or authority decisions. The prompt-to-Harness contract is a specific reconciliation target because current production authority is `artifact_toolbox.write_markdown_artifact`; stale references to `create_markdown_artifact` must not remain active production guidance.

Validation follows progressive repository-retained lanes after readiness and reconciliation are established. Focused checks should catch local contract defects early, followed by typecheck/build and production-path tests, then the full integration gate and an appropriate launch/integration smoke. Current MCP/OAuth/public-endpoint continuity is rechecked after relevant changes without exposing protected material. Any validation failure is treated as evidence: corrections remain bounded to restoring the accepted Phase 0 baseline, while new forward-architecture requirements remain deferred.

The final Git baseline uses the existing development path, not the not-yet-built Harness Git-mutation service. Final evidence must show both cleanliness and reconciliation rationale so Phase 1 defects can be attributed to Phase 1 changes rather than unresolved reconstruction state.

## Major Deliverables

- Verified current-build machine-readiness evidence covering Git and all actually required host capabilities, with managed missing capabilities provisioned and semantically verified through the existing ChampCity environment path.
- Repository dependency readiness established through the current `package.json` / `package-lock.json` npm path when required.
- An evidence-classified reconciliation of the dirty worktree that preserves accepted implementation and intentional historical cleanup while correcting only evidence-backed baseline defects.
- Active repository guidance aligned with current single-file canonical authority, live MCP/provider integration, current package scripts, existing lifecycle authority, and approved V1 scope.
- Verified active Architect prompt/Harness action alignment, including `artifact_toolbox.write_markdown_artifact` and no active production dependency on `create_markdown_artifact`.
- Fresh validation evidence across the approved typecheck, build, focused/production-path test, full integration, and launch/integration smoke lanes.
- Evidence that accepted OAuth/client/public MCP continuity survived reconciliation and validation without secret or machine-local information entering repository artifacts.
- A clean, explainable Git baseline explicitly accepted by the Operator through the existing development workflow.

## Dependencies

Phase 0 has no prior-phase dependency and requires no prior-phase closeout artifact. Its controlling planning evidence is the approved Project Profile, Project Roadmap, Phase Map, approved Phase Interview, and approved Phase Planning handoff at the stated revisions.

Machine dependency state at phase entry is intentionally mixed: Git is verified operational; system Node.js/npm, repository package installation state, and any additional current-build host capability are unverified until the existing development-environment path probes them. Managed missing capabilities are established by ChampCity before dependent work proceeds. If a capability is established by approved evidence as externally owned, its absence is reported as an external block for the dependent operation rather than converted into a managed installation assumption.

Repository readiness depends on the existing Node/npm package substrate, `package.json`, `package-lock.json`, current package scripts, and repository-retained validation guidance. No additional future-stage dependency is introduced unless Phase 0 evidence proves it is required by the current production baseline.

External continuity dependencies include the accepted Browser ChatGPT/model-provider access and the currently configured public MCP endpoint/DNS/tunnel infrastructure to the extent a production integration smoke relies on them. Their credentials and lifecycle remain outside repository authority for this phase.

Human-interaction boundaries are limited to genuine OS/Operator actions: Windows UAC confirmation when managed provisioning requires elevation and final Operator acceptance of the prepared clean Git baseline. ChampCity must perform or prepare the surrounding work and resume afterward.

Phase 1 depends on Phase 0 producing a clean, understood, freshly validated machine and repository baseline.

## Risks and Mitigations

- **Accepted work is reverted or intentional cleanup is undone.** Mitigation: classify material changes from current production/test/planning evidence before modification; do not equate deletion with defect or historical absence with backlog.
- **Machine readiness is assumed from repository declarations.** Mitigation: probe current-build requirements through the existing development-environment subsystem first; provision managed missing capabilities and verify them before validation.
- **Parallel environment or bootstrap mechanisms emerge.** Mitigation: keep all host capability work in the existing ChampCity environment system and all repository dependency work in the existing npm/lockfile path.
- **A stale instruction reintroduces obsolete architecture.** Mitigation: reconcile active README, AGENTS, boundary, validation, and prompt guidance against current production authority; leave non-authoritative historical material alone unless it can misdirect current work.
- **The repaired Markdown-writer contract regresses.** Mitigation: explicitly inspect active prompt-producing paths and run the focused contract tests that bind prompt action names to the live Harness registry.
- **Validation gives false confidence.** Mitigation: use progressive checks culminating in the full integration gate and launch/integration smoke; do not rely solely on source-string or isolated unit/service evidence.
- **Cleanup damages MCP/OAuth/public endpoint continuity.** Mitigation: distinguish protected/local configuration from repository-owned state, preserve accepted configuration, and recheck continuity without logging or committing secrets.
- **A clean Git tree conceals incorrect reconciliation.** Mitigation: require final reconciliation rationale and reviewable evidence in addition to clean status.
- **Phase 0 expands into future Harness architecture.** Mitigation: correct only current-baseline defects and carry forward registered-workspace, execution, worker, validation-provider, routing, Git-mutation, background-runtime, and productization work to their assigned later phases.
- **Managed provisioning requires elevation.** Mitigation: let ChampCity prepare the action and use UAC only as the necessary human-interaction boundary, then resume automated verification.

## Validation Strategy

Validation is staged so failures are attributable and expensive lanes run only after their foundations are ready.

1. Use the existing development-environment subsystem to verify Git and the current-build host capability set. Convert Node.js/npm and any additional required capability into verified ready, managed-provisioned, explicitly external, or evidence-backed blocked state. Where managed provisioning occurs, verify the refreshed environment and the capability semantically before proceeding.
2. Establish repository package readiness from the existing lockfile-controlled npm path when dependencies are absent or stale.
3. Complete worktree reconciliation and active-guidance/prompt-contract corrections before treating later test results as baseline evidence.
4. Run focused checks for the prompt-to-Harness writer contract and any other directly modified baseline surface.
5. Run the repository's current `npm run typecheck` and `npm run build` lanes.
6. Run applicable production-path/focused tests, then the repository full test lane at the integration gate.
7. Perform the appropriate Windows launch or integration smoke needed to exercise the current production path, including current MCP/OAuth/public-endpoint continuity where that path depends on the accepted external service.
8. Inspect final Git status/diff and secret/local-path hygiene. Confirm every retained, corrected, or deleted material change is explainable.
9. Present the prepared baseline evidence for final Operator acceptance. Phase completion requires that acceptance; routine validation, environment establishment, and Git preparation remain ChampCity-managed work.

If a validation step fails, the failure is evidence to diagnose within the accepted Phase 0 baseline. New forward-architecture work is not introduced merely to make the lane pass.

## Acceptance Criteria

Phase 0 is accepted only when all of the following are evidenced:

- The repository is clean, understood, reviewable, and explainable; cleanliness alone is insufficient.
- Material retained, corrected, and deleted changes have been reconciled against approved current architecture, production source, current tests, and intentional historical cleanup.
- Accepted production foundations remain intact except for evidence-backed baseline corrections.
- Active repository guidance no longer materially contradicts current single-file canonical authority, live MCP/provider integration, current package scripts, existing lifecycle authority, or approved V1 scope.
- Active production Architect-output prompts and focused contract tests align with the live Harness action surface, including `artifact_toolbox.write_markdown_artifact`, with no active production reliance on `create_markdown_artifact`.
- Git and every host capability actually required by the current build are verified through the existing development-environment path as ready, managed-provisioned and verified, explicitly external, or evidence-backed blocked; Node.js/npm and dependency state are not left assumed.
- Repository dependencies are established through the existing npm/lockfile path where required.
- The approved validation path has been freshly executed, including typecheck, build, applicable focused/production-path tests, the full integration test gate, and an appropriate launch/integration smoke.
- Current OAuth/client/public MCP continuity is preserved where part of the accepted baseline, and no credentials, secrets, or machine-local paths are committed into repository artifacts.
- Any required UAC interaction is limited to the necessary Windows confirmation around a ChampCity-prepared managed action, after which ChampCity resumes verification.
- The final Git baseline is established through the existing development path, does not depend on future Harness Git mutation, and is explicitly accepted by the Operator.
- The resulting baseline is stable enough that Phase 1 failures can be attributed to Phase 1 work instead of unresolved reconstruction state.

## Sequencing Direction

Candidate work should be sequenced as follows:

1. **Verify and Establish Current-Build Development Readiness.** Use the existing ChampCity environment path to verify the current-build host capabilities and establish lockfile-controlled repository dependency readiness. This candidate has no candidate dependency and must complete before any candidate that requires build/test execution.
2. **Reconcile the Current Worktree Into an Evidence-Classified Baseline.** Classify and reconcile modified, deleted, and untracked state while preserving accepted current implementation and intentional historical cleanup. This follows development-readiness establishment so repository work can use the verified native toolchain when needed.
3. **Align Active Repository Guidance and Prompt-to-Harness Contracts.** Correct materially stale active guidance and verify active prompt-producing paths/tests against the live `write_markdown_artifact` contract without restoring obsolete authority systems.
4. **Freshly Validate the Reconciled Production Baseline.** Run progressive focused, typecheck, build, production-path, full integration, and launch/integration validation and recheck accepted MCP/OAuth/public-endpoint continuity. This depends on readiness and reconciliation/alignment work.
5. **Establish the Operator-Accepted Clean Git Baseline.** Prepare the final explainable Git state through the existing development path, verify hygiene and reconciliation evidence, request only the required Operator baseline acceptance, and close Phase 0 from that accepted clean state.

Later-phase architecture is not interleaved into this sequence. A discovered managed development capability needed by a candidate must be established and verified through the existing environment path before that candidate proceeds.

## Deferred Items

Deferred to their assigned later phases or conditional roadmap work are persistent registered-workspace authority; provider-neutral capability/session/resource-grant expansion; bounded non-repository filesystem roots; generic Browser-driven local execution; broader Harness exposure of the environment subsystem for Browser implementation; context packs, reusable skills, expanded observability, and durable execution-evidence architecture; the direct Browser Implementer pilot and Browser-primary dogfooding; Browser/UI validation provider implementation; Codex worker delegation; bounded local-model worker selection/integration; production Harness Git mutation/history support; optional GitHub integration; optional background Harness operation; practical model/reasoning quota/cost-aware routing; Windows packaging/onboarding/update/uninstall productization; integrated V1 acceptance; and post-V1/conditional cross-platform, multi-user, cloud execution, advanced predictive routing, broad MCP federation, native computer-use, and non-GitHub remote-provider work.

No deferred item should be pulled into Phase 0 solely because reconciliation exposes its future absence.

## Unresolved Questions

No material Operator-owned question remains unresolved for Phase 0.

The remaining technical unknowns are evidence questions to resolve during the planned work: the precise classification of each material current worktree change; current pass/fail state of the approved validation lanes; current Node.js/npm and repository dependency readiness; any additional host capability actually required by the current production build; and whether an accepted external continuity dependency is available when its integration smoke is executed. These unknowns are handled by verification, managed provisioning, evidence classification, or explicit external blocking as applicable. They reopen phase scope only if they reveal a genuinely new material Operator-owned product or scope decision.
