#!/usr/bin/env python3
"""Bandes-annonces et affiches des films à l'affiche : lien vers le lecteur Allociné de la bande-annonce officielle.
  python3 outils/bandes_annonces.py
Lit donnees/cinema.json, retrouve chaque film sur les pages des 4 salles d'Allociné (identifiant du film),
puis l'onglet « Bandes-annonces » de la fiche du film (bande-annonce officielle).
Écrit donnees/bandes-annonces.json = {"Titre du film": "https://www.allocine.fr/video/player_gen_cmedia=…&cfilm=….html"}.
Écrit aussi donnees/affiches.json = {"Titre du film": "https://fr.web.imgN.acsta.net/c_310_420/….jpg"} (vignette de la fiche du film).
Un film sans bande-annonce trouvée n'a pas de lien (le site n'affiche rien plutôt qu'un lien douteux)."""
import json, re, html, unicodedata, pathlib, urllib.request, time
R = pathlib.Path(__file__).resolve().parent.parent
D = R / "donnees"
SALLES = ["W4477", "P0716", "P2368", "W0012", "P6667", "W1146"]   # L'Atlantique, Toiles de Retz, Saint-Joseph, Cinéjade, Jeanne d'Arc (La Bernerie), Saint-Michel (Tharon)
UA = {"User-Agent": "Mozilla/5.0 (Le Petit Pref; lecture des programmes)"}
def get(u):
    with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=30) as r:
        return r.read().decode("utf-8", "ignore")
def norm(t):
    t = unicodedata.normalize("NFD", html.unescape(t).lower()).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]", "", t)
films = sorted({c["film"] for c in json.loads((D / "cinema.json").read_text(encoding="utf-8"))})
ids = {}
for s in SALLES:
    try:
        p = get(f"https://www.allocine.fr/seance/salle_gen_csalle={s}.html")
    except Exception as e:
        print("salle", s, e); continue
    for m in re.finditer(r'href="/film/fichefilm_gen_cfilm=(\d+)\.html"[^>]*>(.*?)</a>', p, re.S):
        t = re.sub("<[^>]+>", "", m.group(2)).strip()
        if t: ids.setdefault(norm(t), m.group(1))
    time.sleep(1)
print(len(ids), "films trouvés sur Allociné")
old = {}
f = D / "bandes-annonces.json"
if f.exists(): old = json.loads(f.read_text(encoding="utf-8"))
out = {}
aff = {}
fa = D / "affiches.json"
oldaff = json.loads(fa.read_text(encoding="utf-8")) if fa.exists() else {}
import base64, urllib.parse
def cherche(film):
    """Film absent des pages « séances du jour » des salles : page publique de recherche d'Allociné, titre identique exigé."""
    try:
        p = get("https://www.allocine.fr/rechercher/movie/?q=" + urllib.parse.quote(film))
    except Exception as e:
        print("recherche", film, e); return None
    for m in re.finditer(r'class="(ACr[^ "]+) [^"]*meta-title-link"[^>]*>([^<]+)<', p):
        c = m.group(1).replace("ACr", ""); c += "=" * (-len(c) % 4)
        try: u = base64.b64decode(c).decode()
        except Exception: continue
        f = re.search(r"cfilm=(\d+)", u)
        if f and norm(m.group(2)) == norm(film): return f.group(1)
    return None
for film in films:
    fid = ids.get(norm(film))
    if not fid and (film not in old or film not in oldaff):
        fid = cherche(film); time.sleep(0.5)
    if not fid:
        if film in old: out[film] = old[film]
        if film in oldaff: aff[film] = oldaff[film]
        continue
    try:
        p = get(f"https://www.allocine.fr/film/fichefilm_gen_cfilm={fid}.html")
    except Exception as e:
        print("film", film, e); continue
    # l'onglet « Bandes-annonces » de la fiche du film mène à la bande-annonce officielle (absent s'il n'y en a pas)
    m = re.search(r'class="trailer roller-item"\s+href="/video/player_gen_cmedia=(\d+)&amp;cfilm=' + fid + r'\.html"', p)
    best = m.group(1) if m else None
    # affiche : la vignette de la fiche du film (serveur d'images d'Allociné)
    a = re.search(r'class="thumbnail-img"\s+src="(https://fr\.web\.img\d\.acsta\.net/c_310_420/[^"]+\.jpg)"', p)
    if a: aff[film] = a.group(1)
    elif film in oldaff: aff[film] = oldaff[film]
    if best:
        out[film] = f"https://www.allocine.fr/video/player_gen_cmedia={best}&cfilm={fid}.html"
    time.sleep(0.5)
f.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"{len(out)} bandes-annonces sur {len(films)} films")
fa.write_text(json.dumps(aff, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"{len(aff)} affiches sur {len(films)} films")
