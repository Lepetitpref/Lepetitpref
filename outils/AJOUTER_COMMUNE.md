# Ajouter une commune au choix « Je suis à »

Le site part d'un point de départ, `BASE` (app.js, constante `BASES`) : Préfailles ou Pornic aujourd'hui. Tout ce qui suit dépend de ce point. Pour ajouter une commune, on remplit chaque ligne ci-dessous, avec une source lue pour chaque donnée (rien d'inventé).

## 1. Zone couverte (souvent rien à faire)
- La mise à jour du matin couvre déjà ~20 km autour de Préfailles et de Pornic : Saint-Brevin, Saint-Michel–Tharon, La Plaine, La Bernerie, Les Moutiers, Bourgneuf, Chauvé… (liste dans `prompt_tache.md`).
- Si la nouvelle commune ajoute des villes à 20 km qui ne sont pas couvertes : les ajouter à la liste `town` de `prompt_tache.md`, à `verifier.py` (TOWNS), à `TOWN_LL` (app.js) et aux sources de `sources_agenda.md`.

## 2. Point de départ
- `BASES` : `k` (identifiant court, sans accent), `n` (nom affiché), `s` (nom court), `lat`/`lon` (centre-bourg), `r` (rayon « dans la commune », en km).
- Lien partagé : `?ici=<k>` (aujourd'hui seulement pour Pornic : à généraliser).
- Photo d'accueil libre de droits (`images/<k>.jpg`, Wikimedia Commons), crédit dans À propos.

## 3. Ce qui suit la commune
| Rubrique | Où dans app.js | À fournir |
|---|---|---|
| Distances, « À <commune> » | `TOWN_KM`, `isBase`, `kmTxt` | automatique |
| Météo, vent | `WX`, cache `pp-wx-<k>` | automatique |
| Marée | `tideCard` (libellé) | port de référence le plus proche (SHOM) ; calcul actuel calé sur Pornic |
| Ciné | `CINF`, `CIN0` | salles de la commune et ordre des filtres |
| Restos, marchés, activités | fiches `ACTS` (`town`) | déjà couvertes si la commune est dans la zone |
| Transports | `ORIG`, `TRDEST`, `donnees/transports.json` (`legs`) | arrêts de car / gare de la commune, tronçons extraits des fiches officielles (`outils/transports/`) |
| Pratique : mairie, poste, sécurité | `PRATP` (Pornic) | même format pour la commune (mairie, annexes, La Poste data.laposte.fr, police municipale, gendarmerie) |
| Poubelles | `BIN_PREF`, `prDechetsP`, `binNext()` | jours de collecte par secteur (intercommunalité) |
| Défibrillateurs | `prDaeP` / `prDaeB` | Géo'DAE |
| Pharmacies, santé | `PRAT` | déjà à moins de 20 km : vérifier le tri par distance |
| Immobilier | `outils/ventes.py`, `outils/urbanisme.py`, `outils/adresses.py` | code INSEE de la commune ; parcelles du cadastre ; PLU |
| Accueil | `vSejour`, `homeNow`, portes | phrases « à <commune> » |
| Pages Google | `outils/pages.js` (`COMMUNES`) | page « Que faire à <commune> » |
| Anglais | `donnees/en.json` | nouvelles phrases d'interface |

## 4. Choix de la commune (interface)
- Visible en permanence dans l'en-tête, avec la liste des communes ; question à la première visite.
- Clé `pp-base` (localStorage) ; jamais envoyée au serveur.

## 5. Vérifier
`node --check app.js`, `python3 outils/verifier.py`, `node outils/anglais.js`, puis parcourir chaque rubrique avec la nouvelle commune (Playwright, iPhone 13), en clair et en sombre, et faire relire.
- Cinéma : chercher les salles de la commune (Allociné), les ajouter à CINES, cinOK, CINF, cinName dans app.js, SALLES dans outils/bandes_annonces.py et la liste des salles de prompt_tache.md (section 2).
- Spots de glisse : chercher les spots reconnus de la commune (FFVL, arrêtés municipaux de kite, écoles, office de tourisme) et les ajouter à SPOTSX (position sur la plage, orientation face, activités, dangers, interdictions KBAN), photo de plage dans SPOTPH.
