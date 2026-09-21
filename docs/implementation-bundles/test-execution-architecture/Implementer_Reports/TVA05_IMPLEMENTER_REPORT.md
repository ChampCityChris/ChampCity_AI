# TVA05 Implementer Report

## Scope and repository

Work Card TVA05. Approved repository/worktree root verified. Branch `codex/test-execution-architecture` from local dev `05eef38`; origin/dev was 45 commits behind at initialization. No fetch/push, no original checkout changes, no commit/merge yet. Final hash pending staged review and safety scan under the Operator's merge direction.

## Implementation

Created `scripts/validation/affected.cjs`, `test/fixtures/validation/affected-changes.json`, and `renderer-change.json`. Modified catalog validation, planner, preview CLI, profile policy, capability-map source patterns, and validation-runner contracts. This report is new. No deleted files, dependencies, production mutation, integration-policy change, or hidden test inventory.

Exact repository-relative paths match every applicable sourcePattern with deterministic *, ** and ? semantics. Changed executable tests additionally use their existing canonical behavior ownership. Explicit Work Item capabilities only add owners. Dependencies are traversed in the declared owner -> dependsOn direction; this is dependency proof, not an inferred reverse-consumer graph. Catalog DFS rejects cycles before selection. Overlapping source owners are all included (for example shared Git mutation source selects repository operations and release/Git operations).

For each affected behavior, validated preferred references resolve to the canonical primary. The selector includes primary and explicitly complementary proof in allowed profile lanes, omitting redundant/overlapping proof. Wider-profile restrictions remain respected. Per-capability, behavior and file rationale is returned, including behaviors deliberately outside the chosen profile lanes. Missing primary proof fails catalog validation. Unknown paths fail with a concrete list and instruction to add reviewed canonical sourcePatterns; there is no full-suite fallback. Profiles explicitly require catalog integrity; work-item, repair and phase-close include the complete fast lane. Integration selects affected fast/integration proof. Required capabilities and documentation rules live in checked-in profiles, not a parallel file list.

Documentation ownership is explicit in the catalog and documentation-only policy in profiles permits static-only plans. Ownership was added for the new validation tooling/fixtures and the previously unmapped integration execution modules used by this bundle. The planner performs no Git calls. Application/source-control revision diff input remains TVA06's adapter responsibility.

Preview accepts a strict JSON fixture with changedPaths and optional capabilityIds, for example `node scripts/validation/cli.cjs preview --profile integration-gate --changes test/fixtures/validation/renderer-change.json`.

## Validation

Normal Windows focused command: `node --test --test-concurrency=1 test/validation/capability-map.test.cjs test/validation/validation-runner.test.cjs`, exit 0, 11/11, 5813.88 ms. Curated cases cover single/multiple owners, shared Git ownership, docs, unknown source, explicit scope broadening, all input orders, literal pattern punctuation, graph cycles and stable CLI preview. No Git command is used by selection.

Observed integration-gate selections: renderer 26 files; MCP HTTP runtime 19; shared Git mutation 17; combined renderer/environment 28; documentation 1 static file/no build; development-environment contract 3 files. Renderer/MCP previews exclude Desktop, packaging, performance and unrelated project planning. These are previews, not claims that every selected set was executed.

Representative exact-path execution used a Node stdin driver calling `executePlan(planValidation({profile:'integration-gate',changedPaths:['src/shared/developmentEnvironment/developmentEnvironmentContract.ts']}))`, normal Windows. Exit 0, one production build 10786 ms, three selected files passed (preflight service 2 tests, catalog 5, environment contract 7), total 11349 ms. Raw receipt remains ignored under tmp. CLI renderer fixture preview and `git diff --check` exited 0 in the static/read-only lane.

No repository-wide aggregate, full-supported run, legacy git boundary file, or live external provider used. No UI/package/visual acceptance claim.

## Safety and outcome

Only repository-relative paths and synthetic fixtures are durable. No secrets, local machine paths, generated outputs, new dependencies, or Git mutation since worktree/branch creation. The declared dependency graph intentionally determines scope; broad source patterns can select broad proof and should be refined only with ownership evidence. No unresolved acceptance blocker or Operator judgment. TVA05 complete; next TVA06.
