import type { WorkflowExecutionPlanView } from "../../shared/projectState/projectStateService";

export function WorkflowPlanningMap({ plan }: { plan: WorkflowExecutionPlanView | null }): JSX.Element {
  if (!plan) return <p role="alert">The accepted Workflow plan is unavailable.</p>;
  const work = [...plan.directWorkItems, ...Object.values(plan.workItemsByPhase).flat()];
  const byId = new Map(work.map(item => [item.id, item]));
  const criteria = new Map(plan.criteria.map(item => [item.record.id, item.record]));
  const renderWork = (id: string) => {
    const item = byId.get(id); if (!item) return null;
    const dependencies = plan.dependencyIds.filter(edge => edge.from === id).map(edge => byId.get(edge.to)?.body.title ?? edge.to);
    return <li key={id}><strong>{item.body.title}</strong> ({item.body.workItemKind}) — {item.body.objective}{dependencies.length > 0 && <p>Depends on: {dependencies.join(", ")}</p>}
      {plan.criteria.filter(row => row.ownerId === id).map(row => <p key={row.record.id}>Criterion: {row.record.body.statement} · {row.record.body.validationPolicy}</p>)}</li>;
  };
  return <section aria-label="Read-only accepted Work Item Map"><p>Topology: <strong>{plan.phases.length ? "Phased" : "Direct"}</strong></p>
    {plan.solutions.map(solution => <article key={solution.id}><h3>Bounded Solution: {solution.body.title}</h3><p>{solution.body.objective}</p><p>Scope in: {solution.body.scopeIn.join("; ")}</p><p>Scope out: {solution.body.scopeOut.join("; ")}</p></article>)}
    {plan.phases.length > 0 ? plan.phases.slice().sort((a,b) => a.sequence-b.sequence).map(phase => <section key={phase.phaseId}><h3>Phase {phase.sequence}: {phase.record.body.title}</h3><p>{phase.record.body.objective}</p><ul>{(plan.workItemsByPhase[phase.phaseId] ?? []).map(item => renderWork(item.id))}</ul></section>) : <ul>{plan.directWorkItems.map(item => renderWork(item.id))}</ul>}
    <h3>Solution criteria</h3><ul>{plan.criteria.filter(row => row.ownerId === plan.solutions[0]?.id).map(({record}) => <li key={record.id}>{record.body.statement} · {record.body.validationPolicy}</li>)}</ul>
    <p>{plan.decisions.length} accepted planning decision(s). This map is read-only.</p>
  </section>;
}
