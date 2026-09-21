# ChampCity A/I V2 Architecture Corpus Index

## Purpose

This index defines the reconciled architecture/governance corpus published into the `ChampCity_AI` production repository after the ChampCity A/I Desktop V1 baseline was frozen on September 14, 2026.

The corpus is now the **V2 implementation architecture baseline**. It does not claim that the frozen V1 source already implements V2. Current V1 source and characterization tests are implementation evidence and behavior baselines; the V2 documents define which behavior is preserved, extracted, replaced, or deliberately changed.

The September 13 Brain_Dump review remains pre-publication historical reconciliation evidence and is not part of the active production corpus. The final comparison and uplift are recorded in the [September 14 final reconciliation](../design-notes/history/CHAMPCITY_V2_ARCHITECTURE_FINAL_RECONCILIATION_2026-09-14.md). This index and that September 14 reconciliation supersede the older review's unresolved-status framing.

## Canonical precedence

When documents overlap, use this precedence:

1. **Operator direction for the current work**, including explicit scope and constraints.
2. **Adopted governance standards:**
   - `CHAMPCITY_GOVERNANCE_VOCABULARY.md` (`CCAI-VOCAB-001`);
   - `CHAMPCITY_AUTHORITY_AND_DELEGATION_GOVERNANCE.md` (`CCAI-AUTH-001`);
   - `CHAMPCITY_GOVERNANCE_WITHOUT_BUREAUCRACY_STANDARD.md` (`CCAI-GOV-001`);
   - `CHAMPCITY_UI_DESIGN_GOVERNANCE_STANDARD.md` (`CCAI-UI-001`) for UI work.
3. **Adopted V2 product/foundational architecture:**
   - `CHAMPCITY_PRODUCT_CAPABILITY_MODEL.md`;
   - `CHAMPCITY_FOUNDATIONAL_ARCHITECTURE_PRINCIPLES.md`.
4. **Topic-specific adopted architecture/contracts**, including `CHAMPCITY_TEST_EXECUTION_AND_VALIDATION_ARCHITECTURE.md` for executable validation planning/lane execution, `CHAMPCITY_TESTER_AND_TEST_LIFECYCLE_ARCHITECTURE.md` for Tester ownership and permanent-test lifecycle, Structured Project State, Client-Service, Repository/Source Layout, Runtime Recovery, Agent Runtime Interface, Deterministic Automation Boundaries, the Architectural Review Cycle, `CHAMPCITY_SOURCE_CONTROL_PROVIDER_ARCHITECTURE.md` for the provider-neutral source-control model, `CHAMPCITY_CONCURRENT_REPOSITORY_CHECKOUT_ARCHITECTURE.md` for concurrent writable source execution, and `CHAMPCITY_WORK_INTAKE_ROUTING_AND_PLANNING_ARCHITECTURE.md` for Work Intake routing, Plan topology, generic execution, and application-owned source-control lifecycle.
5. **Current migration/source mappings** such as `SOURCE_EXTRACTION_MAP.md`, the Desktop Source Mapping, and Vocabulary Migration Plan.
6. **Historical/design-discussion documents**, which may explain rationale but may not override the adopted contracts above.

`CCAI-VOCAB-001` controls terminology throughout the corpus. Product decisions reserved to the human remain with the Operator. Technical mechanisms must use access, scope, constraint, policy, eligibility, disposition, canonical source, binding, ownership, or another exact term rather than masquerading as discretionary decision principals.

## V1 / V2 applicability rule

`V1` and `V2` describe architecture generations, not deployment names.

- **ChampCity A/I Desktop** is the standalone workstation deployment.
- **ChampCity A/I Server** is the server-backed deployment.
- **V1** is the frozen Desktop architecture/source baseline from which V2 extracts proven behavior.
- **V2** is the shared-product architecture generation being implemented across Product Core and the applicable Desktop/Server hosts.

Server is **not** synonymous with V2. V2 may change Desktop internals while Desktop remains a first-class independently usable product.

When frozen V1 documentation and V2 target architecture coexist in the same repository, the current Work Item must identify the applicable generation/scope. A V2 target document is not proof that the behavior is already implemented. A V1 implementation detail does not constrain V2 when an adopted V2 architecture decision explicitly replaces it.

## Canonical vocabulary summary

