const {app,BrowserWindow,WebContentsView}=require('electron'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const receipt={};const timeout=setTimeout(()=>{console.error('geometry timeout');app.exit(2)},20000);
app.whenReady().then(async()=>{
 const win=new BrowserWindow({width:1440,height:1000,useContentSize:true,show:false});const native=new WebContentsView();win.contentView.addChildView(native);await native.webContents.loadURL('data:text/html,<button onclick="this.textContent=\'Clicked\'">Native fixture</button>');
 win.webContents.on('console-message',(_,level,message)=>{if(level>=2)console.log(message)});await win.loadFile(path.join(__dirname,'geometry.html'));
 const wait=()=>new Promise(r=>setTimeout(r,500));await wait();
 const measure=()=>win.webContents.executeJavaScript(`Object.fromEntries(['.app-root','.app-body','.workspace-surface','.greenfield-workspace','.greenfield-navigation-reason','.greenfield-shell-host','.figma-phase-map-workspace','.figma-phase-map-column','.figma-browser-column','.architect-browser-host','.figma-doc-chat-workspace'].map(s=>{const e=document.querySelector(s),r=e?.getBoundingClientRect(),c=e&&getComputedStyle(e);return[s,r?{x:r.x,y:r.y,height:r.height,width:r.width,bottom:r.bottom,display:c.display,overflowY:c.overflowY,className:e.className}:null]}))`);
 const near=(a,b)=>assert.ok(Math.abs(a-b)<1,`${a} != ${b}`);
 const check=async(name,height=1000,map=true)=>{const r=await measure();receipt[name]=r;near(r['.app-body'].bottom,height);near(r['.workspace-surface'].bottom,height);near(r['.greenfield-workspace'].bottom,height);near(r['.greenfield-shell-host'].bottom,height);near(r['.greenfield-shell-host'].y,r['.greenfield-navigation-reason'].bottom);assert.ok(r['.greenfield-shell-host'].height>400);assert.ok(r['.figma-browser-column'].height>400);assert.ok(r['.architect-browser-host'].height>300);if(map){near(r['.figma-phase-map-workspace'].bottom,height);assert.ok(r['.figma-phase-map-column'].height>400);near(r['.figma-phase-map-column'].height,r['.figma-browser-column'].height);}
 const b=await win.webContents.executeJavaScript('fixture.bounds()');const h=r['.architect-browser-host'];near(b.height,Math.round(h.height));near(b.y,Math.round(h.y));native.setBounds({x:b.x,y:b.y,width:b.width,height:b.height});return r;};
 try{
  await win.webContents.executeJavaScript(`document.querySelector('.workspace-surface').classList.remove('greenfield-workflow-surface')`);await wait();receipt.baseline=await measure();
  await win.webContents.executeJavaScript(`document.querySelector('.workspace-surface').classList.add('greenfield-workflow-surface')`);await wait();
  await check('empty');await native.webContents.executeJavaScript('document.querySelector("button").click()');assert.equal(await native.webContents.executeJavaScript('document.querySelector("button").textContent'),'Clicked');receipt.nativeSyntheticInteraction='passed';
  await win.webContents.executeJavaScript('fixture.generate()');await wait();await check('generated');near(receipt.empty['.greenfield-shell-host'].height,receipt.generated['.greenfield-shell-host'].height);
  win.setContentSize(1440,850);await wait();await check('resized',850);assert.ok(receipt.resized['.architect-browser-host'].height<receipt.generated['.architect-browser-host'].height);
  win.setContentSize(1440,1000);await wait();
  await win.webContents.executeJavaScript(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Project Planning')).click()`);await wait();await check('completedPlanningInspection',1000,false);assert.equal(await win.webContents.executeJavaScript(`document.querySelector('.greenfield-shell-host').dataset.inspection`),'true');
  await win.webContents.executeJavaScript('fixture.generic()');await wait();receipt.generic=await measure();assert.equal(receipt.generic['.workspace-surface'].className,'workspace-surface');assert.equal(receipt.generic['.workspace-surface'].display,'flex');assert.equal(receipt.generic['.workspace-surface'].overflowY,'auto');
  fs.writeFileSync(path.join(__dirname,'receipt.json'),JSON.stringify(receipt,null,2));clearTimeout(timeout);app.exit(0);
 }catch(e){console.error(e);fs.writeFileSync(path.join(__dirname,'error.json'),JSON.stringify({error:String(e),receipt},null,2));app.exit(1)}
}).catch(e=>{console.error(e);app.exit(1)});
