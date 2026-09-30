# WIR-UX02-REPAIR03 Implementer Report

Date: 2026-09-30. Card type: Repair. Approved root verified as the primary `Dev` repository checkout by its AGENTS.md, package.json, and Git branch `dev`. Remote: `origin` configured for ChampCityChris/ChampCity_AI; no fetch or push performed. Unrelated local changes preserved and excluded from the checkpoint.

## Implementation

Confirmed root cause: the service conflated historical assessment source provenance with concurrency authority. It marked promoted advice stale on Dev mismatch and repeated mismatch rejection in both decision validation and source seeding.

Production files modified:

- `src/main/workflow/structuredWorkRoutingService.ts`: remove promoted-assessment Dev freshness checks. Exact assessment identity, Work Intake recordVersion, revision-request state, closed/routed guards and normal disposition rules remain governed by existing context/domain validation. Accept/Override read current managed Dev before the atomic handoff and seed the lazy SourceBaseline/SourceBinding from that revision. Request Revision requires no source-backed target preflight.
- `src/renderer/app/StructuredWorkRoutingWorkspace.tsx`: stale recovery wording now identifies a changed Work Intake.

Test files modified: `test/workflow/workflow-application-service.test.cjs` and `test/renderer/work-intake-routed-workspaces.test.cjs`. Created this report. No files deleted. No new permanent tests, schema, API, taxonomy, source-control changes or validity store created. Pending Architect submission supersession behavior remains unchanged.

Provenance continues to record `work-intake-record-version:<n>;dev-head:<revision>`; historical assessments are not rewritten as source advances.

## Regression evidence

Existing source-backed WIR test modified to replace the defective stale/rejection assertion. For each of Accept, distinct Override with rationale, and Request Revision: prepare/promote at A, advance to B, confirm the same assessment remains current, decide without preparing again, and confirm stored provenance remains A. Accept and Override create exact target workflows and baseline B with unprepared lazy bindings. Revision remains in Routing without a target baseline.

Existing decision-input test extended: revising an already-promoted Work Intake makes its assessment stale and blocks both Accept and Override. Existing pending-submission supersession proof reused unchanged within the promotion test.

Existing unavailable-source atomicity test reused unchanged: acceptance failure leaves Work Intake/WIR active, no route relationship or Decision, and no SourceBaseline/SourceBinding. Current Dev is still read before calling the atomic domain handoff for both Accept and Override.

Existing renderer live-decision test extended with real textarea/select handlers and state retained across renders: enter rationale, select another route, return to recommendation, Accept stays enabled and dispatches exact assessment identity with no override route. The API stub exposes only decide, so selector-triggered prepare/read calls cannot succeed; the model remains identical and no decision occurs until clicking. Existing stale recovery test checks corrected wording. Existing navigation, polling, passive refresh, revision navigation and mounted recovery tests reused unchanged. No new permanent test was needed because these behaviors fit existing proof boundaries.

## Validation

- `npm run test:repair -- --changes tmp/wir-repair03-changes.json --preview`: restricted Windows lane, exit 0; exact changed set comprises the two production files, two test files and this report. Temporary change input is not committed. Preview is selection evidence only.
- `npm run build`: restricted Windows lane failed with `spawn EPERM` in esbuild after TypeScript; rerun once in normal Windows lane, exit 0. Production TypeScript, Vite and asset copy passed. Existing bundle-size advisory remains.
- `node --test --test-name-pattern="structured.*WIR" test/workflow/workflow-application-service.test.cjs`: restricted lane failed with `spawn EPERM`; normal Windows rerun exit 0, 4 passed, 0 failed.
- `node --test test/renderer/work-intake-routed-workspaces.test.cjs`: restricted lane failed with `spawn EPERM`; normal Windows rerun exit 0, 12 passed, 0 failed.
- `git diff --check`: exit 0. Exact staged diff reviewed; bounded secret, concrete local-path and generated-artifact scan passed before commit.

Full regression/composed repair execution and Electron launch were not run: the card explicitly requests bounded production build, focused service/renderer proof and repair-plan preview. No live Operator acceptance or external integration claim is made.

## Checkpoint and remaining review

Required bounded checkpoint message: `WIR-UX02-REPAIR03 decouple promoted routing advice from Dev HEAD movement`. Hash pending at report creation; supplied in the completion response without amending this report solely to insert its own hash. Stage only the five attributable paths listed above. No push.

No implementation deviations or blockers. Stop for Architect review and Operator revalidation of the original live dropdown/Accept scenario after managed Dev advances. Automated proof uses synthetic revisions and does not replace live Operator validation.
