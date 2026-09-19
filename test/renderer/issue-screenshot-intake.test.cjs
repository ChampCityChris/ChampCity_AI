const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const test = require("node:test");

const loader = require("./renderer-source-loader.cjs");
const { IssueResolutionWorkspace } = loader.loadRendererSourceModule(
  "src/renderer/app/IssueResolutionWorkspace.tsx",
);
const {
  blobToCanonicalBase64,
  buildNewIssueSubmission,
  decideScreenshotPasteAdmission,
  inspectClipboardImageData,
  prepareScreenshotPaste,
  readClipboardImageDimensions,
  removePendingScreenshot,
  screenshotPasteBlockedDuringCreateFeedback,
  submitIssueAndResetOnSuccess,
} = loader.loadRendererSourceModule("src/renderer/app/issueScreenshotIntake.ts");
const {
  issueScreenshotEvidenceMimeTypes,
  issueScreenshotEvidencePolicy,
} = loader.loadRendererSourceModule("src/shared/issueResolutionContracts.ts");

const { loadProductionFunctions } = require("../support/production-execution.cjs");

function renderWorkspace() {
  return renderToStaticMarkup(React.createElement(IssueResolutionWorkspace, {
    currentIssue: null,
    error: "",
    inventory: { issues: [] },
    isCreating: false,
    isLoading: false,
    onCreateIssue: async () => undefined,
    onRefresh: () => undefined,
    onSelectIssue: () => undefined,
    projectName: "ChampCity_AI",
  }));
}

function pendingScreenshot(id, overrides = {}) {
  return {
    id,
    mimeType: "image/png",
    base64: "AQID",
    sourceByteCount: 3,
    width: 20,
    height: 10,
    previewUrl: `blob:${id}`,
    ...overrides,
  };
}

function pasteDependencies(overrides = {}) {
  let nextId = 0;
  return {
    readDimensions: async () => ({ width: 20, height: 10 }),
    encodeBase64: blobToCanonicalBase64,
    createPreviewUrl: () => `blob:preview-${nextId + 1}`,
    revokePreviewUrl: () => undefined,
    makeId: () => {
      nextId += 1;
      return `pending-${nextId}`;
    },
    ...overrides,
  };
}

test("Issue Intake always renders bounded clipboard screenshot guidance without an upload surface", () => {
  const markup = renderWorkspace();
  assert.match(markup, /Screenshot Evidence/);
  assert.match(markup, /Paste screenshots anywhere in this form/);
  assert.match(markup, /PNG, JPEG, WEBP/);
  assert.match(markup, /Maximum 4/);
  assert.match(markup, /No screenshots pending/);
  assert.doesNotMatch(markup, /type="file"/);
});

test("clipboard intake modules have no direct native filesystem imports", () => {
  const ts = require("typescript");
  const forbidden = new Set(["fs", "fs/promises", "node:fs", "node:fs/promises", "electron"]);
  for (const file of ["IssueResolutionWorkspace.tsx", "issueScreenshotIntake.ts"]) {
    const source = fs.readFileSync(path.join(__dirname, "../../src/renderer/app", file), "utf8");
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    for (const statement of ast.statements) {
      if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
        assert.equal(forbidden.has(statement.moduleSpecifier.text), false, file);
      }
    }
  }
});

test("clipboard decision logic leaves text-only paste native and handles unreadable advertised images", async () => {
  let getAsFileCalls = 0;
  const textSelection = inspectClipboardImageData([{
    kind: "string",
    type: "text/plain",
    getAsFile: () => {
      getAsFileCalls += 1;
      return null;
    },
  }], []);

  assert.equal(textSelection.shouldHandle, false);
  assert.deepEqual(textSelection.candidates, []);
  assert.equal(getAsFileCalls, 0);
  assert.deepEqual(
    decideScreenshotPasteAdmission(textSelection, true),
    { kind: "native-text-paste" },
  );

  const unreadableImageSelection = inspectClipboardImageData([{
    kind: "file",
    type: "image/png",
    getAsFile: () => null,
  }], []);
  assert.equal(unreadableImageSelection.shouldHandle, true);
  await assert.rejects(
    prepareScreenshotPaste([], unreadableImageSelection.candidates, pasteDependencies()),
    /could not be read from the clipboard/,
  );
});

