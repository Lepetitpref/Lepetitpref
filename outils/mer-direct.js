#!/usr/bin/env node
// Mer en direct : bulletin météo marine côtier de Météo-France (Penmarc'h – Anse de l'Aiguillon)
// et houle mesurée par la bouée Candhis du Plateau du Four (Cerema, Licence Ouverte).
// Écrit donnees/mer.json. Lancé par .github/workflows/mer.yml toutes les 3 heures.
//   node outils/mer-direct.js [fichier de sortie]
// Garde l'ancienne valeur d'une source qui ne répond pas.
const fs = require('fs'), path = require('path');
const OUT = process.argv[2] || path.join(__dirname, '..', 'donnees', 'mer.json');
const BMS = 'https://meteofrance.com/meteo-marine/penmarc-h-anse-de-l-aiguillon/BMSCOTE-01-04';
const BOUEE = 'https://candhis.cerema.fr/_public_/campagne.php?Y2FtcD0wNDQwMw=='; // camp=04403 SEM-REV Plateau du Four

let avant = {};
try { avant = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch (e) {}

async function bulletin() {
  const { chromium } = require('playwright');
  const b = await chromium.launch();
  try {
    const p = await b.newPage();
    await p.goto(BMS, { waitUntil: 'networkidle', timeout: 60000 });
    await p.waitForTimeout(3000);
    const t = await p.evaluate(() => document.body.innerText);
    const i = t.search(/Bulletin côte .*Aiguillon/);
    if (i < 0) throw new Error('bulletin introuvable');
    const fin = t.indexOf('Prochain bulletin', i);
    const lignes = t.slice(i, fin < 0 ? i + 6000 : t.indexOf('\n', fin)).split('\n').map(s => s.trim()).filter(Boolean);
    const titre = lignes[0];
    const emis = (lignes.find(l => /^Origine Météo-France/.test(l)) || '').replace(/^Origine Météo-France\.\s*/, '');
    const avis = lignes.find(l => /avis|BMS/i.test(l) && !/^Vent moyen/.test(l)) || '';
    const prochain = lignes.find(l => /^Prochain bulletin/.test(l)) || '';
    const sections = []; let cur = null;
    for (const l of lignes) {
      if (/^(Situation générale|Observations|Prévisions|Tendance)/.test(l)) { cur = { t: l, l: [] }; sections.push(cur); }
      else if (cur && !/^Prochain bulletin/.test(l)) cur.l.push(l);
    }
    if (!sections.length) throw new Error('bulletin vide');
    return { titre, emis, avis, sections, prochain, source: BMS, lu: new Date().toISOString() };
  } finally { await b.close(); }
}

async function bouee() {
  let html = '';
  for (let k = 0; k < 3 && !html; k++) {
    try { const r = await fetch(BOUEE, { headers: { 'User-Agent': 'Mozilla/5.0 (Le Petit Pref)' } }); if (r.ok) html = await r.text(); } catch (e) {}
    if (!html) await new Promise(r => setTimeout(r, 3000));
  }
  if (!html) throw new Error('bouée injoignable');
  const arr = n => { const m = html.match(new RegExp("arrDataPHP\\[" + n + "\\] = eval\\('(.*?)'\\);")); return m ? JSON.parse(m[1].replace(/\\'/g, "'")) : []; };
  const H = arr(0), T = arr(1), D = arr(2), E = arr(4);
  if (!H.length) throw new Error('pas de mesure');
  const last = H[0][0], at = (A) => { const x = A.find(r => r[0] === last); return x ? x[1] : null; };
  return { nom: 'Bouée du Plateau du Four (Candhis, Cerema)', heure: last, h13: H[0][1], hmax: H[0][3] ?? null, t13: at(T), dir: at(D), eau: at(E), source: BOUEE };
}

(async () => {
  const out = { maj: new Date().toISOString(), bulletin: avant.bulletin || null, bouee: avant.bouee || null };
  try { out.bulletin = await bulletin(); } catch (e) { console.error('Bulletin :', e.message); }
  try { out.bouee = await bouee(); } catch (e) { console.error('Bouée :', e.message); }
  const sans = o => JSON.stringify({ b: o.bulletin && { ...o.bulletin, lu: 0 }, y: o.bouee });
  if (sans(out) === sans(avant)) { console.log('Rien de nouveau.'); return; }
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
  console.log('OK', OUT, out.bulletin ? out.bulletin.emis : 'sans bulletin', out.bouee ? out.bouee.heure + ' ' + out.bouee.h13 + ' m' : 'sans bouée');
})();
