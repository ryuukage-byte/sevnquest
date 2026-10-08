import React, { useState } from 'react';
import { BookMarked, FileText, AlertTriangle, Layers } from 'lucide-react';
import { DokkaiItem } from '../../types/content';
import { DOKKAI_DATABASE } from '../../data/dokkai';
import { QuizEngine } from './QuizEngine';
import { playSound } from '../../utils/audio';
import { diagnoseDokkaiMistake } from '../../utils/mastery';
import { RubyText } from './RubyText';

interface DokkaiModuleProps {
  dokkaiIds: string[];
  onReward: (exp: number, gold: number, moduleId: string, itemId?: string, score?: number, total?: number) => void;
  onBack: () => void;
  playerMp: number;
  playerInt: number;
  onUseMp: (amount: number) => boolean;
  soundEnabled?: boolean;
  furiganaEnabled?: boolean;
}

export const DokkaiModule: React.FC<DokkaiModuleProps> = ({
  dokkaiIds,
  onReward,
  onBack: _onBack,
  playerMp,
  playerInt,
  onUseMp,
  soundEnabled = true,
  furiganaEnabled = true,
}) => {
  const [selectedDokkaiId, setSelectedDokkaiId] = useState<string>(dokkaiIds[0] || 'dokkai_001');
  const [isQuizActive, setIsQuizActive] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<ReturnType<typeof diagnoseDokkaiMistake> | null>(null);

  const fallbackDokkai: DokkaiItem = Object.values(DOKKAI_DATABASE)[0] || {
    id: 'dokkai_001',
    title: 'Wacana Permulaan (N5)',
    level: 'N5',
    category: 'Wacana Singkat',
    text: 'はじめまして。わたしはがくせいです。にほんごをべんきょうしています。',
    questions: [],
    vocabularyList: []
  };

  const readings: DokkaiItem[] = dokkaiIds.map(id => DOKKAI_DATABASE[id]).filter(Boolean);
  const safeReadings = readings.length > 0 ? readings : [fallbackDokkai];
  const currentReading: DokkaiItem = DOKKAI_DATABASE[selectedDokkaiId] || safeReadings[0] || fallbackDokkai;

  if (isQuizActive) {
    return (
      <div className="w-full space-y-4">
        {/* Sticky reading preview card during quiz */}
        <div className="p-4 sm:p-5 rounded-2xl bg-surface-inset border border-border-subtle text-xs text-text-secondary max-h-48 overflow-y-auto mb-2 shadow-md">
          <span className="font-bold text-gold block mb-1 font-heading">
            📖 Teks Bacaan: {currentReading?.title || 'Wacana'}
          </span>
          <p className="whitespace-pre-line leading-relaxed font-jp text-text-primary">
            {(currentReading as any).reading && furiganaEnabled ? (
              <RubyText
                japanese={currentReading.text}
                reading={(currentReading as any).reading}
                showFurigana={furiganaEnabled}
              />
            ) : (
              currentReading.text
            )}
          </p>
        </div>

        <QuizEngine
          title={`📚 Soal Pemahaman: ${currentReading.title}`}
          questions={currentReading.questions}
          playerMp={playerMp}
          playerInt={playerInt}
          onUseMp={onUseMp}
          soundEnabled={soundEnabled}
          furiganaEnabled={furiganaEnabled}
          onComplete={(score, total, exp, gold) => {
            if (score < total) {
              const diag = diagnoseDokkaiMistake(currentReading, 0);
              setDiagnosticResult(diag);
            } else {
              setDiagnosticResult(null);
            }
            onReward(exp, gold, 'dokkai', currentReading.id, score, total);
          }}
          onExit={() => setIsQuizActive(false)}
        />

        {/* Diagnostic Analysis Card if mistakes occurred */}
        {diagnosticResult && (
          <div className="p-4 sm:p-5 rounded-2xl bg-surface-inset border border-border-primary space-y-2.5 text-xs text-text-secondary shadow-xl">
            <div className="flex items-center gap-2 text-gold font-bold font-heading">
              <AlertTriangle className="w-4 h-4 text-gold" />
              <span>Analisis Diagnostik Pemahaman Dokkai</span>
            </div>
            <p className="leading-relaxed text-text-primary">
              {diagnosticResult.diagnosticMessage}
            </p>

            {diagnosticResult.weakGrammars.length > 0 && (
              <div className="pt-2 border-t border-border-subtle">
                <span className="text-[11px] font-bold text-text-muted block mb-1">
                  Pola Tata Bahasa Terkait (Otomatis ditambahkan ke antrean Recall):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {diagnosticResult.weakGrammars.map(g => (
                    <span key={g.id} className="px-2 py-0.5 rounded-lg bg-surface-card border border-border-subtle text-text-primary text-[11px] font-heading">
                      {g.title} ({g.meaning})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-5 pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-subtle">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-teal-500/15 border border-border-subtle text-teal-400 shadow-md">
            <BookMarked className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-text-primary font-heading flex items-center gap-2">
              <span className="text-teal-400">読</span> DOKKAI (Membaca Teks Terpadu)
            </h2>
            <p className="text-xs text-text-secondary">
              Integrasi tata bahasa, kosakata, dan kanji dalam teks utuh
            </p>
          </div>
        </div>

        {/* Reading Selector */}
        <div className="flex items-center gap-1.5 bg-surface-inset p-1 rounded-2xl border border-border-subtle">
          {readings.map((reading, idx) => {
            const isSelected = selectedDokkaiId === reading.id;
            return (
              <button
                key={reading.id}
                onClick={() => {
                  setSelectedDokkaiId(reading.id);
                  playSound('click', soundEnabled);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all font-heading ${
                  isSelected
                    ? 'seg-active text-gold font-bold'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                Reading {idx + 1} ({reading.questions.length} Soal)
              </button>
            );
          })}
        </div>
      </div>

      {/* Reading Text Card */}
      <div className="panel panel-stitched p-6 sm:p-7 rounded-3xl space-y-5 shadow-xl border border-border-subtle">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border-subtle">
          <div>
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-surface-inset text-gold border border-border-subtle font-bold">
              {currentReading.level} • {currentReading.category}
            </span>
            <h3 className="text-lg sm:text-xl font-bold text-text-primary mt-1.5 font-heading">
              {currentReading.title}
            </h3>
          </div>
          <span className="text-xs text-text-secondary font-mono">
            {currentReading.questions.length} Pertanyaan Uji
          </span>
        </div>

        {/* Text Body */}
        <div className="p-5 sm:p-6 rounded-2xl bg-surface-inset border border-border-subtle text-text-primary text-sm sm:text-base leading-relaxed whitespace-pre-line font-jp">
          {(currentReading as any).reading && furiganaEnabled ? (
            <RubyText
              japanese={currentReading.text}
              reading={(currentReading as any).reading}
              showFurigana={furiganaEnabled}
            />
          ) : (
            currentReading.text
          )}
        </div>

        {/* Content Relationship Layer Pills */}
        {currentReading.relationships && (
          <div className="p-3 rounded-2xl bg-surface-inset border border-border-subtle flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-text-secondary text-[11px]">
              <Layers className="w-3.5 h-3.5 text-gold" />
              <span>Komposisi Materi Integrasi:</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono">
              <span className="text-gold font-bold">70% Materi Stage Ini</span>
              <span className="text-border-primary">•</span>
              <span className="text-text-secondary font-bold">20% Stage Lalu</span>
              <span className="text-border-primary">•</span>
              <span className="text-gold-soft font-bold">10% Preview Berikutnya</span>
            </div>
          </div>
        )}

        {/* Vocabulary List Helper */}
        {currentReading?.vocabularyList && currentReading.vocabularyList.length > 0 && (
          <div className="p-4 rounded-2xl bg-surface-inset border border-border-subtle space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5 font-heading">
              <FileText className="w-3.5 h-3.5 text-gold" />
              Kosakata Kunci Dalam Teks
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(currentReading.vocabularyList || []).map((vocab, i) => (
                <div key={i} className="text-xs p-2 rounded-xl bg-surface-card border border-border-subtle flex justify-between items-center">
                  <span className="text-gold font-bold">
                    {vocab.reading && furiganaEnabled ? (
                      <RubyText
                        japanese={vocab.word.replace(/\s*\([^)]*\)/g, '')}
                        reading={vocab.reading}
                        showFurigana={furiganaEnabled}
                      />
                    ) : (
                      <span className="font-jp">{vocab.word}</span>
                    )}
                  </span>
                  <span className="text-text-secondary">{vocab.meaning}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Start Quiz CTA */}
        <button
          onClick={() => {
            playSound('click', soundEnabled);
            setIsQuizActive(true);
          }}
          className="w-full py-3.5 rounded-2xl btn-cta font-bold text-sm transition-all flex items-center justify-center gap-2 font-heading"
        >
          <span>Jawab {currentReading.questions.length} Soal Pemahaman Dokkai</span>
        </button>
      </div>
    </div>
  );
};
