import { getWordTypeLabel } from '../../utils/wordType';
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Volume2, ArrowRight, ArrowLeft, Edit3 } from 'lucide-react';
import { BookIcon } from '../ui/EngravingIcons';
import { KotobaItem, Question } from '../../types/content';
import { KOTOBA_DATABASE } from '../../data/kotoba';
import { BUNPOU_DATABASE } from '../../data/bunpou';
import { QuizEngine } from './QuizEngine';
import { speakJapanese, playSound } from '../../utils/audio';
import { RubyText } from './RubyText';
import { UniversalFlashcard } from './UniversalFlashcard';
import { KotobaDetailModal } from '../library/KotobaDetailModal';
import { KotobaWritingPractice } from './KotobaWritingPractice';
import { fisherYatesShuffle } from '../../utils/smartRandomizer';
import { conjugateVerb } from '../../engine/morphology/inflectionEngine';

interface KotobaModuleProps {
  kotobaIds: string[];
  bunpouIds?: string[];
  onReward: (exp: number, gold: number, moduleId: string, itemId?: string, score?: number, total?: number) => void;
  onBack: () => void;
  playerMp: number;
  playerInt: number;
  onUseMp: (amount: number) => boolean;
  soundEnabled?: boolean;
  furiganaEnabled?: boolean;
}

