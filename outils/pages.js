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
var A = new Function(stub + L.slice(0, L.findIndex(function (x) { return /^\/\* -{10} activities -{10} \*\//.test(x); })).join('\n') + ';return {ACTS,KINDS,CATS,tidesOfDay,maxCoef};')();
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
var PAGES = [], ETATF = path.join(__dirname, 'pages-etat.json'), ETAT = {};
try { ETAT = JSON.parse(fs.readFileSync(ETATF, 'utf8')); } catch (x) {}
var empreinte = function (t) { return require('crypto').createHash('sha1').update(t).digest('hex').slice(0, 16); };
var CP = { 'Préfailles': '44770', 'La Plaine-sur-Mer': '44770', 'Pornic': '44210', 'Saint-Michel-Chef-Chef': '44730', 'Saint-Brevin-les-Pins': '44250', 'Chauvé': '44320', 'La Bernerie-en-Retz': '44760', 'Les Moutiers-en-Retz': '44760', 'Villeneuve-en-Retz': '44580', 'Chaumes-en-Retz': '44320', 'Saint-Père-en-Retz': '44320', 'Saint-Hilaire-de-Chaléons': '44680', 'Sainte-Pazanne': '44680', 'Corsept': '44560', 'Saint-Viaud': '44320', 'Vue': '44640', 'Paimbœuf': '44560' };

function page(o) {
  // o : chemin, titre, desc, h1, intro, corps, app (hash), ld (objets JSON-LD)
  var url = SITE + '/' + o.chemin + '/', emp = empreinte(o.titre + o.corps + JSON.stringify(o.ld || []).replace(/"startDate[^,]*,/g, ''));
  var et = ETAT[o.chemin] || {}; if (et.e !== emp) et = { e: emp, j: auj }; ETAT[o.chemin] = et;
  var majP = new Date(et.j + 'T12:00:00Z').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  var autres = PAGES_LIENS.filter(function (p) { return p[0] !== o.chemin; }).map(function (p) { return '<a href="/' + p[0] + '/">' + esc(p[1]) + '</a>'; }).join(' · ');
  var ld = [{ '@context': 'https://schema.org', '@type': 'WebPage', name: o.h1, url: url, description: o.desc, inLanguage: 'fr', dateModified: et.j, isPartOf: { '@type': 'WebSite', name: 'Le Petit Préf', url: SITE + '/' } }, { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Le Petit Préf', item: SITE + '/' }, { '@type': 'ListItem', position: 2, name: o.h1, item: url }] }].concat(o.ld || []);
  var html = '<!doctype html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
    '<title>' + esc(o.titre) + '</title>\n<meta name="description" content="' + esc(o.desc) + '">\n<link rel="canonical" href="' + url + '">\n' +
    '<meta property="article:modified_time" content="' + et.j + '">\n<meta property="og:title" content="' + esc(o.titre) + '">\n<meta property="og:description" content="' + esc(o.desc) + '">\n<meta property="og:url" content="' + url + '">\n<meta property="og:type" content="website">\n<meta property="og:site_name" content="Le Petit Préf">\n<meta property="og:image" content="' + SITE + '/images/partage.jpg?v=5">\n' +
    '<meta name="theme-color" content="#f6f6f3" media="(prefers-color-scheme: light)">\n<meta name="theme-color" content="#121317" media="(prefers-color-scheme: dark)">\n<link rel="icon" href="/icons/icon-192.png" type="image/png">\n<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">\n' +
    '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600&family=Newsreader:opsz,wght@6..72,400;6..72,500&display=swap">\n' +
    '<style>' + CSS + '</style>\n' + ld.map(function (x) { return '<script type="application/ld+json">' + JSON.stringify(x).replace(/</g, '\\u003c') + '</script>'; }).join('\n') + '\n</head>\n<body>\n' +
    '<header class="top"><a class="marque" href="/">Le Petit Préf</a><a class="ouvrir" href="/' + o.app + '">Ouvrir l\'app</a></header>\n<main>\n' +
    '<nav class="fil"><a href="/">Accueil</a> › ' + esc(o.h1) + '</nav>\n<h1>' + esc(o.h1) + '</h1>\n<p class="intro">' + o.intro + '</p>\n' +
    '<p class="cta"><a class="btn" href="/' + o.app + '">' + esc(o.bouton || 'Voir dans Le Petit Préf') + ' →</a></p>\n' + o.corps +
    '\n<p class="cta"><a class="btn" href="/' + o.app + '">' + esc(o.bouton || 'Voir dans Le Petit Préf') + ' →</a></p>\n' +
    '<p class="maj">Mis à jour le ' + esc(majP) + '. Le Petit Préf, carnet gratuit et sans publicité de Préfailles et des alentours : les informations viennent des communes, des offices de tourisme, des cinémas et des associations, qui restent la référence.</p>\n' +
    '<nav class="autres"><b>Aussi sur Le Petit Préf :</b> ' + autres + '</nav>\n</main>\n' + "<script>(function(){if(!/(^|\\.)lepetitpref\\.fr$/.test(location.hostname))return;try{if(localStorage.getItem('pp-editeur')==='1'||navigator.webdriver||/bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview/i.test(navigator.userAgent||''))return;}catch(e){return;}\nvar U='https://compteur.square-brook-9d65.workers.dev/hit?n=1&i=0&k=',j=new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Paris'}),P='" + o.chemin + "',ok=0;\nfunction h(k){try{fetch(U+encodeURIComponent('quiz-pp-'+k),{method:'POST',cache:'no-store',keepalive:true}).catch(function(){});}catch(e){}}\nh('seo-brut-'+j);function go(){if(ok)return;ok=1;var r=document.referrer||'';h('seo-'+j);h('seo');h('seo-'+P+'-'+j);h('seo-source-'+(/google|bing|qwant|duckduckgo|ecosia|yahoo|yandex/i.test(r)?'moteur':r&&r.indexOf(location.hostname)<0?'site':'direct')+'-'+j);}\n['pointerdown','touchstart','keydown','wheel','scroll'].forEach(function(e){addEventListener(e,go,{once:true,passive:true});});setTimeout(go,10000);\ndocument.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a.btn,a.ouvrir');if(a){go();h('seo-vers-app-'+j);}},true);})();</script>" + '\n</body>\n</html>\n';
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
var PAGES_LIENS = [['ce-week-end', 'Ce week-end à Préfailles'], ['pornic', 'Que faire à Pornic'], ['saint-brevin', 'Que faire à Saint-Brevin'], ['la-bernerie', 'Que faire à La Bernerie'], ['agenda', 'Agenda de Préfailles et Pornic'], ['cinema', 'Cinéma à Préfailles et Pornic'], ['marees', 'Marées à Préfailles'], ['restaurants', 'Restaurants à Préfailles'], ['marches', 'Marchés de Pornic et alentours'], ['plages', 'Plages de Préfailles'], ['que-faire', 'Que faire à Préfailles']];

// ---------- Agenda ----------
var EV = J('donnees/events.json').filter(function (e) { return (e.end || e.date) >= auj && e.date <= plus(auj, 30); });
var jours14 = []; for (var i = 0; i < 14; i++) jours14.push(plus(auj, i));
var PROCHE = ['Préfailles', 'La Plaine-sur-Mer', 'Pornic', 'Saint-Michel-Chef-Chef'];
var evDuJour = function (j) { return EV.filter(function (e) { return e.date <= j && (e.end || e.date) >= j && (!e.days || e.days.indexOf(new Date(j + 'T12:00:00Z').getUTCDay()) >= 0); }); };
var evLi = function (e) { return '<li id="ev-' + esc(e.id) + '"><b>' + esc(e.title) + '</b><small>' + esc([e.time, e.place, e.town].filter(Boolean).join(' · ')) + '</small>' + (e.desc ? '<small>' + esc(e.desc) + '</small>' : '') + '</li>'; };
var corpsAg = '';
jours14.forEach(function (j) {
  var L = evDuJour(j).filter(function (e) { return !e.end || e.date === j; }); // les expos sur plusieurs jours seulement le 1er jour
  if (!L.length) return;
  L.sort(function (a, b) { return (a.town === 'Préfailles' ? 0 : 1) - (b.town === 'Préfailles' ? 0 : 1) || String(a.time).localeCompare(String(b.time)); });
  corpsAg += '<h2>' + esc(cap(jourL(j))) + '</h2>\n<ul class="liste">' + L.map(evLi).join('') + '</ul>\n';
});
var enCours = EV.filter(function (e) { return e.end && e.date < auj && PROCHE.indexOf(e.town) >= 0; });
if (enCours.length) corpsAg = '<h2>En ce moment</h2>\n<ul class="liste">' + enCours.slice(0, 10).map(evLi).join('') + '</ul>\n' + corpsAg;
var aPref = EV.filter(function (e) { return e.town === 'Préfailles' && e.date <= plus(auj, 7); });
corpsAg = '<h2>À Préfailles cette semaine</h2>\n' + (aPref.length ? '<ul class="liste">' + aPref.map(function (e) { return '<li><b>' + esc(e.title) + '</b><small>' + esc([cap(jourL(e.date > auj ? e.date : auj)), e.time, e.place].filter(Boolean).join(' · ')) + '</small></li>'; }).join('') + '</ul>' : '<p>Rien d\'annoncé à Préfailles même cette semaine : voici ce qui se passe autour.</p>') + '\n' + corpsAg;
var nAg = EV.filter(function (e) { return e.date <= plus(auj, 13); }).length;
var ldEv = EV.filter(function (e) { return e.date >= auj && e.date <= plus(auj, 13) && e.place && e.place !== e.town && CP[e.town]; }).slice(0, 60).map(function (e) {
  var o = { '@context': 'https://schema.org', '@type': 'Event', name: e.title, startDate: e.date + (/^\d{1,2}h/.test(e.time || '') ? 'T' + e.time.replace(/^(\d{1,2})h(\d{2})?.*$/, function (m, h, mi) { return ('0' + h).slice(-2) + ':' + (mi || '00'); }) + ':00' + decal(e.date) : ''),
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode', eventStatus: 'https://schema.org/EventScheduled',
    location: { '@type': 'Place', name: e.place, address: { '@type': 'PostalAddress', streetAddress: e.place, postalCode: CP[e.town], addressLocality: e.town, addressRegion: 'Loire-Atlantique', addressCountry: 'FR' } }, image: SITE + '/images/partage.jpg', url: SITE + '/agenda/#ev-' + encodeURIComponent(e.id) };
  if (e.end) o.endDate = e.end; if (e.desc) o.description = e.desc; if (e.url) o.sameAs = e.url;
  if (e.org) o.organizer = { '@type': 'Organization', name: e.org };
  if (e.free) { o.isAccessibleForFree = true; o.offers = { '@type': 'Offer', price: 0, priceCurrency: 'EUR', availability: 'https://schema.org/InStock', url: SITE + '/agenda/' }; }
  return o;
});
page({ chemin: 'agenda', titre: 'Agenda Préfailles et Pornic : sorties, concerts, animations (14 jours)', h1: 'Agenda de Préfailles et des alentours',
  desc: 'Concerts, spectacles, marchés de Noël, lotos, vide-greniers, sorties en famille : l\'agenda des 14 prochains jours à Préfailles, Pornic, La Plaine-sur-Mer, Saint-Brevin et autour, mis à jour chaque matin.',
  intro: 'Les sorties des 14 prochains jours à Préfailles et autour (Pornic, La Plaine-sur-Mer, Saint-Michel-Chef-Chef, Saint-Brevin, La Bernerie…), reprises chaque matin des sites des communes, de l\'office de tourisme et des associations : ' + nAg + ' rendez-vous. La suite, les filtres par jour et par distance sont dans l\'app.',
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
var GM = []; for (var g = 0; g < 45; g++) { var jg = plus(auj, g), cg = A.maxCoef(jg); if (cg >= 90) GM.push([jg, cg]); }
corpsMa += '<h2>Grandes marées à venir</h2>\n' + (GM.length ? '<ul class="liste">' + GM.map(function (x) { var bm = A.tidesOfDay(x[0]).filter(function (e) { return e.k === 'BM'; }); return '<li><b>' + esc(cap(jourL(x[0]))) + ' · coefficient ' + x[1] + '</b><small>Basse mer ' + bm.map(function (e) { return heure(e.ms); }).join(' et ') + ' : le bon moment pour la pêche à pied commence environ 2 h avant.</small></li>'; }).join('') + '</ul>' : '<p>Pas de coefficient de 90 ou plus dans les 45 prochains jours.</p>') + '\n<p class="intro">Pêche à pied : tailles minimales, quantités et zones fermées sont dans l\'app (Mer, Pêche à pied).</p>';
var moisT = new Date(auj + 'T12:00:00Z').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
page({ chemin: 'marees', titre: 'Marées Préfailles ' + moisT + ' : horaires et coefficients', h1: 'Marées à Préfailles',
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

// ---------- Ce week-end (vendredi → dimanche ; le samedi et le dimanche : à partir d'aujourd'hui) ----------
(function () {
  var dw = new Date(auj + 'T12:00:00Z').getUTCDay(), we = [];
  if (dw === 6) we = [auj, plus(auj, 1)]; else if (dw === 0) we = [auj]; else { var v = plus(auj, (5 - dw + 7) % 7); we = [v, plus(v, 1), plus(v, 2)]; }
  var d0 = we[0], d1 = we[we.length - 1], jc = function (j) { return new Date(j + 'T12:00:00Z').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', timeZone: 'UTC' }); };
  var periode = we.length > 1 ? 'du ' + jc(d0) + ' au ' + jourL(d1) : jourL(d0);
  var prio = function (e) { var i = PROCHE.indexOf(e.town); return i < 0 ? 9 : i; };
  var corps = '', nEv = 0, ldW = [];
  we.forEach(function (j) {
    var L = evDuJour(j).filter(function (e) { return !e.end || e.date === j; }).sort(function (a, b) { return prio(a) - prio(b) || String(a.time).localeCompare(String(b.time)); });
    nEv += L.length;
    var dwj = new Date(j + 'T12:00:00Z').getUTCDay(), md = j.slice(5);
    var mar = MARCHES.filter(function (a) { return (a.open || []).some(function (o) { return String(o.days).indexOf(String(dwj)) >= 0 && (o.from <= o.to ? md >= o.from && md <= o.to : md >= o.from || md <= o.to); }); });
    var films = {}; CI.filter(function (c) { return c.date === j; }).forEach(function (c) { (films[c.film] = films[c.film] || []).push(nomCine(c.cinema).replace(/ \(.*\)$/, '') + ' ' + (c.times || []).join(', ')); });
    var T = A.tidesOfDay(j), mx = A.maxCoef(j);
    corps += '<h2>' + esc(cap(jourL(j))) + '</h2>\n' +
      (L.length ? '<ul class="liste">' + L.map(evLi).join('') + '</ul>\n' : '<p>Pas de sortie annoncée ce jour-là.</p>\n') +
      (mar.length ? '<p><b>Marchés</b> : ' + mar.map(function (a) { var o = (a.open || []).find(function (o) { return String(o.days).indexOf(String(dwj)) >= 0; }); return esc(a.n) + (o ? ' (' + esc(o.hours) + ')' : ''); }).join(' · ') + '</p>\n' : '') +
      (Object.keys(films).length ? '<p><b>Cinéma</b> : ' + Object.keys(films).sort().map(function (f) { return esc(f) + ' (' + esc(films[f].join(' ; ')) + ')'; }).join(' · ') + '</p>\n' : '') +
      '<p><b>Marée</b> : basse mer ' + T.filter(function (e) { return e.k === 'BM'; }).map(function (e) { return heure(e.ms); }).join(' et ') + ', pleine mer ' + T.filter(function (e) { return e.k === 'PM'; }).map(function (e) { return heure(e.ms); }).join(' et ') + (mx ? ', coefficient ' + mx : '') + '.</p>\n';
    L.filter(function (e) { return e.place && e.place !== e.town && CP[e.town]; }).slice(0, 25).forEach(function (e) {
      var m = /^(\d{1,2})h(\d{2})?/.exec(e.time || ''), o = { '@context': 'https://schema.org', '@type': 'Event', name: e.title, startDate: e.date + (m ? 'T' + ('0' + m[1]).slice(-2) + ':' + (m[2] || '00') + ':00' + decal(e.date) : ''), eventStatus: 'https://schema.org/EventScheduled', eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode', location: { '@type': 'Place', name: e.place, address: { '@type': 'PostalAddress', streetAddress: e.place, postalCode: CP[e.town], addressLocality: e.town, addressRegion: 'Loire-Atlantique', addressCountry: 'FR' } }, image: SITE + '/images/partage.jpg', url: SITE + '/ce-week-end/' };
      if (e.end) o.endDate = e.end; if (e.desc) o.description = e.desc; if (e.url) o.sameAs = e.url; if (e.org) o.organizer = { '@type': 'Organization', name: e.org }; ldW.push(o); });
  });
  var expos = EV.filter(function (e) { return e.end && e.date < d1 && e.end >= d0 && PROCHE.indexOf(e.town) >= 0; });
  if (expos.length) corps += '<h2>Expositions et rendez-vous sur plusieurs jours</h2>\n<ul class="liste">' + expos.slice(0, 10).map(evLi).join('') + '</ul>\n';
  corps += '<p><a href="/agenda/">L\'agenda des 14 prochains jours</a> · <a href="/marees/">Les marées</a> · <a href="/restaurants/">Les restaurants</a></p>';
  var court = we.length > 1 ? new Date(d0 + 'T12:00:00Z').getUTCDate() + '-' + new Date(d1 + 'T12:00:00Z').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', timeZone: 'UTC' }) : new Date(d0 + 'T12:00:00Z').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', timeZone: 'UTC' });
  page({ chemin: 'ce-week-end', titre: 'Que faire ce week-end à Préfailles et Pornic ? (' + court + ')', h1: 'Ce week-end à Préfailles et autour',
    desc: 'Le week-end ' + periode + ' à Préfailles, Pornic, La Plaine-sur-Mer et autour : ' + nEv + ' sorties (concerts, marchés de Noël, spectacles, sorties en famille), les marchés, le cinéma et les marées. Mis à jour chaque matin.',
    intro: 'Le week-end ' + esc(periode) + ' : ' + nEv + ' sorties annoncées à Préfailles et autour, jour par jour, avec les marchés, les séances de cinéma et les marées. Repris chaque matin des sites des communes, de l\'office de tourisme, des cinémas et des associations.',
    corps: corps, app: '#ce-week-end', bouton: 'Voir le week-end dans l\'app', ld: ldW });
})();

// ---------- Une page par commune : « Que faire à Pornic », etc. ----------
// Même contenu que l'app (agenda, cinéma, marchés, restos, plages, activités), filtré sur la commune. Pas de page si trop peu de contenu.
var COMMUNES = [['pornic', 'Pornic', 'Pornic', '?ici=pornic'], ['saint-brevin', 'Saint-Brevin-les-Pins', 'Saint-Brevin', '?ici=brevin'], ['la-bernerie', 'La Bernerie-en-Retz', 'La Bernerie', '?ici=bernerie'],
  ['la-plaine-sur-mer', 'La Plaine-sur-Mer', 'La Plaine-sur-Mer', ''], ['saint-michel-chef-chef', 'Saint-Michel-Chef-Chef', 'Saint-Michel-Chef-Chef et Tharon', ''], ['les-moutiers', 'Les Moutiers-en-Retz', 'Les Moutiers-en-Retz', '']];
var a14 = plus(auj, 13), COMM_LIENS = [];
COMMUNES.forEach(function (c) {
  var ville = c[1], nom = c[2], app = '/' + c[3];
  var ev = EV.filter(function (e) { return e.town === ville && e.date <= a14; });
  var ci = CI.filter(function (x) { return x.cinema.indexOf(ville === 'Saint-Brevin-les-Pins' ? 'Saint-Brevin' : ville) >= 0 && x.date <= plus(auj, 6); });
  var lieux = A.ACTS.filter(function (a) { return a.town === ville; });
  var mar = lieux.filter(function (a) { return a.cat === 'marche'; }), res = lieux.filter(function (a) { return a.cat === 'saveurs' && (a.kind === 'restaurant' || a.kind === 'creperie'); }),
    bars = lieux.filter(function (a) { return a.kind === 'bar' || a.bar; }), pla = lieux.filter(function (a) { return a.cat === 'plage'; });
  var act = {}; lieux.forEach(function (a) { if (['saveurs', 'marche', 'plage'].indexOf(a.cat) < 0) (act[a.cat] = act[a.cat] || []).push(a); });
  if (ev.length + lieux.length < 15) return;
  var liste = function (L, h) { return '<ul class="liste">' + L.sort(function (a, b) { return a.n.localeCompare(b.n); }).map(function (a) { return lieuLi(a, h); }).join('') + '</ul>'; };
  var corps = '<h2>Agenda : les 14 prochains jours à ' + esc(nom) + '</h2>\n' + (ev.length ? '<ul class="liste">' + ev.map(function (e) { return '<li><b>' + esc(e.title) + '</b><small>' + esc([cap(jourL(e.date > auj ? e.date : auj)) + (e.end && e.end > e.date ? ' (jusqu\'au ' + jourL(e.end) + ')' : ''), e.time, e.place].filter(Boolean).join(' · ')) + '</small>' + (e.desc ? '<small>' + esc(e.desc) + '</small>' : '') + '</li>'; }).join('') + '</ul>' : '<p>Rien d\'annoncé dans la commune même ces 14 prochains jours : <a href="/agenda/">voir l\'agenda des alentours</a>.</p>') + '\n';
  if (ci.length) { var films = {}; ci.forEach(function (x) { (films[x.film] = films[x.film] || []).push(x); });
    corps += '<h2>Cinéma cette semaine</h2>\n<ul class="liste">' + Object.keys(films).sort().map(function (f) { return '<li><b>' + esc(f) + '</b><small>' + esc(films[f].map(function (x) { return cap(jourL(x.date)).replace(/ \d{4}$/, '') + ' ' + x.times.join(', '); }).slice(0, 4).join(' · ')) + '</small></li>'; }).join('') + '</ul>\n<p><a href="/cinema/">Toutes les séances</a></p>\n'; }
  if (mar.length) corps += '<h2>Marchés</h2>\n' + liste(mar, true) + '\n';
  if (res.length) corps += '<h2>Restaurants et crêperies (' + res.length + ')</h2>\n' + liste(res, true) + '\n';
  if (bars.length) corps += '<h2>Bars</h2>\n' + liste(bars, true) + '\n';
  if (pla.length) corps += '<h2>Plages</h2>\n' + liste(pla, false) + '\n';
  Object.keys(act).forEach(function (k) { corps += '<h2>' + esc(A.CATS[k] || k) + '</h2>\n<ul class="liste">' + act[k].sort(function (a, b) { return a.n.localeCompare(b.n); }).map(function (a) { return '<li><b>' + esc(a.n) + '</b>' + (a.d ? '<small>' + esc(a.d) + '</small>' : '') + '</li>'; }).join('') + '</ul>\n'; });
  var ldE = ev.filter(function (e) { return e.date >= auj && e.place && e.place !== e.town; }).slice(0, 40).map(function (e) { var m = /^(\d{1,2})h(\d{2})?/.exec(e.time || ''), sd = e.date + (m ? 'T' + ('0' + m[1]).slice(-2) + ':' + (m[2] || '00') + ':00' + decal(e.date) : '');
    var o = { '@context': 'https://schema.org', '@type': 'Event', name: e.title, startDate: sd, eventStatus: 'https://schema.org/EventScheduled', eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode', location: { '@type': 'Place', name: e.place, address: { '@type': 'PostalAddress', streetAddress: e.place, postalCode: CP[e.town], addressLocality: e.town, addressRegion: 'Loire-Atlantique', addressCountry: 'FR' } }, image: SITE + '/images/partage.jpg', url: SITE + '/' + c[0] + '/' };
    if (e.end) o.endDate = e.end; if (e.desc) o.description = e.desc; if (e.url) o.sameAs = e.url; if (e.org) o.organizer = { '@type': 'Organization', name: e.org }; return o; });
  page({ chemin: c[0], titre: 'Que faire à ' + nom + ' : agenda, restaurants, marchés, plages', h1: 'Que faire à ' + nom + ' ?',
    desc: 'À ' + nom + ' : les sorties des 14 prochains jours' + (ci.length ? ', le cinéma' : '') + ', les marchés, ' + res.length + ' restaurants et crêperies avec leurs horaires, les plages et les activités. Mis à jour chaque matin.',
    intro: 'Tout ce qui se passe à ' + esc(nom) + ', repris chaque matin des sites de la commune, de l\'office de tourisme, des cinémas et des associations : ' + ev.length + ' rendez-vous ces 14 prochains jours, ' + res.length + ' restaurants et crêperies, ' + mar.length + ' marché' + (mar.length > 1 ? 's' : '') + '.',
    corps: corps, app: c[3] ? c[3] + '#sejour' : '#agenda', bouton: c[3] ? 'Ouvrir Le Petit Préf à ' + nom : 'Voir l\'agenda dans Le Petit Préf', ld: ldE });
  COMM_LIENS.push([c[0], 'Que faire à ' + nom]);
});

// ---------- sitemap ----------
var sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n<url><loc>' + SITE + '/</loc><lastmod>' + auj + '</lastmod></url>\n' +
  PAGES.map(function (p) { return '<url><loc>' + SITE + '/' + p + '/</loc><lastmod>' + ETAT[p].j + '</lastmod></url>'; }).join('\n') + '\n</urlset>\n';
fs.writeFileSync(path.join(R, 'sitemap.xml'), sm);
fs.writeFileSync(ETATF, JSON.stringify(ETAT, null, 1));
console.log('OK · pages :', PAGES.join(', '), '· événements', EV.length, '· séances', CI.length, '· restos', RESTOS.length, '· marchés', MARCHES.length, '· plages', PLAGES.length);
