import type { ComponentProps } from "react";
import { RoutedPlanningWorkspace } from "./RoutedPlanningWorkspace";

export function WorkArchitectAssessmentWorkspace(props: Omit<ComponentProps<typeof RoutedPlanningWorkspace>, "stage">): JSX.Element {
  return <RoutedPlanningWorkspace {...props} stage="assessment" />;
}
