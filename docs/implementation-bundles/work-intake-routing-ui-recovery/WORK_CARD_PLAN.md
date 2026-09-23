# Work Intake Routing UI/UX Recovery — Work Card Plan

**Status:** Ready for sequential implementation  
**Parent audit:** `ARCHITECT_UI_UX_AUDIT_2026-09-22.md`

## Objective

Repair the Work Intake Routing renderer so the routed lifecycle uses ChampCity's established Workspace interaction architecture across Routing, Planning, Execution, Issue Resolution, Acceptance, and Integration.

This package is a UI/workflow-composition repair. Existing route/planning/source-control semantics remain in place except where a small adapter change is explicitly required to support established interaction behavior.

## Sequencing

| Card | Outcome | Primary boundary |
| --- | --- | --- |
| WIR-UX01 | Routed stage navigation, shared doc/chat shell, embedded Architect attachment | App shell / navigation |
| WIR-UX02 | Usable Routing Assessment + Operator decision workspace | Routing renderer |
| WIR-UX03 | Separate Architect Assessment and Plan workspaces | Planning renderer |
| WIR-UX04A | First-class decomposition workspace | Decomposition renderer |
| WIR-UX04B | Issue route transitions into existing Issue Resolution | Routed Issue bridge |
| WIR-UX05A | Routed Work Item Map, Planning, Implement workspaces | Generic execution first half |
| WIR-UX05B | Review/Validation, Repair, Close/Next, Acceptance workspaces | Generic execution second half |
| WIR-UX06 | Dedicated Integration + in-product Integration Repair Implementer | Integration/runtime adapter |
| WIR-UX07 | End-to-end visual/interaction qualification and test cleanup | Qualification |

Cards must be executed in order. A predecessor's exact named interface is a precondition for later cards; when the predecessor implements the specified interface, the next card continues without another architecture decision.

## Package invariants

- No card may replace routing/planning/source-control domain semantics with renderer state.
- No card may create a new second Architect browser implementation.
- Architect-backed Workspaces must use the existing embedded ChatGPT browser host.
- Issue routing must reuse the existing Issue Resolution workflow.
- Generic routed execution must model the existing Work Card loop rather than create another monolithic lifecycle panel.
- Integration Repair must retain application-owned Git and validation.
- Internal enums/paths may appear in inspectable detail, but the main task surface must use human-readable states/actions.
- Permanent tests prove interaction contracts and state transitions, not incidental JSX nesting.

## Validation strategy

Focused renderer/service tests are required per card. Do not run the full suite from every card.

The final WIR-UX07 card owns broad routed UI qualification, running the relevant renderer owners and exercising a representative routed flow in the running application at the supported workstation viewport.
