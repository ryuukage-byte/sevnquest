import React, { Suspense, useMemo, useState } from 'react';
import { lazyWithRetry as lazy } from '../../utils/lazyWithRetry';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  BookOpen, PenTool, Layers, Brain, CheckCircle2, Trophy, Clock, Settings2, Play, AlertTriangle, Compass, ClipboardCheck, Info,
} from 'lucide-react';
import type { PlayerStats, UserDeck, DeckItemCategory } from '../../types/rpg';
import type { BunpouItem } from '../../types/content';
import type { RewardHandler, RewardMeta, StudyCompleteResult } from '../../engine/reward/types';
import type { DayNote, GuidedCategory, GuidedItemState, GuidedMissionKey, GuidedProfile } from '../../engine/curriculum/types';
import {
  dayProgress, planOverview, itemState, isLearned, GUIDED_REWARDS, EVALUATION_EVERY_DAYS, type MissionProgress,
} from '../../engine/curriculum/curriculum';
import { getCurriculum } from '../../engine/curriculum/sources';
import { KOTOBA_DATABASE } from '../../data/kotoba';
import { KANJI_DATABASE } from '../../data/kanji';
import { BUNPOU_DATABASE } from '../../data/bunpou';
import { isItemBookmarked } from '../../utils/decks';
import { getTodayLocalDate } from '../../utils/time';
import { playSound } from '../../utils/audio';
import { GuidedSetupWizard } from './GuidedSetupWizard';

// Mode latihan dimuat saat dibutuhkan (kanvas menulis membawa hanzi-writer).
const DeckFlashcardRunner = lazy(() => import('../deck/DeckFlashcardRunner').then(m => ({ default: m.DeckFlashcardRunner })));
const DeckWritingRunner = lazy(() => import('../deck/DeckWritingRunner').then(m => ({ default: m.DeckWritingRunner })));
const UniversalEntityModal = lazy(() => import('../modals/UniversalEntityModal').then(m => ({ default: m.UniversalEntityModal })));
const BunpouDetailModal = lazy(() => import('../library/BunpouDetailModal').then(m => ({ default: m.BunpouDetailModal })));

type StudyModule = 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai' | 'boss' | 'questions' | 'tryOuts';

export interface GuidedMissionsPanelProps {
  stats: PlayerStats;
  soundEnabled?: boolean;
  onStartPlan: (profile: GuidedProfile) => void;
  onStopPlan: () => void;
  onClaim: (key: GuidedMissionKey) => void;
  onStartRecall: () => void;
  onExplore: () => void;
  /** Buka bank soal (Library → Soal) untuk evaluasi berkala. */
  onOpenQuestions: () => void;
  onRewardPlayer: RewardHandler;
  onCompleteStudyItem: (
    moduleId: StudyModule, expGained: number, goldGained: number, itemId?: string, score?: number, total?: number,
    interactionType?: 'writing' | 'flashcard' | 'quiz', rewardMeta?: RewardMeta
  ) => StudyCompleteResult;
  onRecordInteraction: (
    itemId: string, category: 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai',
    interactionType: 'view' | 'writing' | 'flashcard' | 'quiz', success?: boolean
  ) => void;
  onToggleBookmark: (id: string, category: DeckItemCategory, notes?: string, targetDeckId?: string) => void;
  onUpdateDecks: (decks: UserDeck[]) => void;
}

const MISSION_META: Record<GuidedMissionKey, { title: string; unit: string; color: string; Icon: typeof BookOpen }> = {
  kotoba: { title: 'Kotoba Baru', unit: 'kosakata', color: 'var(--color-kotoba)', Icon: BookOpen },
  kanji: { title: 'Kanji Baru', unit: 'kanji', color: 'var(--color-kanji)', Icon: PenTool },
  bunpou: { title: 'Bunpou Baru', unit: 'pola kalimat', color: 'var(--color-bunpou)', Icon: Layers },
  recall: { title: 'Recall', unit: 'jawaban', color: 'var(--color-choukai)', Icon: Brain },
  evaluasi: { title: 'Evaluasi Mingguan', unit: 'soal', color: 'var(--color-dokkai)', Icon: ClipboardCheck },
};

