#!/usr/bin/env node
// Pages pour les moteurs de recherche : une vraie page HTML par sujet (agenda, cinéma, marées, restaurants, marchés, plages,
// que faire), régénérée chaque matin à partir des mêmes données que le site, avec un bouton vers la bonne rubrique de l'app.
// Le site lui-même ne change pas. Écrit aussi sitemap.xml.
//   node outils/pages.js            (depuis la racine du dépôt)
// Les marées et les fiches des lieux viennent du code d'app.js (lignes 1 à 84 : TIDE, ACTS, calcul des marées).
var fs = require('fs'), path = require('path');
var R = path.resolve(__dirname, '..'), J = function (f) { return JSON.parse(fs.readFileSync(path.join(R, f), 'utf8')); };
var SITE = 'https://lepetitpref.fr';
var L = fs.readFileSync(path.join(R, 'app.js'), 'utf8').split('\n');
var stub = 'var document={documentElement:{},querySelector:()=>null,getElementById:()=>null,addEventListener(){}},localStorage={getItem:()=>null,setItem(){}},navigator={language:"fr",userAgent:""},window={addEventListener(){},matchMedia:()=>({matches:false})},location={hash:"",search:"",hostname:"x"},matchMedia=()=>({matches:false});';
var A = new Function(stub + L.slice(0, 84).join('\n') + ';return {ACTS,KINDS,CATS,tidesOfDay,maxCoef};')();
var TZ = 'Europe/Paris';
var auj = new Date().toLocaleDateString('sv-SE', { timeZone: TZ });
var plus = function (j, n) { var d = new Date(j + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
var jourL = function (j) { return new Date(j + 'T12:00:00Z').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }); };
var cap = function (s) { return s.charAt(0).toUpperCase() + s.slice(1); };
var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
// décalage horaire de Paris ce jour-là (+01:00 l'hiver, +02:00 l'été), pour les dates lues par Google
var decal = function (j) { var p = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, timeZoneName: 'shortOffset' }).formatToParts(new Date(j + 'T12:00:00Z')).find(function (x) { return x.type === 'timeZoneName'; }).value.replace('GMT', ''); var m = p.match(/([+-])(\d+)(?::(\d+))?/); return m ? m[1] + ('0' + m[2]).slice(-2) + ':' + (m[3] || '00') : '+00:00'; };
var heure = function (ms) { return new Date(ms).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: TZ }).replace(':', 'h'); };
var majTxt = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ });
var PAGES = [];