test("create-in-flight image paste is suppressed before screenshot work can be admitted", async () => {
  const pending = [pendingScreenshot("submitted")];
  const pendingSnapshot = structuredClone(pending);
  const submittedInput = buildNewIssueSubmission({
    title: "Submitted title",
    issue: "Submitted issue",
    currentConsequence: "Submitted consequence",
  }, pending);
  const submittedSnapshot = structuredClone(submittedInput);
  const imageSelection = inspectClipboardImageData([{
    kind: "file",
    type: "image/png",
    getAsFile: () => new File([Uint8Array.from([1, 2, 3])], "blocked.png", {
      type: "image/png",
    }),
  }], []);

  let activePasteCount = 0;
  let queueCalls = 0;
  let preparationCalls = 0;
  let previewAllocations = 0;
  let pendingIdAllocations = 0;
  const admission = decideScreenshotPasteAdmission(imageSelection, true);

  if (admission.kind === "admit-image") {
    activePasteCount += 1;
    queueCalls += 1;
    preparationCalls += 1;
    await prepareScreenshotPaste(pending, admission.candidates, pasteDependencies({
      createPreviewUrl: () => {
        previewAllocations += 1;
        return "blob:unexpected";
      },
      makeId: () => {
        pendingIdAllocations += 1;
        return "unexpected";
      },
    }));
  }

  assert.deepEqual(admission, {
    kind: "blocked-during-create",
    feedback: screenshotPasteBlockedDuringCreateFeedback,
  });
  assert.match(admission.feedback, /Paste the screenshot again after Issue creation finishes/);
  assert.equal("candidates" in admission, false);
  assert.equal(activePasteCount, 0);
  assert.equal(queueCalls, 0);
  assert.equal(preparationCalls, 0);
  assert.equal(previewAllocations, 0);
  assert.equal(pendingIdAllocations, 0);
  assert.deepEqual(pending, pendingSnapshot);
  assert.deepEqual(submittedInput, submittedSnapshot);
});

test("workspace paste handler blocks create-in-flight before accounting, allocation, and queue work", () => {
  for (const [submissionInFlight, isCreating] of [[true, false], [false, true]]) {
    const activePasteCountRef = { current: 0 };
    const screenshotIdRef = { current: 7 };
    const pendingScreenshotsRef = { current: [pendingScreenshot("submitted")] };
    const snapshot = structuredClone(pendingScreenshotsRef.current);
    const calls = [];
    const unexpected = (label) => () => { calls.push(label); throw new Error(label); };
    const queue = { then: unexpected("queue") };
    const pasteQueueRef = { current: queue };
    const { handleScreenshotPaste } = loadProductionFunctions(
      "src/renderer/app/IssueResolutionWorkspace.tsx", ["handleScreenshotPaste"], {
        inspectClipboardImageData, decideScreenshotPasteAdmission,
        submissionInFlightRef: { current: submissionInFlight }, isCreating,
        activePasteCountRef, screenshotIdRef, pendingScreenshotsRef, pasteQueueRef,
        setScreenshotProcessingCount: unexpected("paste-accounting"),
        setScreenshotError: (message) => calls.push(message),
        prepareScreenshotPaste: unexpected("preparation"),
        readClipboardImageDimensions: unexpected("dimensions"),
        blobToCanonicalBase64: unexpected("encoding"),
        URL: { createObjectURL: unexpected("preview"), revokeObjectURL: unexpected("revoke") },
        isMountedRef: { current: true }, replacePendingScreenshots: unexpected("replace"),
      },
    );
    handleScreenshotPaste({
      clipboardData: { items: [{ kind: "file", type: "image/png", getAsFile: () => new Blob(["image"], { type: "image/png" }) }], files: [] },
      preventDefault: () => calls.push("prevent-default"),
    });
    assert.deepEqual(calls, ["prevent-default", screenshotPasteBlockedDuringCreateFeedback]);
    assert.equal(activePasteCountRef.current, 0);
    assert.equal(screenshotIdRef.current, 7);
    assert.equal(pasteQueueRef.current, queue);
    assert.deepEqual(pendingScreenshotsRef.current, snapshot);
  }
});

