import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Volume2,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ArrowRight,
  Lightbulb,
  AlertTriangle,
  Flame,
  Layers,
  BookOpen,
} from 'lucide-react';
import { BunpouItem, Question, ItemMasteryRecord } from '../../types/content';
import { RubyText } from '../learning/RubyText';
import { speakJapanese, playSound } from '../../utils/audio';
import { getCanonicalGrammarTitle, getGrammarTitleInfo } from '../../utils/bunpouTitleUtils';
import { UserDeck } from '../../types/rpg';
import { DeckBookmarkPicker } from '../deck/DeckBookmarkPicker';
import { getGrammarSkillNodes } from '../../utils/bunpouSkillAdapter';
import { useBackButton } from '../../hooks/useBackButton';

interface BunpouDetailModalProps {
  item: BunpouItem;
  masteryRecord?: ItemMasteryRecord;
  onClose: () => void;
  soundEnabled?: boolean;
  isBookmarked?: boolean;
  onToggleBookmark?: () => void;
  userDecks?: UserDeck[];
  onToggleDeckItem?: (deckId: string) => void;
  onUpdateDecks?: (decks: UserDeck[]) => void;
  onRewardPlayer?: (exp: number, gold: number) => void;
  onRecordInteraction?: (
    itemId: string,
    category: 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai',
    interactionType: 'writing' | 'flashcard' | 'quiz',
    success?: boolean
  ) => void;
  onCompleteStudyItem?: (
    moduleId: 'bunpou' | 'kotoba' | 'kanji' | 'dokkai' | 'choukai' | 'boss' | 'questions' | 'tryOuts',
    expGained: number,
    goldGained: number,
    itemId?: string,
    score?: number,
    total?: number
  ) => void;
}

/**
 * Strips redundant trailing English in parentheses or bracket notes
 */
