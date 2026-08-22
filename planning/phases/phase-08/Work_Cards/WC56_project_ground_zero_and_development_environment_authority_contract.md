<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC56"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC54_codex_full_local_development_authority_and_windows_toolchain_diagnostics.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Work_Cards/WC55_selected_project_root_mcp_routing_and_prompt_policy_cleanup.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Project Ground-Zero and Development Environment Authority Contract",
    "status": "approved_for_implementation",
    "executionMode": "one systemic planning-and-implementation authority repair",
    "confirmedDefect": "ChampCity A/I can correctly recognize an implementation-empty repository while still implicitly assuming that the host development machine already contains the compilers, SDKs, runtimes, build systems, package managers, and other tools needed to execute the planned work. This allows Project Planning and Phase Planning to convert absent development capabilities into external prerequisites, after which Formal Work Cards correctly instruct the Implementer to stop rather than provision the missing capability. Ground zero must include both repository state and host development-environment state.",
    "gitMutationAuthorized": false,
    "additionalRepairAuthorized": false,
    "implementerReportPath": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC56_project_ground_zero_and_development_environment_authority_contract.md"
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "Make development-machine readiness part of project baseline authority. Required local development capabilities are project work unless explicitly classified as externally managed. Propagate that rule through planning, Work Card generation, and Implementer execution semantics.",
    "reviewedAt": "2026-08-21"
  }
}
CHAMPCITY-METADATA -->

# WC56 — Project Ground-Zero and Development Environment Authority Contract

Status: Approved for Implementer execution  
Phase: `phase-08`  
Git mutation: prohibited

## Confirmed Defect

ChampCity A/I currently distinguishes an implementation-empty repository from an implemented repository, but its planning contracts do not equivalently distinguish an unprepared development machine from a prepared one.

The current production planning prompts emphasize repository evidence, implementation state, production paths, and buildable outcomes. They do not establish a system-level rule that the local development environment itself is part of project state. As a result, an Architect can correctly choose a technology and still phrase the required compiler, SDK, runtime, build system, package manager, or development utility as an external prerequisite rather than work ChampCity is responsible for establishing.

That creates the wrong execution sequence:

```text
required capability absent
→ classify as prerequisite
→ Implementer reports blocker
→ nontechnical Operator must prepare the machine
```

The intended product sequence is:

```text
required capability absent
→ classify as project work
→ provision the capability through an approved deterministic mechanism
→ verify the capability
→ continue implementation and validation
```

WC54 already gives the embedded Implementer full local development execution authority (`danger-full-access`, `approvalPolicy=never`, network enabled). WC55 removed the obsolete prompt rules that forced repository-only tooling behavior. This defect is therefore not a sandbox or execution-policy defect. It is a planning and work-authority defect.

## Architectural Decision

For ChampCity A/I, project ground zero means the state of both:

```text
selected project repository
+
local development machine
```

Nothing beyond the usable host operating system and selected project location is assumed present unless verified.

The development environment is part of project state. Depending on the project, that state can include:

- compilers and toolchains;
- language runtimes;
- SDKs;
- build systems and generators;
- package managers;
- test runners and test infrastructure;
- platform development utilities;
- repository dependency bootstrap;
- project-local agent instructions such as `AGENTS.md` when useful;
- build, validation, and developer instructions;
- required directory/repository structure; and
- any other local capability required to build, test, run, inspect, package, or validate the approved project.

A missing required development capability is project work by default. It becomes an external prerequisite only when approved project evidence explicitly establishes that it is externally managed, licensed/provided by the Operator or organization, or otherwise outside ChampCity's authorized control.

A true human boundary is not the same as an external prerequisite. Administrator elevation, UAC confirmation, authentication, license acceptance that legally requires a person, purchase, hardware attachment, or another genuinely human action may pause automated provisioning, but ChampCity remains responsible for determining and preparing the required action and resuming afterward.

