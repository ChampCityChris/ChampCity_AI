const fs = require('node:fs');
const path = require('node:path');
const { runCommand } = require('./process.cjs');
async function detectCapabilities(root, required) {
  const available = [];
  if (required.includes('git-cli') && (await runCommand(root, 'git', ['--version'], { timeoutMs: 3000, outputLimit: 1024 })).status === 'passed') available.push('git-cli');
  if (required.includes('npm-cli')) {
    const cli = path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
    if (fs.existsSync(cli) && (await runCommand(root, process.execPath, [cli,'--version'], { timeoutMs: 3000, outputLimit: 1024 })).status === 'passed') available.push('npm-cli');
  }
  return available.sort();
}
module.exports = { detectCapabilities };
