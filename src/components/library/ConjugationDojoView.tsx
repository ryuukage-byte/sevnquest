import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import {
  Zap,
  Volume2,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ChevronRight,
  Flame,
  FlaskConical,
} from 'lucide-react';
import {
  CONJUGATION_FORMS_INFO,
  WORD_CLASS_GUIDES,
  VERB_CONJUGATION_DATABASE,
  generateConjugationQuestion,
  ConjugationDrillQuestion,
  getTargetFormDisplay,
  getConjugatedMeaningId,
} from '../../data/conjugationRules';
import { speakJapanese, playSound } from '../../utils/audio';
import { RubyText } from '../learning/RubyText';
import { ConjugationSandboxModal } from './ConjugationSandboxModal';

interface ConjugationDojoViewProps {
  soundEnabled?: boolean;
  onRewardPlayer?: (exp: number, gold: number) => void;
}

export const ConjugationDojoView: React.FC<ConjugationDojoViewProps> = ({
  soundEnabled = true,
  onRewardPlayer,
}) => {
  // Tabs: 'basic_forms' | 'advanced_forms' | 'verb_groups' | 'other_classes'
  const [activeTab, setActiveTab] = useState<'basic_forms' | 'advanced_forms' | 'verb_groups' | 'other_classes'>('basic_forms');

  // Drill Section Ref for smooth auto-scrolling
  const drillSectionRef = useRef<HTMLDivElement>(null);

  // Drill Quiz State
  const [isDrillActive, setIsDrillActive] = useState(false);
  const [selectedDrillFormId, setSelectedDrillFormId] = useState<string>('all');
  const [currentQuestion, setCurrentQuestion] = useState<ConjugationDrillQuestion | null>(null);
  const [selectedAnswerIndex, setSelectedAnswerIndex] = useState<number | null>(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [streak, setStreak] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);

  // Sandbox "Coba dengan Kotoba" (eksplorasi, tidak memberi EXP/mastery)
  const [sandboxFormId, setSandboxFormId] = useState<string | null>(null);
  const handleOpenSandbox = (formId: string) => {
    playSound('click', soundEnabled);
    setSandboxFormId(formId);
  };

  // Start Drill Quiz
  const handleStartDrill = (formId: string = 'all') => {
    playSound('click', soundEnabled);
    setSelectedDrillFormId(formId);
    const q = generateConjugationQuestion(formId === 'all' ? undefined : formId);
    setCurrentQuestion(q);
    setSelectedAnswerIndex(null);
    setIsAnswerChecked(false);
    setIsDrillActive(true);

    // Smoothly scroll the user to the practice board
    setTimeout(() => {
      if (drillSectionRef.current) {
        drillSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        const el = document.getElementById('conjugation-drill-panel');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }, 60);
  };

  const handleNextQuestion = () => {
    playSound('click', soundEnabled);
    const q = generateConjugationQuestion(selectedDrillFormId === 'all' ? undefined : selectedDrillFormId);
    setCurrentQuestion(q);
    setSelectedAnswerIndex(null);
    setIsAnswerChecked(false);
  };

  const handleSelectAnswer = (idx: number) => {
    if (isAnswerChecked || !currentQuestion) return;
    setSelectedAnswerIndex(idx);
    setIsAnswerChecked(true);

    const isCorrect = idx === currentQuestion.correctIndex;
    if (isCorrect) {
      playSound('correct', soundEnabled);
      setStreak(prev => prev + 1);
      setTotalScore(prev => prev + 1);
      setTotalAnswered(prev => prev + 1);
      if (onRewardPlayer) {
        onRewardPlayer(15, 10);
      }
    } else {
      playSound('wrong', soundEnabled);
      setStreak(0);
      setTotalAnswered(prev => prev + 1);
    }
  };

  const basicForms = CONJUGATION_FORMS_INFO.filter(f => ['te', 'nai', 'ta', 'masu'].includes(f.id));
  const advancedForms = CONJUGATION_FORMS_INFO.filter(f => !['te', 'nai', 'ta', 'masu'].includes(f.id));

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* 1. HEADER BANNER */}
      <div className="panel panel-stitched p-5 sm:p-6 rounded-3xl border border-border-subtle shadow-md bg-surface-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo/15 text-indigo border border-border-subtle flex items-center justify-center shrink-0 shadow-sm">
            <Zap className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-indigo/15 text-indigo border border-border-subtle uppercase">
                Dojo Konjugasi
              </span>
              <span className="text-xs text-text-secondary font-mono">
                {VERB_CONJUGATION_DATABASE.length} Kata Terdaftar
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-text-primary font-heading tracking-wide">
              Perubahan Bentuk Kata (活用 - Katsuyou)
            </h1>
            <p className="text-xs sm:text-sm text-text-secondary font-medium">
              Kuasai aturan perubahan kata kerja (Godan, Ichidan, Irregular), kata sifat, dan kata benda beserta latihannya.
            </p>
          </div>
        </div>

        {/* CTA Latihan Konjugasi */}
        <button
          type="button"
          onClick={() => handleStartDrill('all')}
          className="btn-skeuo-indigo self-stretch md:self-auto justify-center text-xs py-2.5 px-5 transition-all"
        >
          <Flame className="w-4 h-4 text-gold fill-gold shrink-0" />
          <span className="whitespace-nowrap font-bold">Mulai Latihan Konjugasi</span>
          <ChevronRight className="w-4 h-4 opacity-75 shrink-0" />
        </button>
      </div>

      {/* 2. MODE DRILL QUIZ AKTIF */}
      {isDrillActive && currentQuestion ? (
        <div
          ref={drillSectionRef}
          id="conjugation-drill-panel"
          className="panel panel-stitched p-5 sm:p-6 rounded-3xl border border-border-subtle bg-surface-card shadow-xl space-y-5 animate-scale-up scroll-mt-20 sm:scroll-mt-24"
        >
          {/* Top Bar Drill */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-border-subtle">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded-xl bg-indigo/15 text-indigo border border-border-subtle font-mono text-xs font-bold flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                Streak: {streak}
              </span>
              <span className="text-xs font-mono text-text-secondary">
                Akurasi: {totalAnswered > 0 ? Math.round((totalScore / totalAnswered) * 100) : 0}% ({totalScore}/{totalAnswered})
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              {/* Form Filter Selector */}
              <select
                value={selectedDrillFormId}
                onChange={(e) => handleStartDrill(e.target.value)}
                className="text-xs bg-surface-inset border border-border-subtle rounded-xl px-2.5 py-1.5 font-heading text-text-primary focus:outline-none"
              >
                <option value="all">⚡ Semua Bentuk Acak</option>
                {CONJUGATION_FORMS_INFO.map(f => (
                  <option key={f.id} value={f.id}>{f.badge}: {f.friendlyTarget || f.name}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setIsDrillActive(false)}
                className="btn-physical-secondary text-xs px-3 py-1.5 rounded-xl"
              >
                Tutup Drill
              </button>
            </div>
          </div>

          {/* Big Question Box: Kotoba + Tujuan Konjugasi */}
          {(() => {
            const formId = currentQuestion.targetForm?.id || '';
            const formDisplay = getTargetFormDisplay(formId);
            const baseMeaning = currentQuestion.targetVerb?.meaningId || '';

            return (
              <div className="p-5 sm:p-7 rounded-3xl bg-surface-inset border border-border-subtle text-center space-y-2 shadow-inner">
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
                    <h3 className="text-3xl sm:text-4xl font-black text-text-primary font-jp">
                      {currentQuestion.targetVerb ? (
                        <RubyText
                          japanese={currentQuestion.targetVerb.kanji}
                          reading={currentQuestion.targetVerb.reading}
                          showFurigana={true}
                          className="text-3xl sm:text-4xl font-black text-text-primary font-jp"
                        />
                      ) : (
                        <RubyText
                          japanese={currentQuestion.prompt}
                          reading={currentQuestion.ruby}
                          showFurigana={true}
                          className="text-3xl sm:text-4xl font-black text-text-primary font-jp"
                        />
                      )}
                    </h3>
                    <span className="text-text-muted font-mono text-xl sm:text-2xl font-bold select-none">＋</span>
                    <span className="text-gold font-jp font-black text-3xl sm:text-4xl drop-shadow-sm">
                      {formDisplay.suffix}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-lg bg-gold/15 text-gold border border-border-subtle text-xs font-mono font-bold">
                      {formDisplay.badge}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => speakJapanese(currentQuestion.targetVerb?.reading || currentQuestion.ruby || '')}
                    className="btn-physical-secondary p-2 rounded-xl hover:text-gold transition-colors cursor-pointer shrink-0"
                    title="Dengarkan pelafalan kata dasar"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Terjemah kotoba dasar sebelum menjawab */}
                {baseMeaning && (
                  <p className="text-xs sm:text-sm text-text-muted font-medium pt-1">
                    {baseMeaning}
                  </p>
                )}
              </div>
            );
          })()}

          {/* Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {currentQuestion.options.map((option, idx) => {
              const isSelected = selectedAnswerIndex === idx;
              const isCorrect = idx === currentQuestion.correctIndex;
              const optionReading = currentQuestion.optionsRuby?.[idx];

              let btnStyle = 'bg-surface-card border-border-subtle hover:border-border-primary hover:bg-surface-elevated text-text-primary';
              if (isAnswerChecked) {
                if (isCorrect) {
                  btnStyle = 'bg-emerald-500/15 border-border-subtle text-emerald-400 font-bold';
                } else if (isSelected) {
                  btnStyle = 'bg-rose-500/15 border-border-subtle text-rose-400';
                } else {
                  btnStyle = 'opacity-40 border-border-subtle text-text-muted';
                }
              }

              return (
                <motion.button
                  key={idx}
                  whileHover={!isAnswerChecked ? { scale: 1.01 } : {}}
                  whileTap={!isAnswerChecked ? { scale: 0.99 } : {}}
                  disabled={isAnswerChecked}
                  onClick={() => handleSelectAnswer(idx)}
                  className={`p-4 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all ${btnStyle}`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="w-7 h-7 rounded-xl bg-surface-inset border border-border-subtle flex items-center justify-center font-mono text-xs font-bold shrink-0">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="text-base font-bold font-jp">
                      <RubyText
                        japanese={option}
                        reading={optionReading}
                        className="text-base font-bold font-jp"
                      />
                    </span>
                  </div>

                  {isAnswerChecked && isCorrect && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  )}
                  {isAnswerChecked && isSelected && !isCorrect && (
                    <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Feedback & Explanation */}
          {isAnswerChecked && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 sm:p-5 rounded-2xl border space-y-3.5 ${
                selectedAnswerIndex === currentQuestion.correctIndex
                  ? 'bg-emerald-500/10 border-border-subtle'
                  : 'bg-rose-500/10 border-border-subtle'
              }`}
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  {selectedAnswerIndex === currentQuestion.correctIndex ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-400" />
                  )}
                  <span className="font-heading font-bold text-sm sm:text-base">
                    {selectedAnswerIndex === currentQuestion.correctIndex ? 'Tepat Sekali! (+15 EXP)' : 'Kurang Tepat!'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleNextQuestion}
                  className="btn-skeuo-indigo py-2 px-4 text-xs transition-all flex items-center gap-1.5"
                >
                  <span className="whitespace-nowrap font-bold">Soal Berikutnya</span>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                </button>
              </div>

              {/* Terjemahan Hasil Konjugasi (muncul setelah menjawab) */}
              {(() => {
                const formId = currentQuestion.targetForm?.id || '';
                const baseMeaning = currentQuestion.targetVerb?.meaningId || '';
                const conjugatedResultMeaning = getConjugatedMeaningId(baseMeaning, formId);
                const correctOption = currentQuestion.options[currentQuestion.correctIndex];
                const correctRuby = currentQuestion.optionsRuby?.[currentQuestion.correctIndex];

                return (
                  <div className="p-3.5 rounded-xl bg-surface-card border border-border-subtle flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-xs text-text-muted font-bold">Hasil:</span>
                      <span className="font-jp font-bold text-sm sm:text-base text-emerald-400">
                        {correctRuby ? (
                          <RubyText
                            japanese={correctOption}
                            reading={correctRuby}
                            showFurigana={true}
                            className="font-jp font-bold text-sm sm:text-base text-emerald-400"
                          />
                        ) : (
                          correctOption
                        )}
                      </span>
                      {conjugatedResultMeaning && (
                        <>
                          <span className="text-xs text-text-muted select-none">➔</span>
                          <span className="text-xs sm:text-sm font-bold text-emerald-300">
                            "{conjugatedResultMeaning}"
                          </span>
                        </>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => speakJapanese(correctRuby || correctOption)}
                      className="btn-physical-secondary p-1.5 rounded-lg hover:text-emerald-400 transition-colors shrink-0"
                      title="Dengarkan pelafalan hasil konjugasi"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })()}

              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                {currentQuestion.explanation}
              </p>
            </motion.div>
          )}
        </div>
      ) : null}

      {/* 3. NAVIGASI TAB ENSIKLOPEDIA */}
      <div className="book-tab-nav max-w-full overflow-x-auto no-scrollbar flex-nowrap justify-start py-1 px-1.5 gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={() => {
            playSound('click', soundEnabled);
            setActiveTab('basic_forms');
          }}
          className={`book-tab-btn shrink-0 whitespace-nowrap ${activeTab === 'basic_forms' ? 'active' : 'inactive'}`}
        >
          <div className="w-6 h-6 rounded-lg bg-surface-inset border border-border-subtle flex items-center justify-center text-xs font-jp font-bold text-text-primary shrink-0">
            て
          </div>
          <div className="text-left">
            <span className="block text-xs leading-none font-bold">Bentuk Utama</span>
            <span className="text-[10px] opacity-70 font-mono">Te • Nai • Ta • Masu</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            playSound('click', soundEnabled);
            setActiveTab('advanced_forms');
          }}
          className={`book-tab-btn shrink-0 whitespace-nowrap ${activeTab === 'advanced_forms' ? 'active' : 'inactive'}`}
        >
          <div className="w-6 h-6 rounded-lg bg-surface-inset border border-border-subtle flex items-center justify-center text-xs font-jp font-bold text-text-primary shrink-0">
            能
          </div>
          <div className="text-left">
            <span className="block text-xs leading-none font-bold">Bentuk Lanjutan</span>
            <span className="text-[10px] opacity-70 font-mono">Potensial • Pasif • Tara • dll</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            playSound('click', soundEnabled);
            setActiveTab('verb_groups');
          }}
          className={`book-tab-btn shrink-0 whitespace-nowrap ${activeTab === 'verb_groups' ? 'active' : 'inactive'}`}
        >
          <div className="w-6 h-6 rounded-lg bg-surface-inset border border-border-subtle flex items-center justify-center text-xs font-jp font-bold text-text-primary shrink-0">
            動
          </div>
          <div className="text-left">
            <span className="block text-xs leading-none font-bold">Golongan Verba</span>
            <span className="text-[10px] opacity-70 font-mono">Godan • Ichidan • Irregular</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            playSound('click', soundEnabled);
            setActiveTab('other_classes');
          }}
          className={`book-tab-btn shrink-0 whitespace-nowrap ${activeTab === 'other_classes' ? 'active' : 'inactive'}`}
        >
          <div className="w-6 h-6 rounded-lg bg-surface-inset border border-border-subtle flex items-center justify-center text-xs font-jp font-bold text-text-primary shrink-0">
            形
          </div>
          <div className="text-left">
            <span className="block text-xs leading-none font-bold">Sifat & Benda</span>
            <span className="text-[10px] opacity-70 font-mono">i-Keiyoushi • na • Meishi</span>
          </div>
        </button>
      </div>

      {/* 4. CONTENT SECTIONS */}

      {/* A. BENTUK UTAMA (TE, NAI, TA, MASU) */}
      {activeTab === 'basic_forms' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {basicForms.map((form) => (
              <div
                key={form.id}
                className="panel panel-stitched p-5 rounded-3xl border border-border-subtle bg-surface-card space-y-4 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-indigo/15 text-indigo border border-border-subtle font-bold font-mono text-xs">
                        {form.badge}
                      </span>
                      <span className="text-xs font-mono text-text-muted">
                        {form.japaneseName}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-text-primary font-heading mt-1">
                      {form.name}
                    </h3>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 self-stretch sm:self-auto">
                    <button
                      type="button"
                      onClick={() => handleStartDrill(form.id)}
                      className="btn-physical-secondary flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold font-heading text-indigo transition-all"
                    >
                      <Flame className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                      <span>Latih Bentuk Ini</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenSandbox(form.id)}
                      className="btn-physical-secondary flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold font-heading text-indigo transition-all"
                    >
                      <FlaskConical className="w-3.5 h-3.5 text-amber-300" />
                      <span>Coba dengan Kotoba</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                  {form.summary}
                </p>

                {/* Kaidah Per Golongan */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                  <div className="p-3.5 rounded-2xl bg-surface-inset border border-border-subtle space-y-1.5">
                    <span className="text-xs font-bold text-gold font-heading block">
                      Golongan 1 (Godan)
                    </span>
                    <p className="text-xs text-text-secondary whitespace-pre-line leading-relaxed font-mono">
                      {form.ruleExplanation.godan}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-surface-inset border border-border-subtle space-y-1.5">
                    <span className="text-xs font-bold text-emerald-400 font-heading block">
                      Golongan 2 (Ichidan)
                    </span>
                    <p className="text-xs text-text-secondary whitespace-pre-line leading-relaxed font-mono">
                      {form.ruleExplanation.ichidan}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-surface-inset border border-border-subtle space-y-1.5">
                    <span className="text-xs font-bold text-indigo font-heading block">
                      Golongan 3 (Irregular)
                    </span>
                    <p className="text-xs text-text-secondary whitespace-pre-line leading-relaxed font-mono">
                      {form.ruleExplanation.irregular}
                    </p>
                  </div>
                </div>

                {/* Contoh Nyata */}
                <div className="pt-2 border-t border-border-subtle flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-mono text-text-muted font-bold mr-1">
                    Contoh:
                  </span>
                  {form.sampleExamples.map((ex, exIdx) => (
                    <span
                      key={exIdx}
                      className="text-xs font-mono px-2.5 py-1 rounded-xl bg-surface-inset border border-border-subtle text-text-primary"
                    >
                      {ex.dictionary} ➔ <strong className="text-gold">{ex.conjugated}</strong>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* B. BENTUK LANJUTAN (POTENSIAL, PASIF, KAUSATIF) */}
      {activeTab === 'advanced_forms' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {advancedForms.map((form) => (
              <div
                key={form.id}
                className="panel panel-stitched p-5 rounded-3xl border border-border-subtle bg-surface-card space-y-4 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-wine-accent/15 text-wine-accent border border-border-subtle font-bold font-mono text-xs">
                        {form.badge}
                      </span>
                      <span className="text-xs font-mono text-text-muted">
                        {form.japaneseName}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-text-primary font-heading mt-1">
                      {form.name}
                    </h3>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 self-stretch sm:self-auto">
                    <button
                      type="button"
                      onClick={() => handleStartDrill(form.id)}
                      className="btn-physical-secondary flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold font-heading text-wine-accent transition-all"
                    >
                      <Flame className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                      <span>Latih Bentuk Ini</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenSandbox(form.id)}
                      className="btn-physical-secondary flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold font-heading text-wine-accent transition-all"
                    >
                      <FlaskConical className="w-3.5 h-3.5 text-amber-300" />
                      <span>Coba dengan Kotoba</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                  {form.summary}
                </p>

                {/* Kaidah Per Golongan */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                  <div className="p-3.5 rounded-2xl bg-surface-inset border border-border-subtle space-y-1.5">
                    <span className="text-xs font-bold text-gold font-heading block">
                      Golongan 1 (Godan)
                    </span>
                    <p className="text-xs text-text-secondary whitespace-pre-line leading-relaxed font-mono">
                      {form.ruleExplanation.godan}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-surface-inset border border-border-subtle space-y-1.5">
                    <span className="text-xs font-bold text-emerald-400 font-heading block">
                      Golongan 2 (Ichidan)
                    </span>
                    <p className="text-xs text-text-secondary whitespace-pre-line leading-relaxed font-mono">
                      {form.ruleExplanation.ichidan}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-surface-inset border border-border-subtle space-y-1.5">
                    <span className="text-xs font-bold text-indigo font-heading block">
                      Golongan 3 (Irregular)
                    </span>
                    <p className="text-xs text-text-secondary whitespace-pre-line leading-relaxed font-mono">
                      {form.ruleExplanation.irregular}
                    </p>
                  </div>
                </div>

                {/* Contoh Nyata */}
                <div className="pt-2 border-t border-border-subtle flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-mono text-text-muted font-bold mr-1">
                    Contoh:
                  </span>
                  {form.sampleExamples.map((ex, exIdx) => (
                    <span
                      key={exIdx}
                      className="text-xs font-mono px-2.5 py-1 rounded-xl bg-surface-inset border border-border-subtle text-text-primary"
                    >
                      {ex.dictionary} ➔ <strong className="text-gold">{ex.conjugated}</strong>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* C. GOLONGAN VERBA (GODAN, ICHIDAN, IRREGULAR) */}
      {activeTab === 'verb_groups' && (
        <div className="space-y-4">
          {WORD_CLASS_GUIDES.filter(g => g.id === 'doushi_groups').map(guide => (
            <div key={guide.id} className="panel panel-stitched p-5 rounded-3xl border border-border-subtle bg-surface-card space-y-4">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-text-primary font-heading">
                  {guide.title}
                </h3>
                <p className="text-xs text-text-secondary">
                  {guide.description}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {guide.subGroups.map((sub, sIdx) => (
                  <div key={sIdx} className="p-4 rounded-2xl bg-surface-inset border border-border-subtle space-y-2.5 flex flex-col justify-between">
                    <div className="space-y-2">
                      <span className="font-bold text-xs text-gold font-heading block">
                        {sub.name}
                      </span>
                      <p className="text-xs text-text-secondary leading-relaxed">
                        {sub.rule}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-border-subtle space-y-1">
                      <span className="text-[10px] font-mono text-text-muted uppercase font-bold">
                        Contoh Verba:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {sub.examples.map((ex, eIdx) => (
                          <span key={eIdx} className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-surface-card border border-border-subtle text-text-primary">
                            {ex}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Master Table of Verbs */}
          <div className="panel panel-stitched p-5 rounded-3xl border border-border-subtle bg-surface-card space-y-3">
            <h3 className="text-sm font-bold text-text-primary font-heading">
              Tabel Komparasi Konjugasi Verba Contoh
            </h3>
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full min-w-[620px] text-xs font-jp">
                <thead>
                  <tr className="border-b border-border-subtle text-text-muted text-left whitespace-nowrap">
                    <th className="pb-2.5 pr-3">Kamus (Jisho)</th>
                    <th className="pb-2.5 pr-3">Golongan</th>
                    <th className="pb-2.5 pr-3">Bentuk Te</th>
                    <th className="pb-2.5 pr-3">Bentuk Nai</th>
                    <th className="pb-2.5 pr-3">Bentuk Ta</th>
                    <th className="pb-2.5 pr-3">Potensial</th>
                    <th className="pb-2.5">Pasif</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle whitespace-nowrap">
                  {VERB_CONJUGATION_DATABASE.map(v => (
                    <tr key={v.id} className="hover:bg-surface-inset/60">
                      <td className="py-2.5 font-bold text-text-primary font-jp">
                        <RubyText japanese={v.kanji} reading={v.reading} />
                        <span className="text-text-muted text-[10px] ml-1 font-mono">({v.romaji})</span>
                      </td>
                      <td className="py-2.5 text-text-muted capitalize">
                        {v.group}
                      </td>
                      <td className="py-2.5 text-gold font-bold font-jp">
                        <RubyText japanese={v.forms.te} reading={v.formsReadings?.te} />
                      </td>
                      <td className="py-2.5 text-emerald-400 font-jp">
                        <RubyText japanese={v.forms.nai} reading={v.formsReadings?.nai} />
                      </td>
                      <td className="py-2.5 text-text-secondary font-jp">
                        <RubyText japanese={v.forms.ta} reading={v.formsReadings?.ta} />
                      </td>
                      <td className="py-2.5 text-indigo font-jp">
                        <RubyText japanese={v.forms.potential} reading={v.formsReadings?.potential} />
                      </td>
                      <td className="py-2.5 text-wine-accent font-jp">
                        <RubyText japanese={v.forms.passive} reading={v.formsReadings?.passive} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* D. KATA SIFAT & KATA BENDA */}
      {activeTab === 'other_classes' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {WORD_CLASS_GUIDES.filter(g => g.id !== 'doushi_groups').map(guide => (
              <div key={guide.id} className="panel panel-stitched p-5 rounded-3xl border border-border-subtle bg-surface-card space-y-4 shadow-sm">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-surface-inset text-text-muted border border-border-subtle font-bold">
                    {guide.japaneseTitle}
                  </span>
                  <h3 className="text-base font-bold text-text-primary font-heading">
                    {guide.title}
                  </h3>
                  <p className="text-xs text-text-secondary">
                    {guide.description}
                  </p>
                </div>

                <div className="space-y-3">
                  {guide.subGroups.map((sub, sIdx) => (
                    <div key={sIdx} className="p-3.5 rounded-2xl bg-surface-inset border border-border-subtle space-y-1.5">
                      <span className="text-xs font-bold text-text-primary font-heading block">
                        {sub.name}
                      </span>
                      <p className="text-xs text-text-secondary whitespace-pre-line leading-relaxed">
                        {sub.rule}
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {sub.examples.map((ex, eIdx) => (
                          <span key={eIdx} className="text-[11px] font-jp leading-relaxed px-2 py-0.5 rounded-md bg-surface-card border border-border-subtle text-gold">
                            {ex}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {sandboxFormId && (
        <ConjugationSandboxModal
          key={sandboxFormId}
          formId={sandboxFormId}
          soundEnabled={soundEnabled}
          onClose={() => setSandboxFormId(null)}
        />
      )}
    </div>
  );
};
