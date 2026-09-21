// Fixed MCP adapter. The bound repository is process.cwd(); callers cannot choose it.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { loadCatalog, relativePath, LANES } = require('./catalog.cjs');
const { loadProfiles, planValidation, assertExecutionScope } = require('./planner.cjs');
const { executePlan, boundedText } = require('./executor.cjs');
const { sourceContext } = require('./telemetry.cjs');

const MAX_FILES = 512;
const MAX_REQUEST_BYTES = 1_200_000;
const STEP_TIMEOUT_MS = 900_000;
const actionKeys = {
  run_test_file: ['testPath'],
  run_test_pattern: ['testPath', 'testNamePattern'],
  run_validation_profile: ['profile', 'changedPaths', 'capabilityIds'],
  run_validation_lane: ['lane'],
  audit_test_corpus: [],
};
function object(value, keys) {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).every(key => keys.includes(key)), 'Unsupported toolbox request fields');
}
function text(value, limit) {
  assert.ok(typeof value === 'string' && value.trim() && value.length <= limit && !/[\x00-\x1f]/.test(value), 'Invalid bounded request string');
  return value;
}
function exactPath(value) {
  return relativePath(text(value, 4096));
}
function containedFile(root, file, limit) {
  exactPath(file);
  const absolute = path.join(root, file);
  const stat = fs.lstatSync(absolute);
  const relative = path.relative(root, fs.realpathSync(absolute));
  assert.ok(stat.isFile() && !stat.isSymbolicLink() && relative && !relative.startsWith('..') && !path.isAbsolute(relative)
    && stat.size <= limit, 'Validation input must be a bounded file inside the bound repository');
}
function requestOptions(request, profiles) {
  object(request, ['action', 'params']);
  assert.ok(Object.hasOwn(actionKeys, request.action), 'Unknown test toolbox action');
  const params = request.params;
  object(params, actionKeys[request.action]);
  if (request.action === 'run_test_file' || request.action === 'run_test_pattern') {
    const file = exactPath(params.testPath);
    assert.ok(file.startsWith('test/') && file.endsWith('.test.cjs'), 'Expected an exact executable test path');
    if (request.action === 'run_test_pattern') new RegExp(text(params.testNamePattern, 256));
    return { testPaths: [file] };
  }
  if (request.action === 'run_validation_lane') {
    assert.ok(LANES.includes(params.lane), 'Unknown validation lane');
    return { lane: params.lane };
  }
  if (request.action === 'run_validation_profile') {
    assert.ok(Object.hasOwn(profiles.profiles, params.profile), 'Unknown validation profile');
    assertExecutionScope(params.profile, params.changedPaths !== undefined);
    for (const key of ['changedPaths', 'capabilityIds']) if (params[key] !== undefined) {
      assert.ok(Array.isArray(params[key]) && params[key].length <= 256, 'Scope exceeds its bound');
      params[key].forEach(key === 'changedPaths' ? exactPath : value => text(value, 160));
    }
    assert.ok(params.capabilityIds === undefined || params.changedPaths !== undefined, 'Capability scope requires changed paths');
    return { profile: params.profile, ...(params.changedPaths === undefined ? {} : { changedPaths: params.changedPaths }),
      ...(params.capabilityIds === undefined ? {} : { capabilityIds: params.capabilityIds }) };
  }
  return {}; // audit inventory is supplied by loadCatalog below, never by MCP.
}
function publicRow(file, result, root, pattern) {
  const counts = result.counts ?? null;
  const timedOut = result.timedOut === true;
  const incompleteCounts = !counts || Object.values(counts).some(value => value === null) || counts.tests === 0 || counts.skipped > 0 || counts.cancelled > 0
    || (pattern !== undefined && counts.pass === 0 && counts.fail === 0);
  const status = timedOut ? 'timeout' : result.status === 'passed' ? (incompleteCounts ? 'incomplete' : 'pass')
    : result.status === 'failed' ? 'fail' : 'incomplete';
  const failureReason = status === 'pass' ? null : boundedText(String(result.reason || result.spawnError ||
    (timedOut ? 'test-timeout' : result.output || (incompleteCounts ? 'missing-skipped-cancelled-or-unmatched-test-evidence' : result.status))), root, 1200);
  return { testPath: file.testPath, lane: file.lane, capabilities: [...new Set(file.ownership.map(owner => owner.capabilityId))].sort(),
    durationMs: result.durationMs ?? null, testCount: counts?.tests ?? null, counts, status,
    executorStatus: result.status, timedOut, executionFailed: result.status === 'execution-failed',
    exitCode: result.exitCode ?? null, failureReason };
}
// Redact every string leaf, including failure evidence and commands, not serialized JSON syntax.
function redact(value, root) {
  if (typeof value === 'string') return boundedText(value, root, 4096);
  if (Array.isArray(value)) return value.map(entry => redact(entry, root));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, redact(entry, root)]));
  return value;
}
async function run(request, emit) {
  const root = fs.realpathSync(process.cwd());
  containedFile(root, 'validation/capability-map.json', 2_000_000);
  containedFile(root, 'validation/profiles.json', 128_000);
  const initialContext = sourceContext(root);
  assert.ok(!fs.existsSync(path.join(root, '.git')) || initialContext.kind === 'git-worktree', 'Cannot establish bound Git source context');
  const catalog = loadCatalog(root), profiles = loadProfiles(root);
  assert.ok(catalog.tests.length <= MAX_FILES, 'Catalog exceeds bounded toolbox file inventory');
  const selection = requestOptions(request, profiles);
  if (request.action === 'audit_test_corpus') selection.testPaths = catalog.tests.map(file => file.testPath);
  const plan = planValidation({ root, catalog, profiles, ...selection });
  for (const file of plan.tests) containedFile(root, file.testPath, 4_000_000);
  const byPath = new Map(plan.tests.map(file => [file.testPath, file]));
  emit({ type: 'plan', sourceContext: initialContext, selected: plan.tests.map(file => ({
    testPath: file.testPath, lane: file.lane, capabilities: [...new Set(file.ownership.map(owner => owner.capabilityId))].sort(),
  })) });
  const pattern = request.action === 'run_test_pattern' ? request.params.testNamePattern : undefined;
  const receipt = await executePlan(plan, { root, catalog, outputLimit: 1200, timeoutMs: STEP_TIMEOUT_MS,
    ...(pattern === undefined ? {} : { testNamePattern: pattern }),
    onFileResult: result => emit({ type: 'file', result: publicRow(byPath.get(result.testPath), result, root, pattern) }),
  });
  if (JSON.stringify(initialContext) !== JSON.stringify(receipt.sourceContext)) {
    receipt.status = 'failed'; receipt.sourceStable = false; receipt.failureReason = 'source-changed-during-planning';
  }
  const records = receipt.results.map(result => publicRow(byPath.get(result.testPath), result, root, pattern));
  if (receipt.status === 'passed' && records.some(record => record.status !== 'pass')) receipt.status = 'incomplete';
  emit({ type: 'complete', status: receipt.status, records, receipt: redact(receipt, root) });
}

if (require.main === module) {
  let body = '', bytes = 0, invalid = false, outputBytes = 0;
  const emit = event => {
    const line = JSON.stringify(event) + '\n';
    outputBytes += Buffer.byteLength(line);
    assert.ok(outputBytes <= 2_000_000, 'Toolbox evidence exceeds its bound');
    process.stdout.write(line);
  };
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => {
    bytes += Buffer.byteLength(chunk);
    if (bytes > MAX_REQUEST_BYTES) { invalid = true; body = ''; } else if (!invalid) body += chunk;
  });
  process.stdin.on('end', async () => {
    try {
      assert.ok(!invalid, 'Toolbox request exceeds its bound');
      await run(JSON.parse(body), emit);
    } catch (error) {
      // Generic fallback remains small even when the receipt itself exceeded the limit.
      process.stdout.write(JSON.stringify({ type: 'error', message: boundedText(String(error.message), process.cwd(), 1200) }) + '\n');
      process.exitCode = 1;
    }
  });
}
module.exports = { run };
