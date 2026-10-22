/* Recordatorios privados: 70 días desde el último servicio, sin envíos al cliente. */
(()=>{'use strict';
const panel=document.getElementById('maintenance'),list=document.getElementById('maintenanceList'),status=document.getElementById('maintenanceStatus');
if(!panel)return;
let serial=0;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=v=>String(v||'').split('-').reverse().join('/');
function link(row){let phone=String(row.phone||'').replace(/\D/g,'');if(phone.length===9)phone='34'+phone;else if(phone.startsWith('0034'))phone=phone.slice(2);if(phone.length<9)return '';
 const text='Hola '+row.client_name+' 👋, soy Luis, de LCM Lavado & Detailing. Han pasado unas diez semanas desde el último servicio'+(row.vehicle?' de tu '+row.vehicle:'')+'. ¿Te gustaría que buscáramos una cita para su mantenimiento?';
 return '<a class="smallbtn" style="display:inline-block;color:#efd37c;text-decoration:none;border:1px solid #927944" target="_blank" rel="noopener" href="https://wa.me/'+phone+'?text='+encodeURIComponent(text)+'">Preparar WhatsApp</a>';
}
async function load(){if(document.getElementById('app').classList.contains('hidden'))return;
 const request=++serial;status.textContent='Consultando mantenimientos…';
 try{const {data,error}=await window.LCM_DB.client.rpc('lcm_maintenance_due');if(error)throw error;if(request!==serial)return;
 const rows=data||[];status.textContent=rows.length?rows.length+' cliente'+(rows.length===1?'':'s')+' para contactar.':'No hay mantenimientos pendientes.';
 list.innerHTML=rows.map(row=>'<article class="item"><b>'+esc(row.client_name)+'</b><p>'+esc(row.vehicle||'Vehículo por confirmar')+'<br><small>Último servicio: '+esc(date(row.last_service))+' · Mantenimiento desde '+esc(date(row.due_on))+'</small></p>'+link(row)+'</article>').join('');
 if(location.hash==='#maintenance'){window.LCM_UI?.show('home');panel.scrollIntoView({behavior:'smooth',block:'start'})}
 }catch(e){if(request!==serial)return;list.replaceChildren();status.textContent='No se pudieron consultar los mantenimientos. Pulsa Actualizar.'}
}
document.getElementById('maintenanceReload').onclick=load;
window.addEventListener('lcm-authenticated',load);window.addEventListener('lcm-records-changed',load);window.addEventListener('lcm-data-refresh',load);window.addEventListener('hashchange',()=>{if(location.hash==='#maintenance')load()});
window.addEventListener('focus',load);
if(!document.getElementById('app').classList.contains('hidden'))load();
})();
