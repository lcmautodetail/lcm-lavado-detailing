// LCM Gestión · Economía. Solo disponible tras autenticar al administrador.
(()=>{
 const el=id=>document.getElementById(id);
 const client=()=>LCM_DB.client;
 const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=n=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(n)||0);
 const localDate=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const state={rows:[]};
 const status=s=>el('ecoMessage').textContent=s;
 const month=()=>el('ecoMonth').value;
 const amount=id=>Number(el(id).value);
 function validate(a){if(!Number.isFinite(a)||a<=0||a>1000000)throw Error('Importe no válido')}
 async function load(){
  if(el('app').style.display==='none')return;
  if(!/^\d{4}-\d{2}$/.test(month()))return;
  const start=month()+'-01';const [year,m]=month().split('-').map(Number);
  const end=new Date(Date.UTC(year,m,1)).toISOString().slice(0,10);
  status('Cargando movimientos…');
  try{
   const {data,error}=await client().from('economic_movements').select('*').gte('movement_date',start).lt('movement_date',end).order('movement_date',{ascending:false}).order('created_at',{ascending:false}).limit(2000);
   if(error)throw error;
   state.rows=data||[];render();status(state.rows.length>=2000?'Se muestran los últimos 2.000 movimientos del mes. Exporta y revisa antes de seguir.':'Movimientos actualizados');
  }catch(e){status('No se pudo cargar la economía: '+e.message+' · Comprueba que has ejecutado el SQL de instalación.');}
 }
 function render(){
  const incomes=state.rows.filter(r=>r.kind==='ingreso');const expenses=state.rows.filter(r=>r.kind==='gasto');
  const sum=arr=>arr.reduce((v,r)=>v+Number(r.amount||0),0);
  const a=sum(incomes),b=sum(expenses);const hours=incomes.reduce((v,r)=>v+Number(r.hours_worked||0),0);
  const tile=(label,value,sub)=>`<div class="kpi"><span>${label}</span><strong>${value}</strong><small>${sub}</small></div>`;
  el('ecoStats').innerHTML=tile('Cobros reales',money(a),`${incomes.length} ingresos`)+tile('Gastos pagados',money(b),`${expenses.length} gastos`)+tile('Resultado provisional',money(a-b),'No equivale al beneficio fiscal')+tile('Ingreso por hora',hours?money(a/hours):'—',`${hours.toLocaleString('es-ES')} horas anotadas`);
  el('ecoRows').innerHTML=state.rows.map(r=>`<tr><td>${safe(r.movement_date)}</td><td>${r.kind==='ingreso'?'Ingreso':'Gasto'}</td><td>${safe(r.concept)}</td><td>${r.kind==='ingreso'?'+':'−'}${money(r.amount)}</td><td>${safe(r.kind==='ingreso'?(r.payment_method+' · '+(r.document_status||'pendiente')):(r.category||''))}</td><td><button type="button" data-eco-delete="${safe(r.id)}">Eliminar</button></td></tr>`).join('')||'<tr><td colspan="6">Todavía no hay movimientos en este mes.</td></tr>';
  if(document.body.dataset.mobile==='true')el('ecoRows').querySelectorAll('[data-eco-delete]').forEach(b=>b.remove());
  el('ecoRows').querySelectorAll('[data-eco-delete]').forEach(b=>b.onclick=async()=>{
   const row=state.rows.find(r=>r.id===b.dataset.ecoDelete);if(!row||!confirm(`¿Eliminar ${row.kind} de ${money(row.amount)} (${row.concept})?`))return;
   const {error}=await client().from('economic_movements').delete().eq('id',row.id);if(error)status(error.message);else await load();
  });
 }
 async function add(kind){
  const income=kind==='ingreso';const prefix=income?'income':'expense';const amt=amount(prefix+'Amount');validate(amt);
  const payload={kind,movement_date:el(prefix+'Date').value,concept:el(prefix+'Concept').value.trim(),amount:amt,payment_method:el(prefix+'Method').value,notes:el(prefix+'Notes').value.trim()};
  if(!payload.concept||!payload.movement_date)throw Error('Falta fecha o concepto');
  if(income){payload.client_name=el('incomeClient').value.trim();payload.document_status=el('incomeDoc').value;payload.hours_worked=el('incomeHours').value===''?null:amount('incomeHours');}
  else payload.category=el('expenseCategory').value;
  const {error}=await client().from('economic_movements').insert(payload);if(error)throw error;
  el(prefix+'Form').reset();el(prefix+'Date').value=localDate();el('ecoMonth').value=payload.movement_date.slice(0,7);await load();status('Movimiento guardado correctamente');
 }
 function exportCsv(){
  const fields=['movement_date','kind','concept','client_name','category','amount','payment_method','document_status','hours_worked','notes'];
  const line=r=>fields.map(f=>'"'+String(r[f]??'').replace(/"/g,'""')+'"').join(';');
  const csv='\ufeff'+fields.join(';')+'\r\n'+state.rows.map(line).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='lcm-economia-'+month()+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
 }
 const date=localDate();el('ecoMonth').value=date.slice(0,7);el('incomeDate').value=date;el('expenseDate').value=date;
 el('ecoMonth').onchange=load;el('ecoReload').onclick=load;el('ecoExport').onclick=exportCsv;
 for(const kind of ['ingreso','gasto']){const form=el(kind==='ingreso'?'incomeForm':'expenseForm');form.onsubmit=async e=>{e.preventDefault();try{await add(kind)}catch(err){status('Error: '+err.message)}}}
 // El panel principal establece #app visible únicamente tras verificar is_lcm_admin().
 window.addEventListener('lcm-authenticated',load);window.addEventListener('lcm-data-refresh',load);
 const observer=new MutationObserver(()=>{if(el('app').style.display==='block')load()});observer.observe(el('app'),{attributes:true,attributeFilter:['style']});
 if(el('app').style.display==='block')load();
})();
