// LCM Gestión: no offline copies of administrative pages or private data.
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('lcm-gestion-shell-')).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
// No fetch handler: browser requests always go to the network.
self.addEventListener('push',event=>{let data={};try{data=event.data?.json()||{}}catch{}event.waitUntil(self.registration.showNotification(data.title||'LCM Gestión',{body:data.body||'Tienes una actualización en la app.',tag:data.tag||'lcm-notice',icon:'./img/logo.png',badge:'./img/logo.png',data:{url:'./gestion.html'}}))});
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil((async()=>{const url=new URL('./gestion.html',self.location.href).href;const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});for(const client of windows){if(client.url.startsWith(url)){await client.focus();return}}await self.clients.openWindow(url)})())});