const isCategory = (key: GuidedMissionKey): key is GuidedCategory => key === 'kotoba' || key === 'kanji' || key === 'bunpou';

const NOTE_TEXT: Record<DayNote, string> = {
  recall_heavy: 'Banyak materi jatuh tempo diulang hari ini, jadi materi baru dikurangi supaya Recall tidak menumpuk.',
  recall_light: 'Belum banyak yang perlu diulang, jadi hari ini ada sedikit lebih banyak materi baru.',
  retention_low: 'Hasil Recall menunjukkan banyak materi belum bertahan. Materi baru dikurangi dulu sampai ingatanmu menguat.',
};

const STATE_LABEL: Record<GuidedItemState, string> = {
  baru: 'Baru', dibuka: 'Dibuka', dipelajari: 'Dipelajari', dikuasai: 'Dikuasai',
};

const stateStyle = (s: GuidedItemState): React.CSSProperties =>
  s === 'dikuasai' ? { borderColor: 'var(--color-gold-base)', color: 'var(--color-gold-base)' }
  : s === 'dipelajari' ? { borderColor: 'var(--color-state-success)', color: 'var(--color-state-success)' }
  : s === 'dibuka' ? { borderStyle: 'dashed' }
  : {};

function itemLabel(category: GuidedCategory, id: string): { main: string; sub: string } {
  if (category === 'kotoba') {
    const k = KOTOBA_DATABASE[id];
    return { main: k?.word || id, sub: k?.meaningId || '' };
  }
  if (category === 'kanji') {
    const k = KANJI_DATABASE[id];
    return { main: k?.character || id, sub: k?.meaningId || '' };
  }
  const b = BUNPOU_DATABASE[id];
  return { main: b?.title || id, sub: b?.meaningId || '' };
}

function virtualDeck(category: GuidedCategory, ids: string[], date: string): UserDeck {
  const now = new Date().toISOString();
  return {
    id: `guided_${category}_${date}`,
    title: `Misi ${MISSION_META[category].title}`,
    type: category,
    createdAt: now,
    updatedAt: now,
    items: ids.map(id => ({ id, category, addedAt: now })),
  };
}

type Runner = { mode: 'flashcard' | 'writing'; deck: UserDeck } | null;

