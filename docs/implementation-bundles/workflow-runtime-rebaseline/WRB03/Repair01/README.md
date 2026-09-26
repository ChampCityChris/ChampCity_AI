# WRB03 Repair01 — Workflow Planning Authority and Product-Path Repair

**Parent bundle:** WRB03 — Workflow Planning Normalization  
**Starting checkpoint:** `46da96bcd8d596b68b2924d0fa8dce8e11e06e9d`  
**Implementer:** GPT 6.0 Luna Medium  
**Review cadence:** execute all three cards sequentially; final Architect review after R01-03.

## Repair outcome

Repair01 does not redesign WRB03.

It closes five bounded defects discovered at the bundle boundary:

- Feature/Issue mutation IPC channels are unreachable because their Workflow-ID validators reject correct two-argument invocations;
- pre-plan Finding/RootCause ownership uses generic `relates_to` instead of the explicit exact-Workflow ownership contract;
- Issue RCA current identity is hidden inside Decision rationale and RCA promotion is not atomic;
- accepted Feature assessment content is discarded before plan preparation;
- peer Workflow plans are incorrectly exposed as accepted Project architecture context.

The accepted canonical plan graph, Workflow-scoped projection, exact-instance UI dispatch, lazy source boundary, and read-only Work Item Map remain the baseline.

## Sequence

1. WRB03-R01-01 — Restore Feature/Issue planning IPC reachability
2. WRB03-R01-02 — Restore exact Workflow semantic ownership and atomic Issue RCA authority
3. WRB03-R01-03 — Preserve Feature assessment semantics, isolate Project context, and requalify WRB03

Each card requires focused validation, an Implementer Report, and one attributable checkpoint commit.

After R01-03, stop for final Architect review.

Do not begin WRB04 and do not repair the WRB04 integration candidate/common-directory defect in this bundle.
