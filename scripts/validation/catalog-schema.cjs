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

  exactKeys(record.execution, ["externalCapabilities", "platform", "requiresBuild", "scheduling", "schedulingReason", ...(record.execution.profileRestriction === undefined ? [] : ["profileRestriction"])], `${record.testPath} execution`);
  assert.ok(require("./scheduler.cjs").MODES.includes(record.execution.scheduling), "Invalid or missing scheduling classification");
  nonEmptyString(record.execution.schedulingReason, "Scheduling reason");
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

module.exports = { exactKeys, nonEmptyString, sortedUniqueStrings, kebabCase, validateInventoryFields };
