# Source-Control Lifecycle Work Card Plan

## Dependency Graph

```text
SCL01
  ↓
SCL01A → B → C → D → E → F → G → H → I → J → K → L → M
  → N → O → P → Q → R → S → T → U → V → W → X → Y → Z
  ↓
SCL02
  ↓
SCL03
  ↓
SCL04
  ↓
SCL05
  ↓
SCL06
  ↓
SCL07
  ↓
SCL08
  ↓
SCL09
  ↓
SCL10
```

Every arrow is a hard sequential dependency for this package.

## Phase Intent

### Repository semantic seam — SCL01

Establish provider-neutral RepositoryService/source-control semantics from existing bounded Git mechanics.

### Structured Project State domain/service — SCL01A–SCL01D

Implement the canonical domain, invariant registry, store port, in-memory conformance adapter and ProjectStateService before choosing persistence details.

### SQLite durable persistence — SCL01E–SCL01I

Qualify the built-in runtime binding, implement the durable SQLite schema/store, revision/history behavior, audit and event outbox.

### Canonical workflow semantics — SCL01J–SCL01O

Implement Decisions, Validation/Evidence, generic execution, Work Intake/routing, source/integration semantic references and Tester obligations.

### Read models / projections / Memory seam — SCL01P–SCL01R

Provide bounded current-state queries, render Markdown/export from state, and publish authoritative context + derived Memory event feed.

### Durability and migration — SCL01S–SCL01V

Prove backup/recovery, inventory legacy authority, build isolated import, and verify semantic equivalence/shadow reads.

### Consumer migration and cutover — SCL01W–SCL01Z

Move active workflow services behind ProjectStateService, atomically switch authority with generation fencing, then disable Markdown-as-state.

### Source lifecycle — SCL02–SCL07

Use the now-authoritative state system for Work Intake/source preparation, deterministic checkpoints and integration.

### Visibility — SCL08–SCL09

Expose source topology + Project State meaning without mutation controls.

### Qualification — SCL10

Remove remaining legacy source-control authority gates and prove the full source lifecycle.

## Database Decision

SQLite is selected as the first durable ProjectStateStore engine.

The preferred initial binding is built-in `node:sqlite`, but SCL01E must prove it in supported Node/Electron/packaged environments before SCL01F relies on it. The engine remains behind ProjectStateStore.

Canonical `project-state.sqlite` and future derived `memory.sqlite` are separate authority stores.

## Scope Control

This package intentionally does not:

- implement the V2 web client or Service Host cutover;
- implement semantic/vector AI Memory beyond the event/context seam;
- implement general per-agent worktree provisioning;
- add manual Git mutation controls to Source Control visualization;
- migrate architecture/governance/design documents into Project State;
- make Git, SQLite or Memory a new approval hierarchy.
