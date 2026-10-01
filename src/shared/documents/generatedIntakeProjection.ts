export const GENERATED_INTAKE_MARKER = "<!-- GENERATED FROM CHAMPCITY STRUCTURED PROJECT STATE — DO NOT EDIT AS AUTHORITY -->";

export function isGeneratedIntakePath(relativePath: string): boolean {
  return /^planning\/workflows\/[a-zA-Z0-9_-]+\/Intake\/WORKFLOW_INTAKE_[a-z-]+\.md$/.test(relativePath);
}

export function isGreenfieldIntakeProjectionPath(relativePath: string): boolean {
  return relativePath.length <= 512 && /^planning\/project\/(?:Project_Intake|project-intake)\/PROJECT_INTAKE_[a-zA-Z0-9_.-]+\.md$/i.test(relativePath);
}
