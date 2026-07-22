# Work Card Plan — Phase 08 Nested Lifecycle and Workspace Recovery

Status: WC16 comprehensive production-integration repair authorized after committed handoff
Plan revision: 11
Project: ChampCity A/I
Active repair: WC16
Active execution authority: `planning/phases/phase-08/IMPLEMENTER_HANDOFF_WC16_phase_08_production_integration_runtime_completion_repair.md`
Defect source: `planning/phases/phase-08/Architect_Reviews/ARCHITECT_REVIEW_PHASE08_CONTINUOUS_FIRST_PASS_IMPLEMENTATION.md`
Git mutation: not authorized during Implementer execution

## Current Disposition

The continuous first pass produced one report for each planned card but did not produce an Operator-usable Phase 08 application.

```text
WC01 foundation                 → conditionally accepted
WC01A–WC15 first-pass package   → RevisionRequested
Operator validation             → withheld
Phase 08 closeout               → prohibited
```

The earlier continuous first-pass handoff is complete and no longer authorizes additional implementation.

## Historical First-Pass Sequence

```text
WC01 → WC01A → WC01B
→ WC02 → WC03 → WC04 → WC05
→ WC06 → WC07 → WC08
→ WC09 → WC10 → WC11 → WC12 → WC13
→ WC14 → WC15
```

Those Work Cards and reports remain evidence of the first pass. They are not independently accepted except for the bounded WC01 foundation disposition recorded by the Architect.

## Active Repair

### WC16 — Phase 08 Production Integration and Runtime Completion Repair

Depends on: the complete WC01–WC15 first-pass package and cumulative Architect review.

Purpose: convert the first-pass service modules into one reachable Electron workflow and correct the shared production-authority defects.

Detailed card:

`planning/phases/phase-08/Work_Cards/WC16_phase_08_production_integration_runtime_completion_repair.md`

Synchronized JSON:

`planning/phases/phase-08/Work_Cards/WC16_phase_08_production_integration_runtime_completion_repair.json`

Implementer handoff:

`planning/phases/phase-08/IMPLEMENTER_HANDOFF_WC16_phase_08_production_integration_runtime_completion_repair.md`

Required report:

`planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC16_phase_08_production_integration_runtime_completion_repair.md`

## WC16 Required Result

```text
Phase 08 services
+ constrained main IPC
+ preload contracts
+ renderer workspace actions
+ real embedded Architect surface
+ supported artifact handoff and MCP write-back
+ canonical artifact transactions
+ production-path tests
= Operator-usable Phase 08 application
```

WC16 must repair:

1. unreachable WC04–WC15 services;
2. absent embedded browser and simulated status behavior;
3. filename-manifest substitution for real handoff;
4. generic single-document disposition bypass of bundle authority;
5. incorrect document classification and context gating;
6. renderer-controlled arbitrary repository path authority;
7. placeholder Architect-authored output shells;
8. inconsistent direct-write transaction helpers;
9. incomplete post-validation repair integration;
10. service-only test authority and development-corpus fixture coupling;
11. undifferentiated generic workspace UI.

## Active-Corpus Boundary

Pre–Phase 07 planning and superseded project/system records were intentionally removed before WC16.

WC16 must not restore or support them.

Current runtime and test authority is limited to:

- Phase 07 clean-room contracts;
- Phase 08 planning and design records;
- canonical artifacts created by the repaired application;
- curated test-only clean-room fixtures outside production `planning/`.

## Release and Stop Rules

1. WC16 begins only after its card, JSON sibling, handoff, and revision 11 control records are committed and the repository is clean.
2. The WC16 handoff is the sole execution authority.
3. Do not create unapproved subcards merely to avoid the comprehensive integration scope.
4. Stop on the embedded-browser/MCP hard blocker rather than fabricating success.
5. Do not restore deleted compatibility behavior.
6. Do not add dependencies without explicit approval.
7. Do not perform Git operations during implementation.
8. Do not begin Operator acceptance or Phase 08 closeout after the Implementer pass.

## Completion Boundary

WC16 ends with:

- one Pending Implementer Report;
- current typecheck, build, and test evidence;
- launch-smoke evidence;
- an attempted and accurately reported embedded Architect/MCP integration lane;
- no Architect self-approval;
- no Operator acceptance;
- no Phase closeout;
- no Git mutation.

After WC16, the Architect reviews the report and repository before designing Operator validation.

## Document Disposition

Document.Status=Approved
