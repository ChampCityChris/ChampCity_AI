<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-07/work_card_plan/Work_Card_Plan",
  "artifactType": "work_card_plan",
  "createdAt": "2026-07-18T22:44:44.000Z",
  "jsonPath": "planning/phases/phase-07/Work_Card_Plan.json",
  "markdownPath": "planning/phases/phase-07/Work_Card_Plan.md",
  "payload": {
    "kind": "work_card_plan",
    "title": "Work Card Plan: phase-07 — Shared MCP Core Extraction and Governed ChatGPT Role Integration"
  },
  "payloadHash": "sha256:4c2640e79bcc267ac945daee6e16b12054bac894ec88e88eff1e73ba2bf5c585",
  "phaseId": "phase-07",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [
      "champcity-ai/phase-07/operator_approval/Operator_Phase_Approval",
      "champcity-ai/phase-07/work_card/WC01",
      "champcity-ai/phase-07/work_card/WC02",
      "champcity-ai/phase-07/work_card/WC03",
      "champcity-ai/phase-07/work_card/WC04",
      "champcity-ai/phase-07/work_card/WC05",
      "champcity-ai/phase-07/work_card/WC06",
      "champcity-ai/phase-07/work_card/WC07",
      "champcity-ai/phase-07/work_card/WC08"
    ],
    "sources": [
      "champcity-ai/phase-06/phase_closeout/PHASE_06",
      "champcity-ai/phase-07/phase_activation/phase-07",
      "champcity-ai/phase-07/phase_planning/Phase_Planning",
      "champcity-ai/project/project_roadmap/PROJECT_ROADMAP_champcity_a_i"
    ],
    "supersedes": []
  },
  "revision": 1,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-18T22:44:44.000Z"
}
-->

# Work Card Plan: phase-07 — Shared MCP Core Extraction and Governed ChatGPT Role Integration

Status: draft_for_operator_review
Phase: phase-07 — Architect Bridge and MCP-First Integration
Revision: 1
Plan strategy: review first, extract one shared core, embed it in ChampCity_AI, then integrate governed ChatGPT roles

## Plan Decision

Phase 07 will not connect ChampCity_AI to the standalone ChampCity_GPT desktop application as its permanent integration boundary.

ChampCity_GPT remains a standalone product. Its reusable MCP implementation will be extracted into one separately versioned shared core consumed by:

- the existing ChampCity_GPT standalone host; and
- a new ChampCity_AI embedded host.

The plan prohibits copying the MCP implementation into ChampCity_AI as a divergent fork.

Codex remains the primary Implementer. Phase 07 implements ChatGPT subscription roles for Architect, Independent Verifier, and Operator Validation.

## Governing Sequence

```text
WC01 — Cross-repository review and extraction contract
  ↓
WC02 — Shared MCP core extraction and standalone-host migration
  ↓
WC03 — ChampCity_AI embedded host and managed process lifecycle
  ↓
WC04 — ChampCity_AI workflow, artifact, execution, and validation adapters
  ↓
WC05 — Architect Agent end-to-end integration
  ↓
WC06 — Independent Verifier Agent end-to-end integration
  ↓
WC07 — Operator Validation Agent end-to-end integration
  ↓
WC08 — Dual-host hardening and Phase 08 re-entry decision
```

No downstream Work Card may bypass its predecessor's accepted evidence.

## Ordered Candidates

### WC01 — ChampCity_GPT Portability Review and Shared-Core Architecture Contract

Order: 1
Kind: `planned_candidate`
Existing implementation classification: `Preserve and classify before migration`
Status: planned; first candidate after Phase 07 plan approval
Implementation type: architecture, repository review, and bounded planning reconciliation

Required outcomes:

- complete top-to-bottom ChampCity_GPT repository review;
- subsystem classification as `core_reuse`, `core_with_host_adapter`, `standalone_host_only`, `champcity_ai_host_replacement`, or `retire`;
- dependency graph and runtime-assumption inventory;
- shared-core package/repository boundary;
- host-neutral interfaces and host adapter contracts;
- standalone compatibility contract;
- ChampCity_AI embedded-host contract;
- role-to-tool and role-to-permission matrix;
- OAuth, runtime-store, port, audit, and process-isolation design;
- migration, rollback, test, packaging, and release strategy;
- exact decision on how the separately versioned `ChampCity_MCP_Core` source is created and consumed;
- security review covering public tool exposure, scopes, path safety, result authority, and wrong-role submissions.

WC01 must also reconcile the current Phase 07 planning baseline before extraction:

