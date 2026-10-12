import sqlite3,json,sys,re
DB,KO,OUT=sys.argv[1:4]
MIN=int(sys.argv[4]) if len(sys.argv)>4 else 5
c=sqlite3.connect(DB)
have=json.load(open(KO))
haveW=set(v['word'] for v in have.values())
haveWR=set((v['word'],v['reading']) for v in have.values())
haveR=set(v['reading'] for v in have.values())
pri={}
for idseq,t in c.execute("select k.idseq,p.text from Kanji k join KJP p on p.kid=k.ID"): pri.setdefault(idseq,set()).add(t)
for idseq,t in c.execute("select k.idseq,p.text from Kana k join KNP p on p.kid=k.ID"): pri.setdefault(idseq,set()).add(t)
def score(s):
    sc=0
    sc+=3*('ichi1' in s)+3*('news1' in s)+3*('spec1' in s)+2*('gai1' in s)
    sc+=('news2' in s)+('ichi2' in s)+('spec2' in s)+('gai2' in s)
    nf=[int(x[2:]) for x in s if re.fullmatch(r'nf\d\d',x)]
    if nf: sc+=3 if min(nf)<=12 else (2 if min(nf)<=24 else 1)
    return sc
def posmap(p):
    p=p.lower()
    if p.startswith('ichidan verb') or p.startswith('godan verb') or p.startswith('transitive verb') : return 'verb'
    if 'suru verb' in p and 'noun' not in p: return 'verb_suru'
    if p.startswith('noun or participle which takes the aux'): return 'noun'
    if p.startswith('adjective (keiyoushi)') or p.startswith('adjective (keiyoushi) - yoi'): return 'adjective-i'
    if p.startswith('adjectival nouns'): return 'adjective-na'
    if p.startswith('pre-noun'): return 'adjective-pn'
    if p.startswith('adverb'): return 'adverb'
    if p.startswith('noun'): return 'noun'
    if p.startswith('conjunction'): return 'conjunction'
    if p.startswith('particle'): return 'particle'
    if p.startswith('pronoun'): return 'pronoun'
    if p.startswith('counter'): return 'counter'
    if p.startswith('numeric'): return 'numeral'
    if p.startswith('interjection'): return 'interjection'
    if p.startswith('expression'): return 'expression'
    if p.startswith('prefix'): return 'prefix'
    if p.startswith('suffix'): return 'suffix'
    if p.startswith('auxiliary'): return 'auxiliary'
    return None
cands=[];skip={'dup':0,'lowscore':0,'bad':0}
allpos=set()
for idseq,s in pri.items():
    sc=score(s)
    if sc<MIN: skip['lowscore']+=1; continue
    kj=c.execute("select ID,text from Kanji where idseq=? order by ID",(idseq,)).fetchall()
    ka=c.execute("select ID,text,nokanji from Kana where idseq=? order by ID",(idseq,)).fetchall()
    senses=c.execute("select ID from Sense where idseq=? order by ID",(idseq,)).fetchall()
    if not senses or not ka: skip['bad']+=1; continue
    # primary forms
    kjp=set(r[0] for r in c.execute("select k.ID from Kanji k join KJP p on p.kid=k.ID where k.idseq=?",(idseq,)))
    kanjiForm=None
    for kid,t in kj:
        if kid in kjp: kanjiForm=t;break
    if not kanjiForm and kj: kanjiForm=kj[0][1]
    kanap=set(r[0] for r in c.execute("select k.ID from Kana k join KNP p on p.kid=k.ID where k.idseq=?",(idseq,)))
    reading=None
    for kid,t,nk in ka:
        if kid in kanap: reading=t;break
    if not reading: reading=ka[0][1]
    sens=[]
    for (sid,) in senses:
        pos=[r[0] for r in c.execute("select text from pos where sid=?",(sid,))]
        misc=[r[0] for r in c.execute("select text from misc where sid=?",(sid,))]
        gl=[r[0] for r in c.execute("select text from SenseGloss where sid=? order by rowid",(sid,))]
        sk=[r[0] for r in c.execute("select text from stagk where sid=?",(sid,))]
        sr=[r[0] for r in c.execute("select text from stagr where sid=?",(sid,))]
        sens.append(dict(pos=pos,misc=misc,gl=gl,sk=sk,sr=sr))
    # inherit pos
    last=[]
    for sn in sens:
        if sn['pos']: last=sn['pos']
        else: sn['pos']=last
    usable=[sn for sn in sens if not(sn['sk'] and kanjiForm and kanjiForm not in sn['sk']) and not(sn['sr'] and reading not in sn['sr'])]
    if not usable: usable=sens
    first=usable[0]
    mj=' '.join(first['misc'])
    if any(x in mj for x in ('obsolete','archaism','vulgar','derogatory','rare','historical','Buddhist','poetical','sensitive')) : skip['bad']+=1; continue
    word = reading if (not kanjiForm or any('usually written using kana' in m for m in first['misc'])) else kanjiForm
    pt=None
    for p in first['pos']:
        pt=posmap(p)
        if pt: break
    if not pt: skip['bad']+=1; continue
    allpos.update(first['pos'])
    if (word,reading) in haveWR or word in haveW or (kanjiForm and kanjiForm in haveW):
        skip['dup']+=1; continue
    if word==reading and reading in haveR and False: pass
    glosses=[]
    for sn in usable[:4]:
        g=sn['gl'][:3]
        glosses.append('; '.join(g))
    cands.append(dict(id=idseq,word=word,reading=reading,pos=pt,rawpos=first['pos'],score=sc,gloss=' | '.join(glosses[:3]),
        isSuru=any('suru verb' in p for p in first['pos']), kanjiForm=kanjiForm))
cands.sort(key=lambda x:(-x['score'],x['id']))
json.dump(cands,open(OUT,'w'),ensure_ascii=False)
print(len(cands),skip)
from collections import Counter
print(Counter(x['pos'] for x in cands)); print(Counter(x['score'] for x in cands))
