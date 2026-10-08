import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import {
  X,
  Layers,
  Flame,
  Clock,
  Shield,
  Check,
  ChevronRight,
  Swords,
  Trophy,
  BookOpen,
  AlertCircle,
  Coins,
  Lock,
  Search,
  SlidersHorizontal,
  CheckSquare,
  RotateCcw,
} from 'lucide-react';
import {
  DungeonType,
  DungeonLevelCategory,
  DungeonConfig,
  FlashcardMaterialType,
  isDeckCompatibleWithDungeon,
} from '../../utils/dungeonGenerator';
import { CONJUGATION_FORMS_INFO } from '../../data/conjugationRules';
import { UserDeck } from '../../types/rpg';
import { ensureUserDecks } from '../../utils/decks';
import { playSound } from '../../utils/audio';

interface DungeonSetupModalProps {
  isOpen: boolean;
  dungeonType: DungeonType;
  onClose: () => void;
  onStartDungeon: (config: DungeonConfig) => void;
  soundEnabled?: boolean;
  userDecks?: UserDeck[];
  onNavigateTab?: (tab: 'home' | 'maps' | 'daily' | 'weekly' | 'leaderboard' | 'library' | 'deck' | 'settings') => void;
}

const DUNGEON_META: Record<
  DungeonType,
  {
    title: string;    subtitle: string;
    iconEmoji: string;
    requirementHint: string;
    themeColor: string;
    glowColor: string;
  }
> = {
  writing: {
    title: 'Dungeon Menulis Aksara',    subtitle: 'Latihan menulis aksara goresan demi goresan',
    iconEmoji: '✍️',
    requirementHint: 'Memerlukan materi aksara (Kanji atau Kosakata)',
    themeColor: 'border-border-subtle text-wine-accent',
    glowColor: 'rgba(226, 85, 91, 0.25)',
  },
  flashcard: {
    title: 'Dungeon Gerbang Ingatan',    subtitle: 'Hafalan kilat bolak-balik arti, bacaan & audio',
    iconEmoji: '🎴',
    requirementHint: 'Mendukung semua tipe materi (Kanji, Kosakata, Tata Bahasa)',
    themeColor: 'border-border-subtle text-teal',
    glowColor: 'rgba(38, 166, 154, 0.25)',
  },
  sakubun: {
    title: 'Dungeon Kuil Tata Bahasa',    subtitle: 'Menyusun potongan kata dan pola menjadi kalimat utuh',
    iconEmoji: '🧩',
    requirementHint: 'Memerlukan materi pola tata bahasa (Bunpou)',
    themeColor: 'border-border-subtle text-gold',
    glowColor: 'rgba(240, 190, 82, 0.25)',
  },
  conjugation: {
    title: 'Dungeon Altar Konjugasi',    subtitle: 'Latihan cepat mengubah bentuk kata kerja & kata sifat',
    iconEmoji: '⚡',
    requirementHint: 'Memerlukan materi kosakata kata kerja/sifat (Kotoba)',
    themeColor: 'border-border-subtle text-indigo',
    glowColor: 'rgba(111, 147, 207, 0.25)',
  },
  quiz: {
    title: 'Dungeon Arena Kuis Cepat',    subtitle: 'Latihan kuis pilihan ganda acak standar JLPT',
    iconEmoji: '🎯',
    requirementHint: 'Mendukung materi Kanji, Kosakata, atau Tata Bahasa',
    themeColor: 'border-border-subtle text-emerald-400',
    glowColor: 'rgba(79, 174, 134, 0.25)',
  },
  extreme: {
    title: 'Dungeon Gerbang Kanji Extreme',    subtitle: 'Tantangan 3.000 soal tebak Onyomi & Kunyomi dari 100 stage bertingkat',
    iconEmoji: '🔥',
    requirementHint: 'Tersedia 100 stage penuh terstruktur (30 soal per stage)',
    themeColor: 'border-border-subtle text-rose-400',
    glowColor: 'rgba(244, 63, 94, 0.25)',
  },
  sentence_creation: {
    title: 'Dungeon Kreasi Kalimat Pola',    subtitle: 'Rangkai kalimat bebas bahasa Jepang menggunakan pola tata bahasa yang ditentukan',
    iconEmoji: '📜',
    requirementHint: 'Memerlukan materi pola tata bahasa (Bunpou)',
    themeColor: 'border-border-subtle text-violet-400',
    glowColor: 'rgba(139, 92, 246, 0.25)',
  },
  blackboard: {
    title: 'Dungeon Papan Tulis Pola',    subtitle: 'Laboratorium visual bebas mengamati hasil transformasi kata dengan aneka pola kalimat',
    iconEmoji: '🏫',
    requirementHint: 'Mendukung kata kerja (Kotoba) dan pola kalimat (Bunpou)',
    themeColor: 'border-border-subtle text-teal',
    glowColor: 'rgba(38, 166, 154, 0.25)',
  },
};

const LEVEL_CATEGORY_OPTIONS: {
  id: DungeonLevelCategory;
  label: string;
  jpBadge: string;
  desc: string;
  badge: string;
}[] = [
  { id: 'all', label: 'Semua Level', jpBadge: '全段', desc: 'N5 - N1 Campuran', badge: 'Campuran' },
  { id: 'N5', label: 'JLPT N5', jpBadge: '初級', desc: 'Dasar Pemula', badge: 'Dasar' },
  { id: 'N4', label: 'JLPT N4', jpBadge: '準中', desc: 'Pra-Menengah', badge: 'Pra-Menengah' },
  { id: 'N3', label: 'JLPT N3', jpBadge: '中級', desc: 'Menengah', badge: 'Menengah' },
  { id: 'N2', label: 'JLPT N2', jpBadge: '上級', desc: 'Menengah Atas', badge: 'Mahir' },
  { id: 'N1', label: 'JLPT N1', jpBadge: '達人', desc: 'Tingkat Mahir', badge: 'Ahli' },
  { id: 'Kaigo', label: 'Kaigo', jpBadge: '介護', desc: 'Keperawatan', badge: 'Profesi' },
  { id: 'PM', label: 'PM Medis', jpBadge: '医療', desc: 'Kesehatan', badge: 'Kesehatan' },
  { id: 'SSW', label: 'SSW Kerja', jpBadge: '特技', desc: 'Kerja SSW', badge: 'Kerja SSW' },
];

