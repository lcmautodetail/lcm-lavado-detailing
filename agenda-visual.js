// Agenda visual LCM: consulta las reservas existentes. No modifica datos.
(()=>{'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=new Intl.DateTimeFormat('es-ES',{month:'long',year:'numeric'});
const dateKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const fromKey=s=>new Date(Number(s.slice(0,4)),Number(s.slice(5,7))-1,Number(s.slice(8,10)),12);
const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const monday=d=>addDays(d,-(d.getDay()+6)%7);
const todaySpain=()=>{const p=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const g=k=>p.find(x=>x.type===k).value;return fromKey(`${g('year')}-${g('month')}-${g('day')}`)};
let focus=todaySpain(),items=[],ready=false;
function display(){
 const mode=$('calMode').value, first=mode==='week'?monday(focus):new Date(focus.getFullYear(),focus.getMonth(),1,12);
 const last=mode==='week'?addDays(first,6):new Date(focus.getFullYear(),focus.getMonth()+1,0,12);
 $('calTitle').textContent=mode==='week'?`${first.toLocaleDateString('es-ES',{day:'numeric',month:'short'})} – ${last.toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'})}`:fmt.format(focus);
 const days=[];for(let d=new Date(first);d<=last;d=addDays(d,1))days.push(new Date(d));
 const visible=items.filter(x=>x.status!=='cancelada');
 const names=['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
 $('calGrid').innerHTML=(mode==='month'?names.map(n=>`<div class="lcm-cal-weekhead">${n}</div>`).join(''):'')+
 (mode==='month'?Array.from({length:(first.getDay()+6)%7},()=>'<div class="lcm-cal-day is-out" aria-hidden="true"></div>').join(''):'')+
 days.map(d=>{const key=dateKey(d),jobs=visible.filter(b=>b.booking_date===key).sort((a,b)=>String(a.booking_time).localeCompare(String(b.booking_time)));
 return `<div class="lcm-cal-day ${key===dateKey(todaySpain())?'is-today':''}"><div class="lcm-cal-date">${mode==='week'?names[(d.getDay()+6)%7]+' ':''}${d.getDate()}</div>${jobs.map(b=>{const kind=b.status==='pendiente'?'pending':b.status==='completada'?'done':'confirmed';return `<button type="button" class="lcm-cal-job ${kind}" data-cal-id="${esc(b.id)}" title="Abrir cita">${esc(String(b.booking_time||'').slice(0,5))} · ${esc(b.client_name)}<br>${esc(b.service_name)}</button>`}).join('')||'<span class="lcm-cal-empty">—</span>'}</div>`}).join('');
 $('calGrid').querySelectorAll('[data-cal-id]').forEach(btn=>btn.onclick=()=>{const b=items.find(x=>x.id===btn.dataset.calId);if(b&&typeof openEdit==='function')openEdit(b)});
}
async function reload(){if(!$('app')||$('app').style.display==='none')return;try{$('calMessage').textContent='Cargando agenda…';items=await window.LCM_DB.adminAppointments();display();$('calMessage').textContent=`${items.filter(x=>x.status!=='cancelada').length} citas activas en total. Pulsa una cita para editarla.`}catch(e){$('calMessage').textContent='No se pudo cargar la agenda: '+e.message}}
$('calPrev').onclick=()=>{focus=$('calMode').value==='week'?addDays(focus,-7):new Date(focus.getFullYear(),focus.getMonth()-1,Math.min(focus.getDate(),28),12);display()};
$('calNext').onclick=()=>{focus=$('calMode').value==='week'?addDays(focus,7):new Date(focus.getFullYear(),focus.getMonth()+1,Math.min(focus.getDate(),28),12);display()};
$('calToday').onclick=()=>{focus=todaySpain();display()};$('calMode').onchange=display;$('calReload').onclick=reload;
// Esperar al inicio de sesión. También refrescar tras guardar/cancelar desde el panel.
const app=$('app');if(app){new MutationObserver(()=>{if(app.style.display!=='none'){reload()}}).observe(app,{attributes:true,attributeFilter:['style']})}
$('refresh').addEventListener('click',()=>setTimeout(reload,500));
$('editForm').addEventListener('submit',()=>setTimeout(reload,1100));
$('calMessage').textContent='Inicia sesión para ver la agenda.';
})();
