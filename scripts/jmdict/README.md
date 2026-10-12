# Impor kosakata dari JMdict

Sumber data: **JMdict** © Electronic Dictionary Research and Development Group (EDRDG),
dipakai sesuai [lisensi EDRDG](https://www.edrdg.org/edrdg/licence.html) (CC BY-SA 4.0).
Diambil dari paket PyPI `jamdict-data` (JMdict dalam SQLite).

Alur:

1. `python3 -I extract_jmdict.py <jamdict.db> <src/data/db/kotoba.json> cands.json 5`
   memilih kata umum (tag prioritas `ichi1/news1/spec1/gai1/nf..`, skor >= 5) yang belum ada di library,
   diurutkan dari yang paling sering dipakai.
2. Arti bahasa Indonesia ditulis manual per 400 kandidat di `translations/NN.txt`
   (`indeks|kata|arti`; arti `-` = lewati: nama diri, fragmen, dsb.).
3. `python3 -I merge_jmdict.py cands.json translations src/data/db/kotoba.json`
   menambahkan entri `kotoba_jm_<ent_seq>` (idempoten, entri lama tidak diubah).

Catatan: JMdict tidak memuat level JLPT. Entri impor diberi `jlpt` perkiraan (N2 untuk kata sangat umum,
selain itu N1) dan tag `jlpt-estimasi`; belum memiliki kalimat contoh.
