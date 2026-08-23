<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "project-profile",
  "artifactRevision": 1,
  "participationRole": "compoundGatingReview",
  "identity": {
    "projectSlug": "champcity_a_i",
    "Project.ArtifactKey": "champcity_a_i"
  },
  "sourceRevisions": [
    {
      "path": "planning/project/Project_Intake/PROJECT_INTAKE_champcity_a_i.md",
      "revision": 1
    },
    {
      "path": "planning/project/Project_Architect_Interview_Prompts/PROJECT_ARCHITECT_INTERVIEW_PROMPT_champcity_a_i.md",
      "revision": 1
    },
    {
      "path": "planning/project/Project_Architect_Interviews/PROJECT_ARCHITECT_INTERVIEW_champcity_a_i.md",
      "revision": 1
    },
    {
      "path": "planning/project/Project_Planning_Documents/PROJECT_PLANNING_DOCUMENTS_champcity_a_i.md",
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
    "reviewedAt": "2026-08-23T18:13:30.680Z"
  }
}
CHAMPCITY-METADATA -->

# Project Profile

## Current-State Baseline

ChampCity A/I is an existing, substantially implemented local-first Windows Electron application for structured AI-assisted software development. It is not a greenfield repository and should not be planned as a rebuild. The current production source and current capability-oriented tests are the primary evidence of implemented behavior. Historical planning is incomplete by design and is not a reconstruction target.

Project ground zero is the combination of the selected repository and the local development machine. The repository already contains a mature application foundation, but the current development baseline is not yet clean: Git inspection confirms a Git-backed repository with a large set of pending deletions, modifications, and untracked reconstruction/Harness files. Establishing a clean, reviewed Git baseline is therefore current project work before the next major Harness implementation sequence.

The repository has a native Node/npm bootstrap and validation mechanism. `package.json` and `package-lock.json` are present. The current package scripts define `npm run typecheck`, `npm run build`, `npm test`, and `npm start`; the build uses TypeScript and Vite and targets Electron. The current manifest declares Electron 31, React 18, TypeScript 5.5, Vite 6, the Model Context Protocol SDK, and `@openai/codex` as part of the application stack. This is the existing repository toolchain and should be extended rather than replaced by a parallel build system.

Repository-local implementation and validation instructions also exist. `AGENTS.md` defines scope, source-of-truth, security, Git, validation, Work Card, and Implementer Report rules. `docs/architecture/REPOSITORY_CODE_TEST_AND_MIGRATION_BOUNDARY.md` defines the production-source/test/migration boundary, and `docs/dev/VALIDATION_COMMAND_LANES.md` defines Windows validation lanes and the known sandbox `spawn EPERM` handling rule. These are real project-local instructions, but several historical clauses are stale and must be reconciled against current production architecture and approved V1 planning rather than followed literally when they conflict with newer authority.

Development capability classification at this baseline is:

- **Verified installed or operational:** Git is available to the current ChampCity runtime and the repository is Git-backed; read-only Git status inspection succeeds. The ChampCity A/I Agent Harness itself is operational enough to expose the authenticated MCP tool surface and read the bound repository. The current application has a working Windows-oriented development-environment detection/provisioning subsystem in production source.
- **Repository-declared but local-machine installation not independently verified in this planning pass:** system Node.js/npm CLI availability and versions, package installation state, and any additional compiler/SDK/toolchain needed by future Work Cards. The repository declares how these capabilities are bootstrapped and validated, but the current MCP surface does not expose generic local process execution with which to probe the host directly.
- **Verified missing application capabilities required by planned V1 work:** persistent multi-workspace Harness authority independent of foreground project selection; bounded non-repository filesystem-root authority; task/session resource grants; generic Browser-driven local execution; Browser-to-Codex delegation; local-model worker support; automatic/practical model routing; functional Browser/UI validation provider; production Agent Harness Git mutation and history support; and a Windows installer/onboarding/update/uninstall productization path. These are missing software capabilities, not assumptions about what executables happen to be installed on the workstation.
- **Future machine capabilities whose readiness is unverified until their implementation stage:** Playwright or equivalent browser-validation dependencies and browser binaries; the runtime selected for the V1 local-model worker; and any installer/update build prerequisite chosen during productization. These must be detected and, where managed by ChampCity, provisioned before dependent work executes.
- **Explicit external or Operator/OS-managed boundaries:** Browser ChatGPT/model-provider availability and credentials; optional GitHub remote service and authentication; the currently configured public MCP endpoint/DNS/tunnel infrastructure unless a later V1 productization decision brings that lifecycle inside ChampCity; and Windows UAC confirmation when elevation is genuinely required. External ownership does not transfer workflow or resource authority away from ChampCity.

