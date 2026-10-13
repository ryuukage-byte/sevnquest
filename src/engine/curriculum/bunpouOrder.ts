// ==============================================================================
// URUTAN BELAJAR BUNPOU (kurasi)
// Basis data bunpou N5/N4 tersusun menurut abjad (あげる, い形容詞＋名詞, 一番 …), bukan urutan belajar.
// Di sini pola dikelompokkan per tahap: tiap tahap hanya memakai bentuk yang sudah diajarkan tahap sebelumnya
// (kopula → partikel → kata kerja → kata sifat → bentuk て → bentuk ない → …).
// Angka = nomor urut pada ID (bp_n5_036 -> 36). Dijaga oleh curriculum.test.ts: setiap pola N5/N4 harus
// muncul tepat satu kali. Pola baru yang belum didaftarkan otomatis ditaruh di akhir levelnya.
// N3 (w1d1g1 …) sudah berurutan minggu/hari seperti buku ajar; N2/N1 belum dikurasi (urutan basis data).
// ==============================================================================

type Stage = readonly [label: string, numbers: readonly number[]];

const N5: readonly Stage[] = [
  ['Kopula & kalimat dasar', [36, 96, 30, 8, 87, 110, 41, 31, 86, 114]],
  ['Keberadaan & partikel tempat', [9, 10, 12, 82, 49, 99, 58, 113]],
  ['Kata kerja dasar', [116, 6, 33, 23, 105, 61, 117, 100, 59, 4, 18, 109]],
  ['Kata sifat', [2, 77, 78, 20, 15, 21, 65, 26, 19, 25, 90]],
  ['Kata tanya & keterangan', [66, 60, 79, 81, 63, 97, 80, 43, 5, 38, 22, 39, 107, 111]],
  ['Ajakan, permintaan, keinginan', [103, 104, 106, 118, 17, 37, 83, 84]],
  ['Penghubung kalimat', [34, 35, 56, 29, 27, 28, 94]],
  ['Bentuk て', [48, 53, 51, 108, 52, 57, 55, 45, 50]],
  ['Bentuk ない', [69, 70, 76, 74, 75, 71, 73, 72, 67]],
  ['Bentuk た & bentuk kamus', [40, 42, 101, 102, 64, 47, 14, 62]],
  ['Perbandingan & nominalisasi', [98, 115, 3, 95, 89, 92, 91, 93, 85, 32, 16, 11]],
  ['Memberi-menerima & gaya bicara', [1, 24, 112, 54, 44, 119, 88, 46, 68, 13, 7]],
];

const N4: readonly Stage[] = [
  ['Pemantapan bentuk て & penghubung', [93, 12, 15, 134, 133, 22, 62, 125, 139]],
  ['Kata keterangan & takaran', [23, 71, 69, 132, 162, 91, 130, 79, 141, 85, 57, 143, 35]],
  ['Kemampuan & pengalaman', [53, 188, 168, 46, 51, 52, 110]],
  ['Niat, rencana, kutipan', [26, 174, 182, 55, 56, 124, 116, 120]],
  ['Kewajiban, saran, perintah', [131, 135, 136, 160, 41, 137, 171, 89, 90]],
  ['Aspek (kata kerja bantu て)', [99, 105, 95, 100, 96, 98, 186, 86, 87, 167]],
  ['Kata kerja majemuk', [8, 1, 4, 3, 6, 9, 7, 5]],
  ['Memberi-menerima tindakan', [94, 103, 113, 114, 109, 102, 97, 101, 106, 115, 189]],
  ['Pengandaian', [88, 153, 140, 117, 172, 155, 111, 119, 159]],
  ['Dugaan & kabar', [43, 158, 157, 73, 75, 74, 173, 169, 184, 127, 40, 37, 16, 129]],
  ['Perubahan & tujuan', [48, 145, 181, 180, 175, 178, 177, 179, 150, 149]],
  ['Perumpamaan & perbandingan', [152, 176, 170, 185, 146, 183, 118, 148, 147, 17, 18, 92, 72]],
  ['Waktu & batas', [20, 21, 166, 33, 54, 163, 27, 24, 25, 161]],
  ['Penekanan jumlah & pembatas', [63, 66, 65, 67, 156, 82, 83, 112, 13, 142, 68, 14, 49, 154]],
  ['Pertanyaan tertanam & penghubung lanjut', [47, 39, 151, 121, 76, 78, 77, 80, 164, 64, 108, 34]],
  ['Transitif, pasif, kausatif', [84, 187, 70, 60, 61, 123, 126, 128, 122, 42, 44, 107, 38, 144]],
  ['Perasaan orang ketiga & kata bentukan', [45, 81, 2, 58, 59, 10, 11, 36, 19, 165]],
  ['Keigo', [32, 31, 30, 29, 138, 28, 50, 104]],
];

/** Tahap belajar per level, urut dari yang paling dasar. */
export const BUNPOU_LEARNING_STAGES = { N5, N4 } as const;

const rank = new Map<string, number>();
for (const [level, stages] of Object.entries(BUNPOU_LEARNING_STAGES)) {
  let i = 0;
  for (const [, numbers] of stages) {
    for (const n of numbers) rank.set(`bp_${level.toLowerCase()}_${String(n).padStart(3, '0')}`, i++);
  }
}

/** Posisi pola dalam urutan belajar levelnya; undefined = belum dikurasi (pakai urutan basis data). */
export function bunpouLearningRank(id: string): number | undefined {
  return rank.get(id);
}

/** Urutkan pola menurut urutan belajar; pola tanpa peringkat tetap di urutan asalnya, setelah yang berperingkat. */
export function sortBunpouForLearning<T extends { id: string }>(items: ReadonlyArray<T>): T[] {
  return items
    .map((item, index) => ({ item, index, r: rank.get(item.id) ?? Number.MAX_SAFE_INTEGER }))
    .sort((a, b) => a.r - b.r || a.index - b.index)
    .map(x => x.item);
}
