import React, { useState } from 'react';
import { BookOpen, Swords, Volume2, HelpCircle, GitBranch, MapPin, Settings2, Edit3 } from 'lucide-react';
import { BunpouItem, BunpouMixedSet, Question } from '../../types/content';
import { BUNPOU_DATABASE, BUNPOU_MIXED_DATABASE } from '../../data/bunpou';
import { getSubBranchesForBunpou } from '../../data/bunpouSubKnowledge';
import { QuizEngine } from './QuizEngine';
import { FormulaDisplay } from './FormulaDisplay';
import { GrammarChecklist } from './GrammarChecklist';
import { GrammarFormulaBox } from './GrammarFormulaBox';
import { RubyText } from './RubyText';
import { SakubunStudio } from './SakubunStudio';
import { speakJapanese, playSound } from '../../utils/audio';
import { splitSentenceForHighlight } from '../../utils/grammarHighlight';
import { fisherYatesShuffle } from '../../utils/smartRandomizer';

interface BunpouModuleProps {
  bunpouIds: string[];
  bunpouMixedSetId?: string;
  onReward: (exp: number, gold: number, moduleId: string, itemId?: string, score?: number, total?: number) => void;
  onBack: () => void;
  playerMp: number;
  playerInt: number;
  onUseMp: (amount: number) => boolean;
  soundEnabled?: boolean;
  furiganaEnabled?: boolean;
}

