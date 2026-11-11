"""Construit les tronçons (legs) de transports.json à partir des colonnes extraites des fiches officielles."""
import json,re,sys
D=sys.argv[1]
c303=json.load(open(f"{D}/c303.json"));c315=json.load(open(f"{D}/c315.json"));cter=json.load(open(f"{D}/cter.json"));cl1=json.load(open(f"{D}/cl1.json"))
MOIS={"janvier":1,"février":2,"mars":3,"avril":4,"mai":5,"juin":6,"juillet":7,"août":8,"septembre":9,"octobre":10,"novembre":11,"décembre":12}
def dates_in(txt,sy=2026):
    out=[]
    for d,m in re.findall(r"le (\d{1,2}) ("+"|".join(MOIS)+")",txt):
        mo=MOIS[m];y=sy if mo>=8 else sy+1   # fiche du 31/08/2026 au 02/07/2027
        out.append(f"{y}-{mo:02d}-{int(d):02d}")
    return out
def hh(t):h,m=t.replace("h",":").split(":");return f"{int(h):02d}h{m}"
def per(c):
    s,v=c.get("scol"),c.get("vac")
    return "toujours" if (s,v)==("OUI","OUI") else "scolaire" if s=="OUI" else "vacances" if v=="OUI" else "toujours"
def car_leg(cols,dirn,frm,to,keyf,keyt):
    """keyf/keyt : (commune, arrêt) ; garde les colonnes qui desservent les deux dans l'ordre"""
    out=[]
    for c in cols:
        if not c["dir"].startswith(dirn):continue
        st=c["stops"];i=next((k for k,s in enumerate(st) if (s["town"],s["stop"])==keyf),None);j=next((k for k,s in enumerate(st) if (s["town"],s["stop"])==keyt),None)
        if i is None or j is None or j<=i:continue
        base={"dep":hh(st[i]["t"]),"arr":hh(st[j]["t"]),"jours":c["days"],"periode":per(c)}
        n=c.get("note") or ""
        if "Ne circule pas" in n:base["sauf"]=dates_in(n.split("Ne circule pas",1)[1])
        if re.search(r"Circule également le \d",n):base["aussi"]=dates_in(n)
        out.append(base)
        m=re.search(r"Circule également le ((?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)(?:, (?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche))*) de Vacances scolaires",n)
        if m:
            J={"lundi":"1","mardi":"2","mercredi":"3","jeudi":"4","vendredi":"5","samedi":"6","dimanche":"0"}
            e=dict(base);e["jours"]="".join(J[x] for x in m.group(1).split(", "));e["periode"]="vacances";out.append(e)
    # dédoublonne
    seen=set();res=[]
    for x in sorted(out,key=lambda x:(x["dep"],x["jours"])):
        k=json.dumps(x,sort_keys=True)
        if k not in seen:seen.add(k);res.append(x)
    return res
def ter_leg(cols,frm,to):
    out=[]
    for c in cols:
        g=[a["gare"] for a in c["arrets"]]
        if frm not in g or to not in g:continue
        i=g.index(frm);j=len(g)-1-g[::-1].index(to)
        if frm==to or j<=i:continue
        # ST-NAZAIRE apparaît deux fois (arrivée/départ) : on prend la 1re pour un départ, la dernière pour une arrivée
        if frm=="ST-NAZAIRE":i=len(g)-1-g[::-1].index(frm) if g.count(frm)>1 and g.index(frm)<j else i
        x={"dep":c["arrets"][i]["t"],"arr":c["arrets"][j]["t"],"jours":c["jours"],"periode":"toujours","train":c["num"]}
        if re.fullmatch(r"\d{4}",c["num"].split("/")[0]):x["tgv"]=True
        if c["num"].startswith("97") or c["num"].startswith("75"):x["car"]=True
        for k in("du","au"):
            if c.get(k):x[k]=c[k]
        if c.get("le"):x["aussi"]=[c["le"]];x["seulement"]=True
        if c.get("sauf"):x["sauf"]=[c["sauf"]]
        out.append(x)
    seen=set();res=[]
    for x in sorted(out,key=lambda x:(x["dep"],x["jours"])):
        k=json.dumps(x,sort_keys=True)
        if k not in seen:seen.add(k);res.append(x)
    return res
