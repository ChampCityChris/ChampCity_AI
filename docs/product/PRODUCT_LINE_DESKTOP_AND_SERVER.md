# ChampCity A/I Product Line — Desktop and Server

## Product Decision

The current application is the continuing standalone workstation product and should be named **ChampCity A/I Desktop**.

Earlier discussion used “V2” imprecisely for the server-backed direction. That equivalence is retired. **V2 is now an internal architecture-generation designation for the shared-product reconstruction/extraction work; it is not a product or deployment name.** The server-backed deployment remains **ChampCity A/I Server**. “ChampCity A/I Enterprise” may later be used as a commercial/packaging name, but `Server` is the clearer deployment-architecture term until a commercial edition decision is made.

## ChampCity A/I Desktop

Desktop remains a first-class product.

Its defining properties are:

- installs and runs on a user workstation;
- does not require a ChampCity server;
- owns its local application state, userData, OAuth material, registered workspaces, Background Agent, tray, MCP runtime, and local workflow execution;
- can use remote model/provider services when configured, but the ChampCity control plane itself remains workstation-resident;
- continues receiving shared harness improvements, workflow improvements, Skills support, MCP tools, model/runtime support, usability work, and compatible architectural improvements;
- remains independently installable and usable even after Server exists.

Desktop must not become a deliberately frozen legacy client merely because Server is developed.

## ChampCity A/I Server

Server is the server-backed deployment model.

Its defining properties are expected to include:

- server-supplied durable project/runtime services;
- server-owned shared or remotely accessible capabilities where explicitly designed;
- client access that may include ChampCity Desktop and later additional clients;
- portable development/execution environments where appropriate;
- explicit user/project access and isolation rather than implicit workstation-local ownership;
- the ability to centralize services that are currently workstation-resident only when that provides a concrete product benefit.

Server must not automatically inherit workstation assumptions from Desktop. Service boundaries, authentication, storage, multi-user behavior, process ownership, deployment, and trust boundaries must be designed explicitly.

## Shared Product Core

Desktop and Server are one product family, not two unrelated codebases.

The product line should intentionally share or evolve compatible concepts for:

- workflow models;
- Architect / Implementer / Operator roles;
- Work, Feature, Issue, Repair, validation, and closeout concepts;
- Skills;
- MCP tools and tool contracts;
- model/reasoning selection;
- project memory and evidence;
- prompt/tool contract standards;
- artifact/history concepts where still useful;
- UI vocabulary and product identity.

A capability added for Server should be evaluated for Desktop applicability, and vice versa. Shared behavior should not be duplicated merely because deployment differs.

## Repository Direction

The current `ChampCity_AI` repository should first be stabilized as the clean, documented baseline for **ChampCity A/I Desktop**.

Server work should begin only after that baseline is archived/documented/validated and published. Whether Server ultimately lives in a new repository, a monorepo, or a deliberately separated server repository is a later architecture decision; the existing Desktop repository should not be destructively transformed into the Server product.

## Naming Rule

Use these names in new engineering documentation:

- `ChampCity A/I Desktop` — standalone workstation deployment.
- `ChampCity A/I Server` — working architecture name for server-backed deployment.
- `ChampCity A/I Enterprise` — reserved for a future commercial/edition decision and not used as a substitute for an undefined architecture.

`V2` may be used in engineering documentation only as an **architecture-generation label**. It must never be used as a synonym for ChampCity A/I Server. The canonical deployment/product names remain ChampCity A/I Desktop and ChampCity A/I Server.
