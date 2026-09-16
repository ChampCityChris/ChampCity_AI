# ChampCity A/I UI Design Governance Standard

| Document control | Value |
| --- | --- |
| Standard ID | `CCAI-UI-001` |
| Version | `1.0` |
| Status | **Adopted by Operator — September 13, 2026**; adoption governs future in-scope UI work but is not evidence that existing UI already conforms |
| Prepared / research reviewed | September 13, 2026 |
| Intended location | `docs/governance/CHAMPCITY_UI_DESIGN_GOVERNANCE_STANDARD.md` |
| Scope | ChampCity-owned interfaces in Desktop standalone and the browser client shipped with ChampCity Server |
| Accountable owner | ChampCity Product Owner / Operator |
| Application | Human designers, Architects, Implementers, reviewers, and AI coding agents |

## 1. Purpose, governance, and use

ChampCity shall provide one coherent, legible, predictable working environment across Desktop and Server. Users must be able to understand the current task, identify the next meaningful action, retain control over AI activity, and complete work without fighting the layout.

This standard governs **what acceptable interface work looks like**. The UI Engineering Skill governs **how an agent performs that work**. Shared components and design tokens implement the standard. A project UI profile supplies product-specific configuration. None of these substitutes for observing the rendered product.

### UI-GOV-01 — Normative language and adoption

**MUST / MUST NOT** identify requirements. **SHOULD / SHOULD NOT** identify the preferred approach; a departure requires a documented reason. **MAY** identifies an option.

This standard is governing as of its Operator adoption date. Adoption does not direct an unrelated redesign, approve a Work Card, certify existing accessibility/conformance, or change workflow state/decision ownership. New or changed interfaces must conform to this version within their directed scope. Existing defects must be tracked rather than silently declared compliant.

Numeric layout, typography, density, performance-test, and sampling defaults identified as **ChampCity defaults** are proposed product decisions, not universal research findings or additional WCAG requirements.

### UI-GOV-02 — Operator decision boundaries, bounded context

Maintain one canonical, versioned standard. Desktop and Server must not maintain independently edited copies. Work Cards, Skills, and UI profiles reference the standard ID, version, and applicable rule IDs.

Agents should receive the mandatory cross-cutting rules and the sections relevant to the task, not a fresh copy of the entire standard in every prompt. Generated excerpts must retain their source version and rule IDs. They cannot weaken the canonical requirements.

An agent's aesthetic preference, a generated screenshot, or an external design-tool prompt never overrides an approved ChampCity design decision. Conflicts must be surfaced explicitly.

### UI-GOV-03 — Responsibilities without additional approval bureaucracy

| Role | Responsibility |
| --- | --- |
| Product Owner / Operator | Own user outcomes, visual direction, adoption, material exceptions, and final acceptance. |
| Architect / design lead | Translate the task into interaction, layout, state, accessibility, and evidence requirements. Reuse established patterns. |
| Implementer | Build within the agreed design contract, use shared components, and produce actual execution evidence. |
| Reviewer | Inspect behavior and rendered output, distinguish measured results from judgment, and identify violations. An AI review is advisory. |
| ChampCity automation | Run repeatable checks, record environment metadata, calculate comparisons, and preserve evidence. |

Use the existing planning and validation workflow. A new working station or material interaction redesign needs an agreed design direction before broad implementation. A bounded correction to an existing pattern does not require a new design committee, three alternative mockups, or another approval chain.

### Navigation

