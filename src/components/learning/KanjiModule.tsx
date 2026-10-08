import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Feather } from 'lucide-react';
import { KanjiItem, Question } from '../../types/content';
import { KANJI_DATABASE, STAGE_1_KANJI_QUIZ } from '../../data/kanji';
import { QuizEngine } from './QuizEngine';
import { playSound, speakJapanese } from '../../utils/audio';
import { KanjiDetailCard } from './KanjiDetailCard';
import { fisherYatesShuffle } from '../../utils/smartRandomizer';


interface KanjiModuleProps {
  kanjiIds: string[];
  onReward: (exp: number, gold: number, moduleId: string, itemId?: string, score?: number, total?: number) => void;
  onBack: () => void;
  playerMp: number;
  playerInt: number;
  onUseMp: (amount: number) => boolean;
  soundEnabled?: boolean;
  furiganaEnabled?: boolean;
}

export const KanjiModule: React.FC<KanjiModuleProps> = ({
  kanjiIds,
  onReward,
  onBack,
  playerMp,
  playerInt,
  onUseMp,
  soundEnabled = true,
  furiganaEnabled = true,
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'quiz'>('list');
  const [selectedKanjiId, setSelectedKanjiId] = useState<string | null>(null);
  const [detailSubTab, setDetailSubTab] = useState<'detail' | 'writing'>('detail');
  const [isQuizActive, setIsQuizActive] = useState(false);

  const fallbackKanji: KanjiItem = {
    id: 'kanji_001',
    character: '関',
    meaningId: 'Hubungan / Relasi',
    meaningEn: 'connection, barrier',
    onyomi: ['カン (KAN)'],
    kunyomi: ['せき (seki)', 'かか.わる (kaka.waru)'],
    jlpt: 'N3',
    strokeCount: 14,
    radical: '門 (mon)',
    radicalName: 'Mon (もん)',
    relatedWords: [
      { word: '関係', reading: 'かんけい', meaningId: 'Hubungan / Relasi' },
      { word: '玄関', reading: 'げんかん', meaningId: 'Pintu masuk' }
    ],
    questions: []
  };

  const kanjiList: KanjiItem[] = kanjiIds.map(id => KANJI_DATABASE[id]).filter(Boolean);
  const safeKanjiList = kanjiList.length > 0 ? kanjiList : [fallbackKanji];
  const activeKanji: KanjiItem = (selectedKanjiId ? KANJI_DATABASE[selectedKanjiId] : safeKanjiList[0]) || fallbackKanji;

  const handlePlayAudio = (text: string) => {
    speakJapanese(text);
  };

  const generateKanjiQuestions = (pool: KanjiItem[]): Question[] => {
    return pool.map((item, idx) => {
      const qType = Math.floor(Math.random() * 3);
      
      let instruction = '';
      let instructionId = '';
      let prompt = item.character;
      let translation = item.meaningId;
      let correctAns = '';
      let distractors: string[] = [];
      
      const otherKanjis = fisherYatesShuffle(
        Object.values(KANJI_DATABASE).filter(k => k.id !== item.id)
      );

      if (qType === 0) {
        instruction = '漢字の意味として最も適切なものを一つ選びなさい。';
        instructionId = 'Pilihlah arti yang paling tepat untuk kanji berikut.';
        correctAns = item.meaningId;
        distractors = Array.from(new Set(otherKanjis.map(k => k.meaningId))).slice(0, 3);
      } else if (qType === 1) {
        instruction = '下線部の意味を表す漢字を一つ選びなさい。';
        instructionId = 'Pilihlah karakter kanji yang tepat untuk arti berikut.';
        correctAns = item.character;
        distractors = Array.from(new Set(otherKanjis.map(k => k.character))).slice(0, 3);
      } else {
        instruction = '漢字の正しい読み方（音読み・訓読み）を一つ選びなさい。';
        instructionId = 'Pilihlah cara baca (Onyomi/Kunyomi) yang benar untuk kanji berikut.';
        correctAns = [...(item.onyomi || []), ...(item.kunyomi || [])].join(', ') || item.character;
        distractors = Array.from(new Set(otherKanjis.map(k => [...(k.onyomi || []), ...(k.kunyomi || [])].join(', ') || k.character))).slice(0, 3);
      }

      while (distractors.length < 3) {
        distractors.push(['Melakukan kegiatan', 'Menyatakan keadaan', 'Sesuatu yang besar'][distractors.length]);
      }

      const options = fisherYatesShuffle([correctAns, ...distractors]);
      const correctIndex = options.indexOf(correctAns);

      return {
        id: `kanji_q_${item.id}_${qType}`,
        instruction,
        instructionId,
        prompt,
        translation,
        audioPrompt: item.character,
        options,
        correctIndex,
        explanation: `Kanji 「${item.character}」 artinya "${item.meaningId}". Bacaan: Onyomi [${item.onyomi?.join(', ') || '-'}], Kunyomi [${item.kunyomi?.join(', ') || '-'}]`
      };
    });
  };

  // Store questions in dedicated state created once upon starting the quiz
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);

  const compiledQuestions = useMemo(() => {
    const questionsFromKanji = activeKanji.questions && activeKanji.questions.length > 0
      ? activeKanji.questions
      : generateKanjiQuestions(kanjiList);
    return questionsFromKanji.length > 0 ? questionsFromKanji : STAGE_1_KANJI_QUIZ;
  }, [activeKanji, kanjiList]);

  const handleStartQuiz = () => {
    playSound('click', soundEnabled);
    setActiveQuestions(compiledQuestions);
    setIsQuizActive(true);
  };

  if (isQuizActive) {
    return (
      <div className="w-full space-y-4">
        <QuizEngine
          title={`🎯 Quiz Aksara & Kanji (${activeQuestions.length} Soal)`}
          questions={activeQuestions}
          playerMp={playerMp}
          playerInt={playerInt}
          onUseMp={onUseMp}
          soundEnabled={soundEnabled}
          onComplete={(score, total, exp, gold) => {
            onReward(exp, gold, 'kanji', kanjiList[0]?.id || 'kanji_set', score, total);
          }}
          onExit={() => {
            setIsQuizActive(false);
            setActiveQuestions([]);
          }}
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="panel panel-stitched p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2.5">
          <span className="p-2.5 rounded-xl bg-surface-inset text-wine-accent border border-border-subtle shrink-0">
            <Feather className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-text-primary font-heading flex items-center gap-2">
              <span className="text-wine-accent">漢</span> KANJI (Karakter)
            </h2>
            <p className="text-xs text-text-secondary">
              Pelajari {safeKanjiList.length} Karakter, latihan menulis lembar stroke & selesaikan Quiz
            </p>
          </div>
        </div>

        {/* Global Tab Switcher */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setActiveTab('list');
              setSelectedKanjiId(null);
              playSound('click', soundEnabled);
            }}
            className={`btn btn-pill ${
              activeTab === 'list' && !selectedKanjiId
                ? 'bg-surface-elevated text-wine-accent font-bold border border-border-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_4px_rgba(0,0,0,0.2)]'
                : 'opacity-70 hover:opacity-100'
            }`}
          >
            📋 Daftar Karakter ({safeKanjiList.length})
          </button>
          <button
            onClick={handleStartQuiz}
            className="btn btn-pill flex items-center gap-1.5 text-gold"
          >
            <span>🎯 Latihan ({compiledQuestions.length})</span>
          </button>
        </div>
      </div>

      {/* When a specific Kanji is selected: Detail & Writing Practice View */}
      {selectedKanjiId ? (
        <KanjiDetailCard
          key={activeKanji.id || activeKanji.character}
          item={activeKanji}
          soundEnabled={soundEnabled}
          furiganaEnabled={furiganaEnabled}
          initialTab={detailSubTab}
          onBack={() => {
            setSelectedKanjiId(null);
            playSound('click', soundEnabled);
          }}
          backButtonLabel="Kembali ke Daftar Kanji"
          onCompleteSheet={(sheet, score, reward) => {
            // Writing practice gives dynamic EXP & gold based on level, stroke count, speed, watermark, and hints
            const exp = reward?.expGained ?? 15;
            const gold = reward?.goldGained ?? 5;
            onReward(exp, gold, 'kanji', activeKanji.id || activeKanji.character, 1, 1);
          }}
          onFinish={() => {
            // Return user directly to the stage hub room
            playSound('fanfare', soundEnabled);
            onBack();
          }}
          showQuestions={false}
        />
      ) : (
        /* Kanji Grid List View */
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {safeKanjiList.map((kanji) => (
              <motion.div
                key={kanji.id}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setSelectedKanjiId(kanji.id);
                  setDetailSubTab('detail');
                  playSound('click', soundEnabled);
                }}
                className="panel panel-stitched p-4 cursor-pointer text-center space-y-2 group transition-all shadow-md hover:border-border-primary"
              >
                <div className="w-16 h-16 mx-auto rounded-2xl bg-surface-inset border border-border-subtle flex items-center justify-center text-3xl font-bold text-wine-accent font-jp group-hover:scale-105 transition-transform">
                  {kanji.character}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-text-primary truncate">
                    {kanji.meaningId}
                  </h4>
                  <p className="text-[11px] font-mono text-text-secondary truncate">
                    {kanji.onyomi[0] || kanji.kunyomi[0] || ''}
                  </p>
                </div>
                <div className="text-[10px] px-2 py-0.5 rounded-full bg-surface-inset text-text-muted border border-border-subtle">
                  {kanji.strokeCount} Coretan
                </div>
              </motion.div>
            ))}
          </div>

          {/* Quick Quiz Banner */}
          <div className="panel panel-stitched p-5 border border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <h3 className="text-base font-bold text-wine-accent font-heading">
                🎯 Uji Semua Kanji Hari Ini (7 Soal)
              </h3>
              <p className="text-xs text-text-secondary">
                Quiz kanji mencakup seluruh kanji pada stage ini dengan soal berbasis kosakata kontekstual.
              </p>
            </div>
            <button
              onClick={handleStartQuiz}
              className="btn btn-pill py-3 px-6 text-wine-accent font-bold text-xs shrink-0"
            >
              Mulai Quiz Kanji
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
