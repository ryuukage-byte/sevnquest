// ==============================================================================
// TEKS INDONESIA UNTUK PENCARIAN ARTI
// - tokenisasi kata utuh (bukan substring: "gosong" TIDAK cocok di "pengosongan")
// - stemmer ringan (imbuhan me-/pe-/ber-/ter-/di-/ke-/se- dan -kan/-an/-i/-nya)
//   sehingga "hangus" menemukan "Menghanguskan" dan "terbakar" menemukan "membakar"
// - sinonim / kata sehari-hari → kata yang dipakai di kamus ("gosong" → "hangus")
// ==============================================================================

const TOKEN_SPLIT = /[^a-z0-9]+/;

export function tokenizeLatin(s: string): string[] {
  return (s || '').normalize('NFKC').toLowerCase().split(TOKEN_SPLIT).filter(t => t.length > 0);
}

const MIN_ROOT = 3;
const PARTICLES = ['nya', 'lah', 'kah', 'pun'];
const SUFFIXES = ['kan', 'an', 'i'];
const VOWEL = /^[aiueo]/;

function stripPrefix(w: string, out: Set<string>) {
  const add = (r: string) => { if (r.length >= MIN_ROOT) out.add(r); };
  // Nasal meN-/peN- dengan peluluhan huruf awal (mem+pakai, men+tulis, meny+sapu, meng+kirim)
  for (const p of ['me', 'pe']) {
    if (!w.startsWith(p)) continue;
    const rest = w.slice(2);
    if (rest.startsWith('ng')) {
      const r = rest.slice(2);
      add(r);                              // meng+ambil, meng+hangus
      if (VOWEL.test(r)) add('k' + r);     // meng+kirim → ngirim → kirim
    } else if (rest.startsWith('ny')) {
      add('s' + rest.slice(2));            // meny+sapu
    } else if (rest.startsWith('m')) {
      const r = rest.slice(1);
      add(r);                              // mem+beli
      if (VOWEL.test(r)) add('p' + r);     // mem+pakai
    } else if (rest.startsWith('n')) {
      const r = rest.slice(1);
      add(r);                              // men+dengar
      if (VOWEL.test(r)) add('t' + r);     // men+tulis
    } else {
      add(rest);                           // me+lihat, pe+lari
    }
    if (p === 'pe' && rest.startsWith('r')) add(rest.slice(1)); // per+besar
  }
  // Bahasa lisan: ng-/ny- tanpa me- ("ngantuk", "nyapu", "ngobrol")
  if (w.startsWith('ng')) { const r = w.slice(2); add(r); if (VOWEL.test(r)) add('k' + r); }
  else if (w.startsWith('ny')) add('s' + w.slice(2));
  for (const p of ['ber', 'ter', 'di', 'ke', 'se', 'be']) {
    if (w.startsWith(p)) add(w.slice(p.length));
  }
  if (w.startsWith('bel') || w.startsWith('pel')) add(w.slice(3)); // bel+ajar, pel+ajar
}

const stemCache = new Map<string, string[]>();

/** Kandidat akar kata (termasuk kata itu sendiri). Hanya untuk kata Latin. */
export function indonesianStems(word: string): string[] {
  const w = word.toLowerCase();
  const cached = stemCache.get(w);
  if (cached) return cached;
  const out = new Set<string>([w]);
  if (w.length > 4 && /^[a-z]+$/.test(w)) {
    const bases = new Set<string>([w]);
    for (const p of PARTICLES) if (w.endsWith(p) && w.length - p.length >= MIN_ROOT) bases.add(w.slice(0, -p.length));
    for (const b of [...bases]) {
      for (const s of SUFFIXES) {
        if (b.endsWith(s) && b.length - s.length >= 4) bases.add(b.slice(0, -s.length));
      }
    }
    for (const b of bases) {
      out.add(b);
      const pre = new Set<string>();
      stripPrefix(b, pre);
      for (const r of pre) {
        out.add(r);
        // Konfiks ganda: mem+per+..., ke+ber+..., di+per+...
        const pre2 = new Set<string>();
        stripPrefix(r, pre2);
        for (const r2 of pre2) if (r2.length >= 4) out.add(r2);
      }
    }
  }
  const list = [...out];
  if (stemCache.size > 50000) stemCache.clear();
  stemCache.set(w, list);
  return list;
}

/** Stem bahasa Inggris sederhana untuk meaningEn ("burned" → "burn"). */
export function englishStems(word: string): string[] {
  const w = word.toLowerCase();
  const out = [w];
  if (w.length > 4) {
    if (w.endsWith('ing')) out.push(w.slice(0, -3));
    if (w.endsWith('ied')) out.push(w.slice(0, -3) + 'y');
    else if (w.endsWith('ed')) out.push(w.slice(0, -2), w.slice(0, -1));
    if (w.endsWith('ies')) out.push(w.slice(0, -3) + 'y');
    else if (w.endsWith('es')) out.push(w.slice(0, -2), w.slice(0, -1));
    else if (w.endsWith('s') && !w.endsWith('ss')) out.push(w.slice(0, -1));
  }
  return out;
}