## Objective

Make the ground-zero model explicit and systemic so Project Planning establishes development-environment state, downstream planning schedules missing capabilities as foundation work, Formal Work Cards communicate machine capability requirements unambiguously, and the Implementer treats absent managed capabilities as something to provision rather than an immediate blocker.

This card defines the authority and structured contract consumed by the deterministic provisioner implemented in WC57. It does not itself build the Windows package-installation backend.

## Required Changes

### 1. Project Planning owns the ground-zero baseline

Update the Project Planning Architect prompt contract so Project Profile and Project Roadmap generation explicitly cover development-environment state in addition to repository implementation state.

Do not add new required top-level Markdown headings. Use the existing Project Profile and Project Roadmap structures.

For Project Profile `Current-State Baseline` / `Existing Implementation` / `Risks and Unknowns`, require the Architect to distinguish, when relevant and discoverable:

- verified installed development capabilities;
- verified missing development capabilities;
- unverified development capabilities;
- repository-native dependency/bootstrap mechanisms already present;
- existing project-local agent/build/validation instructions; and
- whether any required capability is explicitly externally managed.

For greenfield projects, do not equate `no implementation baseline` with `development machine ready`.

Update Project Roadmap guidance so missing development capabilities required by planned implementation are sequenced as project work before work that depends on them. When the project requires an engineering/foundation stage, that stage must establish both machine readiness and repository readiness.

Do not invent unnecessary tools merely to populate a foundation. Required capabilities must derive from approved project architecture and intended implementation work.

### 2. Phase Planning decomposes machine and repository foundation together

Update Phase Planning prompt guidance so a foundation, engineering-foundation, build-baseline, repository-foundation, bootstrap, or equivalent phase cannot silently treat its required development environment as Operator-provided.

When required capabilities are unverified or missing, Phase Planning must create candidate work that establishes and verifies them before dependent implementation work.

The Work Card Plan should normally place environment/toolchain establishment at or before the first candidate that needs those capabilities. It may be combined with repository baseline work when that remains one coherent bounded outcome.

Phase Planning must distinguish:

```text
managed capability
→ ChampCity is responsible for provisioning and verification

external capability
→ explicitly established external ownership; verify and block if absent

human-interaction boundary
→ ChampCity prepares the action, requests only the necessary human interaction, then resumes
```

Do not use phrases such as `prerequisite problem`, `Operator must install`, or equivalent merely because a development tool is absent.

### 3. Formal Work Cards carry a structured development-environment contract

Add one optional fenced JSON block contract named:

```text
champcity-development-environment
```

When a Work Card's implementation or acceptance criteria depend on a currently unverified machine-level development capability, the Formal Work Card Architect must include exactly one such block.

The version-1 shape is:

```json
{
  "schemaVersion": 1,
  "requirements": [
    {
      "capabilityId": "<stable-capability-id>",
      "versionConstraint": "<optional-version-constraint>",
      "profile": "<optional-profile>",
      "provisioning": "managed"
    }
  ]
}
```

Allowed requirement fields:

- `capabilityId`: required non-empty stable identifier;
- `versionConstraint`: optional string;
- `profile`: optional string for a named workload/toolchain profile;
- `provisioning`: required enum `managed | external`.

No installer command, download URL, absolute machine path, registry key, package-manager command, vendor bootstrap script, or executable path belongs in this Architect-owned block. The Work Card states required capability; the provisioner owns how the capability is detected, installed, configured, and verified.

`managed` is the default architectural expectation for ordinary local development tooling. `external` may be used only when approved evidence explicitly establishes external ownership or a capability cannot legally/technically be provisioned by ChampCity.

A Work Card with no machine-level requirements need not contain the block.

Add bounded validation/parsing so malformed blocks fail before implementation rather than being interpreted heuristically by the Implementer.

### 4. Formal Work Card Architect instructions must stop externalizing normal tool installation

