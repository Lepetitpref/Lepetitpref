"""Extrait les colonnes d'une fiche horaire Aléop (car) : jours, période, renvois, heure à chaque arrêt."""
import sys,re,json,pdfplumber
TIME=re.compile(r"^\d{1,2}:\d\d$")
DAYMAP={"Mar Mer Jeu":"234","Lun Ven":"15","Lun à Ven":"12345","Sam":"6","Dim & JF":"0","Lun Mar Jeu Ven":"1245","Mer":"3"}
def lines_of(words,tol=2.5):
    L=[]
    for w in sorted(words,key=lambda w:(round(w["top"]),w["x0"])):
        if L and abs(L[-1][0]-w["top"])<=tol: L[-1][1].append(w)
        else: L.append([w["top"],[w]])
    return [(t,sorted(ws,key=lambda w:w["x0"])) for t,ws in L]
def parse(path):
    out=[];pdf=pdfplumber.open(path)
    for pi,pg in enumerate(pdf.pages):
        lines=lines_of(pg.extract_words(keep_blank_chars=False))
        # découpe en tableaux : chacun a sa ligne « Circule en période scolaire » ; l'en-tête = lignes depuis la fin du tableau précédent
        TIMEL=lambda ws:any(TIME.match(w["text"]) for w in ws)
        P=[i for i,(t,ws) in enumerate(lines) if "période scolaire" in " ".join(w["text"] for w in ws)]
        starts=[]
        for k,i in enumerate(P):
            j=i
            while j>0 and not TIMEL(lines[j-1][1]) and (k==0 or j-1>P[k-1]):j-=1
            starts.append(j)
        curdir=None
        for bi,i0 in enumerate(starts):
            i1=starts[bi+1] if bi+1<len(starts) else len(lines)
            blk=lines[i0:i1]
            for t,ws in lines[:i1]:
                if ws[0]["text"]=="Direction":curdir=" ".join(w["text"] for w in ws[2:])
            dirn=curdir
            blk=[(t,ws) for t,ws in blk if ws[0]["text"]!="Direction"]
            blk=[(0,[{"text":"_"}])]+blk
            dayblock=None;hdr=[];flags={};letters={};rows=[];notes={};town=None
            for t,ws in blk[1:]:
                txt=" ".join(w["text"] for w in ws)
                if re.match(r"^(Lundi à vendredi|Samedi|Dimanche)",txt):dayblock=txt;continue
                yn=[(w["x0"],w["text"]) for w in ws if w["text"] in("OUI","NON")]
                if "Circule en période scolaire" in txt or "Circule en vacances scolaires" in txt or (yn and len(yn)==len([w for w in ws if w["text"] not in("Circule","en","période","vacances","scolaire","scolaires")])):
                    if yn:
                        k="v" if ("vacances" in txt or "s" in flags) else "s"
                        flags[k]=yn
                    else: flags.setdefault("_lab",0)
                    continue
                m=re.match(r"^([A-Z]) — (.*)",txt)
                if m:notes[m.group(1)]=m.group(2);continue
                times=[w for w in ws if TIME.match(w["text"])]
                if not times:
                    if "s" not in flags and "_lab" not in flags:  # en-tête de jours
                        for w in ws:
                            if w["text"] in("Mar","Mer","Jeu","Lun","Ven","Sam","Dim","&","JF","à"):hdr.append(w)
                    elif all(re.match(r"^[A-Z]$",w["text"]) for w in ws):
                        for w in ws:letters[round(w["x0"])]=w["text"]
                    continue
                lab=[w for w in ws if not TIME.match(w["text"]) and w["x1"]<times[0]["x0"]]
                label=" ".join(w["text"] for w in lab).replace("▼","").strip()
                label=label.replace("▲","").strip()
                if " -" in label:town,stop=label.split(" -",1)
                else:stop=label
                rows.append((town,stop.strip(),[(w["x0"],w["text"]) for w in times]))
            # en-têtes : la case (rectangle) qui contient chaque mot d'en-tête couvre ses colonnes
            heads=[]
            for w in hdr:
                cx,cy=(w["x0"]+w["x1"])/2,(w["top"]+w["bottom"])/2
                rs=[r for r in pg.rects if r["x0"]<=cx<=r["x1"] and r["top"]<=cy<=r["bottom"] and (r["x1"]-r["x0"])>(w["x1"]-w["x0"])]
                if not rs:continue
                r=min(rs,key=lambda r:(r["x1"]-r["x0"])*(r["bottom"]-r["top"]))
                k=(round(r["x0"]),round(r["x1"]))
                h=next((h for h in heads if h[0]==k),None)
                if h is None:h=[k,[]];heads.append(h)
                h[1].append(w)
            heads=[(k,re.sub(r"\s+"," "," ".join(x["text"] for x in sorted(ws,key=lambda x:(round(x["top"]),x["x0"]))))) for k,ws in heads]
            cols=sorted({round(x) for _,_,ts in rows for x,_ in ts})
            cl=[];
            for c in cols:
                if cl and c-cl[-1][-1]<4:cl[-1].append(c)
                else:cl.append([c])
            colx=[g[0] for g in cl]
            def near(lst,x,tol=6):
                b=min(lst,key=lambda p:abs(p[0]-x),default=None);return b[1] if b and abs(b[0]-x)<=tol else None
            for cx in colx:
                h=[tx for (x0,x1),tx in heads if x0-1<=cx+4<=x1+1];days=DAYMAP.get(h[-1]) if h else None
                if days is None and dayblock and dayblock.startswith("Lundi"):days="12345"
                s=near(flags.get("s",[]),cx,12);v=near(flags.get("v",[]),cx,12)
                let=near(sorted(letters.items()),cx,10)
                st=[{"town":tw,"stop":sp,"t":near(ts,cx,4)} for tw,sp,ts in rows]
                st=[x for x in st if x["t"]]
                out.append({"page":pi+1,"dir":dirn,"days":days,"head":h[-1] if h else dayblock,"scol":s,"vac":v,"renvoi":let,"note":notes.get(let) if let else None,"stops":st})
    return out
if __name__=="__main__":
    print(json.dumps(parse(sys.argv[1]),ensure_ascii=False,indent=0))
