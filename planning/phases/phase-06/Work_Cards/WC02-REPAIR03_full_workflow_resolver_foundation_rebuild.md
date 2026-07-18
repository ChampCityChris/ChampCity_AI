<!-- champcity-artifact-envelope
{
  "artifactId": "champcity-ai/phase-06/work_card/WC02-REPAIR03",
  "artifactType": "work_card",
  "createdAt": "2026-07-18T02:52:00.000Z",
  "jsonPath": "planning/phases/phase-06/Work_Cards/WC02-REPAIR03_full_workflow_resolver_foundation_rebuild.json",
  "markdownPath": "planning/phases/phase-06/Work_Cards/WC02-REPAIR03_full_workflow_resolver_foundation_rebuild.md",
  "parentArtifactId": "champcity-ai/phase-06/work_card/WC02",
  "payload": {
    "kind": "work_card",
    "title": "Work Card: Phase 06 WC02-REPAIR03 — Full Workflow Resolver Foundation Rebuild"
  },
  "payloadHash": "sha256:5e64d09693072ce2770269c2a86a96016930cf1f46bd3fca79f8c730076b260f",
  "phaseId": "phase-06",
  "projectId": "champcity-ai",
  "relationships": {
    "children": [],
    "expectedOutputs": [
      "champcity-ai/phase-06/implementer_report/WC02-REPAIR03"
    ],
    "sources": [
      "champcity-ai/phase-06/candidate_disposition/WC02",
      "champcity-ai/phase-06/design_document/WC01-kernel-contract-artifact-protocol-source-authority-replacement-inventory",
      "champcity-ai/phase-06/diagnostic_report/WC02-full-workflow-resolver-foundation-top-to-bottom-review",
      "champcity-ai/phase-06/operator_approval/Operator_Phase_Approval",
      "champcity-ai/phase-06/operator_validation/WC02",
      "champcity-ai/phase-06/work_card/WC02",
      "champcity-ai/phase-06/work_card/WC02-REPAIR02",
      "champcity-ai/phase-06/work_card_plan/Work_Card_Plan"
    ],
    "supersedes": []
  },
  "revision": 2,
  "schemaVersion": "champcity.artifact.v1",
  "status": "active",
  "updatedAt": "2026-07-18T03:25:00.000Z",
  "workCardId": "WC02-REPAIR03"
}
-->

# Work Card: Phase 06 WC02-REPAIR03 — Full Workflow Resolver Foundation Rebuild

Status: approved_for_implementer_execution
Phase: phase-06
Work Card: WC02-REPAIR03
Parent: WC02
Owner: Implementer
Execution: one complete pass
Revision: 2 — absorbed WC03–WC06 requirements made explicit

## Governing Authority

Implement the complete resolver foundation defined by:

- `champcity-ai/phase-06/diagnostic_report/WC02-full-workflow-resolver-foundation-top-to-bottom-review`
- this Work Card revision
- the accepted WC01 source-authority inventory

WC03, WC04, WC05, and WC06 were never created as separate full Work Cards. Their approved candidate scopes are absorbed below as binding requirements. The Implementer must complete every absorbed section in this pass. Merely stating that the scopes were “considered” is not completion.

No intermediate Architect or Operator acceptance is requested. Submit one final Implementer Report only after all four absorbed sections and the core rebuild are complete.

## Core Architecture Contract

Implement exactly four one-way layers:

1. **Verified Artifact Graph** — verifies canonical artifacts, relationships, status, ownership, and structural ambiguity. It does not choose workflow meaning.
2. **Normalized Workflow Domain** — converts verified artifacts into explicit project lifecycle, phase lifecycle, candidate, validation, observation, disposition, and sequential-repair records.
3. **Pure Workflow Kernel** — consumes only the normalized domain and returns exactly one current action or one blocking result.
4. **Thin Adapters** — repository refresh, IPC, routed writes, current-action projection, workflow rail, and renderer display consume the kernel result without reinterpreting it.

One typed action catalog must own each action’s:

- action ID;
- workflow step and stage;
- responsible role;
- screen ID;
- target rule;
- source rule;
- expected output type and identity rule;
- authorized write operations;
- success, repair, failure, and disposition transitions.

No second semantic state machine, transition table, route table, renderer map, IPC result switch, or evidence-precedence engine may independently choose workflow behavior.

## Absorbed WC03 Requirements — Real Replay and No-Fallback Gates

These requirements are mandatory:

