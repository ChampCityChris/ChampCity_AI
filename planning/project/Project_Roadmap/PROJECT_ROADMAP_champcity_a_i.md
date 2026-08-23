<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "project-roadmap",
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

# Project Roadmap

## Baseline Summary

ChampCity A/I begins this roadmap as a substantially implemented Windows Electron application, not as a greenfield project. The existing Project → Phase → Work Card → Repair → Validation lifecycle, canonical single-file Markdown authority, embedded Architect workflow, Codex App Server integration, Windows development-environment provisioning, A/I-owned MCP/OAuth runtime, renderer workspaces, and broad test corpus are foundations to preserve.

The current repository is Git-backed but materially dirty and unreconciled. Current production source, current tests, and approved reconstruction context establish the implementation baseline; missing historical Phase 01–08 records are not backlog. Before major new Harness work begins, the current source state must be reconciled into a clean Operator-approved Git baseline and freshly validated.

The repository-native development path is npm/Node based. `package.json` and `package-lock.json` define the current Electron/React/TypeScript/Vite/MCP/Codex dependency substrate and the canonical `typecheck`, `build`, `test`, and `start` commands. `AGENTS.md`, `docs/architecture/REPOSITORY_CODE_TEST_AND_MIGRATION_BOUNDARY.md`, and `docs/dev/VALIDATION_COMMAND_LANES.md` provide local implementation and validation constraints, although stale historical clauses in those documents must be corrected as part of baseline cleanup.

At machine ground zero, Git is verified operational through the current Harness. Direct host verification of Node.js/npm and future stage-specific tooling was not available through the current MCP surface. The existing development-environment subsystem must therefore verify and, for managed requirements, provision missing local capabilities before dependent Work Cards run. Future Playwright/equivalent tooling, a local-model runtime, and installer/update prerequisites are project work only when their corresponding V1 stages require them.

The principal architectural delta is the Agent Harness. Today, generic MCP repository authority is still coupled to the foreground selected project, Browser ChatGPT cannot run generic local build/test/debug processes or delegate workers, Git mutation is disabled in production Harness authority, Browser/Knowledge/Integration providers are status-only foundations, local-model work and practical routing do not exist, and Windows release productization is not implemented. V1 closes those gaps without replacing the established workflow or creating parallel authority systems.

## Work-State Classification

### Verified Existing — Preserve and Extend

The following are implemented foundations and should not be reopened without evidence of a defect:

- nested Project, Phase, and Work Card lifecycle resolution derived from repository evidence;
- canonical single-file Markdown artifacts with application-owned metadata, revisions, dispositions, source freshness, downstream invalidation, and atomic coordinated bundles;
- specialized Architect output preparation, temporary drafts, structural validation, promotion, and review ownership;
- embedded Browser ChatGPT Architect surface and current public authenticated MCP connectivity;
- Codex App Server implementation transport, persistent turns during runtime, approvals/input/MCP elicitation, cancellation, cleanup, environment-resolution turns, and implementation evidence;
- Windows development-environment requirements, probing, managed provisioning, provider-backed resolution, UAC boundary, environment refresh, and verification;
- A/I-owned Agent Harness HTTP/MCP/OAuth service, strict tool registry, repository containment, bounded artifact writes, patch workflow, diagnostics, settings, and live repository reads;
- application renderer workspaces for planning, implementation, review, repair, validation, close, execution context, and Agent Harness settings;
- capability-oriented automated tests and current package build/test entry points.

### Baseline Reconciliation — Immediate Foundation Work

The current repository state must be stabilized before new architecture is layered onto it. This includes reconciling the dirty worktree, preserving accepted Harness/reconstruction changes, aligning stale README/clean-room/validation/instruction text with current production behavior, verifying the repaired Architect prompt/tool contracts, and running a fresh clean baseline validation lane. This work must not restore deleted historical planning or superseded governance merely to produce a visually complete history.

### Verified Missing V1 Capability — Forward Implementation

V1 still requires:

