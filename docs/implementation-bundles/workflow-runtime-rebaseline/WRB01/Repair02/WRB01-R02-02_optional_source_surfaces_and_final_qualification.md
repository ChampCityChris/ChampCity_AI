# WRB01-R02-02 — Complete Optional-Source Surfaces and Final WRB01 Qualification

**Depends on:** WRB01-R02-01 checkpoint
**Implementer:** GPT 6.0 Luna Medium

## Objective
Make the currently reachable Current Project surfaces respect optional source backing, fix local-only Git adoption, finish the deferred WIR source-neutral seam, and requalify WRB01.

## 1. Local Git requires no remote
In `managedProjectSourceService`, an empty successful `git remote -v` result is valid.

Reject only command failure/null, not empty stdout. Preserve the exact empty remote set through adoption.

Permanent proof: conventional local repository with main, optional dev, zero remotes adopts successfully and remains zero-remotes afterward.

## 2. Runtime source capability
`CurrentProjectRuntimeContext.repositoryId` must be nullable (or use an equivalently explicit optional-source contract). Do not return a fabricated repository ID for a non-source-backed Current Project.

The main-process Current Project registration response resolves repository identity from the separate optional source resource created by R02-01.

## 3. Hub capability exposure
Source Control is a first-class page only when source-control infrastructure exists.

Pass explicit source capability to `WorkflowHubWorkspace`.

For a non-source-backed Current Project:
- do not render an actionable Source Control card/button;
- do not attempt managed Dev resolution merely to render/open the Hub.

For a source-backed Current Project, Source Control behavior remains the repaired managed-Dev path.

Do not restore legacy Development/Issue cards.

## 4. Work Intake/WIR remains usable without source
WIR is source-neutral and owns no SourceLine. Correct the remaining transitional SourceReadiness representation.

Add a source readiness state that means source is not applicable to this routing Workflow. It must not require repositoryId.

Structured Work Intake capture and retry return source-not-applicable for WIR regardless of whether the Project is Git-backed. They must not report WIR as `unprepared` source work.

`getStructuredWorkIntakeProjection()` must:
- read branch/base evidence from managed Dev when an optional source Repository exists;
- return an otherwise valid structured projection with empty branches/currentBranch/suggestedBase when no source Repository exists;
- never require a fabricated repository ID;
- continue to save Work Intake intent without source cleanliness or source availability as an authority gate.

Update `WorkProjectIdentity.repositoryId` and related structured projection types to represent optional repository identity accurately.

The temporary Work Intake UI may continue to show source state text, but it must not present retry/source-preparation controls for source-not-applicable WIR.

## 5. Source Graph fail-closed behavior
Source Graph IPC is only available for source-backed Current Projects. Resolve repository identity through the R02-01 source helper and managed Dev through the existing resolver.

If invoked programmatically for a non-source-backed Current Project, return/fail with bounded source-unavailable behavior. Do not fall back to `selected-repository`.

Ambiguous/invalid Current Project registration must not silently degrade to a fabricated repository identity.

Conventional single-root Source Graph fixtures may retain their explicit internal compatibility path; the Current Project desktop path may not.

## 6. Qualification and lingering legacy fixture
Update or retire the remaining `source-lifecycle-package.test.cjs` expectation that WIR owns/prepares source. The permanent proof must reflect the accepted architecture: WIR source is not applicable; the substantive target Workflow owns SourceBaseline/SourceBinding/materialization.

Run focused WRB01 qualification covering:
- Current Project identity/entry;
- non-Git Existing Project registration and Hub;
- source-backed Greenfield and Existing Project entry;
- remote-less and main/dev adoption;
- managed Source Graph/revision detail;
- source-neutral structured Work Intake capture/projection;
- no legacy Hub recovery;
- capability-map integrity.

Preview the exact repair validation plan. Do not repeatedly run a broad multi-minute historical suite merely because dependency metadata selects it. Run the focused owned proof and any bounded selected lanes; record broader deferred selection honestly.

Update `WRB01-05_BUNDLE_QUALIFICATION_REPORT.md` with R02 checkpoints and final evidence. Write `Repair02/Reports/WRB01-R02-02_FINAL_QUALIFICATION_REPORT.md`.

## Stop boundary
Create one checkpoint commit: `WRB01-R02-02 complete optional source foundation and qualify WRB01`. Then STOP. Do not begin WRB02. Human Architect performs final WRB01 review.