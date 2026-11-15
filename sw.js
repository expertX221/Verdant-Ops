const version='verdant-field-v6';
const files=['./','./index.html','./style.css','./app.js','./farm-renderer.js','./assets/geometry.js','./assets/greenhouse.jpg','./assets/barn.jpg','./assets/silo.jpg','./assets/tractor.jpg','./assets/storage.jpg','./assets/coop.jpg','./assets/farmhouse.jpg','./assets/orchard.jpg',
  ...Array.from({length:14},(_,i)=>'./assets/crop-'+i+'.jpg')];
self.addEventListener('install',event=>event.waitUntil(caches.open(version).then(cache=>cache.addAll(files)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('verdant-field-')&&key!==version).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
  event.respondWith(fetch(event.request).catch(async()=>await caches.match(event.request) || (event.request.mode==='navigate'?await caches.match('./'):null) || Response.error()));
});
