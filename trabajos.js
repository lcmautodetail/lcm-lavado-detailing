// Fase 5: registro operativo independiente de economía y de reservas.
(()=>{'use strict';
const $=id=>document.getElementById(id), db=()=>window.LCM_DB?.client;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const euros=x=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(x)||0);
let clients=[],vehicles=[],jobs=[],history=[],loaded=false;
const msg=s=>{$('jobMessage').textContent=s};
let bookingDraft=null;
async function load(){if($('app')?.style.display==='none')return;msg('Cargando trabajos…');try{
 const [c,v,j,h]=await Promise.all([db().from('lcm_clients').select('id,name,phone').order('name'),db().from('lcm_vehicles').select('id,client_id,vehicle,plate').order('vehicle'),db().from('lcm_work_orders').select('*').order('work_date',{ascending:false}).limit(1000),db().from('lcm_job_history').select('import_key,client_id,vehicle_id,service,appointment_at,original_price,real_income,original_status,original_payment_status,is_internal').order('appointment_at',{ascending:false}).limit(1000)]);
 for(const r of [c,v,j,h])if(r.error)throw r.error;clients=c.data||[];vehicles=v.data||[];jobs=j.data||[];history=h.data||[];loaded=true;render();msg(`${jobs.length} trabajos operativos · ${history.length} trabajos históricos importados (solo lectura).`);
 }catch(e){msg('Error al cargar trabajos: '+e.message)}}
function render(){ $('jobRows').innerHTML=jobs.map(j=>{const c=clients.find(x=>x.id===j.client_id),v=vehicles.find(x=>x.id===j.vehicle_id);return `<tr><td>${esc(j.work_date)}</td><td>${esc(c?.name||'—')}<br><small>${esc(v?.vehicle||'—')} ${esc(v?.plate||'')}</small></td><td>${esc(j.service)}</td><td>${esc(j.work_status.replace('_',' '))}</td><td>${j.payment_status==='interno'?'Interno · 0 €':`${esc(j.payment_status)} · ${euros(j.amount_paid)} / ${euros(j.agreed_price)}`}</td><td><button type="button" data-job="${esc(j.id)}">Editar</button>${j.booking_id&&j.work_status==='finalizado'&&j.payment_status!=='interno'&&Number(j.agreed_price)>Number(j.amount_paid)?`<button type="button" class="gold" data-job-collect="${esc(j.id)}">Cobrar</button>`:''}<button type="button" data-job-timer="${esc(j.id)}">Cronómetro</button></td></tr>`}).join('')||'<tr><td colspan="6">Todavía no hay trabajos nuevos.</td></tr>';
 const historyRows=history.map(j=>{const cl=clients.find(x=>x.id===j.client_id),v=vehicles.find(x=>x.id===j.vehicle_id);return `<tr><td>${esc(String(j.appointment_at||'').replace('T',' ').slice(0,16))}</td><td>${esc(cl?.name||'—')}<br><small>${esc(v?.vehicle||'—')}</small></td><td>${esc(j.service)}</td><td>${esc(j.original_status)} · histórico</td><td>${j.is_internal?'Interno · 0 €':`${esc(j.original_payment_status)} · ${euros(j.real_income)} / ${euros(j.original_price)}`}</td><td><small>Importado · solo lectura</small></td></tr>`}).join('');
 if(historyRows){const tbody=$('jobRows');if(!jobs.length)tbody.innerHTML='';tbody.insertAdjacentHTML('beforeend',historyRows)}
 $('jobRows').querySelectorAll('[data-job-timer]').forEach(b=>b.onclick=()=>{const j=jobs.find(x=>x.id===b.dataset.jobTimer),c=clients.find(x=>x.id===j.client_id),v=vehicles.find(x=>x.id===j.vehicle_id);if(window.LCM_TIMER)window.LCM_TIMER.assign({id:j.booking_id||'order-'+j.id,client_name:c?.name||'Cliente',vehicle:v?.vehicle||'Vehículo',service_name:j.service})});
 $('jobRows').querySelectorAll('[data-job]').forEach(b=>b.onclick=()=>edit(jobs.find(j=>j.id===b.dataset.job)));
 $('jobRows').querySelectorAll('[data-job-collect]').forEach(b=>b.onclick=()=>collect(jobs.find(j=>j.id===b.dataset.jobCollect)));
}

async function collect(j){
 if(!j||!j.booking_id)return msg('Este trabajo no tiene reserva vinculada. Registra el cobro manualmente en Economía.');
 const due=Math.max(0,Number(j.agreed_price)-Number(j.amount_paid));if(!due)return msg('Este trabajo no tiene importe pendiente.');
 const raw=prompt('Importe que cobras ahora (€). Pendiente: '+euros(due),due.toFixed(2));if(raw===null)return;
 const paid=Number(raw.trim().replace(',','.'));if(!Number.isFinite(paid)||paid<=0||paid>due+0.001)return msg('Introduce un importe entre 0,01 € y '+euros(due));
 const methodRaw=prompt('Método de cobro: Efectivo, Tarjeta, Bizum, Transferencia u Otro','Efectivo');if(methodRaw===null)return;
 const method=['Efectivo','Tarjeta','Bizum','Transferencia','Otro'].find(x=>x.toLowerCase()===methodRaw.trim().toLowerCase());if(!method)return msg('Método de cobro no válido.');
 if(!confirm('Registrar '+euros(paid)+' de cobro en este trabajo y en Economía?'))return;
 msg('Guardando cobro…');
 try{
  const {data:latest,error:le}=await db().from('lcm_work_orders').select('*').eq('id',j.id).single();if(le)throw le;
  if(latest.payment_status==='interno'||latest.work_status!=='finalizado')throw Error('El trabajo ya no admite este cobro.');
  const remainder=Math.max(0,Number(latest.agreed_price)-Number(latest.amount_paid));if(paid>remainder+0.001)throw Error('El importe pendiente ha cambiado. Actualiza trabajos.');
  const {data:old,error:oe}=await db().from('economic_movements').select('*').eq('source_booking_id',j.booking_id);if(oe)throw oe;
  if(old.length>1)throw Error('Hay varios ingresos vinculados. Revisa Economía.');
  if(old.length&&old[0].kind!=='ingreso')throw Error('Existe un movimiento vinculado que no es un ingreso.');
  const already=Number(latest.amount_paid)||0;
  if(old.length&&Math.abs(Number(old[0].amount)-already)>0.01)throw Error('El ingreso y el trabajo no coinciden. Revisa los registros antes de cobrar.');
  if(!old.length&&already>0)throw Error('Este trabajo tiene cobros sin ingreso vinculado. Revisa Economía.');
  if(old.length&&already>0&&old[0].payment_method!==method)throw Error('El cobro anterior tiene otra forma de pago. Registra este pago por separado en Economía.');
  const total=Number((already+paid).toFixed(2));
  const now=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const client=clients.find(c=>c.id===j.client_id);
  const movement=old.length?{amount:total}:{source_booking_id:j.booking_id,kind:'ingreso',movement_date:now,concept:('Cobro · '+j.service).slice(0,180),client_name:(client?.name||'').slice(0,120),amount:total,payment_method:method,document_status:'pendiente'};
  const result=old.length?await db().from('economic_movements').update(movement).eq('id',old[0].id):await db().from('economic_movements').insert(movement);
  if(result.error)throw result.error;
  const updated=await db().from('lcm_work_orders').update({amount_paid:total,payment_status:'pagado'}).eq('id',j.id).eq('amount_paid',already).select('id');
  if(updated.error)throw updated.error;if(!updated.data?.length)throw Error('El trabajo cambió mientras se guardaba el cobro. Comprueba Economía y actualiza antes de repetir.');
  await load();window.dispatchEvent(new Event('lcm-data-refresh'));msg('Cobro de '+euros(paid)+' registrado en Trabajo y Economía.');
 }catch(e){msg('No se pudo completar el cobro: '+e.message+' Si se produjo un error, revisa Economía antes de repetir.');}
}
function clientOptions(id){$('jobClient').innerHTML='<option value="">Selecciona cliente</option>'+clients.map(c=>`<option value="${esc(c.id)}">${esc(c.name)} · ${esc(c.phone)}</option>`).join('');$('jobClient').value=id||'';vehicleOptions();}
function vehicleOptions(chosen){const id=$('jobClient').value;$('jobVehicle').innerHTML='<option value="">Selecciona vehículo</option>'+vehicles.filter(v=>v.client_id===id).map(v=>`<option value="${esc(v.id)}">${esc(v.vehicle)} · ${esc(v.plate||'sin matrícula')}</option>`).join('');$('jobVehicle').value=chosen||'';}
function edit(j){if(!loaded)return;bookingDraft=null; $('jobEditor').style.display='block';$('jobId').value=j?.id||'';$('jobBookingId').value=j?.booking_id||'';clientOptions(j?.client_id);vehicleOptions(j?.vehicle_id);$('jobDate').value=j?.work_date||new Date().toLocaleDateString('en-CA');$('jobService').value=j?.service||'';$('jobStatus').value=j?.work_status||'pendiente';$('jobPayment').value=j?.payment_status||'pendiente';$('jobPrice').value=j?.agreed_price??0;$('jobPaid').value=j?.amount_paid??0;$('jobNotes').value=j?.notes||'';$('jobEditor').scrollIntoView({behavior:'smooth',block:'nearest'});}
// Una reserva solo se vincula tras elegir explícitamente cliente y vehículo.
window.LCM_openBookingAsJob=async function(b){
 if(!loaded)await load();if(!loaded)return msg('No se pudieron cargar los datos.');
 const previous=jobs.find(j=>j.booking_id===b.id);
 if(previous){edit(previous);msg('Esta cita ya tiene un trabajo registrado. Puedes editarlo.');return;}
 edit(null);bookingDraft=b;$('jobBookingId').value=b.id;
 $('jobDate').value=b.booking_date||'';$('jobService').value=b.service_name||'';
 $('jobPrice').value=Number(b.quoted_price)||0;$('jobPaid').value=0;
 $('jobStatus').value=b.status==='completada'?'finalizado':'pendiente';
 $('jobPayment').value='pendiente';$('jobNotes').value=b.notes||'';
 const digits=x=>String(x||'').replace(/\D/g,'');
 const matched=clients.filter(c=>digits(c.phone)&&digits(c.phone)===digits(b.phone));
 if(matched.length===1){clientOptions(matched[0].id);
   const vs=vehicles.filter(v=>v.client_id===matched[0].id);
   const norm=x=>String(x||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
   const plate=b.plate?vs.filter(v=>norm(v.plate)&&norm(v.plate)===norm(b.plate)):[];
   if(plate.length===1)vehicleOptions(plate[0].id);
   else if(vs.length===1)vehicleOptions(vs[0].id);
 }
 $('jobsSection').scrollIntoView({behavior:'smooth',block:'start'});
 msg('Reserva cargada. Comprueba el cliente y el vehículo antes de guardar. No se generará un ingreso contable.');
};
$('jobClient')?.addEventListener('change',()=>vehicleOptions());
$('jobNew')?.addEventListener('click',()=>{if(!loaded)return msg('Espera a que carguen los clientes.');edit(null)});
$('jobReload')?.addEventListener('click',load);
$('jobCancel')?.addEventListener('click',()=>{$('jobEditor').style.display='none';bookingDraft=null;});
$('jobPayment')?.addEventListener('change',()=>{if($('jobPayment').value==='interno'){$('jobPrice').value=0;$('jobPaid').value=0}});
$('jobForm')?.addEventListener('submit',async e=>{e.preventDefault();const id=$('jobId').value,client_id=$('jobClient').value,vehicle_id=$('jobVehicle').value;
 if(!vehicles.some(v=>v.id===vehicle_id&&v.client_id===client_id))return msg('El vehículo no corresponde al cliente seleccionado.');
 const payment_status=$('jobPayment').value,agreed_price=Number($('jobPrice').value),amount_paid=Number($('jobPaid').value);
 if(!Number.isFinite(agreed_price)||!Number.isFinite(amount_paid)||agreed_price<0||amount_paid<0)return msg('Introduce importes válidos.');
 if(payment_status==='interno'&&(agreed_price!==0||amount_paid!==0))return msg('Los trabajos internos deben tener importes de 0 €.');
 if(payment_status==='pendiente'&&amount_paid>0)return msg('Si existe un cobro parcial, utiliza pagado y deja constancia en observaciones.');
 if(payment_status==='pagado'&&amount_paid<=0)return msg('Indica el importe realmente cobrado.');
 const booking_id=$('jobBookingId').value||null;
 if(booking_id&&jobs.some(j=>j.booking_id===booking_id&&j.id!==id))return msg('Esta reserva ya tiene un trabajo vinculado. Abre el existente para editarlo.');
 const payload={booking_id,client_id,vehicle_id,work_date:$('jobDate').value,service:$('jobService').value.trim(),work_status:$('jobStatus').value,payment_status,agreed_price,amount_paid,notes:$('jobNotes').value.trim()};
 try{const r=id?await db().from('lcm_work_orders').update(payload).eq('id',id):await db().from('lcm_work_orders').insert(payload);if(r.error)throw r.error;$('jobEditor').style.display='none';bookingDraft=null;await load();msg('Trabajo guardado. No se ha creado ningún ingreso contable.');window.dispatchEvent(new Event('lcm-records-changed'));}catch(err){msg('No se pudo guardar: '+err.message)}
});
window.addEventListener('lcm-authenticated',load);window.addEventListener('lcm-data-refresh',load);
const observer=new MutationObserver(()=>{if($('app')?.style.display==='block'&&!loaded)load();if($('app')?.style.display==='none'){loaded=false;$('jobEditor').style.display='none';}});
if($('app'))observer.observe($('app'),{attributes:true,attributeFilter:['style']});if($('app')?.style.display==='block')load();
})();
