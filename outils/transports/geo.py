"""Arrêts intermédiaires et tracé des cars de chaque tronçon (legs) de donnees/transports.json,
d'après le GTFS officiel Aléop (Région Pays de la Loire, https://donnees.paysdelaloire.fr/data/pdl.zip, Licence Ouverte).
Usage : python3 outils/transports/geo.py <dossier GTFS dézippé>  ->  donnees/trajets-geo.json
Les trains (TER) n'y sont pas : le plan les montre en ligne droite entre gares."""
import csv, json, sys, pathlib, collections
G = pathlib.Path(sys.argv[1]); R = pathlib.Path(__file__).resolve().parents[2]
rd = lambda f: csv.DictReader(open(G / f, encoding="utf-8"))
S = {r["stop_id"]: r for r in rd("stops.txt")}
par = lambda sid: S[sid]["parent_station"] or sid
# arrêts des extrémités (station parente du GTFS)
END = {"Saint-Michel-Chef-Chef, Tharon": "44MICHthar", "Préfailles, Place de la Gare": "44PREFgare", "Pornic, Théâtre St-Gilles": "44PORNgill", "Saint-Brevin, Pôle de Bresse": "44BREVbres",
       "Saint-Nazaire, gare SNCF": "44NAZAsncf", "Nantes, Pirmil": "44NANTpirm"}
key = lambda a: a.split(" (")[0]
T = json.load(open(R / "donnees/transports.json", encoding="utf-8"))
routes = {L["ligne"] for L in T["legs"] if L["mode"] == "car"}
trips = {r["trip_id"]: r for r in rd("trips.txt") if r["route_id"] in routes}
st = collections.defaultdict(list)
for r in rd("stop_times.txt"):
    if r["trip_id"] in trips: st[r["trip_id"]].append((int(r["stop_sequence"]), r["stop_id"], float(r["shape_dist_traveled"] or 0)))
need_shapes = set()
best = {}
for L in T["legs"]:
    if L["mode"] != "car": continue
    a, b = END.get(key(L["arret_de"])), END.get(key(L["arret_a"]))
    if not a or not b: print("extrémité inconnue", L["id"], file=sys.stderr); continue
    cand = []
    for tid, seq in st.items():
        if trips[tid]["route_id"] != L["ligne"]: continue
        seq = sorted(seq); ps = [par(s[1]) for s in seq]
        if a in ps and b in ps and ps.index(a) < len(ps) - 1 - ps[::-1].index(b):
            i, j = ps.index(a), len(ps) - 1 - ps[::-1].index(b)
            cand.append((j - i, tid, seq[i:j + 1]))
    if not cand: print("aucun trajet", L["id"], file=sys.stderr); continue
    cand.sort(key=lambda x: -x[0]); n, tid, seg = cand[0]  # le trajet qui dessert le plus d'arrêts entre les deux
    best[L["id"]] = (tid, seg); need_shapes.add(trips[tid]["shape_id"])
shp = collections.defaultdict(list)
for r in rd("shapes.txt"):
    if r["shape_id"] in need_shapes: shp[r["shape_id"]].append((int(r["shape_pt_sequence"]), float(r["shape_pt_lat"]), float(r["shape_pt_lon"]), float(r.get("shape_dist_traveled") or 0)))
def thin(pts, step=0.0004):  # garde un point tous les ~40 m
    out = [pts[0]]
    for p in pts[1:]:
        if abs(p[0] - out[-1][0]) + abs(p[1] - out[-1][1]) >= step: out.append(p)
    if out[-1] != pts[-1]: out.append(pts[-1])
    return [[round(x, 5), round(y, 5)] for x, y in out]
OUT = {}
for lid, (tid, seg) in best.items():
    stops = []
    for _, sid, _d in seg:
        s = S[sid]; stops.append([s["stop_name"], s["city_name"], round(float(s["stop_lat"]), 5), round(float(s["stop_lon"]), 5)])
    sh = sorted(shp.get(trips[tid]["shape_id"], [])); d0, d1 = seg[0][2], seg[-1][2]
    line = [(p[1], p[2]) for p in sh if (d0 - 1e-6) <= p[3] <= (d1 + 1e-6)] if sh and sh[-1][3] > 0 else []
    OUT[lid] = {"arrets": stops, "trace": thin(line) if len(line) > 1 else []}
    print(lid, len(stops), "arrêts", len(OUT[lid]["trace"]), "points de tracé", file=sys.stderr)
json.dump({"source": "GTFS Aléop, Région Pays de la Loire (Licence Ouverte)", "legs": OUT}, open(R / "donnees/trajets-geo.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
