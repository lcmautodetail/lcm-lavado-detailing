/* Calendario visual de LCM: no modifica reservas. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const today=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const add=(d,n)=>{const x=new Date(d+'T12:00:00Z');x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10)};
let month=today().slice(0,7),view='month';
function choose(day){$('filterDate').value=day;$('filterDate').dispatchEvent(new Event('change',{bubbles:true}));draw()}
function switchView(next){view=next;$('calendarMonthPanel').hidden=next!=='month';$('calendarWeekPanel').hidden=next!=='week';$('calendarMonthView').classList.toggle('selected',next==='month');$('calendarWeekView').classList.toggle('selected',next==='week');draw()}
function draw(){
 if(!$('calendarMonthGrid'))return;
 const selected=$('filterDate').value;
 const first=month+'-01',dt=new Date(first+'T12:00:00Z'),offset=(dt.getUTCDay()+6)%7;
 const start=add(first,-offset);
 const bookings=window.LCM_VIEW?.bookings||[];
 const counts=new Map();
 for(const b of bookings){if(!b.booking_date||['cancelada','cancelled','canceled'].includes(String(b.status).toLowerCase()))continue;counts.set(b.booking_date,(counts.get(b.booking_date)||0)+1)}
 $('calendarMonthTitle').textContent=new Intl.DateTimeFormat('es-ES',{month:'long',year:'numeric',timeZone:'UTC'}).format(dt);
 $('calendarMonthGrid').innerHTML=Array.from({length:42},(_,i)=>{const day=add(start,i),inMonth=day.slice(0,7)===month,count=counts.get(day)||0,sunday=new Date(day+'T12:00:00Z').getUTCDay()===0;return '<button type="button" class="lcm-calendar-day'+(count?' busy':'')+(selected===day?' selected':'')+(today()===day?' today':'')+(sunday?' closed':'')+'" data-calendar-day="'+day+'" '+(!inMonth?'disabled':'')+' aria-label="'+day+', '+count+' citas"><strong>'+Number(day.slice(-2))+'</strong><small>'+(count?count+' cita'+(count===1?'':'s'):sunday?'Cerrado':'◌')+'</small></button>'}).join('');
 $('calendarMonthGrid').querySelectorAll('[data-calendar-day]').forEach(b=>b.onclick=()=>choose(b.dataset.calendarDay));
}
$('calendarMonthView').onclick=()=>switchView('month');
$('calendarWeekView').onclick=()=>switchView('week');
$('calendarPrev').onclick=()=>{month=add(month+'-01',-1).slice(0,7);draw()};
$('calendarNext').onclick=()=>{const d=new Date(month+'-01T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+1);month=d.toISOString().slice(0,7);draw()};
$('calendarToday').onclick=()=>{month=today().slice(0,7);choose(today())};
$('filterDate').addEventListener('change',()=>{if($('filterDate').value)month=$('filterDate').value.slice(0,7);draw()});
$('clearDate').addEventListener('click',()=>setTimeout(draw,0));
window.addEventListener('lcm-data-refresh',draw);window.addEventListener('lcm-records-changed',()=>setTimeout(draw,100));
window.addEventListener('lcm-view-change',draw);window.addEventListener('lcm-authenticated',()=>setTimeout(draw,200));
switchView('month');
})();