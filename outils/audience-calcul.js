// Calcul de l'audience du Petit Préf, commun au relevé du matin (outils/audience.js, Node) et à la page en direct de l'éditeur (navigateur).
// construire({ tout, cache, appjs, maintenant }) : tout(clés sans « quiz-pp- ») → Promise des valeurs (null si illisible) ;
// cache = jours déjà relus { "AAAA-MM-JJ": rang } ; appjs = texte d'app.js (liste RUB de la recherche).
(function (racine) {
var paris = function (t) { return new Date(t).toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' }); };
var plus = function (j, n) { var d = new Date(j + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
var sem = function (j) { var d = new Date(j + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7) + 3); var y = d.getUTCFullYear(); return y + '-s' + String(1 + Math.floor((d - Date.UTC(y, 0, 1)) / 6048e5)).padStart(2, '0'); };
var LANCEMENT = '2026-11-10', MESURES2 = '2026-11-18'; // 1er jour entier des nouvelles mesures (semaines, sources, actions…, en ligne le 17/11 vers 9h)
var VUESJ = '2026-11-15'; // 1er jour entier des compteurs par rubrique et par jour
var COMPARABLE = '2026-11-12'; // la période de comparaison ne doit pas contenir le lancement (10 et 11/11)
var VUES = ['sejour', 'agenda', 'activites', 'cine', 'soirees', 'mer', 'spots', 'naviguer', 'peche', 'plages', 'manger', 'venir', 'pratique', 'immobilier', 'recherche', 'installer', 'apropos'];
var NOMS = { sejour: 'Accueil', agenda: 'Agenda', activites: 'Activités', cine: 'Ciné', soirees: 'Soirées', mer: 'Mer', spots: 'Spots et glisse', naviguer: 'Naviguer', peche: 'Pêche à pied', plages: 'Plages', manger: 'Restos', venir: 'Transports', pratique: 'Pratique', immobilier: 'Immobilier', recherche: 'Recherche', installer: "Installer l'app", apropos: 'À propos' };
var SRC = ['direct', 'moteur', 'reseau', 'site', 'partage', 'campagne', 'app', 'interne'];
var CAMP = ['qr', 'affiche', 'fb', 'insta', 'flyer', 'mail']; // ?via= sans suffixe (une affiche précise : ajouter son nom ici, ex. 'qr-port')
var ACTS = ['appeler', 'sms', 'itineraire', 'site', 'calendrier', 'bande-annonce'];
var CH = ['appareils', 'appareils-nouveaux', 'vues', 'app', 'app-premiere', 'chargements', 'partage', 'arrivee-partage', 'installation',
  'visite-30s', 'visite-60s', 'visite-180s', 'visite-600s', 'rubriques-1', 'rubriques-2', 'rubriques-3-4', 'rubriques-5p',
  'retour-1', 'retour-2-7', 'retour-8-30', 'retour-31p', 'recherche', 'recherche-vide', 'langue-en', 'erreur-js', 'erreur-donnees',
  'choix-habitant', 'choix-visite', 'usage-spot', 'usage-trajet', 'usage-immo-adresse', 'usage-carte',
  'type-iphone', 'type-android', 'type-tablette', 'type-ordi', 'lieu-prefailles', 'lieu-pornic',
  'installation-iphone', 'installation-android', 'installation-tablette', 'installation-ordi',
  'clic-installer-iphone', 'clic-installer-android', 'clic-installer-tablette', 'clic-installer-ordi',
  'page-installer-iphone', 'page-installer-android', 'page-installer-tablette', 'page-installer-ordi']
  .concat(SRC.map(function (s) { return 'source-' + s; }), SRC.map(function (s) { return 'source-nouveau-' + s; }),
    ACTS.map(function (a) { return 'act-' + a; }), VUES.map(function (v) { return 'vue-' + v; }),
    VUES.map(function (v) { return 'entree-' + v; }), VUES.map(function (v) { return 'actv-' + v; }), CAMP.map(function (c) { return 'arrivee-' + c; }));
// Corrections : appareils de l'éditeur comptés avant leur exclusion (le compteur ne sait pas retirer).
var CORR = { '2026-11-10': { appareils: -2, appareils_nouveaux: -2, app: -1 } }, CORR_TOTAL = -2;
var ecrire = function (n, v) { fs.writeFileSync(path.join(out, n + '.json'), JSON.stringify(v, null, 1)); };
var col = function (c) { return c.replace(/-/g, '_'); };
var col = function (c) { return c.replace(/-/g, '_'); };
async function construire(o) {
  var tout = o.tout, AUJ = paris(o.maintenant || Date.now());

  var ds = []; for (var j = LANCEMENT; j <= AUJ; j = plus(j, 1)) ds.push(j);
  var cache = o.cache || {};
  var lu = ds.filter(function (d) { var c = cache[d]; return !c || c._cles !== CH.length || d >= plus(AUJ, -3) || CH.some(function (k) { return c[col(k)] == null; }); });
  var ks = []; lu.forEach(function (d) { CH.forEach(function (c) { ks.push(c + '-' + d); }); });
  var v = await tout(ks);
  lu.forEach(function (d, i) { var r = { jour: d, _cles: CH.length }; CH.forEach(function (c, k) { r[col(c)] = v[i * CH.length + k]; }); cache[d] = r; });
  var jours = ds.map(function (d) {
    var r = Object.assign({}, cache[d]); delete r._cles; var c = CORR[d];
    if (c) Object.keys(c).forEach(function (k) { if (r[k] != null) r[k] = Math.max(0, r[k] + c[k]); });
    // iPhone : la 1re ouverture de l'app installée était comptée comme nouvel appareil avant le 17/11 (on ne peut pas la retirer avant)
    r.appareils_revenus = r.appareils == null ? null : Math.max(0, r.appareils - (r.appareils_nouveaux || 0) - (r.app_premiere || 0));
    r.actions = ACTS.reduce(function (a, k) { return a + (r['act_' + col(k)] || 0); }, 0);
    r.retours = ['retour_1', 'retour_2_7', 'retour_8_30', 'retour_31p'].reduce(function (a, k) { return a + (r[k] || 0); }, 0);
    r.en_cours = d === AUJ; r.nouvelles_mesures = d >= MESURES2; r.incomplet = CH.some(function (k) { return r[col(k)] == null; }); return r;
  });
  // 7 jours complets (jusqu'à hier) contre les 7 précédents
  var hier = plus(AUJ, -1), A = jours.filter(function (r) { return r.jour > plus(hier, -7) && r.jour <= hier; }), B = jours.filter(function (r) { return r.jour > plus(hier, -14) && r.jour <= plus(hier, -7); });
  var S = function (L, k) { return L.reduce(function (a, r) { return a + (r[k] || 0); }, 0); };
  // semaines (appareils différents) et mois
  var semaines = [], vu = {}; ds.forEach(function (d) { var w = sem(d); if (!vu[w]) { vu[w] = 1; semaines.push(w); } });
  var mois = []; ds.forEach(function (d) { var m = d.slice(0, 7); if (mois.indexOf(m) < 0) mois.push(m); });
  var sv = await tout(semaines.map(function (w) { return 'appareils-sem-' + w; })), mv = await tout(mois.map(function (m) { return 'appareils-mois-' + m; }));
  var semJours = function (w) { return jours.filter(function (r) { return sem(r.jour) === w; }); };
  var semRows = semaines.map(function (w, i) { var L = semJours(w); return { periode: w, type: 'semaine', du: L[0].jour, au: L[L.length - 1].jour, jours: L.length, complete: L.length === 7 && !L.some(function (r) { return r.en_cours; }) && L[0].jour >= MESURES2, appareils_differents: sv[i], appareils_jours: S(L, 'appareils'), vues: S(L, 'vues'), actions: S(L, 'actions'), mesure: L[0].jour >= MESURES2, partielle_depuis: L[0].jour < MESURES2 && L[L.length - 1].jour >= MESURES2 ? MESURES2 : null }; });
  mois.forEach(function (m, i) { var L = jours.filter(function (r) { return r.jour.slice(0, 7) === m; }); semRows.push({ periode: m, type: 'mois', du: L[0].jour, au: L[L.length - 1].jour, jours: L.length, complete: false, appareils_differents: mv[i], appareils_jours: S(L, 'appareils'), vues: S(L, 'vues'), actions: S(L, 'actions'), mesure: L[0].jour >= MESURES2, partielle_depuis: L[0].jour < MESURES2 && L[L.length - 1].jour >= MESURES2 ? MESURES2 : null }); });
  // cohortes : semaine de 1re visite × semaine de retour
  var co = []; semaines.forEach(function (a, i) { semaines.slice(i).forEach(function (b) { co.push([a, b]); }); });
  var cv = await tout(co.map(function (x) { return 'cohorte-' + x[0] + '-' + x[1]; }));
  var cohortes = co.map(function (x, i) { return { premiere: x[0], semaine: x[1], ecart: semaines.indexOf(x[1]) - semaines.indexOf(x[0]), appareils: cv[i] }; }).filter(function (r) { return r.appareils; });
  // rubriques (7 jours complets et précédents ; entrées ; actions)
  var pv = await tout(VUES.map(function (x) { return 'vue-' + x; }));
  var p7ok = A.length === 7 && A[0].jour >= VUESJ, pAvOk = B.length === 7 && B[0].jour >= VUESJ;
  var pages = VUES.map(function (x, i) { var k = col('vue-' + x); return { rubrique: NOMS[x], cle: x, vues_7j: p7ok ? S(A, k) : null, vues_7j_avant: pAvOk ? S(B, k) : null, vues_depuis_15_11: S(jours.filter(function (r) { return r.jour >= VUESJ && !r.en_cours; }), k), entrees_7j: S(A, col('entree-' + x)), actions_7j: S(A, col('actv-' + x)), vues_total: pv[i] || 0, page_arrivee: x === 'sejour' }; })
    .sort(function (a, b) { return ((b.vues_7j || 0) - (a.vues_7j || 0)) || (b.vues_total - a.vues_total); });
  // recherches : rubriques trouvées (liste RUB d'app.js)
  var rub = []; try { var src = o.appjs || '', m, re = /\["[^"]*","([^"]+)","([a-z]+\|[a-z0-9=|-]*)","[a-z]+"\]/g; while ((m = re.exec(src))) rub.push([m[1], m[2]]); } catch (x) {}
  var rubK = rub.map(function (r) { return 'recherche-rub-' + r[1].replace(/[^a-z0-9]+/g, '-').replace(/-+$/, ''); });
  var rv = await tout(rubK.concat(['recherche', 'recherche-vide', 'recherche-fiche']));
  var recherches = rub.map(function (r, i) { return { trouve: r[0], recherches: rv[i] || 0 }; }).filter(function (r) { return r.recherches; }).sort(function (a, b) { return b.recherches - a.recherches; });
  var nRub = rub.length; recherches.push({ trouve: 'Une fiche (événement, lieu…)', recherches: rv[nRub + 2] || 0 }, { trouve: 'Rien trouvé', recherches: rv[nRub + 1] || 0, vide: true });
  // totaux depuis le début (compteurs sans date)
  var tot = await tout(['appareils', 'installation', 'app-premiere', 'partage', 'chargements'].concat(ACTS.map(function (a) { return 'act-' + a; })));
  var total = tot[0] == null ? null : Math.max(0, tot[0] + CORR_TOTAL);
  var installs = S(jours, 'installation');
  var r0 = { maj: new Date().toISOString(), du: A.length ? A[0].jour : null, au: hier, du_avant: B.length ? B[0].jour : null, au_avant: B.length ? B[B.length - 1].jour : null,
    avant_ok: B.length === 7 && B[0].jour >= COMPARABLE, nouv_ok: A.length === 7 && A[0].jour >= MESURES2, nouv_avant_ok: B.length === 7 && B[0].jour >= MESURES2, nouv_comparable_le: plus(MESURES2, 14),
    // surdispersion : variance / moyenne des appareils par jour sur les 14 jours (à partir du 15/11) ; > 1 = les jours varient plus que le hasard seul
    phi: (function () { var v = A.concat(B).filter(function (r) { return r.jour >= '2026-11-15'; }).map(function (r) { return r.appareils || 0; }); if (v.length < 4) return 1; var m = v.reduce(function (a, b) { return a + b; }, 0) / v.length; if (!m) return 1; var q = v.reduce(function (a, b) { return a + (b - m) * (b - m); }, 0) / (v.length - 1); return Math.max(1, Math.round(100 * q / m) / 100); })(), rubriques_7j_ok: p7ok, comparable_le: plus(COMPARABLE, 14),
    hier: hier, appareils_hier: (jours.find(function (r) { return r.jour === hier; }) || {}).appareils || 0,
    moyenne_3j: Math.round(10 * S(jours.filter(function (r) { return r.jour > plus(hier, -3) && r.jour <= hier; }), 'appareils') / 3) / 10,
    moyenne_hors_lancement_7j: (function () { var L = A.filter(function (r) { return r.jour > '2026-11-11'; }); return L.length ? Math.round(10 * S(L, 'appareils') / L.length) / 10 : null; })(),
    appareils_depuis_debut: total, installations_depuis_debut: Math.max(installs, tot[1] || 0) + S(jours, 'app_premiere'), lancement: LANCEMENT, mesures_depuis: MESURES2 };
  [['appareils_jours', 'appareils'], ['nouveaux', 'appareils_nouveaux'], ['revenus', 'appareils_revenus'], ['vues', 'vues'], ['chargements', 'chargements'], ['actions', 'actions'], ['appels', 'act_appeler'], ['itineraires', 'act_itineraire'], ['calendrier', 'act_calendrier'], ['sites', 'act_site'],
    ['partages', 'partage'], ['arrivees_partage', 'arrivee_partage'], ['app', 'app'], ['installations', 'installation'], ['app_premiere', 'app_premiere'], ['recherches', 'recherche'], ['recherches_vides', 'recherche_vide'], ['erreurs_js', 'erreur_js'], ['erreurs_donnees', 'erreur_donnees'], ['retours', 'retours']]
    .forEach(function (p) { r0[p[0] + '_7j'] = S(A, p[1]); r0[p[0] + '_7j_avant'] = S(B, p[1]); });
  var wPrev = semRows.filter(function (r) { return r.type === 'semaine' && r.complete; });
  r0.semaine = wPrev.length ? wPrev[wPrev.length - 1].periode : null; r0.appareils_semaine = wPrev.length ? wPrev[wPrev.length - 1].appareils_differents : null;
  r0.appareils_semaine_avant = wPrev.length > 1 ? wPrev[wPrev.length - 2].appareils_differents : null;
  CAMP.forEach(function (c) { r0['campagne_' + c + '_7j'] = S(A, 'arrivee_' + c); });
  return { fichiers: { jours: jours, pages: pages, resume: [r0], semaines: semRows, cohortes: cohortes, recherches: recherches }, cache: cache, cles: ks.length };
}
var API = { construire: construire, CH: CH, LANCEMENT: LANCEMENT, paris: paris };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else racine.PPAudience = API;
})(this);
