# Repository Checkout Orchestration — Work Card Plan

## Objective

Implement the adopted concurrent RepositoryCheckout architecture so ChampCity can operate like a multi-agent engineering team: multiple Work Items execute concurrently on isolated branches/checkouts, each implementation becomes a durable checkpoint revision before review, and completed work integrates safely into a moving `dev` target.

## Governing Architecture

- `docs/architecture/CHAMPCITY_CONCURRENT_REPOSITORY_CHECKOUT_ARCHITECTURE.md`
- `docs/architecture/CHAMPCITY_WORK_INTAKE_ROUTING_AND_PLANNING_ARCHITECTURE.md`
- `docs/architecture/CHAMPCITY_CLIENT_SERVICE_CONTRACT.md`
- `docs/architecture/CHAMPCITY_DETERMINISTIC_AUTOMATION_BOUNDARIES.md`

## Card Sequence

1. **RCO01 — Establish RepositoryCheckout Identity and Deterministic Inventory**
2. **RCO02 — Implement Managed Git Worktree Lifecycle Mechanics**
3. **RCO03 — Make Repository and MCP Inspection Checkout-Aware**
4. **RCO04 — Provision Isolated RepositoryCheckouts for Concurrent Work Intake Execution**
5. **RCO05 — Bind Implementer Runtime Execution to the Assigned RepositoryCheckout**
6. **RCO06 — Enforce Checkpointed Exact-Revision Review Readiness**
7. **RCO07 — Integrate Concurrent Completed Work into a Moving dev Target and Retire Checkouts**
8. **RCO08 — Deliver Concurrent Work Operator Visibility and End-to-End Acceptance**

## Dependency Shape

```text
RCO01
  ↓
RCO02
  ↓
RCO03
  ↓
RCO04
  ↓
RCO05
  ↓
RCO06
  ↓
RCO07
  ↓
RCO08
```

The bundle is deliberately sequential because later cards consume contracts established by earlier cards. Once implemented, the resulting product enables concurrent execution across independent Work Items.

## Validation Strategy

Each card owns focused proof for its behavior. RCO08 owns the bundle-wide concurrent-execution acceptance scenario and full canonical repository regression required by the final integrated state.