- persistent registered-workspace authority independent of desktop selection;
- explicit bounded non-repository filesystem roots;
- task/session resource grants and provider-neutral session identity;
- a shared Harness capability kernel rather than provider-specific parallel services;
- generic structured local execution with output, input, timeout, cancellation, process-tree cleanup, and evidence;
- Harness exposure of the existing environment subsystem;
- bounded context packs, reusable skills, and durable/diagnostic execution evidence;
- a direct Browser ChatGPT Implementer path;
- functional Browser/UI validation, initially Playwright or equivalent;
- Codex worker delegation and correlated evidence return;
- a bounded local-model worker;
- non-gating Git lifecycle operations through application-owned authority;
- optional GitHub remote-provider integration while preserving local-only Git;
- optional background Harness operation independent of the visible UI;
- configurable model/reasoning selection and practical quota/cost-aware routing with Operator override;
- Windows installation, first-run configuration, diagnostics, update, and uninstall productization;
- integrated acceptance using ChampCity A/I itself and at least one separate real project.

### Deferred or Conditional

Cross-platform releases, team/multi-user collaboration, cloud-hosted execution, a second required non-OpenAI high-reasoning orchestrator, advanced predictive routing, full native Windows computer-use, specialized intake variants for every project archetype, non-GitHub remote providers, and undocumented future features are not part of V1. Broad generic MCP federation is conditional rather than automatically required; V1 integrations should use the smallest bounded provider mechanism that satisfies Browser/UI validation and GitHub needs.

## MVP Scope

The roadmap uses **MVP** to mean the minimum dogfooding milestone at which Browser ChatGPT can act as a real ChampCity Implementer through application-owned resources. MVP is not the Project completion boundary. The Project completion boundary remains the full public-release-quality V1 defined by the approved Architect Interview.

The Browser Implementer MVP includes:

1. a clean, freshly validated repository and machine-readiness baseline;
2. persistent registered-workspace authority separated from foreground desktop project selection;
3. provider-neutral capability/session/resource-grant contracts sufficient for a Browser implementation session;
4. bounded configured filesystem roots where a real Work Card requires non-repository resources;
5. generic structured local execution against explicitly authorized workspaces/roots;
6. reuse of the existing development-environment service through the Harness;
7. task-relevant context, skills, execution evidence, and diagnostics sufficient to explain a Browser implementation run; and
8. one direct Browser ChatGPT implementation of a small real ChampCity Work Card, without worker delegation, proving repository read/search/write/patch, build/test/debug execution as applicable, environment resolution when needed, and Implementer Report creation through application-owned artifact authority.

MVP exit requires that changing the foreground desktop-selected project does not silently retarget or revoke an already authorized Browser session, unknown resources remain denied, execution cannot escape its resource grant, and the completed Browser work returns into the existing review/validation lifecycle. Codex remains available as the existing fallback implementation path during bootstrap, but Browser-to-Codex delegation is not required to declare this MVP reached.

## Sequenced Roadmap

### Stage 0 — Reconcile Current Baseline and Establish Development Ground Zero

Preserve the accepted current implementation and turn the current dirty reconstruction worktree into a clean, reviewable baseline. Do not reconstruct deleted Phase 01–08 history.

Required work:

- reconcile pending source/test/planning changes and historical deletions against the approved current baseline;
- align active repository instructions and README material with current single-file canonical artifacts, live MCP/provider architecture, current package scripts, and the approved V1 scope;
- verify that the prompt-to-Harness repair is complete across active production prompt generators and focused tests;
- use the existing development-environment path to verify Git, Node.js/npm, and any other capability actually required by the current build; provision managed missing capabilities before validation rather than assuming machine readiness;
- install repository dependencies from the existing lockfile using the normal npm bootstrap when needed;
- run the current approved validation lane, including typecheck, build, focused/production-path tests as applicable, full test at the integration gate, and an appropriate launch/integration smoke;
- preserve current OAuth/client continuity and public MCP configuration without committing credentials or local paths;
- establish an Operator-approved clean Git baseline through the existing development path. This stage must not depend on the not-yet-built future Harness Git-mutation service.

Exit condition: the repository has a clean, understood baseline; current production paths are freshly validated; required base development capabilities are verified ready or explicitly external; and stale documentation no longer contradicts the active architecture in ways that could misdirect later model workers.

### Stage 1 — Persistent Workspace and Resource Authority

Replace selected-project coupling as the generic Harness repository authorization model while preserving desktop selection as workflow context.

Required work:

- create an application-owned persistent registry of Harness repositories with stable `workspaceId` and canonical root;
- resolve generic repository/Git inspection calls from explicit registered workspace identity rather than foreground selection;
- preserve selected-project equality only for operations whose workflow semantics genuinely require the active project;
- deterministically reject unknown workspace IDs, path escapes, stale registrations, and ambiguous identities;
- expose resource registration/status through a Settings surface that is clearly separate from project selection;
- migrate the existing selected-project MCP behavior without creating dual resource authority.

Exit condition: Browser ChatGPT can read an authorized registered repository by explicit workspace ID while another project is selected in the desktop UI, and the same call against an unregistered ID is denied.

### Stage 2 — Provider-Neutral Capability, Session, and Grant Kernel

Generalize the current tool registry into shared application-owned capabilities and establish session/task resource identity before broad execution is exposed.

Required work:

- define stable capability/action contracts with schemas, mutation classification, required transport scope, resource requirements, timeout/cancellation semantics, health, and evidence;
- retain existing repository/artifact/diagnostic services as implementations behind the shared capability model rather than duplicating them for each provider;
- introduce application-owned agent session identity, provider/thread correlation, workflow context, authorized workspace IDs, future filesystem-root IDs, execution authority, Work Card/task identity, active runs, pending input, and completion state;
- persist the minimum state required for reliable remote/session operation and future restart recovery without prematurely introducing a database when simpler application-owned storage is sufficient;
- separate OAuth transport scope, Harness resource authority, future role authority, and current task/workflow authority.

Exit condition: Browser, Codex, and future local workers can be represented by the same session/resource/capability contracts even though only Browser direct implementation is required at the next MVP stage.

### Stage 3 — Bounded Host Filesystem Roots

Add non-repository resource access only where real development work requires it.

Required work:

- allow the Operator/application to register bounded filesystem roots with stable IDs and explicit read/write policy;
- use root-relative paths and realpath/reparse containment; model-supplied absolute paths must not create authority;
- provide a deliberately small filesystem capability set for inventory, stat/hash, bounded reads, and authorized writes;
- distinguish repository authority from auxiliary filesystem authority in session/task grants and diagnostics.

Exit condition: a task can use an explicitly authorized auxiliary root without receiving whole-drive or whole-profile access, and paths outside the configured root are denied.

### Stage 4 — Generic Local Execution Service

Implement the minimum capability that turns Browser ChatGPT from a repository editor into a coding Implementer.

Required work:

- create structured execution operations for capability discovery, start, status, bounded output retrieval, input, and cancellation;
- represent program and argument arrays explicitly rather than using unrestricted shell strings as the policy boundary;
- bind working directories to an authorized workspace/root and active task/session grant;
- support short commands and long-running development processes, streaming stdout/stderr, bounded cursors, timeout, stdin when required, and deterministic cancellation;
- own child-process trees and prove cleanup on cancel, timeout, app shutdown, and failed startup;
- inherit refreshed environment state and route genuine elevation through the existing Windows/UAC boundary;
- capture executable, arguments, working directory, authority identity, times, exit state, output, timeout/cancel reason, and cleanup status as durable evidence;
- keep execution authority independent of OAuth `files.write`, repository write authority, and Git mutation.

Exit condition: an authorized Browser session can run the repository's real typecheck/build/test or equivalent Work Card commands and cannot run them from an unauthorized working directory or resource.

### Stage 5 — Expose the Existing Development-Environment System Through the Harness

Reuse the accepted environment subsystem instead of creating provider-specific installation logic.

Required work:

- expose inspect/ensure/resolve/status operations over the existing requirement, provider-resolution, provisioning, UAC, refresh, and verification path;
- allow Browser implementation to request a declared missing managed capability and receive structured readiness evidence;
- preserve explicit external provisioning for capabilities that approved evidence assigns outside ChampCity;
- ensure a successful installation refreshes the execution environment used by subsequent commands.

Exit condition: a Browser implementation can encounter a missing declared managed capability, pass it through the existing ChampCity environment path, and continue only after deterministic verification reports readiness.

### Stage 6 — Context Packs, Skills, Observability, and Evidence

Provide models with task-relevant state without dumping the complete repository/planning history into every turn.

Required work:

