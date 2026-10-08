import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import {
  X, Shuffle, BookOpen, Languages, Scroll, Utensils, ShoppingBag, Briefcase, Gamepad2, HeartPulse,
  CloudSun, Compass, Stethoscope, ChevronDown, ChevronUp, Trash2, Loader2, ArrowLeft, Copy, Check,
} from 'lucide-react';
import { DeckType, UserDeck } from '../../types/rpg';
import { playSound } from '../../utils/audio';
import { useBackButton } from '../../hooks/useBackButton';
import { DECK_THEMES } from '../../data/deckThemes';
import { buildDeckFromTopic, getTheme, toUserDeck, type DeckBuildItem } from '../../engine/deck/deckBuilder';
import { requestTopicPlan, type TopicPlan } from '../../utils/deckAiClient';
import {
  buildGeminiDeckPrompt,
  parseGeminiDeckJson,
  convertAiDeckToUserDeck,
} from '../../utils/aiDeckPrompt';

type Icon = React.ComponentType<{ className?: string }>;

const THEME_ICONS: Record<string, Icon> = {
  kuliner: Utensils, konbini: ShoppingBag, kerja: Briefcase, medis: HeartPulse,
  musim: CloudSun, wisata: Compass, rpg: Gamepad2, kaigo: Stethoscope,
};

const JLPT_LEVELS = ['ALL', 'N5', 'N4', 'N3', 'N2', 'N1'];
const ITEM_COUNTS = [10, 15, 20, 30, 40];

const FOCUS_OPTIONS: { type: DeckType; label: string; icon: Icon; desc: string }[] = [
  { type: 'kotoba', label: 'Kosakata', icon: BookOpen, desc: 'Kata benda, kerja, sifat' },
  { type: 'kanji', label: 'Kanji', icon: Languages, desc: 'Aksara & cara baca' },
  { type: 'bunpou', label: 'Tata Bahasa', icon: Scroll, desc: 'Pola kalimat & rumus' },
  { type: 'mixed', label: 'Campuran', icon: Shuffle, desc: 'Semua jenis materi' },
];

const CATEGORY_LABEL = { kotoba: 'Kotoba', kanji: 'Kanji', bunpou: 'Pola' } as const;
const PREFS_KEY = 'nihongo_quest_ai_deck_prefs';

interface Prefs { type: DeckType; levels: string[]; count: number }

function loadPrefs(): Prefs {
  try {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY) || 'null');
    return {
      type: p?.type && FOCUS_OPTIONS.some(f => f.type === p.type) ? p.type : 'kotoba',
      levels: Array.isArray(p?.levels) && p.levels.length ? p.levels : ['ALL'],
      count: ITEM_COUNTS.includes(p?.count) ? p.count : 20,
    };
  } catch {
    return { type: 'kotoba', levels: ['ALL'], count: 20 };
  }
}

interface AIDeckCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveDeck: (newDeck: UserDeck) => void;
  soundEnabled?: boolean;
}

interface BuiltDeck {
  items: DeckBuildItem[];
  shortfall: boolean;
  aiUsed: boolean;
  title: string;
  description: string;
  icon: string;
}

