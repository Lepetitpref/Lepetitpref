#!/usr/bin/env python3
"""Prix au m² depuis 2010 à Préfailles et Pornic → donnees/prix-historique.json (à relancer une fois par an).

- 2010 → dernière année : prix médians réels au m² (maisons, appartements) et nombre de ventes,
  Cerema, indicateurs DV3F annuels par commune (API Données foncières, accès libre).
  Quand il y a trop peu de ventes (secret statistique), la valeur annuelle manque : on prend alors
  la moyenne sur 3 ans du Cerema (marquée "t").

Usage : python3 outils/historique.py
"""
import json, os, re, urllib.request, datetime

COMMUNES = {"prefailles": "44136", "pornic": "44131"}
ICI = os.path.dirname(os.path.abspath(__file__))
SORTIE = os.path.join(ICI, "..", "donnees", "prix-historique.json")
API = "https://apidf-preprod.cerema.fr/indicateurs/dv3f/prix/{p}/?code={c}&echelle=communes"
INSEE = "https://bdm.insee.fr/series/sdmx/data/SERIES_BDM/{s}?startPeriod=1994"
SERIE = {"M": "010567074", "A": "010567062"}


def get(url):
    for i in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "lepetitpref-donnees"}), timeout=120) as r:
                return r.read()
        except Exception as e:
            err = e
    raise err


def indice(s):
    xml = get(INSEE.format(s=s)).decode("utf-8")
    par_an = {}
    for per, val in re.findall(r'TIME_PERIOD="(\d{4})-Q\d"\s+OBS_VALUE="([\d.]+)"', xml):
        par_an.setdefault(int(per), []).append(float(val))
    if not par_an:   # attributs dans l'autre ordre
        for val, per in re.findall(r'OBS_VALUE="([\d.]+)"[^>]*TIME_PERIOD="(\d{4})-Q\d"', xml):
            par_an.setdefault(int(per), []).append(float(val))
    return {a: sum(v) / len(v) for a, v in par_an.items() if len(v) == 4}


def main():
    out = {"maj": datetime.date.today().isoformat(),
           "sources": {"reel": "Cerema, DV3F, indicateurs de prix (2010 et après)",
                       },
           "communes": {}}
    for k, c in COMMUNES.items():
        A = {int(x["annee"]): x for x in json.loads(get(API.format(p="annuel", c=c)))["results"]}
        T = {int(x["annee"]): x for x in json.loads(get(API.format(p="triennal", c=c)))["results"]}
        serie = {}
        for typ, cod in (("M", "111"), ("A", "121")):
            for an in sorted(A):
                v = A[an].get(f"pxm2_median_cod{cod}")
                n = A[an].get(f"nbtrans_cod{cod}")
                if v:
                    serie.setdefault(an, {})[typ] = round(v)
                    serie[an]["n" + typ] = n
                elif an in T and T[an].get(f"pxm2_median_cod{cod}"):
                    serie.setdefault(an, {})[typ] = round(T[an][f"pxm2_median_cod{cod}"])
                    serie[an]["t" + typ] = 1
        out["communes"][k] = [{"a": a, **serie[a]} for a in sorted(serie)]
        print(k, min(serie), "→", max(serie))
    with open(SORTIE, "w", encoding="utf-8") as h:
        json.dump(out, h, ensure_ascii=False, separators=(",", ":"))
    print("écrit", os.path.normpath(SORTIE), os.path.getsize(SORTIE) // 1024, "Ko")


if __name__ == "__main__":
    main()