- build bounded Project, Phase, Work Card, repository-instruction, resource, environment, and execution context packs;
- include current repository-local instructions such as `AGENTS.md` and validation guidance only after baseline reconciliation establishes their current status;
- define reusable skills for implementation, build-failure diagnosis, environment resolution, Implementer Report creation, bounded repair, evidence review, and validation;
- record chronological provider/model/reasoning, session, resource grant, tool, execution, input, worker, and completion evidence;
- provide useful Operator-facing status first and progressively disclose raw diagnostics rather than flooding the primary workflow UI;
- ensure diagnostic exports exclude secrets and repository source unless expressly selected.

Exit condition: a model can explain which task, resources, capabilities, commands, and evidence belong to an implementation session, and the Operator can diagnose failures without reconstructing a transcript manually.

### Stage 7 — Direct Browser ChatGPT Implementer MVP Pilot

Use Browser ChatGPT directly, with no worker delegation, to implement one small real noncritical ChampCity Work Card through the new Harness.

Required proof:

- correct Approved Work Card and project/phase context;
- explicit registered-workspace targeting independent of foreground project selection;
- repository list/read/search/write/patch through ChampCity-owned capabilities;
- auxiliary filesystem access only if the Work Card actually needs it;
- real local build/test/debug execution through the new execution service;
- environment establishment through the shared environment path if a required capability is missing;
- bounded, chronological evidence and clear failure states;
- Implementer Report body created through application-owned artifact authority;
- existing review, repair, validation, and Operator decision workflow remains authoritative.

Exit condition: the direct Browser implementation passes its technical acceptance and returns to normal ChampCity review without developer-side shortcuts. This is the Browser Implementer MVP boundary, not V1 completion.

### Stage 8 — Browser and UI Validation Capability

Add the V1 application-owned UI validation path after generic execution and direct Browser implementation are proven.

Required work:

- select Playwright or an equivalent backend consistent with the approved architecture;
- add only the repository dependency/runtime prerequisites required by that choice and use the development-environment path where host provisioning is needed;
- expose navigation, DOM inspection, form interaction, screenshot evidence, console errors, failed network requests, and Electron/web-renderer validation where technically appropriate;
- preserve the Operator acceptance boundary: automated UI validation is implementation evidence, not human product approval.

Exit condition: an authorized session can validate a representative renderer-visible path and return reproducible evidence through ChampCity without relying only on source-string assertions.

### Stage 9 — Codex Specialist/Fallback Worker Delegation

Adapt the accepted Codex App Server implementation into the shared worker/session model rather than creating a second workflow authority.

Required work:

- expose bounded delegate/status/result/cancel operations backed by the existing Codex transport;
- pass explicit task, preservation constraints, forbidden changes, resource grants, execution authority, required validation, and evidence contract;
- correlate Codex thread/turn activity and returned evidence to the Browser parent session and Work Card;
- prevent delegated workers from broadening resource grants or changing parent workflow/disposition authority;
- preserve direct Codex fallback capability for cases where Browser implementation cannot proceed.

Exit condition: Browser ChatGPT delegates one narrowly scoped task to Codex, evaluates the correlated result/evidence, and completes responsibility for the parent Work Card.

### Stage 10 — Browser-Primary Dogfood Cutover

After the direct Browser pilot and Codex delegation path are stable, make Browser ChatGPT the primary Implementer for subsequent ChampCity A/I Work Cards while retaining Codex as specialist/fallback.

Required work:

- use ChampCity itself to plan, implement, review, repair, validate, and close subsequent Harness Work Cards;
- accumulate real execution/evidence history instead of constructing artificial demonstrations;
- verify that remote/mobile Browser access remains resource-bound and independent of the visible selected project;
- use failures from real dogfooding to refine capability contracts rather than bypassing the Harness.

Exit condition: multiple substantive ChampCity Work Cards complete through the Browser-centered path with the existing workflow and Operator authority intact.

### Stage 11 — Bounded Local-Model Worker

V1 requires a local-model worker for lower-reasoning/mechanical tasks, but the provider/runtime is not yet selected.

Required work:

- choose the local-model provider/runtime based on bounded V1 task needs, local Windows support, machine requirements, tool/function integration, and validation behavior;
- declare and verify/provision the chosen runtime as a development capability before dependent tests;
- adapt the provider to the same capability, session, task-grant, context, worker, cancellation, and evidence contracts;
- initially restrict tasks to low-entropy work such as exact renames, schema/import propagation, repetitive pattern-based tests, bounded metadata changes, or mechanical refactors with deterministic validation;
- require parent Browser review and deterministic tests before accepting worker output.