- **Project** — durable logical body of work.
- **Workspace** — task-oriented ChampCity working station/surface.
- **Repository** — durable source/content repository identity.
- **RepositoryCheckout** — concrete working copy/worktree of a Repository.
- **SourceLine** — provider-neutral movable line of development associated with a Work Item, integration target, or other source role.
- **SourceRevision** — immutable provider-backed source state.
- **ImplementationRevision** — durable SourceRevision produced as the reviewable implementation result of a Work Item.
- **Host** — physical or virtual machine running ChampCity components/services.
- **ServiceInstance** — one running service/process instance on a Host.
- **Execution Environment** — bounded environment in which engineering execution occurs.
- **Client** — user-facing ChampCity application/interface.
- **Runtime** — agent execution system behind the Agent Runtime Interface.

Legacy MCP `workspaceId` is a Repository-routing compatibility identity. It must not become canonical Workspace or Project identity.

## Document register

| Document | Status / semantic owner | Governing use | Publication class |
| --- | --- | --- | --- |
| `CHAMPCITY_PRODUCT_CAPABILITY_MODEL.md` | **Adopted V2 baseline** | Top-level capability taxonomy | Architecture |
| `CHAMPCITY_FOUNDATIONAL_ARCHITECTURE_PRINCIPLES.md` | **Adopted V2 baseline** | Shared Product Core, client/host, structured state, deterministic mechanics, vocabulary, control/execution planes | Architecture |
| `CHAMPCITY_GOVERNANCE_VOCABULARY.md` | **Adopted normative standard** | Canonical governance terminology; overrides legacy false-principal vocabulary elsewhere | Governance |
| `CHAMPCITY_AUTHORITY_AND_DELEGATION_GOVERNANCE.md` | **Adopted standard `CCAI-AUTH-001`** | Operator decision role, delegation, scope, constraints, escalation boundaries | Governance |
| `CHAMPCITY_GOVERNANCE_WITHOUT_BUREAUCRACY_STANDARD.md` | **Adopted standard `CCAI-GOV-001`** | Minimum useful governance and autonomous execution rules | Governance |
| `CHAMPCITY_UI_DESIGN_GOVERNANCE_STANDARD.md` | **Adopted standard `CCAI-UI-001`** | Shared UI/human-centered/responsive/accessibility rules | Governance |
| `CHAMPCITY_STRUCTURED_PROJECT_STATE_DOMAIN_MODEL.md` | **Adopted V2 logical domain model** | Canonical Project State, revision/supersession, Decision/disposition, Validation/Evidence, completion semantics | Architecture |
| `CHAMPCITY_CLIENT_SERVICE_CONTRACT.md` | **Adopted V2 semantic service contract** | Deployment-neutral client/service boundary | Architecture |
| `CHAMPCITY_DETERMINISTIC_AUTOMATION_BOUNDARIES.md` | **Adopted V2 rulebook** | AI judgment vs deterministic ChampCity mechanics | Architecture / Governance |
| `CHAMPCITY_TEST_EXECUTION_AND_VALIDATION_ARCHITECTURE.md` | **Implemented execution architecture; explicit full qualification pending** | Executable validation catalog/profiles, lane scheduling, affected-capability selection, integration gate, build reuse, validation telemetry | Architecture / Validation |
| `CHAMPCITY_AGENT_RUNTIME_INTERFACE_CONTRACT.md` | **V2 implementation baseline v1** | Portable agent-runtime contract; Codex first adapter | Architecture / Contract |
| `CHAMPCITY_RUNTIME_RECOVERY_DECISION.md` | **Adopted architecture decision** | Runtime/external-action continuation and recovery semantics | Architecture |
| `CHAMPCITY_REPOSITORY_AND_SOURCE_LAYOUT_DECISION.md` | **Adopted architecture decision** | Existing `ChampCity_AI` product monorepo; app/package boundaries | Architecture |
| `CHAMPCITY_ARCHITECTURAL_REVIEW_CYCLE.md` | **Adopted V2 pattern** | Three-turn Architect → Design Reviewer → Architect cycle | Architecture / Workflow |
| `CHAMPCITY_WORK_INTAKE_ROUTING_AND_PLANNING_ARCHITECTURE.md` | **Adopted workflow/source-control architecture** | Universal Work Intake routing, route-specific planning profiles, direct/phased Plan topology, generic Plan execution, dedicated Intake branches, machine-owned Git, integration candidate, Integration Repair | Architecture / Workflow |
| `CHAMPCITY_CONCURRENT_REPOSITORY_CHECKOUT_ARCHITECTURE.md` | **Adopted concurrent source-execution architecture** | RepositoryCheckout identity, managed worktree mechanics, concurrent Work Item execution, exact-revision review readiness, and safe checkout retirement | Architecture / Source Control |
| `PROJECT_INTEGRATION_VALIDATION_POLICY.md` | **Implemented runtime-governing contract** | Target-owned integration policy, trusted runner definitions, controlled policy transition, and bounded validation evidence | Architecture / Runtime Contract |
| `WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md` | **Current transition standard** | Bounded implementation/repair contracts through V1→V2 reporting transition | Governance |
| `CHAMPCITY_VOCABULARY_MIGRATION_PLAN.md` | Current migration plan | Legacy `workspace*` and other terminology compatibility boundary | Migration |
| `SOURCE_EXTRACTION_MAP.md` | **Frozen-V1-refreshed source map (2026-09-14)** | Current source → V2 ownership/extraction map | Migration |
| `CHAMPCITY_CLIENT_SERVICE_DESKTOP_SOURCE_MAPPING.md` | **Frozen-V1-refreshed audit/mapping** | Current Desktop services → target semantic service contracts | Migration |
| `CHAMPCITY_DESKTOP_PROJECT_STATE_MIGRATION_DESIGN.md` | Optional future legacy-import design | Only applies if V1 project-state import is later implemented; not a V2 prerequisite | Optional Migration |
| `CHAMPCITY_MODEL_AGNOSTIC_CAPABILITY_PACK_ARCHITECTURE.md` | Design discussion / architecture capture | Capability-pack rationale; subordinate to governance + Agent Runtime contract | Design Note |
| `CHAMPCITY_SKILLS_ENGINE_DESIGN_DISCUSSION.md` | Design discussion | Skills rationale and UI Engineering skill direction; subordinate to adopted UI/governance/runtime rules | Design Note |
| `CHAMPCITY_RUNTIME_ABSTRACTION_INITIATIVE_DESIGN_DISCUSSION.md` | **Historical; interface semantics superseded** | Runtime-abstraction rationale only | Historical |
| `CHAMPCITY_PROJECT_MEMORY_AND_AUTONOMOUS_WORKBENCH_ARCHITECTURE.md` | **Historical architecture discussion** | Memory/workbench/autonomy rationale; Structured State/Runtime/Recovery successors control conflicts | Historical |

