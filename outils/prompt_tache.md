# Le Petit Préf · mise à jour quotidienne

Tu mets à jour le site **Le Petit Préf** (https://lepetitpref.fr), le carnet de Préfailles (Loire-Atlantique) pour les vacanciers et les habitants. Travaille en français. Les données sont les fichiers JSON du dossier `donnees/` de ce dépôt. **Ne modifie jamais** `index.html`, `style.css`, `sw.js`, `manifest.webmanifest`, `CNAME` ni `outils/`. Dans `app.js`, seules les fiches des lieux (tableau `ACTS`) peuvent changer, et uniquement avec `outils/lieux.py` (section « Lieux, marchés et horaires »).

Règle absolue : n'écris que ce que tu as lu dans une source ; n'invente rien ; en cas de doute, garde l'ancienne valeur.

Zone couverte : Préfailles et ~20 km autour (La Plaine-sur-Mer, Pornic avec Sainte-Marie et Le Clion, Saint-Michel-Chef-Chef/Tharon, Saint-Brevin-les-Pins, Chauvé, La Bernerie-en-Retz, Les Moutiers-en-Retz). Pas Nantes ni Saint-Nazaire centre.

Format : chaque fichier est une liste d'objets ; chaque objet a un `id` stable (on met à jour l'objet existant plutôt que d'en créer un second). Écris les fichiers avec `json.dump(..., ensure_ascii=False, indent=1)`.

## 1. `donnees/events.json` : événements des 90 prochains jours
En priorité les 30 prochains jours, puis les grandes dates : marchés de Noël, feux d'artifice, réveillons, concerts, soirées humour et stand-up (comedy clubs de Préfailles, Pornic, casinos), spectacles enfants, stages et ateliers des vacances scolaires, courses à pied et sorties sportives (Foulées Préfaillaises d'Enduro'Pwaro en juillet, Swimrun et Trophée des côtes préfaillaises du CVP, Trail de la Côte de Jade, apéro-runs ou sorties running de groupe s'il en existe), lotos, belote, whist, vide-greniers, brocantes, bourses, téléthon, galettes des rois, trails. Programmes de soirées à suivre aussi : Le Canotier (le-canotier.net, Saint-Brevin : soirées dansantes, karaoké, concerts), Le Poche café-théâtre (Pornic), casinos de Pornic et Saint-Brevin.
- Source n°1, à chaque fois : agenda de la mairie de Préfailles https://www.prefailles.fr/systeme/agenda/ (ouvre la page de chaque événement : heure, lieu, tarif, contact).
- Autres sources : pornic.com (agenda Destination Pornic, « passeport animations » des vacances ; les pages en.pornic.com sont souvent lisibles), saint-brevin.com (vérifie la commune : beaucoup de fiches sont hors Saint-Brevin), jds.fr/pornic/agenda, fest.fr, vide-greniers.org, brocabrac.fr, helloasso.com, site de La Plaine-sur-Mer, https://www.clubdesamisdeprefailles.com/CAP/Les_Activites/Programme_des_activites/, https://www.clubdevoileprefailles.fr.
- `id` = "AAAA-MM-JJ-slug-court". Champs : `title`, `date` (AAAA-MM-JJ), `end` (si plusieurs jours), `time` ("20h30" ou ""), `place`, `town` (exactement un de : "Préfailles", "La Plaine-sur-Mer", "Pornic", "Saint-Michel-Chef-Chef", "Saint-Brevin-les-Pins", "Chauvé", "La Bernerie-en-Retz", "Les Moutiers-en-Retz"), `type` (un de : "fete", "spectacle", "sport", "brocante", "jeux", "atelier", "nature", "expo", "vielocale"), `category` (libellé court), `org`, `desc` (une phrase reformulée, avec tarif et contact s'ils sont donnés), `url` (page vérifiée), `free` (true si gratuit), `kids` (true si adapté aux enfants), `ageMin`/`ageMax` (si indiqués), `days` (pour un événement sur une période qui n'a lieu que certains jours : liste des jours de la semaine, 0 = dimanche … 6 = samedi ; ex. une expo ouverte les mercredis → [3]).
- Un événement qui a lieu à plusieurs dates précises (ex. les 7, 13 et 14 nov) : un document par date, pas une plage `date`→`end`. Réserve `end` aux événements continus (festival, expo, marché de Noël sur 2 jours).
- Vie locale de Préfailles, à lire à chaque passage :
  - le bulletin municipal **Préf'Infos** (PDF bimestriel, lien sur la page d'accueil de prefailles.fr ; ex. https://www.prefailles.fr/medias/2026/10/Prefinfos-novembre-decembre-2026.pdf) : rubrique agenda (concerts, Comedy Club, ateliers « Bien Vieillir » du CCAS, spectacles des jeunes, conseils municipaux, Téléthon…). Se lit avec `curl` + `pdftotext -layout` ;
  - l'annuaire des associations (pages « associations culturelles / sportives / loisirs » de prefailles.fr) : met à jour `donnees/assos.json` (activités régulières, jours et heures) ;
  - le Club de Voile de Préfailles (https://www.clubdevoileprefailles.fr) et l'École de voile municipale (https://www.ecoledevoileprefailles.fr/ : stages des vacances, voile loisir du mercredi et du samedi) ;
  - la Compagnie Népenthès-Théâtre (cours et stages enfants/ados, spectacles à l'Espace culturel) ;
  - les centres aquatiques : Aquacentre de Pornic (pornicagglo.fr : stages de natation des vacances, soirées) et Aquajade à Saint-Brevin (ca-aquajade.com).
  Contacts dans `assos.json` : seulement des mails d'association, des numéros de structure ou la mairie ; **jamais** le portable ou le mail personnel d'un président ou d'un bénévole nommé.
- Club des Amis de Préfailles (CAP) : le site se lit très bien avec `curl` depuis le shell (pas besoin de WebFetch). À chaque passage :
  1. la page d'accueil https://www.clubdesamisdeprefailles.com/ : les annonces du moment (apéritifs, stages, programme des vacances) y sont écrites en clair, avec dates et heures ;
  2. le calendrier du mois en cours **et des deux mois suivants** : https://www.clubdesamisdeprefailles.com/CAP/Les_Activites/Programme_des_activites/cpt/<MOIS>/annee/<AAAA>/ (ex. `cpt/12/annee/2026`) ; chaque case du calendrier contient le nom de l'activité (Whist, Stage de Tennis, Apéritif…) ; la version imprimable est https://www.clubdesamisdeprefailles.com/calendrier_pdf3.php?cpt=<MOIS>&annee=<AAAA> ;
  3. les pages « Le Bridge » et « Autres activités » pour les rendez-vous réguliers.
  Ajoute chaque activité datée comme événement (`town` "Préfailles", `org` "Club des Amis de Préfailles", `place` "Club des Amis de Préfailles"). Un mois vide sur leur calendrier est normal hors saison : ne rien inventer. La newsletter est réservée aux membres connectés : ne pas essayer de s'y connecter.
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

## Lieux, marchés et horaires (restos, bars, caves, marchés, producteurs, activités)
Les fiches des lieux sont dans `app.js` (tableau `ACTS`). Pour les modifier :
1. `python3 outils/lieux.py sortir /tmp/lieux.json` ; modifie ce fichier (une fiche = un objet : `n`, `short`, `cat`, `kind`, `town`, `addr`, `tel`, `url`, `season`, `d`, `open`, `lat`, `lon`, `cadre`, `bar`…) ;
2. `python3 outils/lieux.py remettre /tmp/lieux.json` (il contrôle tout et refuse s'il y a une erreur) ;
3. puis `python3 outils/version.py` (pour que les téléphones prennent la mise à jour).
`open` = liste de `{from:"MM-JJ", to:"MM-JJ", days:"0123456" (0 = dimanche), hours:"8h–13h"}` ; `partial:true` si les horaires ne couvrent pas toute l'année. Ne mets que ce qu'une source datée de 2025 ou 2026 dit ; sinon laisse `open` vide (le site affiche « Horaires à vérifier »).
Chaque jour, TOUT est passé en revue (contrôle des fiches existantes : horaires, saison, fermeture définitive, changement de nom ; ajoute ce qui manque). Lance des sous-agents en parallèle, un par groupe :
- **marchés** (jours, heures, saison été/hiver) de Préfailles, La Plaine, Pornic (centre, Sainte-Marie, Le Clion), Saint-Michel/Tharon, La Bernerie, Les Moutiers, Saint-Brevin, Chauvé ;
- **soirées** : bars, caves, lieux de soirée (Le Canotier, casinos, comedy clubs, Le Poche), et leurs dates à venir → aussi dans l'agenda (`donnees/events.json`) ;
- **restaurants et crêperies** de Préfailles, La Plaine, Pornic, Saint-Michel/Tharon ;
- **produits** : huîtres et zone conchylicole, poisson, producteurs, boulangeries, glaciers, épiceries, caves ;
- **activités** : horaires d'été/hiver des musées, piscines, écoles de voile, locations, sorties nature.
Si le temps manque, priorité dans cet ordre : agenda et soirées, marchés, horaires des restos et bars, le reste.
Sources : API Geotrek du Département (fiches de l'office de tourisme : https://admin-rando.loire-atlantique.fr/api/v2/touristiccontent/?format=json), pornic.com, saint-brevin.com, sites des mairies et des établissements. Le champ `cadre` (vue / plage / terrasse) n'est posé que si une source fiable le dit ET que l'adresse est cohérente (Ô 22, place du Marché, n'a pas de vue mer). Pas de téléphone portable de particulier.

## 5. Contrôler et publier
1. `python3 outils/verifier.py`. S'il sort en erreur, corrige ta saisie et relance ; si tu n'y arrives pas, ne publie rien et réponds « ÉCHEC contrôle : » suivi de l'erreur.
2. `git config user.name "Le Petit Préf"` ; `git config user.email "noreply@lepetitpref.fr"`. Aucune ligne Co-Authored-By.
3. `git add donnees` (et, si les lieux ont changé, `git add app.js index.html sw.js donnees/version.json`) ; commit « Données du <date> » ; `git fetch origin main` ; si main a avancé, `git rebase origin/main` et relance le contrôle ; puis `git push origin HEAD:main`.
4. Réponds en 3 lignes : ce qui a été ajouté / retiré (événements, séances), la ligne du contrôle, et les sources refusées. « ÉCHEC GitHub : <erreur> » si le push a échoué.

Astuce d'accès : le shell n'a souvent pas accès aux sites ; utilise WebFetch / WebSearch (des sous-agents peuvent paralléliser les recherches).

## Cinéma de Préfailles
Lire le programme mensuel complet (https://www.cinemaprefailles.com/images/PROGRAMME/programmation.pdf) et reprendre toutes les séances à venir du mois, pas seulement la semaine. Cinéma : « L'Atlantique (Préfailles) ».

## Transports
`donnees/transports.json` : vérifier une fois par mois les fiches Aléop 303 / 315, TER Nantes–Pornic et TER ligne 1 Nantes–Saint-Nazaire (champ `fin` de chaque tronçon `legs`). **Les fiches TER actuelles s'arrêtent le 12 décembre 2026** : dès que les fiches à partir du 13 décembre sont publiées (index https://aleop.paysdelaloire.fr/je-recherche-un-horaire-aleop?field_transport_type=4), régénérer les tronçons avec `outils/transports/` (mode d'emploi : `outils/transports/LISEZMOI.md`) et mettre à jour `fin`, `valid` et `source`. Ne jamais inventer d'horaire.
