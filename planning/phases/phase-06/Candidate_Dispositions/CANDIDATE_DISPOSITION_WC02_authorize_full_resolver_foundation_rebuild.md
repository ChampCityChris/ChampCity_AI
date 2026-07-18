<!-- champcity-artifact-envelope
{"artifactId":"champcity-ai/phase-06/candidate_disposition/WC02","artifactType":"candidate_disposition","createdAt":"2026-07-18T02:52:00.000Z","jsonPath":"planning/phases/phase-06/Candidate_Dispositions/CANDIDATE_DISPOSITION_WC02_authorize_full_resolver_foundation_rebuild.json","markdownPath":"planning/phases/phase-06/Candidate_Dispositions/CANDIDATE_DISPOSITION_WC02_authorize_full_resolver_foundation_rebuild.md","parentArtifactId":"champcity-ai/phase-06/work_card/WC02","payload":{"kind":"candidate_disposition","title":"Architect Disposition: Phase 06 WC02 Requires Full Resolver Foundation Rebuild"},"payloadHash":"sha256:64e04ce57e64b5b34da005f1673ce0756742687225220c97263b098549715b46","phaseId":"phase-06","projectId":"champcity-ai","relationships":{"children":[],"expectedOutputs":["champcity-ai/phase-06/work_card/WC02-REPAIR03"],"sources":["champcity-ai/phase-06/diagnostic_report/WC02-full-workflow-resolver-foundation-top-to-bottom-review","champcity-ai/phase-06/operator_validation/WC02","champcity-ai/phase-06/work_card/WC02","champcity-ai/phase-06/work_card/WC02-REPAIR02"],"supersedes":[]},"revision":1,"schemaVersion":"champcity.artifact.v1","status":"active","updatedAt":"2026-07-18T02:52:00.000Z","workCardId":"WC02"}
-->

# Architect Disposition: Phase 06 WC02 Requires Full Resolver Foundation Rebuild

Status: repair_required
Phase: phase-06 — Workflow Kernel and Artifact Protocol Replacement
Parent Work Card: WC02
Disposition owner: Architect
Decision: authorize WC02-REPAIR03

## Validation Disposition

WC02-REPAIR02 passed its bounded migration and repository-folder naming correction.

The same Operator validation demonstrated that parent WC02 remains unresolved because the live application still routes to WC02-REPAIR01 Work Card authoring and Ad Hoc Work Card Capture.

The additional observation is blocking for parent WC02 but does not reverse the WC02-REPAIR02 pass.

## Architect Review Result

The top-to-bottom review confirms that the failure is systemic. Workflow semantics are duplicated across resolver, transition, IPC, route, projection, and renderer modules. The existing foundation is not suitable for another narrow repair.

## Authorized Follow-Up

Authorize:

`champcity-ai/phase-06/work_card/WC02-REPAIR03`

WC02-REPAIR03 is one comprehensive rebuild and absorbs the previously planned resolver-foundation scopes of WC03 through WC06.

## Parent Candidate State

- WC02-REPAIR01 remains passed.
- WC02-REPAIR02 remains passed.
- Parent WC02 remains unresolved.
- WC02-REPAIR03 is the active authorized repair.
- No later candidate or phase closeout is authorized until WC02-REPAIR03 is reviewed, validated, and dispositioned.

## Expected Output

`champcity-ai/phase-06/work_card/WC02-REPAIR03`
