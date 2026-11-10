#!/usr/bin/env python3
"""Contrôle des données du Petit Préf avant publication. Usage : python3 outils/verifier.py
Sort en erreur (code 1) si un fichier est invalide ; sinon imprime une ligne de bilan."""
import json, sys, re, datetime, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent / "donnees"
TOWNS = {"Préfailles","La Plaine-sur-Mer","Pornic","Saint-Michel-Chef-Chef","Saint-Brevin-les-Pins","Chauvé","La Bernerie-en-Retz","Les Moutiers-en-Retz"}
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
