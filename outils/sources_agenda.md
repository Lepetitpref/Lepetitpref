# Agendas à lire chaque matin : extension à 20 km autour de Pornic

Vérifié le 11/11/2026. Chaque URL a répondu (HTTP 200) depuis le shell, sauf mention contraire.

## Déjà lus d'après `outils/prompt_tache.md`
prefailles.fr (agenda et Préf'Infos), pornic.com (agenda Destination Pornic, passeport animations), saint-brevin.com, jds.fr/pornic, fest.fr, vide-greniers.org, brocabrac.fr, helloasso.com, site de La Plaine-sur-Mer, Club des Amis de Préfailles, Club de voile et École de voile de Préfailles, Le Canotier, Le Poche, casinos de Pornic et Saint-Brevin, pornicagglo.fr (Aquacentre seulement), Aquajade, les quatre cinémas (L'Atlantique, Ciné Toiles de Retz, Saint-Joseph, Cinéjade).

Note sur le « cinéma Saint-Gilles » : la fiche https://en.pornic.com/cinema-st-gilles.html renvoie au **Ciné Toiles de Retz**, 1 rue du Chaudron, Pornic (www.cinemapornic.fr). Il est donc déjà lu. Le **Théâtre Saint-Gilles**, 54 rue de Verdun, est un autre lieu : ses spectacles paraissent dans l'agenda de pornic.fr.

## À ajouter

### Pornic (ville et agglomération)
| Source | URL exacte | Ce qu'on y trouve |
|---|---|---|
| Agenda de la Ville de Pornic | https://www.pornic.fr/agenda/ (pages suivantes : `/agenda/page/2/`, `/page/3/`… ; fiches `https://www.pornic.fr/evenement/<slug>/`) | Agenda municipal : expositions, concerts, conférences, médiathèque Armel de Wismes, cérémonies, animations du Théâtre Saint-Gilles et des quartiers (Sainte-Marie, Le Clion). Environ 39 liens d'événements en première page aujourd'hui. |
| Événements de Pornic agglo Pays de Retz | https://www.pornicagglo.fr/evenement/ (flux RSS : https://www.pornicagglo.fr/evenement/?feed=rss2 ; page 2 : `/evenement//page/2`) | Spectacles de l'Amphithéâtre Thomas Narcejac (fiches `amphitheatre-<slug>`), ateliers environnement et déchets, Aquacentre, animations de l'agglo dans ses 15 communes. |
| Amphithéâtre Thomas Narcejac (Pornic, 17 rue Rostislaw Loukianoff) | https://www.pornicagglo.fr/pornic-agglo/sorties-loisirs/amphitheatre-thomas-narcejac/ et le programme PDF 2026-2027 : https://www.pornicagglo.fr/wp-content/uploads/2026/09/AMPHITHEATRE-programme26-27.pdf | Saison culturelle 2026-2027 (humour, magie, théâtre, musique) : dates, heures et tarifs dans le PDF ; lien vers la billetterie en ligne. Se lit avec `curl` + `pdftotext -layout`. |
| Agenda par commune de l'office de tourisme | https://www.pornic.com/animations-pornic-manifestation-pornic-agenda-pornic.html (une page par commune, voir plus bas) | Même base que l'agenda pornic.com, filtrée par commune. Pratique pour vérifier qu'une commune n'a pas été oubliée. |

