import type { ProjectIntake } from "../projectIntake";

export const projectIntakeFixture: ProjectIntake = {
  projectIntakeId: "PROJECT_INTAKE_champcity_a_i",
  projectName: "ChampCity A/I",
  workingTitle: "Project Intake capture",
  createdAt: "2026-06-30T15:00:00.000Z",
  updatedAt: "2026-06-30T15:00:00.000Z",
  productSummary:
    "A desktop planning app that helps an Operator capture plain-language project intent before asking the Architect to shape it.",
  targetUsers:
    "A non-developer Operator working with Architect and Implementer roles.",
  userProblem:
    "The Operator needs to start a project without already knowing architecture or development terminology.",
  desiredUserOutcome:
    "The Operator can save a durable Project Intake that the Architect can use later.",
  businessOrPersonalGoal:
    "Make the upstream planning workflow easier to begin and harder to confuse with Work Card execution.",
  currentStage: "mvp",
  sourceOfTruthLocation: "<PROJECT_REPO>",
  preferredImplementerTool: "Codex",
  architectSurface: "ChatGPT",
  knownConstraints:
    "Keep this pass limited to Project Intake capture and durable artifacts.",
  nonGoals:
    "Do not generate a Project Architect Interview prompt, Project Profile, roadmap, phase plan, or Work Cards from this intake.",
  securityOrDataConcerns:
    "Do not store secrets and keep file writes constrained to approved planning paths.",
  examplesOrReferences:
    "Phase 1 Work Card execution loop and closeout reports.",
  operatorUncertainties:
    "The Operator may not know how to phrase architecture questions yet.",
  notesForArchitect:
    "Use the intake as raw source material for a future Project Architect Interview prompt.",
};
