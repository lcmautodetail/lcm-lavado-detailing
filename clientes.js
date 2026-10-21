// LCM Gestión · Clientes y vehículos: lectura y edición (solo administradores autorizados por RLS).
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(n)||0);
let clients=[],vehicles=[],jobs=[],selected=null,loaded=false,orders=[],bookings=[],manual=[],loadSerial=0,manualBusy=false,manualRequest=null;
const msg=s=>{$('clientMessage').textContent=s};
const norm=s=>String(s||'').replace(/\D/g,'');
async function allRows(query){
 const rows=[];for(let offset=0;;offset+=1000){const r=await query().range(offset,offset+999);if(r.error)throw r.error;rows.push(...(r.data||[]));if(!r.data||r.data.length<1000)return rows}
}
async function load(){
 if(!$('app')||$('app').style.display==='none')return;
 const serial=++loadSerial;
 msg('Cargando clientes…');
 try{
  const db=window.LCM_DB?.client;if(!db)throw Error('Conexión no disponible');
  const [c,v,j,o,b,m]=await Promise.all([
   allRows(()=>db.from('lcm_clients').select('id,name,phone').order('name').order('id')),
   allRows(()=>db.from('lcm_vehicles').select('id,client_id,vehicle,plate').order('vehicle').order('id')),
   allRows(()=>db.from('lcm_job_history').select('import_key,client_id,vehicle_id,service,appointment_at,original_price,real_income,original_status,original_payment_status,is_internal,notes').order('appointment_at',{ascending:false}).order('import_key')),
   allRows(()=>db.from('lcm_work_orders').select('id,booking_id,client_id,service,work_date,work_status,payment_status').order('id')),
   allRows(()=>db.from('bookings').select('id,phone,service_name,booking_date,status').order('id')),
   allRows(()=>db.from('lcm_loyalty_manual_stamps').select('id,client_id,stamped_on,note').order('id'))
  ]);
  if(serial!==loadSerial||$('app').style.display==='none')return;
  clients=c;vehicles=v;jobs=j;orders=o;bookings=b;manual=m;loaded=true;
  msg(`${clients.length} clientes · ${vehicles.length} vehículos · ${jobs.length} trabajos`);render();
 }catch(e){if(serial!==loadSerial)return;msg('No se pudieron cargar los datos: '+e.message);if(selected){const warning=$('clientDetail').querySelector('.loyalty-card');if(warning)warning.innerHTML='<p role="alert">No se pudo actualizar la tarjeta. Pulsa Recargar antes de aplicar una bonificación.</p>'}}
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
 el.innerHTML=`<div class="sectiontitle"><h3>${esc(c.name)} · ficha de cliente</h3><button id="closeClient" type="button">Cerrar ficha</button></div><p>Teléfono: <a href="tel:${esc(c.phone.replace(/[^+0-9]/g,''))}">${esc(c.phone)}</a></p><p class="actions"><button type="button" id="editClient">Editar cliente</button><button type="button" id="addVehicleForClient">+ Vehículo</button></p>${window.LCM_LOYALTY.render(window.LCM_LOYALTY.model(c.id,{clients,history:jobs,orders,bookings,manual}))}<h4>Vehículos</h4><div>${vs.map(v=>`<p>${esc(v.vehicle)}${plate(v)} <button type="button" data-edit-vehicle="${esc(v.id)}">Editar</button></p>`).join('')||'Sin vehículos'}</div><h4>Historial de servicios (${js.length})</h4><div class="tablewrap"><table><thead><tr><th>Fecha</th><th>Vehículo</th><th>Servicio</th><th>Estado</th><th>Precio original</th><th>Cobro registrado</th></tr></thead><tbody>${js.map(j=>{
 const v=vs.find(v=>v.id===j.vehicle_id);
 return `<tr><td>${esc(String(j.appointment_at).replace('T',' ').slice(0,16))}</td><td>${esc(v?.vehicle||'—')}</td><td>${esc(j.service)}${j.is_internal?' <span class="history-internal">(interno)</span>':''}</td><td>${esc(j.original_status)}<br><small class="muted">${esc(j.original_payment_status)}</small></td><td>${money(j.original_price)}</td><td>${j.is_internal?'0 € · interno':money(j.real_income)}</td></tr>`;
 }).join('')||'<tr><td colspan="6">Sin trabajos</td></tr>'}</tbody></table></div><p class="muted">El historial importado no genera ingresos nuevos.</p>`;
 const phoneDigits=norm(c.phone);if(phoneDigits){const link=document.createElement('a');link.textContent='WhatsApp';link.href='https://wa.me/'+(phoneDigits.length===9?'34'+phoneDigits:phoneDigits);link.target='_blank';link.rel='noopener';link.className='smallbtn';el.querySelector('.actions').appendChild(link)}
 bindManualStamps(c.id);
 $('closeClient').onclick=()=>{selected=null;el.style.display='none'};
 $('editClient').onclick=()=>openClient(c);
 $('addVehicleForClient').onclick=()=>openVehicle(null,c.id);
 el.querySelectorAll('[data-edit-vehicle]').forEach(b=>b.onclick=()=>openVehicle(vehicles.find(v=>v.id===b.dataset.editVehicle)));
}
function bindManualStamps(clientId){
 const form=$('manualStampForm'),feedback=$('manualStampMessage'),open=$('manualStampOpen');
 const report=s=>{if(selected===clientId)$('manualStampMessage').textContent=s};
 open.disabled=manualBusy;
 open.onclick=()=>{form.hidden=false;open.setAttribute('aria-expanded','true');$('manualStampDate').value=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());$('manualStampDate').focus()};
 $('manualStampCancel').onclick=()=>{form.hidden=true;open.setAttribute('aria-expanded','false');open.focus()};
 form.onsubmit=async e=>{
  e.preventDefault();if(manualBusy)return;
  const stamped_on=$('manualStampDate').value,note=$('manualStampNote').value.trim();
  if(!/^\d{4}-\d{2}-\d{2}$/.test(stamped_on))return report('Selecciona la fecha del mantenimiento.');
  if(note.length>300)return report('La nota debe tener como máximo 300 caracteres.');
  const fingerprint=JSON.stringify([clientId,stamped_on,note]);
  if(manualRequest?.fingerprint!==fingerprint)manualRequest={fingerprint,id:crypto.randomUUID()};
  const payload={id:manualRequest.id,client_id:clientId,stamped_on,note};
  manualBusy=true;const button=form.querySelector('button[type="submit"]');button.disabled=true;open.disabled=true;report('Guardando sello…');
  try{
   const r=await window.LCM_DB.client.from('lcm_loyalty_manual_stamps').upsert(payload,{onConflict:'id',ignoreDuplicates:true});if(r.error)throw r.error;
   manualRequest=null;await load();report('Sello manual guardado.');
  }catch(err){report('No se pudo guardar el sello: '+err.message)}finally{manualBusy=false;button.disabled=false;if(selected===clientId)$('manualStampOpen').disabled=false}
 };
 $('clientDetail').querySelectorAll('[data-remove-stamp]').forEach(button=>button.onclick=async()=>{
  if(manualBusy||!confirm('¿Quitar este sello manual de la tarjeta?'))return;
  manualBusy=true;button.disabled=true;
  try{const r=await window.LCM_DB.client.from('lcm_loyalty_manual_stamps').delete().eq('id',button.dataset.removeStamp).eq('client_id',clientId);if(r.error)throw r.error;await load();report('Sello manual retirado.');}catch(err){report('No se pudo quitar el sello: '+err.message)}finally{manualBusy=false;button.disabled=false;if(selected===clientId)$('manualStampOpen').disabled=false}
 });
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
  if(r.error)throw r.error;selected=r.data.id;$('clientEditor').style.display='none';await load();msg('Cliente guardado correctamente.');window.dispatchEvent(new Event('lcm-records-changed'));
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
  if(r.error)throw r.error;selected=client_id;$('vehicleEditor').style.display='none';await load();msg('Vehículo guardado correctamente.');window.dispatchEvent(new Event('lcm-records-changed'));
 }catch(err){msg('No se pudo guardar el vehículo: '+err.message)}
});
window.addEventListener('lcm-authenticated',load);window.addEventListener('lcm-data-refresh',load);window.addEventListener('lcm-records-changed',load);
window.addEventListener('lcm-view-change',()=>{if(!$('clients')?.classList.contains('hidden'))load()});
const observer=new MutationObserver(()=>{if($('app')?.style.display==='block'&&!loaded)load();if($('app')?.style.display==='none'){$('clientDetail').style.display='none';$('clientEditor').style.display='none';$('vehicleEditor').style.display='none';selected=null;loaded=false;loadSerial++}});
if($('app'))observer.observe($('app'),{attributes:true,attributeFilter:['style']});
if($('app')?.style.display==='block')load();
})();
