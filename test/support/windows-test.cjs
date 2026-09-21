const test = require('node:test');
// Direct file invocation gets the same explicit platform boundary as the executor.
function windowsTest(name, options, callback) {
  if (typeof options === 'function') { callback = options; options = {}; }
  return test(name, { ...options, ...(process.platform === 'win32' ? {} : { skip: 'Requires supported Windows desktop environment' }) }, callback);
}
module.exports = Object.assign(windowsTest, test);
