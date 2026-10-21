const {JSDOM}=require('jsdom'),fs=require('node:fs'),assert=require('node:assert/strict');
const root=require('node:path').resolve(__dirname,'..')+'/';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function setup({fail=false}={}){
 const dom=new JSDOM(fs.readFileSync(root+'reservar.html','utf8'),{url:'https://lcmautodetail.github.io/lcm-lavado-detailing/reservar.html?servicio=Interior%20completo',runScripts:'outside-only'}),w=dom.window,requests=[],pages=[];
 w.console.error=error=>{if(!fail)throw error};w.LCM_BOOKING_TIMEOUT=0;w.alert=message=>{throw Error(message)};
 w.LCM_DB={configured:true,services:async()=>{if(fail)throw Error('Simulated offline');return [{name:'Interior básico'},{name:'Interior completo'}]},slots:async()=>[{slot_time:'10:00',available:true}],request:async payload=>{requests.push(payload)},client:{from(){const q={select(){return q},order(){return q},range(a){pages.push(a);return Promise.resolve({data:a===0?Array.from({length:1000},(_,i)=>({brand:'Marca '+i,model:'Modelo',size:'Compacto'})):[{brand:'Volvo',model:'XC60',size:'SUV / Familiar'}]})}};return q},rpc:async()=>({data:[{vehicle_size:'SUV / Familiar',quoted_price:115,needs_review:false}]})}};
 w.eval(fs.readFileSync(root+'reservas-online.js','utf8'));await wait(50);return {dom,w,requests,pages,$:id=>w.document.getElementById(id)};
}
(async()=>{
 let h=await setup();const {$,w}=h;
 assert.equal(w.document.querySelector('label[for="servicio"]').textContent,'Servicio','The service label must not be overwritten');assert.match(w.document.querySelector('label[for="tamano"]').textContent,/Categoría/);
 assert.equal($('servicio').value,'Interior completo');assert.equal($('resServicio').textContent,'Interior completo');assert.equal($('form').querySelector('button[type="submit"]').disabled,false);assert.deepEqual(h.pages,[0,1000],'Complete model catalog is loaded');assert.equal(h.requests.length,0,'Opening/quoting must not create bookings');
 $('marca').value='Volvo';$('marca').dispatchEvent(new w.Event('input',{bubbles:true}));$('modelo').value='XC60';$('modelo').dispatchEvent(new w.Event('input',{bubbles:true}));await wait(300);assert.equal($('tamano').value,'SUV / Familiar');assert.match($('resPrecio').textContent,/115/);assert.equal($('resVehiculo').textContent,'Volvo XC60');
 $('fecha').value='2026-11-20';$('fecha').dispatchEvent(new w.Event('change',{bubbles:true}));await wait(10);$('franja').value='10:00';$('franja').dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal($('resFranja').textContent,'10:00');assert.equal($('resFecha').textContent,'20/11/2026');
 $('nombre').value='Cliente de prueba';$('telefono').value='600123456';$('consentimiento').checked=true;$('form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await wait(10);assert.equal(h.requests.length,1);assert.equal(h.requests[0].booking_time,'10:00');assert.equal(h.requests[0].service_name,'Interior completo');assert.match($('form').textContent,/Solicitud recibida/);assert.match($('form').textContent,/pendiente/);h.dom.window.close();
 h=await setup({fail:true});assert.equal(h.$('form').querySelector('button[type="submit"]').disabled,true);assert.match(h.$('form').querySelector('.note').textContent,/WhatsApp/);assert.equal(h.requests.length,0);h.dom.window.close();
 console.log('PASS: service labels/preset, read-only opening/quote, catalog pagination, model category, price and summary, slots, request payload and success, offline submit protection.');
})().catch(e=>{console.error(e);process.exitCode=1});
