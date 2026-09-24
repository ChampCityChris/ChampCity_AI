# WTR01C Implementer Report

## Identity and starting state

- Card: WTR01C — Establish WIR-to-Target Workflow Provenance.
- Approved repository root verified: the active checkout contains the approved card and current repository boundary/validation instructions.
- Starting branch: `dev`.
- Starting SHA: `c56421a2878b52e5a528f7ed7ca87fe5a13e8c83`.
- Starting remote status: `dev` was ahead of `origin/dev` by 59 commits; the worktree was clean before this card.
- Checkpoint: pending at report creation; the actual checkpoint hash will be reported after the commit. No push or other Git topology action is authorized or performed.

## Implementation

`routes_to` is a canonical immutable `Workflow -> Workflow` provenance relationship. Validation requires a `work-intake-routing` source, a non-routing target, distinct endpoints, and endpoints in the same Project. Immutable-provenance validation prevents ending it. The obsolete `owns_workflow` relationship was removed without an alias.

`linkWorkflowRouteTarget()` is the only service path that can create this relationship. It checks both Project identities and Workflow types, requires active nonterminal Workflow lifecycle/body states, enforces at most one outgoing target per routing Workflow and one incoming routing provenance source per target, persists one relationship, and records the normal relationship-create event against the routing Workflow. It does not mutate either Workflow. Generic `createRelationship(..., "routes_to", ...)` is rejected. `recordRouteDecision()` is unchanged.

Work Intake summary fields are now `routingWorkflowId` and nullable `targetWorkflowId`; the current-state projection uses the same names and returns null until explicit provenance linking. Summary retrieval still requires exactly one active `initiates` edge and fails if its routing Workflow has multiple active target edges. Route decisions alone continue to leave `targetWorkflowId` null.

Workflow-scoped record queries continue to associate the Work Intake with its own WIR Workflow and traverse `part_of` membership. They no longer recognize `owns_workflow`, and exclude `routes_to` from adjacent membership results. Thus WIR queries omit target Workflows and descendants, while target queries omit WIR and Work Intake records. Non-Project authoritative context does not traverse `routes_to`; the edge remains visible as relationship evidence when an endpoint is present. Project context still includes both graphs.

Modified existing proof owners: `domain-contracts`, `work-intake-routing`, `current-state-queries`, and `authoritative-context-event-feed`. No permanent test file was added; permanent test count did not change.

## Validation

- `npm run build` — the initial restricted invocation reported TypeScript narrowing errors, corrected during implementation. The next restricted invocation reached Vite and returned the documented `spawn EPERM`; the normal Windows rerun passed (TypeScript, Vite, branding assets), with only the existing large-chunk advisory.
- `node --test test/project-state/domain-contracts.test.cjs test/project-state/work-intake-routing.test.cjs test/project-state/current-state-queries.test.cjs test/project-state/authoritative-context-event-feed.test.cjs` — restricted lane returned `spawn EPERM`; normal Windows lane passed, 21 tests, 0 failures. An intermediate semantic assertion expected three current Work Items; the synthetic target Work Item made the correct total four, and the assertion was fixed before the passing run.
- `npm run validate:plan -- --profile work-item --changes tmp/wtr01c-changes.json` — normal Windows lane, exit 0; preview used all seven final changed paths and selected the work-item profile's Project State and dependent fast/integration proof.
- `npm run test:affected -- --changes tmp/wtr01c-changes.json` — restricted lane returned `spawn EPERM` before proof; normal Windows rerun passed, work-item profile, fresh production build passed, duration 27,131 ms, failure evidence empty. The executor ran its selected fast, Project State, validation-map, and Work Intake capability tests.
- `git diff --check` — normal Windows lane, exit 0; no whitespace errors.
- `node --test test/validation/capability-map.test.cjs` — not run; `validation/capability-map.json` was not changed.

No launch smoke or external integration evidence was required or claimed. The temporary validation manifest is caller input under ignored `tmp/`, not a governed artifact.

## Changed files

Created:

- `docs/implementation-bundles/workflow-topology-recovery/Implementer_Reports/WTR01C_IMPLEMENTER_REPORT.md`

Modified:

- `src/shared/projectState/relationshipRegistry.ts`
- `src/shared/projectState/projectStateService.ts`
- `test/project-state/domain-contracts.test.cjs`
- `test/project-state/work-intake-routing.test.cjs`
- `test/project-state/current-state-queries.test.cjs`
- `test/project-state/authoritative-context-event-feed.test.cjs`

Deleted: none. Intentionally not created: compatibility aliases, new permanent tests, migrations/schema changes, capability-map changes, UI changes, or later-card behavior.

## Scope and safety

Target Workflow creation/handoff, automatic WIR closure, source control, repeatability, UI, and WTR01D or later behavior were not implemented. No target is created or linked by route selection. `initiates` remains the Work Intake-to-WIR relationship.

The staged diff contains exactly the seven listed card files; `git diff --cached --check` passed. The bounded staged-content scan found no secret-like credential values or concrete local-machine paths; the staged path scan found no generated output, dependency state, database, or image artifacts. No secrets, concrete local-machine paths, generated build output, or dependency state were added to durable artifacts. Recommended next task: Architect review; stop here and do not begin WTR01D.
