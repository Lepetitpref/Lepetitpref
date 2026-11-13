#!/usr/bin/env python3
"""Permis de construire et PLU de Préfailles et Pornic → donnees/urbanisme.json.

Sources (toutes en Licence Ouverte) :
- Permis : Sitadel (SDES), « Liste des permis de construire et autres autorisations d'urbanisme »,
  fichier des logements, API DiDo filtrée par commune (mise à jour mensuelle).
- PLU : Géoportail de l'Urbanisme (document en vigueur, lien du règlement).

Rien de personnel : pour un particulier, on ne garde que la rue (sans numéro) ; le nom n'est
publié par l'État que pour les sociétés (promoteurs, SCI…), on le garde alors.

Usage : python3 outils/urbanisme.py
"""
import csv, io, json, os, sys, urllib.request, urllib.parse, datetime

COMMUNES = {"prefailles": "44136", "pornic": "44131"}
ICI = os.path.dirname(os.path.abspath(__file__))
SORTIE = os.path.join(ICI, "..", "donnees", "urbanisme.json")
DIDO = "https://data.statistiques.developpement-durable.gouv.fr/dido/api/v1/datafiles/8b35affb-55fc-4c1f-915b-7750f974446a/csv?COMM=eq:{c}"
ADEME = "https://data.ademe.fr/data-fair/api/v1/datasets/dpe03existant/values_agg?qs={q}&field=etiquette_dpe&agg_size=10"
GPU = "https://www.geoportail-urbanisme.gouv.fr/api/document?partition=DU_{c}&status=document.production"


def get(url, tries=3):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "lepetitpref-donnees"}), timeout=120) as r:
                return r.read()
        except Exception as e:
            err = e
    raise err


def rue(s):
    s = (s or "").strip()
    if not s:
        return ""
    petits = {"DE", "DU", "DES", "LA", "LE", "LES", "D", "L", "ET", "AU", "AUX"}
    out = []
    for w in s.split():
        if "'" in w:
            a, b = w.split("'", 1)
            out.append(a.lower() + "'" + b.capitalize())
        elif w in petits and out:
            out.append(w.lower())
        else:
            out.append(w.capitalize())
    t = " ".join(out)
    return t[:1].upper() + t[1:]


def permis(c):
    txt = get(DIDO.format(c=c)).decode("utf-8-sig")
    R = list(csv.DictReader(io.StringIO(txt), delimiter=";"))
    n = lambda v: int(float(v or 0))
    ans, liste = {}, []
    for r in R:
        d = r.get("DATE_REELLE_AUTORISATION") or ""
        if len(d) < 10 or r.get("ETAT_DAU") == "4":   # 4 = annulé
            continue
        a = d[:4]
        x = ans.setdefault(a, {"a": a, "permis": 0, "logements": 0, "collectifs": 0, "surface": 0})
        x["permis"] += 1
        x["logements"] += n(r.get("NB_LGT_TOT_CREES"))
        x["collectifs"] += n(r.get("NB_LGT_COL_CREES"))
        x["surface"] += n(r.get("SURF_HAB_CREEE"))
        nat = "neuf" if r.get("NATURE_PROJET_DECLAREE") == "1" else "existant"
        extra = [k for k, l in (("I_EXTENSION", "extension"), ("I_SURELEVATION", "surélévation"), ("I_PISCINE", "piscine")) if r.get(k) == "true"]
        sec, num = (r.get("SEC_CADASTRE1") or "").strip(), (r.get("NUM_CADASTRE1") or "").strip()
        liste.append({"d": d[:10], "nat": nat, "lg": n(r.get("NB_LGT_TOT_CREES")), "col": n(r.get("NB_LGT_COL_CREES")),
                      "s": n(r.get("SURF_HAB_CREEE")) or None, "x": [l for k, l in (("I_EXTENSION", "extension"), ("I_SURELEVATION", "surélévation"), ("I_PISCINE", "piscine")) if r.get(k) == "true"] or None,
                      "r": rue(r.get("ADR_LIBVOIE_TER") or r.get("ADR_LIEUDIT_TER")),
                      "_adr": " ".join(x for x in ((r.get("ADR_NUM_TER") or "").strip(), (r.get("ADR_LIBVOIE_TER") or r.get("ADR_LIEUDIT_TER") or "").strip()) if x),
                      "soc": (r.get("DENOM_DEM") or "").strip() or None,
                      "pa": (f"000{sec.rjust(2, '0')}{num.zfill(4)}" if sec and num else None),
                      "etat": {"2": "autorisé", "5": "chantier commencé", "6": "terminé"}.get(r.get("ETAT_DAU"))})
    liste.sort(key=lambda v: v["d"], reverse=True)
    for v in liste:
        for k in [k for k, y in v.items() if y is None]:
            del v[k]
    # position de chaque permis : centre de sa parcelle (cadastre Etalab)
    try:
        import gzip
        cad = json.loads(gzip.decompress(get(f"https://cadastre.data.gouv.fr/bundler/cadastre-etalab/communes/{c}/geojson/parcelles")))
        cen = {}
        for ft in cad["features"]:
            pts = ft["geometry"]["coordinates"]
            while isinstance(pts[0][0], list):
                pts = pts[0]
            cen[ft["id"][5:]] = (round(sum(p[1] for p in pts) / len(pts), 5), round(sum(p[0] for p in pts) / len(pts), 5))
        sansp = {}
        for pid, xy in cen.items():
            sansp.setdefault(pid[3:], []).append(xy)
        for v in liste:
            pa = v.get("pa")
            if pa in cen:
                v["la"], v["lo"] = cen[pa]
            elif pa and len(sansp.get(pa[3:], [])) == 1:   # parcelle d'une ancienne commune (préfixe 042…)
                v["la"], v["lo"] = sansp[pa[3:]][0]
    except Exception as e:
        print("  cadastre indisponible", c, e)
    # parcelles trop récentes pour le cadastre : position de l'adresse (Base Adresse Nationale, géocodage groupé)
    reste = [v for v in liste if "la" not in v and v.get("_adr")]
    if reste:
        try:
            buf = io.StringIO()
            w = csv.writer(buf)
            w.writerow(["i", "adresse", "citycode"])
            for i, v in enumerate(reste):
                w.writerow([i, v["_adr"], c])
            bd = "lpp" + datetime.datetime.now().strftime("%H%M%S%f")
            body = (f"--{bd}\r\nContent-Disposition: form-data; name=\"data\"; filename=\"a.csv\"\r\nContent-Type: text/csv\r\n\r\n{buf.getvalue()}\r\n"
                    f"--{bd}\r\nContent-Disposition: form-data; name=\"citycode\"\r\n\r\ncitycode\r\n--{bd}--\r\n").encode()
            req = urllib.request.Request("https://api-adresse.data.gouv.fr/search/csv/", data=body,
                                         headers={"Content-Type": f"multipart/form-data; boundary={bd}", "User-Agent": "lepetitpref-donnees"})
            out = None
            for essai in range(4):
                try:
                    out = urllib.request.urlopen(req, timeout=180).read().decode("utf-8")
                    break
                except Exception as e:
                    err = e
            if out is None:
                raise err
            for row in csv.DictReader(io.StringIO(out)):
                try:
                    if float(row.get("result_score") or 0) >= 0.5 and row.get("latitude"):
                        v = reste[int(row["i"])]
                        v["la"], v["lo"] = round(float(row["latitude"]), 5), round(float(row["longitude"]), 5)
                except (ValueError, IndexError):
                    pass
        except Exception as e:
            print("  géocodage indisponible", c, e)
    for v in liste:
        v.pop("_adr", None)
    return {"annees": [ans[a] for a in sorted(ans)], "recents": liste, "total": len(liste),
            "fin": liste[0]["d"] if liste else None}


