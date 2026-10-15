(async()=>{
if(!window.LCM_DB?.configured)return;
const $=id=>document.getElementById(id), form=$('form'), submit=form.querySelector('button[type="submit"]'),notice=form.querySelector('.note');
const consent=$('consentimiento');consent.nextElementSibling.innerHTML='Acepto el tratamiento de mis datos para gestionar mi solicitud de reserva. <a href="privacidad[1].html" target="_blank">Política de privacidad</a>.';
notice.textContent='Solicitud pendiente de confirmación. Precio orientativo sujeto a valoración del estado real del vehículo.';
submit.textContent='Solicitar reserva →';
$('franja').parentElement.querySelector('label').textContent='Hora disponible';
$('franja').outerHTML='<select id="franja" required><option value="">Elige fecha y servicio</option></select>';
const slots=$('franja');
$('tamano').parentElement.querySelector('label').textContent='Categoría (automática si reconocemos el modelo)';
$('tamano').innerHTML='<option value="">No reconocida / consultar</option>'+['Compacto','Mediano','SUV / Familiar','Furgoneta'].map(x=>`<option>${x}</option>`).join('');
$('tamano').insertAdjacentHTML('afterend','<div id="categoriaAyuda" class="small" style="margin-top:5px">Si tu modelo no aparece en nuestra base, elige su categoría para obtener una estimación.</div>');
$('resFranja').parentElement.insertAdjacentHTML('afterend','<p>Tipo de vehículo: <strong id="resTamano">Por identificar</strong></p><p>Precio orientativo: <strong id="resPrecio" style="font-size:1.4em">Calculando…</strong></p><p class="small" id="resAviso">El importe definitivo se confirma tras valorar el vehículo.</p>');
const quoteBox=$('resPrecio'),catBox=$('resTamano'),warn=$('resAviso');
let models=[],services=[],quote=null,quoteKey='';
const normalize=s=>(s||'').trim().toLocaleLowerCase('es');
function selectedModel(){return models.find(m=>normalize(m.brand)===normalize($('marca').value)&&normalize(m.model)===normalize($('modelo').value))}
async function getQuote(){
 const key=[$('marca').value,$('modelo').value,$('servicio').value,$('suciedad').value,$('tamano').value].join('|');
 quoteKey=key;quote=null;
 if(!$('marca').value.trim()||!$('modelo').value.trim()){quoteBox.textContent='Introduce marca y modelo';catBox.textContent='Por identificar';return}
 quoteBox.textContent='Calculando…';
 try{const {data,error}=await LCM_DB.client.rpc('lcm_quote',{p_brand:$('marca').value.trim(),p_model:$('modelo').value.trim(),p_service:$('servicio').value,p_dirt:$('suciedad').value,p_size:$('tamano').value||null});
 if(error)throw error;if(quoteKey!==key)return;
 quote=data?.[0];catBox.textContent=quote?.vehicle_size||'Pendiente de confirmar';
 if(quote?.needs_review){quoteBox.textContent=quote?.quoted_price!=null?'Desde '+Number(quote.quoted_price).toLocaleString('es-ES',{style:'currency',currency:'EUR'})+' / asiento':'A consultar';warn.textContent='Este servicio requiere valoración individual. En tapicería el precio es por asiento.'}
 else if(quote?.quoted_price!=null){quoteBox.textContent=Number(quote.quoted_price).toLocaleString('es-ES',{style:'currency',currency:'EUR'});warn.textContent='Precio orientativo; puede variar tras revisar el vehículo.'}
 else{quoteBox.textContent='A consultar';warn.textContent='Confirmaremos el presupuesto antes de realizar el trabajo.'}
 }catch(e){quoteBox.textContent='A consultar';warn.textContent='No se pudo calcular el precio. Confirmaremos el presupuesto.';console.error(e)}
}
let quoteTimer;function scheduleQuote(){clearTimeout(quoteTimer);quoteTimer=setTimeout(getQuote,250)}
async function loadSlots(){slots.innerHTML='<option value="">Consultando…</option>';if(!$('fecha').value){slots.innerHTML='<option value="">Selecciona una fecha</option>';return}
 try{const rows=await LCM_DB.slots($('fecha').value,$('servicio').value),free=rows.filter(x=>x.available);slots.innerHTML='<option value="">'+(free.length?'Selecciona una hora':'Sin horas libres para este día')+'</option>'+free.map(x=>`<option value="${x.slot_time}">${x.slot_time}</option>`).join('')}
 catch(e){slots.innerHTML='<option value="">No se pudo consultar</option>';console.error(e)}}
try{
 services=await LCM_DB.services();const {data,error}=await LCM_DB.client.from('vehicle_models').select('brand,model,size');if(error)throw error;models=data||[];
 $('servicio').innerHTML=services.map(s=>{const o=document.createElement('option');o.value=s.name;o.textContent=s.name;return o.outerHTML}).join('');
 const preset=new URLSearchParams(location.search).get('servicio');if(preset&&services.some(s=>s.name===preset))$('servicio').value=preset;
 const dl=document.createElement('datalist');dl.id='lcmBrands';[...new Set(models.map(m=>m.brand))].sort().forEach(b=>{const o=document.createElement('option');o.value=b;dl.append(o)});$('marca').after(dl);$('marca').setAttribute('list','lcmBrands');
 const ml=document.createElement('datalist');ml.id='lcmModels';$('modelo').after(ml);$('modelo').setAttribute('list','lcmModels');
 function modelsForBrand(){ml.innerHTML='';models.filter(m=>normalize(m.brand)===normalize($('marca').value)).forEach(m=>{const o=document.createElement('option');o.value=m.model;ml.append(o)})}
 $('marca').addEventListener('input',()=>{modelsForBrand();$('tamano').value='';scheduleQuote()});
 $('modelo').addEventListener('input',()=>{const m=selectedModel();$('tamano').value=m?.size||'';scheduleQuote()});
 $('tamano').addEventListener('change',scheduleQuote);$('suciedad').addEventListener('change',scheduleQuote);
 $('servicio').addEventListener('change',()=>{scheduleQuote();loadSlots()});$('fecha').addEventListener('change',loadSlots);
 modelsForBrand();scheduleQuote();await loadSlots();
}catch(e){notice.textContent='No se pudo conectar al sistema de reservas. Contacta por WhatsApp.';submit.disabled=true;console.error(e);return}
form.addEventListener('submit',async e=>{
 e.preventDefault();e.stopImmediatePropagation();if(!form.reportValidity())return;
 submit.disabled=true;submit.textContent='Enviando…';
 try{await LCM_DB.request({client_name:$('nombre').value.trim(),phone:$('telefono').value.trim(),brand:$('marca').value.trim(),model:$('modelo').value.trim(),vehicle:[$('marca').value,$('modelo').value].join(' ').trim(),vehicle_size:$('tamano').value,dirt_level:$('suciedad').value,service_name:$('servicio').value,booking_date:$('fecha').value,booking_time:slots.value,notes:$('observaciones').value});
 form.innerHTML='<div role="status" style="padding:22px;background:#17362d;border:1px solid #3b957b;border-radius:12px"><h2>Solicitud recibida</h2><p>Hemos registrado tu cita como pendiente. Te contactaremos para confirmar el presupuesto y el horario.</p><a href="index.html" style="color:#efd37c">Volver al inicio</a></div>';
 }catch(err){alert(err.message||'No se pudo registrar la reserva');submit.disabled=false;submit.textContent='Solicitar reserva →';await loadSlots()}
},true);
})();
