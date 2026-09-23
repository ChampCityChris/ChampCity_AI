# ChampCity A/I Product Deployment Model — Web Client and Service Host

**Status:** Current V2 product/deployment decision — September 22, 2026  
**Supersedes:** `PRODUCT_LINE_DESKTOP_AND_SERVER.md` as the current target product model

## Product Decision

ChampCity A/I V2 is one product with one browser-delivered client.

The backend runs as ChampCity services and may be deployed:

- locally on a user's workstation; or
- on an actual server.

The same web client is used for either deployment.

There is no permanent V2 Electron/Desktop application product.

## Local Workstation Deployment

A user may install and run the ChampCity Service Host locally.

The local deployment can own:

- Structured Project State;
- local repositories and source-control access;
- local execution environments;
- local/hosted model-runtime adapters;
- local secrets/configuration appropriate to the deployment;
- ChampCity tool and workflow services.

The Operator accesses those services through the web client.

Local installation does not create a separate UI codebase or separate workflow implementation.

## Server Deployment

The same service architecture may run on a server.

Server deployment may add deployment-specific concerns such as:

- remote authentication;
- user/project isolation;
- network exposure;
- server-managed persistence;
- remote or attached execution resources.

Those concerns remain deployment adapters/policy. They do not fork Product Core or the web client.

## V1 Desktop

The existing Electron application is the V1 implementation baseline and migration source.

It remains relevant for:

- behavior characterization;
- source extraction;
- identifying current capabilities;
- migration sequencing.

It is not the V2 target client or host architecture.

## Naming Rule

Use these terms in new V2 engineering documentation:

- **ChampCity Web Client** — the one V2 client implementation;
- **ChampCity Service Host** — the V2 backend application/service composition;
- **workstation-hosted** or **local deployment** — Service Host running on the user's workstation;
- **server-hosted** or **server deployment** — Service Host running on a server;
- **V1 Desktop** — the existing Electron implementation baseline when discussing migration/history.

Do not use "ChampCity A/I Desktop" as a permanent V2 deployment product name.

## Repository Direction

The existing `ChampCity_AI` repository remains the product monorepo.

V2 extraction should produce shared packages plus:

- one web application/client host;
- one deployable service-host application.

Do not split the product into independently implemented Desktop and Server codebases.
