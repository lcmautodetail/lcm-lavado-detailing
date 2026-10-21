(async()=>{
if(!window.LCM_DB?.configured)return;
const $=id=>document.getElementById(id), form=$('form'), submit=form.querySelector('button[type="submit"]'),notice=form.querySelector('.note');
const consent=$('consentimiento');consent.nextElementSibling.innerHTML='He leído la <a href="privacidad[1].html" target="_blank" rel="noopener">política de privacidad</a> y solicito que se gestionen estos datos para tramitar mi cita.';
notice.textContent='Solicitud pendiente de confirmación. Precio orientativo sujeto a valoración del estado real del vehículo.';
submit.textContent='Preparando reservas…';
$('franja').parentElement.querySelector('label').textContent='Hora disponible';
$('franja').outerHTML='<select id="franja" required><option value="">Elige fecha y servicio</option></select>';
const slots=$('franja');
document.querySelector('label[for="tamano"]').textContent='Categoría (automática si reconocemos el modelo)';
$('tamano').innerHTML='<option value="">No reconocida / consultar</option>'+['Compacto','Mediano','SUV / Familiar','Furgoneta'].map(x=>`<option>${x}</option>`).join('');
$('tamano').insertAdjacentHTML('afterend','<div id="categoriaAyuda" class="small" style="margin-top:5px">Si tu modelo no aparece en nuestra base, elige su categoría para obtener una estimación.</div>');
$('resFranja').parentElement.insertAdjacentHTML('afterend','<p>Tipo de vehículo: <strong id="resTamano">Por identificar</strong></p><p>Precio orientativo: <strong id="resPrecio" style="font-size:1.4em">Calculando…</strong></p><p class="small" id="resAviso">El importe definitivo se confirma tras valorar el vehículo.</p>');
const quoteBox=$('resPrecio'),catBox=$('resTamano'),warn=$('resAviso');
let models=[],services=[],quote=null,quoteKey='',slotSerial=0;
function summary(){ $('resServicio').textContent=$('servicio').value;$('resVehiculo').textContent=[$('marca').value,$('modelo').value].filter(Boolean).join(' ')||'Por indicar';$('resFecha').textContent=$('fecha').value?$('fecha').value.split('-').reverse().join('/'):'Por elegir';$('resFranja').textContent=slots.value||'Por elegir';}
form.addEventListener('input',summary);form.addEventListener('change',summary);
$('fecha').min=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
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
 if(quote?.needs_review){const upholstery=$('servicio').value==='Limpieza de tapicería';quoteBox.textContent=quote?.quoted_price!=null?'Desde '+Number(quote.quoted_price).toLocaleString('es-ES',{style:'currency',currency:'EUR'})+(upholstery?' / asiento':''):'A consultar';warn.textContent=upholstery?'La tapicería requiere valoración por asiento y zonas a tratar.':'Confirmaremos la categoría y el presupuesto antes de realizar el servicio.'}
 else if(quote?.quoted_price!=null){quoteBox.textContent=Number(quote.quoted_price).toLocaleString('es-ES',{style:'currency',currency:'EUR'});warn.textContent='Precio orientativo; puede variar tras revisar el vehículo.'}
 else{quoteBox.textContent='A consultar';warn.textContent='Confirmaremos el presupuesto antes de realizar el trabajo.'}
 }catch(e){quoteBox.textContent='A consultar';warn.textContent='No se pudo calcular el precio. Confirmaremos el presupuesto.';console.error(e)}
}
let quoteTimer;function scheduleQuote(){clearTimeout(quoteTimer);quoteTimer=setTimeout(getQuote,250)}
async function loadSlots(){const serial=++slotSerial;slots.innerHTML='<option value="">Consultando…</option>';summary();if(!$('fecha').value){slots.innerHTML='<option value="">Selecciona una fecha</option>';return}
 try{const rows=await LCM_DB.slots($('fecha').value,$('servicio').value),free=rows.filter(x=>x.available);if(serial!==slotSerial)return;slots.innerHTML='<option value="">'+(free.length?'Selecciona una hora':'Sin horas libres para este día')+'</option>'+free.map(x=>`<option value="${x.slot_time}">${x.slot_time}</option>`).join('')}
 catch(e){if(serial!==slotSerial)return;slots.innerHTML='<option value="">No se pudo consultar</option>';console.error(e)}}