[Product parity](#3-one-product-experience-across-deployment-modes) · [Human-centered design](#4-human-centered-task-and-information-design) · [Visual system](#5-visual-system-typography-and-component-consistency) · [Responsive layout](#6-responsive-layout-and-scaling) · [Interaction](#7-interaction-content-and-recovery) · [Accessibility](#8-accessibility-baseline) · [AI interaction](#9-human-control-in-ai-enabled-workspaces) · [AI engineering process](#10-required-process-for-ai-assisted-ui-engineering) · [Verification](#11-verification-and-acceptance) · [Templates](#appendix-a--shared-ui-profile-template) · [Sources](#appendix-e--source-register-and-project-alignment)

### Agent entry point

Before changing UI, apply `UI-PAR-01`, `UI-HCD-01`, `UI-VIS-01`, `UI-LAY-01`, `UI-ACC-01`, `UI-AI-01`, and `UI-ENG-01` through `UI-ENG-05`. Read the component and layout sections relevant to the change. Use the templates in Appendices A–D to make the task and evidence explicit.

## 2. Research basis and design conclusions

The policy combines published accessibility criteria, practitioner design guidance, AI-tool documentation, research on AI-assisted design, and ChampCity's established architecture. These sources have different evidentiary weight.

| Evidence | Finding relevant to ChampCity | Policy consequence |
| --- | --- | --- |
| W3C WCAG 2.2 and its Understanding documents | Accessibility includes testable requirements for reflow, contrast, keyboard access, focus, and other interactions. | Use WCAG 2.2 AA as the accessibility target; do not substitute an aesthetic score for accessibility. [S01–S10] |
| Government Digital Service and Nielsen Norman Group | User needs, recognizable interactions, understandable feedback, and consistent patterns are central design concerns. | Design from a real task and review clarity and recovery, not merely visual polish. [S11–S13] |
| Figma's design-system guidance for AI generation | Explicit component usage, token documentation, and focused, progressively loaded instructions help communicate the intended system. | Give agents concrete approved patterns and component contracts instead of “make it modern.” Vendor guidance is not proof that a tool guarantees quality. [S14] |
| PrototypeAgent research | The authors investigate intent clarification, intermediate refinement, and design coherence. Their evaluation concerns prototypes and includes a small practitioner study, not production accessibility certification. | Use reviewable intermediate designs; do not assume one-shot generation or AI self-scoring proves usability. [S15] |
| Microsoft's Human-AI Interaction work | AI experiences require attention to capabilities, correction, control, and behavior when the system is wrong. | Separate AI proposals from accepted state and make interruption, correction, and scope visible. [S16] |
| W3C evaluation guidance and Playwright documentation | Automated checks have limits; visual comparisons also depend on a controlled rendering environment. | Combine automated checks, actual screenshot inspection, keyboard/assistive-technology checks, and human task evaluation. [S17–S19] |
| Anthropic's published frontend-design skill | Its design instructions emphasize intentional choices and avoiding unrelated template defaults. This is a vendor instruction artifact, not comparative research. | Preserve deliberate design intent, but do not import a marketing-page aesthetic or novelty requirement into an operational tool. [S20] |

**ChampCity conclusion:** the remedy for poor generated UI is not a longer list of adjectives. It is an agreed interaction design, a shared component system, constrained implementation, and review of the actual result. A visually attractive screen can still be the wrong interface.

This document is an adopted governance standard, not a live visual audit of the current application. Repository design guidance and a shared document/chat shell were reviewed; no complete running-application accessibility or responsive-conformance assessment was performed.

## 3. One product experience across deployment modes

### UI-PAR-01 — Shared design system and shared task semantics

Desktop and browser clients MUST consume the same governed tokens, reusable components, Workspace patterns, interaction vocabulary, and status meanings wherever the capability is shared. Separate implementations of the same button, validation panel, form field, or workflow rail require a concrete platform justification.

Given the same Project, task state, capabilities, viewport, theme, and density, users MUST encounter equivalent hierarchy, labels, available actions, and outcomes. Pixel-identical operating-system chrome and font rasterization are not required.

A Server screen must not become a separate “admin dashboard” solely because its services run remotely. Shared behavior belongs in the shared client; deployment adapters supply services and native integration.

### UI-PAR-02 — Explicit, legitimate differences

| Surface | Shared requirement | Permitted difference |
| --- | --- | --- |
| Workspaces and workflow actions | Same meaning, hierarchy, eligibility, and outcomes. | Pane arrangement adapts to available space. |
| Files and attachments | Clear selection, validation, progress, and failure states. | Native picker on Desktop; supported browser interaction remotely. |
| Local versus remote services | Clearly identify the active connection and affected resource. | Server connection/reconnection controls versus local-agent controls. |
| Notifications | Equivalent persistent in-app record for consequential events. | Native notification delivery where available and permitted. |
| Embedded Architect surface | Preserve the underlying user task and handoff. | A Desktop-only embedded surface may need a different browser-client route; do not promise unsupported embedding. |
| Keyboard and native chrome | Consistent task behavior and discoverable shortcuts. | Platform conventions for title bars, menus, and modifier keys. |

Unavailable capabilities MUST be distinguished from permission denial, disconnection, and temporary failure. A disabled control must not pretend that a feature is implemented. Client capability discovery must determine actual availability.

### UI-PAR-03 — The UI presents decisions and state; it does not create product decisions

The client MUST request transitions through the governing semantic service. It must not mark work approved, validated, complete, or closed because a local flag changed, a document appeared, or an agent said “done.”

Optimistic presentation is acceptable for reversible preferences or draft interactions with recovery. Approval, validation, closure, repository mutation, and execution authorization MUST not display authoritative success before the service confirms the outcome.

Stale or conflicting revisions must be visible. Returning to a Workspace, resizing it, changing tabs, or reconnecting must not silently execute an action or change a disposition.

## 4. Human-centered task and information design

### UI-HCD-01 — Define the user's job before the screen

Each new Workspace or material redesign MUST state: the user, their starting context, the task outcome, required decisions, most important information, primary action, recovery path, and a practical success test.

Use actual Operator needs and existing workflows. AI-generated personas, assumed preferences, and simulated users are hypotheses, not user research. For broader release, include representative less-technical users and experienced operators in task evaluation; include accessibility needs relevant to the audience. [S11]

The UI MUST make the following answerable without reading a developer explanation: **What am I working on? What is happening? What can I do next? What blocks me? What will the action affect?**

### UI-HCD-02 — Preserve context and use the agreed vocabulary

A **Project** is the thing being developed. A **Workspace** is a task-oriented working station. A **Repository** holds source/content. A **Host**, **Execution Environment**, **Client**, **Runtime**, and **Model** are distinct concepts.

Never present the legacy repository-routing `workspaceId` as the user's Project or Workspace identity. Display useful names first and technical IDs in inspectable details.

Show the active Project and current work item prominently. Show repository/branch, execution target, and local/Server scope where they affect a decision. Do not repeat the same identifiers in every header, card, and toolbar.

### UI-HCD-03 — Hierarchy and progressive disclosure

A Workspace SHOULD have one visually dominant action for its current task; supporting and destructive actions need distinct emphasis. This is not a ban on actions in independent panes. Approval choices MUST not be visually manipulated to push the user toward acceptance.

Organize information as task context, working content, required decision, then optional detail. Expose advanced controls, metadata, and raw logs on demand while keeping blockers and consequential facts visible. Core actions must not be available only on hover, through an unlabeled icon, or in a context menu.

Prefer a predictable layout to a novel one. Use a list for selecting objects, a table for meaningful comparison, a form for input, and a document surface for reading. Cards are appropriate for bounded independent objects—not as a wrapper around every heading and paragraph. [S13]

### UI-HCD-04 — Reduce unnecessary work

Prepopulate known context, retain valid input after errors, and preserve draft text, selection, filters, and reading position when it is safe to do so. Avoid making users copy identifiers, rerun completed steps, or re-enter information already available to ChampCity.

Show a safe next step where practical. Navigation must remain usable while unrelated background work runs. Changing a selected Project must not silently rebind an existing worker to that Project.

Guided Mode may explain more; Power Workbench may expose efficient controls. Neither mode changes the Operator's decision boundaries or workflow rules, and neither hides consequences. Expert shortcuts supplement, rather than replace, discoverable controls.

### UI-HCD-05 — Measure task quality, not decoration

For material changes, assess unaided task completion, wrong turns, mistakes, recoverability, time/effort relative to the previous flow, and users' ability to explain the system's state. Record observed problems and the resulting changes.

Do not claim usability from a generated persona's approval, an arbitrary AI score, or the designer liking a screenshot. Do not impose a universal participant count or task-time threshold without regard to risk. Operator dogfooding is valuable but does not establish usability for every intended user.

## 5. Visual system, typography, and component consistency

### UI-VIS-01 — A deliberate tool interface, not a generated landing page

ChampCity's starting direction is a restrained, precise working environment: neutral surfaces, clear type, controlled brand accents, and meaningful status treatments. Preserve approved branding; this standard does not authorize a rebrand.

Operational Workspaces MUST NOT acquire decorative hero sections, motivational marketing copy, invented activity metrics, gratuitous gradients, glass panels, oversized headings, emoji navigation, or animated backgrounds merely to look “modern.” A visual element must support content, interaction, or approved product identity.

Do not replace an established design system with a new fashionable palette, component library, icon set, or typography scheme during a bounded feature or repair. Novelty is not an acceptance criterion. Existing usability defects are not protected simply because they are old.

### UI-VIS-02 — Govern tokens rather than individual screenshots

Use semantic tokens for surfaces, text, borders, action emphasis, status, spacing, type, radii, elevation, motion, density, and layer order. Component code MUST NOT introduce unexplained competing values for these roles.

Define tokens once and consume them across shells. An exception belongs in a component variant or the approved UI profile, not a screen-specific override pile. Keep focus tokens distinct from selected-state tokens.

A token/component change MUST identify affected consumers and visual baselines. Do not treat a global stylesheet change as a local fix.

### UI-VIS-03 — ChampCity starting typography and density defaults

These defaults become mandatory only through adoption or the approved UI profile. They are not WCAG font-size thresholds.

| Use | Starting token / behavior |
| --- | --- |
| Reading text, instructions, document body | `1rem` (normally 16 CSS px), unitless line height about `1.5`. |
| Labels, controls, dense lists and tables | `0.875rem` (normally 14 CSS px); retain legibility at the default zoom. |
| Secondary metadata | Normally 12–13 CSS px equivalent; not for required instructions, errors, primary actions, or core document text. |
| Workspace title | Normally 20–24 CSS px equivalent; not a marketing headline. |
| Section heading | Normally 16–18 CSS px equivalent with clear weight and spacing. |
| Reading measure | Aim for roughly 60–80 characters per line; default prose container near `72ch`. Tables, code, and comparison surfaces use their own layout rules. |
| Standard / compact control | Normally 40 / 36 CSS px minimum height, with content-driven growth. Compact is an explicit mode, not the response to overflow. |
| Touch-oriented controls | Default at least 44 × 44 CSS px target area. |

Use a small, consistent type scale. Respect user font enlargement; do not reduce the root font size to force an interface to fit. Monospace is for code, logs, and identifiers where it helps interpretation, not every label.

Keep the typeface strategy consistent across clients with a governed fallback stack. Do not load new remote fonts at runtime just to make a generated screen distinctive. Readable line length is supported by GDS layout guidance; the specific token values above are ChampCity defaults. [S12]

### UI-VIS-04 — Spacing, grouping, and surfaces

Starting spacing scale: `4, 8, 12, 16, 24, 32, 48` CSS px equivalents, expressed through tokens. Use smaller spacing within a group than between groups. Alignment and proximity should explain relationships before borders are added.

Use a small number of surface levels. Reserve prominent shadows for overlays or genuinely elevated elements. Avoid several nested bordered cards around the same work item. An empty page area does not require a filler widget.

On large displays, spend additional room on useful working content, optional comparison, and comfortable separation. Do not enlarge all controls or stretch text across the full monitor.

### UI-VIS-05 — Color, icons, and theme behavior

Use color semantically and consistently. Color alone MUST NOT distinguish approved, failed, selected, stale, or disabled states. Use visible text and, where useful, a consistent icon.

Icons MUST use the governed set and verified component names. Icon-only controls need an accessible name and a discoverable explanation. Unfamiliar or consequential actions require a visible text label. Avoid decorative icons beside every line.

All supported themes must preserve contrast, hierarchy, focus visibility, and state distinctions. Dark mode is not permission to use faint gray text. Keep theme and density preferences separate and avoid a theme change during an active task. A theme not actually implemented must not appear as a functional option.

## 6. Responsive layout and scaling

### UI-LAY-01 — Design to available space, not monitor labels

Layout decisions MUST use the available CSS viewport and, for reusable panes, their available container size. “Works at 1080p” is not an adequate acceptance criterion.

Physical pixels, CSS pixels, operating-system scaling, browser zoom, and native window chrome are different inputs. A 3840 × 2160 display at 200% scaling provides approximately 1920 × 1080 logical display space before chrome; actual client dimensions must be measured. Do not use physical resolution or `devicePixelRatio` alone to select pane layouts. [S02, S21]

**Priority when space decreases:** preserve task meaning and readable controls; collapse optional regions; switch layout mode; then scroll the intended content. Do not shrink the entire application to retain a screenshot's proportions.

### UI-LAY-02 — Layout modes and width budgets

Each multi-pane Workspace MUST define its regions, minimum usable split-pane sizes, collapse priority, scrolling behavior, and compact alternative.

The following are **starting width bands**, not mandatory device breakpoints:

| Available CSS width | Default strategy |
| --- | --- |
| Below `40rem` (about 640 px) | Single active task pane; navigation and supporting content remain reachable through labeled controls. |
| `40rem` to below `64rem` | Prioritize the primary pane; use a compact navigation rail or drawer. Add a second pane only when its content fits. |
| `64rem` to below `90rem` | Standard working layout; two panes where the width budget allows. |
| `90rem` and above | Expanded navigation and optional supporting panes; keep prose width bounded. |

A component can be narrow inside a wide window. Prefer container-aware behavior for resizable document, chat, and inspector panes where supported; viewport breakpoints alone are insufficient. [S22]

Calculate a split-mode width budget from navigation + primary pane minimum + supporting pane minimum + gaps/padding. If the budget does not fit, leave split mode. Minimum split-pane widths MUST NOT become a global minimum that prevents narrow reflow.

The UI profile pins the actual breakpoints after testing real content. Do not invent a unique set of breakpoints for every screen.

### UI-LAY-03 — Layout ownership and permitted dimensions

Each region MUST have an identifiable owner for its size and overflow. Prefer normal document flow and grid/flex or equivalent constraint-based layout for structural content.

For the current web-based client, flexible descendants commonly need `min-inline-size: 0` / `min-block-size: 0`, and flexible grid tracks commonly need `minmax(0, 1fr)` so content can shrink into the intended scroll region. These are implementation techniques, not a substitute for a defined layout.

Fixed token-based icon sizes, borders, bounded control heights, and constrained navigation widths are legitimate. Arbitrary fixed document heights, hard-coded viewport subtractions scattered across children, whole-app `transform: scale(...)`, and absolute positioning used to assemble the page are prohibited as layout fixes.

Only the shell owns the outer viewport-height contract. Nested Workspaces must consume available space rather than each allocating another full viewport. Dynamic viewport handling must account for browser chrome and supported on-screen keyboards. Any use of `100vh` / `100dvh` needs an explicit sizing owner and fallback appropriate to the supported host.

### UI-LAY-04 — Scroll ownership

Declare one primary vertical scroll owner per content branch. Independent document and execution panes may each scroll; a document inside a card inside a panel must not acquire three competing scrollbars.

The application MUST NOT hide essential content with global `overflow: hidden`. A viewport-bound shell may contain overflow only when every content region has an accessible, functioning scroll strategy.

Ordinary text, forms, headers, and action areas must reflow. Code, diagrams, and genuinely two-dimensional tables may use a contained horizontal scroll area where required for meaning. The exception does not extend to surrounding controls or the whole Workspace. [S02]

Keep scrollbars usable. Preserve a user's reading position during background updates. Streaming output follows new content only while the user is following the end; provide “Jump to latest” after they scroll away.

### UI-LAY-05 — Resize without changing the task

Resizing, maximizing, snapping, zooming, or moving between displays MUST preserve draft input, selected object, task state, and running work. Hidden panes must not continue intercepting keyboard input or pointer events.

A stored splitter position must be clamped to current safe bounds. Restore a usable layout after a display disappears. Every splitter needs an accessible name, keyboard adjustment, and a non-drag route such as preset widths or expand/collapse controls. [S23, S24]

Do not continuously recompute or persist layouts so aggressively that resizing causes flicker, oscillation, input lag, or state resets.

### UI-LAY-06 — Short viewports, overlays, and ultrawide displays

Headers and action rows must wrap, compact, or become non-sticky when they would consume the useful working area. Short height is a first-class test condition, not merely a narrow-width variant.

Dialogs and drawers MUST fit the available viewport with reachable controls and a clear scroll owner. A long form usually belongs in a Workspace, not an oversized modal. Opening a dialog must not place its title or close control off-screen.

Ultrawide support means usable distribution of content, not a 200-character prose line or a giant empty dashboard. Optional comparison panes must remain optional and retain meaningful minimum sizes.

### UI-LAY-07 — Standard Workspace patterns

| Workspace pattern | Wide layout | Compact behavior | Primary design obligation |
| --- | --- | --- | --- |
| Intake / settings form | Bounded form with optional contextual help. | One column; labels, errors, and actions remain reachable. | Clear inputs and recovery, not maximum density. |
| Document review + Architect interaction | Readable document beside interaction pane. | Switchable labeled panes with persistent task context and pending-state indicators. | Reading position, drafts, and required decisions survive switching. |
| Implementation / execution | Work context, bounded status, output, and optional detail. | Current task and interruption control remain available; secondary telemetry collapses. | Running, waiting, failed, and finished are unmistakable. |
| Issue or work-item inventory | List/detail or comparison table. | List then detail with an obvious return path and preserved filters. | Selected object and available action remain clear. |
| Validation / closeout | Evidence and explicit disposition area. | Sequential review with persistent target identity. | No silent approval, inferred completion, or hidden blocker. |

These patterns are product contracts, not mandatory names for code components. Existing suitable shared shells should be reused before a new layout primitive is introduced.

## 7. Interaction, content, and recovery

### UI-INT-01 — Controls must communicate the action

Use buttons for actions and links for navigation. Labels must name the action or outcome: “Start implementation,” “Save draft,” “Request repair,” or “Open validation,” rather than repeated “Submit” or “Continue” labels with unclear targets.

Disabled consequential actions must have an accessible explanation and, where possible, a route to resolve the blocker. Tooltips alone are insufficient. Avoid making every field a custom widget when a standard control will serve the task.

Preserve familiar keyboard conventions. Do not trigger approval or destructive actions simply because Enter is pressed in an unrelated field.

### UI-INT-02 — Forms and input

Fields MUST have persistent labels, explicit required/optional status where needed, sensible defaults, and errors associated with the affected input. Placeholder text is an example, not the only label.

Validate at a useful time rather than announcing an error on every initial keystroke. Preserve valid input and focus on error recovery. For long submissions, provide an error summary that links to affected fields. Do not clear a user's draft on network failure or lost authentication.

Choose control widths according to expected content; a short count need not span the full page. Multiline text must expand or scroll predictably. Paste, password managers, and standard input assistance must not be obstructed without a specific justified constraint. [S10]

### UI-INT-03 — Design all applicable states

Every interactive pattern MUST specify the following states or explicitly mark them not applicable:

| State | Required presentation |
| --- | --- |
| Initial / empty | Explain what is absent and the useful next action. No invented populated state. |
| Loading | Show what is loading without discarding still-valid context. |
| Ready / populated | Real hierarchy, accurate data, and permitted actions. |
| Running / saving | Clear pending state and protection against accidental duplicate submission. |
| Waiting for input or approval | Identify who must act and what decision is required. |
| Blocked / unavailable | Distinguish missing prerequisite, permission denial, and unsupported capability. |
| Error / partial failure | State what failed, what remains intact, and the next safe action. |
| Stale / conflict | Identify outdated information and offer refresh/reconciliation without silent overwrite. |
| Offline / reconnecting | Show connection scope; do not imply the remote worker stopped. |
| Success / completed | Confirm the actual result, not merely request dispatch. |
| Interrupted / cancelled | Explain what stopped and whether previous changes remain. |

Loading, blank, disconnected, and failed states must not share an indistinguishable empty panel.

### UI-INT-04 — Consequential actions and reversibility

Prefer undo for low-risk reversible operations. Use a concise confirmation for irreversible, destructive, externally visible, or scope-expanding actions. Do not require confirmation for every mechanical step already authorized by the governing workflow.

A confirmation MUST identify the object, action, scope, and consequence. “Are you sure?” by itself is inadequate. “Archive Project” must not mean “delete its repository.” “Stop worker” must not imply reverting source edits.

Where an operation is already pending, prevent accidental duplicate requests without freezing unrelated work. After an uncertain remote result, reconcile status before offering a retry that could repeat the effect.

### UI-INT-05 — Useful errors and diagnostics

Errors MUST answer: what operation failed; which Project/work item/resource it concerned; what the service actually reported; whether changes were committed or the outcome is unknown; and what the user can safely do next.

Use a readable summary with expandable/copyable technical detail. Include an operation or correlation reference where available, but redact credentials, tokens, sensitive prompt content, and unnecessary personal paths. Do not fabricate a root cause when only an error code is known.

Example presentation, illustrative rather than an implementation claim:

> **Work item was not closed.** Its latest validation covers an earlier revision. No close decision was recorded. Open validation for the current revision, then try closing again. Technical details: operation reference and failed condition.

A transient toast alone is insufficient for a failed validation, rejected mutation, lost connection, or action that requires follow-up. Retain the problem near the affected task. For routine success, avoid a modal or excessive notification noise. [S13]

### UI-INT-06 — Tables, logs, and large content

Tables require meaningful headers, sensible column alignment, discoverable sorting/filtering, visible selection state, and an explicit scope for bulk actions. On narrow layouts, preserve access to omitted columns through detail views or contained scrolling.

Logs and raw tool output must not become the default explanation of a failure. Offer search/filter/copy where the volume warrants it. Rendering long streams must not freeze the working interface. Virtualization, when used, must preserve keyboard navigation, labels, and an accessible route to the information.

Long identifiers and file paths must wrap, truncate with an accessible full-value route, or scroll locally. Never conceal the distinguishing part of two similarly named targets in a consequential decision.

### UI-INT-07 — Motion and responsiveness

Motion SHOULD explain a user-triggered change, not decorate every row or compete with reading. Honor reduced-motion preferences and avoid flashing effects. Focus, layout, and essential status must not depend on an animation completing.

Provide visible acknowledgement promptly even when a backend action is slow. For browser telemetry, target field INP at or below 200 ms at the 75th percentile where measured; this is an interaction responsiveness measure, not an AI completion-time promise. For Desktop and synthetic tests, measure comparable input-to-feedback behavior and label it accurately rather than calling it field INP. [S27]

Long operations need truthful stage, elapsed-time, and interruption information where available. Never invent a percentage, countdown, heartbeat, or completion estimate to fill a progress component.

## 8. Accessibility baseline

### UI-ACC-01 — WCAG 2.2 AA target and honest scope

ChampCity-owned web content, including the web-rendered Desktop client, MUST target WCAG 2.2 Level AA. The checks below are a priority checklist, **not an exhaustive substitute for all applicable A and AA success criteria**. Native shell surfaces require corresponding platform accessibility assessment. [S01]

No document, component library, automated scan, or dark theme by itself establishes conformance. Third-party embedded content must be identified; supply an alternative task route where practical and disclose unassessed limitations. Do not claim full-product conformance from a partial screen audit.

### UI-ACC-02 — Required checks

| Topic | Required check | Basis |
| --- | --- | --- |
| Text contrast | At least 4.5:1 for ordinary text; 3:1 for large text as defined by WCAG (18 pt regular or 14 pt bold). Test rendered states, not token values alone. | SC 1.4.3 [S06] |
| Non-text contrast | Meaningful control boundaries, component states, and graphical objects satisfy applicable 3:1 requirements against adjacent colors. Decorative separators are not all required to meet this criterion. | SC 1.4.11 [S07] |
| Text enlargement | Text can be enlarged to 200% without loss of content or functionality, subject to the criterion's stated exceptions. Do not counteract zoom by shrinking the design. | SC 1.4.4 [S03] |
| Reflow | Ordinary vertically read content works at 320 CSS px width without loss or two-dimensional scrolling. Test the equivalent 400% zoom condition. Document genuine two-dimensional exceptions locally. | SC 1.4.10 [S02] |
| User text spacing | No loss when users apply line height 1.5 times font size, paragraph spacing 2 times, letter spacing 0.12 times, and word spacing 0.16 times. These are override-test values, not required default styling. | SC 1.4.12 [S04] |
| Pointer targets | Meet the 24 × 24 CSS px minimum or a valid criterion exception such as sufficient spacing. ChampCity normally uses larger targets; 44 × 44 for touch is a product default, not the AA minimum. | SC 2.5.8 [S05] |
| Keyboard | All functions have a keyboard path, visible focus, sensible focus order, and no unintended keyboard trap. Shortcuts must not interfere with ordinary input. | SC 2.1.1, 2.1.2, 2.4.3, 2.4.7 [S01] |
| Focus visibility | Author-created overlays must not wholly obscure the focused component. ChampCity's stronger design rule is to keep the focused control and its indicator fully visible wherever feasible, including sticky footers. | SC 2.4.11 [S08] |
| Drag interactions | Supply a single-pointer alternative that does not require dragging unless an applicable exception holds; also provide keyboard operation. | SC 2.5.7 [S24] |
| Semantics | Controls expose correct name, role, state, and value; landmarks/headings communicate structure. Prefer native semantics over inaccurate ARIA. | SC 1.3.1, 4.1.2; APG [S01, S25] |
| Dynamic status | Relevant status changes can be announced without moving focus. Do not announce every generated token or flood the user with repeated alerts. | SC 4.1.3 [S09] |
| Authentication | Preserve supported password-manager, paste, and accessible authentication routes. Reauthentication must not casually discard work. | SC 3.3.8 [S10] |

### UI-ACC-03 — Focus, dialogs, and navigation

Opening a modal MUST place focus intentionally within it, make the background inert to interaction, maintain a sensible focus sequence, and restore focus to the invoking control or a logical successor. Provide an accessible name and a clear close/cancel path; closing a dialog is not automatically cancellation of the underlying operation. [S26]

When a breakpoint hides a focused pane, move focus to an appropriate visible control without executing anything. A hidden drawer must not remain in tab order. Resize-driven rearrangement must preserve meaningful reading order.

Complex custom widgets MUST follow the relevant interaction pattern and be tested with the supported assistive-technology combinations; adding an ARIA role does not supply keyboard behavior. [S25]

### UI-ACC-04 — Reflow is not a mobile-product promise

The initial product may remain optimized for desktop-class work. That does not justify breaking enlarged text, narrow browser panes, or accessibility reflow. A compact sequential layout may satisfy the same task without duplicating every large-screen pane.

A minimum native window size is a usability preference, not an exemption from testing content zoom. Do not display “use a bigger screen” as the only route to a core task at the required reflow width.

## 9. Human control in AI-enabled Workspaces

### UI-AI-01 — Separate proposals, execution, evidence, and decisions

An AI recommendation, a submitted artifact, a successful tool call, a completed worker, a passed validation, and an Operator close decision are different states. They MUST not share one ambiguous green “Done” label.

Present the current task and affected resources, the selected role/model/runtime where relevant, and the latest service-confirmed status. Explain meaningful limitations without claiming capabilities that have not been negotiated. The intent follows Human-AI Interaction guidance; these exact status boundaries are ChampCity governance decisions. [S16]

### UI-AI-02 — Make control proportional to consequences

A running-worker surface MUST provide the supported stop/interrupt action and explain its meaning. Show waiting for user input, waiting for approval, disconnected, cancellation requested, and terminal states distinctly. Never show a nonfunctional pause or undo control for a runtime that does not support it.

Do not steal focus or route the user to another Workspace for every tool event. Escalate when a decision is actually required. Bound autonomous activity by the current workflow scope, explicit constraints, and policy; do not add needless confirmations for deterministic actions already in scope and permitted by policy.

Model/provider fallback, expanded tool permissions, or a changed execution target must not occur invisibly when they alter cost, capability, confidentiality, or scope.

### UI-AI-03 — Reviewable evidence rather than implied certainty

Provide a concise task summary and access to relevant changes, evidence, validation coverage, and unresolved issues. Distinguish a provider error, policy rejection, missing capability, and an unknown failure without manufacturing diagnostic detail.

Confidence scores must not be invented or presented as calibrated certainty. An agent's statement that it tested a change is not the test result. Show which checks actually ran and which were not performed.

Expose concise explanations and supporting evidence where useful; do not label a model-generated rationale as a verified internal reasoning trace.

### UI-AI-04 — Context, memory, usage, and privacy

Where available, let the user inspect which Project context, source revisions, Skills, and material permissions govern an execution. Clearly separate estimated tokens/costs from measured usage, and distinguish unknown usage from zero.

Do not display a semantic-memory match as current canonical state or an effective Decision when it is historical or superseded. Correcting a generated draft must not silently rewrite the historical record.

Research, screenshots, prompts, and telemetry must use redacted or synthetic content where practical. Sending private repository material, screenshots, or user behavior to external design/AI services requires the applicable authorization. This standard does not introduce mandatory cloud analytics or public uploads.

## 10. Required process for AI-assisted UI engineering

### UI-ENG-01 — Establish evidence and constraints before coding

The agent MUST inspect the relevant existing Workspace, shared components, token definitions, UI profile, service contract, and known constraints. Inspect current screenshots or the running UI when tools allow. If visual access is unavailable, state that limitation rather than inventing observations.

Identify whether the task is a small repair, an extension of an established pattern, or a new pattern. Document the smallest necessary change and preserve unrelated behavior. Do not replace a shared shell because creating a new component is easier for the model.

Verify component names, imports, properties, icons, and supported capabilities against actual source or documentation. An imagined component API is not an implementation plan. Focused component documentation and progressive context loading follow Figma's AI design-system guidance. [S14]

### UI-ENG-02 — Produce a bounded design contract

Before material UI implementation, record the Appendix B design brief, even if it is a short section of an existing Work Card. It must identify task hierarchy, applicable pattern/reference, content, state behavior, wide/compact layout, scroll ownership, keyboard behavior, service ownership/transition boundaries, and evidence obligations.

For a new Workspace or materially different interaction, provide a reviewable wireframe or working prototype and resolve the design direction before broad construction. A rendered prototype is more useful than a large image when interaction is the uncertainty. Existing approved patterns may serve as the reference for small changes.

An AI may propose design alternatives, but it must not silently choose a new product identity. An attractive generated image is a design candidate, never evidence of the implemented application. Intent clarification and reviewable intermediate outputs are supported by prototype research, with no claim that they guarantee production quality. [S15]

### UI-ENG-03 — Implement the design, not a newly improvised one

Reuse governed layout and control components. Implement one representative vertical slice with normal, compact, failure, and keyboard behavior before reproducing the pattern across Workspaces.

Use representative fixture content: long names and paths, actual-length reports, empty states, failures, and large lists. Fictional fixtures must be labeled and must not leak into production as real counts, status, or success evidence.

Do not repair overflow by reducing text below the profile, hiding required content, shrinking the entire app, removing focus indication, or adding unexplained absolute coordinates. When the layout contract is wrong, revise the contract explicitly rather than piling on screen-specific CSS.

A feature request does not by itself expand scope to replace the design system or refactor unrelated production code.

### UI-ENG-04 — Render, inspect, correct

After implementation, the agent MUST run the available bounded tests, launch the relevant UI when possible, exercise the task, and inspect actual screenshots at the required conditions. A build passing proves neither visible quality nor usability.

Perform a deliberate critique against the design contract: hierarchy, density, readability, alignment, state clarity, recovery, keyboard behavior, parity, and responsiveness. Fix observed defects and repeat the relevant checks.

AI screenshot analysis is useful but advisory. A second pass by the same agent is not an independent human evaluation. Reviewer independence refers to evidence-based review, not a mandatory second paid model or provider.

When tools or an environment prevent a required check, report **NOT TESTED** and the exact gap. Do not replace missing evidence with “should work.”

### UI-ENG-05 — Preserve independent acceptance and clean baselines

The Implementer MUST NOT silently update expected screenshots to make a regression test pass, loosen image tolerances, mask the defective region, or suppress accessibility checks. Intended baseline changes require review of the actual visual difference.

Final Operator disposition remains in the existing governance workflow. Before requesting it, provide the report in Appendix C, including known gaps. Do not make the Operator discover an untested responsive layout or missing error state after an unqualified completion claim.

### UI-ENG-06 — Reject common generated-UI failure modes

| Failure mode | Required replacement |
| --- | --- |
| “Make it sleek, modern, and professional” as the entire brief | Define task, hierarchy, states, approved reference, and measurable checks. |
| A card, icon, badge, and mini-heading around every piece of text | Group by task; use spacing and type hierarchy before decoration. |
| Multiple sidebars and nested progress bars repeating the same state | One clear navigation hierarchy plus local task context. |
| Tiny muted text used to fit a busy screenshot | Remove duplication, collapse supporting content, or change layout mode. |
| All buttons styled as primary | Establish the current task's action hierarchy. |
| A beautiful happy-path screenshot with no failures or long content | Exercise the complete applicable state matrix. |
| Each agent invents its own components and token values | Reuse or explicitly extend the shared system. |
| A mock screenshot presented as proof | Capture the running implementation with recorded conditions. |
| New viewport rules reset forms or destroy an active session | Preserve task state and test resize/zoom transitions. |
| “Responsive” claimed from one maximized desktop view | Produce viewport, scaling, zoom, and transition evidence. |
| Every status is “Success,” including unvalidated output | Use service-confirmed, domain-specific states. |
| Raw logs as the only error explanation | Show a useful summary, safe recovery action, and optional detail. |

## 11. Verification and acceptance

### UI-TEST-01 — Match evidence to the change

Do not run every possible combination for every label adjustment. Do not use proportionality to omit the scenario the change can break.

| Change scope | Minimum evidence |
| --- | --- |
| Local copy or isolated component fix | Affected states, standard and constrained width, keyboard/focus check, targeted visual evidence, relevant automated checks. |
| New or materially changed Workspace | Its complete applicable state matrix; wide/compact/short layouts; reflow/zoom; core task and recovery path; shell parity where implemented. |
| Shared layout, tokens, navigation, or controls | Representative consumer Workspaces; regression baselines; supported theme/density variants; scaling and cross-shell checks. |
| Release / supported-browser expansion | Full declared support matrix, native-shell smoke, assistive-technology checks, critical user journeys, and human task review. |

If Server or a client mode does not exist yet, mark it **NOT IMPLEMENTED / NOT TESTED**. An adapter-backed preview can test shared UI assumptions, but it does not prove real Server connectivity or native behavior.

### UI-TEST-02 — Starting viewport and scaling matrix

These are **ChampCity starting test defaults**, to be pinned in the UI profile. Dimensions below are **actual content viewport CSS pixels**, not advertised monitor sizes. State, theme, and density coverage is selected according to risk.

| Test | Conditions | Expected outcome |
| --- | --- | --- |
| Constrained desktop | 1280 × 720 | Core workflow usable without clipped actions or forced full-screen mode. |
| Standard desktop | 1440 × 900 and 1920 × 1080 | Stable hierarchy and working-pane proportions. |
| Large workspace | 2560 × 1440 | Useful additional content space without stretched reading text. |
| Ultrawide stress | 3440 × 1440 | Bounded reading widths and purposeful optional panes. |
| High-resolution stress | 3840 × 2160 CSS px, where reproducible | No accidental control inflation, extreme line lengths, or empty decorative expansion. This does not substitute for a physical 4K/scaling test. |
| Compact window | 1024 × 768 and 900 × 600 | Supporting panes collapse; short-height controls remain reachable. |
| Narrow layout | 640 × 900 and 320 × 800 | Sequential access to all core content and actions; ordinary content reflows. |
| Actual zoom | 200% text/enlargement check; 400% page zoom from a suitable baseline | Record resulting viewport; verify text enlargement and reflow independently. Include a short-height outcome near 320 × 256 when achievable. |
| Windows display scaling | 100%, 125%, 150%, 175%, 200% sampled across relevant displays | Record physical resolution and measured content size; inspect text, pointer alignment, native overlays, and restored window bounds. |
| Mixed-DPI transition | Move between differently scaled displays where available | Stable controls, correctly aligned embedded surfaces, no off-screen restoration. |
| Breakpoint transitions | Each actual breakpoint −1, at, and +1 CSS px; continuous resizing | No flicker, lost content, duplicate controls, focus loss, or task reset. |
| Input / accessibility variants | Keyboard-only, user text spacing, supported assistive technology, reduced motion; coarse pointer where supported | Equivalent access to the task and understandable feedback. |

A screenshot at a larger device-pixel ratio is not proof of actual OS scaling or browser page zoom. Record what was emulated and what was tested on the real host. Tests must not set a tiny viewport while accidentally keeping an unrelated layout minimum that hides the failure.

### UI-TEST-03 — Adversarial content and state fixtures

Use deterministic fixtures with: no records; a single record; enough records to require paging/scrolling; long multi-line labels; a long unbroken identifier; representative report/log volume; validation errors; unavailable models; denied actions; stale revisions; and lost connections.

For text-growth checks, include labels roughly 40% longer than the ordinary fixtures and multiline messages. This is a synthetic stress condition, not a claim about every language. Test supported locales, scripts, and input methods when those are part of the release scope.

Verify that action labels, failure explanations, selection markers, and the distinguishing portions of resource names remain available.

### UI-TEST-04 — Automate mechanics, inspect experience

| Layer | Checks |
| --- | --- |
| Structural / component | Valid control semantics, supported variants, stable keys, required labels, governed tokens, and unexpected console errors. |
| Geometric | Unintended page-level horizontal overflow; off-screen dialogs; unreachable controls; overlap; collapsed panes; declared minimums and scroll owners. |
| Accessibility automation | Scan applicable A/AA rules supported by the chosen tooling in the actual open states, not only the initial page. Record incomplete results for review. |
| Interaction automation | Focus movement, keyboard activation, resize state preservation, duplicates, stale responses, modal behavior, and safe recovery. |
| Visual regression | Actual viewport screenshots and reviewed diffs using deterministic fixtures and a controlled rendering environment. |
| Human / assistive-technology review | Task comprehension, hierarchy, actual keyboard usability, reading and interaction sequence, and whether recovery is understandable. |

Automated accessibility tools cannot determine every barrier or establish full conformance; retain manual and inclusive user evaluation. [S17, S18]

### UI-TEST-05 — Screenshot and baseline integrity

Record the build/revision, route/Workspace, fixture, shell, browser/engine version, OS, theme, density, CSS viewport, relevant scale/zoom, and capture state. Use actual viewport captures; a full-page screenshot can supplement them but cannot prove that controls fit in the visible working area.

Wait for deterministic readiness and loaded fonts. Stabilize irrelevant animation/time-dependent content through documented test controls, not broad masks over meaningful UI. Use separate environment baselines where rendering differs legitimately. Browser version, operating system, fonts, and other execution conditions can affect visual snapshots. [S19]

A visual comparison passes against an approved reference, not merely against whatever the latest agent produced. Explain intended changes and review them before updating the baseline.

### UI-TEST-06 — Acceptance and severity

**Acceptance requires:** the intended task works; required states are designed; no blocking accessibility, access/policy, or genuine Operator-decision-boundary failure remains; the affected responsive matrix passes; actual visual evidence has been inspected; relevant shell differences are explained; and the report distinguishes verified results from gaps.

| Severity | Examples | Treatment |
| --- | --- | --- |
| Blocker | Wrong resource acted on, false approval/completion, lost work, inaccessible essential action, keyboard trap, unreachable required controls. | Do not accept the affected change as complete. |
| Major | Important content clipped, ambiguous primary action, unreadable essential text, broken compact layout, missing recovery state. | Repair before acceptance or record a specific Operator exception with a usable alternative. |
| Minor | Nonblocking spacing, alignment, or presentation inconsistency. | Fix within scope or log a bounded follow-up; do not use it to conceal a major defect. |

A waived WCAG failure is still a WCAG failure. Exception approval changes internal release disposition, not the truth of a conformance claim. Conversely, a screen can satisfy numerical checks and still fail acceptance because people cannot understand or use it.

## 12. Change control, adoption, and maintenance

### UI-GOV-04 — Controlled exceptions

An exception MUST identify the rule, affected scope, rationale, user impact, alternative access or mitigation, owner, Operator disposition, and review/expiry trigger. A screen-specific hard-coded workaround is not an implicit exception.

Exceptions should be narrow. They must not redefine Workspace terminology, transfer lifecycle/eligibility decisions into the renderer, or fabricate evidence. Applicable legal or contractual obligations cannot be waived by this document.

### UI-GOV-05 — Adoption sequence

First adopt the standard and pin the shared UI profile. Then select representative existing patterns—intake, document plus Architect interaction, implementation, and validation/closeout—and bring them to an agreed visual baseline. Reuse those patterns rather than independently redesigning every screen.

Introduce automated checks and golden fixtures incrementally. Correct the highest-impact layout and interaction defects first. This standard does not itself direct a big-bang UI rewrite, a component-library replacement, or unbounded refactoring.

### UI-GOV-06 — Review triggers

Review the standard and support profile when the shared shell changes, Server connectivity is introduced, a component/token change affects many Workspaces, supported displays or browsers change, repeated UI defects expose a missing rule, or accessibility guidance materially changes.

Record material revisions and the migration expectations for affected components. A UI Engineering Skill may improve its execution procedure without silently changing the standard's acceptance requirements.

## Appendix A — Shared UI profile template

Keep this profile small. It configures the canonical standard; it must not duplicate or weaken it. Pin values before declaring the corresponding support matrix accepted.

```text
Profile ID / version:
Canonical standard: CCAI-UI-001 @ <adopted version>
Product family: ChampCity A/I Desktop and Server
Owner / disposition:

Shared design system:
  Token source and version:
  Component catalog and approved patterns:
  Typography / fallback stack:
  Themes actually supported:
  Density modes actually supported:

Deployment modes:
  Desktop standalone:
  Desktop Server-connected:
  Server browser client:
  Supported native integration differences:

Viewport / platform profile:
  Comfortable desktop working size:
  Required compact and reflow behavior:
  Actual layout breakpoints and width budgets:
  Browser / Electron / OS versions tested:
  OS scale and browser zoom coverage:
  Keyboard / assistive-technology coverage:

Evidence:
  Representative fixture set:
  Approved visual baseline locations:
  Test commands / harness entry points:
  Known gaps, unsupported modes, and approved exceptions:
```

## Appendix B — UI design brief template

This may be a section of the governing Work Card or bounded solution. It need not be another standalone artifact.

```text
Task / Work Item:
User and starting context:
Outcome the user must achieve:
Material constraints and non-goals:

Information and interaction:
  Primary working object:
  Primary action and supporting actions:
  Essential information / optional information:
  Current, pending, failed, stale, and completed-state meanings:
  Consequential effects and recovery:

Design:
  Approved reference / existing pattern:
  Components and tokens to reuse:
  Intentional differences from the reference:
  Wide and compact arrangements:
  Width budget / collapse order:
  Short-height behavior / scroll ownership:
  Keyboard sequence / focus restoration:
  Actual content and stress fixtures:

Architecture:
  Service that owns each authoritative change:
  Local / Server scope shown to the user:
  Shell-specific capabilities and fallback:

Acceptance:
  Applicable standard rule IDs:
  Exact affected viewport / scaling / state tests:
  User task and error-recovery smoke:
  Visual references and evidence expected:
  Unresolved assumptions / required Operator decisions:
```

## Appendix C — UI implementation and review report template

ChampCity should populate mechanical metadata from tools where practical. The agent reports interpretation, changes, and limitations rather than manually inventing hashes or environment facts.

```text
UI change / governing Work Item:
Standard and UI profile versions:
Build / source revision:
Affected Workspaces and shared components:
Approved reference / intended visual differences:

Evidence matrix:
| Scenario | Shell | CSS viewport | Scale / zoom | State / fixture |
| Result | Evidence path or reference | Reviewer observation |

Checks:
  Automated checks run and results:
  Actual screenshots inspected:
  Keyboard / focus / accessibility checks:
  Resize, zoom, short-height, and breakpoint checks:
  Draft / selection / running-work preservation:
  Error, stale-state, and reconnection checks:
  Cross-shell results or explicit implementation gap:
  User task and recovery observations:

Findings:
  Rule ID / severity / reproduction / expected / observed:
  Fixes made and retest evidence:
  Baseline updates proposed and reviewed:
  Remaining issues and approved exceptions:

Use explicit result labels:
  VERIFIED PASS / FAIL / NOT TESTED / NOT IMPLEMENTED / NOT APPLICABLE

Operator disposition:
  Pending until the Operator acts through the existing workflow.
```

## Appendix D — Bounded AI UI task instruction

Use this as an execution starter, not a second independently maintained standard.

```text
Implement the approved UI task under CCAI-UI-001 and the pinned UI profile.

1. Inspect the existing Workspace, applicable component/token documentation,
   service ownership/transition boundaries, and available visual reference before editing.
2. State the user's task and reuse the approved design pattern. Do not redesign
   unrelated surfaces or invent product data, capability, or Operator Decisions.
3. Define the normal, compact, short-height, failure, and keyboard behavior
   relevant to this change. Preserve required content and working state.
4. Implement within scope using the shared components. Do not fix layout by
   shrinking text, hiding content, or disabling focus/scroll behavior.
5. Run the bounded checks, inspect actual rendered output, correct defects,
   and report the evidence using Appendix C. Mark unavailable checks NOT TESTED.
6. Do not approve your own changed visual baseline, mask a regression, or
   describe a successful build as proof of usability or visual conformance.
```

## Appendix E — Source register and project alignment

### How to interpret the references

External sources substantiate the principles and specifically identified standards. Except where an external criterion is explicitly identified, the normative rules are ChampCity-specific design decisions and synthesis—not claims that a source mandates ChampCity's exact architecture, thresholds, or workflow.

W3C **Recommendations** provide the normative criteria. W3C **Understanding documents** explain them. ARIA Authoring Practices provides implementation guidance requiring platform testing. Vendor documentation explains practices and tools; it is not independent comparative evidence. The cited research on AI design concerns a particular prototype system and must not be generalized into a guarantee about all agentic coders.

All external sources below were reviewed on **September 13, 2026**. Publication/update dates are included only where relevant and established. Links to living documentation may change; adoption should pin relevant tool versions and retain the reviewed rule set.

| ID | Source | Use in this standard |
| --- | --- | --- |
| S01 | W3C, [Web Content Accessibility Guidelines (WCAG) 2.2](https://www.w3.org/TR/WCAG22/), Recommendation dated December 12, 2024. | Accessibility target, applicable A/AA criteria, conformance scope. |
| S02 | W3C, [Understanding SC 1.4.10: Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html). | 320 CSS px, zoom equivalence, viewport distinctions, local two-dimensional exceptions. |
| S03 | W3C, [Understanding SC 1.4.4: Resize Text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html). | Text enlargement without loss. |
| S04 | W3C, [Understanding SC 1.4.12: Text Spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html). | User override-test values and content preservation. |
| S05 | W3C, [Understanding SC 2.5.8: Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html). | 24 CSS px minimum and criterion exceptions; distinction from larger product defaults. |
| S06 | W3C, [Understanding SC 1.4.3: Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). | Text contrast thresholds and large-text definition. |
| S07 | W3C, [Understanding SC 1.4.11: Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html). | Relevant controls, states, graphics, and adjacent-color contrast. |
| S08 | W3C, [Understanding SC 2.4.11: Focus Not Obscured (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html). | Focus under overlays and sticky regions. |
| S09 | W3C, [Understanding SC 4.1.3: Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html). | Accessible dynamic status without unnecessary focus changes. |
| S10 | W3C, [Understanding SC 3.3.8: Accessible Authentication (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html). | Authentication assistance and avoiding unnecessary cognitive burden. |
| S11 | Government Digital Service / Central Digital and Data Office, [Government Design Principles](https://www.gov.uk/guidance/government-design-principles), updated April 2, 2025. | User needs, iteration, context, reusable patterns, consistency without forced uniformity. |
| S12 | GOV.UK Design System, [Layout](https://design-system.service.gov.uk/styles/layout/). | Available screen space, small-screen thinking, bounded reading measure. Its specific government-site layout is not adopted wholesale. |
| S13 | Jakob Nielsen / Nielsen Norman Group, [10 Usability Heuristics for User Interface Design](https://www.nngroup.com/articles/ten-usability-heuristics/), last reviewed January 30, 2024. | General interaction heuristics, visible status, control, consistency, and recovery. |
| S14 | Figma Developer Docs, [Write design system guidelines for Make kits](https://developers.figma.com/docs/code/write-design-system-guidelines/). | Precise component instructions, token context, examples, and progressive documentation loading for AI. |
| S15 | Yuan et al., [Towards Human-AI Synergy in UI Design: Enhancing Multi-Agent Based UI Generation with Intent Clarification and Alignment](https://arxiv.org/abs/2412.20071), first submitted December 28, 2024; [reviewed HTML version](https://arxiv.org/html/2412.20071v1). | Intent clarification and intermediate review. Limited prototype evidence, not production conformance proof. |
| S16 | Microsoft Research, [Guidelines for Human-AI Interaction](https://www.microsoft.com/en-us/research/publication/guidelines-for-human-ai-interaction/), CHI 2019; [HAX Toolkit guidelines](https://www.microsoft.com/en-us/haxtoolkit/ai-guidelines/) and [Design Library](https://www.microsoft.com/en-us/haxtoolkit/library/). | Human control, capability communication, correction, and behavior when AI is wrong. |
| S17 | W3C WAI, [Evaluating Web Accessibility Overview](https://www.w3.org/WAI/test-evaluate/). | Combined evaluation and limits of tools. |
| S18 | Playwright, [Accessibility testing](https://playwright.dev/docs/accessibility-testing). | Automated checks in interaction states and the need for manual evaluation. |
| S19 | Playwright, [Visual comparisons](https://playwright.dev/docs/test-snapshots). | Screenshot assertions and environment-sensitive baselines. |
| S20 | Anthropic, [frontend-design skill](https://github.com/anthropics/claude-code/blob/main/plugins/frontend-design/skills/frontend-design/SKILL.md), living vendor instruction source. | Intentional design and critique; no obligation to adopt its aesthetic or toolchain. |
| S21 | MDN, [Window: devicePixelRatio](https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio). | Physical/CSS pixel distinction, zoom, and changes between displays. |
| S22 | MDN, [CSS container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Container_queries). | Container-aware responsive behavior. |
| S23 | W3C ARIA APG, [Window Splitter Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/). | Semantic and keyboard guidance for split panes; verify actual implementation support. |
| S24 | W3C, [Understanding SC 2.5.7: Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html). | Non-drag alternatives; separate from keyboard access. |
| S25 | W3C ARIA APG, [Read Me First](https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/). | Prefer accurate native semantics; ARIA roles do not implement behavior. |
| S26 | W3C ARIA APG, [Dialog (Modal) Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/). | Modal focus and interaction behavior. |
| S27 | Google web.dev, [Interaction to Next Paint (INP)](https://web.dev/articles/inp). | Field responsiveness threshold and measurement scope; not backend completion time. |

### ChampCity alignment references

These are repository references, not public URLs. They establish product context; they do not establish current visual conformance.

| Reference | Relationship |
| --- | --- |
| `docs/architecture/CHAMPCITY_FOUNDATIONAL_ARCHITECTURE_PRINCIPLES.md` | Shared client, multiple shells, semantic service boundary, structured state, and canonical vocabulary. |
| `docs/architecture/CHAMPCITY_PRODUCT_CAPABILITY_MODEL.md` | Workspaces as working stations; one product family and capability model. |
| `docs/design-notes/CHAMPCITY_SKILLS_ENGINE_DESIGN_DISCUSSION.md` | Canonical standard separate from the UI Engineering Skill; Design, Implement, and Audit modes. |
| `docs/architecture/CHAMPCITY_CLIENT_SERVICE_CONTRACT.md` | Client requests operations; governing services own state transitions/policy while product decisions reserved to the human remain with the Operator. |
| `docs/migration/CHAMPCITY_CLIENT_SERVICE_DESKTOP_SOURCE_MAPPING.md` | Existing UI/host boundaries and migration context. |
| `src/renderer/app/IssueDocumentChatWorkspaceShell.tsx` | Inspected example of an existing document/interaction shell to consider for reuse, not a declaration that its rendered behavior passes this standard. |

## Revision history

| Version | Date | Change | Disposition |
| --- | --- | --- | --- |
| 1.0-draft | 2026-09-13 | Initial research-grounded UI governance standard, responsive rules, AI implementation process, acceptance evidence, and reusable templates. | Pending Operator adoption. |
