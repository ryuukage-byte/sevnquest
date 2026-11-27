#!/usr/bin/env python3
"""Kata dari soal JLPT resmi yang belum ada di kamus (untuk Pack Kilat, docs/prd/PRD_TOKO_PACK.md).

Alur (dari root repo, <db> = jamdict.db dari paket PyPI jamdict-data):
  1. python3 -I scripts/jmdict/extract_theme.py <db> src/data/db/kotoba.json cands_ujian.json @scripts/jmdict/curated_ujian.txt scripts/jmdict
  2. python3 -I scripts/jmdict/exam_words.py prepare cands_ujian.json
       onomatope yang di JMdict berbentuk katakana (ジワジワ) ditulis hiragana seperti di soal ujian (じわじわ).
  3. python3 -I scripts/jmdict/merge_jmdict.py cands_ujian.json scripts/jmdict/translations_ujian src/data/db/kotoba.json ujian-jlpt
  4. npx tsx scripts/packs/build_pack.ts N3 (juga N2, N1)
  5. python3 -I scripts/jmdict/exam_words.py levels src/data/db/kotoba.json scripts/packs/out/kilat-*/book.json
       level JLPT entri baru = level ujian terendah tempat kata itu muncul, bukan perkiraan N1/N2.
       Ulangi langkah 4 sesudahnya (level kata ikut menentukan pencocokan homonim).

Langkah 1 harus dijalankan pada kotoba.json SEBELUM merge agar indeks kandidat cocok dengan translations_ujian/00.txt.
"""
import json, sys

def kata2hira(s):
    return ''.join(chr(ord(c) - 0x60) if 'ァ' <= c <= 'ヶ' else c for c in s)

# Onomatope yang muncul berhiragana di soal.
HIRAGANA_IN_EXAM = {'ジワジワ', 'ガラガラ', 'ギクシャク', 'ザーザー', 'ゴツゴツ', 'チカチカ'}
# ザーザー di soal ditulis ざあざあ.
SPELLING = {'ザーザー': 'ざあざあ'}

def prepare(path):
    cands = json.load(open(path, encoding='utf-8'))
    for c in cands:
        if c['word'] in HIRAGANA_IN_EXAM:
            h = SPELLING.get(c['word'], kata2hira(c['word']))
            c['word'] = c['reading'] = h
    json.dump(cands, open(path, 'w', encoding='utf-8'), ensure_ascii=False)

def levels(path, *books):
    """Level entri baru = level ujian terendah di antara pack Kilat yang memuatnya (book.json hasil build_pack)."""
    order = ['N5', 'N4', 'N3', 'N2', 'N1']
    found = {}
    for b in books:
        book = json.load(open(b, encoding='utf-8'))
        for ch in book['chapters']:
            for it in ch['items']:
                lv = book['level']
                if it['id'] not in found or order.index(lv) < order.index(found[it['id']]):
                    found[it['id']] = lv
    db = json.load(open(path, encoding='utf-8'))
    n = 0
    for k, v in db.items():
        tags = v.get('tags') or []
        if 'ujian-jlpt' in tags and k in found:
            if v.get('jlpt') != found[k] or 'jlpt-estimasi' in tags:
                v['jlpt'] = found[k]
                v['tags'] = [t for t in tags if t != 'jlpt-estimasi']
                n += 1
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(db, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print('level diset:', n)

if __name__ == '__main__':
    {'prepare': prepare, 'levels': levels}[sys.argv[1]](*sys.argv[2:])
