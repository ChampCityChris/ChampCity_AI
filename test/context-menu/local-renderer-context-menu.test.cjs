const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildRemoteSurfaceContextMenuTemplate,
  buildLocalRendererContextMenuTemplate,
} = require("../../dist/main/contextMenu/localRendererContextMenu.js");

function labels(template) {
  return template.map((item) => item.label ?? item.role ?? item.type);
}

test("editable misspelled text offers suggestions then editing actions", () => {
  const replaced = [];
  const added = [];
  const template = buildLocalRendererContextMenuTemplate(
    {
      isEditable: true,
      selectionText: "teh",
      misspelledWord: "teh",
      dictionarySuggestions: ["the", "tech"],
      editFlags: {
        canCut: true,
        canCopy: true,
        canPaste: true,
        canDelete: true,
        canSelectAll: true,
      },
    },
    {
      replaceMisspelling: (word) => replaced.push(word),
      addWordToDictionary: (word) => added.push(word),
    },
  );

  assert.deepEqual(labels(template), [
    "the",
    "tech",
    "separator",
    'Add "teh" to Dictionary',
    "separator",
    "cut",
    "copy",
    "paste",
    "delete",
    "selectAll",
  ]);

  template[0].click();
  template[3].click();
  assert.deepEqual(replaced, ["the"]);
  assert.deepEqual(added, ["teh"]);
});

test("ordinary editable text provides native edit roles", () => {
  const template = buildLocalRendererContextMenuTemplate(
    {
      isEditable: true,
      selectionText: "normal text",
      editFlags: {
        canCut: true,
        canCopy: true,
        canPaste: true,
        canDelete: true,
        canSelectAll: true,
      },
    },
    {
      replaceMisspelling: () => undefined,
    },
  );

  assert.deepEqual(labels(template), ["cut", "copy", "paste", "delete", "selectAll"]);
});

test("selected non-editable text provides copy without unsafe actions", () => {
  const template = buildLocalRendererContextMenuTemplate(
    {
      isEditable: false,
      selectionText: "selected preview text",
      editFlags: {
        canCopy: true,
        canSelectAll: true,
      },
    },
    {
      replaceMisspelling: () => undefined,
    },
  );

  assert.deepEqual(labels(template), ["copy", "selectAll"]);
  assert.equal(template.some((item) => "role" in item && item.role === "paste"), false);
  assert.equal(template.some((item) => "role" in item && item.role === "delete"), false);
  assert.equal(template.some((item) => "label" in item && /shell|file|process|navigate/i.test(item.label ?? "")), false);
});

test("no selection and no valid edit state produces no context menu", () => {
  const template = buildLocalRendererContextMenuTemplate(
    {
      isEditable: false,
      selectionText: "",
      editFlags: {},
    },
    {
      replaceMisspelling: () => undefined,
    },
  );

  assert.deepEqual(template, []);
});

test("remote editable surface provides constrained native editing roles", () => {
  const template = buildRemoteSurfaceContextMenuTemplate({
    isEditable: true,
    selectionText: "",
    editFlags: {
      canUndo: true,
      canRedo: true,
      canCut: true,
      canCopy: true,
      canPaste: true,
      canSelectAll: true,
    },
  });

  assert.deepEqual(labels(template), [
    "undo",
    "redo",
    "separator",
    "cut",
    "copy",
    "paste",
    "separator",
    "selectAll",
  ]);
  assert.equal(template.some((item) => "label" in item && /devtools|inspect/i.test(item.label ?? "")), false);
});

test("remote selected non-editable surface allows copy and select all only", () => {
  const template = buildRemoteSurfaceContextMenuTemplate({
    isEditable: false,
    selectionText: "selected remote text",
    editFlags: {
      canCopy: true,
      canPaste: true,
      canSelectAll: true,
    },
  });

  assert.deepEqual(labels(template), ["copy", "selectAll"]);
});
