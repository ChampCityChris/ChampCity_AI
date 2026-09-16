# ChampCity AI Skills Engine — Design Discussion

**Status:** Brain Dump / Architecture Discussion  
**Purpose:** Capture the emerging design direction for a ChampCity-owned shared Skills Engine, using the proposed UI Engineering Skill as the first concrete example.

---

## 1. Context

ChampCity AI is evolving beyond a repository-specific coding workflow into an **agentic engineering harness** with an integrated orchestration layer.

A useful responsibility split is:

- **Harness:** governs how work happens.
- **Orchestration:** determines who acts and when.
- **Skills:** determine how specialized work is performed.
- **Standards:** determine what acceptable work looks like.
- **Tools:** determine what actions agents can perform.
- **Project State:** preserves canonical workflow state, Decisions, dispositions, and evidence; documents/artifacts remain views, exports, or genuine authored documents as applicable.

This distinction matters because a reusable engineering practice should not have to be copied manually into every application repository. If the rule is intended to apply across ChampCity-managed projects, it belongs at the harness level rather than being duplicated as project documentation.

The first identified use case is a shared **UI Engineering Skill**.

---

## 2. Problem Being Solved

Several applications have exhibited inconsistent layout behavior across display resolutions and window sizes. The recurring failure is not simply incorrect CSS syntax. It is a broader responsive UI architecture problem involving:

- fixed versus fluid dimensions;
- layout primitives;
- breakpoints;
- typography and spacing scale;
- viewport behavior;
- scroll ownership;
- DPI/display scaling;
- minimum supported application sizes;
- component proportions;
- modal and dialog sizing;
- dense data layouts;
- icon and image scaling;
- ultrawide behavior;
- resizing behavior; and
- inappropriate hard-coded pixel values.

A repository-local Markdown file would document these rules, but copying the same file into each new repository creates predictable governance problems:

- duplicated or conflicting governance sources;
- stale copies;
- divergent revisions;
- unclear precedence;
- manual setup for every new project; and
- difficulty applying the rules consistently during planning, implementation, and review.

The desired model is one canonical shared capability that follows the agent across projects.

---

## 3. Proposed Direction

ChampCity should introduce a **harness-level Skills Engine** for reusable engineering capabilities.

A skill is not merely a document containing rules. A skill is the operational layer that teaches an agent how to apply one or more canonical standards in the context of the current repository, role, task, and lifecycle stage.

Conceptually:

```text
ChampCity AI Harness
│
├── Orchestration Layer
├── Governance Layer
├── Skills Layer
│   ├── UI Engineering
│   ├── Testing Strategy
│   ├── Repository Architecture
│   ├── Accessibility
│   ├── Logging / Observability
│   └── future shared engineering skills
├── Tool / Execution Layer
├── Artifact Layer
└── Operator Interface
```

The Skills Layer is therefore distinct from the orchestration layer. Orchestration determines which worker acts. A skill determines how that worker performs a specialized class of work.

---

## 4. Canonical Standard vs. Skill

The UI design rules themselves should remain a canonical standard, while the UI Engineering Skill should define how an agent consumes and applies that standard.

A conceptual shared structure could be:

```text
ChampCity Shared Assets
│
├── standards/
│   └── <canonical adopted UI standard>
│
└── skills/
    └── ui-engineering/
        ├── SKILL.md
        ├── responsive-audit-checklist.md
        ├── examples/
        └── tests/
```

This creates a clean separation:

- **Standard:** What constitutes conforming UI engineering.
- **Skill:** How an AI worker performs UI engineering using that standard.

Changing the canonical standard should not require updating copies across every application repository.

---

## 5. UI Engineering Skill Scope

The first skill should be broader than a "CSS conformity" skill. That title would incorrectly constrain the problem to one implementation technology.

The proposed skill is **UI Engineering** and should govern responsive interface construction regardless of whether the application uses CSS, React, Electron, Tauri, native widgets, or another supported UI stack.

The skill should encode policies for at least:

- layout primitives such as grid, flex, and containers;
- fixed, intrinsic, and fluid dimensions;
- appropriate use of `min()`, `max()`, `clamp()`, percentages, `rem`, viewport units, and equivalent layout concepts;
- maximum content widths;
- breakpoint policy;
- typography scaling;
- spacing scaling;
- navigation/sidebar/header/content proportions;
- overflow and scroll ownership;
- viewport-height handling;
- Windows DPI and display scaling;
- supported window-size boundaries;
- 1080p, 1440p, and 4K behavior;
- ultrawide behavior;
- resizing behavior;
- modal and dialog sizing;
- dense data/table layouts;
- image and icon scaling;
- appropriate versus inappropriate fixed pixel dimensions;
- prohibited anti-patterns; and
- acceptance criteria for responsive behavior.

The governing principle should be:

> Preserve visual hierarchy, density, and proportions across supported displays rather than preserving literal pixel dimensions.

---

## 6. Skill Operating Modes

The UI Engineering Skill should not be purely instructional. It should support explicit operating modes so that the same skill can participate throughout the engineering lifecycle.

### 6.1 Design Mode

Used during architecture, planning, and Work Card / Fix Card creation.

Responsibilities may include:

- identify the appropriate responsive layout strategy;
- establish viewport and DPI support expectations;
- identify constraints that must become acceptance criteria;
- prevent planning artifacts from prescribing brittle fixed layouts; and
- identify required repository-specific UI profile information.

### 6.2 Implement Mode

Used by an Implementer or other coding worker.

Responsibilities may include:

- apply the shared UI standard to the current codebase;
- respect the existing framework and design system;
- use approved project-specific deviations where present;
- avoid known anti-patterns; and
- generate implementation evidence appropriate to the task.

### 6.3 Audit Mode

Used during architecture review, validation, regression review, or a dedicated UI audit.

A future audit could report results such as the following illustrative output. The PASS labels are fictional examples, not executed audit or accessibility-conformance evidence. Real reports must identify actual content viewport, scale/zoom, host, and tested states, and label unavailable checks NOT TESTED.

```text
UI Conformance Audit

1920×1080     PASS
2560×1440     PASS
3840×2160     PASS
150% DPI      PASS
200% DPI      PASS
Window resize PASS

Violations:
- Settings pane uses a fixed content height that breaks the supported viewport.
- Dashboard card width bypasses the approved layout primitive.
```

This makes the skill useful as a repeatable engineering capability rather than a passive prompt fragment.

---

## 7. Repository-Specific UI Profile

Applications will still need a small amount of project-local UI information. That information should describe what is unique about the application rather than duplicating the global standard.

A repository might contain:

```text
UI_PROFILE.md
```

Illustrative profile shape only (not an adopted ChampCity profile and not an accessibility/reflow exemption):

```markdown
# Application UI Profile

Target:
- Desktop application
- Minimum viewport: 1280 × 720
- Primary target: 2560 × 1440
- Supported through: 3840 × 2160
- Windows display scaling: 100–200%

Application-specific constraints:
- Left navigation remains visible above 1100px.
- Data tables may horizontally scroll below 1400px.
- Mobile layout is not supported.

Approved deviations from global UI standard:
- None.
```

The precedence model is:

```text
Applicable adopted standard(s)
        -> define acceptance requirements
Approved project/repository profile and explicit exceptions
        -> configure/narrow those requirements without silently weakening them
Assigned versioned Skill
        -> operationalizes how the worker applies the governing requirements
Bounded task contract
        -> narrows current work but cannot override the adopted standard/profile or Operator direction
Implementation
```

The repository therefore contains only application-specific policy and approved deviations. A declared minimum window or statement such as "mobile layout is not supported" does not waive required text enlargement/reflow/accessibility behavior where the applicable standard requires it.

---

## 8. Skills Engine Responsibilities

The UI Engineering Skill exposes several broader requirements for the future Skills Engine.

The engine should eventually provide:

### 8.1 Canonical Skill Registry

ChampCity needs one canonical inventory of available shared skills, their versions, purposes, and dependencies.

