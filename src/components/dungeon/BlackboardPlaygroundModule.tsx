import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Volume2,
  Shuffle,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Layers,
  Search,
  Check,
  BookmarkPlus,
  Eye,
  EyeOff,
  Award,
  HelpCircle
} from 'lucide-react';
import { RubyText } from '../learning/RubyText';
import { playSound, speakJapanese } from '../../utils/audio';
import { VerbItem } from '../../data/conjugationRules';
import { GrammarPatternSchema, ConjugationForm } from '../../engine/types';
import { conjugateVerb, detectVerbGroup } from '../../engine/morphology/inflectionEngine';
import { synthesizeSentence } from '../../engine/synthesis/sentenceSynthesizer';
import { PATTERN_SCHEMAS } from '../../engine/syntax/patternSchemas';
import { UserDeck } from '../../types/rpg';

interface BlackboardPlaygroundModuleProps {
  verbs: VerbItem[];
  patterns?: GrammarPatternSchema[];
  levelCategory?: string;
  soundEnabled?: boolean;
  userDecks?: UserDeck[];
  onSaveToDeck?: (verb: VerbItem) => void;
  onFinishSession?: (exploredCount: number) => void;
}

function getVerbMeaning(v?: VerbItem | any): string {
  if (!v) return '';
  return v.meaningId || v.meaning || '';
}

function getVerbLevel(v?: VerbItem | any): string {
  if (!v) return 'N5';
  return v.level || (v.jlpt ? String(v.jlpt) : 'N5');
}

