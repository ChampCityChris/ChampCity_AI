# WRB01-R01-03 Bundle Repair Report

## Repository and card

- Approved repository root verified from the active repository instructions; work was performed in the approved ChampCity_AI checkout.
- Card: Repair Card WRB01-R01-03, checkout-aware Source Graph and bundle requalification.
- Branch: `dev`, ahead of `origin/dev` by 103 before this checkpoint. No remote operations performed.

## Changes

- Source Graph and Current Work Intake now read Git state from the validated managed Dev checkout while resolving Current Project workflow metadata from the non-Git Project container.
- Added fail-closed validation for absent, redirected, or non-Git managed Dev paths; retained single-root defaults for internal fixtures.
- Removed legacy Development and Issue recovery cards and navigation paths from Current Project Hub; Start Work and Source Control remain.
- Added end-to-end entry, graph, revision-detail, SPS metadata, and Work Intake projection coverage; updated Hub and capability-map proofs.
- Rewrote the WRB01-05 bundle qualification report as valid UTF-8, recorded the required checkpoint hash, Repair01 commits and outcomes, evidence, and deferred qualification details.
- Intentionally not created: WRB02 work, migrations, dependencies, generated artifacts, or external integration changes.

## Evidence and validation

- `npm run build` — restricted lane returned `spawn EPERM`; normal Windows lane rerun passed (exit 0; existing Vite chunk-size advisory).
- Focused command: `node --test test/project-state/current-project-registration.test.cjs test/project-state/current-project-entry.test.cjs test/source-control/managed-project-source.test.cjs test/work-intake/greenfield-source-bootstrap.test.cjs test/source-control/source-graph-projection.test.cjs test/work-intake/structured-work-intake-capture.test.cjs test/renderer/workflow-hub-shell.test.cjs test/validation/capability-map.test.cjs` — restricted lane returned `spawn EPERM`; normal Windows lane passed, 39/39.
- `npm run validate:plan -- --profile repair --changes tmp/changes.json` — normal Windows lane passed; exact affected plan selected 83 tests across 16 capabilities (3 static, 12 fast, 16 affected-capability, 52 integration; about 528 seconds). Per card lean-test guidance, the broad repair profile was not run.
- Prior R01-01 repair profile passed. R01-02 repair profile reported one unrelated failure in `test/source-control/source-lifecycle-package.test.cjs`, whose legacy selected-repository fixture expects prepared source state. The current Project identity contract was not weakened; the limitation is documented for the owning workflow.
- No Electron launch, packaging, or external integration evidence claimed.

## Git, safety, and remaining work

- Separate checkpoint commit required by the approved Repair01 workflow. Commit hash is pending at report creation and will be reported after commit; no amend will be made.
- `git diff --check` passed before staging. Review the staged diff and scan for secrets, concrete local paths, and generated artifacts before committing.
- No secrets or concrete machine paths are included in durable artifacts. No generated output is staged.
- Human Architect review remains the next required workflow step. Do not begin WRB02 before that review.
