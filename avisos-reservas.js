/* LCM: avisos de solicitudes nuevas mientras Gestión permanece abierta.
   No es push en segundo plano: para ello hace falta un servicio de envío seguro. */
(()=>{'use strict';
 const INTERVAL=45000;let known=null,busy=false;
 const $=id=>document.getElementById(id);
 const strip=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 function visible(){return $('app')?.style.display!=='none'&&Boolean(window.LCM_DB?.client)}
 function setup(){const app=$('app');if(!app)return;
 const area=document.createElement('div');area.id='lcmAvisos';area.className='card';area.style.cssText='border-color:#75602b;display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap';
 area.innerHTML='<div><strong>🔔 Avisos de reservas</strong><div id="lcmAvisosEstado" class="muted">Comprobación automática mientras Gestión esté abierta.</div></div><button type="button" id="lcmActivarAvisos">Activar avisos del navegador</button>';
 app.prepend(area);$('lcmActivarAvisos').onclick=async()=>{
 if(!('Notification' in window)){$('lcmAvisosEstado').textContent='Este navegador no admite notificaciones.';return}
 try{const result=await Notification.requestPermission();$('lcmAvisosEstado').textContent=result==='granted'?'Avisos activados mientras Gestión esté abierta.':'Permiso no concedido. Seguirás viendo las solicitudes en Gestión.'}catch(e){$('lcmAvisosEstado').textContent='No se pudo activar el permiso.'}
 };}
 async function check(){if(busy||!visible())return;busy=true;
 try{const list=await window.LCM_DB.adminAppointments();const pending=list.filter(x=>x.status==='pendiente');const ids=new Set(pending.map(x=>String(x.id)));
 if(known!==null){const news=pending.filter(x=>!known.has(String(x.id)));if(news.length){$('lcmAvisosEstado').textContent=`${news.length} nueva(s) solicitud(es) recibida(s).`;
 if('Notification' in window&&Notification.permission==='granted'){
 const n=new Notification('LCM · Nueva reserva online',{body:news.length===1?`${news[0].client_name||'Cliente'} · ${news[0].service_name||'Servicio'} · ${news[0].booking_date||''}`:`${news.length} solicitudes pendientes de revisar`,tag:'lcm-reservas'});n.onclick=()=>{window.focus();$('bookings')?.scrollIntoView({behavior:'smooth'});n.close()};}
 $('refresh')?.click();}
 }else{$('lcmAvisosEstado').textContent=`${pending.length} solicitud(es) pendiente(s). Avisos activos mientras esta página esté abierta.`}
 known=ids;
 }catch(e){if($('lcmAvisosEstado'))$('lcmAvisosEstado').textContent='No se han podido comprobar las reservas. Revisa tu conexión.'}finally{busy=false}}
 document.addEventListener('DOMContentLoaded',()=>{setup();setInterval(check,INTERVAL);setTimeout(check,1500);document.addEventListener('visibilitychange',()=>{if(!document.hidden)check()})});
})();