P=("Préfailles","Place de la Gare");TH=("Pornic","Théâtre St Gilles");PI=("Nantes","Pirmil");SN=("Saint-Nazaire","Gare SNCF")
legs=[
 {"id":"303-pref-pornic","ligne":"303","mode":"car","de":"Préfailles","a":"Pornic","arret_de":"Préfailles, Place de la Gare","arret_a":"Pornic, Théâtre St-Gilles","departs":car_leg(c303,"Nantes","","",P,TH)},
 {"id":"303-pref-nantes","ligne":"303","mode":"car","de":"Préfailles","a":"Nantes","arret_de":"Préfailles, Place de la Gare","arret_a":"Nantes, Pirmil (tram 2 et 3)","departs":car_leg(c303,"Nantes","","",P,PI)},
 {"id":"303-pornic-nantes","ligne":"303","mode":"car","de":"Pornic","a":"Nantes","arret_de":"Pornic, Théâtre St-Gilles","arret_a":"Nantes, Pirmil (tram 2 et 3)","departs":car_leg(c303,"Nantes","","",TH,PI)},
 {"id":"303-nantes-pornic","ligne":"303","mode":"car","de":"Nantes","a":"Pornic","arret_de":"Nantes, Pirmil","arret_a":"Pornic, Théâtre St-Gilles","departs":car_leg(c303,"Pornic","","",PI,TH)},
 {"id":"303-nantes-pref","ligne":"303","mode":"car","de":"Nantes","a":"Préfailles","arret_de":"Nantes, Pirmil","arret_a":"Préfailles, Place de la Gare","departs":car_leg(c303,"Pornic","","",PI,P)},
 {"id":"303-pornic-pref","ligne":"303","mode":"car","de":"Pornic","a":"Préfailles","arret_de":"Pornic, Théâtre St-Gilles","arret_a":"Préfailles, Place de la Gare","departs":car_leg(c303,"Pornic","","",TH,P)},
 {"id":"315-pref-pornic","ligne":"315","mode":"car","de":"Préfailles","a":"Pornic","arret_de":"Préfailles, Place de la Gare","arret_a":"Pornic, Théâtre St-Gilles","departs":car_leg(c315,"Saint-Nazaire","","",P,TH)},
 {"id":"315-pref-stnaz","ligne":"315","mode":"car","de":"Préfailles","a":"Saint-Nazaire","arret_de":"Préfailles, Place de la Gare","arret_a":"Saint-Nazaire, gare SNCF","departs":car_leg(c315,"Saint-Nazaire","","",P,SN)},
 {"id":"315-stnaz-pref","ligne":"315","mode":"car","de":"Saint-Nazaire","a":"Préfailles","arret_de":"Saint-Nazaire, gare SNCF","arret_a":"Préfailles, Place de la Gare","departs":car_leg(c315,"Préfailles","","",SN,P)},
 {"id":"315-pornic-pref","ligne":"315","mode":"car","de":"Pornic","a":"Préfailles","arret_de":"Pornic, Théâtre St-Gilles","arret_a":"Préfailles, Place de la Gare","departs":car_leg(c315,"Préfailles","","",TH,P)},
 {"id":"315-pornic-stnaz","ligne":"315","mode":"car","de":"Pornic","a":"Saint-Nazaire","arret_de":"Pornic, Théâtre St-Gilles","arret_a":"Saint-Nazaire, gare SNCF","departs":car_leg(c315,"Saint-Nazaire","","",TH,SN)},
 {"id":"315-stnaz-pornic","ligne":"315","mode":"car","de":"Saint-Nazaire","a":"Pornic","arret_de":"Saint-Nazaire, gare SNCF","arret_a":"Pornic, Théâtre St-Gilles","departs":car_leg(c315,"Préfailles","","",SN,TH)},
 {"id":"ter-pornic-nantes","ligne":"TER","mode":"train","de":"Pornic","a":"Nantes","arret_de":"Pornic, gare SNCF","arret_a":"Nantes, gare SNCF","departs":ter_leg(cter,"PORNIC","NANTES")},
 {"id":"ter-nantes-pornic","ligne":"TER","mode":"train","de":"Nantes","a":"Pornic","arret_de":"Nantes, gare SNCF","arret_a":"Pornic, gare SNCF","departs":ter_leg(cter,"NANTES","PORNIC")},
 {"id":"ter1-stnaz-nantes","ligne":"TER 1","mode":"train","de":"Saint-Nazaire","a":"Nantes","arret_de":"Saint-Nazaire, gare SNCF","arret_a":"Nantes, gare SNCF","departs":ter_leg(cl1,"ST-NAZAIRE","NANTES")},
 {"id":"ter1-nantes-stnaz","ligne":"TER 1","mode":"train","de":"Nantes","a":"Saint-Nazaire","arret_de":"Nantes, gare SNCF","arret_a":"Saint-Nazaire, gare SNCF","departs":ter_leg(cl1,"NANTES","ST-NAZAIRE")},
]
for L in legs:print(L["id"],len(L["departs"]),file=sys.stderr)
json.dump(legs,open(f"{D}/legs.json","w"),ensure_ascii=False,indent=1)
