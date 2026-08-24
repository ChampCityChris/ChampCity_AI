# RECONSTRUCTION-REPAIR01-REPAIR06B — Phase-00 WC01 Verify-Before-Dependency-Restore Contract Correction

## Repair Type

Temporary reconstruction repair correcting the defective Approved Phase-00 Work Card contract that failed during its first real implementation run.

This repair changes the Work Card artifact and resets its untouched Implementer Report scaffold so the corrected Work Card returns to normal Operator review. It does not redesign Codex execution authority; REPAIR06A owns that prerequisite.

## Governing Standard

`planning/project/Design_Documents/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md`

## Prerequisite

RECONSTRUCTION-REPAIR01-REPAIR06A must pass Architect review before this repair is implemented.

Do not retry Phase-00 WC01 between REPAIR06A and REPAIR06B.

## Parent Work Card / Failed Evidence

Parent Work Card:

`planning/phases/phase-00-baseline-ground-zero/Work_Cards/phase-00-wc-01-development-readiness_verify_and_establish_current_build_development_readiness.md` revision 1

Reserved Implementer Report:

`planning/phases/phase-00-baseline-ground-zero/Implementer_Reports/IMPLEMENTER_REPORT_phase-00-wc-01-development-readiness_verify_and_establish_current_build_development_readiness.md` revision 1

Operator live failure:

- The Work Card entered implementation.
- The execution attempted dependency/environment work and then moved toward closing Electron processes.
- The running ChampCity A/I Electron host terminated.
- The repository dependency tree was left damaged enough that repository-local `tsc` was no longer resolvable by `npm run build` until dependencies were manually restored while ChampCity was not using that tree.
- The Implementer Report remained the untouched Pending reserved scaffold.

## Confirmed Contract Defect

The parent Phase-00 planning candidate says dependency bootstrap is required **when required**:

```text
... establish repository dependency readiness through the existing package.json/package-lock.json npm bootstrap when required.
```

The Formal Work Card revision 1 changed that bounded intent into an unconditional operation:

```text
the first successful execution of this Work Card must run npm ci once
existing node_modules presence is not sufficient evidence
```

and AC6 similarly requires the first successful baseline execution to run `npm ci`.

That is an Architect contract defect. `unverified` dependency state was treated as `known invalid` dependency state.

A nontechnical Operator cannot be expected to identify that distinction or correct it during implementation.

## Required Architecture

The corrected contract is:

```text
UNVERIFIED
→ verify semantically

VERIFIED READY
→ do not restore

VERIFIED NOT READY
→ restore from repository authority
→ re-verify

RESTORE CONFLICTS WITH RUNNING PROCESS
→ use REPAIR06A approval/control boundary
→ never silently terminate a process

RESTORE WOULD REQUIRE TERMINATING CHAMPCITY CONTROL PLANE
→ block this execution path
→ do not terminate ChampCity
```

`npm ci` remains the authoritative npm restoration command when restoration is actually required. It is not the proof step for an already-valid dependency tree.

## Repair Objective

After repair:

1. The current Formal Work Card becomes substantive revision 2 and returns to `Pending` for Operator review.
2. The body requires verify-first dependency readiness and `npm ci` only when verification demonstrates restoration is required.
3. The Work Card does not ask the Operator to know whether Node/npm/dependencies are installed correctly.
4. The stale revision-1 reserved Implementer Report scaffold is removed only after proving it contains no substantive implementation evidence.
5. After Operator approval of Work Card revision 2, ChampCity can create a fresh Implementer Report sourced to revision 2 through the existing application path.

## Authorized Scope

### 1. Revise the existing Formal Work Card through the canonical writer

Exact target:

`planning/phases/phase-00-baseline-ground-zero/Work_Cards/phase-00-wc-01-development-readiness_verify_and_establish_current_build_development_readiness.md`

Use the existing production helper:

`updateCanonicalMarkdownSubstantiveRevision()` from `src/main/documents/canonicalMarkdownDocumentWriter.ts`.

Do not hand-edit canonical metadata.

Required metadata result:

```text
artifactRevision: 2
identity: unchanged
sourceRevisions: unchanged
workflowData: unchanged
documentDisposition.status: Pending
documentDisposition.notes: ""
documentDisposition.reviewedAt: null
```

The canonical writer already owns this substantive-revision transition. Do not invent another revision mechanism.

### 2. Make only these substantive Work Card corrections

Preserve all existing sections, machine requirements, scope, and validation intent except the dependency-readiness sequencing below.

#### Objective

Replace the unconditional restore framing with:

```text
Verify repository dependency readiness against the current package.json/package-lock.json authority, restore with npm ci only when semantic verification demonstrates restoration is required, and then prove the resulting dependency/build readiness.
```

