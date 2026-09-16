# ChampCity A/I V2 Architecture Final Reconciliation

**Date:** September 14, 2026  
**Status:** Final architecture-corpus reconciliation for V2 publication/readiness  
**Compared repositories:** `Brain_Dump/ChampCity_AI` against the frozen `ChampCity_AI` V1 working tree  
**Purpose:** Remove contradictions and stale implementation claims before publishing the V2 architecture corpus into the production repository and beginning V2 implementation.

## 1. Final disposition

**READY FOR PUBLICATION AND V2 IMPLEMENTATION PLANNING.**

The reconciliation found no remaining fundamental product-architecture contradiction that requires another architecture hold. The meaningful conflicts identified in the September 14 comparison were vocabulary, current-source mapping, publication/precedence, and receiving-repository compatibility issues. They have been reconciled in the current corpus and frozen V1 receiving documentation/tests.

This disposition does **not** mean V2 is implemented. It means the architecture corpus is internally coherent enough to become the controlling V2 implementation baseline.

No Git stage, commit, push, branch, merge, reset, clean, restore, or other Git mutation was performed as part of this reconciliation.

## 2. Review method and baseline

The review treated the frozen V1 working tree as current implementation evidence and the reconciled Brain_Dump corpus as proposed/adopted V2 architecture.

Differences were classified as:

1. **contradiction** — two current claims cannot both be true and would send V2 implementation in incompatible directions;
2. **stale implementation claim** — a mapping/document describes V1 source that no longer exists or understates current capability;
3. **intentional V2 delta** — adopted V2 architecture deliberately replaces V1 behavior and therefore must not be “corrected” back to V1; or
4. **historical/optional material** — retained rationale or optional migration design that is subordinate to newer adopted contracts.

Expected V2 replacement of V1 behavior was not treated as a contradiction when applicability was explicit.

## 3. Frozen V1 evidence established during reconciliation

The current frozen V1 source establishes the following implementation facts relevant to V2 extraction:

- `src/**` contains **185 files** in the reviewed frozen working tree.
- Direct `node:fs` / `node:fs/promises` imports remain present across **58 files**, preserving the usefulness of the filesystem-coupling extraction register.
- `src/main/sessionActiveWorkspaceSelection.ts` is the current session selection implementation; the prior false-authority `sessionWorkspaceAuthority` naming is no longer current source.
- `src/main/agentHarness/workspace/workspaceAccess.ts` is current; the prior `workspaceAuthority.ts` source is gone.
- `src/main/documents/repositoryBinding.ts` is current; `repositoryAuthority` remains only where exact legacy compatibility literals require it.
- `src/main/workCardLoop/workCardLoopStateService.ts` and completion-evidence mechanics are current; the old Work Card loop authority service is gone.
- `src/main/agentHarness/repository/gitMutations.ts` implements bounded branch preparation, staging, commit, push, and fast-forward integration.
- `src/main/agentHarness/tools/toolRegistry.ts` dispatches those Git mutation actions rather than exposing placeholder/denied mutation names only.
- V1 contains characterization tests for Development lifecycle, Issue lifecycle, Project/Repository binding, and Runtime/Model selection.
- V1 Work/Fix Card validation is currently Operator-owned and represented that way in characterization tests. This is a **frozen V1 behavior baseline**, not a V2 architectural requirement.

## 4. Reconciliation C01 — Authority vocabulary

### Problem

The September 14 governance standard established one strict semantic rule:

> The human Operator is the only source of product authority.

Frozen V1 source had already been cleaned toward this rule, but several older Brain_Dump architecture documents still used `authority` for technical state, access, routing, capability exposure, workflow eligibility, state-source ownership, Implementer execution, or service responsibility.

Examples included:

- `authorityState` in Structured Project State;
- `authenticatedAuthorityClaims` and `getRequiredAuthority()` in the Client-Service Contract;
- `ActiveProjectAuthority` in the vocabulary migration direction;
- “workflow authority” and “tool authority” in source mappings;
- “authority through capability absence” in the Capability Pack discussion; and
- service/state concepts described as authority owners.

### Resolution

`CCAI-VOCAB-001` is now the controlling vocabulary for the V2 corpus.

The active V2 architecture now uses exact technical concepts:

- **Operator Decision / Disposition** for recorded human decisions;
- **Disposition State** for derived effective decision state;
- **Eligibility** for mechanically legal state/action determination;
- **Scope / Constraint** for bounded work and explicit prohibitions;
- **Access / Authorization** for security/resource access;
- **Policy** for deterministic rules;
- **Binding / Containment** for resource relationships and filesystem boundaries;
- **Canonical Source** for state-source precedence; and
- **Ownership** for technical lifecycle/resource responsibility.