- update the stale lifecycle replay test that hard-codes Phase 06;
- reconcile new Phase 06/07 lifecycle pairs with canonical Registry authority;
- retire or replace placeholder-grade WC03 Architect Review and Operator Validation records;
- retire the incorrect WC06 P04/P05 handoff;
- confirm Project Roadmap and Project State are synchronized and authoritative.

Prohibited:

- production extraction;
- new shared repository creation;
- package publication;
- ChampCity_AI embedding;
- role execution.

Acceptance requires an Architect-reviewed design document and exact extraction contract.

### WC02 — Shared ChampCity MCP Core Extraction and ChampCity_GPT Host Migration

Order: 2
Kind: `planned_candidate`
Existing implementation classification: `Migrate`
Status: dependency-blocked by WC01
Implementation type: cross-repository foundational refactor

Required outcomes:

- create the separately versioned shared MCP core approved by WC01;
- move host-neutral MCP, OAuth, transport, security, workspace, audit, repository, Git, diagnostic, attachment, and schema infrastructure into the shared core;
- replace direct ChampCity_GPT runtime assumptions with explicit host interfaces;
- migrate ChampCity_GPT to consume the shared core;
- preserve standalone setup, configuration, OAuth administration, packaging, and user behavior;
- preserve the stable public tool surface unless WC01 explicitly approves a migration;
- prove no second copied MCP implementation remains active;
- provide rollback and compatibility evidence.

Acceptance requires all ChampCity_GPT typecheck, build, test, MCP self-test, public-safety, release-safety, development-startup, packaged-startup, and live connector gates required by WC01.

### WC03 — ChampCity_AI Embedded MCP Host and Managed Process Lifecycle

Order: 3
Kind: `planned_candidate`
Existing implementation classification: `New host using preserved shared core`
Status: dependency-blocked by WC02
Implementation type: ChampCity_AI host integration

Required outcomes:

- package the shared MCP core with ChampCity_AI;
- run it as a ChampCity_AI-managed internal process;
- implement start, stop, restart, health, crash detection, bounded recovery, and shutdown;
- isolate runtime configuration, OAuth stores, logs, audit state, ports, and process ownership from standalone ChampCity_GPT;
- bind the initial host to the ChampCity_AI project without hard-coding future project internals;
- provide an Operator-readable embedded MCP workspace;
- expose connector version, shared-core version, health, scopes, workspace binding, and recovery status;
- require no separately running ChampCity_GPT executable.

Acceptance requires development and packaged lifecycle validation, restart persistence, crash recovery, and proof that standalone ChampCity_GPT and embedded ChampCity_AI can coexist without state or port collision.

### WC04 — ChampCity_AI Workflow and Canonical Service Adapters

Order: 4
Kind: `planned_candidate`
Existing implementation classification: `Preserve ChampCity_AI authority; add adapters`
Status: dependency-blocked by WC03
Implementation type: host-service and authority integration

Required outcomes:

- current-assignment adapter;
- exact role-packet adapter;
- canonical artifact read adapter;
- canonical result proposal and ingestion adapter;
- Execution Run, pass, attempt, Work Card revision, Acceptance Contract, and expected-result binding;
- validation-profile adapter;
- evidence-bundle adapter;
- audit provenance binding;
- idempotent result submission and status;
- wrong-role, wrong-assignment, stale-attempt, duplicate-result, and cross-project rejection;
- explicit manual fallback state.

The shared core may transport and validate host requests, but ChampCity_AI must perform canonical serialization, payload hashing, Markdown rendering, Registry transactions, workflow transitions, and acceptance decisions.

Acceptance requires atomic canonical materialization through ChampCity_AI services and no independent MCP-side workflow or Registry authority.

### WC05 — ChatGPT Architect Agent End-to-End Integration

Order: 5
Kind: `planned_candidate`
Existing implementation classification: `Replace manual Architect handoff as primary path; preserve explicit fallback`
Status: dependency-blocked by WC04
Implementation type: governed role integration

Required outcomes:

- compile an exact Architect assignment from the current ChampCity_AI route;
- allow one Architect ChatGPT conversation to claim and read the packet;
- expose bounded repository, artifact, Git history, source-analysis, and evidence tools;
- submit a typed Architect result;
- materialize the expected canonical artifact through ChampCity_AI;
- show ingestion status and resulting workflow transition;
- reject wrong-role and stale assignment submissions;
- preserve a visible manual handoff fallback.

The first proof must use a controlled real Architect-required action, not a synthetic success-only route.

### WC06 — ChatGPT Independent Verifier Agent End-to-End Integration

Order: 6
Kind: `planned_candidate`
Existing implementation classification: `New role integration using Phase 06 Execution Run foundation`
Status: dependency-blocked by WC05 and an exact Implementer result
Implementation type: independent verification integration

Required outcomes:

