import { Mission } from '../../types/rpg';

export const INITIAL_DAILY_MISSIONS: Mission[] = [
  {
    id: 'dm_01',
    title: 'Penguasaan Bunpou',
    description: 'Selesaikan 1 sesi latihan tata bahasa Bunpou hari ini.',
    progress: 0,
    target: 1,
    rewardExp: 80,
    rewardGold: 60,
    completed: false,
    claimed: false,
    type: 'daily',
    category: 'bunpou'
  },
  {
    id: 'dm_02',
    title: 'Pemburu Kosakata',
    description: 'Buka atau hafalkan 5 kartu Kotoba baru di Flashcard.',
    progress: 0,
    target: 5,
    rewardExp: 75,
    rewardGold: 50,
    completed: false,
    claimed: false,
    type: 'daily',
    category: 'kotoba'
  },
  {
    id: 'dm_03',
    title: 'Goresan Kanji Suci',
    description: 'Latih menulis 3 lembar kanji pada kanvas penulisan.',
    progress: 0,
    target: 3,
    rewardExp: 100,
    rewardGold: 70,
    completed: false,
    claimed: false,
    type: 'daily',
    category: 'kanji'
  },
  {
    id: 'dm_04',
    title: 'Telinga Emas Choukai',
    description: 'Dengarkan 1 audio dialog listening dan jawab pertanyaannya.',
    progress: 0,
    target: 1,
    rewardExp: 90,
    rewardGold: 60,
    completed: false,
    claimed: false,
    type: 'daily',
    category: 'choukai'
  },
  {
    id: 'dm_05',
    title: 'Kuis Cepat Tanpa Salah',
    description: 'Jawab 5 soal kuis dengan benar berturut-turut.',
    progress: 0,
    target: 5,
    rewardExp: 120,
    rewardGold: 100,
    completed: false,
    claimed: false,
    type: 'daily',
    category: 'general'
  }
];

export const INITIAL_WEEKLY_MISSIONS: Mission[] = [
  {
    id: 'wm_01',
    title: 'Penjelajah Dunia (Weekly)',
    description: 'Taklukkan minimal 5 Stage di peta perjalanan.',
    progress: 1,
    target: 5,
    rewardExp: 400,
    rewardGold: 350,
    completed: false,
    claimed: false,
    type: 'weekly',
    category: 'general'
  },
  {
    id: 'wm_02',
    title: 'Disiplin Samurai 5 Hari',
    description: 'Pertahankan streak belajar harian selama 5 hari berturut-turut.',
    progress: 1,
    target: 5,
    rewardExp: 500,
    rewardGold: 450,
    completed: false,
    claimed: false,
    type: 'weekly',
    category: 'streak'
  },
  {
    id: 'wm_03',
    title: 'Master Pembaca Dokkai',
    description: 'Selesaikan 3 teks membaca Dokkai dengan skor sempurna.',
    progress: 0,
    target: 3,
    rewardExp: 450,
    rewardGold: 400,
    completed: false,
    claimed: false,
    type: 'weekly',
    category: 'dokkai'
  },
  {
    id: 'wm_04',
    title: 'Penebas Boss Wilayah',
    description: 'Kalahkan minimal 1 Boss Stage pada Map.',
    progress: 0,
    target: 1,
    rewardExp: 600,
    rewardGold: 500,
    completed: false,
    claimed: false,
    type: 'weekly',
    category: 'general'
  }
];
