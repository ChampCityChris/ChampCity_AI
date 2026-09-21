const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { runCommand } = require('./process.cjs');
async function runOwnedStep(root, kind, options) {
  assert.ok(['production-build', 'typecheck'].includes(kind), 'Unknown static/build step');
  const script = kind === 'production-build' ? 'build' : 'typecheck';
  const cli = [path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js'), path.join(path.dirname(process.execPath), '../lib/node_modules/npm/bin/npm-cli.js')].find(file=>fs.existsSync(file));
  assert.ok(cli, 'Standalone npm CLI next to the host Node toolchain is unavailable');
  const executable = process.execPath;
  const shell = process.platform === 'win32' ? path.join(process.env.SystemRoot, 'System32/cmd.exe') : '/bin/sh';
  const args = [cli, '--prefix', root, '--workspaces=false', '--if-present=false', '--ignore-scripts', '--script-shell', shell, 'run', script];
  return { command: ['npm', 'run', script], ...await runCommand(root, executable, args, options) };
}
module.exports = { runOwnedStep };
