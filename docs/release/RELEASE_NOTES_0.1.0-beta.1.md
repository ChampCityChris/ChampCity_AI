# ChampCity A/I Desktop 0.1.0-beta.1

First public beta baseline for ChampCity A/I Desktop.

## Included in this baseline

- Governed software-development workflow from Project Intake through Project Planning, Phase Map, phase execution, Work Cards, validation, repair, and closeout.
- Separate Issue Resolution workflow with screenshot evidence, Architect planning, Fix Cards, aggregate validation, and Issue Close.
- Embedded ChatGPT Architect workflow with explicit handoffs and MCP-created drafts.
- Managed Codex Implementer runtime with model and reasoning selection.
- Work Card and Repair Card lifecycle with evidence-backed review, validation, and deterministic progression.
- Outcome-first project roadmapping, preservation of established architecture, and dependency-aware phase selection.
- Workstation-resident Background Agent with tray controls, loopback MCP runtime, registered-project containment, OAuth support, and operational diagnostics.
- Windows x64 installer supporting Current User or Everyone installation scope, selectable destination, and optional Background Agent startup at Windows sign-in.
- Current product, user, development, governance, architecture, and release documentation.

## Compatibility

- Windows x64 desktop product.
- Development baseline: Node.js 24.x and npm 11.x as declared by the repository.
- ChampCity A/I Server is future work and is not part of this release.

## Installation and update notes

Use `ChampCityAI-Setup-0.1.0-beta.1.exe` from the matching GitHub Release. Close running ChampCity windows before updating. The installer supports Current User and Everyone installation modes and allows destination selection.

The installer is currently unsigned. Windows may display Unknown Publisher or Microsoft Defender SmartScreen warnings. Verify the published SHA-256 before running the installer.

## Data and project behavior

ChampCity Desktop operates on user-selected repositories. Application services, Background Agent state, registered projects, and local credentials remain workstation-resident. Repository workflow records remain inside the selected project repository according to the active workflow.

This source baseline intentionally excludes the ChampCity source repository's historical local planning, Issue, Repair, archive, editor, generated-build, and release-output state.

## Known limitations

- The Windows installer is not code signed in this release.
- This is a beta baseline; compatibility and workflow contracts may evolve in later major development.
- Server-backed deployment and the V2 structured-state architecture are not included in this release.

## Verification

The GitHub Release must identify the exact source tag and commit used to build the installer and publish the SHA-256 of `ChampCityAI-Setup-0.1.0-beta.1.exe`. Do not use an installer whose hash or source identity does not match the release record.
