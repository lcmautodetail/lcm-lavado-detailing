(()=>{'use strict';const button=document.getElementById('menu'),links=document.getElementById('links');
function close(){links?.classList.remove('open');button?.setAttribute('aria-expanded','false');button?.setAttribute('aria-label','Abrir menú')}
button?.addEventListener('click',()=>{const open=links.classList.toggle('open');button.setAttribute('aria-expanded',String(open));button.setAttribute('aria-label',open?'Cerrar menú':'Abrir menú')});
links?.querySelectorAll('a').forEach(a=>a.addEventListener('click',close));document.addEventListener('keydown',e=>{if(e.key==='Escape'){close();if(button&&getComputedStyle(button).display!=='none')button.focus()}});
document.querySelectorAll('.compare input').forEach(input=>input.addEventListener('input',()=>input.parentElement.style.setProperty('--position',input.value+'%')));
})();