test("valid clipboard evidence converts to canonical FC01 submission shape", async () => {
  const blob = new Blob([Uint8Array.from([1, 2, 3])], { type: "image/png" });
  const base64 = await blobToCanonicalBase64(blob);
  assert.equal(base64, "AQID");
  assert.doesNotMatch(base64, /^data:/);

  const accepted = await prepareScreenshotPaste(
    [],
    [{ advertisedMimeType: "image/png", blob }],
    pasteDependencies(),
  );
  const submission = buildNewIssueSubmission({
    title: "Clipboard evidence",
    issue: "A screenshot is needed.",
    currentConsequence: "Diagnosis lacks evidence.",
    neededCapability: "Paste screenshots.",
    discoveryContext: "Issue Intake",
  }, accepted);

  assert.deepEqual(submission.screenshots, [{ mimeType: "image/png", base64: "AQID" }]);
  assert.deepEqual(Object.keys(submission.screenshots[0]).sort(), ["base64", "mimeType"]);
  assert.equal("previewUrl" in submission.screenshots[0], false);
  assert.equal("sourceByteCount" in submission.screenshots[0], false);
  assert.deepEqual(issueScreenshotEvidenceMimeTypes, ["image/png", "image/jpeg", "image/webp"]);
});

test("image bitmap dimensions are read once and the decoded resource is immediately closed", async () => {
  const hadCreateImageBitmap = Object.hasOwn(globalThis, "createImageBitmap");
  const originalCreateImageBitmap = globalThis.createImageBitmap;
  let closeCalls = 0;
  globalThis.createImageBitmap = async () => ({
    width: 640,
    height: 480,
    close: () => {
      closeCalls += 1;
    },
  });
  try {
    const dimensions = await readClipboardImageDimensions(
      new Blob([Uint8Array.from([1])], { type: "image/png" }),
    );
    assert.deepEqual(dimensions, { width: 640, height: 480 });
    assert.equal(closeCalls, 1);
  } finally {
    if (hadCreateImageBitmap) {
      globalThis.createImageBitmap = originalCreateImageBitmap;
    } else {
      delete globalThis.createImageBitmap;
    }
  }
});

test("an invalid candidate rejects its complete paste without mutating accepted evidence", async () => {
  const existing = [pendingScreenshot("existing")];
  const existingSnapshot = structuredClone(existing);
  let previewCount = 0;
  const validBlob = new Blob([Uint8Array.from([1, 2, 3])], { type: "image/png" });
  const unsupportedBlob = new Blob([Uint8Array.from([4, 5, 6])], { type: "image/gif" });

  await assert.rejects(
    prepareScreenshotPaste(existing, [
      { advertisedMimeType: "image/png", blob: validBlob },
      { advertisedMimeType: "image/gif", blob: unsupportedBlob },
    ], pasteDependencies({
      createPreviewUrl: () => {
        previewCount += 1;
        return `blob:${previewCount}`;
      },
    })),
    /unsupported format image\/gif/,
  );

  assert.deepEqual(existing, existingSnapshot);
  assert.equal(previewCount, 0);
});

test("renderer policy rejects count, size, aggregate, decode, dimension, and pixel violations", async () => {
  const validBlob = new Blob([Uint8Array.from([1])], { type: "image/png" });
  const candidate = { advertisedMimeType: "image/png", blob: validBlob };

  await assert.rejects(
    prepareScreenshotPaste(
      Array.from({ length: issueScreenshotEvidencePolicy.maxCount }, (_, index) => pendingScreenshot(`p${index}`)),
      [candidate],
      pasteDependencies(),
    ),
    /maximum of 4 screenshots/,
  );

  await assert.rejects(
    prepareScreenshotPaste([], [{
      advertisedMimeType: "image/png",
      blob: { type: "image/png", size: issueScreenshotEvidencePolicy.maxDecodedBytesPerImage + 1 },
    }], pasteDependencies()),
    /5,000,000-byte limit/,
  );

  await assert.rejects(
    prepareScreenshotPaste([
      pendingScreenshot("large-existing", {
        sourceByteCount: issueScreenshotEvidencePolicy.maxAggregateDecodedBytes,
      }),
    ], [candidate], pasteDependencies()),
    /20,000,000-byte aggregate limit/,
  );

  await assert.rejects(
    prepareScreenshotPaste([], [candidate], pasteDependencies({
      readDimensions: async () => {
        throw new Error("decode failed");
      },
    })),
    /could not be decoded/,
  );
  await assert.rejects(
    prepareScreenshotPaste([], [candidate], pasteDependencies({
      readDimensions: async () => ({
        width: issueScreenshotEvidencePolicy.maxWidth + 1,
        height: 1,
      }),
    })),
    /maximum is 4096px/,
  );
  await assert.rejects(
    prepareScreenshotPaste([], [candidate], pasteDependencies({
      readDimensions: async () => ({
        width: 4000,
        height: 4000,
      }),
    })),
    /12,000,000-pixel limit/,
  );
});

