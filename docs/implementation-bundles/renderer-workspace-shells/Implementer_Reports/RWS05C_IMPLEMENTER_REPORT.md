# RWS05C Implementer Report

## Outcome

Greenfield Architect Interview now uses a bounded fifteen-section typed output, SQL semantic candidates, exact Intake provenance, an ArchitectReviewCycle, and exact-version Operator review. The shared Architect shell presents a SQL-derived review on the left and the existing embedded ChatGPT host on the right. Prepare explicitly advances the exact Project Creation Workflow; Intake review alone does not advance it.

## Implementation

- `src/shared/architectWorkspaceContracts.ts` defines the typed transport and application projection. Candidate values map to one proposed BoundedSolution, bounded Findings, acceptance Criteria, and an immutable Evidence reference to the approved Intake ID/version.
- `src/shared/projectState/projectStateService.ts` commits candidates, relationships, provenance, audit/outbox, and cycle membership atomically. Proposed decisions remain Findings. Cycle review checks current semantic versions and current approved Intake provenance. Intake revision makes review stale. Project Creation ownership uses review membership rather than weakening implementation-only planning membership rules.
- `src/main/architectOutputs/structuredArchitectWorkspaceService.ts` exposes constrained get/prepare/save/review commands. The handoff embeds approved SQL Intake, established Project architecture, SourceBaseline evidence, preservation instructions, and repository/machine readiness direction.
- `architectReviewProjectionWriter.ts` rematerializes generated Markdown independently of canonical authority. It uses the dedicated cycle-ID namespace to preserve all historical Interview files; no legacy target is assumed safe to overwrite. Generated review paths are excluded before legacy discovery/parsing. File edits and deletion cannot change SQL.
- `StructuredGreenfieldArchitectWorkspace.tsx` owns candidate transport, revision-view acknowledgment, review notes, and review actions. Browser reload/retry remain at App level. Greenfield no longer refreshes the generic canonical output model or presents its final-draft/prompt buttons.
- `structuredArchitectReadProjection.ts` supplies the synchronous SQL bridge to legacy Project Planning. It checks cycle ownership, member digest, exact-version Decision and approved current Intake. Planning handoffs/draft instructions embed those semantics and obtain repository binding from selected Project context, without reparsing generated Interview/Intake files.
- Approved SQL Intake routes directly to Interview without a canonical Prompt prerequisite. Interview rail status derives from the SQL cycle. Legacy free-form Interview prose is retained as evidence and never converted into authority.

## Validation

- Required work-item affected plan resolved. The affected run selected 105 files; production build passed; 839 test passes and 36 failures were observed (510 seconds).
- Final focused SQL cutover and existing Greenfield Intake proofs: 2/2 passed. They cover preparation without Intake Markdown, atomic candidate persistence before disposition, all fifteen headings, exact membership, file edit/delete rematerialization, stale review rejection, approval, actual Planning handoff generation with the projection deleted, replacement output, Intake revision, historical file preservation, and absence of final canonical Interview/Prompt output.
- SQLite store/cycle and renderer shell proofs: 22/22 passed after correcting generic Finding coverage in the fifteen-section renderer. Final production build and diff whitespace check passed.
- The initial affected run exposed two attributable projection/message assertions, now corrected and rechecked. Twelve remaining tests assert the intentionally retired canonical Interview promotion behavior (Architect Interview workspace, single-file workflow, and production-service proof). Their contract replacement is part of RWS05F qualification; they are not represented as unrelated failures.
- The other 22 failures were observed in repository I/O hardening, reserved toolbox namespace, obsolete Intake post-submit UI, Project Planning IPC registration, execution completion policy, runtime preload wiring, managed source adoption, and workflow integration. These match failures observed in earlier card closures; no clean-baseline reproduction is claimed.
- Validation logs/change sets remain ignored under `tmp/`. No full/release/package lane was invoked.

## Scope and continuation

No schema migration or Project State authority-cutoff advancement. No historical file deletion, WIR migration, Planning family rebuild, or push. Unrelated worktree changes remain excluded from this checkpoint. The build failure stop condition is not met. Continue directly to RWS05D; RWS05F must finish legacy API removal and replace obsolete promotion proofs.
