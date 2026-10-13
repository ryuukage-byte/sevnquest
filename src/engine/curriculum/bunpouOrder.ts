// ==============================================================================
// URUTAN BELAJAR BUNPOU (kurasi)
// Basis data bunpou N5/N4/N2/N1 tersusun menurut abjad (あげる, い形容詞＋名詞, 一番 …), bukan urutan belajar.
// Di sini pola dikelompokkan per tahap.
//  - N5/N4: tiap tahap hanya memakai bentuk yang sudah diajarkan tahap sebelumnya
//    (kopula → partikel → kata kerja → kata sifat → bentuk て → bentuk ない → …).
//  - N2/N1: pola tidak lagi saling bergantung, jadi tahapnya per FUNGSI (waktu, sebab, pertentangan, …) supaya
//    pola yang mirip dipelajari berdekatan dan bisa dibandingkan; dari yang sering dipakai ke yang sastra/langka.
// Angka = nomor urut pada ID (bp_n5_036 -> 36). Dijaga oleh bunpouOrder.test.ts: setiap pola harus muncul tepat
// satu kali. Pola baru yang belum didaftarkan otomatis ditaruh di akhir levelnya.
// N3 (w1d1g1 …) sudah berurutan minggu/hari seperti buku ajar.
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

const N2: readonly Stage[] = [
  ['Kata keterangan', [4, 7, 8, 9, 10, 11, 12, 18, 19, 53, 57, 60, 72, 73, 113, 192, 198, 202, 182, 103, 104, 172, 181, 125, 126, 122, 123, 128]],
  ['Penghubung wacana', [21, 51, 62, 23, 50, 54, 63, 64, 65, 61, 76, 118, 195, 39, 13, 47, 191]],
  ['Negasi penegas & takaran', [75, 201, 124, 110, 77, 40, 55, 5, 166, 69, 70]],
  ['Waktu & urutan kejadian', [81, 3, 71, 2, 24, 29, 108, 28, 119, 78, 79, 130, 142, 143, 203, 204]],
  ['Sebab & alasan', [59, 186, 187, 44, 66, 67, 68, 151, 6, 14, 36, 94]],
  ['Sudut pandang & dasar penilaian', [33, 34, 37, 144, 111, 56, 163, 97, 109, 136, 208, 150, 169, 207, 133, 156, 141]],
  ['Kesesuaian, cakupan, pengecualian', [131, 52, 154, 152, 158, 27, 134, 135, 164, 206, 160, 205, 132, 153]],
  ['Penambahan & pencontohan', [139, 167, 171, 175, 174, 127, 179, 102, 193, 105, 98, 177]],
  ['Pertentangan & konsesi', [157, 190, 35, 41, 176, 112, 114, 148, 145, 146, 183, 45]],
  ['Pengandaian', [115, 189, 89, 80, 196, 82, 86, 95, 90]],
  ['Dugaan & kemungkinan', [20, 30, 31, 15, 16, 43, 137, 149, 106, 165, 178, 194, 32, 42, 185]],
  ['Keharusan, larangan, tak terelakkan', [49, 117, 116, 199, 200, 162, 93, 188, 91, 92, 107, 58, 120]],
  ['Perasaan & penilaian', [84, 88, 26, 38, 138, 87, 168, 170, 25, 129, 140, 184, 22, 180, 161]],
  ['Penegasan & negasi sebagian', [96, 99, 100, 101, 46, 121, 83, 147, 155]],
  ['Ragam formal, klasik, permintaan', [48, 159, 74, 85, 17, 173, 197, 1]],
];

const N1: readonly Stage[] = [
  ['Kata keterangan', [1, 2, 4, 5, 7, 8, 15, 23, 43, 50, 51, 115, 116, 122, 139, 221, 233, 136, 6, 158, 31, 246]],
  ['Penghubung wacana', [11, 52, 127, 128, 224, 237, 109, 53, 242, 201, 204]],
  ['Waktu: seketika & kesempatan', [27, 234, 154, 65, 133, 132, 74, 88, 108, 16, 251, 253, 254, 256, 258, 260, 261, 173, 12]],
  ['Dua tindakan sekaligus', [21, 22, 24, 252, 146, 137, 82]],
  ['Sebab & keadaan', [103, 104, 45, 46, 49, 200, 3, 102, 118, 247, 170, 172]],
  ['Dasar, acuan, sudut pandang', [178, 184, 182, 259, 257, 9, 10, 193, 167, 168, 166, 176, 161, 175, 190, 125, 120]],
  ['Contoh, daftar, cakupan', [105, 114, 85, 155, 72, 236, 245, 30, 96, 106, 112, 134, 197, 165, 38, 149]],
  ['Penekanan & batas ekstrem', [62, 71, 79, 156, 199, 223, 183, 169, 192, 162, 163, 164, 29, 107, 37, 68, 248, 152, 32]],
  ['Pertentangan & konsesi', [110, 123, 174, 70, 86, 240, 238, 239, 58, 142, 39, 40, 41, 25, 119, 232, 81, 73, 76, 150]],
  ['Perbandingan & kontras', [189, 129, 131, 151, 153, 36, 213, 226, 17, 13, 157]],
  ['Pengandaian & akibat', [243, 78, 203, 77, 147, 47, 148, 225, 48, 18, 124, 138]],
  ['Tujuan, kehendak, anggapan', [210, 266, 95, 143, 144, 69, 67, 230, 231, 227, 228, 229]],
  ['Kemungkinan & ketidakmungkinan', [26, 141, 140, 145, 111, 92, 212, 159, 241, 61, 235, 99, 171, 188, 33, 211]],
  ['Keharusan, kepantasan, larangan', [89, 209, 217, 80, 135, 121, 59, 60, 94, 90, 263, 264, 185, 186, 219, 215, 218, 97, 98]],
  ['Perasaan & penilaian kuat', [20, 35, 194, 195, 44, 113, 196, 101, 255, 87, 177, 91, 126, 191, 198, 14, 34, 100, 93]],
  ['Hasil & kegagalan', [54, 205, 57, 19, 75, 64, 66, 83, 216, 214, 160]],
  ['Sikap terhadap rintangan', [262, 265, 250, 249, 202, 130, 267, 117]],
  ['Kelayakan', [181, 180, 179, 187]],
  ['Akhiran pembentuk kata', [28, 55, 222, 206, 208, 207, 56, 220, 42]],
  ['Partikel akhir kalimat & ragam lisan', [63, 244, 84]],
];

/** Tahap belajar per level, urut dari yang paling dasar. */
export const BUNPOU_LEARNING_STAGES = { N5, N4, N2, N1 } as const;

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
