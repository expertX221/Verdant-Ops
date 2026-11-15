/* Offline app shell. Cache-after-visit avoids falsely implying a fresh install works without network. */
const CACHE='verdant-ops-v5b-ai-20261115-r10';
const SHELL=['./','./index.html','./style.css','./intelligence.css','./app.js','./crop-intelligence.js','./intelligence.js','./farm-layout.js','./farm-renderer.js','./assets/geometry-bootstrap.js','./assets/geometry-parts/part-01.js','./assets/geometry-parts/part-02.js','./assets/geometry-parts/part-03.js','./assets/geometry-parts/part-04.js','./assets/geometry-parts/part-05.js','./assets/geometry-parts/part-06.js','./assets/geometry-parts/part-07.js','./assets/geometry-parts/part-08.js','./assets/geometry-parts/part-09.js','./assets/greenhouse.jpg','./manifest.webmanifest','./icons/verdant.svg',...Array.from({length:14},(_,i)=>`./assets/crop-${i}.jpg`),'./assets/barn.jpg','./assets/silo.jpg','./assets/tractor.jpg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('verdant-ops-')&&k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()])));
// Fetch active application code from the network when online to avoid old AI
// runtime configuration being served indefinitely from a previous cache.
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
 const url=new URL(req.url);
 if(url.pathname.startsWith('/api/'))return;
 const activeCode=url.pathname==='/'||/\.(?:html|js|css|json)$/.test(url.pathname);
 event.respondWith(caches.match(req).then(async cached=>{
  const cacheFresh=async response=>{
   if(response&&response.ok){
    const copy=response.clone();
    caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{});
   }
   return response;
  };
  if(activeCode){
   try{return await cacheFresh(await fetch(req));}
   catch{return cached||Response.error();}
  }
  if(cached)return cached;
  try{return await cacheFresh(await fetch(req));}
  catch{return Response.error();}
 }));
});
