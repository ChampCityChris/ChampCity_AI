<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "work-card-plan",
  "artifactRevision": 1,
  "participationRole": "compoundGatingReview",
  "identity": {
    "phaseId": "phase-00-baseline-ground-zero"
  },
  "sourceRevisions": [
    {
      "path": "planning/project/PROJECT_PROFILE.md",
      "revision": 1
    },
    {
      "path": "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md",
      "revision": 1
    },
    {
      "path": "planning/project/Phase_Map/PHASE_MAP_champcity_a_i.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-00-baseline-ground-zero/Phase_Interview.md",
      "revision": 1
    },
    {
      "path": "planning/phases/phase-00-baseline-ground-zero/Architect_Handoffs/PHASE_PLANNING_ARCHITECT_HANDOFF_phase-00-baseline-ground-zero.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "candidates": [
      {
        "candidateId": "phase-00-wc-01-development-readiness",
        "order": 1,
        "title": "Verify and Establish Current-Build Development Readiness",
        "purpose": "Use the existing ChampCity development-environment subsystem to verify Git, Node.js/npm, and every host capability actually required by the current production build; provision and semantically verify managed missing capabilities through that existing path; then establish repository dependency readiness through the existing package.json/package-lock.json npm bootstrap when required. Preserve UAC as a narrow human-interaction boundary rather than transferring managed installation work to the Operator.",
        "dependsOn": [],
        "resolutionStatus": "planned",
        "resolutionReason": "Git is already evidenced as operational, but Node.js/npm, repository dependency state, and any additional current-build capability remain unverified. Phase foundation rules require those managed capabilities to be verified or established before validation work depends on them.",
        "evidencePaths": [
          "planning/project/PROJECT_PROFILE.md",
          "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md",
          "planning/phases/phase-00-baseline-ground-zero/Phase_Interview.md",
          "package.json",
          "package-lock.json"
        ]
      },
      {
        "candidateId": "phase-00-wc-02-worktree-reconciliation",
        "order": 2,
        "title": "Reconcile the Current Worktree Into an Evidence-Classified Baseline",
        "purpose": "Classify the material modified, deleted, and untracked repository state against current production source, current tests, approved planning, and intentional historical cleanup; preserve accepted implementation and intentional deletions; and correct or remove only state for which current evidence establishes a baseline defect or contradiction. Do not reconstruct deleted Phase 01-08 history merely for completeness.",
        "dependsOn": [
          "phase-00-wc-01-development-readiness"
        ],
        "resolutionStatus": "planned",
        "resolutionReason": "Approved evidence establishes that the repository is materially dirty and mixes accepted reconstruction/Harness work with intentional historical cleanup. The baseline must become understood and explainable before it can be validated or accepted.",
        "evidencePaths": [
          "planning/project/PROJECT_PROFILE.md",
          "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md",
          "planning/project/Phase_Map/PHASE_MAP_champcity_a_i.md",
          "planning/phases/phase-00-baseline-ground-zero/Phase_Interview.md"
        ]
      },
      {
        "candidateId": "phase-00-wc-03-guidance-prompt-contract-alignment",
        "order": 3,
        "title": "Align Active Repository Guidance and Prompt-to-Harness Contracts",
        "purpose": "Reconcile materially stale active repository guidance with the current single-file canonical artifact architecture, live MCP/provider integration, current package scripts, existing lifecycle authority, and approved V1 scope; verify active Architect-output prompt generators and focused tests use the live artifact_toolbox.write_markdown_artifact contract and do not retain active production reliance on create_markdown_artifact. Preserve useful safety and validation constraints while avoiding restoration of superseded authority systems.",
        "dependsOn": [
          "phase-00-wc-02-worktree-reconciliation"
        ],
        "resolutionStatus": "planned",
        "resolutionReason": "Approved evidence identifies active documentation drift and a recently repaired prompt/action-name contract as material sources of model misdirection. These contradictions must be removed from active guidance before the baseline validation gate.",
        "evidencePaths": [
          "planning/project/PROJECT_PROFILE.md",
          "planning/phases/phase-00-baseline-ground-zero/Phase_Interview.md",
          "README.md",
          "AGENTS.md",
          "docs/architecture/REPOSITORY_CODE_TEST_AND_MIGRATION_BOUNDARY.md",
          "docs/dev/VALIDATION_COMMAND_LANES.md"
        ]
      },
      {
        "candidateId": "phase-00-wc-04-fresh-baseline-validation",
        "order": 4,
        "title": "Freshly Validate the Reconciled Production Baseline",
        "purpose": "Execute the repository-retained progressive validation path against the reconciled baseline: applicable focused and production-path tests, typecheck, build, the full integration test gate, and an appropriate Windows launch or integration smoke. Recheck accepted MCP/OAuth/public-endpoint continuity where the production path depends on it, while keeping credentials, secrets, and machine-local paths outside repository evidence.",
        "dependsOn": [
          "phase-00-wc-01-development-readiness",
          "phase-00-wc-02-worktree-reconciliation",
          "phase-00-wc-03-guidance-prompt-contract-alignment"
        ],
        "resolutionStatus": "planned",
        "resolutionReason": "Current source and tests exist, but the approved planning pass did not freshly execute the production validation lanes. Fresh production-path evidence is required before the reconstructed repository state can become the downstream development baseline.",
        "evidencePaths": [
          "planning/project/PROJECT_PROFILE.md",
          "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md",
          "planning/phases/phase-00-baseline-ground-zero/Phase_Interview.md",
          "package.json",
          "docs/dev/VALIDATION_COMMAND_LANES.md"
        ]
      },
      {
        "candidateId": "phase-00-wc-05-operator-accepted-git-baseline",
        "order": 5,
        "title": "Establish the Operator-Accepted Clean Git Baseline",
        "purpose": "Prepare a final clean and explainable Git state through the existing development path, verify that retained/corrected/deleted material state is accounted for and that no secrets or machine-local paths entered repository artifacts, then request only the required Operator acceptance of the prepared baseline and complete the baseline establishment without depending on future Harness Git-mutation functionality.",
        "dependsOn": [
          "phase-00-wc-04-fresh-baseline-validation"
        ],
        "resolutionStatus": "planned",
        "resolutionReason": "Phase 1 requires an Operator-approved clean baseline whose current production paths are freshly validated and whose reconciliation rationale is reviewable. The future Harness Git-mutation service is explicitly out of scope, so Phase 0 must use the existing development path.",
        "evidencePaths": [
          "planning/project/PROJECT_PROFILE.md",
          "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md",
          "planning/phases/phase-00-baseline-ground-zero/Phase_Interview.md",
          "AGENTS.md"
        ]
      }
    ],
    "repositoryAuthority": {
      "projectRepository": "C:\\Users\\chapm\\Projects\\ChampCity_AI"
    }
  },
  "documentDisposition": {
    "status": "Approved",
    "notes": "",
    "reviewedAt": "2026-08-23T18:56:05.951Z"
  }
}
CHAMPCITY-METADATA -->

