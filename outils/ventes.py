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
                    "neuf": l0["nature_mutation"] == "Vente en l'état futur d'achèvement" or None,
                    "pa": sorted({l["id_parcelle"][5:] for l in L if l["id_parcelle"]})[:8] or None})
    return res


API = "https://www.data.gouv.fr/api/1/datasets/demandes-de-valeurs-foncieres/"
CADASTRE = "https://cadastre.data.gouv.fr/bundler/cadastre-etalab/communes/{c}/geojson/parcelles"


def brut(dossier, depuis):
    """Fichiers bruts de la DGFiP (publiés avant la version géolocalisée) : ventes postérieures à `depuis`
    (AAAA-MM-JJ), converties au format des fichiers géolocalisés. Positions : centre de la parcelle (cadastre)."""
    import io, zipfile, gzip
    res = None
    for essai in range(3):
        try:
            res = json.load(urllib.request.urlopen(API, timeout=60))["resources"]
            break
        except Exception as e:
            print("  API data.gouv indisponible", e)
    if res is None:
        return {}
    an0 = int(depuis[:4])
    urls = [r["url"] for r in res if r.get("url", "").endswith(".txt.zip")
            and any(str(a) in r["title"] for a in range(an0 + (1 if depuis[5:7] == "12" else 0), an0 + 3))]
    codes = {c[2:]: c for c in COMMUNES.values()}
    out = {c: [] for c in COMMUNES.values()}
    for u in urls:
        f = os.path.join(dossier, os.path.basename(u))
        if not os.path.exists(f):
            try:
                urllib.request.urlretrieve(u, f)
            except Exception as e:
                print("  pas de fichier", u, e)
                continue
        with zipfile.ZipFile(f) as z:
            for nom in z.namelist():
                with z.open(nom) as h:
                    entete = None
                    for ligne in io.TextIOWrapper(h, encoding="utf-8", errors="replace"):
                        x = ligne.rstrip("\n").split("|")
                        if entete is None:
                            entete = x
                            continue
                        if len(x) < 43 or x[18] != "44" or x[19] not in codes:
                            continue
                        j, m, a = x[8].split("/")
                        d = f"{a}-{m}-{j}"
                        if d <= depuis:
                            continue
                        c = codes[x[19]]
                        sec = x[21].rjust(2, "0")
                        pid = f"{c}{(x[20] or '0').rjust(3, '0')}{sec}{x[22].rjust(4, '0')}"
                        num = lambda v: v.replace(",", ".")
                        out[c].append({"id_mutation": f"{d}|{x[9]}|{x[10]}|{x[1]}|{x[7]}", "date_mutation": d,
                                       "nature_mutation": x[9], "valeur_fonciere": num(x[10]),
                                       "adresse_nom_voie": " ".join(v for v in (x[13], x[15]) if v),
                                       "id_parcelle": pid, "lot1_numero": x[24], "type_local": x[36],
                                       "surface_reelle_bati": num(x[38]), "nombre_pieces_principales": num(x[39]),
                                       "code_nature_culture": x[40], "surface_terrain": num(x[42]),
                                       "latitude": "", "longitude": ""})
    for c, L in out.items():
        if not L:
            continue
        g = os.path.join(dossier, f"parcelles-{c}.json.gz")
        if not os.path.exists(g):
            urllib.request.urlretrieve(CADASTRE.format(c=c), g)
        cen = {}
        for ft in json.load(gzip.open(g))["features"]:
            pts = ft["geometry"]["coordinates"]
            while isinstance(pts[0][0], list):
                pts = pts[0]
            cen[ft["id"]] = (sum(p[1] for p in pts) / len(pts), sum(p[0] for p in pts) / len(pts))
        for l in L:
            if l["id_parcelle"] in cen:
                l["latitude"], l["longitude"] = cen[l["id_parcelle"]]
    return out


def parcelles(dossier, k, c, ventes_c):
    """Contours des parcelles vendues (cadastre Etalab, Licence Ouverte) → donnees/parcelles-<commune>.json."""
    import gzip
    besoin = {p for v in ventes_c for p in v.get("pa", [])}
    g = os.path.join(dossier, f"parcelles-{c}.json.gz")
    if not os.path.exists(g):
        try:
            urllib.request.urlretrieve(CADASTRE.format(c=c), g)
        except Exception as e:
            print("  cadastre indisponible", c, e)
            return
    out = {}
    for ft in json.load(gzip.open(g))["features"]:
        pid = ft["id"][5:]
        if pid not in besoin:
            continue
        geo = ft["geometry"]
        polys = geo["coordinates"] if geo["type"] == "MultiPolygon" else [geo["coordinates"]]
        out[pid] = {"s": ft["properties"].get("contenance"), "g": [[[round(x[1], 5), round(x[0], 5)] for x in poly[0]] for poly in polys]}
    f = os.path.join(ICI, "..", "donnees", f"parcelles-{k}.json")
    try:
        if json.load(open(f, encoding="utf-8")) == out:
            return
    except Exception:
        pass
    with open(f, "w", encoding="utf-8") as h:
        json.dump(out, h, ensure_ascii=False, separators=(",", ":"))
    print("écrit", os.path.normpath(f), len(out), "parcelles,", os.path.getsize(f) // 1024, "Ko")


def main():
    dossier = sys.argv[1] if len(sys.argv) > 1 else tempfile.mkdtemp(prefix="dvf-")
    os.makedirs(dossier, exist_ok=True)
    an = datetime.date.today().year
    sortie = {"maj": datetime.date.today().isoformat(), "source": "DVF (DGFiP), versions géolocalisée Etalab et brute ; positions du cadastre Etalab ; Licence Ouverte 2.0",
              "url": "https://explore.data.gouv.fr/fr/immobilier", "communes": {}}
    BRUT = {}
    for k, c in COMMUNES.items():
        tout = []
        for a in range(an - ANNEES, an + 1):
            tout += ventes(charge(dossier, a, c))
        fin_geo = max((v["d"] for v in tout), default=f"{an - ANNEES}-01-01")
        if c not in BRUT:
            BRUT.update(brut(dossier, fin_geo))
        tout += ventes(BRUT.get(c, []))
        tout.sort(key=lambda v: v["d"], reverse=True)
        for v in tout:
            for x in [x for x, y in v.items() if y is None]:
                del v[x]
        sortie["communes"][k] = {"code": c, "fin": tout[0]["d"] if tout else None, "ventes": tout}
        print(k, len(tout), "ventes, la plus récente le", tout[0]["d"] if tout else "-")
    for k, c in COMMUNES.items():
        parcelles(dossier, k, c, sortie["communes"][k]["ventes"])
    try:
        avant = json.load(open(SORTIE, encoding="utf-8"))
        if avant.get("communes") == sortie["communes"]:
            print("rien de nouveau")
            return
        for k, c in sortie["communes"].items():
            v = avant.get("communes", {}).get(k, {})
            if (c["fin"] or "") < (v.get("fin") or "") or len(c["ventes"]) < len(v.get("ventes", [])) * 0.9:
                print("ATTENTION", k, ": moins de ventes qu'avant (téléchargement incomplet ?), fichier gardé tel quel")
                return
    except Exception:
        pass
    with open(SORTIE, "w", encoding="utf-8") as h:
        json.dump(sortie, h, ensure_ascii=False, separators=(",", ":"))
    print("écrit", os.path.normpath(SORTIE), os.path.getsize(SORTIE) // 1024, "Ko")


if __name__ == "__main__":
    main()