- separate fresh ChatGPT conversation and verifier assignment;
- exact Implementer result, changed-file, commit, pass, attempt, and contract binding;
- named focused and full validation profiles;
- read-only implementation evidence;
- typed `pass`, `fail`, `blocked`, or `pass_with_observations` result;
- same-pass retry routing when verification fails;
- prevention of self-verification and evidence mutation.

Acceptance requires proof that the same conversation or assignment authority cannot act as both Implementer and Independent Verifier for the same pass.

### WC07 — ChatGPT Operator Validation Agent End-to-End Integration

Order: 7
Kind: `planned_candidate`
Existing implementation classification: `New human-assisted validation integration`
Status: dependency-blocked by WC06
Implementation type: human-in-the-loop role integration

Required outcomes:

- exact validation target and Architect-authorized checklist;
- application-generated manual validation steps;
- screenshot, log, and evidence review;
- recording of human-confirmed observations;
- missing-evidence and not-tested states;
- draft Operator Validation result submission;
- explicit human acceptance control outside the agent;
- prohibition on autonomous Work Card acceptance or phase closeout.

Acceptance requires proof that the agent cannot claim unconfirmed human actions or accept its own draft.

### WC08 — Dual-Host Hardening and Phase 08 Dogfooding Re-Entry Decision

Order: 8
Kind: `planned_candidate`
Existing implementation classification: `Harden`
Status: dependency-blocked by WC02 through WC07
Implementation type: integration validation and lifecycle closeout

Required outcomes:

- complete standalone ChampCity_GPT regression;
- complete embedded ChampCity_AI regression;
- shared-core version and compatibility verification;
- connector rediscovery and OAuth reconnection;
- restart, crash recovery, and process cleanup;
- role concurrency and claim isolation;
- wrong-role, stale-attempt, duplicate-result, and cross-project rejection;
- audit completeness and redaction;
- project switching without authority leakage;
- explicit fallback and recovery;
- Operator-visible role, source, expected output, and blocker status;
- controlled Architect, Independent Verifier, and Operator Validation demonstrations;
- Phase 08 dogfooding re-entry recommendation.

WC08 may recommend Phase 08 activation but may not perform Operator phase acceptance.

## Shared-Core Ownership Rule

The shared core is the single source for reusable MCP behavior. Host-specific code must depend on explicit interfaces.

Prohibited architectures:

- copied MCP source inside ChampCity_AI;
- ChampCity_AI requiring the standalone ChampCity_GPT executable;
- standalone ChampCity_GPT importing ChampCity_AI workflow modules;
- shared core owning ChampCity_AI workflow state or Artifact Registry authority;
- two active implementations of the same public tool behavior;
- hidden compatibility fallback to the pre-extraction implementation.

## Role Authority Rule

- Architect, Independent Verifier, and Operator Validation roles use separate exact assignments.
- One public connector may serve all roles.
- Conversation labels and prompt text are not authority.
- ChampCity_AI assignment records determine the permitted role and result type.
- Codex remains the primary Implementer during Phase 07.
- Human Operator acceptance remains outside agent authority.

## Validation Rule

Every implementation Work Card must define:

- focused validation;
- shared-core tests;
- standalone ChampCity_GPT regression;
- embedded ChampCity_AI regression when applicable;
- public tool exposure and OAuth checks when applicable;
- process and runtime-store isolation checks;
- canonical artifact and workflow authority checks;
- manual Operator validation;
- rollback evidence.

A passing host-specific test suite is not sufficient when the shared core or both hosts are touched.

## Implementation Authorization Gate

This Work Card Plan does not authorize implementation.

Implementation begins only after:

1. the Operator reviews and approves the Phase 07 Planning and Work Card Plan pairs;
2. the approval identifies the exact approved revisions;
3. the Architect creates the next just-in-time Work Card;
4. the Operator approves that exact Work Card where required;
5. the repository and dependency preflight passes.

## Completion Rule

Phase 07 becomes eligible for closeout only when:

1. WC01 is accepted;
2. WC02 is accepted and one shared core is authoritative;
3. WC03 is accepted and the embedded process lifecycle is stable;
4. WC04 is accepted and ChampCity_AI retains canonical authority;
5. WC05 Architect integration passes;
6. WC06 Independent Verifier integration passes;
7. WC07 Operator Validation integration passes;
8. WC08 dual-host hardening passes;
9. no unresolved role, authority, extraction, compatibility, runtime-isolation, or connector blocker remains;
10. the Operator approves the Phase 08 re-entry decision.

## Next Governed Output

`champcity-ai/phase-07/operator_approval/Operator_Phase_Approval`

After exact approval, the first just-in-time implementation candidate is:

`champcity-ai/phase-07/work_card/WC01`
