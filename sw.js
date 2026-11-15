/* Offline app shell. Cache-after-visit avoids falsely implying a fresh install works without network. */
const CACHE='verdant-ops-v5b-20261115-r4';
const SHELL=['./','./index.html','./style.css','./intelligence.css','./app.js','./intelligence.js','./farm-renderer.js','./assets/geometry-bootstrap.js','./assets/geometry-parts/part-01.js','./assets/geometry-parts/part-02.js','./assets/geometry-parts/part-03.js','./assets/geometry-parts/part-04.js','./assets/geometry-parts/part-05.js','./assets/geometry-parts/part-06.js','./assets/geometry-parts/part-07.js','./assets/geometry-parts/part-08.js','./assets/geometry-parts/part-09.js','./assets/greenhouse.jpg','./manifest.webmanifest','./icons/verdant.svg',...Array.from({length:14},(_,i)=>`./assets/crop-${i}.jpg`),'./assets/barn.jpg','./assets/silo.jpg','./assets/tractor.jpg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()])));
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
 const url=new URL(req.url);
 if(url.pathname.startsWith('/api/'))return;
 event.respondWith(caches.match(req).then(cached=>{
   const fresh=fetch(req).then(response=>{
     if(response.ok) {const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(req,copy));}
     return response;
   }).catch(()=>cached);
   return cached||fresh;
 }));
});
