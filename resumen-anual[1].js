// LCM Lavado & Detailing · Resumen anual (solo administrador autenticado).
(()=>{
 const $=id=>document.getElementById(id);
 const fmt=n=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(n||0);
 const num=n=>new Intl.NumberFormat('es-ES',{maximumFractionDigits:1}).format(n||0);
 const names=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
 const current=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric'}).format(new Date());
 $('annualYear').value=current;
 const note=t=>$('annualMessage').textContent=t;
 const tile=(name,value,sub)=>`<div class="kpi"><span>${name}</span><strong>${value}</strong><small>${sub}</small></div>`;
 async function load(){
  if($('app').style.display==='none')return;
  const year=Number($('annualYear').value);
  if(!Number.isInteger(year)||year<2020||year>2100)return;
  note('Calculando resumen anual…');
  try{
   let all=[];let from=0;const size=1000;
   for(let page=0;page<50;page++){
    const {data,error}=await LCM_DB.client.from('economic_movements').select('id,kind,movement_date,amount,hours_worked,concept').gte('movement_date',`${year}-01-01`).lt('movement_date',`${year+1}-01-01`).order('movement_date',{ascending:true}).order('id',{ascending:true}).range(from,from+size-1);
    if(error)throw error;
    all.push(...(data||[]));if(!data||data.length<size)break;
    from+=size;
    if(page===49)throw Error('Demasiados movimientos; el resumen se ha detenido para evitar cifras incompletas.');
   }
   const months=Array.from({length:12},()=>({income:0,expense:0,hours:0,works:0}));
   for(const r of all){const m=Number(String(r.movement_date).slice(5,7))-1;if(m<0||m>11)continue;
    const a=Number(r.amount)||0;
    if(r.kind==='ingreso'){months[m].income+=a;months[m].hours+=Number(r.hours_worked)||0;months[m].works++}
    if(r.kind==='gasto')months[m].expense+=a;
   }
   const totals=months.reduce((a,m)=>({income:a.income+m.income,expense:a.expense+m.expense,hours:a.hours+m.hours,works:a.works+m.works}),{income:0,expense:0,hours:0,works:0});
   $('annualStats').innerHTML=tile('Cobros registrados',fmt(totals.income),`${totals.works} trabajos`)+tile('Gastos registrados',fmt(totals.expense),'Pagados / anotados')+tile('Resultado provisional',fmt(totals.income-totals.expense),'No equivale al beneficio fiscal')+tile('Ingreso por hora',totals.hours?fmt(totals.income/totals.hours):'—',`${num(totals.hours)} horas`);
   const max=Math.max(1,...months.flatMap(m=>[m.income,m.expense]));
   $('annualBars').innerHTML=months.map((m,i)=>`<div class="annual-month"><div class="annual-columns"><div class="annual-bar annual-income" style="height:${Math.max(0,m.income/max*100)}%" title="Ingresos: ${fmt(m.income)}"></div><div class="annual-bar annual-expense" style="height:${Math.max(0,m.expense/max*100)}%" title="Gastos: ${fmt(m.expense)}"></div></div><span>${names[i]}</span></div>`).join('');
   $('annualRows').innerHTML=months.map((m,i)=>`<tr><td>${names[i]}</td><td>${fmt(m.income)}</td><td>${fmt(m.expense)}</td><td>${fmt(m.income-m.expense)}</td><td>${m.works}</td><td>${num(m.hours)}</td></tr>`).join('');
   // Las previsiones están en tabla independiente. Si la instalación anterior usó otro nombre,
   // mostramos un aviso en vez de mezclar previsiones con gastos reales.
   const candidates=['planned_expenses','expense_forecasts','economic_forecasts'];
   let forecasts=null;
   for(const table of candidates){const {data,error}=await LCM_DB.client.from(table).select('*').limit(500);
    if(!error){forecasts=data||[];break;}
   }
   if(forecasts===null){$('annualForecast').textContent='Las previsiones siguen separadas de los gastos reales. Para mostrarlas aquí, hay que conectar el nombre y las columnas exactas de tu tabla de previsiones en Supabase.';}
   else {
    const f=forecasts.filter(r=>String(r.expense_date||r.due_date||r.planned_date||r.month||r.date||'').startsWith(String(year)));
    const total=f.reduce((s,r)=>s+(Number(r.amount)||0),0);
    $('annualForecast').textContent=`Previsiones registradas para ${year}: ${f.length} movimientos · ${fmt(total)}. No están incluidas en los gastos pagados ni en el resultado provisional.`;
   }
   note(`Resumen de ${year} actualizado: ${all.length} movimientos.`);
  }catch(e){note('No se pudo cargar el resumen: '+e.message)}
 }
 $('annualYear').addEventListener('change',load);
 $('annualReload').addEventListener('click',load);
 const obs=new MutationObserver(()=>{if($('app').style.display==='block')load()});obs.observe($('app'),{attributes:true,attributeFilter:['style']});
 if($('app').style.display==='block')load();
})();
