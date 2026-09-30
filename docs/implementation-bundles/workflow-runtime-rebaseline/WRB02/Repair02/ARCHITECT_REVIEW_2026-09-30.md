# WRB02 / Repair02 / WRB02-R02-01 Architect Review — 2026-09-30

**Implementation checkpoint:** `336571e3a00b8b686e624504702cc700f5c6f68e`  
**Parent:** `36c234ce51f8b3925fc041e9ea0561fc7b1beec0`  
**Disposition:** **ACCEPTED**

## Review result

The implementation matches the controlling repair and corrects the Workflow Hub architecture.

The Hub is now a stable workflow launcher rather than a live multi-instance registry.

## Accepted Hub behavior

The Hub renders exactly eight cards in the required stable order:

```text
Work Intake Routing | Greenfield Project        | Feature / Capability
Refactor / Migration | Integration / Composition | Issue Resolution
Infrastructure / Platform | Research / Prototype |
```

The order is owned by the canonical Workflow type registry rather than a renderer-only catalog.

Each registry definition now owns a concise purpose statement used by the Hub and the type-level workspace.

## Instance sprawl removed from the Hub

`WorkflowHubWorkspace` no longer owns:

- Workflow title entry;
- direct instance creation;
- per-instance lists;
- per-instance Open rows;
- completed-instance history rendering.

A fixture with 50 Issue instances still renders eight Hub cards and no Issue rows.

This satisfies the core requirement that Project history must not make the launcher grow indefinitely.

## Reusable workflow-type surface accepted

The new `WorkflowTypeWorkspace` owns repeatable Workflow family behavior:

- Start New;
- bounded title entry;
- current/history instance list;
- exact Workflow Open action;
- Back to Workflows.

The existing Workflow APIs and exact Workflow IDs remain authoritative.

This gives the required separation:

```text
Hub
-> Workflow family/type surface
-> exact Workflow intake/planning/execution
```

No new persistence model or duplicate Workflow registry was introduced.

## Work Intake Routing accepted

Work Intake Routing is the first/top-left Hub card.

Opening it selects the WIR type surface without creating a Workflow.

The type surface owns Start New Work Intake and existing WIR instance/history access.

Exact WIR navigation continues through the existing Work Intake routing contract.

## Greenfield Project accepted

Greenfield Project is always the second/top-middle card.

If Project State contains the authoritative `project-creation` Workflow:

- the card is enabled;
- active history displays In progress;
- closed history displays Completed;
- the exact Project Creation Workflow opens directly;
- no second Project Creation Workflow can be started.

If no Project Creation Workflow exists:

- the card remains in the same position;
- it is visually disabled;
- it reports that Greenfield is not applicable to the existing/migrated Project;
- no Project Creation Workflow is synthesized.

Applicability is derived from Project Creation Workflow history rather than the transient entry mode, so a completed Greenfield Project remains enabled when later reopened through Existing Project.

## Navigation accepted

Renderer state now distinguishes:

- `selectedWorkflowType`;
- `selectedWorkflowId`.

Back navigation is:

```text
exact substantive Workflow
-> workflow-type surface
-> Hub
```

Project Creation returns directly to the Hub because it is non-repeatable and does not use the family list surface.

Settings return preserves the workflow-type/exact foreground.

## Source Control accepted

Source Control remains a Project-level Hub action and retains its existing source-capability gate.

No Git, Agent Harness, MCP, Project State schema, Workflow multiplicity, SourceBinding, routing, or integration semantics changed in this repair.

## Validation disposition

The Implementer report records:

- final focused normal-Windows suite: 79/79 pass;
- Workflow Hub focused owner: 24/24 pass;
- related renderer WIR/Issue owners: 33/33 pass;
- production build: pass in normal Windows lane;
- repair validation-plan preview: pass;
- `git diff --check`: pass.

Architect review additionally inspected the production Hub, type workspace, navigation wiring, canonical registry changes, and focused proof.

## Working-tree note

The Dev checkout contains unrelated pre-existing modifications outside this repair. They were present before WRB02-R02-01 and were not included in this implementation checkpoint or this review.

## Next step

The repair is accepted.

Operator visual confirmation of the rendered desktop screen is appropriate as the next screen-by-screen review step, but no additional WRB02-R02-01 code repair is required from this Architect review.