export const BlackboardPlaygroundModule: React.FC<BlackboardPlaygroundModuleProps> = ({
  verbs,
  patterns: initialPatterns,
  levelCategory = 'all',
  soundEnabled = true,
  userDecks,
  onSaveToDeck,
  onFinishSession,
}) => {
  // All patterns database
  const allPatterns = useMemo(() => {
    return initialPatterns && initialPatterns.length > 0
      ? initialPatterns
      : Object.values(PATTERN_SCHEMAS);
  }, [initialPatterns]);

  // Current active indices
  const [currentVerbIndex, setCurrentVerbIndex] = useState(0);
  const [activePatternId, setActivePatternId] = useState<string>(() => {
    return allPatterns.find(p => p.id === 'te_iru')?.id || allPatterns[0]?.id || 'te_iru';
  });

  // Display toggles
  const [showFurigana, setShowFurigana] = useState(true);
  const [showRomaji, setShowRomaji] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [exploredCount, setExploredCount] = useState(1);

  // Modals / Drawers
  const [showVerbPicker, setShowVerbPicker] = useState(false);
  const [showPatternPicker, setShowPatternPicker] = useState(false);
  const [verbSearchQuery, setVerbSearchQuery] = useState('');
  const [verbLevelFilter, setVerbLevelFilter] = useState<string>('all');
  const [patternLevelFilter, setPatternLevelFilter] = useState<string>('all');
  const [patternSearchQuery, setPatternSearchQuery] = useState('');
  const [bookmarkSuccess, setBookmarkSuccess] = useState(false);

  // Active verb & active pattern
  const activeVerb: VerbItem = useMemo(() => {
    if (verbs.length === 0) {
      return {
        id: 'verb_yomu',
        kanji: '読む',
        reading: 'よむ',
        romaji: 'yomu',
        meaningId: 'membaca',
        group: 'godan',
        level: 'N5',
        forms: {} as any,
        formsReadings: {} as any,
      };
    }
    return verbs[currentVerbIndex % verbs.length];
  }, [verbs, currentVerbIndex]);

  const activePattern: GrammarPatternSchema = useMemo(() => {
    return allPatterns.find(p => p.id === activePatternId) || allPatterns[0];
  }, [allPatterns, activePatternId]);

  // Conjugation and transformation calculation
  const transformation = useMemo(() => {
    if (!activeVerb || !activePattern) return null;

    const w = activeVerb.kanji;
    const r = activeVerb.reading;
    // Data kamus memakai grup 'irregular'; engine membedakan 'suru' / 'kuru'. Deteksi ulang untuk 'irregular'.
    const group = !activeVerb.group || activeVerb.group === 'irregular'
      ? detectVerbGroup(w, r)
      : activeVerb.group;
    const conjResult = conjugateVerb(w, r);

    const reqForm = (activePattern.requiredConjugation || 'jisho') as ConjugationForm;
    const conjugated = conjResult.forms[reqForm] || conjResult.forms.jisho;

    // Build the combined transformed word
    const suffix = activePattern.fixedSuffix || '';
    const fullJapanese = `${conjugated.japanese}${suffix}`;
    const fullReading = `${conjugated.reading}${suffix}`;

    // Compute transformation logic explanation
    let intermediateFormLabel = 'Bentuk Kamus (辞書形)';
    if (reqForm === 'te') intermediateFormLabel = 'Bentuk-Te (て形)';
    else if (reqForm === 'ta') intermediateFormLabel = 'Bentuk-Ta / Lampau (た形)';
    else if (reqForm === 'nai') intermediateFormLabel = 'Bentuk-Nai / Negatif (ない形)';
    else if (reqForm === 'masu_stem') intermediateFormLabel = 'Masu-Stem (ます語幹)';
    else if (reqForm === 'potential') intermediateFormLabel = 'Bentuk Potensial (可能形)';
    else if (reqForm === 'ba') intermediateFormLabel = 'Bentuk Pengandaian (ば形)';

    // Group explanation in Indonesian
    let groupExplanation = '';
    if (group === 'godan') {
      groupExplanation = 'Golongan 1 (Godan - 五段動詞): Mengubah vokal akhir kamus.';
    } else if (group === 'ichidan') {
      groupExplanation = 'Golongan 2 (Ichidan - 一段動詞): Menghilangkan akhiran る.';
    } else if (group === 'suru') {
      groupExplanation = 'Golongan 3 (Suru - 不規則動詞): Berubah mengikuti する ➔ し.';
    } else if (group === 'kuru') {
      groupExplanation = 'Golongan 3 (Kuru - 不規則動詞): Berubah mengikuti 来る ➔ き.';
    }

    // Meaning template synthesis
    const rawMeaning = getVerbMeaning(activeVerb);
    let transformedMeaning = activePattern.meaningTemplateId
      .replace('{predicate}', rawMeaning)
      .replace('{object}', '')
      .replace('di {location}', '')
      .replace('{location}', '')
      .replace(/\s+/g, ' ')
      .trim();

    // Contextual sentence synthesis
    let contextSentence: { japanese: string; reading: string; meaningId: string } | null = null;
    try {
      if (activePattern.example) {
        // Pola dari library: pakai contoh kalimat aslinya (sintesis hanya untuk pola bawaan engine).
        contextSentence = activePattern.example;
      } else {
        const synth = synthesizeSentence({
          patternId: activePattern.id,
          verbWord: activeVerb.kanji,
          verbReading: activeVerb.reading,
          verbMeaningId: rawMeaning,
        });
        if (synth) {
          contextSentence = {
            japanese: synth.japanese,
            reading: synth.reading,
            meaningId: synth.meaningId,
          };
        }
      }
    } catch {
      // Fallback example
      contextSentence = {
        japanese: `${fullJapanese}。`,
        reading: `${fullReading}。`,
        meaningId: `${transformedMeaning}.`,
      };
    }

    // Segment into Verb Stem vs Pattern Suffix for direct interaction and color coding
    const rawPattern = activePattern.pattern.replace('〜', '');
    const patLen = rawPattern.length;
    const verbJp = fullJapanese.slice(0, Math.max(1, fullJapanese.length - patLen));
    const patJp = fullJapanese.slice(Math.max(1, fullJapanese.length - patLen));

    let patRdLen = patLen;
    if (rawPattern === '前に') patRdLen = 3;
    const verbRd = fullReading.slice(0, Math.max(1, fullReading.length - patRdLen));
    const patRd = fullReading.slice(Math.max(1, fullReading.length - patRdLen));

    return {
      group,
      groupExplanation,
      reqForm,
      intermediateFormLabel,
      conjugatedStem: conjugated.japanese,
      conjugatedStemReading: conjugated.reading,
      suffix,
      fullJapanese,
      fullReading,
      verbSegment: {
        japanese: verbJp,
        reading: verbRd,
      },
      patternSegment: {
        japanese: patJp,
        reading: patRd,
      },
      transformedMeaning,
      contextSentence,
    };
  }, [activeVerb, activePattern]);

  // Handle Speech
  const handlePlayAudio = async (text: string) => {
    if (!text) return;
    playSound('click', soundEnabled);
    setIsSpeaking(true);
    try {
      await speakJapanese(text);
    } catch {
      // ignore
    } finally {
      setIsSpeaking(false);
    }
  };

  // Actions
  const handleNextVerb = () => {
    playSound('click', soundEnabled);
    setCurrentVerbIndex(prev => prev + 1);
    setExploredCount(prev => prev + 1);
  };

  const handlePrevVerb = () => {
    playSound('click', soundEnabled);
    setCurrentVerbIndex(prev => (prev > 0 ? prev - 1 : verbs.length - 1));
  };

  const handleRandomVerb = () => {
    playSound('click', soundEnabled);
    if (verbs.length <= 1) return;
    let nextIdx = Math.floor(Math.random() * verbs.length);
    if (nextIdx === currentVerbIndex) {
      nextIdx = (nextIdx + 1) % verbs.length;
    }
    setCurrentVerbIndex(nextIdx);
    setExploredCount(prev => prev + 1);
  };

  const handleRandomPattern = () => {
    playSound('click', soundEnabled);
    if (allPatterns.length <= 1) return;
    const otherPatterns = allPatterns.filter(p => p.id !== activePatternId);
    const pick = otherPatterns[Math.floor(Math.random() * otherPatterns.length)];
    if (pick) {
      setActivePatternId(pick.id);
      setExploredCount(prev => prev + 1);
    }
  };

  const handleShuffleBoth = () => {
    playSound('click', soundEnabled);
    handleRandomVerb();
    handleRandomPattern();
  };

  // Filtered lists for pickers
  const filteredVerbs = useMemo(() => {
    let list = verbs;
    if (verbLevelFilter !== 'all') {
      list = list.filter(v => getVerbLevel(v).toUpperCase() === verbLevelFilter.toUpperCase());
    }
    if (verbSearchQuery.trim()) {
      const q = verbSearchQuery.toLowerCase().trim();
      list = list.filter(
        v =>
          v.kanji.includes(q) ||
          v.reading.includes(q) ||
          getVerbMeaning(v).toLowerCase().includes(q) ||
          (v.romaji || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [verbs, verbLevelFilter, verbSearchQuery]);

  const filteredPatterns = useMemo(() => {
    let list = allPatterns;
    if (patternLevelFilter !== 'all') {
      list = list.filter(p => (p.jlpt || '').toUpperCase() === patternLevelFilter.toUpperCase());
    }
    const q = patternSearchQuery.toLowerCase().trim();
    if (q) {
      list = list.filter(
        p =>
          p.pattern.includes(q) ||
          p.title.toLowerCase().includes(q) ||
          (p.nuanceExplanation || '').toLowerCase().includes(q) ||
          p.meaningTemplateId.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allPatterns, patternLevelFilter, patternSearchQuery]);

  const handleBookmark = () => {
    if (onSaveToDeck && activeVerb) {
      playSound('click', soundEnabled);
      onSaveToDeck(activeVerb);
      setBookmarkSuccess(true);
      setTimeout(() => setBookmarkSuccess(false), 2000);
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4 max-w-4xl mx-auto px-1 sm:px-0">
      {/* ─────────────────────────────────────────────────────────────
          1. TOP STATUS & COMPACT CONTROLS BAR (Mobile Optimized)
          ───────────────────────────────────────────────────────────── */}
      <div className="panel p-2.5 sm:p-3.5 rounded-2xl border border-border-subtle bg-surface-card shadow-xs flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: Title & Progress Counter */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo/15 text-indigo border border-border-subtle flex items-center justify-center shrink-0 shadow-inner">
            <BookOpen className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-heading font-black text-xs sm:text-sm text-text-primary tracking-wide truncate">
                文法実験室 · Altar Pola & Kata
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-gold/15 text-gold border border-border-subtle shrink-0">
                {levelCategory === 'all' ? 'Semua Level' : levelCategory.toUpperCase()}
              </span>
            </div>
            <p className="text-[10.5px] sm:text-xs text-text-muted truncate">
              Kosakata #{currentVerbIndex + 1} dari {verbs.length} · Dieksplorasi {exploredCount}x
            </p>
          </div>
        </div>

        {/* Right: Toggle Buttons & Harvest Finish */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          {/* Furigana Toggle */}
          <button
            type="button"
            onClick={() => {
              playSound('click', soundEnabled);
              setShowFurigana(prev => !prev);
            }}
            className={`px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl border text-[11px] font-mono font-semibold transition-all flex items-center gap-1 shadow-2xs ${
              showFurigana
                ? 'bg-gold/15 text-gold border-border-subtle shadow-xs'
                : 'bg-surface-inset text-text-muted border-border-subtle hover:text-text-primary'
            }`}
            title="Tampilkan / Sembunyikan Furigana"
          >
            {showFurigana ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Furigana</span>
          </button>

          {/* Romaji Toggle */}
          <button
            type="button"
            onClick={() => {
              playSound('click', soundEnabled);
              setShowRomaji(prev => !prev);
            }}
            className={`px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl border text-[11px] font-mono font-semibold transition-all shadow-2xs ${
              showRomaji
                ? 'bg-indigo/15 text-indigo border-border-subtle shadow-xs'
                : 'bg-surface-inset text-text-muted border-border-subtle hover:text-text-primary'
            }`}
            title="Tampilkan / Sembunyikan Romaji"
          >
            <span>[Aa]</span>
          </button>

          {/* Shuffle Both Button */}
          <button
            type="button"
            onClick={handleShuffleBoth}
            className="btn-skeuo-gold px-2.5 py-1 sm:px-3 sm:py-1.5 text-[11px] sm:text-xs flex items-center gap-1 transition-all cursor-pointer"
            title="Acak Kata Kerja & Pola Kalimat Sekaligus"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>Acak</span>
          </button>

          {/* Finish / Harvest Button */}
          {onFinishSession && (
            <button
              type="button"
              onClick={() => {
                playSound('victory', soundEnabled);
                onFinishSession(exploredCount);
              }}
              className="btn-skeuo-indigo px-3 py-1 sm:px-3.5 sm:py-1.5 text-[11px] sm:text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Selesai belajar dan panen hadiah EXP"
            >
              <Award className="w-3.5 h-3.5 text-gold" />
              <span className="font-heading font-bold">Selesai</span>
            </button>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. THE AUTHENTIC JAPANESE RPG ALTAR / STUDY DESK (Skeuomorphic)
          ───────────────────────────────────────────────────────────── */}
      <div className="relative rounded-2xl sm:rounded-3xl p-2.5 sm:p-4 bg-surface-elevated panel-stitched border border-border-subtle shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_6px_20px_rgba(0,0,0,0.4)] overflow-hidden">
        {/* The Desk Surface (Sumi-e Charcoal Slate in Dark Mode, Antique Washi in Light Mode) */}
        <div
          className="relative rounded-xl sm:rounded-2xl p-3.5 sm:p-6 flex flex-col justify-between overflow-hidden bg-surface-inset border border-border-subtle shadow-[inset_1.5px_1.5px_6px_var(--neu-d)] transition-colors"
        >
          {/* Top Board Bar: Header & Shuffles */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border-subtle/70">
            {/* Left: Active Indicators */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-xs font-mono">
              <span className="font-bold text-text-muted flex items-center gap-1">
                <span>Kata:</span>
                <button
                  type="button"
                  onClick={() => {
                    playSound('click', soundEnabled);
                    setShowVerbPicker(true);
                  }}
                  className="px-2 py-0.5 rounded-md bg-indigo/15 border border-border-subtle text-indigo font-bold hover:bg-indigo/25 transition-all cursor-pointer flex items-center gap-1"
                  title="Klik untuk memilih kata kerja lain"
                >
                  <span>{activeVerb.kanji}</span>
                  <span className="text-[10px] opacity-70">({activeVerb.reading})</span>
                </button>
              </span>
              <span className="text-text-muted">·</span>
              <span className="font-bold text-text-muted flex items-center gap-1">
                <span>Pola:</span>
                <button
                  type="button"
                  onClick={() => {
                    playSound('click', soundEnabled);
                    setShowPatternPicker(true);
                  }}
                  className="px-2 py-0.5 rounded-md bg-gold/15 border border-border-subtle text-gold font-bold hover:bg-gold/25 transition-all cursor-pointer flex items-center gap-1"
                  title="Klik untuk memilih pola kalimat lain"
                >
                  <span>{activePattern.pattern}</span>
                </button>
              </span>
            </div>

            {/* Right: Mini Quick Shuffle Buttons */}
            <div className="flex items-center gap-1.5 ml-auto">
              <button
                type="button"
                onClick={handleRandomVerb}
                className="px-2 py-1 rounded-lg border border-border-subtle bg-surface-card hover:bg-surface-elevated text-[11px] font-mono font-medium transition-all text-text-secondary hover:text-text-primary active:scale-95 flex items-center gap-1 cursor-pointer shadow-2xs"
                title="Acak Kata Kerja Saja"
              >
                <Shuffle className="w-3 h-3 text-indigo" />
                <span className="text-[10.5px]">Acak Kata</span>
              </button>

              <button
                type="button"
                onClick={handleRandomPattern}
                className="px-2 py-1 rounded-lg border border-border-subtle bg-surface-card hover:bg-surface-elevated text-[11px] font-mono font-medium transition-all text-text-secondary hover:text-text-primary active:scale-95 flex items-center gap-1 cursor-pointer shadow-2xs"
                title="Acak Pola Kalimat Saja"
              >
                <Shuffle className="w-3 h-3 text-gold" />
                <span className="text-[10.5px]">Acak Pola</span>
              </button>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              CENTER HERO: THE TRANSFORMED RESULT (Responsive & Tactile)
              ───────────────────────────────────────────────────────────── */}
          <div className="py-4 sm:py-7 text-center space-y-3">
            <AnimatePresence mode="wait">
              {transformation && (
                <motion.div
                  key={`${activeVerb.kanji}_${activePattern.id}`}
                  initial={{ opacity: 0, scale: 0.96, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -8 }}
                  transition={{ duration: 0.18 }}
                  className="space-y-2.5"
                >
                  {/* Badge: Level & Pattern Title */}
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border-subtle bg-gold/10 text-xs font-mono text-text-primary shadow-xs">
                    <span className="font-mono font-black text-gold px-1.5 py-0.2 rounded bg-gold/20 whitespace-nowrap">
                      {activePattern.jlpt || 'N5'}
                    </span>
                    <span className="font-heading font-bold text-text-primary truncate max-w-[200px] sm:max-w-none">
                      {activePattern.title}
                    </span>
                  </div>

                  {/* Transformed Word: Clickable Verb Stem & Pattern Suffix */}
                  <div className="flex items-center justify-center gap-2 sm:gap-3 pt-1">
                    <div className="inline-flex items-center justify-center flex-wrap gap-x-1.5 select-none max-w-full">
                      {/* 1. KOTOBA (VERB STEM) - INTERACTIVE CLICKABLE */}
                      <button
                        type="button"
                        onClick={() => {
                          playSound('click', soundEnabled);
                          setShowVerbPicker(true);
                        }}
                        className="group/verb inline-flex flex-col items-center cursor-pointer transition-all duration-150 hover:scale-105 active:scale-95 px-2 sm:px-3 py-1 -my-1 rounded-xl border border-transparent hover:border-border-primary hover:bg-indigo/10"
                        title={`Klik untuk mengganti kata kerja dasar (${activeVerb.kanji})`}
                      >
                        <RubyText
                          japanese={transformation.verbSegment.japanese}
                          reading={transformation.verbSegment.reading}
                          showFurigana={showFurigana}
                          className="text-3xl sm:text-5xl md:text-6xl font-black font-jp tracking-tight text-indigo drop-shadow-xs"
                        />
                        <div className="flex items-center gap-1 mt-0.5 w-full justify-center">
                          <span className="h-0.5 w-full rounded-full bg-indigo/40 group-hover/verb:bg-indigo transition-all" />
                        </div>
                        <span className="text-[9.5px] font-mono text-indigo/80 font-bold mt-0.5">
                          Kata (Ketuk)
                        </span>
                      </button>

                      {/* 2. POLA (PATTERN SUFFIX) - INTERACTIVE CLICKABLE */}
                      <button
                        type="button"
                        onClick={() => {
                          playSound('click', soundEnabled);
                          setShowPatternPicker(true);
                        }}
                        className="group/pola inline-flex flex-col items-center cursor-pointer transition-all duration-150 hover:scale-105 active:scale-95 px-2 sm:px-3 py-1 -my-1 rounded-xl border border-transparent hover:border-border-primary hover:bg-gold/10"
                        title={`Klik untuk mengganti pola kalimat (${activePattern.pattern})`}
                      >
                        <RubyText
                          japanese={transformation.patternSegment.japanese}
                          reading={transformation.patternSegment.reading}
                          showFurigana={showFurigana}
                          className="text-3xl sm:text-5xl md:text-6xl font-black font-jp tracking-tight text-gold drop-shadow-xs"
                        />
                        <div className="flex items-center gap-1 mt-0.5 w-full justify-center">
                          <span className="h-0.5 w-full rounded-full bg-gold/40 group-hover/pola:bg-gold transition-all" />
                        </div>
                        <span className="text-[9.5px] font-mono text-gold/80 font-bold mt-0.5">
                          Pola (Ketuk)
                        </span>
                      </button>

                      {/* Pronunciation Audio Button */}
                      <button
                        type="button"
                        onClick={() => handlePlayAudio(transformation.fullJapanese)}
                        disabled={isSpeaking}
                        className="btn-physical-secondary p-2.5 sm:p-3 rounded-xl sm:rounded-2xl transition-all cursor-pointer shrink-0 ml-1.5 sm:ml-2"
                        title="Dengarkan pelafalan hasil perubahan"
                      >
                        <Volume2 className={`w-5 h-5 sm:w-5.5 sm:h-5.5 ${isSpeaking ? 'animate-bounce text-gold' : 'text-text-secondary'}`} />
                      </button>
                    </div>
                  </div>

                  {/* Romaji & Meaning Output */}
                  <div className="space-y-1 pt-0.5">
                    {showRomaji && (
                      <p className="text-xs sm:text-sm font-mono font-medium text-text-muted">
                        <span className="text-indigo font-bold">{activeVerb.romaji}</span>
                        {' + '}
                        <span className="text-gold font-bold">{activePattern.pattern.replace('〜', '')}</span>
                        {' ➔ '}{transformation.fullReading}
                      </p>
                    )}
                    <div className="inline-block px-3.5 sm:px-4 py-1.5 rounded-xl bg-surface-card border border-border-subtle shadow-xs max-w-full">
                      <p className="text-sm sm:text-base md:text-lg font-bold text-text-primary font-heading">
                        "{transformation.transformedMeaning}"
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              BOTTOM DESK AREA: FORMULA LOGIC & CONTEXT SENTENCE
              ───────────────────────────────────────────────────────────── */}
          {transformation && (
            <div className="pt-3 border-t border-border-subtle/70 grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs font-mono">
              {/* Left Column: Logika Perubahan (Formula) */}
              <div className="p-2.5 sm:p-3 rounded-xl border border-border-subtle bg-surface-card/70 space-y-1 shadow-2xs">
                <div className="flex items-center gap-1.5 font-bold text-text-primary">
                  <span>Logika Perubahan:</span>
                </div>
                <div className="text-text-secondary space-y-0.5 text-[11px] sm:text-xs">
                  <p>
                    • <span className="font-bold text-text-primary">{activeVerb.kanji}</span>:{' '}
                    <span className="text-indigo font-bold">{transformation.groupExplanation}</span>
                  </p>
                  <p>
                    • Menjadi <span className="font-bold text-text-primary">{transformation.intermediateFormLabel}</span>: 「
                    <span className="text-indigo font-bold">{transformation.conjugatedStem}</span>」
                  </p>
                  <p>
                    • Sambung rumus 「<span className="text-gold font-bold">{transformation.suffix}</span>」 ➔ 「
                    <span className="font-bold text-text-primary">{transformation.fullJapanese}</span>」
                  </p>
                </div>
              </div>

              {/* Right Column: Contoh Kalimat Alami (Context Sentence) */}
              {transformation.contextSentence && (
                <div className="p-2.5 sm:p-3 rounded-xl border border-border-subtle bg-surface-card/70 space-y-1 shadow-2xs">
                  <div className="flex items-center justify-between gap-1.5 font-bold text-text-primary">
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-indigo shrink-0" />
                      <span>Contoh Kalimat:</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handlePlayAudio(transformation.contextSentence?.japanese || '')}
                      className="p-1 rounded-md hover:bg-surface-elevated text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                      title="Dengarkan kalimat"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="space-y-0.5 text-[11px] sm:text-xs">
                    <p className="font-jp font-bold text-text-primary">
                      {transformation.contextSentence.japanese}
                    </p>
                    <p className="text-[10px] text-text-muted">
                      {transformation.contextSentence.reading}
                    </p>
                    <p className="text-[11px] text-gold font-medium italic">
                      "{transformation.contextSentence.meaningId}"
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. NAVIGATION BAR (PREV / NEXT VERB & BOOKMARK) - 1 ROW MOBILE
          ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handlePrevVerb}
          className="btn-skeuo-indigo px-3 py-2 text-xs flex items-center gap-1.5 transition-all cursor-pointer flex-1 sm:flex-none justify-center"
        >
          <ChevronLeft className="w-4 h-4 shrink-0" />
          <span className="truncate">Sebelumnya</span>
        </button>

        {onSaveToDeck && (
          <button
            type="button"
            onClick={handleBookmark}
            className={`px-3 py-2 rounded-xl border text-xs font-heading font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer shrink-0 ${
              bookmarkSuccess
                ? 'bg-emerald-500/20 text-emerald-400 border-border-subtle'
                : 'bg-surface-card hover:bg-surface-elevated text-text-primary border-border-subtle'
            }`}
          >
            {bookmarkSuccess ? <Check className="w-4 h-4 text-emerald-400" /> : <BookmarkPlus className="w-4 h-4 text-gold" />}
            <span className="hidden sm:inline">{bookmarkSuccess ? 'Tersimpan!' : 'Buku Saku'}</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleNextVerb}
          className="btn-skeuo-indigo px-3 py-2 text-xs flex items-center gap-1.5 transition-all cursor-pointer flex-1 sm:flex-none justify-center"
        >
          <span className="truncate">Berikutnya</span>
          <ChevronRight className="w-4 h-4 shrink-0" />
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. INFORMATIVE NOTICE: KOTOBA & POLA BISA DIUBAH DENGAN KLIK
          (Replaces the Bulky 300px Matrix Grid with a Sleek Notice)
          ───────────────────────────────────────────────────────────── */}
      <div className="panel p-3 sm:p-3.5 rounded-2xl border border-border-subtle bg-surface-card shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-indigo/15 text-indigo border border-border-subtle flex items-center justify-center shrink-0 shadow-inner mt-0.5 sm:mt-0">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <div className="text-xs">
            <p className="font-heading font-bold text-text-primary flex items-center gap-1">
              <span>Eksplorasi Interaktif Bebas</span>
            </p>
            <p className="text-text-muted text-[11px] leading-snug">
              Ketuk langsung teks <span className="text-indigo font-bold underline cursor-pointer" onClick={() => setShowVerbPicker(true)}>Kata</span> atau <span className="text-gold font-bold underline cursor-pointer" onClick={() => setShowPatternPicker(true)}>Pola</span> di atas untuk mengganti ribuan variasi kata & tata bahasa.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => {
              playSound('click', soundEnabled);
              setShowVerbPicker(true);
            }}
            className="btn-physical-secondary flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-indigo text-xs font-heading font-bold transition-all cursor-pointer"
          >
            📖 Pilih Kata
          </button>
          <button
            type="button"
            onClick={() => {
              playSound('click', soundEnabled);
              setShowPatternPicker(true);
            }}
            className="btn-physical-secondary flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-gold text-xs font-heading font-bold transition-all cursor-pointer"
          >
            📑 Pilih Pola
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          5. MODAL PICKER: PILIH KATA KERJA (VERB DRAWER)
          ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showVerbPicker && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-4 bg-black/60">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="panel panel-stitched p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-border-subtle bg-surface-card w-full max-w-xl max-h-[85vh] flex flex-col space-y-3.5 shadow-2xl"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-2.5 border-b border-border-subtle">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-indigo" />
                  <h3 className="font-heading font-black text-base sm:text-lg text-text-primary">
                    Pilih Kata Kerja (動詞)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowVerbPicker(false)}
                  className="p-1.5 rounded-xl hover:bg-surface-inset text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Search & Level Filters */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    value={verbSearchQuery}
                    onChange={e => setVerbSearchQuery(e.target.value)}
                    placeholder="Cari kanji, bacaan, arti..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-surface-inset border border-border-subtle text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-primary"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pb-1">
                  {['all', 'N5', 'N4', 'N3', 'Kaigo'].map(lvl => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setVerbLevelFilter(lvl)}
                      className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border ${
                        verbLevelFilter === lvl
                          ? 'bg-surface-elevated border-text-primary/40 text-text-primary shadow-xs ring-1 ring-border-primary'
                          : 'bg-surface-inset border-border-subtle text-text-muted hover:text-text-primary'
                      }`}
                    >
                      {lvl === 'all' ? 'Semua' : lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Verbs List */}
              <div className="overflow-y-auto space-y-1.5 max-h-[48vh] pr-1 scrollbar-thin">
                {filteredVerbs.length === 0 ? (
                  <p className="text-center py-8 text-xs text-text-muted">
                    Tidak ditemukan kosakata yang cocok.
                  </p>
                ) : (
                  <>
                    {filteredVerbs.slice(0, 100).map((v, idx) => {
                      const isSelected = v.kanji === activeVerb.kanji;
                      return (
                        <div
                          key={`${v.kanji}_${idx}`}
                          onClick={() => {
                            playSound('click', soundEnabled);
                            const realIdx = verbs.findIndex(x => x.kanji === v.kanji);
                            if (realIdx >= 0) setCurrentVerbIndex(realIdx);
                            setShowVerbPicker(false);
                            setExploredCount(prev => prev + 1);
                          }}
                          className={`p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'bg-indigo/15 border-border-subtle text-text-primary shadow-xs'
                              : 'bg-surface-inset border-border-subtle hover:bg-surface-elevated text-text-secondary hover:text-text-primary'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-base sm:text-lg font-bold font-jp text-text-primary">
                              {v.kanji}
                            </span>
                            <div>
                              <p className="text-[11px] sm:text-xs font-jp text-text-muted">{v.reading}</p>
                              <p className="text-xs font-medium text-text-primary">{getVerbMeaning(v)}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-card text-text-muted border border-border-subtle">
                              {getVerbLevel(v)}
                            </span>
                            {isSelected && <Check className="w-4 h-4 text-indigo shrink-0" />}
                          </div>
                        </div>
                      );
                    })}
                    {filteredVerbs.length > 100 && (
                      <p className="text-center py-2 text-[11px] font-mono text-text-muted">
                        Menampilkan 100 dari {filteredVerbs.length} kata (ketik di kolom cari untuk mempersempit).
                      </p>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────────────────────────────────────────────────────────────
          6. MODAL PICKER: PILIH POLA KALIMAT (PATTERN DRAWER)
          ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showPatternPicker && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-4 bg-black/60">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="panel panel-stitched p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-border-subtle bg-surface-card w-full max-w-xl max-h-[85vh] flex flex-col space-y-3.5 shadow-2xl"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-2.5 border-b border-border-subtle">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-gold" />
                  <h3 className="font-heading font-black text-base sm:text-lg text-text-primary">
                    Pilih Pola Kalimat (文法パターン)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPatternPicker(false)}
                  className="p-1.5 rounded-xl hover:bg-surface-inset text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  value={patternSearchQuery}
                  onChange={e => setPatternSearchQuery(e.target.value)}
                  placeholder="Cari pola, judul, arti..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-surface-inset border border-border-subtle text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-primary"
                />
              </div>

              {/* Level Filter */}
              <div className="flex flex-wrap items-center gap-1.5 pb-1">
                {['all', 'N5', 'N4', 'N3', 'N2'].map(lvl => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setPatternLevelFilter(lvl)}
                    className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                      patternLevelFilter === lvl
                        ? 'seg-active text-gold font-black'
                        : 'bg-surface-inset text-text-muted hover:text-text-primary'
                    }`}
                  >
                    {lvl === 'all' ? 'Semua Level' : lvl}
                  </button>
                ))}
              </div>

              {/* Patterns List */}
              <div className="overflow-y-auto space-y-1.5 max-h-[48vh] pr-1 scrollbar-thin">
                {filteredPatterns.map(p => {
                  const isSelected = p.id === activePatternId;
                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        playSound('click', soundEnabled);
                        setActivePatternId(p.id);
                        setShowPatternPicker(false);
                        setExploredCount(prev => prev + 1);
                      }}
                      className={`p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-gold/15 border-border-subtle text-text-primary shadow-xs'
                          : 'bg-surface-inset border-border-subtle hover:bg-surface-elevated text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-black font-jp text-gold">
                            {p.pattern}
                          </span>
                          <span className="text-xs font-bold text-text-primary">{p.title}</span>
                        </div>
                        <p className="text-[11px] sm:text-xs text-text-muted mt-0.5 line-clamp-1">
                          {p.nuanceExplanation || p.meaningTemplateId}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-card text-text-muted border border-border-subtle">
                          {p.jlpt || 'N5'}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-gold shrink-0" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
