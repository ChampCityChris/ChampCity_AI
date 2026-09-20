import type { WorkPlanningProfile, WorkResearchOutcome } from "../../../shared/workPlanningContracts";

export const researchPrototypeProfile: WorkPlanningProfile = {
  routeId: "research-prototype",
  requiredEvidence: [
    "Inspect the bounded question/hypothesis, existing research, alternatives, relevant constraints, and the specific Operator decision the investigation enables. Distinguish observations from assumptions and untested claims.",
    "Establish required evidence and success/failure criteria before defining a bounded prototype. Capture negative and inconclusive results honestly; research success is an informed decision, not automatic product delivery.",
  ],
  discoveryQuestions: [
    "Define the question/hypothesis, decision enabled, alternatives, experiment/prototype boundary, required evidence, and success/failure criteria. Timebox the investigation with explicit expiration/closure conditions.",
    "Classify prototype output as disposable or candidate-for-later-work. Candidate status is evidence for a later decision, not production approval or adopted architecture.",
    "Allow evidence plus an explicit Operator decision to close this research with no implementation Plan required and zero Work Items. Do not manufacture Phases or Work Cards to satisfy delivery templates.",
    "If production work is recommended, require a new Work Intake and explicit later planning/approval. Never silently promote prototype output, infer a Feature/Greenfield roadmap, or begin production implementation.",
    "If bounded research work remains, recommend a research Plan only for the experiments needed to answer this question. Keep production follow-up outside that Plan.",
  ],
  assessmentSections: ["Question Hypothesis and Decision", "Alternatives", "Bounded Prototype and Evidence", "Success Failure and Findings", "Output Classification", "Expiration and Closure", "Research Outcome"],
  planSections: ["Research Question and Alternatives", "Bounded Experiments and Required Evidence", "Success Failure and Expiration", "Disposable Output and Later Work"],
  topologyCriteria: [
    "Research may terminate after approved evidence and decision without a Plan, Phases, or Work Items. When a research Plan is needed, choose direct or phased from real experiment dependencies and acceptance boundaries.",
    "A research Plan never authorizes production promotion. Subsequent production work requires its own explicit Work Intake and approved planning.",
  ],
};

export function researchOutcomeFromBody(body: string): WorkResearchOutcome {
  const blocks = [...body.replace(/\r\n?/g, "\n").matchAll(/^```champcity-research-outcome\s*\n([\s\S]*?)^```\s*$/gm)];
  if (blocks.length !== 1) throw Error("Research assessment requires exactly one champcity-research-outcome block.");
  let value: unknown;
  try { value = JSON.parse(blocks[0][1]); } catch { throw Error("Research outcome must contain valid JSON."); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("Research outcome must be an object.");
  const entry = value as Record<string, unknown>;
  const text = (field: unknown): field is string => typeof field === "string" && !!field.trim() && field.length <= 4000;
  if (Object.keys(entry).some((key) => !["outcome", "prototypeDisposition", "productionFollowUp", "evidence", "decisionEnabled", "successFailureResult", "closureCondition"].includes(key)) ||
    !["no-implementation-plan-required", "research-plan-required"].includes(entry.outcome as string) ||
    !["disposable", "candidate-for-later-work"].includes(entry.prototypeDisposition as string) ||
    !["none", "new-work-intake-required"].includes(entry.productionFollowUp as string) ||
    entry.prototypeDisposition === "candidate-for-later-work" && entry.productionFollowUp !== "new-work-intake-required" ||
    !Array.isArray(entry.evidence) || !entry.evidence.length || entry.evidence.length > 100 || !entry.evidence.every(text) ||
    !text(entry.decisionEnabled) || !text(entry.successFailureResult) || !text(entry.closureCondition)) {
    throw Error("Research outcome requires bounded evidence, decision, findings, closure, output classification, and explicit later-work disposition; automatic production promotion is forbidden.");
  }
  return entry as unknown as WorkResearchOutcome;
}

export const researchOutcomeInstruction = [
  "Include exactly one champcity-research-outcome JSON block in the Research Outcome section, using this shape:",
  "```champcity-research-outcome",
  JSON.stringify({ outcome: "no-implementation-plan-required", prototypeDisposition: "disposable", productionFollowUp: "none", evidence: ["Observed evidence and its source"], decisionEnabled: "Decision supported by findings", successFailureResult: "Actual result against criteria", closureCondition: "Satisfied closure/expiration condition" }),
  "```",
  "Use research-plan-required only when bounded research Work Items remain. Use candidate-for-later-work only with productionFollowUp new-work-intake-required. No other production promotion disposition is allowed.",
  "The outcome is advisory until the Operator approves this assessment. Approval of no-implementation-plan-required closes this research with evidence and decision, without an implementation Plan.",
].join("\n");
