import React from 'react';
import { motion } from 'motion/react';
import {
  PenTool,
  Layers,
  BookOpen,
  Zap,
  Swords,
  ChevronRight,
  Flame,
  Trophy,
  Compass,
  ScrollText,
  Presentation,
  Library,
  Headphones,
  Sparkles
} from 'lucide-react';
import { DungeonType } from '../../utils/dungeonGenerator';
import { playSound } from '../../utils/audio';

/** 'text_study' dan 'immersion' bukan DungeonType generator: masing-masing membuka modal sendiri (tanpa payload soal). */
export type DungeonGateType = DungeonType | 'text_study' | 'immersion' | 'grammar_fusion';

interface DungeonPortalHubProps {
  onSelectDungeon: (type: DungeonGateType) => void;
  soundEnabled?: boolean;
}

interface DungeonGateInfo {
  type: DungeonGateType;
  title: string;
  accentColor: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  /** Lencana kuning kecil di samping judul, mis. fitur yang masih dikembangkan. */
  badge?: string;
  /** Kosong untuk gate yang belum punya hadiah (mis. Dungeon Imersi). */
  expPerQuestion?: number;
  goldPerQuestion?: number;
}

const DUNGEON_GATES: DungeonGateInfo[] = [
  {
    type: 'writing',
    title: 'Dungeon Menulis Aksara',
    accentColor: 'hover:border-border-primary',
    icon: PenTool,
    description: 'Tulis kanji dan kosakata goresan demi goresan.',
    expPerQuestion: 25,
    goldPerQuestion: 12,
  },
  {
    type: 'flashcard',
    title: 'Dungeon Gerbang Ingatan',
    accentColor: 'hover:border-border-primary',
    icon: Layers,
    description: 'Hafalkan arti dan bacaan dengan kartu bolak-balik.',
    expPerQuestion: 20,
    goldPerQuestion: 10,
  },
  {
    type: 'sakubun',
    title: 'Dungeon Kuil Tata Bahasa',
    accentColor: 'hover:border-border-primary',
    icon: BookOpen,
    description: 'Susun potongan kata menjadi kalimat yang benar.',
    expPerQuestion: 30,
    goldPerQuestion: 15,
  },
  {
    type: 'conjugation',
    title: 'Dungeon Altar Konjugasi',
    accentColor: 'hover:border-border-primary',
    icon: Zap,
    description: 'Ubah bentuk kata kerja dan kata sifat.',
    expPerQuestion: 25,
    goldPerQuestion: 12,
  },
  {
    type: 'quiz',
    title: 'Dungeon Arena Kuis Cepat',
    accentColor: 'hover:border-border-primary',
    icon: Swords,
    description: 'Kuis pilihan ganda acak ala JLPT.',
    expPerQuestion: 20,
    goldPerQuestion: 10,
  },
  {
    type: 'extreme',
    title: 'Dungeon Gerbang Kanji Extreme',
    accentColor: 'hover:border-border-primary',
    icon: Flame,
    description: 'Tebak bacaan kanji stage demi stage, makin lama makin sulit.',
    expPerQuestion: 25,
    goldPerQuestion: 15,
  },
  {
    type: 'sentence_creation',
    title: 'Dungeon Kreasi Kalimat Pola',
    accentColor: 'hover:border-border-primary',
    icon: ScrollText,
    description: 'Tulis kalimatmu sendiri memakai pola tata bahasa.',
    expPerQuestion: 35,
    goldPerQuestion: 18,
  },
  {
    type: 'blackboard',
    title: 'Dungeon Papan Tulis Pola',
    accentColor: 'hover:border-border-primary',
    icon: Presentation,
    description: 'Lihat bagaimana kata berubah di berbagai pola kalimat.',
    expPerQuestion: 15,
    goldPerQuestion: 8,
  },
  {
    type: 'grammar_fusion',
    title: 'Bunpou Dungeon: Grammar Fusion',
    accentColor: 'hover:border-border-primary',
    icon: Sparkles,
    description: 'Lebur komponen tata bahasa ke kata dasar dan lihat 食べる berubah jadi 食べないでください.',
    expPerQuestion: 60,
    goldPerQuestion: 30,
  },
  {
    type: 'text_study',
    title: 'Dungeon Perpustakaan Teks',
    accentColor: 'hover:border-border-primary',
    icon: Library,
    description: 'Tempel kalimat, paragraf, atau dokkai sendiri — dibedah jadi kotoba, pola, dan kanji lalu dilatih.',
    expPerQuestion: 18,
    goldPerQuestion: 9,
  },
  {
    type: 'immersion',
    title: 'Dungeon Imersi',
    accentColor: 'hover:border-border-primary',
    icon: Headphones,
    description: 'Belajar dari lagu dan video YouTube Jepang pilihanmu. Dua ruang: Musik dan Video.',
    badge: 'Dalam pengembangan',
  },
];

