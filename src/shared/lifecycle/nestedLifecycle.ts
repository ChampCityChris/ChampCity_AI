export const lifecycleLevels = ["project", "phase", "workCard"] as const;
export type LifecycleLevel = (typeof lifecycleLevels)[number];

export const lifecycleStages = [
  "intake",
  "planning",
  "building",
  "validation",
  "close",
] as const;
export type LifecycleStage = (typeof lifecycleStages)[number];

export interface LifecycleLocation {
  level: LifecycleLevel;
  stage: LifecycleStage;
}

export interface LifecycleRelationship {
  parent: LifecycleLevel;
  containedChild: LifecycleLevel | null;
  closeReturnsTo: LifecycleLocation | null;
  terminalOnClose: boolean;
}

export const lifecycleRelationships: readonly LifecycleRelationship[] = [
  {
    parent: "project",
    containedChild: "phase",
    closeReturnsTo: null,
    terminalOnClose: true,
  },
  {
    parent: "phase",
    containedChild: "workCard",
    closeReturnsTo: { level: "project", stage: "building" },
    terminalOnClose: false,
  },
  {
    parent: "workCard",
    containedChild: null,
    closeReturnsTo: { level: "phase", stage: "building" },
    terminalOnClose: false,
  },
] as const;

export function sameLifecycleLocation(
  left: LifecycleLocation,
  right: LifecycleLocation,
): boolean {
  return left.level === right.level && left.stage === right.stage;
}
