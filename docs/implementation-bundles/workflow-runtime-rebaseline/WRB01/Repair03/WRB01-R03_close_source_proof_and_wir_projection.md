# WRB01-R03 — Close Source-Proof Ordering and Source-Neutral WIR Projection

**Parent bundle:** WRB01 — Current Project Runtime Foundation
**Starting checkpoint:** afc56ee455413dd74f76377da3d40cff04be7652
**Implementer:** GPT 6.0 Luna Medium

## Objective
Close the two remaining Repair02 integration misses without changing the accepted WRB01 architecture.

## 1. Existing Project source capability is attached only after source proof

Refactor `project:registerCurrent` Existing Project sequencing.

Required sequence:
1. inspect path presence only to classify `no source candidate`, `conventional candidate`, `managed candidate`, or incomplete/conflicting candidate;
2. incomplete managed topology still fails before Current Project mutation;
3. register the Project container with Agent Harness;
4. if there is a conventional or managed source candidate, call `establishManagedProjectSource` with the canonical Repository ID before attaching source capability to SPS;
5. only after managed source establishment/verification succeeds, call `registerCurrentProject(..., { sourceRepositoryId: CURRENT_PROJECT_REPOSITORY_ID })`;
6. if there is no source candidate, call `registerCurrentProject` without a source Repository.

Do not treat path existence alone as proof of source backing.

Failure of conventional/managed source validation on a fresh Project must leave `selectedCurrentProjectId(root) === null` and must not create a source-repository ProjectResource.

If physical managed establishment succeeds but SPS registration subsequently fails, retain the established managed source as retryable infrastructure. A later Existing Project entry must verify/re-register the existing topology and complete Current Project registration.

Existing already-current Projects remain idempotent under the same sequence.

### Permanent proof
Extend current-project-entry proof with:
- malformed conventional Git candidate fails before Current Project registration;
- redirected/non-exact candidate fails before Current Project registration where the platform fixture can prove it deterministically;
- superficially complete but invalid managed topology fails before Current Project/source registration;
- valid conventional and valid existing-managed Projects still register one Repository resource after source proof;
- non-Git Existing Project still registers zero Repository resources.

## 2. Structured WIR projection treats source as optional evidence

Remove managed Dev pre-resolution from the `workIntake:projection` IPC handler. It should identify the Current Project and call the structured projection service; it must not make Git availability a prerequisite for opening Work Intake.

In `getStructuredWorkIntakeProjection`:
- resolve the optional Repository identity;
- when no Repository exists, return empty branches/currentBranch/suggestedBase as today;
- when a Repository exists, attempt to use an explicitly supplied repositoryRoot or resolve managed Dev;
- if checkout resolution or branch inspection fails, degrade only the source evidence to `branches: []`, `currentBranch: null`, `suggestedBase: null`;
- keep `blockedReason: null` so Save remains governed by intake form validity, not Git availability;
- do not fabricate a Repository ID;
- do not change Source Control fail-closed behavior.

`captureStructuredWorkIntake` and retry remain `source: { state: "not-applicable" }` and must not invoke Git.

### Permanent proof
Add focused proof that a source-backed Current Project with unavailable/invalid managed Dev:
- still returns a valid structured Work Intake projection;
- exposes its semantic Project/Repository identity but no branch/base evidence;
- has blockedReason null;
- can save multiple Work Intakes;
- each saved intake remains source not-applicable;
- performs no Work Intake source branch/materialization.

Retain proof that a healthy managed Dev contributes dev branch/base evidence.

## 3. Qualification
Run build and focused WRB01 proof for Current Project entry/registration, managed source adoption, structured Work Intake capture/projection, Hub capability, Source Graph, and capability-map integrity.

Preview the exact affected plan. Do not run a broad historical multi-minute profile merely because dependency metadata selects it; record the preview and focused owned evidence honestly.

Update `WRB01-05_BUNDLE_QUALIFICATION_REPORT.md` with the R03 checkpoint/evidence and write `Repair03/WRB01-R03_FINAL_REPORT.md`.

## Non-scope
Do not redesign WIR routing, Workflow Hub inventory, Workflow creation, Source Graph semantics, source materialization, checkpoint/integration ownership, or begin WRB02.

## Checkpoint and stop
Create one checkpoint commit: `WRB01-R03 close source proof and source-neutral intake boundary`. Then STOP for Architect review.