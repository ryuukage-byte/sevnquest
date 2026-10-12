import sqlite3,json,sys,re
DB,KO,OUT,FIELD=sys.argv[1:5]
c=sqlite3.connect(DB)
have=json.load(open(KO))
haveWR={(v['word'],v['reading']) for v in have.values()}
haveW={v['word'] for v in have.values()}
sys.path.insert(0,sys.argv[5]); 
from extract_helpers import posmap, score
if FIELD.startswith('@'):
    ws=list(dict.fromkeys(open(FIELD[1:],encoding='utf-8').read().split()))
    ids=[]
    for w in ws:
        for (i,) in c.execute("select idseq from Kanji where text=? union select idseq from Kana where text=?",(w,w)):
            if i not in ids: ids.append(i)
else:
    ids=[r[0] for r in c.execute("select distinct s.idseq from Sense s join field f on f.sid=s.ID where f.text=?",(FIELD,))]
pri={}
for idseq,t in c.execute("select k.idseq,p.text from Kanji k join KJP p on p.kid=k.ID"): pri.setdefault(idseq,set()).add(t)
for idseq,t in c.execute("select k.idseq,p.text from Kana k join KNP p on p.kid=k.ID"): pri.setdefault(idseq,set()).add(t)
out=[];skip=0
for idseq in ids:
    kj=c.execute("select ID,text from Kanji where idseq=? order by ID",(idseq,)).fetchall()
    ka=c.execute("select ID,text from Kana where idseq=? order by ID",(idseq,)).fetchall()
    if not ka: continue
    forms=[t for _,t in kj]+[t for _,t in ka]
    if any(f in haveW for f in forms): skip+=1; continue
    kjp={r[0] for r in c.execute("select k.ID from Kanji k join KJP p on p.kid=k.ID where k.idseq=?",(idseq,))}
    kanjiForm=next((t for i,t in kj if i in kjp),None) or (kj[0][1] if kj else None)
    kanap={r[0] for r in c.execute("select k.ID from Kana k join KNP p on p.kid=k.ID where k.idseq=?",(idseq,))}
    reading=next((t for i,t in ka if i in kanap),ka[0][1])
    sens=[]
    for (sid,) in c.execute("select ID from Sense where idseq=? order by ID",(idseq,)).fetchall():
        sens.append(dict(pos=[r[0] for r in c.execute("select text from pos where sid=?",(sid,))],
          misc=[r[0] for r in c.execute("select text from misc where sid=?",(sid,))],
          gl=[r[0] for r in c.execute("select text from SenseGloss where sid=? order by rowid",(sid,))],
          sk=[r[0] for r in c.execute("select text from stagk where sid=?",(sid,))]))
    last=[]
    for sn in sens:
        if sn['pos']: last=sn['pos']
        else: sn['pos']=last
    us=[sn for sn in sens if not(sn['sk'] and kanjiForm and kanjiForm not in sn['sk'])] or sens
    f=us[0]; mj=' '.join(f['misc'])
    if any(x in mj for x in ('obsolete','archaism','vulgar','derogatory','rare','historical','poetical','sensitive','dialect')): skip+=1; continue
    word = reading if (not kanjiForm or any('usually written using kana' in m for m in f['misc'])) else kanjiForm
    pt=next((p for p in (posmap(x) for x in f['pos']) if p),None)
    if not pt or pt=='verb_suru': skip+=1; continue
    if (word,reading) in haveWR or word in haveW: skip+=1; continue
    out.append(dict(id=idseq,word=word,reading=reading,pos=pt,score=score(pri.get(idseq,set())),
       gloss=' | '.join('; '.join(sn['gl'][:3]) for sn in us[:3]),rawpos=f['pos'][:2],isSuru=False,kanjiForm=kanjiForm))
out.sort(key=lambda x:(-x['score'],x['id']))
json.dump(out,open(OUT,'w'),ensure_ascii=False)
from collections import Counter
print(len(out),'skipped',skip,Counter(x['score']>0 for x in out))
