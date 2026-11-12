#!/usr/bin/env python3
"""Version anglaise des contenus (événements, lieux, associations, genres de films) : donnees/en-data.json.

  python3 outils/traduire.py manque [fichier.json]   liste les textes français pas encore traduits (JSON : liste)
  python3 outils/traduire.py ajouter <fichier.json>  ajoute des traductions {"texte français": "English text", ...}

L'interface est traduite à part (donnees/en.json). Ici, une traduction = le texte entier, tel qu'il s'affiche.
Garder tels quels les noms propres (lieux, salles, associations, films), les heures (« 20h30 »), les prix, les numéros.
"""
import json, sys, pathlib, re

R = pathlib.Path(__file__).resolve().parent.parent
D = R / "donnees"
OUT = D / "en-data.json"


def acts():
    s = (R / "app.js").read_text(encoding="utf-8")
    i = s.index("ACTS=") + 5
    return json.JSONDecoder().raw_decode(s[i:])[0]


def textes():
    t = []
    for e in json.loads((D / "events.json").read_text(encoding="utf-8")):
        t += [e.get("title"), e.get("desc"), e.get("category")]
    for a in acts():
        t += [a.get("d"), a.get("season"), a.get("price")]
    for a in json.loads((D / "assos.json").read_text(encoding="utf-8")):
        t += [a.get("what"), a.get("desc"), a.get("regular"), a.get("forWho")]
    for c in json.loads((D / "cinema.json").read_text(encoding="utf-8")):
        t += [c.get("genre")]
    norm = lambda x: re.sub(r"\s+", " ", x).strip()
    out = []
    for x in t:
        if isinstance(x, str) and re.search(r"[a-zà-ÿ]{3}", x, re.I):
            out.append(norm(x))
    return sorted(set(out))


def main():
    if len(sys.argv) < 2 or sys.argv[1] not in ("manque", "ajouter"):
        print(__doc__); sys.exit(2)
    have = json.loads(OUT.read_text(encoding="utf-8")) if OUT.exists() else {}
    if sys.argv[1] == "manque":
        m = [x for x in textes() if x not in have]
        s = json.dumps(m, ensure_ascii=False, indent=0)
        if len(sys.argv) > 2: pathlib.Path(sys.argv[2]).write_text(s, encoding="utf-8")
        else: print(s)
        print(f"{len(m)} textes à traduire", file=sys.stderr); return
    new = json.loads(pathlib.Path(sys.argv[2]).read_text(encoding="utf-8"))
    if not isinstance(new, dict): sys.exit("Le fichier doit être un objet {français: anglais}.")
    keep = set(textes())
    have.update({k: v for k, v in new.items() if isinstance(v, str) and v.strip()})
    have = {k: v for k, v in have.items() if k in keep}          # on oublie ce qui n'est plus affiché
    OUT.write_text(json.dumps(have, ensure_ascii=False, indent=0, sort_keys=True), encoding="utf-8")
    print(f"OK · {len(have)} traductions · {len([x for x in keep if x not in have])} encore à faire")


if __name__ == "__main__":
    main()
