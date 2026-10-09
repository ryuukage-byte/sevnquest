// ==============================================================================
// NIHONGO TOWER — ACHIEVEMENT ENGINE (STAGE 5.4)
// ==============================================================================

export interface TowerAchievement {
  id: string;
  title: string;
  japaneseTitle: string;
  description: string;
  icon: string;
  category: 'climb' | 'kanji' | 'conjugation' | 'flawless' | 'boss' | 'speed';
  targetValue: number;
  currentValue: number;
  isUnlocked: boolean;
  reward: {
    exp: number;
    gold: number;
    sp?: number;
    title?: string;
  };
}

const DEFAULT_ACHIEVEMENTS: TowerAchievement[] = [
  {
    id: 'climb_10',
    title: 'Pos Pemeriksaan Pertama',
    japaneseTitle: '最初の社 (Saisho no Yashiro)',
    description: 'Capai Lantai 10 dan amankan pos peristirahatan pertama.',
    icon: 'mountain',
    category: 'climb',
    targetValue: 10,
    currentValue: 0,
    isUnlocked: false,
    reward: { exp: 300, gold: 200, sp: 1, title: 'Wanderer of the Spire' }
  },
  {
    id: 'climb_100',
    title: 'Penakluk Gerbang N5',
    japaneseTitle: 'N5の踏破者 (N5 no Touhasha)',
    description: 'Kalahkan Penjaga Tinta di Lantai 100 dan buka wilayah berikutnya.',
    icon: 'trophy',
    category: 'boss',
    targetValue: 100,
    currentValue: 0,
    isUnlocked: false,
    reward: { exp: 2000, gold: 1500, sp: 5, title: 'Guardian of the Ink Gate' }
  },
  {
    id: 'climb_300',
    title: 'Pendaki Lembah Angin',
    japaneseTitle: '風谷の覇者 (Fuukoku no Hasha)',
    description: 'Selesaikan seluruh Ujian N4 di Lantai 300.',
    icon: 'wind',
    category: 'boss',
    targetValue: 300,
    currentValue: 0,
    isUnlocked: false,
    reward: { exp: 5000, gold: 4000, sp: 8, title: 'Wind Blade Scholar' }
  },
  {
    id: 'kanji_50',
    title: 'Goresan Tinta Awal',
    japaneseTitle: '墨痕の刻印 (Bokkon no Kokuin)',
    description: 'Tulis 50 Kanji dengan akurasi di atas passing grade pada kanvas penulisan.',
    icon: 'feather',
    category: 'kanji',
    targetValue: 50,
    currentValue: 0,
    isUnlocked: false,
    reward: { exp: 500, gold: 350, sp: 2 }
  },
  {
    id: 'kanji_200',
    title: 'Master Kaligrafi Menara',
    japaneseTitle: '達筆の賢者 (Tappitsu no Kenja)',
    description: 'Tulis 200 Kanji dengan sempurna di kanvas inskripsi.',
    icon: 'pen-tool',
    category: 'kanji',
    targetValue: 200,
    currentValue: 0,
    isUnlocked: false,
    reward: { exp: 2500, gold: 2000, sp: 5, title: 'Master of Living Strokes' }
  },
  {
    id: 'conj_50',
    title: 'Inisiasi Alkemia Kata',
    japaneseTitle: '変化の錬金術 (Henka no Renkinjutsu)',
    description: 'Berhasil melakukan 50 konjugasi kata kerja tanpa bantuan.',
    icon: 'flask-conical',
    category: 'conjugation',
    targetValue: 50,
    currentValue: 0,
    isUnlocked: false,
    reward: { exp: 600, gold: 400, sp: 2 }
  },
  {
    id: 'flawless_10',
    title: 'Pelindung Nirnoda',
    japaneseTitle: '無傷の連勝 (Mukizu no Renshou)',
    description: 'Selesaikan 10 lantai dengan 0 kesalahan dan 3 hati utuh (Flawless Victor).',
    icon: 'shield-check',
    category: 'flawless',
    targetValue: 10,
    currentValue: 0,
    isUnlocked: false,
    reward: { exp: 1500, gold: 1000, sp: 3, title: 'The Untouchable' }
  },
  {
    id: 'speed_5',
    title: 'Kilat Pikiran',
    japaneseTitle: '電光石火 (Denkou Sekka)',
    description: 'Selesaikan suatu ronde tantangan dalam waktu kurang dari 5 detik.',
    icon: 'zap',
    category: 'speed',
    targetValue: 1,
    currentValue: 0,
    isUnlocked: false,
    reward: { exp: 800, gold: 500, sp: 2, title: 'Flash Mind' }
  }
];

const STORAGE_KEY = 'nq_tower_achievements_state';

export class TowerAchievementManager {
  public static load(): TowerAchievement[] {
    if (typeof window === 'undefined' || !window.localStorage) {
      return [...DEFAULT_ACHIEVEMENTS];
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [...DEFAULT_ACHIEVEMENTS];
      const saved: Record<string, Partial<TowerAchievement>> = JSON.parse(raw);
      return DEFAULT_ACHIEVEMENTS.map(ach => ({
        ...ach,
        currentValue: saved[ach.id]?.currentValue ?? ach.currentValue,
        isUnlocked: saved[ach.id]?.isUnlocked ?? ach.isUnlocked
      }));
    } catch {
      return [...DEFAULT_ACHIEVEMENTS];
    }
  }

  public static save(list: TowerAchievement[]): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const payload: Record<string, { currentValue: number; isUnlocked: boolean }> = {};
      for (const a of list) {
        payload[a.id] = { currentValue: a.currentValue, isUnlocked: a.isUnlocked };
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore
    }
  }

  /**
   * Tracks progress towards achievements and returns newly unlocked achievements
   */
  public static recordProgress(
    category: TowerAchievement['category'],
    amountOrTarget: number
  ): TowerAchievement[] {
    const list = this.load();
    const newlyUnlocked: TowerAchievement[] = [];

    for (const ach of list) {
      if (ach.category !== category || ach.isUnlocked) continue;

      if (category === 'climb') {
        ach.currentValue = Math.max(ach.currentValue, amountOrTarget);
      } else {
        ach.currentValue += amountOrTarget;
      }

      if (ach.currentValue >= ach.targetValue) {
        ach.isUnlocked = true;
        newlyUnlocked.push({ ...ach });
      }
    }

    this.save(list);
    return newlyUnlocked;
  }
}
