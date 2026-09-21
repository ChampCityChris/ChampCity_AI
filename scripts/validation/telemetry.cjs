const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const assert = require('node:assert/strict');
const { relativePath } = require('./catalog.cjs');
function sourceContext(root) {
  const git = args => spawnSync('git', ['-c', 'core.longpaths=true', ...args], { cwd: root, windowsHide: true, encoding: 'utf8', timeout: 5000, maxBuffer: 1024 * 1024 });
  const head = git(['rev-parse', '--verify', 'HEAD']);
  if (head.status !== 0) return { kind: 'unversioned', revision: null };
  const status = git(['status', '--porcelain=v1', '-z', '--untracked-files=all']);
  assert.equal(status.status, 0, 'Cannot establish source context');
  const entries = status.stdout.split('\0').filter(Boolean), files = new Set();
  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index]; files.add(relativePath(entry.slice(3)));
    if (/R|C/.test(entry.slice(0, 2))) files.add(relativePath(entries[++index]));
  }
  assert.ok(files.size <= 2048, 'Source context exceeds bounded changed-file inventory');
  const hash = createHash('sha256').update(head.stdout.trim()).update(status.stdout);
  let bytes = 0;
  for (const file of [...files].sort()) {
    assert.ok(!/(^|\/)(\.env(?:\.|$)|credentials(?:\.|$)|id_rsa$)/i.test(file), 'Sensitive source path cannot enter validation provenance');
    hash.update(file);
    const absolute = path.join(root, file);
    if (!fs.existsSync(absolute)) { hash.update('deleted'); continue; }
    const stat = fs.lstatSync(absolute);
    assert.ok(stat.isFile() && !stat.isSymbolicLink(), 'Source context requires ordinary files');
    bytes += stat.size; assert.ok(bytes <= 64 * 1024 * 1024, 'Source context exceeds bounded changed-file bytes');
    const contained = path.relative(fs.realpathSync(root), fs.realpathSync(absolute));
    assert.ok(!contained.startsWith('..') && !path.isAbsolute(contained), 'Source context escaped repository');
    hash.update(fs.readFileSync(absolute));
  }
  return { kind: 'git-worktree', revision: head.stdout.trim(), dirty: files.size > 0, changedFileCount: files.size, contentSha256: hash.digest('hex') };
}
function evaluateBudget(plan, durationMs) {
  const key = plan.profile ?? plan.lane;
  const thresholds = { static: [30000, 30000], fast: [30000, 60000], 'implementation-fast': [30000, 60000], 'affected-capability': [60000, 60000], 'work-item': [60000, 60000], repair: [60000, 60000], integration: [180000, 300000], 'integration-gate': [180000, 300000] };
  const pair = thresholds[key];
  return { targetMs: pair?.[0] ?? null, reviewThresholdMs: pair?.[1] ?? null,
    status: !pair ? 'not-budgeted' : durationMs < pair[0] ? 'within-target' : durationMs < pair[1] ? 'target-missed' : 'review-required' };
}
function completeReceipt(plan, receipt, context, finalContext) {
  const stable = JSON.stringify(context) === JSON.stringify(finalContext);
  if (!stable) receipt.status = 'failed';
  const lanes = [...new Set(plan.tests.map(file=>file.lane))].sort();
  const counts = { tests: 0, pass: 0, fail: 0, skipped: 0, cancelled: 0, unavailableFiles: 0, blockedFiles: 0, unknownCountFiles: 0 };
  for (const result of receipt.results) {
    for (const key of ['tests','pass','fail','skipped','cancelled']) counts[key] += result.counts?.[key] ?? 0;
    if (result.status === 'unavailable') counts.unavailableFiles++;
    if (result.status === 'blocked') counts.blockedFiles++;
    if (result.counts?.tests == null) counts.unknownCountFiles++;
  }
  // A skipped assertion is explicitly incomplete evidence, including a child that exits zero.
  if (receipt.status === 'passed' && (counts.skipped || counts.cancelled || counts.unknownCountFiles)) receipt.status = 'incomplete';
  const perLane = lanes.map(lane=>({lane, fileCount:plan.tests.filter(t=>t.lane===lane).length, fileDurationMs:receipt.results.filter(r=>r.lane===lane).reduce((n,r)=>n+r.durationMs,0)}));
  const slowestFiles = [...receipt.results].sort((a,b)=>b.durationMs-a.durationMs||a.testPath.localeCompare(b.testPath)).slice(0,5).map(({testPath,durationMs,status})=>({testPath,durationMs,status}));
  const telemetry = { buildDurationMs: receipt.steps.reduce((sum,step)=>sum+step.durationMs,0), selectedLanes:lanes,
    selectedCapabilities:[...new Set(plan.tests.flatMap(file=>file.ownership.map(owner=>owner.capabilityId)))].sort(),
    concurrency:plan.concurrency, cohortCount:plan.cohorts.length, perLane, counts, slowestFiles, budget:evaluateBudget(plan,receipt.durationMs) };
  return { ...receipt, sourceContext:context, sourceStable:stable, ...(stable?{}:{failureReason:'source-changed-during-validation'}), telemetry,
    selection:plan.tests.map(file=>({testPath:file.testPath,lane:file.lane,reason:file.reason})),
    cohorts:plan.cohorts, failureEvidence:receipt.results.filter(r=>r.status!=='passed').slice(0,10).map(({testPath,status,reason,output})=>({testPath,status,...(reason?{reason}:{}),...(output?{output:output.slice(-1200)}:{})})) };
}
module.exports = { sourceContext, evaluateBudget, completeReceipt };