Exit condition: a local worker completes at least one appropriately bounded task, cannot exceed its grants, and returns correlated evidence that the Browser parent can evaluate.

### Stage 12 — Non-Gating Git Lifecycle

Turn the currently partial Git toolbox into normal observable development infrastructure without converting routine Work Card execution into repeated approval prompts.

Required work:

- retain working status/diff/pre-commit inspection and implement real bounded branch/history inspection;
- implement stage, commit, restore/conflict inspection, branch/checkpoint, and local integration operations under explicit Work Card/task authority;
- add pull/push only when the active repository has an applicable remote and the operation is authorized;
- replace the current production `gitMutationAuthorized: false` dead end with task-aware authorization that allows routine in-scope Git operations while still surfacing destructive/conflicting conditions;
- preserve secret/path safety scans and observable staged-diff evidence;
- ensure local Git remains fully useful without any remote.

Exit condition: an authorized Work Card can create the intended local Git checkpoint/commit flow without repeated artificial approval gates, while unrelated/destructive mutation remains denied or surfaced for explicit resolution.

### Stage 13 — Optional GitHub Remote Provider

Add GitHub as the supported V1 remote provider behind a replaceable provider boundary.

Required work:

- define a remote-provider interface separate from core local Git lifecycle;
- support a `no remote provider` configuration as a first-class valid state;
- configure GitHub authentication through Settings using protected application storage rather than repository artifacts or model-visible context;
- provide the remote operations actually required for V1 repository synchronization and diagnostics;
- treat GitHub unavailability/authentication failure as a scoped remote failure, not as a blocker to unrelated local development.

Exit condition: one repository can operate local-only and another can use configured GitHub remote operations through the same core Git lifecycle without GitHub-specific assumptions leaking into workflow authority.

### Stage 14 — Optional Background Harness Runtime

Allow authenticated Harness availability when the visible ChampCity desktop window is closed, controlled by the Operator.

Required work:

- select the Windows background-runtime mechanism as an engineering decision based on lifecycle, installation, update, and protected-credential requirements;
- add a Settings enable/disable control and clear service health/state;
- preserve the same OAuth, workspace/root registry, task/session grants, and containment rules used in foreground operation;
- define startup, shutdown, upgrade, failure recovery, active-session handling, cancellation, and owned-process cleanup;
- ensure closing the UI does not silently broaden or retarget an active remote session.

Exit condition: an Operator-enabled background Harness survives foreground UI closure, serves authenticated authorized resources, and shuts down/restarts deterministically without orphaning owned processes.

### Stage 15 — Model/Reasoning Selection and Practical Quota/Cost-Aware Routing

Implement the V1 routing requirement using explicit evidence-backed rules, not a learned router.

Required work:

- represent provider/model/reasoning-level capabilities and Operator preferences in configurable application-owned state;
- collect provider-exposed usage, latency, success/failure, retry, and validation evidence where available;
- route or recommend based on task type, capability, reasoning need, quota/cost preference, latency, demonstrated reliability, and available worker resources;
- retain Browser ChatGPT as the primary high-reasoning orchestrator and allow Operator override of automated choices;
- use Codex and the local worker only where their bounded capabilities provide material value;
- make routing decisions observable and reversible.

Exit condition: representative tasks can select among available model/reasoning/worker options according to explicit V1 policy, an Operator can override the choice, and routing evidence can be reviewed for whether delegation actually saves quota/cost without unacceptable rework.

### Stage 16 — Windows V1 Productization

Convert the dogfooded application into a public-release-quality Windows product usable by a non-programmer.

Required work:

- select and integrate the smallest appropriate Windows packaging/installer/update mechanism; establish any repository or machine prerequisites before building against it;
- provide first-run onboarding for AI-provider access, Harness configuration, public/remote access prerequisites, initial workspace registration, Git/local-only or optional GitHub setup, and relevant diagnostics;
- store provider, OAuth, GitHub, and other secrets using Windows-appropriate protected application storage;
- expose understandable diagnostics for missing development prerequisites, authentication failures, resource configuration, Harness health, background-service state, and provider problems;
- support deterministic application update and uninstall behavior, including background-runtime/service cleanup and protection of user project repositories;
- align README/operator documentation with the actual shipped architecture and workflow.

Exit condition: a non-programmer can install, configure, start, diagnose, update, and uninstall ChampCity A/I on the supported Windows target without development-tool expertise, while local projects and credentials remain correctly protected.