export const GuidedMissionsPanel: React.FC<GuidedMissionsPanelProps> = ({
  stats, soundEnabled = true, onStartPlan, onStopPlan, onClaim, onStartRecall, onExplore, onOpenQuestions,
  onRewardPlayer, onCompleteStudyItem, onRecordInteraction, onToggleBookmark, onUpdateDecks,
}) => {
  const plan = stats.guidedPlan?.status === 'active' ? stats.guidedPlan : undefined;
  const [isEditing, setIsEditing] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const [runner, setRunner] = useState<Runner>(null);
  const [inspect, setInspect] = useState<{ id: string; category: 'kotoba' | 'kanji' } | null>(null);
  const [bunpouItem, setBunpouItem] = useState<BunpouItem | null>(null);

  const curriculum = useMemo(
    () => (plan ? getCurriculum(plan.profile) : undefined),
    [plan?.profile.currentLevel, plan?.profile.targetLevel]
  );
  const mastery = stats.itemMastery;
  const day = plan?.today;
  const today = getTodayLocalDate();

  if (!plan || !curriculum || isEditing) {
    return (
      <GuidedSetupWizard
        initial={stats.guidedPlan?.profile}
        hasActivePlan={Boolean(plan)}
        mastery={mastery}
        soundEnabled={soundEnabled}
        onCancel={plan ? () => setIsEditing(false) : undefined}
        onSubmit={(profile) => {
          onStartPlan(profile);
          setIsEditing(false);
        }}
      />
    );
  }

  const overview = planOverview(plan, curriculum, mastery, today);
  const progress = day ? dayProgress(day, mastery, stats.recallDaily, stats.studyStats, curriculum.learnMinutes) : undefined;
  // "Sampai tuntas" = sasaran program mencakup seluruh materi inti yang belum dipelajari saat program dibuat.
  const goalIsFull = overview.goal + (plan.baseline ? plan.baseline.kotoba + plan.baseline.kanji + plan.baseline.bunpou : 0) >= overview.planned;
  const levelsLabel = curriculum.levels.length > 1
    ? `${curriculum.levels[0]}–${curriculum.levels[curriculum.levels.length - 1]}`
    : curriculum.levels[0];
  const dueNow = Math.max(0, (day?.recallTarget || 0) - Math.min(10, (day?.kotoba.length || 0) + (day?.kanji.length || 0) + (day?.bunpou.length || 0)));
  const levelFrom = plan.profile.currentLevel === 'PEMULA' ? 'Pemula' : plan.profile.currentLevel;

  const handleClaim = (key: GuidedMissionKey) => {
    playSound('coin', soundEnabled);
    try { confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 } }); } catch { /* efek opsional */ }
    onClaim(key);
  };

  // Sesi latihan memuat materi yang BELUM dipelajari; bila semua sudah, seluruh materi misi (untuk mengulang).
  const openRunner = (m: MissionProgress, mode: 'flashcard' | 'writing') => {
    if (!day || !isCategory(m.key)) return;
    const pending = m.ids.filter(id => !isLearned(mastery, id));
    playSound('click', soundEnabled);
    setRunner({ mode, deck: virtualDeck(m.key, pending.length > 0 ? pending : m.ids, day.date) });
  };

  const openItem = (category: GuidedCategory, id: string) => {
    playSound('click', soundEnabled);
    if (category === 'bunpou') {
      const item = BUNPOU_DATABASE[id];
      if (item) setBunpouItem(item);
    } else {
      setInspect({ id, category });
    }
  };

  const openNextBunpou = (m: MissionProgress) => {
    const next = m.ids.find(id => !isLearned(mastery, id)) || m.ids[0];
    if (next) openItem('bunpou', next);
  };

  const paceBadge = {
    on_track: { text: 'Sesuai jadwal', color: 'var(--color-state-success)' },
    ahead: { text: 'Lebih cepat dari jadwal', color: 'var(--color-state-success)' },
    behind: { text: `Tertinggal ${overview.behindBy} materi dari sasaran`, color: 'var(--color-state-danger)' },
    finished: { text: 'Materi inti target tuntas', color: 'var(--color-gold-base)' },
  }[overview.pace];

  return (
    <div className="space-y-3">
      {/* Ringkasan program */}
      <div className="panel panel-stitched p-4 sm:p-5 shadow-md border border-border-subtle">
        <div className="flex items-start justify-between gap-3 relative z-10">
          <div className="min-w-0">
            <p className="text-[10px] font-mono tracking-widest text-text-muted uppercase">
              {levelFrom} → {plan.profile.targetLevel} · {goalIsFull ? 'Program sampai tuntas' : 'Program prioritas'}
            </p>
            <h3 className="text-lg sm:text-xl font-bold font-heading text-text-primary">
              Day {String(overview.dayIndex).padStart(2, '0')}
              <span className="text-xs font-mono font-normal text-text-secondary"> / {overview.durationDays} hari</span>
            </h3>
            <p className="text-xs font-bold mt-0.5" style={{ color: paceBadge.color }}>{paceBadge.text}</p>
          </div>
          <button
            onClick={() => { setIsEditing(true); playSound('click', soundEnabled); }}
            className="btn-physical-secondary px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 shrink-0"
            aria-label="Ubah kurikulum"
          >
            <Settings2 className="w-3.5 h-3.5" /> Ubah
          </button>
        </div>

        <div className="space-y-1 mt-3 relative z-10">
          <div className="flex justify-between text-[11px] font-mono text-text-muted">
            <span>Cakupan: {overview.learned} / {overview.planned} materi inti {levelsLabel}</span>
            <span>{overview.percent}%</span>
          </div>
          <div className="skeuo-progress-track">
            <div className={`skeuo-progress-bar ${overview.pace === 'finished' ? 'completed' : ''}`} style={{ width: `${overview.percent}%`, transition: 'width 0.4s ease' }} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-3 relative z-10">
          <div className="rounded-xl bg-surface-inset border border-border-subtle px-2.5 py-2 shadow-inner">
            <p className="text-[10px] font-mono uppercase tracking-wider text-text-muted">Cakupan</p>
            <p className="text-sm font-bold font-mono text-text-primary">{overview.percent}%</p>
            <p className="text-[10px] text-text-muted">sudah dipelajari</p>
          </div>
          <div className="rounded-xl bg-surface-inset border border-border-subtle px-2.5 py-2 shadow-inner">
            <p className="text-[10px] font-mono uppercase tracking-wider text-text-muted">Retensi</p>
            <p className="text-sm font-bold font-mono text-text-primary">{overview.retentionPercent === null ? '—' : `${overview.retentionPercent}%`}</p>
            <p className="text-[10px] text-text-muted">{overview.tested > 0 ? `dari ${overview.tested} yang diuji` : 'belum ada yang diuji'}</p>
          </div>
          <div className="rounded-xl bg-surface-inset border border-border-subtle px-2.5 py-2 shadow-inner">
            <p className="text-[10px] font-mono uppercase tracking-wider text-text-muted">Dikuasai</p>
            <p className="text-sm font-bold font-mono text-text-primary">{overview.masteredPercent}%</p>
            <p className="text-[10px] text-text-muted">{overview.mastered} materi</p>
          </div>
        </div>
        <p className="text-[11px] text-text-muted mt-2 relative z-10">
          {overview.pace === 'finished'
            ? 'Semua materi inti sudah dipelajari. Pertahankan lewat Recall sampai retensi dan penguasaannya naik.'
            : plan.profile.mode === 'deadline' && goalIsFull
              ? `Tenggat ${overview.daysLeft} hari lagi. Anggaran hari ini ±${day?.minutes ?? plan.profile.minutesPerDay} menit, dihitung dari sisa materi ÷ sisa hari: naik bila tertinggal, turun bila lebih cepat.`
            : goalIsFull
              ? `Sasaran: seluruh materi inti tuntas dalam ${overview.durationDays} hari. Sisa materi butuh ±${overview.daysToComplete} hari belajar dengan ${plan.profile.minutesPerDay} menit/hari.`
              : `Sasaran program: ${overview.goal} materi prioritas dalam ${overview.durationDays} hari (tercapai ${overview.progressed}). Menuntaskan seluruh materi inti butuh ±${overview.daysToComplete} hari dengan ${plan.profile.minutesPerDay} menit/hari.`}
        </p>

        <div className="grid grid-cols-3 gap-2 mt-3 relative z-10">
          {(['kotoba', 'kanji', 'bunpou'] as const).map(c => (
            <div key={c} className="rounded-xl bg-surface-inset border border-border-subtle px-2.5 py-2 shadow-inner">
              <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: MISSION_META[c].color }}>{c}</p>
              <p className="text-sm font-bold font-mono text-text-primary">
                {overview.categories[c].learned}<span className="text-text-muted text-[11px]">/{overview.categories[c].planned}</span>
              </p>
              <p className="text-[10px] text-text-muted">{overview.categories[c].mastered} dikuasai</p>
            </div>
          ))}
        </div>
      </div>

      {/* Status hari ini */}
      {progress && (
        <div className="p-3 sm:p-3.5 rounded-2xl bg-surface-inset border border-border-subtle flex items-center justify-between text-xs text-text-secondary shadow-inner">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-gold" />
            <span>Perkiraan hari ini: <strong className="text-text-primary font-mono font-bold">±{Math.round(progress.estimatedMinutes)} menit</strong></span>
          </div>
          <span className="text-gold font-mono font-bold">{progress.doneCount} / {progress.totalCount} misi</span>
        </div>
      )}

      {(day?.notes || []).map(note => (
        <div key={note} className="p-3 rounded-2xl border border-border-subtle bg-surface-card flex items-start gap-2 text-xs text-text-secondary">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-gold" />
          <span>{NOTE_TEXT[note]}</span>
        </div>
      ))}

      {progress && progress.carriedCount > 0 && (
        <div className="p-3 rounded-2xl border border-border-subtle bg-surface-card flex items-start gap-2 text-xs text-text-secondary">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--color-bunpou)' }} />
          <span>
            <strong className="text-text-primary">{progress.carriedCount} materi tertunda</strong> dari hari sebelumnya didahulukan hari ini.
            Jadwal berikutnya sudah disesuaikan, kurikulum tidak perlu dibuat ulang.
          </span>
        </div>
      )}

      {progress?.allComplete && (
        <div className="panel panel-stitched p-4 border border-border-subtle text-center space-y-2">
          <p className="text-sm font-bold font-heading text-gold relative z-10">Misi hari ini selesai</p>
          <p className="text-xs text-text-secondary relative z-10">
            Materi hari ini sudah masuk jadwal Recall. Misi berikutnya terbuka besok — sampai itu, kamu bebas menjelajah.
          </p>
          <button onClick={onExplore} className="btn-physical-secondary px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 relative z-10">
            <Compass className="w-3.5 h-3.5 text-gold" /> Jelajah Library
          </button>
        </div>
      )}

      {progress && progress.missions.length === 0 && (
        <div className="panel panel-stitched p-5 border border-border-subtle text-center space-y-2">
          <p className="text-sm font-bold font-heading text-gold relative z-10">Semua materi kurikulum sudah dipelajari</p>
          <p className="text-xs text-text-secondary relative z-10">Lanjutkan Recall untuk mempertahankannya, atau susun kurikulum ke level berikutnya.</p>
        </div>
      )}

      {/* Misi */}
      {progress?.missions.map(m => {
        const meta = MISSION_META[m.key];
        const percent = Math.min(100, Math.round((m.done / m.total) * 100));
        const reward = GUIDED_REWARDS[m.key];
        const carried = new Set(day?.carried || []);
        return (
          <motion.div
            key={m.key}
            whileHover={{ y: -1 }}
            className={`panel panel-stitched p-4 sm:p-5 border border-border-subtle shadow-md space-y-3 ${m.claimed ? 'opacity-70' : ''}`}
          >
            <div className="flex items-start justify-between gap-3 relative z-10">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-surface-inset border border-border-subtle shrink-0" style={{ color: meta.color }}>
                  <meta.Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-text-primary font-heading">{meta.title}</h3>
                  <p className="text-xs text-text-secondary">
                    {m.key === 'recall'
                      ? `${m.total} jawaban: ${dueNow} materi jatuh tempo diulang + materi baru hari ini.`
                      : m.key === 'evaluasi'
                        ? `Uji kemampuanmu di soal level ${plan.profile.targetLevel}: kosakata, kanji, tata bahasa, dan bacaan.`
                        : `${m.total} ${meta.unit} dari materi inti ${levelsLabel}.`}
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-mono font-bold text-gold shrink-0">+{reward.exp} EXP</span>
            </div>

            <div className="space-y-1 relative z-10">
              <div className="flex justify-between text-[11px] font-mono text-text-muted">
                <span>{m.done} / {m.total} {meta.unit}</span>
                <span className={m.complete ? 'text-gold font-bold' : ''}>
                  {m.complete ? 'Selesai' : m.key === 'evaluasi' ? `${m.total - m.done} soal lagi` : `±${m.minutesLeft} menit lagi`}
                </span>
              </div>
              <div className="skeuo-progress-track">
                <div className={`skeuo-progress-bar ${m.complete ? 'completed' : ''}`} style={{ width: `${percent}%`, transition: 'width 0.4s ease' }} />
              </div>
            </div>

            {isCategory(m.key) && (
              <div className="flex flex-wrap gap-1.5 relative z-10">
                {m.ids.map(id => {
                  const s = itemState(mastery?.[id]);
                  const label = itemLabel(m.key as GuidedCategory, id);
                  return (
                    <button
                      key={id}
                      onClick={() => openItem(m.key as GuidedCategory, id)}
                      title={`${label.sub} — ${STATE_LABEL[s]}${carried.has(id) ? ' (tertunda)' : ''}`}
                      className="px-2 py-1 rounded-lg bg-surface-inset border border-border-subtle text-xs text-text-primary hover:bg-surface-elevated transition-colors flex items-center gap-1 max-w-full"
                      style={stateStyle(s)}
                    >
                      {(s === 'dipelajari' || s === 'dikuasai') && <CheckCircle2 className="w-3 h-3 shrink-0" />}
                      <span className="font-bold truncate">{label.main}</span>
                      {carried.has(id) && s !== 'dipelajari' && s !== 'dikuasai' && (
                        <span className="text-[9px] font-mono" style={{ color: 'var(--color-bunpou)' }}>tunda</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {m.key === 'evaluasi' && (
              <p className="text-[11px] text-text-muted relative z-10">
                Muncul tiap {EVALUATION_EVERY_DAYS} hari. Selesai setelah {m.total} soal latihan atau satu simulasi ujian di Library → Soal.
                Hasilnya menunjukkan apakah materi yang kamu pelajari sudah bisa dipakai menjawab soal, bukan hanya dihafal.
              </p>
            )}

            {m.key === 'recall' && (
              <p className="text-[11px] text-text-muted relative z-10">
                Target Recall mengikuti jumlah materi yang jatuh tempo, bukan jatah waktu tetap. Setiap jawaban dinilai sistem
                (soal arti/konteks, kanvas menulis, konjugasi, susun pola) dan hasilnya menentukan jadwal ulang berikutnya.
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 relative z-10">
              {m.key === 'kotoba' && (
                <>
                  <button onClick={() => openRunner(m, 'flashcard')} className="btn-physical-primary px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5">
                    <Play className="w-3.5 h-3.5" /> {m.complete ? 'Ulangi Kartu' : 'Pelajari'}
                  </button>
                  <button onClick={() => openRunner(m, 'writing')} className="btn-physical-secondary px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5">
                    <PenTool className="w-3.5 h-3.5" /> Latihan Menulis
                  </button>
                </>
              )}
              {m.key === 'kanji' && (
                <>
                  <button onClick={() => openRunner(m, 'writing')} className="btn-physical-primary px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5">
                    <PenTool className="w-3.5 h-3.5" /> {m.complete ? 'Tulis Lagi' : 'Tulis di Kanvas'}
                  </button>
                  <button onClick={() => openRunner(m, 'flashcard')} className="btn-physical-secondary px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" /> Kartu Bacaan
                  </button>
                </>
              )}
              {m.key === 'bunpou' && (
                <>
                  <button onClick={() => openNextBunpou(m)} className="btn-physical-primary px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5">
                    <Play className="w-3.5 h-3.5" /> {m.complete ? 'Buka Pola' : 'Pelajari Pola'}
                  </button>
                  <button onClick={() => openRunner(m, 'flashcard')} className="btn-physical-secondary px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" /> Kartu Pola
                  </button>
                </>
              )}
              {m.key === 'evaluasi' && (
                <button onClick={onOpenQuestions} className="btn-physical-primary px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5">
                  <ClipboardCheck className="w-3.5 h-3.5" /> Kerjakan Soal
                </button>
              )}
              {m.key === 'recall' && (
                <button onClick={onStartRecall} className="btn-physical-primary px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5" /> Mulai Recall
                </button>
              )}

              <div className="ml-auto">
                {m.claimed ? (
                  <button disabled className="skeuo-btn-claimed"><CheckCircle2 className="w-3.5 h-3.5" /> Terklaim</button>
                ) : m.complete ? (
                  <button onClick={() => handleClaim(m.key)} className="btn-cta animate-pulse flex items-center justify-center gap-1.5 py-2 px-4 text-xs">
                    <Trophy className="w-4 h-4" /> KLAIM
                  </button>
                ) : null}
              </div>
            </div>
          </motion.div>
        );
      })}

      {/* Keterangan status materi */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-[10px] text-text-muted">
        <span>Status materi:</span>
        {(['baru', 'dibuka', 'dipelajari', 'dikuasai'] as const).map(s => (
          <span key={s} className="px-1.5 py-0.5 rounded-md border border-border-subtle bg-surface-inset" style={stateStyle(s)}>{STATE_LABEL[s]}</span>
        ))}
        <span>Misi selesai saat materinya dipelajari (berlatih), bukan sekadar dibuka.</span>
      </div>

      {/* Hentikan program */}
      <div className="text-center pt-1">
        {confirmStop ? (
          <div className="inline-flex items-center gap-2 text-xs text-text-secondary">
            <span>Hentikan kurikulum? Progres materi tetap tersimpan.</span>
            <button onClick={() => { onStopPlan(); setConfirmStop(false); }} className="btn-physical-secondary px-3 py-1 rounded-lg text-[11px] font-bold">Ya, hentikan</button>
            <button onClick={() => setConfirmStop(false)} className="btn-physical-secondary px-3 py-1 rounded-lg text-[11px] font-bold">Batal</button>
          </div>
        ) : (
          <button onClick={() => setConfirmStop(true)} className="text-[11px] text-text-muted underline underline-offset-2 hover:text-text-secondary">
            Hentikan kurikulum
          </button>
        )}
      </div>

      {/* Mode latihan */}
      <Suspense fallback={null}>
        {runner?.mode === 'flashcard' && (
          <DeckFlashcardRunner
            deck={runner.deck}
            onClose={() => setRunner(null)}
            onReward={onRewardPlayer}
            onCompleteStudyItem={onCompleteStudyItem}
            soundEnabled={soundEnabled}
          />
        )}
        {runner?.mode === 'writing' && (
          <DeckWritingRunner
            deck={runner.deck}
            onClose={() => setRunner(null)}
            onReward={onRewardPlayer}
            onCompleteStudyItem={onCompleteStudyItem}
            soundEnabled={soundEnabled}
          />
        )}
        {inspect && (
          <UniversalEntityModal
            isOpen
            entityId={inspect.id}
            category={inspect.category}
            onClose={() => setInspect(null)}
            soundEnabled={soundEnabled}
            userDecks={stats.userDecks}
            onToggleBookmark={onToggleBookmark}
            onRewardPlayer={onRewardPlayer}
            onCompleteStudyItem={onCompleteStudyItem}
          />
        )}
        {bunpouItem && (
          <BunpouDetailModal
            item={bunpouItem}
            masteryRecord={mastery?.[bunpouItem.id]}
            onClose={() => setBunpouItem(null)}
            soundEnabled={soundEnabled}
            isBookmarked={Boolean(isItemBookmarked(stats.userDecks, bunpouItem.id, 'bunpou'))}
            onToggleBookmark={() => onToggleBookmark(bunpouItem.id, 'bunpou')}
            userDecks={stats.userDecks}
            onToggleDeckItem={(deckId) => onToggleBookmark(bunpouItem.id, 'bunpou', undefined, deckId)}
            onUpdateDecks={onUpdateDecks}
            onRewardPlayer={onRewardPlayer}
            onRecordInteraction={onRecordInteraction}
            onCompleteStudyItem={onCompleteStudyItem}
          />
        )}
      </Suspense>
    </div>
  );
};
