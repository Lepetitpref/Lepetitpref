#!/usr/bin/env python3
"""Contrôle des données du Petit Préf avant publication. Usage : python3 outils/verifier.py
Sort en erreur (code 1) si un fichier est invalide ; sinon imprime une ligne de bilan."""
import json, sys, re, datetime, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent / "donnees"
TOWNS = {"Préfailles","La Plaine-sur-Mer","Pornic","Saint-Michel-Chef-Chef","Saint-Brevin-les-Pins","Chauvé","La Bernerie-en-Retz","Les Moutiers-en-Retz","Villeneuve-en-Retz","Chaumes-en-Retz","Saint-Père-en-Retz","Saint-Hilaire-de-Chaléons","Sainte-Pazanne","Corsept","Saint-Viaud","Vue","Paimbœuf"}
TYPES = {"fete","spectacle","sport","brocante","jeux","atelier","nature","expo","vielocale"}
D = re.compile(r"^\d{4}-\d{2}-\d{2}$")
err = []
def load(n):
    try:
        v = json.load(open(ROOT / f"{n}.json", encoding="utf-8"))
    except Exception as e:
        err.append(f"{n}.json illisible : {e}"); return []
    return v
ev, ci, asso, st = load("events"), load("cinema"), load("assos"), load("status")
for n, L in [("events", ev), ("cinema", ci), ("assos", asso)]:
    if not isinstance(L, list): err.append(f"{n}.json doit être une liste"); continue
    ids = [x.get("id") for x in L]
    if None in ids or "" in ids: err.append(f"{n}.json : un élément sans id")
    if len(ids) != len(set(ids)): err.append(f"{n}.json : id en double")
for e in ev:
    i = e.get("id")
    if not e.get("title"): err.append(f"events {i} : title manquant")
    if not D.match(str(e.get("date", ""))): err.append(f"events {i} : date invalide")
    if e.get("end") and not D.match(str(e["end"])): err.append(f"events {i} : end invalide")
    if e.get("town") not in TOWNS: err.append(f"events {i} : town « {e.get('town')} » hors liste")
    if e.get("type") and e["type"] not in TYPES: err.append(f"events {i} : type « {e['type']} » hors liste")
    # une heure par fiche : un événement à plusieurs dates avec des heures différentes = une fiche par date (sinon « 19h » s'affiche aussi le dimanche)
    if e.get("end") and re.search(r"\d+h\d*.*[/;].*\d+h|\((lun|mar|mer|jeu|ven|sam|dim)\.?\)", str(e.get("time", ""))): err.append(f"events {i} : plusieurs heures selon le jour (« {e['time']} ») : faites une fiche par date")
# conseils municipaux : liens officiels en https, dates valides, pas de nom de personne attendu (contrôle manuel)
try:
    cm = json.load(open(pathlib.Path(__file__).resolve().parent.parent / "donnees" / "conseils.json", encoding="utf-8"))
    for k, c in cm.get("communes", {}).items():
        for u in [c.get("page_cr")] + [x.get("doc") for x in c.get("seances", [])]:
            if u and not str(u).startswith("https://"): err.append(f"conseils {k} : lien non https {u}")
        for x in c.get("seances", []):
            if not D.match(str(x.get("date", ""))): err.append(f"conseils {k} : date invalide")
except FileNotFoundError:
    pass
for c in ci:
    if not D.match(str(c.get("date", ""))) or not isinstance(c.get("times"), list): err.append(f"cinema {c.get('id')} : date ou times invalide")
if not isinstance(st, dict) or "updatedAt" not in st: err.append("status.json : updatedAt manquant")
# sécurité : liens http(s) seulement, âges numériques (les données viennent de sites tiers)
for n, L in [("events", ev), ("assos", asso)]:
    for x in (L if isinstance(L, list) else []):
        u = x.get("url")
        if u and not re.match(r"^https?://", str(u)): err.append(f"{n} {x.get('id')} : lien refusé (http/https seulement)")
        for k in ("ageMin", "ageMax"):
            if x.get(k) is not None and not isinstance(x.get(k), (int, float)): err.append(f"{n} {x.get('id')} : {k} doit être un nombre")