export const AIDeckCustomizerModal: React.FC<AIDeckCustomizerModalProps> = ({
  isOpen,
  onClose,
  onSaveDeck,
  soundEnabled = true,
}) => {
  useBackButton(isOpen, onClose, 'ai_deck_customizer_modal');

  const [prefs] = useState(loadPrefs);
  const [topic, setTopic] = useState('');
  const [themeId, setThemeId] = useState<string | undefined>();
  const [focus, setFocus] = useState<DeckType>(prefs.type);
  const [levels, setLevels] = useState<string[]>(prefs.levels);
  const [count, setCount] = useState<number>(prefs.count);

  const [isBuilding, setIsBuilding] = useState(false);
  const [built, setBuilt] = useState<BuiltDeck | null>(null);
  const [title, setTitle] = useState('');

  const [showImport, setShowImport] = useState(false);
  const [rawJson, setRawJson] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify({ type: focus, levels, count })); } catch { /* tidak kritis */ }
  }, [focus, levels, count]);

  const click = () => playSound('click', soundEnabled);

  const importResult = useMemo(() => (rawJson.trim() ? parseGeminiDeckJson(rawJson) : null), [rawJson]);

  if (!isOpen) return null;

  const toggleLevel = (id: string) => {
    click();
    if (id === 'ALL') return setLevels(['ALL']);
    const next = levels.filter(l => l !== 'ALL');
    const updated = next.includes(id) ? next.filter(l => l !== id) : [...next, id];
    setLevels(updated.length ? updated : ['ALL']);
  };

  const pickTheme = (id: string) => {
    click();
    if (themeId === id) { setThemeId(undefined); setTopic(''); return; }
    setThemeId(id);
    setTopic(getTheme(id)!.title);
  };

  const canBuild = topic.trim().length > 0 && !isBuilding;

  const handleBuild = async () => {
    if (!canBuild) return;
    click();
    setIsBuilding(true);
    const theme = getTheme(themeId);
    const text = topic.trim();

    // Tema siap pakai tidak perlu AI. Topik bebas diperluas AI bila tersedia; kalau tidak, pencocokan lokal.
    const plan: TopicPlan | null = theme ? null : await requestTopicPlan(text);
    const result = buildDeckFromTopic({
      topic: text,
      themeId: theme?.id,
      focus,
      levels,
      count,
      extraKeywords: plan?.keywords,
    });

    setBuilt({
      items: result.items,
      shortfall: result.shortfall,
      aiUsed: Boolean(plan),
      title: theme?.title || plan?.title || text,
      description: theme?.description || plan?.description || `Materi bertema "${text}" dari database SevnQuest.`,
      icon: theme?.coverIcon || plan?.icon || '📖',
    });
    setTitle(theme?.title || plan?.title || text);
    setIsBuilding(false);
    playSound(result.items.length ? 'correct' : 'wrong', soundEnabled);
  };

  const removeItem = (id: string, category: string) => {
    click();
    setBuilt(b => (b ? { ...b, items: b.items.filter(i => !(i.entityId === id && i.category === category)) } : b));
  };

  const handleSave = () => {
    if (!built || built.items.length === 0) return;
    onSaveDeck(toUserDeck({
      title: title.trim() || built.title,
      description: built.description,
      coverIcon: built.icon,
      focus,
      levels,
      items: built.items,
    }));
  };

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(buildGeminiDeckPrompt({
        topic: topic.trim() || 'Kosakata bahasa Jepang sehari-hari',
        level: levels.includes('ALL') ? 'Semua Level' : levels.join(', '),
        type: focus,
        count,
      }));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard tidak tersedia */ }
  };

  const handleImport = () => {
    if (!importResult?.success || !importResult.deck) return;
    onSaveDeck(convertAiDeckToUserDeck(importResult.deck));
  };

  const inputClass =
    'w-full px-4 py-3 bg-surface-inset border border-border-subtle rounded-2xl text-sm text-text-primary placeholder:text-text-muted focus:outline-hidden focus:border-border-primary transition-all shadow-inner font-medium';

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[80] flex items-center justify-center px-3 py-4 sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="fixed inset-0 bg-black/75" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        role="dialog"
        aria-modal="true"
        aria-label="Studio Deck Otomatis"
        className="panel panel-stitched relative w-full max-w-lg border border-border-subtle rounded-3xl shadow-2xl overflow-hidden max-h-[92dvh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 p-4 sm:p-5 border-b border-border-subtle bg-surface-inset">
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              <span className="breadcrumb-label text-gold-soft block">BUKU SAKU</span>
              <h3 className="text-base sm:text-lg font-bold font-heading text-text-primary truncate">Studio Deck Otomatis</h3>
            </div>
          </div>
          <button type="button" onClick={onClose} className="btn-physical-secondary p-2 rounded-xl" aria-label="Tutup">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {!built ? (
            <>
              <section className="space-y-2">
                <label className="text-xs font-bold font-heading text-text-primary" htmlFor="deck-topic">Topik deck</label>
                <input
                  id="deck-topic"
                  type="text"
                  value={topic}
                  maxLength={80}
                  onChange={e => { setTopic(e.target.value); setThemeId(undefined); }}
                  onKeyDown={e => { if (e.key === 'Enter') handleBuild(); }}
                  placeholder="Contoh: makanan, rumah sakit, izakaya, hewan..."
                  className={inputClass}
                  autoFocus
                />
                <div className="flex flex-wrap gap-2">
                  {DECK_THEMES.map(t => {
                    const TIcon = THEME_ICONS[t.id] || BookOpen;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => pickTheme(t.id)}
                        className={`ui-chip px-3 py-1.5 text-xs font-bold font-heading flex items-center gap-1.5 ${themeId === t.id ? 'is-active' : ''}`}
                      >
                        <TIcon className="w-3.5 h-3.5" />
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="space-y-2">
                <span className="text-xs font-bold font-heading text-text-primary">Fokus materi</span>
                <div className="grid grid-cols-2 gap-2">
                  {FOCUS_OPTIONS.map(f => {
                    const FIcon = f.icon;
                    return (
                      <button
                        key={f.type}
                        type="button"
                        onClick={() => { click(); setFocus(f.type); }}
                        className={`ui-chip p-3 text-left flex flex-col gap-1 ${focus === f.type ? 'is-active' : ''}`}
                      >
                        <span className="flex items-center gap-1.5 text-xs font-bold font-heading"><FIcon className="w-3.5 h-3.5" />{f.label}</span>
                        <span className="text-[11px] text-text-secondary font-body">{f.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="space-y-2">
                <span className="text-xs font-bold font-heading text-text-primary">Level JLPT</span>
                <div className="flex flex-wrap gap-2">
                  {JLPT_LEVELS.map(l => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => toggleLevel(l)}
                      className={`ui-chip px-3.5 py-1.5 text-xs font-bold font-mono ${levels.includes(l) ? 'is-active' : ''}`}
                    >
                      {l === 'ALL' ? 'Semua' : l}
                    </button>
                  ))}
                </div>
              </section>

              <section className="space-y-2">
                <span className="text-xs font-bold font-heading text-text-primary">Jumlah kartu</span>
                <div className="flex flex-wrap gap-2">
                  {ITEM_COUNTS.map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => { click(); setCount(n); }}
                      className={`ui-chip px-3.5 py-1.5 text-xs font-bold font-mono ${count === n ? 'is-active' : ''}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </section>

              {/* Cadangan: impor manual dari AI lain */}
              <section className="border-t border-border-subtle pt-3">
                <button
                  type="button"
                  onClick={() => { click(); setShowImport(v => !v); }}
                  className="w-full flex items-center justify-between text-xs font-bold font-heading text-text-secondary hover:text-text-primary transition-colors"
                >
                  <span>Punya JSON dari AI lain?</span>
                  {showImport ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {showImport && (
                  <div className="mt-3 space-y-2">
                    <textarea
                      value={rawJson}
                      onChange={e => setRawJson(e.target.value)}
                      rows={4}
                      placeholder="Tempel JSON deck di sini..."
                      className="w-full px-3 py-2 bg-surface-inset border border-border-subtle rounded-2xl text-xs font-mono text-text-primary placeholder:text-text-muted focus:outline-hidden focus:border-border-primary shadow-inner"
                    />
                    {importResult && !importResult.success && (
                      <p className="text-[11px] text-state-danger">{importResult.error}</p>
                    )}
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={handleCopyPrompt} className="btn-physical-secondary px-3 py-2 text-xs font-bold font-heading flex items-center gap-1.5">
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? 'Tersalin' : 'Salin prompt'}
                      </button>
                      <button
                        type="button"
                        onClick={handleImport}
                        disabled={!importResult?.success}
                        className="btn-physical-primary px-3 py-2 text-xs font-bold font-heading disabled:opacity-50"
                      >
                        Pakai JSON ({importResult?.success ? importResult.deck?.items.length : 0})
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </>
          ) : (
            <>
              <section className="space-y-2">
                <label className="text-xs font-bold font-heading text-text-primary" htmlFor="deck-title">Nama deck</label>
                <div className="flex items-center gap-2">
                  <span className="w-11 h-11 ui-icon-box rounded-xl text-xl shrink-0">{built.icon}</span>
                  <input
                    id="deck-title"
                    type="text"
                    value={title}
                    maxLength={40}
                    onChange={e => setTitle(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <p className="text-[11px] text-text-secondary font-body">
                  {built.items.length} materi dari database SevnQuest ·{' '}
                  {built.aiUsed ? 'topik diperluas AI' : 'pencocokan lokal'}
                </p>
              </section>

              {built.items.length === 0 ? (
                <div className="p-4 rounded-2xl bg-surface-inset border border-border-subtle text-center space-y-1">
                  <p className="text-sm font-bold font-heading text-text-primary">Belum ada materi yang cocok</p>
                  <p className="text-xs text-text-secondary">Coba kata yang lebih umum, level &quot;Semua&quot;, atau fokus lain.</p>
                </div>
              ) : (
                <>
                  {built.shortfall && (
                    <p className="text-[11px] text-text-secondary p-3 rounded-2xl bg-surface-inset border border-border-subtle">
                      Hanya ditemukan {built.items.length} dari {count} materi yang cocok dengan topik ini.
                    </p>
                  )}
                  <ul className="rounded-2xl border border-border-subtle divide-y divide-border-subtle bg-surface-inset max-h-72 overflow-y-auto">
                    {built.items.map(item => (
                      <li key={`${item.category}:${item.entityId}`} className="flex items-center gap-3 px-3 py-2">
                        <span className="ui-chip px-2 py-0.5 text-[10px] font-mono font-bold shrink-0">{CATEGORY_LABEL[item.category]}</span>
                        <span className="min-w-0 flex-1">
                          <span className="text-sm font-bold font-heading text-text-primary">{item.primaryText}</span>
                          {item.reading && item.reading !== item.primaryText && (
                            <span className="text-xs font-mono text-text-muted ml-2">{item.reading}</span>
                          )}
                          <span className="block text-[11px] text-text-secondary truncate">{item.meaning}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => removeItem(item.entityId, item.category)}
                          className="p-1.5 rounded-lg text-text-muted hover:text-state-danger transition-colors shrink-0"
                          aria-label={`Hapus ${item.primaryText}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-4 sm:p-5 border-t border-border-subtle bg-surface-inset">
          {!built ? (
            <>
              <button type="button" onClick={onClose} className="btn btn-secondary px-4 py-2.5 text-xs font-heading">Batal</button>
              <button
                type="button"
                onClick={handleBuild}
                disabled={!canBuild}
                className="btn-physical-primary px-5 py-2.5 text-xs font-bold font-heading flex items-center gap-2 disabled:opacity-50"
              >
                {isBuilding && <Loader2 className="w-4 h-4 animate-spin" />}
                {isBuilding ? 'Menyusun deck...' : 'Buat Deck'}
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => { click(); setBuilt(null); }} className="btn btn-secondary px-4 py-2.5 text-xs font-heading flex items-center gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5" /> Ubah
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={built.items.length === 0}
                className="btn-physical-primary px-5 py-2.5 text-xs font-bold font-heading disabled:opacity-50"
              >
                Simpan Deck ({built.items.length})
              </button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
};
