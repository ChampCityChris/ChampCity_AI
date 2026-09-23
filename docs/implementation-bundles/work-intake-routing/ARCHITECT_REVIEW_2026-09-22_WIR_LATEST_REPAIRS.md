# WIR Latest Repairs — Architect Review

**Review date:** 2026-09-22  
**Reviewed repairs:** WIR23-REPAIR01-REPAIR02 and WIR23-REPAIR03C-REPAIR01

## Overall result

WIR23-REPAIR01-REPAIR02 is conforming and closes AR-WIR-R1.

WIR23-REPAIR03C-REPAIR01 correctly fixes the primary single-candidate retained-completion defect, but the combined review found two remaining issues:

1. candidate discovery can still hide an older active candidate behind a newer terminal candidate from the same logical completion;
2. the routed integration characterization owner has regressed from the recovered-suite budget to a 305-second file.

Neither finding requires reopening the generic completion architecture, Research checkpoint design, IntegrationCandidate identity, or target-advance mechanics.

## Independent verification

Current combined source was independently exercised through the repository validation service.

Passing independent owners:

- `test/issue-resolution/issue-architect-planning-service.test.cjs`: 12/12 passed.
- `test/architect-outputs/architect-output-workspace-repair.test.cjs`: 27/27 passed.

Additional independent routed-integration/candidate invocations were temporarily unavailable because the repository validation executor reported another validation run already active. The Implementer Report for WIR23-REPAIR03C-REPAIR01 records:
- routed integration characterization: 5/5 passed;
- candidate semantics: 8/8 passed;
- typecheck: passed.

The runtime finding below is taken directly from that Implementer evidence and the established Test Recovery baseline.

## WIR23-REPAIR01-REPAIR02

### Result: conforming

`workIssueRoutingService.ts` now builds the full proposed generated Assessment, then compares it semantically before deciding whether to write.

The comparison correctly preserves:
- exact body semantics after canonical newline normalization;
- exact identity;
- exact non-route source revisions;
- exact non-route source digests;
- exact remaining workflowData;
- exact document disposition.

Only the exact current route-decision path is excluded from the write predicate's source revision/digest comparison.

When a semantic write is required, current route provenance remains fully persisted.

The regression test proves:
- same route selection identity survives the no-op reroute;
- Issue identity/handoff remain unchanged;
- Assessment bytes and revision remain unchanged;
- Plan bytes and revision remain unchanged;
- both remain non-stale;
- later real RCA evidence change still revises/stales the proper evidence;
- later real route change remains destructive to the Issue route lineage.

No additional repair is required for this card.

## WIR23-REPAIR03C-REPAIR01

### Primary result: conforming

The service now distinguishes:

**logical completion identity**
- kind;
- routeDecisionId;
- completionId;

from:

**exact completion identity**
- logical identity;
- revision;
- fingerprint;
- sourcePath.

That correctly restores the primary behavior:
- a retained active candidate remains visible when the same logical completion changes;
- query returns not-ready with current completion fingerprint and the retained candidate;
- fresh candidate construction is blocked;
- explicit abort restores eligibility;
- candidate core exact-current validation remains unchanged.

The focused Research test proves that primary path.

### Finding AR-WIR-R3 — Newer terminal record can shadow an older active candidate

Current query logic does:

```ts
const records = candidate.list(intakeId)
  .filter(entry => sameLogicalCompletion(entry.completion, state.completion));
let record = records.at(0);
```

The list is newest-first.

If the repository already contains multiple records for one logical completion, a newer terminal record can therefore shadow an older active retained candidate.

This state is possible specifically because the pre-repair defect allowed a changed completion to hide an older active candidate and construct another candidate.

Example retained history:

```text
Candidate A — revision 1 — validation-failed   (active, older)
Candidate B — revision 2 — aborted             (terminal, newer)
Current completion — revision 3
```

Current code selects B. Because B is aborted and does not exactly match revision 3, query clears it and proceeds as though no candidate exists. Candidate A remains active but hidden.

A related status error exists for stale integrated records: the generic stale-completion block applies to any non-aborted selected record, including `integrated`, even though integrated candidates are terminal and the UI does not expose abort for them.

The selection rule must distinguish active retained records from terminal history.

Repair:
`WIR23-REPAIR03C-REPAIR02_select_active_candidate_across_terminal_history.md`

### Finding AR-WIR-R4 — Routed integration test owner regressed above recovered budget

Test Suite Recovery established:

- `routed-integration-focus.test.cjs` final focused result: **23.903 seconds, 3/3 passed**;
- recovered-suite audit: ordinary owners below 60 seconds;
- this file retained as a bounded wider integration sentinel rather than a general lifecycle replay.

The latest Implementer Report records:

- `routed-integration-focus.test.cjs`: **305.0 seconds, 5/5 passed**;
- budget status: review-required;
- 305 seconds exceeds the architecture's 300-second hard review threshold and is far above the recovered owner baseline.

The file has accumulated:
- clean Plan integration;
- conflicting Plan integration + Repair;
- successful no-Plan Research integration;
- changed Research completion / retained-candidate recovery.

The new Research paths are valid unique proof, but continuing to stack them into the recovered Plan integration owner recreates the megascenario/test-amplification failure mode that Test Suite Recovery removed.

This is a test-architecture defect even though all assertions pass.

Repair:
`WIR23-REPAIR03C-REPAIR03_restore_routed_integration_test_budget.md`

## Remaining order

1. WIR23-REPAIR03C-REPAIR02 — fail-closed candidate selection across terminal history.
2. WIR23-REPAIR03C-REPAIR03 — restore bounded integration test ownership/runtime.

REPAIR03 should follow REPAIR02 so the final Research integration owner measures the completed candidate-discovery behavior.

After both return, perform the final WIR architecture closure review.
