# WSF20-REPAIR06 — Correct Greenfield rail status, Phase Map fill, and read-only inspection

**Type:** Repair Card  
**Parent:** WSF20  
**Defects:** WSF20-D18, D19, D20, D21, D22  
**Starting baseline:** `64758468e5625fef409deb31501fdc0bfb692d5a`

## Objective

Finish the recovered Greenfield presentation contract exposed by live Operator validation:

- project rail status must reflect SQL lifecycle truth;
- Phase Map and its embedded browser must fill the stage like the other recovered dual-pane workspaces;
- completed-stage inspection must remain interactive for read-only presentation while blocking ChampCity mutations;
- phase/work-card context selectors must be contextual, not permanent empty global chrome.

No SQL/domain redesign.

# D18 — Architect Interview rail status

## Required correction

Do not let a presentation default override SQL-derived completion.

In `GreenfieldNestedWorkflowRail` / `deriveProjectRailPresentation` integration:

- if an explicit Architect model status is actually supplied, it may be used;
- otherwise use the SQL-derived `projectRailStatuses["architect-interview"]`;
- do not synthesize `Open` merely because no Architect model prop was supplied.

Required behavior:

```text
completedWorkspaces includes architect-interview
→ Architect Interview = Completed

architect-interview is canonical/current and not completed
→ Architect Interview = Open / required presentation

explicit Needs Attention / Awaiting Approval status
→ preserve exact supplied state
```

Do not reintroduce Markdown-derived rail authority.

# D19 / D20 — Phase Map full-height and usable browser viewport

## Required correction

Make the Greenfield stage host a normal layout container, not a form-control mechanism.

The current `fieldset.greenfield-shell-host` should not be relied on for either read-only authority or fill geometry.

Use a neutral stage host such as a `div`/section and establish an explicit full-height layout contract:

- Greenfield shell host fills the remaining application workspace height;
- `greenfield-shell-content` has a definite stretch/fill boundary;
- direct recovered workspace roots such as `.figma-phase-map-workspace` stretch to that boundary without percentage-height ambiguity;
- left Phase Map column fills available height;
- right `.figma-browser-column` fills available height;
- `.figma-browser-panel` grows;
- native `.architect-browser-host` receives a materially usable positive height, not a token 1px/small intrinsic rectangle;
- Browser Actions remain intrinsic beneath/alongside the browser surface according to the recovered shell.

Do not special-case a fixed pixel application height. Use flex/grid min-height ownership.

Review other direct-root dual-pane candidate shells while changing this boundary so Phase Map is not the only one with an ad hoc fill rule.

## Required real geometry proof

Test the **full Greenfield composition**, not the Phase Map shell in isolation.

At a fixed desktop viewport, before a Phase Map candidate exists:

- the Greenfield stage host reaches the bottom of the workspace;
- Phase Map root reaches the bottom of the stage host;
- Phase Map card body has positive remaining height;
- browser column reaches the bottom of the stage host;
- native browser host has a useful height comparable to Architect/Project Planning at the same viewport.

Then repeat with a generated Phase Map document.

No content-generation event may be required for the outer shell to expand.

## Live acceptance

In the real Electron application:

1. open canonical Phase Map with no map candidate yet;
2. embedded ChatGPT is visibly rendered and interactive, not merely labeled Ready;
3. Phase Map left and browser right columns use the available vertical space;
4. Prepare/Copy Handoff and Refresh remain usable;
5. submit/refresh a Phase Map candidate and confirm outer geometry does not jump or collapse.

# D21 — read-only inspection must remain inspectable

## Governing rule

Inspection blocks **state mutation**, not harmless UI interaction.

Remove the blanket `fieldset disabled={inspection}` approach.

Introduce an explicit ephemeral inspection/read-only presentation flag through Greenfield composition.

Mutation controls that must be disabled in inspection include, as applicable:

- Intake save/review;
- disposition Apply;
- Prepare Handoff when it can produce/update application-side candidate context;
- stage progression / terminal mutation;
- WorkItem implementation/run actions;
- Repair creation/planning mutations;
- other ChampCity SQL/domain mutations.

Non-mutating inspection controls must remain usable:

- document tabs;
- scrolling;
- local expand/collapse;
- Copy;
- Export Markdown;
- embedded ChatGPT interaction;
- browser Reload/Retry;
- local document/phase/work-card presentation selection;
- sidebar Resume current stage.

Do not infer mutability from button position. Each adapter/shell must explicitly distinguish presentation actions from application mutations.

