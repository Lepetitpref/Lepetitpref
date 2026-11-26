#!/usr/bin/env python3
"""Logos des lieux sans photo : l'icône que le lieu publie lui-même sur son site
(apple-touch-icon, puis icône 192 px, puis og:image si c'est un logo).
  python3 outils/logos.py <liste.json>     liste = [{"n": nom ACTS, "url": site du lieu}]
Télécharge dans images/logos/<slug>.png (carré, 180 px max) et ajoute l'entrée dans
outils/photos-manuelles.json (logo:true, source). N'écrase jamais une entrée existante.
À relire à l'œil avant publication (une planche de vignettes suffit). Écarte les icônes génériques (à vérifier à l'œil : WordPress, Footeo, clap de cinéma, balle…) et les images trop petites (< 96 px)."""
import io, json, re, sys, hashlib, pathlib, unicodedata, urllib.parse, urllib.request, datetime
from PIL import Image

R = pathlib.Path(__file__).resolve().parent.parent
MAN = R / "outils" / "photos-manuelles.json"
DIR = R / "images" / "logos"
UA = {"User-Agent": "Mozilla/5.0 (Le Petit Pref; logos des lieux)"}
GENERIQUES = set()


def get(u, n=2_000_000):
    with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=20) as r:
        return r.read(n), r.geturl()


def slug(t):
    t = unicodedata.normalize("NFD", t.lower()).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-")[:40]


def candidats(html, base):
    out = []
    for rel, href in re.findall(r'<link[^>]+rel=["\']([^"\']*icon[^"\']*)["\'][^>]*href=["\']([^"\']+)', html, re.I) + \
            [(b, a) for a, b in re.findall(r'<link[^>]+href=["\']([^"\']+)["\'][^>]*rel=["\']([^"\']*icon[^"\']*)', html, re.I)]:
        size = re.search(r"(\d{2,4})", href)
        prio = 0 if "apple-touch" in rel.lower() else 1
        out.append((prio, -(int(size.group(1)) if size else 0), urllib.parse.urljoin(base, href)))
    out.sort()
    return [u for _, _, u in out]


def main():
    L = json.load(open(sys.argv[1], encoding="utf-8"))
    man = json.loads(MAN.read_text(encoding="utf-8")) if MAN.exists() else {}
    DIR.mkdir(parents=True, exist_ok=True)
    faits, rates = [], []
    for x in L:
        if x["n"] in man:
            continue
        # seulement le site du lieu lui-même : pas une mairie, un guide ou une plateforme
        if re.search(r"visorando|atlantic-loire-valley|lefooding|pornic\.fr|prefailles\.fr|villeneuvenretz|mairie|fest\.fr|jds\.fr|helloasso|tripadvisor|google|facebook|instagram", x["url"], re.I):
            rates.append((x["n"], "lien vers un autre site que le lieu")); continue
        try:
            html, base = get(x["url"])
            html = html.decode("utf-8", "ignore")
        except Exception as e:
            rates.append((x["n"], "site : " + str(e)[:40])); continue
        im = None
        for u in candidats(html, base):
            try:
                b, _ = get(u)
                h = hashlib.md5(b).hexdigest()
                if h in GENERIQUES:
                    continue
                t = Image.open(io.BytesIO(b))
                t.load()
                if min(t.size) < 96:
                    continue
                im = t.convert("RGBA")
                GENERIQUES.add(h)
                break
            except Exception:
                continue
        if im is None:
            rates.append((x["n"], "pas d'icône de 96 px ou plus")); continue
        im.thumbnail((180, 180))
        f = DIR / (slug(x["n"]) + ".png")
        im.save(f, optimize=True)
        man[x["n"]] = {"u": "images/logos/" + f.name, "a": x["n"], "logo": True,
                       "source": f"{x['url']} (icône du site, {datetime.date.today().strftime('%d/%m/%Y')})"}
        faits.append(x["n"])
    MAN.write_text(json.dumps(man, ensure_ascii=False, indent=1), encoding="utf-8")
    print(len(faits), "logos ajoutés :", ", ".join(faits))
    print(len(rates), "sans logo :", "; ".join(f"{n} ({r})" for n, r in rates))


main()
