(()=>{'use strict';
const $=id=>document.getElementById(id);
const tools=$('lcmAdvancedTools'),toggle=$('lcmSettingsToggle');
toggle.addEventListener('click',()=>{tools.hidden=!tools.hidden;if(!tools.hidden){tools.open=true;tools.scrollIntoView({behavior:'smooth',block:'start'})}});
const today=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
let initialized=false;
function init(){if(initialized||!window.LCM_VIEW)return;initialized=true;const date=$('filterDate');if(!date.value){date.value=today();date.dispatchEvent(new Event('change',{bubbles:true}))}}
window.addEventListener('lcm-authenticated',()=>setTimeout(init,200));
window.addEventListener('lcm-view-change',init);
window.addEventListener('lcm-data-refresh',init);
})();