# ChampCity Runtime Recovery Decision

**Status:** Adopted architecture decision — September 13, 2026

This decision supplements the draft Agent Runtime Interface Contract for two previously open areas: returning the result of a ChampCity-hosted external action to the exact suspended runtime turn, and reconciling worker execution after connection/runtime loss.

## External-action continuation

When a Runtime asks ChampCity to perform an external semantic action on its behalf, the request and its returned result stay correlated to one execution session, runtime thread, runtime turn, and action-call identity.

The Runtime Adapter must provide a continuation operation that accepts that correlation set plus either a normalized success result or normalized error. The exact method name and transport are implementation details.

Required behavior:

- the same action result submitted twice is idempotent;
- a conflicting second result for one action-call identity fails closed;
- a result cannot be attached to a different/later turn;
- a result arriving after an incompatible terminal turn is treated as stale; and
- runtime conformance is incomplete if a hosted external action cannot resume the suspended turn with its normalized result.

## ChampCity execution ledger

ChampCity owns a durable execution-session identity for each governed worker. RuntimeService keeps an execution ledger that maps this identity to the selected runtime implementation/instance, opaque runtime thread/turn references, Project/Work Item correlation, observation state, and terminal outcome.

Runtime-native identities remain adapter-owned references. They do not replace the ChampCity execution identity.

## Observation loss

Loss of a stream, socket, IPC connection, browser connection, or other observation path does not prove that execution failed.

RuntimeService first reconciles the known worker using the status/replay facilities supported by that runtime. The result may be running, waiting, completed, failed, interrupted, or unknown.

If replay/cursors are supported, RuntimeService resumes from the latest durable cursor. Otherwise it reconciles from current status and any available terminal result.

## Runtime-instance loss

If a runtime instance disappears and the adapter cannot prove durable continuity for its existing thread/turn, the current execution is recorded as runtime-lost/unknown according to the normalized error contract.

A replacement worker receives a new ChampCity execution-session identity. It may work on the same Project/Work Item but does not inherit the old runtime thread/turn references unless the adapter proves continuity.

ChampCity never fabricates durable thread continuity for a runtime that does not provide it.

## Late and duplicate terminal outcomes

The first valid terminal outcome becomes the execution outcome. An identical duplicate is idempotent. A conflicting duplicate is an integrity error requiring reconciliation.

A late terminal outcome recovered after temporary observation loss may complete the original execution if no contradictory outcome was already committed. A late outcome from an abandoned execution may be retained as evidence/diagnostics but cannot overwrite the outcome of a replacement execution.

## Client state

The client should distinguish running, reconnecting/reconciling, waiting, completed, failed, runtime lost, and outcome unknown. Outcome unknown is not permission to silently create a second execution before reconciliation.

## Conformance

Engineering-runtime conformance must exercise hosted-action continuation, duplicate/conflicting results, observation loss and reconnection, runtime-instance loss, supported durable resume/replay, late terminal outcomes, and replacement execution under a new ChampCity execution identity.

## Final Rule

ChampCity owns durable execution identity and reconciliation. The Runtime owns opaque continuity references. Losing observation is not the same as losing execution, and a hosted external action is not complete until its result is returned to the exact suspended turn.
