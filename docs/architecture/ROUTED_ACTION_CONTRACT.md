# Routed Action Contract

## Purpose

One routed-action contract carries workflow authority from the persisted state index through Current Action presentation, workspace selection, form initialization, source selection, preview, save, and post-save transition.

## Contract Fields

The contract includes:

- contract and workflow-state revision;
- action ID and workflow stage;
- responsible role;
- exact workspace/screen ID;
- authoritative target artifact ID;
- authoritative source artifact IDs;
- expected output artifact ID and type;
- success, failure, and repair routes;
- binding source `workflow_state`;
- typed blocking issues with owning role;
- explicit confirmation that reference navigation is excluded from authority.

Unknown action or screen mappings block. Role-based or “closest screen” fallbacks do not become routed authority.

## Main-Process Enforcement

The renderer may submit the action ID, state revision, and form fields. It may not supply trusted target/source/output paths. Before preview or save, the main process reloads the workflow-state index and registry, verifies the state revision, rehydrates the routed contract, resolves exact artifacts by ID, and applies the role gate.

Stale renderer state, a different reference card, a different reference phase, list ordering, cached selector values, or filename-prefix similarity cannot change the contract.

## Reference Navigation

`ReferenceNavigationState` is a separate type and state path. It may identify an artifact for optional viewing in Artifacts. It is never accepted as:

- a routed target;
- a required source;
- a form default when a routed contract exists;
- a preview/save association;
- transition evidence.

## Blocking Behavior

The contract blocks preview and save when:

- target or source identity is missing;
- more than one active authority exists;
- a pair is unsynchronized;
- the expected output does not match the action;
- the renderer state revision is stale;
- the acting role is unauthorized;
- the workspace does not match the routed screen.

Each blocker identifies the correction owner and next action. The runtime never repairs ambiguity by choosing a candidate.

## WC08 Binding

For the migrated WC08 action, the contract binds:

- target: WC08-REPAIR04;
- source: exact WC08-REPAIR04 Implementer Report;
- output: exact WC08-REPAIR04 Architect Review;
- success route: Operator Validation.

Parent WC08, WC08-REPAIR05, historical Implementer Reports, and reference selections cannot substitute for any field.
