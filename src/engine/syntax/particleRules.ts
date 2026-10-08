// ==============================================================================
// JAPANESE LANGUAGE INTELLIGENCE ENGINE (J-LIE) — PARTICLE & SYNTAX RULES
// ==============================================================================

import { ParticleType } from '../types';

export interface ParticleRule {
  particle: ParticleType;
  description: string;
  usageContext: string;
  incompatibleWith?: string[];
  explanation: string;
}

export const PARTICLE_RULES: Record<ParticleType, ParticleRule> = {
  'は': {
    particle: 'は',
    description: 'Penanda Topik Utama (Topic Marker)',
    usageContext: 'Menandai subjek atau topik pembicaraan yang sudah diketahui oleh kedua belah pihak.',
    explanation: 'Partikel 「は」(dibaca "wa") digunakan untuk menetapkan topik utama ("Mengenai X...").',
  },
  'が': {
    particle: 'が',
    description: 'Penanda Subjek Spesifik / Objek Khusus (Subject & Ability Marker)',
    usageContext: 'Menandai subjek pelaku kejadian alami, atau objek dari kata sifat/potensial (〜たい, 〜ができる, 〜が好き, 〜が上手).',
    explanation: 'Partikel 「が」digunakan untuk subjek gramatikal, fenomena alam, atau objek kemampuan/kesukaan/keinginan.',
  },
  'を': {
    particle: 'を',
    description: 'Penanda Objek Langsung (Direct Object Marker)',
    usageContext: 'Menandai objek penderita yang menerima tindakan kata kerja transitif (他動詞).',
    explanation: 'Partikel 「を」(dibaca "o") hanya digunakan untuk objek langsung dari kata kerja aksi transitif.',
  },
  'に': {
    particle: 'に',
    description: 'Penanda Tujuan, Waktu Spesifik, atau Target Tindakan',
    usageContext: 'Menandai tujuan pergerakan (ke mana), waktu angka spesifik (jam/hari), atau penerima tindakan.',
    explanation: 'Partikel 「に」menunjukkan target arah pergerakan (行く・来る・帰る), titik waktu spesifik, atau orang tujuan.',
  },
  'で': {
    particle: 'で',
    description: 'Penanda Lokasi Aksi atau Sarana/Alat (Location of Action / Means)',
    usageContext: 'Menandai tempat terjadinya suatu kegiatan aktif, atau sarana/alat/kendaraan yang dipakai.',
    explanation: 'Partikel 「で」digunakan untuk tempat berlangsungnya aktivitas (di perpustakaan, di kamar) atau alat/sarana (naik bus, pakai sumpit).',
  },
  'へ': {
    particle: 'へ',
    description: 'Penanda Arah Pergerakan (Direction Marker)',
    usageContext: 'Menunjukkan arah pergerakan menuju suatu tempat (dibaca "e").',
    explanation: 'Partikel 「へ」menekankan arah pergerakan menuju ke suatu tempat.',
  },
  'と': {
    particle: 'と',
    description: 'Penanda Teman/Pendamping atau Kutipan (Together With / Quotation)',
    usageContext: 'Menandai orang yang diajak bersama ("bersama teman") atau kutipan pikiran/ucapan.',
    explanation: 'Partikel 「と」digunakan untuk arti "bersama/dan" atau penanda isi pikiran (〜と思う).',
  },
  'から': {
    particle: 'から',
    description: 'Penanda Titik Awal Waktu / Tempat (From / Since)',
    usageContext: 'Menunjukkan titik awal keberangkatan atau waktu mulai.',
    explanation: 'Partikel 「から」berarti "dari" tempat atau waktu.',
  },
  'まで': {
    particle: 'まで',
    description: 'Penanda Titik Akhir Waktu / Tempat (Until / To)',
    usageContext: 'Menunjukkan batas akhir tujuan atau batas waktu.',
    explanation: 'Partikel 「まで」berarti "sampai / hingga".',
  },
  'より': {
    particle: 'より',
    description: 'Penanda Komparasi / Perbandingan (Than)',
    usageContext: 'Menandai tolak ukur perbandingan ("dibandingkan dengan...").',
    explanation: 'Partikel 「より」digunakan dalam kalimat perbandingan (A lebih ... daripada B).',
  },
  'も': {
    particle: 'も',
    description: 'Penanda Kesamaan / Penekanan (Also / Too)',
    usageContext: 'Menggantikan は/が/を untuk menyatakan "juga".',
    explanation: 'Partikel 「も」digunakan untuk menyatakan "juga" atau "pun".',
  },
};

/**
 * Validates if the particle selected for a specific verb/object/location is pedagogically sound.
 */
export function validateParticlePairing(
  predicateWord: string,
  _targetWord: string,
  selectedParticle: ParticleType,
  expectedRole: 'object' | 'location' | 'target' | 'time'
): { isValid: boolean; errorReason?: string; correctParticle?: ParticleType } {
  // 1. Location checks: 'で' (active venue) vs 'に' (destination or presence)
  if (expectedRole === 'location') {
    const isMovementVerb = /^(行く|いく|来る|くる|帰る|かえる|向かう|むかう)$/.test(predicateWord);
    const isExistenceVerb = /^(いる|ある|住む|すむ|座る|すわる|泊まる|とまる)$/.test(predicateWord);

    if (isMovementVerb) {
      if (selectedParticle === 'に' || selectedParticle === 'へ') {
        return { isValid: true };
      }
      return {
        isValid: false,
        errorReason: `Kata kerja arah pergerakan (${predicateWord}) membutuhkan partikel tujuan 'に' atau 'へ', bukan '${selectedParticle}'.`,
        correctParticle: 'に',
      };
    }

    if (isExistenceVerb) {
      if (selectedParticle === 'に') {
        return { isValid: true };
      }
      return {
        isValid: false,
        errorReason: `Kata kerja keberadaan/tinggal (${predicateWord}) membutuhkan partikel 'に', bukan '${selectedParticle}'.`,
        correctParticle: 'に',
      };
    }

    // Default action at location uses 'で'
    if (selectedParticle === 'で') {
      return { isValid: true };
    }
    return {
      isValid: false,
      errorReason: `Tempat berlangsungnya aktivitas (${predicateWord}) membutuhkan partikel lokasi aksi 'で', bukan '${selectedParticle}'.`,
      correctParticle: 'で',
    };
  }

  // 2. Object checks: 'を' vs 'が'
  if (expectedRole === 'object') {
    // Verbs with tai form or potential often take 'が' or 'を'
    const takesGa = /^(好き|嫌い|上手|下手|できる|わかる|欲しい)$/.test(predicateWord) || predicateWord.endsWith('たい');

    if (takesGa && (selectedParticle === 'が' || selectedParticle === 'を')) {
      return { isValid: true };
    }

    if (selectedParticle === 'を') {
      return { isValid: true };
    }

    return {
      isValid: false,
      errorReason: `Objek penderita untuk tindakan ${predicateWord} membutuhkan partikel 'を' (atau 'が'), bukan '${selectedParticle}'.`,
      correctParticle: 'を',
    };
  }

  return { isValid: true };
}
