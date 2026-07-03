# Work Card Backlog

## Reconciled Phase 02 Sequence

- WC01: Add Project Intake capture
- WC02: Add Project Architect Interview prompt generator
- WC03: Repair validation and evidence UI
- WC04: Generate Project Planning Documents
- WC05: Add Phase Intake and Phase Interview prompt generator
- WC06: Generate Phase Planning Documents and pending-review Work Card Plan proposal
- WC07: Split Phase Map Builder and Phase Planning Documents Generator
- WC08: Phase Transition, Work Card Plan Review, and Artifact Authority Model

## Next Recommended Implementer Task

PH02 WC08 repair: Validate the artifact authority model, Work Card Plan Review screen, pending-review labels, Ad Hoc Work Card Capture authority guardrails, and Phase Closeout Next Phase Activation decision field.

## Notes

- WC03 is the validation and evidence UI repair that replaced the original WC03 planning slot.
- WC04 is this Project Planning Documents generation workflow.
- WC07 is a Phase 02 corrective Work Card, not Phase 03 planning.
- WC08 is a Phase 02 corrective Work Card, not Phase 03 activation or implementation.
- Corrected flow: Project Planning Documents + Repository Reconciliation + Project Roadmap -> Generate Phase Map -> Select mapped phase -> Generate Phase Planning Documents.
- Planned phase work proceeds from Phase Planning Documents -> Work Card Plan -> Work Card Plan Review -> explicit Operator-approved Formal Work Card creation. Ad Hoc Work Card Capture is separate.
- Phase Planning Documents and Work Card Plans created before closeout must remain Draft / Pending Review / Not Active.
- Work Card Plans propose Work Card count, order, names, and rough intent only; Formal Work Cards require a separate Operator approval step.
- Planned Work Card entries can be planned, already satisfied, implemented but not validated, validated but not closed, deferred, or superseded without becoming executable.
- Phase Intake is not a normal operator input; Phase Architect Interview is optional and downstream after roadmap/reconciliation context has been evaluated.
- The Phase Map Builder must not require a phase dropdown. The phase dropdown belongs only on the planning-doc generator screen after mapped phases exist.
- Do not generate Phase 03 Formal Work Cards, activate Phase 03, or close Phase 02 until WC08 validation is reviewed by the Operator.
