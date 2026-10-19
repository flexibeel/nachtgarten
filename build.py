import re,shutil,os,hashlib,json
src=open("src/app.html").read()
# Version der deutschen Übungsanleitungen (demos/i18n) für ?v= im Nachladen; demos/ wird nie gelöscht
_h=hashlib.sha1()
for _f in sorted(os.listdir("demos/i18n")) if os.path.isdir("demos/i18n") else []:
  _h.update(open(os.path.join("demos/i18n",_f),"rb").read())
src=src.replace("__EXI18N_V__",_h.hexdigest()[:10])
# remove Google Fonts links
src=re.sub(r'<link[^>]+fonts\.googleapis\.com[^>]*>\s*','',src)
src=re.sub(r'<link[^>]+fonts\.gstatic\.com[^>]*>\s*','',src)
m=re.search(r'<title>(.*?)</title>',src);title="Nachtgarten"
fonts='''<style>
@font-face{font-family:"Bricolage Grotesque";src:url(fonts/bricolage.woff) format("woff");font-weight:200 800;font-stretch:75% 100%;font-display:swap}
@font-face{font-family:"Onest";src:url(fonts/onest.woff) format("woff");font-weight:100 900;font-display:swap}
@font-face{font-family:"JetBrains Mono";src:url(fonts/jetbrains.woff) format("woff");font-weight:100 800;font-display:swap}
</style>'''
# iOS-Startbilder: Pixelgröße -> (CSS-Breite, CSS-Höhe, DPR); Dateien kommen aus design/render_icons.py
SPL={(1320,2868):(440,956,3),(1206,2622):(402,874,3),(1290,2796):(430,932,3),(1179,2556):(393,852,3),(1284,2778):(428,926,3),
 (1170,2532):(390,844,3),(1125,2436):(375,812,3),(1242,2688):(414,896,3),(828,1792):(414,896,2),(750,1334):(375,667,2)}
splash=""
for (pw,ph),(w,h,d) in SPL.items():
  fn=f"icons/splash/splash-{pw}x{ph}.png"
  if os.path.exists(fn):splash+=f'<link rel="apple-touch-startup-image" href="{fn}" media="(device-width: {w}px) and (device-height: {h}px) and (-webkit-device-pixel-ratio: {d}) and (orientation: portrait)">\n'
head=f'''<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Nachtgarten</title>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0F1312">
<script>try{{if(localStorage.getItem("lab.theme")==="light")document.querySelector('meta[name="theme-color"]').content="#F2F2EE"}}catch(e){{}}</script>
<meta name="color-scheme" content="dark light">
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Nachtgarten">
<meta name="description" content="Dein persönlicher Begleiter: Training, Umlenken statt Scrollen, Schwangerschaft & Rückbildung.">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icons/icon-192.png"><link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
{splash}
<style>:root{{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}}body{{margin:0;font:14px system-ui,sans-serif}}img{{max-width:100%}}[hidden]{{display:none!important}}</style>
{fonts}
<script>window.__standalone=true;</script>
</head><body>
'''
tail='''
<script>if("serviceWorker" in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}))}</script>
</body></html>'''
src=re.sub(r"<title>.*?</title>","",src,count=1)
out=head+src+tail
pass
open("index.html","w").write(out)
man={"name":"Nachtgarten","short_name":"Nachtgarten","description":"Dein persönlicher Begleiter für Training, Fokus und Alltag. Ohne Konto, alles bleibt auf deinem Gerät.","id":"./","lang":"de","start_url":"./","scope":"./","display":"standalone","orientation":"portrait","categories":["health","fitness","lifestyle"],"background_color":"#0F1312","theme_color":"#0F1312",
 "shortcuts":[{"name":"Training starten","short_name":"Training","url":"./#live","icons":[{"src":"icons/icon-192.png","sizes":"192x192"}]},{"name":"Umlenken","url":"./#umlenken"},{"name":"10 Minuten ohne Geräte","short_name":"10 Min.","url":"./#kurz"}],
 "icons":[{"src":"icons/icon-192.png","sizes":"192x192","type":"image/png"},{"src":"icons/icon-512.png","sizes":"512x512","type":"image/png"},{"src":"icons/maskable-512.png","sizes":"512x512","type":"image/png","purpose":"maskable"}]}
json.dump(man,open("manifest.webmanifest","w"),ensure_ascii=False,indent=1)
ver=hashlib.sha1(out.encode()).hexdigest()[:10]
sw=f'''const V="ng-{ver}";const SHELL=["./","index.html","manifest.webmanifest","fonts/bricolage.woff","fonts/onest.woff","fonts/jetbrains.woff","icons/icon-192.png","icons/icon-512.png","icons/apple-touch-icon.png"];
self.addEventListener("install",e=>{{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))}});
self.addEventListener("activate",e=>{{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith("ng-")&&k!==V&&k!=="ng-demos").map(k=>caches.delete(k)))).then(()=>self.clients.claim()))}});
self.addEventListener("fetch",e=>{{const u=new URL(e.request.url);if(e.request.method!=="GET"||u.origin!==location.origin||u.pathname.includes("/beta/"))return;
 if(u.pathname.includes("/demos/")){{e.respondWith(caches.open("ng-demos").then(c=>c.match(e.request).then(r=>r||fetch(e.request).then(n=>{{if(n.ok)c.put(e.request,n.clone());return n}}))));return}}
 if(e.request.mode==="navigate"){{e.respondWith(fetch(e.request).then(n=>{{caches.open(V).then(c=>c.put("index.html",n.clone()));return n}}).catch(()=>caches.match("index.html")));return}}
 e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)))}});
'''
open("sw.js","w").write(sw)
open(".nojekyll","w").write("")
print("built",len(out)//1024,"KB, version",ver)
