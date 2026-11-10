// Compteur d'audience du Petit Préf : un Worker Cloudflare relié à une base D1 (liaison « DB »).
// Indépendant de tout autre site. Aucun identifiant, aucun cookie, aucune adresse IP gardée : seulement des totaux.
//
//   POST /hit?k=<clé>            +1 sur la clé (appelé par app.js, seulement depuis lepetitpref.fr)
//   GET  /tout                   tous les totaux {clé: valeur}       (en-tête X-Lecture = secret LECTURE)
//   POST /ajoute?k=<clé>&n=<±n>  correction ou reprise d'un total    (en-tête X-Lecture = secret LECTURE)
//
// Réglages dans Cloudflare : liaison D1 nommée DB ; secret LECTURE (texte long et aléatoire).

const ORIGINES = ["https://lepetitpref.fr", "https://www.lepetitpref.fr"];
const CLE = /^[a-z0-9][a-z0-9-]{0,63}$/;
let pret = false;

function entetes(req) {
  const o = req.headers.get("Origin") || "";
  return {
    "Access-Control-Allow-Origin": ORIGINES.includes(o) ? o : ORIGINES[0],
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "X-Lecture",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  };
}
const rep = (req, corps, statut = 200) => new Response(JSON.stringify(corps), { status: statut, headers: entetes(req) });

async function base(env) {
  if (!pret) { await env.DB.prepare("CREATE TABLE IF NOT EXISTS c (k TEXT PRIMARY KEY, v INTEGER NOT NULL DEFAULT 0)").run(); pret = true; }
  return env.DB;
}
function autorise(req, env) {
  const t = req.headers.get("X-Lecture") || "";
  if (!env.LECTURE || t.length !== env.LECTURE.length) return false;
  let d = 0; for (let i = 0; i < t.length; i++) d |= t.charCodeAt(i) ^ env.LECTURE.charCodeAt(i);
  return d === 0;
}
async function ajoute(env, k, n) {
  const db = await base(env);
  await db.prepare("INSERT INTO c (k, v) VALUES (?1, ?2) ON CONFLICT(k) DO UPDATE SET v = MAX(0, v + ?2)").bind(k, n).run();
}

export default {
  async fetch(req, env) {
    const u = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: entetes(req) });
    try {
      if (u.pathname === "/hit" && req.method === "POST") {
        const k = u.searchParams.get("k") || "";
        if (!ORIGINES.includes(req.headers.get("Origin") || "") || !CLE.test(k)) return rep(req, { erreur: "refusé" }, 403);
        await ajoute(env, k, 1);
        return rep(req, { ok: true });
      }
      if (u.pathname === "/tout" && req.method === "GET") {
        if (!autorise(req, env)) return rep(req, { erreur: "refusé" }, 403);
        const db = await base(env);
        const { results } = await db.prepare("SELECT k, v FROM c").all();
        const o = {}; for (const r of results) o[r.k] = r.v;
        return rep(req, { maj: new Date().toISOString(), v: o });
      }
      if (u.pathname === "/ajoute" && req.method === "POST") {
        const k = u.searchParams.get("k") || "", n = parseInt(u.searchParams.get("n") || "", 10);
        if (!autorise(req, env) || !CLE.test(k) || !Number.isFinite(n) || Math.abs(n) > 100000) return rep(req, { erreur: "refusé" }, 403);
        await ajoute(env, k, n);
        return rep(req, { ok: true });
      }
      return rep(req, { erreur: "inconnu" }, 404);
    } catch (e) {
      return rep(req, { erreur: "indisponible" }, 503);
    }
  },
};
