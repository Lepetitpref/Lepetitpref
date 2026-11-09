# Le Petit Préf · mise à jour quotidienne

Tu mets à jour le site **Le Petit Préf** (https://lepetitpref.fr), carnet familial autour de la maison de Préfailles (Loire-Atlantique). Travaille en français. Les données sont les fichiers JSON du dossier `donnees/` de ce dépôt. **Ne modifie jamais** `index.html`, `style.css`, `app.js`, `sw.js`, `manifest.webmanifest`, `CNAME` ni `outils/`.

Règle absolue : n'écris que ce que tu as lu dans une source ; n'invente rien ; en cas de doute, garde l'ancienne valeur.

Zone couverte : Préfailles et ~20 km autour (La Plaine-sur-Mer, Pornic avec Sainte-Marie et Le Clion, Saint-Michel-Chef-Chef/Tharon, Saint-Brevin-les-Pins, Chauvé, La Bernerie-en-Retz, Les Moutiers-en-Retz). Pas Nantes ni Saint-Nazaire centre.

Format : chaque fichier est une liste d'objets ; chaque objet a un `id` stable (on met à jour l'objet existant plutôt que d'en créer un second). Écris les fichiers avec `json.dump(..., ensure_ascii=False, indent=1)`.

## 1. `donnees/events.json` : événements des 90 prochains jours
En priorité les 30 prochains jours, puis les grandes dates : marchés de Noël, feux d'artifice, réveillons, concerts, spectacles enfants, stages et ateliers des vacances scolaires, lotos, belote, whist, vide-greniers, brocantes, bourses, téléthon, galettes des rois, trails.
- Source n°1, à chaque fois : agenda de la mairie de Préfailles https://www.prefailles.fr/systeme/agenda/ (ouvre la page de chaque événement : heure, lieu, tarif, contact).
- Autres sources : pornic.com (agenda Destination Pornic, « passeport animations » des vacances ; les pages en.pornic.com sont souvent lisibles), saint-brevin.com (vérifie la commune : beaucoup de fiches sont hors Saint-Brevin), jds.fr/pornic/agenda, fest.fr, vide-greniers.org, brocabrac.fr, helloasso.com, site de La Plaine-sur-Mer, https://www.clubdesamisdeprefailles.com/CAP/Les_Activites/Programme_des_activites/, https://www.clubdevoileprefailles.fr.
- `id` = "AAAA-MM-JJ-slug-court". Champs : `title`, `date` (AAAA-MM-JJ), `end` (si plusieurs jours), `time` ("20h30" ou ""), `place`, `town` (exactement un de : "Préfailles", "La Plaine-sur-Mer", "Pornic", "Saint-Michel-Chef-Chef", "Saint-Brevin-les-Pins", "Chauvé", "La Bernerie-en-Retz", "Les Moutiers-en-Retz"), `type` (un de : "fete", "spectacle", "sport", "brocante", "jeux", "atelier", "nature", "expo", "vielocale"), `category` (libellé court), `org`, `desc` (une phrase reformulée, avec tarif et contact s'ils sont donnés), `url` (page vérifiée), `free` (true si gratuit), `kids` (true si adapté aux enfants), `ageMin`/`ageMax` (si indiqués), `days` (pour un événement sur une période qui n'a lieu que certains jours : liste des jours de la semaine, 0 = dimanche … 6 = samedi ; ex. une expo ouverte les mercredis → [3]).
- Un événement qui a lieu à plusieurs dates précises (ex. les 7, 13 et 14 nov) : un document par date, pas une plage `date`→`end`. Réserve `end` aux événements continus (festival, expo, marché de Noël sur 2 jours).
- Club des Amis de Préfailles : si la page Programme échoue, essaie la page d'accueil et https://www.clubdesamisdeprefailles.com/CAP/Contacts/Les_newsletters/ (whist, bridge, apéritifs, stages).
- Retire les événements dont la date de fin est passée depuis plus de 2 jours.

## 2. `donnees/cinema.json` : séances des 10 prochains jours
- L'Atlantique (Préfailles) : PDF https://www.cinemaprefailles.com/images/PROGRAMME/programmation.pdf, ou allocine.fr/seance/salle_gen_csalle=W4477.html ; `cinema` = "L'Atlantique (Préfailles)".
- Ciné Toiles de Retz (Pornic) : https://www.cinemapornic.fr/films/horaires.html et son PDF hebdo ; allociné P0716 ; `cinema` = "Ciné Toiles de Retz (Pornic)".
- Cinéma Saint-Joseph (Pornic) : cinestjoseph44.fr ou allociné P2368 ; `cinema` = "Cinéma Saint-Joseph (Pornic)".
- Cinéjade (Saint-Brevin) : allociné W0012 ; `cinema` = "Cinéjade (Saint-Brevin-les-Pins)".
- `id` = "AAAA-MM-JJ-<atlantique|toiles-de-retz|saint-joseph|cinejade>-film-slug". Champs : `cinema`, `film`, `date`, `times` (liste de "20h30"), `version` (VF/VOST), `genre` (ou mention : ciné-goûter, avant-première, jeune public dès X ans), `kids`.
- Retire les séances passées. Si une source est inaccessible, garde ses séances déjà présentes.

## 3. Immobilier
Immobilier : abandonné pour l'instant, ne rien faire.

## 4. `donnees/status.json`
`{"updatedAt": "<ISO, heure de Paris>", "bulletin": {"date": "JJ/MM", "title": "Glisse du jour", "text": "2–3 phrases"}}` : houle (hauteur, période) et vent (nœuds, direction) aujourd'hui pour Préfailles / Saint-Brevin ; surfable ou non à Saint-Brevin et à la Pointe Saint-Gildas ; wing (≈ 12–25 nœuds) ou bateau ; avis de coup de vent s'il y en a. Sources : windfinder (Saint-Brevin), surfnerd (Préfailles), windmorbihan.com/saint-gildas. Sans prévision fiable : `"bulletin": null`.

## 5. Contrôler et publier
1. `python3 outils/verifier.py`. S'il sort en erreur, corrige ta saisie et relance ; si tu n'y arrives pas, ne publie rien et réponds « ÉCHEC contrôle : » suivi de l'erreur.
2. `git config user.name "Le Petit Préf"` ; `git config user.email "noreply@lepetitpref.fr"`. Aucune ligne Co-Authored-By.
3. `git add donnees` ; commit « Données du <date> » ; `git fetch origin main` ; si main a avancé, `git rebase origin/main` et relance le contrôle ; puis `git push origin HEAD:main`.
4. Réponds en 3 lignes : ce qui a été ajouté / retiré (événements, séances), la ligne du contrôle, et les sources refusées. « ÉCHEC GitHub : <erreur> » si le push a échoué.

Astuce d'accès : le shell n'a souvent pas accès aux sites ; utilise WebFetch / WebSearch (des sous-agents peuvent paralléliser les recherches).
