const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');
const { EventEmitter } = require('node:events');
const { PassThrough } = require('node:stream');
const { createCodexRuntimeOperations } = require('../../dist/main/workCardBuilding/codexRuntimeOperations.js');
const { CodexConnectionPolicy, managedConnectionOverrides, redactCodexDiagnostic } = require('../../dist/main/workCardBuilding/codexConnectionPolicy.js');

async function fixture(approved, statuses, callback) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'crc-r01-'));
  const previous = { execFile: cp.execFile, spawn: cp.spawn };
  const calls = [];
  await fs.mkdir(path.join(root, 'codex-runtime'), { recursive: true });
  await fs.writeFile(path.join(root, 'codex-runtime', 'connections.json'), JSON.stringify(approved));
  const standalone = path.join(root, 'personal-config.toml');
  const personal = '[mcp_servers.cloudflare]\ncommand="invalid-token-worker"\n[mcp_servers.github-copilot]\ncommand="invalid-token-worker"\n';
  await fs.writeFile(standalone, personal);
  cp.execFile = (_file, args, _options, done) => {
    assert.deepEqual(args, ['mcp', 'list', '--json']);
    done(null, JSON.stringify(['cloudflare', 'github-copilot', ...approved.map(x => x.name)].map(name => ({ name }))), '');
  };
  cp.spawn = (_file, args, options) => {
    calls.push({ args, options, requests: [] });
    const call = calls.at(-1);
    const child = new EventEmitter();
    child.stdin = new PassThrough(); child.stdout = new PassThrough(); child.stderr = new PassThrough(); child.killed = false;
    child.kill = () => { child.killed = true; child.emit('exit', 0); return true; };
    let buffer = '';
    child.stdin.on('data', chunk => {
      buffer += chunk;
      while (buffer.includes('\n')) {
        const index = buffer.indexOf('\n'); const message = JSON.parse(buffer.slice(0, index)); buffer = buffer.slice(index + 1);
        call.requests.push(message);
        if (!message.id) continue;
        let result;
        if (message.method === 'initialize') result = { userAgent: 'fixture', codexHome: '<USER_CODEX_HOME>' };
        else if (message.method === 'mcpServerStatus/list') {
          if (statuses === 'crash' && calls.length === 1) { child.emit('exit', 1); continue; }
          result = { data: statuses === 'crash' ? [] : statuses, nextCursor: null };
        }
        else if (message.method === 'config/read') result = { config: { mcp_servers: { project_ambient: { command: 'invalid-token-worker' } } } };
        else if (message.method === 'thread/start') result = { thread: { id: 'thread-1' }, model: message.params.model };
        else if (message.method === 'turn/start') result = { turn: { id: 'turn-1', status: 'completed' } };
        else result = {};
        child.stdout.write(JSON.stringify({ id: message.id, result }) + '\n');
      }
    });
    return child;
  };
  const ops = createCodexRuntimeOperations(root);
  const runtime = { executable: 'managed-codex', directory: root, version: '0.146.0' };
  try { await callback({ ops, runtime, calls, root }); assert.equal(await fs.readFile(standalone, 'utf8'), personal); }
  finally { await ops.shutdown(); Object.assign(cp, previous); await fs.rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); }
}

test('managed launch excludes Signal Forge ambient invalid-token workers before any turn', async () => {
  await fixture([], [], async ({ ops, runtime, calls }) => {
    const transport = await ops.launch(runtime);
    assert.equal(calls.length, 2);
    for (const call of calls) {
      assert.ok(call.args.some(arg => arg.includes('"cloudflare"={enabled=false}')));
      assert.ok(call.args.some(arg => arg.includes('"github-copilot"={enabled=false}')));
      assert.ok(call.options.cwd.endsWith('codex-runtime'));
    }
    const thread = transport.startThread({ workingDirectory: '<PROJECT_REPO>', model: 'fixture-model' });
    const streamed = await thread.runStreamed('Implement');
    const events = []; for await (const event of streamed.events) events.push(event.type);
    assert.deepEqual(events, ['turn.started', 'turn.completed']);
    const requests = calls.at(-1).requests;
    assert.equal(requests.find(x => x.method === 'thread/start').params.config.mcp_servers.project_ambient.enabled, false);
    assert.ok(requests.findIndex(x => x.method === 'mcpServerStatus/list') < requests.findIndex(x => x.method === 'turn/start'));
    await transport.dispose();
  });
});

test('optional invalid auth is bounded and excluded from the implementation process', async () => {
  await fixture([{ name: 'optional', enabled: true }], [{ name: 'optional', authStatus: 'notLoggedIn', tools: {} }], async ({ ops, runtime, calls }) => {
    const transport = await ops.launch(runtime);
    const status = ops.getConnectionsStatus();
    assert.equal(status.optionalWarnings, 1); assert.equal(status.blocker, null);
    assert.equal(status.connections[0].status, 'authentication-required');
    assert.ok(calls.at(-1).args.some(arg => arg.includes('"optional"={enabled=false}')));
    await transport.dispose();
  });
  await fixture([{ name: 'optional', enabled: true }], 'crash', async ({ ops, runtime, calls }) => {
    const transport = await ops.launch(runtime);
    assert.equal(ops.getConnectionsStatus().connections[0].status, 'failed');
    assert.equal(ops.getConnectionsStatus().blocker, null);
    assert.ok(calls.at(-1).args.some(arg => arg.includes('"optional"={enabled=false}')));
    const streamed = await transport.startThread({ workingDirectory: '<PROJECT_REPO>' }).runStreamed('Implement without optional worker');
    const events = []; for await (const event of streamed.events) events.push(event.type);
    assert.deepEqual(events, ['turn.started', 'turn.completed']);
    await transport.dispose();
  });
});