// ------------------------------------------------------------------------------
// SINONIM: setiap baris satu kelompok makna. Kata pertama = bentuk yang umum di kamus.
// Kata sehari-hari / gaul / regional diarahkan ke kata kamus, dan sebaliknya.
// ------------------------------------------------------------------------------
const SYNONYM_GROUPS: string[][] = [
  ['hangus', 'gosong', 'terbakar', 'burn', 'scorch'],
  ['bakar', 'panggang', 'sangrai', 'burn', 'roast', 'grill'],
  ['makan', 'santap', 'eat'],
  ['minum', 'teguk', 'drink'],
  ['tidur', 'bobo', 'bobok', 'lelap', 'sleep'],
  ['bangun', 'terjaga', 'wake'],
  ['mengantuk', 'ngantuk', 'kantuk', 'sleepy', 'drowsy'],
  ['lapar', 'keroncongan', 'hungry'],
  ['haus', 'dahaga', 'thirsty'],
  ['capek', 'lelah', 'letih', 'penat', 'tired'],
  ['sakit', 'nyeri', 'perih', 'pain', 'sick', 'hurt'],
  ['pusing', 'pening', 'dizzy', 'headache'],
  ['senang', 'gembira', 'bahagia', 'happy', 'glad'],
  ['sedih', 'duka', 'murung', 'sad'],
  ['marah', 'kesal', 'jengkel', 'gusar', 'murka', 'angry'],
  ['takut', 'ngeri', 'gentar', 'afraid', 'scared'],
  ['malu', 'segan', 'embarrassed', 'shy'],
  ['bosan', 'jenuh', 'jemu', 'bored'],
  ['kaget', 'terkejut', 'surprised'],
  ['khawatir', 'cemas', 'gelisah', 'worry', 'anxious'],
  ['cantik', 'indah', 'elok', 'molek', 'beautiful', 'pretty'],
  ['tampan', 'ganteng', 'handsome'],
  ['jelek', 'buruk', 'ugly', 'bad'],
  ['bagus', 'baik', 'good'],
  ['besar', 'gede', 'raya', 'big', 'large'],
  ['kecil', 'mungil', 'cilik', 'small', 'little'],
  ['banyak', 'segudang', 'many', 'much'],
  ['sedikit', 'dikit', 'few', 'little'],
  ['cepat', 'lekas', 'kilat', 'ngebut', 'fast', 'quick'],
  ['lambat', 'pelan', 'lamban', 'slow'],
  ['mahal', 'expensive'],
  ['murah', 'cheap'],
  ['panas', 'gerah', 'hot'],
  ['dingin', 'sejuk', 'cold', 'cool'],
  ['hangat', 'warm'],
  ['basah', 'lembap', 'lembab', 'wet', 'damp'],
  ['kering', 'dry'],
  ['kotor', 'jorok', 'dekil', 'dirty'],
  ['bersih', 'clean'],
  ['kosong', 'hampa', 'empty'],
  ['penuh', 'sesak', 'full'],
  ['gelap', 'kelam', 'dark'],
  ['terang', 'cerah', 'bright'],
  ['pintar', 'pandai', 'cerdas', 'cerdik', 'clever', 'smart'],
  ['bodoh', 'dungu', 'tolol', 'goblok', 'stupid', 'foolish'],
  ['rajin', 'tekun', 'diligent'],
  ['malas', 'lazy'],
  ['berani', 'brave'],
  ['sombong', 'angkuh', 'congkak', 'arrogant'],
  ['ramah', 'friendly', 'kind'],
  ['pelit', 'kikir', 'stingy'],
  ['susah', 'sulit', 'sukar', 'difficult', 'hard'],
  ['mudah', 'gampang', 'easy'],
  ['benar', 'betul', 'correct', 'right'],
  ['salah', 'keliru', 'wrong', 'mistake'],
  ['rusak', 'hancur', 'broken', 'break'],
  ['baru', 'new'],
  ['lama', 'tua', 'kuno', 'old'],
  ['muda', 'young'],
  ['jauh', 'far'],
  ['dekat', 'near', 'close'],
  ['tinggi', 'jangkung', 'tall', 'high'],
  ['rendah', 'pendek', 'low', 'short'],
  ['berat', 'heavy'],
  ['ringan', 'light'],
  ['kuat', 'strong'],
  ['lemah', 'weak'],
  ['sibuk', 'repot', 'busy'],
  ['sepi', 'sunyi', 'lengang', 'quiet'],
  ['ramai', 'riuh', 'berisik', 'bising', 'noisy', 'crowded'],
  ['enak', 'lezat', 'sedap', 'nikmat', 'delicious', 'tasty'],
  ['manis', 'sweet'],
  ['asin', 'salty'],
  ['pahit', 'bitter'],
  ['asam', 'kecut', 'sour'],
  ['pedas', 'pedes', 'spicy'],
  ['busuk', 'basi', 'rotten'],
  ['bau', 'aroma', 'harum', 'wangi', 'smell'],
  ['pergi', 'berangkat', 'go', 'leave'],
  ['datang', 'tiba', 'sampai', 'come', 'arrive'],
  ['pulang', 'kembali', 'balik', 'return'],
  ['masuk', 'enter'],
  ['keluar', 'exit'],
  ['jalan', 'walk'],
  ['lari', 'kabur', 'run', 'flee'],
  ['lompat', 'loncat', 'jump'],
  ['jatuh', 'terjatuh', 'fall'],
  ['duduk', 'sit'],
  ['berdiri', 'stand'],
  ['lihat', 'tengok', 'pandang', 'tonton', 'see', 'look', 'watch'],
  ['dengar', 'hear', 'listen'],
  ['bicara', 'omong', 'cakap', 'ngobrol', 'speak', 'talk'],
  ['kata', 'bilang', 'ucap', 'say'],
  ['tanya', 'ask'],
  ['jawab', 'answer', 'reply'],
  ['ajar', 'belajar', 'study', 'learn', 'teach'],
  ['tahu', 'kenal', 'know'],
  ['lupa', 'forget'],
  ['ingat', 'remember'],
  ['pikir', 'kira', 'think'],
  ['ingin', 'mau', 'hendak', 'pengin', 'pingin', 'kepengin', 'want'],
  ['suka', 'gemar', 'senang', 'like'],
  ['cinta', 'sayang', 'kasih', 'love'],
  ['benci', 'hate'],
  ['beli', 'borong', 'buy'],
  ['jual', 'sell'],
  ['bayar', 'lunas', 'pay'],
  ['uang', 'duit', 'fulus', 'money'],
  ['kerja', 'pekerjaan', 'work', 'job'],
  ['main', 'play'],
  ['tulis', 'write'],
  ['baca', 'read'],
  ['buka', 'open'],
  ['tutup', 'close', 'shut'],
  ['ambil', 'take'],
  ['beri', 'kasih', 'give'],
  ['terima', 'receive'],
  ['pinjam', 'borrow', 'lend'],
  ['cari', 'search', 'seek', 'look'],
  ['temu', 'jumpa', 'find', 'meet'],
  ['tunggu', 'nanti', 'wait'],
  ['bantu', 'tolong', 'help'],
  ['cuci', 'basuh', 'wash'],
  ['masak', 'cook'],
  ['potong', 'iris', 'cut'],
  ['pakai', 'kenakan', 'wear', 'use'],
  ['buang', 'throw'],
  ['bersihkan', 'sapu', 'clean'],
  ['hidup', 'live', 'alive'],
  ['mati', 'meninggal', 'wafat', 'tewas', 'die', 'dead'],
  ['lahir', 'born'],
  ['menang', 'win'],
  ['kalah', 'lose'],
  ['nangis', 'tangis', 'menangis', 'cry'],
  ['tertawa', 'tawa', 'ketawa', 'laugh'],
  ['senyum', 'smile'],
  ['marahi', 'omeli', 'scold'],
  ['bohong', 'dusta', 'lie'],
  ['mencuri', 'curi', 'maling', 'steal'],
  ['anak', 'bocah', 'child', 'kid'],
  ['ayah', 'bapak', 'papa', 'father'],
  ['ibu', 'mama', 'bunda', 'mother'],
  ['kakak', 'abang', 'older'],
  ['adik', 'younger'],
  ['suami', 'husband'],
  ['istri', 'wife'],
  ['teman', 'kawan', 'sahabat', 'friend'],
  ['orang', 'manusia', 'person', 'people'],
  ['rumah', 'house', 'home'],
  ['kamar', 'ruang', 'room'],
  ['sekolah', 'school'],
  ['kantor', 'office'],
  ['toko', 'warung', 'kedai', 'shop', 'store'],
  ['jalan', 'jalanan', 'road', 'street'],
  ['mobil', 'car'],
  ['sepeda', 'bicycle'],
  ['kereta', 'train'],
  ['pesawat', 'airplane'],
  ['dokter', 'doctor'],
  ['obat', 'medicine'],
  ['nasi', 'rice'],
  ['air', 'water'],
  ['api', 'fire'],
  ['hujan', 'rain'],
  ['angin', 'wind'],
  ['langit', 'sky'],
  ['matahari', 'sun'],
  ['bulan', 'moon', 'month'],
  ['bintang', 'star'],
  ['gunung', 'mountain'],
  ['laut', 'sea', 'ocean'],
  ['sungai', 'river'],
  ['pohon', 'tree'],
  ['bunga', 'kembang', 'flower'],
  ['anjing', 'dog'],
  ['kucing', 'cat'],
  ['burung', 'bird'],
  ['ikan', 'fish'],
  ['baju', 'pakaian', 'busana', 'clothes'],
  ['sepatu', 'shoes'],
  ['buku', 'book'],
  ['kaca', 'cermin', 'glass', 'mirror'],
  ['pagi', 'morning'],
  ['siang', 'noon', 'daytime'],
  ['malam', 'night', 'evening'],
  ['hari', 'day'],
  ['minggu', 'pekan', 'week'],
  ['tahun', 'year'],
  ['waktu', 'masa', 'saat', 'time'],
  ['sekarang', 'kini', 'now'],
  ['dulu', 'dahulu', 'before', 'past'],
  ['besok', 'esok', 'tomorrow'],
  ['kemarin', 'yesterday'],
  ['selalu', 'senantiasa', 'always'],
  ['kadang', 'terkadang', 'sometimes'],
  ['sering', 'kerap', 'often'],
  ['jarang', 'seldom', 'rarely'],
  ['sangat', 'amat', 'sekali', 'banget', 'very'],
  ['semua', 'segala', 'seluruh', 'all'],
  ['tidak', 'tak', 'nggak', 'gak', 'enggak', 'bukan', 'not', 'no'],
  ['ya', 'iya', 'yes'],
  ['kenapa', 'mengapa', 'why'],
  ['bagaimana', 'gimana', 'how'],
  ['apa', 'what'],
  ['siapa', 'who'],
  ['dimana', 'mana', 'where'],
  ['kapan', 'when'],
  ['bisa', 'dapat', 'mampu', 'sanggup', 'can', 'able'],
  ['harus', 'wajib', 'mesti', 'must'],
  ['mungkin', 'barangkali', 'maybe', 'perhaps'],
  ['hampir', 'nyaris', 'almost'],
  ['sudah', 'telah', 'udah', 'already'],
  ['belum', 'yet'],
  ['juga', 'pula', 'also'],
  ['tetapi', 'tapi', 'namun', 'but'],
  ['karena', 'sebab', 'soalnya', 'because'],
  ['jika', 'kalau', 'bila', 'apabila', 'if'],
  ['seperti', 'bagai', 'bagaikan', 'like'],
  ['bertengkar', 'berkelahi', 'ribut', 'quarrel', 'fight'],
  ['nikah', 'kawin', 'menikah', 'marry', 'marriage'],
  ['cerai', 'divorce'],
  ['libur', 'cuti', 'holiday', 'vacation'],
  ['jalan-jalan', 'wisata', 'pelesir', 'travel', 'trip'],
  ['foto', 'gambar', 'photo', 'picture'],
  ['lagu', 'nyanyian', 'song'],
  ['nyanyi', 'menyanyi', 'sing'],
  ['tari', 'joget', 'dansa', 'dance'],
  ['gempa', 'earthquake'],
  ['banjir', 'flood'],
  ['kebakaran', 'fire'],
  ['luka', 'cedera', 'injury', 'wound'],
  ['demam', 'meriang', 'fever'],
  ['batuk', 'cough'],
  ['pilek', 'flu', 'selesma', 'cold'],
  ['muntah', 'vomit'],
  ['gatal', 'itch'],
  ['bengkak', 'swell'],
  ['mandi', 'bathe', 'bath'],
  ['toilet', 'wc', 'kakus', 'jamban', 'kamar kecil', 'restroom'],
  ['ompol', 'mengompol', 'ngompol'],
  ['kursi', 'bangku', 'chair'],
  ['meja', 'table', 'desk'],
  ['tempat tidur', 'kasur', 'ranjang', 'bed'],
];

let synonymIndex: Map<string, string[]> | null = null;

/** Kata lain yang semakna (tanpa kata itu sendiri). */
export function synonymsOf(word: string): string[] {
  if (!synonymIndex) {
    synonymIndex = new Map();
    for (const group of SYNONYM_GROUPS) {
      for (const w of group) {
        const list = synonymIndex.get(w) || [];
        for (const other of group) if (other !== w && !list.includes(other)) list.push(other);
        synonymIndex.set(w, list);
      }
    }
  }
  const w = word.toLowerCase();
  const direct = synonymIndex.get(w);
  if (direct) return direct;
  // Kata berimbuhan ("kegosongan", "menggosongkan") → coba akarnya.
  const out: string[] = [];
  for (const s of indonesianStems(w)) {
    for (const syn of synonymIndex.get(s) || []) if (!out.includes(syn)) out.push(syn);
  }
  return out;
}