At minimum prove completed inspection for:

- Project Intake;
- Architect Interview;
- Project Planning with Profile + Roadmap;
- Phase Map;
- Phase Interview / Planning;
- Work Card Planning / Review surfaces with multiple document slots where present.

### Project Planning regression

Completed Project Planning inspection must allow:

```text
Project Profile tab
↔ Project Roadmap tab
```

while Apply Review / candidate mutation / canonical progression remain disabled.

# D22 — remove permanent empty SQL selector chrome

The top-level Project workflow should not always display:

- `Inspect SQL Phase`
- `Inspect SQL Work Card`

Remove those selectors from Project-level stages when they have no meaningful inventory/context.

Preferred presentation:

- no Phase/Work Card inspection selector row during Project Intake, Architect Interview, Project Planning or an unapproved/empty Phase Map;
- once Phase/Work Card inventory exists, contextual inspection selection may appear only within the Phase/Work Card lifecycle where switching exact historical context is meaningful;
- use human-facing labels such as **Inspect Phase** / **Inspect Work Card**; do not expose `SQL` as UI jargon;
- if there is only one current context and no historical alternative, omit the selector rather than render a placeholder-only control;
- selection remains ephemeral and must never create/persist fake current Phase/WorkItem state.

Do not remove the ability to inspect prior exact Phase/WorkItem state. Make it contextual instead of global.

If the existing Phase Map / Work Card Map can own that context selection cleanly, prefer those recovered map surfaces over a permanent global dropdown strip.

# Focused proof

Add/extend tests proving:

## Rail

1. completed Architect Interview renders Completed from SQL-derived completed workspaces;
2. absent explicit Architect status does not default-overwrite SQL status;
3. explicit attention/awaiting states still render correctly.

## Phase Map geometry/browser

4. full Greenfield current Phase Map fills its stage before a candidate exists;
5. generated Phase Map uses the same outer geometry;
6. browser host receives useful positive bounds in both states;
7. native browser remains interactive/Reloadable;
8. R03 generation/session-reuse tests remain green.

## Inspection

9. no disabled outer fieldset is used as the inspection authority;
10. completed Project Planning allows both document tabs to be selected;
11. Copy/Export/browser interaction remain available in inspection;
12. Apply Review / SQL mutation / canonical next-stage actions remain disabled;
13. same principle holds for the other recovered inspectable candidate stages;
14. Resume remains the only action that returns inspection to canonical SQL navigation.

## Context selectors

15. Project-level stages with no Phase/WorkItem inventory render no inspection dropdown row;
16. placeholder-only selectors never render;
17. contextual Phase/WorkItem selectors render only when meaningful alternatives exist;
18. selecting historical context remains presentation-only and does not mutate SQL navigation authority.

Run the Greenfield composition/navigation owner, project rail owner, Project Planning renderer owner, Phase Map owner, Architect browser owners, relevant multi-document inspection owners, and production build/static validation.

# Operator acceptance

Continue the current Greenfield test state.

Verify:

1. rail shows Architect Interview **Completed**;
2. canonical Phase Map uses full vertical space;
3. embedded ChatGPT is actually usable in Phase Map;
4. inspect completed Project Planning and switch freely between Project Profile and Project Roadmap;
5. no permanent empty Phase/Work Card SQL dropdown strip appears on Project-level stages;
6. mutation controls remain unavailable during inspection;
7. Resume returns to canonical Phase Map.

# Forbidden changes

- no SQL/domain/schema migration;
- no renderer-owned canonical stage;
- no persisted inspection selection;
- no browser security/session changes;
- no MCP/prompt changes;
- no hard-coded viewport height;
- no reintroduction of global disabled-fieldset inspection;
- no D05–D08 work except where D06 is naturally reduced by the corrected inspection presentation boundary; do not broaden into Work Card resolver redesign.

# Implementer report

Write:

`Dev/docs/implementation-bundles/workspace-shell-foundation/Implementer_Reports/WSF20_REPAIR06_IMPLEMENTER_REPORT.md`

Report separately:

- D18 rail status correction;
- D19/D20 full-composition Phase Map geometry and live native-browser proof;
- D21 mutation-vs-presentation inspection matrix;
- D22 selector visibility/context behavior;
- focused tests/build receipts;
- remaining Operator blockers.

## Checkpoint

`WSF20-R06 correct rail status phase-map fill and inspection UX`

After checkpoint, stop for Operator audit.
