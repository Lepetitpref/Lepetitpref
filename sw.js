// Le Petit Préf : hors ligne. Coquille et données en cache, données toujours fraîches quand le réseau répond.
const V = "pp-20261113-1817";
const SHELL = ["./", "index.html", "style.css", "app.js", "manifest.webmanifest", "images/mer.jpg", "images/pornic.jpg", "icons/icon-192.png",
  "donnees/events.json", "donnees/cinema.json", "donnees/assos.json", "donnees/transports.json", "donnees/status.json"];
self.addEventListener("install", e => { e.waitUntil(caches.open(V).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  // version.json : toujours le réseau, jamais en cache (sert à détecter une nouvelle version)
  if (/version\.json$/.test(u.pathname)) return;
  // la page : revalidée auprès du serveur (sinon le navigateur peut garder 10 min d'ancienne version)
  const fresh = e.request.mode === "navigate" || /\.html$/.test(u.pathname);
  const req = fresh ? new Request(u.href, { cache: "no-cache", credentials: "same-origin" }) : e.request;
  const key = u.origin + u.pathname;   // une seule entrée par fichier, sans les ?v= / ?maj=
  const fromCache = () => caches.match(key).then(r => r || caches.match(e.request, { ignoreSearch: true })).then(r => r || caches.match("index.html"));
  // réseau d'abord, mais au bout de 3 s on sert la copie gardée si elle existe
  e.respondWith(new Promise(resolve => {
    let done = false;
    const t = setTimeout(() => fromCache().then(r => { if (r && !done) { done = true; resolve(r); } }), 3000);
    fetch(req).then(r => {
      if (r.ok) { const c = r.clone(); caches.open(V).then(x => x.put(key, c)); }
      if (!done) { done = true; clearTimeout(t); resolve(r); }
    }).catch(() => fromCache().then(r => { if (!done) { done = true; clearTimeout(t); resolve(r || Response.error()); } }));
  }));
});
