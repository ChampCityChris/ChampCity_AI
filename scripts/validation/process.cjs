const { spawn } = require('node:child_process');
const { performance } = require('node:perf_hooks');
function boundedText(text, root, limit) {
  for (const [local, label] of [[root, '<PROJECT_REPO>'], [require('node:os').tmpdir(), '<LOCAL>'], [require('node:os').homedir(), '<LOCAL>']]) {
    for (const variant of new Set([local, local.replaceAll('\\', '/'), JSON.stringify(local).slice(1,-1)])) text = text.replaceAll(variant, label);
  }
  return text
    .replace(/(?:Bearer\s+)[\w.+/-]+/gi, 'Bearer <redacted>')
    .replace(/((?:token|password|secret|api[_-]?key)\s*[=:]\s*)[^\s,;]+/gi, '$1<redacted>').slice(-limit);
}
function runCommand(root, executable, args, { outputLimit = 8192, timeoutMs = 900000, environment = {} } = {}) {
  return new Promise(resolve => {
    const started = performance.now();
    let output = '', timedOut = false, spawnError, fallback, settled = false;
    const env = { ...process.env, ...environment }; delete env.NODE_TEST_CONTEXT; delete env.NODE_OPTIONS; delete env.NODE_PATH;
    for (const key of Object.keys(env)) if (/^npm_/i.test(key)) delete env[key];
    const child = spawn(executable, args, { cwd: root, env, windowsHide: true, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
    const collect = chunk => { output = boundedText(output + chunk.toString(), root, outputLimit); };
    child.stdout.on('data', collect); child.stderr.on('data', collect);
    child.on('error', error => { spawnError = error.code ?? 'spawn-error'; });
    const stopTree = () => {
      if (!child.pid) return;
      if (process.platform === 'win32') {
        const killer = spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { windowsHide: true, stdio: 'ignore', timeout: 3000 });
        killer.on('error', () => child.kill('SIGKILL'));
        killer.on('exit', code => { if (code !== 0) child.kill('SIGKILL'); });
      } else { try { process.kill(-child.pid, 'SIGKILL'); } catch { child.kill('SIGKILL'); } }
    };
    const timer = setTimeout(() => {
      timedOut = true; stopTree();
      fallback = setTimeout(() => { child.kill('SIGKILL'); child.stdout.destroy(); child.stderr.destroy(); child.unref(); finish(null, 'SIGKILL'); }, 3500);
    }, timeoutMs);
    const finish = (code, signal) => {
      if (settled) return; settled = true; clearTimeout(timer); clearTimeout(fallback);
      resolve({ status: spawnError || timedOut ? 'execution-failed' : code === 0 ? 'passed' : 'failed',
        exitCode: code, signal, timedOut, spawnError, durationMs: Math.round(performance.now() - started), output });
    };
    child.on('close', finish);
  });
}
module.exports = { runCommand, boundedText };
