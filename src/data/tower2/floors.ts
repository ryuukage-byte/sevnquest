// ==============================================================================
// MENARA 2 — MENARA RANGKAI (LANTAI 017–100)
// Menara 1 mengajarkan MELIHAT bahasa Jepang. Menara 2 mengajarkan MEMAKAINYA:
// kosakata, kanji, perubahan bentuk, dan pola kalimat, dari N5 sampai gerbang N3.
//
// Satu rantai linear: tiap lantai butuh lantai sebelumnya (hard), dan setiap
// kelipatan sepuluh adalah Penjaga (ujian campuran dari 9 lantai sebelumnya).
// Rencana lantai (urutan arc) ditulis eksplisit di PLAN supaya pedagogi mudah diaudit.
// Isi Room dibangun dari database (kotoba/kanji/bunpou/konjugasi) di rooms.ts,
// dimuat malas karena besar.
// ==============================================================================

import { FloorCapability, FloorDomain, FloorSpec, RoomSkill } from '../../engine/tower1/types';

export type Tower2Arc = 'kotoba5' | 'kanji5' | 'pola5' | 'konj' | 'kotoba4' | 'kanji4' | 'pola4' | 'lanjut' | 'boss';

export interface Tower2Plan {
  floor: number;
  arc: Tower2Arc;
  /** Urutan ke-n dalam arc-nya (mulai 1). */
  nth: number;
}

/** Urutan arc untuk lantai 17..100. Lihat docs/TOWER2_ARCHITECTURE.md. */
const SEQUENCE: Tower2Arc[] = [
  // 17-29
  'kotoba5', 'kotoba5', 'kotoba5', 'boss', 'konj', 'kotoba5', 'konj', 'pola5', 'kotoba5', 'kanji5', 'pola5', 'konj', 'kotoba5',
  // 30-39
  'boss', 'konj', 'pola5', 'kanji5', 'kotoba5', 'pola5', 'konj', 'kanji5', 'kotoba5', 'pola5',
  // 40-49
  'boss', 'konj', 'kanji5', 'pola5', 'kotoba5', 'konj', 'kanji5', 'pola5', 'kotoba5', 'konj',
  // 50-59
  'boss', 'kanji5', 'pola5', 'kotoba5', 'konj', 'kanji5', 'pola5', 'kotoba5', 'kanji5', 'pola5',
  // 60-69
  'boss', 'kotoba4', 'pola4', 'kanji4', 'lanjut', 'kotoba4', 'pola4', 'kanji4', 'pola4', 'kotoba4',
  // 70-79
  'boss', 'pola4', 'kanji4', 'kotoba4', 'pola4', 'lanjut', 'kanji4', 'pola4', 'kotoba4', 'pola4',
  // 80-89
  'boss', 'kanji4', 'pola4', 'kotoba4', 'lanjut', 'pola4', 'kanji4', 'kotoba4', 'pola4', 'pola4',
  // 90-100
  'boss', 'kanji4', 'pola4', 'kotoba4', 'lanjut', 'pola4', 'kotoba4', 'pola4', 'lanjut', 'lanjut', 'boss'
];

export const TOWER2_FIRST_FLOOR = 17;
export const TOWER2_LAST_FLOOR = 100;

export const TOWER2_PLAN: Tower2Plan[] = (() => {
  const counts: Record<string, number> = {};
  return SEQUENCE.map((arc, i) => {
    counts[arc] = (counts[arc] ?? 0) + 1;
    return { floor: TOWER2_FIRST_FLOOR + i, arc, nth: counts[arc] };
  });
})();

export const TOWER2_PLAN_MAP: Record<number, Tower2Plan> = Object.fromEntries(TOWER2_PLAN.map(p => [p.floor, p]));

/** Jumlah item per lantai untuk arc yang membagi daftar tetap. */
export const KANJI5_PER_FLOOR = 10;
export const POLA5_SIZES = [12, 12, 12, 12, 12, 12, 12, 12, 12, 11];
export const POLA4_SIZES = [14, 14, 14, 14, 14, 14, 14, 13, 13, 13, 13, 13, 13, 13];
export const KANJI4_SIZES = [24, 24, 24, 24, 24, 24, 23];
export const KOTOBA_PER_FLOOR = 24;

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV'];

