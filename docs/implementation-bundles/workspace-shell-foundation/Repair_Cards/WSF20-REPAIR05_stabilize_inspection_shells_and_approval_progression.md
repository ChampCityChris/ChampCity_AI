# WSF20-REPAIR05 — Stabilize Greenfield inspection shells and approval progression

**Type:** Repair Card  
**Parent:** WSF20  
**Defects:** WSF20-D15, D16, D17  
**Starting baseline:** `4ad54324b8b71bff3cace786944413b12c882ab0`

> If WSF20-REPAIR04 lands first, execute this card on the resulting `dev` HEAD. R04 changes model-facing handoff prose; this card changes renderer composition/progression and should not revert R04.

## Objective

Make completed-stage inspection visually faithful and make Operator approval advance the canonical Greenfield workflow immediately.

Target behavior:

```text
current stage
→ candidate submitted
→ Operator reviews
→ Operator selects Approved
→ SQL disposition persists
→ parent Greenfield resolver reruns immediately
→ next canonical workspace opens

completed prior stage selected from rail
→ actual recovered shell opens read-only
→ embedded ChatGPT remains available on browser-capable stages
→ ChampCity mutation controls disabled
→ shell uses full available workspace geometry
→ Resume current stage remains available in left sidebar
```

No SQL/domain redesign.

# D15 — inspection must not remove the embedded browser

## Required correction

Remove the Greenfield composition rule that replaces the browser with `null` merely because the Operator is inspecting a non-current workspace.

For recovered browser-capable stages, inspection must receive the normal `ApplicationBrowserHost`.

Read-only protection remains at the ChampCity workspace/action layer:

- current `fieldset disabled={inspection}` or a better equivalent may disable ChampCity buttons/forms;
- SQL mutations must remain unavailable during read-only inspection;
- no fake current-stage identity is persisted;
- the native ChatGPT/WebContents surface may remain visible and interactive so the Operator can review the existing conversation/context.

Harden candidate adapters so if `browserVisible === false` for a legitimate non-browser reason they do not render an orphan Browser Actions companion without a browser.

At minimum cover:

- Architect Interview;
- Project Planning;
- Phase Map;
- Phase Interview;
- Phase Planning;
- Work Card Planning.

Do not undo R03 attachment-generation/session recovery.

## Live acceptance

From current Project Planning:

1. inspect Architect Interview;
2. Architect Review remains readable;
3. same embedded ChatGPT session is visible in the right pane;
4. browser bounds are positive;
5. ChampCity disposition/handoff/next-stage mutation controls are disabled for inspection;
6. Resume current stage appears in the left sidebar;
7. Resume returns to current Project Planning;
8. repeat inspection/return at least three times.

# D16 — one stable Greenfield shell fill owner

## Required correction

Remove the assumption that every composed workspace exposes one direct DOM child that can receive `flex:1`.

Establish one stable Greenfield content/fill boundary.

Preferred characteristics:

- `greenfield-shell-host` owns exactly one fill child;
- recovered shells may contain their own header/banner + workspace body without each becoming an independent full-height flex peer;
- shell header/banner regions are intrinsic height;
- the actual workspace body receives remaining height;
- empty-document and populated-document states use the same overall geometry;
- no shell requires content generation before it expands to available height.

Correct the confirmed multi-root shell boundaries:

- `IntakeWorkspaceShell`
- `ProjectPlanningReviewShell`

Either give those shells a single presentation root or introduce an equivalent Greenfield shell frame that safely owns their multiple regions. Do not copy workspace chrome into `GreenfieldWorkspace`.

Remove or replace the unsafe blanket rule:

```css
.greenfield-shell-host > * { flex: 1; ... }
```

with explicit ownership that cannot assign half the screen to a header or blocker banner.

## Required visual states

Prove full-height geometry for:

1. Project Intake current;
2. Project Intake read-only inspection;
3. Architect Interview current;
4. Architect Interview read-only inspection;
5. Project Planning before any Project Planning candidate exists;
6. Project Planning with a stale/blocker banner;
7. Project Planning with generated Profile/Roadmap documents;
8. Phase Map empty/read-only state.

The document/browser columns should use available height immediately; generating a candidate must not change the outer shell height.

# D17 — Approved is the transition authority

## Governing rule

For a **current canonical gating stage**, a successful Operator `Approved` disposition must immediately invoke the parent Greenfield canonical resolver.

There is no second authorization represented by a `Continue ...` click.

Revision Requested or Rejected must remain on the current stage.

## Apply this shared rule to Greenfield gating stages

