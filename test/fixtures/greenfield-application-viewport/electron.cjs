const {app,BrowserWindow,WebContentsView}=require('electron'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const receipt={};const timeout=setTimeout(()=>{console.error('geometry timeout');app.exit(2)},20000);
app.whenReady().then(async()=>{
 const win=new BrowserWindow({width:1440,height:1000,useContentSize:true,show:false});const native=new WebContentsView();win.contentView.addChildView(native);await native.webContents.loadURL('data:text/html,<button onclick="this.textContent=\'Clicked\'">Native fixture</button>');
 win.webContents.on('console-message',(_,level,message)=>{if(level>=2)console.log(message)});await win.loadFile(path.join(__dirname,'geometry.html'));
 const wait=()=>new Promise(r=>setTimeout(r,500));await wait();
 const measure=()=>win.webContents.executeJavaScript(`Object.fromEntries(['.app-root','.app-body','.workspace-surface','.greenfield-workspace','.greenfield-navigation-reason','.greenfield-shell-host','.figma-phase-map-workspace','.figma-phase-map-column','.figma-browser-column','.architect-browser-host','.figma-doc-chat-workspace'].map(s=>{const e=document.querySelector(s),r=e?.getBoundingClientRect(),c=e&&getComputedStyle(e);return[s,r?{x:r.x,y:r.y,height:r.height,width:r.width,bottom:r.bottom,display:c.display,overflowY:c.overflowY,className:e.className}:null]}))`);
 const near=(a,b)=>assert.ok(Math.abs(a-b)<1,`${a} != ${b}`);
 const check=async(name,height=1000,map=true)=>{height=win.getContentSize()[1];const r=await measure();receipt[name]=r;near(r['.app-body'].bottom,height);near(r['.workspace-surface'].bottom,height);near(r['.greenfield-workspace'].bottom,height);near(r['.greenfield-shell-host'].bottom,height);near(r['.greenfield-shell-host'].y,r['.greenfield-navigation-reason'].bottom);assert.ok(r['.greenfield-shell-host'].height>400);assert.ok(r['.figma-browser-column'].height>400);assert.ok(r['.architect-browser-host'].height>300);if(map){near(r['.figma-phase-map-workspace'].bottom,height);assert.ok(r['.figma-phase-map-column'].height>400);near(r['.figma-phase-map-column'].height,r['.figma-browser-column'].height);}
 const b=await win.webContents.executeJavaScript('fixture.bounds()');const h=r['.architect-browser-host'];near(b.height,Math.round(h.height));near(b.y,Math.round(h.y));native.setBounds({x:b.x,y:b.y,width:b.width,height:b.height});return r;};
 try{
  // Measure immediately so asynchronous App/runtime responses cannot restore the class first.
  await win.webContents.executeJavaScript(`document.querySelector('.workspace-surface').classList.remove('greenfield-workflow-surface')`);receipt.baseline=await measure();
  await win.webContents.executeJavaScript(`document.querySelector('.workspace-surface').classList.add('greenfield-workflow-surface')`);await wait();
  await check('empty');await native.webContents.executeJavaScript('document.querySelector("button").click()');assert.equal(await native.webContents.executeJavaScript('document.querySelector("button").textContent'),'Clicked');receipt.nativeSyntheticInteraction='passed';
  await win.webContents.executeJavaScript('fixture.generate()');await wait();await check('generated');near(receipt.empty['.greenfield-shell-host'].height,receipt.generated['.greenfield-shell-host'].height);
  win.setContentSize(1440,850);await wait();await check('resized',850);assert.ok(receipt.resized['.architect-browser-host'].height<receipt.generated['.architect-browser-host'].height);
  win.setContentSize(1440,1000);await wait();
  await win.webContents.executeJavaScript(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Project Planning')).click()`);await wait();await check('completedPlanningInspection',1000,false);assert.equal(await win.webContents.executeJavaScript(`document.querySelector('.greenfield-shell-host').dataset.inspection`),'true');
  for(const state of ['before','prepared','running','failed','completed']) {
   await win.webContents.executeJavaScript(`fixture.implement('${state}')`);await wait();
   const geometry=await win.webContents.executeJavaScript(`(() => {
    const rect=s=>{const e=document.querySelector(s),r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right}};
    return {host:rect('.greenfield-shell-content'),workspace:rect('.work-card-building-workspace'),context:rect('.work-card-building-context'),console:rect('.codex-execution-panel'),footer:rect('.work-card-implement-footer'),text:document.querySelector('.work-card-building-workspace').textContent,modelLocked:document.querySelector('select[aria-label="Model"]').disabled,reasoningLocked:document.querySelector('select[aria-label="Reasoning"]').disabled,implementDisabled:Array.from(document.querySelector('.work-card-building-workspace').querySelectorAll('button.codex-command')).find(b=>b.textContent==='Implement').disabled,report:!!document.querySelector('.work-card-implement-report,article[aria-label="Implementer Report"]')};
   })()`);
   receipt['implement-'+state]=geometry;
   near(geometry.context.y,geometry.console.y);near(geometry.context.height,geometry.console.height);
   assert.ok(geometry.context.height>400);assert.ok(geometry.console.x>geometry.context.right);
   assert.ok(geometry.footer.height<60);assert.ok(geometry.footer.y>=geometry.context.bottom);
   near(geometry.footer.bottom,geometry.workspace.bottom);near(geometry.workspace.bottom,geometry.host.bottom-14);
   assert.equal(geometry.report,false);assert.doesNotMatch(geometry.text,/Create Implementer Report|Full SQL report must not render/);
   assert.equal(geometry.implementDisabled,state==='running'||state==='completed');
   assert.equal(geometry.modelLocked,state==='running');assert.equal(geometry.reasoningLocked,state==='running');
   if(state==='running')assert.match(geometry.text,/Cancel Codex Run/);
   if(state==='failed')assert.match(geometry.text,/Checkpoint failed fixture|Checkpoint blocked fixture/);
   const tabs=await win.webContents.executeJavaScript(`Array.from(document.querySelectorAll('[role="tab"]')).map(t=>t.textContent)`);
   assert.deepEqual(tabs,['Implement','Context','Status','Interaction','Diagnostics']);
   for(const tab of ['Context','Diagnostics','Interaction','Status','Implement']) {
    await win.webContents.executeJavaScript(`Array.from(document.querySelectorAll('[role="tab"]')).find(t=>t.textContent==='${tab}').click()`);
    const body=await win.webContents.executeJavaScript(`(() => {const panels=Array.from(document.querySelectorAll('.implement-tab-body'));return {labels:panels.map(p=>p.getAttribute('aria-label')),text:panels.map(p=>p.textContent).join(' '),bounded:panels.every(p=>p.getBoundingClientRect().bottom<=document.querySelector('.work-card-implement-footer').getBoundingClientRect().y)};})()`);
    assert.equal(body.labels.length,2);assert.ok(body.labels.includes(tab));assert.equal(body.bounded,true);
    if(tab==='Diagnostics')assert.match(body.text,/Execution console evidence/);
    if(tab==='Context')assert.match(body.text,/Implementer Report Target/);
   }

  }
  await win.webContents.executeJavaScript("fixture.implement('review')");await wait();
  const reviewGeometry=await win.webContents.executeJavaScript(`(() => {const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {y:r.y,bottom:r.bottom,height:r.height}};return {body:rect('.work-card-report-review-body'),left:rect('.work-card-report-review-workspace'),browser:rect('.architect-browser-host'),actions:rect('.figma-browser-actions-panel'),tabs:Array.from(document.querySelectorAll('.review-workspace-tabs button')).map(b=>b.textContent),text:document.querySelector('.work-card-report-review-body').textContent}})()`);
  receipt.review=reviewGeometry;assert.deepEqual(reviewGeometry.tabs,['Documents','Tester','Criteria','Decision']);assert.ok(reviewGeometry.browser.height>300);assert.ok(reviewGeometry.body.bottom<=reviewGeometry.left.bottom);assert.ok(reviewGeometry.actions.height<150);assert.match(reviewGeometry.text,/Full SQL report/);assert.doesNotMatch(reviewGeometry.text,/Validate Passed|Request Repair/);
  for(const tab of ['Tester','Criteria','Decision','Documents']){
   await win.webContents.executeJavaScript(`Array.from(document.querySelectorAll('.review-workspace-tabs button')).find(b=>b.textContent==='${tab}').click()`);
   const active=await win.webContents.executeJavaScript(`(() => {const body=document.querySelector('.work-card-report-review-body');return {label:body.getAttribute('aria-label'),text:body.textContent,count:document.querySelectorAll('.work-card-report-review-body').length,pass:Array.from(body.querySelectorAll('button')).find(b=>b.textContent==='Validate Passed')?.disabled,repair:Array.from(body.querySelectorAll('button')).find(b=>b.textContent==='Request Repair')?.disabled}})()`);
   assert.equal(active.count,1);assert.equal(active.label,tab);if(tab==='Decision'){assert.equal(active.pass,true);assert.equal(active.repair,true);}else assert.doesNotMatch(active.text,/Validate Passed|Request Repair/);
  }
  await win.webContents.executeJavaScript(`Array.from(document.querySelectorAll('.work-card-report-document-pane button')).find(b=>b.textContent==='Architect Advisory').click()`);assert.match(await win.webContents.executeJavaScript("document.querySelector('.preview-body').textContent"),/SQL advisory/);
  await win.webContents.executeJavaScript('fixture.generic()');await wait();receipt.generic=await measure();assert.equal(receipt.generic['.workspace-surface'].className,'workspace-surface');assert.equal(receipt.generic['.workspace-surface'].display,'flex');assert.equal(receipt.generic['.workspace-surface'].overflowY,'auto');
  fs.writeFileSync(path.join(__dirname,'receipt.json'),JSON.stringify(receipt,null,2));clearTimeout(timeout);app.exit(0);
 }catch(e){console.error(e);fs.writeFileSync(path.join(__dirname,'error.json'),JSON.stringify({error:String(e),receipt},null,2));app.exit(1)}
}).catch(e=>{console.error(e);app.exit(1)});
