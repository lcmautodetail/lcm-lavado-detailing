// LCM Gestión 2.0 — navegación de agenda y accesibilidad, sin mutaciones de datos.
(()=>{'use strict';
const $=id=>document.getElementById(id);
const localToday=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
function addDays(iso,days){const d=new Date(iso+'T12:00:00Z');if(Number.isNaN(d.getTime()))return localToday();d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)}
function readable(iso){return new Intl.DateTimeFormat('es-ES',{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(iso+'T12:00:00Z'))}
function start(){
 const filter=$('filterDate'),clear=$('clearDate'),agenda=$('agenda');if(!filter||!clear||!agenda)return;
 const controls=document.createElement('div');controls.className='v2-datebar';controls.setAttribute('aria-label','Navegación de agenda');
 const prev=document.createElement('button'),today=document.createElement('button'),next=document.createElement('button'),current=document.createElement('span');
 prev.type=next.type=today.type='button';prev.textContent='← Anterior';today.textContent='Hoy';next.textContent='Siguiente →';current.className='v2-current';
 prev.setAttribute('aria-label','Día anterior');next.setAttribute('aria-label','Día siguiente');
 controls.append(prev,today,next,current);
 const dateRow=filter.closest('.row');if(dateRow)dateRow.insertAdjacentElement('afterend',controls);
 const update=()=>{current.textContent=filter.value?readable(filter.value):'Todas las fechas';prev.disabled=next.disabled=false};
 function setDate(value){filter.value=value;filter.dispatchEvent(new Event('change',{bubbles:true}));update()}
 prev.addEventListener('click',()=>setDate(addDays(filter.value||localToday(),-1)));
 next.addEventListener('click',()=>setDate(addDays(filter.value||localToday(),1)));
 today.addEventListener('click',()=>setDate(localToday()));
 filter.addEventListener('change',update);clear.addEventListener('click',()=>requestAnimationFrame(update));update();
 const style=document.createElement('style');style.textContent='.v2-datebar{display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center;margin:10px 0 18px}.v2-datebar button{font-size:12px;min-height:42px;padding:8px}.v2-current{font-size:12px;text-align:center;color:#e9cb83;font-weight:700;min-width:90px}@media(max-width:370px){.v2-datebar{grid-template-columns:1fr 1fr}.v2-current{grid-column:1/-1;grid-row:1}.v2-datebar button:nth-child(2){grid-row:3;grid-column:1/-1}}';document.head.append(style);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();