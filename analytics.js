/* Analítica opcional: no se carga Google hasta aceptar. */
(()=>{'use strict';
const id='G-RMVTDPMTM1',key='lcm-analytics-consent-v1',lifetime=180*86400000;
let choice=null,loaded=false,panel,settings;
try{const saved=JSON.parse(localStorage.getItem(key));if(saved&&Date.now()-saved.at<lifetime)choice=saved.value==='accepted'?'accepted':'rejected'}catch{}
window['ga-disable-'+id]=choice!=='accepted';
window.dataLayer=window.dataLayer||[];
window.gtag=function(){window.dataLayer.push(arguments)};
const denied={analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'};
gtag('consent','default',denied);
function start(){
 window['ga-disable-'+id]=false;
 gtag('consent','update',{...denied,analytics_storage:'granted'});
 if(loaded)return;loaded=true;
 gtag('js',new Date());
 gtag('config',id,{page_location:location.origin+location.pathname,page_referrer:document.referrer.split(/[?#]/)[0],allow_google_signals:false,allow_ad_personalization_signals:false,cookie_expires:180*86400});
 const script=document.createElement('script');script.async=true;script.src='https://www.googletagmanager.com/gtag/js?id='+id;document.head.appendChild(script);
}
function clearCookies(){
 for(const part of document.cookie.split(';')){const name=part.split('=')[0].trim();if(!/^_ga(?:_|$)/.test(name))continue;
 const paths=new Set(['/','/lcm-lavado-detailing/']);
 for(const path of paths){document.cookie=name+'=; Max-Age=0; path='+path;document.cookie=name+'=; Max-Age=0; path='+path+'; domain='+location.hostname;document.cookie=name+'=; Max-Age=0; path='+path+'; domain=.'+location.hostname}
 }
}
function choose(value){choice=value;try{localStorage.setItem(key,JSON.stringify({value,at:Date.now()}))}catch{}
 if(value==='accepted')start();else{window['ga-disable-'+id]=true;gtag('consent','update',denied);clearCookies()}
 panel.hidden=true;settings.focus();
}
function track(name,params={}){if(choice==='accepted')gtag('event',name,{...params,page_location:location.origin+location.pathname})}
window.LCM_ANALYTICS={track};
if(choice==='accepted')start();else clearCookies();
function ui(){
 const style=document.createElement('style');style.textContent='#lcm-cookie-panel[hidden]{display:none}#lcm-cookie-panel{position:fixed;inset:auto 16px 90px;z-index:10000;max-width:680px;margin:auto;padding:20px;background:#18191b;color:#eee;border:1px solid #927944;border-radius:14px;box-shadow:0 8px 40px #0009;font:15px/1.5 system-ui;text-align:left}#lcm-cookie-panel h2{font:700 20px/1.3 system-ui;margin:0 0 8px;color:#efd37c}#lcm-cookie-panel p{margin:0 0 14px;color:#eee}#lcm-cookie-panel a{color:#efd37c}#lcm-cookie-panel div{display:flex;gap:12px;flex-wrap:wrap}#lcm-cookie-panel button{flex:1;min-width:160px;padding:11px 16px;border:1px solid #d6b46a;border-radius:8px;background:#242426;color:#fff;font:600 15px system-ui;cursor:pointer}#lcm-cookie-settings{display:block;margin:18px auto;padding:10px 14px;background:#18191b;color:#efd37c;border:1px solid #927944;border-radius:8px;cursor:pointer}';document.head.appendChild(style);
 panel=document.createElement('section');panel.id='lcm-cookie-panel';panel.setAttribute('role','region');panel.setAttribute('aria-label','Preferencias de cookies');panel.hidden=choice!==null;
 panel.innerHTML='<h2>Tu privacidad</h2><p>Usamos Google Analytics solo si aceptas, para medir visitas, clics en WhatsApp y solicitudes de reserva. Puedes rechazarlo y usar toda la web igualmente. <a href="privacidad.html">Más información</a>.</p><div><button type="button" data-choice="rejected">Rechazar analítica</button><button type="button" data-choice="accepted">Aceptar analítica</button></div>';
 settings=document.createElement('button');settings.id='lcm-cookie-settings';settings.type='button';settings.textContent='Preferencias de cookies';settings.onclick=()=>{panel.hidden=false;panel.querySelector('button').focus()};
 (document.querySelector('footer')||document.body).appendChild(settings);document.body.appendChild(panel);
 panel.querySelectorAll('[data-choice]').forEach(button=>button.onclick=()=>choose(button.dataset.choice));
 document.addEventListener('click',event=>{const link=event.target.closest('a[href]');if(!link)return;const url=new URL(link.href,location.href);
 if(['wa.me','api.whatsapp.com','web.whatsapp.com'].includes(url.hostname))track('contact_whatsapp');
 else if(url.origin===location.origin&&/\/reservar\.html$/.test(url.pathname))track('view_booking');
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ui);else ui();
})();
