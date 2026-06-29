# UX Flow Map

## End-To-End Workflow

1. Operator intent
2. Work Card draft
3. Architect framing prompt
4. Risk review
5. Builder prompt
6. Builder report capture
7. Human validation
8. Repair prompt or phase closeout

In artifact terms:

Operator intent -> Work Card JSON/Markdown -> Architect Prompt -> Risk Review -> Builder Prompt -> Builder Report -> Human Validation -> Repair Prompt or Phase Closeout.

## Workflow Detail

### Operator Intent

The Operator starts with a plain-language idea, fix, or goal. The product should make this feel approachable and guided, not like filing a ticket.

### Work Card Draft

The app structures the intent into a durable Work Card. The draft is not Builder-ready by default. It is saved as JSON for app workflows and Markdown for human planning review.

### Architect Framing Prompt

Architect mode reviews the Work Card, asks clarifying questions, provides recommended defaults, pushes back on unsafe scope, and turns fuzzy intent into a sharper handoff.

### Risk Review

The deterministic Risk Router checks the Work Card for high-risk categories and scope-creep signals. The review informs Architect/Operator judgment but does not approve or mutate the Work Card.

### Builder Prompt

Implementer mode receives a precise prompt assembled from the Work Card and selected supporting artifacts. This is the handoff from thinking to doing.

### Builder Report Capture

After implementation, the Builder Report is captured as durable evidence. The app checks for important report signals without pretending to grade the work.

### Human Validation

The Operator records what was tested, what passed, what failed, evidence references, errors, and the next decision. Failed, partial, or blocked outcomes can produce a Repair Prompt.

### Repair Prompt Or Phase Closeout

If the work needs repair, the app prepares a narrow repair handoff. If the phase is ready for review, the app summarizes phase artifacts and records a closeout decision.

## Mental Model

### Architect Mode

Architect mode clarifies, frames, questions, reviews, and translates intent. It protects the Operator from vague or risky handoffs.

UI feeling:

- Calm guidance.
- Thoughtful prompts.
- Clear checkpoints.
- A sense of "shape the work before building."

### Implementer Mode

Implementer mode executes from precise handoff. It should feel focused, bounded, and action-oriented.

UI feeling:

- Concrete inputs.
- Artifact readiness.
- Clear risk signals.
- A sense of "this is ready to hand to Builder."

### Operator

The Operator is a non-developer user guiding the workflow. They need enough structure to get reliable implementation without being forced into developer jargon.

UI feeling:

- Consumer-grade polish.
- Plain-language choices.
- Progressive disclosure.
- Confidence about what has been saved and what needs attention.

## Desired Experience Shape

The redesigned app should feel like a guided creative cockpit:

- One clear current step.
- Persistent sense of where the Work Card is in the loop.
- Compact panels that reveal detail when needed.
- Artifact previews that feel useful, not like raw logs.
- Warnings that are calm but visible.
- Save states that build trust.

The workflow should not feel like:

- A ticket queue.
- An internal admin panel.
- A developer console.
- A giant form with a Markdown dump beside it.
