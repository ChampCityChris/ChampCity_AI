# ChampCity A/I Desktop

ChampCity A/I Desktop is a Windows workstation application for planning, implementing, reviewing, and validating governed software work in user-selected projects. It gives an Operator one local workspace for the Architect and Implementer roles, durable Markdown workflow records, evidence-backed validation and repair loops, and controlled Codex and MCP execution.

This repository is the source for **ChampCity A/I Desktop**, the standalone product whose application services, Background Agent, workflow state, registered projects, and local credentials remain on the user's workstation. **ChampCity A/I Server** is a future server-backed deployment model, not a replacement name for Desktop. See [Product Line: Desktop and Server](docs/product/PRODUCT_LINE_DESKTOP_AND_SERVER.md).

## What is included

- Project entry, Project Intake, Architect Interview, Project Planning, Phase Map, phase execution, validation, and closeout.
- Work Card planning, Codex-assisted implementation, evidence review, Operator validation, Repair, and Close / Next loops.
- A separate Issue Resolution workflow with Issue intake, screenshot evidence, Architect and Issue planning, Fix Cards, aggregate validation, and Issue Close.
- An embedded ChatGPT Architect browser with explicit handoff controls and MCP-created draft review.
- A managed Codex runtime with model and reasoning selection for Implementer execution.
- A workstation-resident Background Agent, tray controls, loopback MCP runtime, OAuth support, registered-project authority, and operational diagnostics.
- Interactive Windows x64 installation for the current user or everyone on the machine.

Package metadata identifies the application as `0.1.0-beta.2`, the current public beta. The Desktop product boundary is established; a public binary is authoritative only when it is built, validated, tagged, and published through the documented release process.

## Install a release

Download `ChampCityAI-Setup-<version>.exe` and its SHA-256 value from the matching GitHub Release. Verify the hash, close any running ChampCity windows when updating, and run the installer. The installer supports **Current User** and elevated **Everyone** installation, lets you choose a destination, and asks whether the Background Agent should start at Windows sign-in.

The current installer is not configured with a code-signing identity, so Windows may show an Unknown Publisher or Microsoft Defender SmartScreen warning. Proceed only when the installer came from the expected release and its SHA-256 matches. Full installation and removal behavior is in the [Installation and Uninstall Guide](docs/user/INSTALLATION_AND_UNINSTALL.md).

## Develop from source

Prerequisites are a Windows x64 development environment with Git, Node.js 24.x, and npm 11.x. The preferred package-manager version is declared in `package.json`.

```powershell
npm ci
npm start
```

Run bounded developer validation from the repository root:

```powershell
npm test -- --preview
npm test
```

See the [Development Guide](docs/development/DEVELOPMENT_GUIDE.md) and [Validation Command Lanes](docs/dev/VALIDATION_COMMAND_LANES.md) before running child-process-heavy validation or packaging commands.

## Architecture at a glance

The local Electron main process owns project selection, repository writes, workflow services, the embedded Architect browser, and Codex orchestration. A constrained preload bridge exposes typed operations to the React renderer; the renderer has no unrestricted Node.js or filesystem access. A detached Background Agent Service Host owns the tray, supervises a utility worker, and keeps the local MCP runtime available independently of the foreground window.

See the [Desktop Architecture](docs/architecture/DESKTOP_ARCHITECTURE.md) for process, storage, and trust boundaries.

## License

ChampCity A/I is **source-available software, not open-source software**. This beta is available under the [PolyForm Shield License 1.0.0](LICENSE). The license permits use, modification, and redistribution for permitted purposes while limiting competitive use as defined by the official PolyForm Shield terms.

The license granted for a particular release remains the license for that release. Future ChampCity A/I releases may be offered under different terms, including paid commercial licensing. Third-party dependencies remain subject to their own license terms.

Issues, bug reports, and feature suggestions are welcome. Code pull requests are not currently accepted so that copyright and future relicensing authority remain unambiguous during the beta period.

## Support development

ChampCity A/I Beta is currently free. If it is useful to you and you would like to support continued development, you can [support ChampCityChris on Ko-fi](https://ko-fi.com/ChampCityChris).

Ko-fi support is voluntary. A donation is not a software purchase and does not create a commercial license, warranty, support contract, entitlement to future releases, or other additional rights.

## Documentation

- [Desktop Overview](docs/product/DESKTOP_OVERVIEW.md)
- [Feature Reference](docs/product/FEATURES.md)
- [User Manual](docs/user/USER_MANUAL.md)
- [Installation and Uninstall](docs/user/INSTALLATION_AND_UNINSTALL.md)
- [Background Agent and MCP](docs/user/BACKGROUND_AGENT_AND_MCP.md)
- [Troubleshooting](docs/user/TROUBLESHOOTING.md)
- [Desktop Architecture](docs/architecture/DESKTOP_ARCHITECTURE.md)
- [Development Guide](docs/development/DEVELOPMENT_GUIDE.md)
- [Release Process](docs/release/RELEASE_PROCESS.md)
- [Repository Code, Test, and Migration Boundary](docs/architecture/REPOSITORY_CODE_TEST_AND_MIGRATION_BOUNDARY.md)
- [Work Card and Repair Card Creation Standard](docs/governance/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md)

## Repository layout

```text
assets/       production branding sources
docs/         current product, user, architecture, governance, and release guidance
packaging/    Windows installer source
scripts/      repeatable build and release helpers
src/          production source
test/         current capability and production-path tests

```

Local development history may be retained under an ignored `archive/` directory, but it is not part of the published source baseline. ChampCity workflow directories such as `planning/` and `issues/` belong to user-selected project repositories, not to this source repository's public development history.

Contributors and coding agents must follow [AGENTS.md](AGENTS.md) and the active Operator-approved Work Card or Repair Card when governed work is in progress.
