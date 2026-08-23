<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "project-architect-interview",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
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
    "reviewedAt": "2026-08-23T04:42:08.811Z"
  }
}
CHAMPCITY-METADATA -->

# Project Architect Interview

## Project Understanding

ChampCity A/I is an existing local-first Windows desktop application for structured AI-assisted software development. It already owns the Project → Phase → Work Card → Repair → Validation lifecycle, canonical planning artifacts, development-environment preparation, implementation-provider execution, evidence capture, and an Agent Harness/MCP runtime.

This project is not a greenfield rebuild and is not an attempt to reconstruct the application's incomplete historical development chronology. Current source code and tests are the primary evidence of what ChampCity A/I implements today. The current-state baseline and future-design documents should be used to reconcile what exists now against what remains to be built.

The principal development objective is to expand the ChampCity-owned Agent Harness so AI models can perform substantially more of the software-development lifecycle through application-owned tools and execution services while the existing workflow model remains intact. The project completion boundary is the ChampCity A/I V1 release, not merely an intermediate Browser ChatGPT dogfooding milestone.

ChampCity A/I is intended to help a non-programmer turn a software idea into a disciplined, release-quality implementation. Its purpose is specifically to avoid ad hoc "vibe coding" by guiding the Operator through structured product definition, architecture, planning, bounded implementation, evidence collection, review, repair, validation, and completion.

The long-term product vision is broader than V1: a user should eventually be able to bring essentially any software-development idea into ChampCity A/I and receive an appropriate structured path to fruition. V1 should preserve that technology- and project-type-agnostic direction even where specialized intake experiences are deferred.

## Users and Primary Workflows

The primary V1 user is a single non-programmer Operator working on their own development workstation. ChampCity A/I is not intended to become a team-collaboration or enterprise project-management platform.

The principal workflow is:

1. The Operator defines a project and its intended outcome through ChampCity A/I.
2. The Architect reviews available evidence, advises the Operator, resolves ordinary technical decisions, and structures the project without transferring unnecessary engineering choices to a non-programmer.
3. ChampCity A/I owns the canonical Project, Phase, Work Card, Repair, and Validation lifecycle and supplies the current approved context to model workers.
4. Browser ChatGPT acts as the primary high-reasoning development orchestrator and Implementer through ChampCity-owned repository, filesystem, execution, environment, context, evidence, and artifact capabilities.
5. Browser ChatGPT may delegate bounded specialist work to Codex and bounded mechanical work to local models when appropriate.
6. ChampCity records execution evidence, implementation results, and canonical artifacts and returns review and validation decisions to the Operator.
7. The Operator remains the final authority over product intent, approvals, disposition, and whether work proceeds.

The application should also support remote Browser ChatGPT use through its public authenticated MCP endpoint. Remote resource access must not require the matching project to be selected in the foreground desktop UI.

## Scope

V1 scope includes the currently defined future Agent Harness architecture and the productization necessary to release ChampCity A/I as a usable Windows application.

In scope are:

