"""Extrait les trains d'une fiche horaire TER Aléop : numéro, jours, provenance/destination, heure par gare."""
import sys,re,json,pdfplumber
T=re.compile(r"^\d\d\.\d\d$");NUM=re.compile(r"^(\d{4,6})+$")
DN={"LUN":1,"MAR":2,"MER":3,"JEU":4,"VEN":5,"SAM":6,"DIM":0}
def glue(words):
    """recolle les chiffres isolés d'une même ligne (numéros de train écrits caractère par caractère)"""
    ws=sorted(words,key=lambda w:(round(w["top"]),w["x0"]));out=[]
    for w in ws:
        p=out[-1] if out else None
        if p and len(w["text"])==1 and w["text"].isdigit() and re.fullmatch(r"\d+",p["text"]) and abs(p["top"]-w["top"])<1 and 0<=w["x0"]-p["x1"]<4 and len(p["text"])<6:
            p=dict(p);p["text"]+=w["text"];p["x1"]=w["x1"];out[-1]=p
        else:out.append(dict(w))
    return out
def lines_of(words,tol=2.5):
    words=glue(words);L=[]
    for w in sorted(words,key=lambda w:(round(w["top"]),w["x0"])):
        if L and abs(L[-1][0]-w["top"])<=tol:L[-1][1].append(w)
        else:L.append([w["top"],[w]])
    return [(t,sorted(ws,key=lambda w:w["x0"])) for t,ws in L]
def restr(txt,base):
    txt=txt.upper().replace("A ","À ")
    m=re.match(r"^(LUN|MAR|MER|JEU|VEN|SAM|DIM) À (LUN|MAR|MER|JEU|VEN|SAM|DIM)$",txt)
    if m:
        a,b=DN[m.group(1)],DN[m.group(2)];r=[];d=a
        while True:
            r.append(d)
            if d==b:break
            d=(d+1)%7
        return "".join(str(x) for x in r)
    ds=[DN[t] for t in re.findall(r"LUN|MAR|MER|JEU|VEN|SAM|DIM",txt)]
    return "".join(str(x) for x in ds) if ds else base
def parse(path):
    out=[];pdf=pdfplumber.open(path)
    for pg in pdf.pages:
        L=lines_of(pg.extract_words(keep_blank_chars=False));title=None;base=None;anchors=None;rows=[];extra={};hdrw=[]
        def flush():
            nonlocal_fix=None
            if not anchors:return
            for i,(cx,num) in enumerate(anchors):
                st=[]
                for name,ts in rows:
                    t=[w for w in ts if abs((w["x0"]+w["x1"])/2-cx)<9]
                    if t:st.append({"gare":name,"t":t[0]["text"].replace(".","h")})
                val=extra.get("val",{}).get(i);r=extra.get("r",{}).get(i) or (re.sub(r"[^A-ZÀ ]","",val.upper()).strip() if val and re.fullmatch(r"[A-Za-zÀà ]+",val or "") and re.search(r"LUN|MAR|MER|JEU|VEN|SAM|DIM",val.upper()) else None);pv=extra.get("prov",{}).get(i);ds=extra.get("dest",{}).get(i)
                vz=re.sub(r"[\s\-]+","",val or "").lower()
                du=re.search(r"àpartirdu(\d\d)/(\d\d)",vz);au=re.search(r"jusqu'?au(\d\d)/(\d\d)",vz);un=re.search(r"uniquement(?:le)?(\d\d)/(\d\d?)",vz);sf=re.search(r"sauf(?:le)?(\d\d)/(\d\d?)",vz)
                out.append({"du":du and f"2026-{du.group(2)}-{du.group(1)}","au":au and f"2026-{au.group(2)}-{au.group(1)}","le":un and f"2026-{un.group(2).zfill(2)}-{un.group(1)}","sauf":sf and f"2026-{sf.group(2).zfill(2)}-{sf.group(1)}","titre":title,"num":num,"jours":restr(r,base) if r else base,"restr":r,"validite":val,"provenance":pv,"destination":ds,"arrets":st})
        for t,ws in L:
            txt=" ".join(w["text"] for w in ws)
            if re.search(r"[A-Z]{3,}.*–",txt) and not any(T.match(w["text"]) for w in ws):title=re.sub(r"\s+"," ",txt).strip()
            m=re.match(r"^(Du lundi au vendredi|Samedi|Dimanche et fêtes)",txt)
            if m:
                flush();anchors=None;rows=[];extra={};hdrw.clear()
                base={"Du lundi au vendredi":"12345","Samedi":"6","Dimanche et fêtes":"0"}[m.group(1)];continue
            if base is None:continue
            times=[w for w in ws if T.match(w["text"])]
            if anchors is None and not times:
                hdrw.extend(ws);continue
            if anchors is None and times:
                nums=[w for w in hdrw if NUM.match(w["text"])];cl=[]
                for w in sorted(nums,key=lambda w:(w["x0"]+w["x1"])/2):
                    c=(w["x0"]+w["x1"])/2
                    parts=re.findall(r"\d{6}|\d{5}|\d{4}",w["text"]) if len(w["text"])>6 else [w["text"]]
                    if cl and abs(cl[-1][0]-c)<8:cl[-1][1].extend(parts)
                    else:cl.append([c,parts])
                anchors=[(c,"/".join(n)) for c,n in cl]
                for w in hdrw:
                    if NUM.match(w["text"]):continue
                    c=(w["x0"]+w["x1"])/2;i=min(range(len(anchors)),key=lambda i:abs(anchors[i][0]-c))
                    if abs(anchors[i][0]-c)<16:extra.setdefault("val",{})[i]=(extra.get("val",{}).get(i,"")+" "+w["text"]).strip()
            if anchors is None:continue
            if times:
                name=" ".join(w["text"] for w in ws if not T.match(w["text"]) and w["x1"]<times[0]["x0"])
                rows.append((name,times));continue
            if ws[0]["text"] in("Provenance","Destination"):
                k="prov" if ws[0]["text"]=="Provenance" else "dest"
                for w in ws[1:]:
                    c=(w["x0"]+w["x1"])/2;i=min(range(len(anchors)),key=lambda i:abs(anchors[i][0]-c))
                    if abs(anchors[i][0]-c)<20:extra.setdefault(k,{})[i]=(extra.get(k,{}).get(i,"")+" "+w["text"]).strip()
                continue
            if all(w["text"].upper() in DN or w["text"].upper() in("À","A","ET") for w in ws):
                # regroupe les mots proches en phrases, chacune attribuée à la colonne la plus proche
                ph=[];
                for w in ws:
                    if ph and w["x0"]-ph[-1][-1]["x1"]<6:ph[-1].append(w)
                    else:ph.append([w])
                for p in ph:
                    c=(p[0]["x0"]+p[-1]["x1"])/2;i=min(range(len(anchors)),key=lambda i:abs(anchors[i][0]-c))
                    extra.setdefault("r",{})[i]=" ".join(w["text"] for w in p)
        flush()
    return out
if __name__=="__main__":print(json.dumps(parse(sys.argv[1]),ensure_ascii=False,indent=0))
