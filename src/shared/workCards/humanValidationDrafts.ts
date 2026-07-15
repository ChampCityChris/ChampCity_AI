import type { HumanValidationFormInput } from "./validationRecord";

export type HumanValidationDraft = Omit<
  HumanValidationFormInput,
  | "phase"
  | "workCardFileName"
  | "validationTargetFileName"
  | "implementerReportFileName"
>;

export type HumanValidationDraftCache = Record<string, HumanValidationDraft>;

export function buildHumanValidationDraftKey(
  phase: string,
  validationTargetFileName: string,
): string {
  return `${phase.trim()}::${validationTargetFileName.trim()}`;
}

export function readHumanValidationDraft(
  drafts: Readonly<HumanValidationDraftCache>,
  phase: string,
  validationTargetFileName: string,
  fallback: HumanValidationDraft,
): HumanValidationDraft {
  const key = buildHumanValidationDraftKey(phase, validationTargetFileName);
  return drafts[key] ?? fallback;
}

export function storeHumanValidationDraft(
  drafts: Readonly<HumanValidationDraftCache>,
  phase: string,
  validationTargetFileName: string,
  draft: HumanValidationDraft,
): HumanValidationDraftCache {
  const key = buildHumanValidationDraftKey(phase, validationTargetFileName);

  if (!phase.trim() || !validationTargetFileName.trim()) {
    return { ...drafts };
  }

  return {
    ...drafts,
    [key]: draft,
  };
}
