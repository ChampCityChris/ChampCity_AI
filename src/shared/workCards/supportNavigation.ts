export interface SupportNavigationItem {
  id: string;
  label: string;
  screenTitle: string;
  shortDesc: string;
}

export interface SupportNavigationState<
  TItem extends SupportNavigationItem = SupportNavigationItem,
> {
  routedScreenId: string;
  routedScreen?: TItem;
  activeScreenId: string;
  activeScreen?: TItem;
  routedScreenResolved: boolean;
  activeScreenResolved: boolean;
  isViewingRoutedScreen: boolean;
  isViewingSupportingScreen: boolean;
}

export function resolveSupportNavigationState<
  TItem extends SupportNavigationItem,
>(
  items: readonly TItem[],
  routedScreenId: string,
  activeScreenId: string,
): SupportNavigationState<TItem> {
  const routedScreen = items.find((item) => item.id === routedScreenId);
  const activeScreen = items.find((item) => item.id === activeScreenId);
  const isViewingRoutedScreen = Boolean(
    routedScreen && activeScreen && routedScreen.id === activeScreen.id,
  );

  return {
    routedScreenId,
    routedScreen,
    activeScreenId,
    activeScreen,
    routedScreenResolved: Boolean(routedScreen),
    activeScreenResolved: Boolean(activeScreen),
    isViewingRoutedScreen,
    isViewingSupportingScreen: Boolean(activeScreen) && !isViewingRoutedScreen,
  };
}
