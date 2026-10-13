# Source Control + Forgejo Bootstrap — Implementer Bundle

## Objective

Close the platform gap exposed by the Retrobovine Media Existing Project: a source-neutral Current Project must be able to become a ChampCity-managed source Repository and then bind to a configured Forgejo host without manual `git init`, manual remote configuration, browser automation, or Forgejo UI work.

This bundle is not a Retrobovine-specific hack. Retrobovine Media is the first real acceptance project for a provider-neutral repository-hosting capability that ChampCity itself can later consume.

## Governing Architecture

- `docs/architecture/CHAMPCITY_SOURCE_CONTROL_PROVIDER_ARCHITECTURE.md`
- `docs/architecture/CHAMPCITY_PRODUCT_CAPABILITY_MODEL.md`
- `docs/architecture/CHAMPCITY_STRUCTURED_PROJECT_STATE_DOMAIN_MODEL.md`
- `docs/architecture/CHAMPCITY_CLIENT_SERVICE_CONTRACT.md`
- `docs/architecture/CHAMPCITY_WORKFLOW_INSTANCE_AND_EXECUTION_KERNEL_ARCHITECTURE.md`
- `docs/architecture/CHAMPCITY_WORK_INTAKE_ROUTING_AND_PLANNING_ARCHITECTURE.md`
- `docs/architecture/CHAMPCITY_REPOSITORY_AND_SOURCE_LAYOUT_DECISION.md`

## Architecture Decisions Frozen for This Bundle

1. A non-Git Current Project remains valid. Source enablement is explicit; this bundle must not auto-convert every source-neutral Project.
2. Do not institutionalize root-level `git init` as the ChampCity solution. Source enablement must produce the managed topology: Project container outside Git, `.champcity/repository.git`, and managed `Main/` + `Dev/` RepositoryCheckouts.
3. Git is the source-control provider. Forgejo is repository hosting / remote infrastructure. Forgejo must not replace the Git provider model.
4. Forgejo hosting must not be forced through the External MCP Provider Gateway unless ChampCity is actually consuming a Forgejo MCP server. The first implementation is a bounded Service Host repository-hosting adapter using Forgejo's API.
5. Do not expose a model-callable generic `git remote add <arbitrary URL>` surface. Remote destinations come from application-owned provider configuration plus a bounded repository identity.
6. Remote hosting is optional infrastructure. Local managed source creation remains valid if Forgejo is unavailable. A Forgejo failure must not roll back a successfully established local Repository.
7. Do not enable Forgejo push-to-create as a workaround. Repository creation is explicit through the provider adapter.
8. Repository-host credentials are Service Host secrets. They must not be persisted in Project source, Project State, MCP receipts, logs, generated reports, or model-visible configuration.
9. One card, one checkpoint commit. Do not bulk multiple cards into one implementation pass.
10. Do not start implementation in a dirty shared `Dev` checkout. Begin from the latest accepted clean `dev` baseline after current WSF work is checkpointed, or use a ChampCity-managed isolated implementation checkout.

## Card Sequence

1. **SCF01 — Promote Source-Neutral Existing Project to Managed Source**
2. **SCF02 — Establish Repository Hosting and Remote Binding Contract**
3. **SCF03 — Implement Forgejo Repository Hosting Provider**
4. **SCF04 — Expose Semantic Source/Hosting MCP and Qualify Retrobovine**

## Dependency Shape

```text
SCF01
  ↓
SCF02
  ↓
SCF03
  ↓
SCF04
```

SCF01 is intentionally independent of Forgejo. SCF02 establishes the provider-neutral hosting boundary. SCF03 plugs Forgejo into that boundary. SCF04 publishes the minimum semantic MCP surface and performs the real-project acceptance.

## Explicit Non-Goals

- no GitHub-to-Forgejo migration of ChampCity itself in this bundle;
- no generic multi-forge UI;
- no public-repository publishing workflow;
- no Forgejo issue/PR/project integration;
- no Forgejo Actions integration;
- no browser automation;
- no generic secrets-management rewrite;
- no raw arbitrary remote URL mutation exposed to agents;
- no requirement that every Project have a remote;
- no change to Work Intake source-line semantics beyond what is required to make newly enabled managed source immediately usable.

## Validation Strategy

Each card owns focused tests and must reuse the smallest relevant existing test lanes. Do not repeatedly run the full repository suite after every card unless a focused failure or capability-map requirement demands it.

SCF04 owns bundle-wide qualification, including a real Retrobovine Media migration/provisioning acceptance. The real-project acceptance is evidence, not a substitute for deterministic disposable-fixture tests.

## Final Bundle Exit

The bundle is complete only when an agent operating through ChampCity MCP can, from a registered source-neutral Existing Project:

1. inspect source enablement;
2. explicitly enable ChampCity-managed source;
3. immediately receive usable Main/Dev RepositoryCheckout registrations;
4. provision or resolve a private repository on the configured Forgejo host;
5. bind the managed Git Repository to that provider-owned remote without supplying an arbitrary URL;
6. push the intended source lines with existing bounded Git tooling; and
7. verify the hosted repository and local managed source remain consistent.

No manual PowerShell, root `git init`, manual `git remote add`, or Forgejo web UI step may be required for that acceptance path.
