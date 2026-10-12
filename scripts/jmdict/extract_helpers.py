import re
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
