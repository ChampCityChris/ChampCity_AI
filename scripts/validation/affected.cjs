const assert = require('node:assert/strict');
const { relativePath } = require('./catalog.cjs');
function matchesPattern(file, pattern) {
  let expression = '^';
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];
    if (char === '*' && pattern[i + 1] === '*') {
      i++; if (pattern[i + 1] === '/') { expression += '(?:.*/)?'; i++; } else expression += '.*';
    } else if (char === '*') expression += '[^/]*';
    else if (char === '?') expression += '[^/]';
    else expression += '\\^$.*+?()[]{}|'.includes(char) ? '\\' + char : char;
  }
  return new RegExp(expression + '$').test(file);
}
const fs = require('node:fs');
const {execFileSync} = require('node:child_process');
const path = require('node:path');
function removedPathOwners(catalog, root, file) {
  if (fs.existsSync(path.join(root,file))) return [];
  const git = args => execFileSync('git',args,{cwd:root,encoding:'utf8',windowsHide:true,timeout:5000,maxBuffer:8*1024*1024,stdio:['ignore','pipe','ignore']}).trim();
  let deletion;
  try {git(['cat-file','-e',`HEAD:${file}`]);}
  catch {
    try {deletion=git(['log','-1','--diff-filter=D','--format=%H','--',file]);if(!/^[a-f0-9]{40}$/.test(deletion))return [];} catch {return [];}
  }
  // Catalog ownership can move to a successor capability in the deletion checkpoint.
  // Read bounded committed ownership history; never resurrect retired tests or behaviors.
  let refs=['HEAD'];
  try {refs.push(...git(['log','-32','--format=%H','--','validation/capability-map.json']).split('\n'));} catch {return [];}
  const known=new Set(catalog.capabilities.map(cap=>cap.capabilityId));
  for(const ref of [...new Set(refs)]) {
    try {
      const previous=JSON.parse(git(['show',`${ref}:validation/capability-map.json`]));
      const ids=new Set(previous.capabilities.filter(cap=>cap.sourcePatterns.some(pattern=>matchesPattern(file,pattern))).map(cap=>cap.capabilityId));
      for(const proof of previous.tests.find(test=>test.testPath===file)?.behaviorCoverage??[])ids.add(proof.capabilityId);
      const owners=[...ids].filter(id=>known.has(id)).sort().map(capabilityId=>({capabilityId,ref}));
      if(owners.length)return owners;
    } catch { /* A historical revision without a catalog has no ownership evidence. */ }
  }
  return [];
}
function selectAffected(catalog, profile, { changedPaths, capabilityIds = [], root = require('./catalog.cjs').ROOT }) {
  assert.ok(Array.isArray(changedPaths) && Array.isArray(capabilityIds), 'Changed paths and explicit capability scope must be arrays');
  const paths = [...new Set(changedPaths.map(relativePath))].sort();
  const capabilities = new Map(catalog.capabilities.map(c => [c.capabilityId, c]));
  const reasons = new Map(), unknown = [];
  const add = (id, reason) => { assert.ok(capabilities.has(id), 'Unknown explicit capability: ' + id); if (!reasons.has(id)) reasons.set(id, new Set()); reasons.get(id).add(reason); };
  for (const file of paths) {
    const owners = catalog.capabilities.filter(c => c.sourcePatterns.some(pattern => matchesPattern(file, pattern)));
    for (const owner of owners) add(owner.capabilityId, 'changed-path:' + file);
    const testRecord = catalog.tests.find(t => t.testPath === file);
    for (const proof of testRecord?.behaviorCoverage ?? []) add(proof.capabilityId, 'changed-owned-test:' + file);
    if (!owners.length && !testRecord) {
      const previous = removedPathOwners(catalog, root, file);
      for (const owner of previous) add(owner.capabilityId, `removed-path:${file}@${owner.ref}`);
      if (!previous.length) unknown.push(file);
    }
  }
  assert.equal(unknown.length, 0, 'Unclassified changed paths; add reviewed sourcePatterns to validation/capability-map.json: ' + unknown.join(', '));
  for (const id of [...new Set(capabilityIds)].sort()) add(id, 'explicit-work-item-scope');
  for (const id of profile.requiredCapabilities ?? []) add(id, 'profile-required-capability');
  const visited = new Set();
  function visit(id) { if (visited.has(id)) return; visited.add(id); for (const dependency of capabilities.get(id).dependsOn) { add(dependency, 'dependency-of:' + id); visit(dependency); } }
  for (const id of [...reasons.keys()].sort()) visit(id);
  const documentationOnly = paths.length > 0 && capabilityIds.length === 0 && paths.every(file => (profile.documentationPatterns ?? []).some(pattern => matchesPattern(file, pattern)));
  const selected = new Map(), behaviorReasons = [];
  for (const id of [...reasons.keys()].sort()) {
    for (const behavior of capabilities.get(id).behaviors) {
      const proofs = catalog.tests.flatMap(record => record.behaviorCoverage.filter(p => p.capabilityId === id && p.behaviorId === behavior.behaviorId).map(proof => ({record,proof})));
      const primary = proofs.find(p => p.proof.proofRole === 'primary');
      assert.ok(primary, 'No adequate primary proof for ' + id + '/' + behavior.behaviorId);
      const eligible = ({record}) => [...profile.lanes,...(profile.capabilityLanes?.[id] ?? [])].includes(record.proposedValidationLane) && (!record.execution.profileRestriction || record.execution.profileRestriction.includes(profile.name)) && (!documentationOnly || record.proposedValidationLane === 'static');
      const required = proofs.filter(p => eligible(p) && (p.proof.proofRole === 'primary' || p.proof.relationshipToPrimary === 'complementary'));
      behaviorReasons.push({ capabilityId: id, behaviorId: behavior.behaviorId, primaryProof: { testPath: primary.record.testPath, proofLocator: primary.proof.proofLocator }, disposition: required.length ? 'selected' : 'outside-profile-lanes', tests: required.map(p=>p.record.testPath).sort() });
      for (const {record} of required) { if (!selected.has(record.testPath)) selected.set(record.testPath, []); selected.get(record.testPath).push(id + '/' + behavior.behaviorId); }
    }
  }
  if (!documentationOnly && profile.includeAllFast) for (const record of catalog.tests.filter(t=>t.proposedValidationLane === 'fast')) { if (!selected.has(record.testPath)) selected.set(record.testPath, []); selected.get(record.testPath).push('profile-required-fast'); }
  return { changedPaths: paths, explicitCapabilities: [...new Set(capabilityIds)].sort(), documentationOnly,
    capabilities: [...reasons.keys()].sort().map(capabilityId => ({ capabilityId, reasons: [...reasons.get(capabilityId)].sort() })), behaviors: behaviorReasons, selected };
}
module.exports = { matchesPattern, selectAffected };