## Frozen V1 baseline facts used by the migration maps

The September 14 refresh reflects the frozen V1 working tree, including:

- 185 files under `src/**`;
- `SessionActiveWorkspaceSelection` replacing the former pre-reconciliation selection service name;
- `workspaceAccess` replacing the former repository-access service name;
- `repositoryBinding` replacing the former repository-binding service name while preserving exact legacy compatibility literals where required;
- `workCardLoopStateService` / completion-evidence semantics replacing the former Work Card loop-state service name;
- implemented bounded Git mutation through `gitMutations.ts` and `git_toolbox` dispatch;
- characterization coverage for Development, Issue, Project/Repository binding, and Runtime/Model behavior; and
- the current V1 Operator-owned card-validation behavior as a **characterized V1 baseline**, not a V2 requirement.

## Explicit V2 behavior changes from V1

The following are intentional architecture changes, not regressions to be “fixed back” to V1:

- Structured Project State replaces repository Markdown as the live V2 workflow-state model.
- The Architect's planning output receives one bounded independent Design Reviewer critique before final synthesis.
- Post-implementation independent semantic conformance moves to the Validator role.
- Routine Work/Fix/Repair validation does not require an Operator disposition when deterministic and required semantic criteria are satisfied.
- Appropriate visual/human acceptance may be deferred and aggregated at Phase Validation.
- ChampCity may mechanically advance/close bounded work within already directed scope when no genuine Operator Decision is required.
- Git/source-control mechanics become deterministic RepositoryService responsibilities rather than a separate permission hierarchy or routine inference work.
- Git becomes the first source-control provider beneath ChampCity-owned SourceLine/SourceRevision/RepositoryCheckout/Integration semantics rather than the workflow-defining API.
- Codex becomes the first Agent Runtime adapter rather than an architecture-defining dependency.
- Desktop and Server consume shared Product Core/client/service semantics without becoming writable peers for one Project State instance.

Characterization tests must distinguish these **explicit V2 changes** from accidental regressions.

## Published corpus layout

