// Fase 5: registro operativo independiente de economía y de reservas.
(()=>{'use strict';
const $=id=>document.getElementById(id), db=()=>window.LCM_DB?.client;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const euros=x=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(x)||0);
let clients=[],vehicles=[],jobs=[],loaded=false;
const msg=s=>{$('jobMessage').textContent=s};
async function load(){if($('app')?.style.display==='none')return;msg('Cargando trabajos…');try{
 const [c,v,j]=await Promise.all([db().from('lcm_clients').select('id,name,phone').order('name'),db().from('lcm_vehicles').select('id,client_id,vehicle,plate').order('vehicle'),db().from('lcm_work_orders').select('*').order('work_date',{ascending:false}).limit(1000)]);
 for(const r of [c,v,j])if(r.error)throw r.error;clients=c.data||[];vehicles=v.data||[];jobs=j.data||[];loaded=true;render();msg(`${jobs.length} trabajos nuevos registrados. El historial importado se consulta en Clientes.`);
 }catch(e){msg('Error al cargar trabajos: '+e.message)}}
function render(){ $('jobRows').innerHTML=jobs.map(j=>{const c=clients.find(x=>x.id===j.client_id),v=vehicles.find(x=>x.id===j.vehicle_id);return `<tr><td>${esc(j.work_date)}</td><td>${esc(c?.name||'—')}<br><small>${esc(v?.vehicle||'—')} ${esc(v?.plate||'')}</small></td><td>${esc(j.service)}</td><td>${esc(j.work_status.replace('_',' '))}</td><td>${j.payment_status==='interno'?'Interno · 0 €':`${esc(j.payment_status)} · ${euros(j.amount_paid)} / ${euros(j.agreed_price)}`}</td><td><button type="button" data-job="${esc(j.id)}">Editar</button></td></tr>`}).join('')||'<tr><td colspan="6">Todavía no hay trabajos nuevos.</td></tr>';
 $('jobRows').querySelectorAll('[data-job]').forEach(b=>b.onclick=()=>edit(jobs.find(j=>j.id===b.dataset.job)));
}
function clientOptions(id){$('jobClient').innerHTML='<option value="">Selecciona cliente</option>'+clients.map(c=>`<option value="${esc(c.id)}">${esc(c.name)} · ${esc(c.phone)}</option>`).join('');$('jobClient').value=id||'';vehicleOptions();}
function vehicleOptions(chosen){const id=$('jobClient').value;$('jobVehicle').innerHTML='<option value="">Selecciona vehículo</option>'+vehicles.filter(v=>v.client_id===id).map(v=>`<option value="${esc(v.id)}">${esc(v.vehicle)} · ${esc(v.plate||'sin matrícula')}</option>`).join('');$('jobVehicle').value=chosen||'';}
function edit(j){if(!loaded)return; $('jobEditor').style.display='block';$('jobId').value=j?.id||'';clientOptions(j?.client_id);vehicleOptions(j?.vehicle_id);$('jobDate').value=j?.work_date||new Date().toLocaleDateString('en-CA');$('jobService').value=j?.service||'';$('jobStatus').value=j?.work_status||'pendiente';$('jobPayment').value=j?.payment_status||'pendiente';$('jobPrice').value=j?.agreed_price??0;$('jobPaid').value=j?.amount_paid??0;$('jobNotes').value=j?.notes||'';$('jobEditor').scrollIntoView({behavior:'smooth',block:'nearest'});}
$('jobClient')?.addEventListener('change',()=>vehicleOptions());
$('jobNew')?.addEventListener('click',()=>{if(!loaded)return msg('Espera a que carguen los clientes.');edit(null)});
$('jobReload')?.addEventListener('click',load);
$('jobCancel')?.addEventListener('click',()=>{$('jobEditor').style.display='none'});
$('jobPayment')?.addEventListener('change',()=>{if($('jobPayment').value==='interno'){$('jobPrice').value=0;$('jobPaid').value=0}});
$('jobForm')?.addEventListener('submit',async e=>{e.preventDefault();const id=$('jobId').value,client_id=$('jobClient').value,vehicle_id=$('jobVehicle').value;
 if(!vehicles.some(v=>v.id===vehicle_id&&v.client_id===client_id))return msg('El vehículo no corresponde al cliente seleccionado.');
 const payment_status=$('jobPayment').value,agreed_price=Number($('jobPrice').value),amount_paid=Number($('jobPaid').value);
 if(!Number.isFinite(agreed_price)||!Number.isFinite(amount_paid)||agreed_price<0||amount_paid<0)return msg('Introduce importes válidos.');
 if(payment_status==='interno'&&(agreed_price!==0||amount_paid!==0))return msg('Los trabajos internos deben tener importes de 0 €.');
 if(payment_status==='pendiente'&&amount_paid>0)return msg('Si existe un cobro parcial, utiliza pagado y deja constancia en observaciones.');
 if(payment_status==='pagado'&&amount_paid<=0)return msg('Indica el importe realmente cobrado.');
 const payload={client_id,vehicle_id,work_date:$('jobDate').value,service:$('jobService').value.trim(),work_status:$('jobStatus').value,payment_status,agreed_price,amount_paid,notes:$('jobNotes').value.trim()};
 try{const r=id?await db().from('lcm_work_orders').update(payload).eq('id',id):await db().from('lcm_work_orders').insert(payload);if(r.error)throw r.error;$('jobEditor').style.display='none';await load();msg('Trabajo guardado. No se ha creado ningún ingreso contable.');}catch(err){msg('No se pudo guardar: '+err.message)}
});
const observer=new MutationObserver(()=>{if($('app')?.style.display==='block'&&!loaded)load();if($('app')?.style.display==='none'){loaded=false;$('jobEditor').style.display='none';}});
if($('app'))observer.observe($('app'),{attributes:true,attributeFilter:['style']});if($('app')?.style.display==='block')load();
})();
