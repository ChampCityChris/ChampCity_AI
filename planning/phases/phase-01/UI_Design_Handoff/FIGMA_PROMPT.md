# Copy-Ready Figma Prompt

Design a compact modern dark UI for an Electron desktop app named ChampCity A/I.

Product meaning: A/I is a play on AI, but means Architect / Implementer. The product embodies the ChatGPT / Codex dichotomy:

- Architect: frames, questions, reviews, and translates user intent.
- Implementer: builds from a precise structured handoff.

The app helps a non-developer Operator guide a Work Card from idea to implementation evidence. The experience should feel like a guided creative cockpit, not a ticketing system, enterprise admin dashboard, developer utility, or raw Markdown console.

Current workflows and screens to preserve:

- New Work Card.
- Architect Prompt Composer.
- Risk Router.
- Builder Prompt Generator.
- Builder Report Capture.
- Human Validation.
- Phase Closeout.

Design goals:

- Compact modern dark style.
- Consumer-grade polish.
- Calm, readable, and confidence-building.
- Reduce form fatigue with better grouping, hierarchy, progressive disclosure, and cleaner preview surfaces.
- Make the Architect / Implementer concept visible in the navigation, workflow stage model, and screen composition.
- Use navigation and layout suitable for an Electron desktop app.
- Provide React-friendly design output with reusable components and clear naming.
- Preserve functional labels enough that Codex can implement the design against the existing source.

Functional behavior to preserve:

- New Work Card saves paired JSON and Markdown artifacts.
- Architect Prompt Composer lists saved Work Card JSON files, previews prompts, copies prompts, and saves Markdown prompts.
- Risk Router shows assessed risk, flagged categories, matched terms, scope-creep signals, Architect review questions, and saves Markdown reviews.
- Builder Prompt Generator selects optional supporting artifacts, previews/copies Builder prompts, shows high-risk or missing-risk-review warnings, and saves Markdown prompts.
- Builder Report Capture supports report type, topic, file import, paste/edit, validation warnings, generated filename, and saves Markdown reports.
- Human Validation links optional Builder Reports, shows manual validation checklist extraction, captures validation/evidence fields, previews validation Markdown, and generates Repair Prompts when required.
- Phase Closeout summarizes artifacts, shows Work Card pairing and warnings, captures closeout decision fields, previews closeout Markdown, and saves JSON/Markdown records.

Required UI states:

- Empty lists.
- Loading states.
- Validation errors.
- Warning states.
- High-risk warning state.
- Missing supporting artifact notes.
- Saved-success messages.
- Copy success/failure.
- Artifact previews.
- Generated filename previews.
- Non-mutating informational notes.

Avoid:

- Ticket queue visuals.
- Enterprise admin dashboards.
- Giant unbroken forms.
- Developer-console aesthetic.
- Raw Markdown as the dominant first impression.
- Overly playful game UI.
- New auth, cloud, database, deployment, provider SDK, connector, or MCP concepts.

Please propose a component system for React implementation, including:

- App shell and workflow navigation.
- Step/status indicators.
- Compact field groups.
- Selectors and artifact pickers.
- Warning, error, notice, and success states.
- Artifact preview panels.
- Markdown/report preview treatment.
- Save/copy action bar.
- Empty states.
- Risk badge and risk detail components.
- Phase artifact summary components.

Use the attached/current screenshots or screenshot instructions plus the handoff docs as source context. Keep all seven workflows present, but make the UI feel more like a polished consumer product than internal planning software.