- Architect Interview → Project Planning
- Project Planning → Phase Map
- Phase Map → first/current Phase Interview
- Phase Interview → Phase Planning
- Phase Planning → Work Card Map / next canonical Work Card stage
- Work Card Planning → Implement
- Repair Work Card Planning → Repair Implement

Project Intake already demonstrates the intended approval→progression behavior; preserve it.

Where adapters already expose an `onNext`, `onApproved`, `onImplement`, or equivalent canonical callback, use one shared behavioral pattern rather than inventing renderer navigation state.

After the SQL review mutation returns successfully:

```text
if outcome === approved:
    invoke parent canonical refresh/resume
else:
    retain/update local review model
```

The parent resolver remains sole navigation authority.

## Remove redundant Continue gates

Once approval automatically advances, remove redundant current-stage buttons whose only purpose is to perform the same canonical refresh:

- Continue to Project Planning
- Continue to Phase Map
- Continue to next Phase
- Continue to Phase Planning
- Continue to Work Card Map
- Continue to Work Card Implement
- Continue to Repair Implement, when it is only the post-approval planning transition

Do not remove buttons representing a genuinely different later action or terminal/manual alternate surface.

## Race/error behavior

- Do not advance before the review mutation succeeds.
- If parent canonical refresh fails, display the error and do not fabricate a next stage.
- Prevent duplicate approval/advance execution while busy.
- Revision/rejection never call the advance callback.
- Read-only inspection cannot apply a disposition, so it cannot advance canonical state.
- The resolver result, not the adapter's predicted stage, decides the destination.

# Focused automated proof

Add/extend tests proving:

### Inspection/browser

1. inspected Architect Interview receives a non-null browser companion;
2. browser-capable inspected stages do not produce orphan Browser Actions rows;
3. inspection disables ChampCity mutation controls without removing the browser host;
4. Resume remains contextual and returns to the canonical resolver stage;
5. R03 detach/reattach lifecycle owners remain green.

### Shell geometry

6. Greenfield host has one explicit fill owner rather than blanket flex on arbitrary direct children;
7. Intake header is intrinsic height and Intake shell fills remaining height;
8. Project Planning blocker is intrinsic height and document/browser shell fills remaining height;
9. empty and populated Project Planning use the same outer fill structure;
10. Phase Map empty state fills the shell.

### Approval progression

11. Project Planning Approved calls canonical progression exactly once after persistence;
12. Project Planning Revision Requested/Rejected do not progress;
13. Phase Map Approved progresses exactly once;
14. Phase Interview Approved progresses exactly once;
15. Phase Planning Approved progresses exactly once;
16. Work Card Planning Approved progresses exactly once;
17. Repair planning Approved progresses to canonical Repair execution;
18. redundant post-approval Continue controls are absent;
19. parent Greenfield selection after approval comes from `getGreenfieldNavigation`, not a hard-coded next stage.

Run the existing Greenfield composition/navigation owner, Project Planning renderer owner, Phase Map owner, Phase Interview/Planning owners, Work Card Planning/Repair owners, Architect browser owners, and production build/static validation.

# Operator acceptance

After checkpoint, resume the current live Greenfield test without rebuilding project state.

Verify:

1. current Project Planning approval immediately opens Phase Map;
2. Phase Map is canonical/actionable, not read-only inspection;
3. inspect Architect Interview and Project Intake and confirm their recovered layouts remain well formed;
4. Architect inspection retains embedded ChatGPT;
5. Resume current stage returns to Phase Map;
6. Project Planning empty/generated states both use full available height;
7. approve Phase Map and confirm immediate transition to Phase Interview.

# Forbidden changes

- no SQL/domain/schema changes;
- no persisted renderer navigation state;
- no hard-coded next-stage selection;
- no browser session replacement;
- no browser security/allow-list relaxation;
- no model prompt/handoff changes from R04;
- no D05–D08 work;
- no copying recovered shell chrome into Greenfield composition.

# Implementer report

Write:

`Dev/docs/implementation-bundles/workspace-shell-foundation/Implementer_Reports/WSF20_REPAIR05_IMPLEMENTER_REPORT.md`

Report separately:

- D15 inspected-browser behavior and repeated live inspection/return proof;
- D16 exact shell-fill ownership change and empty/populated visual proof;
- D17 each approval transition tested and redundant Continue controls removed;
- focused test receipts;
- production build result;
- any remaining Operator audit blocker.

## Checkpoint

`WSF20-R05 stabilize inspection shells and approval progression`

After checkpoint, stop for Operator audit.
