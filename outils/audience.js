#!/usr/bin/env node
// Audience du Petit Préf pour le tableau de bord de l'éditeur (« Le Petit Préf, audience »), jamais affichée sur le site.
// Lit les totaux du compteur (clés « quiz-pp-… », écrites par app.js) et écrit des JSON HORS du dépôt ; le calcul est dans audience-calcul.js
// (le même que la page en direct de l'éditeur).
//   node outils/audience.js <dossier hors dépôt> [--cache <fichier>]
// Écrit jours.json, pages.json, resume.json, semaines.json, cohortes.json, recherches.json, google.json (Search Console).
// Clé du compteur : variable PP_CLE (en-tête X-Pp-Key) si elle est définie ; sinon le proxy de la session l'ajoute s'il la connaît.
// Lecture : d'abord tout d'un coup (/pp), sinon clé par clé (/get) avec un cache des jours de plus de 3 jours.
var cp = require('child_process'), fs = require('fs'), path = require('path');
var C = require('./audience-calcul.js');
var BASE = 'https://compteur.square-brook-9d65.workers.dev';
var out = process.argv[2];
if (!out || out[0] === '-') { console.error('usage : node outils/audience.js <dossier hors dépôt> [--cache <fichier>]'); process.exit(2); }
if (path.resolve(out).indexOf(path.resolve(__dirname, '..') + path.sep) === 0) { console.error('Le dossier doit être hors du dépôt.'); process.exit(2); }
fs.mkdirSync(out, { recursive: true });
var ic = process.argv.indexOf('--cache'), CACHE = ic > 0 ? process.argv[ic + 1] : path.join(path.dirname(path.resolve(out)), 'audience-cache.json');
var H = process.env.PP_CLE ? ['-H', 'X-Pp-Key: ' + process.env.PP_CLE] : [];
var curl = function (u) { return new Promise(function (ok) { cp.execFile('curl', ['-sS', '-m', '60'].concat(H, [u]), { maxBuffer: 64e6 }, function (e, o) { if (e) return ok(null); try { ok(JSON.parse(o)); } catch (x) { ok(null); } }); }); };
function lire(k) {
  return new Promise(function (ok) {
    var essai = function (n) { curl(BASE + '/get?n=1&k=' + encodeURIComponent('quiz-pp-' + k)).then(function (j) { var v = j && j.v ? j.v[0] || 0 : null;
      if (v == null && n < 2) return setTimeout(function () { essai(n + 1); }, 800); ok(v); }); }; essai(0);
  });
}
(async function () {
  var tout, lot = await curl(BASE + '/pp'), mode;
  if (lot && lot.v && typeof lot.v === 'object') { mode = 'lot'; tout = async function (ks) { return ks.map(function (k) { return lot.v['quiz-pp-' + k] || 0; }); }; }
  else { mode = 'clé par clé'; tout = async function (ks) { var o = []; for (var i = 0; i < ks.length; i += 24) o = o.concat(await Promise.all(ks.slice(i, i + 24).map(lire))); return o; }; }
  var cache = {}; if (mode !== 'lot') { try { cache = JSON.parse(fs.readFileSync(CACHE, 'utf8')).jours || {}; } catch (x) {} }
  var r = await C.construire({ tout: tout, cache: cache, appjs: fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8') });
  if (mode !== 'lot') { try { fs.writeFileSync(CACHE, JSON.stringify({ maj: new Date().toISOString(), jours: r.cache })); } catch (x) {} }
  // Google (Search Console) : relevé du matin par .github/workflows/gsc.yml → 6kuqzmvck2kxhi/gsc.json
  try {
    var g = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '6kuqzmvck2kxhi', 'gsc.json'), 'utf8')), rs = r.fichiers.resume[0];
    var j7 = (g.jours || []).slice(-7), som = function (L, f) { return L.reduce(function (a, x) { return a + (x[f] || 0); }, 0); };
    rs.google_maj = g.maj; rs.google_dernier_jour = (g.jours || []).length ? g.jours[g.jours.length - 1].d : null;
    rs.google_clics = g.total.clics; rs.google_aff = g.total.aff; rs.google_ctr = g.total.ctr; rs.google_pos = g.total.pos;
    rs.google_clics_7j = som(j7, 'clics'); rs.google_aff_7j = som(j7, 'aff');
    var NOMS = { '/agenda/': 'Agenda', '/cinema/': 'Cinéma', '/marees/': 'Marées', '/restaurants/': 'Restaurants', '/marches/': 'Marchés', '/plages/': 'Plages', '/que-faire/': 'Que faire', '/pornic/': 'Pornic', '/saint-brevin/': 'Saint-Brevin', '/la-bernerie/': 'La Bernerie', '/la-plaine-sur-mer/': 'La Plaine-sur-Mer', '/saint-michel-chef-chef/': 'Saint-Michel-Chef-Chef', '/les-moutiers/': 'Les Moutiers' };
    var nomP = function (p) { return NOMS[p] || (p === '/' ? "L'app (page d'accueil)" : p.replace(/^\/|\/$/g, '').replace(/-/g, ' ').replace(/^./, function (c) { return c.toUpperCase(); })); };
    r.fichiers.google = (g.pages_28j || []).map(function (x) { return { k: 'p' + x.page, type: 'page', quoi: nomP(x.page), n: x.aff, clics: x.clics, pos: x.pos }; })
      .concat((g.recherches_28j || []).map(function (x, i) { return { k: 'q' + i, type: 'recherche', quoi: x.q, n: x.aff, clics: x.clics, pos: x.pos }; }))
      .concat((g.jours || []).map(function (x) { return { k: 'j' + x.d, type: 'jour', quoi: x.d, n: x.aff, clics: x.clics, pos: x.pos }; }));
  } catch (x) { console.log('Search Console : pas de relevé (' + x.message + ')'); }
  // D'où viennent les arrivées « autre site » et « réseaux » (nom du site seulement, liste fermée d'app.js, depuis le 27/11/2026)
  try {
    var appsrc = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
    var sites = JSON.parse(appsrc.match(/const PPSITES=(\[[^\]]*\]);/)[1]).map(function (d) { return d.replace(/[^a-z0-9]+/g, '-'); }).concat(['autre']);
    var res = (appsrc.match(/const PPRES=\[(.*?)\];\n/)[1].match(/\["([a-z]+)"/g) || []).map(function (x) { return x.slice(2, -1); }).concat(['autre']);
    var vs = await tout(sites.map(function (d) { return 'origine-site-' + d; })), vr = await tout(res.map(function (d) { return 'origine-reseau-' + d; }));
    var txt = function (L, V) { return L.map(function (d, i) { return [d === 'autre' ? 'autres' : d.replace(/-(com|fr|org|ai|net)$/, '.$1'), V[i] || 0]; }).filter(function (x) { return x[1]; }).sort(function (a, b) { return b[1] - a[1]; }).map(function (x) { return x[0] + ' ' + x[1]; }).join(' · '); };
    r.fichiers.resume[0].origines_site = txt(sites, vs); r.fichiers.resume[0].origines_reseau = txt(res, vr);
  } catch (x) { console.log('Origines : non calculées (' + x.message + ')'); }
  // Ce qui intéresse : compteurs par fiche (app.js : fv = fiche ouverte, fa = ajout à l'agenda, fc = appel/itinéraire/site/partage), depuis le 27/11/2026.
  // On relit fv pour toutes les fiches connues, puis fa et fc seulement pour celles qui ont été ouvertes (et pour les films).
  try {
    var slug = function (t) { return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48); };
    var R0 = path.join(__dirname, '..'), lireJ = function (f) { try { return JSON.parse(fs.readFileSync(path.join(R0, f), 'utf8')); } catch (x) { return []; } };
    var fiches = [], vus = {}, ajoute = function (it, quoi, type, quand) { if (!it || vus[it]) return; vus[it] = 1; fiches.push({ it: it, quoi: quoi, type: type, quand: quand || '' }); };
    var lim = new Date(Date.now() - 45 * 864e5).toISOString().slice(0, 10);
    lireJ('donnees/events.json').forEach(function (e) { if (/^[\w-]+$/.test(e.id) && (e.end || e.date) >= lim) ajoute('e-' + e.id, e.title, 'Événement', e.date + (e.town ? ' · ' + e.town : '')); });
    var src = fs.readFileSync(path.join(R0, 'app.js'), 'utf8'), i0 = src.indexOf('ACTS=') + 5, acts = [];
    try { var d = 0, q = false, j = i0; for (; j < src.length; j++) { var ch = src[j]; if (q) { if (ch === '\\') j++; else if (ch === '"') q = false; } else if (ch === '"') q = true; else if (ch === '[') d++; else if (ch === ']') { d--; if (!d) break; } } acts = JSON.parse(src.slice(i0, j + 1)); } catch (x) { acts = []; }
    acts.forEach(function (a) { ajoute('l-' + slug(a.n), a.n, 'Lieu', a.town || ''); });
    var films = {}; lireJ('donnees/cinema.json').forEach(function (c) { films[c.film] = 1; });
    Object.keys(films).forEach(function (f) { ajoute('c-' + slug(f), f, 'Film', ''); });
    var fv = await tout(fiches.map(function (f) { return 'fv-' + f.it; }));
    var suite = fiches.filter(function (f, i) { return fv[i] || f.type === 'Film'; });
    var fa = await tout(suite.map(function (f) { return 'fa-' + f.it; })), fc = await tout(suite.map(function (f) { return 'fc-' + f.it; }));
    var V = {}; fiches.forEach(function (f, i) { V[f.it] = fv[i] || 0; });
    r.fichiers.interets = suite.map(function (f, i) { return { k: f.it, quoi: f.quoi, type: f.type, detail: f.quand, ouvertures: V[f.it], agenda: fa[i] || 0, contacts: fc[i] || 0 }; })
      .filter(function (x) { return x.ouvertures + x.agenda + x.contacts > 0; })
      .sort(function (a, b) { return (b.ouvertures + 3 * b.agenda + 3 * b.contacts) - (a.ouvertures + 3 * a.agenda + 3 * a.contacts); });
    if (!r.fichiers.interets.length) r.fichiers.interets = [{ k: 'vide', quoi: '', type: '', detail: '', ouvertures: 0, agenda: 0, contacts: 0 }];
    console.log('Ce qui intéresse :', fiches.length, 'fiches relues,', r.fichiers.interets.length, 'avec au moins un geste');
  } catch (x) { console.log('Ce qui intéresse : non calculé (' + x.message + ')'); }
  Object.keys(r.fichiers).forEach(function (n) { fs.writeFileSync(path.join(out, n + '.json'), JSON.stringify(r.fichiers[n], null, 1)); });
  console.log('OK', out, 'appareils depuis le début :', r.fichiers.resume[0].appareils_depuis_debut, '· lecture', mode);
})();
