const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  createLightweightIssueRecord,
  discoverIssueInventory,
} = require("../../dist/main/issueResolution/issueResolutionService.js");
const {
  issueScreenshotEvidenceMimeTypes,
  issueScreenshotEvidencePolicy,
} = require("../../dist/shared/issueResolutionContracts.js");

test("discovers only immediate numeric ISSUE directories in deterministic order", () => {
  const root = tempProject();
  writeIssue(root, "ISSUE_010", "# ISSUE_010 - Later\n\n## Issue\nLater.");
  writeIssue(root, "ISSUE_002", "# ISSUE_002 - Earlier\n\n## Issue\nEarlier.");
  fs.mkdirSync(path.join(root, "issues", "ISSUE_alpha"), { recursive: true });
  fs.mkdirSync(path.join(root, "issues", "ISSUE_003", "nested", "ISSUE_999"), { recursive: true });
  fs.writeFileSync(path.join(root, "issues", "ISSUE_003", "nested", "ISSUE_999", "ISSUE_RECORD.md"), "# Bad");
  fs.writeFileSync(path.join(root, "issues", "ISSUE_004.md"), "# Not a directory");

  const inventory = discoverIssueInventory(root);

  assert.deepEqual(inventory.issues.map((issue) => issue.issueId), ["ISSUE_002", "ISSUE_003", "ISSUE_010"]);
  assert.deepEqual(inventory.issues.map((issue) => issue.title), ["Earlier", "ISSUE_003", "Later"]);
  assert.equal(inventory.issues[1].recordState, "missing");
  assert.equal(inventory.issues[0].recordPath, "issues/ISSUE_002/ISSUE_RECORD.md");
});

test("discovery reads ISSUE_RECORD.md without rewriting it", () => {
  const root = tempProject();
  const recordPath = writeIssue(root, "ISSUE_001", "# ISSUE_001 - Bootstrap\n\n## Issue\nRead only.");
  const before = fs.readFileSync(recordPath, "utf8");
  const beforeStats = fs.statSync(recordPath);

  const inventory = discoverIssueInventory(root);

  assert.equal(inventory.issues[0].recordState, "readable");
  assert.equal(inventory.issues[0].bodyMarkdown, before);
  assert.equal(fs.readFileSync(recordPath, "utf8"), before);
  assert.equal(fs.statSync(recordPath).mtimeMs, beforeStats.mtimeMs);
});

