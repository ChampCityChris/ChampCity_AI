# Architect Review — Phase 08 WC01–WC15 Ordered Sequence Release Readiness

Status: sequence review complete; revision required before release
Project: ChampCity A/I
Phase: phase-08
Reviewed scope: WC01 through WC15, synchronized JSON siblings, controlling Phase 08 planning records, governing lifecycle design documents, and current clean-room technical baseline
Review date: 2026-07-21
Execution authorization: withheld
Git mutation: not authorized or performed

## Executive Disposition

The Phase 08 architecture direction is accepted.

The sequence correctly models one nested lifecycle:

```text
Project
└── Phase
    └── Work Card
```

Each level uses:

```text
Intake → Planning → Building → Validation → Close
```

The sequence also correctly preserves these core boundaries:

- durable repository documents remain the visible workflow evidence;
- workspace identity and browser state do not become approval authority;
- Project and Phase planning bundles use synchronized dispositions;
- the Approved Formal Work Card is the Implementer instruction;
- Implementer Report review occurs before Operator validation;
- Validation Records are created only after Operator validation;
- repairs remain bounded siblings of the original Work Card;
- Phase and Project close use one closeout decision without duplicate approval artifacts.

However, WC01–WC15 are **not ready for Implementer release**. The cards describe the workspaces and local document rules, but the complete sequence lacks several shared contracts required to make those workspaces operate as one coherent application.

Release disposition:

```text
RevisionRequested
```

WC01 must not be released until the blocking corrections in this review are incorporated into the ordered sequence.

## Repository and Baseline Verification

Verified through ChampCity MCP:

```text
Repository: ChampCityChris/ChampCity_AI
Branch: feature/phase-04-wc01-repair01-evidence-derived-workflow
Working tree: dirty
Tracked modified: 625
Staged: 0
Untracked: 88
Deleted: 139
```

The current application baseline is the Phase 07 clean-room document-disposition implementation. The active source includes a repository-wide planning-document scanner, four-status disposition parser/writer, five provisional workspace labels, path-based document classification, and a first-non-approved resolver.

Relevant baseline files include:

```text
src/main/documents/planningDocumentService.ts
src/main/documents/documentDispositionWriter.ts
src/main/documents/firstNonApprovedResolver.ts
src/shared/documents/documentOrder.ts
src/shared/workspaces/documentWorkspace.ts
src/shared/workspaceContracts.ts
```

The installed Electron version is `^31.3.0`.

No source file, Work Card, planning record, or Git state was modified during this review except creation of this review artifact pair.

## Review Method

The review evaluated each card in order against:

1. the seven Operator-confirmed lifecycle and workspace design documents;
2. the immediately preceding and following Work Cards;
3. the Phase 08 Work Card Plan revision 7;
4. the Phase 08 Phase Planning revision 7;
5. the current clean-room document discovery, classification, ordering, and resolver implementation;
6. the requirement that each card be independently implementable and acceptable without silently implementing later-card scope.

The review tested four questions for every card:

- Is the card's scope bounded and non-duplicative?
- Are its dependencies sufficient and correctly ordered?
- Does it identify the durable artifact that carries authority?
- Can its acceptance criteria be satisfied without relying on an undefined shared contract?

## Blocking Finding 1 — No Evidence-Derived Lifecycle and Workspace Resolver

### Finding

WC01 creates lifecycle vocabulary and an extensible workspace registry, but expressly prohibits current-location resolution, document-to-lifecycle classification changes, progression, routing, and stage-completion behavior.

WC02–WC15 then add workspaces and local completion predicates, but no card replaces the current flat first-non-approved resolver with a resolver that understands:

- Project, Phase, and Work Card nesting;
- multiple workspaces at one lifecycle location;
- workspace order within a location;
- parent-to-child entry and child-to-parent return;
- compound completion predicates such as `Approved + closureDecision=Close`;
- non-review handoff documents;
- selected phase and Work Card identity derived from approved documents;
- direct `Continue` actions between evidence-derived locations.

The current resolver selects the first planning document whose disposition is not `Approved`. It does not understand lifecycle location, closeout decision fields, document roles, or candidate dependencies.

### Consequence

The application could contain every new workspace but still:

- open the wrong workspace;
- stop on a generated prompt that is not a review target;
- treat an Approved `DoNotClose` closeout as complete;
- fail to return from Work Card Close to Phase Building;
- fail to distinguish Phase Building from Work Card Intake;
- report all documents approved without deriving terminal Project Close.

### Required correction

Add a bounded foundation card immediately after WC01 and before Project Intake implementation.

Recommended title:

```text
Evidence-Derived Lifecycle Projection and Workspace Resolution
```

It must implement only:

- explicit document participation roles;
- explicit document-to-workspace ownership;
- evidence-derived lifecycle location;
- deterministic workspace ordering;
- selected phase and Work Card identity from approved source documents;
- semantic completion predicates, including closeout decision fields;
- direct navigation targets without persisted hidden workflow state;
- plain-language resolver evidence explaining why a workspace is current.

It must not reintroduce route tokens, role gates, execution runs, approval queues, hashes, or a persisted current-action authority.

## Blocking Finding 2 — Generated Handoff Documents Can Trap the Resolver

### Finding

The sequence creates multiple durable prompt and handoff artifact pairs:

- Architect Interview Prompt;
- Project Planning handoff;
- Phase Map handoff;
- Phase Interview handoff;
- Phase Planning handoff;
- Work Card Intake handoff;
- repair-specific Architect handoffs.

WC02 and WC05 recognize that generated handoffs must not become unreviewable resolver gates, but they leave disposition treatment for the Implementer to decide.

WC09 explicitly requires the Work Card Intake handoff to remain `Pending` until consumed or explicitly dispositioned by the later Work Card Planning workflow. WC10 contains no action that dispositions the WC09 handoff.

The current clean-room resolver evaluates all discovered Markdown/JSON planning documents and stops on any effective disposition other than `Approved`.

### Consequence

WC09 would create a deterministic deadlock:

```text
Pending Work Card Intake handoff
→ first-non-approved resolver selects handoff
→ no handoff review/disposition workspace exists
→ Work Card Planning cannot become current
```

Equivalent traps could occur for other generated handoffs unless each card independently invents a different workaround.

### Required correction

Define one shared non-review handoff contract before WC02.

The simplest acceptable rule is:

```text
Generated system handoff artifacts are non-review documents.
They are written with Document.Status=Approved when generation succeeds.
Their content remains viewable and regenerable, but they are not independent approval gates.
```

An alternative explicit participation model may exclude non-review handoffs from lifecycle gating, but that exclusion must be visible, deterministic, and implemented by the new evidence-derived resolver. It must not be a hidden exception.

Every handoff-producing card must use the same rule and canonical path contract.

## Blocking Finding 3 — No Source Freshness or Downstream Invalidation Contract

### Finding

The cards allow approved upstream documents to be edited or regenerated:

- WC02 permits Project Intake edits and prompt regeneration;
- WC04 permits Architect Interview revision;
- WC05 permits Project Profile and Roadmap revision;
- WC06 permits Phase Map revision;
- WC07 permits Phase Interview revision;
- WC08 permits Phase Planning and Work Card Plan revision;
- WC10 permits Formal Work Card revision;
- WC12 and WC13 create later repair and validation evidence.

No shared rule determines when an upstream revision invalidates already Approved downstream artifacts.

Current completion checks generally verify only that required documents exist and currently say `Approved`. They do not verify that the downstream document was produced from the current approved revision of its sources.

### Consequence

Examples of invalid but currently permitted states include:

- Project Intake changes while an older Architect Interview remains Approved;
- Architect Interview changes while older Project Profile and Roadmap remain Approved;
- Project Roadmap changes while an older Phase Map remains Approved;
- Work Card Plan changes while Formal Work Cards from the older plan remain Approved;
- Formal Work Card changes after implementation while an older Implementer Report and Validation Record remain Approved;
- repair implementation occurs while an older passing validation remains treated as current.

This creates stale approval rather than a visible workflow.

### Required correction

Add a bounded shared source-freshness contract before WC02 or as a second foundation card after the lifecycle resolver card.

It must define:

- monotonic artifact revision identity or another explicit non-hash revision marker;
- source-revision references on generated downstream documents;
- a deterministic freshness check;
- which downstream documents return to `Pending` or become non-current when an approved source changes;
- coordinated invalidation boundaries for planning bundles;
- repair and validation precedence after the latest implementation change;
- plain-language stale-source diagnostics.

Timestamps, filesystem order, target hashes, and hidden state must not be authority.

## Blocking Finding 4 — Work Card Candidate State Is Undefined

### Finding

WC08 permits candidate notes concerning split, merge, deferment, or refinement.

WC09 and WC14 require explicit candidate states including:

```text
deferred
superseded
already satisfied
carried forward
resolved
```

No card defines:

- the canonical candidate-state enum;
- required evidence for each state;
- whether the state lives inside `Work_Card_Plan` Markdown, JSON, or both;
- how dependencies reference candidate IDs;
- how the Operator changes a candidate state after the planning bundle is Approved;
- how a rejected Formal Work Card returns to Phase Planning;
- how a Work Card Plan revision affects existing Formal Work Cards and completion evidence.

### Consequence

Candidate selection, Phase Validation entry, and Project completeness can produce contradictory results. The Implementer would have to invent a planning-authority model prohibited by the project rules.

### Required correction

Amend WC08 and WC09 to define one explicit candidate contract, including at least:

```text
candidateId
order
title
purpose
dependsOn[]
resolutionStatus
resolutionReason
evidencePaths[]
```

Recommended candidate resolution values:

```text
planned
completed
deferred
superseded
alreadySatisfied
carriedForward
```

`completed` should remain derived from Work Card evidence rather than manually assigned.

Changes to candidate state after bundle approval must place both `Phase_Planning` and `Work_Card_Plan` back into a coherent review state and invoke the source-freshness rules.

## Blocking Finding 5 — Workspace Inventory, Stable IDs, Ordering, and Migration Are Incomplete

### Finding

WC01 correctly requires open-ended stable workspace IDs and deterministic order. Later cards do not consistently provide IDs or migration instructions.

Explicit stable IDs currently exist for only some workspaces. Several cards identify only a label and lifecycle location.

The following provisional WC01 workspaces also require explicit migration or replacement:

```text
Project Planning
Phase Planning
Work Card
Operator Validation
Phase Closeout
```

WC05 explicitly migrates Project Planning. Equivalent instructions are missing for:

- WC08 and provisional Phase Planning;
- WC10 and provisional Work Card;
- WC13 and provisional Operator Validation;
- WC14 and provisional Phase Closeout.

WC11 and WC12 both occupy Work Card / Building but do not define deterministic relative order.

WC09 claims both Phase / Building and Work Card / Intake, but its required workspace registration covers only the Phase / Building candidate-selection workspace. The sequence therefore has no explicit registry-backed Work Card / Intake workspace.

### Consequence

Implementation can create duplicate navigation entries, unstable ordering, missing Work Card Intake, or continued ownership by obsolete provisional labels.

### Required correction

Before release, define the complete production workspace inventory in one design table with:

```text
workspaceId
label
lifecycle level
lifecycle stage
order within location
replaces provisional workspace, when applicable
owning card
```

At minimum, define stable IDs for:

```text
project-intake-capture
architect-interview
project-planning-review
project-phase-map
phase-interview
phase-planning-bundle
phase-work-card-selection
work-card-intake
work-card-planning
work-card-building-review
work-card-repair
work-card-validation
work-card-close
phase-validation
project-validation
```

WC09 must either implement a separate `work-card-intake` workspace or explicitly redefine and obtain Operator approval for combining Work Card Intake with Phase Building. The current card claims both models simultaneously.

## Blocking Finding 6 — Phase Map Stores a Derived Completion Indicator

### Finding

WC06 requires the `Phase_Map` to contain whether Approved Phase Close evidence exists while also stating that phase completion is derived from current closeout documents.

Persisting that indicator duplicates derived state inside the Phase Map and can become stale after closeout revision.

### Required correction

The Phase Map should persist phase identity, order, purpose, and dependencies only.

Phase completion must be projected at read time from current `Phase_Closeout` evidence. The UI may display a computed completion indicator, but the indicator must not be persisted as independent authority in the Phase Map.

