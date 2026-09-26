# WRB04-02B — Typed Same-Workflow WorkItem Decomposition

**Depends on:** completed WRB04-02

## Objective

Add one atomic typed Project State command that replaces an oversized canonical WorkItem with bounded same-Workflow sibling WorkItems while preserving every acceptance obligation and dependency.

## Architecture and constraints

Use the exact current Workflow and WorkItem identities established by WRB04-01/02. Preflight the complete proposal before writing. Supersede the original WorkItem and create replacement siblings under its exact Workflow or Phase owner. Do not add a generic container WorkItem or manufacture Phases.

Every active Criterion owned by the original must be explicitly mapped to one or more replacement WorkItems or to the existing owning Phase/solution. Incoming and outgoing dependency edges must be explicitly mapped. Reject omitted required Criteria, cross-Workflow references, invalid work kinds, duplicate/ambiguous mappings, cycles, and stale source versions. The mutation is atomic; failure leaves the original graph unchanged.

No Markdown plan, route-owned WorkItem, or second planning engine may participate.

## Acceptance

1. A valid decomposition atomically supersedes the original and creates application-issued same-Workflow replacements.
2. Required Criteria and dependency semantics are fully mapped and queryable after the command.
3. Cross-Workflow or cyclic dependencies, missing obligation mappings, and stale inputs fail without partial writes.
4. Feature and Issue plans use the same typed command.

## Validation and report

Run build, focused Project State planning/decomposition tests, exact changed-path validation-plan preview, work-item profile, and `git diff --check`. Reuse or extend existing tests where possible; justify any new permanent test by its coverage gap. Write the card-specific Implementer Report under the WRB04 `Reports/` directory. Commit after completion, then proceed to WRB04-02C.
