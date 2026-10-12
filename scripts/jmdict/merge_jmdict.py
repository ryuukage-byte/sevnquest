#!/usr/bin/env python3
"""Gabungkan kandidat JMdict (hasil extract_jmdict.py) + terjemahan Indonesia ke src/data/db/kotoba.json.

Pemakaian:
  python3 -I scripts/jmdict/merge_jmdict.py <cands.json> <translations_dir> <kotoba.json> [tag_tema]

- Setiap file translations/NN.txt berisi baris `indeks|kata|arti Indonesia` untuk kandidat ke-(NN*400 + indeks)
  pada cands.json. Arti `-` berarti kandidat dilewati (nama diri, fragmen, dsb.).
- Entri baru diberi ID `kotoba_jm_<ent_seq JMdict>` sehingga idempoten: dijalankan ulang tidak menggandakan entri.
- Entri lama tidak pernah diubah.
"""
import json, re, sys, glob, os

CH = 400
cands_path, tr_dir, out_path = sys.argv[1:4]
THEME = sys.argv[4] if len(sys.argv) > 4 else None
cands = json.load(open(cands_path, encoding='utf-8'))
db = json.load(open(out_path, encoding='utf-8'))
have = {(v['word'], v['reading']) for v in db.values()}
haveW = {v['word'] for v in db.values()}

KANJI = re.compile(r'[一-鿿々]')
added = skipped = dup = 0
for path in sorted(glob.glob(os.path.join(tr_dir, '*.txt'))):
    n = int(os.path.basename(path)[:-4])
    for line in open(path, encoding='utf-8'):
        line = line.rstrip('\n')
        if not line:
            continue
        idx, word, arti = line.split('|', 2)
        c = cands[n * CH + int(idx)]
        assert c['word'] == word, (path, idx, word, c['word'])
        if arti.strip() == '-' or c['pos'] == 'verb_suru':
            skipped += 1
            continue
        eid = f"kotoba_jm_{c['id']}"
        if eid in db or (c['word'], c['reading']) in have or c['word'] in haveW:
            dup += 1
            continue
        first_sense = c['gloss'].split(' | ')[0]
        entry = {
            'id': eid,
            'word': c['word'],
            'reading': c['reading'],
            'meaningId': arti.strip(),
            'meaningEn': first_sense,
            'meaningJa': '',
            # JMdict tidak memuat level JLPT: kata yang sangat umum (skor prioritas tinggi) ditandai N2, sisanya N1.
            'jlpt': 'N2' if c['score'] >= 8 else 'N1',
            'wordType': c['pos'],
            'kanjiComponents': list(dict.fromkeys(KANJI.findall(c['word']))),
            'tags': ['jmdict', 'jlpt-estimasi'] + ([THEME] if THEME else []),
        }
        db[eid] = entry
        have.add((c['word'], c['reading'])); haveW.add(c['word'])
        added += 1

with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(db, f, ensure_ascii=False, indent=2)
    f.write('\n')
print(f'ditambahkan={added} dilewati={skipped} duplikat={dup} total={len(db)}')