## Blocking Finding 7 — WC12 Requires a Post-Validation Path Before WC13 Exists

### Finding

WC12 implements both pre-validation and post-validation repair origins. WC13, which is implemented later, creates the production Validation Record workflow.

WC12 manual validation and acceptance language currently expects validation failures to create repair cards before the application has a production path that creates those Validation Records.

### Consequence

WC12 could be accepted using a synthetic production-path fixture that does not prove the real WC13 integration, recreating the test-fixture substitution risk that Phase 07 was intended to eliminate.

### Required correction

Retain the implementation order, but split acceptance evidence:

- WC12 must fully implement and manually validate the pre-validation repair path.
- WC12 may unit-test the post-validation trigger contract against controlled document fixtures.
- WC13 must perform the real end-to-end post-validation failure → repair → new validation attempt integration acceptance.

WC12 must not claim the production post-validation loop is proven before WC13.

## Blocking Finding 8 — No Protected Clean-Room Git Baseline

### Finding

The repository remains in the large dirty clean-room reset state:

```text
625 tracked modifications
88 untracked paths
139 deletions
```

The cards require Implementer Reports to identify exact changed files, but the current working tree does not provide a reliable baseline separating Phase 08 implementation changes from the protected Phase 07 reset and planning corpus changes.

### Consequence

A later Implementer could truthfully report changed files from its pass yet still be unable to prove whether unrelated baseline files were altered, restored, or deleted.

### Required correction

Before releasing WC01, the Operator should authorize one protected baseline action:

- create a reviewed baseline commit for the accepted Phase 07 clean-room source and completed Phase 08 planning corpus; or
- create an equivalent immutable repository snapshot and changed-path manifest that every Implementer pass can compare against.

A clean baseline commit is the simpler and more reliable option. This review does not authorize or perform that Git action.

## Non-Blocking Standardization Corrections

The following corrections should be made during the sequence repair pass:

1. Standardize the JSON dependency field as `dependsOn` for all cards. WC14 and WC15 currently use `dependencies`.
2. Add visible `Depends on` metadata to the Markdown headers for WC06–WC15 for parity with earlier cards.
3. Define canonical paths and disposition treatment for every generated Architect handoff, not only Project-level handoffs.
4. State that newly created closeout documents begin as `Pending`.
5. Clarify that “Architect report dispositions” in Phase and Project population views means the disposition on the corresponding Implementer Report, not a separate Architect Review artifact.
6. Clarify the rejected Formal Work Card return path: rejection returns to Phase Planning bundle revision rather than leaving an indefinite unresolved candidate with no visible correction action.
7. Clarify that Approved `DoNotClose` remains current at Validation because semantic close completion requires both Approved disposition and `Close` decision.
8. Require each workspace card to preserve the WC03 browser-security contract when reusing the embedded Architect component.

## Ordered Card Review

### WC01 — Foundation

Disposition: **Requires sequence amendment, not rejection of its local scope.**

The lifecycle vocabulary and extensible registry are sound. WC01 is intentionally too narrow to support the complete sequence by itself. Add the evidence-derived lifecycle resolver and source-freshness foundation immediately after it.

### WC02 — Project Intake Capture

Disposition: **Revision required.**

Add:

- greenfield workspace initialization when `planning/` does not yet exist;
- explicit Project Intake and generated-prompt disposition rules;
- canonical downstream interview output path in the generated prompt;
- source-revision behavior when intake changes after interview work begins.

### WC03 — Embedded Architect Browser and MCP Proof

Disposition: **Accepted as the correct high-risk gate.**

The stop conditions are appropriate. Mocked or simulated success is correctly prohibited. Its release remains dependent on the revised foundation and a protected repository baseline.

### WC04 — Architect Interview Workspace

Disposition: **Revision required.**

The dual-pane workspace and disposition loop are sound. Add source-freshness handling when WC02 inputs change and require the updated WC02 prompt contract to name the canonical interview output pair.

### WC05 — Project Planning Workspace

Disposition: **Revision required.**

The synchronized two-document disposition model is sound. Add explicit non-review handoff treatment and downstream invalidation when the interview or project-planning sources change.

### WC06 — Phase Map Workspace