def dpe(c):
    out = {}
    for k, q in (("tous", f"code_insee_ban:{c}"), ("maison", f"code_insee_ban:{c} AND type_batiment:maison"), ("appartement", f"code_insee_ban:{c} AND type_batiment:appartement")):
        o = json.loads(get(ADEME.format(q=urllib.parse.quote(q))))
        out[k] = {a["value"]: a["total"] for a in o.get("aggs", [])}
        out[k + "_n"] = o.get("total")
    return out


def plu(c):
    try:
        L = json.loads(get(GPU.format(c=c)))
    except Exception as e:
        print("  GPU indisponible", c, e)
        return None
    L = [d for d in L if d.get("status") == "document.production"] or L
    if not L:
        return None
    d = sorted(L, key=lambda d: d.get("publicationDate") or "", reverse=True)[0]
    on = d.get("originalName") or ""
    reg = None
    try:
        F = json.loads(get(f"https://www.geoportail-urbanisme.gouv.fr/api/document/{d['id']}/files"))
        r = next((f for f in F if "_reglement_" in f.get("name", "") and f["name"].endswith(".pdf")), None)
        if r:
            reg = f"https://data.geopf.fr/annexes/gpu/documents/DU_{c}/{d['id']}/{r['name']}"
    except Exception:
        pass
    appro = on.rsplit("_", 1)[-1] if on else ""
    return {"type": d.get("type"), "approuve": f"{appro[6:8]}/{appro[4:6]}/{appro[:4]}" if len(appro) == 8 else None,
            "id": d.get("id"), "reglement": reg, "fiche": f"https://www.geoportail-urbanisme.gouv.fr/document/by-id/{d.get('id')}"}


def main():
    try:
        avant = json.load(open(SORTIE, encoding="utf-8"))
    except Exception:
        avant = {"communes": {}}
    out = {"maj": datetime.date.today().isoformat(), "communes": {}}
    for k, c in COMMUNES.items():
        old = avant.get("communes", {}).get(k, {})
        x = {"code": c}
        for nom, f in (("permis", permis), ("plu", plu)):
            try:
                x[nom] = f(c) or old.get(nom)
            except Exception as e:
                print("  ", nom, c, "indisponible :", e, "→ valeur précédente gardée")
                x[nom] = old.get(nom)
        # un géocodage raté ne doit pas faire disparaître des points déjà connus
        cle = lambda v: (v.get("d"), v.get("pa"), v.get("r"), v.get("lg"))
        vieux = {cle(v): v for v in ((old.get("permis") or {}).get("recents") or []) if "la" in v}
        for v in ((x.get("permis") or {}).get("recents") or []):
            if "la" not in v and cle(v) in vieux:
                v["la"], v["lo"] = vieux[cle(v)]["la"], vieux[cle(v)]["lo"]
        out["communes"][k] = x
        p = x.get("permis") or {}
        print(k, "permis", p.get("total"), "jusqu'au", p.get("fin"), "· PLU", (x.get("plu") or {}).get("nom"))
    if avant.get("communes") == out["communes"]:
        print("rien de nouveau")
        return
    with open(SORTIE, "w", encoding="utf-8") as h:
        json.dump(out, h, ensure_ascii=False, separators=(",", ":"))
    print("écrit", os.path.normpath(SORTIE), os.path.getsize(SORTIE) // 1024, "Ko")


if __name__ == "__main__":
    main()