test("new Issue allocates next ID, writes only ISSUE_RECORD.md, and omits empty optional sections", () => {
  const root = tempProject();
  writeIssue(root, "ISSUE_001", "# ISSUE_001 - Existing\n");

  const result = createLightweightIssueRecord(root, {
    title: "Renderer shell does not load",
    issue: "The shell opens blank.",
    currentConsequence: "The Operator cannot select workflows.",
    neededCapability: "",
    discoveryContext: "Found while Development was active.",
  });

  assert.equal(result.createdIssueId, "ISSUE_002");
  assert.equal(result.createdRecordPath, "issues/ISSUE_002/ISSUE_RECORD.md");
  const issueRoot = path.join(root, "issues", "ISSUE_002");
  assert.deepEqual(fs.readdirSync(issueRoot), ["ISSUE_RECORD.md"]);
  const body = fs.readFileSync(path.join(issueRoot, "ISSUE_RECORD.md"), "utf8");
  assert.equal(body, [
    "# ISSUE_002 \u2014 Renderer shell does not load",
    "",
    "## Issue",
    "The shell opens blank.",
    "",
    "## Current Consequence",
    "The Operator cannot select workflows.",
    "",
    "## Discovery Context",
    "Found while Development was active.",
    "",
    "## Status",
    "Issue recorded. Architect Planning pending.",
    "",
  ].join("\n"));
  assert.match(body, /^# ISSUE_002 \u2014 Renderer shell does not load$/m);
  assert.match(body, /^## Issue\nThe shell opens blank\.$/m);
  assert.match(body, /^## Current Consequence\nThe Operator cannot select workflows\.$/m);
  assert.doesNotMatch(body, /Needed Capability/);
  assert.match(body, /^## Discovery Context\nFound while Development was active\.$/m);
  assert.doesNotMatch(body, /phaseId|workCardId|Repair|sidecar|severity|assignee|SLA/i);
});

test("omitted and empty screenshot collections preserve identical text-only output", () => {
  const input = {
    title: "Text-only compatibility",
    issue: "Issue text remains canonical.",
    currentConsequence: "The current behavior must remain byte-compatible.",
    neededCapability: "Preserve the formatter.",
  };
  const omittedRoot = tempProject();
  const emptyRoot = tempProject();

  const omitted = createLightweightIssueRecord(omittedRoot, input);
  const empty = createLightweightIssueRecord(emptyRoot, { ...input, screenshots: [] });
  const omittedDirectory = path.join(omittedRoot, "issues", omitted.createdIssueId);
  const emptyDirectory = path.join(emptyRoot, "issues", empty.createdIssueId);

  assert.deepEqual(fs.readdirSync(omittedDirectory), ["ISSUE_RECORD.md"]);
  assert.deepEqual(fs.readdirSync(emptyDirectory), ["ISSUE_RECORD.md"]);
  assert.equal(
    fs.readFileSync(path.join(emptyDirectory, "ISSUE_RECORD.md"), "utf8"),
    fs.readFileSync(path.join(omittedDirectory, "ISSUE_RECORD.md"), "utf8"),
  );
});

test("valid screenshot evidence is byte-detected, ordered, persisted, and linked record-last", () => {
  const root = tempProject();
  writeIssue(root, "ISSUE_002", "# ISSUE_002 - Existing\n");
  const png = onePixelPng();
  const jpeg = jpegWithDimensions(2, 3);
  const webp = webpWithDimensions(4, 5);

  const result = createLightweightIssueRecord(root, {
    title: "Screenshot evidence",
    issue: "Visual evidence is required.",
    currentConsequence: "Diagnosis lacks the reported screen state.",
    screenshots: [
      screenshot("image/png", png),
      screenshot("image/jpeg", jpeg),
      screenshot("image/webp", webp),
    ],
  });

  assert.equal(result.createdIssueId, "ISSUE_003");
  const issueRoot = path.join(root, "issues", "ISSUE_003");
  const evidenceRoot = path.join(issueRoot, "evidence");
  assert.deepEqual(fs.readdirSync(issueRoot).sort(), ["ISSUE_RECORD.md", "evidence"].sort());
  assert.deepEqual(fs.readdirSync(evidenceRoot), [
    "screenshot-001.png",
    "screenshot-002.jpg",
    "screenshot-003.webp",
  ]);
  assert.deepEqual(fs.readFileSync(path.join(evidenceRoot, "screenshot-001.png")), png);
  assert.deepEqual(fs.readFileSync(path.join(evidenceRoot, "screenshot-002.jpg")), jpeg);
  assert.deepEqual(fs.readFileSync(path.join(evidenceRoot, "screenshot-003.webp")), webp);

  const body = fs.readFileSync(path.join(issueRoot, "ISSUE_RECORD.md"), "utf8");
  assert.match(body, /## Screenshot Evidence\n- issues\/ISSUE_003\/evidence\/screenshot-001\.png\n- issues\/ISSUE_003\/evidence\/screenshot-002\.jpg\n- issues\/ISSUE_003\/evidence\/screenshot-003\.webp/);
  assert.ok(body.indexOf("## Screenshot Evidence") < body.indexOf("## Status"));
  assert.equal(body.includes(png.toString("base64")), false);
  assert.equal(body.includes(root), false);
  assert.equal(result.inventory.issues.at(-1).issueId, "ISSUE_003");
  assert.equal(result.inventory.issues.at(-1).recordState, "readable");
});

test("screenshot evidence policy is bounded to the approved formats and limits", () => {
  assert.deepEqual(issueScreenshotEvidenceMimeTypes, ["image/png", "image/jpeg", "image/webp"]);
  assert.deepEqual(issueScreenshotEvidencePolicy, {
    maxCount: 4,
    maxDecodedBytesPerImage: 5_000_000,
    maxAggregateDecodedBytes: 20_000_000,
    maxWidth: 4096,
    maxHeight: 4096,
    maxPixelsPerImage: 12_000_000,
  });
});

test("invalid screenshot evidence is rejected before any Issue artifact is created", () => {
  const validPng = onePixelPng();
  const cases = [
    {
      label: "empty payload",
      screenshots: [{ mimeType: "image/png", base64: "" }],
      expected: /non-empty, syntactically valid base64/,
    },
    {
      label: "malformed base64",
      screenshots: [{ mimeType: "image/png", base64: "not+valid=" }],
      expected: /syntactically valid base64/,
    },
    {
      label: "unsupported MIME",
      screenshots: [{ mimeType: "image/gif", base64: validPng.toString("base64") }],
      expected: /MIME type must be/,
    },
    {
      label: "non-image bytes",
      screenshots: [screenshot("image/png", Buffer.from("not an image"))],
      expected: /not a supported PNG, JPEG, or WEBP/,
    },
    {
      label: "MIME mismatch",
      screenshots: [screenshot("image/jpeg", validPng)],
      expected: /does not match/,
    },
    {
      label: "oversized decoded payload",
      screenshots: [screenshot("image/png", Buffer.alloc(5_000_001))],
      expected: /5,000,000 decoded-byte limit/,
    },
    {
      label: "over-width image",
      screenshots: [screenshot("image/png", pngWithDimensions(4097, 1))],
      expected: /dimensions exceed/,
    },
    {
      label: "over-height image",
      screenshots: [screenshot("image/png", pngWithDimensions(1, 4097))],
      expected: /dimensions exceed/,
    },
    {
      label: "over-pixel image",
      screenshots: [screenshot("image/png", pngWithDimensions(4000, 4000))],
      expected: /dimensions exceed/,
    },
    {
      label: "excessive count",
      screenshots: Array.from({ length: 5 }, () => screenshot("image/png", validPng)),
      expected: /at most 4 images/,
    },
    {
      label: "caller destination field",
      screenshots: [{
        ...screenshot("image/png", validPng),
        filename: "chosen.png",
        relativePath: "outside/chosen.png",
      }],
      expected: /cannot provide filenames, filesystem paths, destinations/,
    },
  ];

  for (const testCase of cases) {
    const root = tempProject();
    assert.throws(
      () => createLightweightIssueRecord(root, {
        title: testCase.label,
        issue: "Invalid evidence must fail.",
        currentConsequence: "No Issue artifact may be created.",
        screenshots: testCase.screenshots,
      }),
      testCase.expected,
      testCase.label,
    );
    assert.equal(fs.existsSync(path.join(root, "issues")), false, testCase.label);
  }
});

test("evidence and Issue Record destination conflicts never overwrite concurrent artifacts", () => {
  const png = onePixelPng();
  const evidenceConflictRoot = tempProject();
  const evidencePath = path.join(
    evidenceConflictRoot,
    "issues",
    "ISSUE_001",
    "evidence",
    "screenshot-001.png",
  );
  withOpenConflict(evidencePath, Buffer.from("concurrent evidence"), () => {
    assert.throws(
      () => createLightweightIssueRecord(evidenceConflictRoot, issueInput([screenshot("image/png", png)])),
      /EEXIST/,
    );
  });
  assert.deepEqual(fs.readFileSync(evidencePath), Buffer.from("concurrent evidence"));
  assert.equal(
    fs.existsSync(path.join(evidenceConflictRoot, "issues", "ISSUE_001", "ISSUE_RECORD.md")),
    false,
  );

  const recordConflictRoot = tempProject();
  const recordPath = path.join(recordConflictRoot, "issues", "ISSUE_001", "ISSUE_RECORD.md");
  withOpenConflict(recordPath, Buffer.from("concurrent record"), () => {
    assert.throws(
      () => createLightweightIssueRecord(recordConflictRoot, issueInput([screenshot("image/png", png)])),
      /EEXIST/,
    );
  });
  assert.equal(fs.readFileSync(recordPath, "utf8"), "concurrent record");
  assert.deepEqual(
    fs.readFileSync(path.join(
      recordConflictRoot,
      "issues",
      "ISSUE_001",
      "evidence",
      "screenshot-001.png",
    )),
    png,
  );
});

test("mid-persistence failure cleans owned evidence and preserves concurrent content without a record", () => {
  const root = tempProject();
  const issueRoot = path.join(root, "issues", "ISSUE_001");
  const evidenceRoot = path.join(issueRoot, "evidence");
  const firstEvidencePath = path.join(evidenceRoot, "screenshot-001.png");
  const secondEvidencePath = path.join(evidenceRoot, "screenshot-002.jpg");
  const concurrentPath = path.join(evidenceRoot, "concurrent.keep");
  const originalOpenSync = fs.openSync;
  fs.openSync = function injectedOpenSync(filePath, flags, ...rest) {
    if (path.resolve(String(filePath)) === path.resolve(secondEvidencePath)) {
      fs.writeFileSync(concurrentPath, "preserve me", { flag: "wx" });
      const error = new Error("simulated second evidence persistence failure");
      error.code = "EIO";
      throw error;
    }
    return originalOpenSync.call(fs, filePath, flags, ...rest);
  };
  try {
    assert.throws(
      () => createLightweightIssueRecord(root, issueInput([
        screenshot("image/png", onePixelPng()),
        screenshot("image/jpeg", jpegWithDimensions(2, 3)),
      ])),
      /simulated second evidence persistence failure/,
    );
  } finally {
    fs.openSync = originalOpenSync;
  }

  assert.equal(fs.existsSync(firstEvidencePath), false);
  assert.equal(fs.existsSync(secondEvidencePath), false);
  assert.equal(fs.readFileSync(concurrentPath, "utf8"), "preserve me");
  assert.equal(fs.existsSync(path.join(issueRoot, "ISSUE_RECORD.md")), false);
});

test("new Issue uses overwrite-disabled creation and required fields", () => {
  const root = tempProject();
  assert.throws(
    () => createLightweightIssueRecord(root, {
      title: "",
      issue: "Problem",
      currentConsequence: "Consequence",
    }),
    /Title is required/,
  );

  const result = createLightweightIssueRecord(root, {
    title: "First",
    issue: "Problem",
    currentConsequence: "Consequence",
    neededCapability: "Expected outcome",
  });
  assert.equal(result.createdIssueId, "ISSUE_001");
  assert.throws(
    () => fs.writeFileSync(path.join(root, result.createdRecordPath), "overwrite", { flag: "wx" }),
    /EEXIST/,
  );
});

function tempProject() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "champcity-issue-resolution-"));
}

function writeIssue(root, issueId, body) {
  const issueRoot = path.join(root, "issues", issueId);
  fs.mkdirSync(issueRoot, { recursive: true });
  const recordPath = path.join(issueRoot, "ISSUE_RECORD.md");
  fs.writeFileSync(recordPath, body, "utf8");
  return recordPath;
}

function issueInput(screenshots) {
  return {
    title: "Persistence safety",
    issue: "Evidence persistence must be atomic from the Issue Record perspective.",
    currentConsequence: "A partial failure must not produce a misleading record.",
    screenshots,
  };
}

function screenshot(mimeType, buffer) {
  return { mimeType, base64: buffer.toString("base64") };
}

function withOpenConflict(targetPath, contents, action) {
  const originalOpenSync = fs.openSync;
  let injected = false;
  fs.openSync = function injectedOpenSync(filePath, flags, ...rest) {
    if (!injected && path.resolve(String(filePath)) === path.resolve(targetPath)) {
      injected = true;
      fs.writeFileSync(targetPath, contents, { flag: "wx" });
    }
    return originalOpenSync.call(fs, filePath, flags, ...rest);
  };
  try {
    action();
  } finally {
    fs.openSync = originalOpenSync;
  }
}

function onePixelPng() {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
    "base64",
  );
}

function pngWithDimensions(width, height) {
  const buffer = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer, 0);
  buffer.writeUInt32BE(13, 8);
  buffer.write("IHDR", 12, "ascii");
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  buffer[24] = 8;
  buffer[25] = 6;
  return buffer;
}

function jpegWithDimensions(width, height) {
  return Buffer.from([
    0xff, 0xd8,
    0xff, 0xc0,
    0x00, 0x11,
    0x08,
    (height >> 8) & 0xff, height & 0xff,
    (width >> 8) & 0xff, width & 0xff,
    0x03,
    0x01, 0x11, 0x00,
    0x02, 0x11, 0x00,
    0x03, 0x11, 0x00,
    0xff, 0xd9,
  ]);
}

function webpWithDimensions(width, height) {
  const buffer = Buffer.alloc(30);
  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(22, 4);
  buffer.write("WEBP", 8, "ascii");
  buffer.write("VP8X", 12, "ascii");
  buffer.writeUInt32LE(10, 16);
  writeUInt24LE(buffer, 24, width - 1);
  writeUInt24LE(buffer, 27, height - 1);
  return buffer;
}

function writeUInt24LE(buffer, offset, value) {
  buffer[offset] = value & 0xff;
  buffer[offset + 1] = (value >> 8) & 0xff;
  buffer[offset + 2] = (value >> 16) & 0xff;
}
