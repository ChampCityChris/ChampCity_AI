# ChampCity_AI Agent and Contributor Contract

This file is the durable repository contract for Implementers, coding agents, and contributors. Deeper rules are linked rather than duplicated here.

## Repository instruction precedence

Use this precedence order:

1. the active Operator-approved Work Card or Repair Card and any explicit handoff;
2. current repository source, configuration, and current documentation under `docs/`;
3. current capability-oriented tests and curated fixtures under `test/`;
4. `archive/` only as historical evidence when the active work explicitly requires it.

Verify that the working directory is the approved repository root before changing files. Use repository files instead of vague chat context when a durable source exists.

## Bounded scope

- Implement the active card literally and do not broaden its in-scope surface.
- Do not add dependencies, integrations, migrations, compatibility paths, schema changes, or unrelated refactors unless explicitly in scope.
- Stop and report missing task scope when safe completion would require work outside the card, a new product decision, or a prohibited mechanism.
- Do not change production behavior merely to preserve an obsolete test or archived workflow.

Work Cards and Repair Cards must follow [the creation standard](docs/governance/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md).

## Production, test, and archive boundaries

Before changing production code, tests, scripts, migrations, fixtures, packaging, or validation configuration, read [Repository Code, Test, and Migration Boundary](docs/architecture/REPOSITORY_CODE_TEST_AND_MIGRATION_BOUNDARY.md).

- Production code belongs under `src/` or another explicitly approved runtime package.
- Production code must not import runtime behavior from `test/`, `planning/`, `archive/`, generated output, temporary fixtures, or abandoned scripts.
- Tests remain under `test/`, use curated or synthetic workspaces, and are not packaged runtime code.
- Historical records under `archive/` must not be restored or interpreted as current schemas, migrations, fixtures, or workflow sources.
- Current governed workflow records use one canonical Markdown document with application-owned metadata. Do not create JSON sidecars unless a current contract explicitly requires them.
- Repository selection and writes are main-process responsibilities exposed through constrained preload methods. Renderer code must not receive unrestricted filesystem access.

## Security and durable artifacts

- Never expose, request, print, commit, or persist secrets, API keys, tokens, credentials, cookies, private keys, or `.env` contents.
- Keep writes inside the approved repository or user-selected project boundary.
- Do not claim validation or external integration evidence that was not actually observed.
- Durable committed artifacts must use repository-relative paths or `<PROJECT_REPO>`, never concrete local-machine, home-directory, or temporary paths.
- Keep generated output, dependency state, large local archives, screenshots, and unrelated machine artifacts out of source control unless explicitly included in the current task scope.

## Git safety

The Operator is the only authority over Git and release work. Current Operator direction and explicit task constraints define the scope of every branch, stage, commit, push, merge, rebase, tag, release, reset, clean, restore, and stash action. A Work Card or Repair Card may record those constraints, but it is not a permission source and does not permit Git mutation.

- Obey any explicit prohibition such as `no Git this turn`.
- When the Operator directs Git work, treat the bounded Git operations as ordinary task scope; no card heading, token, metadata field, contract, or MCP state is an additional approval requirement.
- When Git mutation is outside the current task scope, limit Git use to read-only inspection.
- Preserve unrelated working-tree changes. Never use destructive blanket cleanup to make a dirty worktree appear clean.
- Before an Operator-directed commit, inspect the exact staged diff and run a bounded secret, local-path, and generated-artifact safety scan.
- Never push directly to a protected or release branch unless the Operator explicitly directs it.

## Validation and acceptance

Before running builds, tests, Electron, Vite, esbuild, Playwright, packaging, or any child-process-heavy command, read [Validation Command Lanes](docs/dev/VALIDATION_COMMAND_LANES.md).

- Run every validation command required by the active card and report the exact command, execution lane, exit result, and relevant failures.
- If restricted execution produces `spawn EPERM`, record that result once and rerun the equivalent command in the approved normal Windows lane. Do not repeatedly retry the restricted lane or count it as a pass or source failure.
- Separate static/build checks, capability tests, production-path tests, launch smoke, and external-integration evidence.
- Implementers may perform automated checks and non-acceptance smoke checks included in the current task scope. Routine Work Card and Repair Card validation or closure may proceed from deterministic or independent semantic evidence when the governing workflow supports it. Operator validation is required for genuinely visual or experiential judgment, residual-risk decisions, policy exceptions, or explicit release acceptance—not merely because a card exists.
- Literal architecture and task-scope requirements remain mandatory even when tests pass.

## Implementer Reports

Every implementation pass must create the Markdown Implementer Report at the exact path required by the active card. When the card supplies no path, place it in the relevant workflow-owned `Implementer_Reports/` directory with an `IMPLEMENTER_REPORT_` filename.

The report must identify:

- the approved repository root verification, without a concrete local path;
- card type and identifier;
- branch and remote status;
- files created, modified, deleted, and intentionally not created;
- implementation summary and evidence used;
- commands, execution lanes, validation results, skipped checks, and reasons;
- Git actions and actual commit hash when a commit was Operator-directed, or explicit no-mutation confirmation;
- security and local-path safety results;
- remaining Operator manual validation, blockers, residual risks, and recommended next task.

Do not amend a commit solely to insert that commit's hash into a report committed with the same work. Record it as pending in the artifact and report the actual hash after commit.

## Maintainer references

- [Development Guide](docs/development/DEVELOPMENT_GUIDE.md)
- [Release Process](docs/release/RELEASE_PROCESS.md)
- [Repository Code, Test, and Migration Boundary](docs/architecture/REPOSITORY_CODE_TEST_AND_MIGRATION_BOUNDARY.md)
- [Validation Command Lanes](docs/dev/VALIDATION_COMMAND_LANES.md)
- [Work Card and Repair Card Creation Standard](docs/governance/WORK_CARD_AND_REPAIR_CARD_CREATION_STANDARD.md)