const FLOOR_COUNT_OPTIONS = [
  { count: 5, label: '5 Lantai', sub: '~3 Menit' },
  { count: 10, label: '10 Lantai', sub: '~7 Menit' },
  { count: 15, label: '15 Lantai', sub: '~12 Menit' },
  { count: 20, label: '20 Lantai', sub: '~18 Menit' },
];

export const DungeonSetupModal: React.FC<DungeonSetupModalProps> = ({
  isOpen,
  dungeonType,
  onClose,
  onStartDungeon,
  soundEnabled = true,
  userDecks,
  onNavigateTab,
}) => {
  const allDecks = useMemo(() => ensureUserDecks(userDecks), [userDecks]);

  // Flashcard material customization state (Kotoba, Kanji, Bunpou / Pola)
  const [selectedFlashcardTypes, setSelectedFlashcardTypes] = useState<FlashcardMaterialType[]>([
    'kotoba', 'kanji', 'bunpou'
  ]);

  const toggleFlashcardType = (type: FlashcardMaterialType) => {
    playSound('click', soundEnabled);
    setSelectedFlashcardTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  // Evaluate compatibility of each deck for this dungeonType
  const evaluatedDecks = useMemo(() => {
    return allDecks.map(deck => {
      const compat = isDeckCompatibleWithDungeon(deck, dungeonType);
      let matchedCount = compat.matchedCount;
      let isCompatible = compat.isCompatible;
      let reason = compat.reason;

      if (dungeonType === 'flashcard') {
        const filteredCount = deck.items.filter(it => selectedFlashcardTypes.includes(it.category as any)).length;
        matchedCount = filteredCount;
        isCompatible = filteredCount > 0;
        if (filteredCount === 0) {
          reason = `Deck tidak memiliki materi ${selectedFlashcardTypes.map(t => t === 'kotoba' ? 'Kosakata' : t === 'kanji' ? 'Kanji' : 'Tata Bahasa').join('/')}`;
        }
      }

      return {
        deck,
        isCompatible,
        matchedCount,
        reason,
      };
    });
  }, [allDecks, dungeonType, selectedFlashcardTypes]);

  const compatibleDecks = useMemo(() => evaluatedDecks.filter(d => d.isCompatible), [evaluatedDecks]);
  const incompatibleDecks = useMemo(() => evaluatedDecks.filter(d => !d.isCompatible), [evaluatedDecks]);

  const [sourceType, setSourceType] = useState<'preset' | 'deck'>('preset');
  const [selectedCategory, setSelectedCategory] = useState<DungeonLevelCategory>('N5');
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(() => compatibleDecks[0]?.deck.id || null);
  const [selectedFloorCount, setSelectedFloorCount] = useState<number>(10);
  const [mode, setMode] = useState<'standard' | 'survival'>('standard');
  const [survivalSeconds, setSurvivalSeconds] = useState<number>(30);
  const [extremeStageNumber, setExtremeStageNumber] = useState<number>(1);
  const [isRandomExtreme, setIsRandomExtreme] = useState<boolean>(false);

  // Conjugation customization state
  const [conjugationMode, setConjugationMode] = useState<'random' | 'custom'>('random');
  const [selectedConjugationForms, setSelectedConjugationForms] = useState<string[]>([
    'te', 'ta', 'nai', 'masu'
  ]);
  const [patternSearchQuery, setPatternSearchQuery] = useState('');

  const toggleConjugationForm = (formId: string) => {
    playSound('click', soundEnabled);
    setSelectedConjugationForms(prev =>
      prev.includes(formId) ? prev.filter(f => f !== formId) : [...prev, formId]
    );
  };

  const filteredConjugationForms = useMemo(() => {
    const q = patternSearchQuery.toLowerCase().trim();
    if (!q) return CONJUGATION_FORMS_INFO;
    return CONJUGATION_FORMS_INFO.filter(f => {
      return (
        f.name.toLowerCase().includes(q) ||
        f.japaneseName.toLowerCase().includes(q) ||
        f.badge.toLowerCase().includes(q) ||
        f.summary.toLowerCase().includes(q) ||
        f.id.toLowerCase().includes(q)
      );
    });
  }, [patternSearchQuery]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const meta = DUNGEON_META[dungeonType] || DUNGEON_META.writing;

  // Dynamic EXP & Gold calculation based on dungeon type rates
  const expPerQuestion = dungeonType === 'sakubun' ? 30 : dungeonType === 'quiz' || dungeonType === 'flashcard' ? 20 : 25;
  const goldPerQuestion = dungeonType === 'sakubun' ? 15 : dungeonType === 'quiz' || dungeonType === 'flashcard' ? 10 : 12;
  const estimatedExp = selectedFloorCount * expPerQuestion;
  const estimatedGold = selectedFloorCount * goldPerQuestion;

  const handleStart = () => {
    if (sourceType === 'deck' && !selectedDeckId) return;
    if (dungeonType === 'flashcard' && selectedFlashcardTypes.length === 0) return;
    if (dungeonType === 'conjugation' && conjugationMode === 'custom' && selectedConjugationForms.length === 0) return;

    playSound('attack', soundEnabled);
    const chosenDeck = compatibleDecks.find(d => d.deck.id === selectedDeckId)?.deck;

    onStartDungeon({
      type: dungeonType,
      levelCategory: selectedCategory,
      floorCount: selectedFloorCount,
      mode,
      survivalTimeLimit: mode === 'survival' ? survivalSeconds : undefined,
      deckId: sourceType === 'deck' && selectedDeckId ? selectedDeckId : undefined,
      deckTitle: sourceType === 'deck' && chosenDeck ? chosenDeck.title : undefined,
      sourceType,
      stageNumber: dungeonType === 'extreme' && !isRandomExtreme ? extremeStageNumber : undefined,
      flashcardMaterialTypes: dungeonType === 'flashcard' ? selectedFlashcardTypes : undefined,
      conjugationMode: dungeonType === 'conjugation' ? conjugationMode : undefined,
      selectedConjugationForms: dungeonType === 'conjugation' && conjugationMode === 'custom' ? selectedConjugationForms : undefined,
    });
  };

  const isStartDisabled =
    (sourceType === 'deck' && (!selectedDeckId || compatibleDecks.length === 0)) ||
    (dungeonType === 'flashcard' && selectedFlashcardTypes.length === 0) ||
    (dungeonType === 'conjugation' && conjugationMode === 'custom' && selectedConjugationForms.length === 0);

  return createPortal(
    <motion.div
      key="dungeon-setup-modal-container"
      className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Dark Ambient Vignette Backdrop */}
      <motion.div
        className="fixed inset-0 bg-black/80"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => {
          playSound('click', soundEnabled);
          onClose();
        }}
      />

      {/* Tactile Skeuomorphic Leather-Bound Plaque Shell */}
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 20 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="panel panel-stitched relative z-10 w-full max-w-xl max-h-[92vh] flex flex-col rounded-3xl border border-border-subtle bg-surface-card shadow-[6px_6px_24px_var(--neu-d),-4px_-4px_16px_var(--neu-l),0_0_0_1px_rgba(255,255,255,0.03)] overflow-hidden"
      >
        {/* Subtle Washi Scroll Grain Texture */}
        <div className="skeuo-grain" />

        {/* ================= SKEUOMORPHIC HEADER ================= */}
        <div className="relative z-10 p-4 sm:p-5 border-b border-border-subtle flex items-center justify-between gap-3 bg-surface-inset/80 shadow-[0_3px_10px_rgba(0,0,0,0.3)]">
          <div className="flex items-center gap-3.5">
            {/* Tactile Engraved Emblem Frame */}
            <div
              className="w-12 h-12 rounded-2xl bg-surface-elevated border border-border-subtle flex items-center justify-center text-2xl shrink-0 shadow-[2px_2px_6px_var(--neu-d),-1px_-1px_3px_var(--neu-l)] relative"
              style={{ boxShadow: `0 0 16px ${meta.glowColor}` }}
            >
              <span className="select-none filter drop-shadow-xs">{meta.iconEmoji}</span>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-gold text-surface-base flex items-center justify-center text-[9px] font-black font-mono shadow-xs">
                ⚔️
              </div>
            </div>

            <div>
              <h2 className="text-lg sm:text-xl font-black text-text-primary font-heading tracking-wide drop-shadow-xs">
                {meta.title}
              </h2>
              <p className="text-[11px] sm:text-xs text-text-secondary leading-tight line-clamp-1">
                {meta.subtitle}
              </p>
            </div>
          </div>

          {/* Tactile Close Button */}
          <button
            type="button"
            onClick={() => {
              playSound('click', soundEnabled);
              onClose();
            }}
            className="btn-physical-secondary w-9 h-9 rounded-xl transition-all flex items-center justify-center cursor-pointer shrink-0 p-0"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ================= SCROLLABLE SETUP CONTENT ================= */}
        <div className="relative z-10 p-4 sm:p-6 space-y-6 overflow-y-auto scrollbar-thin flex-1">
          {/* SECTION 1: MATERI TANTANGAN (PRESET VS DECK VS EXTREME STAGES) */}
          <div className="space-y-3">
            {dungeonType === 'extreme' ? (
              <div className="space-y-3 p-4 rounded-2xl bg-surface-inset border border-border-subtle">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-rose-400 font-heading flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-rose-400" />
                    <span>Pilih Stage Kanji Extreme (1 - 100):</span>
                  </label>
                  <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-lg bg-rose-500/15 border border-border-subtle text-rose-300">
                    {isRandomExtreme ? 'Mode Acak Campuran' : `Stage ${extremeStageNumber}`}
                  </span>
                </div>

                {/* Quick Stage Shortcuts */}
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                  {[1, 10, 25, 50, 75, 100].map((stg) => (
                    <button
                      key={stg}
                      type="button"
                      onClick={() => {
                        playSound('click', soundEnabled);
                        setIsRandomExtreme(false);
                        setExtremeStageNumber(stg);
                      }}
                      className={`py-1.5 px-2 rounded-xl text-xs font-mono font-bold transition-all text-center cursor-pointer border ${
                        !isRandomExtreme && extremeStageNumber === stg
                          ? 'bg-surface-elevated text-gold border border-border-subtle shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_2px_6px_rgba(0,0,0,0.3)] font-black'
                          : 'bg-surface-inset border-border-subtle/60 text-text-secondary hover:text-text-primary shadow-[inset_1px_1px_3px_var(--neu-d)]'
                      }`}
                    >
                      Stg {stg}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      playSound('click', soundEnabled);
                      setIsRandomExtreme(true);
                    }}
                    className={`py-1.5 px-2 rounded-xl text-xs font-heading font-bold transition-all text-center cursor-pointer border col-span-2 sm:col-span-1 ${
                      isRandomExtreme
                        ? 'bg-surface-elevated text-gold border border-border-subtle shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_2px_6px_rgba(0,0,0,0.3)] font-black'
                        : 'bg-surface-inset border-border-subtle/60 text-text-secondary hover:text-text-primary shadow-[inset_1px_1px_3px_var(--neu-d)]'
                    }`}
                  >
                    🎲 Acak
                  </button>
                </div>

                {/* Numeric Stage Stepper / Slider */}
                {!isRandomExtreme && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="1"
                        max="100"
                        value={extremeStageNumber}
                        onChange={(e) => setExtremeStageNumber(parseInt(e.target.value, 10))}
                        className="flex-1 accent-rose-500 cursor-pointer"
                      />
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={extremeStageNumber <= 1}
                          onClick={() => setExtremeStageNumber(p => Math.max(1, p - 1))}
                          className="btn-physical-secondary w-7 h-7 rounded-lg font-bold disabled:opacity-30 cursor-pointer p-0"
                        >
                          -
                        </button>
                        <span className="w-10 text-center font-mono font-black text-sm text-gold">
                          {extremeStageNumber}
                        </span>
                        <button
                          type="button"
                          disabled={extremeStageNumber >= 100}
                          onClick={() => setExtremeStageNumber(p => Math.min(100, p + 1))}
                          className="btn-physical-secondary w-7 h-7 rounded-lg font-bold disabled:opacity-30 cursor-pointer p-0"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-text-muted">
                      💡 Setiap stage berisi 30 soal tebak Onyomi & Kunyomi bergradasi tingkat kesulitan.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* ================= FLASHCARD MATERIAL CUSTOMIZATION ================= */}
                {dungeonType === 'flashcard' && (
                  <div className="space-y-2.5 p-3.5 rounded-2xl bg-surface-inset border border-border-subtle shadow-[inset_1.5px_1.5px_4px_var(--neu-d)] mb-3 animate-fade-in">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <label className="text-xs font-bold uppercase tracking-wider text-teal font-heading flex items-center gap-1.5">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-teal" />
                        <span>Kustomisasi Tipe Materi Flashcard:</span>
                      </label>

                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${
                          selectedFlashcardTypes.length === 3
                            ? 'bg-teal/15 text-teal border-border-subtle'
                            : selectedFlashcardTypes.length > 0
                            ? 'bg-amber-500/15 text-gold border-border-subtle'
                            : 'bg-rose-500/15 text-rose-400 border-border-subtle'
                        }`}>
                          {selectedFlashcardTypes.length === 3
                            ? 'Semua Tipe (3/3)'
                            : selectedFlashcardTypes.length > 0
                            ? `${selectedFlashcardTypes.length} Tipe Aktif`
                            : '0 Tipe Dipilih'}
                        </span>

                        {selectedFlashcardTypes.length < 3 && (
                          <button
                            type="button"
                            onClick={() => {
                              playSound('click', soundEnabled);
                              setSelectedFlashcardTypes(['kotoba', 'kanji', 'bunpou']);
                            }}
                            className="text-[11px] font-heading font-bold text-teal hover:underline cursor-pointer"
                          >
                            Pilih Semua
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 3 Checkable Material Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {/* 1. KOTOBA */}
                      {(() => {
                        const isSelected = selectedFlashcardTypes.includes('kotoba');
                        return (
                          <button
                            type="button"
                            onClick={() => toggleFlashcardType('kotoba')}
                            className={`p-3 rounded-2xl text-left transition-all border relative flex flex-col justify-between select-none cursor-pointer overflow-hidden ${
                              isSelected
                                ? 'bg-surface-elevated border border-border-muted text-text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_4px_10px_rgba(0,0,0,0.35)]'
                                : 'bg-surface-inset hover:bg-surface-card/60 border border-border-subtle/60 shadow-[inset_1px_1px_3px_var(--neu-d)] text-text-muted hover:text-text-primary'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className={`w-6 h-6 rounded-lg font-serif font-black text-xs flex items-center justify-center border shadow-xs ${
                                  isSelected
                                    ? 'bg-teal/15 border-border-subtle text-teal'
                                    : 'bg-surface-inset border-border-subtle text-text-muted'
                                }`}>
                                  語
                                </span>
                                <span className={`text-xs font-heading font-black tracking-wide ${isSelected ? 'text-teal' : 'text-text-primary'}`}>
                                  Kotoba
                                </span>
                              </div>
                              <div className={`w-4 h-4 rounded-full flex items-center justify-center border transition-all ${
                                isSelected ? 'bg-teal/20 border-border-subtle text-teal shadow-xs' : 'border-border-subtle bg-surface-inset text-transparent'
                              }`}>
                                {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                              </div>
                            </div>
                            <div className="mt-2 min-w-0">
                              <div className={`text-[11px] font-heading font-bold ${isSelected ? 'text-text-primary' : 'text-text-secondary'}`}>
                                Kosakata
                              </div>
                              <div className="text-[10px] text-text-muted truncate mt-0.5 font-body">
                                Arti, bacaan & audio
                              </div>
                            </div>
                          </button>
                        );
                      })()}

                      {/* 2. KANJI */}
                      {(() => {
                        const isSelected = selectedFlashcardTypes.includes('kanji');
                        return (
                          <button
                            type="button"
                            onClick={() => toggleFlashcardType('kanji')}
                            className={`p-3 rounded-2xl text-left transition-all border relative flex flex-col justify-between select-none cursor-pointer overflow-hidden ${
                              isSelected
                                ? 'bg-surface-elevated border border-border-muted text-text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_4px_10px_rgba(0,0,0,0.35)]'
                                : 'bg-surface-inset hover:bg-surface-card/60 border border-border-subtle/60 shadow-[inset_1px_1px_3px_var(--neu-d)] text-text-muted hover:text-text-primary'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className={`w-6 h-6 rounded-lg font-serif font-black text-xs flex items-center justify-center border shadow-xs ${
                                  isSelected
                                    ? 'bg-gold/15 border-border-subtle text-gold'
                                    : 'bg-surface-inset border-border-subtle text-text-muted'
                                }`}>
                                  字
                                </span>
                                <span className={`text-xs font-heading font-black tracking-wide ${isSelected ? 'text-gold' : 'text-text-primary'}`}>
                                  Kanji
                                </span>
                              </div>
                              <div className={`w-4 h-4 rounded-full flex items-center justify-center border transition-all ${
                                isSelected ? 'bg-gold/20 border-border-subtle text-gold shadow-xs' : 'border-border-subtle bg-surface-inset text-transparent'
                              }`}>
                                {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                              </div>
                            </div>
                            <div className="mt-2 min-w-0">
                              <div className={`text-[11px] font-heading font-bold ${isSelected ? 'text-text-primary' : 'text-text-secondary'}`}>
                                Aksara Kanji
                              </div>
                              <div className="text-[10px] text-text-muted truncate mt-0.5 font-body">
                                Onyomi, Kunyomi & makna
                              </div>
                            </div>
                          </button>
                        );
                      })()}

                      {/* 3. POLA (BUNPOU) */}
                      {(() => {
                        const isSelected = selectedFlashcardTypes.includes('bunpou');
                        return (
                          <button
                            type="button"
                            onClick={() => toggleFlashcardType('bunpou')}
                            className={`p-3 rounded-2xl text-left transition-all border relative flex flex-col justify-between select-none cursor-pointer overflow-hidden ${
                              isSelected
                                ? 'bg-surface-elevated border border-border-muted text-text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_4px_10px_rgba(0,0,0,0.35)]'
                                : 'bg-surface-inset hover:bg-surface-card/60 border border-border-subtle/60 shadow-[inset_1px_1px_3px_var(--neu-d)] text-text-muted hover:text-text-primary'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className={`w-6 h-6 rounded-lg font-serif font-black text-xs flex items-center justify-center border shadow-xs ${
                                  isSelected
                                    ? 'bg-indigo/15 border-border-subtle text-indigo'
                                    : 'bg-surface-inset border-border-subtle text-text-muted'
                                }`}>
                                  文
                                </span>
                                <span className={`text-xs font-heading font-black tracking-wide ${isSelected ? 'text-indigo' : 'text-text-primary'}`}>
                                  Pola Kalimat
                                </span>
                              </div>
                              <div className={`w-4 h-4 rounded-full flex items-center justify-center border transition-all ${
                                isSelected ? 'bg-indigo/20 border-border-subtle text-indigo shadow-xs' : 'border-border-subtle bg-surface-inset text-transparent'
                              }`}>
                                {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                              </div>
                            </div>
                            <div className="mt-2 min-w-0">
                              <div className={`text-[11px] font-heading font-bold ${isSelected ? 'text-text-primary' : 'text-text-secondary'}`}>
                                Tata Bahasa (Bunpou)
                              </div>
                              <div className="text-[10px] text-text-muted truncate mt-0.5 font-body">
                                Formula pola & contoh kalimat
                              </div>
                            </div>
                          </button>
                        );
                      })()}
                    </div>

                    {selectedFlashcardTypes.length === 0 && (
                      <p className="text-[11px] text-rose-400 font-medium text-center pt-1 flex items-center justify-center gap-1 animate-fade-in">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Pilih minimal 1 tipe materi (Kotoba, Kanji, atau Pola) untuk memulai drill flashcard.</span>
                      </p>
                    )}
                  </div>
                )}

                {dungeonType === 'conjugation' && (
                  /* ================= CONJUGATION MODE SWITCHER ================= */
                  <div className="space-y-2.5 p-3 rounded-2xl bg-surface-inset border border-border-subtle shadow-[inset_1.5px_1.5px_4px_var(--neu-d)] mb-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-indigo font-heading flex items-center gap-1.5">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-indigo" />
                        <span>Mode Latihan Pola Konjugasi:</span>
                      </label>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-indigo/15 text-indigo border border-border-subtle">
                        {conjugationMode === 'random' ? '🎲 Pola Kurikulum' : `🎯 Kustom (${selectedConjugationForms.length} Pola)`}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 p-1 bg-surface-card/70 rounded-xl border border-border-subtle gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          playSound('click', soundEnabled);
                          setConjugationMode('random');
                        }}
                        className={`py-2 px-2 rounded-lg text-xs font-heading font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none ${
                          conjugationMode === 'random'
                            ? 'bg-indigo-deep text-gold border border-border-subtle shadow-sm font-black'
                            : 'text-text-muted hover:text-text-primary hover:bg-surface-elevated/40'
                        }`}
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Pola Kurikulum / Deck</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          playSound('click', soundEnabled);
                          setConjugationMode('custom');
                        }}
                        className={`py-2 px-2 rounded-lg text-xs font-heading font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none ${
                          conjugationMode === 'custom'
                            ? 'bg-indigo-deep text-gold border border-border-subtle shadow-sm font-black'
                            : 'text-text-muted hover:text-text-primary hover:bg-surface-elevated/40'
                        }`}
                      >
                        <CheckSquare className="w-3.5 h-3.5 text-gold" />
                        <span>Kustom Pola Tertentu</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* ================= CUSTOM PATTERNS PICKER (IF CUSTOM CONJUGATION) ================= */}
                {dungeonType === 'conjugation' && conjugationMode === 'custom' && (
                  <div className="space-y-2.5 p-3.5 rounded-2xl bg-surface-inset border border-border-subtle shadow-[inset_1.5px_1.5px_4px_var(--neu-d)] animate-fade-in">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <label className="text-xs font-bold uppercase tracking-wider text-text-primary font-heading flex items-center gap-1.5">
                        <CheckSquare className="w-3.5 h-3.5 text-gold" />
                        <span>Pilih Pola yang Ingin Dilatih:</span>
                      </label>
                      <div className="flex items-center gap-2 text-[11px]">
                        <button
                          type="button"
                          onClick={() => {
                            playSound('click', soundEnabled);
                            setSelectedConjugationForms(CONJUGATION_FORMS_INFO.map(f => f.id));
                          }}
                          className="font-heading font-bold text-teal hover:underline cursor-pointer"
                        >
                          Pilih Semua
                        </button>
                        <span className="text-border-subtle">|</span>
                        <button
                          type="button"
                          onClick={() => {
                            playSound('click', soundEnabled);
                            setSelectedConjugationForms([]);
                          }}
                          className="font-heading font-bold text-rose-400 hover:underline cursor-pointer"
                        >
                          Reset
                        </button>
                      </div>
                    </div>

                    {/* Real-time Pattern Search Input */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                      <input
                        type="text"
                        placeholder="Cari pola (te, lampau, pasif)..."
                        value={patternSearchQuery}
                        onChange={(e) => setPatternSearchQuery(e.target.value)}
                        className="w-full bg-surface-card border border-border-subtle rounded-xl pl-9 pr-8 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-primary shadow-[inset_1px_1px_3px_var(--neu-d)]"
                      />
                      {patternSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setPatternSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary text-xs"
                        >
                          ×
                        </button>
                      )}
                    </div>

                    {/* Pattern Cards Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
                      {filteredConjugationForms.map((form) => {
                        const isSelected = selectedConjugationForms.includes(form.id);
                        return (
                          <button
                            key={form.id}
                            type="button"
                            onClick={() => toggleConjugationForm(form.id)}
                            className={`p-2.5 rounded-xl text-left transition-all border relative flex flex-col justify-between select-none cursor-pointer ${
                              isSelected
                                ? 'bg-surface-elevated border border-border-subtle text-text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_3px_8px_rgba(0,0,0,0.35)]'
                                : 'bg-surface-inset hover:bg-surface-card/60 border border-border-subtle/60 shadow-[inset_1px_1px_3px_var(--neu-d)] text-text-muted hover:text-text-primary'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                isSelected ? 'bg-gold/15 text-gold border border-border-subtle' : 'bg-surface-inset text-text-muted border border-border-subtle'
                              }`}>
                                {form.badge}
                              </span>
                              <div className={`w-4 h-4 rounded-full flex items-center justify-center border transition-all ${
                                isSelected ? 'bg-gold/20 border-border-subtle text-gold shadow-xs' : 'border-border-subtle bg-surface-inset text-transparent'
                              }`}>
                                {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                              </div>
                            </div>
                            <div className="mt-1.5 min-w-0">
                              <div className={`text-xs font-heading font-bold truncate ${isSelected ? 'text-text-primary' : 'text-text-secondary'}`}>
                                {form.name}
                              </div>
                              <div className="text-[10px] text-text-muted truncate mt-0.5 font-body" title={form.summary}>
                                {form.summary}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {selectedConjugationForms.length === 0 && (
                      <p className="text-[11px] text-rose-400 font-medium text-center pt-1 flex items-center justify-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Pilih minimal 1 pola konjugasi untuk memulai latihan.
                      </p>
                    )}
                  </div>
                )}

                {/* ================= SOURCE / LEVEL SELECTOR HEADER ================= */}
                <div className="flex items-center justify-between pt-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-text-muted font-heading flex items-center gap-1.5">
                    <span>
                      {dungeonType === 'conjugation' && conjugationMode === 'custom'
                        ? '1. Pilih Tingkat Kosakata yang Dilatih:'
                        : '1. Pilih Tingkat atau Kategori:'}
                    </span>
                  </label>

                  <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-lg bg-surface-inset border border-border-subtle text-gold shadow-xs">
                    {sourceType === 'preset'
                      ? LEVEL_CATEGORY_OPTIONS.find(c => c.id === selectedCategory)?.badge
                      : `${compatibleDecks.length} Deck Kompatibel`}
                  </span>
                </div>

                {/* Tactile Carved Groove Switcher Track */}
                <div className="grid grid-cols-2 p-1.5 bg-surface-inset rounded-2xl border border-border-subtle shadow-[inset_2px_2px_6px_var(--neu-d),inset_-2px_-2px_6px_var(--neu-l)] gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      playSound('click', soundEnabled);
                      setSourceType('preset');
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-heading font-bold transition-all flex items-center justify-center gap-2 select-none cursor-pointer ${
                      sourceType === 'preset'
                        ? 'bg-surface-elevated text-text-primary border border-border-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_6px_rgba(0,0,0,0.3)] font-black'
                        : 'text-text-muted hover:text-text-primary hover:bg-surface-card/30'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 text-gold" />
                    <span>
                      {dungeonType === 'conjugation' && conjugationMode === 'custom'
                        ? 'Tingkat Kosakata'
                        : 'Kategori Kurikulum'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playSound('click', soundEnabled);
                      setSourceType('deck');
                      if (!selectedDeckId && compatibleDecks.length > 0) {
                        setSelectedDeckId(compatibleDecks[0].deck.id);
                      }
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-heading font-bold transition-all flex items-center justify-center gap-2 select-none cursor-pointer ${
                      sourceType === 'deck'
                        ? 'bg-surface-elevated text-text-primary border border-border-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_6px_rgba(0,0,0,0.3)] font-black'
                        : 'text-text-muted hover:text-text-primary hover:bg-surface-card/30'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5 text-text-muted" />
                    <span>Pilih Deck ({compatibleDecks.length})</span>
                  </button>
                </div>

                {/* TAB VIEW A: SKEUOMORPHIC LEVEL PLAQUES */}
                {sourceType === 'preset' && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 animate-fade-in pt-1">
                    {LEVEL_CATEGORY_OPTIONS.map((opt) => {
                      const isSelected = selectedCategory === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            playSound('click', soundEnabled);
                            setSelectedCategory(opt.id);
                          }}
                          className={`p-2.5 sm:p-3 rounded-2xl text-left transition-all relative flex flex-col justify-between min-h-[74px] sm:min-h-[78px] select-none cursor-pointer overflow-hidden ${
                            isSelected
                              ? 'bg-surface-elevated border border-border-subtle text-text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_4px_12px_rgba(0,0,0,0.4)]'
                              : 'bg-surface-inset hover:bg-surface-card/60 border border-border-subtle/60 shadow-[inset_1px_1px_3px_var(--neu-d)] hover:border-border-muted'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1.5 w-full min-w-0">
                            <span className={`text-xs font-heading font-black tracking-wide truncate ${isSelected ? 'text-gold' : 'text-text-primary'}`}>
                              {opt.label}
                            </span>
                            {isSelected ? (
                              <div className="w-4 h-4 rounded-full bg-gold/20 border border-border-subtle text-gold flex items-center justify-center shrink-0 shadow-xs">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              </div>
                            ) : (
                              <span className="text-[9px] font-mono text-text-muted font-bold px-1.5 py-0.5 rounded bg-surface-card/70 border border-border-subtle/50 shrink-0 whitespace-nowrap">
                                {opt.jpBadge}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-text-muted truncate mt-1.5 font-body block" title={opt.desc}>
                            {opt.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* TAB VIEW B: SKEUOMORPHIC GRIMOIRE DECK CARDS */}
                {sourceType === 'deck' && (
                  <div className="space-y-2.5 animate-fade-in pt-1">
                    {compatibleDecks.length > 0 ? (
                      <div className="space-y-2.5 max-h-[230px] overflow-y-auto pr-1 scrollbar-thin">
                        {compatibleDecks.map(({ deck, matchedCount }) => {
                          const isSelected = selectedDeckId === deck.id;
                          return (
                            <button
                              key={deck.id}
                              type="button"
                              onClick={() => {
                                playSound('click', soundEnabled);
                                setSelectedDeckId(deck.id);
                              }}
                              className={`w-full p-3.5 rounded-2xl text-left transition-all flex items-center justify-between gap-3 select-none cursor-pointer ${
                                isSelected
                                  ? 'bg-surface-elevated border border-border-subtle text-text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_4px_12px_rgba(0,0,0,0.4)]'
                                  : 'bg-surface-inset hover:bg-surface-card/60 border border-border-subtle/60 shadow-[inset_1px_1px_3px_var(--neu-d)] hover:border-border-muted'
                              }`}
                            >
                              <div className="flex items-center gap-3.5 min-w-0">
                                {/* Grimoire Spine Emblem */}
                                <div className="w-10 h-10 rounded-xl bg-surface-card border border-border-subtle flex items-center justify-center text-xl shrink-0 shadow-[inset_1px_1px_3px_var(--neu-d)]">
                                  {deck.coverIcon || '📖'}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`text-xs font-heading font-black truncate ${isSelected ? 'text-gold' : 'text-text-primary'}`}>
                                      {deck.title}
                                    </span>
                                    {deck.isDefault && (
                                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-gold border border-border-subtle font-bold font-mono">
                                        Bookmark
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2.5 shrink-0">
                                <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-xl bg-indigo/15 text-indigo border border-border-subtle shadow-xs">
                                  {matchedCount} Materi
                                </span>
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                                  isSelected
                                    ? 'bg-gold/20 border-border-subtle text-gold shadow-xs'
                                    : 'border-border-subtle bg-surface-card text-transparent'
                                }`}>
                                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                              </div>
                            </button>
                          );
                        })}

                        {/* Incompatible Decks Section */}
                        {incompatibleDecks.length > 0 && (
                          <div className="pt-2">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-heading mb-2 px-1 flex items-center gap-1.5">
                              <Lock className="w-3 h-3 text-text-muted" />
                              <span>Deck Tidak Kompatibel ({incompatibleDecks.length}):</span>
                            </div>
                            <div className="space-y-1.5">
                              {incompatibleDecks.map(({ deck, reason }) => (
                                <div
                                  key={deck.id}
                                  className="p-2.5 rounded-xl border border-border-subtle/50 bg-surface-inset/40 opacity-55 flex items-center justify-between gap-3 text-text-muted cursor-not-allowed select-none shadow-[inset_1px_1px_3px_var(--neu-d)]"
                                  title={reason}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span className="text-base opacity-70">{deck.coverIcon || '📖'}</span>
                                    <span className="text-xs font-medium truncate text-text-secondary">{deck.title}</span>
                                  </div>
                                  <span className="text-[10px] text-rose-400 bg-rose-500/10 border border-border-subtle px-2 py-0.5 rounded-md shrink-0">
                                    {reason}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Empty state when no decks are compatible */
                      <div className="p-5 rounded-2xl bg-surface-inset border border-border-subtle shadow-[inset_2px_2px_6px_var(--neu-d),inset_-2px_-2px_6px_var(--neu-l)] text-center space-y-3">
                        <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-gold border border-border-subtle flex items-center justify-center mx-auto shadow-xs">
                          <AlertCircle className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-xs font-bold font-heading text-text-primary">
                            Belum Ada Deck yang Kompatibel
                          </p>
                          <p className="text-[11px] text-text-secondary mt-1 max-w-sm mx-auto">
                            {meta.requirementHint}. Silakan buat deck baru atau tambahkan materi tersebut ke Buku Saku kamu.
                          </p>
                        </div>
                        {onNavigateTab && (
                          <button
                            type="button"
                            onClick={() => {
                              playSound('click', soundEnabled);
                              onClose();
                              onNavigateTab('deck');
                            }}
                            className="btn-physical-secondary px-4 py-2 rounded-xl text-xs font-bold text-gold transition-all inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>Buka Buku Saku</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* SECTION 2: JUMLAH SOAL / KEDALAMAN LANTAI (CARVED TOKEN STONES) */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-text-muted font-heading flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-gold" />
              <span>2. Kedalaman Lantai Dungeon (Jumlah Soal):</span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {FLOOR_COUNT_OPTIONS.map((opt) => {
                const isSelected = selectedFloorCount === opt.count;
                return (
                  <button
                    key={opt.count}
                    type="button"
                    onClick={() => {
                      playSound('click', soundEnabled);
                      setSelectedFloorCount(opt.count);
                    }}
                    className={`py-3 px-2 rounded-2xl text-center transition-all select-none cursor-pointer ${
                      isSelected
                        ? 'bg-surface-elevated border border-border-subtle text-gold shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_4px_12px_rgba(0,0,0,0.4)]'
                        : 'bg-surface-inset hover:bg-surface-card/60 border border-border-subtle/60 shadow-[inset_1px_1px_3px_var(--neu-d)] hover:border-border-muted'
                    }`}
                  >
                    <span className={`block text-xs sm:text-sm font-heading font-black tracking-wide ${isSelected ? 'text-gold' : 'text-text-primary'}`}>
                      {opt.label}
                    </span>
                    <span className="block text-[10px] text-text-muted mt-0.5 font-mono font-semibold">
                      {opt.sub}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION 3: MODE EKSPLORASI (TACTILE ENGRAVED COIN CARDS) */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-text-muted font-heading flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-gold" />
              <span>3. Mode Eksplorasi:</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  playSound('click', soundEnabled);
                  setMode('standard');
                }}
                className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all select-none cursor-pointer ${
                  mode === 'standard'
                    ? 'bg-surface-elevated border border-border-muted text-text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_4px_12px_rgba(0,0,0,0.4)]'
                    : 'bg-surface-inset hover:bg-surface-card/60 border border-border-subtle/60 shadow-[inset_1px_1px_3px_var(--neu-d)]'
                }`}
              >
                {/* Sunken Coin Slot Icon */}
                <div className="w-9 h-9 rounded-xl bg-surface-inset border border-border-subtle flex items-center justify-center shrink-0 text-teal shadow-[inset_1.5px_1.5px_3px_var(--neu-d)]">
                  <Shield className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="block text-xs font-heading font-black text-text-primary truncate">
                    Mode Santai (Standard)
                  </span>
                  <span className="block text-[11px] text-text-muted font-body mt-0.5 leading-snug">
                    Fokus belajar tanpa batas waktu untuk memperdalam ingatan.
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  playSound('click', soundEnabled);
                  setMode('survival');
                }}
                className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all select-none cursor-pointer ${
                  mode === 'survival'
                    ? 'bg-surface-elevated border border-border-muted text-text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_4px_12px_rgba(0,0,0,0.4)]'
                    : 'bg-surface-inset hover:bg-surface-card/60 border border-border-subtle/60 shadow-[inset_1px_1px_3px_var(--neu-d)]'
                }`}
              >
                {/* Sunken Coin Slot Icon */}
                <div className="w-9 h-9 rounded-xl bg-surface-inset border border-border-subtle flex items-center justify-center shrink-0 text-rose-400 shadow-[inset_1.5px_1.5px_3px_var(--neu-d)]">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="block text-xs font-heading font-black text-text-primary truncate">
                    Mode Survival (Timer)
                  </span>
                  <span className="block text-[11px] text-text-muted font-body mt-0.5 leading-snug">
                    Batas waktu per soal untuk melatih kecepatan refleks tempur.
                  </span>
                </div>
              </button>
            </div>

            {/* Sub-panel Pilihan Durasi Timer Mode Survival */}
            {mode === 'survival' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3.5 rounded-2xl bg-surface-inset border border-border-subtle space-y-2.5 shadow-inner mt-2.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-heading font-bold text-rose-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Batas Waktu Per Soal:</span>
                  </span>
                  <span className="font-mono font-black text-rose-300 text-xs sm:text-sm bg-rose-500/15 px-2.5 py-0.5 rounded-lg border border-border-subtle">
                    ⏱️ {survivalSeconds} Detik
                  </span>
                </div>

                {/* Preset Pill Buttons */}
                <div className="grid grid-cols-5 gap-1.5">
                  {[
                    { sec: 15, label: '15s', desc: 'Kilat' },
                    { sec: 30, label: '30s', desc: 'Standar' },
                    { sec: 45, label: '45s', desc: 'Sedang' },
                    { sec: 60, label: '60s', desc: '1 Mnt' },
                    { sec: 90, label: '90s', desc: 'Santai' },
                  ].map(preset => {
                    const isSelected = survivalSeconds === preset.sec;
                    return (
                      <button
                        key={preset.sec}
                        type="button"
                        onClick={() => {
                          playSound('click', soundEnabled);
                          setSurvivalSeconds(preset.sec);
                        }}
                        className={`py-2 px-1 rounded-xl text-center transition-all cursor-pointer select-none ${
                          isSelected
                            ? 'seg-active text-gold font-bold scale-[1.03]'
                            : 'bg-surface-card hover:bg-surface-elevated text-text-secondary border border-border-subtle hover:text-text-primary'
                        }`}
                      >
                        <span className="block text-xs font-mono font-bold">{preset.label}</span>
                        <span className={`block text-[9px] ${isSelected ? 'text-white/80' : 'text-text-muted'}`}>
                          {preset.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Stepper for custom seconds */}
                <div className="flex items-center justify-between pt-1 border-t border-border-subtle/50 text-[11px] text-text-muted">
                  <span>Atur bebas durasi:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        playSound('click', soundEnabled);
                        setSurvivalSeconds(prev => Math.max(5, prev - 5));
                      }}
                      className="btn-physical-secondary w-7 h-7 rounded-lg font-mono font-bold flex items-center justify-center cursor-pointer p-0"
                    >
                      -5s
                    </button>
                    <span className="font-mono font-bold text-text-primary min-w-[42px] text-center">
                      {survivalSeconds}s
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        playSound('click', soundEnabled);
                        setSurvivalSeconds(prev => Math.min(180, prev + 5));
                      }}
                      className="btn-physical-secondary w-7 h-7 rounded-lg font-mono font-bold flex items-center justify-center cursor-pointer p-0"
                    >
                      +5s
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* SECTION 4: CARVED TREASURE REWARD PLAQUE */}
          <div className="p-3.5 rounded-2xl bg-surface-inset border border-border-subtle flex flex-wrap items-center justify-between gap-2.5 text-xs shadow-[inset_2px_2px_6px_var(--neu-d),inset_-1px_-1px_3px_var(--neu-l)]">
            <div className="flex items-center gap-2 text-text-secondary min-w-0">
              <div className="w-7 h-7 rounded-lg bg-surface-card border border-border-subtle flex items-center justify-center text-gold shadow-xs shrink-0">
                <Trophy className="w-3.5 h-3.5" />
              </div>
              <span className="font-heading font-bold text-text-secondary truncate">
                Estimasi Hadiah Ekspedisi:
              </span>
            </div>
            <div className="flex items-center gap-2.5 font-mono font-bold shrink-0">
              <span className="text-indigo bg-indigo/10 px-2.5 py-1 rounded-xl border border-border-subtle shadow-2xs">
                +{estimatedExp} EXP
              </span>
              <span className="text-gold bg-gold/10 px-2.5 py-1 rounded-xl border border-border-subtle flex items-center gap-1 shadow-2xs">
                <Coins className="w-3 h-3 text-gold shrink-0" />
                +{estimatedGold} G
              </span>
            </div>
          </div>
        </div>

        {/* ================= SKEUOMORPHIC FOOTER ================= */}
        <div className="relative z-10 p-3.5 sm:p-4 border-t border-border-subtle flex items-center justify-between gap-3 bg-surface-inset/90 shadow-[0_-3px_10px_rgba(0,0,0,0.2)]">
          {/* Debossed Wooden Button */}
          <button
            type="button"
            onClick={() => {
              playSound('click', soundEnabled);
              onClose();
            }}
            className="btn-physical-secondary shrink-0 whitespace-nowrap px-5 sm:px-6 py-3 rounded-2xl text-xs sm:text-sm font-heading font-bold transition-all cursor-pointer"
          >
            Batal
          </button>

          {/* Primary Skeuomorphic Action CTA Button */}
          <button
            type="button"
            disabled={isStartDisabled}
            onClick={handleStart}
            className={`flex-1 min-w-0 whitespace-nowrap flex items-center justify-center gap-2 sm:gap-2.5 px-4 sm:px-7 py-3 rounded-2xl font-heading font-black text-xs sm:text-sm transition-all select-none cursor-pointer ${
              isStartDisabled
                ? 'bg-surface-inset text-text-muted border border-border-subtle shadow-[inset_2px_2px_5px_var(--neu-d)] cursor-not-allowed opacity-50'
                : 'btn-cta hover:scale-[1.01] active:scale-[0.99] shadow-[4px_4px_14px_var(--neu-d),-2px_-2px_6px_var(--neu-l)]'
            }`}
          >
            <Swords className="w-4 h-4 text-gold shrink-0" />
            <span className="truncate">
              {isStartDisabled
                ? (dungeonType === 'flashcard' && selectedFlashcardTypes.length === 0
                  ? 'Pilih Minimal 1 Tipe Materi'
                  : dungeonType === 'conjugation' && conjugationMode === 'custom' && selectedConjugationForms.length === 0
                  ? 'Pilih Minimal 1 Pola'
                  : 'Pilih Deck yang Sesuai')
                : sourceType === 'deck'
                ? 'Mulai dengan Deck Pilihan'
                : 'Mulai Ekspedisi Dungeon'}
            </span>
            <ChevronRight className="w-4 h-4 shrink-0" />
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
};
