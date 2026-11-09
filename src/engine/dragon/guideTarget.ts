/**
 * Target sorotan Naga Pemandu: elemen layar yang ditunjukkan naga sebelum pemain berpindah halaman.
 * Fungsi murni (tanpa DOM); komponen yang memeriksa apakah elemennya benar-benar terlihat.
 */
import type { DragonCommand, DragonTab } from './intent';

export interface GuideTarget {
  /** Selektor CSS elemen yang disorot. */
  selector: string;
  /** Nama elemen untuk balon teks, mis. "Buku Saku". */
  label: string;
  /** Kalimat tambahan setelah "Ketuk {label} di sini." */
  detail?: string;
}

const NAV_LABEL: Record<DragonTab, string> = {
  home: 'Castle', maps: 'World', daily: 'Misi', weekly: 'Misi', leaderboard: 'Rank',
  library: 'Library', deck: 'Buku Saku', settings: 'Menu',
};

const nav = (tab: DragonTab, detail?: string): GuideTarget => ({
  selector: `[data-tour="nav-${tab === 'weekly' ? 'daily' : tab}"]`,
  label: NAV_LABEL[tab],
  detail,
});

/** Tab tempat pemain berada saat ini sama dengan tujuan → tidak ada yang perlu ditunjukkan. */
function sameTab(tab: DragonTab, activeTab?: string): boolean {
  if (!activeTab) return false;
  if (tab === 'weekly' || tab === 'daily') return activeTab === 'daily' || activeTab === 'weekly';
  return tab === activeTab;
}

export function guideTargetFor(cmd: DragonCommand, activeTab?: string): GuideTarget | null {
  switch (cmd.type) {
    case 'tab':
      return sameTab(cmd.tab, activeTab) ? null : nav(cmd.tab);
    case 'library': {
      const sub = { kotoba: 'Kotoba', kanji: 'Kanji', bunpou: 'Pola Kalimat', soal: 'Soal' }[cmd.tab];
      return sameTab('library', activeTab) ? null : nav('library', `Aku langsung bukakan tab ${sub}.`);
    }
    case 'tower':
      return sameTab('maps', activeTab) ? null : nav('maps', 'Menara Nihongo ada di dalam World.');
    case 'official_books':
      return sameTab('deck', activeTab) ? null : nav('deck', 'Buku Resmi ada di dalam Buku Saku.');
    case 'deck_ai':
      return sameTab('deck', activeTab) ? null : nav('deck', 'Isian deck-mu sudah kusiapkan di sana.');
    case 'install':
      return activeTab === 'home' || !activeTab
        ? { selector: '[data-tour="pwa-install"]', label: 'Pasang App', detail: 'Ikuti petunjuk yang muncul untuk memasang SevnQuest.' }
        : null;
    case 'status':
      return activeTab === 'home' || !activeTab
        ? { selector: '[data-tour="hero-card"]', label: 'kartu karaktermu', detail: 'Lembar Status ada di sana.' }
        : null;
    default:
      return null;
  }
}
