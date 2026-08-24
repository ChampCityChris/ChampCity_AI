# ISSUE_001 — Fix Card Plan

## Purpose

This plan decomposes `ISSUE_001` into bounded implementation units beneath the single Issue Resolution Plan.

The cards are ordered by natural implementation sequence. This is not a new multi-phase hierarchy and must not introduce artificial approval gates between cards. Each card preserves completed prior behavior and returns to the Issue workflow.

Operator approved this seven-card decomposition on 2026-08-24.

## Fix Card 01 — Workflow Hub Shell and Development Entry

**ID:** `ISSUE_001-FC01`

**Purpose:** Establish the new shell-level Workflow Hub above the existing Development lifecycle.

Required outcome:

- application launch/project selection resolves to the Workflow Hub rather than automatically foregrounding Development;
- Hub mode uses the simplified project/settings/theme sidebar;
- Development lifecycle rail is absent in Hub mode;
- one functional Development workflow card is presented using the approved large-card design;
- selecting Development invokes the existing Development resolver and opens the correct current Development workspace;
- returning to the Hub changes foreground navigation only and leaves Development lifecycle state unchanged;
- Settings opens from Hub and returns to Hub correctly.

Primary design authority:

`planning/project/Design_Documents/WORKFLOW_HUB_ARCHITECTURE.md`

Do not implement Issue Resolution internals in this card.

## Fix Card 02 — Issue Resolution Shell, Issue Discovery, and Intake

**ID:** `ISSUE_001-FC02`

**Purpose:** Establish Issue Resolution as the second peer workflow and give the project a first-class Issue intake/current-Issue surface.

Required outcome:

- Workflow Hub registers an Issue Resolution card without redesigning Hub internals;
- Issue Resolution opens independently of Development lifecycle state;
- application can discover project-owned `issues/ISSUE_*` directories;
- Operator can view/select the current Issue;
- Issue Intake can create or present an `ISSUE_RECORD.md` under the selected Issue directory;
- discovery context may reference Development but does not create Phase/Work Card parentage;
- Issue workflow navigation is distinct from the Development `NestedWorkflowRail`;
- returning to Hub or Development preserves both workflow states.

Keep the initial Issue surface small. Do not build ticket queues, assignment, severity matrices, or generic issue-management features.

## Fix Card 03 — Issue Architect Planning

**ID:** `ISSUE_001-FC03`

**Purpose:** Add the Architect Planning stage that investigates an Issue and produces the evidence-grounded correction architecture before implementation decomposition.

Required outcome:

- current Issue Record is the Architect Planning source;
- Browser GPT Architect handoff/prompt is generated from the selected project and Issue evidence;
- Architect inspects the relevant repository/runtime path through the existing MCP workspace authority;
- output records confirmation/rejection, root cause, affected architecture, preservation requirements, and correction direction;
- application owns the final Issue Architect Planning artifact under the current Issue directory;
- material Operator choices may be handled conversationally, but ordinary architectural judgment does not create unnecessary approval gates;
- no Phase or current Development Work Card is required to complete Architect Planning.

For the bootstrap run, `ARCHITECT_INVESTIGATION.md` represents the intended output shape.

## Fix Card 04 — Issue Resolution Planning and Fix Card Map

**ID:** `ISSUE_001-FC04`

**Purpose:** Add the single issue-level planning layer that decomposes the confirmed correction into one or more bounded Fix Cards.

Required outcome:

- Issue Architect Planning feeds Issue Resolution Planning;
- application produces an Issue Resolution Plan and Fix Card Plan/Map under the Issue directory;
- Fix Cards have stable Issue-relative identities and ordering;
- small issues may produce one Fix Card; larger normal issues may produce several;
- no additional Issue Phase hierarchy is introduced;
- oversized issues can be identified for reframing as Feature/Development work instead of indefinitely expanding Issue Resolution;
- Fix Card creation uses the retained Work/Repair Card discipline: verified evidence, bounded scope, preservation, forbidden changes, objective acceptance, focused validation, and Implementer proof.

For the bootstrap run, `ISSUE_RESOLUTION_PLAN.md` and this `FIX_CARD_PLAN.md` represent the intended output shape.

## Fix Card 05 — Fix Card Build / Review / Validation Loop Reuse

**ID:** `ISSUE_001-FC05`

**Purpose:** Reuse the existing Development implementation machinery for Issue-domain Fix Cards without creating a second coding pipeline.

Required outcome:

