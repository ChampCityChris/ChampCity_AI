import type { ComponentProps } from "react";
import { RoutedPlanningWorkspace } from "./RoutedPlanningWorkspace";

export function WorkPlanWorkspace(props: Omit<ComponentProps<typeof RoutedPlanningWorkspace>, "stage">): JSX.Element {
  return <RoutedPlanningWorkspace {...props} stage="plan" />;
}
