# Context Packet And Token Budget Standard

## Purpose

Context packets are bounded manual copy/paste artifacts. They reuse durable project decisions and include only evidence relevant to the requested decision or execution. They do not call a model, connector, or external service.

## Architect Context Packets

Supported scenarios are:

- just-in-time Work Card creation;
- Implementer Report review;
- validation disposition and repair creation;
- phase closeout.

Each packet contains a concise stable contract summary, current authoritative workflow state, exact decision requested, controlling sources or bounded summaries, relevant open observations, changed evidence since the prior decision, and an inclusion/exclusion manifest.

## Implementer Execution Packets

Each packet contains the current Work Card delta, architecture/UI contract references, exact acceptance criteria, controlling sources, relevant observations, repository/branch facts, validation-lane references, expected Implementer Report path, and an inclusion/exclusion manifest.

`AGENTS.md` and `docs/dev/VALIDATION_COMMAND_LANES.md` are referenced rather than copied. Complete repair history, resolved observations, superseded reports, and unrelated phase evidence are excluded by default.

## Selection Rules

Include:

- the routed target, required sources, and expected output identity;
- explicitly controlling sources;
- open observations relevant to the active phase/target;
- evidence changed since the prior decision;
- stable contract summaries needed to constrain the decision.

Exclude with a recorded reason:

- resolved or unrelated history;
- superseded, archived, or historical evidence unless explicitly controlling;
- unrelated reports and Work Cards;
- repeated permanent repository rules;
- complete repair chains when a bounded current delta is sufficient.

## Estimation And Budgets

The deterministic estimate is UTF-8 bytes divided by four, rounded up. Every manifest records the method, total estimate, configured budget, and largest contributors.

Defaults are configurable:

- Architect: 12,000 estimated tokens.
- Implementer: 16,000 estimated tokens.
- Largest-contributor list: five items.

An over-budget packet is previewable but cannot be exported until the Operator explicitly acknowledges the warning. Without acknowledgment, no packet or manifest pair is written.

## Persistence

Export saves a canonical packet pair and an adjacent canonical context-manifest pair through one governed batch write. The manifest records included and excluded entries, reasons, estimates, budget status, and acknowledgment requirement. A partial batch failure blocks export and preserves prior authority.
