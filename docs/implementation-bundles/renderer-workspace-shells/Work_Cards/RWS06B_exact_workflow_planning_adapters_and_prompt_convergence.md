# RWS06B — Exact Workflow Planning Adapters and Prompt Convergence

**Status:** IMPLEMENTER_READY  
**Depends on:** RWS06A

## Objective

Give every substantive existing-project Workflow one exact SQL-backed Planning surface using the RWS06A Plan review model and existing route-specific planning knowledge.

## Workflow coverage

- Feature / Capability
- Issue Resolution / Correction Planning
- Refactor / Migration
- Integration / Composition
- Infrastructure / Platform
- Research / Prototype

Research may close after an approved Assessment when its structured outcome says no implementation Plan is required.

## Prompt architecture

Reuse the existing route profile content under `src/main/workPlanning/profiles/*`:
- required evidence;
- discovery priorities;
- Plan sections;
- topology criteria.

Converge prompt/orchestration on exact Workflow identity rather than old WorkIntake route-decision identity.

Feature/Issue prompt behavior should be folded into the same profile-driven application service where practical without losing their specific RCA/assessment requirements.

Prepared prompts must identify exact Project, Workflow ID/type, approved Intake/Architect-review revisions, SourceBaseline, relevant accepted semantic records, and the typed RWS06A output contract.

Do not ask the model to author canonical Markdown or choose final topology.

## Planning behavior

For every covered Workflow:
1. approved current Architect Assessment/RCA is prerequisite;
2. prepare Plan handoff;
3. ingest typed Plan candidate to SQL;
4. derive topology with RWS06A resolver;
5. generate readable Markdown projection;
6. Operator reviews exact Plan revision;
7. approval materializes the accepted execution graph;
8. advance to Work Map / Execution readiness.

WIR is not required. Direct and WIR-created target Workflows use identical Planning contracts.

## Migration

Feature/Issue accepted SQL graphs remain canonical and must be adopted/read without recreation.

Old generic route-kernel Markdown planning artifacts are historical unless a deterministic machine-readable `champcity-work-plan` block can be validated and mapped unambiguously to the exact current Workflow. Do not infer missing exact Workflow identity.

## Preserve

Research no-plan closure semantics; Issue Fix WorkItem kind; Source-neutral validation restrictions; all exact Workflow identity/currentness rules.

## Focused proof

Prove all six Workflow types can prepare a Plan candidate; exact Workflow identity is enforced; direct/WIR creation converge; each profile contributes its route-specific prompt content; accepted Plan persists correct SQL graph; Research can close with no Plan; legacy ambiguous Markdown blocks.

## Report / checkpoint

Report: `.../Implementer_Reports/RWS06B_IMPLEMENTER_REPORT.md`

Commit: `RWS06B converge exact workflow planning adapters`

Continue to RWS06C.