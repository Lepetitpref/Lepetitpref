#!/usr/bin/env python3
"""Search Console (Google) : clics, affichages, position, pages et recherches de lepetitpref.fr.
  GSC_KEY='<contenu du fichier JSON du compte de service>' python3 outils/gsc.py <fichier de sortie>
Lancé chaque matin par .github/workflows/gsc.yml (secret GSC_KEY du dépôt).
Compte de service en lecture seule (« Restreint ») ajouté dans Search Console. Aucune dépendance :
la signature du jeton se fait avec openssl. Les recherches vues moins de 2 fois sont écartées
(Google masque déjà les plus rares ; on ne publie pas de nom de personne isolé)."""
import base64, datetime, json, os, subprocess, sys, tempfile, time, urllib.parse, urllib.request

SITES = ["https://lepetitpref.fr/", "sc-domain:lepetitpref.fr"]
b64 = lambda b: base64.urlsafe_b64encode(b).rstrip(b"=").decode()


def jeton(cle):
    now = int(time.time())
    head = b64(json.dumps({"alg": "RS256", "typ": "JWT"}).encode())
    body = b64(json.dumps({"iss": cle["client_email"], "scope": "https://www.googleapis.com/auth/webmasters.readonly",
                           "aud": cle["token_uri"], "iat": now, "exp": now + 3600}).encode())
    with tempfile.NamedTemporaryFile("w", suffix=".pem", delete=False) as f:
        f.write(cle["private_key"]); kp = f.name
    try:
        sig = subprocess.run(["openssl", "dgst", "-sha256", "-sign", kp], input=f"{head}.{body}".encode(),
                             capture_output=True, check=True).stdout
    finally:
        os.unlink(kp)
    data = urllib.parse.urlencode({"grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
                                   "assertion": f"{head}.{body}.{b64(sig)}"}).encode()
    with urllib.request.urlopen(cle["token_uri"], data, timeout=30) as r:
        return json.load(r)["access_token"]


def requete(tok, site, corps):
    u = f"https://www.googleapis.com/webmasters/v3/sites/{urllib.parse.quote(site, safe='')}/searchAnalytics/query"
    corps = dict(corps, dataState="all")  # données récentes (« fraîches ») comprises : Google les ajoute quelques heures après
    rq = urllib.request.Request(u, json.dumps(corps).encode(), {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"})
    with urllib.request.urlopen(rq, timeout=60) as r:
        return json.load(r).get("rows", [])


def main():
    out = sys.argv[1]
    cle = json.loads(os.environ["GSC_KEY"])
    tok = jeton(cle)
    fin = datetime.date.today()
    deb = datetime.date(2026, 11, 1)
    d28 = (fin - datetime.timedelta(days=28)).isoformat()
    site = None
    for s in SITES:
        try:
            requete(tok, s, {"startDate": deb.isoformat(), "endDate": fin.isoformat(), "rowLimit": 1}); site = s; break
        except Exception as e:
            print("propriété", s, e)
    if not site:
        sys.exit("Aucune propriété Search Console accessible (le compte de service est-il ajouté ?)")
    r2 = lambda x: round(x, 3)
    vus = {r["keys"][0]: r for r in requete(tok, site, {"startDate": deb.isoformat(), "endDate": fin.isoformat(), "dimensions": ["date"], "rowLimit": 500})}
    # Google ne renvoie pas les jours sans aucun affichage : on les remet à 0 depuis le premier jour connu, jusqu'à avant-hier
    jours, d = [], min([datetime.date.fromisoformat(k) for k in vus] or [fin])
    while d <= fin - datetime.timedelta(days=1):
        r = vus.get(d.isoformat())
        jours.append({"d": d.isoformat(), "clics": r["clicks"] if r else 0, "aff": r["impressions"] if r else 0, "pos": round(r["position"], 1) if r else 0})
        d += datetime.timedelta(days=1)
    pages = [{"page": urllib.parse.urlparse(r["keys"][0]).path or "/", "clics": r["clicks"], "aff": r["impressions"], "pos": round(r["position"], 1)}
             for r in requete(tok, site, {"startDate": d28, "endDate": fin.isoformat(), "dimensions": ["page"], "rowLimit": 100})]
    recs = [{"q": r["keys"][0], "clics": r["clicks"], "aff": r["impressions"], "pos": round(r["position"], 1)}
            for r in requete(tok, site, {"startDate": d28, "endDate": fin.isoformat(), "dimensions": ["query"], "rowLimit": 200})
            if r["impressions"] >= 2]
    tot = requete(tok, site, {"startDate": deb.isoformat(), "endDate": fin.isoformat(), "rowLimit": 1})
    t = tot[0] if tot else {"clicks": 0, "impressions": 0, "ctr": 0, "position": 0}
    res = {"maj": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"), "site": site,
           "depuis": deb.isoformat(), "total": {"clics": t["clicks"], "aff": t["impressions"], "ctr": r2(t.get("ctr", 0)), "pos": round(t.get("position", 0), 1)},
           "jours": jours, "pages_28j": pages, "recherches_28j": recs}
    json.dump(res, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"Search Console : {t['clicks']} clics, {t['impressions']} affichages depuis {deb} ; {len(pages)} pages, {len(recs)} recherches")


main()