This corpus is published as one canonical production copy in `ChampCity_AI`. The former Brain_Dump `repo_overlay/` directory is retired staging material and must not be treated as a second independently editable canonical source.

Published grouping:

```text
docs/
├── architecture/
│   ├── CHAMPCITY_PRODUCT_CAPABILITY_MODEL.md
│   ├── CHAMPCITY_FOUNDATIONAL_ARCHITECTURE_PRINCIPLES.md
│   ├── CHAMPCITY_STRUCTURED_PROJECT_STATE_DOMAIN_MODEL.md
│   ├── CHAMPCITY_CLIENT_SERVICE_CONTRACT.md
│   ├── CHAMPCITY_DETERMINISTIC_AUTOMATION_BOUNDARIES.md
│   ├── CHAMPCITY_AGENT_RUNTIME_INTERFACE_CONTRACT.md
│   ├── CHAMPCITY_RUNTIME_RECOVERY_DECISION.md
│   ├── CHAMPCITY_REPOSITORY_AND_SOURCE_LAYOUT_DECISION.md
│   ├── CHAMPCITY_ARCHITECTURAL_REVIEW_CYCLE.md
│   ├── CHAMPCITY_SOURCE_CONTROL_PROVIDER_ARCHITECTURE.md
│   ├── CHAMPCITY_CONCURRENT_REPOSITORY_CHECKOUT_ARCHITECTURE.md
│   ├── CHAMPCITY_WORK_INTAKE_ROUTING_AND_PLANNING_ARCHITECTURE.md
│   └── PROJECT_INTEGRATION_VALIDATION_POLICY.md
├── governance/
│   ├── CHAMPCITY_GOVERNANCE_VOCABULARY.md
│   ├── CHAMPCITY_AUTHORITY_AND_DELEGATION_GOVERNANCE.md
│   ├── CHAMPCITY_GOVERNANCE_WITHOUT_BUREAUCRACY_STANDARD.md
│   ├── CHAMPCITY_UI_DESIGN_GOVERNANCE_STANDARD.md
│   └── WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md
├── migration/
│   ├── SOURCE_EXTRACTION_MAP.md
│   ├── CHAMPCITY_CLIENT_SERVICE_DESKTOP_SOURCE_MAPPING.md
│   ├── CHAMPCITY_VOCABULARY_MIGRATION_PLAN.md
│   └── legacy/
│       └── CHAMPCITY_DESKTOP_PROJECT_STATE_MIGRATION_DESIGN.md
└── design-notes/
    ├── CHAMPCITY_MODEL_AGNOSTIC_CAPABILITY_PACK_ARCHITECTURE.md
    ├── CHAMPCITY_SKILLS_ENGINE_DESIGN_DISCUSSION.md
    └── history/
        ├── CHAMPCITY_RUNTIME_ABSTRACTION_INITIATIVE_DESIGN_DISCUSSION.md
        ├── CHAMPCITY_PROJECT_MEMORY_AND_AUTONOMOUS_WORKBENCH_ARCHITECTURE.md
        └── CHAMPCITY_V2_ARCHITECTURE_FINAL_RECONCILIATION_2026-09-14.md
```

Production documents must use production-relative references rather than Brain_Dump staging paths.

## Implementation prerequisites — not approval gates

No unresolved corpus contradiction requires another architecture hold before V2 engineering begins. Implementation still has normal dependency ordering:

- establish monorepo/package/build boundaries when the first extraction requires them;
- implement the Structured Project State contracts before extracted workflow logic depends on them;
- extract repository/source-control services from the proven V1 containment/Git mechanics;
- implement Agent Runtime adapters against the portable runtime contract and conformance suite;
- implement service RequestContext access/resource-scope and operation-idempotency semantics;
- add Design Reviewer, Tester, and Validator orchestration with the exact bounded semantics defined in their architecture;
- build AI visual-validation tooling before relying on AI as the sole visual verifier for criteria that currently require the running product;
- implement isolated writable checkouts/leases and cost/time/attempt guardrails before parallel autonomous Implementers; and
- preserve a reproducible V1 source/characterization baseline per extraction Work Item.

These are engineering dependencies. They do not create new approval owners or require repeated Operator permission to perform already directed V2 work.

## Final migration-readiness rule

The September 14 final reconciliation report is present, staging duplicates were excluded from publication, and the repository contains the narrow documentation/test compatibility changes needed to host the V2 corpus without confusing V1 implementation evidence with V2 target architecture. **The corpus is published and is the controlling V2 architecture baseline.**
