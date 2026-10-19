// LCM Gestión: no offline copies of administrative pages or private data.
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('lcm-gestion-shell-')).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
// No fetch handler: browser requests always go to the network.
