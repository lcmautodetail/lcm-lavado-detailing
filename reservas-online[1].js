// Si no se ha configurado Supabase, permanece el formulario WhatsApp original.
(async()=>{
if(!window.LCM_DB?.configured)return;
const $=id=>document.getElementById(id),form=$('form');
const originalSubmit=form.querySelector('button[type="submit"]');
const notice=form.querySelector('.note');
const consent=$('consentimiento');
consent.nextElementSibling.innerHTML='Acepto el tratamiento de mis datos para gestionar mi solicitud de reserva. <a href="privacidad.html" target="_blank">Política de privacidad</a>.';
notice.textContent='La solicitud quedará registrada en la agenda de LCM como pendiente. La confirmación y el presupuesto definitivo se comunicarán posteriormente.';
originalSubmit.textContent='Solicitar reserva →';
$('franja').parentElement.querySelector('label').textContent='Hora disponible';
$('franja').outerHTML='<select id="franja" required><option value="">Elige fecha y servicio</option></select>';
const slotSelect=$('franja');
async function loadServices(){
 try{const services=await LCM_DB.services();
 $('servicio').innerHTML=services.map(s=>`<option value="${s.name}">${s.name} · desde ${Number(s.price).toFixed(0)} €</option>`).join('');
 const preset=new URLSearchParams(location.search).get('servicio');if(preset&&services.some(s=>s.name===preset))$('servicio').value=preset;
 await loadSlots();
 }catch(err){notice.textContent='No se ha podido conectar con las reservas. Puedes contactar por WhatsApp.';originalSubmit.disabled=true;console.error(err)}
}
async function loadSlots(){
 slotSelect.innerHTML='<option value="">Consultando disponibilidad…</option>';
 if(!$('fecha').value){slotSelect.innerHTML='<option value="">Selecciona una fecha</option>';return}
 try{const data=await LCM_DB.slots($('fecha').value,$('servicio').value);
 const free=data.filter(x=>x.available);
 slotSelect.innerHTML='<option value="">'+(free.length?'Selecciona una hora':'Sin horas libres para este día')+'</option>'+free.map(x=>`<option value="${x.slot_time}">${x.slot_time}</option>`).join('');
 }catch(err){slotSelect.innerHTML='<option value="">No se pudo consultar</option>';console.error(err)}
}
$('servicio').addEventListener('change',loadSlots);$('fecha').addEventListener('change',loadSlots);
// El formulario original abre WhatsApp. Lo sustituimos solo cuando la nube está configurada.
form.addEventListener('submit',async e=>{
 e.preventDefault();e.stopImmediatePropagation();
 if(!form.reportValidity())return;
 originalSubmit.disabled=true;originalSubmit.textContent='Enviando solicitud…';
 try{
  await LCM_DB.request({client_name:$('nombre').value.trim(),phone:$('telefono').value.trim(),vehicle:[$('marca').value,$('modelo').value].join(' ').trim(),plate:'',vehicle_size:$('tamano').value,dirt_level:$('suciedad').value,service_name:$('servicio').value,booking_date:$('fecha').value,booking_time:slotSelect.value,notes:$('observaciones').value});
  form.innerHTML='<div role="status" style="padding:22px;background:#17362d;border:1px solid #3b957b;border-radius:12px"><h2>Solicitud recibida</h2><p>Hemos registrado tu cita como pendiente. LCM se pondrá en contacto contigo para confirmarla.</p><a href="index.html" style="color:#efd37c">Volver al inicio</a></div>';
 }catch(err){alert(err.message||'No se ha podido guardar la reserva. Inténtalo de nuevo.');originalSubmit.disabled=false;originalSubmit.textContent='Solicitar reserva →';await loadSlots()}
},true);
await loadServices();
})();
