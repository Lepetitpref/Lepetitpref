#!/usr/bin/env node
// Audience du Petit Préf pour le tableau de bord de l'éditeur (« Le Petit Préf, audience »), jamais affichée sur le site.
// Lit les totaux du compteur (clés « quiz-pp-… », écrites par app.js) et écrit des JSON HORS du dépôt ; le calcul est dans audience-calcul.js
// (le même que la page en direct de l'éditeur).
//   node outils/audience.js <dossier hors dépôt> [--cache <fichier>]
// Écrit jours.json, pages.json, resume.json, semaines.json, cohortes.json, recherches.json.
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
  Object.keys(r.fichiers).forEach(function (n) { fs.writeFileSync(path.join(out, n + '.json'), JSON.stringify(r.fichiers[n], null, 1)); });
  console.log('OK', out, 'appareils depuis le début :', r.fichiers.resume[0].appareils_depuis_debut, '· lecture', mode);
})();