Update the Formal Work Card prompt contract so:

- the Architect considers host development capabilities part of the authorized implementation surface when they are necessary for the Work Card;
- required managed capabilities are represented in the structured development-environment block;
- absence of a managed development tool must not be defined as automatic Work Card failure;
- acceptance criteria require successful capability verification before dependent configure/build/test/run proof;
- alternate architecture remains prohibited when the selected architecture is already approved; missing tooling means establish the selected tooling, not silently choose a different stack; and
- machine-level installation/configuration required by the approved environment is not treated as an unrelated workspace modification.

Preserve existing repository source boundaries, Work Card-specific negative constraints, and Git mutation rules.

### 5. Implementer semantics must treat missing managed capabilities as remediable work

Update the production Codex Implementer prompt so the execution rule is explicit:

```text
A missing development capability required by the Approved Work Card is not by itself a blocker when its development-environment contract marks it managed. Use the application-owned development-environment provisioning path when available, verify the capability, then continue the Work Card. Report a blocker only when provisioning itself fails after the authorized remediation path is attempted or when the requirement is explicitly external.
```

Also state:

- repository-native dependency installation/restoration is implementation work when required by the Work Card or project-local instructions;
- package/dependency absence alone is not a reason to return the task to a nontechnical Operator;
- do not install unrelated tools because they might be useful;
- provisioning authority is bounded by the Approved Work Card's required capabilities and project-local instructions; and
- a human interaction such as UAC approval is a resumable interaction boundary, not a transfer of environment setup responsibility to the Operator.

WC57 will provide the deterministic application-owned provisioning path. Until WC57 lands, do not create a second ad hoc application provisioning subsystem in this card.

### 6. Preserve model-independent installation authority

The Architect decides what development capabilities the project needs. The application-owned provisioner decides how supported capabilities are established. The Implementer consumes those capabilities.

Do not make package-download URLs, installer switches, or vendor-specific setup procedures part of planning authority unless a later capability cannot be represented by the provisioner and the Work Card explicitly authorizes a bounded exception.

Web research is not the primary installation mechanism for known provisioner-supported capabilities.

### 7. Add regression coverage across the production planning chain

Add tests proving at minimum:

- greenfield Project Planning does not imply that the development machine is already prepared;
- Project Roadmap prompt guidance requires missing development capabilities to be sequenced as work;
- Phase Planning prompt guidance treats engineering foundation as machine plus repository foundation;
- Formal Work Card prompt guidance requires the structured environment block when unverified machine capabilities are necessary;
- the version-1 environment block parser accepts the valid schema and rejects malformed fields, duplicate blocks, unknown provisioning modes, and empty capability IDs;
- an environment-free Work Card remains valid without a block;
- the Implementer prompt contains the managed-capability remediation rule; and
- existing Project Planning, Phase Planning, Work Card Planning, Codex execution, retry/cancellation, report, and lifecycle behavior remains green.

## Preserved Behavior

Preserve:

- application-selected project/repository authority;
- current Project Planning/Profile/Roadmap headings and canonical artifact ownership;
- current Phase Planning and Work Card Plan candidate schema;
- current Phase Map lifecycle mechanics;
- Work Card as sole implementation authority;
- WC54 full local Codex development execution policy;
- WC55 selected-root MCP routing and prompt-policy cleanup;
- existing secret/credential protection;
- Git mutation only when explicitly authorized;
- Architect authority over technology selection and architecture;
- evidence-driven planning rather than speculative tool installation; and
- Operator authority for genuinely Operator-owned choices.

This card does not grant the Implementer authority to install arbitrary software unrelated to the approved project.

## Authorized Surface

Expected production surface includes:

```text
src/main/projectPlanning/projectPlanningService.ts
src/main/projectPlanning/projectPlanningDraftBundle.ts
src/main/phasePlanning/phasePlanningService.ts
src/main/phasePlanning/phasePlanningDraftBundle.ts
src/main/workCardPlanning/workCardPlanningService.ts
src/main/workCardBuilding/codexImplementerExecutionService.ts
```

