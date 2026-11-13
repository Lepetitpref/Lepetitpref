#!/usr/bin/env python3
"""Ventes immobilières de Préfailles et de Pornic → donnees/ventes.json.

Source : « Demandes de valeurs foncières géolocalisées » (DVF, DGFiP / Etalab),
https://files.data.gouv.fr/geo-dvf/latest/csv/<année>/communes/44/<code>.csv,
Licence Ouverte 2.0. Publiée deux fois par an (avril et octobre).

Ce que le site garde, pour chaque vente d'une maison, d'un appartement ou d'un
terrain à bâtir : date, prix, type, surface habitable, pièces, terrain, nom de la rue
(sans numéro) et une position arrondie à environ 100 m. Aucun nom, aucune référence
cadastrale : rien qui identifie le vendeur ni l'acheteur.

Usage : python3 outils/ventes.py [dossier de téléchargement]
"""
import csv, json, os, sys, tempfile, urllib.request, datetime

COMMUNES = {"prefailles": "44136", "pornic": "44131"}
ANNEES = 5
BASE = "https://files.data.gouv.fr/geo-dvf/latest/csv/{a}/communes/44/{c}.csv"
ICI = os.path.dirname(os.path.abspath(__file__))
SORTIE = os.path.join(ICI, "..", "donnees", "ventes.json")


def charge(dossier, a, c):
    f = os.path.join(dossier, f"{c}-{a}.csv")
    if not os.path.exists(f):
        try:
            urllib.request.urlretrieve(BASE.format(a=a, c=c), f)
        except Exception as e:
            print("  pas de fichier", a, c, e)
            return []
    with open(f, encoding="utf-8") as h:
        return list(csv.DictReader(h))


def rue(s):
    s = (s or "").strip()
    if not s:
        return ""
    petits = {"DE", "DU", "DES", "LA", "LE", "LES", "D", "L", "ET", "AU", "AUX"}
    abr = {"AV": "avenue", "BD": "boulevard", "CHE": "chemin", "IMP": "impasse", "ALL": "allée", "PL": "place",
           "RTE": "route", "SQ": "square", "QUA": "quai", "PROM": "promenade", "CRS": "cours", "PAS": "passage",
           "VLA": "villa", "RLE": "ruelle", "LOT": "lotissement", "RES": "résidence", "SEN": "sentier", "CHEM": "chemin",
           "R": "rue", "RUE": "rue", "ESP": "esplanade", "CITE": "cité", "HAM": "hameau", "LD": "", "VC": "", "CR": "chemin rural"}
    m = s.split()
    out = []
    for i, w in enumerate(m):
        if i == 0 and w in abr:
            if abr[w]:
                out.append(abr[w])
            continue
        if "'" in w:
            a, b = w.split("'", 1)
            out.append(a.lower() + "'" + b.capitalize())
        elif w in petits and out:
            out.append(w.lower())
        else:
            out.append(w.capitalize())
    t = " ".join(out)
    return t[:1].upper() + t[1:]


def ventes(lignes):
    mut = {}
    for l in lignes:
        if l["nature_mutation"] not in ("Vente", "Vente en l'état futur d'achèvement", "Vente terrain à bâtir"):
            continue
        mut.setdefault(l["id_mutation"], []).append(l)
    res = []
    for mid, L in mut.items():
        l0 = L[0]
        try:
            prix = float(l0["valeur_fonciere"] or 0)
        except ValueError:
            continue
        if prix < 10000:
            continue
        loc = {}
        for l in L:
            if l["type_local"] in ("Maison", "Appartement"):
                loc.setdefault((l["id_parcelle"], l["lot1_numero"], l["type_local"], l["surface_reelle_bati"]), l)
        terr = {}
        for l in L:
            if l["surface_terrain"]:
                terr[(l["id_parcelle"], l["code_nature_culture"])] = float(l["surface_terrain"])
        ab = any(l["code_nature_culture"] == "AB" for l in L)
        if len(loc) == 1:
            l = list(loc.values())[0]
            t = "M" if l["type_local"] == "Maison" else "A"
            surf = int(float(l["surface_reelle_bati"] or 0)) or None
            pcs = int(float(l["nombre_pieces_principales"] or 0)) or None
        elif not loc and ab and not any(l["type_local"] for l in L if l["type_local"] not in ("", "Dépendance")):
            t, surf, pcs = "T", None, None
        else:
            continue
        if surf and (prix / surf > 20000 or prix / surf < 300):
            continue
        tr0 = int(sum(terr.values())) or None
        if t == "T" and (not tr0 or tr0 < 150 or prix / tr0 > 800):
            continue
        lat = next((l["latitude"] for l in L if l["latitude"]), "")
        lon = next((l["longitude"] for l in L if l["longitude"]), "")
        tr = int(sum(terr.values())) or None
        res.append({"d": l0["date_mutation"], "t": t, "p": int(round(prix)), "s": surf, "n": pcs,
                    "tr": tr if t != "A" else None, "r": rue(l0["adresse_nom_voie"]),
                    "la": round(float(lat), 3) if lat else None, "lo": round(float(lon), 3) if lon else None,
                    "neuf": l0["nature_mutation"] == "Vente en l'état futur d'achèvement" or None})
    return res


def main():
    dossier = sys.argv[1] if len(sys.argv) > 1 else tempfile.mkdtemp(prefix="dvf-")
    os.makedirs(dossier, exist_ok=True)
    an = datetime.date.today().year
    sortie = {"maj": datetime.date.today().isoformat(), "source": "DVF géolocalisées (DGFiP, Etalab), Licence Ouverte 2.0",
              "url": "https://explore.data.gouv.fr/fr/immobilier", "communes": {}}
    for k, c in COMMUNES.items():
        tout = []
        for a in range(an - ANNEES, an + 1):
            tout += ventes(charge(dossier, a, c))
        tout.sort(key=lambda v: v["d"], reverse=True)
        for v in tout:
            for x in [x for x, y in v.items() if y is None]:
                del v[x]
        sortie["communes"][k] = {"code": c, "fin": tout[0]["d"] if tout else None, "ventes": tout}
        print(k, len(tout), "ventes, la plus récente le", tout[0]["d"] if tout else "-")
    with open(SORTIE, "w", encoding="utf-8") as h:
        json.dump(sortie, h, ensure_ascii=False, separators=(",", ":"))
    print("écrit", os.path.normpath(SORTIE), os.path.getsize(SORTIE) // 1024, "Ko")


if __name__ == "__main__":
    main()
