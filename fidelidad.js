// Tarjeta de mantenimiento: historial automático y sellos manuales guardados en el servidor.
(()=>{'use strict';
const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const phone=x=>{let n=String(x||'').replace(/\D/g,'');if(n.startsWith('0034'))n=n.slice(2);return n.length===9?'34'+n:n};
const completed=x=>['finalizado','finalizada','completado','completada'].includes(norm(x));
const maintenance=x=>/^mantenimiento(?:\b|$)/.test(norm(x));
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function model(clientId,{clients=[],history=[],orders=[],bookings=[],manual=[]}={}){
 const client=clients.find(c=>c.id===clientId),number=phone(client?.phone);
 const uniquePhone=number&&clients.filter(c=>phone(c.phone)===number).length===1;
 const visits=new Map(),linked=new Set(orders.map(j=>j.booking_id).filter(Boolean));
 function add(key,date,service){if(key&&date)visits.set(key,{date:String(date).slice(0,10),service})}
 for(const j of history)if(j.client_id===clientId&&!j.is_internal&&completed(j.original_status)&&maintenance(j.service))add(j.import_key&&'history:'+j.import_key,j.appointment_at,j.service);
 for(const j of orders)if(j.client_id===clientId&&j.payment_status!=='interno'&&completed(j.work_status)&&maintenance(j.service))add(j.booking_id?'booking:'+j.booking_id:j.id&&'order:'+j.id,j.work_date,j.service);
 // Una reserva vinculada ya está representada por su trabajo, incluso si se cancela o es interno.
 for(const b of bookings)if(uniquePhone&&phone(b.phone)===number&&!linked.has(b.id)&&completed(b.status)&&maintenance(b.service_name))add(b.id&&'booking:'+b.id,b.booking_date,b.service_name);
 for(const m of manual)if(m.client_id===clientId&&m.id&&m.stamped_on)visits.set('manual:'+m.id,{id:m.id,manual:true,date:String(m.stamped_on),service:m.note||'Mantenimiento registrado manualmente'});
 const stamps=[...visits.values()].sort((a,b)=>a.date.localeCompare(b.date)),total=stamps.length;
 const cycle=total?Math.floor((total-1)/10)+1:1,filled=total?(total-1)%10+1:0;
 return {total,cycle,filled,manual:stamps.filter(s=>s.manual),stamps:stamps.slice((cycle-1)*10,cycle*10),rewards10:Math.floor((total+5)/10),rewards25:Math.floor(total/10)};
}
function render(card){
 const {total,cycle,filled,stamps}=card;
 const date=d=>/^\d{4}-\d{2}-\d{2}$/.test(d)?d.split('-').reverse().join('/'):'Fecha registrada';
 const next=filled===10?'Tarjeta completa. El próximo mantenimiento inicia otra tarjeta.':`Faltan ${(filled<5?5:10)-filled} mantenimientos para la bonificación del ${filled<5?10:25} %.`;
 return `<section class="loyalty-card" aria-label="Tarjeta de fidelidad de mantenimiento"><div class="loyalty-heading"><div><span class="eyebrow">LCM · FIDELIDAD</span><h4>Tu tarjeta de mantenimiento</h4></div><span class="loyalty-count">${filled}<small> / 10 sellos</small></span></div><p class="muted">Tarjeta ${cycle} · ${total} mantenimiento${total===1?'':'s'} completado${total===1?'':'s'} en total</p><div class="loyalty-actions"><button type="button" id="manualStampOpen" class="primary" aria-expanded="false" aria-controls="manualStampForm">+ Añadir sello manual</button></div><form id="manualStampForm" hidden><label for="manualStampDate">Fecha del mantenimiento</label><input id="manualStampDate" type="date" required><label for="manualStampNote">Nota (opcional)</label><input id="manualStampNote" maxlength="300" placeholder="Ej.: mantenimiento anterior pendiente de registrar"><p class="muted loyalty-rule">Añade solo visitas que no tengan ya un sello automático.</p><div class="actions"><button type="submit" class="primary">Guardar sello</button><button type="button" id="manualStampCancel">Cancelar</button></div></form><p id="manualStampMessage" class="msg" role="status" aria-live="polite"></p><ol class="loyalty-stamps">${Array.from({length:10},(_,i)=>{const n=i+1,stamp=stamps[i],reward=n===5?'10 %':n===10?'25 %':'';return `<li class="loyalty-stamp${stamp?' is-stamped':''}${reward?' is-reward':''}" aria-label="Sello ${n}${stamp?', completado el '+esc(date(stamp.date)):', pendiente'}${reward?', bonificación del '+reward:''}"><span class="loyalty-seal" aria-hidden="true">${stamp?'✓':n}</span><small>${reward||'Sello '+n}</small></li>`}).join('')}</ol><div class="loyalty-rewards"><div class="${filled>=5?'is-earned':''}"><b>5 sellos · 10 %</b><span>${filled>=5?'Objetivo alcanzado':'Primer objetivo'}</span></div><div class="${filled>=10?'is-earned':''}"><b>10 sellos · 25 %</b><span>${filled>=10?'Objetivo alcanzado':'Tarjeta completa'}</span></div></div><p class="loyalty-next" role="status">${next}</p><p class="muted loyalty-rule">Un sello por mantenimiento finalizado. También puedes registrar visitas anteriores manualmente. Los descuentos son para el siguiente mantenimiento; ajusta el precio al aplicarlos.</p>${total?`<details class="loyalty-history"><summary>Ver sellos y bonificaciones alcanzadas</summary><p>En todo el historial: ${card.rewards10} bonificación(es) del 10 % y ${card.rewards25} del 25 %. Este resumen no registra su canje.</p><ul>${stamps.map((s,i)=>`<li>Sello ${i+1} · ${esc(date(s.date))} · ${esc(s.service)}</li>`).join('')}</ul></details>`:'<p class="muted loyalty-rule">Todavía no hay mantenimientos completados. El primer sello aparecerá al finalizar uno.</p>'}${card.manual?.length?`<details class="loyalty-history"><summary>Sellos manuales (${card.manual.length}) · corregir</summary><ul>${card.manual.map(s=>`<li>${esc(date(s.date))} · ${esc(s.service)} <button type="button" class="smallbtn" data-remove-stamp="${esc(s.id)}">Quitar sello</button></li>`).join('')}</ul></details>`:''}</section>`;
}
window.LCM_LOYALTY={model,render};
})();
