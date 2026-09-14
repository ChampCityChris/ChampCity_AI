# ChampCity A/I Desktop Overview

## What Desktop is

**ChampCity A/I Desktop** is a Windows workstation application for governing software work in a user-selected project directory. It combines project and phase planning, Work Card and Issue lifecycles, repository-backed evidence, an embedded Architect workspace, Codex-assisted implementation, and Operator-controlled validation.

The application is local-first: ChampCity's workflow services, project state, registered MCP projects, local settings, OAuth material, Codex runtime state, Background Agent, and MCP runtime live on the user's workstation. The embedded ChatGPT site and Codex may use remote services, but ChampCity's control plane does not require a ChampCity server.

## Roles

- **Operator** — the human authority who selects the project, supplies intent and evidence, reviews artifacts, decides dispositions, validates outcomes, and approves closeout.
- **Architect** — the planning and review role used through the embedded ChatGPT surface. The Architect prepares evidence-derived plans, Work Cards, Repair Cards, and advisory reviews. ChampCity controls which repository context and draft destinations are exposed.
- **Implementer** — the coding/build role executed through the managed Codex App Server integration. The Implementer receives an approved bounded contract, works in the selected project under the configured policy, and produces an Implementer Report for review.

The Architect and Implementer advise and execute; neither replaces the Operator's acceptance authority.

## The working lifecycle

ChampCity applies a **Capture → Frame → Plan → Build → Prove** pattern across its two current workflows:

```text
Capture  -> select a project, record intake, or create an Issue with evidence
Frame    -> conduct Architect investigation/interview and establish the problem boundary
Plan     -> approve project, phase, Work Card, Issue, or Fix Card plans
Build    -> run the Implementer against the exact approved card
Prove    -> review evidence, validate or request repair, then close and continue
```

Development expands that pattern into Project Intake, Architect Interview, Project Planning, Phase Map, phase planning, Work Cards, validation, and closeout. Issue Resolution expands it into Issue Intake, Architect Planning, Issue Planning, Fix Cards, Issue Validation, and Issue Close.

## Workstation services

The visible ChampCity window is an Electron foreground process. It owns project selection, workflow orchestration, repository writes, the embedded Architect browser, and Codex execution presentation.

A separate **Background Agent** can remain available after the window closes. Its Service Host owns the Windows tray and supervises a utility worker. The worker owns the MCP HTTP runtime, registered-project routing, OAuth state, and repository tools. Starting or stopping the MCP Runtime is therefore different from starting or exiting the Background Agent.

The Background Agent can start at Windows sign-in. Current-user installations use the user's login registration. Everyone installations use an installer-managed machine trigger while retaining separate preferences and state for each Windows user.

## MCP in ChampCity

MCP gives an authorized client bounded tools for registered project workspaces. A project is routed by its exact registered `workspaceId`; selecting a project in the Desktop UI does not silently grant all MCP requests access to it. Registration, availability, endpoints, exposed tools, authorization counts, and recent activity are visible in **Settings → Agent Harness**.

The default HTTP host is loopback-only, the default port is selected automatically, and the default authentication mode is **OAuth required**. Local unauthenticated mode is available only while no public base URL is configured.

## Codex integration

ChampCity manages a verified Codex runtime in per-user application state, obtains the runtime's model catalog, and requires an explicit **Model** and **Reasoning** selection before implementation. Execution uses Codex App Server over a local stdio boundary. Runtime update or catalog failures surface as unavailable or degraded states instead of silently selecting a different model.

## Desktop and Server

**ChampCity A/I Desktop** remains independently installable and usable without a ChampCity server. **ChampCity A/I Server** is the working name for a future server-backed deployment model that may supply durable services or portable execution environments. Server is not implemented by this Desktop repository baseline and must not be inferred from Desktop features. See [Product Line: Desktop and Server](PRODUCT_LINE_DESKTOP_AND_SERVER.md).

## Platform and non-goals

- Current distribution and installer support target Windows x64.
- The Desktop product does not provide shared server-owned project state or a multi-user ChampCity control plane.
- Windows users on the same machine do not share ChampCity application data, OAuth material, registered projects, or preferences.
- The renderer does not have general filesystem access; selected-project operations pass through constrained preload and main-process services.
- Archived development experiments and future Server designs are not current Desktop behavior.

Continue with the [Feature Reference](FEATURES.md), [User Manual](../user/USER_MANUAL.md), or [Desktop Architecture](../architecture/DESKTOP_ARCHITECTURE.md).
