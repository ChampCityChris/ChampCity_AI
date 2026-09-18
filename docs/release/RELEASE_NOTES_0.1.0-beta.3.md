# ChampCity A/I Desktop 0.1.0-beta.3

Planning-contract, Git MCP, and release-tooling hotfix release for the ChampCity A/I Desktop public beta.

## Changes since 0.1.0-beta.2

- Tightened the Project Architect Interview and Project Planning contracts so approved, governing, adopted, canonical, or otherwise Operator-established architecture is preserved unless the Operator explicitly revises it.
- Preserved development-capability evidence through the Interview and Project Planning stages, including verified installed, verified missing, and unverified capabilities, repository-native bootstrap mechanisms, and explicitly external capabilities.
- Added bounded Git MCP mechanics for branch-state inspection, history and ancestry inspection, remote fetch, existing-branch switching, fast-forward updates, bounded merges, tag creation and verification, tag publication, and bounded branch deletion.
- Expanded the bounded `release_toolbox` with package-version updates, deterministic release-candidate validation, Windows packaging, canonical installer inspection and SHA-256 calculation, GitHub Release publication, and published-asset hash verification.
- Repaired Windows release-command execution so npm-backed release operations use a verified standalone `node.exe` plus npm CLI pair instead of the hosting ChampCity/Electron executable.
- Preserved the MCP execution boundary: Git and release mechanics enforce deterministic repository, command, source-identity, artifact, and publication invariants without adding workflow-level decision gates.

## Compatibility

- Windows x64 desktop product.
- Development baseline remains Node.js 24.x and npm 11.x as declared by the repository.
- Existing Desktop workflow artifacts and canonical planning formats remain compatible; this release does not introduce a repository schema migration.
- ChampCity A/I Server and the broader V2 architecture remain future development and are not part of this Desktop hotfix release.

## Installation and update notes

Use `ChampCityAI-Setup-0.1.0-beta.3.exe` from the matching GitHub Release. Close running ChampCity windows before updating. The installer supports Current User and Everyone installation modes and allows destination selection.

The installer remains unsigned. Windows may display Unknown Publisher or Microsoft Defender SmartScreen warnings. Verify the published SHA-256 before running the installer.

## Known limitations

- The Windows installer is not code signed in this release.
- This remains a beta release; workflow and integration contracts may evolve during subsequent development.
- Server-backed deployment and the V2 structured-state architecture are not included in this release.

## Verification

The GitHub Release must identify the exact `v0.1.0-beta.3` source tag and release commit used to build the installer. The published `ChampCityAI-Setup-0.1.0-beta.3.exe` must match the locally built canonical installer SHA-256 exactly.