export const KotobaModule: React.FC<KotobaModuleProps> = ({
  kotobaIds,
  bunpouIds = [],
  onReward,
  onBack: _onBack,
  playerMp,
  playerInt,
  onUseMp,
  soundEnabled = true,
  furiganaEnabled = true,
}) => {
  const [activeTab, setActiveTab] = useState<'library' | 'flashcard' | 'writing'>('library');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [selectedWritingIndex, setSelectedWritingIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [expPopup, setExpPopup] = useState(false);
  const [isQuizActive, setIsQuizActive] = useState(false);
  const [selectedItem, setSelectedItem] = useState<KotobaItem | null>(null);

  const fallbackKotobaItem: KotobaItem = useMemo(() => {
    return Object.values(KOTOBA_DATABASE)[0] || {
      id: 'kotoba_0001',
      word: '私',
      reading: 'わたし',
      meaningId: 'Saya / Aku',
      meaningEn: 'I / me',
      meaningJa: '自分を指す言葉。',
      jlpt: 'N5',
      wordType: 'noun',
      kanjiComponents: ['私']
    };
  }, []);

  // Items dedicated to this stage
  const items: KotobaItem[] = useMemo(() => {
    let validItems = (kotobaIds || []).map(id => KOTOBA_DATABASE[id]).filter(Boolean);
    if (validItems.length === 0) {
      validItems = Object.values(KOTOBA_DATABASE).slice(0, 5);
    }
    return validItems;
  }, [kotobaIds]);

  const currentItem = items[currentCardIndex] || items[0] || fallbackKotobaItem;
  const currentWritingItem = items[selectedWritingIndex] || items[0] || fallbackKotobaItem;

  // Detect if any bunpou in this stage teaches verb/adjective conjugation patterns
  const detectedConjugations = useMemo(() => {
    if (!bunpouIds || bunpouIds.length === 0) return [];
    const forms: Array<{ key: 'te' | 'masu' | 'nai' | 'ta' | 'potential' | 'volitional' | 'ba'; name: string }> = [];

    for (const id of bunpouIds) {
      const bp = BUNPOU_DATABASE[id];
      if (!bp) continue;
      const str = `${bp.title} ${bp.meaningId || ''} ${bp.formula || ''}`.toLowerCase();
      if ((str.includes('て形') || str.includes('te-form') || str.includes('~て') || str.includes('〜て')) && !forms.some(f => f.key === 'te')) {
        forms.push({ key: 'te', name: 'Bentuk ~て (Te-form)' });
      }
      if ((str.includes('ます形') || str.includes('masu-form') || str.includes('~ます') || str.includes('〜ます')) && !forms.some(f => f.key === 'masu')) {
        forms.push({ key: 'masu', name: 'Bentuk ~ます (Masu-form)' });
      }
      if ((str.includes('ない形') || str.includes('nai-form') || str.includes('~ない') || str.includes('〜ない')) && !forms.some(f => f.key === 'nai')) {
        forms.push({ key: 'nai', name: 'Bentuk ~ない (Nai-form)' });
      }
      if ((str.includes('た形') || str.includes('ta-form') || str.includes('~た') || str.includes('〜た')) && !forms.some(f => f.key === 'ta')) {
        forms.push({ key: 'ta', name: 'Bentuk ~た (Ta-form/Lampau)' });
      }
      if ((str.includes('可能') || str.includes('potential') || str.includes('bisa')) && !forms.some(f => f.key === 'potential')) {
        forms.push({ key: 'potential', name: 'Bentuk Potensial (Bisa/Dapat)' });
      }
    }
    return forms;
  }, [bunpouIds]);

  // Helper to check clean Indonesian translation
  const isCleanIndonesian = (text?: string) => {
    if (!text || text.trim().length === 0) return false;
    if (text.includes(';') || text.includes('(') || text.includes(')')) return false;
    if (/^(to |the |a |an |in |on |of |at |for |with |and )\b/i.test(text.trim())) return false;
    return true;
  };

  // Specific semantic distractors for greeting/time
  const GREETING_DISTRACTORS = ['Selamat siang', 'Selamat malam', 'Sampai jumpa', 'Terima kasih', 'Sama-sama', 'Permisi', 'Maaf', 'Halo'];
  const TIME_DISTRACTORS = ['Kemarin', 'Besok lusa', 'Tadi malam', 'Minggu depan', 'Bulan lalu', 'Tahun ini', 'Hari ini', 'Sekarang'];

  // Generate dynamic, multi-faceted questions matching the exact stage vocabulary
  const compiledQuizQuestions: Question[] = useMemo(() => {
    const list: Question[] = [];

    items.forEach((item, itemIdx) => {
      const isGreeting = ['expression', 'interjection'].includes(item.wordType) || /^(おはよう|こんにちは|こんばんは|さようなら|ありがとう)/.test(item.word);
      const isTimeWord = /^(きょう|きのう|あした|あさ|ひる|よる|こんばん|まいあさ)/.test(item.reading || item.word) || /\b(pagi|siang|malam|besok|kemarin|hari ini)\b/i.test(item.meaningId);

      // Find suitable distractors from other words in KOTOBA_DATABASE
      const otherKotoba = Object.values(KOTOBA_DATABASE).filter(k => 
        k.id !== item.id && 
        isCleanIndonesian(k.meaningId) && 
        k.meaningId.toLowerCase() !== item.meaningId.toLowerCase()
      );

      // ─── 1. SOAL TEBAK ARTI (Arti Kosakata Bahasa Indonesia) ───
      let meaningDistractors: string[] = [];
      if (isGreeting) {
        meaningDistractors = GREETING_DISTRACTORS.filter(d => d.toLowerCase() !== item.meaningId.toLowerCase());
      } else if (isTimeWord) {
        meaningDistractors = TIME_DISTRACTORS.filter(d => d.toLowerCase() !== item.meaningId.toLowerCase());
      } else {
        const sameType = otherKotoba.filter(k => k.wordType === item.wordType);
        const pool = sameType.length >= 3 ? sameType : otherKotoba;
        meaningDistractors = Array.from(new Set(pool.map(p => p.meaningId))).slice(0, 5);
      }
      meaningDistractors = fisherYatesShuffle(meaningDistractors).slice(0, 3);
      while (meaningDistractors.length < 3) {
        meaningDistractors.push(['Melakukan kegiatan', 'Menyatakan keadaan', 'Benda di sekitar'][meaningDistractors.length]);
      }
      const meaningOptions = fisherYatesShuffle([item.meaningId, ...meaningDistractors]);

      list.push({
        id: `kotoba_arti_${item.id}_${itemIdx}`,
        instruction: '次の言葉の意味として最も適切なものを一つ選びなさい。',
        instructionId: 'Pilihlah arti yang paling tepat untuk kosakata berikut.',
        prompt: item.word,
        ruby: item.reading,
        translation: item.meaningId,
        audioPrompt: item.word,
        options: meaningOptions,
        correctIndex: meaningOptions.indexOf(item.meaningId),
        explanation: `Kata 「${item.word}」 (${item.reading || item.word}) memiliki arti "${item.meaningId}".`
      });

      // ─── 2. SOAL TEBAK CARA BACA (Hiragana/Reading) ───
      // Hanya dibuat jika kata mengandung kanji (word != reading)
      if (item.reading && item.word !== item.reading) {
        const otherReadings = otherKotoba
          .map(k => k.reading)
          .filter(r => r && r !== item.reading && r.length >= (item.reading?.length || 2) - 1 && r.length <= (item.reading?.length || 2) + 2);
        
        const readingDistractors = fisherYatesShuffle(Array.from(new Set(otherReadings))).slice(0, 3);
        const fallbackReadings = ['わたし', 'あなた', 'にほん', 'これ', 'それ', 'あした', 'きょう'];
        while (readingDistractors.length < 3) {
          const fb = fallbackReadings.find(f => f !== item.reading && !readingDistractors.includes(f)) || 'ことば';
          readingDistractors.push(fb);
        }

        const readingOptions = fisherYatesShuffle([item.reading, ...readingDistractors]);

        list.push({
          id: `kotoba_reading_${item.id}_${itemIdx}`,
          instruction: '___の言葉の正しい読み方（ひらがな）を一つ選びなさい。',
          instructionId: 'Pilihlah cara baca (hiragana) yang benar untuk kosakata berikut.',
          prompt: item.word,
          ruby: undefined, // Sembunyikan ruby agar furigana tidak bocor di soal cara baca
          translation: item.meaningId,
          audioPrompt: item.word,
          options: readingOptions,
          correctIndex: readingOptions.indexOf(item.reading),
          explanation: `Cara baca (furigana) yang benar untuk 「${item.word}」 adalah 「${item.reading}」.`
        });
      }

      // ─── 3. SOAL LENGKAPI KALIMAT (Konteks Contoh Kalimat) ───
      if (item.exampleSentence && item.exampleSentence.japanese && item.exampleSentence.japanese.includes(item.word)) {
        const promptSentence = item.exampleSentence.japanese.replace(item.word, '（　）');
        const sentenceDistractors = fisherYatesShuffle(
          Array.from(new Set(otherKotoba.filter(k => k.wordType === item.wordType || k.jlpt === item.jlpt).map(k => k.word)))
        ).filter(w => w !== item.word).slice(0, 3);

        while (sentenceDistractors.length < 3) {
          sentenceDistractors.push(['これ', 'それ', '私', '日本'][sentenceDistractors.length]);
        }

        const sentenceOptions = fisherYatesShuffle([item.word, ...sentenceDistractors]);

        list.push({
          id: `kotoba_context_${item.id}_${itemIdx}`,
          instruction: '（　）に入れるのに最も適した言葉を一つ選びなさい。',
          instructionId: 'Lengkapilah kalimat berikut dengan kosakata yang tepat.',
          prompt: promptSentence,
          ruby: undefined,
          translation: item.exampleSentence.meaningId,
          audioPrompt: item.word,
          options: sentenceOptions,
          correctIndex: sentenceOptions.indexOf(item.word),
          explanation: `Kalimat lengkap: 「${item.exampleSentence.japanese}」 (${item.exampleSentence.meaningId}). Kata yang tepat adalah 「${item.word}」.`
        });
      }

      // ─── 4. SOAL PERUBAHAN KONJUGASI KATA (Jika Kata Kerja / Sifat & Stage Memiliki Pola) ───
      const isVerb = item.wordType === 'verb';
      if (isVerb && detectedConjugations.length > 0) {
        try {
          const conj = conjugateVerb(item.word, item.reading);
          if (conj && conj.forms) {
            detectedConjugations.forEach(conjPattern => {
              const formResult = conj.forms[conjPattern.key];
              if (formResult && formResult.japanese) {
                const correctForm = formResult.japanese;
                // Distractors from other forms of the same verb
                const allForms = Object.values(conj.forms).map(f => f.japanese).filter(f => f !== correctForm);
                const conjDistractors = fisherYatesShuffle(Array.from(new Set(allForms))).slice(0, 3);
                while (conjDistractors.length < 3) {
                  conjDistractors.push(correctForm + 'る', correctForm + 'ます', correctForm + 'ない');
                }

                const conjOptions = fisherYatesShuffle([correctForm, ...conjDistractors.slice(0, 3)]);

                list.push({
                  id: `kotoba_conj_${item.id}_${conjPattern.key}`,
                  instruction: `「${item.word}」の【${conjPattern.name}】として最も適切なものを一つ選びなさい。`,
                  instructionId: `Pilihlah perubahan bentuk (${conjPattern.name}) yang tepat untuk kata kerja berikut.`,
                  prompt: item.word,
                  ruby: item.reading,
                  translation: item.meaningId,
                  audioPrompt: correctForm,
                  options: conjOptions,
                  correctIndex: conjOptions.indexOf(correctForm),
                  explanation: `Kata kerja 「${item.word}」 (${item.reading || item.word}) jika diubah ke ${conjPattern.name} menjadi 「${correctForm}」.`
                });
              }
            });
          }
        } catch (_err) {
          // If conjugation fails for non-standard item, gracefully skip
        }
      }
    });

    return list;
  }, [items, detectedConjugations]);

  const handlePlayAudio = (word: string, reading?: string) => {
    speakJapanese(reading || word);
  };

  const handleFlipCard = () => {
    if (!isFlipped) {
      onReward(0.01, 0, 'kotoba_flip');
      setExpPopup(true);
      setTimeout(() => setExpPopup(false), 800);
    }
    setIsFlipped(!isFlipped);
    playSound('click', soundEnabled);
  };

  const handleNextCard = () => {
    setIsFlipped(false);
    if (currentCardIndex < items.length - 1) {
      setCurrentCardIndex(prev => prev + 1);
      playSound('click', soundEnabled);
    }
  };

  const handlePrevCard = () => {
    setIsFlipped(false);
    if (currentCardIndex > 0) {
      setCurrentCardIndex(prev => prev - 1);
      playSound('click', soundEnabled);
    }
  };

  const handleStartQuiz = () => {
    playSound('click', soundEnabled);
    setIsQuizActive(true);
  };

  // Quiz mode: dynamically renders the exact questions compiled for this stage's kotoba
  if (isQuizActive) {
    return (
      <div className="w-full space-y-4">
        <QuizEngine
          title={`📝 Latihan Kosakata Stage (${compiledQuizQuestions.length} Soal)`}
          questions={compiledQuizQuestions}
          playerMp={playerMp}
          playerInt={playerInt}
          onUseMp={onUseMp}
          soundEnabled={soundEnabled}
          furiganaEnabled={furiganaEnabled}
          onComplete={(score, total, exp, gold) => {
            onReward(exp, gold, 'kotoba', items[0]?.id || 'kotoba_set', score, total);
          }}
          onExit={() => {
            setIsQuizActive(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5 animate-fade-in">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <span className="p-2.5 rounded-2xl bg-surface-elevated text-indigo shadow-sm border border-border-subtle">
            <BookIcon className="w-6 h-6" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-text-primary font-heading flex items-center gap-2">
              Modul 2: 📝 KOTOBA (Kosakata)
            </h2>
            <p className="text-xs text-text-secondary">
              Pelajari {items.length} kosakata hari ini lewat Pustaka, Flashcard, Latihan Tulis Canvas & Kuis
            </p>
          </div>
        </div>

        {/* Tab Switcher: Pustaka, Flashcard, Tulis Canvas, Latihan (X) */}
        <div className="flex flex-wrap items-center gap-1.5 bg-surface-inset p-1 rounded-2xl border border-border-subtle">
          <button
            onClick={() => {
              setActiveTab('library');
              playSound('click', soundEnabled);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'library'
                ? 'seg-active text-gold'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            📖 Pustaka
          </button>

          <button
            onClick={() => {
              setActiveTab('flashcard');
              playSound('click', soundEnabled);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'flashcard'
                ? 'seg-active text-gold'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            🗂️ Flashcard
          </button>

          <button
            onClick={() => {
              setActiveTab('writing');
              playSound('click', soundEnabled);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              activeTab === 'writing'
                ? 'seg-active text-gold'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Tulis Canvas</span>
          </button>

          <button
            onClick={handleStartQuiz}
            className="btn-physical-secondary px-3 py-1.5 rounded-xl text-xs font-bold text-gold transition-all flex items-center gap-1.5"
          >
            🎯 Latihan ({compiledQuizQuestions.length})
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'library' && (
        <div className="space-y-3">
          <div className="p-4 rounded-2xl bg-surface-card panel-stitched border border-border-subtle">
            <h3 className="text-sm font-bold text-text-primary font-heading mb-1">Materi Kosakata (Kotoba)</h3>
            <p className="text-xs text-text-secondary">
              Pelajari daftar kosakata di bawah ini dengan saksama. Anda dapat mendengar pengucapan asli, melihat cara baca, maupun beralih ke Mode Tulis Canvas atau Latihan ({compiledQuizQuestions.length} Soal) untuk mendapatkan EXP!
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {items.map((item, index) => (
              <div
                key={item.id}
                onClick={() => {
                  setSelectedItem(item);
                  playSound('click', soundEnabled);
                }}
                className="flex items-start gap-3 p-3.5 rounded-2xl bg-surface-card border border-border-subtle hover:bg-surface-elevated transition-colors cursor-pointer group"
              >
                <div className="shrink-0 w-7 h-7 rounded-full bg-surface-inset flex items-center justify-center text-[10px] font-bold text-indigo border border-border-subtle">
                  #{index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <div>
                      <h4 className="text-lg font-black text-text-primary font-jp mb-0.5 flex items-end gap-1.5">
                        <RubyText japanese={item.word} reading={item.reading} showFurigana={furiganaEnabled} />
                      </h4>
                      <p className="text-xs font-bold text-gold mb-1">{item.meaningId}</p>
                      <p className="text-[10px] text-text-muted">Tipe: {getWordTypeLabel(item.wordType)}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayAudio(item.word, item.reading);
                      }}
                      className="btn-physical-secondary p-1.5 rounded-lg hover:text-indigo transition-colors"
                      title="Dengar Audio"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'flashcard' && (
        <div className="space-y-4">
          {/* Card Progress */}
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>Kata <strong className="text-indigo font-bold">{currentCardIndex + 1}</strong> dari {items.length}</span>
            <span className="font-mono text-gold font-bold">Total: {items.length}</span>
          </div>

          {/* Interactive 3D Flip Card */}
          <div className="relative">
            <AnimatePresence>
              {expPopup && (
                <motion.div
                  key="expPopup"
                  initial={{ opacity: 0, y: 0, scale: 0.5 }}
                  animate={{ opacity: 1, y: -40, scale: 1.2 }}
                  exit={{ opacity: 0, y: -60 }}
                  className="absolute top-4 right-4 sm:top-8 sm:right-8 z-50 text-state-success font-black text-xl drop-shadow-md pointer-events-none flex items-center gap-1"
                >
                  +0.01 EXP
                </motion.div>
              )}
            </AnimatePresence>
            <UniversalFlashcard
              item={currentItem}
              isFlipped={isFlipped}
              onFlip={handleFlipCard}
              soundEnabled={soundEnabled}
              furiganaEnabled={furiganaEnabled}
            />
          </div>

          {/* Card Controls */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              onClick={handlePrevCard}
              disabled={currentCardIndex === 0}
              className="rpg-btn rpg-btn-secondary flex-1 py-3 text-sm font-bold gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Sebelumnya</span>
            </button>

            <button
              onClick={handleNextCard}
              disabled={currentCardIndex === items.length - 1}
              className="rpg-btn rpg-btn-primary flex-1 py-3 text-sm font-bold gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>Selanjutnya</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Quiz CTA Banner */}
          <div className="p-4 rounded-2xl bg-surface-card panel-stitched border border-border-subtle flex items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-text-primary font-heading">Siap Menguji Ingatan Kotoba?</h4>
              <p className="text-[11px] text-text-secondary">Jawab kuis arti & cara baca kata dengan {compiledQuizQuestions.length} tantangan pilihan ganda</p>
            </div>
            <button
              onClick={handleStartQuiz}
              className="btn py-2 px-4 text-xs font-bold shrink-0 text-gold"
            >
              Mulai Kuis ({compiledQuizQuestions.length})
            </button>
          </div>
        </div>
      )}

      {activeTab === 'writing' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-surface-card panel-stitched border border-border-subtle">
            <h3 className="text-sm font-bold text-text-primary font-heading flex items-center gap-2 mb-1">
              <Edit3 className="w-4 h-4 text-wine-accent" />
              Latihan Menulis Aksara (Kanji/Kana Canvas)
            </h3>
            <p className="text-xs text-text-secondary">
              Pilih kosakata di bawah untuk melatih urutan goresan (stroke order) aksara kanji atau kana menggunakan kanvas interaktif.
            </p>
          </div>

          {/* Word Selector Pills */}
          <div className="flex flex-wrap items-center gap-2 pb-1">
            {items.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => {
                  setSelectedWritingIndex(idx);
                  playSound('click', soundEnabled);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 shrink-0 ${
                  selectedWritingIndex === idx
                    ? 'seg-active text-gold'
                    : 'bg-surface-card text-text-secondary border-border-subtle hover:text-text-primary'
                }`}
              >
                <span className="font-jp text-sm font-black">{item.word}</span>
                <span className="text-[10px] opacity-75">({item.reading || item.word})</span>
              </button>
            ))}
          </div>

          {/* Writing Canvas Practice Module */}
          <div className="rounded-2xl bg-surface-card panel-stitched border border-border-subtle p-3 sm:p-5 shadow-md">
            <KotobaWritingPractice
              key={currentWritingItem.id}
              kotoba={currentWritingItem}
              soundEnabled={soundEnabled}
              onCompleteWord={(score, reward) => {
                onReward(reward?.expGained ?? 20, reward?.goldGained ?? 10, 'kotoba_writing', currentWritingItem.id, score, 100);
              }}
              onFinishWord={() => {
                if (selectedWritingIndex < items.length - 1) {
                  setSelectedWritingIndex(prev => prev + 1);
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedItem && (
          <KotobaDetailModal
            isOpen={true}
            onClose={() => setSelectedItem(null)}
            item={selectedItem}
            soundEnabled={soundEnabled}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
