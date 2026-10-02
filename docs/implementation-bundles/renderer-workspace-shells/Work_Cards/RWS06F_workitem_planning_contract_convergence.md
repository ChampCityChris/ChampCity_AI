# RWS06F — WorkItem Planning / Contract Convergence

**Status:** IMPLEMENTER_READY  
**Sequence:** follows RWS06A–RWS06E checkpoints

## Objective

Converge Greenfield Formal Work Card planning and exact Workflow per-WorkItem Architect execution planning on the same SQL WorkItem contract.

## Verified starting point

Exact Workflow execution already stores:
- `implementationBoundaries`;
- `affectedPaths`;
- `proofIntent`;
on the WorkItem and requires them before Implementer execution.

The exact Architect WorkItem planning prompt is currently built inline in `WorkflowExecutionWorkspace.tsx`.

Greenfield still treats Formal Work Card Markdown as a gating authority.

## Required implementation

Move Architect WorkItem prompt construction/validation into application/service code.

Use one typed contract for all executable WorkItems:
- exact Workflow/WorkItem ID and expected version;
- implementation boundaries;
- affected paths;
- proof intent;
- optional typed decomposition proposal.

For Greenfield, map Formal Work Card semantics into the existing SQL WorkItem/Criteria contract. Generated Formal Work Card Markdown may remain for Operator readability/export only.

Operator review must govern the exact current WorkItem contract revision before implementation when review is required.

## Decomposition

Preserve existing typed sibling/decomposition and direct→phased correction behavior. A topology correction must pass the RWS06A deterministic topology rules and never silently manufacture Phases.

## UI

Use the RWS05 Architect shell or a bounded adapter for the Architect planning interaction. Do not construct prompts, parse raw Architect JSON, or own persistence rules inside renderer components.

## Legacy

Deterministically migrate structured Formal Work Card metadata only when exact WorkItem identity is known. Preserve free-form body as historical evidence if semantic reconstruction is ambiguous.

## Focused proof

Prove one typed WorkItem planning contract for Greenfield and exact Workflows; renderer contains no prompt-construction authority; SQL revision/currentness rules; decomposition preservation; generated Work Card isolation.

## Report / checkpoint

Report: `.../Implementer_Reports/RWS06F_IMPLEMENTER_REPORT.md`

Commit: `RWS06F converge workitem planning contracts`

Continue to RWS06G.