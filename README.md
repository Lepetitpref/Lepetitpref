# Le Petit Préf

Le carnet familial de Préfailles (Loire-Atlantique) : agenda, cinéma, marées, surf, restaurants et activités, jour par jour pendant un séjour.
Site statique publié par GitHub Pages sur **https://lepetitpref.fr**.

## Organisation

| Fichier | Rôle |
|---|---|
| `index.html`, `style.css`, `app.js` | La page (aucun outil de construction). |
| `donnees/*.json` | Les données, réécrites chaque matin par la tâche planifiée. |
| `outils/prompt_tache.md` | Le texte de référence de la mise à jour quotidienne. |
| `outils/verifier.py` | Contrôle des données avant publication. |
| `manifest.webmanifest`, `sw.js`, `icons/` | Installation sur l'écran d'accueil et usage hors ligne. |
| `CNAME` | Le nom de domaine (lepetitpref.fr, chez OVH). |

## Données

Chaque fichier de `donnees/` est une liste d'objets avec un champ `id` stable :
`events.json` (événements), `cinema.json` (séances), `immo.json` (annonces), `assos.json` (associations).
`status.json` contient `updatedAt` et le bulletin « Glisse du jour ».

Aucune donnée personnelle n'est publiée.
