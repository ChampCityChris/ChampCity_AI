# ChampCity A/I V2 Topology Reconciliation — September 22, 2026

**Status:** Architecture reconciliation record  
**Decision authority:** Operator direction, September 22, 2026  
**Purpose:** Reconcile the active V2 corpus after superseding the earlier permanent Desktop/Electron + Server-host model.

## Controlling Decision

ChampCity A/I V2 has:

- **one client implementation:** the ChampCity Web Client;
- **one backend architecture:** the ChampCity Service Host plus shared Product Core/services;
- **two primary backend placement options:** workstation-hosted or server-hosted;
- **no permanent Electron/Desktop V2 application.**

Electron is part of the V1 implementation baseline and migration source only.

The same web client is used whether backend services run on the user's workstation or on a server.

## Superseded Interpretation

The September 14 V2 corpus previously retained a model broadly equivalent to:

```text
shared client
  -> Electron/Desktop shell -> local services
  -> browser/Web shell      -> Server services
```

and a source layout containing separate:

- `apps/desktop`;
- `apps/server`;
- `apps/web`.

That topology is superseded.

The current target is:

```text
ChampCity Web Client
        |
        v
ChampCity Service Host
        |
        v
Product Core / Project State / Repository / Runtime / Environment services
```

The Service Host may be installed locally or deployed on a server.

## Reconciled Active Documents

The following active documents were updated to conform to the new topology:

- `docs/architecture/CHAMPCITY_V2_ARCHITECTURE_CORPUS_INDEX.md`
- `docs/architecture/CHAMPCITY_WEB_CLIENT_AND_SERVICE_HOST_ARCHITECTURE.md`
- `docs/architecture/CHAMPCITY_FOUNDATIONAL_ARCHITECTURE_PRINCIPLES.md`
- `docs/architecture/CHAMPCITY_PRODUCT_CAPABILITY_MODEL.md`
- `docs/architecture/CHAMPCITY_CLIENT_SERVICE_CONTRACT.md`
- `docs/architecture/CHAMPCITY_REPOSITORY_AND_SOURCE_LAYOUT_DECISION.md`
- `docs/architecture/CHAMPCITY_STRUCTURED_PROJECT_STATE_DOMAIN_MODEL.md`
- `docs/architecture/CHAMPCITY_AGENT_RUNTIME_INTERFACE_CONTRACT.md`
- `docs/architecture/DESKTOP_ARCHITECTURE.md`
- `docs/governance/CHAMPCITY_UI_DESIGN_GOVERNANCE_STANDARD.md`
- `docs/migration/SOURCE_EXTRACTION_MAP.md`
- `docs/migration/CHAMPCITY_CLIENT_SERVICE_DESKTOP_SOURCE_MAPPING.md`
- `docs/product/PRODUCT_DEPLOYMENT_WEB_CLIENT_AND_SERVICE_HOST.md`
- `docs/product/PRODUCT_LINE_DESKTOP_AND_SERVER.md`
- `docs/product/DESKTOP_OVERVIEW.md`
- `docs/product/FEATURES.md`

## V1 Documentation Rule

Documents and source references containing terms such as:

- Desktop;
- Electron;
- preload;
- BrowserWindow/WebContentsView;
- tray;
- native shell;
- Desktop source mapping;

remain valid when they explicitly describe the V1 implementation baseline, migration evidence, or historical decisions.

They do **not** establish V2 target topology.

When a V1 implementation detail conflicts with the current V2 topology decision, the V2 topology decision controls.

## Migration Consequence

V2 engineering should:

1. preserve V1 behavior evidence for capabilities that remain required;
2. extract deployment-neutral Product Core and service contracts;
3. establish Structured Project State and shared backend services;
4. establish the deployable Service Host;
5. migrate reusable presentation into the one web client;
6. prove required workstation-hosted operation through browser -> web client -> local Service Host;
7. retire Electron/preload/native-shell infrastructure after cutover;
8. deploy the same Service Host architecture on server infrastructure without creating a second client or duplicated workflow services.

## Source Layout Consequence

The preferred target shape is:

```text
apps/
    web/
    service-host/

packages/
    product-core/
    client/
    service-contracts/
    runtime-contracts/
    project-state/
    repository-management/
```

Do not introduce `apps/desktop` as a permanent V2 target.

## Planning Rule

Any Work Intake, Plan, Work Card, migration task, or architecture review for V2 must treat this reconciliation and `CHAMPCITY_WEB_CLIENT_AND_SERVICE_HOST_ARCHITECTURE.md` as controlling on client/hosting topology.

Do not reopen the superseded Electron/Desktop-versus-Server topology unless the Operator explicitly directs a new architecture decision.
