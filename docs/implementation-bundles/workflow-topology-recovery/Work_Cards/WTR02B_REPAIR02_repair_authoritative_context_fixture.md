# WTR02B Repair02 — Repair Authoritative Context SourceBinding Fixture

**Parent card:** WTR02B — Convert SourceBinding Ownership to Workflow and SourceBaseline  
**Depends on:** WTR02B Repair01 implementation checkpoint `e526ce560872d324bf1d47832e8d110247597660`  
**Implementer:** GPT 6.0 Luna Medium  
**Architect finding:** WTR02B modified the authoritative-context fixture by creating a second target Workflow/SourceBaseline using duplicate local identifiers; the file no longer loads and the duplicate route would also violate one-target WIR provenance  
**Report:** `docs/implementation-bundles/workflow-topology-recovery/Implementer_Reports/WTR02B_REPAIR02_IMPLEMENTER_REPORT.md`

## 1. Finding

`test/project-state/authoritative-context-event-feed.test.cjs` already creates, near the beginning of the fixture:

```text
targetWorkflow
→ SourceBaseline baseline
→ targetPhase / targetWork
→ WIR routes_to targetWorkflow
```

The original WTR02B implementation later replaced the old WorkIntake-owned SourceBinding setup with:

```js
const target = ...
await service.linkWorkflowRouteTarget(... target.id)
const baseline = ...
const binding = ...
```

That introduced two defects in the permanent test:

1. `const baseline` is declared twice in the same scope, so the test file cannot load;
2. it attempts to route the WIR to a second target even though the fixture already has `targetWorkflow`.

This failure was introduced by WTR02B and is not an unrelated pre-existing test defect.

## 2. Required correction

Modify only:

`test/project-state/authoritative-context-event-feed.test.cjs`

Do not create another Workflow, route edge, or SourceBaseline in the later SourceBinding setup.

Reuse the fixture's existing:

- `targetWorkflow`;
- `baseline`.

The later source setup should conceptually become:

```js
const binding = await service.createWorkflowSourceBinding(
  project.id,
  targetWorkflow.id,
  baseline.id,
);
await service.updateSourceBinding(... preparing ...);
await service.updateSourceBinding(... ready ...);
```

Preserve the rest of the test's existing intent unless a direct assertion must be adjusted because the duplicate target is removed.

## 3. Do not redesign this fixture

This repair is only about restoring the permanent test to a coherent single-target WTR02B topology.

Do not:

- move the test's existing Work Items/Phases to another Workflow;
- change SourceCheckpoint or IntegrationRecord semantics;
- change authoritative-context traversal;
- modify production code;
- add a new Workflow;
- add a new SourceBaseline;
- add another `routes_to`;
- change WIR/source ownership architecture;
- modify source-control services;
- begin WTR02C.

Any broader semantic cleanup belongs to its owning later card.

## 4. Required proof

The repaired test must prove that the existing target Workflow/SourceBaseline can support the Workflow-owned SourceBinding while preserving the authoritative-context assertions.

Run:

```text
node --test test/project-state/authoritative-context-event-feed.test.cjs
```

It must load and pass for both its in-memory and SQLite cases.

Also verify:

- exactly one `routes_to` relationship exists for the fixture's WIR;
- no duplicate local declaration remains;
- no production file changed.

## 5. Expected files

Modify:

- `test/project-state/authoritative-context-event-feed.test.cjs`

Create:

- `docs/implementation-bundles/workflow-topology-recovery/Implementer_Reports/WTR02B_REPAIR02_IMPLEMENTER_REPORT.md`

No production files.

## 6. Validation

Required:

1. `npm run build`;
2. `node --test test/project-state/authoritative-context-event-feed.test.cjs`;
3. validation planner preview for the exact two final changed paths;
4. `npm run test:affected -- --changes <exact-changed-path manifest>`;
5. `git diff --check`.

Affected validation may continue to report explicitly deferred WTR02E/F/G/H source-materialization failures. The authoritative-context test itself must pass.

## 7. Implementer Report

Write:

`docs/implementation-bundles/workflow-topology-recovery/Implementer_Reports/WTR02B_REPAIR02_IMPLEMENTER_REPORT.md`

Include:

- starting SHA;
- exact files changed;
- confirmation that existing `targetWorkflow` and `baseline` are reused;
- focused validation result;
- affected-validation result with deferred failures separated;
- confirmation that no production code changed.

Do not edit the report after its checkpoint solely to insert the checkpoint hash.

## 8. Checkpoint and stop

After validation and report completion, create exactly one attributable checkpoint commit.

Suggested subject:

`WTR02B Repair02 repair authoritative context fixture`

No additional Operator Git approval is required.

Then stop. Do not begin WTR02C.