try{
 services=await LCM_DB.services();for(let offset=0;;offset+=1000){const {data,error}=await LCM_DB.client.from('vehicle_models').select('brand,model,size').order('brand').order('model').range(offset,offset+999);if(error)throw error;models.push(...(data||[]));if(!data||data.length<1000)break}
 $('servicio').innerHTML=services.map(s=>{const o=document.createElement('option');o.value=s.name;o.textContent=s.name;return o.outerHTML}).join('');
 const preset=new URLSearchParams(location.search).get('servicio');if(preset&&services.some(s=>s.name===preset))$('servicio').value=preset;
 // Buscadores accesibles con filtrado en tiempo real y selección por teclado.
 const normSearch=s=>(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').trim();
 function searchable(input, getItems, onSelect){
   input.setAttribute('autocomplete','off');input.setAttribute('role','combobox');
   input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-expanded','false');
   const wrap=document.createElement('div');wrap.className='lcm-search-wrap';
   input.parentNode.insertBefore(wrap,input);wrap.appendChild(input);
   const menu=document.createElement('div');menu.className='lcm-search-menu';menu.setAttribute('role','listbox');menu.hidden=true;
   menu.id='lcm-options-'+input.id;input.setAttribute('aria-controls',menu.id);wrap.appendChild(menu);
   let matches=[],active=-1;
   const close=()=>{menu.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');active=-1};
   const choose=value=>{input.value=value;close();onSelect(value);input.dispatchEvent(new Event('input',{bubbles:true}));};
   function render(){
     const q=normSearch(input.value);matches=[...new Set(getItems())].filter(x=>normSearch(x).includes(q)).sort((a,b)=>{
       const ap=normSearch(a).startsWith(q)?0:1,bp=normSearch(b).startsWith(q)?0:1;
       return ap-bp||a.localeCompare(b,'es');
     }).slice(0,30);active=-1;menu.replaceChildren();
     matches.forEach((value,i)=>{const opt=document.createElement('button');opt.type='button';opt.className='lcm-search-option';opt.id=menu.id+'-'+i;opt.setAttribute('role','option');opt.textContent=value;
       opt.addEventListener('pointerdown',e=>e.preventDefault());opt.addEventListener('click',()=>choose(value));menu.appendChild(opt)});
     if(!matches.length){const msg=document.createElement('div');msg.className='lcm-search-empty';msg.textContent='No aparece en el catálogo. Puedes escribirlo manualmente.';menu.appendChild(msg)}
     menu.hidden=false;input.setAttribute('aria-expanded','true');
   }
   function highlight(){[...menu.querySelectorAll('[role="option"]')].forEach((el,i)=>{el.classList.toggle('active',i===active);el.setAttribute('aria-selected',String(i===active))});if(active>=0){input.setAttribute('aria-activedescendant',menu.id+'-'+active);menu.children[active].scrollIntoView({block:'nearest'})}}
   input.addEventListener('focus',render);
   input.addEventListener('input',render);
   input.addEventListener('keydown',e=>{if(e.key==='Escape'){close();return}if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(menu.hidden)render();if(matches.length){active=(active+(e.key==='ArrowDown'?1:-1)+matches.length)%matches.length;highlight()}}else if(e.key==='Enter'&&!menu.hidden&&active>=0){e.preventDefault();choose(matches[active])}else if(e.key==='Tab')close()});
   input.addEventListener('blur',()=>setTimeout(close,130));
   document.addEventListener('pointerdown',e=>{if(!wrap.contains(e.target))close()});
 }
 searchable($('marca'),()=>models.map(m=>m.brand),()=>{$('modelo').value='';$('tamano').value='';scheduleQuote()});
 searchable($('modelo'),()=>models.filter(m=>normalize(m.brand)===normalize($('marca').value)).map(m=>m.model),()=>{const m=selectedModel();$('tamano').value=m?.size||'';scheduleQuote()});
 $('marca').addEventListener('input',()=>{$('tamano').value='';scheduleQuote()});
 $('modelo').addEventListener('input',()=>{const m=selectedModel();$('tamano').value=m?.size||'';scheduleQuote()});
 $('tamano').addEventListener('change',scheduleQuote);$('suciedad').addEventListener('change',scheduleQuote);
 $('servicio').addEventListener('change',()=>{summary();scheduleQuote();loadSlots()});$('fecha').addEventListener('change',()=>{summary();loadSlots()});
 summary();scheduleQuote();await loadSlots();submit.disabled=false;window.LCM_BOOKING_READY=true;clearTimeout(window.LCM_BOOKING_TIMEOUT);submit.textContent='Solicitar reserva →';
}catch(e){notice.textContent='No se pudo conectar al sistema de reservas. Contacta por WhatsApp.';submit.disabled=true;console.error(e);return}
form.addEventListener('submit',async e=>{
 e.preventDefault();e.stopImmediatePropagation();if(!form.reportValidity())return;
 submit.disabled=true;submit.textContent='Enviando…';
 try{await LCM_DB.request({client_name:$('nombre').value.trim(),phone:$('telefono').value.trim(),brand:$('marca').value.trim(),model:$('modelo').value.trim(),vehicle:[$('marca').value,$('modelo').value].join(' ').trim(),vehicle_size:$('tamano').value,dirt_level:$('suciedad').value,service_name:$('servicio').value,booking_date:$('fecha').value,booking_time:slots.value,notes:$('observaciones').value});
 form.innerHTML='<div role="status" style="padding:22px;background:#17362d;border:1px solid #3b957b;border-radius:12px"><h2>Solicitud recibida</h2><p>Hemos registrado tu cita como pendiente. Te contactaremos para confirmar el presupuesto y el horario.</p><a href="index.html" style="color:#efd37c">Volver al inicio</a></div>';
 }catch(err){alert(err.message||'No se pudo registrar la reserva');submit.disabled=false;submit.textContent='Solicitar reserva →';await loadSlots()}
},true);
})();