### 8.2 Skill Discovery

Workers and orchestration should be able to determine which skills are applicable to a task without relying on repository-local copies.

### 8.3 Skill Assignment

The orchestration layer should be able to explicitly assign one or more skills to a worker based on role, task type, lifecycle stage, or contract requirements.

### 8.4 Versioning

A skill should have an explicit version so that implementation and validation evidence can identify which engineering behavior was applicable when the work was performed.

### 8.5 Standards Binding

A skill should declare the canonical standards or policies it consumes.

### 8.6 Capability Requirements

A skill may require runtime capabilities such as:

- repository read access;
- repository write access;
- shell execution;
- browser access;
- screenshot/visual inspection;
- test execution; or
- specific MCP tools.

Those requirements should be declarative rather than silently assumed.

### 8.7 Role / Lifecycle Awareness

A skill should be usable differently by Architect, Implementer, Reviewer, Validator, or future worker roles without duplicating the skill itself.

### 8.8 Provider Portability

A ChampCity skill must be a ChampCity-owned portable capability. It should not fundamentally depend on OpenAI Codex-specific behavior if an equivalent portable runtime capability can be defined.

The same UI Engineering Skill should eventually be usable by:

- a Codex/App Server-backed worker;
- a ChampCity-native local worker;
- another future agent runtime; or
- another supported model provider.

---

## 9. Native Skill Mechanisms vs. ChampCity Skill Governance

Codex already exposes a concept of skills. ChampCity should investigate how much of the low-level skill-loading mechanism can be reused when the selected runtime supports it.

However, ChampCity should retain canonical ownership of the portable semantics of its Skills Engine; that technical ownership does not create a discretionary product-decision principal.

A useful distinction is:

```text
ChampCity owns:
- skill identity
- skill purpose
- canonical content
- standards binding
- versioning
- governance
- assignment
- applicability rules
- capability requirements
- conformance expectations

Runtime adapter owns:
- how the selected runtime receives/loads the skill
- runtime-specific prompt or context injection
- runtime-specific skill APIs
```

This prevents a native provider feature from becoming an architectural dependency of the ChampCity skills model.

---

## 10. Proposed Initial Skill Family

The UI Engineering Skill should establish the pattern for a small family of focused shared engineering capabilities rather than one monolithic engineering rulebook.

Potential early skills include:

```text
ui-engineering
accessibility-conformance
testing-strategy
repository-architecture
logging-observability
application-configuration
error-handling
```

Skills should remain sufficiently narrow that they can be composed according to task requirements.

---

## 11. Governance Principle

The core governance principle is:

> Shared engineering behavior belongs in one canonical harness-level skill or standard. Repository-local artifacts should contain only project-specific constraints, configuration, or approved deviations.

This avoids copying reusable organizational knowledge into every project and provides one place to improve the behavior later.

---

## 12. Open Design Questions

The following questions remain intentionally unresolved:

1. What is the canonical on-disk schema for a ChampCity skill?
2. Where do shared skills and standards physically live?
3. Should skills be part of the ChampCity application repository or a separately versioned shared repository/package?
4. How are skills versioned and pinned for reproducibility?
5. How does a repository declare project-specific profiles or deviations?
6. Does orchestration assign skills explicitly, infer them from task type, or support both?
7. How are multiple skills composed when their instructions overlap?
8. How should the precedence rule already stated in this document be encoded, versioned, and validated mechanically across standards, approved profiles/exceptions, skills, and task contracts?
9. What evidence proves that a worker actually applied a required skill?
10. How are skill conformance tests executed across different agent runtimes?
11. Which parts of Codex's native skill mechanism can be used through an adapter without making ChampCity dependent on Codex?

---

## 13. Current Direction

The current design direction is to treat **UI Engineering as one of the first harness-level ChampCity skills** and use it to establish the Skills Engine architecture.

The skill should operate in Design, Implement, and Audit modes; consume a canonical responsive UI standard; allow small repository-specific profiles; and remain portable across future runtime and model providers.

This document captures design discussion only. It is not an approved implementation contract.