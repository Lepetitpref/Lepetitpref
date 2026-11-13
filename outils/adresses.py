#!/usr/bin/env python3
"""Adresses de Préfailles et de Pornic → donnees/adresses.json (suggestions dès les premières lettres).

Source : Base Adresse Nationale (adresse.data.gouv.fr, Licence Ouverte 2.0), fichier du département 44.
Format : {"prefailles": [[nom de voie, code postal, [[numéro, lat, lon], …]], …], "pornic": …}
Usage : python3 outils/adresses.py   (à relancer de temps en temps, par exemple une fois par mois)
"""
import csv, gzip, io, json, os, urllib.request

URL = "https://adresse.data.gouv.fr/data/ban/adresses/latest/csv/adresses-44.csv.gz"
COMMUNES = {"44136": "prefailles", "44131": "pornic"}
SORTIE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "donnees", "adresses.json")


def main():
    data = urllib.request.urlopen(urllib.request.Request(URL, headers={"User-Agent": "lepetitpref-donnees"}), timeout=300).read()
    voies = {k: {} for k in COMMUNES.values()}
    for r in csv.DictReader(io.StringIO(gzip.decompress(data).decode("utf-8")), delimiter=";"):
        k = COMMUNES.get(r["code_insee"])
        if not k or not r["lat"]:
            continue
        nom = r["nom_voie"] or r["nom_ld"]
        v = voies[k].setdefault(nom, [nom, r["code_postal"], []])
        num = (r["numero"] or "") + (" " + r["rep"] if r["rep"] else "")
        v[2].append([num if num != "99999" else "", round(float(r["lat"]), 5), round(float(r["lon"]), 5)])
    out = {}
    for k, V in voies.items():
        L = sorted(V.values(), key=lambda v: v[0])
        for v in L:
            v[2].sort(key=lambda x: (int("".join(c for c in x[0] if c.isdigit()) or 0), x[0]))
        out[k] = L
        print(k, len(L), "voies,", sum(len(v[2]) for v in L), "adresses")
    with open(SORTIE, "w", encoding="utf-8") as h:
        json.dump(out, h, ensure_ascii=False, separators=(",", ":"))
    print("écrit", os.path.normpath(SORTIE), os.path.getsize(SORTIE) // 1024, "Ko")


if __name__ == "__main__":
    main()