Disposition: **Revision required.**

Remove persisted Phase Close completion state from the Phase Map. Define a stable workspace ID and canonical Phase Map handoff path/status.

### WC07 — Phase Interview Workspace

Disposition: **Revision required.**

Define stable workspace ID, handoff path/status, and source-freshness behavior. The no-questions path is otherwise correct.

### WC08 — Phase Planning Bundle

Disposition: **Revision required.**

Define the candidate schema and resolution states, migrate the provisional Phase Planning workspace, define stable workspace ID, and add handoff path/status and revision invalidation rules.

### WC09 — Candidate Selection and Work Card Intake

Disposition: **Blocking revision required.**

Remove the Pending handoff deadlock, define the canonical handoff pair, and implement a registry-backed Work Card / Intake workspace or obtain explicit approval to combine it with Phase Building.

### WC10 — Formal Work Card Planning

Disposition: **Revision required.**

Migrate the provisional Work Card workspace, define stable workspace ID, and define the rejected-card return path to Phase Planning. Add source-freshness rules preventing an amended Work Card from retaining stale report or validation approval.

### WC11 — Implementer Handoff and Report Review

Disposition: **Locally accepted, conditional on shared foundation corrections.**

The Work Card-as-handoff boundary and report disposition model are correct. Define stable workspace ID and order relative to the repair workspace.

### WC12 — Repair Subsystem

Disposition: **Revision required.**

The sibling-repair model is accepted. Amend acceptance so WC12 proves pre-validation repairs in production and defers full post-validation integration acceptance to WC13.

### WC13 — Work Card Validation and Close

Disposition: **Locally accepted with migration amendment.**

The validation-attempt and close-evidence model is correct. Migrate the provisional Operator Validation workspace, define stable Validation and Close IDs, and perform the real post-validation repair-loop acceptance omitted from WC12.

### WC14 — Phase Validation and Close

Disposition: **Revision required.**

The one-closeout decision model is correct. Migrate the provisional Phase Closeout workspace, define semantic close resolution through the shared lifecycle resolver, and clarify that completion indicators are computed from current documents.

### WC15 — Project Validation and Close

Disposition: **Locally accepted, conditional on shared resolver and freshness corrections.**

The governed-corpus review and terminal close rules are sound. Standardize dependency metadata and require the shared resolver to distinguish terminal Approved Close from Approved DoNotClose.

## Required Sequence Repair Plan

The recommended repair pass is:

```text
1. Establish protected repository baseline.
2. Add foundation card: Evidence-Derived Lifecycle Projection and Workspace Resolution.
3. Add foundation card or shared contract: Source Revision and Downstream Invalidation.
4. Publish complete stable workspace inventory and migration table.
5. Publish canonical generated-handoff path and disposition contract.
6. Amend WC02, WC04–WC10, and WC14 for the shared contracts.
7. Amend WC08/WC09 candidate schema and plan-revision behavior.
8. Amend WC12/WC13 acceptance split for post-validation repairs.
9. Standardize all Markdown/JSON dependency metadata.
10. Re-run ordered review before WC01 release.
```

These are planning corrections. They should be incorporated directly into the approved Phase 08 design corpus before implementation. They are not evidence that the core lifecycle model failed.

## Release Readiness Criteria

WC01 may be released only after:

1. the repository has a protected implementation baseline;
2. the evidence-derived lifecycle/workspace resolver is represented in the ordered card sequence;
3. non-review handoff artifacts cannot block progression;
4. source freshness and downstream invalidation are defined;
5. the complete stable workspace inventory and migrations are explicit;
6. Work Card candidate states and revision behavior are defined;
7. the Phase Map contains no persisted duplicate completion authority;
8. WC12/WC13 acceptance boundaries are corrected;
9. all card dependencies and JSON fields are standardized;
10. a second ordered Architect review finds no remaining blocking gap;
11. the Operator explicitly releases WC01.

## Final Architect Decision

```text
Architecture direction: Accepted
Ordered implementation sequence: Revision required
Implementer release: Not authorized
WC01 release readiness: Failed pending corrections
```

No Work Card should be provided to the Implementer from the current sequence.

## Document Disposition

Document.Status=RevisionRequested