### Stage 17 — Integrated V1 Acceptance and Release

Run acceptance as a whole-system proof rather than as a collection of subsystem assertions.

Required proof includes:

- the existing Project/Phase/Work Card/Repair/Validation lifecycle and canonical artifact model remain functional;
- registered repositories are addressable independently of foreground selection and unknown/out-of-root resources are denied;
- Browser ChatGPT can read, search, write, patch, build, test, debug, and produce implementation evidence through ChampCity-owned capabilities;
- generic execution is resource-bound, observable, cancellable, and cleaned up deterministically;
- the existing environment service establishes a missing managed capability when encountered;
- automated Browser/UI validation supplies reproducible evidence for a representative user-visible path;
- Codex delegation and local-model delegation each complete an appropriate bounded task and return correlated evidence;
- Git functions as normal non-gating local infrastructure, local-only repositories remain valid, and configured GitHub remote operations work without making remote availability a universal gate;
- background Harness operation preserves authentication/resource boundaries and foreground closure does not retarget sessions;
- model/reasoning routing follows practical V1 policy and supports Operator override;
- installer, onboarding, diagnostics, update, and uninstall work on the supported Windows release path;
- shutdown/cancellation cleans up owned processes and session state predictably;
- current automated regression suites and required production-path validation are green;
- ChampCity A/I itself completes substantive work through the expanded Harness; and
- at least one separate real project already being developed through ChampCity A/I completes a substantive release-oriented development cycle, proving the architecture is not accidentally specialized to ChampCity's own repository.

Exit condition: the Operator can credibly treat the result as ChampCity A/I V1 suitable for public user testing/release, not merely as a working AI coding prototype.

## Post-MVP Roadmap

After the Stage 7 Browser Implementer MVP, the remaining V1 work is deliberately broader than coding enablement. Stages 8–17 harden the product into the confirmed release boundary:

- Browser/UI validation converts renderer-visible claims into reproducible application-owned evidence.
- Codex worker delegation adds bounded specialist capability without creating a second workflow authority.
- Browser-primary dogfooding proves that the Harness works repeatedly on its own continuing development.
- The local-model worker completes the V1 three-tier worker model for bounded mechanical work.
- Git becomes routine non-gating development infrastructure, followed by optional GitHub remote support behind a provider abstraction.
- Background Harness operation makes authenticated remote/mobile access viable independently of the visible desktop UI.
- Practical model/reasoning routing makes quota, cost, latency, task complexity, capability, and Operator preference explicit orchestration concerns.
- Windows packaging, onboarding, diagnostics, updates, and uninstall turn the engineering system into a usable product.
- Integrated acceptance on ChampCity plus a separate real project closes V1.

Dogfooding should not wait for all post-MVP features. Once Stage 7 proves direct Browser implementation, subsequent stages should be implemented through the new Browser-centered Harness whenever the capability required for that Work Card already exists. Codex remains the bounded fallback for gaps until the Browser path can handle them.

## Deferred and Conditional Work

The following work is beyond V1 unless new approved evidence establishes it as a prerequisite:

- macOS or Linux product releases and cross-platform development-environment provisioning;
- team/multi-user collaboration, shared organizational administration, or enterprise governance;
- cloud-hosted execution, hosted ChampCity workers, or remote compute infrastructure;
- a required second non-OpenAI high-reasoning orchestrator;
- GitLab, Bitbucket, self-hosted Git, or other remote-provider integrations beyond the V1 GitHub provider;
- specialized intake/workflow variants for every project archetype, including purpose-built feature-addition, game-mod, repair, or refactor entry modes where the general lifecycle remains sufficient;
- a full native Windows computer-use clone;
- advanced predictive, learned, or self-optimizing model routing beyond explicit practical V1 rules;
- unrestricted whole-drive or whole-user-profile model access;
- automatic creation of governance/risk-review gates that can overrule the Operator or repeatedly reauthorize routine Work Card execution;
- undocumented post-V1 feature ideas until they are captured and deliberately admitted to scope.

Broad external MCP federation is conditional. V1 requires working Browser/UI validation and optional GitHub integration, but it does not require a generic federation manager if those capabilities can be implemented cleanly through application-owned adapters. Implement a minimal external-MCP lifecycle only when the selected V1 backend or a real project need demonstrates that federation is the appropriate dependency.