Structured Project State no longer defines `authorityState`; it defines `dispositionState` derived from Decisions. The service contract now exposes `getRequiredOperatorDecision()` rather than `getRequiredAuthority()`. Capability Packs resolve scope/access/policy rather than “mechanical authority.”

Historical and optional migration documents may retain old wording only where they are clearly marked historical or covered by an explicit vocabulary-translation notice. They do not define new V2 types or APIs from that legacy wording.

## 5. Reconciliation C02 — Work/Repair Card Git semantics

### Problem

The Brain_Dump transition copy of the Work/Repair Card standard still said Git mutation should default to prohibited unless explicitly authorized. Frozen V1 had already removed that permission-gate model.

### Resolution

The Brain_Dump standard is now synchronized to the current governance model:

- the Operator is the sole authority;
- an explicit constraint such as `no Git this turn` binds execution;
- when the Operator's direction or bounded task includes Git work, Git operations are ordinary task scope;
- no special token, heading, metadata field, contract, validation record, or workflow state becomes a Git permission principal; and
- MCP/Repository services enforce access, containment, policy, and deterministic Git preconditions rather than inventing a second approval hierarchy.

The standard also records the V1→V2 reporting transition: V1 may retain model-maintained Implementer Reports and card-level Operator validation, while V2 can use structured implementation results, deterministic receipts, independent validation, and automatic completion when no genuine human decision is required.

## 6. Reconciliation C03 — Frozen V1 source maps

### Problem

`SOURCE_EXTRACTION_MAP.md` and `CHAMPCITY_CLIENT_SERVICE_DESKTOP_SOURCE_MAPPING.md` were based on the September 13 tree and still described deleted false-authority files and Git mutation as unimplemented/denied.

### Resolution

Both maps were refreshed against the frozen September 14 V1 working tree.

The extraction map now records:

- 185 `src/**` files;
- current `sessionActiveWorkspaceSelection`, `workspaceAccess`, `repositoryBinding`, and `workCardLoopStateService` names;
- `gitMutations.ts` as proven deterministic source-control implementation material;
- the current 58-file direct-filesystem register;
- V1 legacy Markdown as the current V1 workflow-state implementation but not the V2 state architecture;
- V1 legacy import as optional future work rather than a V2 prerequisite; and
- Design Reviewer/Validator/automatic-completion changes as explicit V2 behavioral deltas.

The Desktop Source Mapping now treats bounded Git mutation as **existing bounded implementation** suitable for RepositoryService extraction rather than future functionality that still needs to be invented.

## 7. Reconciliation C04 — V1/V2 naming and applicability

### Problem

Frozen V1 product documentation said the old shorthand `V2` should be treated as historical because earlier discussion had incorrectly used it as a synonym for Server. The Brain_Dump architecture subsequently used V2 as an architecture-generation label.

Without clarification, those statements would conflict after publication into one repository.

### Resolution

The receiving V1 Product Line document now establishes:

- `ChampCity A/I Desktop` = standalone workstation deployment;
- `ChampCity A/I Server` = server-backed deployment;
- `V1` = frozen architecture/source generation currently implemented by Desktop;
- `V2` = internal shared-product architecture-generation designation; and
- **Server is not synonymous with V2.**

The receiving repository's Source Precedence rules are now generation-aware. A V2 target document is not evidence that V2 behavior already exists. A frozen V1 implementation detail or characterization test does not overrule an explicit adopted V2 replacement decision.

## 8. Reconciliation C05 — Corpus status and precedence

### Problem

Several documents were being used as resolved architecture while their own headers still said `Proposed`, `Draft`, or `Recommended`. The corpus index also omitted the September 14 governance standards and new Architectural Review Cycle.

### Resolution

The current corpus explicitly records adoption/baseline status for:

- Product Capability Model;
- Foundational Architecture Principles;
- Structured Project State Domain Model;
- Client-Service Contract;
- Deterministic Automation Boundaries;
- Agent Runtime Interface Contract v1 implementation baseline;
- Repository and Source Layout Decision;
- Architectural Review Cycle;
- Governance Vocabulary;
- Authority and Delegation Governance;
- Governance Without Bureaucracy; and
- UI Design Governance.

The corpus `README.md` has been rebuilt as the V2 Architecture Corpus Index and now defines precedence, V1/V2 applicability, publication class, canonical vocabulary, explicit V2 changes, and implementation prerequisites.

The September 13 architecture review is explicitly marked historical and superseded for current readiness/status by this final reconciliation and the new corpus index.

