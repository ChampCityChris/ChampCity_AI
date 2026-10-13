# WSF — Workspace Shell Foundation Recovery Bundle

**Objective:** recreate the working Greenfield UI/workflow as 18 reusable workspace shells plus one nested lifecycle navigation rail, then wire Greenfield exclusively through those shells while retaining the current SQL/domain backend.

**Behavioral source baseline:** `965536de265a4d494503f2173daddc5e81982a88`  
**Current starting head:** `0e9c0620e12eb35358edb6a85b11270ed3825849`

## Why this bundle exists

RWS converted persistence and workflow authority toward SQL but incorrectly classified substantial Operator-facing UI/workflow behavior as legacy. RWS06J-C deleted stage-specific workspace components and tests, and later cards collapsed Greenfield onto new generic renderer surfaces.

This bundle does not roll back SQL. It restores the workspace building-block architecture the Operator originally requested.

## Governing decisions

- SQL/domain state remains authoritative.
- Greenfield working UI behavior is recovered from Git source history.
- Shells are presentation containers; adapters connect them to current SQL services.
- 18 workspaces + one nested rail are separate building blocks.
- Greenfield is the only workflow authorized to use the recovered shell set in this bundle.
- Feature, Issue, Migration, Integration, Infrastructure, Research, and WIR renderer rebuilds are explicitly out of scope.
- No legacy cleanup/deletion occurs during this bundle.
- No generic “one shell replaces five stages” substitution is permitted.
- Operator visual/experiential audit is required after Greenfield composition is complete.

## Required reference documents

- `WSF00_GREENFIELD_WORKSPACE_SHELL_RECOVERY_AUDIT_MATRIX.md`
- `WORKSPACE_SHELL_EXTRACTION_CONTRACT.md`
- `WSF_REMAINING_BOUNDARY_AUDIT_WSF16_WSF20.md`

## Card sequence

| Card | Deliverable |
|---|---|
| WSF01 | Nested Lifecycle Rail shell |
| WSF02 | Project Intake shell |
| WSF03 | Architect Interview shell |
| WSF03A | Reusable typed Architect/Planning candidate ingress through `workflow_toolbox` |
| WSF04 | Project Planning Review shell |
| WSF05 | Project Phase Map shell |
| WSF05A | Structured Project/Phase Closeout review-cycle foundation |
| WSF06 | Project Validation shell |
| WSF07 | Project Close shell |
| WSF08 | Phase Interview shell |
| WSF09 | Phase Planning shell |
| WSF10 | Work Card Map shell |
| WSF11 | Phase Validation shell |
| WSF12 | Phase Close shell |
| WSF13 | Work Card Intake shell |
| WSF14 | Work Card Planning shell |
| WSF14A | Durable SQL ImplementationAttempt / Implementer Report foundation |
| WSF15 | Implement shell |
| WSF15A | Structured WorkItem validation / report-review foundation |
| WSF16 | Review & Validation shell |
| WSF16A | Structured Repair workspace application adapter |
| WSF17 | Work Card Repair shell |
| WSF18 | Work Card Validation shell |
| WSF19 | Work Card Close shell |
| WSF19A | Full SQL Greenfield nested lifecycle resolver |
| WSF20 | Compose Greenfield entirely from the accepted shell set |

## Execution rule

Numbered WSF01–WSF19 cards are shell extraction/recovery work. Letter-suffixed foundation cards exist only where source review established a missing application/domain boundary that the shell must consume.

Authorized foundations:
- WSF03A: typed Architect/model candidate ingress;
- WSF05A: Project/Phase Closeout review cycle;
- WSF14A: durable ImplementationAttempt / Implementer Report identity;
- WSF15A: WorkItem validation/report-review cycle and manual Repair provenance;
- WSF16A: exact structured Repair application adapter;
- WSF19A: full SQL-derived Greenfield nested lifecycle resolver.

Foundation cards must not redesign shell presentation. WSF20 is the only card that composes the complete recovered shell set into Greenfield.

## Checkpoint rule

One checkpoint commit per card. No bundles.

## Stop conditions

Stop and return to Architect if:

- pre-RWS behavior cannot be recovered from source/history;
- a shell requires changing SQL/domain semantics to render;
- a card proposes deleting a legacy source before Operator Greenfield acceptance;
- a shell starts acquiring workflow-specific persistence/business logic;
- a proposed abstraction merges two distinct workspace shells before parity is established.

## Bundle acceptance

The bundle is not accepted by automated tests alone.

It reaches Operator audit when:

1. all 19 building blocks are present;
2. Greenfield is composed entirely from them;
3. current SQL-backed authority is retained;
4. Project → Phase → Work Card nested loops are navigable;
5. stage-specific controls/geometry match the recovered Greenfield behavior;
6. no RWS generic replacement surface is required for Greenfield;
7. focused automated characterization passes;
8. the Operator can run and visually inspect Greenfield from Intake through Close.

Do not begin rebuilding other workflow families until the Operator accepts this shell foundation.