No evidence from this planning pass establishes a missing required base local tool such as Node.js as absent. Such capabilities are therefore unverified, not classified as missing. Future Work Cards must use the existing development-environment preflight system to convert that uncertainty into verified `ready`, provisioned, external, or blocked state before relying on the capability.

## Existing Implementation

The current application already implements the core development lifecycle that future work is expected to preserve:

- repository-derived Project, Phase, and Work Card lifecycle progression covering intake, planning, building, repair, validation, and close;
- evidence-derived current-workspace resolution rather than a manually persisted screen acting as workflow authority;
- explicit conflict states for malformed, duplicated, stale, partial, or mismatched workflow evidence;
- a renderer with Project, Phase, Work Card, review, validation, repair, close, execution-context, embedded Architect, and Settings workspaces.

Canonical planning authority is implemented as application-owned single-file Markdown with metadata, revisions, dispositions, source-revision freshness, and coordinated bundle invalidation. Current source implements transactional document writes and atomic coordinated bundles such as Project Profile plus Project Roadmap and Phase Planning plus Work Card Plan. Legacy paired-artifact migration exists as an explicit migration path; paired Markdown/JSON is not the current canonical architecture.

Architect participation is also implemented. The application has an embedded ChatGPT Architect browser workflow, generated repository-bound handoffs, temporary Architect draft paths, validation of required body structure, application-owned promotion into canonical documents, revision/freshness checks, and atomic promotion for coordinated output bundles. The active Project Planning production source verifies that this Project Profile and Project Roadmap operation is an atomic two-slot draft bundle whose canonical metadata, final targets, promotion, cleanup, and review state remain application-owned.

The current local implementation provider is the Codex App Server integration. Production source supports persistent threads/turns, streamed command/file/MCP/model events, input and MCP elicitation, cancellation, child-process cleanup, environment-resolution turns, implementation evidence, and report-before/report-after state. Its authority is tied to the active ChampCity execution context rather than being a general machine-wide authority. Current limitations are that Codex execution state is in memory, only one active execution is maintained per selected workspace, Browser ChatGPT cannot yet invoke Codex as a delegated Harness worker, and generic Browser-driven process execution is not implemented.

The Windows development-environment subsystem is already substantial and should remain the single environment path. Formal and Repair Work Cards can declare structured managed or external requirements. Current production code includes deterministic capability probing, WinGet/provider-backed resolution, UAC-aware installation, parent-process environment refresh, and semantic post-install verification. The current capability registry covers Git, CMake, Ninja, Node.js LTS, Python 3.12, .NET SDK 8, Rust, JDK 21, and MSVC Desktop C++ profiles, with agentic resolution available when deterministic/provider resolution cannot identify an ordinary managed requirement.

The A/I-owned Agent Harness/MCP runtime is implemented under `src/main/agentHarness/` and is independent of the former donor repository at runtime. Current verified behavior includes:

- official MCP Streamable HTTP transport and local/public endpoint support;
- OAuth/DCR/PKCE with `files.read` and `files.write` transport scopes, token rotation, and persisted A/I-owned OAuth state;
- persistent Agent Harness settings with transactional last-known-good runtime configuration;
- repository containment, bounded reads/search, text projection, generic Markdown/JSON artifact writes, constrained patch proposal/application, and bounded attached-image writes;
- Git inspection actions plus registered Git mutation action names;
- strict action-scoped JSON/Zod contracts generated from the same tool registry;
- Settings UI for Harness lifecycle, endpoints, authentication state, routing diagnostics, tool inventory, activity, and legacy OAuth-client import;
- live Browser ChatGPT access through the public A/I-owned MCP runtime.

