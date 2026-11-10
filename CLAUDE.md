# Le Petit Préf · consignes pour Claude

Site statique (GitHub Pages, domaine lepetitpref.fr) : le carnet de Préfailles (Loire-Atlantique) pour les vacanciers et les habitants. Écris en français.

## Règles
- **Anonymat** : aucun nom, prénom ni adresse personnelle de l'éditeur dans le site, les commits ou les données. Commits signés `Le Petit Préf <noreply@lepetitpref.fr>`, sans ligne Co-Authored-By.
- **Pas de données personnelles** publiées (pas de covoiturage, pas de téléphones de particuliers).
- N'invente jamais une date, un horaire ou un tarif : tout vient d'une source lue.

## Fichiers
- `index.html` : sprite d'icônes SVG, en-tête (marque, loupe, bouton Menu), rubriques `#rail` (5 onglets texte), pied de page.
- `app.js` : tout le site. Ligne 3 = données figées (TIDE, ACTS, LAND). Vues : `vSejour` = accueil « Aujourd'hui » (3 cas : habitant / 1er lancement, week-end entre amis, vacances en famille), `vAgenda`, `vCine`, `vMer` (Marées), `vManger`, `vActs` (« À faire »), `vPeche` (`#peche`, pêche à pied : bonnes marées calculées, sécurité, tableau `PECHE` des tailles à remplir avec des données vérifiées), `vPratique` (`#pratique` : urgences, santé, mairie, horaires utiles ; baignade et vigilance météo en une ligne avec lien « source officielle »), `vVenir`, `vInstaller`, `vApropos`, `vSearch`. Navigation par le hash (`#sejour`, `#agenda`, `#cine`, `#mer`, `#manger`, `#activites`, `#peche`, `#pratique`, `#venir`, `#installer`, `#apropos`, `#recherche`). Feuille « Qui vient ? » : `openWho()` ; menu : `openMenu()`. Les actions des vues passent par `data-act` / `data-chg` (objets `ACT` et `CHG`).
- Groupe « Qui vient ? » : localStorage `pp-groupe` = `{v:1, actif, habitant, groupes:{amis|famille|couple|solo:{nom, adultes, enfants:[{age}], type}}, quand:{mode:"jour"|"weekend"|"dates", du, au}, rayon, pluie}`. Autres clés : `pp-cin`, `cf-where`, `pp-theme`, `pp-install`. Rien n'est envoyé au serveur.
- Immobilier : abandonné (plus de vue ni de chargement ; `donnees/immo.json` n'est plus lu).
- `style.css` : jetons dans `:root` (fond #f6f6f3, encre #1c1d22, gris `--muted`/`--faint`, filet `--line`, accent bleu de mer `--accent`, un seul aplat pastel `--sky` réservé à la marée), thème sombre via `prefers-color-scheme` et `data-theme`. Composants : `.row` (liste dense, `details.row-d` pour la fiche), `.dl` (date en colonne), `.chip`, `.seg`, `.daybar`, `.tide`, `.sheet`, `.menu`. Inter Tight + Newsreader.
- `donnees/*.json` : données réécrites chaque matin par la tâche planifiée (`outils/prompt_tache.md`). Contrôle : `python3 outils/verifier.py`.
- `sw.js` : hors ligne.
- **Après toute modification de index.html, app.js ou style.css, lance `python3 outils/version.py`** avant le commit : les téléphones et l'app installée se mettent alors à jour seuls (rechargement automatique à l'ouverture, ou bandeau « Une nouvelle version du Petit Préf est en ligne · Mettre à jour »). Pas besoin pour les seules données.

## Design
Sobre, dans l'esprit de Concret : chaque section est un **bloc** (`sec()` → `.sec.blk` : carte blanche, liseré de couleur à gauche, titre sur bandeau teinté ; couleur choisie par `secCol()` selon le titre : mer `--i-sea`, sorties `--i-act`, ciné `--i-cine`, manger `--i-food`, transports `--seagreen`, urgences `--warn`, nature `--i-nat`) ; les listes groupées (Manger, À faire) font de même avec `.grps .group` + `.list`, et l'Agenda avec `.day`. Listes denses à filet fin dans les blocs, titres Newsreader de taille raisonnable, barres de sélection `.seg` en vert de mer (`--seagreen`), puce « Tout » en encre, puces de date en bleu, poids de police 400–600. Cibles tactiles ≥ 44 px, texte ≥ 14 px. Deux publics : vacanciers (dates de séjour, en option) et habitants (aucune notion de séjour imposée).

## Vérifier avant de pousser
`node --check app.js`, `python3 outils/verifier.py`, puis ouvrir la page (Playwright, device « iPhone 13 ») et parcourir les 5 rubriques, le menu, la feuille « Qui vient ? », `#peche` et `#pratique` sans erreur console, en clair et en sombre.

## Ajouts de novembre 2026
- Onglets : Aujourd'hui, Agenda, Mer, Manger, Transports (#venir). Dans Agenda, une barre « Sorties · À faire · Ciné » (`segAC`) mène à #agenda, #activites et #cine (PARENT → agenda).
- Manger : distance propre, Préfailles par défaut (`S.mWhere`, clé `pp-mwhere`), indépendante de la distance globale.
- Transports : trajets calculés (`journeys()`) à partir des tronçons `legs` de `donnees/transports.json` (car 303, 315, TER Pornic–Nantes, TER 1 Saint-Nazaire–Nantes), extraits des fiches officielles par `outils/transports/` (voir son LISEZMOI). Correspondances à Pornic (arrêt Théâtre St-Gilles ↔ gare, 12 min car↔train) et à Saint-Nazaire (gare, 8 min), réglées dans `transports.json` → `correspondances`. Destinations Pornic / Nantes / Saint-Nazaire (`S.trTo`), sens `S.trDir`. Trains 4 chiffres = TGV (réservation).
- Distance globale `S.where` (ici / 10 / 20 km, défaut 20, clé `cf-where`) : réglée en haut de l'accueil, appliquée partout.
- Code couleur des puces : bleu (`.chip-q`) = quand, pastels (`.chip-k k-sea|food|act|nat`) = quoi, contour (`.chip`) = filtres ; puce sélectionnée en vert de mer (jamais en noir). Barres `.filters` collantes sous les onglets, dans un cadre blanc à bord fin.
- Météo, vent, houle, température de l'eau : Open-Meteo appelé depuis le téléphone (p2b_wx.js, cache `pp-wx` 1 h). Spots dans `SPOTSX` (orientation `face`, fenêtre de houle `swell`) ; verdicts calculés par `judge()`.
- Transports : `donnees/transports.json` (fiches Aléop 303, 315 et TER Pornic–Nantes, vacances zone B, jours fériés). Le TER n'est valable que jusqu'au 12/12/2026 : à remplacer par la fiche suivante.
- Le cinéma de Préfailles s'affiche « Préfailles » (données : « L'Atlantique (Préfailles) »).
- Page Mer : le bloc météo de la mer (`.sea`) est en vert d'eau (`--mint`), la marée reste en ciel (`--sky`) : jamais deux grands blocs bleus à la suite.
- Surf heure par heure : `surfHours()` note chaque heure de jour (lever +1 h → coucher) en combinant houle, vent et marée (`tideAtH()`). Chaque spot de surf a une fenêtre `tide:[min,max]` et `tideTxt` ; hors fenêtre, la note baisse d’un cran. Intégré à chaque spot dans « Les spots » (`spotsSec`, `id="spots"`, ligne « Surf de Xh à Yh » + barre heure par heure dans la fiche). Vue `#spots` = page Mer ouverte sur les spots (entrée « Spots et glisse » du menu).
- Page Mer : eau en tête (`.mer-eau`), puis « Glisse aujourd'hui » (lignes cliquables → `data-act="spot"` ouvre `#spot-<id>`, « Non » regroupés), « Les spots », météo de la mer, marée, grandes marées.
