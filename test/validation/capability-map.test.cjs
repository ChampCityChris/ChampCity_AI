const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const repositoryRoot = path.resolve(__dirname, "../..");
const capabilityMapPath = path.join(repositoryRoot, "validation", "capability-map.json");
const capabilityMap = JSON.parse(fs.readFileSync(capabilityMapPath, "utf8"));

const { exactKeys, nonEmptyString, sortedUniqueStrings, kebabCase, validateInventoryFields } = require("../../scripts/validation/catalog-schema.cjs");

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const absolutePath = path.join(directory, entry.name);
      return entry.isDirectory() ? walk(absolutePath) : [absolutePath];
    });
}

function executableTestPaths() {
  return walk(path.join(repositoryRoot, "test"))
    .filter((absolutePath) => absolutePath.endsWith(".test.cjs"))
    .map((absolutePath) => path.relative(repositoryRoot, absolutePath).replaceAll(path.sep, "/"))
    .sort();
}

function declaredBehaviorIndex() {
  const capabilities = new Map();
  const behaviors = new Map();
  for (const capability of capabilityMap.capabilities) {
    capabilities.set(capability.capabilityId, capability);
    for (const behavior of capability.behaviors) {
      behaviors.set(`${capability.capabilityId}\u0000${behavior.behaviorId}`, behavior);
    }
  }
  return { capabilities, behaviors };
}

function proofIndex() {
  const byBehavior = new Map();
  for (const record of capabilityMap.tests) {
    for (const mapping of record.behaviorCoverage) {
      const key = `${mapping.capabilityId}\u0000${mapping.behaviorId}`;
      const proofs = byBehavior.get(key) ?? [];
      proofs.push({ ...mapping, testPath: record.testPath });
      byBehavior.set(key, proofs);
    }
  }
  return byBehavior;
}

test("capability map has exact top-level vocabulary and one record for every executable test", () => {
  exactKeys(capabilityMap, ["capabilities", "schemaVersion", "tests"], "capability map");
  assert.equal(capabilityMap.schemaVersion, 4);
  assert.ok(Array.isArray(capabilityMap.capabilities));
  assert.ok(Array.isArray(capabilityMap.tests));

  const executablePaths = executableTestPaths();
  const mappedPaths = capabilityMap.tests.map((record) => record.testPath);
  assert.deepEqual(mappedPaths, [...mappedPaths].sort(), "test records must be sorted by testPath");
  assert.equal(new Set(mappedPaths).size, mappedPaths.length, "testPath values must be unique");
  assert.deepEqual(mappedPaths, executablePaths, "mapped and executable test paths must match exactly");
  assert.ok(mappedPaths.includes("test/validation/capability-map.test.cjs"), "validator must map itself");
  const validatorRecord = capabilityMap.tests.find((record) =>
    record.testPath === "test/validation/capability-map.test.cjs");
  assert.ok(
    validatorRecord.behaviorCoverage.some((mapping) =>
      mapping.capabilityId === "validation-capability-map"
      && mapping.behaviorId === "capability-map-schema-integrity"
      && mapping.proofRole === "primary"),
    "validator must be the primary proof for validation-capability-map/capability-map-schema-integrity",
  );
});

test("inventory fields and allowed values fail closed, including required negative cases", () => {
  for (const record of capabilityMap.tests) validateInventoryFields(record);

  const fixture = capabilityMap.tests[0];
  const mutations = [
    ["omitted dependency boolean", (record) => { delete record.dependencies.electron; }],
    ["non-boolean dependency", (record) => { record.dependencies.process = "false"; }],
    ["invalid lane", (record) => { record.proposedValidationLane = "unit"; }],
    ["invalid platform", (record) => { record.platformDependency = "linux"; }],
    ["invalid execution platform", (record) => { record.execution.platform = "desktop"; }],
    ["missing owned resources", (record) => { delete record.execution.ownedResources; }],
    ["empty owned resources", (record) => { record.execution.ownedResources = []; }],
    ["unknown owned resource", (record) => { record.execution.ownedResources = ["unknown-resource"]; }],
    ["unsafe parallel resource", (record) => { record.execution.ownedResources = ["shared-global-state-exclusive"]; }],
    ["platform disagreement", (record) => { record.execution.platform = record.platformDependency === "none" ? "windows" : "any"; }],
    ["invalid source inspection", (record) => { record.sourceInspectionClassification = "regex"; }],
    ["invalid disposition", (record) => { record.v2Disposition = "delete"; }],
    ["negative count", (record) => { record.currentTestCount.value = -1; }],
    ["negative duration", (record) => { record.duration.milliseconds = -1; }],
    ["missing count basis", (record) => { record.currentTestCount.basis = ""; }],
    ["missing duration basis", (record) => { record.duration.basis = " "; }],
    ["invalid duration kind", (record) => { record.duration.kind = "observed"; }],
    ["invalid validation role", (record) => { record.validationRoles = ["unit"]; }],
    ["invalid proof characteristic", (record) => { record.proofCharacteristics = ["proxy"]; }],
  ];
  for (const [label, mutate] of mutations) {
    const candidate = structuredClone(fixture);
    mutate(candidate);
    assert.throws(() => validateInventoryFields(candidate), undefined, label);
  }
});

