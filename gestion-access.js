/* Se ejecuta antes de cargar dependencias: el acceso nunca falla en silencio. */
(()=>{'use strict';
const form=document.getElementById('loginForm'),message=document.getElementById('msg');
const report=text=>{if(message)message.textContent=text;const feedback=document.getElementById('loginFeedback');if(feedback)feedback.textContent=text};
window.LCM_LOGIN_READY=false;
report('Preparando acceso seguro…');
form.addEventListener('submit',event=>{if(!window.LCM_LOGIN_READY){event.preventDefault();event.stopImmediatePropagation();report('La conexión todavía no se ha cargado. Espera unos segundos o pulsa Recargar acceso.')}},true);
form.addEventListener('invalid',event=>{report(event.target.id==='email'?'Introduce un correo electrónico válido.':'Introduce tu contraseña.');},true);
window.addEventListener('error',event=>{if(event.target?.tagName==='SCRIPT')report('No se pudo cargar una parte de la aplicación. Pulsa Recargar acceso.');else if(!window.LCM_LOGIN_READY)report('No se pudo iniciar el acceso. Pulsa Recargar acceso.');},true);
window.addEventListener('lcm-login-ready',()=>{if(message.textContent==='Preparando acceso seguro…')report('Introduce tu correo y contraseña para entrar.');});
setTimeout(()=>{if(!window.LCM_LOGIN_READY)report('La carga está tardando demasiado. Pulsa Recargar acceso para volver a intentarlo.');},15000);
const retry=document.getElementById('retryAccess');if(retry)retry.onclick=()=>location.reload();
})();
