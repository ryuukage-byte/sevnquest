import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Swords,
  Trophy,
  Shield,
  Volume2,
  Flame,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Layers,
  Feather,
  BookMarked,
  Headphones
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Question } from '../../types/content';
import { playSound, speakJapanese } from '../../utils/audio';
import { generateBossBattleDiagnostic } from '../../utils/mastery';

interface BossBattleModuleProps {
  bossName: string;
  bossTitle?: string;
  bossHpTotal?: number;
  questions: (Question & { category?: 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai' })[];
  playerStr: number;
  playerInt: number;
  playerHp: number;
  playerMaxHp: number;
  playerMp: number;
  playerMaxMp: number;
  onUseMp?: (amount: number) => boolean;
  onHpDamage?: (amount: number) => void;
  onGameOver?: () => void;
  onVictory: (exp: number, gold: number) => void;
  onExit: () => void;
  onStartRemediationRecall?: (itemIds: string[]) => void;
  soundEnabled?: boolean;
}

export const BossBattleModule: React.FC<BossBattleModuleProps> = ({
  bossName,
  bossTitle = 'Lord of the Region • Map Guardian',
  bossHpTotal = 1200,
  questions: propQuestions,
  playerStr,
  playerInt: _playerInt,
  playerHp: initialHp,
  playerMaxHp,
  playerMp,
  playerMaxMp,
  onUseMp,
  onHpDamage,
  onGameOver,
  onVictory,
  onExit,
  onStartRemediationRecall,
  soundEnabled = true,
}) => {
  const [sessionQuestions] = useState(propQuestions);
  const questions = sessionQuestions.length > 0 ? sessionQuestions : propQuestions;
  const [bossHp, setBossHp] = useState(bossHpTotal);
  const [currentHp, setCurrentHp] = useState(initialHp);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isBossHurt, setIsBossHurt] = useState(false);
  const [isPlayerHurt, setIsPlayerHurt] = useState(false);
  const [lastDamage, setLastDamage] = useState<number | null>(null);
  const [battleFinished, setBattleFinished] = useState(false);
  const [hiddenOptions, setHiddenOptions] = useState<number[]>([]);
  const [isCriticalBuffActive, setIsCriticalBuffActive] = useState(false);
  const [isShieldActive, setIsShieldActive] = useState(false);

  // Diagnostic tracking per pillar
  const [pillarResults, setPillarResults] = useState<Record<'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai', { score: number; total: number }>>({
    bunpou: { score: 0, total: 0 },
    kotoba: { score: 0, total: 0 },
    kanji: { score: 0, total: 0 },
    dokkai: { score: 0, total: 0 },
    choukai: { score: 0, total: 0 },
  });
  const [missedItemIds, setMissedItemIds] = useState<string[]>([]);

  const totalQuestions = Math.max(1, questions.length);
  const currentQ = questions[currentQIndex % totalQuestions];
  const qCategory = (currentQ.category || (
    currentQIndex % 5 === 0 ? 'bunpou' :
    currentQIndex % 5 === 1 ? 'kotoba' :
    currentQIndex % 5 === 2 ? 'kanji' :
    currentQIndex % 5 === 3 ? 'dokkai' : 'choukai'
  )) as 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai';

  const baseDamagePerHit = Math.round((bossHpTotal / totalQuestions) * (1 + playerStr * 0.06));
  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'bunpou':
        return { label: <><BookOpen className="inline w-3 h-3 mr-1" /> BUNPOU (25%)</>, color: 'bg-gold/15 text-gold border-border-subtle' };
      case 'kotoba':
        return { label: <><Layers className="inline w-3 h-3 mr-1" /> KOTOBA (20%)</>, color: 'bg-indigo/15 text-indigo border-border-subtle' };
      case 'kanji':
        return { label: <><Feather className="inline w-3 h-3 mr-1" /> KANJI (20%)</>, color: 'bg-wine-accent/15 text-wine-accent border-border-subtle' };
      case 'dokkai':
        return { label: <><BookMarked className="inline w-3 h-3 mr-1" /> DOKKAI (20%)</>, color: 'bg-dokkai/15 text-dokkai border-dokkai/30' };
      case 'choukai':
        return { label: <><Headphones className="inline w-3 h-3 mr-1" /> CHOUKAI (15%)</>, color: 'bg-choukai/15 text-choukai border-choukai/30' };
      default:
        return { label: <><Swords className="inline w-3 h-3 mr-1" /> UJI KOMPETENSI</>, color: 'bg-surface-inset text-text-secondary border-border-subtle' };
    }
  };

  const badge = getCategoryBadge(qCategory);

  const handleSelectOption = (idx: number) => {
    if (isAnswered) return;
    setSelectedOption(idx);
    setIsAnswered(true);

    const isCorrect = idx === currentQ.correctIndex;

    // Track diagnostic score
    setPillarResults(prev => ({
      ...prev,
      [qCategory]: {
        score: prev[qCategory].score + (isCorrect ? 1 : 0),
        total: prev[qCategory].total + 1
      }
    }));

    if (!isCorrect) {
      const qId = currentQ.id.replace('boss_kt_', '').replace('boss_kj_', '').replace('rc_', '');
      setMissedItemIds(prev => Array.from(new Set([...prev, qId])));
    }

    if (isCorrect) {
      playSound('attack', soundEnabled);

      setTimeout(() => {
        setIsBossHurt(true);
        const multiplier = isCriticalBuffActive ? 1.8 : 1.0;
        const actualDamage = Math.round((baseDamagePerHit + Math.floor(Math.random() * 25)) * multiplier);
        setLastDamage(actualDamage);
        setIsCriticalBuffActive(false);

        const newHp = Math.max(0, bossHp - actualDamage);
        setBossHp(newHp);

        if (newHp === 0 || currentQIndex >= totalQuestions - 1) {
          setTimeout(() => {
            setBattleFinished(true);
            playSound('fanfare', soundEnabled);
            confetti({
              particleCount: 120,
              spread: 80,
              origin: { y: 0.5 }
            });
            onVictory(500, 300);
          }, 800);
        }
      }, 250);

      setTimeout(() => {
        setIsBossHurt(false);
      }, 850);
    } else {
      playSound('wrong', soundEnabled);

      if (!isShieldActive) {
        setIsPlayerHurt(true);
        const playerDamage = 25;
        const nextHp = Math.max(0, currentHp - playerDamage);
        setCurrentHp(nextHp);
        
        if (onHpDamage) {
          onHpDamage(playerDamage);
        }

        setTimeout(() => {
          setIsPlayerHurt(false);
          if (nextHp <= 0 && onGameOver) {
            onGameOver();
          }
        }, 500);
      } else {
        setIsShieldActive(false);
        playSound('coin', soundEnabled);
      }
    }
  };

  const handleNextTurn = () => {
    if (bossHp <= 0 || currentQIndex >= totalQuestions - 1) {
      setBattleFinished(true);
      return;
    }
    setCurrentQIndex(prev => prev + 1);
    setSelectedOption(null);
    setIsAnswered(false);
    setLastDamage(null);
    setHiddenOptions([]);
  };

  // Skill 1: Hint 50/50
  const handleUseHint = () => {
    if (hiddenOptions.length > 0 || isAnswered) return;
    const mpCost = 15;
    if (onUseMp && !onUseMp(mpCost)) {
      alert('MP tidak cukup untuk Bantuan Hint 50/50!');
      return;
    }
    playSound('coin', soundEnabled);
    const wrongIndices = currentQ.options
      .map((_, i) => i)
      .filter(i => i !== currentQ.correctIndex);
    setHiddenOptions(wrongIndices.slice(0, 2));
  };

  // Skill 2: Critical Strike Buff
  const handleUseCritBuff = () => {
    if (isCriticalBuffActive || isAnswered) return;
    const mpCost = 20;
    if (onUseMp && !onUseMp(mpCost)) {
      alert('MP tidak cukup untuk Critical Strike!');
      return;
    }
    playSound('coin', soundEnabled);
    setIsCriticalBuffActive(true);
  };

  // Skill 3: Sacred Shield
  const handleUseShield = () => {
    if (isShieldActive || isAnswered) return;
    const mpCost = 15;
    if (onUseMp && !onUseMp(mpCost)) {
      alert('MP tidak cukup untuk Sacred Shield!');
      return;
    }
    playSound('coin', soundEnabled);
    setIsShieldActive(true);
  };

  if (battleFinished) {
    const diagnostic = generateBossBattleDiagnostic(pillarResults, missedItemIds);

    return (
      <div className="w-full max-w-lg mx-auto p-5 sm:p-7 panel panel-stitched border border-border-subtle text-center space-y-5 shadow-2xl">
        <div className="p-3.5 inline-flex rounded-full bg-surface-inset border border-border-subtle text-gold shadow-xl animate-bounce">
          <Trophy className="w-10 h-10" />
        </div>

        <div className="space-y-1">
          <span className="text-xs font-bold text-gold uppercase tracking-widest font-heading">
            HASIL UJIAN DIAGNOSTIK & BOSS BATTLE
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-text-primary font-heading">
            {bossName} DITAKLUKKAN!
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary">
            Kompetensi terpadu 5 pilar telah diuji secara komprehensif.
          </p>
        </div>

        {/* 5 Pillars Diagnostic Scoreboard */}
        <div className="p-4 rounded-2xl bg-surface-inset border border-border-subtle space-y-2.5 text-left">
          <div className="flex items-center justify-between pb-1.5 border-b border-border-subtle">
            <span className="text-xs font-bold text-gold font-heading">
              📊 Nilai Evaluasi 5 Pilar Bahasa:
            </span>
            <span className="text-xs font-mono font-bold text-text-primary">
              Akurasi: {diagnostic.overallPercentage}%
            </span>
          </div>

          <div className="space-y-2">
            {diagnostic.pillarResults.map(p => (
              <div key={p.category} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary font-medium">
                    {p.label}
                  </span>
                  <div className="flex items-center gap-2">
                    {p.isWeak && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-wine-accent/15 border border-border-subtle text-wine-accent rounded font-bold">
                        Butuh Penguatan ⚠
                      </span>
                    )}
                    <span className="font-mono font-bold text-xs text-text-primary">
                      {p.score}/{p.total} ({p.percentage}%)
                    </span>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-surface-card rounded-full overflow-hidden border border-border-subtle">
                  <div
                    className={`h-full rounded-full ${
                      p.percentage >= 80 ? 'bg-state-success' : p.percentage >= 60 ? 'bg-gold' : 'bg-wine-accent'
                    }`}
                    style={{ width: `${p.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Diagnostic Summary Message */}
          <div className="p-2.5 rounded-xl bg-surface-card border border-border-subtle text-[11px] text-text-secondary flex items-start gap-2 mt-2">
            <AlertTriangle className="w-4 h-4 text-gold shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {diagnostic.diagnosticSummary}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          {diagnostic.weakPillars.length > 0 && onStartRemediationRecall && (
            <button
              onClick={() => {
                playSound('click', soundEnabled);
                onStartRemediationRecall(diagnostic.remediationItemIds);
              }}
              className="w-full py-3 rounded-xl btn-cta font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2"
            >
              <Flame className="w-4 h-4 fill-current" />
              <span>Tinjau & Latih Kelemahan Sekarang (Recall)</span>
            </button>
          )}

          <button
            onClick={() => {
              playSound('click', soundEnabled);
              onExit();
            }}
            className="w-full py-3 rounded-xl btn btn-pill font-bold text-xs sm:text-sm"
          >
            Klaim Hadiah & Kembali ke Gerbang
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 pb-6">
      {/* Boss Arena Banner & Status */}
      <div className="relative p-5 sm:p-6 panel panel-stitched border border-border-subtle text-center shadow-xl overflow-hidden">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[11px] font-bold text-wine-accent bg-surface-inset px-2.5 py-0.5 rounded-full border border-border-subtle font-heading flex items-center gap-1">
            <Flame className="w-3 h-3 text-wine-accent" />
            UJIAN DIAGNOSTIK & BOSS BATTLE
          </span>
          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border font-heading ${badge.color}`}>
            {badge.label}
          </span>
        </div>

        {/* Boss Avatar */}
        <motion.div
          animate={
            isBossHurt
              ? { x: [-10, 10, -10, 10, 0], scale: 0.9, filter: 'brightness(1.8)' }
              : { y: [0, -4, 0] }
          }
          transition={{ duration: isBossHurt ? 0.3 : 2, repeat: isBossHurt ? 0 : Infinity }}
          className="relative inline-block my-2"
        >
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border border-border-subtle bg-surface-inset flex items-center justify-center text-4xl sm:text-5xl shadow-lg">
            👹
          </div>

          {/* Floating Damage Number */}
          <AnimatePresence>
            {lastDamage && isBossHurt && (
              <motion.div
                initial={{ opacity: 0, y: 0, scale: 0.5 }}
                animate={{ opacity: 1, y: -35, scale: 1.3 }}
                exit={{ opacity: 0 }}
                className="absolute top-0 inset-x-0 font-bold text-2xl text-wine-accent drop-shadow-md pointer-events-none font-mono"
              >
                -{lastDamage} HP!
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <h3 className="text-xl sm:text-2xl font-bold text-text-primary font-heading">
          {bossName}
        </h3>
        <p className="text-xs text-text-secondary font-medium">
          {bossTitle}
        </p>

        {/* Boss HP Bar */}
        <div className="max-w-md mx-auto mt-3 space-y-1">
          <div className="flex justify-between text-xs text-text-secondary font-heading">
            <span>Boss Health</span>
            <span className="font-mono text-wine-accent font-bold">{bossHp} / {bossHpTotal} HP</span>
          </div>
          <div className="h-3 w-full rpg-progress-track rounded-full overflow-hidden p-0.5 shadow-inner">
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: `${(bossHp / bossHpTotal) * 100}%` }}
              transition={{ duration: 0.4 }}
              className="h-full rounded-full bg-wine-accent"
            />
          </div>
        </div>
      </div>

      {/* Player Vitals HUD & Tactical Skills */}
      <div className="p-3 sm:p-4 panel flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-[10px] text-text-muted font-bold block font-heading">Hero HP:</span>
            <span className={`font-mono text-xs sm:text-sm font-bold ${isPlayerHurt ? 'text-wine-accent animate-pulse' : 'text-text-primary'}`}>
              {currentHp}/{playerMaxHp}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-text-muted font-bold block font-heading">Mana (MP):</span>
            <span className="font-mono text-xs sm:text-sm font-bold text-indigo">
              {playerMp}/{playerMaxMp}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-text-muted font-bold block font-heading">Ujian:</span>
            <span className="font-mono text-xs sm:text-sm font-bold text-gold">
              {currentQIndex + 1}/{totalQuestions}
            </span>
          </div>
        </div>

        {/* 3 Tactical Abilities */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleUseHint}
            disabled={hiddenOptions.length > 0 || isAnswered || playerMp < 15}
            className="btn btn-pill px-2.5 py-1 text-indigo text-[11px] font-bold disabled:opacity-40"
            title="Hilangkan 2 opsi salah (15 MP)"
          >
            Hint 50/50
          </button>

          <button
            onClick={handleUseCritBuff}
            disabled={isCriticalBuffActive || isAnswered || playerMp < 20}
            className={`btn btn-pill px-2.5 py-1 text-[11px] font-bold disabled:opacity-40 transition-all ${
              isCriticalBuffActive
                ? 'seg-active text-gold'
                : 'text-gold border-border-subtle'
            }`}
            title="Serangan Crit x1.8 (20 MP)"
          >
            <Swords className="inline w-3 h-3 mr-1 mb-0.5" /> Crit
          </button>

          <button
            onClick={handleUseShield}
            disabled={isShieldActive || isAnswered || playerMp < 15}
            className={`btn btn-pill px-2.5 py-1 text-[11px] font-bold disabled:opacity-40 transition-all ${
              isShieldActive
                ? 'seg-active text-gold border-state-success'
                : 'text-state-success border-state-success/40'
            }`}
            title="Kebal 1 Serangan Keliru (15 MP)"
          >
            <Shield className="inline w-3 h-3 mr-1 mb-0.5" /> Aegis
          </button>
        </div>
      </div>

      {/* Combat Question Card */}
      <div className="p-5 sm:p-6 panel panel-stitched shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-indigo uppercase font-heading">
            Tantangan {currentQIndex + 1} of {totalQuestions}
          </span>
          {currentQ.audioPrompt && (
            <button
              onClick={() => speakJapanese(currentQ.audioPrompt || currentQ.prompt)}
              className="btn btn-pill p-1.5 text-xs flex items-center gap-1"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Putar Audio</span>
            </button>
          )}
        </div>

        <h4 className="text-base sm:text-lg font-bold text-text-primary leading-relaxed font-jp">
          {currentQ.prompt}
        </h4>

        {/* Options */}
        <div className="space-y-2">
          {currentQ.options.map((opt, idx) => {
            const isHidden = hiddenOptions.includes(idx);
            if (isHidden) {
              return (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-surface-inset/40 border border-dashed border-border-subtle text-text-muted text-xs italic text-center"
                >
                  Opsi dieliminasi oleh Hint 50/50
                </div>
              );
            }

            let btnStyle = 'panel hover:border-border-primary text-text-primary';

            if (isAnswered) {
              if (idx === currentQ.correctIndex) {
                btnStyle = 'bg-state-success/15 border-state-success text-state-success shadow-md font-bold';
              } else if (idx === selectedOption) {
                btnStyle = 'bg-wine-accent/15 border-border-subtle text-wine-accent font-bold';
              } else {
                btnStyle = 'bg-surface-inset border-border-subtle text-text-muted opacity-40';
              }
            }

            return (
              <motion.button
                key={idx}
                whileTap={!isAnswered ? { scale: 0.99 } : {}}
                onClick={() => handleSelectOption(idx)}
                disabled={isAnswered}
                className={`w-full p-3.5 rounded-xl border text-left text-xs sm:text-sm font-medium flex items-center justify-between gap-3 transition-all ${btnStyle}`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-surface-inset border border-border-subtle text-xs flex items-center justify-center font-mono font-bold text-indigo">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="font-jp">{opt}</span>
                </div>

                {isAnswered && idx === currentQ.correctIndex && (
                  <CheckCircle2 className="w-4 h-4 text-state-success shrink-0" />
                )}
                {isAnswered && idx === selectedOption && idx !== currentQ.correctIndex && (
                  <XCircle className="w-4 h-4 text-wine-accent shrink-0" />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Explanation and Tutor Diagnostic Box */}
        <AnimatePresence>
          {isAnswered && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                selectedOption === currentQ.correctIndex
                  ? 'bg-state-success/15 border-state-success/40 text-text-primary'
                  : 'bg-wine-accent/15 border-border-subtle text-text-primary'
              }`}
            >
              <div className="font-bold flex items-center gap-1.5 font-heading">
                {selectedOption === currentQ.correctIndex ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-state-success" />
                    <span className="text-state-success">Serangan Sukses! Musuh Terpukul Telak!</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-wine-accent" />
                    <span className="text-wine-accent">Serangan Meleset! Pertahanan Terbuka!</span>
                  </>
                )}
              </div>
              <p className="text-text-secondary leading-relaxed">
                {currentQ.explanation}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Next Turn Button */}
        {isAnswered && (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleNextTurn}
            className="w-full py-3.5 rounded-xl btn-cta font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all font-heading"
          >
            <span>{currentQIndex < totalQuestions - 1 ? 'Giliran Pertarungan Berikutnya' : 'Selesaikan Ujian & Lihat Hasil'}</span>
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        )}
      </div>
    </div>
  );
};
