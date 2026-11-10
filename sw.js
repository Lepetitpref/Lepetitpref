// Le Petit Préf : hors ligne. Coquille en cache, données toujours fraîches quand le réseau répond.
const V = "pp-20261110-0923";
const SHELL = ["./", "index.html", "style.css", "app.js", "manifest.webmanifest", "images/accueil.jpg", "images/mer.jpg", "icons/icon-192.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  // réseau d'abord (données et page), cache en secours
  // la page et version.json : toujours revalidées auprès du serveur (sinon le navigateur peut garder 10 min d'ancienne version)
  const fresh = e.request.mode === "navigate" || /version\.json|\.html$/.test(u.pathname);
  const req = fresh ? new Request(u.href, { cache: "no-cache", credentials: "same-origin" }) : e.request;
  e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(V).then(x => x.put(e.request, c)); return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match("index.html"))));
});
