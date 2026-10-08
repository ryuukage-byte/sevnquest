import React, { useState } from 'react';
import { Headphones, Play, Pause, RotateCcw, FileText } from 'lucide-react';
import { ChoukaiItem } from '../../types/content';
import { CHOUKAI_DATABASE } from '../../data/choukai';
import { QuizEngine } from './QuizEngine';
import { speakJapanese, stopSpeaking, playSound } from '../../utils/audio';
import { RubyText } from './RubyText';

interface ChoukaiModuleProps {
  choukaiIds: string[];
  onReward: (exp: number, gold: number, moduleId: string, itemId?: string, score?: number, total?: number) => void;
  onBack: () => void;
  playerMp: number;
  playerInt: number;
  onUseMp: (amount: number) => boolean;
  soundEnabled?: boolean;
  furiganaEnabled?: boolean;
}

export const ChoukaiModule: React.FC<ChoukaiModuleProps> = ({
  choukaiIds,
  onReward,
  onBack: _onBack,
  playerMp,
  playerInt,
  onUseMp,
  soundEnabled = true,
  furiganaEnabled = true,
}) => {
  const selectedChoukaiId = choukaiIds[0] || 'choukai_001';
  const [isPlaying, setIsPlaying] = useState(false);
  const [speechRate, setSpeechRate] = useState(0.9);
  const [showTranscript, setShowTranscript] = useState(false);
  const [isQuizActive, setIsQuizActive] = useState(false);

  const currentChoukai: ChoukaiItem = CHOUKAI_DATABASE[selectedChoukaiId] || CHOUKAI_DATABASE['choukai_001'];

  const handleTogglePlayAudio = async () => {
    if (isPlaying) {
      stopSpeaking();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      playSound('click', soundEnabled);
      await speakJapanese(currentChoukai.audioText, speechRate);
      setIsPlaying(false);
    }
  };

  const handleReplay = async () => {
    stopSpeaking();
    setIsPlaying(true);
    playSound('click', soundEnabled);
    await speakJapanese(currentChoukai.audioText, speechRate);
    setIsPlaying(false);
  };

  if (isQuizActive) {
    return (
      <div className="w-full space-y-4">
        {/* Compact audio controller during quiz */}
        <div className="panel panel-stitched p-4 rounded-2xl border border-border-subtle flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2">
            <button
              onClick={handleTogglePlayAudio}
              className="btn-physical-secondary p-3 rounded-full transition-all"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>
            <span className="text-xs text-text-primary font-bold">
              {isPlaying ? 'Memutar Audio Percakapan...' : 'Putar Ulang Audio Listening'}
            </span>
          </div>

          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="text-[11px] px-2.5 py-1 rounded-lg bg-surface-inset text-text-secondary hover:text-text-primary border border-border-subtle"
          >
            {showTranscript ? 'Sembunyikan Naskah' : 'Lihat Naskah'}
          </button>
        </div>

        {showTranscript && (
          <div className="p-4 rounded-2xl bg-surface-inset border border-border-subtle text-xs text-text-primary whitespace-pre-line leading-relaxed font-jp">
            {((currentChoukai as any).transcriptReading || (currentChoukai as any).reading) && furiganaEnabled ? (
              <RubyText
                japanese={currentChoukai.transcript}
                reading={(currentChoukai as any).transcriptReading || (currentChoukai as any).reading}
                showFurigana={furiganaEnabled}
              />
            ) : (
              currentChoukai.transcript
            )}
          </div>
        )}

        <QuizEngine
          title={`🎧 Soal Choukai: ${currentChoukai.title}`}
          questions={currentChoukai.questions}
          playerMp={playerMp}
          playerInt={playerInt}
          onUseMp={onUseMp}
          soundEnabled={soundEnabled}
          furiganaEnabled={furiganaEnabled}
          onComplete={(score, total, exp, gold) => {
            onReward(exp, gold, 'choukai', currentChoukai.id, score, total);
          }}
          onExit={() => setIsQuizActive(false)}
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-xl bg-surface-inset border border-border-subtle text-text-primary">
            <Headphones className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-text-primary font-heading flex items-center gap-2">
              Modul 5: 🎧 CHOUKAI (Mendengarkan)
            </h2>
            <p className="text-xs text-text-secondary">
              Dengarkan percakapan alami bahasa Jepang & jawab 3 soal pemahaman
            </p>
          </div>
        </div>
      </div>

      {/* Audio Player Station Card */}
      <div className="panel panel-stitched p-6 rounded-3xl space-y-6 text-center shadow-xl border border-border-subtle">
        <div className="space-y-1">
          <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-surface-inset text-text-primary border border-border-subtle font-bold">
            {currentChoukai.level} • {currentChoukai.dialogueSpeaker}
          </span>
          <h3 className="text-xl font-bold text-text-primary font-heading mt-2">
            {currentChoukai.title}
          </h3>
        </div>

        {/* Audio Wave Visualizer Animation */}
        <div className="flex items-center justify-center gap-1.5 h-16 bg-surface-inset rounded-2xl border border-border-subtle px-6">
          {Array.from({ length: 24 }).map((_, i) => (
            <div
              key={i}
              className={`w-1 rounded-full transition-all duration-200 ${
                isPlaying ? 'bg-gold animate-pulse' : 'bg-border-subtle h-3'
              }`}
              style={{
                height: isPlaying ? `${Math.max(6, (Math.sin(i * 0.7) + 1.2) * 20)}px` : '6px',
                animationDelay: `${i * 0.08}s`
              }}
            />
          ))}
        </div>

        {/* Audio Main Controls */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={handleReplay}
            className="btn-physical-secondary p-3 rounded-2xl transition-colors"
            title="Putar dari Awal"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          <button
            onClick={handleTogglePlayAudio}
            className="btn-physical-primary p-5 rounded-full font-black transition-all"
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 fill-current" />
            ) : (
              <Play className="w-8 h-8 fill-current ml-1" />
            )}
          </button>

          <div className="flex items-center gap-1 bg-surface-inset p-1.5 rounded-2xl border border-border-subtle">
            {[0.8, 0.95, 1.1].map((rate) => (
              <button
                key={rate}
                onClick={() => {
                  setSpeechRate(rate);
                  playSound('click', soundEnabled);
                }}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all ${
                  speechRate === rate
                    ? 'seg-active text-gold font-bold'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>

        {/* Transcript Toggle */}
        <div className="pt-2">
          <button
            onClick={() => {
              setShowTranscript(!showTranscript);
              playSound('click', soundEnabled);
            }}
            className="text-xs text-text-secondary hover:text-text-primary flex items-center justify-center gap-1.5 mx-auto transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{showTranscript ? 'Tutup Transkrip Audio' : 'Buka Transkrip Audio (Teks)'}</span>
          </button>

          {showTranscript && (
            <div className="mt-3 p-4 rounded-2xl bg-surface-inset text-left text-xs sm:text-sm text-text-primary whitespace-pre-line leading-relaxed border border-border-subtle font-jp">
              {((currentChoukai as any).transcriptReading || (currentChoukai as any).reading) && furiganaEnabled ? (
                <RubyText
                  japanese={currentChoukai.transcript}
                  reading={(currentChoukai as any).transcriptReading || (currentChoukai as any).reading}
                  showFurigana={furiganaEnabled}
                />
              ) : (
                currentChoukai.transcript
              )}
            </div>
          )}
        </div>

        {/* Start Choukai Quiz CTA */}
        <button
          onClick={() => {
            playSound('click', soundEnabled);
            setIsQuizActive(true);
          }}
          className="w-full py-3.5 rounded-2xl btn-cta font-bold text-sm transition-all flex items-center justify-center gap-2 font-heading"
        >
          <span>Mulai Jawab 3 Soal Choukai</span>
        </button>
      </div>
    </div>
  );
};
