<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "architect-report",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "phaseId": "phase-08",
    "workCardId": "WC40-REPAIR03",
    "repairId": "WC40-REPAIR03",
    "parentWorkCardId": "WC40"
  },
  "sourceRevisions": [
    {
      "path": "planning/phases/phase-08/Work_Cards/WC40-REPAIR03_repair_authority_revision_prompt_and_conflict_isolation.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Implementer_Reports/IMPLEMENTER_REPORT_WC40-REPAIR03_repair_authority_revision_prompt_and_conflict_isolation.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-08/Architect_Reports/ARCHITECT_REVIEW_WC40-REPAIR02_single_resolution_state_projection_and_repair_identity.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "title": "Architect Review — WC40-REPAIR03 Repair Authority, Revision Prompt, and Conflict Isolation Closure",
    "reviewResult": "RevisionRequested",
    "returnTarget": "WC40",
    "architectOwnedTestSha256": "c10562b8f3c94a5abe35d6d04f96a60bcf8a7894499b20081ad2f4f6c8890409",
    "acceptedCorrections": [
      "immutable Architect test baseline preserved",
      "Formal and Repair revision instructions delivered",
      "non-Approved Repair output authority comparison expanded",
      "origin evidence and return mapping enforced",
      "valid Repair conflict isolation improved",
      "Phase Map promotion failure projected"
    ],
    "blockingDefects": 2,
    "proofDefect": true,
    "reportedValidation": {
      "preChangeFocused": "10 passed, 4 failed",
      "postChangeFocused": "14 passed, 0 failed",
      "completeTests": "196 passed, 0 failed",
      "typecheck": "passed",
      "typescriptBuild": "passed",
      "viteBuild": "passed in approved normal Windows lane"
    }
  },
  "documentDisposition": {
    "status": "RevisionRequested",
    "notes": "WC40-REPAIR03 preserves the Architect-owned tests and correctly delivers revision notes, validates non-Approved Repair outputs, isolates valid conflicts, and projects Phase Map promotion failure. It remains incomplete because Approved Repair Work Cards bypass exact authority validation and can be treated as completed when orphaned or mismatched, while malformed Repair handoffs still expose raw unvalidated evidence paths that can redirect an unrelated RevisionRequested document into Repair. The green tests do not cover either path.",
    "reviewedAt": "2026-08-02"
  }
}
CHAMPCITY-METADATA -->

# Architect Review — WC40-REPAIR03

Disposition: `RevisionRequested`  
Parent: `WC40` remains unresolved  
Git mutation: none

## Review Boundary

ChampCity MCP was used to inspect the approved REPAIR03 Work Card, Implementer Report, immutable Architect-owned test file, Formal and Repair prompt builders, exact Repair resolver, generic Architect-output workspace projection, Current Workflow conflict routing, Phase Map promotion-failure projection, and repository status.

The Architect-owned test file remains byte-identical at:

```text
c10562b8f3c94a5abe35d6d04f96a60bcf8a7894499b20081ad2f4f6c8890409
```

## Accepted Corrections

The following implementation is valid and must be preserved:

- the Implementer did not edit the Architect-owned acceptance tests;
- the reported pre-change run produced the four expected failures;
- Formal and Repair revision prompts now include the exact non-empty Operator instructions only for `RevisionRequested` outputs;
- non-Approved Repair output comparison now checks participation role, identity, workflow Repair fields, origin, evidence, bounded defect, return target, and exact ordered source revisions;
- pre-validation and post-validation evidence type and return-target mappings are enforced;
- orphan Pending Repair output becomes `not-ready` and valid unresolved-handoff conflicts become `needs-attention` without mutation;
- Current Workflow no longer redirects an unrelated Project Planning revision during the valid two-handoff conflict represented by the Architect test;
- Phase Map promotion failure is projected before project-close routing;
- the Implementer reports 14/14 focused tests and 196/196 complete tests passing;
- no production route family, hidden state, dependency, test modification, or Git mutation was introduced.

These accepted corrections are not rewritten as failures.

## Blocking Defect 1 — Approved Repair Outputs Bypass Exact Authority Validation

`resolveExactActiveRepairWorkCardContext()` defines active Repair outputs as:

```text
artifactType = repair-work-card
and disposition != Approved
```

An Approved Repair Work Card is therefore excluded before handoff selection and before `assertExistingRepairOutputMatchesContext()` executes.

When an Approved output exists at a Repair target, `selectHandoffForMissingRepairOutput()` finds no unresolved handoff and returns no context. The generic workspace overlay then contains an explicit exception:

```text
resolver = not-ready
classified state = completed
→ preserve completed instead of applying not-ready
```

Consequences:

- an Approved orphan Repair Work Card with no Approved owning handoff is displayed as `completed`;
- an Approved Repair Work Card with mismatched participation role, identity, origin, evidence, bounded defect, return target, or source revisions is also displayed as `completed`;
- exact Repair authority is enforced for Pending, RevisionRequested, and Rejected outputs, but not for Approved outputs;
- the code does not satisfy the Work Card requirement that an existing Repair Work Card agree with the complete owning handoff authority.

The resolver also does not re-establish several handoff/evidence requirements before treating authority as current:

- the Repair handoff itself is not required to have `participationRole=nonReviewHandoff` or matching `identity.handoffKind=repair`;
- the evidence type and source revision are checked, but the evidence is not required to remain `RevisionRequested`, even though that disposition is what authorizes Repair creation.

Required correction:

- separate output authority validation from the narrower question of which Repair requires preparation;
- validate every existing Repair Work Card, including Approved outputs, against exactly one current owning handoff;
- only a valid Approved Repair output may project `completed`;
- orphan Approved output must be `not-ready`; malformed, mismatched, duplicate, or conflicting Approved authority must be `needs-attention`;
- validate the owning Repair handoff role and identity and require the current source evidence to remain readable, fresh, and `RevisionRequested`;
- remove the completed-state bypass that suppresses failed authority resolution.

This blocks acceptance criteria 3, 4, 5, 6, and 14.

## Blocking Defect 2 — Conflict Routing Trusts Raw Malformed Handoff Claims

When Repair context resolution throws, `repairAuthorityEvidencePaths()` builds the non-ready result from raw values in every candidate handoff:

```text
handoff path
workflowData.evidencePath
workflowData.repairWorkCardTarget
active output paths
```

`repairModelForRevisionRequestedEvidence()` then routes the current document into Work Card Repair whenever its path appears in that array.

The path is treated as routing authority even when it is the field that caused validation to fail.

Failure example:

```text
Project Profile = RevisionRequested
malformed Approved Repair handoff claims evidencePath = Project Profile
origin says preValidationReportReview
Project Profile is not an Implementer Report
Repair resolver correctly returns needs-attention
raw evidencePaths still contains Project Profile
Current Workflow redirects Project Profile to work-card-repair
```

The Architect-owned conflict test uses two structurally valid Repair handoffs whose evidence paths are genuine Implementer Reports. It does not exercise a malformed handoff claiming an unrelated document.

Required correction:

- distinguish diagnostic paths from validated routing identity;
- retain raw malformed paths for display only;
- Current Workflow may route to Repair only through a validated evidence relationship or an exact Repair output identity;
- a malformed handoff's claimed evidence or target path must never establish lifecycle ownership;
- add an adversarial test where a malformed Repair handoff claims a RevisionRequested Project, Phase, validation, or close document and prove the original owning workspace remains current.

This blocks acceptance criteria 5, 10, 13, and 14.

## Required Proof Defect

The immutable Architect tests are valuable and correctly remained unchanged, but they do not cover the two remaining paths:

- no adversarial authority case uses an Approved Repair Work Card;
- the orphan case is Pending, not Approved;
- the conflict case uses valid Repair evidence and does not test a malformed handoff claiming an unrelated current document;
- no test proves the Repair handoff itself has the required role and identity;
- no test proves source evidence must remain `RevisionRequested` after handoff creation.

The next proof should remain Architect-owned. The Implementer must not revise the established test baseline to accommodate production behavior.

## Validation Assessment

The Implementer reports:

```text
pre-change focused test   10 passed, 4 failed
post-change focused test  14 passed, 0 failed
npx tsc --noEmit          passed
npx tsc                   passed
npx vite build            passed; 1,612 modules transformed
complete Node lane        196 passed, 0 failed
```

ChampCity MCP does not expose a confirmed arbitrary command-execution lane, so this review does not claim independent reruns. The immutable test SHA and production source were independently verified.

## Final Disposition

WC40-REPAIR03 is not approved. Parent WC40 remains unresolved, and Operator running-product validation must not begin.

Preserve the revision-note delivery, expanded non-Approved authority comparison, valid conflict isolation, and promotion-failure projection. Correct only the two bounded authority defects above and extend the Architect-owned proof without permitting Implementer modification of either Architect test baseline.

No Git operation was performed by this review.
