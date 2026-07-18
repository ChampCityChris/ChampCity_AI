<!-- champcity-artifact-envelope
{"artifactId":"champcity-ai/phase-06/work_card/WC02-REPAIR03","artifactType":"work_card","createdAt":"2026-07-18T02:52:00.000Z","jsonPath":"planning/phases/phase-06/Work_Cards/WC02-REPAIR03_full_workflow_resolver_foundation_rebuild.json","markdownPath":"planning/phases/phase-06/Work_Cards/WC02-REPAIR03_full_workflow_resolver_foundation_rebuild.md","parentArtifactId":"champcity-ai/phase-06/work_card/WC02","payload":{"kind":"work_card","title":"Work Card: Phase 06 WC02-REPAIR03 — Full Workflow Resolver Foundation Rebuild"},"payloadHash":"sha256:39fd632af83d7b23240c913db36fb200b5a48c62e4863eb11132c7b2c70215b7","phaseId":"phase-06","projectId":"champcity-ai","relationships":{"children":[],"expectedOutputs":["champcity-ai/phase-06/implementer_report/WC02-REPAIR03"],"sources":["champcity-ai/phase-06/candidate_disposition/WC02","champcity-ai/phase-06/design_document/WC01-kernel-contract-artifact-protocol-source_authority_replacement_inventory","champcity-ai/phase-06/diagnostic_report/WC02-full-workflow-resolver-foundation-top-to-bottom-review","champcity-ai/phase-06/operator_approval/Operator_Phase_Approval","champcity-ai/phase-06/operator_validation/WC02","champcity-ai/phase-06/work_card/WC02","champcity-ai/phase-06/work_card/WC02-REPAIR02","champcity-ai/phase-06/work_card_plan/Work_Card_Plan"],"supersedes":[]},"revision":1,"schemaVersion":"champcity.artifact.v1","status":"active","updatedAt":"2026-07-18T02:52:00.000Z","workCardId":"WC02-REPAIR03"}
-->

# Work Card: Phase 06 WC02-REPAIR03 — Full Workflow Resolver Foundation Rebuild

Status: approved_for_implementer_execution
Phase: phase-06
Work Card: WC02-REPAIR03
Parent: WC02
Owner: Implementer
Execution: one complete pass

## Governing Scope

Implement the complete foundation defined by:

`champcity-ai/phase-06/diagnostic_report/WC02-full-workflow-resolver-foundation-top-to-bottom-review`

This Work Card includes the resolver-foundation work formerly planned as WC03, WC04, WC05, and WC06. No part may be deferred to another Work Card, and no intermediate Architect or Operator acceptance is requested.

## Required Outcomes

- one verified-evidence workflow kernel is the sole semantic authority;
- graph verification, normalized domain, pure kernel, and thin adapters are separate layers;
- action, role, screen, target, sources, expected output, and transition come from one catalog;
- validation outcome, observations, Architect disposition, and parent-candidate resolution are separate;
- every Operator Validation routes to Architect disposition;
- sequential repairs use explicit parent, sequence, trigger, authorizing disposition, and prior-repair data;
- WC02-REPAIR01 and WC02-REPAIR02 remain passed;
- WC02-REPAIR03 is sequence 3 and active;
- existing expected outputs are traversed rather than authored again;
- linked repairs are valid and competing repairs block;
- phase lifecycle uses explicit activation and closeout evidence;
- Registry and Workflow State remain derived diagnostics;
- planned and repair authoring use their intended builders;
- no routed action opens Ad Hoc Work Card Capture;
- no aliases, first-match selection, prose routing, synthetic outputs, renderer defaults, or compatibility authority remain.

## Required Proof

Add a deterministic Phase 04–06 replay using parent candidates WC01 and WC02 and the actual sequential WC02 repair chain.

Cover the normal Work Card loop, pass and fail outcomes, observations, existing and missing repairs, multiple linked repairs, competing repair blockers, existing-output traversal, phase lifecycle, stale derived state, refresh parity, project isolation, routed screens, unsupported action blockers, and post-write refresh.

Add single-authority gates proving the duplicate and fallback paths are gone.

Use the documented normal Windows validation lane and run full build, unit, repository, mounted renderer, replay, live probe, refresh-parity, and post-write checks.

## Final Live State

After the implementation report exists and before Architect Review exists:

- phase: `phase-06`
- Work Card: `WC02-REPAIR03`
- action: `architect_review_of_implementer_report_required`
- screen: Architect Review
- expected output: `champcity-ai/phase-06/architect_review/WC02-REPAIR03`
- blockers: none

## Implementer Report

Create:

`planning/phases/phase-06/Implementer_Reports/IMPLEMENTER_REPORT_WC02-REPAIR03_full_workflow_resolver_foundation_rebuild.{json,md}`

Artifact ID:

`champcity-ai/phase-06/implementer_report/WC02-REPAIR03`

Report the final architecture, exact changes, consolidated authority, migrations, repair/disposition model, replay and tests, validation results, final live state, residual risks, final status, implementation commit, and confirmation that no push occurred.

A large change set, difficult migration, failing test during development, or rejected broad command is not a reason to narrow the Work Card. Use controlled operations and complete the pass.