export const KONJ_TITLES = [
  'Tiga Golongan Kata Kerja',
  'Bentuk Sopan ます',
  'Bentuk て I (Golongan 1)',
  'Bentuk て II (Golongan 2 & 3)',
  'Bentuk Lampau た',
  'Bentuk Negatif ない',
  'Kata Sifat-i Berubah Bentuk',
  'Kata Sifat-na & Benda Berubah Bentuk',
  'Rangkaian ます Lengkap'
];
export const KONJ_SUBTITLES = [
  'Godan, ichidan, dan dua pengecualian',
  'Kamus → ます',
  'う・つ・る → って, む・ぶ・ぬ → んで ...',
  'Ichidan, する, 来る, dan campuran',
  'Kamus → た',
  'Kamus → ない',
  'おおきい → おおきくない / おおきかった',
  'しずか → しずかじゃない / しずかだった',
  'ます・ません・ました・ませんでした'
];
export const LANJUT_TITLES = [
  'Bentuk Potensial (bisa)',
  'Ajakan & Keinginan (よう・たい)',
  'Pengandaian (ば・たら)',
  'Bentuk Pasif',
  'Bentuk Kausatif',
  'Perintah & Kausatif-Pasif'
];
export const LANJUT_SUBTITLES = [
  'Kamus → bisa melakukan',
  'Kamus → よう / たい',
  'Kamus → ば / たら',
  'Kamus → dikenai tindakan',
  'Kamus → menyuruh / mengizinkan',
  'Bentuk perintah dan terpaksa melakukan'
];
const BOSS_NAMES: Record<number, [string, string]> = {
  20: ['Penjaga Lantai 20', 'Ujian campuran: kosakata & kata kerja'],
  30: ['Penjaga Lantai 30', 'Ujian campuran: kata, て-form, kanji'],
  40: ['Penjaga Lantai 40', 'Ujian campuran: bentuk kata & pola'],
  50: ['Penjaga Lantai 50', 'Ujian campuran: kata sifat & kanji'],
  60: ['Penjaga Lantai 60', 'Penutup N5: semua yang sudah dipelajari'],
  70: ['Penjaga Lantai 70', 'Ujian campuran: N4 tahap awal'],
  80: ['Penjaga Lantai 80', 'Ujian campuran: kanji & pola N4'],
  90: ['Penjaga Lantai 90', 'Ujian campuran: bentuk lanjut'],
  100: ['Puncak Seratus', 'Ujian akhir Menara Rangkai']
};

const pad = (n: number) => String(n).padStart(3, '0');

interface ArcMeta {
  domain: FloorDomain;
  skills: RoomSkill[];
  name: (p: Tower2Plan) => string;
  subtitle: (p: Tower2Plan) => string;
  capability: (p: Tower2Plan) => FloorCapability;
  reward: (floor: number) => { exp: number; gold: number };
}

const baseReward = (floor: number, boss = false) => {
  const exp = Math.round((100 + floor * 2) * (boss ? 2.5 : 1));
  return { exp, gold: Math.round(exp / 2) };
};

