<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "operator-route-decision",
  "artifactRevision": 1,
  "participationRole": "contextOnly",
  "identity": {
    "intakeId": "intake-855e1f9d-793c-42aa-b956-c30e5af164a1"
  },
  "sourceRevisions": [
    {
      "path": "planning/work-intake/intakes/intake-855e1f9d-793c-42aa-b956-c30e5af164a1.md",
      "revision": 1
    },
    {
      "path": "planning/work-intake/routing/intake-855e1f9d-793c-42aa-b956-c30e5af164a1.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "history": [
      {
        "decision": {
          "kind": "operator-route-decision",
          "decisionId": "decision-e1120da4-fc9e-4531-a6bb-9653903f9af9",
          "intakeId": "intake-855e1f9d-793c-42aa-b956-c30e5af164a1",
          "assessmentId": "ad-routing-intake-855e1f9d-793c-42aa-b956-c30e5af164a1-work-routing-assessment-request-1-src-2475c08875a2243ba2a1-r1",
          "sourceAssessment": {
            "path": "planning/work-intake/routing/intake-855e1f9d-793c-42aa-b956-c30e5af164a1.md",
            "revision": 1
          },
          "rationale": "Operator selects the intended planning focus.",
          "disposition": "override",
          "selectedRouteId": "feature-change",
          "traits": [
            "existing-source"
          ]
        },
        "sourceIntake": {
          "path": "planning/work-intake/intakes/intake-855e1f9d-793c-42aa-b956-c30e5af164a1.md",
          "revision": 1
        },
        "advice": {
          "kind": "architect-route-assessment",
          "intakeId": "intake-855e1f9d-793c-42aa-b956-c30e5af164a1",
          "assessmentId": "ad-routing-intake-855e1f9d-793c-42aa-b956-c30e5af164a1-work-routing-assessment-request-1-src-2475c08875a2243ba2a1-r1",
          "recommendedRouteId": "feature-change",
          "traits": [
            "existing-source"
          ],
          "rationale": "A bounded change.",
          "evidencePaths": [
            "planning/work-intake/intakes/intake-855e1f9d-793c-42aa-b956-c30e5af164a1.md"
          ],
          "sourceIntake": {
            "path": "planning/work-intake/intakes/intake-855e1f9d-793c-42aa-b956-c30e5af164a1.md",
            "revision": 1
          },
          "sourceEvidence": [
            {
              "path": "planning/work-intake/intakes/intake-855e1f9d-793c-42aa-b956-c30e5af164a1.md",
              "revision": 1
            },
            {
              "path": "planning/work-intake/PROJECT.md",
              "revision": 1
            }
          ],
          "relativePath": "planning/work-intake/routing/intake-855e1f9d-793c-42aa-b956-c30e5af164a1.md",
          "artifactRevision": 1
        },
        "recordedAt": "2026-09-21T02:49:39.836Z"
      }
    ],
    "supersessions": []
  },
  "documentDisposition": {
    "status": "Pending",
    "notes": "",
    "reviewedAt": null
  }
}
CHAMPCITY-METADATA -->

# Operator Route Decision

## decision-e1120da4-fc9e-4531-a6bb-9653903f9af9

Disposition: override
Route: feature-change

Operator selects the intended planning focus.