try:
    TR=json.load(open(ROOT / "transports.json", encoding="utf-8")) if (ROOT / "transports.json").exists() else {}
    HM=re.compile(r"^\d\d[h]\d\d$")
    for L in TR.get("legs",[]):
        for x in L.get("departs",[]):
            if not HM.match(x.get("dep","")) or not HM.match(x.get("arr","")) or not re.fullmatch(r"[0-6]+",str(x.get("jours",""))):err.append(f"transports {L.get('id')} : départ mal formé {x}");break
            if x["arr"]<x["dep"] and not x["arr"].startswith("00"):err.append(f"transports {L.get('id')} : arrivée avant départ {x['dep']}→{x['arr']}");break
except Exception as e:err.append(f"transports.json illisible : {e}")
if err:
    print("\n".join(err)); sys.exit(1)
today = datetime.date.today().isoformat()
print(f"OK · {len([e for e in ev if (e.get('end') or e['date'])>=today])} événements à venir · {len([c for c in ci if c['date']>=today])} séances · bulletin {'oui' if st.get('bulletin') else 'non'}")


# Cinémas (CINES dans app.js) : adresse complète obligatoire (numéro, rue, code postal), lien http(s)
import re as _re
_app = open(pathlib.Path(__file__).resolve().parent.parent / "app.js", encoding="utf-8").read() if "pathlib" in globals() else open("app.js", encoding="utf-8").read()
_m = _re.search(r"const CINES=\[(.*?)\];", _app, _re.S)
if _m:
    for _c in _re.findall(r"\{n:\"([^\"]+)\"[^}]*?a:\"([^\"]*)\"[^}]*?url:\"([^\"]*)\"", _m.group(1)):
        if not _re.search(r"^\d+\s.*\b\d{5}\b", _c[1]):
            sys.exit(f"ERREUR cinéma « {_c[0]} » : adresse incomplète ({_c[1]}) — numéro, rue et code postal lus sur une source officielle")
        if not _c[2].startswith(("http://", "https://")):
            sys.exit(f"ERREUR cinéma « {_c[0]} » : lien non http(s)")

# Lieux (ACTS) : adresse et position cohérentes avec la commune (évite un lieu placé dans la mauvaise ville)
import math as _math
_i = _app.index("ACTS=") + 5
_A, _ = json.JSONDecoder().raw_decode(_app[_i:])
_CP = {"Préfailles": "44770", "La Plaine-sur-Mer": "44770", "Pornic": "44210", "Saint-Brevin-les-Pins": "44250",
       "La Bernerie-en-Retz": "44760", "Les Moutiers-en-Retz": "44760", "Saint-Michel-Chef-Chef": "44730"}
_pts = {}
for _a in _A:
    if _a.get("lat"): _pts.setdefault(_a["town"], []).append((_a["lat"], _a["lon"]))
_med = {t: (sorted(p[0] for p in v)[len(v) // 2], sorted(p[1] for p in v)[len(v) // 2]) for t, v in _pts.items()}
_err, _avert = [], []
for _a in _A:
    _ad, _t = _a.get("addr") or "", _a["town"]
    _cp = _re.findall(r"\b(44\d{3})\b", _ad)
    if _t in _CP and _cp and _CP[_t] not in _cp:
        _err.append(f"« {_a['n']} » : code postal {_cp[0]} ≠ {_t}")
    if _a.get("lat") and len(_pts.get(_t, [])) >= 3:
        _d = _math.hypot((_a["lat"] - _med[_t][0]) * 111, (_a["lon"] - _med[_t][1]) * 75)
        if _d > 9: _err.append(f"« {_a['n']} » : à {_d:.0f} km de {_t}, position à vérifier")
    if not _ad or not _a.get("lat"):
        _avert.append(_a["n"])
if _err:
    sys.exit("ERREUR lieux :\n  " + "\n  ".join(_err))
if _avert:
    print(f"À compléter : {len(_avert)} lieux sans adresse ou sans position (python3 outils/verifier.py --lieux pour la liste)")
    if "--lieux" in sys.argv: print("  " + "\n  ".join(_avert))
