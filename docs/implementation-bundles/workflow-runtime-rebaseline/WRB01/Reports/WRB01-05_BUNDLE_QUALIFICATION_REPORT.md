# WRB01 Bundle Qualification Report

## Scope and checkpoints

All five released WRB01 cards were executed sequentially on `dev`. Each card has one checkpoint commit. The branch started at the repository's current `dev` checkpoint and is now ready for Architect review.

| Card | Checkpoint | Result |
| --- | --- | --- |
| WRB01-01 | `c827a3a` | Established idempotent SPS Current Project registration and direct registration-based identity discovery. |
| WRB01-02 | `09cc5fe` | Added safe conventional Git adoption into non-Git Project container with bare Repository metadata and sibling Main/Dev checkouts. |
| WRB01-03 | `d2eeb8b` | Added deterministic Greenfield managed Main/Dev baseline with tracked repository-root `.gitignore`. |
| WRB01-04 | `e217f29` | Wired landing IPC/preload/renderer entry to Current Project; Existing Project enters Hub, New Project enters Project Intake. |
| WRB01-05 | pending | Removed current provider-generation discovery and zero-caller migration code/tests; checkpoint follows recorded incomplete affected-profile execution. |

## Final production path

Landing actions call the constrained `project:registerCurrent` preload method. Main-process code validates the selected container, creates or opens the SPS Project and selected-project source resource, registers the Project container with Agent Harness, and registers exact Main/Dev RepositoryCheckout descriptors when source topology exists or is created. Greenfield creates the first deterministic commit in Main and the same starting commit on Dev. The Project container remains non-Git; `.champcity/repository.git` owns common Git metadata. Ordinary repository `.gitignore` behavior applies to the tracked baseline.

The renderer carries the returned Project ID, display name, source identity, selected root, and registration mode. Existing Project enters Workflow Hub. Start New Project enters Project Intake. Neither action creates WorkIntake or Workflow state. Existing historical Markdown remains a file and is not parsed into current SPS Workflow records. Agent Harness repository reads remain rooted at the Project container; Git operations use registered Main/Dev checkout descriptors.

Current Project discovery now reads only the SPS `selected-project` resource locator. It no longer imports `structuredProviderCutover`, `stagedLegacyImporter`, `legacyEquivalenceVerification`, or `legacyAuthorityInventory`. Incompatible legacy source locators fail closed rather than being migrated. The four production modules and their five migration proof suites were removed after repository-wide production reference checks found no caller beyond the retired selector.

## Qualification evidence

- Production build: `npm run build` — normal Windows lane, passed, with the existing Vite chunk-size advisory.
- Bundle-focused command: `node --test test/project-state/current-project-entry.test.cjs test/project-state/current-project-registration.test.cjs test/source-control/managed-project-source.test.cjs test/work-intake/greenfield-source-bootstrap.test.cjs test/work-intake/structured-work-intake-capture.test.cjs` — 17 passed, 0 failed. It proves Greenfield SPS registration/no WIR, Existing conventional repository adoption, non-Git Project root, Main/Dev checkouts, refs/remotes and dirty/untracked preservation, tracked/ignored baseline behavior, historical Markdown retention, stable reopen, Current Project-only identity, and Agent Harness reads from the Project container.
- Capability catalog: `node --test test/validation/capability-map.test.cjs` — 5 passed, 0 failed; catalog identities and proof ownership match after migration-suite retirement.
- WRB01-04 focused entry suite — 3 passed, 0 failed, including current Project ID and Main/Dev checkout registration through main/preload, historical Markdown entry without Workflow reconstruction, and Landing destinations.
- WRB01-02 topology suite — 4 passed, 0 failed, including adoption rollback boundaries, source preservation, path conflict, and redirect rejection.
- Removed modules/capability/test reference scan — no remaining production/catalog references to the deleted migration chain or provider-generation selector.
- `npm run validate:plan -- --profile work-item --changes tmp/changes.json` � normal Windows lane, exit 0 against the exact final changed-path manifest.
- `npm run test:affected -- --changes tmp/changes.json` � restricted lane returned `spawn EPERM`; normal Windows rerun produced no final receipt and was stopped. The profile is incomplete, not passed. The previously green build and focused proof results remain as reported above.

## Intermediate validation and resolution

Earlier card-level affected profiles selected still-active legacy Work Intake proofs and failed on their Project-root-Git or `ready` assumptions. Those failures were outside each earlier card's owned runtime boundary and were recorded in the respective Implementer Reports. WRB01-05 then retired the obsolete Greenfield Work Intake root-Git scenarios, moved remaining source-preparation test fixtures onto Current Project registration without provider-generation state, and removed migration-only proofs whose production modules had no remaining caller. The final affected-profile run did not produce a receipt; its incomplete status is recorded explicitly and no pass is claimed.

## Remaining deferred runtime and review

The generic Work Intake and routed Work Intake surfaces remain outside the WRB01 landing path. The legacy `captureGreenfieldWorkIntake` fallback remains reachable only through generic `workIntake:submit` when no Current Project has been registered; it still writes its legacy provider-generation marker. WRB01 landing registers SPS before entering Project Intake, so this fallback does not participate in the new Current Project entry path. Further Work Intake retirement remains separate scope.

No WRB02 work should begin until Architect review of this bundle is complete.