test("paste order, removal, and text-only submission remain stable", async () => {
  let nextId = 0;
  const dependencies = pasteDependencies({
    createPreviewUrl: () => `blob:${nextId + 1}`,
    makeId: () => {
      nextId += 1;
      return `p${nextId}`;
    },
  });
  const firstPaste = await prepareScreenshotPaste([], [
    { advertisedMimeType: "image/png", blob: new Blob(["a"], { type: "image/png" }) },
    { advertisedMimeType: "image/jpeg", blob: new Blob(["b"], { type: "image/jpeg" }) },
  ], dependencies);
  const secondPaste = await prepareScreenshotPaste(firstPaste, [
    { advertisedMimeType: "image/webp", blob: new Blob(["c"], { type: "image/webp" }) },
  ], dependencies);
  const pending = [...firstPaste, ...secondPaste];

  assert.deepEqual(pending.map((item) => item.mimeType), ["image/png", "image/jpeg", "image/webp"]);
  assert.deepEqual(removePendingScreenshot(pending, "p2").map((item) => item.id), ["p1", "p3"]);

  const textOnly = buildNewIssueSubmission({
    title: "Text only",
    issue: "Issue",
    currentConsequence: "Consequence",
  }, []);
  assert.equal("screenshots" in textOnly, false);
});

test("service create rejection preserves intake and reopens screenshot admission", async () => {
  const pending = [pendingScreenshot("keep")];
  const pendingSnapshot = structuredClone(pending);
  const imageSelection = inspectClipboardImageData([{
    kind: "file",
    type: "image/png",
    getAsFile: () => new File([Uint8Array.from([4, 5, 6])], "after-rejection.png", {
      type: "image/png",
    }),
  }], []);
  let resetCalls = 0;
  let createInFlight = true;

  try {
    assert.equal(
      decideScreenshotPasteAdmission(imageSelection, createInFlight).kind,
      "blocked-during-create",
    );
    await assert.rejects(
      submitIssueAndResetOnSuccess(
        buildNewIssueSubmission({
          title: "Keep this form",
          issue: "Current service rejects.",
          currentConsequence: "Retry is required.",
        }, pending),
        async () => {
          throw new Error("Current screenshot rejection");
        },
        () => {
          resetCalls += 1;
        },
      ),
      /Current screenshot rejection/,
    );
  } finally {
    createInFlight = false;
  }

  assert.equal(resetCalls, 0);
  assert.deepEqual(pending, pendingSnapshot);

  const reopenedAdmission = decideScreenshotPasteAdmission(imageSelection, createInFlight);
  assert.equal(reopenedAdmission.kind, "admit-image");
  const acceptedAfterRejection = await prepareScreenshotPaste(
    pending,
    reopenedAdmission.candidates,
    pasteDependencies(),
  );
  assert.equal(acceptedAfterRejection.length, 1);
  assert.deepEqual(
    [...pending, ...acceptedAfterRejection].map((screenshot) => screenshot.id),
    ["keep", "pending-1"],
  );

  await submitIssueAndResetOnSuccess(
    buildNewIssueSubmission({
      title: "Confirmed success",
      issue: "The service accepts this request.",
      currentConsequence: "The completed form can reset.",
    }, pending),
    async () => undefined,
    () => {
      resetCalls += 1;
    },
  );
  assert.equal(resetCalls, 1);
});