- reconciliation of the current implemented application against the intended future architecture without recreating missing historical phases or Work Cards;
- preservation of the existing Project → Phase → Work Card → Repair → Validation workflow and role model unless a specific future planning decision authorizes a change;
- persistent multi-workspace resource authority independent of the desktop-selected project;
- bounded, explicitly configured non-repository filesystem roots;
- provider-neutral Harness capability and agent-session contracts;
- generic local execution suitable for real build, test, debug, development-server, and related development operations;
- reuse of the existing development-environment capability system through the Harness rather than creation of a second provisioning path;
- context packs and reusable skills that provide task-relevant project, phase, Work Card, repository, resource, environment, and execution context;
- Browser ChatGPT as the primary V1 high-reasoning orchestrator and implementation provider;
- Codex as a bounded specialist/fallback worker;
- local-model workers for lower-reasoning, mechanical, or deterministic tasks;
- worker delegation, correlation, evidence return, cancellation, and parent-session integration;
- Browser/UI validation capability, initially using an appropriate browser automation backend such as Playwright;
- observability and evidence sufficient to understand model, tool, execution, worker, and workflow activity;
- remote Browser ChatGPT access to Harness-authorized resources without coupling generic MCP authority to the foreground desktop-selected project;
- optional background-service operation of the Harness so authorized MCP access can remain available when the visible ChampCity desktop window is closed;
- a Settings control that allows the Operator to enable or disable background Harness operation;
- Git as a normal part of the ChampCity development substrate, including routine repository state management, checkpoints/commits, branch operations, remote synchronization, and related development-cycle operations where applicable;
- Git behavior designed as observable development infrastructure rather than an approval gate that repeatedly interrupts otherwise authorized work;
- optional remote Git hosting through a provider abstraction;
- GitHub as the supported V1 remote provider configured through Settings;
- a "no remote provider" option so local Git development remains fully viable without GitHub;
- internal remote-provider boundaries that leave room for GitHub alternatives in later releases;
- model and reasoning-level selection as part of Harness orchestration;
- practical quota/cost-aware routing that considers task complexity, demonstrated capability, latency, provider consumption, and configured Operator preferences;
- Operator-configurable model/reasoning preferences and the ability to override automated choices;
- Windows V1 installation, first-run setup, AI-provider configuration, Harness configuration, initial workspace registration, useful prerequisite diagnostics, update handling, and uninstall behavior;
- integrated dogfooding of ChampCity A/I through the expanded Harness; and
- end-to-end proof through at least one separate real project already being developed through ChampCity A/I.

V1 should be architecturally technology- and project-type agnostic. Desktop applications, web applications, command-line tools, utilities, libraries, game mods, and other repository-based software should not be excluded by hard-coded framework assumptions even if specialized project-entry workflows are not yet available.

## Non-Scope

ChampCity A/I is not intended to become a team collaboration product, shared organizational development platform, or enterprise governance system.

The following are outside the V1 completion boundary unless later evidence shows that one is a prerequisite for V1 operation:

- macOS or Linux release support;
- cloud-hosted execution infrastructure or hosted ChampCity workers;
- team/multi-user collaboration, shared project administration, or enterprise role management;
- autonomous architecture authority that can override the Operator;
- a generic governance engine, semantic risk-review layer, or approval system that turns normal development actions into repeated authorization gates;
- unrestricted whole-drive or whole-user-profile filesystem access by default;
- a full native Windows computer-use clone;
- a requirement to support a second non-OpenAI high-reasoning provider at V1 release;
- sophisticated learned or predictive routing beyond practical V1 cost/quota-aware model and worker selection;
- remote Git providers other than GitHub;
- mandatory use of any remote Git provider;
- specialized intake/workflow variants for every development archetype;
- purpose-built V1 intake modes for feature additions to existing software, game mods, repair/refactor projects, or other specialized project forms where the existing project intake can still support the work;
- automatic inference of project-domain requirements from unrelated Operator context; and
- additional post-V1 features that have not yet been documented or accepted into the V1 scope.

## Constraints

ChampCity A/I is an existing application. Current working behavior should be preserved unless current planning explicitly authorizes a change.

Current production source and tests are the primary evidence of implemented behavior. The current application baseline is a condensed current-state description derived primarily from source inspection. The future application design is forward-looking and must not be treated as evidence that future capabilities already exist.

Historical planning is intentionally incomplete. Missing Phase 01–08 artifacts and other superseded or removed historical documents are not defects to reconstruct. Reconciliation must focus on what exists now and what remains to reach V1.

The existing workflow and role model should not be replaced merely because the Harness is expanding. This project is primarily a Harness and productization expansion around the existing application lifecycle.

Operator authority is a core constraint. ChampCity should structure work, surface evidence, recommend next actions, and make defects or incomplete proof visible, but it must not become an autonomous gatekeeper over the Operator. Previous authority-gating approaches that impeded otherwise valid development must not be reintroduced through Git, execution, model routing, or Harness resource management.

V1 is Windows-only. Platform-neutral internal contracts are desirable where they do not add material complexity, but macOS/Linux validation is not a release requirement.

ChampCity remains local-first. Canonical project artifacts, workflow state, repository state, execution evidence, Harness configuration, and local-model work should remain local unless an explicitly configured external provider or integration requires transmission.

