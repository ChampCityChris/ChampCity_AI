const {performance}=require('node:perf_hooks');
const cp=require('node:child_process');
function measureExecution(t,label){
 const bounded=require('../../dist/main/agentHarness/repository/boundedGit.js');
 const run=bounded.runBoundedGit,spawn=cp.spawn,execFileSync=cp.execFileSync;
 const counts={boundedGit:0,fixtureGit:0,npm:0,checkouts:0};const started=performance.now();
 t.mock.method(bounded,'runBoundedGit',function(options){counts.boundedGit++;if(options.args.includes('worktree')&&options.args.includes('add'))counts.checkouts++;return run(options)});
 t.mock.method(cp,'execFileSync',function(executable,args,...rest){if(/git(?:\.exe)?$/i.test(executable)){counts.fixtureGit++;if(args?.includes('worktree')&&args.includes('add'))counts.checkouts++;}return execFileSync.call(this,executable,args,...rest)});
 t.mock.method(cp,'spawn',function(executable,args,...rest){if(args?.some(arg=>/npm-cli\.js$/.test(arg)))counts.npm++;return spawn.call(this,executable,args,...rest)});
 t.after(()=>t.diagnostic(JSON.stringify({label,...counts,durationMs:Math.round(performance.now()-started)})));
 return counts;
}
module.exports={measureExecution};