test('required invalid auth blocks before an implementation thread or turn and gives Settings recovery', async () => {
  await fixture([{ name: 'required', enabled: true, requirement: 'required' }], [{ name: 'required', authStatus: 'notLoggedIn', tools: {} }], async ({ ops, runtime, calls }) => {
    await assert.rejects(ops.launch(runtime), /Codex connection "required" requires authentication.*Settings > Codex Connections/);
    assert.equal(calls.length, 1);
    assert.ok(calls[0].requests.every(x => !['thread/start', 'turn/start'].includes(x.method)));
    assert.equal(ops.getConnectionsStatus().requiredReady, false);
  });
});

test('connection policy only toggles approved names and rejects secrets or config injection', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'crc-policy-'));
  try {
    const policy = new CodexConnectionPolicy(root);
    assert.deepEqual(await policy.read(), []);
    await assert.rejects(policy.setEnabled('ambient', true), /not ChampCity-approved/);
    assert.deepEqual(managedConnectionOverrides(['strange.name'], []), ['-c', 'mcp_servers={"strange.name"={enabled=false}}']);
  } finally { await fs.rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }); }
});

test('auth diagnostic redaction covers headers tokens cookies and URL queries', () => {
  const redacted = redactCodexDiagnostic('Bearer synthetic-bearer\nAuthorization: synthetic-header\nCookie: synthetic-cookie\naccess_token=synthetic-access refresh_token="synthetic-refresh" client_secret=synthetic-secret https://example.test/?code=synthetic-query');
  for (const secret of ['synthetic-bearer', 'synthetic-header', 'synthetic-cookie', 'synthetic-access', 'synthetic-refresh', 'synthetic-secret', 'synthetic-query']) assert.ok(!redacted.includes(secret));
});

test('bundled pinned runtime honors production disable overrides and leaves synthetic standalone config unchanged', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'crc-pinned-'));
  const personalHome = path.join(root, 'personal');
  await fs.mkdir(personalHome);
  const marker = path.join(root, 'unapproved-worker-started');
  const project = path.join(root, 'project');
  await fs.mkdir(path.join(project, '.codex'), { recursive: true });
  const worker = `require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'invalid_token'); process.exit(1)`;
  const config = ['cloudflare', 'github-copilot'].map(name => `[mcp_servers.${name}]\ncommand=${JSON.stringify(process.execPath)}\nargs=["-e",${JSON.stringify(worker)}]\n`).join('\n') + `\n[projects.${JSON.stringify(project)}]\ntrust_level="trusted"\n`;
  await fs.writeFile(path.join(project, '.codex', 'config.toml'), `[mcp_servers.project_ambient]\ncommand=${JSON.stringify(process.execPath)}\nargs=["-e",${JSON.stringify(worker)}]\n`);
  await fs.writeFile(path.join(personalHome, 'config.toml'), config);
  const oldHome = process.env.CODEX_HOME;
  process.env.CODEX_HOME = personalHome;
  const operations = createCodexRuntimeOperations(path.join(root, 'application'));
  try {
    const platform = `${process.platform}-${process.arch}`;
    const triples = { 'win32-x64': 'x86_64-pc-windows-msvc', 'win32-arm64': 'aarch64-pc-windows-msvc', 'linux-x64': 'x86_64-unknown-linux-musl', 'linux-arm64': 'aarch64-unknown-linux-musl', 'darwin-x64': 'x86_64-apple-darwin', 'darwin-arm64': 'aarch64-apple-darwin' };
    const packageRoot = path.dirname(require.resolve(`@openai/codex-${platform}/package.json`));
    const executable = path.join(packageRoot, 'vendor', triples[platform], 'bin', process.platform === 'win32' ? 'codex.exe' : 'codex');
    const execute = args => new Promise((resolve, reject) => cp.execFile(executable, args, { timeout: 15000, windowsHide: true }, (error, stdout) => error ? reject(Error('Pinned runtime command failed.')) : resolve(stdout)));
    const ambient = JSON.parse(await execute(['mcp', 'list', '--json']));
    assert.deepEqual(ambient.map(x => x.name).sort(), ['cloudflare', 'github-copilot']);
    const excluded = JSON.parse(await execute([...managedConnectionOverrides(ambient.map(x => x.name), []), 'mcp', 'list', '--json']));
    assert.ok(excluded.every(x => x.enabled === false));
    const runtime = { executable, directory: path.join(root, 'runtime-version'), version: require('@openai/codex/package.json').version };
    const transport = await operations.launch(runtime);
    assert.deepEqual((await transport.listManagedConnections()).filter(entry => entry.initialized), []);
    const thread = transport.startThread({ workingDirectory: project, sandboxMode: 'workspace-write' });
    const threadId = await transport.startAppThread(thread);
    assert.ok(threadId);
    assert.deepEqual((await transport.listManagedConnections(threadId)).filter(entry => entry.initialized), []);
    await assert.rejects(fs.access(marker), { code: 'ENOENT' });
    await transport.dispose();
    await fs.writeFile(path.join(root, 'application', 'codex-runtime', 'connections.json'), JSON.stringify([{ name: 'cloudflare', enabled: true, requirement: 'required' }]));
    // A connector requirement cannot turn a healthy runtime/model probe into generic unavailability.
    assert.ok(Array.isArray(await operations.probe(runtime)));
    await assert.rejects(fs.access(marker), { code: 'ENOENT' });
    assert.equal(await fs.readFile(path.join(personalHome, 'config.toml'), 'utf8'), config);
  } finally {
    await operations.shutdown();
    if (oldHome === undefined) delete process.env.CODEX_HOME; else process.env.CODEX_HOME = oldHome;
    await fs.rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
});
