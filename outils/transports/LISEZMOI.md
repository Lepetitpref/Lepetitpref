# Horaires des cars et trains

Les horaires de `donnees/transports.json` (clé `legs`) sont **extraits des fiches officielles Aléop**, colonne par colonne, et non recopiés à la main.

1. Télécharger les fiches PDF (liens dans `donnees/transports.json`, champ `source.url` de chaque ligne ; index : https://aleop.paysdelaloire.fr/je-recherche-un-horaire-aleop, filtre « train » pour les TER) dans un dossier, par ex. `tmp/` :
   `f303.pdf` (car 303), `f315.pdf` (car 315), `fter.pdf` (TER Nantes – Pornic), `fl1.pdf` (TER ligne 1 Nantes – Saint-Nazaire).
2. Extraire :
   ```
   python3 outils/transports/aleop.py tmp/f303.pdf > tmp/c303.json
   python3 outils/transports/aleop.py tmp/f315.pdf > tmp/c315.json
   python3 outils/transports/ter.py tmp/fter.pdf > tmp/cter.json
   python3 outils/transports/ter.py tmp/fl1.pdf > tmp/cl1.json
   python3 outils/transports/build.py tmp
   ```
   `build.py` écrit `tmp/legs.json` (un tronçon par ligne et par sens) ; le recopier dans `transports.json` (clé `legs`), avec `debut`/`fin`/`source` de la nouvelle fiche.
3. Contrôler à l'œil quelques colonnes sur le PDF (jours « Sam » / « Dim & JF », renvois A/B, « à partir du », « uniquement le »).

À savoir : `aleop.py` lit les cases d'en-tête (rectangles) pour attribuer les jours ; `ter.py` recolle les numéros de train écrits chiffre par chiffre. Les dates de validité des TER (« à partir du 05/10 ») sont lues avec l'année 2026 : à adapter pour une fiche 2027 (variable dans `ter.py`).
