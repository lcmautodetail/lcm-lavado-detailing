const {JSDOM}=require('jsdom'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
(async()=>{
 const dom=new JSDOM(fs.readFileSync(root+'/gestion.html','utf8'),{url:'https://lcmautodetail.github.io/lcm-lavado-detailing/gestion.html',runScripts:'outside-only'}),w=dom.window;
 let calls=0,fail=false;w.LCM_DB={client:{rpc:async name=>{assert.equal(name,'lcm_maintenance_due');calls++;return fail?{error:Error('offline')}:{data:[{client_name:'Luis <script>danger</script>',phone:'+34 600 123 456',vehicle:'Volvo XC60',last_service:'2026-08-23',due_on:'2026-10-22'}]}}}};
 w.eval(fs.readFileSync(root+'/gestion-maintenance.js','utf8'));assert.equal(calls,0,'No private queries before login');
 w.document.getElementById('app').classList.remove('hidden');w.dispatchEvent(new w.Event('lcm-authenticated'));await new Promise(r=>setImmediate(r));
 assert.match(w.document.getElementById('maintenanceStatus').textContent,/1 cliente/);assert.equal(w.document.querySelector('#maintenance script'),null);
 const link=w.document.querySelector('#maintenanceList a'),url=new URL(link.href);assert.equal(url.pathname,'/34600123456');assert.match(url.searchParams.get('text'),/mantenimiento/);assert.equal(link.target,'_blank');
 fail=true;w.document.getElementById('maintenanceReload').click();await new Promise(r=>setImmediate(r));assert.match(w.document.getElementById('maintenanceStatus').textContent,/No se pudieron/);assert.equal(w.document.getElementById('maintenanceList').children.length,0);w.close();
 const handlers={},notices=[],navigated=[];const ctx={URL,Promise,caches:{keys:async()=>[]},self:{location:{href:'https://lcmautodetail.github.io/lcm-lavado-detailing/gestion-sw.js'},addEventListener:(n,f)=>handlers[n]=f,registration:{showNotification:async(t,o)=>notices.push(o)},clients:{matchAll:async()=>[{url:'https://lcmautodetail.github.io/lcm-lavado-detailing/gestion.html',navigate:async u=>navigated.push(u),focus:async()=>{}}]}}};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(root+'/gestion-sw.js','utf8'),ctx);let task;
 handlers.push({data:{json:()=>({url:'./gestion.html#maintenance'})},waitUntil:p=>task=p});await task;assert.equal(notices[0].data.url,'./gestion.html#maintenance');
 handlers.notificationclick({notification:{data:{url:'./gestion.html#maintenance'},close(){}},waitUntil:p=>task=p});await task;assert.equal(navigated[0],'https://lcmautodetail.github.io/lcm-lavado-detailing/gestion.html#maintenance');
 handlers.notificationclick({notification:{data:{url:'https://evil.test/'},close(){}},waitUntil:p=>task=p});await task;assert.equal(navigated[1],'https://lcmautodetail.github.io/lcm-lavado-detailing/gestion.html');
 console.log('PASS: authenticated read-only reminders, escaped client details, WhatsApp draft, offline recovery, notification deep link and same-origin protection.');
})().catch(e=>{console.error(e);process.exitCode=1});
