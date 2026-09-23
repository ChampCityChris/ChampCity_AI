import { useEffect, useState, type ReactNode } from "react";
import type { RoutedWorkflowAction, RoutedWorkflowInput, RoutedWorkflowModel } from "../../shared/routedWorkflowContracts";
import type { WorkPlanningModel } from "../../shared/workPlanningContracts";
import { ContextLoopBar, type ContextLoopItem } from "./ContextLoopBar";
import { RoutedWorkItemMapWorkspace } from "./RoutedWorkItemMapWorkspace";
import { RoutedWorkItemPlanningWorkspace } from "./RoutedWorkItemPlanningWorkspace";
import { RoutedImplementWorkspace } from "./RoutedImplementWorkspace";
import { RoutedExecutionPanel } from "./RoutedExecutionPanel";

export type RoutedExecutionStepId = "map" | "planning" | "implement" | "review-validation" | "repair" | "close-next" | "acceptance";

const stepDefinitions: readonly { id: RoutedExecutionStepId; label: string }[] = [
  { id: "map", label: "Work Item Map" }, { id: "planning", label: "Planning" },
  { id: "implement", label: "Implement" }, { id: "review-validation", label: "Review & Validation" },
  { id: "repair", label: "Repair" }, { id: "close-next", label: "Close / Next" },
  { id: "acceptance", label: "Acceptance" },
];

export function requiredRoutedExecutionStep(model: RoutedWorkflowModel | null): RoutedExecutionStepId {
  if (!model?.execution || !model.current) return model?.execution?.acceptance.some((entry) => entry.eligible) ? "acceptance" : "map";
  if (model.actions.includes("begin")) return "map";
  if (model.actions.some((action) => ["prepare", "copy", "check-draft", "review-contract"].includes(action))) return "planning";
  if (model.implementer?.state === "running" || model.actions.includes("implement") || model.actions.includes("resolve-environment")) return "implement";
  if (model.actions.includes("create-repair")) return "repair";
  if (model.actions.includes("close")) return "close-next";
  if (model.actions.some((action) => ["review-report", "advisory-review", "validate"].includes(action))) return "review-validation";
  return "map";
}

export function RoutedExecutionWorkspace({ intakeId, selectedWorkItemId, browserPanel, onSelectWorkItem, onDecompose, onReloadBrowser, onStepChange }: {
  intakeId: string;
  selectedWorkItemId: string | null;
  browserPanel: ReactNode;
  onSelectWorkItem: (workItemId: string) => void;
  onDecompose: (workItemId: string) => void;
  onReloadBrowser: () => void;
  onStepChange: (step: RoutedExecutionStepId) => void;
}): JSX.Element {
  const [model, setModel] = useState<RoutedWorkflowModel | null>(null);
  const [plan, setPlan] = useState<WorkPlanningModel | null>(null);
  const [step, setStep] = useState<RoutedExecutionStepId>("map");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function changeStep(next: RoutedExecutionStepId): void { setStep(next); onStepChange(next); }
  useEffect(() => {
    let current = true;
    Promise.all([window.champcity.runRoutedWorkflow(intakeId, "status"), window.champcity.getWorkPlanning(intakeId, "plan")])
      .then(([workflow, approvedPlan]) => {
        if (!current) return;
        setModel(workflow); setPlan(approvedPlan); changeStep("map");
        if (!selectedWorkItemId && workflow.execution?.nextWorkItemId) onSelectWorkItem(workflow.execution.nextWorkItemId);
      }).catch((failure: unknown) => { if (current) setError(failure instanceof Error ? failure.message : "Routed execution could not be loaded."); });
    return () => { current = false; };
  }, [intakeId]);
  useEffect(() => {
    if (model?.implementer?.state !== "running" || busy) return;
    let current = true;
    const timer = window.setTimeout(() => {
      void window.champcity.runRoutedWorkflow(intakeId, "status").then((next) => {
        if (!current) return;
        setModel(next);
        if (next.implementer?.state !== "running") changeStep(requiredRoutedExecutionStep(next));
      }).catch((failure: unknown) => { if (current) setError(failure instanceof Error ? failure.message : "Implementer status could not be loaded."); });
    }, 2000);
    return () => { current = false; window.clearTimeout(timer); };
  }, [intakeId, model, busy]);

  async function run(action: RoutedWorkflowAction, input: RoutedWorkflowInput = {}): Promise<void> {
    setBusy(true); setError("");
    try {
      const next = await window.champcity.runRoutedWorkflow(intakeId, action, {
        expectedFingerprint: model?.execution?.fingerprint,
        workItemId: input.workItemId ?? model?.current?.workItemId,
        ...input,
      });
      setModel(next);
      if (next.execution?.nextWorkItemId && next.execution.nextWorkItemId !== selectedWorkItemId) onSelectWorkItem(next.execution.nextWorkItemId);
      changeStep(action === "activate" || action === "close" ? "map" : requiredRoutedExecutionStep(next));
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Routed Work Item action failed."); }
    finally { setBusy(false); }
  }

  const current = model?.current;
  const plannedCount = model?.execution?.workItems.length ?? plan?.artifact?.structure?.workItems.length ?? 0;
  const selected = selectedWorkItemId ?? model?.execution?.nextWorkItemId ?? plan?.artifact?.structure?.workItems[0]?.workItemId ?? "Plan";
  const required = requiredRoutedExecutionStep(model);
  const items: ContextLoopItem<RoutedExecutionStepId>[] = stepDefinitions.map((definition) => {
    const available = definition.id === "map" || definition.id === "planning" && Boolean(current && !model?.actions.includes("begin"))
      || definition.id === "implement" && Boolean(model?.implementer)
      || definition.id === "review-validation" && Boolean(current?.report)
      || definition.id === "repair" && Boolean(model?.actions.includes("create-repair"))
      || definition.id === "close-next" && Boolean(model?.actions.includes("close"))
      || definition.id === "acceptance" && Boolean(model?.execution?.acceptance.some((entry) => entry.eligible));
    return { id: definition.id, label: definition.label, fullLabel: definition.label, destination: definition.id,
      available, reason: "Complete the preceding Work Item task first.",
      stateFor: (active) => active === definition.id ? "exact" : "available" };
  });
  return <section className="routed-execution-workspace" aria-label="Routed Work Item loop">
    <ContextLoopBar activeDestinationId={step} activeStepId={required} ariaLabel="Routed Work Item loop"
      context={{ id: selected, position: `${plannedCount} planned Work Items` }} items={items} label="Work Item Map"
      onDestinationChange={changeStep} workCard />
    {step === "map" ? <RoutedWorkItemMapWorkspace model={model} plan={plan} selectedWorkItemId={selectedWorkItemId}
      busy={busy} error={error} onSelect={onSelectWorkItem} onActivate={() => void run("activate")}
      onBegin={(workItemId) => void run("begin", { workItemId })}
      onContinue={() => changeStep(required)} onDecompose={onDecompose} />
      : step === "planning" ? <RoutedWorkItemPlanningWorkspace model={model} browserPanel={browserPanel} busy={busy} error={error}
        onReloadBrowser={onReloadBrowser} onAction={(action, input) => void run(action, input)} onDecompose={onDecompose} />
        : step === "implement" ? <RoutedImplementWorkspace model={model} busy={busy} error={error}
          onAction={(action, input) => void run(action, input)} />
          : <RoutedExecutionPanel intakeId={intakeId} />}
  </section>;
}
