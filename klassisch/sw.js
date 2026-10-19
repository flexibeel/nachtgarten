const V="ngk-c6e82c406b";const SHELL=["./","index.html","manifest.webmanifest","fonts/bricolage.woff","fonts/onest.woff","fonts/jetbrains.woff","icons/icon-192.png","icons/icon-512.png","icons/apple-touch-icon.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith("ngk-")&&k!==V&&k!=="ngk-demos").map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{const u=new URL(e.request.url);if(e.request.method!=="GET"||u.origin!==location.origin||!u.pathname.startsWith(new URL(self.registration.scope).pathname))return;
 if(u.pathname.includes("/demos/")){e.respondWith(caches.open("ngk-demos").then(c=>c.match(e.request).then(r=>r||fetch(e.request).then(n=>{if(n.ok)c.put(e.request,n.clone());return n}))));return}
 if(e.request.mode==="navigate"){e.respondWith(fetch(e.request).then(n=>{caches.open(V).then(c=>c.put("index.html",n.clone()));return n}).catch(()=>caches.open(V).then(c=>c.match("index.html"))));return}
 e.respondWith(caches.open(V).then(c=>c.match(e.request)).then(r=>r||fetch(e.request)))});
