# Project Profile

## Project Name

ChampCity A/I

## Product Thesis

Operators can usually describe what they want, what broke, or what evidence matters, but they often need help turning that into bounded work an AI Implementer can execute safely. ChampCity A/I acts as the translation layer: the Operator supplies intent and evidence, the Architect frames the work, and the app preserves durable planning artifacts.

## User Type

An Operator using Architect and Implementer assistance.

## Core Loop

Capture -> Frame -> Plan -> Build -> Prove

## Source of Truth

Repository files and planning artifacts are the durable source of truth.

## Roles

- Operator: owns priority, approval, credentials, business judgment, manual validation, and final acceptance.
- Architect: ChatGPT or another planning surface that frames work before implementation.
- Implementer: Codex, Claude Code, Cursor, or another coding/build agent that executes bounded Work Cards.

## Approved Technical Shape

- Target surface: Electron desktop app.
- Language: TypeScript.
- Package manager: npm.
- Frontend direction: React for post-foundation UI work.
- Persistence: file-backed Markdown and JSON planning artifacts.
- Current stage: Alpha app development.
