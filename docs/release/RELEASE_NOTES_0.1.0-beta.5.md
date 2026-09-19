# ChampCity A/I Desktop 0.1.0-beta.5

Test-governance and source-proxy remediation update for the ChampCity A/I Desktop public beta.

## Changes since 0.1.0-beta.4

- Retired obsolete lexical governance gates that were constraining tests through source-text assertions rather than product behavior.
- Replaced backend source-proxy tests with behavior-oriented coverage.
- Replaced Desktop wiring source-proxy tests with behavior-oriented coverage.
- Replaced renderer source-proxy tests with behavior-oriented coverage.
- Closed the test-governance repair by removing remaining obsolete proxy expectations.
- Completed source-proxy test remediation across the accepted V1 baseline.

This release is a maintenance release. The beta.4 product capabilities remain the functional baseline; the beta.5 delta is intended to improve test fidelity and governance rather than introduce new user-facing features.

## Compatibility

- Windows x64 desktop product.
- Development baseline remains Node.js 24.x and npm 11.x as declared by the repository.
- Existing Desktop workflow artifacts and canonical planning formats remain compatible; this release does not introduce a repository schema migration.
- Existing OAuth clients and MCP integrations remain compatible with the beta.4 baseline.
- ChampCity A/I Server and the broader V2 architecture remain future development and are not part of this Desktop maintenance release.

## Installation and update notes

Use `ChampCityAI-Setup-0.1.0-beta.5.exe` from the matching GitHub Release. Close running ChampCity windows before updating. The installer supports Current User and Everyone installation modes and allows destination selection.

The installer remains unsigned. Windows may display Unknown Publisher or Microsoft Defender SmartScreen warnings. Verify the published SHA-256 before running the installer.

Existing per-user ChampCity configuration and OAuth state are preserved by the installer; uninstall does not delete application data by default.

## Known limitations

- The Windows installer is not code signed in this release.
- This remains a beta release; workflow and integration contracts may evolve during subsequent development.
- GitHub MCP release-create/update/delete/asset-upload capabilities are not currently used for publication; those writes remain on the bounded GitHub CLI compatibility adapter.
- The managed GitHub MCP provider currently targets the official Windows runtime and requires interactive provider OAuth when connecting after Desktop restart.
- Server-backed deployment and the V2 structured-state architecture are not included in this release.

## Verification

The GitHub Release must identify the exact `v0.1.0-beta.5` source tag and release commit used to build the installer. The published `ChampCityAI-Setup-0.1.0-beta.5.exe` must match the locally built canonical installer SHA-256 exactly.
