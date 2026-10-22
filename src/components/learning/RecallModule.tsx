import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Flame, CheckCircle2, XCircle, Volume2, ArrowRight, Award, ShieldAlert, BookOpen, Check } from 'lucide-react';
import confetti from 'canvas-confetti';
import { RecallQueueItem, RecallPriorityTier } from '../../types/content';
import { playSound } from '../../utils/audio';
import { speakJapanese } from '../../utils/speech';
import { japaneseSpeechFromPrompt } from '../../utils/speechText';
import { calcEngineExp, getEntityBaseExp } from '../../utils/rewards';
import { RubyText } from './RubyText';
import { planRecallSession, normalizeRecallDaily, RECALL_LIMITS, type RecallDaily } from '../../engine/recall/session';
import { getTodayLocalDate } from '../../utils/time';
import { DOKKAI_DATABASE } from '../../data/dokkai';
import { CHOUKAI_DATABASE } from '../../data/choukai';
import { KanjiWritingCanvas } from './KanjiWritingCanvas';
import { KotobaWritingPractice } from './KotobaWritingPractice';
import { KOTOBA_DATABASE } from '../../data/kotoba';
import { KANJI_DATABASE } from '../../data/kanji';
import { BUNPOU_DATABASE } from '../../data/bunpou';
import { FusionPlayer, readReduceMotion } from '../dungeon/fusion/GrammarFusionModal';
import { buildFreeStage } from '../../engine/fusion/freeStage';
import { getFusionPatterns } from '../../data/fusion/verbPool';

