const $=id=>document.getElementById(id);let bookings=[],services=[],blocked=[];
const msg=s=>$('message').textContent=s;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const phone=s=>{const p=String(s||'').replace(/\D/g,'');return p.startsWith('34')?p:'34'+p};
if(!LCM_DB.configured){$('setup').style.display='block'}else init();
async function init(){
 $('loginForm').onsubmit=async e=>{e.preventDefault();msg('Accediendo…');const {error}=await LCM_DB.client.auth.signInWithPassword({email:$('email').value,password:$('password').value});if(error){msg(error.message);return}await start()};
 $('logout').onclick=async()=>{await LCM_DB.client.auth.signOut();$('app').style.display='none';$('login').style.display='block';msg('Sesión cerrada')};
 $('refresh').onclick=refresh;
 $('dateFilter').onchange=render;$('search').oninput=render;
 $('new').onclick=()=>openEdit();$('closeEdit').onclick=()=>{$('editor').style.display='none'};
 $('editForm').onsubmit=saveEdit;
 $('block').onclick=async()=>{try{if(!$('blockDate').value)return;await LCM_DB.addBlocked($('blockDate').value);await refresh()}catch(e){msg(e.message)}};
 $('export').onclick=exportCsv;
 const {data:{session}}=await LCM_DB.client.auth.getSession();if(session)await start();else $('login').style.display='block';
}
async function start(){
 try{
 const {data,error}=await LCM_DB.client.rpc('is_lcm_admin');if(error)throw error;
 if(!data){await LCM_DB.client.auth.signOut();$('login').style.display='block';msg('Tu usuario aún no tiene permiso de administrador. Consulta la guía de instalación.');return}
 $('login').style.display='none';$('app').style.display='block';msg('');await refresh();
 }catch(e){msg(e.message)}
}
async function refresh(){
 try{[bookings,services,blocked]=await Promise.all([LCM_DB.adminAppointments(),LCM_DB.services(),LCM_DB.blocked()]);render();renderServices();renderBlocked();msg('Datos actualizados')}catch(e){msg('Error al cargar datos: '+e.message)}
}
function render(){
 const q=$('search').value.toLowerCase().trim(),d=$('dateFilter').value;
 const filtered=bookings.filter(b=>(!d||b.booking_date===d)&&(!q||[b.client_name,b.phone,b.vehicle,b.plate,b.service_name].join(' ').toLowerCase().includes(q)));
 const completed=bookings.filter(b=>b.status==='completada');const revenue=completed.reduce((s,b)=>s+Number(b.quoted_price||0),0);
 $('stats').innerHTML=`<p>Citas totales: <b>${bookings.length}</b></p><p>Pendientes: <b>${bookings.filter(b=>b.status==='pendiente').length}</b></p><p>Completadas: <b>${completed.length}</b></p><p>Facturación completada: <b>${revenue.toFixed(2)} €</b></p>`;
 $('bookings').innerHTML=filtered.map(b=>`<tr><td>${esc(b.booking_date)}<br>${esc(String(b.booking_time).slice(0,5))}</td><td><b>${esc(b.client_name)}</b><br>${esc(b.vehicle)}<br>${esc(b.phone)}</td><td>${esc(b.service_name)}<br>${Number(b.quoted_price).toFixed(2)} €</td><td><span class="status">${esc(b.status)}</span></td><td><div class="actions"><button data-edit="${b.id}">Editar</button><a target="_blank" rel="noopener" href="https://wa.me/${phone(b.phone)}?text=${encodeURIComponent('Hola '+b.client_name+', te escribo de LCM Lavado & Detailing por tu cita del '+b.booking_date+' a las '+String(b.booking_time).slice(0,5)+'.')}">WhatsApp</a></div></td></tr>`).join('')||'<tr><td colspan="5">No hay citas</td></tr>';
 document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openEdit(bookings.find(x=>x.id===b.dataset.edit)));
}
function renderServices(){
 $('services').innerHTML=services.map((s,i)=>`<tr><td>${esc(s.name)}</td><td><input type="number" min="0" step="0.01" value="${s.price}" id="p${i}" style="width:90px"></td><td><input type="number" min="30" step="30" value="${s.duration_minutes}" id="d${i}" style="width:95px"></td><td><button data-save-service="${i}">Guardar</button></td></tr>`).join('');
 document.querySelectorAll('[data-save-service]').forEach(b=>b.onclick=async()=>{const s=services[Number(b.dataset.saveService)];const {error}=await LCM_DB.client.from('services').update({price:Number($('p'+b.dataset.saveService).value),duration_minutes:Number($('d'+b.dataset.saveService).value)}).eq('name',s.name);if(error)msg(error.message);else await refresh()});
}
function renderBlocked(){
 $('blocked').innerHTML=blocked.map(b=>`<p>${esc(b.day)} <button data-unblock="${b.id}">Desbloquear</button></p>`).join('')||'<p class="muted">Sin días bloqueados.</p>';
 document.querySelectorAll('[data-unblock]').forEach(b=>b.onclick=async()=>{try{await LCM_DB.deleteBlocked(b.dataset.unblock);await refresh()}catch(e){msg(e.message)}})
}
function openEdit(b){
 $('editor').style.display='block';$('editor').scrollIntoView({behavior:'smooth'});$('editorTitle').textContent=b?'Editar cita':'Nueva cita manual';
 $('editId').value=b?.id||'';$('clientName').value=b?.client_name||'';$('phone').value=b?.phone||'';$('vehicle').value=b?.vehicle||'';$('plate').value=b?.plate||'';
 $('bookingDate').value=b?.booking_date||new Date().toLocaleDateString('en-CA');$('bookingTime').value=String(b?.booking_time||'09:30').slice(0,5);
 $('serviceName').innerHTML=services.map(s=>`<option value="${esc(s.name)}" ${s.name===b?.service_name?'selected':''}>${esc(s.name)}</option>`).join('');
 $('status').value=b?.status||'confirmada';$('price').value=b?.quoted_price??services[0]?.price??0;$('duration').value=b?.duration_minutes??services[0]?.duration_minutes??180;$('notes').value=b?.notes||'';
}
async function saveEdit(e){e.preventDefault();const b={client_name:$('clientName').value.trim(),phone:$('phone').value.trim(),vehicle:$('vehicle').value.trim(),plate:$('plate').value.trim(),booking_date:$('bookingDate').value,booking_time:$('bookingTime').value,service_name:$('serviceName').value,status:$('status').value,quoted_price:Number($('price').value),duration_minutes:Number($('duration').value),notes:$('notes').value};
 try{if($('editId').value)await LCM_DB.updateBooking($('editId').value,b);else await LCM_DB.adminCreate({...b,source:'admin'});$('editor').style.display='none';await refresh()}catch(err){msg(err.message)}
}
function exportCsv(){const fields=['booking_date','booking_time','client_name','phone','vehicle','plate','service_name','status','quoted_price','notes'];const lines=[fields.join(';'),...bookings.map(b=>fields.map(k=>'"'+String(b[k]??'').replace(/"/g,'""')+'"').join(';'))];const blob=new Blob(['\ufeff'+lines.join('\n')],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='lcm-citas.csv';a.click();URL.revokeObjectURL(a.href)}
