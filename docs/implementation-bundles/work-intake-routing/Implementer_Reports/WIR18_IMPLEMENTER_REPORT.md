# WIR18 Implementer Report

## Baseline and scope

Work Card **WIR18 — Adapt Issue Correction Execution to Generic Plan Topology** passes focused automated acceptance. Checkpoint hash is pending the single harness commit containing this report and will be reported after verification, without amendment.

- Verified the approved repository/Git root as `<PROJECT_REPO>`, on `codex/work-intake-routing`, no upstream, `origin` configured; no remote operation.
- Started from the verified clean WIR17 checkpoint `fe4f685ab2f1d7e7cf654201dd90bf4f0bdbc262`. Verified passing WIR14 and WIR16 dependency reports and inspected current generic execution and Issue service contracts.
- Governing architecture SHA-256 remains `a34cb1640617beb1d117f00eab606ce37fd39e95e0ab64805176cfd6fe766f30`. RCA ownership, generic topology, explicit validation/close, and preserved Issue identities govern this implementation. No future card was loaded.
- Inspected existing characterization, Fix/Repair, aggregate validation/close tests and capability-map entries. No unrelated changes were present.

## Attributable files

Created:

- `src/main/planExecution/issueExecutionPlan.ts`
- `src/main/planExecution/issueExecutionAdapter.ts`
- `docs/implementation-bundles/work-intake-routing/Implementer_Reports/WIR18_IMPLEMENTER_REPORT.md`

Modified:

- `src/main/issueResolution/issueResolutionService.ts`
- `src/main/planExecution/planExecutor.ts`
- `src/main/workPlanning/workIssueRoutingService.ts`
- `src/renderer/app/WorkIssuePanel.tsx`
- `src/shared/issueResolutionContracts.ts`
- `src/shared/planExecutionContracts.ts`
- `test/characterization/desktop-issue-lifecycle.test.cjs`

Deleted files: none. Removed the superseded Issue-only dependency and next-candidate selection logic. Intentionally not created: separate Issue executor, replacement RCA, Development parent identities, legacy planning files for native routed corrections, JSON sidecars, Git checkpoint product behavior, release behavior, or a new runtime/dependency.

## Implementation and acceptance evidence

- Existing Issue artifact readers classify original Fix/Repair contract, report, validation and durable close evidence. The adapter translates those facts into the same `projectPlanExecution` used by Development. Candidate selection and implementation actions now respect generic dependency/Phase barriers and active-item conflicts; the existing Issue vocabulary and workspace steps remain projections.
- Existing approved Fix Card Maps execute directly without artificial Phases. Native WIR14 correction Plans activate through the existing main/preload routed Issue action. Activation verifies the current approved Plan, distinct RCA and its source graph, then writes one canonical Markdown execution binding with stable Work Item-to-Fix Card identities. Repeated activation is idempotent. Existing legacy planning is not silently replaced.
- Native Plans retain their direct/phased topology, Work Item dependencies and acceptance criteria. Fix/Repair artifacts retain Issue/Fix identities; no Development parentage is fabricated. Phase criteria are visible in the routed Issue panel. Explicit Operator Phase acceptance requires current closed children, accepted prerequisite Phases, bounded evidence notes and an exact presented execution fingerprint.
- Phase acceptance records bind the approved Plan, execution mapping, prerequisite Phase acceptance and child close bytes. Changed source bytes invalidate acceptance even if revisions remain unchanged. Aggregate Issue validation requires all current Phase acceptances and includes those records in its exact source basis. Its canonical source-order validator recognizes both existing legacy and native correction evidence.
- Generic parent Plan completion additionally requires current Approved aggregate Issue validation. Final Issue close remains the established separate explicit action; child close and Phase acceptance never silently close the Issue. Existing Repair lineage, controlled drafts, report reservation, individual validation, and durable close readers remain authoritative.
- RCA is still independently investigated/reviewed through its existing service. No generic lifecycle action rewrites investigation evidence. Changed Plan/source content fails closed rather than reinterpreting prior execution identities or replacing evidence. Execution activation is bound to the approved Plan revision; this card does not silently migrate an already activated Plan to a changed topology.
- Extended the existing direct lifecycle characterization to assert generic direct topology. Added one production main/preload routed phased case for the uncovered native Plan-to-Fix boundary, Phase dependency enforcement, controlled Fix drafting, exact/stale Phase evidence, aggregate validation and explicit close. Curated normal close records exercise the existing reader; unchanged focused Fix/Repair tests supply actual implementation/validation/close write-path coverage.

## Validation

| Exact command | Execution lane | Result |
| --- | --- | --- |
| `npm run typecheck` | Restricted Windows | Exit 0 after correcting initial adapter typing |
| `npm run build` | Approved normal Windows | Exit 0 |
| `node --test --test-concurrency=1 test/characterization/desktop-issue-lifecycle.test.cjs test/issue-resolution/issue-fix-card-service.test.cjs test/issue-resolution/issue-validation-service.test.cjs test/issue-resolution/issue-close-service.test.cjs` | Approved normal Windows | Exit 0; 38 passed, none failed/skipped |
| `git diff --check` | Read-only restricted Windows | Exit 0 |

Intermediate results: initial typecheck exit 1 identified a missing legacy topology rationale and unknown metadata identity type; corrected, then exit 0. First required regression run: 34 passed, three label-compatibility failures; preserved the established label. Second run with the new phased case: 37 passed, one native aggregate source-order failure; adapted the validator while preserving legacy order. Final rerun recorded above. Normal child-process execution follows the previously observed restricted `spawn EPERM`; no repeated restricted build attempt.

Test categories: required suites reused; existing direct characterization extended; one new permanent case added to the existing characterization file for the previously uncovered routed phased correction boundary. No consolidation, retirement, or capability-map changes. No full-suite, launch, visual, external-integration or packaging claims; bundle-wide regression remains WIR23. No manual acceptance required by this card.

## Checkpoint and safety

Intended message: `WIR18: Adapt Issue Correction Execution to Generic Plan Topology`. Exactly the ten files above are attributable. Harness owns staging/commit; shell Git is read-only. No amendment, merge, push, tag, release, or publication.

Exact staged diff inspected; `git diff --cached --check` and bounded credential/private-key/home-path scan passed. Harness `pre_commit_scan` succeeded with only eight unchanged, unstaged baseline branding PNG warnings, none attributable to this card. Final report edit re-inspected after staging. Durable references are relative; no secrets, concrete local paths, generated/dependency artifacts, or archive runtime imports introduced. Generated build output remains ignored and excluded.

## Next action

After focused acceptance and the verified single checkpoint, read WIR19 and required dependency reports. Preserve the separation between per-card evidence and final Operator bundle review. No new product decision or architecture contradiction identified.
