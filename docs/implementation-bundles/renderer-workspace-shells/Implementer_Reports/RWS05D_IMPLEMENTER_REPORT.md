# RWS05D Implementer Report

Work Card RWS05D; approved `<PROJECT_REPO>` root verified, primary `dev` checkout. No remote mutation or push. Checkpoint hash pending in this report; emitted after commit.

Feature Assessment and Issue RCA now share the structured Architect renderer and right browser companion. Typed proposed Findings/RootCauses persist before disposition. Exact-cycle SQL Decisions gate the existing downstream Planning selectors. Issue uploaded Evidence remains supported by Intake and invalidates prior RCA approval; persisted payloads survive a later cycle failure. Atomic Prepare checks exact approved Intake. Existing accepted human-reviewed SQL sets adopt idempotently, preserving IDs; conflicting or incomplete sets block without guessing. Generated review Markdown remains derived, and manual edits never authorize progression.

Modified: structuredArchitectWorkspaceService, featurePlanningService, issuePlanningService; FeaturePlanningWorkspace, IssueWorkflowPlanningWorkspace, StructuredGreenfieldArchitectWorkspace, WorkflowIntakeWorkspace; architectWorkspaceContracts, architectReviewContracts, projectStateService, workspaceContracts; workflow-hub-shell and workflow-application-service proofs. Created this report. No schema/cutoff changes, canonical assessment files, sidecars, new dependencies, or downstream Planning UI rebuild.

Validation in normal Windows process lane:

- `npm run validate:plan -- --profile work-item --changes tmp/rws05d-changes.json`: exit 0.
- `npm run test:affected -- --changes tmp/rws05d-changes.json`: exit 1; 118 files, 950 pass, 38 fail, 1 skipped; required production build passed. This run preceded the final older-test updates.
- `node --test test/workflow/workflow-application-service.test.cjs test/renderer/workflow-hub-shell.test.cjs`: exit 0, all 53 passed after updates. Includes candidate persistence, generated-file edits, revision/currentness, cross-Workflow rejection, atomic RCA rollback, legacy adoption/conflicts, both Planning gates and Evidence invalidation.
- `npm run build`: exit 0. `npm run typecheck`: exit 0 after payload cleanup adjustment.
- An initial `npx tsc -p tsconfig.main.json` failed because that config does not exist; corrected to repository `tsc` lane.

Affected failures: 3 older Feature/Issue workflow tests subsequently corrected and passed; 12 obsolete Interview canonical-promotion expectations remain for F. Other 23 failures were observed in repository-io-hardening (1), reserved-toolbox-namespace (2), Intake post-submit (1), Project Planning IPC (1), execution-completion (6), Issue Close renderer (1), runtime-wiring-source (1), managed-project-source (8), workflow-integration-service (2). These are not claimed as reproduced clean-baseline failures; they remain explicit wider qualification limits. No full/release/package lane or visual acceptance performed.

Exact attributable staged diff inspected; whitespace and bounded secret/local-path/generated-artifact checks passed. Unrelated dirty source/tests/reports and untracked cards were preserved and excluded. Operator visual acceptance of layout/browser remains. Continue directly to RWS05E.
