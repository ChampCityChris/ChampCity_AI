<!-- CHAMPCITY-METADATA
{
  "schemaVersion": 1,
  "artifactType": "phase-map",
  "artifactRevision": 1,
  "participationRole": "gatingReview",
  "identity": {
    "projectSlug": "champcity_a_i",
    "Project.ArtifactKey": "champcity_a_i"
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
      "path": "planning/project/Architect_Handoffs/PHASE_MAP_ARCHITECT_HANDOFF_champcity_a_i.md",
      "revision": 1
    }
  ],
  "workflowData": {
    "phases": [
      {
        "phaseId": "phase-00-baseline-ground-zero",
        "title": "Reconcile Current Baseline and Establish Development Ground Zero",
        "order": 0,
        "purpose": "Preserve the accepted current implementation, reconcile the dirty reconstruction worktree, verify required base development capabilities, align stale repository guidance with current architecture, run fresh validation, and establish a clean Operator-approved Git baseline.",
        "dependsOn": [],
        "sourceReferences": [
          "planning/project/PROJECT_PROFILE.md",
          "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md"
        ]
      },
      {
        "phaseId": "phase-01-persistent-workspace-resource-authority",
        "title": "Persistent Workspace and Resource Authority",
        "order": 1,
        "purpose": "Replace selected-project coupling as generic Harness repository authority with a persistent application-owned registered-workspace model using stable workspace identities, deterministic containment, and resource status independent of foreground project selection.",
        "dependsOn": [
          "phase-00-baseline-ground-zero"
        ],
        "sourceReferences": [
          "planning/project/PROJECT_PROFILE.md",
          "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md"
        ]
      },
      {
        "phaseId": "phase-02-capability-session-grant-kernel",
        "title": "Provider-Neutral Capability, Session, and Grant Kernel",
        "order": 2,
        "purpose": "Generalize the current tool registry into shared application-owned capability contracts and establish persistent agent session, task, resource-grant, execution-authority, workflow-context, and provider-correlation state without creating provider-specific authority paths.",
        "dependsOn": [
          "phase-01-persistent-workspace-resource-authority"
        ],
        "sourceReferences": [
          "planning/project/PROJECT_PROFILE.md",
          "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md"
        ]
      },
      {
        "phaseId": "phase-03-bounded-host-filesystem-roots",
        "title": "Bounded Host Filesystem Roots",
        "order": 3,
        "purpose": "Add explicitly registered non-repository filesystem roots with stable identities, bounded read/write policy, root-relative addressing, realpath containment, and session/task grants that remain distinct from repository authority.",
        "dependsOn": [
          "phase-02-capability-session-grant-kernel"
        ],
        "sourceReferences": [
          "planning/project/PROJECT_PROFILE.md",
          "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md"
        ]
      },
      {
        "phaseId": "phase-04-generic-local-execution",
        "title": "Generic Local Execution Service",
        "order": 4,
        "purpose": "Provide structured resource-bound local process execution for real build, test, and debug work with explicit program and arguments, authorized working directories, streaming output, timeout, input, cancellation, process-tree cleanup, refreshed environment inheritance, and durable execution evidence.",
        "dependsOn": [
          "phase-03-bounded-host-filesystem-roots"
        ],
        "sourceReferences": [
          "planning/project/PROJECT_PROFILE.md",
          "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md"
        ]
      },
      {
        "phaseId": "phase-05-harness-development-environment",
        "title": "Expose the Existing Development-Environment System Through the Harness",
        "order": 5,
        "purpose": "Expose the existing ChampCity development-environment inspection, resolution, provisioning, UAC, refresh, and verification path through shared Harness capabilities so missing managed requirements can be established and deterministically verified without provider-specific installers.",
        "dependsOn": [
          "phase-04-generic-local-execution"
        ],
        "sourceReferences": [
          "planning/project/PROJECT_PROFILE.md",
          "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md"
        ]
      },
      {
        "phaseId": "phase-06-context-skills-observability-evidence",
        "title": "Context Packs, Skills, Observability, and Evidence",
        "order": 6,
        "purpose": "Provide bounded task-relevant context packs, reusable implementation and validation skills, chronological provider/resource/tool/execution evidence, and Operator-facing diagnostics sufficient to explain and troubleshoot Harness work without making transcripts or models the system of record.",
        "dependsOn": [
          "phase-05-harness-development-environment"
        ],
        "sourceReferences": [
          "planning/project/PROJECT_PROFILE.md",
          "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md"
        ]
      },
      {
        "phaseId": "phase-07-browser-implementer-mvp-pilot",
        "title": "Direct Browser ChatGPT Implementer MVP Pilot",
        "order": 7,
        "purpose": "Prove one small real noncritical ChampCity Work Card can be implemented directly by Browser ChatGPT through application-owned repository, filesystem, execution, environment, context, evidence, and artifact capabilities and then return to the existing review, repair, validation, and Operator-decision lifecycle.",
        "dependsOn": [
          "phase-06-context-skills-observability-evidence"
        ],
        "sourceReferences": [
          "planning/project/PROJECT_PROFILE.md",
          "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md"
        ]
      },
      {
        "phaseId": "phase-08-browser-ui-validation",
        "title": "Browser and UI Validation Capability",
        "order": 8,
        "purpose": "Add an application-owned Playwright or equivalent Browser/UI validation path that can exercise representative renderer-visible behavior and return reproducible DOM, interaction, screenshot, console, network, and Electron/web-renderer evidence while preserving human acceptance as an Operator boundary.",
        "dependsOn": [
          "phase-07-browser-implementer-mvp-pilot"
        ],
        "sourceReferences": [
          "planning/project/PROJECT_PROFILE.md",
          "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md"
        ]
      },
      {
        "phaseId": "phase-09-codex-worker-delegation",
        "title": "Codex Specialist/Fallback Worker Delegation",
        "order": 9,
        "purpose": "Adapt the existing Codex App Server integration into the shared worker/session model with bounded delegation, explicit task and resource constraints, correlated evidence, cancellation, and preserved Browser parent responsibility and workflow authority.",
        "dependsOn": [
          "phase-08-browser-ui-validation"
        ],
        "sourceReferences": [
          "planning/project/PROJECT_PROFILE.md",
          "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md"
        ]
      },
      {
        "phaseId": "phase-10-browser-primary-dogfood",
        "title": "Browser-Primary Dogfood Cutover",
        "order": 10,
        "purpose": "Make Browser ChatGPT the primary Implementer for subsequent ChampCity A/I Work Cards, retain Codex as specialist/fallback, and use substantive dogfooding to harden capability contracts and remote resource boundaries through real development evidence.",
        "dependsOn": [
          "phase-09-codex-worker-delegation"
        ],
        "sourceReferences": [
          "planning/project/PROJECT_PROFILE.md",
          "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md"
        ]
      },
      {
        "phaseId": "phase-11-bounded-local-model-worker",
        "title": "Bounded Local-Model Worker",
        "order": 11,
        "purpose": "Select and integrate a Windows-suitable local-model runtime for low-entropy mechanical work under the same capability, session, task-grant, context, cancellation, worker, and evidence contracts, with Browser review and deterministic validation required for acceptance.",
        "dependsOn": [
          "phase-10-browser-primary-dogfood"
        ],
        "sourceReferences": [
          "planning/project/PROJECT_PROFILE.md",
          "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md"
        ]
      },
      {
        "phaseId": "phase-12-non-gating-git-lifecycle",
        "title": "Non-Gating Git Lifecycle",
        "order": 12,
        "purpose": "Complete application-owned Git inspection and bounded mutation so routine in-scope branch, stage, commit, checkpoint, history, restore/conflict, and applicable remote operations function as observable development infrastructure under task authority rather than repeated generic approval gates.",
        "dependsOn": [
          "phase-11-bounded-local-model-worker"
        ],
        "sourceReferences": [
          "planning/project/PROJECT_PROFILE.md",
          "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md"
        ]
      },
      {
        "phaseId": "phase-13-optional-github-remote-provider",
        "title": "Optional GitHub Remote Provider",
        "order": 13,
        "purpose": "Add GitHub as the V1 remote provider behind a replaceable provider boundary with protected authentication, scoped synchronization and diagnostics, and a first-class local-only mode that keeps remote failures from blocking unrelated local development.",
        "dependsOn": [
          "phase-12-non-gating-git-lifecycle"
        ],
        "sourceReferences": [
          "planning/project/PROJECT_PROFILE.md",
          "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md"
        ]
      },
      {
        "phaseId": "phase-14-optional-background-harness-runtime",
        "title": "Optional Background Harness Runtime",
        "order": 14,
        "purpose": "Provide Operator-controlled Windows background Harness operation that preserves existing OAuth, registered resources, task/session grants, containment, active-session identity, cancellation, process cleanup, and deterministic startup, shutdown, upgrade, and recovery when the visible desktop UI is closed.",
        "dependsOn": [
          "phase-13-optional-github-remote-provider"
        ],
        "sourceReferences": [
          "planning/project/PROJECT_PROFILE.md",
          "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md"
        ]
      },
      {
        "phaseId": "phase-15-model-reasoning-routing",
        "title": "Model/Reasoning Selection and Practical Quota/Cost-Aware Routing",
        "order": 15,
        "purpose": "Implement explicit configurable V1 model, reasoning, and worker selection using task type, capability, reasoning need, quota and cost preference, latency, observed reliability, available resources, and Operator override, with routing decisions and outcomes kept observable and reversible.",
        "dependsOn": [
          "phase-14-optional-background-harness-runtime"
        ],
        "sourceReferences": [
          "planning/project/PROJECT_PROFILE.md",
          "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md"
        ]
      },
      {
        "phaseId": "phase-16-windows-v1-productization",
        "title": "Windows V1 Productization",
        "order": 16,
        "purpose": "Turn the dogfooded system into a public-release-quality Windows product with packaging, installation, first-run provider and Harness configuration, protected credential storage, diagnostics, update, uninstall, background-runtime cleanup, and operator documentation suitable for non-programmer use.",
        "dependsOn": [
          "phase-15-model-reasoning-routing"
        ],
        "sourceReferences": [
          "planning/project/PROJECT_PROFILE.md",
          "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md"
        ]
      },
      {
        "phaseId": "phase-17-integrated-v1-acceptance-release",
        "title": "Integrated V1 Acceptance and Release",
        "order": 17,
        "purpose": "Prove the complete V1 as one integrated system across the preserved lifecycle, independent resource authority, Browser implementation, bounded execution and environment establishment, UI validation, Codex and local-worker delegation, Git and optional GitHub, background operation, practical routing, Windows productization, deterministic cleanup, regression validation, ChampCity dogfooding, and a separate real project.",
        "dependsOn": [
          "phase-16-windows-v1-productization"
        ],
        "sourceReferences": [
          "planning/project/PROJECT_PROFILE.md",
          "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md"
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
    "reviewedAt": "2026-08-23T18:20:58.886Z"
  }
}
CHAMPCITY-METADATA -->

# Phase Map

```champcity-phase-map
{
  "phases": [
    {
      "phaseId": "phase-00-baseline-ground-zero",
      "title": "Reconcile Current Baseline and Establish Development Ground Zero",
      "order": 0,
      "purpose": "Preserve the accepted current implementation, reconcile the dirty reconstruction worktree, verify required base development capabilities, align stale repository guidance with current architecture, run fresh validation, and establish a clean Operator-approved Git baseline.",
      "dependsOn": [],
      "sourceReferences": [
        "planning/project/PROJECT_PROFILE.md",
        "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md"
      ]
    },
    {
      "phaseId": "phase-01-persistent-workspace-resource-authority",
      "title": "Persistent Workspace and Resource Authority",
      "order": 1,
      "purpose": "Replace selected-project coupling as generic Harness repository authority with a persistent application-owned registered-workspace model using stable workspace identities, deterministic containment, and resource status independent of foreground project selection.",
      "dependsOn": [
        "phase-00-baseline-ground-zero"
      ],
      "sourceReferences": [
        "planning/project/PROJECT_PROFILE.md",
        "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md"
      ]
    },
    {
      "phaseId": "phase-02-capability-session-grant-kernel",
      "title": "Provider-Neutral Capability, Session, and Grant Kernel",
      "order": 2,
      "purpose": "Generalize the current tool registry into shared application-owned capability contracts and establish persistent agent session, task, resource-grant, execution-authority, workflow-context, and provider-correlation state without creating provider-specific authority paths.",
      "dependsOn": [
        "phase-01-persistent-workspace-resource-authority"
      ],
      "sourceReferences": [
        "planning/project/PROJECT_PROFILE.md",
        "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md"
      ]
    },
    {
      "phaseId": "phase-03-bounded-host-filesystem-roots",
      "title": "Bounded Host Filesystem Roots",
      "order": 3,
      "purpose": "Add explicitly registered non-repository filesystem roots with stable identities, bounded read/write policy, root-relative addressing, realpath containment, and session/task grants that remain distinct from repository authority.",
      "dependsOn": [
        "phase-02-capability-session-grant-kernel"
      ],
      "sourceReferences": [
        "planning/project/PROJECT_PROFILE.md",
        "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md"
      ]
    },
    {
      "phaseId": "phase-04-generic-local-execution",
      "title": "Generic Local Execution Service",
      "order": 4,
      "purpose": "Provide structured resource-bound local process execution for real build, test, and debug work with explicit program and arguments, authorized working directories, streaming output, timeout, input, cancellation, process-tree cleanup, refreshed environment inheritance, and durable execution evidence.",
      "dependsOn": [
        "phase-03-bounded-host-filesystem-roots"
      ],
      "sourceReferences": [
        "planning/project/PROJECT_PROFILE.md",
        "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md"
      ]
    },
    {
      "phaseId": "phase-05-harness-development-environment",
      "title": "Expose the Existing Development-Environment System Through the Harness",
      "order": 5,
      "purpose": "Expose the existing ChampCity development-environment inspection, resolution, provisioning, UAC, refresh, and verification path through shared Harness capabilities so missing managed requirements can be established and deterministically verified without provider-specific installers.",
      "dependsOn": [
        "phase-04-generic-local-execution"
      ],
      "sourceReferences": [
        "planning/project/PROJECT_PROFILE.md",
        "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md"
      ]
    },
    {
      "phaseId": "phase-06-context-skills-observability-evidence",
      "title": "Context Packs, Skills, Observability, and Evidence",
      "order": 6,
      "purpose": "Provide bounded task-relevant context packs, reusable implementation and validation skills, chronological provider/resource/tool/execution evidence, and Operator-facing diagnostics sufficient to explain and troubleshoot Harness work without making transcripts or models the system of record.",
      "dependsOn": [
        "phase-05-harness-development-environment"
      ],
      "sourceReferences": [
        "planning/project/PROJECT_PROFILE.md",
        "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md"
      ]
    },
    {
      "phaseId": "phase-07-browser-implementer-mvp-pilot",
      "title": "Direct Browser ChatGPT Implementer MVP Pilot",
      "order": 7,
      "purpose": "Prove one small real noncritical ChampCity Work Card can be implemented directly by Browser ChatGPT through application-owned repository, filesystem, execution, environment, context, evidence, and artifact capabilities and then return to the existing review, repair, validation, and Operator-decision lifecycle.",
      "dependsOn": [
        "phase-06-context-skills-observability-evidence"
      ],
      "sourceReferences": [
        "planning/project/PROJECT_PROFILE.md",
        "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md"
      ]
    },
    {
      "phaseId": "phase-08-browser-ui-validation",
      "title": "Browser and UI Validation Capability",
      "order": 8,
      "purpose": "Add an application-owned Playwright or equivalent Browser/UI validation path that can exercise representative renderer-visible behavior and return reproducible DOM, interaction, screenshot, console, network, and Electron/web-renderer evidence while preserving human acceptance as an Operator boundary.",
      "dependsOn": [
        "phase-07-browser-implementer-mvp-pilot"
      ],
      "sourceReferences": [
        "planning/project/PROJECT_PROFILE.md",
        "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md"
      ]
    },
    {
      "phaseId": "phase-09-codex-worker-delegation",
      "title": "Codex Specialist/Fallback Worker Delegation",
      "order": 9,
      "purpose": "Adapt the existing Codex App Server integration into the shared worker/session model with bounded delegation, explicit task and resource constraints, correlated evidence, cancellation, and preserved Browser parent responsibility and workflow authority.",
      "dependsOn": [
        "phase-08-browser-ui-validation"
      ],
      "sourceReferences": [
        "planning/project/PROJECT_PROFILE.md",
        "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md"
      ]
    },
    {
      "phaseId": "phase-10-browser-primary-dogfood",
      "title": "Browser-Primary Dogfood Cutover",
      "order": 10,
      "purpose": "Make Browser ChatGPT the primary Implementer for subsequent ChampCity A/I Work Cards, retain Codex as specialist/fallback, and use substantive dogfooding to harden capability contracts and remote resource boundaries through real development evidence.",
      "dependsOn": [
        "phase-09-codex-worker-delegation"
      ],
      "sourceReferences": [
        "planning/project/PROJECT_PROFILE.md",
        "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md"
      ]
    },
    {
      "phaseId": "phase-11-bounded-local-model-worker",
      "title": "Bounded Local-Model Worker",
      "order": 11,
      "purpose": "Select and integrate a Windows-suitable local-model runtime for low-entropy mechanical work under the same capability, session, task-grant, context, cancellation, worker, and evidence contracts, with Browser review and deterministic validation required for acceptance.",
      "dependsOn": [
        "phase-10-browser-primary-dogfood"
      ],
      "sourceReferences": [
        "planning/project/PROJECT_PROFILE.md",
        "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md"
      ]
    },
    {
      "phaseId": "phase-12-non-gating-git-lifecycle",
      "title": "Non-Gating Git Lifecycle",
      "order": 12,
      "purpose": "Complete application-owned Git inspection and bounded mutation so routine in-scope branch, stage, commit, checkpoint, history, restore/conflict, and applicable remote operations function as observable development infrastructure under task authority rather than repeated generic approval gates.",
      "dependsOn": [
        "phase-11-bounded-local-model-worker"
      ],
      "sourceReferences": [
        "planning/project/PROJECT_PROFILE.md",
        "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md"
      ]
    },
    {
      "phaseId": "phase-13-optional-github-remote-provider",
      "title": "Optional GitHub Remote Provider",
      "order": 13,
      "purpose": "Add GitHub as the V1 remote provider behind a replaceable provider boundary with protected authentication, scoped synchronization and diagnostics, and a first-class local-only mode that keeps remote failures from blocking unrelated local development.",
      "dependsOn": [
        "phase-12-non-gating-git-lifecycle"
      ],
      "sourceReferences": [
        "planning/project/PROJECT_PROFILE.md",
        "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md"
      ]
    },
    {
      "phaseId": "phase-14-optional-background-harness-runtime",
      "title": "Optional Background Harness Runtime",
      "order": 14,
      "purpose": "Provide Operator-controlled Windows background Harness operation that preserves existing OAuth, registered resources, task/session grants, containment, active-session identity, cancellation, process cleanup, and deterministic startup, shutdown, upgrade, and recovery when the visible desktop UI is closed.",
      "dependsOn": [
        "phase-13-optional-github-remote-provider"
      ],
      "sourceReferences": [
        "planning/project/PROJECT_PROFILE.md",
        "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md"
      ]
    },
    {
      "phaseId": "phase-15-model-reasoning-routing",
      "title": "Model/Reasoning Selection and Practical Quota/Cost-Aware Routing",
      "order": 15,
      "purpose": "Implement explicit configurable V1 model, reasoning, and worker selection using task type, capability, reasoning need, quota and cost preference, latency, observed reliability, available resources, and Operator override, with routing decisions and outcomes kept observable and reversible.",
      "dependsOn": [
        "phase-14-optional-background-harness-runtime"
      ],
      "sourceReferences": [
        "planning/project/PROJECT_PROFILE.md",
        "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md"
      ]
    },
    {
      "phaseId": "phase-16-windows-v1-productization",
      "title": "Windows V1 Productization",
      "order": 16,
      "purpose": "Turn the dogfooded system into a public-release-quality Windows product with packaging, installation, first-run provider and Harness configuration, protected credential storage, diagnostics, update, uninstall, background-runtime cleanup, and operator documentation suitable for non-programmer use.",
      "dependsOn": [
        "phase-15-model-reasoning-routing"
      ],
      "sourceReferences": [
        "planning/project/PROJECT_PROFILE.md",
        "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md"
      ]
    },
    {
      "phaseId": "phase-17-integrated-v1-acceptance-release",
      "title": "Integrated V1 Acceptance and Release",
      "order": 17,
      "purpose": "Prove the complete V1 as one integrated system across the preserved lifecycle, independent resource authority, Browser implementation, bounded execution and environment establishment, UI validation, Codex and local-worker delegation, Git and optional GitHub, background operation, practical routing, Windows productization, deterministic cleanup, regression validation, ChampCity dogfooding, and a separate real project.",
      "dependsOn": [
        "phase-16-windows-v1-productization"
      ],
      "sourceReferences": [
        "planning/project/PROJECT_PROFILE.md",
        "planning/project/Project_Roadmap/PROJECT_ROADMAP_champcity_a_i.md"
      ]
    }
  ]
}
```