#### Runtime Sequence

Replace the current mandatory `npm ci` step with this exact decision sequence:

1. After application-owned machine preflight is `ready`, record `git --version`, `node --version`, and `npm --version`.
2. Record pre-readiness hashes of `package.json` and `package-lock.json`.
3. Run `npm ls --depth=0` as the first repository dependency readiness check.
4. If `npm ls --depth=0` exits 0, classify the dependency tree as already ready and **do not run `npm ci`** merely because dependency state had previously been unverified.
5. If `npm ls --depth=0` proves missing/inconsistent repository dependencies, use `npm ci` as the lockfile-authoritative restore command.
6. If restoration encounters or would require process termination, do not terminate processes autonomously. Use the REPAIR06A execution approval/control boundary. If the conflict is the active ChampCity control plane, leave the Work Card incomplete/blocked for that execution mode rather than terminating ChampCity.
7. After any required `npm ci`, rerun `npm ls --depth=0` and require exit 0.
8. Record post-readiness `package.json` / `package-lock.json` hashes and require byte identity with the pre-readiness hashes.
9. Record `git status --short` and distinguish pre-existing state from Work Card effects.
10. Continue with the existing focused build/test validation only after dependency readiness is proven.

#### Required Changes

Change the numbered repository-bootstrap instructions to the same verify-first sequence above. `npm install` remains forbidden. `npm ci` remains the only authorized npm restore command when restore is required.

#### Risks and Constraints

Add/replace the dependency-runtime risk with this explicit rule:

```text
A repository dependency restore may conflict with a running application that is using the same dependency tree. The Implementer must not resolve that conflict by silently terminating processes. Process-control decisions are governed by the application execution authority and Operator approval boundary.
```

#### Acceptance Criteria

Replace the current AC6 requirement that the first successful execution always run `npm ci` with:

```text
Repository dependency readiness is semantically established from the current lockfile authority. npm ls --depth=0 is run first. If it succeeds, no restore is performed. If it fails because repository dependencies are missing/inconsistent, npm ci is used once as the authorized restore and npm ls --depth=0 then succeeds. package.json and package-lock.json remain byte-identical in either path.
```

Extend the existing safe-failure AC to require that a dependency restore must not silently terminate a running process and must obey the REPAIR06A execution approval/protected-process boundary.

#### Implementer Report Requirements

Change the report requirement from unconditional `npm ci` evidence to:

- record the initial `npm ls --depth=0` result;
- state whether restore was required and why;
- if restore was not required, explicitly record `npm ci: not run — existing dependency tree verified ready`;
- if restore was required, record the exact `npm ci` command/result and post-restore `npm ls --depth=0` result;
- record any runtime/process conflict and resulting Operator approval/denial/blocker evidence.

### 3. Remove only the stale untouched report scaffold

Exact report:

`planning/phases/phase-00-baseline-ground-zero/Implementer_Reports/IMPLEMENTER_REPORT_phase-00-wc-01-development-readiness_verify_and_establish_current_build_development_readiness.md`

Before deletion, prove all of the following:

```text
artifactType = implementer-report
artifactRevision = 1
documentDisposition = Pending
sourceRevisions = exactly parent Work Card revision 1
body remains the reserved "Status: Pending Implementer completion." scaffold
workflowData contains no substantive implementation evidence
```

Only if every condition is true, delete this report file after installing Work Card revision 2.

This deletion is explicitly authorized because the file is an unused application-reserved scaffold whose source revision is no longer current. Do not delete or rewrite a substantive Implementer Report.

After Operator approves Work Card revision 2, the existing `buildApprovedFormalWorkCardAndReportDocuments()` / report-registration path must create a fresh report sourced to revision 2.

## Acceptance Criteria

### AC1 — Canonical revision is correct

The actual Work Card parses through the production canonical parser as:

```text
artifactRevision = 2
documentDisposition = Pending
identity unchanged
sourceRevisions unchanged
workflowData unchanged
```

### AC2 — Unverified no longer means reinstall

The Work Card contains no instruction that `npm ci` must run merely because dependency state had not previously been evidenced.

Search proof must show the removed concepts are absent, including the prior sentence:

```text
the first successful execution of this Work Card must run npm ci once
```

### AC3 — Verify-first ready path is explicit

The Work Card requires initial `npm ls --depth=0`, and successful exit 0 explicitly means `npm ci` is not run.

### AC4 — Restore path remains deterministic

When initial dependency verification fails because repository dependencies are missing/inconsistent:

```text
npm ci
→ npm ls --depth=0
→ success required
```

No `npm install`, dependency update, alternate package manager, or lockfile rewrite is authorized.

### AC5 — Process conflict is not solved by autonomous termination

