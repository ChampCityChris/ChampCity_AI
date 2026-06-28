# ChampCity_AI Work Card MVP

ChampCity_AI Work Card MVP helps a non-technical operator turn a bug, feature, setup task, or phase goal into a structured Work Card, generate a bounded Builder prompt, capture the Builder result, guide human validation, and either close or repair the Work Card.

Current stage: foundation scaffold.

Approved stack:

- Electron desktop app.
- TypeScript.
- npm.
- File-backed Markdown planning artifacts.

The core loop is `Capture -> Frame -> Plan -> Build -> Prove`.

Markdown planning artifacts are the source of truth. Work Cards will be stored at `planning/work/[slug]/WORK_CARD.md`, with evidence under `planning/work/[slug]/evidence/`.

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

The initial `test` script is typecheck-only. Unit tests are planned for schema, Markdown serialization, prompt composition, and risk routing.

## LLM Workflow

The MVP uses manual copy/paste for Architect framing and Builder prompt workflows. Provider-neutral LLM hooks are scaffolded for future API integration, but they are inactive in the foundation scaffold.

No live LLM API calls, provider-specific SDKs, API keys, databases, authentication, cloud services, or deployment automation are part of this foundation pass.