1. Build a deterministic replay from the actual Phase 04 through Phase 06 artifact history, including:
   - Phase 04 closeout;
   - Phase 05 activation and closeout;
   - Phase 06 activation and plan;
   - WC01 completion;
   - parent WC02;
   - WC02-REPAIR01 passed;
   - additional observations authorizing WC02-REPAIR02;
   - WC02-REPAIR02 passed;
   - parent WC02 remaining unresolved;
   - WC02-REPAIR03 as sequential repair 3.
2. Repairs must not be inserted into the Work Card Plan candidate list.
3. The replay must use the real artifact relationships and decisions that produced the live failure. A synthetic happy-path fixture alone is insufficient.
4. Add repository gates that fail when production code contains:
   - duplicate semantic workflow authorities;
   - action or screen aliases used as compatibility authority;
   - fallback/current-action defaults;
   - first-match authority selection;
   - filename, title, suffix, timestamp, or directory-order inference;
   - synthetic expected-output identities;
   - stale Workflow State or Registry override;
   - Ad Hoc Work Card Capture as a routed action.
5. Remove or rewrite tests and gates that encode obsolete WC09 branch assumptions or validate the implementation against tables derived from the same incomplete contract.
6. Test the full normal Work Card loop, pass, fail, observations, missing repair, existing repair, multiple sequential repairs, competing unlinked repairs, phase closeout eligibility, and next-candidate selection.

## Absorbed WC04 Requirements — Registry, Workflow State, Refresh, and Graph Boundary

These requirements are mandatory:

1. `VerifiedArtifactGraph` remains structural evidence verification only.
2. Artifact Registry is derived from the verified graph for lookup and diagnostics. It cannot add, remove, rank, or override workflow authority.
3. Workflow State is a derived projection/cache only. It cannot select the current action after restart, refresh, or project switch.
4. Cold start, manual refresh, observer refresh, application-focus refresh, and post-write refresh must produce the same action from identical repository evidence.
5. Stale Registry and stale Workflow State artifacts must be ignored as semantic authority.
6. Project workspaces must remain isolated with no route or evidence bleed.
7. Remove production imports and call paths that let Registry, persisted Workflow State, or cached renderer state make semantic workflow decisions.
8. Contradictory or incomplete structural evidence must return one visible blocker. It must not fall back to an older phase, older candidate, or generic screen.

## Absorbed WC05 Requirements — Kernel-to-UI, IPC, and Routed Writes

These requirements are mandatory:

1. Generate or directly consume UI route, role, screen, and write-policy behavior from the one typed action catalog.
2. Remove or reduce to presentation-only adapters all duplicate mappings, including:
   - current-action surface route authority;
   - action-to-workflow-state maps;
   - action-to-manual-screen maps;
   - workflow-visibility action maps;
   - IPC transition-result routing independent of the kernel.
3. An unknown or unsupported kernel action must display a blocker. It must not select a default workflow state, role-based screen, manual screen, or Work Card screen.
4. Planned Work Card authoring must open the planned Work Card builder.
5. Repair authoring must open the repair Work Card builder.
6. Ad Hoc Work Card Capture may remain available only as an explicitly selected supporting tool. It must never be returned as the routed current-action screen.
7. Reference phase/card controls and supporting-screen navigation must never retarget the kernel action.
8. IPC authorization and routed writes must verify the exact current action, role, screen, target, sources, output identity, and state revision.
9. After a successful canonical write, the application must rescan repository evidence and obtain the next action from the pure kernel. Adapters must not advance a parallel transition engine.
10. Remove action aliases and compatibility variants from production authority. Historical names may remain only in tests that prove they are rejected or in non-executable historical documentation.

## Absorbed WC06 Requirements — Integrated Validation and Closeout Readiness

These requirements are mandatory within the final Implementer validation:

1. Run the complete automated suite through the documented normal Windows lane.
2. Add mounted Electron checks that verify the actual routed screen for each critical kernel action.
3. Add a live ChampCity_AI repository probe using the real planning corpus.
4. Verify the final live state after the Implementer Report exists and before Architect Review exists:
   - phase: `phase-06`;
   - Work Card: `WC02-REPAIR03`;
   - action: `architect_review_of_implementer_report_required`;
   - screen: Architect Review;
   - expected output: `champcity-ai/phase-06/architect_review/WC02-REPAIR03`;
   - blockers: none.
5. Verify refresh parity, restart parity, project-switch isolation, post-write recomputation, and stale derived-state rejection.
6. Verify no normal routed action opens Ad Hoc Work Card Capture.
7. Verify every Operator Validation routes to Architect disposition before the parent candidate advances.
8. Verify phase closeout remains blocked until every candidate has an explicit terminal disposition and no repair is active.
9. Do not perform Operator acceptance. Report the remaining visible Operator validation steps for the Architect to issue after review.