The public MCP endpoint and OAuth infrastructure are existing requirements for Browser ChatGPT access. Harness expansion must preserve that authenticated boundary while extending available capabilities.

## Key Decisions

- Project completion is the V1 release boundary and includes the full currently envisioned Harness target, including local-model workers and routing intelligence.
- The product is designed for a single non-programmer Operator, not for team collaboration.
- The V1 quality target is software that can credibly be released to the public, not merely hobby-grade prototypes.
- ChampCity A/I remains technology- and project-type agnostic in architecture.
- The existing workflow and role model remain the governing foundation; the current project primarily expands the Harness around them.
- The Architect should advise, recommend, and own ordinary technical decisions; the Operator retains final product and disposition authority.
- ChampCity should not create a generic lifecycle bypass model or, conversely, an autonomous approval gate that can prevent an Operator from proceeding solely because the application disagrees.
- Browser ChatGPT is the primary V1 high-reasoning orchestrator.
- Codex remains a specialist/fallback worker.
- Local models are included in V1 for bounded mechanical or lower-reasoning work.
- Provider neutrality is required at the Harness architecture level, but V1 does not require a second non-OpenAI high-reasoning provider.
- Model choice and reasoning level are explicit orchestration concerns because token, quota, latency, and cost consumption differ across models and reasoning modes.
- V1 includes practical cost/quota-aware routing with Operator preferences and overrides; advanced predictive optimization is deferred.
- The Harness may run as an optional background service controlled through Settings.
- Desktop-selected project state is workflow context and must not be the universal authorization boundary for generic MCP resources.
- Git is part of the normal development lifecycle and should operate as observable background infrastructure, not as a recurring authorization gate.
- GitHub is the supported V1 remote provider but remains optional.
- "No remote provider" is a supported V1 configuration.
- Remote Git hosting should be represented behind a provider abstraction so alternatives can be added later.
- V1 requires a normal Windows installation and onboarding experience suitable for a non-programmer.

## Architect Recommendations

Preserve the current lifecycle and authority model and focus project planning on the missing Harness capabilities and productization gaps rather than reopening settled governance design.

Treat ChampCity as the durable owner of workflow state, canonical artifacts, resource grants, environment services, tool contracts, execution lifecycle, evidence, session identity, and definition of done. Models should remain replaceable reasoning and implementation workers operating inside those boundaries.

Separate foreground workflow selection from Harness resource authority. Generic repository, filesystem, and execution capabilities should resolve explicit registered resources and session/task grants rather than implicitly using the currently selected desktop project.

Make execution a first-class application-owned service with structured program/argument requests, bounded working-directory authority, streaming output, timeout, cancellation, process-tree cleanup, and durable evidence. Do not use generic shell access as an accidental substitute for resource policy.

Preserve the existing authenticated MCP/OAuth boundary and apply resource restrictions inside the Harness. Do not solve Browser coding by granting whole-machine authority.

Implement the background Harness runtime as an Operator-controlled setting. Background availability must not broaden resource permissions and must have clear lifecycle, startup, shutdown, health, and diagnostic behavior.

Reintroduce end-to-end Git support as routine development infrastructure. Normal Git actions covered by the current project/task should not require repeated human approval. Genuine failures, conflicts, destructive conditions, or unavailable remotes should be surfaced clearly without converting remote-service state into an artificial development gate.

Represent Git hosting as a provider capability. Support GitHub in V1 and local-only Git when no remote is configured. Avoid architecture that assumes every repository has or must have a GitHub remote.

Keep high-reasoning provider support replaceable. Browser ChatGPT can be the V1 primary orchestrator without making core Harness capabilities, context, evidence, or session state ChatGPT-specific.

Use the strongest model only where its reasoning value justifies the associated quota or cost. Delegate deterministic or low-entropy work to less expensive reasoning levels, Codex, or local models where validation can bound the risk. Capture enough usage and performance evidence to determine whether routing actually reduces resource consumption.

Do not require a sophisticated self-learning router for V1. Begin with explicit capability, task-type, reasoning-need, and configured cost/quota rules plus Operator override, then improve routing after real execution evidence exists.

Use current ChampCity A/I development and existing external dogfooded projects as integrated proof rather than constructing artificial demonstration projects.

