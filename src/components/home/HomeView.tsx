import { planRecallSession } from '../../engine/recall/session';
import { getTodayLocalDate } from '../../utils/time';
import React, { useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { Play, Flame, ChevronRight, Compass, HelpCircle, Castle, Smartphone, Download, Check } from 'lucide-react';
import { TOWER_ENABLED } from '../../data/featureFlags';
import { ScrollIcon } from '../ui/EngravingIcons';
import { PlayerStats } from '../../types/rpg';
import { dayProgress } from '../../engine/curriculum/curriculum';
import { getEffectiveTier } from '../../utils/ascension';
import { TierAvatar } from '../avatar/TierAvatar';
import { RPG_TIERS } from '../../data/rpg/tiers';
import { playSound } from '../../utils/audio';
import { STORAGE_KEY_HOME_GUIDE } from '../../state/storageKeys';
import { StartGuideModal, GuidePath } from './StartGuideModal';
import { FeatureSearch, FeatureTarget } from './FeatureSearch';
import { AnnouncementBanners } from '../announcements/AnnouncementBanners';
import { MailboxCard } from '../mailbox/MailboxCard';
import { SupportCard } from './SupportCard';
import { CommunityCard } from './CommunityCard';
import { PwaInstallModal } from '../pwa/PwaInstallModal';
import { usePwaInstall } from '../../hooks/usePwaInstall';

export interface HomeViewProps {
  stats: PlayerStats;
  onOpenStatusModal: () => void;
  onNavigateTab: (tab: 'maps' | 'daily' | 'weekly' | 'leaderboard' | 'settings' | 'library' | 'deck') => void;
  onStartRecall?: () => void;
  onOpenTower?: () => void;
  onOpenAuth?: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  stats,
  onOpenStatusModal,
  onNavigateTab,
  onStartRecall,
  onOpenTower,
  onOpenAuth,
}) => {
  const { effectiveTierIndex } = getEffectiveTier(stats);
  const displayTierIndex = Math.min(RPG_TIERS.length - 1, Math.max(0, effectiveTierIndex ?? stats.tierIndex ?? 0));
  const displayTier = RPG_TIERS[displayTierIndex];
  const nextTier = displayTierIndex < RPG_TIERS.length - 1 ? RPG_TIERS[displayTierIndex + 1] : null;
  // Progres EXP menuju tier berikutnya (100% bila tier tertinggi atau tertahan gerbang JLPT).
  const tierProgressPct = nextTier
    ? Math.min(100, Math.max(0, ((stats.totalExp - displayTier.requiredExpTotal) / (nextTier.requiredExpTotal - displayTier.requiredExpTotal)) * 100))
    : 100;

  const isNewcomer = stats.totalExp === 0;

  // "Due" = jatah Recall hari ini (dibatasi kuota sesi/harian/materi baru), bukan seluruh antrean.
  const recallPlan = planRecallSession(stats.recallQueue || [], stats.recallDaily, getTodayLocalDate());
  const recallCount = recallPlan.items.length;
  const recallPending = (stats.recallQueue?.length || 0) - recallCount; // menunggu: kuota habis / jadwal berikutnya
  const recallClickable = recallCount > 0 || recallPending > 0;

  // Misi harian = misi kurikulum (Guided Learning); tanpa program aktif, baris ini mengajak menyusunnya.
  const guidedDay = stats.guidedPlan?.status === 'active' ? stats.guidedPlan.today : undefined;
  const guidedProgress = guidedDay ? dayProgress(guidedDay, stats.itemMastery, stats.recallDaily, stats.studyStats) : undefined;
  const hasClaimableReward = (guidedProgress?.claimable || 0) > 0;

  const [guideSeen, setGuideSeen] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_HOME_GUIDE) === 'true';
    } catch {
      return false;
    }
  });
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const pwa = usePwaInstall(stats.soundEnabled);

  const closeGuide = useCallback(() => {
    setIsGuideOpen(false);
    setGuideSeen(true);
    try {
      localStorage.setItem(STORAGE_KEY_HOME_GUIDE, 'true');
    } catch {
      /* penyimpanan tidak tersedia: panduan tetap bisa dibuka lagi */
    }
  }, []);

  const handlePickPath = (path: GuidePath) => {
    closeGuide();
    if (path === 'foundation') onNavigateTab('deck');
    else if (path === 'library') onNavigateTab('library');
    else onNavigateTab('maps');
  };

  const handleFeatureSelect = (target: FeatureTarget) => {
    playSound('click', stats.soundEnabled);
    if (target.type === 'tab') onNavigateTab(target.tab);
    else if (target.type === 'status') onOpenStatusModal();
    else if (target.type === 'recall') {
      if (onStartRecall) onStartRecall();
      else onNavigateTab('deck');
    } else setIsGuideOpen(true);
  };

  const openGuide = () => {
    playSound('open_modal', stats.soundEnabled);
    setIsGuideOpen(true);
  };

  // Satu "langkah berikutnya" yang menyesuaikan kondisi pemain.
  const nextStep = (() => {
    const goBooks = () => onNavigateTab('deck');

    if (isNewcomer && !guideSeen) {
      return { eyebrow: 'MULAI DI SINI', title: 'Kenali SevnQuest', hint: 'Panduan singkat: apa, bagaimana, dan mulai dari mana', icon: Compass, run: openGuide };
    }
    if (isNewcomer) {
      return { eyebrow: 'FOUNDATION', title: 'Mulai Belajar Hiragana', hint: 'Buka Buku Saku: Kuil Aksara Kana Dojo', icon: Play, run: goBooks };
    }
    if (recallCount > 0 && onStartRecall) {
      return { eyebrow: 'LANGKAH BERIKUTNYA', title: `Ulang ${recallCount} item di Recall`, hint: 'Kunci ingatan sebelum materi baru', icon: Flame, run: onStartRecall };
    }
    if (TOWER_ENABLED && onOpenTower) {
      return { eyebrow: 'MENARA NIHONGO', title: 'Lanjutkan Menara', hint: 'Naiki lantai berikutnya', icon: Castle, run: onOpenTower };
    }
    return { eyebrow: 'LANGKAH BERIKUTNYA', title: 'Lanjut Belajar dari Buku', hint: 'Buka rak Buku Saku', icon: Play, run: goBooks };
  })();
  const NextIcon = nextStep.icon;

  const handleContinue = () => {
    playSound('click', stats.soundEnabled);
    nextStep.run();
  };

  return (
    <div className="w-full max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto space-y-4 md:space-y-5 pb-20 sm:pb-8 px-2 sm:px-0">
      {/* 0. PENGUMUMAN dari admin (tetap tampil selama aktif) */}
      <AnnouncementBanners soundEnabled={stats.soundEnabled} />

      {/* 1. CHARACTER AREA: karakter (kiri, fokus visual) + info pemain (kanan) */}
      <motion.div
        data-tour="hero-card"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        onClick={() => {
          playSound('open_modal', stats.soundEnabled);
          onOpenStatusModal();
        }}
        className="panel panel-stitched cursor-pointer overflow-hidden group hover:scale-[1.01] transition-transform"
      >
        <div className="relative z-10 flex items-center gap-3 sm:gap-5 md:gap-8 min-h-[150px] sm:min-h-[180px] md:min-h-[260px] lg:min-h-[320px]">
          {/* Karakter ±40% */}
          <div className="w-[40%] shrink-0 flex items-center justify-center py-2">
            <motion.div
              whileHover={{ scale: 1.05, y: -4 }}
              whileTap={{ scale: 0.95 }}
              className="relative flex items-center justify-center"
            >
              <div className="md:hidden">
                <TierAvatar
                  tierIndex={displayTierIndex}
                  gender={stats.characterGender || 'male'}
                  size="md"
                />
              </div>
              <div className="hidden md:block lg:hidden">
                <TierAvatar
                  tierIndex={displayTierIndex}
                  gender={stats.characterGender || 'male'}
                  size="lg"
                />
              </div>
              <div className="hidden lg:block">
                <TierAvatar
                  tierIndex={displayTierIndex}
                  gender={stats.characterGender || 'male'}
                  size="xl"
                />
              </div>
            </motion.div>
          </div>

          {/* Info pemain ±60%: nama, level, tier, EXP (sekali saja) */}
          <div className="flex-1 min-w-0 space-y-2 md:space-y-3 text-left">
            <h2 className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-bold text-text-primary font-heading tracking-wide truncate">
              {stats.playerName || 'Pelajar Bahasa'}
            </h2>

            <div className="flex items-center gap-1.5 flex-wrap text-[11px] md:text-sm font-mono font-bold">
              <span className="px-2 py-0.5 rounded-lg bg-surface-inset/80 border border-border-subtle text-gold-soft">
                Lv. {stats.level}
              </span>
              <span className="px-2 py-0.5 rounded-lg bg-surface-inset/80 border border-border-subtle text-gold-soft">
                Tier {displayTier.tier}
              </span>
            </div>

            <div className="space-y-1">
              <div className="text-sm md:text-xl font-mono font-bold text-gold truncate">
                {stats.totalExp.toLocaleString()} EXP
              </div>
              <div
                className="h-2 md:h-2.5 w-full bg-surface-inset rounded-full overflow-hidden border border-border-subtle"
                role="progressbar"
                aria-label={nextTier ? `Menuju ${nextTier.name}` : 'Tier tertinggi'}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(tierProgressPct)}
              >
                <div
                  className="h-full bg-gold rounded-full transition-all duration-300"
                  style={{ width: `${tierProgressPct}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-0.5">
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onNavigateTab('daily');
                }}
                className="btn btn-pill flex items-center gap-1 transition-transform !px-2.5 !py-1"
              >
                <Flame className="w-3 h-3 fill-gold text-gold animate-pulse shrink-0" />
                <span className="font-mono text-[10px] md:text-xs text-gold-soft font-bold tracking-wider whitespace-nowrap">{stats.streakDays} HARI STREAK</span>
              </button>
              <span className="text-text-secondary group-hover:text-gold transition-colors shrink-0" title="Lembar Status & Profil">
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 2. NEXT STEP: LANGKAH BERIKUTNYA (adaptif; pemain baru diarahkan ke panduan) */}
      <motion.button
        animate={isNewcomer && !guideSeen ? { y: [0, -4, 0] } : {}}
        transition={isNewcomer && !guideSeen ? { repeat: Infinity, duration: 2, ease: "easeInOut" } : {}}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleContinue}
        className="btn btn-cta md:!py-5 flex items-center justify-between text-left group"
      >
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <div className="w-11 h-11 sm:w-12 sm:h-12 ui-icon-box rounded-xl text-gold group-hover:scale-105 transition-transform shrink-0">
            <NextIcon className="w-5 h-5 sm:w-6 sm:h-6 text-gold" />
          </div>
          <div className="space-y-0.5 min-w-0 flex-1">
            <span className="breadcrumb-label text-gold-soft block">
              {nextStep.eyebrow}
            </span>
            <h3 className="text-base sm:text-lg md:text-xl font-bold text-text-on-btn font-heading truncate">
              {nextStep.title}
            </h3>
            {nextStep.hint && (
              <p className="text-[11px] text-text-secondary font-body truncate">{nextStep.hint}</p>
            )}
          </div>
        </div>

        <div className="w-8 h-8 ui-icon-box rounded-full shrink-0 group-hover:translate-x-1 transition-transform">
          <ChevronRight className="w-5 h-5 text-gold-soft font-bold" />
        </div>
      </motion.button>

      {/* 3. QUICK ACTIVITIES: tiga kartu sejajar, ukuran seragam */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3 md:gap-4">
        {/* Recall Memori (SRS) */}
        <button
          type="button"
          onClick={() => {
            if (onStartRecall && recallClickable) {
              playSound('click', stats.soundEnabled);
              onStartRecall();
            }
          }}
          aria-disabled={!recallClickable}
          className={`panel !p-3 flex flex-col items-center justify-center gap-1.5 text-center min-w-0 min-h-[100px] md:min-h-[140px] lg:min-h-[160px] md:gap-2.5 group transition-all ${
            recallClickable ? 'hover:bg-surface-elevated/40 cursor-pointer' : 'cursor-default'
          }`}
        >
          <div className={`p-2.5 rounded-xl border shrink-0 ${
            recallCount > 0
              ? 'bg-wine/20 text-wine-accent border-wine/40 animate-pulse'
              : 'bg-surface-inset/50 text-gold border-border-subtle'
          }`}>
            <Flame className="w-4 h-4 md:w-5 md:h-5" />
          </div>
          <span className="text-xs sm:text-sm md:text-base font-bold text-text-primary font-heading group-hover:text-gold transition-colors leading-tight w-full truncate">
            Recall Memori
          </span>
          {recallCount > 0 ? (
            <span className="badge-wine animate-pulse whitespace-nowrap">{recallCount} due</span>
          ) : (
            <span className="text-[10px] md:text-xs font-bold text-state-success font-mono w-full truncate">
              {recallPending > 0 ? '✓ Selesai' : '✓ Kosong'}
            </span>
          )}
        </button>

        {/* Misi Harian */}
        <button
          type="button"
          onClick={() => {
            playSound('click', stats.soundEnabled);
            onNavigateTab('daily');
          }}
          className="panel !p-3 flex flex-col items-center justify-center gap-1.5 text-center min-w-0 min-h-[100px] md:min-h-[140px] lg:min-h-[160px] md:gap-2.5 hover:bg-surface-elevated/40 cursor-pointer transition-all group"
        >
          <div className="p-2.5 rounded-xl bg-surface-inset/50 text-indigo border border-border-subtle shrink-0">
            <ScrollIcon className="w-4 h-4 md:w-5 md:h-5" />
          </div>
          <span className="text-xs sm:text-sm md:text-base font-bold text-text-primary font-heading group-hover:text-gold transition-colors leading-tight w-full truncate">
            Misi Harian
          </span>
          <span className={`text-[10px] md:text-xs font-bold font-mono w-full truncate ${
            hasClaimableReward ? 'text-gold font-black animate-pulse' : 'text-text-secondary'
          }`}>
            {guidedProgress
              ? hasClaimableReward
                ? 'Klaim Hadiah!'
                : `${guidedProgress.doneCount}/${guidedProgress.totalCount} selesai`
              : 'Mulai'}
          </span>
        </button>

        {/* Panduan SevnQuest (selalu bisa dibuka ulang) */}
        <button
          type="button"
          onClick={openGuide}
          className="panel !p-3 flex flex-col items-center justify-center gap-1.5 text-center min-w-0 min-h-[100px] md:min-h-[140px] lg:min-h-[160px] md:gap-2.5 hover:bg-surface-elevated/40 cursor-pointer transition-all group"
        >
          <div className="p-2.5 rounded-xl bg-surface-inset/50 text-indigo border border-border-subtle shrink-0">
            <HelpCircle className="w-4 h-4 md:w-5 md:h-5" />
          </div>
          <span className="text-xs sm:text-sm md:text-base font-bold text-text-primary font-heading group-hover:text-gold transition-colors leading-tight w-full truncate">
            Panduan
          </span>
          <span className="text-[10px] md:text-xs text-text-secondary font-mono w-full truncate">SevnQuest</span>
        </button>
      </div>

      {/* 4. APLIKASI WEB (PWA): pasang ke layar utama */}
      <div className="panel !p-3 sm:!p-4 flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-surface-inset/50 text-indigo border border-border-subtle shrink-0">
            <Smartphone className="w-4 h-4 md:w-5 md:h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm md:text-base font-bold text-text-primary font-heading truncate">Aplikasi Web (PWA)</h3>
            <p className="text-[11px] md:text-xs text-text-secondary truncate">
              Pasang di layar utama HP / desktop tanpa bar URL
            </p>
          </div>
        </div>
        {pwa.isStandalone ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-border-subtle text-emerald-700 dark:text-emerald-400 font-bold text-xs shrink-0 whitespace-nowrap shadow-sm">
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Terpasang</span>
          </span>
        ) : (
          <button
            type="button"
            onClick={pwa.handleInstallClick}
            className="btn-physical-secondary px-3.5 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap select-none transition-all text-indigo cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Pasang App</span>
          </button>
        )}
      </div>

      {/* 5. SEARCH: pencarian fitur */}
      <div className="panel p-0 overflow-visible">
        <FeatureSearch onSelect={handleFeatureSelect} />
      </div>

      {/* 6. KOTAK POS + DONASI + KOMUNITAS: tiga ubin kecil sebaris */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3 md:gap-4">
        <MailboxCard playerName={stats.playerName || ''} soundEnabled={stats.soundEnabled} onOpenAuth={onOpenAuth} />
        <SupportCard soundEnabled={stats.soundEnabled} />
        <CommunityCard soundEnabled={stats.soundEnabled} />
      </div>

      <StartGuideModal
        isOpen={isGuideOpen}
        soundEnabled={stats.soundEnabled}
        onClose={closeGuide}
        onPickPath={handlePickPath}
      />

      {/* Panduan pemasangan PWA (dipakai bila prompt native tidak tersedia) */}
      <PwaInstallModal
        isOpen={pwa.showInstallGuide}
        onClose={() => pwa.setShowInstallGuide(false)}
        deferredPrompt={pwa.deferredPrompt}
        onInstalled={pwa.markInstalled}
        soundEnabled={stats.soundEnabled}
      />
    </div>
  );
};

