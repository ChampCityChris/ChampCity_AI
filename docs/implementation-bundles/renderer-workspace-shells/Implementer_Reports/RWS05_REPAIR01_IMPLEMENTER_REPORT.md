# RWS05-REPAIR01 Implementer Report

Repair type: source-level production defect. Implementation and focused proof complete; broader work-item qualification has unrelated failures recorded below.

## Repository and scope

Verified `Dev` as the approved repository root using its Git metadata, package manifest and AGENTS.md. Branch: `dev`; configured fetch/push remote: `origin`, ChampCityChris/ChampCity_AI. No push, merge, release or branch changes performed. Existing unrelated tracked and untracked changes were preserved and excluded from staging.

## Root cause and implementation

The production service generated workflow-specific JSON templates but wrapped them in universal Greenfield array instructions, Feature dimension guidance and Project Planning Direction requirements. Following that prose could produce output rejected by the selected typed validator.

Production files modified:

- `src/shared/architectWorkspaceContracts.ts`: added `architectCandidateHandoffContract`, colocated with validators; moved workflow-specific templates and contract prose here. Extracted unchanged numeric validator limits into a shared constant consumed by prose and validation. Section keys come from the same existing section definitions used by validation and templates. Greenfield transport prose describes the actual serialized-array sum rather than imposing a new whole-object limit.
- `src/main/architectOutputs/structuredArchitectWorkspaceService.ts`: consumes the shared helper; removes contradictory universal output instructions. Identity, provenance, SQL context/Evidence, repository inspection, governing architecture and SourceBaseline context remain shared. Ground-zero and Project Planning Direction guidance are now Greenfield-specific.

Other files:

- Modified `test/workflow/workflow-application-service.test.cjs`.
- Created this report.
- No files deleted. No new permanent test file, prompt registry, dependency, migration, schema, renderer or Planning implementation created or changed.

Validation behavior, semantic mappings, atomic persistence, review cycles, Operator Decisions, provenance/currentness, legacy adoption, Evidence linkage, Markdown projection authority and discovery rules remain unchanged. No production scope expansion.

## Owned proof

Inspected existing workflow tests and `validation/capability-map.json` ownership before extending proof. Added a reusable assertion inside the existing stable workflow owner, called by existing production service tests. It reads the actual handoff, parses its authoritative JSON template, verifies prose/keys/value shapes/bounds, validates representative output and rejects a different workflow's shape. Issue proof substitutes a real supplied Evidence ID and persists the resulting template through the production service.

| Workflow | Actual production handoff proof | Result |
| --- | --- | --- |
| Project Creation | Exact fifteen keys; arrays of 1-32 strings, 4000 bytes each; 200 items; serialized-array transport sum; 4096-byte joined Planning direction; no scalar/RCA contract | Pass |
| Feature | Exact seven scalar keys; 4096 bytes; total transport; all seven required; no Greenfield/RCA requirements | Pass |
| Issue Resolution | Exact rootCauses object; 1-12 candidates; bounded title/statement/rationale, optional confidence; unique bounded IDs; supplied-reference persistence requirement; actual Evidence citation | Pass |
| Refactor/Migration | Exact assessment keys, scalar values, 4000 bytes, transport; no Feature/Greenfield/RCA requirements | Pass |
| Integration/Composition | Exact assessment keys, scalar values, 4000 bytes, transport; no Feature/Greenfield/RCA requirements | Pass |
| Infrastructure/Platform | Exact assessment keys, scalar values, 4000 bytes, transport; no Feature/Greenfield/RCA requirements | Pass |
| Research/Prototype | Exact assessment keys, scalar values, 4000 bytes, transport; no Feature/Greenfield/RCA requirements | Pass |

Every workflow's representative output passes `validateArchitectCandidateOutput`; cross-workflow output remains rejected. Existing tests retain candidate persistence, partial-transaction rollback, review freshness, exact-cycle decisions, SQL authority over edited projections, legacy adoption, Evidence linkage and Planning readiness proof. No coverage gap required a new test owner.

## Validation commands and results

Temporary `tmp/rws05-r01-changes.json` names exactly the two production files, existing test owner and this report. Temporary inputs, logs and machine receipts remain uncommitted.

| Command | Lane | Result |
| --- | --- | --- |
| `node scripts/validation/cli.cjs preview --profile work-item --changes tmp/rws05-r01-changes.json` | Restricted Windows, read-only planner | Exit 0; 63 files selected |
| `node scripts/validation/cli.cjs run --profile work-item --changes tmp/rws05-r01-changes.json` | Restricted Windows | Exit 1; build launch hit `spawn EPERM`; downstream tests blocked, not source failures |
| Same work-item command | Approved normal Windows | Exit 1; build passed; 487 tests, 466 passed, 21 failed, zero skipped; source stable. Duration 298523 ms, advisory budget exceeded |
| `npm run build` | Approved normal Windows | Exit 0 on final source after correcting encoding artifacts in newly added range text |
| `node --test --test-concurrency=1 test/workflow/workflow-application-service.test.cjs` | Approved normal Windows, final build | Exit 0; 28 passed, zero failed/skipped; final run 27105 ms. Includes all seven production handoff checks and preserved structured Architect workflow proof |
| `git diff --check` | Restricted Windows | Exit 0 |

The composed profile also passed Architect interview workspace (14), draft ingestion (8), prompt contracts (10), output workspace repair (26), and selected Architect renderer proofs. The final change after that profile was an encoding-only correction in new prose and matching assertions; the final build and entire modified owner were rerun. Full/release qualification and visual acceptance were not required by this bounded repair.

## Failures outside the repair

The wider profile is not green. These failures are outside the modified handoff/validator path and were not repaired. The checkout already contained unrelated ongoing changes; no clean-baseline rerun was performed, so pre-existence of every failure is not independently established.

| File | Failed count | Observed diagnostic |
| --- | --- | --- |
| `test/agent-harness/repository-io-hardening.test.cjs` | 1 | Workspace-only Git toolbox status assertion |
| `test/agent-harness/reserved-toolbox-namespace.test.cjs` | 2 | `create_branch_from_ref:repositoryCheckoutId` and placeholder status assertions |
| `test/project-intake/post-submit-review-state.test.cjs` | 1 | Null `projectId` during Work Intake capture |
| `test/project-planning/project-planning-service.test.cjs` | 1 | Missing IPC registration `workPlanning:status` |
| `test/project-state/execution-completion.test.cjs` | 6 | Required deterministic ValidationCatalog proof unavailable for source-neutral Workflow (counts include parent/subtest failures) |
| `test/source-control/managed-project-source.test.cjs` | 8 | Candidate repository preparation: Git exited unsuccessfully (counts include parent/subtest failures) |
| `test/source-control/workflow-integration-service.test.cjs` | 2 | Expected integrated, received failed |

## Safety, checkpoint and review

Only the four attributable files are staged for the card-required checkpoint. Staged diff reviewed; bounded secret/local-path/generated-artifact scan passed. No concrete local paths or credentials are included in the report. Generated build output, logs, receipts and the untracked input card remain outside the checkpoint.

Required commit message: `RWS05-R01 align architect handoffs with typed contracts`. Hash pending at report creation; returned after commit without amending solely to embed the hash.

No implementation deviations. The broader profile failures limit wider qualification, while focused repair acceptance proof passes. Remaining task: source-code review of this checkpoint; separate ownership should address the wider failures. No manual visual validation is needed for this contract-only repair.