The corrected Work Card explicitly defers process-control decisions to the REPAIR06A execution approval/protection boundary and forbids silent process termination.

### AC6 — Parent planning intent is preserved

The current candidate purpose in Work Card Plan remains unchanged and still means npm bootstrap `when required`. Do not modify Phase Planning, Work Card Plan, Phase Interview, Project Profile, or Project Roadmap.

### AC7 — Old report is proven disposable before deletion

Automated/direct verification proves the old report meets every reserved-scaffold condition before it is removed.

If it contains substantive evidence, stop and do not delete it.

### AC8 — Workflow returns to review cleanly

After correction and scaffold removal, production document/workflow resolution must treat the Work Card as Pending revision 2 rather than executable Approved revision 1.

The Operator must be able to review and approve revision 2 normally.

### AC9 — Fresh report registration remains production-owned

A focused fixture or production-service proof must show approval of a Pending revised Formal Work Card with no existing report creates a fresh Implementer Report whose sole source revision is that Work Card's current revision.

### AC10 — No implementation retry in this repair

Do not execute Phase-00 WC01 as part of REPAIR06B implementation or automated validation. This repair ends at corrected Pending Work Card readiness for Operator review.

## Preserved Passed Behavior

Preserve:

- the exact `git` and `nodejs-lts` machine requirement block;
- application-owned preflight/provisioning authority;
- `npm ci` as the lockfile-authoritative restore command when restore is required;
- package/lockfile byte-identity requirement;
- focused build/test expectations;
- scope-expansion behavior for genuinely new machine requirements;
- REPAIR06A execution authority and approval behavior;
- all Project/Phase planning artifacts unchanged;
- no Git mutation unless separately authorized.

## Forbidden Changes

Do not:

- remove `npm ci` entirely from the Work Card;
- replace it with `npm install`;
- assume dependencies are ready because `node_modules` exists;
- require the Operator to determine Node/npm/dependency installation state manually;
- special-case only ChampCity repository identity;
- modify package.json or package-lock.json;
- modify Phase Planning, Work Card Plan, Phase Interview, Project Profile, or Project Roadmap;
- hand-edit canonical metadata;
- leave Work Card revision 2 Approved without Operator review;
- retain the stale revision-1 report scaffold after proving it is disposable;
- delete a substantive report;
- run the corrected Work Card during this repair;
- stage/commit/push/branch-mutate unless separately authorized.

## Required Files / Areas to Inspect

At minimum:

- parent Work Card exact path above;
- parent reserved Implementer Report exact path above;
- `planning/phases/phase-00-baseline-ground-zero/Work_Card_Plan.md` for preserved candidate purpose only;
- `src/main/documents/canonicalMarkdownDocumentWriter.ts`;
- `src/shared/documents/canonicalMarkdown.ts`;
- `src/main/workCardBuilding/workCardBuildingReviewService.ts`;
- `test/work-card-building/work-card-building-review-service.test.cjs`;
- relevant canonical-document tests only if needed for revision proof.

## Focused Validation

Required:

```text
npm run typecheck
npm run build
node --test --test-concurrency=1 test/work-card-building/work-card-building-review-service.test.cjs test/documents/canonical-markdown-document.test.cjs
```

Also perform direct production-parser/service proof on the actual corrected Work Card and report paths for AC1, AC7, and AC8.

Do not run the full historical suite by default.

## Required Implementer Report

Write:

`repair/Implementer_Reports/IMPLEMENTER_REPORT_RECONSTRUCTION_REPAIR01-REPAIR06B_phase00_wc01_verify_before_dependency_restore_contract_correction.md`

Include:

- parent Work Card/report identity;
- exact failed Operator evidence;
- exact unconditional-restore clauses removed/replaced;
- proof candidate purpose already said `when required`;
- canonical revision before/after;
- proof old report was still reserved scaffold before deletion;
- files changed/deleted;
- focused commands/results;
- final workflow state;
- confirmation Phase-00 WC01 was not rerun;
- confirmation no Git mutation.

## Operator Live Validation

After Architect review:

1. Open the corrected Phase-00 WC01 in ChampCity.
2. Verify it is revision 2 and Pending for review.
3. Confirm the dependency sequence says verify first and `npm ci` only when restore is required.
4. Approve the corrected Work Card if acceptable.
5. Verify ChampCity creates a fresh Pending Implementer Report sourced to Work Card revision 2.
6. Only after REPAIR06A and REPAIR06B have both passed may the Operator retry `Run Codex Implementer` for Phase-00 WC01.

## Return Path

Return for Architect review, then Operator review/re-approval of Work Card revision 2. A successful REPAIR06B does not itself complete Phase-00 WC01.
