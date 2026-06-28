const safePhaseFolderPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const safeWorkCardIdPattern = /^[A-Za-z0-9]+(?:[-_][A-Za-z0-9]+)*$/;

export function validateSafePhaseFolder(phase: string): string[] {
  const value = phase.trim();

  if (value.length === 0) {
    return ["Please choose a phase."];
  }

  if (!safePhaseFolderPattern.test(value)) {
    return ["Phase must use only letters, numbers, and hyphens."];
  }

  return [];
}

export function validateSafeWorkCardId(workCardId: string): string[] {
  const value = workCardId.trim();

  if (value.length === 0) {
    return ["Please enter a Work Card ID."];
  }

  if (!safeWorkCardIdPattern.test(value)) {
    return [
      "Work Card ID must use only letters, numbers, hyphens, and underscores.",
    ];
  }

  return [];
}

export function slugifyWorkCardTitle(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);

  return slug.length > 0 ? slug : "untitled_work_card";
}

export function buildWorkCardFileStem(
  workCardId: string,
  title: string,
): string {
  const idErrors = validateSafeWorkCardId(workCardId);

  if (idErrors.length > 0) {
    throw new Error(idErrors.join(" "));
  }

  return `${workCardId.trim()}_${slugifyWorkCardTitle(title)}`;
}