Managed public tunnel/DNS lifecycle is also conditional. Remote Browser ChatGPT access is a V1 capability and the current public MCP endpoint is an existing operational dependency, but approved scope does not require ChampCity to become its own tunnel/DNS provisioning platform. Productization should either document/configure the external prerequisite clearly or bring a bounded mechanism into the application only if release usability requires it.

## Dependencies and Constraints

The roadmap is governed by the following dependencies and constraints:

- **Current source over stale planning:** production source and current tests determine what exists. `CURRENT_APPLICATION_BASELINE.md` is condensed evidence; `FUTURE_APPLICATION_DESIGN.md` is forward intent. Historical files do not become authority merely because they are older or more detailed.
- **No historical reconstruction requirement:** deleted or missing Phase 01–08 artifacts and superseded governance are not backlog. Baseline cleanup must not restore obsolete architecture to satisfy old documents or tests.
- **Existing lifecycle preservation:** future Harness work extends the current Project/Phase/Work Card/Repair/Validation system. Models remain participants; ChampCity remains the system of record and definition-of-done authority; the Operator retains final product/disposition authority.
- **Machine readiness precedes dependent work:** Git is verified operational. Node.js/npm and future stage-specific tools must be probed through the existing development-environment mechanism before use. Managed missing capabilities are project work; explicitly external capabilities remain external and must be reported as such.
- **Repository readiness precedes dependent work:** use the existing npm/package-lock dependency mechanism. Add Playwright/equivalent, local-model runtime adapters, installer tooling, or other dependencies only in the Work Card that actually requires them and only after the architecture choice is made.
- **Project-local instructions matter but require reconciliation:** `AGENTS.md` and repository validation/boundary documents remain implementation guidance, while stale foundation-era statements must be corrected or explicitly superseded so they do not contradict current V1 authority.
- **Resource authority before broad execution:** persistent workspace IDs, bounded roots, session/task grants, and containment must exist before generic Browser process execution is exposed.
- **Execution is independent authority:** repository writes or OAuth `files.write` do not imply process execution, Git mutation, elevation, or host-wide filesystem access.
- **One environment system:** Browser, Codex, and local workers must use the existing ChampCity environment detection/resolution/provisioning path rather than building provider-specific installers.
- **One capability/service implementation:** provider adapters should expose shared application-owned capabilities. Do not create separate repository, filesystem, Git, execution, environment, artifact, or evidence services for Browser, Codex, and local models.
- **Authentication is not task authorization:** the existing OAuth boundary remains required for public MCP access. Resource grants and Work Card/session authority operate above OAuth.
- **Secrets remain outside project artifacts:** AI-provider credentials, OAuth values, GitHub credentials, public-endpoint credentials, and similar secrets must use protected application storage and must not be copied into planning documents, repositories, ordinary diagnostics, or model context without a narrowly required operation.
- **Windows is the V1 platform:** internal contracts may remain portable where inexpensive, but V1 validation, environment provisioning, background runtime, packaging, update, and uninstall are Windows requirements. UAC remains an Operator/OS boundary.
- **External services are fallible:** Browser ChatGPT/model providers, Codex behavior, GitHub, MCP/OAuth clients, public endpoint infrastructure, and browser automation can drift or fail. Provider-neutral contracts and scoped failures must prevent unrelated local work from becoming blocked.
- **Git is infrastructure, not a governance gate:** routine in-scope Git actions should become observable automatic development operations under task authority. Conflicts, destructive conditions, unavailable remotes, or authentication failures are surfaced as real conditions rather than reasons to require repeated generic approval.
- **Validation must trace the production path:** service/unit tests support evidence but do not alone prove renderer-visible or external integrations. Use typecheck/build/tests, production-path coverage, appropriate launch smoke, real MCP/provider evidence, automated UI validation where authorized, and distinct Operator acceptance.
- **MVP is not V1:** the direct Browser Implementer pilot is the minimum dogfooding cutover. V1 remains incomplete until worker delegation, local-model support, Git/GitHub, background operation, practical routing, Windows productization, and integrated external-project proof are complete.
- **Work must remain decomposed:** each stage should become concise evidence-based Work Cards under the repository-retained Work Card/Repair Card standard. The full Harness architecture must not be compressed into a single implementation assignment.
