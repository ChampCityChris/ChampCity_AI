export async function runPlanningDraftAction<T>(parse: () => T, apply: (value: T) => Promise<unknown>, setError: (message: string) => void): Promise<void> {
  try {
    await apply(parse());
  } catch (error) {
    setError(String(error));
  }
}
