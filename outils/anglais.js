// Contrôle de la version anglaise : ouvre le site en anglais (serveur local, PP_URL sinon http://localhost:8765),
// parcourt toutes les pages et leurs états, relève les textes d'interface restés en français.
// Les noms propres (lieux, associations, films, événements, adresses) sont ignorés ; outils/anglais-ok.txt liste les textes admis
// (chiffres remplacés par #). Usage : node outils/anglais.js  (échoue s'il y a du nouveau français)  ·  node outils/anglais.js --maj  (accepte l'état actuel)
const {chromium,devices}=require('playwright');const fs=require('fs');
(async()=>{const OUT=null,SHOT='',BASE_URL=process.env.PP_URL||'http://localhost:8765';const b=await chromium.launch(),er=[];
const c=await b.newContext({...devices['iPhone 13'],locale:'en-GB'});await c.addInitScript(b=>{try{localStorage.setItem('pp-lang','en');if(b)localStorage.setItem('pp-base',b);}catch(e){}},process.env.PP_BASE||'');
const p=await c.newPage();p.on('pageerror',e=>er.push(e.message));
const FRW=/(?<![\p{L}'’-])(le|la|les|des|du|de|et|pour|avec|dès|au|aux|en|sur|une|un|ou|par|dans|à|ce|cette|ces|est|sont|plus|pas|ne|vous|votre|vos|qui|que|il|elle|son|sa|ses|leur|tout|tous|toute|aujourd'hui|demain|ouvert|fermé|heures?|jours?|soir|matin|midi|semaine|voir|trajet|trajets|départ|arrivée|retour|correspondance|depuis|vers|prochain|dernier|premier)(?![\p{L}-])/iu;
const ACC=/[éèêàùûôîçœ]/i;
const found=new Map();let shotN=0;
async function grab(state){await p.waitForTimeout(700);
  const L=await p.evaluate(()=>{const o=[];const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;
    while(n=w.nextNode()){const e=n.parentElement;if(!e||e.closest('script,style,.no-tr,[lang=fr],#langBtn,.lang-pop'))continue;const r=e.getBoundingClientRect();if(!r.width&&!r.height)continue;
      if(getComputedStyle(e).display==='none'||e.closest('[hidden]'))continue;const t=n.nodeValue.replace(/\s+/g,' ').trim();if(t.length>1&&/[A-Za-zÀ-ÿ]/.test(t))o.push(t);}
    document.querySelectorAll('[aria-label],[placeholder],[title]').forEach(e=>{if(e.closest('[lang=fr],.no-tr'))return;['aria-label','placeholder','title'].forEach(a=>{const v=e.getAttribute(a);if(v&&/[A-Za-zÀ-ÿ]/.test(v))o.push('@'+a+': '+v.trim());});});
    return o;});
  for(const t of L){if(!(FRW.test(t)||ACC.test(t)))continue;if(/^(Le Petit Préf|Préfailles|Pornic|Saint-Nazaire|Nantes|Saint-Brevin|Saint-Michel|La Plaine|Tharon|Pirmil|Français)$/.test(t))continue;
    if(!found.has(t))found.set(t,new Set());found.get(t).add(state);}
  if(SHOT){await p.screenshot({path:`${SHOT}/${String(++shotN).padStart(2,'0')}_${state.replace(/[^a-z0-9]+/gi,'_')}.png`});}}
const go=async(h,fn)=>{await p.goto(BASE_URL+'/?en=1#'+h);await p.waitForTimeout(2200);if(fn){await p.evaluate(fn);await p.waitForTimeout(600);}};
const scrollAll=async(state)=>{const H=await p.evaluate(()=>document.documentElement.scrollHeight);for(let y=0;y<H;y+=1400){await p.evaluate(y=>scrollTo(0,y),y);await grab(state);}await p.evaluate(()=>scrollTo(0,0));};
const openAll=async()=>{await p.evaluate(()=>document.querySelectorAll('#main details').forEach(d=>d.open=true));await p.waitForTimeout(300);};
const views=['sejour','agenda','activites','cine','soirees','mer','spots','naviguer','peche','manger','venir','pratique','immobilier','plages','installer','apropos','recherche'];
for(const v of views){await go(v);await scrollAll(v);await openAll();await scrollAll(v+'+ouvert');}
// états particuliers
const st=[['agenda',()=>{CHG.agday(addDays(today(),3));render();},'agenda date'],['agenda',()=>{ACT.when&&ACT.when('dem');},'agenda demain'],
 ['soirees',()=>{CHG.soirday(today());render();},'soirees ce soir'],['cine',()=>{CHG.cday(addDays(today(),1));render();},'cine demain'],
 ['manger',()=>{S.mMom='soir';render();},'restos ce soir'],['manger',()=>{S.mk='tables';S.mMom='dmidi';render();},'restos demain midi'],['manger',()=>{S.mk='bar';render();},'restos bars'],
 ['manger',()=>{S.mk='marche';render();},'restos marches'],['manger',()=>{S.mk='produits';render();},'restos produits'],['manger',()=>{S.mk='tous';S.mgAll=true;S.mCadre='vue';render();},'restos vue mer'],
 ['manger',()=>{S.mk='tous';S.mView='carte';render();},'restos carte'],
 ['venir',()=>{S.trA='Nantes';S.trB='Pornic';S.trDay=addDays(today(),1);render();},'transports nantes pornic'],['venir',()=>{S.trA='Préfailles';S.trB='Saint-Nazaire';S.trAfter='09h00';S.trDay=addDays(today(),1);render();},'transports stnazaire 9h'],
 ['venir',()=>{S.trA='Préfailles';S.trB='Nantes';S.trDay=today();S.trAfter='23h30';render();},'transports plus de trajet'],
 ['activites',()=>{S.cat='mer';render();},'activites mer'],['activites',()=>{S.cat='assos';render();},'activites assos'],
 ['pratique',()=>{document.querySelectorAll('[data-act=popen]').forEach(b=>b.click());},'pratique ouvert']];
for(const [h,fn,name] of st){await go(h,fn);await openAll();await scrollAll(name);}
// carte : bulle
await go('manger',()=>{S.mk='tables';S.mView='carte';render();});await p.waitForTimeout(2500);
await p.evaluate(()=>{const a=S.mapList.find(x=>x.tel);if(window.LMAP&&a){L.popup().setLatLng([a.lat,a.lon]).setContent(mapPopup(a,null)).openOn(LMAP);}});await grab('carte bulle');
// menu et feuille Qui vient
await go('sejour');await p.evaluate(()=>openMenu());await grab('menu');
await go('sejour');await p.evaluate(()=>{try{openWho()}catch(e){}});await grab('qui vient');
// transports : ligne courte collée
await go('venir',()=>{S.trA='Préfailles';S.trB='Nantes';render();});await p.evaluate(()=>scrollTo(0,900));await p.waitForTimeout(400);await grab('transports ligne courte');
const names=new Set(await (async()=>{await go('activites');return p.evaluate(()=>{const o=[];const add=x=>{if(typeof x==='string')o.push(x.trim());};(ACTS||[]).forEach(a=>Object.values(a).forEach(add));['assos','events','cinema'].forEach(k=>(S[k]||[]).forEach(e=>Object.values(e).forEach(add)));try{PRAT.forEach(a=>Object.values(a).forEach(add));}catch(e){}return o;});})());
const norm=t=>t.replace(/\d+/g,'#').replace(/\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/g,'@J').replace(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/g,'@M');
const isName=t=>{const t2=t.replace(/^@\w+: /,'');return names.has(t2)||t.startsWith('@title: ')||/\d+ (rue|avenue|place|boulevard|bd|allée|chemin|route|impasse|quai)\b/i.test(t2);};
const okf=__dirname+'/anglais-ok.txt',ok=new Set(fs.existsSync(okf)?fs.readFileSync(okf,'utf8').split('\n').filter(Boolean):[]);
const res=[...found.entries()].filter(([t])=>!isName(t)).map(([t,s])=>({t,n:norm(t),s:[...s].slice(0,3)}));
if(process.argv.includes('--maj')){fs.writeFileSync(okf,[...new Set([...(process.env.PP_BASE?ok:[]),...res.map(x=>x.n)])].sort().join('\n')+'\n');console.log('anglais-ok.txt mis à jour :',res.length,'textes admis');await b.close();return;}
const neu=res.filter(x=>!ok.has(x.n));
if(er.filter(e=>!/Transition was aborted/.test(e)).length)console.log('Erreurs de page :',er.slice(0,5));
if(neu.length){console.log('Version anglaise : '+neu.length+' texte(s) encore en français. Ajoutez-les à donnees/en.json (exact ou rules), ou, si c\'est un nom propre, mettez-le en lang="fr" :');neu.forEach(x=>console.log('  « '+x.t.slice(0,160)+' »  ('+x.s.join(', ')+')'));await b.close();process.exit(1);}
console.log('Version anglaise : OK (aucun nouveau texte en français)');await b.close();})();