test("capability, behavior, dependency, and test identities resolve in deterministic order", () => {
  assert.deepEqual(
    capabilityMap.capabilities.map((capability) => capability.capabilityId),
    capabilityMap.capabilities.map((capability) => capability.capabilityId).sort(),
    "capabilities must be sorted",
  );
  const capabilityIds = new Set();
  const behaviorKeys = new Set();
  for (const capability of capabilityMap.capabilities) {
    exactKeys(capability, ["behaviors", "capabilityId", "dependsOn", "description", "sourcePatterns"], capability.capabilityId);
    assert.match(capability.capabilityId, kebabCase);
    assert.equal(capabilityIds.has(capability.capabilityId), false, `duplicate capability ${capability.capabilityId}`);
    capabilityIds.add(capability.capabilityId);
    nonEmptyString(capability.description, `${capability.capabilityId} description`);
    sortedUniqueStrings(capability.sourcePatterns, `${capability.capabilityId} sourcePatterns`);
    assert.ok(capability.sourcePatterns.length > 0, `${capability.capabilityId} sourcePatterns must not be empty`);
    for (const sourcePattern of capability.sourcePatterns) {
      assert.equal(path.isAbsolute(sourcePattern), false, `${capability.capabilityId} source pattern must be relative`);
      assert.equal(sourcePattern.includes("\\"), false, `${capability.capabilityId} source pattern must use forward slashes`);
    }
    sortedUniqueStrings(capability.dependsOn, `${capability.capabilityId} dependsOn`);
    assert.ok(Array.isArray(capability.behaviors) && capability.behaviors.length > 0, `${capability.capabilityId} behaviors`);
    assert.deepEqual(
      capability.behaviors.map((behavior) => behavior.behaviorId),
      capability.behaviors.map((behavior) => behavior.behaviorId).sort(),
      `${capability.capabilityId} behaviors must be sorted`,
    );
    for (const behavior of capability.behaviors) {
      exactKeys(behavior, ["behaviorId", "description"], `${capability.capabilityId} behavior`);
      assert.match(behavior.behaviorId, kebabCase);
      nonEmptyString(behavior.description, `${capability.capabilityId}/${behavior.behaviorId} description`);
      const behaviorKey = `${capability.capabilityId}\u0000${behavior.behaviorId}`;
      assert.equal(behaviorKeys.has(behaviorKey), false, `duplicate behavior ${behaviorKey}`);
      behaviorKeys.add(behaviorKey);
    }
  }
  for (const capability of capabilityMap.capabilities) {
    for (const dependency of capability.dependsOn) {
      assert.ok(capabilityIds.has(dependency), `${capability.capabilityId} dependency ${dependency} must resolve`);
      assert.notEqual(dependency, capability.capabilityId, `${capability.capabilityId} must not depend on itself`);
    }
  }
});