const cleanSummary = (text?: string): string => {
  if (!text) return '';
  return text
    .replace(/\s*\([A-Za-z0-9\s/,'’._\-—]{4,}\)\.?\s*$/g, '')
    .trim();
};

type ScrapbookTabId = 'inti' | 'rumus' | 'fungsi' | 'contoh' | 'kuis';

interface ScrapbookTabMeta {
  id: ScrapbookTabId;
  label: string;
  tabNumber: string;
  tabColorActive: string;
  tabColorInactive: string;
  sheetAccentBg: string;
  tagline: string;
}

const SCRAPBOOK_TABS: ScrapbookTabMeta[] = [
  {
    id: 'inti',
    label: 'Inti Makna',
    tabNumber: '①',
    tabColorActive:
      'bg-[#f4eee1] text-[#3d3322] border-[#c8bba3] dark:bg-[#2c261e] dark:text-[#f3ede1] dark:border-[#524637]',
    tabColorInactive:
      'bg-[#e2d8c5] text-[#63553f] border-[#c8bba3] hover:bg-[#ede5d5] dark:bg-[#1f1b16] dark:text-[#a89b88] dark:border-[#383025] hover:dark:bg-[#28221b]',
    sheetAccentBg: 'border-l-4 border-l-[#bfa06d]',
    tagline: 'Esensi & pola pikir dasar pola ini',
  },
  {
    id: 'rumus',
    label: 'Rumus & Pola',
    tabNumber: '②',
    tabColorActive:
      'bg-[#4a6d8c] text-white border-[#3b5974] dark:bg-[#274057] dark:text-white dark:border-[#3d5e7d]',
    tabColorInactive:
      'bg-[#405f7c] text-white/80 border-[#324b61] hover:bg-[#4a6d8c] dark:bg-[#182937] dark:text-[#8cb3d9] dark:border-[#243a4e] hover:dark:bg-[#203445]',
    sheetAccentBg: 'border-l-4 border-l-[#4a6d8c]',
    tagline: 'Koneksi kata kerja, sifat & kata benda',
  },
  {
    id: 'fungsi',
    label: 'Fungsi & Nuansa',
    tabNumber: '③',
    tabColorActive:
      'bg-[#7ba399] text-[#112923] border-[#65887e] dark:bg-[#233d37] dark:text-[#e6f4f1] dark:border-[#375a51]',
    tabColorInactive:
      'bg-[#6d9289] text-[#112923]/80 border-[#56766d] hover:bg-[#7ba399] dark:bg-[#162723] dark:text-[#8cb8ae] dark:border-[#233a34] hover:dark:bg-[#1e342f]',
    sheetAccentBg: 'border-l-4 border-l-[#7ba399]',
    tagline: 'Kapan dipakai & cegah tertukar',
  },
  {
    id: 'contoh',
    label: 'Contoh Nyata',
    tabNumber: '④',
    tabColorActive:
      'bg-[#b85338] text-white border-[#9b422a] dark:bg-[#4a2016] dark:text-[#ffdfd7] dark:border-[#6b2c1f]',
    tabColorInactive:
      'bg-[#a3472d] text-white/80 border-[#853721] hover:bg-[#b85338] dark:bg-[#2c130d] dark:text-[#df8c7c] dark:border-[#421b13] hover:dark:bg-[#3d1a12]',
    sheetAccentBg: 'border-l-4 border-l-[#b85338]',
    tagline: 'Kalimat percakapan bertingkat & audio',
  },
  {
    id: 'kuis',
    label: 'Latihan Kuis',
    tabNumber: '⑤',
    tabColorActive:
      'bg-[#e59e93] text-[#3d1a15] border-[#c98378] dark:bg-[#482426] dark:text-[#ffe4e2] dark:border-[#683437]',
    tabColorInactive:
      'bg-[#cc8b80] text-[#3d1a15]/80 border-[#b07369] hover:bg-[#e59e93] dark:bg-[#271415] dark:text-[#d99497] dark:border-[#381c1e] hover:dark:bg-[#381a1c]',
    sheetAccentBg: 'border-l-4 border-l-[#e59e93]',
    tagline: 'Uji pemahaman & raih +15 EXP',
  },
];

export const BunpouDetailModal: React.FC<BunpouDetailModalProps> = ({
  item,
  masteryRecord,
  onClose,
  soundEnabled = true,
  isBookmarked = false,
  onToggleBookmark,
  userDecks,
  onToggleDeckItem,
  onUpdateDecks,
  onRewardPlayer,
  onRecordInteraction,
  onCompleteStudyItem,
}) => {
  // Hardware & Mobile Back Button Support
  useBackButton(true, () => {
    onClose();
  }, 'bunpou_detail_modal');

  // Scrapbook Active Tab State
  const [activeTab, setActiveTab] = useState<ScrapbookTabId>('inti');

  // Extract human-centered learning flow
  const skillNodes = getGrammarSkillNodes(item);
  const titleInfo = getGrammarTitleInfo(item);
  const cleanLevel = (item.baseLevel || item.level || 'N3').replace(/^Level\s*/i, '');

  const currentTabIdx = SCRAPBOOK_TABS.findIndex((t) => t.id === activeTab);
  const activeTabMeta = SCRAPBOOK_TABS[currentTabIdx] || SCRAPBOOK_TABS[0];

  const handleTabChange = (tabId: ScrapbookTabId) => {
    if (tabId === activeTab) return;
    playSound('click', soundEnabled);
    setActiveTab(tabId);
  };

  const handlePrevTab = () => {
    if (currentTabIdx > 0) {
      handleTabChange(SCRAPBOOK_TABS[currentTabIdx - 1].id);
    }
  };

  const handleNextTab = () => {
    if (currentTabIdx < SCRAPBOOK_TABS.length - 1) {
      handleTabChange(SCRAPBOOK_TABS[currentTabIdx + 1].id);
    }
  };

  // Tab container refs & drag-to-scroll states
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingTabs = useRef(false);
  const startX = useRef(0);
  const scrollLeftStart = useRef(0);
  const hasDragged = useRef(false);
  const [isDraggingState, setIsDraggingState] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Check scroll bounds to show/hide subtle fade edges
  const checkScrollBounds = useCallback(() => {
    const el = tabsContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    const el = tabsContainerRef.current;
    if (!el) return;
    checkScrollBounds();
    el.addEventListener('scroll', checkScrollBounds, { passive: true });
    window.addEventListener('resize', checkScrollBounds);
    return () => {
      el.removeEventListener('scroll', checkScrollBounds);
      window.removeEventListener('resize', checkScrollBounds);
    };
  }, [checkScrollBounds]);

  // Handle horizontal mouse wheel scroll over tabs
  useEffect(() => {
    const el = tabsContainerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && el.scrollWidth > el.clientWidth) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
        checkScrollBounds();
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [checkScrollBounds]);

  // Auto-scroll active tab into view when active tab changes
  useEffect(() => {
    const el = tabsContainerRef.current;
    if (!el) return;
    const activeTabEl = el.querySelector(`[data-tab-id="${activeTab}"]`) as HTMLElement | null;
    if (activeTabEl) {
      activeTabEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      const timer = setTimeout(checkScrollBounds, 250);
      return () => clearTimeout(timer);
    }
  }, [activeTab, checkScrollBounds]);

  // Mouse Drag handlers for tabs
  const handleMouseDownTabs = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const el = tabsContainerRef.current;
    if (!el) return;
    isDraggingTabs.current = true;
    hasDragged.current = false;
    startX.current = e.pageX - el.offsetLeft;
    scrollLeftStart.current = el.scrollLeft;
    setIsDraggingState(true);
  };

  const handleMouseMoveTabs = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingTabs.current) return;
    const el = tabsContainerRef.current;
    if (!el) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startX.current) * 1.2;
    if (Math.abs(walk) > 4) {
      hasDragged.current = true;
    }
    el.scrollLeft = scrollLeftStart.current - walk;
    checkScrollBounds();
  };

  const handleMouseUpOrLeaveTabs = () => {
    if (isDraggingTabs.current) {
      isDraggingTabs.current = false;
      setIsDraggingState(false);
      setTimeout(() => {
        hasDragged.current = false;
      }, 50);
    }
  };

  // Touch swipe gesture for switching pages across the sheet
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleSheetTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleSheetTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const diffX = e.changedTouches[0].clientX - touchStartX.current;
    const diffY = e.changedTouches[0].clientY - touchStartY.current;

    // Minimum 50px horizontal swipe and must be largely horizontal
    if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY) * 1.6) {
      if (diffX < 0) {
        handleNextTab();
      } else {
        handlePrevTab();
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Node 5: Training Quiz States
  const questions = skillNodes.trainingQuestions || [];
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const activeQuestion: Question | undefined = questions[currentQuestionIdx] || questions[0];
  const [selectedAnswerIndex, setSelectedAnswerIndex] = useState<number | null>(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [rewardClaimed, setRewardClaimed] = useState(false);

  const handleSelectAnswer = (idx: number) => {
    if (isAnswerChecked || !activeQuestion) return;
    setSelectedAnswerIndex(idx);
    setIsAnswerChecked(true);

    const isCorrect = idx === activeQuestion.correctIndex;
    if (onRecordInteraction) {
      onRecordInteraction(item.id, 'bunpou', 'quiz', isCorrect);
    }

    if (isCorrect) {
      playSound('correct', soundEnabled);
      if (!rewardClaimed) {
        setRewardClaimed(true);
        if (onCompleteStudyItem) {
          onCompleteStudyItem('bunpou', 15, 10, item.id, 1, 1);
        } else {
          onRewardPlayer?.(15, 10);
        }
      }
    } else {
      playSound('wrong', soundEnabled);
      if (onCompleteStudyItem) {
        onCompleteStudyItem('bunpou', 0, 0, item.id, 0, 1);
      }
    }
  };

  const handleNextQuestion = () => {
    playSound('click', soundEnabled);
    if (questions.length > 1) {
      setCurrentQuestionIdx((prev) => (prev + 1) % questions.length);
    }
    setSelectedAnswerIndex(null);
    setIsAnswerChecked(false);
  };

  const handleRetryQuestion = () => {
    playSound('click', soundEnabled);
    setSelectedAnswerIndex(null);
    setIsAnswerChecked(false);
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <motion.div
      key="grammar-scrapbook-modal-container"
      className="fixed inset-0 z-[80] flex items-center justify-center p-2 sm:p-4 select-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Dimmed Ambient Backdrop with warm desk atmosphere */}
      <motion.div
        className="fixed inset-0 bg-black/80"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => {
          onClose();
          playSound('click', soundEnabled);
        }}
      />

      {/* Main Scrapbook Binder Notebook Container */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="panel panel-stitched relative z-10 w-full max-w-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden rounded-3xl shadow-2xl border border-border-primary/60 bg-surface-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ======================================================== */}
        {/* SCRAPBOOK TOP FOLDER DIVIDER TABS                        */}
        {/* ======================================================== */}
        <div className="relative pt-2.5 sm:pt-3 px-2 sm:px-4 bg-surface-inset border-b border-border-subtle flex items-end justify-between gap-1.5 select-none overflow-hidden">
          {/* Scrollable & Draggable Tabs Area */}
          <div className="relative flex-1 min-w-0 overflow-hidden">
            {/* Left Fade Overflow Indicator */}
            {canScrollLeft && (
              <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-surface-inset via-surface-inset/80 to-transparent z-40 pointer-events-none" />
            )}

            <div
              ref={tabsContainerRef}
              onMouseDown={handleMouseDownTabs}
              onMouseMove={handleMouseMoveTabs}
              onMouseUp={handleMouseUpOrLeaveTabs}
              onMouseLeave={handleMouseUpOrLeaveTabs}
              className={`flex items-end gap-1 sm:gap-1.5 overflow-x-auto scrollbar-none touch-pan-x ${
                isDraggingState ? 'cursor-grabbing select-none' : 'cursor-grab'
              }`}
            >
              {SCRAPBOOK_TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    data-tab-id={tab.id}
                    type="button"
                    onClick={() => {
                      if (hasDragged.current) return;
                      handleTabChange(tab.id);
                    }}
                    className={`group relative transition-all duration-200 cursor-pointer rounded-t-xl sm:rounded-t-2xl px-2.5 sm:px-3.5 py-1.5 sm:py-2 flex items-center gap-1 sm:gap-1.5 border-t border-x font-heading text-xs sm:text-sm font-bold shrink-0 whitespace-nowrap ${
                      isActive
                        ? `${tab.tabColorActive} z-30 translate-y-[1px] shadow-sm pb-2.5 sm:pb-3`
                        : `${tab.tabColorInactive} z-10 opacity-75 hover:opacity-100 hover:-translate-y-0.5`
                    }`}
                    title={tab.label}
                  >
                    {/* Tab Label */}
                    <span>
                      {tab.tabNumber} {tab.label}
                    </span>

                    {/* Active Elevated Tab Highlight */}
                    {isActive && (
                      <motion.div
                        layoutId="activeTabUnderline"
                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/40"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Right Fade Overflow Indicator */}
            {canScrollRight && (
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-surface-inset via-surface-inset/80 to-transparent z-40 pointer-events-none" />
            )}
          </div>

          {/* Quick Close & Tools on Tab Spine - Sticky pinned on right */}
          <div className="pb-1.5 sm:pb-2 flex items-center gap-1.5 pl-2 shrink-0 z-30 bg-surface-inset">
            <DeckBookmarkPicker
              itemId={item.id}
              category="bunpou"
              itemTitle={item.title}
              itemSubtitle={item.meaningId || (item as any).meaning}
              userDecks={userDecks}
              onToggleDeckItem={onToggleDeckItem}
              isDefaultBookmarked={isBookmarked}
              onToggleDefaultBookmark={onToggleBookmark}
              onUpdateDecks={onUpdateDecks}
              soundEnabled={soundEnabled}
            />

            <button
              type="button"
              onClick={onClose}
              className="btn-physical-secondary p-1.5 rounded-xl transition-colors cursor-pointer"
              title="Tutup Scrapbook"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* ACTIVE SCRAPBOOK SHEET                                   */}
        {/* ======================================================== */}
        <div
          onTouchStart={handleSheetTouchStart}
          onTouchEnd={handleSheetTouchEnd}
          className="flex-1 overflow-y-auto bg-surface-card text-text-primary flex flex-col relative scrollbar-thin"
        >
          {/* Stationery Page Header Banner */}
          <div className="p-3.5 sm:p-5 border-b border-border-subtle bg-surface-elevated/40 relative">
            {/* Washi Tape Accent on Top-Left */}
            <div className="absolute -top-1.5 left-5 sm:left-8 w-16 sm:w-20 h-3.5 bg-gold/25 border-y border-dashed border-border-subtle rotate-[-1.5deg] rounded-xs shadow-xs pointer-events-none z-10" />

            <div className="flex items-start justify-between gap-3 sm:gap-4 relative pt-0.5">
              {/* Left Column: Title + Pola + Meaning */}
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold text-text-primary font-heading tracking-wide font-jp leading-tight">
                    {titleInfo.mainTitle}
                  </h1>

                  <button
                    type="button"
                    onClick={() => speakJapanese(titleInfo.audioTarget || titleInfo.mainTitle.replace(/^[〜~]/, ''))}
                    className="btn-physical-secondary p-1 sm:p-1.5 rounded-lg text-indigo hover:text-indigo-light transition-all cursor-pointer shrink-0"
                    title="Dengarkan pelafalan pola kalimat"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Pola Pembentukan (Formation Rule Subtitle) */}
                {titleInfo.formationRule && (
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="px-1.5 py-0.5 rounded bg-indigo/10 border border-border-subtle text-[10px] font-bold tracking-wider text-indigo uppercase font-mono shrink-0">
                      Pola
                    </span>
                    <span className="text-text-secondary font-medium">
                      {titleInfo.formationRule}
                    </span>
                  </div>
                )}

                {/* Meaning Summary */}
                <p className="text-xs sm:text-sm text-text-secondary font-normal leading-relaxed pt-0.5 max-w-xl">
                  {cleanSummary(item.meaningId || (item as any).meaning)}
                </p>
              </div>

              {/* Right Column: JLPT Level Ink Stamp Seal (Cap) */}
              <div
                className="shrink-0 flex flex-col items-center justify-center border-2 border-dashed border-border-subtle text-indigo dark:text-indigo-light rounded-xl px-2.5 sm:px-3 py-1 sm:py-1.5 rotate-[3.5deg] select-none shadow-xs bg-indigo/5 dark:bg-indigo/10 hover:rotate-0 transition-transform duration-200"
                title={`JLPT ${cleanLevel}`}
              >
                <span className="text-[8px] sm:text-[9px] font-mono uppercase tracking-widest font-extrabold opacity-75 leading-none">
                  JLPT
                </span>
                <span className="text-sm sm:text-base font-mono font-black tracking-tight leading-none pt-0.5">
                  {cleanLevel}
                </span>
              </div>
            </div>
          </div>

          {/* ====================================================== */}
          {/* TAB CONTENT PAGES WITH ANIMATION                       */}
          {/* ====================================================== */}
          <div className="p-3.5 sm:p-5 flex-1 space-y-3.5 sm:space-y-4">
            <AnimatePresence mode="wait">
              {/* ---------------------------------------------------- */}
              {/* SHEET 1: INTI MAKNA (Beige Sheet)                    */}
              {/* ---------------------------------------------------- */}
              {activeTab === 'inti' && (
                <motion.div
                  key="sheet-inti"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.16 }}
                  className="space-y-3 sm:space-y-3.5"
                >
                  {/* Essence Memo Card */}
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-surface-inset border border-border-subtle shadow-xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-text-primary font-heading font-bold text-xs uppercase tracking-wider">
                        <Lightbulb className="w-3.5 h-3.5 text-gold" />
                        <span>Esensi Maksud & Logika Berpikir</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-gold/15 text-gold border border-border-subtle">
                        Wajib Paham ★★★★★
                      </span>
                    </div>

                    <p className="text-sm sm:text-base font-bold text-text-primary font-heading leading-relaxed">
                      {cleanSummary(skillNodes.concept.summary)}
                    </p>

                    {/* Comparison Sticky Notes (Before vs After) */}
                    {(skillNodes.concept.beforeState || skillNodes.concept.afterState) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1.5 border-t border-border-subtle/60">
                        {/* Note 1: Tanpa Pola */}
                        <div className="p-2.5 rounded-xl bg-surface-card/80 border border-border-subtle/80 space-y-1">
                          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block font-mono">
                            Tanpa Pola (Fakta Biasa)
                          </span>
                          <p className="text-xs text-text-secondary leading-normal">
                            {skillNodes.concept.beforeState
                              ?.replace(
                                /^(Dulu:\s*|Tanpa Pola:\s*|Tanpa Pola Ini:\s*|Kalimat Netral:\s*|Kalimat Biasa:\s*|Bentuk Standar:\s*)/i,
                                ''
                              )
                              .replace(/[❌📜💬]/g, '')
                              .trim() || 'Kalimat fakta netral biasa.'}
                          </p>
                        </div>

                        {/* Note 2: Dengan Pola Ini */}
                        <div className="p-2.5 rounded-xl bg-indigo/10 border border-border-subtle space-y-1">
                          <span className="text-[10px] font-bold text-indigo uppercase tracking-wider block font-mono">
                            Dengan Pola Ini (Nuansa Alami)
                          </span>
                          <p className="text-xs text-text-primary font-medium leading-normal">
                            {skillNodes.concept.afterState
                              ?.replace(
                                /^(Sekarang:\s*|Dengan Pola:\s*|Dengan Pola Ini:\s*|Pasif Kerugian:\s*|Pola Pasif Repot:\s*|Ragam Lisan:\s*)/i,
                                ''
                              )
                              .replace(/[✅💬🎯🛡️🤝💡]/g, '')
                              .trim() || 'Menambahkan nuansa dan maksud pembicara yang spesifik.'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Starter Example Card */}
                  {skillNodes.concept.starterExample && (
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-surface-inset border border-border-subtle shadow-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted font-heading">
                          Contoh Penggunaan Langsung
                        </span>
                        <button
                          type="button"
                          onClick={() => speakJapanese(skillNodes.concept.starterExample!.japanese)}
                          className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-card transition-colors cursor-pointer"
                          title="Dengarkan pelafalan kalimat"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <p className="text-sm sm:text-base font-semibold text-text-primary font-jp leading-relaxed">
                        <RubyText
                          japanese={skillNodes.concept.starterExample.japanese}
                          reading={skillNodes.concept.starterExample.reading}
                          showFurigana={true}
                        />
                      </p>

                      <p className="text-xs sm:text-sm text-text-secondary leading-relaxed font-sans">
                        {cleanSummary(skillNodes.concept.starterExample.meaningId)}
                      </p>

                      {skillNodes.concept.starterExample.contrastNote &&
                        !skillNodes.concept.starterExample.contrastNote.includes('Penerapan langsung') && (
                          <p className="text-xs text-indigo font-medium border-t border-border-subtle/50 pt-1.5 leading-relaxed">
                            💡 {skillNodes.concept.starterExample.contrastNote}
                          </p>
                        )}
                    </div>
                  )}

                  {/* Grid Paper Memo Pad Accent (Matching Reference Photo) */}
                  <div
                    className="p-3 sm:p-4 rounded-xl bg-surface-elevated/70 border border-border-subtle shadow-xs relative overflow-hidden"
                    style={{
                      backgroundImage: `
                        linear-gradient(to right, var(--color-border-subtle) 1px, transparent 1px),
                        linear-gradient(to bottom, var(--color-border-subtle) 1px, transparent 1px)
                      `,
                      backgroundSize: '14px 14px',
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="font-heading italic font-bold text-xs text-gold">
                        ✦ Catatan Kunci (Key Takeaway)
                      </span>
                    </div>

                    <p className="text-xs text-text-secondary leading-relaxed font-sans">
                      {skillNodes.concept.keyTakeaway ||
                        (item.nuance
                          ? item.nuance
                          : `Pahami konteks penggunaannya: ${cleanSummary(item.meaningId || (item as any).meaning)}. Perhatikan pasangan kata dan situasinya agar penggunaannya tepat sasaran.`)}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* ---------------------------------------------------- */}
              {/* SHEET 2: RUMUS & POLA (Steel Sheet)                  */}
              {/* ---------------------------------------------------- */}
              {activeTab === 'rumus' && (
                <motion.div
                  key="sheet-rumus"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.16 }}
                  className="space-y-3 sm:space-y-3.5"
                >
                  {/* Formulas Section */}
                  <div className="space-y-2.5">
                    {skillNodes.formulas.map((form, fIdx) => {
                      // Defensively sanitize breakdown parts: strip leading/trailing '+' and filter out pure plus items
                      const cleanParts = form.breakdown
                        .map((p) => p.replace(/^[＋+\s]+|[＋+\s]+$/g, '').trim())
                        .filter((p) => p.length > 0 && p !== '+' && p !== '＋');

                      // Check if items are distinct part-of-speech rules (e.g. "Kata Benda (N): N ＋ らしい")
                      const isConditionRules = cleanParts.length > 0 && cleanParts.some((p) => p.includes(':'));

                      return (
                        <div
                          key={fIdx}
                          className="p-3.5 sm:p-4 rounded-2xl bg-surface-inset border border-border-subtle shadow-xs space-y-2.5"
                        >
                          <h4 className="text-xs sm:text-sm font-bold text-text-primary font-heading">
                            {form.title}
                          </h4>

                          {/* Connection Formula Display */}
                          {isConditionRules ? (
                            <div className="space-y-1.5">
                              {cleanParts.map((part, pIdx) => {
                                const colonIdx = part.indexOf(':');
                                if (colonIdx !== -1) {
                                  const posLabel = part.slice(0, colonIdx).trim();
                                  const posRule = part.slice(colonIdx + 1).trim();
                                  return (
                                    <div
                                      key={pIdx}
                                      className="flex flex-wrap items-center gap-2 p-2 rounded-xl bg-surface-card border border-border-subtle/80 text-xs"
                                    >
                                      <span className="px-2 py-0.5 rounded-md bg-indigo/10 border border-border-subtle text-indigo font-bold text-[11px] font-heading shrink-0">
                                        {posLabel}
                                      </span>
                                      <span className="font-mono text-text-primary font-semibold text-xs tracking-wide">
                                        {posRule}
                                      </span>
                                    </div>
                                  );
                                }
                                return (
                                  <div
                                    key={pIdx}
                                    className="p-2 rounded-xl bg-surface-card border border-border-subtle/80 text-xs font-mono text-text-primary font-semibold"
                                  >
                                    {part}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center gap-1.5">
                              {cleanParts.map((part, pIdx) => (
                                <React.Fragment key={pIdx}>
                                  {pIdx > 0 && (
                                    <span className="text-text-muted font-bold text-xs select-none">
                                      ＋
                                    </span>
                                  )}
                                  <span className="px-2.5 py-0.5 rounded-lg bg-surface-card border border-border-subtle font-mono text-xs font-semibold text-text-primary shadow-xs">
                                    {part}
                                  </span>
                                </React.Fragment>
                              ))}
                            </div>
                          )}

                        {/* Progression Arrow */}
                        {form.progression && form.progression.length > 0 && (
                          <div className="p-2 sm:p-2.5 rounded-xl bg-surface-card border border-border-subtle flex flex-wrap items-center gap-1.5 text-xs font-mono">
                            {form.progression.map((step, sIdx) => (
                              <React.Fragment key={sIdx}>
                                {sIdx > 0 && <ArrowRight className="w-3 h-3 text-text-muted" />}
                                <span
                                  className={`px-2 py-0.5 rounded-md ${
                                    sIdx === form.progression!.length - 1
                                      ? 'bg-indigo/20 text-indigo border border-border-subtle font-bold'
                                      : 'bg-surface-inset text-text-secondary font-medium'
                                  }`}
                                >
                                  {step}
                                </span>
                              </React.Fragment>
                            ))}
                          </div>
                        )}

                        {form.note && (
                          <p className="text-[11px] text-text-muted leading-relaxed font-sans">
                            💡 {form.note}
                          </p>
                        )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Word Identities: Kata yang Cocok */}
                  {skillNodes.wordIdentities.length > 0 && (
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-surface-inset border border-border-subtle shadow-xs space-y-2.5">
                      <div className="flex items-center gap-1.5 text-text-primary font-heading font-bold text-xs uppercase tracking-wider">
                        <Layers className="w-3.5 h-3.5 text-indigo" />
                        <span>Kata yang Cocok Masuk (Kategori & Contoh)</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {skillNodes.wordIdentities.map((identity, iIdx) => (
                          <div
                            key={iIdx}
                            className="p-3 rounded-xl bg-surface-card border border-border-subtle space-y-1.5 flex flex-col justify-between"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm">{identity.icon || '🏷️'}</span>
                                <h5 className="text-xs font-bold text-text-primary font-heading">
                                  {identity.typeCategory}
                                </h5>
                              </div>
                              <p className="text-xs text-text-secondary font-sans leading-relaxed">
                                {identity.functionEffect}
                              </p>
                            </div>

                            <div className="pt-1.5 border-t border-border-subtle/60 flex flex-wrap items-center gap-1">
                              {identity.examples.map((ex, exIdx) => (
                                <span
                                  key={exIdx}
                                  className="px-2 py-0.5 rounded-md bg-surface-inset text-text-primary text-[11px] font-mono font-medium border border-border-subtle shadow-xs"
                                >
                                  {ex}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ---------------------------------------------------- */}
              {/* SHEET 3: FUNGSI & NUANSA (Carolina Sheet)            */}
              {/* ---------------------------------------------------- */}
              {activeTab === 'fungsi' && (
                <motion.div
                  key="sheet-fungsi"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.16 }}
                  className="space-y-3 sm:space-y-3.5"
                >
                  {/* Situations / Functions */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted font-heading block">
                      Situasi & Kapan Dipakai
                    </span>

                    {skillNodes.functions.map((fn, fIdx) => (
                      <div
                        key={fIdx}
                        className="p-3 sm:p-3.5 rounded-2xl bg-surface-inset border border-border-subtle shadow-xs space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-md bg-indigo/15 text-indigo font-bold text-xs flex items-center justify-center shrink-0">
                            {fn.number}
                          </span>
                          <h4 className="text-xs sm:text-sm font-bold text-text-primary font-heading">
                            {fn.label}
                          </h4>
                        </div>

                        <p className="text-xs text-text-secondary leading-relaxed font-sans">
                          {fn.description}
                        </p>

                        {fn.miniExample && (
                          <div className="p-2 sm:p-2.5 rounded-xl bg-surface-card border border-border-subtle flex items-start justify-between gap-2">
                            <div className="space-y-0.5 min-w-0">
                              <p className="text-xs sm:text-sm font-semibold text-text-primary font-jp leading-relaxed">
                                {fn.miniExample.japanese}
                              </p>
                              <p className="text-[11px] text-text-muted font-sans">
                                {cleanSummary(fn.miniExample.meaningId)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => speakJapanese(fn.miniExample!.japanese)}
                              className="p-1 rounded-lg text-text-muted hover:text-indigo transition-colors shrink-0 cursor-pointer"
                              title="Dengarkan audio"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Nuance & Difference Contrasts (Jangan Sampai Tertukar!) */}
                  {skillNodes.nuances.length > 0 && (
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-surface-inset border border-border-subtle shadow-xs space-y-2.5">
                      <div className="flex items-center gap-1.5 text-wine-accent font-heading font-bold text-xs uppercase tracking-wider">
                        <AlertTriangle className="w-3.5 h-3.5 text-wine-accent" />
                        <span>Perbedaan & Nuansa: Jangan Sampai Tertukar!</span>
                      </div>

                      <div className="space-y-2">
                        {skillNodes.nuances.map((nuance, nIdx) => (
                          <div
                            key={nIdx}
                            className="p-3 rounded-xl bg-surface-card border border-border-subtle space-y-2"
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div className="p-2 rounded-lg bg-surface-inset border border-border-subtle space-y-0.5">
                                <p className="text-xs font-bold text-indigo font-jp">
                                  {nuance.contrastA}
                                </p>
                                <p className="text-xs text-text-secondary font-sans leading-normal">
                                  = {cleanSummary(nuance.meaningA)}
                                </p>
                              </div>

                              <div className="p-2 rounded-lg bg-surface-inset border border-border-subtle space-y-0.5">
                                <p className="text-xs font-bold text-gold font-jp">
                                  {nuance.contrastB}
                                </p>
                                <p className="text-xs text-text-secondary font-sans leading-normal">
                                  = {cleanSummary(nuance.meaningB)}
                                </p>
                              </div>
                            </div>

                            {nuance.explanation && (
                              <p className="text-xs text-text-muted leading-relaxed font-sans">
                                💡 {nuance.explanation}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ---------------------------------------------------- */}
              {/* SHEET 4: CONTOH NYATA (Cherry Sheet)                 */}
              {/* ---------------------------------------------------- */}
              {activeTab === 'contoh' && (
                <motion.div
                  key="sheet-contoh"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.16 }}
                  className="space-y-2.5 sm:space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted font-heading">
                      Contoh Percakapan Bertingkat
                    </span>
                    <span className="text-[10px] font-mono text-text-muted">
                      {skillNodes.examples.length} Kalimat Tersedia
                    </span>
                  </div>

                  {skillNodes.examples.map((ex, exIdx) => (
                    <div
                      key={exIdx}
                      className="p-3 sm:p-3.5 rounded-2xl bg-surface-inset border border-border-subtle shadow-xs space-y-1.5 relative"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-mono font-medium text-text-muted select-none tracking-wide">
                          例 {exIdx + 1}
                        </span>

                        <button
                          type="button"
                          onClick={() => speakJapanese(ex.japanese)}
                          className="p-1 rounded-lg text-text-muted hover:text-indigo hover:bg-surface-card transition-colors cursor-pointer"
                          title="Dengarkan pelafalan kalimat"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="space-y-0.5">
                        <p className="text-sm sm:text-base font-semibold text-text-primary font-jp leading-relaxed">
                          <RubyText japanese={ex.japanese} reading={ex.reading} showFurigana={true} />
                        </p>
                        <p className="text-xs text-text-secondary font-sans leading-normal">
                          {cleanSummary(ex.meaningId)}
                        </p>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}

              {/* ---------------------------------------------------- */}
              {/* SHEET 5: LATIHAN KUIS (Peaches Sheet)                */}
              {/* ---------------------------------------------------- */}
              {activeTab === 'kuis' && (
                <motion.div
                  key="sheet-kuis"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.16 }}
                  className="space-y-3 sm:space-y-3.5"
                >
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-surface-inset border border-border-subtle shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-gold font-heading font-bold text-xs uppercase tracking-wider">
                        <Flame className="w-3.5 h-3.5 text-gold" />
                        <span>Tantangan Uji Pemahaman</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-lg bg-gold/15 text-gold text-[10px] font-bold font-mono border border-border-subtle">
                        +15 EXP & +10 Gold
                      </span>
                    </div>

                    {activeQuestion ? (
                      <div className="space-y-2.5">
                        {/* Prompt */}
                        <div className="p-3 rounded-xl bg-surface-card border border-border-subtle space-y-1">
                          <p className="text-[11px] text-text-muted font-sans">
                            {activeQuestion.instructionId || activeQuestion.instruction || 'Pilihlah jawaban yang paling tepat:'}
                          </p>
                          <p className="text-sm sm:text-base font-semibold text-text-primary font-jp leading-relaxed">
                            <RubyText japanese={activeQuestion.prompt} reading={activeQuestion.ruby} showFurigana={true} />
                          </p>
                        </div>

                        {/* Options */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {activeQuestion.options.map((opt, oIdx) => {
                            const isSelected = selectedAnswerIndex === oIdx;
                            const isCorrect = isAnswerChecked && oIdx === activeQuestion.correctIndex;
                            const isWrong = isAnswerChecked && isSelected && !isCorrect;

                            let btnStyle =
                              'bg-surface-card hover:bg-surface-elevated border-border-subtle text-text-primary';
                            if (isCorrect) {
                              btnStyle =
                                'bg-emerald-500/20 border-border-subtle text-emerald-400';
                            } else if (isWrong) {
                              btnStyle =
                                'bg-rose-500/20 border-border-subtle text-rose-400';
                            } else if (isSelected) {
                              btnStyle =
                                'bg-surface-elevated border-border-muted text-text-primary';
                            }

                            return (
                              <button
                                key={oIdx}
                                type="button"
                                onClick={() => handleSelectAnswer(oIdx)}
                                disabled={isAnswerChecked}
                                className={`p-2.5 sm:p-3 rounded-xl border text-left font-jp text-xs sm:text-sm font-medium transition-all flex items-center justify-between gap-2 cursor-pointer shadow-xs ${btnStyle} ${
                                  isAnswerChecked ? 'cursor-default' : 'active:scale-[0.99]'
                                }`}
                              >
                                <span>{opt}</span>
                                {isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                                {isWrong && <XCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>

                        {/* Result Feedback */}
                        {isAnswerChecked && (
                          <div className="space-y-2.5 pt-1">
                            {selectedAnswerIndex === activeQuestion.correctIndex ? (
                              <div className="p-3 rounded-xl bg-emerald-500/10 border border-border-subtle flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs sm:text-sm font-heading">
                                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                                  <span>Tepat Sekali! Skill Pola Kalimat Berhasil Diuji.</span>
                                </div>
                                <span className="text-xs font-mono font-bold text-gold shrink-0">
                                  +15 EXP
                                </span>
                              </div>
                            ) : (
                              <div className="p-3 rounded-xl bg-rose-500/10 border border-border-subtle flex items-center gap-1.5 text-rose-400 font-bold text-xs sm:text-sm font-heading">
                                <XCircle className="w-4 h-4 shrink-0" />
                                <span>Kurang Tepat. Simak catatan penjelasan berikut:</span>
                              </div>
                            )}

                            {activeQuestion.explanation && (
                              <div className="p-3 rounded-xl bg-surface-card border border-border-subtle text-xs text-text-secondary leading-relaxed space-y-1 font-sans">
                                <strong className="text-text-primary block font-heading">Penjelasan:</strong>
                                <p>{activeQuestion.explanation}</p>
                              </div>
                            )}

                            <div className="flex items-center justify-end gap-2 pt-0.5">
                              {selectedAnswerIndex !== activeQuestion.correctIndex && (
                                <button
                                  type="button"
                                  onClick={handleRetryQuestion}
                                  className="btn-physical-secondary text-xs py-1.5 px-3 rounded-xl flex items-center gap-1 cursor-pointer font-heading"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Coba Lagi</span>
                                </button>
                              )}

                              {questions.length > 1 && (
                                <button
                                  type="button"
                                  onClick={handleNextQuestion}
                                  className="btn-physical-primary text-xs py-1.5 px-3.5 rounded-xl flex items-center gap-1 cursor-pointer font-heading"
                                >
                                  <span>Soal Berikutnya</span>
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-text-muted">Soal latihan tidak tersedia saat ini.</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ====================================================== */}
          {/* SCRAPBOOK FOOTER / PAGE FLIP NAVIGATION CONTROLS       */}
          {/* ====================================================== */}
          <div className="p-3 sm:p-3.5 border-t border-border-subtle bg-surface-inset/90 flex items-center justify-between gap-2 shrink-0">
            {/* Sheet Page Indicator */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-medium text-text-secondary">
                Lembar {currentTabIdx + 1}/5
              </span>
              <span className="hidden sm:inline text-xs text-text-muted font-sans">
                • {activeTabMeta.tagline}
              </span>
            </div>

            {/* Previous & Next Page Turners */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={handlePrevTab}
                disabled={currentTabIdx === 0}
                className="btn-physical-secondary text-xs py-1.5 px-3 rounded-xl flex items-center gap-1 font-heading font-semibold disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Sebelumnya</span>
              </button>

              {currentTabIdx < SCRAPBOOK_TABS.length - 1 ? (
                <button
                  type="button"
                  onClick={handleNextTab}
                  className="btn-physical-primary text-xs py-1.5 px-3.5 rounded-xl flex items-center gap-1 font-heading font-bold cursor-pointer"
                >
                  <span>Selanjutnya</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-physical-primary text-xs py-1.5 px-4 rounded-xl flex items-center gap-1 font-heading font-bold cursor-pointer"
                >
                  <span>Selesai Belajar</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
};
