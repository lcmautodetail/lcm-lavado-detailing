/* Cálculos compartidos. Sin consultas ni escrituras. */
((root)=>{'use strict';
const normalize=value=>String(value??'').trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function status(value){const s=normalize(value);if(['cancelada','cancelado','anulada','anulado'].includes(s))return {key:'cancelled',label:'Cancelada'};if(['completada','completado','finalizada','finalizado','terminado','terminada','realizado','realizada'].includes(s))return {key:'completed',label:'Finalizada'};if(['confirmada','confirmado','reservada','reservado'].includes(s))return {key:'confirmed',label:'Confirmada'};if(s.startsWith('pendiente')||s==='solicitada')return {key:'pending',label:'Pendiente'};return {key:'other',label:String(value||'Por revisar')}}
const active=value=>['pending','confirmed'].includes(status(value).key);
function cash(rows){let incomeCents=0,expenseCents=0,receipts=0,hours=0;for(const row of rows){const amount=Number(row.amount);if(!Number.isFinite(amount))continue;const cents=Math.round(amount*100);if(row.kind==='ingreso'){incomeCents+=cents;receipts++;hours+=Number(row.hours_worked)||0}else if(row.kind==='gasto')expenseCents+=cents}return {income:incomeCents/100,expense:expenseCents/100,net:(incomeCents-expenseCents)/100,receipts,average:receipts?incomeCents/100/receipts:null,hours}}
function monthsEnding(month,count=6){const [year,m]=month.split('-').map(Number);return Array.from({length:count},(_,i)=>new Date(Date.UTC(year,m-count+i,1)).toISOString().slice(0,7))}
function series(rows,month){return monthsEnding(month).map(key=>({month:key,...cash(rows.filter(row=>String(row.movement_date).startsWith(key)))}))}
function nextBooking(rows,today){return rows.filter(b=>active(b.status)&&b.booking_date>=today).sort((a,b)=>(a.booking_date+String(a.booking_time)).localeCompare(b.booking_date+String(b.booking_time)))[0]||null}
const api={normalize,status,active,cash,monthsEnding,series,nextBooking};if(typeof module==='object'&&module.exports)module.exports=api;else root.LCM_METRICS=api;
})(typeof window==='undefined'?globalThis:window);
