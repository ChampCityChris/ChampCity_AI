# ChampCity A/I Desktop 0.1.0-beta.2

Project Planning hotfix release for the ChampCity A/I Desktop public beta.

## Changes since 0.1.0-beta.1

- Restored the Project Planning revision loop so a synchronized `RevisionRequested` Project Profile and Project Roadmap immediately expose the next deliberate action.
- Added explicit `Prepare Revision Request`, `Revision Request Ready`, and `Copy Revision Request` presentation while preserving the manual embedded-ChatGPT send boundary.
- Kept Copy disabled until a fresh, current revision submission has been prepared; failed revision preparation retains truthful state and an explicit retry path.
- Preserved atomic Project Profile and Project Roadmap review and promotion, including revision increments, return to `Pending`, and clearing prior review notes after revised outputs are promoted.
- Removed default MVP assumptions from Project Planning prompts. MVP framing is now used only when approved project evidence establishes it.
- Clarified that the required `MVP Scope` and `Post-MVP Roadmap` headings are legacy structural labels when the project is a refactor, migration, platform transition, feature expansion, or capability extraction.
- Preserved current implemented behavior as the functional baseline for existing systems unless approved evidence explicitly changes or deprecates it.

## Compatibility

- Windows x64 desktop product.
- Development baseline: Node.js 24.x and npm 11.x as declared by the repository.
- This release preserves the existing canonical Project Planning document formats and does not add a migration.
- ChampCity A/I Server is future work and is not part of this release.

## Installation and update notes

Use `ChampCityAI-Setup-0.1.0-beta.2.exe` from the matching GitHub Release. Close running ChampCity windows before updating. The installer supports Current User and Everyone installation modes and allows destination selection.

The installer is currently unsigned. Windows may display Unknown Publisher or Microsoft Defender SmartScreen warnings. Verify the published SHA-256 before running the installer.

## Data and project behavior

ChampCity Desktop operates on user-selected repositories. Application services, Background Agent state, registered projects, and local credentials remain workstation-resident. Repository workflow records remain inside the selected project repository according to the active workflow.

This hotfix does not add a schema migration, revision-specific clipboard API, automatic message submission, or new persistence format.

## Known limitations

- The Windows installer is not code signed in this release.
- This remains a beta release; compatibility and workflow contracts may evolve in later major development.
- Server-backed deployment and the V2 structured-state architecture are not included in this release.

## Verification

The GitHub Release must identify the exact source tag and commit used to build the installer and publish the SHA-256 of `ChampCityAI-Setup-0.1.0-beta.2.exe`. Do not use an installer whose hash or source identity does not match the release record.