function page(o) {
  // o : chemin, titre, desc, h1, intro, corps, app (hash), ld (objets JSON-LD)
  var url = SITE + '/' + o.chemin + '/';
  var autres = PAGES_LIENS.filter(function (p) { return p[0] !== o.chemin; }).map(function (p) { return '<a href="/' + p[0] + '/">' + esc(p[1]) + '</a>'; }).join(' · ');
  var ld = [{ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Le Petit Préf', item: SITE + '/' }, { '@type': 'ListItem', position: 2, name: o.h1, item: url }] }].concat(o.ld || []);
  var html = '<!doctype html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
    '<title>' + esc(o.titre) + '</title>\n<meta name="description" content="' + esc(o.desc) + '">\n<link rel="canonical" href="' + url + '">\n' +
    '<meta property="og:title" content="' + esc(o.titre) + '">\n<meta property="og:description" content="' + esc(o.desc) + '">\n<meta property="og:url" content="' + url + '">\n<meta property="og:type" content="website">\n<meta property="og:site_name" content="Le Petit Préf">\n<meta property="og:image" content="' + SITE + '/images/partage.jpg?v=5">\n' +
    '<meta name="theme-color" content="#f6f6f3" media="(prefers-color-scheme: light)">\n<meta name="theme-color" content="#121317" media="(prefers-color-scheme: dark)">\n<link rel="icon" href="/icons/icon-192.png" type="image/png">\n<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">\n' +
    '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600&family=Newsreader:opsz,wght@6..72,400;6..72,500&display=swap">\n' +
    '<style>' + CSS + '</style>\n' + ld.map(function (x) { return '<script type="application/ld+json">' + JSON.stringify(x).replace(/</g, '\\u003c') + '</script>'; }).join('\n') + '\n</head>\n<body>\n' +
    '<header class="top"><a class="marque" href="/">Le Petit Préf</a><a class="ouvrir" href="/' + o.app + '">Ouvrir l\'app</a></header>\n<main>\n' +
    '<nav class="fil"><a href="/">Accueil</a> › ' + esc(o.h1) + '</nav>\n<h1>' + esc(o.h1) + '</h1>\n<p class="intro">' + o.intro + '</p>\n' +
    '<p class="cta"><a class="btn" href="/' + o.app + '">' + esc(o.bouton || 'Voir dans Le Petit Préf') + ' →</a></p>\n' + o.corps +
    '\n<p class="cta"><a class="btn" href="/' + o.app + '">' + esc(o.bouton || 'Voir dans Le Petit Préf') + ' →</a></p>\n' +
    '<p class="maj">Mis à jour le ' + esc(majTxt) + '. Le Petit Préf, carnet gratuit et sans publicité de Préfailles et des alentours : les informations viennent des communes, des offices de tourisme, des cinémas et des associations, qui restent la référence.</p>\n' +
    '<nav class="autres"><b>Aussi sur Le Petit Préf :</b> ' + autres + '</nav>\n</main>\n</body>\n</html>\n';
  fs.mkdirSync(path.join(R, o.chemin), { recursive: true });
  fs.writeFileSync(path.join(R, o.chemin, 'index.html'), html);
  PAGES.push(o.chemin);
}
var CSS = ':root{--bg:#f6f6f3;--card:#fff;--ink:#1c1d22;--muted:#5d6068;--line:#e4e3de;--accent:#1d5b86}' +
  '@media (prefers-color-scheme:dark){:root{--bg:#121317;--card:#1b1c21;--ink:#ecece7;--muted:#a1a3ab;--line:#2c2e35;--accent:#5c9bd0}}' +
  'body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 "Inter Tight",-apple-system,system-ui,sans-serif}' +
  '.top{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid var(--line);background:var(--card)}' +
  '.marque{font:500 22px "Newsreader",Georgia,serif;color:var(--ink);text-decoration:none}.ouvrir{color:var(--accent);font-weight:600;text-decoration:none;min-height:44px;display:flex;align-items:center}' +
  'main{max-width:760px;margin:0 auto;padding:16px}h1{font:500 30px/1.15 "Newsreader",Georgia,serif;margin:8px 0}h2{font:500 22px/1.2 "Newsreader",Georgia,serif;margin:24px 0 8px}' +
  '.fil{font-size:14px;color:var(--muted)}.fil a{color:var(--muted)}.intro{color:var(--muted)}' +
  '.btn{display:inline-flex;align-items:center;min-height:48px;padding:0 18px;border-radius:12px;background:var(--accent);color:#fff;font-weight:600;text-decoration:none}' +
  '.liste{list-style:none;padding:0;margin:0;background:var(--card);border:1px solid var(--line);border-radius:12px}' +
  '.liste li{padding:12px 14px;border-bottom:1px solid var(--line)}.liste li:last-child{border-bottom:0}' +
  '.liste b{display:block}.liste small{display:block;color:var(--muted);font-size:14px}' +
  'table{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--line);border-radius:12px;font-variant-numeric:tabular-nums}' +
  'th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line);font-size:15px}th{color:var(--muted);font-weight:500;font-size:14px}' +
  '.maj{color:var(--muted);font-size:14px;margin-top:28px}.autres{font-size:15px;margin:16px 0 32px;line-height:2}.autres a{color:var(--accent)}a{color:var(--accent)}';
var PAGES_LIENS = [['agenda', 'Agenda'], ['cinema', 'Cinéma'], ['marees', 'Marées'], ['restaurants', 'Restaurants'], ['marches', 'Marchés'], ['plages', 'Plages'], ['que-faire', 'Que faire à Préfailles']];

// ---------- Agenda ----------
var EV = J('donnees/events.json').filter(function (e) { return (e.end || e.date) >= auj && e.date <= plus(auj, 30); });
var jours14 = []; for (var i = 0; i < 31; i++) jours14.push(plus(auj, i));
var evDuJour = function (j) { return EV.filter(function (e) { return e.date <= j && (e.end || e.date) >= j && (!e.days || e.days.indexOf(new Date(j + 'T12:00:00Z').getUTCDay()) >= 0); }); };
var evLi = function (e) { return '<li><b>' + esc(e.title) + '</b><small>' + esc([e.time, e.place, e.town].filter(Boolean).join(' · ')) + '</small>' + (e.desc ? '<small>' + esc(e.desc) + '</small>' : '') + '</li>'; };
var corpsAg = '';
jours14.forEach(function (j) {
  var L = evDuJour(j).filter(function (e) { return !e.end || e.date === j; }); // les expos sur plusieurs jours seulement le 1er jour
  if (!L.length) return;
  L.sort(function (a, b) { return (a.town === 'Préfailles' ? 0 : 1) - (b.town === 'Préfailles' ? 0 : 1) || String(a.time).localeCompare(String(b.time)); });
  corpsAg += '<h2>' + esc(cap(jourL(j))) + '</h2>\n<ul class="liste">' + L.map(evLi).join('') + '</ul>\n';
});
var enCours = EV.filter(function (e) { return e.end && e.date < auj; });
if (enCours.length) corpsAg = '<h2>En ce moment</h2>\n<ul class="liste">' + enCours.slice(0, 15).map(evLi).join('') + '</ul>\n' + corpsAg;
var ldEv = EV.filter(function (e) { return e.date >= auj && e.date <= plus(auj, 30) && e.place; }).slice(0, 60).map(function (e) {
  var o = { '@context': 'https://schema.org', '@type': 'Event', name: e.title, startDate: e.date + (/^\d{1,2}h/.test(e.time || '') ? 'T' + e.time.replace(/^(\d{1,2})h(\d{2})?.*$/, function (m, h, mi) { return ('0' + h).slice(-2) + ':' + (mi || '00'); }) + ':00' + decal(e.date) : ''),
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode', eventStatus: 'https://schema.org/EventScheduled',
    location: { '@type': 'Place', name: e.place, address: { '@type': 'PostalAddress', addressLocality: e.town, addressRegion: 'Loire-Atlantique', addressCountry: 'FR' } } };
  if (e.end) o.endDate = e.end; if (e.desc) o.description = e.desc; if (e.url) o.url = e.url;
  if (e.org) o.organizer = { '@type': 'Organization', name: e.org };
  if (e.free) o.isAccessibleForFree = true;
  return o;
});
page({ chemin: 'agenda', titre: 'Agenda Préfailles, Pornic et alentours : que faire cette semaine', h1: 'Agenda de Préfailles et des alentours',
  desc: 'Concerts, spectacles, marchés de Noël, lotos, vide-greniers, sorties en famille : l\'agenda des 30 prochains jours à Préfailles, Pornic, La Plaine-sur-Mer, Saint-Brevin et autour.',
  intro: 'Les sorties des 30 prochains jours à Préfailles et autour (Pornic, La Plaine-sur-Mer, Saint-Michel-Chef-Chef, Saint-Brevin, La Bernerie…), reprises chaque matin des sites des communes, de l\'office de tourisme et des associations. ' + EV.length + ' rendez-vous en ce moment.',
  corps: corpsAg, app: '#agenda', bouton: 'Voir l\'agenda avec les filtres', ld: ldEv });

// ---------- Cinéma ----------
var CI = J('donnees/cinema.json').filter(function (c) { return c.date >= auj; });
var nomCine = function (c) { return c.replace(/^L'Atlantique \(Préfailles\)$/, 'L\'Atlantique (Préfailles)'); };
var corpsCi = '';
Array.from(new Set(CI.map(function (c) { return c.date; }))).sort().slice(0, 10).forEach(function (j) {
  var L = CI.filter(function (c) { return c.date === j; }), salles = Array.from(new Set(L.map(function (c) { return c.cinema; })));
  salles.sort(function (a, b) { return (/Préfailles/.test(a) ? 0 : 1) - (/Préfailles/.test(b) ? 0 : 1) || a.localeCompare(b); });
  corpsCi += '<h2>' + esc(cap(jourL(j))) + '</h2>\n' + salles.map(function (s) { return '<p><b>' + esc(nomCine(s)) + '</b></p><ul class="liste">' + L.filter(function (c) { return c.cinema === s; }).map(function (c) { return '<li><b>' + esc(c.film) + '</b><small>' + esc([(c.times || []).join(', '), c.version, c.genre].filter(Boolean).join(' · ')) + '</small></li>'; }).join('') + '</ul>'; }).join('\n');
});
page({ chemin: 'cinema', titre: 'Cinéma Préfailles, Pornic, Saint-Brevin : séances et horaires', h1: 'Cinéma à Préfailles, Pornic et Saint-Brevin',
  desc: 'Les séances des cinémas L\'Atlantique de Préfailles, Ciné Toiles de Retz et Saint-Joseph à Pornic, et Cinéjade à Saint-Brevin : films, horaires, VF et VOST.',
  intro: 'Les horaires des quatre cinémas autour de Préfailles : L\'Atlantique (Préfailles), Ciné Toiles de Retz et Saint-Joseph (Pornic), Cinéjade (Saint-Brevin-les-Pins), repris chaque matin des programmes des salles.',
  corps: corpsCi || '<p>Pas de séance publiée pour les prochains jours.</p>', app: '#cine', bouton: 'Voir les séances dans l\'app' });

// ---------- Marées ----------
var corpsMa = '<table><thead><tr><th>Jour</th><th>Basse mer</th><th>Pleine mer</th><th>Coef.</th></tr></thead><tbody>';
for (var k = 0; k < 14; k++) {
  var j = plus(auj, k), T = A.tidesOfDay(j), bm = T.filter(function (e) { return e.k === 'BM'; }), pm = T.filter(function (e) { return e.k === 'PM'; });
  var f = function (L) { return L.map(function (e) { return heure(e.ms) + ' (' + e.h.toFixed(1).replace('.', ',') + ' m)'; }).join('<br>'); };
  corpsMa += '<tr><td>' + esc(cap(jourL(j))) + '</td><td>' + f(bm) + '</td><td>' + f(pm) + '</td><td>' + (A.maxCoef(j) || '') + '</td></tr>';
}
corpsMa += '</tbody></table>\n<p class="intro">Heures de Paris, calculées pour le port de Pornic (données SHOM) : à Préfailles la mer monte et descend à quelques minutes près. À titre indicatif, ne pas utiliser pour la navigation. Grande marée à partir d\'un coefficient de 90 environ, idéal pour la pêche à pied.</p>';
page({ chemin: 'marees', titre: 'Marées Préfailles : horaires et coefficients des 14 prochains jours', h1: 'Marées à Préfailles',
  desc: 'Heures de basse mer et de pleine mer, hauteurs et coefficients des marées à Préfailles (port de Pornic) pour les 14 prochains jours. Grandes marées et pêche à pied.',
  intro: 'Horaires des marées pour les 14 prochains jours à Préfailles, avec hauteurs et coefficients. Dans l\'app : la courbe de la marée heure par heure, la météo de la mer, le vent, la houle et les bons créneaux de pêche à pied.',
  corps: corpsMa, app: '#mer', bouton: 'Voir la marée heure par heure' });

// ---------- Lieux : restaurants, marchés, plages ----------
var DJ = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
var horaires = function (a) {
  if (!a.open || !a.open.length) return '';
  var g = {}; a.open.forEach(function (o) { var k = o.hours + '|' + o.from + '|' + o.to; (g[k] = g[k] || []).push(o.days); });
  return Object.keys(g).slice(0, 4).map(function (k) { var p = k.split('|'), d = Array.from(new Set(g[k].join('').split(''))).sort(function (x, y) { return ((+x + 6) % 7) - ((+y + 6) % 7); });
    var per = p[1] === '01-01' && p[2] === '12-31' ? '' : ' (du ' + p[1].split('-').reverse().join('/') + ' au ' + p[2].split('-').reverse().join('/') + ')';
    return (d.length === 7 ? 'tous les jours' : d.map(function (x) { return DJ[+x]; }).join(' ')) + ' ' + p[0] + per; }).join(' ; ');
};
var parVille = function (L) { var t = {}; L.forEach(function (a) { (t[a.town] = t[a.town] || []).push(a); }); return Object.keys(t).sort(function (a, b) { return (a === 'Préfailles' ? 0 : a === 'La Plaine-sur-Mer' ? 1 : a === 'Pornic' ? 2 : 3) - (b === 'Préfailles' ? 0 : b === 'La Plaine-sur-Mer' ? 1 : b === 'Pornic' ? 2 : 3) || a.localeCompare(b); }).map(function (v) { return [v, t[v]]; }); };
var lieuLi = function (a, avecH) { var h = avecH ? horaires(a) : ''; return '<li><b>' + esc(a.n) + '</b><small>' + esc([a.addr || a.town, a.tel].filter(Boolean).join(' · ')) + '</small>' + (h ? '<small>' + esc(h) + '</small>' : '') + (a.season ? '<small>' + esc(a.season) + '</small>' : '') + (a.d ? '<small>' + esc(a.d) + '</small>' : '') + '</li>'; };
var blocsVille = function (L, avecH) { return parVille(L).map(function (v) { return '<h2>' + esc(v[0]) + '</h2>\n<ul class="liste">' + v[1].sort(function (a, b) { return a.n.localeCompare(b.n); }).map(function (a) { return lieuLi(a, avecH); }).join('') + '</ul>'; }).join('\n'); };
var RESTOS = A.ACTS.filter(function (a) { return a.cat === 'saveurs' && (a.kind === 'restaurant' || a.kind === 'creperie'); });
page({ chemin: 'restaurants', titre: 'Restaurants à Préfailles, La Plaine-sur-Mer et Pornic : adresses et horaires', h1: 'Restaurants et crêperies autour de Préfailles',
  desc: 'Où manger à Préfailles et autour : ' + RESTOS.length + ' restaurants et crêperies à Préfailles, La Plaine-sur-Mer, Pornic et alentours, avec adresse, téléphone et horaires.',
  intro: RESTOS.length + ' restaurants et crêperies à Préfailles et autour, avec leurs horaires quand ils sont publiés (indicatifs : appelez avant). Dans l\'app : ce qui est ouvert ce midi ou ce soir, la vue sur la mer, la carte et l\'itinéraire.',
  corps: blocsVille(RESTOS, true), app: '#manger', bouton: 'Voir ce qui est ouvert aujourd\'hui' });
var MARCHES = A.ACTS.filter(function (a) { return a.cat === 'marche'; });
page({ chemin: 'marches', titre: 'Marchés autour de Préfailles et Pornic : jours et horaires', h1: 'Marchés autour de Préfailles et Pornic',
  desc: 'Jours et horaires des marchés de Préfailles, La Plaine-sur-Mer, Pornic, Saint-Michel-Chef-Chef, Saint-Brevin, La Bernerie et alentours, marchés d\'été et à l\'année.',
  intro: 'Les ' + MARCHES.length + ' marchés autour de Préfailles et de Pornic, avec leurs jours, leurs heures et leur saison (programme des marchés de l\'office de tourisme et des communes).',
  corps: blocsVille(MARCHES, true), app: '#manger', bouton: 'Voir le prochain marché' });
var PLAGES = A.ACTS.filter(function (a) { return a.cat === 'plage'; });
page({ chemin: 'plages', titre: 'Plages de Préfailles et des alentours : surveillance, accès, chiens', h1: 'Plages de Préfailles et des alentours',
  desc: 'Les plages de Préfailles (Anse du Sud, Grande Plage, Port-Meleu, Margaret…), La Plaine-sur-Mer, Pornic et autour : sable ou rochers, surveillance l\'été, accès et chiens.',
  intro: PLAGES.length + ' plages autour de Préfailles, de la crique rocheuse à la grande plage surveillée. Dans l\'app : la marée du jour, la météo de la mer et l\'eau.',
  corps: blocsVille(PLAGES, false), app: '#plages', bouton: 'Voir la marée et la météo de la mer' });

// ---------- Que faire ----------
var semaine = EV.filter(function (e) { return e.date <= plus(auj, 7); }).sort(function (a, b) { return (a.town === 'Préfailles' ? 0 : 1) - (b.town === 'Préfailles' ? 0 : 1) || a.date.localeCompare(b.date); }).slice(0, 12);
var cats = {}; A.ACTS.forEach(function (a) { if (['saveurs', 'marche', 'plage'].indexOf(a.cat) < 0) (cats[a.cat] = cats[a.cat] || []).push(a); });
var corpsQF = '<h2>Cette semaine</h2>\n<ul class="liste">' + semaine.map(function (e) { return '<li><b>' + esc(e.title) + '</b><small>' + esc([cap(jourL(e.date)), e.time, e.town].filter(Boolean).join(' · ')) + '</small></li>'; }).join('') + '</ul>\n<p><a href="/agenda/">Tout l\'agenda des 30 prochains jours</a></p>\n' +
  Object.keys(cats).map(function (c) { var L = cats[c].sort(function (a, b) { return (a.town === 'Préfailles' ? 0 : 1) - (b.town === 'Préfailles' ? 0 : 1) || a.n.localeCompare(b.n); }).slice(0, 12);
    return '<h2>' + esc(A.CATS[c] || c) + '</h2>\n<ul class="liste">' + L.map(function (a) { return '<li><b>' + esc(a.n) + '</b><small>' + esc(a.town) + '</small>' + (a.d ? '<small>' + esc(a.d) + '</small>' : '') + '</li>'; }).join('') + '</ul>'; }).join('\n') +
  '\n<h2>Et aussi</h2>\n<ul class="liste"><li><a href="/marees/">Les marées et les grandes marées pour la pêche à pied</a></li><li><a href="/plages/">Les plages</a></li><li><a href="/cinema/">Le cinéma</a></li><li><a href="/restaurants/">Les restaurants</a></li><li><a href="/marches/">Les marchés</a></li></ul>';
page({ chemin: 'que-faire', titre: 'Que faire à Préfailles ? Sorties, activités, balades, en famille', h1: 'Que faire à Préfailles et autour ?',
  desc: 'Idées de sorties à Préfailles et autour : les événements de la semaine, activités, balades, sports nautiques, visites, sorties en famille et adresses pour les jours de pluie.',
  intro: 'Ce qui se passe cette semaine à Préfailles et autour, et les activités pour toute l\'année : nature et balades, mer et glisse, culture et visites, sorties pour les enfants.',
  corps: corpsQF, app: '#activites', bouton: 'Voir les activités dans l\'app' });

// ---------- sitemap ----------
var sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n<url><loc>' + SITE + '/</loc><lastmod>' + auj + '</lastmod></url>\n' +
  PAGES.map(function (p) { return '<url><loc>' + SITE + '/' + p + '/</loc><lastmod>' + auj + '</lastmod></url>'; }).join('\n') + '\n</urlset>\n';
fs.writeFileSync(path.join(R, 'sitemap.xml'), sm);
console.log('OK · pages :', PAGES.join(', '), '· événements', EV.length, '· séances', CI.length, '· restos', RESTOS.length, '· marchés', MARCHES.length, '· plages', PLAGES.length);
