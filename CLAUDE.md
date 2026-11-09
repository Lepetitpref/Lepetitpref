# Le Petit Préf · consignes pour Claude

Site statique (GitHub Pages, domaine lepetitpref.fr) : le carnet de Préfailles (Loire-Atlantique) pour les vacanciers et les habitants. Écris en français.

## Règles
- **Anonymat** : aucun nom, prénom ni adresse personnelle de l'éditeur dans le site, les commits ou les données. Commits signés `Le Petit Préf <noreply@lepetitpref.fr>`, sans ligne Co-Authored-By.
- **Pas de données personnelles** publiées (pas de covoiturage, pas de téléphones de particuliers).
- N'invente jamais une date, un horaire ou un tarif : tout vient d'une source lue.

## Fichiers
- `index.html` : en-tête (marque, loupe, bouton Menu, rubriques `#rail`), pied de page.
- `app.js` : tout le site (vues `vSejour` = accueil « Aujourd'hui », `vAgenda`, `vCine`, `vMer`, `vManger`, `vActs` = « À faire », `vVenir`, `vPratique`, `vInstaller`, `vImmo`, `vApropos`, `vSearch`). Navigation par le hash (`#sejour`, `#agenda`…). Menu façon Concret : `openMenu()`.
- `style.css` : jetons de couleur dans `:root` (fond #f6f6f3, accent `--sea`, blocs `--fd-ciel` / `--fd-peche` / `--fd-brume` comme sur Concret), Inter Tight + Newsreader.
- `donnees/*.json` : données réécrites chaque matin par la tâche planifiée (`outils/prompt_tache.md`). Contrôle : `python3 outils/verifier.py`.
- `sw.js` : hors ligne. **Change la constante `V` à chaque modification de app.js / style.css** pour que les téléphones prennent la nouvelle version.

## Design
Sobre, dans l'esprit de Concret : une seule couleur d'accent, cartes blanches à filet fin, grands titres en Newsreader, poids de police légers (400–600). Cibles tactiles ≥ 44 px, texte ≥ 14 px. Deux publics : vacanciers (dates de séjour, en option) et habitants (aucune notion de séjour imposée).

## Vérifier avant de pousser
`node --check app.js`, `python3 outils/verifier.py`, puis ouvrir la page (Playwright, device « iPhone 13 ») et parcourir les 5 rubriques et le menu sans erreur console.
