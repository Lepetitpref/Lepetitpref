#!/usr/bin/env python3
"""Photos des lieux (restos, bars, marchés, activités, plages) : celles que les établissements ont confiées
à l'office de tourisme, publiées par l'API Geotrek du Département de Loire-Atlantique
(https://admin-rando.loire-atlantique.fr/api/v2/touristiccontent/).
  python3 outils/photos.py
Associe chaque fiche ACTS d'app.js à une fiche de l'office de tourisme : à moins de 400 m, noms proches
et tous les mots du nom le plus court présents dans l'autre (évite « Bar Le Phare » ↔ « Espace forme »). Écrit donnees/photos.json = {"Nom de la fiche": {"u": vignette 400 px, "a": auteur}}.
Une fiche sans correspondance sûre n'a pas de photo. Garde l'ancienne photo si l'API ne répond pas."""
import json, re, math, html, unicodedata, pathlib, urllib.request, difflib
R = pathlib.Path(__file__).resolve().parent.parent
OUT = R / "donnees" / "photos.json"
API = ("https://admin-rando.loire-atlantique.fr/api/v2/touristiccontent/?format=json&page_size=1000"
       "&in_bbox=-2.40,46.98,-1.80,47.36&fields=id,name,attachments,geometry")
UA = {"User-Agent": "Mozilla/5.0 (Le Petit Pref; photos des lieux)"}
STOP = {"le", "la", "les", "l", "du", "de", "des", "d", "au", "aux", "a", "et", "restaurant", "creperie", "bar",
        "cafe", "chez", "pizzeria", "brasserie", "the", "plage", "marche", "camping", "hotel"}


def get(u):
    with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=60) as r:
        return json.loads(r.read().decode("utf-8"))


def mots(t):
    t = unicodedata.normalize("NFD", html.unescape(t or "").lower()).encode("ascii", "ignore").decode()
    return [w for w in re.split(r"[^a-z0-9]+", t) if w and w not in STOP]


def km(a, b):
    return math.hypot((a[0] - b[0]) * 111.2, (a[1] - b[1]) * 111.2 * math.cos(math.radians(a[0])))


def inclus(a, b):
    """Tous les mots du nom le plus court se retrouvent (à une lettre près) dans l'autre."""
    a, b = (a, b) if len(a) <= len(b) else (b, a)
    eq = lambda x, y: x == y or (len(x) > 4 and difflib.SequenceMatcher(None, x, y).ratio() >= 0.85)
    return all(any(eq(x, y) for y in b) for x in a)


def main():
    s = (R / "app.js").read_text(encoding="utf-8")
    i = s.index("ACTS=") + 5
    acts, _ = json.JSONDecoder().raw_decode(s[i:])
    old = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else {}
    fiches, u = [], API
    try:
        while u:
            d = get(u)
            fiches += d["results"]
            u = d.get("next")
    except Exception as e:
        print("API Geotrek :", e, "— anciennes photos gardées")
        return
    cand = []
    for f in fiches:
        ph = [a for a in f.get("attachments") or [] if a.get("type") == "image" and a.get("thumbnail")]
        g = f.get("geometry") or {}
        if not ph or g.get("type") != "Point":
            continue
        nm = f["name"].get("fr") if isinstance(f["name"], dict) else f["name"]
        lon, lat = g["coordinates"][:2]
        cand.append((mots(nm), (lat, lon), ph[0]))
    out = {}
    for a in acts:
        if not a.get("lat"):
            continue
        w = mots(a["n"]) or mots(a.get("short"))
        if not w:
            continue
        best = None
        for cw, ll, ph in cand:
            if not cw:
                continue
            d = km((a["lat"], a["lon"]), ll)
            if d > 0.4:
                continue
            r = difflib.SequenceMatcher(None, " ".join(w), " ".join(cw)).ratio()
            if not inclus(w, cw):
                continue
            if r >= 0.8 and (best is None or r > best[0] or (r == best[0] and d < best[1])):
                best = (r, d, ph, cw)
        if best:
            ph = best[2]
            if re.match(r"^https://admin-rando\.loire-atlantique\.fr/media/[\w/.-]+$", ph["thumbnail"]):
                out[a["n"]] = {"u": ph["thumbnail"], "a": (ph.get("author") or "").strip()[:80]}
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(out)} photos sur {len(acts)} lieux ({len(cand)} fiches de l'office de tourisme avec photo)")


main()