export const BunpouModule: React.FC<BunpouModuleProps> = ({
  bunpouIds,
  bunpouMixedSetId = 'bunpou_mixed_001',
  onReward,
  onBack: _onBack,
  playerMp,
  playerInt,
  onUseMp,
  soundEnabled = true,
  furiganaEnabled = true,
}) => {
  const [activeTab, setActiveTab] = useState<'materi' | 'sakubun' | 'mixed'>('materi');
  const [selectedBunpouId, setSelectedBunpouId] = useState<string>(bunpouIds[0] || 'bunpou_001');
  const [activeSubIndex, setActiveSubIndex] = useState<number>(0);
  const [activeQuizSet, setActiveQuizSet] = useState<BunpouItem | BunpouMixedSet | null>(null);

  const currentBunpou: BunpouItem = BUNPOU_DATABASE[selectedBunpouId] || BUNPOU_DATABASE['bunpou_001'];
  const subBranches = currentBunpou.subFormulas && currentBunpou.subFormulas.length > 0
    ? currentBunpou.subFormulas
    : getSubBranchesForBunpou(currentBunpou);
  const currentSubBranch = subBranches[activeSubIndex] || subBranches[0];
  const mixedSet: BunpouMixedSet = BUNPOU_MIXED_DATABASE[bunpouMixedSetId] || BUNPOU_MIXED_DATABASE['bunpou_mixed_001'];

  const handlePlaySentenceAudio = (japaneseText: string) => {
    speakJapanese(japaneseText);
  };

  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);

  const startSingleQuiz = (item: BunpouItem) => {
    playSound('click', soundEnabled);
    const questionsToUse = item.questions && item.questions.length > 0
      ? item.questions
      : generateFillInTheBlanks(item);
    setActiveQuestions(questionsToUse);
    setActiveQuizSet(item);
  };

  const startMixedQuiz = () => {
    playSound('click', soundEnabled);
    setActiveQuestions(mixedSet.questions);
    setActiveQuizSet(mixedSet);
  };

  const generateFillInTheBlanks = (item: BunpouItem): Question[] => {
    const questions: Question[] = [];
    const patternTitle = item.title.split(/[(（＋／]/)[0].trim();
    const cleanedPattern = patternTitle.replace(/^[〜~]/, '');
    
    const allTitles = Object.values(BUNPOU_DATABASE)
      .map(b => b.title.split(/[(（＋／]/)[0].trim().replace(/^[〜~]/, ''))
      .filter(t => t !== cleanedPattern && t.length > 0);

    const shuffledDistractors = fisherYatesShuffle(allTitles);
    const examples = item.examples || [];
    
    const targetCount = 7;
    for(let i = 0; i < targetCount; i++) {
      const ex = examples[i % examples.length];
      if (!ex) break;

      let prompt = ex.japanese.replace(new RegExp(cleanedPattern, 'gi'), '（　）');
      let ruby = ex.reading ? ex.reading.replace(new RegExp(cleanedPattern, 'gi'), '（　）') : undefined;
      let correct = cleanedPattern;
      
      if (!ex.japanese.toLowerCase().includes(cleanedPattern.toLowerCase())) {
        prompt = ex.japanese;
        ruby = ex.reading;
        correct = item.title;
      }

      const options = [
        correct,
        shuffledDistractors[(i*3)%shuffledDistractors.length] || 'は',
        shuffledDistractors[(i*3+1)%shuffledDistractors.length] || 'が',
        shuffledDistractors[(i*3+2)%shuffledDistractors.length] || 'を'
      ];
      
      const shuffledOptions = fisherYatesShuffle(options);
      const correctIndex = shuffledOptions.indexOf(correct);

      questions.push({
        id: `${item.id}_fib_${i}`,
        instruction: '次の文の（　）に入れるのに最もよいものを、1・2・3・4から一つ選びなさい。',
        instructionId: 'Pilihlah pola tata bahasa yang paling tepat untuk melengkapi kalimat.',
        prompt,
        ruby,
        translation: ex.meaningId,
        options: shuffledOptions,
        correctIndex,
        explanation: `${ex.japanese}\n\n=> ${item.title}: ${item.meaningId}`,
        level: item.baseLevel || item.level || 'N3',
      });
    }

    return questions.length > 0 ? questions : item.questions;
  };

  if (activeQuizSet) {
    return (
      <div className="w-full space-y-4">
        <QuizEngine
          title={activeQuizSet.title}
          questions={activeQuestions}
          level={activeQuizSet.baseLevel || activeQuizSet.level || 'N3'}
          playerMp={playerMp}
          playerInt={playerInt}
          onUseMp={onUseMp}
          soundEnabled={soundEnabled}
          onComplete={(score, total, exp, gold) => {
            onReward(exp, gold, 'bunpou', activeQuizSet.id, score, total);
          }}
          onExit={() => {
            setActiveQuizSet(null);
            setActiveQuestions([]);
          }}
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-5 pb-6">
      {/* Top Header & Mode Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-surface-inset border border-border-subtle text-gold">
              <BookOpen className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-text-primary font-heading flex items-center gap-2">
                <span className="text-gold">文</span> BUNPOU (Tata Bahasa N3)
              </h2>
              <p className="text-xs text-text-secondary">
                Pahami pola kalimat, rumus pembentukan, contoh & drill 7 soal
              </p>
            </div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1.5 bg-surface-inset p-1 rounded-2xl border border-border-subtle self-start sm:self-auto">
          <button
            onClick={() => {
              setActiveTab('materi');
              playSound('click', soundEnabled);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all font-heading ${
              activeTab === 'materi'
                ? 'bg-surface-elevated text-gold border border-border-subtle shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Materi ({bunpouIds.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('sakubun');
              playSound('click', soundEnabled);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 font-heading ${
              activeTab === 'sakubun'
                ? 'bg-amber-500/20 text-amber-400 border border-border-subtle shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Susun Kalimat</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('mixed');
              playSound('click', soundEnabled);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 font-heading ${
              activeTab === 'mixed'
                ? 'seg-active text-gold font-bold'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <Swords className="w-3.5 h-3.5" />
            <span>Drill Gabungan</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'materi' ? (
        <div className="space-y-4">
          {/* Sub-navigation: Choose which Materi */}
          <div className="flex flex-wrap items-center gap-2 pb-1">
            {bunpouIds.map((id, index) => {
              const item = BUNPOU_DATABASE[id];
              if (!item) return null;
              const isSelected = selectedBunpouId === id;
              return (
                <button
                  key={id}
                  onClick={() => {
                    setSelectedBunpouId(id);
                    setActiveSubIndex(0);
                    playSound('click', soundEnabled);
                  }}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border font-jp ${
                    isSelected
                      ? 'bg-surface-elevated border-border-subtle text-gold shadow-sm'
                      : 'bg-surface-inset border-border-subtle text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Pola {index + 1}: {item.formula.split(/[(（＋／]/)[0].trim()}
                </button>
              );
            })}
          </div>

          {/* Action Row inside selected Materi */}
          <div className="flex items-center justify-between panel p-2.5 shadow-sm">
            <span className="text-xs text-text-primary font-medium px-2">
              📜 Tata Bahasa: <strong className="text-gold font-jp">{currentBunpou.title}</strong>
            </span>

            <button
              onClick={() => startSingleQuiz(currentBunpou)}
              className="btn-cta px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 font-heading"
            >
              <span>Latihan 7 Soal</span>
            </button>
          </div>

          {/* Theory Card */}
          <div className="panel panel-stitched p-5 sm:p-6 space-y-5 shadow-lg">
            {/* Title, Level, Functions & Meaning */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-lg bg-surface-inset text-amber-900 dark:text-gold text-xs font-mono font-bold border border-border-subtle">
                  {currentBunpou.baseLevel ? `Fondasi ${currentBunpou.baseLevel}` : `Level ${currentBunpou.level}`}
                </span>
                {currentBunpou.functions && currentBunpou.functions.map((fn, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded-lg bg-surface-inset text-text-primary text-[11px] font-jp font-semibold border border-border-subtle">
                    {fn}
                  </span>
                ))}
              </div>

              <div className="space-y-1">
                {currentBunpou.formula && (
                  <div className="text-xs text-text-secondary font-mono font-medium">
                    Rumus: <span className="font-jp text-text-primary font-bold">{currentBunpou.formula}</span>
                  </div>
                )}
                <h3 className="text-2xl sm:text-3xl font-black text-text-primary font-jp flex items-center gap-2">
                  <RubyText
                    japanese={currentBunpou.title}
                    reading={currentBunpou.reading?.includes('かた') ? currentBunpou.reading : (currentBunpou.title === '〜方' ? '〜かた' : currentBunpou.reading)}
                    showFurigana={true}
                  />
                </h3>
              </div>

              <p className="text-xs sm:text-sm font-medium text-text-primary">
                <strong className="text-amber-900 dark:text-gold font-bold">Arti / Makna: </strong>
                <span>{currentBunpou.meaningId}</span>
              </p>
            </div>

            {/* 1. EDUCATIONAL FUNCTION CHECKLIST */}
            <GrammarChecklist item={currentBunpou} />

            {/* 2. BRACKETED FORMULA BOX (Matching slide green bracket grouping) */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-black uppercase tracking-wider text-text-primary font-heading flex items-center justify-between">
                <span>📐 Rumus Sambungan Kata (接続)</span>
                <span className="text-[11px] text-emerald-800 dark:text-emerald-300 font-mono font-black tracking-wide">K. Kerja / Sifat / Benda</span>
              </h4>
              <GrammarFormulaBox item={currentBunpou} />
            </div>

            {/* Explanation Detail */}
            <div className="p-4 rounded-2xl bg-surface-inset border border-border-subtle space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5 font-heading">
                <HelpCircle className="w-3.5 h-3.5 text-gold" />
                Catatan Penjelasan Detail
              </h4>
              <p className="text-xs sm:text-sm text-text-primary leading-relaxed whitespace-pre-line">
                {currentBunpou.explanation}
              </p>
            </div>

            {/* Nuansa & Kata Terkait (Kolokasi) */}
            {(currentBunpou.nuance || (currentBunpou.relatedKeywords && currentBunpou.relatedKeywords.length > 0)) && (
              <div className="p-4 rounded-2xl bg-surface-inset border border-border-subtle space-y-3">
                {currentBunpou.nuance && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gold font-heading">
                      Nuansa Pemakaian (ニュアンス)
                    </span>
                    <p className="text-xs sm:text-sm text-text-primary leading-relaxed">
                      {currentBunpou.nuance}
                    </p>
                  </div>
                )}
                {currentBunpou.relatedKeywords && currentBunpou.relatedKeywords.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border-subtle">
                    <span className="text-[10px] font-bold text-text-secondary font-heading mr-1">
                      Kata Terkait / Kolokasi Kunci:
                    </span>
                    {currentBunpou.relatedKeywords.map((kw, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-lg bg-surface-card border border-border-subtle text-gold text-xs font-jp font-medium">
                        {kw}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Cabang Rumus & Kondisi Penggunaan (Sub-Rumus) */}
            {subBranches && subBranches.length > 0 && (
              <div className="p-4 sm:p-5 rounded-2xl bg-surface-inset border border-border-subtle space-y-4 shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-border-subtle">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-surface-card text-gold">
                      <GitBranch className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-gold font-heading">
                        Cabang Rumus & Kondisi Penggunaan
                      </h4>
                      <p className="text-[11px] text-text-secondary">
                        1 rumus tata bahasa memiliki beberapa variasi cabang & aturan sambung
                      </p>
                    </div>
                  </div>

                  {/* Sub-branch pill tabs */}
                  {subBranches.length > 1 && (
                    <div className="flex flex-wrap items-center gap-1.5 pb-1">
                      {subBranches.map((sub, idx) => {
                        const isSelected = activeSubIndex === idx;
                        return (
                          <button
                            key={sub.id || idx}
                            onClick={() => {
                              setActiveSubIndex(idx);
                              playSound('click', soundEnabled);
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border font-jp flex items-center gap-1 ${
                              isSelected
                                ? 'seg-active text-gold font-bold'
                                : 'panel text-text-secondary hover:text-gold'
                            }`}
                          >
                            <span>{sub.token}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {currentSubBranch && (
                  <div className="space-y-3.5">
                    {/* Active branch title & meaning */}
                    <div className="p-3 rounded-xl bg-surface-card border border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm sm:text-base font-bold text-gold font-jp">
                          {currentSubBranch.token}
                        </span>
                      </div>
                      <p className="text-xs text-text-secondary">
                        {currentSubBranch.meaning}
                      </p>
                    </div>

                    {/* Lokasi Penggunaan Badge / Box */}
                    <div className="p-3 rounded-xl bg-surface-card border border-border-subtle flex items-start gap-2.5">
                      <MapPin className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gold font-heading">
                          Lokasi & Posisi Penggunaan:
                        </span>
                        <p className="text-xs sm:text-sm text-text-primary font-medium leading-relaxed">
                          {currentSubBranch.usageLocation}
                        </p>
                      </div>
                    </div>

                    {/* Kondisi Sambungan (Connection Rules) */}
                    {currentSubBranch.connectionConditions.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1 font-heading">
                          <Settings2 className="w-3.5 h-3.5 text-gold" />
                          Kondisi Sambungan (接続):
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {currentSubBranch.connectionConditions.map((cond, cIdx) => (
                            <div
                              key={cIdx}
                              className="p-2.5 rounded-xl bg-surface-card border border-border-subtle space-y-1 hover:border-border-primary transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <span className="px-1.5 py-0.5 rounded-md bg-surface-inset text-[10px] font-bold text-gold border border-border-subtle">
                                  {cond.partOfSpeech}
                                </span>
                                <span className="text-xs font-mono font-bold text-text-primary">
                                  {cond.rule}
                                </span>
                              </div>
                              {cond.example && (
                                <p className="text-[11px] text-text-secondary font-jp pl-1">
                                  Contoh: <span className="text-gold">{cond.example}</span>
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Sub-branch specific examples if available */}
                    {currentSubBranch.examples && currentSubBranch.examples.length > 0 && (
                      <div className="space-y-2 pt-1 border-t border-border-subtle">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary font-heading">
                          Contoh Penggunaan untuk Cabang Ini:
                        </span>
                        <div className="space-y-2">
                          {currentSubBranch.examples.map((ex, exIdx) => (
                            <div
                              key={exIdx}
                              className="p-3 rounded-xl bg-surface-card border border-border-subtle flex items-start justify-between gap-2.5"
                            >
                              <div className="space-y-1 flex-1">
                                <p className="text-xs sm:text-base font-bold text-text-primary">
                                  <RubyText
                                    japanese={ex.japanese}
                                    reading={ex.reading}
                                    showFurigana={furiganaEnabled}
                                  />
                                </p>
                                <p className="text-xs text-text-secondary">
                                  {ex.meaningId}
                                </p>
                              </div>
                              <button
                                onClick={() => handlePlaySentenceAudio(ex.japanese)}
                                className="btn-physical-secondary p-1.5 rounded-lg text-gold transition-colors shrink-0"
                                title="Dengarkan Suara"
                              >
                                <Volume2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Perbandingan Pola Mirip (使い分け) */}
            {currentBunpou.comparisonNotes && currentBunpou.comparisonNotes.length > 0 && (
              <div className="p-4 sm:p-5 rounded-2xl bg-surface-inset border border-border-subtle space-y-3 shadow-md">
                <div className="flex items-center gap-2 pb-2 border-b border-border-subtle">
                  <span className="p-1.5 rounded-lg bg-surface-card text-indigo">
                    <Swords className="w-4 h-4" />
                  </span>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-indigo font-heading">
                      Perbedaan dengan Pola Mirip (使い分け)
                    </h4>
                    <p className="text-[11px] text-text-secondary">
                      Pahami perbedaannya agar tidak terkecoh oleh pilihan jebakan di ujian JLPT
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {currentBunpou.comparisonNotes.map((comp, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-surface-card border border-border-subtle space-y-1">
                      <span className="px-2 py-0.5 rounded-md bg-surface-inset border border-border-subtle text-indigo text-xs font-jp font-bold inline-block">
                        VS {comp.targetGrammar}
                      </span>
                      <p className="text-xs sm:text-sm text-text-secondary leading-relaxed pt-1">
                        {comp.difference}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Examples List with Furigana & Audio Play */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary font-heading">
                💬 Contoh Kalimat (例文)
              </h4>
              <div className="space-y-2.5">
                {currentBunpou.examples.map((example, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-2xl panel panel-stitched border border-border-subtle flex items-start justify-between gap-3 hover:border-border-primary transition-colors"
                  >
                    <div className="space-y-1.5 flex-1">
                      <p className="text-sm sm:text-base font-bold text-text-primary flex flex-wrap items-baseline gap-1">
                        <span className="text-emerald-500 font-bold select-none mr-0.5">•</span>
                        {splitSentenceForHighlight(example.japanese, currentBunpou).map((seg, segIdx) => {
                          if (seg.isHighlight) {
                            return (
                              <span
                                key={segIdx}
                                className="formula-highlight text-emerald-400 dark:text-emerald-300 font-black px-1.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 shadow-xs"
                                title="Pola Rumus Tata Bahasa"
                              >
                                <RubyText
                                  japanese={seg.text}
                                  showFurigana={furiganaEnabled}
                                />
                              </span>
                            );
                          }
                          return (
                            <RubyText
                              key={segIdx}
                              japanese={seg.text}
                              showFurigana={furiganaEnabled}
                            />
                          );
                        })}
                      </p>
                      <p className="text-xs sm:text-sm text-text-secondary font-medium pl-2.5 border-l-2 border-emerald-500/40 mt-1">
                        {example.meaningId}
                      </p>
                    </div>

                    <button
                      onClick={() => handlePlaySentenceAudio(example.japanese)}
                      className="btn-physical-secondary p-2 rounded-xl text-gold transition-colors shrink-0"
                      title="Dengarkan Suara Bahasa Jepang"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* CTAs to start practice & Sakubun */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('sakubun');
                  playSound('click', soundEnabled);
                }}
                className="btn-physical-secondary py-3 px-4 rounded-2xl text-amber-400 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all font-heading cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
                <span>Susun Kalimat Pola Ini</span>
              </button>

              <button
                type="button"
                onClick={() => startSingleQuiz(currentBunpou)}
                className="py-3 px-4 rounded-2xl btn-cta font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all font-heading cursor-pointer"
              >
                <span>Mulai Ujian 7 Soal</span>
              </button>
            </div>
          </div>
        </div>
      ) : activeTab === 'sakubun' ? (
        <SakubunStudio
          initialPatternId={currentBunpou.id}
          playerMp={playerMp}
          playerInt={playerInt}
          onUseMp={onUseMp}
          soundEnabled={soundEnabled}
          furiganaEnabled={furiganaEnabled}
          onReward={onReward}
          onClose={() => setActiveTab('materi')}
        />
      ) : (
        /* Mixed Set View */
        <div className="panel panel-stitched p-6 text-center space-y-4 shadow-xl border border-border-subtle">
          <div className="p-4 inline-flex rounded-full bg-surface-inset border border-border-subtle text-gold">
            <Swords className="w-8 h-8" />
          </div>

          <h3 className="text-lg sm:text-xl font-bold text-text-primary font-heading">
            {mixedSet.title}
          </h3>

          <p className="text-xs sm:text-sm text-text-secondary max-w-md mx-auto leading-relaxed">
            {mixedSet.description}
          </p>

          <div className="p-4 rounded-2xl bg-surface-inset border border-border-subtle text-xs text-text-secondary max-w-xs mx-auto space-y-1 font-mono">
            <div className="flex justify-between">
              <span>Jumlah Soal:</span>
              <strong className="text-text-primary">7 Soal Campuran</strong>
            </div>
            <div className="flex justify-between">
              <span>Target Kelulusan:</span>
              <strong className="text-gold">Minimal 5 Benar</strong>
            </div>
            <div className="flex justify-between">
              <span>Hadiah EXP:</span>
              <strong className="text-state-success">+120 EXP</strong>
            </div>
          </div>

          <button
            onClick={startMixedQuiz}
            className="w-full max-w-sm mx-auto py-3 px-6 rounded-2xl btn-cta font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 font-heading"
          >
            <Swords className="w-4 h-4" />
            <span>Mulai Tantangan Drill Campuran</span>
          </button>
        </div>
      )}
    </div>
  );
};
