# ChampCity A/I

ChampCity A/I guides a non-technical Operator through the governed `Capture -> Frame -> Plan -> Build -> Prove` lifecycle: project and phase planning, Work Card creation, Implementer handoff, implementation reporting, Architect Review, Operator validation, repair, closeout, roadmap update, and next-phase activation.

Current stage: Alpha workflow-router stabilization.

Approved stack:

- Electron desktop app.
- TypeScript.
- npm.
- File-backed synchronized Markdown/JSON planning artifacts.

## Artifact And Workflow Authority

Markdown and JSON are synchronized representations of one logical artifact revision generated from the same typed domain object. Markdown is the human-readable review and handoff representation; JSON is the machine-readable runtime representation. Both carry the same artifact identity, schema version, revision, status, relationships, timestamps, and payload hash. A mismatch blocks workflow advancement; the runtime never guesses which representation wins.

The canonical artifact registry identifies exactly one authoritative revision for each active artifact. The workflow-state index and routed-action contract, rather than directory order, suffixes, timestamps, or reference navigation, control the current action and its exact source and expected-output artifacts.

Implementer Reports use `planning/phases/<phase-folder>/Implementer_Reports/IMPLEMENTER_REPORT_*.{md,json}`. Ordinary revisions retain the same filenames and artifact ID, increment the revision, and use Git history for prior content.

## Setup

```powershell
npm install
```

## Run

```powershell
npm start
```

## Build

```powershell
npm run build
```

## Typecheck

```powershell
npm run typecheck
```

## Test

```powershell
npm test
```

The test lane includes deterministic artifact-pair, registry, workflow, migration, routed-action, WC08 regression, and context-packet checks. Child-process-heavy validation must use the wrappers in `docs/dev/VALIDATION_COMMAND_LANES.md`.

## LLM Workflow

The Alpha uses bounded manual copy/paste Architect Context Packets and Implementer Execution Packets. Packets include an inclusion/exclusion manifest, deterministic token estimate, largest contributors, configurable budget, and explicit Operator acknowledgment before any over-budget export.

No live LLM API calls, provider-specific SDKs, API keys, databases, authentication, cloud services, or deployment automation are part of this foundation pass.
