export interface LocalRendererContextMenuParams {
  isEditable: boolean;
  selectionText: string;
  misspelledWord?: string;
  dictionarySuggestions?: string[];
  editFlags?: {
    canCut?: boolean;
    canCopy?: boolean;
    canPaste?: boolean;
    canDelete?: boolean;
    canSelectAll?: boolean;
  };
}

export interface LocalRendererContextMenuActions {
  replaceMisspelling: (replacement: string) => void;
  addWordToDictionary?: (word: string) => void;
}

export type LocalRendererContextMenuItem =
  | {
      label?: string;
      role?: "cut" | "copy" | "paste" | "delete" | "selectAll";
      click?: () => void;
    }
  | { type: "separator" };

export function buildLocalRendererContextMenuTemplate(
  params: LocalRendererContextMenuParams,
  actions: LocalRendererContextMenuActions,
): LocalRendererContextMenuItem[] {
  const template: LocalRendererContextMenuItem[] = [];
  const editFlags = params.editFlags ?? {};
  const selectedText = params.selectionText.trim();
  const misspelledWord = params.misspelledWord?.trim();

  if (params.isEditable) {
    const suggestions = misspelledWord
      ? [...new Set(params.dictionarySuggestions ?? [])].filter(Boolean).slice(0, 5)
      : [];

    for (const suggestion of suggestions) {
      template.push({
        label: suggestion,
        click: () => actions.replaceMisspelling(suggestion),
      });
    }

    if (misspelledWord && actions.addWordToDictionary) {
      if (template.length > 0) {
        template.push({ type: "separator" });
      }
      template.push({
        label: `Add "${misspelledWord}" to Dictionary`,
        click: () => actions.addWordToDictionary?.(misspelledWord),
      });
    }

    const editingItems: LocalRendererContextMenuItem[] = [];
    if (editFlags.canCut) editingItems.push({ role: "cut" });
    if (editFlags.canCopy) editingItems.push({ role: "copy" });
    if (editFlags.canPaste) editingItems.push({ role: "paste" });
    if (editFlags.canDelete) editingItems.push({ role: "delete" });
    if (editFlags.canSelectAll) editingItems.push({ role: "selectAll" });

    if (editingItems.length > 0) {
      if (template.length > 0) {
        template.push({ type: "separator" });
      }
      template.push(...editingItems);
    }

    return template;
  }

  const nonEditableItems: LocalRendererContextMenuItem[] = [];
  if (selectedText && editFlags.canCopy) {
    nonEditableItems.push({ role: "copy" });
  }
  if (editFlags.canSelectAll) {
    nonEditableItems.push({ role: "selectAll" });
  }

  return nonEditableItems;
}