const META: Record<Tower2Arc, ArcMeta> = {
  kotoba5: {
    domain: 'kotoba',
    skills: ['kata', 'bunyi', 'kalimat', 'menulis'],
    name: p => `Kosakata Inti ${ROMAN[p.nth - 1]}`,
    subtitle: () => `${KOTOBA_PER_FLOOR} kata JLPT N5 dengan furigana`,
    capability: () => ({
      see: '24 kata JLPT N5 lengkap dengan arti, bacaan, dan contoh kalimat.',
      do: 'Mengenali kata dari tulisan dan suara, memilih kata untuk sebuah arti, mengisi kalimat rumpang, dan menyusun bacaan kata.',
      change: 'Kosakata aktifmu bertambah; kata-kata ini bisa dipakai membangun kalimat di lantai berikutnya.',
      signal: 'Mengenali arti dan kata yang tepat pada ujian lantai (≥ 80%).',
      misconception: 'Menghafal arti tanpa bacaan: kata baru dianggap dikuasai bila bacaan dan arti dikenali sekaligus.'
    }),
    reward: f => baseReward(f)
  },
  kanji5: {
    domain: 'kanji',
    skills: ['tulisan', 'kata', 'bunyi', 'menulis'],
    name: p => `Kanji N5 ${ROMAN[p.nth - 1]}`,
    subtitle: () => `${KANJI5_PER_FLOOR} kanji dasar dan kata yang memakainya`,
    capability: () => ({
      see: '10 kanji JLPT N5 dengan arti, bacaan on/kun, dan kata nyata yang memakainya.',
      do: 'Mengenali arti kanji, memilih kanji untuk sebuah arti, dan membaca kata berkanji.',
      change: 'Kanji tidak lagi dibaca sebagai gambar: kamu mengaitkannya dengan arti dan bacaan.',
      signal: 'Mengenali arti dan bacaan kanji pada ujian lantai (≥ 80%).',
      misconception: 'Menghafal kanji sendiri-sendiri: kata berkanji lebih mudah diingat sebagai satu kesatuan.'
    }),
    reward: f => baseReward(f)
  },
  pola5: {
    domain: 'pola',
    skills: ['pola', 'kalimat'],
    name: p => `Pola Kalimat N5 ${ROMAN[p.nth - 1]}`,
    subtitle: p => `${POLA5_SIZES[p.nth - 1]} pola tata bahasa N5`,
    capability: p => ({
      see: `${POLA5_SIZES[p.nth - 1]} pola tata bahasa N5 dengan rumus, arti, dan contoh.`,
      do: 'Mengenali arti dan fungsi pola, serta memilih pola yang tepat untuk melengkapi kalimat.',
      change: 'Pola dikenali dari rumusnya, bukan dihafal sebagai terjemahan satu per satu.',
      signal: 'Memilih arti dan pola yang tepat pada ujian lantai (≥ 75%).',
      misconception: 'Menerjemahkan pola kata per kata; pola adalah satu satuan makna.'
    }),
    reward: f => baseReward(f)
  },
  konj: {
    domain: 'konjugasi',
    skills: ['pola', 'menulis', 'kata'],
    name: p => KONJ_TITLES[p.nth - 1],
    subtitle: p => KONJ_SUBTITLES[p.nth - 1],
    capability: p => ({
      see: `Aturan ${KONJ_TITLES[p.nth - 1].toLowerCase()} beserta contoh dari kata kerja/kata sifat nyata.`,
      do: 'Mengubah kata ke bentuk yang diminta, memilih bentuk yang benar di antara bentuk salah golongan, dan menyusun bentuk dari ubin kana.',
      change: 'Perubahan bentuk dikerjakan dengan aturan, bukan dengan menebak bunyi.',
      signal: 'Memilih bentuk yang benar pada kata baru (≥ 80%).',
      misconception: 'Menerapkan aturan golongan 2 pada kata golongan 1 (misal 帰る → かえって, bukan かえて).'
    }),
    reward: f => baseReward(f)
  },
  kotoba4: {
    domain: 'kotoba',
    skills: ['kata', 'bunyi', 'kalimat', 'menulis'],
    name: p => `Kosakata Lanjutan ${ROMAN[p.nth - 1]}`,
    subtitle: () => `${KOTOBA_PER_FLOOR} kata JLPT N4 dengan furigana`,
    capability: () => ({
      see: '24 kata JLPT N4 lengkap dengan arti, bacaan, dan contoh kalimat.',
      do: 'Mengenali kata dari tulisan dan suara, memilih kata untuk sebuah arti, mengisi kalimat rumpang, dan menyusun bacaan kata.',
      change: 'Kosakata menengahmu bertambah dan mulai cukup untuk membaca teks sederhana.',
      signal: 'Mengenali arti dan kata yang tepat pada ujian lantai (≥ 80%).',
      misconception: 'Mengira kata N4 hanya variasi N5; banyak yang memakai kanji lebih rumit dan arti lebih halus.'
    }),
    reward: f => baseReward(f)
  },
  kanji4: {
    domain: 'kanji',
    skills: ['tulisan', 'kata', 'bunyi', 'menulis'],
    name: p => `Kanji N4 ${ROMAN[p.nth - 1]}`,
    subtitle: p => `${KANJI4_SIZES[p.nth - 1]} kanji N4 dan kata yang memakainya`,
    capability: p => ({
      see: `${KANJI4_SIZES[p.nth - 1]} kanji JLPT N4 dengan arti, bacaan on/kun, dan kata nyata.`,
      do: 'Mengenali arti kanji, memilih kanji untuk sebuah arti, dan membaca kata berkanji.',
      change: 'Teks berkanji N4 mulai terbaca tanpa furigana.',
      signal: 'Mengenali arti dan bacaan kanji pada ujian lantai (≥ 80%).',
      misconception: 'Mengira satu kanji = satu bacaan: bacaannya berubah menurut kata.'
    }),
    reward: f => baseReward(f)
  },
  pola4: {
    domain: 'pola',
    skills: ['pola', 'kalimat'],
    name: p => `Pola Kalimat N4 ${ROMAN[p.nth - 1]}`,
    subtitle: p => `${POLA4_SIZES[p.nth - 1]} pola tata bahasa N4`,
    capability: p => ({
      see: `${POLA4_SIZES[p.nth - 1]} pola tata bahasa N4 dengan rumus, arti, dan contoh.`,
      do: 'Mengenali arti dan fungsi pola, serta memilih pola yang tepat untuk melengkapi kalimat.',
      change: 'Pola N4 dibaca sebagai satu satuan makna; kalimat panjang mulai terurai.',
      signal: 'Memilih arti dan pola yang tepat pada ujian lantai (≥ 75%).',
      misconception: 'Mengira pola yang mirip bermakna sama; bedanya sering pada nuansa dan konteks.'
    }),
    reward: f => baseReward(f)
  },
  lanjut: {
    domain: 'konjugasi',
    skills: ['pola', 'menulis', 'kata'],
    name: p => LANJUT_TITLES[p.nth - 1],
    subtitle: p => LANJUT_SUBTITLES[p.nth - 1],
    capability: p => ({
      see: `Aturan ${LANJUT_TITLES[p.nth - 1].toLowerCase()} dengan kata kerja N4.`,
      do: 'Mengubah kata kerja ke bentuk yang diminta dan memilih bentuk yang benar di antara pengecoh salah golongan atau salah bentuk.',
      change: 'Bentuk lanjutan dibentuk dari aturan yang sama dengan bentuk dasar, bukan dihafal satu per satu.',
      signal: 'Memilih bentuk yang benar pada kata baru (≥ 80%).',
      misconception: 'Mencampur bentuk pasif, potensial, dan kausatif: ketiganya berakhir られる/させる pada golongan 2.'
    }),
    reward: f => baseReward(f)
  },
  boss: {
    domain: 'ujian',
    skills: ['kata', 'pola', 'kalimat'],
    name: p => BOSS_NAMES[p.floor][0],
    subtitle: p => BOSS_NAMES[p.floor][1],
    capability: p => ({
      see: p.floor === 100 ? 'Soal dari seluruh arc Menara 2: kosakata, kanji, bentuk kata, dan pola.' : 'Soal campuran dari sembilan lantai sebelumnya.',
      do: 'Menjawab ulang materi yang sudah dipelajari dalam urutan acak; ujian bisa diulang dengan soal baru.',
      change: 'Pengetahuan berpindah dari "baru dikenal" menjadi "bisa dipanggil kembali".',
      signal: 'Benar ≥ 75% pada ujian campuran.',
      misconception: 'Mengira ujian ini menilai hafalan jawaban: soal diacak dan boleh diulang, yang diuji adalah ingatan.'
    }),
    reward: f => baseReward(f, true)
  }
};

export const TOWER2_FLOORS: FloorSpec[] = TOWER2_PLAN.map(p => {
  const meta = META[p.arc];
  return {
    id: p.floor,
    code: pad(p.floor),
    name: meta.name(p),
    subtitle: meta.subtitle(p),
    status: 'ready',
    domain: meta.domain,
    col: 1.5,
    hard: [p.floor - 1],
    soft: [],
    bigIdeas: [],
    capability: meta.capability(p),
    reward: meta.reward(p.floor),
    tower: 2,
    skills: meta.skills
  };
});

export const TOWER2_FLOOR_MAP: Record<number, FloorSpec> = Object.fromEntries(TOWER2_FLOORS.map(f => [f.id, f]));
