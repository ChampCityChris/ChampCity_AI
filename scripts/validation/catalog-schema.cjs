const assert = require("node:assert/strict");

const validationLanes = new Set([
  "affected-capability",
  "desktop-platform",
  "fast",
  "full-regression",
  "integration",
  "migration",
  "packaging",
  "performance-soak",
  "static",
]);
const validationRoles = new Set([
  "capability",
  "characterization",
  "contract",
  "desktop-platform",
  "external-integration",
  "integration",
  "migration",
  "packaging",
  "performance-soak",
  "production-path",
  "source-structure",
]);
const proofCharacteristics = new Set([
  "behavioral",
  "contract",
  "environment-bound",
  "external-capability-bound",
  "packaging-bound",
  "production-path",
  "rendered-output",
  "source-text",
  "static-analysis",
  "timing-sensitive",
]);
const dispositionReasons = new Set([
  "behavior-owner-will-change",
  "current-proof-appropriate",
  "environment-coupled",
  "proof-boundary-should-change",
  "redundant-proof",
]);
const dispositions = new Set([
  "consolidate",
  "migrate",
  "preserve",
  "quarantine",
  "retire",
  "rewrite",
  "split",
]);
const dependencyKeys = ["electron", "filesystem", "git", "network", "process", "timing"];
const ownedResourceClasses = new Set([
  "bounded-child-process",
  "electron-desktop",
  "isolated-git-fixture",
  "loopback-dynamic-endpoint",
  "packaging",
  "performance-soak",
  "pure-stateless",
  "repository-readonly",
  "shared-global-state-exclusive",
  "temp-filesystem-isolated",
]);
const kebabCase = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function exactKeys(value, expectedKeys, label) {
  assert.ok(value && typeof value === "object" && !Array.isArray(value), `${label} must be an object`);
  assert.deepEqual(Object.keys(value).sort(), [...expectedKeys].sort(), `${label} field vocabulary`);
}

function nonEmptyString(value, label) {
  assert.equal(typeof value, "string", `${label} must be a string`);
  assert.notEqual(value.trim(), "", `${label} must not be empty`);
}

function sortedUniqueStrings(values, label, allowedValues) {
  assert.ok(Array.isArray(values), `${label} must be an array`);
  assert.deepEqual(values, [...values].sort(), `${label} must be lexically sorted`);
  assert.equal(new Set(values).size, values.length, `${label} must not contain duplicates`);
  for (const value of values) {
    nonEmptyString(value, `${label} value`);
    if (allowedValues) assert.ok(allowedValues.has(value), `${label} contains invalid value: ${value}`);
  }
}

function coverageSortKey(mapping) {
  return [mapping.capabilityId, mapping.behaviorId, mapping.proofLocator, mapping.proofRole].join("\u0000");
}

function preferredProofSortKey(mapping) {
  return [mapping.capabilityId, mapping.behaviorId, mapping.testPath, mapping.proofLocator].join("\u0000");
}