# Work Card Plan

```champcity-work-card-plan
[
  {
    "candidateId": "phase-00-wc-01-development-readiness",
    "order": 1,
    "title": "Verify and Establish Current-Build Development Readiness",
    "purpose": "Use the existing ChampCity development-environment subsystem to verify Git, Node.js/npm, and every host capability actually required by the current production build; provision and semantically verify managed missing capabilities through that existing path; then establish repository dependency readiness through the existing package.json/package-lock.json npm bootstrap when required. Preserve UAC as a narrow human-interaction boundary rather than transferring managed installation work to the Operator.",
    "dependsOn": [],
    "resolutionStatus": "planned",
    "resolutionReason": "Git is already evidenced as operational, but Node.js/npm, repository dependency state, and any additional current-build capability remain unverified. Phase foundation rules require those managed capabilities to be verified or established before validation work depends on them.",
    "evidencePaths": [
      "planning/project/PROJECT_PROFILE.md",
      "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md",
      "planning/phases/phase-00-baseline-ground-zero/Phase_Interview.md",
      "package.json",
      "package-lock.json"
    ]
  },
  {
    "candidateId": "phase-00-wc-02-worktree-reconciliation",
    "order": 2,
    "title": "Reconcile the Current Worktree Into an Evidence-Classified Baseline",
    "purpose": "Classify the material modified, deleted, and untracked repository state against current production source, current tests, approved planning, and intentional historical cleanup; preserve accepted implementation and intentional deletions; and correct or remove only state for which current evidence establishes a baseline defect or contradiction. Do not reconstruct deleted Phase 01-08 history merely for completeness.",
    "dependsOn": [
      "phase-00-wc-01-development-readiness"
    ],
    "resolutionStatus": "planned",
    "resolutionReason": "Approved evidence establishes that the repository is materially dirty and mixes accepted reconstruction/Harness work with intentional historical cleanup. The baseline must become understood and explainable before it can be validated or accepted.",
    "evidencePaths": [
      "planning/project/PROJECT_PROFILE.md",
      "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md",
      "planning/project/Phase_Map/PHASE_MAP_champcity_a_i.md",
      "planning/phases/phase-00-baseline-ground-zero/Phase_Interview.md"
    ]
  },
  {
    "candidateId": "phase-00-wc-03-guidance-prompt-contract-alignment",
    "order": 3,
    "title": "Align Active Repository Guidance and Prompt-to-Harness Contracts",
    "purpose": "Reconcile materially stale active repository guidance with the current single-file canonical artifact architecture, live MCP/provider integration, current package scripts, existing lifecycle authority, and approved V1 scope; verify active Architect-output prompt generators and focused tests use the live artifact_toolbox.write_markdown_artifact contract and do not retain active production reliance on create_markdown_artifact. Preserve useful safety and validation constraints while avoiding restoration of superseded authority systems.",
    "dependsOn": [
      "phase-00-wc-02-worktree-reconciliation"
    ],
    "resolutionStatus": "planned",
    "resolutionReason": "Approved evidence identifies active documentation drift and a recently repaired prompt/action-name contract as material sources of model misdirection. These contradictions must be removed from active guidance before the baseline validation gate.",
    "evidencePaths": [
      "planning/project/PROJECT_PROFILE.md",
      "planning/phases/phase-00-baseline-ground-zero/Phase_Interview.md",
      "README.md",
      "AGENTS.md",
      "docs/architecture/REPOSITORY_CODE_TEST_AND_MIGRATION_BOUNDARY.md",
      "docs/dev/VALIDATION_COMMAND_LANES.md"
    ]
  },
  {
    "candidateId": "phase-00-wc-04-fresh-baseline-validation",
    "order": 4,
    "title": "Freshly Validate the Reconciled Production Baseline",
    "purpose": "Execute the repository-retained progressive validation path against the reconciled baseline: applicable focused and production-path tests, typecheck, build, the full integration test gate, and an appropriate Windows launch or integration smoke. Recheck accepted MCP/OAuth/public-endpoint continuity where the production path depends on it, while keeping credentials, secrets, and machine-local paths outside repository evidence.",
    "dependsOn": [
      "phase-00-wc-01-development-readiness",
      "phase-00-wc-02-worktree-reconciliation",
      "phase-00-wc-03-guidance-prompt-contract-alignment"
    ],
    "resolutionStatus": "planned",
    "resolutionReason": "Current source and tests exist, but the approved planning pass did not freshly execute the production validation lanes. Fresh production-path evidence is required before the reconstructed repository state can become the downstream development baseline.",
    "evidencePaths": [
      "planning/project/PROJECT_PROFILE.md",
      "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md",
      "planning/phases/phase-00-baseline-ground-zero/Phase_Interview.md",
      "package.json",
      "docs/dev/VALIDATION_COMMAND_LANES.md"
    ]
  },
  {
    "candidateId": "phase-00-wc-05-operator-accepted-git-baseline",
    "order": 5,
    "title": "Establish the Operator-Accepted Clean Git Baseline",
    "purpose": "Prepare a final clean and explainable Git state through the existing development path, verify that retained/corrected/deleted material state is accounted for and that no secrets or machine-local paths entered repository artifacts, then request only the required Operator acceptance of the prepared baseline and complete the baseline establishment without depending on future Harness Git-mutation functionality.",
    "dependsOn": [
      "phase-00-wc-04-fresh-baseline-validation"
    ],
    "resolutionStatus": "planned",
    "resolutionReason": "Phase 1 requires an Operator-approved clean baseline whose current production paths are freshly validated and whose reconciliation rationale is reviewable. The future Harness Git-mutation service is explicitly out of scope, so Phase 0 must use the existing development path.",
    "evidencePaths": [
      "planning/project/PROJECT_PROFILE.md",
      "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md",
      "planning/phases/phase-00-baseline-ground-zero/Phase_Interview.md",
      "AGENTS.md"
    ]
  }
]
```