A shared development-environment contract/parser module under `src/shared/` and/or `src/main/developmentEnvironment/` is authorized as necessary to define and validate `champcity-development-environment` version 1.

Existing Architect output validation/catalog files may be changed only as necessary to validate the new Formal Work Card block during the normal Work Card lifecycle.

Focused tests may be updated/added across Project Planning, Phase Planning, Work Card Planning, Architect output validation, Work Card Building, and shared contract tests.

Required report:

```text
planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC56_project_ground_zero_and_development_environment_authority_contract.md
```

## Acceptance Criteria

1. Project Planning prompt guidance explicitly defines development-machine state as part of the project baseline and does not assume a greenfield host is development-ready.
2. Project Roadmap prompt guidance requires missing required development capabilities to be scheduled as project work before dependent work.
3. Phase Planning prompt guidance defines engineering/foundation work as host environment plus repository foundation where applicable.
4. Phase Planning does not instruct the Architect to treat missing ordinary development tooling as an Operator prerequisite merely because it is absent.
5. Formal Work Card generation supports exactly one optional `champcity-development-environment` version-1 fenced JSON block.
6. The environment block parser rejects malformed/duplicate blocks and accepts a valid environment-free Work Card.
7. `managed` and `external` are the only supported provisioning classifications in version 1.
8. Formal Work Card prompt guidance forbids installer commands/URLs/absolute machine paths inside the environment requirement block and keeps installation mechanics application-owned.
9. Formal Work Card prompt guidance treats necessary managed machine-level setup as authorized implementation work, not unrelated workspace modification.
10. The Codex Implementer prompt states that a missing managed required capability is remediable work and is not by itself a blocker.
11. The Codex Implementer prompt preserves the rule that only capabilities authorized by the Work Card/project instructions may be provisioned.
12. Repository-native dependency bootstrap/restore is explicitly treated as normal implementation work when required.
13. Genuine human boundaries are represented as resumable interaction points rather than instructions for the Operator to perform technical environment setup manually.
14. No new package installer/provisioning backend is introduced by WC56; that implementation remains WC57.
15. Existing prompt contracts, architect draft promotion, Work Card lifecycle, Codex execution, retry/cancellation, report readiness, and validation tests remain green.
16. `npm run typecheck`, `npm run build`, and `npm test` pass using normal ChampCity validation lanes.

## Negative Constraints

Do not:

- treat all projects as requiring the same toolchain;
- install software in WC56;
- add an arbitrary-software permission switch;
- make a user answer technical installation questions already determined by approved architecture;
- convert UAC/elevation into a requirement for the Operator to understand or select development components;
- place installer commands, package IDs, URLs, or machine paths into the version-1 capability requirement block;
- create a second Work Card schema or duplicate project authority;
- redesign unrelated UI/workflow surfaces;
- weaken actual secret/credential handling;
- weaken Work Card scope authority; or
- perform Git mutation.

## Implementer Report Requirements

Report only:

- files changed;
- exact Project Planning, Phase Planning, Formal Work Card, and Implementer prompt changes;
- the final `champcity-development-environment` schema/parser behavior;
- regression tests proving ground-zero semantics and managed/external classification;
- confirmation that WC56 introduced no installer backend;
- focused and full validation results; and
- remaining Operator validation.

End with `Document.Status=Pending`.

## Manual Validation

After automated validation, generate representative prompts for:

1. a greenfield project whose required development toolchain is unverified; and
2. an established project whose required toolchain is already verified.

Confirm the greenfield planning chain schedules development-environment establishment as project work and the established project does not manufacture redundant setup work.

Generate one representative Formal Work Card requiring an unverified managed capability and confirm it contains a valid `champcity-development-environment` block and does not tell the Operator to install the tool manually.
