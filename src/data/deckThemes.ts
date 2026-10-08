/**
 * Tema deck siap pakai untuk pembuat deck. Kata kunci dicocokkan oleh engine pencarian universal
 * terhadap arti (Indonesia/Inggris) materi yang SUDAH ada, jadi deck selalu berisi Kotoba/Kanji/Bunpou asli.
 * Tema bertag (mis. Kaigo) mengambil materi berdasarkan tag di database.
 */
export interface DeckTheme {
  id: string;
  label: string;
  title: string;
  description: string;
  coverIcon: string;
  /** Kata kunci pencarian (arti Indonesia & Inggris). */
  keywords: string[];
  /** Tag database; bila ada, materi bertag ini jadi kandidat utama. */
  tag?: string;
}

export const DECK_THEMES: DeckTheme[] = [
  {
    id: 'kuliner', label: 'Kuliner', title: 'Kuliner & Restoran', coverIcon: '🍱',
    description: 'Kosakata makan, minum, memasak, dan memesan di restoran.',
    keywords: ['makan', 'minum', 'masak', 'restoran', 'makanan', 'minuman', 'dapur', 'menu', 'pesan', 'food', 'drink', 'cook', 'restaurant', 'meal'],
  },
  {
    id: 'konbini', label: 'Konbini', title: 'Konbini & Belanja', coverIcon: '🛒',
    description: 'Kosakata belanja, harga, dan transaksi di toko.',
    keywords: ['toko', 'belanja', 'membeli', 'harga', 'uang', 'kasir', 'barang', 'jual', 'shop', 'buy', 'price', 'money', 'store'],
  },
  {
    id: 'kerja', label: 'Kerja', title: 'Kerja & Kantor', coverIcon: '💼',
    description: 'Istilah kantor, rapat, dan percakapan antar rekan kerja.',
    keywords: ['kerja', 'kantor', 'perusahaan', 'rapat', 'gaji', 'bos', 'pekerjaan', 'karyawan', 'bisnis', 'work', 'company', 'office', 'meeting'],
  },
  {
    id: 'medis', label: 'Medis', title: 'Rumah Sakit & Medis', coverIcon: '🏥',
    description: 'Bagian tubuh, gejala penyakit, dan konsultasi ke dokter.',
    keywords: ['sakit', 'dokter', 'rumah sakit', 'obat', 'tubuh', 'demam', 'kepala', 'luka', 'penyakit', 'hospital', 'medicine', 'fever', 'pain'],
  },
  {
    id: 'musim', label: 'Musim', title: 'Musim & Cuaca', coverIcon: '🌸',
    description: 'Empat musim, fenomena alam, dan prakiraan cuaca.',
    keywords: ['musim', 'cuaca', 'hujan', 'salju', 'panas', 'dingin', 'angin', 'bunga', 'season', 'weather', 'rain', 'snow'],
  },
  {
    id: 'wisata', label: 'Wisata', title: 'Bandara & Wisata', coverIcon: '✈️',
    description: 'Liburan, hotel, stasiun, dan transportasi.',
    keywords: ['hotel', 'bandara', 'stasiun', 'kereta', 'tiket', 'peta', 'liburan', 'wisata', 'pesawat', 'travel', 'airport', 'station', 'train', 'ticket'],
  },
  {
    id: 'rpg', label: 'Game RPG', title: 'Petualangan RPG', coverIcon: '⚔️',
    description: 'Istilah petualangan, kekuatan, dan pertempuran.',
    keywords: ['pedang', 'pahlawan', 'pertempuran', 'monster', 'raja', 'kekuatan', 'perang', 'sword', 'magic', 'battle', 'hero'],
  },
  {
    id: 'kaigo', label: 'Kaigo', title: 'Perawat (Kaigo)', coverIcon: '🩺',
    description: 'Komunikasi dengan lansia dan pelayanan panti jompo.',
    keywords: ['lansia', 'perawat', 'pasien', 'bantu', 'kaigo'],
    tag: 'Kaigo',
  },
];
