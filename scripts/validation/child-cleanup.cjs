// Loaded in each validation test process before its test module. Track subprocesses
// owned by that process so failed assertions cannot leave known children running.
const cp = require('node:child_process');
const originalSpawnSync = cp.spawnSync;
const children = new Set();
function stop(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return;
  if (process.platform === 'win32') originalSpawnSync('taskkill', ['/pid', String(pid), '/t', '/f'], { windowsHide: true, stdio: 'ignore', timeout: 3000 });
  else { try { process.kill(pid, 'SIGKILL'); } catch {} }
}
for (const method of ['spawn', 'execFile', 'exec', 'fork']) {
  const original = cp[method];
  cp[method] = function (...args) {
    const child = original.apply(this, args);
    if (Number.isInteger(child.pid)) {
      children.add(child.pid);
      child.once('exit', () => children.delete(child.pid));
    }
    return child;
  };
}
process.once('exit', () => { for (const pid of children) stop(pid); });
