# Phase 08 — Nested Lifecycle and Workspace Recovery

Status: WC16 comprehensive production-integration repair authorized after committed handoff
Planning revision: 11
Project: ChampCity A/I
Active Work Card: WC16
Execution authority: `planning/phases/phase-08/IMPLEMENTER_HANDOFF_WC16_phase_08_production_integration_runtime_completion_repair.md`
Git mutation: not authorized during Implementer execution

## Phase Purpose

Restore the nested Project, Phase, and Work Card lifecycle on the Phase 07 clean-room foundation without restoring rejected governance architecture.

```text
Project
├── Intake
├── Planning
├── Building
│   └── Phase
│       ├── Intake
│       ├── Planning
│       ├── Building
│       │   └── Work Card
│       │       ├── Intake
│       │       ├── Planning
│       │       ├── Building
│       │       ├── Validation
│       │       └── Close
│       ├── Validation
│       └── Close
├── Validation
└── Close
```

## First-Pass Result

The WC01–WC15 continuous first pass created substantial service and unit-test code, but most Phase 08 workflow behavior was not connected to the running Electron application.

The cumulative Architect review concluded:

```text
Phase 08 first-pass package: RevisionRequested
WC01 foundation: conditionally accepted
WC01A–WC15: not accepted
Operator validation: withheld
Phase closeout: not authorized
```

Controlling review:

`planning/phases/phase-08/Architect_Reviews/ARCHITECT_REVIEW_PHASE08_CONTINUOUS_FIRST_PASS_IMPLEMENTATION.md`

## Active-Corpus Reset

Before WC16, the Operator removed pre–Phase 07 planning records and superseded project/system planning documents from the active repository corpus.

This reset is intentional.

WC16 must not:

- restore deleted historical planning records;
- preserve compatibility with rejected artifact types or governance models;
- use the application repository’s development history as product workflow data;
- use the active `planning/` corpus as a test-project fixture.

Current planning authority consists of Phase 07 clean-room evidence, Phase 08 planning/design records, and canonical artifacts created by the repaired application.

## Active Repair

```text
WC16 — Phase 08 Production Integration and Runtime Completion Repair
```

WC16 is a Phase-level integration card because the defects span WC02–WC15 and shared runtime infrastructure. It is not assigned as a child repair of one parent Work Card.

The repair must convert the first-pass modules into a reachable product path:

```text
Project Intake
→ Architect Interview
→ Project Planning
→ Phase Map
→ Phase Interview
→ Phase Planning
→ Work Card lifecycle
→ Phase Validation and Close
→ Project Validation and Close
```

## Required Production Boundary

Implemented behavior requires all of the following:

```text
production service
+ main-process IPC
+ constrained preload method
+ renderer workspace control
+ canonical artifact authority
+ product-path test
```

Direct service imports in Node tests do not prove the application workflow.

## Embedded Architect Requirement

WC16 must implement and visibly attach a real secure Electron remote-content surface for the Architect subscription workflow.

It must attempt the actual Operator-observed handoff and MCP write-back lane.

A configuration object, security summary, URL validator, status simulation, filename manifest, copied transcript, or mock MCP result is not implementation evidence.

The Implementer must stop and report a blocker rather than use provider APIs, DOM automation, credential extraction, security bypass, or an unapproved dependency.

## Runtime Integration Requirement

WC16 must expose and render the approved WC04–WC15 operations, including:

- Architect Interview review and revision;
- synchronized Project and Phase planning bundles;
- Phase Map and Phase Interview;
- candidate selection and Work Card Intake;
- Formal Work Card review;
- Implementer Report review;
- repair generation and return;
- Operator Validation Records and immutable attempts;
- Work Card Close and next-candidate return;
- Phase and Project population review and semantic close.

Workspace-specific actions must replace generic single-document disposition where that generic action violates approved authority.

## Artifact and Test Authority

WC16 must:

- correct canonical classification and context-only participation;
- bind writes to main-process-owned mediated repository selection;
- use Architect/MCP writes for Architect-authored documents;
- use one canonical staged transaction for pair, bundle, revision, handoff, and invalidation writes;
- prove the complete failed-validation repair loop through production services;
- add IPC, preload, renderer-action, and curated-fixture product tests;
- remove real-development-corpus dogfood coupling.

No Playwright is authorized.

## Active Work Card and Handoff

Work Card:

`planning/phases/phase-08/Work_Cards/WC16_phase_08_production_integration_runtime_completion_repair.md`

Handoff:

`planning/phases/phase-08/IMPLEMENTER_HANDOFF_WC16_phase_08_production_integration_runtime_completion_repair.md`

Work Card Plan:

`planning/phases/phase-08/Work_Card_Plan.md` revision 11.

## Completion Boundary

WC16 ends with one Pending Implementer Report and truthful implementation, automated-validation, launch-smoke, and external-integration evidence.

WC16 does not include:

- Architect acceptance of its own report;
- broad Operator acceptance;
- Phase 08 closeout;
- packaging or release;
- Git mutation.

After the report is available, the Architect performs repository review and determines whether Operator validation may begin.

## Prohibited Architecture

Do not restore approval artifacts or queues, route tokens, role gates, execution runs, hashes, timestamp authority, fixed exhaustive workspace-name unions, separate Implementer execution packets, separate Architect Review approval artifacts, pre-action Validation Records, recursive repairs, duplicate corpus snapshots, hidden current lifecycle state, provider API substitution, browser credential extraction, DOM automation, or browser-security bypasses.

## Document Disposition

Document.Status=Approved