test("every behavior has one primary and every supporting or preferred proof resolves exactly", () => {
  const { behaviors } = declaredBehaviorIndex();
  const proofsByBehavior = proofIndex();
  const mappedTests = new Map(capabilityMap.tests.map((record) => [record.testPath, record]));

  for (const record of capabilityMap.tests) {
    for (const mapping of record.behaviorCoverage) {
      assert.ok(behaviors.has(`${mapping.capabilityId}\u0000${mapping.behaviorId}`), `${record.testPath} behavior reference`);
      nonEmptyString(mapping.proofLocator, `${record.testPath} proofLocator`);
      if (mapping.proofRole === "primary") {
        exactKeys(mapping, ["behaviorId", "capabilityId", "proofLocator", "proofRole"], `${record.testPath} primary mapping`);
      } else {
        assert.equal(mapping.proofRole, "supporting", `${record.testPath} proofRole`);
        exactKeys(
          mapping,
          ["behaviorId", "capabilityId", "primaryProof", "proofLocator", "proofRole", "relationshipToPrimary"],
          `${record.testPath} supporting mapping`,
        );
        assert.ok(new Set(["complementary", "overlapping", "redundant"]).has(mapping.relationshipToPrimary));
        exactKeys(mapping.primaryProof, ["proofLocator", "testPath"], `${record.testPath} primaryProof`);
      }
    }
  }

  for (const behaviorKey of behaviors.keys()) {
    const proofs = proofsByBehavior.get(behaviorKey) ?? [];
    const primaries = proofs.filter((proof) => proof.proofRole === "primary");
    assert.equal(primaries.length, 1, `${behaviorKey} must have exactly one primary proof`);
    const primary = primaries[0];
    for (const proof of proofs.filter((candidate) => candidate.proofRole === "supporting")) {
      assert.deepEqual(
        proof.primaryProof,
        { testPath: primary.testPath, proofLocator: primary.proofLocator },
        `${proof.testPath} must resolve to the exact primary for ${behaviorKey}`,
      );
    }
  }

  for (const record of capabilityMap.tests) {
    const redundancyRetire = record.v2Disposition === "retire" && record.dispositionReasons.includes("redundant-proof");
    if (record.v2Disposition === "consolidate") {
      assert.ok(record.dispositionReasons.includes("redundant-proof"), `${record.testPath} consolidate reason`);
      assert.ok(record.preferredProofs?.length > 0, `${record.testPath} consolidate preferred proof`);
    }
    if (redundancyRetire) assert.ok(record.preferredProofs?.length > 0, `${record.testPath} retire preferred proof`);
    for (const preferred of record.preferredProofs ?? []) {
      exactKeys(preferred, ["behaviorId", "capabilityId", "proofLocator", "testPath"], `${record.testPath} preferred proof`);
      assert.notEqual(preferred.testPath, record.testPath, `${record.testPath} preferred proof must not self-reference`);
      assert.ok(mappedTests.has(preferred.testPath), `${record.testPath} preferred test must exist`);
      const behaviorKey = `${preferred.capabilityId}\u0000${preferred.behaviorId}`;
      const primary = (proofsByBehavior.get(behaviorKey) ?? []).find((proof) => proof.proofRole === "primary");
      assert.ok(primary, `${record.testPath} preferred behavior must have a primary`);
      assert.equal(primary.testPath, preferred.testPath, `${record.testPath} preferred test must be primary`);
      assert.equal(primary.proofLocator, preferred.proofLocator, `${record.testPath} preferred locator must be primary`);
      assert.ok(
        record.behaviorCoverage.some((mapping) =>
          mapping.capabilityId === preferred.capabilityId && mapping.behaviorId === preferred.behaviorId),
        `${record.testPath} preferred proof must name a behavior protected by the current test`,
      );
    }
  }
});

test("protector sets expose primary, complementary, overlapping, and redundant relationships mechanically", () => {
  const protectors = [...proofIndex().entries()].map(([behaviorKey, proofs]) => ({
    behaviorKey,
    complementary: proofs.filter((proof) => proof.relationshipToPrimary === "complementary")
      .map((proof) => `${proof.testPath}::${proof.proofLocator}`).sort(),
    overlapping: proofs.filter((proof) => proof.relationshipToPrimary === "overlapping")
      .map((proof) => `${proof.testPath}::${proof.proofLocator}`).sort(),
    primary: proofs.filter((proof) => proof.proofRole === "primary")
      .map((proof) => `${proof.testPath}::${proof.proofLocator}`),
    redundant: proofs.filter((proof) => proof.relationshipToPrimary === "redundant")
      .map((proof) => `${proof.testPath}::${proof.proofLocator}`).sort(),
  })).sort((left, right) => left.behaviorKey.localeCompare(right.behaviorKey));

  assert.equal(protectors.length, capabilityMap.capabilities.reduce(
    (count, capability) => count + capability.behaviors.length,
    0,
  ));
  assert.ok(protectors.every((protector) => protector.primary.length === 1));
  assert.ok(protectors.some((protector) => protector.complementary.length > 0), "map must expose complementary proof");
  assert.ok(protectors.some((protector) => protector.overlapping.length > 0), "map must expose overlapping proof");
  assert.ok(protectors.every((protector) => Array.isArray(protector.redundant)));
});
