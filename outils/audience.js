#!/usr/bin/env node
// Audience du Petit Préf pour le tableau de bord de l'éditeur (artifact « Le Petit Préf, audience »), jamais affichée sur le site.
// Lit les totaux du compteur de Concret (clés « quiz-pp-… », écrites par app.js : ppVue / ppHit) et écrit des JSON HORS du dépôt.
//   node outils/audience.js <dossier hors dépôt>
// Écrit : jours.json (14 derniers jours), pages.json (vues par rubrique depuis le début), resume.json.
//   --avant <url du dossier déjà publié> : reprend les jours anciens (plus de 2 jours) déjà relevés, pour ne relire que les 2 derniers
//   (utilisé par .github/workflows/site.yml, toutes les 15 min, pour ménager le compteur).
var cp = require('child_process'), fs = require('fs'), path = require('path');
var API = 'https://compteur.square-brook-9d65.workers.dev/get?n=1&k=';
var out = process.argv[2];
if (!out) { console.error('usage : node outils/audience.js <dossier hors dépôt>'); process.exit(2); }
if (path.resolve(out).indexOf(path.resolve(__dirname, '..') + path.sep) === 0) { console.error('Le dossier doit être hors du dépôt.'); process.exit(2); }
fs.mkdirSync(out, { recursive: true });
function lire(k) {
  return new Promise(function (ok) {
    cp.execFile('curl', ['-sS', '-m', '30', API + encodeURIComponent('quiz-pp-' + k)], function (e, o) {
      if (e) return ok(null); try { ok(JSON.parse(o).v[0] || 0); } catch (x) { ok(null); }
    });
  });
}
async function tout(ks) { var o = []; for (var i = 0; i < ks.length; i += 24) o = o.concat(await Promise.all(ks.slice(i, i + 24).map(lire))); return o; }
var jour = function (n) { return new Date(Date.now() - n * 864e5).toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' }); };
var VUES = ['sejour', 'agenda', 'activites', 'cine', 'soirees', 'mer', 'spots', 'manger', 'venir', 'peche', 'pratique', 'recherche', 'installer', 'apropos'];
var NOMS = { sejour: 'Accueil', agenda: 'Agenda', activites: 'Activités', cine: 'Ciné', soirees: 'Soirées', mer: 'Mer', spots: 'Spots et glisse', manger: 'Restos', venir: 'Transports', peche: 'Pêche à pied', pratique: 'Pratique', recherche: 'Recherche', installer: "Installer l'app", apropos: 'À propos' };
var CH = ['appareils', 'appareils-nouveaux', 'vues', 'app', 'partage', 'profil-habitant', 'profil-visite', 'profil-aucun', 'visite-30s', 'visite-60s', 'visite-180s', 'visite-600s', 'installation', 'type-iphone', 'type-android', 'type-tablette', 'type-ordi', 'installation-iphone', 'installation-android', 'installation-tablette', 'installation-ordi', 'clic-installer-iphone', 'clic-installer-android', 'clic-installer-tablette', 'clic-installer-ordi', 'page-installer-iphone', 'page-installer-android', 'page-installer-tablette', 'page-installer-ordi', 'lieu-prefailles', 'lieu-pornic', 'base-pornic', 'base-prefailles'];
// Corrections : appareils de l'éditeur comptés avant leur exclusion (le compteur ne sait pas retirer).
var CORR = { '2026-11-10': { appareils: -2, appareils_nouveaux: -2, app: -1 } }, CORR_TOTAL = -2;
var ecrire = function (n, v) { fs.writeFileSync(path.join(out, n + '.json'), JSON.stringify(v, null, 1)); };
(async function () {
  var ds = []; for (var n = 13; n >= 0; n--) ds.push(jour(n));
  var avant = {}, ia = process.argv.indexOf('--avant');
  if (ia > 0 && process.argv[ia + 1]) {
    try { var rq = await fetch(process.argv[ia + 1].replace(/\/?$/, '/') + 'jours.json?t=' + Date.now()); if (rq.ok) (await rq.json()).forEach(function (r) { if (r && r.jour && r.vues != null) avant[r.jour] = r; }); } catch (x) {}
  }
  var lu = ds.filter(function (d, i) { return i >= ds.length - 2 || !avant[d]; });
  var ks = []; lu.forEach(function (d) { CH.forEach(function (c) { ks.push(c + '-' + d); }); });
  var v = await tout(ks), jours = ds.map(function (d) {
    var i = lu.indexOf(d); if (i < 0) return avant[d];
    var r = { jour: d }; CH.forEach(function (c, j) { r[c.replace(/-/g, '_')] = v[i * CH.length + j]; });
    r.appareils_revenus = r.appareils == null ? null : Math.max(0, r.appareils - (r.appareils_nouveaux || 0)); return r;
  });
  jours.forEach(function (r) { var c = CORR[r && r.jour]; if (!c || r.corrige) return; Object.keys(c).forEach(function (k) { if (r[k] != null) r[k] = Math.max(0, r[k] + c[k]); });
    r.appareils_revenus = r.appareils == null ? null : Math.max(0, r.appareils - (r.appareils_nouveaux || 0)); r.corrige = true; });
  var pv = await tout(VUES.map(function (x) { return 'vue-' + x; }));
  var pages = VUES.map(function (x, i) { return { rubrique: NOMS[x], vues: pv[i] }; }).sort(function (a, b) { return (b.vues || 0) - (a.vues || 0); });
  var total = await lire('appareils'); if (total != null) total = Math.max(0, total + CORR_TOTAL);
  var s7 = function (k) { return jours.slice(-7).reduce(function (a, r) { return a + (r[k] || 0); }, 0); };
  ecrire('jours', jours); ecrire('pages', pages);
  ecrire('resume', [{ maj: new Date().toISOString(), appareils_depuis_debut: total, appareils_7j: s7('appareils'), nouveaux_7j: s7('appareils_nouveaux'), vues_7j: s7('vues'), partages_7j: s7('partage'), app_7j: s7('app') }]);
  console.log('OK', out, 'appareils depuis le début :', total);
})();