## 9. Reconciliation C06 — Publication and duplicate staging copies

### Problem

`Brain_Dump/ChampCity_AI/repo_overlay/` contained second full copies of architecture documents. Publishing both would create two independently editable copies and violate the single-canonical-source rule.

### Resolution

The top-level `Brain_Dump/ChampCity_AI/*.md` files remain the canonical pre-publication sources.

The `repo_overlay/` copies were retired to short non-canonical pointer stubs, and `repo_overlay/README.md` now states that the tree is retired staging material and must not be copied wholesale.

During the physical publication/move, publish only the canonical top-level sources into their intended `docs/` destinations and remove the staging stubs.

## 10. Reconciliation C07 — Frozen V1 receiving compatibility

Three narrow receiving changes were made to frozen V1 documentation/tests without changing product behavior:

1. `docs/product/PRODUCT_LINE_DESKTOP_AND_SERVER.md` now defines V2 as an architecture generation rather than a Server synonym.
2. `docs/architecture/REPOSITORY_CODE_TEST_AND_MIGRATION_BOUNDARY.md` now resolves documentation/source/test precedence by applicable architecture generation and explicitly distinguishes target architecture from implementation evidence.
3. `test/governance/product-authority-vocabulary.test.cjs` now has a path-specific exemption for exactly three meta-governance documents that must quote and define authority terminology:
   - `CHAMPCITY_GOVERNANCE_VOCABULARY.md`;
   - `CHAMPCITY_AUTHORITY_AND_DELEGATION_GOVERNANCE.md`; and
   - `CHAMPCITY_GOVERNANCE_WITHOUT_BUREAUCRACY_STANDARD.md`.

The exemption does **not** weaken the general vocabulary scan. All other active `src/**`, `docs/**`, and `AGENTS.md` content remains subject to the strict false-authority classifier. An additional test requires each published meta-governance document to explicitly identify the Operator and reserve authority to the human.

Two additional publication classes are guarded separately rather than treated as active vocabulary:

- `docs/design-notes/history/**` may preserve superseded wording only when the document explicitly identifies itself as historical/superseded/reconciliation evidence; and
- `docs/migration/legacy/CHAMPCITY_DESKTOP_PROJECT_STATE_MIGRATION_DESIGN.md` may preserve legacy import terminology only while carrying the September 14 `Vocabulary reconciliation` translation notice.

These are narrow path/status exceptions for preserved historical/compatibility evidence. Current V2 contracts, design notes, mappings, and governance outside those categories remain under the normal strict scan.

## 11. Reconciliation C08 — Intentional V2 behavior changes

The following differences from frozen V1 are **deliberate V2 architecture decisions**, not contradictions or regressions:

1. Structured Project State replaces repository Markdown as the live V2 workflow-state model.
2. Architect-produced material planning/contracts use the bounded three-turn Architectural Review Cycle:
   - Turn 1 Architect draft;
   - Turn 2 Design Reviewer critique;
   - Turn 3 Architect dispositions all findings and produces the corrected final artifact;
   - no normal Turn 4 / no consensus loop.
3. The Design Reviewer challenges planning/design before implementation but does not become a second Architect authority or workflow disposition owner.
4. Post-implementation independent conformance moves to a Validator role rather than the Architect advising the Operator on every card.
5. Routine Work/Fix/Repair validation does not require an Operator disposition when deterministic proof and required semantic review establish all non-human criteria.
6. Appropriate visual/human acceptance may be deferred and aggregated at Phase Validation.
7. ChampCity may mechanically close/advance bounded work and run subordinate repair loops within already directed scope when no genuine Operator Decision is required.
8. Git/source-control mechanics become deterministic RepositoryService responsibilities where judgment is unnecessary.
9. Codex becomes the first Agent Runtime adapter rather than the architecture-defining agent runtime.
10. Desktop and Server consume shared Product Core/client/service semantics while remaining alternative deployment modes, not writable peers for one Project State instance.

V1 characterization tests are valuable protection for behavior intended to survive extraction, but each V2 Work Item must explicitly identify which characterized outcomes remain invariants and which are being intentionally changed.

## 12. Historical and optional documents

The following documents are retained for rationale and/or optional future work and are explicitly subordinate to current architecture:

### Project Memory and Autonomous Workbench

`CHAMPCITY_PROJECT_MEMORY_AND_AUTONOMOUS_WORKBENCH_ARCHITECTURE.md` is a historical architecture discussion. Its introductory successor table already states that Structured Project State, Agent Runtime Interface, Runtime Recovery, and current governance control conflicts. Historical uses of `authority` inside the preserved proposal are not V2 type/API definitions.

