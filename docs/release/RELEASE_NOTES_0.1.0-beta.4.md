# ChampCity A/I Desktop 0.1.0-beta.4

Release-tooling, MCP capability, external-provider, visual-review, and OAuth compatibility update for the ChampCity A/I Desktop public beta.

## Changes since 0.1.0-beta.2

- Tightened Project Architect Interview and Project Planning contracts so Operator-established architecture, adopted capability evidence, and canonical planning decisions are preserved unless explicitly revised.
- Expanded bounded Git MCP mechanics for branch/history inspection, fetch, switching, fast-forward updates, merges, tag lifecycle, push, bounded deletion, and integration-to-dev operations.
- Expanded release tooling with deterministic candidate validation, Windows packaging, canonical artifact inspection, resumable GitHub Release publication, exact draft-release abandonment, tag cleanup support, and published-asset SHA-256 verification.
- Added bounded repository file copy and move operations with repository containment, source/destination identity checks, partial-failure cleanup, and no arbitrary filesystem escape.
- Added the read-only `visual_asset_toolbox` for repository PNG/JPEG/WebP inspection, direct visual reads, ordered comparison, and bounded server-side preview/crop generation.
- Raised direct visual review transport to 24 MB per image and added local preview processing for larger sources, with 128 MB local source bounds and 12 MB MCP preview output bounds.
- Added a stable 35-toolbox public MCP namespace so future capabilities can normally be added as actions without recreating the ChatGPT plugin.
- Corrected public OAuth discovery routes for path-bearing MCP deployments and preserved origin-root OAuth registration/authorization/token endpoints.
- Added an outbound External MCP Provider Gateway supporting bounded stdio and Streamable HTTP provider sessions, normalized capability discovery, typed failures, lifecycle cleanup, and secret-safe receipts.
- Migrated the WinGet MCP path onto the shared external-provider gateway while preserving existing package-resolution fallback behavior.
- Integrated GitHub's official MCP Server as the managed `github` external provider for authenticated repository, Issue, Pull Request, Actions, release-read, and tag-read capability evidence. Local Git operations remain owned by ChampCity, and release-write operations remain on the bounded GitHub CLI compatibility path until official provider parity exists.
- Added OAuth `offline_access` authorization metadata and scope handling while preserving existing refresh-token rotation, token lifetimes, and the strict `files.read` / `files.write` MCP permission boundary.
- Updated the Electron/Windows packaging path so the visual preview backend and its native Sharp/libvips runtime are included in packaged builds.

## Compatibility

- Windows x64 desktop product.
- Development baseline remains Node.js 24.x and npm 11.x as declared by the repository.
- Existing Desktop workflow artifacts and canonical planning formats remain compatible; this release does not introduce a repository schema migration.
- Existing OAuth clients without `offline_access` remain compatible and continue to receive working refresh tokens.
- Existing ChatGPT MCP clients continue to use the same top-level toolbox namespace; the public namespace contains 35 top-level tools.
- ChampCity A/I Server and the broader V2 architecture remain future development and are not part of this Desktop hotfix release.

## Installation and update notes

Use `ChampCityAI-Setup-0.1.0-beta.4.exe` from the matching GitHub Release. Close running ChampCity windows before updating. The installer supports Current User and Everyone installation modes and allows destination selection.

The installer remains unsigned. Windows may display Unknown Publisher or Microsoft Defender SmartScreen warnings. Verify the published SHA-256 before running the installer.

Existing per-user ChampCity configuration and OAuth state are preserved by the installer; uninstall does not delete application data by default.

## Known limitations

- The Windows installer is not code signed in this release.
- This remains a beta release; workflow and integration contracts may evolve during subsequent development.
- GitHub MCP release-create/update/delete/asset-upload capabilities are not currently used for publication; those writes remain on the bounded GitHub CLI compatibility adapter.
- The managed GitHub MCP provider currently targets the official Windows runtime and requires interactive provider OAuth when connecting after Desktop restart.
- Server-backed deployment and the V2 structured-state architecture are not included in this release.

## Verification

The GitHub Release must identify the exact `v0.1.0-beta.4` source tag and release commit used to build the installer. The published `ChampCityAI-Setup-0.1.0-beta.4.exe` must match the locally built canonical installer SHA-256 exactly.
