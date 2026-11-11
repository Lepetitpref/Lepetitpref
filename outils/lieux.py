#!/usr/bin/env python3
"""Lieux du Petit Préf (restos, bars, marchés, producteurs, activités) : tableau ACTS de app.js, ligne 3.

  python3 outils/lieux.py sortir <fichier.json>    écrit ACTS dans un fichier lisible (une fiche par objet)
  python3 outils/lieux.py remettre <fichier.json>  contrôle le fichier puis le remet dans app.js
  python3 outils/lieux.py tranche [jour]           liste les fiches à relire aujourd'hui (rotation : chaque fiche une fois par semaine ;
                                                   jour = 0 lundi … 6 dimanche, par défaut aujourd'hui)

Après « remettre » : node --check app.js, python3 outils/verifier.py, python3 outils/version.py.
Contrôles : chaque fiche a n, cat, town ; liens en http(s) ; horaires `open` bien formés
({from:"MM-JJ", to:"MM-JJ", days:"0123456" (0 = dimanche), hours:"8h–13h"}) ; pas de portable sans fiche officielle (à vérifier à la main).
"""
import json, re, subprocess, sys, pathlib

RACINE = pathlib.Path(__file__).resolve().parent.parent
APP = RACINE / "app.js"


def lire():
    s = APP.read_text(encoding="utf-8")
    i = s.index("ACTS=") + 5
    acts, fin = json.JSONDecoder().raw_decode(s[i:])
    return s, i, fin, acts


def controle(acts):
    err = []
    noms = set()
    for k, a in enumerate(acts):
        ou = f"fiche {k} ({a.get('n', '?')})"
        for c in ("n", "cat", "town"):
            if not a.get(c):
                err.append(f"{ou} : champ {c} manquant")
        if a.get("n") in noms:
            err.append(f"{ou} : nom en double")
        noms.add(a.get("n"))
        u = a.get("url")
        if u and not re.match(r"^https?://", u):
            err.append(f"{ou} : lien non http(s)")
        for r in a.get("open") or []:
            if not (re.match(r"^\d\d-\d\d$", r.get("from", "")) and re.match(r"^\d\d-\d\d$", r.get("to", ""))):
                err.append(f"{ou} : période open mal formée {r}")
            if r.get("days") and not re.match(r"^[0-6]{1,7}$", r["days"]):
                err.append(f"{ou} : jours open mal formés {r}")
        for c in ("lat", "lon"):
            if a.get(c) is not None and not isinstance(a[c], (int, float)):
                err.append(f"{ou} : {c} non numérique")
        if a.get("cadre") and not set(a["cadre"]) <= {"vue", "plage", "terrasse"}:
            err.append(f"{ou} : cadre inconnu")
    return err


def tranche(j):
    _, _, _, acts = lire()
    noms = sorted(a["n"] for a in acts)
    t = [n for k, n in enumerate(noms) if k % 7 == j]
    print(f"{len(t)} fiches à relire aujourd'hui (tranche {j}/6) :")
    print("\n".join(t))


def main():
    if len(sys.argv) >= 2 and sys.argv[1] == "tranche":
        import datetime
        tranche(int(sys.argv[2]) if len(sys.argv) > 2 else datetime.date.today().weekday())
        return
    if len(sys.argv) != 3 or sys.argv[1] not in ("sortir", "remettre"):
        print(__doc__)
        sys.exit(2)
    f = pathlib.Path(sys.argv[2])
    s, i, fin, acts = lire()
    if sys.argv[1] == "sortir":
        f.write_text(json.dumps(acts, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"{len(acts)} fiches écrites dans {f}")
        return
    nouv = json.loads(f.read_text(encoding="utf-8"))
    if not isinstance(nouv, list):
        sys.exit("Le fichier doit contenir une liste de fiches.")
    err = controle(nouv)
    if err:
        print("\n".join(err))
        sys.exit("Rien n'a été remis dans app.js.")
    APP.write_text(s[:i] + json.dumps(nouv, ensure_ascii=False, separators=(",", ":")) + s[i + fin:], encoding="utf-8")
    r = subprocess.run(["node", "--check", str(APP)], capture_output=True, text=True)
    if r.returncode:
        APP.write_text(s, encoding="utf-8")
        sys.exit("app.js invalide, rien n'a changé : " + r.stderr[:300])
    print(f"OK · {len(nouv)} fiches remises dans app.js ({len(nouv) - len(acts):+d})")


if __name__ == "__main__":
    main()