### Runtime Abstraction Initiative

`CHAMPCITY_RUNTIME_ABSTRACTION_INITIATIVE_DESIGN_DISCUSSION.md` is historical for interface semantics. The Agent Runtime Interface Contract is the implementation target.

### Desktop Project-State Migration Design

`CHAMPCITY_DESKTOP_PROJECT_STATE_MIGRATION_DESIGN.md` is optional future legacy-import research and is not a V2 dependency. It now contains an explicit September 14 vocabulary-translation notice that maps its older `authority` shorthand to canonical Decision/disposition/state-source terminology for any future implementation.

### Capability Pack and Skills discussions

These remain design discussions. Their active design direction was reconciled to current scope/access/policy and governance vocabulary. The Agent Runtime contract, adopted governance standards, and Skills/UI standards take precedence where applicable.

## 13. Publication destination

The current corpus index recommends publication into one canonical production tree. The architecture index itself should publish as `docs/architecture/CHAMPCITY_V2_ARCHITECTURE_CORPUS_INDEX.md`; optional V1 import research belongs under `docs/migration/legacy/`; superseded rationale and the final reconciliation record belong under `docs/design-notes/history/`.

```text
docs/
├── architecture/
├── governance/
├── migration/
└── design-notes/
    └── history/
```

Exact file-to-folder publication mapping is recorded in `../../architecture/CHAMPCITY_V2_ARCHITECTURE_CORPUS_INDEX.md`.

Links must be rewritten for the production locations during the move. Brain_Dump-relative paths and the retired `repo_overlay/` staging tree must not become production architecture dependencies.

## 14. Implementation prerequisites after publication

These are engineering dependencies, **not new approval gates**:

- introduce monorepo/workspace package boundaries when the first extraction requires them;
- implement Structured Project State before extracted workflow logic depends on structured records;
- extract RepositoryService from the proven V1 containment/inspection/mutation mechanics;
- implement Agent Runtime adapters and conformance against the portable interface;
- implement trusted RequestContext access/resource scope and operation-idempotency semantics;
- implement the Architectural Review Cycle and independent Validator orchestration;
- build AI visual-validation tooling before relying on AI as sole visual verifier for criteria requiring the running product;
- implement isolated writable RepositoryCheckouts/leases and configurable attempt/cost/time guardrails before parallel autonomous Implementers; and
- record a reproducible source/characterization baseline for each extraction Work Item.

## 15. Verification performed

The reconciliation used repository status, source/file listings, targeted source reads, and repository-wide searches against both workspaces. The following consistency checks were explicitly performed:

- current frozen V1 source names were verified rather than inferred from prior Brain_Dump text;
- `src/**` inventory was re-counted through the repository listing;
- direct `node:fs` coupling was re-searched;
- bounded Git mutation implementation and tool dispatch were inspected;
- obsolete `sessionWorkspaceAuthority` references were eliminated from the current V2 corpus;
- `ActiveProjectAuthority` was eliminated;
- stale `currently denied` Git claims were eliminated;
- `getRequiredAuthority` was eliminated from the V2 service contract/mapping;
- `authorityState` was eliminated from active V2 structured-state semantics;
- the source map's stale `177` count was corrected to 185; and
- the UI governance standard's remaining `authority` use is limited to the valid `Operator authority` concept.

Repository-level Git readiness and pre-commit scans were executed after the reconciliation:

- `Brain_Dump`: readiness summary — no findings; pre-commit scan — no findings.
- frozen `ChampCity_AI`: the reconciliation itself modifies only the two receiving documentation files plus `test/governance/product-authority-vocabulary.test.cjs`; readiness/pre-commit findings are limited to the pre-existing branding PNG review notices and are unrelated to this uplift.

No package build/test command was executed through this documentation-reconciliation tool surface. The receiving source/test changes are small and should be exercised by the normal repository validation lane when the corpus publication Work Item is executed.

## 16. Final rule for beginning V2

After publication, implementation should proceed from the following model:

```text
Operator direction
        ↓
Adopted governance + V2 architecture
        ↓
Current Work Item
        ↓
Frozen V1 source/characterization evidence
        ↓
Architect → Design Reviewer → Architect final synthesis
        ↓
Implementer
        ↓
Deterministic evidence + independent Validator
        ↓
Mechanical completion/repair progression
        ↓
Operator only where a genuine human Decision/acceptance boundary remains
```

The corpus should not be reopened as a general architecture discussion during normal V2 implementation. New architecture decisions should be created only when implementation exposes a genuinely unresolved product/design choice or when the Operator intentionally changes the adopted direction.

**Final disposition: MIGRATION-READY.**
