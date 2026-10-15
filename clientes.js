// LCM Gestión: vista privada de clientes e historial (solo lectura).
// No crea ni modifica reservas ni movimientos económicos.
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(n)||0);
let clients=[],vehicles=[],jobs=[],selected=null,loaded=false;
const msg=s=>{$('clientMessage').textContent=s};
async function load(){
 if(!$('app')||$('app').style.display==='none')return;
 msg('Cargando clientes…');
 try{
  const db=window.LCM_DB?.client;if(!db)throw Error('Conexión no disponible');
  const [c,v,j]=await Promise.all([
   db.from('lcm_clients').select('id,name,phone').order('name'),
   db.from('lcm_vehicles').select('id,client_id,vehicle,plate').order('vehicle'),
   db.from('lcm_job_history').select('import_key,client_id,vehicle_id,service,appointment_at,original_price,real_income,original_status,original_payment_status,is_internal,notes').order('appointment_at',{ascending:false})
  ]);
  for(const r of [c,v,j])if(r.error)throw r.error;
  clients=c.data||[];vehicles=v.data||[];jobs=j.data||[];loaded=true;
  msg(`${clients.length} clientes · ${vehicles.length} vehículos · ${jobs.length} trabajos importados`);render();
 }catch(e){msg('No se pudo cargar el historial: '+e.message)}
}
function render(){
 const q=$('clientSearch').value.toLocaleLowerCase('es').trim();
 const list=clients.filter(c=>[c.name,c.phone,...vehicles.filter(v=>v.client_id===c.id).flatMap(v=>[v.vehicle,v.plate])].join(' ').toLocaleLowerCase('es').includes(q));
 $('clientList').innerHTML=list.map(c=>{
  const vs=vehicles.filter(v=>v.client_id===c.id),js=jobs.filter(j=>j.client_id===c.id);
  return `<div class="client-tile"><button type="button" data-client="${esc(c.id)}"><b>${esc(c.name)}</b><small>${esc(c.phone)} · ${vs.length} vehículo(s) · ${js.length} trabajo(s)</small><small>${esc(vs.map(v=>v.vehicle).join(', ')||'Sin vehículos')}</small></button></div>`;
 }).join('')||'<p class="muted">No hay clientes que coincidan con la búsqueda.</p>';
 $('clientList').querySelectorAll('[data-client]').forEach(b=>b.onclick=()=>{selected=b.dataset.client;detail();});
 if(selected)detail();
}
function detail(){
 const c=clients.find(x=>x.id===selected),el=$('clientDetail');
 if(!c){el.style.display='none';return}
 const vs=vehicles.filter(v=>v.client_id===c.id),js=jobs.filter(j=>j.client_id===c.id);
 const plate=v=>v.plate?' · '+esc(v.plate):'';
 el.style.display='block';
 el.innerHTML=`<div class="sectiontitle"><h3>${esc(c.name)} · ficha de cliente</h3><button id="closeClient" type="button">Cerrar ficha</button></div><p>Teléfono: <a href="tel:${esc(c.phone.replace(/[^+0-9]/g,''))}">${esc(c.phone)}</a></p><h4>Vehículos</h4><p>${vs.map(v=>esc(v.vehicle)+plate(v)).join(' · ')||'Sin vehículos'}</p><h4>Historial de servicios (${js.length})</h4><div class="tablewrap"><table><thead><tr><th>Fecha</th><th>Vehículo</th><th>Servicio</th><th>Estado</th><th>Precio original</th><th>Cobro registrado</th></tr></thead><tbody>${js.map(j=>{
 const v=vs.find(v=>v.id===j.vehicle_id);
 return `<tr><td>${esc(String(j.appointment_at).replace('T',' ').slice(0,16))}</td><td>${esc(v?.vehicle||'—')}</td><td>${esc(j.service)}${j.is_internal?' <span class="history-internal">(interno)</span>':''}</td><td>${esc(j.original_status)}<br><small class="muted">${esc(j.original_payment_status)}</small></td><td>${money(j.original_price)}</td><td>${j.is_internal?'0 € · interno':money(j.real_income)}</td></tr>`;
 }).join('')||'<tr><td colspan="6">Sin trabajos</td></tr>'}</tbody></table></div><p class="muted">Datos históricos importados: no representan ingresos nuevos ni actualizan el estado de las reservas actuales.</p>`;
 $('closeClient').onclick=()=>{selected=null;el.style.display='none'};
}
$('clientSearch')?.addEventListener('input',()=>{if(loaded)render()});
$('clientReload')?.addEventListener('click',load);
// Esperar a que el panel privado haya validado la sesión de administrador.
const observer=new MutationObserver(()=>{if($('app')?.style.display==='block'&&!loaded)load();if($('app')?.style.display==='none'){$('clientDetail').style.display='none';selected=null;loaded=false}});
if($('app'))observer.observe($('app'),{attributes:true,attributeFilter:['style']});
if($('app')?.style.display==='block')load();
})();
