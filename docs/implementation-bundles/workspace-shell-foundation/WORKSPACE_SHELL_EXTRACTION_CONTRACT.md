# Workspace Shell Extraction Contract

## Definition

A workspace shell is a reusable container comparable to a network-engineering container or appliance chassis: stable ports and presentation boundaries, replaceable payload/configuration.

The shell is reusable across arbitrary workflows. A workflow adapter supplies data, readiness, actions, and workflow-specific LLM instructions.

## Shell owns

- exact workspace geometry and chrome;
- primary/secondary columns;
- document/review/browser placement;
- navigation/rail slot placement;
- status and blocker presentation slots;
- action/control placement;
- scroll and responsive behavior;
- accessibility structure;
- visual hierarchy that existed in the working Greenfield UI.

## Adapter owns

- SQL reads/writes;
- current entity identities;
- current stage/lifecycle;
- readiness calculation from authoritative services;
- typed save/review/execute callbacks;
- LLM handoff/instruction content;
- source/Git/MCP behavior;
- workflow-specific labels/content where explicitly parameterized.

## Forbidden in shell

- `window.champcity` calls;
- SQL/domain service imports;
- workflow-type switching;
- stage advancement;
- Markdown authority/parsing;
- Git/MCP calls;
- hidden canonical state;
- business rules that decide whether a lifecycle transition is legal.

## Extraction method

For each shell:

1. inspect the exact pre-RWS source composition at `965536de` or a later **faithful extraction** checkpoint;
2. copy the working JSX/CSS composition;
3. identify only the values/actions that came from App state;
4. replace those dependencies with typed props/slots/callbacks;
5. preserve classes, geometry, interaction order, labels, disabled states, scrolling, responsive behavior, and accessibility;
6. create a Greenfield adapter that binds current SQL-backed services to that shell;
7. prove structural/interaction parity against recovered characterization tests;
8. require Operator visual/experiential validation before the shell is considered accepted.

## Architect-authored candidate ingress

For Architect/Planning shells, typed model output enters through the shared application ingress established by WSF03A:

```text
shell prepares/copies handoff
→ embedded ChatGPT
→ workflow_toolbox.submit_stage_candidate
→ exact structured stage save service
→ SQL candidate/review cycle
→ generated human-readable review projection
→ Operator disposition
```

The shell must not contain a raw JSON candidate editor, file watcher, draft promotion authority, or stage-specific SQL call. Candidate transport belongs to the adapter/application boundary.

## Durable output / projection invariant

Every durable workflow output produced by Architect, Implementer, Tester, Validator, Repair flow, or Operator review is stored first as typed Structured Project State.

```text
agent / human result
→ typed validated SQL records
→ deterministic read-only document projection
→ optional Markdown export
```

A document shell may display/export the projection. Exported/generated Markdown is never parsed back into current authority.

Transient chat text, streaming runtime events and ephemeral prompts are not durable workflow outputs.

## No premature deduplication

All 18 workspaces and the rail are distinct shell deliverables.

A later card may extract internal primitives shared by multiple accepted shells, but that refactor must preserve each shell contract exactly. It is not part of this recovery bundle.

## Composition target

After this bundle Greenfield is a workflow composed from reusable shells, not a special monolith:

```text
Nested Lifecycle Rail
  Project Intake
  Architect Interview
  Project Planning
  Project Phase Map

  repeat Phase:
    Phase Interview
    Phase Planning
    Work Card Map

    repeat Work Card:
      Work Card Intake
      Work Card Planning
      Implement
      Review & Validation
      Repair (conditional loop)
      Operator Validation
      Work Card Close

    Phase Validation
    Phase Close

  Project Validation
  Project Close
```

The number of Phase and Work Card loop iterations is data. The shell set is stable.
