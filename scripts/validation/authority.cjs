const assert = require('node:assert/strict');
const { validateCatalog } = require('./catalog.cjs');
const { matchesPattern } = require('./affected.cjs');
// Preserve target ownership and execution requirements; incoming additions may only broaden proof.
function authoritativeCatalog(target, proposed, root, changedPaths) {
  validateCatalog(target, root, { allowAdditionalTests: true }); validateCatalog(proposed, root);
  for (const file of changedPaths) assert.ok(target.capabilities.some(c=>c.sourcePatterns.some(p=>matchesPattern(file,p))) || target.tests.some(t=>t.testPath===file), 'Unclassified changed source under target authority: ' + file);
  const merged = structuredClone(proposed);
  for (const original of target.capabilities) {
    const current = merged.capabilities.find(c=>c.capabilityId===original.capabilityId);
    assert.ok(current, 'Candidate removed target capability: ' + original.capabilityId);
    current.sourcePatterns = [...original.sourcePatterns];
    current.dependsOn = [...new Set([...original.dependsOn,...current.dependsOn])].sort();
    for (const behavior of original.behaviors) assert.ok(current.behaviors.some(b=>b.behaviorId===behavior.behaviorId), 'Candidate removed target behavior: ' + behavior.behaviorId);
  }
  for (const original of target.tests) {
    const current = merged.tests.find(t=>t.testPath===original.testPath);
    assert.ok(current, 'Candidate removed target test proof: ' + original.testPath);
    for (const proof of original.behaviorCoverage) assert.ok(current.behaviorCoverage.some(p=>JSON.stringify(p)===JSON.stringify(proof)), 'Candidate weakened target behavior proof: ' + original.testPath);
    current.execution = structuredClone(original.execution); current.proposedValidationLane = original.proposedValidationLane;
    current.platformDependency = original.platformDependency;
  }
  return validateCatalog(merged, root);
}
module.exports = { authoritativeCatalog };
