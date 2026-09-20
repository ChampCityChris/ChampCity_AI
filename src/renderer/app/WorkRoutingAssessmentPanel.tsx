import { useEffect, useState } from "react";
import type { WorkRoutingAssessmentModel } from "../../shared/workRoutingAssessmentContracts";
import { workRouteProfileRegistry } from "../../shared/workIntakeRoutingContracts";
import { WorkRouteDecisionPanel } from "./WorkRouteDecisionPanel";

export function WorkRoutingAssessmentPanel({ intakeId }: { intakeId: string }) {
  const [model, setModel] = useState<WorkRoutingAssessmentModel | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [routeRefresh, setRouteRefresh] = useState(0);
  useEffect(() => {
    let current = true;
    window.champcity.getWorkRoutingAssessment(intakeId).then((next) => { if (current) setModel(next); })
      .catch((failure: unknown) => { if (current) setError(String(failure)); });
    return () => { current = false; };
  }, [intakeId]);
  async function run(action: "prepare" | "copy" | "refresh") {
    setBusy(true); setError(""); setCopied(false);
    try {
      if (action === "copy") { await window.champcity.copyWorkRoutingAssessment(intakeId); setCopied(true); }
      setModel(await (action === "prepare" ? window.champcity.prepareWorkRoutingAssessment(intakeId) : window.champcity.getWorkRoutingAssessment(intakeId)));
      setRouteRefresh((current) => current + 1);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Routing assessment action failed."); }
    finally { setBusy(false); }
  }
  return <section aria-label="Advisory routing assessment">
    <h2>Routing assessment</h2>
    <p>The Architect recommends a route from this Intake and current repository evidence. Your route decision follows separately.</p>
    {error || model?.error ? <p role="alert">{error || model?.error}</p> : null}
    <p role="status">{copied ? "Routing handoff copied." : model?.state ?? "Loading assessment…"}</p>
    <button disabled={busy} onClick={() => void run("prepare")}>Prepare routing assessment</button>
    <button disabled={busy || !model?.preparedInstruction} onClick={() => void run("copy")}>Copy routing handoff</button>
    <button disabled={busy} onClick={() => void run("refresh")}>Check and promote submitted draft</button>
    {model?.submission ? <p>Draft: {model.submission.expectedDraftSlots[0]?.draftRelativePath}</p> : null}
    {model?.assessment ? <article>
      <h3>Recommended: {workRouteProfileRegistry[model.assessment.recommendedRouteId].label}</h3>
      <p>{model.assessment.rationale}</p>
      <p>Traits: {model.assessment.traits.join(", ") || "None"}</p>
      <p>Evidence: {model.assessment.evidencePaths.join(", ")}</p>
      {model.assessment.alternate ? <p>Alternate: {workRouteProfileRegistry[model.assessment.alternate.routeId].label}. {model.assessment.alternate.rationale}</p> : null}
      <p>The recommendation is advisory; your decision below controls the selected route.</p>
    </article> : null}
    <WorkRouteDecisionPanel intakeId={intakeId} assessmentRevision={routeRefresh + (model?.assessment?.artifactRevision ?? 0)} />
  </section>;
}
