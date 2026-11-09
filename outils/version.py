#!/usr/bin/env python3
"""Nouvelle version du site : à lancer après toute modification de index.html, app.js ou style.css (pas pour les données).
Met la même version dans index.html (meta pp-version et ?v= des fichiers), donnees/version.json et sw.js.
Les téléphones la voient au prochain retour sur l'app : rechargement automatique ou bandeau « Mettre à jour »."""
import re, json, pathlib, datetime, zoneinfo
R = pathlib.Path(__file__).resolve().parent.parent
v = datetime.datetime.now(zoneinfo.ZoneInfo("Europe/Paris")).strftime("%Y%m%d-%H%M")
h = (R / "index.html").read_text(encoding="utf-8")
h = re.sub(r'(<meta name="pp-version" content=")[^"]*', r'\g<1>' + v, h)
h = re.sub(r'(style\.css|app\.js)(\?v=[^"]*)?"', lambda m: f'{m.group(1)}?v={v}"', h)
(R / "index.html").write_text(h, encoding="utf-8")
(R / "donnees" / "version.json").write_text(json.dumps({"v": v}) + "\n", encoding="utf-8")
s = (R / "sw.js").read_text(encoding="utf-8")
(R / "sw.js").write_text(re.sub(r'const V = "[^"]*";', f'const V = "pp-{v}";', s), encoding="utf-8")
print("version", v)