- implementation contract identity can represent `fix-card` in addition to existing `formal-work-card` and `repair-work-card` semantics where appropriate;
- Fix Card paths and report paths resolve under the owning `issues/ISSUE_xxx` directory rather than requiring `planning/phases/...`;
- Fix Cards can use the existing Codex App Server implementation path and future Browser Implementer path;
- Implementer Report creation/review is reused with Issue/Fix Card identity instead of requiring a Development `phaseId` parent;
- advisory Architect review and Operator validation work for a current Fix Card;
- a defective Fix Card implementation can create a Repair Card subordinate to that Fix Card;
- unrelated problems discovered during Fix Card work become separate Issues rather than child repairs;
- existing Development Formal Work Card and Repair Work Card behavior remains unchanged.

This card should generalize only the seams that currently assume Development contract identity. Do not rewrite the entire Work Card subsystem into a generic workflow engine.

## Fix Card 06 — Issue Validation Workspace and Lifecycle

**ID:** `ISSUE_001-FC06`

**Purpose:** Build the Issue-level validation step above completed Fix Cards without also owning Issue closure.

Required outcome:

- Issue Validation is available only after all planned Fix Cards for the current Issue are closed;
- validation evaluates the aggregate correction against the original Issue Record and Issue Resolution Plan rather than merely repeating each Fix Card's tests;
- unrelated observations can be captured as new Issues without failing the current Issue by default;
- Operator can validate the Issue as resolved or request further bounded corrective work;
- a failed Issue Validation returns to Issue Resolution planning/card work and does not enter Issue Close;
- Issue Validation does not advance, close, reset, or reinterpret Development lifecycle state.

Do not build Issue Close in this card.

## Fix Card 07 — Issue Close Workspace and Lifecycle

**ID:** `ISSUE_001-FC07`

**Purpose:** Build the final Issue Close workspace and lifecycle transition after successful Issue Validation.

Required outcome:

- Issue Close is reachable only from successful current Issue Validation evidence;
- the workspace presents the Issue identity, original problem, completed Fix Card summary, and validation result needed for informed closure;
- Operator can record final Issue resolution/closure;
- closure marks the Issue resolved without advancing or modifying Development lifecycle state;
- returning from Issue Close goes to the Workflow Hub;
- Workflow Hub may reflect resolved/current Issue status as presentation only and must not become a second Issue lifecycle authority;
- after close, entering Development resolves to the same Development Phase/Work Card state that existed before Issue Resolution was foregrounded.

Do not combine Issue Close with a new Issue-management queue, history system, or Development close behavior.

## Planned Order

```text
ISSUE_001-FC01  Workflow Hub shell
        ↓
ISSUE_001-FC02  Issue workflow shell + intake
        ↓
ISSUE_001-FC03  Architect Planning
        ↓
ISSUE_001-FC04  Resolution Planning + Fix Card Map
        ↓
ISSUE_001-FC05  Shared Fix Card implementation loop
        ↓
ISSUE_001-FC06  Issue Validation
        ↓
ISSUE_001-FC07  Issue Close
```

The order reflects implementation dependency, but prior-card completion must be established through ordinary review/validation rather than separate prerequisite-gate artifacts.

## Aggregate Issue Acceptance / Dogfood Proof

The end-to-end proof is **not** another Fix Card. Once FC07 has passed its own Fix Card review and validation, `ISSUE_001` itself is completed through the newly built Issue workflow:

```text
ISSUE_001
→ Issue Validation workspace
→ Operator confirms aggregate correction resolves the original Issue Record
→ Issue Close workspace
→ close ISSUE_001
→ return to Workflow Hub
→ enter Development
→ verify prior Development Phase / Work Card state is unchanged
```

This aggregate run validates that the Fix Cards together resolved the parent Issue and proves the new workflow can dogfood its own bootstrap issue.

## Aggregate Preservation

Across all Fix Cards, preserve:

- current Development project/phase/Work Card lifecycle behavior;
- Development Repair semantics;
- selected-project state;
- Settings/theme behavior;
- current repository/MCP authority;
- current Codex App Server execution behavior;
- existing planning artifacts and paths;
- no Git mutation unless a later card explicitly authorizes it.

## Bootstrap Return Point

The first cards are expected to be managed manually from `issues/ISSUE_001` because the Issue Resolution workflow does not yet exist.

After `ISSUE_001-FC05` establishes the shared Fix Card loop, continued ISSUE_001 work should be routed through the new application workflow whenever the application can safely do so. FC06 and FC07 should therefore be the first cards considered for execution through the newly available Issue Resolution machinery rather than through the manual bootstrap path.