## Data and Integration Requirements

ChampCity A/I must continue to treat repository-backed canonical Markdown as the durable source for project workflow artifacts and revision/disposition evidence.

The Harness requires persistent application-owned data for at least:

- registered repository/workspace identities and canonical roots;
- configured non-repository filesystem root identities and access policy;
- foreground workflow context separately from model resource authority;
- agent/provider session identity and provider thread correlation;
- task/Work Card identity and granted resources;
- execution lifecycle, command evidence, output cursors, cancellation, and completion state;
- worker delegation identity and returned evidence;
- configured model providers, model choices, reasoning levels, routing preferences, and relevant capability state;
- background-Harness enabled/disabled state and service health;
- Git configuration and repository state needed for lifecycle operations;
- optional remote Git provider configuration; and
- diagnostic and observability records sufficient to explain actions and failures.

Browser ChatGPT integration continues through the ChampCity-owned public MCP endpoint and existing OAuth infrastructure. Browser ChatGPT must be able to address Harness-registered repositories explicitly even when another project is selected in the desktop UI.

Codex App Server remains an implementation integration and should be exposed through a bounded worker/fallback contract rather than operating as a second source of workflow authority.

Local-model integration should use the same application-owned capability, context, worker, and evidence concepts rather than a parallel provider-specific workflow.

The development-environment system should be exposed through the Harness so all providers use the same detection, resolution, installation, refresh, and verification path.

Git integration must support local repositories without any remote. When configured, the V1 remote provider is GitHub. Provider-specific authentication and operations should remain behind a replaceable remote-provider boundary so later GitHub alternatives do not require redesign of the core Git lifecycle.

Browser/UI validation should integrate with an application-owned validation capability, initially backed by Playwright or equivalent tooling suitable for Electron/web-renderer validation.

## Security, Compliance, and Operational Considerations

The application is local-first, but V1 intentionally integrates external AI and source-control providers. Project information may leave the workstation only when an Operator-configured provider or integration requires it.

The existing public MCP endpoint must remain authenticated through the current OAuth model. Harness background operation must not create an unauthenticated or broader alternate access path.

Secrets must remain secret. OAuth credentials, AI-provider credentials, GitHub credentials/tokens, tunnel or public-endpoint credentials, and similar sensitive values must not be stored in project repositories, canonical planning artifacts, ordinary diagnostic exports, or model-visible context unless a narrowly defined operation genuinely requires their use. Windows-appropriate protected application storage should be preferred for secrets.

Generic MCP resource authority must be explicitly bounded. Registered repository workspace IDs, configured filesystem root IDs, execution availability, and later role/task/session authority should determine what the model can access. Unknown workspaces, unconfigured roots, and escaped paths should be denied deterministically.

Execution authority is independent of file-write or OAuth scope. The ability to edit a repository must not silently imply unrestricted local process execution, unrestricted Git mutation, or access outside the granted resource boundary.

Background Harness operation must have deterministic startup, shutdown, health, cancellation, and owned-process cleanup behavior. Closing the visible desktop UI must not leave unmanaged child processes or silently change the resource authority of active remote sessions.

Windows UAC remains an Operator/OS boundary when elevation is genuinely required. ChampCity should not attempt to bypass secure-desktop confirmation.

Routine authorized development operations should avoid recurring approval prompts. Security boundaries should be enforced through explicit resource configuration, authenticated sessions, bounded service contracts, and observable evidence rather than by repeatedly asking the Operator to authorize ordinary Work Card execution.

GitHub unavailability, missing remote configuration, or remote authentication failure should be visible but should not prevent valid local Git development unless the active task specifically requires the unavailable remote operation.

## Risks and Dependencies

A major risk is reintroducing authority gating under a new name. Git, execution, remote access, and worker orchestration could each become development bottlenecks if normal authorized actions require unnecessary approvals. Planning must distinguish true security/resource boundaries from workflow friction.

Multi-workspace and background remote access increase the consequence of incorrect resource routing. Explicit stable workspace identities, configured roots, session/task grants, realpath containment, and clear observability are required to prevent work from targeting the wrong repository.

