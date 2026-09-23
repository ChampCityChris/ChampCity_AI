# Source-Control Lifecycle Work Card Plan

## Dependency Graph

```text
SCL01
  ↓
SCL02
  ↓
SCL03 ──→ SCL04
  ↓         ↓
SCL05 ──────┘
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

## Phase Intent

### Foundation — SCL01–SCL04

Create the semantic service boundary and correct Work Intake/source-line establishment before changing broad workflow checkpoint behavior.

### Lifecycle — SCL05–SCL07

Move commits/integration behind deterministic application mechanics and wire them to workflow semantics.

### Visibility — SCL08–SCL09

Expose topology and workflow meaning without adding mutation controls.

### Qualification — SCL10

Remove obsolete gate paths, perform focused end-to-end proof, and record deferred multi-agent/worktree scope.

## Scope Control

This package intentionally does not:

- implement the V2 web client or Service Host cutover;
- implement general per-agent worktree provisioning;
- redesign route/planning UI currently being repaired in the separate WIR UI package;
- add manual Git power-user mutation controls to the Source Control page;
- make Git/provider state a new approval hierarchy.