function validateInventoryFields(record) {
  const requiredKeys = [
    "behaviorCoverage",
    "currentTestCount",
    "dependencies",
    "dispositionReasons",
    "duration",
    "execution",
    "platformDependency",
    "proofCharacteristics",
    "proposedValidationLane",
    "sourceInspectionClassification",
    "testPath",
    "v2Disposition",
    "validationRoles",
  ];
  const allowedKeys = record.preferredProofs === undefined
    ? requiredKeys
    : [...requiredKeys, "preferredProofs"];
  exactKeys(record, allowedKeys, `test record ${record.testPath ?? "<unknown>"}`);

  nonEmptyString(record.testPath, "testPath");
  assert.match(record.testPath, /^test\/.+\.test\.cjs$/, "testPath must use normalized repository-relative form");
  assert.equal(record.testPath.includes("\\"), false, "testPath must use forward slashes");

  exactKeys(record.currentTestCount, ["basis", "value"], `${record.testPath} currentTestCount`);
  assert.ok(Number.isInteger(record.currentTestCount.value), `${record.testPath} count must be an integer`);
  assert.ok(record.currentTestCount.value >= 0, `${record.testPath} count must be non-negative`);
  nonEmptyString(record.currentTestCount.basis, `${record.testPath} count basis`);

  exactKeys(record.duration, ["basis", "kind", "milliseconds"], `${record.testPath} duration`);
  assert.ok(new Set(["estimated", "measured"]).has(record.duration.kind), `${record.testPath} duration kind`);
  assert.ok(Number.isInteger(record.duration.milliseconds), `${record.testPath} duration must be an integer`);
  assert.ok(record.duration.milliseconds >= 0, `${record.testPath} duration must be non-negative`);
  nonEmptyString(record.duration.basis, `${record.testPath} duration basis`);

  assert.ok(validationLanes.has(record.proposedValidationLane), `${record.testPath} validation lane`);
  assert.ok(new Set(["none", "windows"]).has(record.platformDependency), `${record.testPath} platform dependency`);
  exactKeys(record.dependencies, dependencyKeys, `${record.testPath} dependencies`);
  for (const dependency of dependencyKeys) {
    assert.equal(typeof record.dependencies[dependency], "boolean", `${record.testPath} dependency ${dependency}`);
  }
  assert.ok(
    new Set(["ast-static-analysis", "mixed", "none", "source-text"]).has(record.sourceInspectionClassification),
    `${record.testPath} source inspection classification`,
  );
  assert.ok(dispositions.has(record.v2Disposition), `${record.testPath} V2 disposition`);
  sortedUniqueStrings(record.validationRoles, `${record.testPath} validationRoles`, validationRoles);
  assert.ok(record.validationRoles.length > 0, `${record.testPath} validationRoles must not be empty`);

  exactKeys(record.execution, ["externalCapabilities", "ownedResources", "platform", "requiresBuild", "scheduling", "schedulingReason", ...(record.execution.profileRestriction === undefined ? [] : ["profileRestriction"])], `${record.testPath} execution`);
  assert.ok(require("./scheduler.cjs").MODES.includes(record.execution.scheduling), "Invalid or missing scheduling classification");
  nonEmptyString(record.execution.schedulingReason, "Scheduling reason");
  sortedUniqueStrings(record.execution.ownedResources, `${record.testPath} ownedResources`, ownedResourceClasses);
  assert.ok(record.execution.ownedResources.length > 0, `${record.testPath} ownedResources must not be empty`);
  const ownedResources = new Set(record.execution.ownedResources);
  if (ownedResources.has("pure-stateless")) {
    assert.equal(ownedResources.size, 1, `${record.testPath} pure-stateless cannot be combined with another resource`);
    assert.ok(
      ["electron", "filesystem", "git", "network", "process"].every((dependency) => !record.dependencies[dependency]),
      `${record.testPath} pure-stateless dependency mismatch`,
    );
  }
  if (ownedResources.has("isolated-git-fixture")) assert.equal(record.dependencies.git, true, `${record.testPath} Git resource dependency mismatch`);
  if (ownedResources.has("bounded-child-process")) assert.equal(record.dependencies.process, true, `${record.testPath} process resource dependency mismatch`);
  if (ownedResources.has("loopback-dynamic-endpoint")) assert.equal(record.dependencies.network, true, `${record.testPath} network resource dependency mismatch`);
  if (record.dependencies.electron) assert.ok(ownedResources.has("electron-desktop"), `${record.testPath} missing Electron/Desktop resource`);
  if (record.dependencies.git) assert.ok(ownedResources.has("isolated-git-fixture"), `${record.testPath} missing Git resource`);
  if (record.dependencies.network) assert.ok(ownedResources.has("loopback-dynamic-endpoint"), `${record.testPath} missing network resource`);
  if (record.dependencies.process) {
    assert.ok(
      ownedResources.has("bounded-child-process") || ownedResources.has("shared-global-state-exclusive"),
      `${record.testPath} missing process resource`,
    );
  }
  if (record.dependencies.filesystem) {
    assert.ok(
      ["isolated-git-fixture", "repository-readonly", "shared-global-state-exclusive", "temp-filesystem-isolated"]
        .some((resource) => ownedResources.has(resource)),
      `${record.testPath} missing filesystem resource`,
    );
  }
  const schedulingResources = {
    "exclusive-desktop": "electron-desktop",
    "exclusive-packaging": "packaging",
    "exclusive-performance": "performance-soak",
    "exclusive-process": "shared-global-state-exclusive",
  };
  const dedicatedLaneContracts = [
    { lane: "desktop-platform", resource: "electron-desktop", scheduling: "exclusive-desktop", platform: "windows" },
    { lane: "packaging", resource: "packaging", scheduling: "exclusive-packaging" },
    { lane: "performance-soak", resource: "performance-soak", scheduling: "exclusive-performance" },
  ];
  const requiredSchedulingResource = schedulingResources[record.execution.scheduling];
  if (requiredSchedulingResource) assert.ok(ownedResources.has(requiredSchedulingResource), `${record.testPath} scheduling resource mismatch`);
  for (const [mode, exclusiveResource] of Object.entries(schedulingResources)) {
    if (ownedResources.has(exclusiveResource)) assert.equal(record.execution.scheduling, mode, `${record.testPath} exclusive resource scheduling mismatch`);
  }
  for (const contract of dedicatedLaneContracts) {
    if (record.proposedValidationLane === contract.lane) {
      assert.ok(ownedResources.has(contract.resource), `${record.testPath} ${contract.lane} lane requires ${contract.resource}`);
      assert.equal(record.execution.scheduling, contract.scheduling, `${record.testPath} ${contract.lane} lane requires ${contract.scheduling}`);
    }
    if (ownedResources.has(contract.resource)) {
      assert.equal(record.proposedValidationLane, contract.lane, `${record.testPath} ${contract.resource} requires ${contract.lane} lane`);
    }
    if (record.execution.scheduling === contract.scheduling) {
      assert.equal(record.proposedValidationLane, contract.lane, `${record.testPath} ${contract.scheduling} requires ${contract.lane} lane`);
    }
    if (contract.platform && record.proposedValidationLane === contract.lane) {
      assert.equal(record.platformDependency, contract.platform, `${record.testPath} ${contract.lane} requires ${contract.platform} platform dependency`);
      assert.equal(record.execution.platform, contract.platform, `${record.testPath} ${contract.lane} requires ${contract.platform} execution platform`);
    }
  }
  if (record.execution.scheduling === "parallel-safe") {
    for (const exclusiveResource of Object.values(schedulingResources)) {
      assert.equal(ownedResources.has(exclusiveResource), false, `${record.testPath} parallel-safe resource mismatch`);
    }
  }
  assert.equal(typeof record.execution.requiresBuild, "boolean", `${record.testPath} requiresBuild`);
  assert.ok(new Set(["any", "windows"]).has(record.execution.platform), `${record.testPath} execution platform`);
  assert.equal(
    record.execution.platform,
    record.platformDependency === "windows" ? "windows" : "any",
    `${record.testPath} platform fields must agree`,
  );
  if (record.execution.profileRestriction !== undefined) {
    sortedUniqueStrings(record.execution.profileRestriction, `${record.testPath} profileRestriction`, new Set(["implementation-fast", "work-item", "repair", "integration-gate", "phase-close", "release-qualification", "full-supported-platform"]));
    assert.ok(record.execution.profileRestriction.length > 0, "Empty profile restriction");
  }
  sortedUniqueStrings(record.execution.externalCapabilities, `${record.testPath} externalCapabilities`);

  sortedUniqueStrings(record.proofCharacteristics, `${record.testPath} proofCharacteristics`, proofCharacteristics);
  assert.ok(record.proofCharacteristics.length > 0, `${record.testPath} proofCharacteristics must not be empty`);
  sortedUniqueStrings(record.dispositionReasons, `${record.testPath} dispositionReasons`, dispositionReasons);
  assert.ok(record.dispositionReasons.length > 0, `${record.testPath} dispositionReasons must not be empty`);

  assert.ok(Array.isArray(record.behaviorCoverage) && record.behaviorCoverage.length > 0, `${record.testPath} behaviorCoverage`);
  assert.deepEqual(
    record.behaviorCoverage.map(coverageSortKey),
    record.behaviorCoverage.map(coverageSortKey).sort(),
    `${record.testPath} behaviorCoverage must be deterministically sorted`,
  );
  if (record.preferredProofs !== undefined) {
    assert.ok(Array.isArray(record.preferredProofs) && record.preferredProofs.length > 0, `${record.testPath} preferredProofs`);
    assert.deepEqual(
      record.preferredProofs.map(preferredProofSortKey),
      record.preferredProofs.map(preferredProofSortKey).sort(),
      `${record.testPath} preferredProofs must be deterministically sorted`,
    );
  }
}

module.exports = { exactKeys, nonEmptyString, ownedResourceClasses, sortedUniqueStrings, kebabCase, validateInventoryFields };
