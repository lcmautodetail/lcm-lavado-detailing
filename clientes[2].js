// LCM Gestión · Clientes y vehículos: lectura y edición (solo administradores autorizados por RLS).
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(n)||0);
let clients=[],vehicles=[],jobs=[],selected=null,loaded=false;
const msg=s=>{$('clientMessage').textContent=s};
const norm=s=>String(s||'').replace(/\D/g,'');
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
  msg(`${clients.length} clientes · ${vehicles.length} vehículos · ${jobs.length} trabajos`);render();
 }catch(e){msg('No se pudieron cargar los datos: '+e.message)}
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
 el.innerHTML=`<div class="sectiontitle"><h3>${esc(c.name)} · ficha de cliente</h3><button id="closeClient" type="button">Cerrar ficha</button></div><p>Teléfono: <a href="tel:${esc(c.phone.replace(/[^+0-9]/g,''))}">${esc(c.phone)}</a></p><p class="actions"><button type="button" id="editClient">Editar cliente</button><button type="button" id="addVehicleForClient">+ Vehículo</button></p><h4>Vehículos</h4><div>${vs.map(v=>`<p>${esc(v.vehicle)}${plate(v)} <button type="button" data-edit-vehicle="${esc(v.id)}">Editar</button></p>`).join('')||'Sin vehículos'}</div><h4>Historial de servicios (${js.length})</h4><div class="tablewrap"><table><thead><tr><th>Fecha</th><th>Vehículo</th><th>Servicio</th><th>Estado</th><th>Precio original</th><th>Cobro registrado</th></tr></thead><tbody>${js.map(j=>{
 const v=vs.find(v=>v.id===j.vehicle_id);
 return `<tr><td>${esc(String(j.appointment_at).replace('T',' ').slice(0,16))}</td><td>${esc(v?.vehicle||'—')}</td><td>${esc(j.service)}${j.is_internal?' <span class="history-internal">(interno)</span>':''}</td><td>${esc(j.original_status)}<br><small class="muted">${esc(j.original_payment_status)}</small></td><td>${money(j.original_price)}</td><td>${j.is_internal?'0 € · interno':money(j.real_income)}</td></tr>`;
 }).join('')||'<tr><td colspan="6">Sin trabajos</td></tr>'}</tbody></table></div><p class="muted">El historial importado no genera ingresos nuevos.</p>`;
 $('closeClient').onclick=()=>{selected=null;el.style.display='none'};
 $('editClient').onclick=()=>openClient(c);
 $('addVehicleForClient').onclick=()=>openVehicle(null,c.id);
 el.querySelectorAll('[data-edit-vehicle]').forEach(b=>b.onclick=()=>openVehicle(vehicles.find(v=>v.id===b.dataset.editVehicle)));
}
function openClient(c=null){
 $('vehicleEditor').style.display='none';$('clientEditor').style.display='block';
 $('clientEditorTitle').textContent=c?'Editar cliente':'Nuevo cliente';$('clientEditId').value=c?.id||'';
 $('clientEditName').value=c?.name||'';$('clientEditPhone').value=c?.phone||'';
 $('clientEditor').scrollIntoView({behavior:'smooth',block:'nearest'});
}
function openVehicle(v=null,clientId=null){
 $('clientEditor').style.display='none';$('vehicleEditor').style.display='block';
 $('vehicleEditorTitle').textContent=v?'Editar vehículo':'Nuevo vehículo';$('vehicleEditId').value=v?.id||'';
 $('vehicleClient').innerHTML='<option value="">Selecciona un cliente</option>'+clients.map(c=>`<option value="${esc(c.id)}">${esc(c.name)} · ${esc(c.phone)}</option>`).join('');
 $('vehicleClient').value=v?.client_id||clientId||selected||'';
 $('vehicleEditName').value=v?.vehicle||'';$('vehicleEditPlate').value=v?.plate||'';
 $('vehicleEditor').scrollIntoView({behavior:'smooth',block:'nearest'});
}
$('clientSearch')?.addEventListener('input',()=>{if(loaded)render()});
$('clientReload')?.addEventListener('click',load);
$('clientNew')?.addEventListener('click',()=>openClient());
$('vehicleNew')?.addEventListener('click',()=>{if(!clients.length){msg('Primero crea un cliente.');return}openVehicle()});
$('clientCancel')?.addEventListener('click',()=>{$('clientEditor').style.display='none'});
$('vehicleCancel')?.addEventListener('click',()=>{$('vehicleEditor').style.display='none'});
$('clientForm')?.addEventListener('submit',async e=>{
 e.preventDefault();const id=$('clientEditId').value,name=$('clientEditName').value.trim(),phone=$('clientEditPhone').value.trim();
 if(!name||!phone)return;
 if(clients.some(c=>c.id!==id&&norm(c.phone)&&norm(c.phone)===norm(phone))){msg('Ya existe un cliente con ese teléfono. Abre su ficha para editarlo.');return}
 const db=window.LCM_DB.client;
 try{
  const r=id?await db.from('lcm_clients').update({name,phone}).eq('id',id).select('id').single():await db.from('lcm_clients').insert({name,phone}).select('id').single();
  if(r.error)throw r.error;selected=r.data.id;$('clientEditor').style.display='none';await load();msg('Cliente guardado correctamente.');
 }catch(err){msg('No se pudo guardar el cliente: '+err.message)}
});
$('vehicleForm')?.addEventListener('submit',async e=>{
 e.preventDefault();const id=$('vehicleEditId').value,client_id=$('vehicleClient').value,vehicle=$('vehicleEditName').value.trim(),plate=$('vehicleEditPlate').value.trim();
 if(!client_id||!vehicle)return;
 const normalized=plate.toUpperCase().replace(/[^A-Z0-9]/g,'');
 if(normalized&&vehicles.some(v=>v.id!==id&&v.plate?.toUpperCase().replace(/[^A-Z0-9]/g,'')===normalized)){msg('Ya hay un vehículo con esa matrícula. Edita el existente.');return}
 try{
  const db=window.LCM_DB.client;
  const r=id?await db.from('lcm_vehicles').update({client_id,vehicle,plate}).eq('id',id).select('id').single():await db.from('lcm_vehicles').insert({client_id,vehicle,plate}).select('id').single();
  if(r.error)throw r.error;selected=client_id;$('vehicleEditor').style.display='none';await load();msg('Vehículo guardado correctamente.');
 }catch(err){msg('No se pudo guardar el vehículo: '+err.message)}
});
const observer=new MutationObserver(()=>{if($('app')?.style.display==='block'&&!loaded)load();if($('app')?.style.display==='none'){$('clientDetail').style.display='none';$('clientEditor').style.display='none';$('vehicleEditor').style.display='none';selected=null;loaded=false}});
if($('app'))observer.observe($('app'),{attributes:true,attributeFilter:['style']});
if($('app')?.style.display==='block')load();
})();
