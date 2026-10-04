const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {spawnSync} = require('node:child_process');
const esbuild = require('esbuild');

test('full App viewport fills empty/generated Phase Map and completed Planning inspection while preserving generic workflows', {timeout: 30000}, async () => {
  const root = path.resolve(__dirname, '../..');
  const fixtures = path.join(root, 'test/fixtures/greenfield-application-viewport');
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'greenfield-application-viewport-'));
  try {
    await esbuild.build({
      entryPoints: [path.join(fixtures, 'renderer.tsx')], bundle: true,
      outfile: path.join(temp, 'geometry.js'), platform: 'browser', jsx: 'automatic',
      plugins: [{name: 'synthetic-workflow-entry', setup(build) {
        // Seed App's initial route and workflow only; keep its production composition and class list.
        build.onLoad({filter: /[\\/]app[\\/]App\.tsx$/}, args => {
          const source = fs.readFileSync(args.path, 'utf8');
          assert.ok(source.includes('useState<ShellView>("landing")'));
          assert.ok(source.includes('useState<WorkflowInstanceSummary | null>(null)'));
          return {contents: source
            .replace('useState<ShellView>("landing")', 'useState<ShellView>("workflow-instance")')
            .replace('useState<WorkflowInstanceSummary | null>(null)', 'useState<WorkflowInstanceSummary | null>((window as any).fixtureWorkflow)'),
            loader: 'tsx', resolveDir: path.dirname(args.path)};
        });
      }}],
    });
    fs.writeFileSync(path.join(temp, 'geometry.html'), `<html><head><link rel="stylesheet" href="${pathToFileURL(path.join(root, 'src/renderer/styles.css'))}"></head><body><div id="root"></div><script src="geometry.js"></script></body></html>`);
    fs.copyFileSync(path.join(fixtures, 'electron.cjs'), path.join(temp, 'electron.cjs'));
    const result = spawnSync(require('electron'), [path.join(temp, 'electron.cjs')], {encoding: 'utf8', windowsHide: true, timeout: 25000});
    assert.equal(result.status, 0, result.error?.message ?? result.stdout + result.stderr);
    const receipt = JSON.parse(fs.readFileSync(path.join(temp, 'receipt.json'), 'utf8'));
    assert.equal(receipt.nativeSyntheticInteraction, 'passed');
    assert.ok(receipt.baseline['.architect-browser-host'].height < 10, 'fixture reproduces the original outer collapse');
    assert.equal(receipt.generic['.workspace-surface'].className, 'workspace-surface');
  } finally {
    fs.rmSync(temp, {recursive: true, force: true});
  }
});