interface RecallModuleProps {
  recallQueue: RecallQueueItem[];
  playerMp: number;
  playerInt: number;
  onUseMp?: (amount: number) => boolean;
  onItemReviewed: (itemId: string, category: 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai', isCorrect: boolean, interactionType?: 'writing' | 'flashcard' | 'quiz') => void;
  /** `opts.sessionKey` = identitas sesi (cegah bayar dua kali); `opts.partial` = sesi ditinggalkan di tengah. */
  onCompleteRecallSession: (
    totalReviewed: number, correctCount: number, expGained: number, goldGained: number,
    opts?: { sessionKey?: string; partial?: boolean; extra?: boolean }
  ) => void;
  onExit: () => void;
  soundEnabled?: boolean;
  furiganaEnabled?: boolean;
  /** Status sinkron cloud; dipakai untuk membedakan "antrean kosong" dari "progres belum termuat". */
  syncStatus?: 'idle' | 'syncing' | 'synced' | 'error';
  /** true bila pemain sudah punya catatan mastery (pernah belajar sesuatu). */
  hasProgress?: boolean;
  /** Kuota Recall hari ini (jawaban / materi baru / sesi); menentukan ukuran sesi dan keadaan "target tercapai". */
  recallDaily?: RecallDaily;
}

export const RecallModule: React.FC<RecallModuleProps> = ({
  recallQueue: liveRecallQueue,
  playerMp: _playerMp,
  playerInt,
  onUseMp,
  onItemReviewed,
  onCompleteRecallSession,
  onExit,
  soundEnabled = true,
  furiganaEnabled = true,
  syncStatus = 'idle',
  hasProgress = true,
  recallDaily,
}) => {
  // Antrean DIBEKUKAN selama sesi. handleItemReviewed membangun ulang `recallQueue` di stats tepat saat
  // pemain mengklik jawaban; kalau layar membaca antrean hidup itu, item yang baru dijawab turun/bergeser,
  // soal dikocok ulang, dan yang tampil jadi soal lain padahal skornya sudah dihitung dari soal sebelumnya.
  // Pengecualian: bila saat dibuka antrean masih kosong (progres sedang dimuat), ikuti antrean hidup
  // sampai terisi sekali.
  // Sesi = potongan antrean sesuai kuota (ukuran sesi, jatah harian, jatah materi baru), bukan seluruh antrean.
  const today = getTodayLocalDate();
  const daily = normalizeRecallDaily(recallDaily, today);
  const livePlan = planRecallSession(liveRecallQueue || [], recallDaily, today);
  const extraPlan = planRecallSession(liveRecallQueue || [], recallDaily, today, { extra: true });
  const [recallQueue, setSessionQueue] = useState<RecallQueueItem[]>(() => livePlan.items);
  useEffect(() => {
    if (recallQueue.length === 0 && livePlan.items.length > 0) {
      setSessionQueue(livePlan.items);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveRecallQueue, recallQueue.length]);
  // Latihan ekstra setelah target harian / kuota materi baru tercapai: sesi kecil, tetap berurut prioritas.
  const [isExtraSession, setIsExtraSession] = useState(false);
  const startExtraSession = () => {
    // Sesi baru: identitas, penghitung, dan penanda ekstra direset (jangan bentrok dengan sesi sebelumnya).
    sessionKeyRef.current = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    progressRef.current = { answered: 0, correct: 0, exp: 0, finished: false };
    extraRef.current = true;
    setIsExtraSession(true);
    setSessionQueue(extraPlan.items);
    setCurrentIndex(0);
    setActiveFilter('ALL');
  };

  const [activeFilter, setActiveFilter] = useState<'ALL' | RecallPriorityTier>('ALL');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  // EXP sesi = Σ (Base EXP materi × multiplier engine) untuk tiap jawaban benar
  const [sessionExp, setSessionExp] = useState(0);
  const [hiddenOptions, setHiddenOptions] = useState<number[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  // Identitas sesi + ringkasan terkini (untuk membayar sesi yang ditinggalkan di tengah jalan).
  const sessionKeyRef = useRef(`${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`);
  const progressRef = useRef({ answered: 0, correct: 0, exp: 0, finished: false });
  const extraRef = useRef(false);
  const onCompleteRef = useRef(onCompleteRecallSession);
  onCompleteRef.current = onCompleteRecallSession;
  useEffect(() => () => {
    // Keluar/berpindah tab di tengah sesi: jawaban sudah tercatat di mastery, jadi EXP-nya juga dibayar (tanpa bonus INT).
    const p = progressRef.current;
    if (!p.finished && p.answered > 0 && p.exp > 0) {
      onCompleteRef.current(p.answered, p.correct, p.exp, p.correct * 15, { sessionKey: sessionKeyRef.current, partial: true, extra: extraRef.current });
    }
  }, []);
  // Hasil nyata sesi (sama dengan yang diberikan ke pemain), untuk layar ringkasan.
  const [sessionReward, setSessionReward] = useState<{ exp: number; gold: number } | null>(null);

  // Level 5 Sentence Construction State
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  // Bank kata berurutan tetap (diacak sekali per soal); kata yang terpakai hanya ditandai lewat id-nya,
  // sehingga saat dilepas ia kembali ke slot semula, bukan pindah ke belakang.
  const [availableWords, setAvailableWords] = useState<{ id: string; word: string }[]>([]);
  const [selectedWordIds, setSelectedWordIds] = useState<string[]>([]);

  // Filtered queue
  const filteredQueue = activeFilter === 'ALL'
    ? recallQueue
    : recallQueue.filter(q => q.priorityTier === activeFilter);

  const currentItem = filteredQueue[currentIndex] || filteredQueue[0] || recallQueue[0];

  // Initialize word bank if current question is Level 5 Sentence Production
  useEffect(() => {
    if (currentItem?.sampleQuestion?.difficultyLevel === 5 && currentItem.sampleQuestion.scrambleWords?.length) {
      setAvailableWords(
        currentItem.sampleQuestion.scrambleWords.map((w, idx) => ({
          id: `${w}_${idx}`,
          word: w
        }))
      );
      setSelectedWords([]);
      setSelectedWordIds([]);
    } else {
      setSelectedWords([]);
      setSelectedWordIds([]);
      setAvailableWords([]);
    }
    // Kunci pada identitas soal, bukan objek `currentItem`: antrean Recall dihitung ulang saat stats
    // berubah dan menghasilkan soal Level 5 dengan acakan baru, yang akan mereset susunan di tengah jalan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, currentItem?.itemId, currentItem?.sampleQuestion?.id]);

  // Engine audio (listening / choukai): putar otomatis saat soal tampil; ikon speaker memutar ulang.
  const audioFormat = currentItem?.exerciseFormat === 'listening' || currentItem?.exerciseFormat === 'choukai';
  useEffect(() => {
    if (!audioFormat || !currentItem?.sampleQuestion?.audioPrompt) return;
    const rate = currentItem.exerciseFormat === 'choukai' ? CHOUKAI_DATABASE[currentItem.itemId]?.speechRate : undefined;
    speakJapanese(currentItem.sampleQuestion.audioPrompt, rate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentItem?.itemId, currentItem?.sampleQuestion?.id, audioFormat]);

  if (!recallQueue || recallQueue.length === 0) {
    // Antrean kosong punya tiga penyebab berbeda; pesannya harus dibedakan supaya pemain tidak mengira
    // progresnya hilang padahal hanya belum termuat dari cloud.
    const hasPending = (liveRecallQueue || []).length > 0;
    const quotaState = hasPending && livePlan.items.length === 0
      ? livePlan.capReached
        ? { icon: <Award className="w-10 h-10" />, title: 'TARGET RECALL HARI INI TERCAPAI', body: `Kamu sudah menjawab ${daily.answered}/${RECALL_LIMITS.dailyCap} soal hari ini. ${livePlan.deferred} materi lain menunggu besok sesuai jadwal SRS; istirahat juga bagian dari mengingat.` }
        : { icon: <Award className="w-10 h-10" />, title: 'KUOTA MATERI BARU HARI INI HABIS', body: `Sudah ${daily.newTested}/${RECALL_LIMITS.newPerDay} materi baru diuji hari ini. ${livePlan.deferred} materi lain akan masuk di hari berikutnya.` }
      : null;
    const emptyState = quotaState ??
      (syncStatus === 'syncing'
        ? { icon: <ShieldAlert className="w-10 h-10" />, title: 'MEMUAT PROGRESMU…', body: 'Sedang mengambil progres dari cloud. Materi Recall akan muncul setelah selesai.' }
        : syncStatus === 'error'
          ? { icon: <ShieldAlert className="w-10 h-10" />, title: 'PROGRES BELUM TERMUAT', body: 'Sinkronisasi dengan cloud gagal, jadi materi Recall belum bisa dihitung. Progresmu tidak hilang. Periksa koneksi lalu buka Recall lagi.' }
          : !hasProgress
            ? { icon: <BookOpen className="w-10 h-10" />, title: 'BELUM ADA MATERI DIULANG', body: 'Recall mengulang materi yang sudah kamu pelajari. Selesaikan beberapa lantai di Menara atau latihan dulu, lalu kembali ke sini.' }
            : { icon: <CheckCircle2 className="w-10 h-10" />, title: 'SEMUA MATERI TELAH SEGAR!', body: 'Tidak ada materi dalam antrean Recall yang perlu direview saat ini. Ingatanmu masih dalam kondisi prima.' });
    return (
      <div className="w-full max-w-lg mx-auto p-6 sm:p-8 rounded-3xl panel panel-stitched border border-border-subtle text-center space-y-5 shadow-xl">
        <div className="p-4 inline-flex rounded-full bg-gold/15 border border-border-subtle text-gold shadow-md">
          {emptyState.icon}
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gold font-heading">
            {emptyState.title}
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            {emptyState.body}
          </p>
        </div>
        {quotaState && extraPlan.items.length > 0 && (
          <button
            onClick={startExtraSession}
            className="rpg-btn rpg-btn-primary w-full py-3.5 text-xs sm:text-sm font-heading"
          >
            Latihan Ekstra ({extraPlan.items.length} soal)
          </button>
        )}
        <button
          onClick={onExit}
          className="rpg-btn rpg-btn-secondary w-full py-3.5 text-xs sm:text-sm font-heading"
        >
          Kembali ke Beranda
        </button>
      </div>
    );
  }

  if (!currentItem) {
    return (
      <div className="w-full max-w-lg mx-auto p-6 rounded-3xl panel panel-stitched border border-border-subtle text-center space-y-4">
        <p className="text-xs text-text-secondary">Tidak ada item pada filter ini.</p>
        <button
          onClick={() => {
            setActiveFilter('ALL');
            setCurrentIndex(0);
          }}
          className="rpg-btn rpg-btn-primary px-4 py-2 text-xs"
        >
          Tampilkan Semua Materi
        </button>
      </div>
    );
  }

  const currentQ = currentItem.sampleQuestion || {
    id: `rc_${currentItem.itemId}`,
    prompt: `Apa penggunaan yang tepat untuk materi 「${currentItem.title}」?`,
    options: [currentItem.subtitle || 'Pilihan arti tepat', 'Pilihan tidak relevan', 'Bukan kalimat alami', 'Salah bentuk'],
    correctIndex: 0,
    explanation: `${currentItem.title}: ${currentItem.subtitle}`
  };

  const totalItems = filteredQueue.length;
  const isSentenceBuilder = currentQ.difficultyLevel === 5 && !!currentQ.scrambleWords?.length;
  // Engine latihan non-pilihan-ganda yang dipilih untuk item ini (lihat selectRecallEngine di utils/mastery).
  const rawEngine = currentItem.exerciseFormat === 'canvas' || currentItem.exerciseFormat === 'fusion'
    ? currentItem.exerciseFormat : null;
  // Grammar Fusion: stage dibangun dari pola bunpou + kata kerja yang dipilih saat antrean dibangun.
  // (tanpa useMemo: berada setelah early-return; FusionPlayer hanya membaca `stage` sekali lewat key per item)
  const fusionStage = (() => {
    if (rawEngine !== 'fusion' || !currentItem.fusion) return null;
    const allPatterns = getFusionPatterns();
    const pattern = allPatterns.find(p => p.id === currentItem.fusion!.patternId);
    return pattern ? buildFreeStage(pattern, currentItem.fusion.verb, { allPatterns }) : null;
  })();
  const kotobaForCanvas = currentItem.category === 'kotoba' ? KOTOBA_DATABASE[currentItem.itemId] : undefined;
  const kanjiForCanvas = currentItem.category === 'kanji' ? KANJI_DATABASE[currentItem.itemId] : undefined;
  // Jatuh kembali ke soal bila data engine tidak tersedia (mis. materi kustom).
  const engine = rawEngine === 'canvas' && (kotobaForCanvas || kanjiForCanvas) ? 'canvas'
    : rawEngine === 'fusion' && fusionStage ? 'fusion' : null;

  // Satu jalur pencatatan hasil untuk SEMUA engine (pilihan ganda, canvas, fusion). Setiap hasil berasal dari
  // jawaban yang dinilai sistem; tidak ada penilaian diri (ingat / lupa).
  const submitResult = (isCorrect: boolean, interaction: 'writing' | 'quiz', expKind: 'recall' | 'sentence' = 'recall') => {
    if (isAnswered) return;
    setIsAnswered(true);
    progressRef.current.answered += 1;
    if (isCorrect) {
      const gain = calcEngineExp(getEntityBaseExp(currentItem.category, currentItem.itemId) ?? 25, expKind);
      progressRef.current.correct += 1;
      progressRef.current.exp += gain;
      setCorrectCount(prev => prev + 1);
      setSessionExp(prev => prev + gain);
      playSound('correct', soundEnabled);
    } else {
      playSound('wrong', soundEnabled);
    }
    onItemReviewed(currentItem.itemId, currentItem.category, isCorrect, interaction);
  };

  const handleSelectOption = (idx: number) => {
    if (isAnswered) return;
    setSelectedOption(idx);
    submitResult(idx === currentQ.correctIndex, 'quiz');
  };

  // Handle word selection for Level 5 sentence production
  const handleWordClick = (wordObj: { id: string; word: string }) => {
    if (isAnswered || selectedWordIds.includes(wordObj.id)) return;
    setSelectedWords(prev => [...prev, wordObj.word]);
    setSelectedWordIds(prev => [...prev, wordObj.id]);
  };

  const handleRemoveWord = (_word: string, indexToRemove: number) => {
    if (isAnswered) return;
    setSelectedWords(prev => prev.filter((_, i) => i !== indexToRemove));
    setSelectedWordIds(prev => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleSubmitSentenceProduction = () => {
    if (isAnswered) return;
    const constructed = selectedWords.join('');
    const targetString = currentQ.orderedTarget ? currentQ.orderedTarget.join('') : (currentQ.options[0] || '');
    // Check if constructed matches target or contains all key components
    const isCorrect = constructed === targetString || constructed.replace(/\s+/g, '') === targetString.replace(/\s+/g, '');
    submitResult(isCorrect, 'quiz', 'sentence');
  };

  const handleNext = () => {
    if (currentIndex < totalItems - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
      setHiddenOptions([]);
    } else {
      setIsFinished(true);
      const expGained = sessionExp + Math.round(playerInt * 2);
      const goldGained = correctCount * 15;

      if (correctCount >= Math.ceil(totalItems * 0.7)) {
        playSound('fanfare', soundEnabled);
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      }

      setSessionReward({ exp: expGained, gold: goldGained });
      progressRef.current.finished = true;
      onCompleteRecallSession(totalItems, correctCount, expGained, goldGained, { sessionKey: sessionKeyRef.current, extra: isExtraSession });
    }
  };

  const handleUse5050 = () => {
    if (hiddenOptions.length > 0 || isAnswered || isSentenceBuilder) return;
    const mpCost = 10;
    if (onUseMp && !onUseMp(mpCost)) {
      alert('MP tidak cukup untuk Mantra 50/50!');
      return;
    }

    playSound('coin', soundEnabled);
    const correctIdx = currentQ.correctIndex;
    const wrongIndices = currentQ.options
      .map((_, i) => i)
      .filter(i => i !== correctIdx);
    setHiddenOptions(wrongIndices.slice(0, 2));
  };

  if (isFinished) {
    const accuracy = totalItems > 0 ? Math.round((correctCount / totalItems) * 100) : 100;
    return (
      <div className="w-full max-w-lg mx-auto p-6 sm:p-8 rounded-3xl panel panel-stitched border border-border-subtle text-center space-y-6 shadow-2xl">
        <div className="p-4 inline-flex rounded-full bg-gold/15 border border-border-subtle text-gold shadow-xl">
          <Award className="w-12 h-12" />
        </div>

        <div className="space-y-1">
          <span className="text-xs font-bold text-gold uppercase tracking-widest font-mono">
            SESI RECALL ADAPTIF SELESAI
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-text-primary font-heading">
            DAYA INGAT DIPERKUAT!
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary">
            {correctCount} dari {totalItems} materi berhasil diingat dengan tingkat akurasi ({accuracy}%).
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-surface-inset border border-border-subtle">
          <div>
            <span className="text-[11px] text-text-muted">Hadiah Sesi</span>
            <p className="text-lg font-bold text-gold font-mono">+{sessionReward?.exp ?? 0} EXP · +{sessionReward?.gold ?? 0} Gold</p>
          </div>
          <div>
            <span className="text-[11px] text-text-muted">Target Hari Ini</span>
            <p className="text-lg font-bold text-gold font-mono">{daily.answered}/{RECALL_LIMITS.dailyCap}</p>
          </div>
        </div>

        {!isExtraSession && livePlan.items.length > 0 && (
          <p className="text-[11px] text-text-muted">
            Masih ada {livePlan.items.length} materi untuk dicicil hari ini (sisa jatah {livePlan.remainingToday}). Buka Recall lagi untuk sesi berikutnya.
          </p>
        )}
        <button
          onClick={onExit}
          className="rpg-btn rpg-btn-primary w-full py-3.5 text-sm"
        >
          Selesai & Kembali ke Beranda
        </button>
      </div>
    );
  }

  // Count items per priority
  const countCritical = recallQueue.filter(q => q.priorityTier === 'CRITICAL').length;
  const countWeak = recallQueue.filter(q => q.priorityTier === 'WEAK').length;
  const countReview = recallQueue.filter(q => q.priorityTier === 'REVIEW').length;
  const countMaintain = recallQueue.filter(q => q.priorityTier === 'MAINTAIN').length;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 pb-6">
      {/* Priority Filter Tabs — Unified 2-Color Skeuomorphic Design */}
      <div className="flex flex-wrap items-center gap-1.5 pb-1 text-xs">
        <button
          onClick={() => { setActiveFilter('ALL'); setCurrentIndex(0); }}
          className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
            activeFilter === 'ALL'
              ? 'seg-active text-gold font-mono'
              : 'bg-surface-inset text-text-secondary hover:text-text-primary border border-border-subtle hover:border-border-primary'
          }`}
        >
          Semua ({recallQueue.length})
        </button>
        {countCritical > 0 && (
          <button
            onClick={() => { setActiveFilter('CRITICAL'); setCurrentIndex(0); }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1 ${
              activeFilter === 'CRITICAL'
                ? 'seg-active text-gold font-mono'
                : 'bg-surface-inset text-text-secondary hover:text-text-primary border border-border-subtle hover:border-border-primary'
            }`}
          >
            <span>Kritis</span>
            <span className="font-mono">({countCritical})</span>
          </button>
        )}
        {countWeak > 0 && (
          <button
            onClick={() => { setActiveFilter('WEAK'); setCurrentIndex(0); }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1 ${
              activeFilter === 'WEAK'
                ? 'seg-active text-gold font-mono'
                : 'bg-surface-inset text-text-secondary hover:text-text-primary border border-border-subtle hover:border-border-primary'
            }`}
          >
            <span>Lemah</span>
            <span className="font-mono">({countWeak})</span>
          </button>
        )}
        {countReview > 0 && (
          <button
            onClick={() => { setActiveFilter('REVIEW'); setCurrentIndex(0); }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1 ${
              activeFilter === 'REVIEW'
                ? 'seg-active text-gold font-mono'
                : 'bg-surface-inset text-text-secondary hover:text-text-primary border border-border-subtle hover:border-border-primary'
            }`}
          >
            <span>Jadwal SRS</span>
            <span className="font-mono">({countReview})</span>
          </button>
        )}
        {countMaintain > 0 && (
          <button
            onClick={() => { setActiveFilter('MAINTAIN'); setCurrentIndex(0); }}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1 ${
              activeFilter === 'MAINTAIN'
                ? 'seg-active text-gold font-mono'
                : 'bg-surface-inset text-text-secondary hover:text-text-primary border border-border-subtle hover:border-border-primary'
            }`}
          >
            <span>Penguatan</span>
            <span className="font-mono">({countMaintain})</span>
          </button>
        )}
      </div>

      {/* Top Recall Progress & Priority Pill */}
      <div className="panel panel-stitched p-4 sm:p-5 rounded-3xl border border-border-subtle shadow-xl space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-gold/15 text-gold border border-border-subtle">
              <Flame className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-text-primary font-heading">
              RECALL ADAPTIF{isExtraSession ? ' (EKSTRA)' : ''} • {currentIndex + 1} / {totalItems}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {currentItem.trueMasteryScore !== undefined && (
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-surface-inset border border-border-subtle text-gold font-mono font-bold">
                True Mastery: {currentItem.trueMasteryScore}%
              </span>
            )}
            <span className="text-xs font-mono font-bold text-text-secondary">
              Skor: {correctCount}/{currentIndex}
            </span>
            <span className="hidden sm:inline text-[11px] font-mono text-text-muted" title="Jawaban Recall hari ini / target harian">
              Hari ini {daily.answered}/{RECALL_LIMITS.dailyCap}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-surface-inset rounded-full overflow-hidden border border-border-subtle">
          <div
            className="h-full bg-gold transition-all duration-300 rounded-full"
            style={{ width: `${((currentIndex + 1) / totalItems) * 100}%` }}
          />
        </div>

        {/* Diagnostic Reason Alert */}
        <div className="p-2.5 rounded-xl bg-surface-inset border border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-text-primary">
            <ShieldAlert className="w-4 h-4 text-gold flex-shrink-0" />
            <span className="text-[11px] text-text-secondary">
              <strong className="font-bold text-text-primary font-heading mr-1">Alasan Pengujian:</strong>
              {currentItem.reasonText}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase bg-surface-card border border-border-subtle text-gold font-mono">
              {currentItem.priorityTier}
            </span>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-surface-card border border-border-subtle text-text-secondary uppercase font-mono">
              {currentItem.category}
            </span>
          </div>
        </div>

        {/* Personalized Tutor Insight */}
        {currentItem.tutorInsight && (
          <div className="p-2.5 rounded-xl bg-surface-inset border border-border-subtle text-[11px] text-text-secondary flex items-start gap-2">
            <p className="leading-relaxed">
              {currentItem.tutorInsight}
            </p>
          </div>
        )}
      </div>

      {/* Question Card */}
      <div className="panel panel-stitched p-5 sm:p-6 rounded-3xl border border-border-subtle shadow-xl space-y-4">
        <div className="flex items-center justify-between text-xs text-text-secondary border-b border-border-subtle pb-3">
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-gold" />
            <span className="font-bold text-text-primary font-heading">{currentItem.title}</span>
          </div>

          <div className="flex items-center gap-2">
            {!isSentenceBuilder && !engine && (
              <button
                onClick={handleUse5050}
                disabled={isAnswered || hiddenOptions.length > 0}
                className="px-2.5 py-1 rounded-lg bg-surface-inset hover:bg-surface-elevated disabled:opacity-40 text-gold border border-border-subtle text-[11px] font-bold flex items-center gap-1 transition-colors"
              >
                <span>50/50 (10 MP)</span>
              </button>
            )}

            <button
              onClick={() => speakJapanese(currentQ.audioPrompt ?? japaneseSpeechFromPrompt(currentQ.prompt), currentItem.exerciseFormat === 'choukai' ? CHOUKAI_DATABASE[currentItem.itemId]?.speechRate : undefined)}
              className="btn-physical-secondary p-1.5 rounded-lg transition-colors"
            >
              <Volume2 className="w-3.5 h-3.5 text-gold" />
            </button>
          </div>
        </div>

        {!engine && (
        <p className="text-sm sm:text-base text-text-primary font-medium whitespace-pre-line leading-relaxed">
          {currentQ.ruby ? (
            <RubyText
              japanese={currentQ.prompt}
              reading={currentQ.ruby}
              showFurigana={furiganaEnabled}
            />
          ) : (
            currentQ.prompt
          )}
        </p>
        )}

        {/* ENGINE DOKKAI: wacana ditampilkan, soal membaca di bawahnya */}
        {currentItem.exerciseFormat === 'dokkai' && DOKKAI_DATABASE[currentItem.itemId] && (
          <div className="p-4 rounded-2xl bg-surface-inset border border-border-subtle max-h-64 overflow-y-auto text-xs sm:text-sm text-text-primary leading-relaxed whitespace-pre-line font-jp">
            {DOKKAI_DATABASE[currentItem.itemId].text}
          </div>
        )}
        {/* ENGINE CHOUKAI: audio diputar otomatis; transkrip baru terbuka setelah menjawab */}
        {currentItem.exerciseFormat === 'choukai' && (
          <div className="p-3 rounded-2xl bg-surface-inset border border-border-subtle text-center text-xs text-text-secondary">
            Dengarkan percakapan, lalu jawab. Tekan ikon speaker untuk memutar ulang.
          </div>
        )}

        {/* ENGINE CANVAS: menulis ulang dari ingatan memakai kanvas goresan yang sama dengan Library */}
        {engine === 'canvas' ? (
          <div className="space-y-3 pt-2" key={`canvas_${currentItem.itemId}`}>
            <p className="text-xs text-text-secondary text-center">
              {kotobaForCanvas
                ? <>Tulis kosakata <strong className="text-text-primary">{kotobaForCanvas.reading}</strong> ({kotobaForCanvas.meaningId}) dari ingatan.</>
                : <>Tulis kanji <strong className="text-text-primary">{kanjiForCanvas?.meaningId}</strong> dari ingatan.</>}
            </p>
            {kotobaForCanvas ? (
              <KotobaWritingPractice
                kotoba={kotobaForCanvas}
                soundEnabled={soundEnabled}
                nextButtonLabel={currentIndex < totalItems - 1 ? 'Materi Berikutnya' : 'Selesai'}
                onCompleteWord={(score) => submitResult(score >= 60, 'writing')}
                onFinishWord={handleNext}
              />
            ) : (
              <KanjiWritingCanvas
                kanjiChar={kanjiForCanvas!.character}
                level={kanjiForCanvas!.jlpt}
                totalSheets={1}
                soundEnabled={soundEnabled}
                autoAdvance={true}
                showPromptHeader={false}
                onCompleteSheet={(_sheet, score) => submitResult(score >= 60, 'writing')}
                onFinish={handleNext}
              />
            )}
          </div>
        ) : engine === 'fusion' && fusionStage && currentItem.fusion ? (
          /* ENGINE GRAMMAR FUSION: rakit pola bunpou dari kata kerja dasar (konjugasi + sufiks) */
          <div className="space-y-3 pt-2" key={`fusion_${currentItem.itemId}`}>
            <p className="text-xs text-text-secondary text-center">
              Rakit pola <strong className="text-text-primary">{fusionStage.target.pattern}</strong> dari kata kerja dasar. Tanpa petunjuk dan paling banyak 1 salah dihitung berhasil.
            </p>
            <FusionPlayer
              stage={fusionStage}
              baseWord={currentItem.fusion.verb}
              soundEnabled={soundEnabled}
              reduceMotion={readReduceMotion()}
              onFinished={(mistakes, hints) => {
                const ok = mistakes <= 1 && hints === 0;
                submitResult(ok, 'quiz', 'sentence');
                const exp = ok ? calcEngineExp(getEntityBaseExp(currentItem.category, currentItem.itemId) ?? 25, 'sentence') : 0;
                return { exp, gold: 0, note: ok ? 'Hadiah Recall (dihitung di akhir sesi)' : 'Belum berhasil: mistake/petunjuk terlalu banyak' };
              }}
              endActions={[{ label: currentIndex < totalItems - 1 ? 'Materi Berikutnya' : 'Selesai', primary: true, onClick: handleNext }]}
            />
          </div>
        ) : isSentenceBuilder ? (
          <div className="space-y-4 pt-2">
            {/* Target Assembly Box */}
            <div className="p-4 rounded-2xl bg-surface-inset border-2 border-dashed border-border-primary min-h-[64px] flex flex-wrap items-center gap-2">
              {selectedWords.length === 0 ? (
                <span className="text-xs text-text-muted italic">
                  Klik kata-kata di bawah untuk menyusun kalimat bahasa Jepang...
                </span>
              ) : (
                selectedWords.map((word, idx) => (
                  <motion.button
                    key={`${word}_${idx}`}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    onClick={() => handleRemoveWord(word, idx)}
                    disabled={isAnswered}
                    className="btn-physical-secondary px-3 py-1.5 rounded-xl text-gold text-xs sm:text-sm font-bold flex items-center gap-1 transition-all"
                  >
                    <span>{word}</span>
                    <span className="text-[10px] opacity-60">×</span>
                  </motion.button>
                ))
              )}
            </div>

            {/* Word Bank Chips */}
            <div className="flex flex-wrap gap-2 pt-1">
              {availableWords.map((item) => {
                const used = selectedWordIds.includes(item.id);
                return (
                  <motion.button
                    key={item.id}
                    whileHover={used ? {} : { scale: 1.05 }}
                    whileTap={used ? {} : { scale: 0.95 }}
                    onClick={() => handleWordClick(item)}
                    disabled={isAnswered || used}
                    className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                      used
                        ? 'border border-dashed border-border-subtle text-transparent'
                        : 'btn-physical-secondary'
                    }`}
                  >
                    {item.word}
                  </motion.button>
                );
              })}
            </div>

            {/* Submit Sentence Button */}
            {!isAnswered && (
              <button
                onClick={handleSubmitSentenceProduction}
                disabled={selectedWords.length === 0}
                className="rpg-btn rpg-btn-primary w-full py-3 text-xs sm:text-sm gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Periksa Susunan Kalimat</span>
              </button>
            )}
          </div>
        ) : (
          /* STANDARD MULTIPLE CHOICE OPTIONS (LEVELS 1 - 4) */
          <div className="grid grid-cols-1 gap-2.5 pt-2">
            {currentQ.options.map((opt, idx) => {
              const isHidden = hiddenOptions.includes(idx);
              if (isHidden) {
                return (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-surface-inset/30 border border-border-subtle/30 opacity-30 text-center text-xs italic text-text-muted pointer-events-none"
                  >
                    (Pilihan tereliminasi)
                  </div>
                );
              }

              const isSelected = selectedOption === idx;
              const isCorrect = idx === currentQ.correctIndex;

              let optionStyle = 'bg-surface-card border-border-subtle hover:border-border-primary hover:bg-surface-elevated text-text-primary shadow-sm';
              if (isAnswered) {
                if (isCorrect) {
                  optionStyle = 'bg-gold/15 border-border-subtle text-gold font-bold shadow-md';
                } else if (isSelected) {
                  optionStyle = 'bg-surface-inset border-border-primary text-text-muted font-medium opacity-70';
                } else {
                  optionStyle = 'bg-surface-inset/40 border-border-subtle/40 text-text-muted opacity-40';
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(idx)}
                  disabled={isAnswered}
                  className={`p-3.5 sm:p-4 rounded-2xl border text-left text-xs sm:text-sm font-medium transition-all flex items-center justify-between gap-3 ${optionStyle}`}
                >
                  <span className="font-jp">{opt}</span>
                  {isAnswered && isCorrect && <CheckCircle2 className="w-4 h-4 text-gold flex-shrink-0" />}
                  {isAnswered && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-text-muted flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        )}

        {/* Feedback / Explanation */}
        {isAnswered && !engine && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-surface-inset border border-border-subtle space-y-3 pt-3"
          >
            <div className="text-xs text-text-secondary leading-relaxed">
              <strong className="text-gold block mb-1 font-heading">Pengingat Memori:</strong>
              {currentQ.explanation}
              {currentItem.exerciseFormat === 'choukai' && CHOUKAI_DATABASE[currentItem.itemId] && (
                <span className="block mt-2 whitespace-pre-line font-jp text-text-primary">{CHOUKAI_DATABASE[currentItem.itemId].transcript}</span>
              )}
            </div>

            <button
              onClick={handleNext}
              className="rpg-btn rpg-btn-primary w-full py-3 text-xs sm:text-sm gap-2"
            >
              <span>Materi Berikutnya</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};
