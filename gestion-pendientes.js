/* LCM Gestión: pendientes de mantenimiento y cobros; lectura privada tras autenticación. */
(()=>{'use strict';
const el=id=>document.getElementById(id),db=()=>window.LCM_DB?.client;
const eur=n=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(n)||0);
const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let serial=0;
async function load(){
 const app=el('app');if(!app||app.classList.contains('hidden')||app.style.display==='none'||!db())return;
 const ticket=++serial;el('lcmActionStatus').textContent='Actualizando…';
 try{
  const [dueResult,jobResult]=await Promise.all([
   db().rpc('lcm_maintenance_due'),
   db().from('lcm_work_orders').select('id,client_id,service,work_date,agreed_price,amount_paid,work_status,payment_status').eq('work_status','finalizado').neq('payment_status','interno').order('work_date',{ascending:false}).limit(300)
  ]);
  if(ticket!==serial)return;
  const due=dueResult.error?null:(dueResult.data||[]);
  if(jobResult.error)throw jobResult.error;
  const jobs=jobResult.data||[];
  const ids=[...new Set(jobs.map(j=>j.client_id).filter(Boolean))];
  let names={};if(ids.length){
   const res=await db().from('lcm_clients').select('id,name').in('id',ids);
   if(!res.error)names=Object.fromEntries((res.data||[]).map(x=>[x.id,x.name]));
  }
  if(ticket!==serial)return;
  const pending=jobs.map(j=>({...j,remainder:Math.max(0,Number(j.agreed_price||0)-Number(j.amount_paid||0))})).filter(j=>j.remainder>0);
  const total=pending.reduce((sum,j)=>sum+j.remainder,0);
  el('ecoPendingHeading').textContent='Cobros pendientes · '+pending.length+' ('+eur(total)+')';
  el('ecoPendingList').innerHTML=pending.length?pending.map(j=>'<div class="item"><b>'+safe(names[j.client_id]||'Cliente')+'</b><p class="muted">'+safe(j.service)+' · '+safe(j.work_date)+'</p><strong>'+eur(j.remainder)+' pendiente</strong></div>').join(''):'No hay trabajos finalizados con cobro pendiente.';
  el('lcmActionStatus').textContent='Lo importante de un vistazo';
  const box=el('lcmActionList');box.replaceChildren();
  const button=(label,detail,handler)=>{const b=document.createElement('button');b.type='button';b.className='lcm-pending-action';b.innerHTML='<strong>'+safe(label)+'</strong><small>'+safe(detail)+'</small>';b.onclick=handler;box.appendChild(b)};
  button(pending.length+' cobro'+(pending.length===1?'':'s')+' pendiente'+(pending.length===1?'':'s'),eur(total)+' por revisar',()=>{window.LCM_UI?.show('money');el('ecoPendingPanel').open=true;el('ecoPendingPanel').scrollIntoView({block:'start',behavior:'smooth'})});
  button(due===null?'Mantenimientos sin actualizar':due.length+' mantenimiento'+(due.length===1?'':'s')+' pendiente'+(due.length===1?'':'s'),due===null?'Consulta el apartado de mantenimientos':'Clientes a los que contactar',()=>{el('maintenance').closest('details')?.setAttribute('open','');el('maintenance').scrollIntoView({block:'start',behavior:'smooth'})});
 }catch(e){if(ticket!==serial)return;el('lcmActionStatus').textContent='No se pudieron consultar los pendientes. Pulsa Actualizar.';el('ecoPendingList').textContent='No se pudieron cargar los cobros pendientes.'}
}
const css=document.createElement('style');css.textContent='.lcm-pending-action{width:100%;display:flex;justify-content:space-between;gap:12px;align-items:center;text-align:left;margin-top:9px;padding:13px 14px;background:#252c35;border:1px solid #3c4550}.lcm-pending-action strong{color:#ebcf86}.lcm-pending-action small{font-size:12px;text-align:right}';document.head.appendChild(css);
el('lcmActionRefresh').onclick=load;
window.addEventListener('lcm-authenticated',load);window.addEventListener('lcm-data-refresh',load);window.addEventListener('lcm-records-changed',load);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)load()});
if(el('app')?.style.display==='block')load();
})();