## Validation, Observation, Disposition, and Repair Model

Implement these as separate durable concepts:

- validation target outcome;
- additional Operator observations;
- Architect disposition of each observation;
- child Work Card or repair completion;
- parent candidate resolution;
- follow-up Work Card or repair authority.

Every Operator Validation routes to Architect disposition, including a clean pass.

Sequential repairs require explicit:

- parent Work Card artifact ID;
- repair sequence number;
- triggering validation or disposition;
- authorizing Architect disposition;
- prior repair artifact ID when sequence is greater than 1.

Required WC02 interpretation:

- WC02-REPAIR01 remains passed;
- WC02-REPAIR02 remains passed;
- WC02-REPAIR03 is repair sequence 3 and active;
- parent WC02 remains unresolved until final Architect disposition;
- linked sequential repairs are valid;
- multiple competing or unlinked active repairs block visibly.

## Existing-Output Traversal Rule

Before returning an authoring action, the kernel must check the exact expected artifact identity:

- if the artifact is absent, return its authoring action;
- if it exists and is valid, traverse its current state;
- if it exists but is invalid or ambiguous, return a blocker;
- never return authoring for an already-existing exact artifact;
- never synthesize an alternative identity.

This rule must prevent the current failure where an existing repair is routed to Work Card authoring and Ad Hoc Work Card Capture.

## Authorized Production Surface

Production changes are authorized only where required within:

- `src/shared/workflow/`;
- `src/main/workflow/`;
- `src/main/repository/`;
- `src/main/workCards/canonicalWorkflowAuthority.ts`;
- workflow-related files under `src/shared/workCards/`;
- required main/preload IPC registration and types;
- `src/renderer/app/WorkflowRouterShell.tsx`;
- only the minimum routed-screen selection code in `src/renderer/app/App.tsx`;
- workflow tests, mounted Electron checks, repository gates, and replay scripts;
- planning updates and the final Implementer Report required by this Work Card.

The Implementer may delete, replace, split, or rename workflow modules inside this authorized surface when necessary to establish the four-layer architecture.

## Explicitly Prohibited Scope

Do not change:

- project display-name behavior;
- project onboarding policy;
- unrelated UI layout, styling, or navigation;
- MCP, connector, LLM, provider, authentication, deployment, or cloud functionality;
- unrelated project or phase planning content;
- application features outside workflow authority;
- completed historical outcomes except a narrowly required canonical migration that preserves their meaning.

Do not create another repair card, compatibility layer, fallback, alias, shadow artifact, alternate route, or deferred resolver pass.

## Implementer Discretion Boundary

The Implementer may choose internal class and function names and may sequence edits and tests as needed.

The Implementer may not:

- narrow, broaden, reinterpret, or defer any requirement;
- preserve duplicate authority because removal is difficult;
- treat a rejected broad shell command as a scope blocker;
- replace real-repository replay with synthetic-only tests;
- report partial completion as implementation completion;
- push any commit.

A genuine contradiction between this Work Card and repository facts is a stop condition. Tool inconvenience, migration size, failing tests during development, or a large change set is not a stop condition.

## Required Validation

Use the documented normal Windows lane and run:

- typecheck;
- production build;
- complete unit suite;
- repository gates;
- real Phase 04–06 replay;
- mounted Electron routed-screen checks;
- live ChampCity_AI repository current-action probe;
- cold-start/manual-refresh parity;
- project-switch isolation;
- post-write refresh checks;
- final repository status.

The final report must list each required behavior and the exact evidence proving it.

## Implementer Report

Create:

`planning/phases/phase-06/Implementer_Reports/IMPLEMENTER_REPORT_WC02-REPAIR03_full_workflow_resolver_foundation_rebuild.{json,md}`

Artifact ID:

`champcity-ai/phase-06/implementer_report/WC02-REPAIR03`

The report must include:

- repository, branch, and remote verification;
- pre-existing repository changes preserved or resolved;
- final four-layer architecture;
- exact former authorities deleted, replaced, or reduced to adapters;
- WC03 replay and gate completion;
- WC04 Registry/Workflow State boundary completion;
- WC05 UI/IPC/write adapter completion;
- WC06 integrated validation completion;
- files changed;
- migrations performed;
- validation, observation, disposition, and sequential-repair model;
- exact tests and results;
- final live state;
- residual risks;
- final repository status;
- implementation commit;
- confirmation that no push occurred.

One complete final report is required. No partial report or intermediate acceptance request is permitted.