### Communes de Pornic agglo Pays de Retz
| Commune | Agenda officiel de la mairie | Agenda de l'office de tourisme (pornic.com) | Ce qu'on y trouve |
|---|---|---|---|
| La Bernerie-en-Retz | https://mairie-labernerie.fr/vos-actualites/agenda/ et le **flux iCal** https://mairie-labernerie.fr/agenda/?ical=1 (fiches `https://mairie-labernerie.fr/evenement/<slug>/`) | https://www.pornic.com/animations-la-bernerie-en-retz-manifestation-la-bernerie-en-retz-agenda-la-bernerie-en-retz.html | Expositions, ateliers d'écriture, belote, village de Noël. Le flux iCal donne les dates et heures sous une forme lisible directement (DTSTART, SUMMARY, LOCATION). |
| Les Moutiers-en-Retz | https://www.mairie-lesmoutiersenretz.fr/systeme/agenda/ (fiches `/agenda/<slug>/`) | https://www.pornic.com/animations-les-moutiers-en-retz-manifestation-les-moutiers-en-retz-agenda-les-moutiers-en-retz.html | Théâtre (« Un dimanche au théâtre »), heure du conte à la médiathèque, stages, visites contées, commémorations. |
| Villeneuve-en-Retz (Bourgneuf, Fresnay) | https://villeneuvenretz.fr/agenda/ (fiches `https://villeneuvenretz.fr/agenda/event-<n>-<slug>.html`) et https://villeneuvenretz.fr/la-mairie/les-evenements-de-villeneuve-en-retz/ | https://www.pornic.com/animations-villeneuve-en-retz-manifestation-villeneuve-en-retz-agenda-villeneuve.html | Thés dansants, Caba'Retz (théâtre), Sainte-Cécile, musée du Pays de Retz, commémorations. Attention : villeneuve-en-retz.fr n'est **pas** le site de la mairie (domaine parqué) ; le bon est villeneuvenretz.fr. |
| Chauvé | https://www.chauve.fr/systeme/agenda/ et https://www.chauve.fr/manifestations-officielles/ | https://www.pornic.com/animations-chauve-manifestation-chauve-agenda-chauve.html | Peu d'événements (ateliers mémoire, permanences). L'agenda pornic.com est plus fourni pour les fêtes et associations. |
| Chaumes-en-Retz (Arthon, Chéméré) | https://www.chaumesenretz.fr/systeme/agenda/ (flux : https://www.chaumesenretz.fr/feed/?post_type=events) et la saison culturelle https://www.chaumesenretz.fr/saison-culturelle-2025-2026/ | https://www.pornic.com/animations-chaumes-en-retz-manifestation-caumes-en-retz-agenda-chaumes-en-retz.html | Concerts, théâtre amateur, festival Sons d'Afrique, vide-greniers, Repair Café, randonnée du Téléthon. Le domaine est chaumesenretz.fr (sans tirets) ; chaumes-en-retz.fr ne répond pas. La page de la saison culturelle 2026-2027 n'a pas été trouvée (seule celle de 2025-2026 est en lien). |
| Saint-Hilaire-de-Chaléons | https://www.saint-hilaire-de-chaleons.fr/agenda (fiches `/agenda/<n>`) | https://www.pornic.com/animations-saint-hilaire-de-chaleons-manifestation-saint-hilaire-de-chaleons-agenda-saint-hilaire-de-chaleons.html | Animations municipales et associatives. Les dates sont dans l'URL des fiches (`?start_date=`). |
| Saint-Michel-Chef-Chef / Tharon | Site de la mairie **non vérifié** : www.stmichelchefchef.fr a répondu 503 (WebFetch) et ne répond pas en shell. À réessayer. | https://www.pornic.com/animations-saint-michel-chef-chef-manifestation-saint-michel-chef-chef-agenda-saint-michel-chef-chef.html | En attendant, l'agenda pornic.com par commune est la source officielle disponible : feu d'artifice, concerts de l'été, arrivée du Père Noël à Tharon, marché. |
| Préfailles, La Plaine-sur-Mer, Pornic | déjà lus | pages par commune : `animations-prefailles-…`, `animations-la-plaine-sur-mer-…`, `animations-pornic-…` (même schéma) | Contrôle croisé. Pour La Plaine, l'URL exacte de l'agenda municipal est https://www.laplainesurmer.fr/systeme/agenda/. |

Autres pages par commune sur pornic.com, hors rayon ou à la limite : Cheix-en-Retz, Port-Saint-Père, Rouans, Sainte-Pazanne, Vue (`animations-<commune>-manifestation-<commune>-agenda-<commune>.html`, liens listés sur https://www.pornic.com/tout-l-agenda.html). Vue est à environ 18 km de Pornic ; les autres sont à 20 km ou plus.

### Sud-Estuaire (Communauté de communes du Sud Estuaire)
| Commune | URL exacte | Ce qu'on y trouve |
|---|---|---|
| Saint-Père-en-Retz (~14 km) | https://www.saintpereenretz.fr/evenements/ (page 2 : `?pno=2` ; **flux RSS** : https://www.saintpereenretz.fr/evenements/feed/) et la culture : https://www.saintpereenretz.fr/culture/ (Espace culturel Saint-Roch) | Spectacles (« Mangeur de lumière »), bourse aux jouets, théâtre, permanences. Les fiches datées sont aussi à `https://www.saintpereenretz.fr/evenements/AAAA-MM-JJ/`. Le site ne répond pas sans « www ». |
| Saint-Brevin-les-Pins (mairie) | https://www.saint-brevin.fr/systeme/agenda/ (fiches `/agenda/<slug>/`) et la saison culturelle https://www.saint-brevin.fr/agenda/la-prog-culture-2026-2027/ | Plus complet que saint-brevin.com pour la vie municipale : spectacles, Cinéfilou (cinéma jeune public), cyclocross, bourse aux jouets, expositions, distribution de compost. |
| Saint-Brevin (office de tourisme) | https://www.saint-brevin.com/agenda.html | Déjà cité dans le prompt sans URL exacte : voici l'adresse de l'agenda. Il couvre aussi Corsept, Saint-Père-en-Retz, Saint-Viaud, Paimbœuf et Frossay. |
| Corsept (~17 km) | https://www.corsept.fr/systeme/agenda/ (fiches `/agenda/<slug>/`) | Conférences, cérémonies, animations du CCAS. |
| Saint-Viaud (~17 km) | Pas d'agenda à proprement parler : articles d'actualité mensuels, par exemple https://www.saint-viaud.fr/actu_article_centre-socioculturel-intercommunal--Evenements-du-mois-de-novembre-2026_1634.html (page d'accueil https://www.saint-viaud.fr/) | Programme mensuel du centre socioculturel intercommunal. À lire une fois par mois plutôt que chaque matin. |

## Conseils de lecture
- Les sites « systeme/agenda » (La Plaine, Chauvé, Chaumes, Les Moutiers, Saint-Brevin, Corsept) partagent le même moteur : liste en page, une fiche par événement avec date, heure, lieu et contact. Le shell les lit avec `curl`.
- Formats les plus simples à exploiter : iCal de La Bernerie, RSS de Saint-Père-en-Retz, de Chaumes-en-Retz (`post_type=events`) et de Pornic agglo.
- Avant d'ajouter ces communes dans `events.json`, il faut élargir la liste fermée du champ `town` du prompt et des contrôles de `verifier.py` : Villeneuve-en-Retz, Chaumes-en-Retz, Saint-Père-en-Retz, Saint-Hilaire-de-Chaléons, Corsept, Saint-Viaud, Vue.
