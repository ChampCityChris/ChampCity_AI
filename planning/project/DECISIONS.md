# Decisions

## Current Decisions

- The Operator remains a centaur. ChampCity A/I should not become a fully autonomous software-creation system. The Operator remains responsible for approvals, validation, decision-making, and movement between workflow states.
- Project profile, phase plans, work cards, Architect outputs, Implementer outputs, validation notes, Builder Reports, repair prompts, closeout records, and decision history.
- ChampCity MCP is the repo bridge that allows the Architect to inspect project state, generate and save planning artifacts, review Builder Reports, and support the Operator’s decision loop without relying on stale chat context alone.
- Fully autonomous software creation without Operator review, validation, and decision authority.
- The project must avoid state fragmentation. The app must keep durable profile, phase, work-card, prompt, handoff, validation, repair, closeout, and decision artifacts tied together. Raw chats alone are not sufficient.
- Durable planning artifacts are stored as Markdown and JSON in the repository.
- Product-facing terminology uses Operator, Architect, and Implementer.
- The core loop remains Capture -> Frame -> Plan -> Build -> Prove.
- Preferred Implementer tool: Codex.
- Architect surface: ChatGPT.
- Phase 02 WC07 separates phase mapping from phase planning. The normal flow is Project Planning Documents + Repository Reconciliation + Project Roadmap -> Generate Phase Map -> Select mapped phase -> Generate Phase Planning Documents.
- Phase Map Builder is the authority for creating mapped phase records and must not require a phase dropdown sourced only from existing phase artifact folders.
- Phase Planning Documents Generator may show a phase selector only after a Phase Map exists, and the selector must be populated from mapped phase records.
- Phase Intake is not a normal upstream operator input for phase planning. Existing Phase Intake artifacts remain compatibility records only.
- Phase Architect Interview is optional and downstream. It may be used for phase-specific clarification only after roadmap and reconciliation context have established the target phase.
- Phase-specific clarification answers should be collected inline when blocking unknowns remain; the normal path must not require pasted completed Phase Architect Interview output.
- WC08 defines the artifact authority model for phase transition and next-phase planning.
- The app may plan a next phase before or during current-phase closeout, but those next-phase artifacts must remain Draft / Pending Review / Not Active until an explicit Operator decision.
- Project Roadmap creates proposed end-to-end project progression; phases remain Proposed until mapped.
- Phase Map creates structured phase status and phase-selection records, but mapped phase records are not active by themselves.
- Phase Planning Documents created before prior-phase closeout are Pending Review unless the Operator later approves them through the appropriate workflow.
- Work Card Plans propose Work Card count, order, names, and rough intent only; they must not automatically create Formal Work Cards.
- Work Card Plan Review is the normal planned-work review surface after Phase Planning. It may show proposed entries and disabled future actions, but WC08 does not authorize it to materialize Formal Work Cards.
- Planned entries must distinguish planned, already satisfied, implemented but not validated, validated but not closed, deferred, and superseded states.
- Formal Work Cards require a separate Operator approval step and must be saved under `Work_Cards/`.
- Architect-created Implementer Prompts come after a Formal Work Card exists.
- The existing Capture screen is relabeled Ad Hoc Work Card Capture and is reserved for out-of-cycle, one-off, repair, emergency, or operator-discovered work.
- Ad Hoc Work Card Capture uses manual/ad hoc authority. Its local fields determine the saved draft and should not silently combine with a selected Work Card or planned Work Card proposal.
- Phase 03 draft artifacts may live under `planning/phases/phase-03/`, but they are not active until closeout or activation.
- Phase Closeout must include a Next Phase Activation decision.
- Supported Next Phase Activation decisions include Activate next phase, Defer next phase, Revise roadmap first, Carry unresolved current-phase items forward, and Close current phase without activation.

## Decision Notes

Historical Builder artifact paths remain compatibility storage names until a dedicated migration Work Card changes them safely.

WC07 and WC08 are Phase 02 corrective Work Cards. They do not authorize Phase 03 activation or Phase 02 closeout; the Operator owns those decisions after validation.
