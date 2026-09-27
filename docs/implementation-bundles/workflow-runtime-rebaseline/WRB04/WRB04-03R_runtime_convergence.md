# WRB04-03R — Converge Exact Implementer/Tester Runtime Before Validator

**Status:** ACTIVE — sole WRB04 implementation card<br>
**Depends on:** WRB04-03D committed checkpoint<br>
**Implementer:** GPT 6.0 Luna Medium<br>
**Execution rule:** ONE card, ONE Implementer Report, ONE checkpoint commit. **Do not split this card into more cards.**

## Objective

Repair the seams introduced by the WRB04 split-card implementation so the exact Workflow/WorkItem lifecycle has one coherent runtime before Validator and Repair are added.

Preserve the implemented WRB04-01 through WRB04-03D behavior except where this card explicitly changes it.

The completed boundary must be:

```text
exact Workflow / WorkItem
→ Implementer
→ validation_pending
→ Tester
→ exact TesterResult
→ optional application-owned test checkpoint
→ ready for future Validator
```

for both source-backed and source-neutral WorkItems.

## A. Replace fake legacy context in exact Implementer mode

### Required contract

Refactor the execution-context type into a discriminated union.

At minimum distinguish:

- legacy Work Card execution context;
- exact Workflow/WorkItem execution context;
- Integration Repair context.

The exact Workflow/WorkItem context must have first-class fields equivalent to:

- `ownerKind: "workflow-work-item"`;
- `currentProjectRoot`;
- `executionRoot`;
- `projectId`;
- `workflowId`;
- `workItemId`;
- `workItemVersion`;
- `executionContract`;
- `executionContractDigest`;
- `sourceMode: "source-backed" | "source-neutral"`;
- optional exact source revision / checkout identity only when source-backed;
- application-owned attempt/evidence identity.

It must NOT require placeholder values for:

- formal Work Card path/revision/hash;
- Implementer Report path/revision/hash;
- Issue Fix Card identity;
- Work Intake identity;
- routed Plan identity.

Legacy contexts may retain those fields for their existing callers.

### Public model

Add exact Workflow/WorkItem identity to the bounded execution model instead of relying on `workCardId` as canonical identity.

Legacy UI fields may remain for legacy callers, but exact mode must not derive authority from them.

### Prompt and retry/status

Exact prompt, session equality, retry readiness, evidence finalization, and App Server launch must consume the exact context branch directly.

Focused proof must establish that the exact branch never calls:

- `getCurrentWorkspaceModel`;
- `resolveRoutedImplementerContext`;
- `resolveIssueFixCardCodexExecutionContext`.

## B. Add one shared execution lease across Implementer and Tester

Create one application-owned lease/lock service used by exact Implementer and Tester runtimes.

### Source-backed lease

Key it to the exact writable Workflow checkout identity, not the Current Project root.

Required semantics:

- only one source-mutating role may own one Workflow checkout at a time;
- Implementer and Tester cannot overlap on the same checkout;
- another Workflow with a different managed checkout may run concurrently;
- lease releases on success, failure, cancellation, and runtime disposal;
- stale in-memory session state cannot permanently strand the lease.

### Source-neutral lease

Source-neutral exact WorkItems execute in isolated runtime directories and must not be globally serialized by Project root.

Independent source-neutral WorkItems may run concurrently subject to the normal runtime-manager capacity.

### Session lookup

Exact status/start/cancel/input/approval lookup must resolve the exact execution owner, not “whatever session exists for this Project root.”

Do not change legacy session-key behavior except where required to coexist safely with exact mode.

## C. Make TesterResult represent source-backed and source-neutral attempts

Normalize the TesterResult source contract.

Use an explicit source mode, for example:

```text
sourceMode = source-backed | source-neutral
```

### Source-backed

Require:
- exact Implementer revision;
- current ready SourceBinding;
- implementation checkpoint at that revision;
- existing 03C checkpoint semantics for Tester edits.

No-change TesterResult:
- checkpointState = not-required;
- candidate revision = Implementer revision.

Changed-test TesterResult:
- checkpointState = pending until 03C commits;
- candidate revision absent until committed.

### Source-neutral

Require:
- exact latest successful ImplementationRecord;
- exact active `validation_pending` WorkItem;
- no SourceBinding/SourceCheckpoint/revision fabrication.

Source-neutral TesterResult:
- sourceMode = source-neutral;
- checkpointState = not-required;
- no Implementer revision field required;
- no candidate revision required;
- no source checkpoint ID.

The SQLite store is generic typed Project State; do not invent a second persistence mechanism.

## D. Canonicalize the Tester entry state

For the new exact runtime:

`createTesterResult` and exact Tester preflight require:

- active exact WorkItem;
- `workState === "validation_pending"`;
- supplied ImplementationRecord belongs to it;
- supplied ImplementationRecord is the latest attempt;
- outcome is `implemented`;
- Tester principal differs from Implementer principal.

Remove `implemented` as an alternate exact Tester entry state.

Do not change WorkItem state during TesterResult creation.