The current Harness resource authority remains selected-project coupled. `createSelectedProjectAuthorityProvider` resolves the foreground selected project, and tool calls are rejected when their supplied `workspaceId` does not match that active selected project. Git mutation is registered but denied in the production authority configuration. `integration_toolbox`, `browser_toolbox`, and `knowledge_toolbox` are compatibility/foundation surfaces whose current production behavior is status-only rather than the future functionality implied by their names.

The current repository includes broad capability-oriented tests for lifecycle resolution, canonical documents and transactions, project/phase/work-card services, Architect draft ingestion/promotion, development-environment behavior, Codex App Server behavior, Agent Harness runtime/OAuth/schema/containment, renderer workspaces, and production-path wiring. The package-level full test lane builds before running the Node test suite. This planning pass inspected test source but did not execute the suite, so source presence and test intent are verified while current pass/fail status remains unverified.

The recent prompt-to-Harness contract repair is present in active production source. Active prompt-producing source paths reference `artifact_toolbox.write_markdown_artifact`, and a source search found no `create_markdown_artifact` reference under `src`. Focused prompt-contract tests explicitly assert that production Architect-output prompts reference actions present in the live Agent Harness registry, use `write_markdown_artifact`, use temporary draft paths with `overwrite: false`, and contain no `create_markdown_artifact` reference. This is verified source/test implementation evidence; it is not a claim that those tests have been freshly executed in this planning pass.

## Legacy Planning Reconciliation

`planning/project/Design_Documents/CURRENT_APPLICATION_BASELINE.md` is useful condensed current-state evidence because it was produced from direct source inspection, but it remains secondary to current production source and tests when a conflict exists. Its principal conclusions are consistent with the repository evidence inspected during this planning pass: the lifecycle, canonical artifacts, Codex implementation harness, Windows environment subsystem, embedded Architect workflow, and A/I-owned MCP runtime already exist, while the future multi-workspace/execution/worker/routing architecture does not.

`planning/project/Design_Documents/FUTURE_APPLICATION_DESIGN.md` is approved forward-looking architecture context, not evidence of implementation and not independent implementation authority. Its provider-neutral Harness, multi-workspace, bounded filesystem, execution, context/skills, worker, validation, observability, and dogfooding direction remains materially relevant. The approved Project Architect Interview is later and controls current V1 scope where the two differ. In particular, bounded local-model work and practical quota/cost-aware model/reasoning routing are V1 requirements under the approved interview even though the older future-design staging allowed them to appear later or be deferred. Advanced learned/predictive routing remains post-V1.

Historical Phase 01–08 planning completeness is not required. The current dirty worktree includes extensive historical planning deletions. Those deletions are evidence of cleanup/reconstruction state, not a requirement to recreate the removed chronology. Future planning must preserve the current production capability baseline and establish a clean repository state without restoring superseded authority systems merely to make history look complete.

Several repository documents contain stale historical statements and must be reconciled during baseline cleanup:

- `README.md` still describes synchronized Markdown/JSON artifact pairs, manual packet workflows, and the absence of live LLM/MCP integration. Current production source implements single-file canonical Markdown, embedded Architect workflows, Codex integration, and an authenticated MCP runtime, so those README statements are not current authority.
- `docs/architecture/REPOSITORY_CODE_TEST_AND_MIGRATION_BOUNDARY.md` still contains paired-artifact language and an old statement that `package.json` references deleted helper scripts. The current package manifest no longer contains those script references.
- `docs/dev/VALIDATION_COMMAND_LANES.md` also retains the historical package-script note, although its broader distinction between direct validation, production-path testing, launch smoke, real external-integration evidence, and Operator acceptance remains useful.
- `AGENTS.md` contains durable current safety and implementation rules, but some phase/foundation-scoped prohibitions and references are historical. New V1 Work Cards may expressly authorize capabilities such as MCP/provider integration that an earlier MVP-foundation clause prohibited. The active Work Card and current approved planning must control scope rather than an obsolete foundation restriction.
- The approved Architect Interview Prompt artifact still contains a stale historical reference to `artifact_toolbox.create_markdown_artifact` in its own output guidance. Current production prompt generators, the current Project Planning handoff, the live Agent Harness registry, and focused prompt-contract tests use `artifact_toolbox.write_markdown_artifact`. The stale prompt text is therefore evidence of documentation drift, not the active tool contract.

