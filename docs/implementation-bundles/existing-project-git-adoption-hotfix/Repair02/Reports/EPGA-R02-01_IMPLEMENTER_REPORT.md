# EPGA-R02-01 Implementer Report

## Scope and repository

- Approved repository root: verified from the active checkout before mutation; no alternate workspace was used.
- Card: Repair Card `EPGA-R02-01 — Provision Current Managed Repository Integration Policy`.
- Branch: `dev`.
- Starting HEAD: `9b3d4a40fc978b2f57d7ca7b1a6ebbc3372898d4` (`Revise Repair02 to provision current integration policy`).
- Remote: `origin` is configured for the governed repository; the branch began 180 commits ahead of `origin/dev`.
- Initial working tree: clean.

## Files

Created:

- `src/main/planExecution/integrationSourceIntegrityRunner.ts`
- `src/main/sourceControl/managedRepositoryIntegrationPolicy.ts`
- `docs/implementation-bundles/existing-project-git-adoption-hotfix/Repair02/Reports/EPGA-R02-01_IMPLEMENTER_REPORT.md`

Modified:

- `src/shared/integrationPolicyContracts.ts`
- `src/main/planExecution/integrationPolicyProvider.ts`
- `src/main/planExecution/integrationValidationProfileRunner.ts`
- `src/main/sourceControl/existingProjectGitAdoptionService.ts`
- `src/main/sourceControl/projectSourceBootstrap.ts`
- `test/agent-harness/integration-policy-semantics.test.cjs`
- `test/source-control/managed-project-source.test.cjs`
- `test/work-intake/greenfield-source-bootstrap.test.cjs`
- `validation/capability-map.json`
- `docs/architecture/PROJECT_INTEGRATION_VALIDATION_POLICY.md`

Deleted: none.

Intentionally not created or changed:

- no schema-version compatibility path or legacy-policy migration;
- no shell/arbitrary-command runner;
- no generated Integration Repair scope;
- no dependency, database schema, IPC, preload, renderer, packaging, or real-Project conversion change;
- no JSON workflow/report sidecar.

## Implementation result

One application-owned provisioner now creates a fresh current `IntegrationPolicy` at the managed-repository baseline boundary. Generic repositories receive `champcity-source-integrity` in the `static` lane with a 60000 ms bound. The same provisioner is called by Existing Project forced normalization and Greenfield bootstrap, and both flows force-track the generated file despite the managed `.champcity/` ignore rule.

Validation-profile capability detection uses the existing fixed adapter authority: every named `scripts/validation/*` toolkit file, `validation/capability-map.json`, `validation/profiles.json`, and nonempty bounded `build` and `typecheck` package script definitions must be ordinary, contained, bounded, and structurally readable. Detection reads bytes and JSON only; it does not load or execute incoming toolkit code. Incomplete authority falls back to source-integrity.

The ChampCity-style fixture receives a freshly generated `champcity-integration-gate` policy with no `repair` section. Its arbitrary incoming Project-container policy bytes do not survive, `loadIntegrationPolicyAtCommit(Dev, baseline)` succeeds, and the production provider resolves the target validation-profile authority.

Existing Project normalization removes `.champcity` from the preserved ordinary-source snapshot before generating the repository policy. Focused proof confirms that Project State, repository metadata, checkouts, migrations, arbitrary container files, and legacy policy bytes are absent from the canonical tree; only `.champcity/integration-policy.json` is committed by this step.

Greenfield bootstrap commits the same generic policy contract. Reopening a managed Greenfield Project preserves an intentionally changed repository policy rather than regenerating it.

The new source-integrity runner accepts no executable input and executes no repository code. Through production provider resolution it verifies the exact registered isolated candidate, unchanged common repository identity, expected candidate revision, cleanliness, and absence of conflicts, and returns bounded deterministic evidence. The fixture includes a repository script that would create a sentinel if run; the sentinel remains absent.

## Validation evidence

| Command | Lane | Result |
| --- | --- | --- |
| `npm run build` | restricted sandbox | Exit 1 after TypeScript passed; Vite/esbuild produced the documented `spawn EPERM`. This is execution-lane evidence, not a source failure. |
| `npm run build` | normal Windows | Exit 0; TypeScript, Vite production build, and branding asset copy passed. Vite transformed 1666 modules; only the existing chunk-size advisory was emitted. |
| `node --test --test-concurrency=1 test/source-control/managed-project-source.test.cjs test/work-intake/greenfield-source-bootstrap.test.cjs test/agent-harness/integration-policy-semantics.test.cjs test/agent-harness/integration-profile-gate.test.cjs test/agent-harness/integration-candidate-semantics.test.cjs` | normal Windows focused capability/integration | Initial run: 39 tests, 35 passed and 4 failed solely because the new catalog behavior was out of lexical order. Managed adoption (11), Greenfield (1), integration-policy/source-integrity (11), and candidate semantics (9) passed. Catalog order was corrected. |
| `node --test --test-concurrency=1 test/agent-harness/integration-profile-gate.test.cjs test/validation/capability-map.test.cjs` | normal Windows focused integration/static | Final rerun: exit 0, 12/12 passed, including all validation-profile cases and capability-map integrity. |
| `node --test test/validation/capability-map.test.cjs` | normal Windows focused static | Exit 0, 5/5 passed after staged-diff review corrected a test-count annotation that had been applied to the adjacent catalog record. |
| `npm run test:migration -- --preview` | validation-plan preview | Exit 0; selected the one owned migration test and production-build static step without executing migration proof. |
| `git diff --check` | static repository hygiene | Exit 0. |
| capability-map JSON parse | static repository hygiene | Exit 0. |

The five direct focused test commands were also attempted once in the restricted lane; each Node test worker failed immediately with `spawn EPERM`. Per the validation-lane contract they were not retried there and were rerun in the normal Windows lane above.

Skipped by scope:

- Current Project entry tests: no entry-controller, IPC, registration ordering, or landing behavior changed.
- broad/full regression and release qualification: explicitly excluded as the Repair Card completion gate.
- visual/experiential and external-integration validation: not applicable to this source-control policy change.

## Git, security, and residual risk

- Required checkpoint commit: pending at report creation. The actual hash is reported after commit rather than amended into this artifact.
- No push, merge, rebase, tag, reset, clean, or real ChampCity_AI Project conversion was performed.
- Exact staged-diff review and secret, local-path, generated-artifact, and whitespace safety scans passed before the checkpoint commit.
- No secrets, credentials, `.env` contents, generated output, dependency state, concrete local-machine paths, or runtime Project state are included in the intended commit.
- Operator manual validation: none required for deterministic source semantics. Architect review remains required by the Repair Card STOP condition.
- Residual risk: repositories with a future validation toolkit contract intentionally fall back to source-integrity until the application-owned fixed authority list is deliberately updated.

## Recommended next task

Architect review of the `EPGA-R02-01 provision managed repository integration policy` checkpoint. Do not convert the real ChampCity_AI Project until this Repair02 implementation is reviewed and accepted.