Validator/03F will own downstream transition/completion.

## E. Support a bounded source-neutral Tester runtime

Do not return “unavailable” merely because a valid exact WorkItem has no repository source.

### Source-neutral Tester context

Derive:
- exact Workflow/WorkItem;
- latest successful ImplementationRecord;
- exact execution contract;
- determination evidence that does not require a Git revision;
- sourceMode = source-neutral.

Use an isolated application-owned runtime worker directory.

No repository checkout, Git operation, or fake source revision may be created.

Run the Tester as a distinct principal/session with:
- network disabled;
- no production filesystem write authority;
- no permanent test-file mutation capability.

A source-neutral Tester may produce a semantic no-change TesterResult.

If its conclusion genuinely requires repository-backed permanent proof changes, return a bounded result indicating that no permanent proof surface exists; do not fabricate one.

Update the bounded Test Lifecycle Determination input/output so exact attempt identity does not depend on a mandatory Git revision. Use the ImplementationRecord identity as the universal attempt anchor and an optional source revision for source-backed work.

## F. Expand source-backed Tester-owned proof scope

Replace the current `*.test|*.spec`-only rule with one shared Tester-owned path policy used by:

- Tester App Server attribution;
- TesterResult validation;
- Tester checkpoint validation.

### Required allowed scope

Allow ordinary bounded files under:

`test/**`

including:
- permanent tests;
- fixtures;
- support/helper files;
- snapshots/data used by permanent tests where they remain bounded ordinary files.

Also allow exactly:

`validation/capability-map.json`

when permanent proof ownership/catalog metadata changes.

### Required denied scope

Always deny:
- `src/**`;
- `.git/**`;
- `.champcity/**`;
- dependency/build/output directories;
- secrets/environment files;
- package/dependency manifests unless a later explicit architecture authorizes them;
- arbitrary repository paths.

The App Server writable roots may be broader directory roots only when final attribution and exact Git diff validation enforce the same allowed-path policy.

The Tester process still owns no Git command/checkpoint route.

### Candidate checkpoint

03C must checkpoint the complete exact Tester-owned changed path set, including fixtures/support/catalog metadata.

After commit:
- TesterResult path set;
- SourceCheckpoint changed-file set;
- SourceBinding candidate revision;

must agree exactly.

## G. Contain local ChampCity runtime state

Add this repository-root ignore rule:

```gitignore
.champcity/
```

Do not delete or mutate the existing local `.champcity` runtime tree.

Do not stage any existing `.champcity` contents.

## H. Permanent proof

Use existing test owners wherever possible.

Required focused scenarios:

1. exact Implementer context contains no required fake Work Card/report identity;
2. legacy Implementer paths still resolve under their legacy context branch;
3. two different source-backed Workflows can hold independent exact sessions concurrently;
4. same Workflow checkout rejects overlapping Implementer/Tester mutation;
5. independent source-neutral WorkItems are not serialized by Current Project root;
6. leases release on success/failure/cancel;
7. exact source-backed Tester still accepts committed implementation checkpoint;
8. exact source-neutral Tester reaches a successful no-change TesterResult with no Git/source records;
9. TesterResult exact runtime accepts only `validation_pending`, not `implemented`;
10. source-backed Tester may edit a test fixture/support file;
11. source-backed Tester may edit `validation/capability-map.json`;
12. production-source edit fails closed;
13. final Tester changed-path set and committed checkpoint set agree exactly;
14. implementation-local proof is still not automatically promoted;
15. no exact runtime path re-enters routed-development, Issue Fix Card, or current-workspace Markdown authority.

## Validation

Run only bounded validation for the converged boundary:

- build;
- exact Implementer service tests;
- Tester service tests;
- TesterResult Project State tests;
- semantic/structured checkpoint tests affected by the widened Tester path policy;
- Workflow execution application tests;
- capability-map integrity;
- exact validation-plan preview;
- `git diff --check`.

Do **not** run the historical full work-item profile as a completion gate for this recovery card.

The known unrelated `test/project-intake/post-submit-review-state.test.cjs` SSR fixture failure is not owned by this card. Do not repair it here.

If a focused test in the changed boundary fails, fix it before completion.

## Report

Write:

`docs/implementation-bundles/workflow-runtime-rebaseline/WRB04/Reports/WRB04-03R_IMPLEMENTER_REPORT.md`

The report must explicitly cover:

- exact context type before/after;
- session/lease key semantics;
- same-checkout cross-role exclusion;
- cross-Workflow concurrency proof;
- source-neutral TesterResult/runtime proof;
- canonical `validation_pending` entry;
- widened Tester-owned path policy;
- test checkpoint exact-path proof;
- `.champcity/` ignore containment;
- focused validation results;
- confirmation that Validator/Repair/Integration/UI were NOT implemented.

## Checkpoint and STOP

Create one attributable commit:

`WRB04-03R converge exact Implementer and Tester runtime`

Then **STOP for Architect review**.

Do not open WRB04-03E or any later card.