Generic local execution materially increases capability and therefore operational risk. Process containment, working-directory enforcement, timeout/cancellation, child-process cleanup, elevation boundaries, and durable evidence are prerequisites for safe Browser implementation.

External-provider behavior may change. ChatGPT, Codex, MCP, OAuth, GitHub, and other provider APIs or capabilities can drift. Application-owned contracts and compatibility adapters should minimize provider lock-in.

Model-routing efficiency can fail if delegation overhead exceeds the savings from lower-cost workers. V1 must capture enough usage, latency, task-result, and validation evidence to evaluate routing decisions rather than assuming that more delegation is automatically cheaper.

Local models may vary significantly in capability and reliability. Their V1 use should begin with bounded mechanical work backed by deterministic validation.

A background Harness service adds lifecycle and installation complexity, including startup behavior, service health, upgrades, credential access, process ownership, and failure recovery.

V1 productization for non-programmers raises the quality requirement for diagnostics and onboarding. Missing prerequisites, provider authentication problems, repository configuration issues, and Harness failures must be understandable without requiring command-line debugging.

The project depends on maintaining a clean understanding of the current implemented baseline. Stale historical planning must not be allowed to override current source evidence.

## Assumptions

The existing Project → Phase → Work Card → Repair → Validation lifecycle is sufficiently established to remain the V1 workflow foundation.

The existing Architect and Operator role model is also sufficiently established: the Architect advises and makes ordinary technical recommendations, while the Operator remains final authority.

The current MCP server, OAuth, and public-facing endpoint provide a viable foundation for Browser ChatGPT connectivity and should be extended rather than replaced without evidence of a defect.

The current Windows development-environment system and Codex App Server integration are reusable foundations for the future Harness.

Existing dogfooded projects can provide meaningful V1 external-project acceptance evidence if at least one is carried through the expanded Harness and full release-oriented lifecycle.

A user may intentionally choose local-only Git operation without a remote provider.

GitHub is an appropriate first remote provider, but the core Git and workflow architecture should not depend on GitHub-specific semantics.

Provider offerings, available GPT models, reasoning levels, quotas, and consumption economics will change over time; model identifiers and routing assumptions therefore must be configurable rather than permanently hard-coded into the architecture.

The long-term goal of accepting essentially any software-development idea does not require every specialized intake/workflow variant to ship in V1.

## Deferred Decisions

The following decisions are intentionally deferred beyond V1 unless later planning establishes that they are prerequisites:

- specialized intake/workflow variants for feature additions to existing products, third-party game mods, repair/refactor efforts, and other project archetypes;
- macOS and Linux support;
- GitLab, Bitbucket, self-hosted Git platforms, or other remote Git-provider integrations beyond the V1 GitHub provider;
- support for an additional non-OpenAI high-reasoning orchestrator;
- advanced predictive or learned model-routing optimization;
- a full native Windows computer-use capability;
- cloud-hosted execution or remote worker infrastructure;
- team collaboration or multi-user project operation; and
- other post-V1 feature ideas that have not yet been documented and formally brought into scope.

## Unresolved Questions

No unresolved Operator decision currently blocks project planning.

Detailed engineering choices remain for planning, including the exact Windows background-service mechanism, persistent Harness/session-state representation, Git lifecycle/checkpoint strategy, GitHub provider contract, model-routing policy representation, local-model provider selection, installer/update mechanism, and the sequence of bounded implementation Work Cards. These are Architect-owned planning decisions unless a later choice creates a material product, cost, risk, or operational tradeoff for the Operator.

The undocumented post-V1 feature backlog should eventually be captured so future ideas remain clearly separated from V1 scope, but its absence does not block V1 planning.

## Acceptance Direction

V1 acceptance requires integrated proof rather than only isolated subsystem tests.

At minimum, acceptance should demonstrate that:

- the existing workflow and canonical artifact lifecycle remain functional after Harness expansion;
- Browser ChatGPT can receive the correct approved project/phase/Work Card context and operate as a real Implementer through ChampCity-owned capabilities;
- registered repositories can be addressed explicitly and independently of the foreground desktop-selected project;
- unknown workspaces and paths outside configured resource roots are rejected;
- Browser ChatGPT can read, search, write, patch, build, test, debug, and inspect authorized projects through the Harness without developer-side shortcuts;
- generic execution is resource-bound, observable, cancellable, and cleaned up correctly;
- the existing environment system can resolve missing managed development capabilities encountered during implementation;
- Browser ChatGPT can create the required implementation evidence and Implementer Report through application-owned artifact authority;
- Codex can receive and complete a bounded delegated task and return correlated evidence to the parent Browser session;
- a local model can complete an appropriate bounded mechanical task under the same worker/evidence framework;
- routing can select among available models/reasoning levels/workers using practical capability and quota/cost considerations while allowing Operator override;
- the Harness can remain available as an Operator-enabled background service while preserving authentication and resource boundaries;
- remote Browser ChatGPT access works without requiring the requested repository to be selected in the desktop UI;
- Git operations function as part of the development lifecycle without recurring authority gating;
- local-only Git projects remain viable with no remote configured;
- GitHub can be configured as the V1 remote provider and remote failures do not unnecessarily block unrelated local work;
- Windows installation, onboarding, provider configuration, Harness setup, diagnostics, updating, and uninstalling are usable without development-tool expertise;
- application shutdown, background-runtime shutdown, cancellation, and owned child-process cleanup are deterministic;
- existing workflow, environment, Codex, Agent Harness, and regression tests remain green; and
- ChampCity A/I itself plus at least one separate real project are successfully carried through a substantive release-oriented development cycle using the expanded Harness.

The external-project proof should demonstrate that the system is not accidentally specialized around developing ChampCity A/I itself. Existing projects already being dogfooded through the application may satisfy this requirement when one is carried through the complete expanded lifecycle.

The target result is not merely functioning AI-assisted code generation. V1 should demonstrate that a non-programmer can use ChampCity A/I to structure and execute a development effort whose resulting software is credible for public release.

## Project Planning Direction

Project Planning should begin with reconciliation of the current source-derived baseline against the future V1 architecture and should produce a forward implementation roadmap rather than reconstructing missing historical phases.

Planning should preserve accepted current behavior and identify only the deltas required to reach the confirmed V1 boundary.

The recommended sequencing is:

1. establish the clean current implementation baseline and confirm no historical reconstruction is required;
2. decouple foreground desktop project selection from generic Harness workspace authority and introduce persistent registered-workspace/resource concepts;
3. establish provider-neutral capability and session contracts that can support Browser ChatGPT, Codex, and local-model workers without parallel authority systems;
4. implement bounded filesystem-root authority where real development work requires non-repository resources;
5. build and prove the generic local execution service against explicit resource grants;
6. integrate existing development-environment capabilities into the shared Harness surface;
7. establish context packs, reusable skills, session evidence, and observability needed for reliable Browser implementation;
8. run a direct Browser ChatGPT Implementer pilot without delegation to prove repository + filesystem + execution + environment + report behavior;
9. extract the accepted Codex capability into a bounded specialist/fallback worker path and prove delegated-task evidence return;
10. introduce local-model worker support for narrowly bounded mechanical tasks;
11. restore and expand end-to-end Git lifecycle support as non-gating development infrastructure;
12. add the optional GitHub remote-provider integration through a replaceable provider boundary while preserving local-only Git operation;
13. add Operator-configurable background Harness/service operation and prove authenticated remote use independent of the visible desktop UI;
14. implement configurable model/reasoning selection and practical quota/cost-aware routing, beginning with explicit rules and evidence rather than premature predictive optimization;
15. complete Windows installer, first-run onboarding, provider setup, workspace registration, diagnostics, update, and uninstall productization;
16. dogfood subsequent ChampCity A/I Work Cards through the new Browser-centered Harness as soon as the minimum direct implementation path is proven; and
17. complete integrated V1 acceptance using ChampCity A/I and at least one separate real project already being developed through the application.

Planning should decompose these streams into concise, evidence-based Work Cards using the repository-retained Work Card standard. The entire V1 Harness architecture should not be compressed into one implementation assignment.

The durable planning principle is: ChampCity A/I owns the structured development system, resource boundaries, execution services, evidence, and model orchestration; models perform reasoning and implementation within those capabilities; and the Operator remains the final authority.