The reconciliation principle is to preserve one authority path. Current production lifecycle, canonical artifact, environment, Harness, and evidence services should be extended in place. Future work should not introduce a second workflow engine, a second environment provisioner, provider-specific parallel resource policy, or a generic governance/approval layer that competes with the existing Operator/Work Card authority model.

## Risks and Unknowns

The most immediate risk is baseline ambiguity. The repository is materially dirty and contains both accepted current implementation and intentional historical cleanup. Until those changes are reconciled, validated, and placed on an Operator-approved Git baseline, later defects can be misattributed to either new Harness work or unfinished reconstruction state. Baseline cleanup must preserve accepted source rather than restore deleted historical planning.

Current automated validation status is also an unknown. The repository contains relevant test coverage and the current source/test matrix includes the repaired Markdown-writer contract, but this planning pass did not execute typecheck, build, focused tests, or the full test lane. Fresh validation is required before treating the reconstructed source state as the stable foundation for later phases.

Local development-machine readiness is only partially verified. Git is operational, but direct host probes for Node.js/npm and later V1-specific tooling were not available through the current MCP surface. The existing development-environment subsystem is the correct mechanism to close this gap. Required machine capabilities must be verified or provisioned before their dependent stages; they must not be presumed present merely because the repository declares dependencies.

Resource-authority expansion is a high-consequence change. Persistent multi-workspace access, bounded host roots, background remote access, and agent sessions increase the risk of operating on the wrong repository or escaping intended scope. Stable resource identities, realpath containment, task/session grants, explicit execution authority, and strong observability must precede broad Browser coding capability.

Generic local execution is both necessary and dangerous. V1 requires structured program/argument execution, authorized working directories, streaming output, timeout, cancellation, child-process-tree cleanup, environment refresh, elevation boundaries, and durable evidence. OAuth `files.write` or repository write authority must never silently imply unrestricted process execution.

Provider and integration behavior can drift. Browser ChatGPT, OpenAI model offerings, Codex App Server, MCP/OAuth behavior, GitHub, and browser-automation backends are external dependencies. Provider-neutral application contracts and capability discovery are required so a provider change does not become a workflow-authority change.

The local-model provider is intentionally not selected yet. V1 requires a bounded local-model worker, but the provider/runtime, machine requirements, model distribution, and reliability characteristics remain engineering decisions. That choice must occur before the local-worker stage so the required runtime can be detected/provisioned and deterministic acceptance can be defined.

The exact Windows background-Harness mechanism and durable session-state representation remain unresolved engineering choices. They must support authenticated remote access, deterministic startup/shutdown, protected credentials, cancellation and owned-process cleanup, and recovery without expanding resource grants when the foreground UI closes.

Windows installer/update/uninstall technology is also not selected. The current package manifest does not define a release packaging/updater stack. Productization must select the smallest suitable mechanism, establish any required machine/repository prerequisites, and prove first-run/provider/Harness/workspace configuration for a non-programmer rather than adding packaging tools prematurely.

Routing value is uncertain until measured. Practical V1 routing should begin with explicit capability, task type, reasoning need, configured cost/quota preference, latency, and Operator override rules. More sophisticated automatic optimization is not justified until execution evidence demonstrates that delegation lowers cost or quota consumption without increasing failure/rework.

Documentation drift is a continuing operational risk because stale README, clean-room, validation, and prompt text can direct models toward obsolete architecture. Baseline cleanup should align active repository instructions with current single-file canonical authority, live MCP/provider integration, and the approved V1 boundary while retaining useful safety and validation constraints.

Broad generic MCP federation is not yet established as a V1 requirement in the approved interview. V1 does require functional Browser/UI validation and optional GitHub integration, but those can be delivered through bounded application-owned provider adapters. A generic federation manager should remain conditional unless the selected Playwright, GitHub, or another required V1 integration actually needs it.

Finally, V1 release quality depends on integrated proof, not isolated service tests. The system must ultimately demonstrate the existing lifecycle plus Browser implementation, environment establishment, worker delegation, local-model work, Git/local-only and optional GitHub behavior, routing, background access, Windows productization, deterministic shutdown, and real-project dogfooding without reintroducing repetitive authority gates or making the model the system of record.