export const DungeonPortalHub: React.FC<DungeonPortalHubProps> = ({
  onSelectDungeon,
  soundEnabled = true,
}) => {
  return (
    <div className="space-y-6">
      {/* Hero Header Banner */}
      <div className="panel panel-stitched p-5 sm:p-6 rounded-3xl border border-border-subtle shadow-md bg-surface-card relative overflow-hidden space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-crimson/15 text-crimson border border-border-subtle flex items-center justify-center shrink-0 shadow-sm">
              <Swords className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-text-primary font-heading tracking-wide">
                  Gerbang Dungeon Latihan Bebas
                </h2>
                <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-crimson/20 text-crimson border border-border-subtle uppercase tracking-wider">
                  Grinding & Drill
                </span>
              </div>
              <p className="text-xs sm:text-sm text-text-secondary font-medium">
                Pilih dungeon yang ingin kamu taklukkan, tentukan level atau profesi (Kaigo, PM/Medis), dan mulai latihan prosedural acak.
              </p>
            </div>
          </div>
        </div>

        {/* Highlight Feature Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border-subtle text-xs text-text-secondary">
          <div className="flex items-center gap-1.5 font-medium">
            <Layers className="w-3.5 h-3.5 text-gold shrink-0" />
            <span>Soal Dinamis & Acak</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <Trophy className="w-3.5 h-3.5 text-gold shrink-0" />
            <span>Panen EXP & Gold</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <Compass className="w-3.5 h-3.5 text-indigo shrink-0" />
            <span>Filter Kaigo & PM Medis</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <Flame className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>Atur Jumlah Lantai (5〜20)</span>
          </div>
        </div>
      </div>

      {/* Grid of Dungeon Gates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {DUNGEON_GATES.map((gate) => {
          const Icon = gate.icon;

          return (
            <motion.div
              key={gate.type}
              whileHover={{ scale: 1.015, y: -2 }}
              whileTap={{ scale: 0.985 }}
              onClick={() => {
                playSound('click', soundEnabled);
                onSelectDungeon(gate.type);
              }}
              className={`panel panel-stitched p-5 rounded-3xl border border-border-subtle ${gate.accentColor} bg-surface-card hover:bg-surface-elevated transition-all cursor-pointer shadow-sm hover:shadow-xl flex flex-col justify-between space-y-4 group`}
            >
              {/* Top Row: Icon + Badge */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-surface-inset border border-border-subtle flex items-center justify-center text-text-primary group-hover:scale-110 group-hover:text-gold transition-all shadow-inner">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-text-primary font-heading group-hover:text-gold transition-colors">
                      {gate.title}
                    </h3>
                    {gate.badge && (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-gold/20 text-gold border border-border-subtle uppercase tracking-wider">
                        {gate.badge}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Middle: Description */}
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed font-body">
                {gate.description}
              </p>

              {/* Bottom: Reward Preview & CTA */}
              <div className="pt-3 border-t border-border-subtle flex items-center justify-between">
                {gate.expPerQuestion !== undefined ? (
                  <span className="text-[11px] font-mono font-bold text-gold flex items-center gap-1">
                    <span>+{gate.expPerQuestion} EXP</span>
                    <span className="text-text-muted">·</span>
                    <span>+{gate.goldPerQuestion} Gold / {gate.type === 'grammar_fusion' ? 'stage' : 'soal'}</span>
                  </span>
                ) : (
                  <span className="text-[11px] font-mono font-bold text-text-muted">Musik · Video</span>
                )}

                <button
                  type="button"
                  className="flex items-center gap-1 text-xs font-bold text-indigo group-hover:text-indigo-light group-hover:translate-x-1 transition-all font-heading"
                >
                  <span>Masuk Gerbang</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
