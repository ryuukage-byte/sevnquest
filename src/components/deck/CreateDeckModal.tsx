import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Bookmark, Search } from 'lucide-react';
import { DeckType, UserDeck, DeckItemRef, DeckItemCategory } from '../../types/rpg';
import { playSound } from '../../utils/audio';
import { generatePresetDeckItems, DEFAULT_BOOKMARK_DECK_ID } from '../../utils/decks';
import { KOTOBA_DATABASE } from '../../data/kotoba';
import { KANJI_DATABASE } from '../../data/kanji';
import { BUNPOU_DATABASE } from '../../data/bunpou';
import { useBackButton } from '../../hooks/useBackButton';

const AVAILABLE_ICONS = ['📖', '🔖', '✍️', '⚡', '🎯', '🌸', '🗡️', '📜', '🌟', '🔥', '🏯', '🍵', '🏹', '💎', '🍁', '🍙'];

const DECK_TYPES: { type: DeckType; label: string; desc: string }[] = [
  { type: 'mixed', label: 'Campuran', desc: 'Kosakata, Kanji, dan Tata Bahasa sekaligus' },
  { type: 'flashcard', label: 'Flashcard Drill', desc: 'Fokus hafalan bolak-balik arti & bacaan' },
  { type: 'writing', label: 'Latihan Menulis', desc: 'Fokus goresan kanvas Kanji & Kosakata' },
  { type: 'kotoba', label: 'Fokus Kosakata', desc: 'Kumpulan kata dan frasa penting' },
  { type: 'kanji', label: 'Fokus Aksara & Kanji', desc: 'Koleksi kanji dan onyomi/kunyomi' },
  { type: 'bunpou', label: 'Fokus Tata Bahasa', desc: 'Pola kalimat, rumus, dan contoh praktis' },
];

type ContentSourceMode = 'preset' | 'bookmark' | 'manual' | 'empty';

interface CreateDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    description: string;
    type: DeckType;
    coverIcon: string;
    initialItems?: DeckItemRef[];
  }) => void;
  editingDeck?: UserDeck | null;
  userDecks?: UserDeck[];
  soundEnabled?: boolean;
  onOpenAiCustomizer?: () => void;
}

export const CreateDeckModal: React.FC<CreateDeckModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingDeck,
  userDecks,
  soundEnabled = true,
  onOpenAiCustomizer,
}) => {
  useBackButton(isOpen, () => {
    onClose();
  }, 'create_deck_modal');

  const [title, setTitle] = useState(editingDeck?.title || '');
  const [description, setDescription] = useState(editingDeck?.description || '');
  const [type, setType] = useState<DeckType>(editingDeck?.type || 'mixed');
  const [coverIcon, setCoverIcon] = useState(editingDeck?.coverIcon || '📖');
  const [error, setError] = useState('');

  // Content Customization States
  const [contentMode, setContentMode] = useState<ContentSourceMode>('empty');
  const [presetLevel, setPresetLevel] = useState<'all' | 'N5' | 'N4' | 'N3' | 'N2' | 'N1' | 'Kaigo'>('N5');
  const [presetCount, setPresetCount] = useState<number>(10);

  // Manual picker states
  const [manualSearch, setManualSearch] = useState('');
  const [manualCategory, setManualCategory] = useState<'all' | 'kotoba' | 'kanji' | 'bunpou'>('all');
  const [selectedManualKeys, setSelectedManualKeys] = useState<Set<string>>(new Set());

  // Bookmark Deck items for import
  const bookmarkItems = useMemo(() => {
    if (!userDecks) return [];
    const bDeck = userDecks.find(d => d.id === DEFAULT_BOOKMARK_DECK_ID || d.isDefault);
    return bDeck ? bDeck.items : [];
  }, [userDecks]);

  // Reset or initialize when modal opens/changes
  React.useEffect(() => {
    if (editingDeck) {
      setTitle(editingDeck.title);
      setDescription(editingDeck.description || '');
      setType(editingDeck.type || 'mixed');
      setCoverIcon(editingDeck.coverIcon || '📖');
      setContentMode('empty');
    } else {
      setTitle('');
      setDescription('');
      setType('mixed');
      setCoverIcon('📖');
      setContentMode('empty');
      setPresetLevel('N5');
      setPresetCount(10);
      setSelectedManualKeys(new Set());
      setManualSearch('');
    }
    setError('');
  }, [editingDeck, isOpen]);

  // All searchable items for manual mode
  const allManualItems = useMemo(() => {
    if (contentMode !== 'manual') return [];
    const results: { id: string; category: DeckItemCategory; title: string; reading?: string; meaning: string; level: string }[] = [];

    for (const item of Object.values(KOTOBA_DATABASE)) {
      results.push({
        id: item.id,
        category: 'kotoba',
        title: item.word,
        reading: item.reading,
        meaning: item.meaningId || item.meaningEn || '',
        level: item.jlpt || 'N5',
      });
    }

    const seenKanji = new Set<string>();
    for (const item of Object.values(KANJI_DATABASE)) {
      if (item && item.character && !seenKanji.has(item.character)) {
        seenKanji.add(item.character);
        results.push({
          id: item.id || item.character,
          category: 'kanji',
          title: item.character,
          reading: (item.onyomi || []).join('、'),
          meaning: item.meaningId || item.meaningEn || '',
          level: item.jlpt || 'N5',
        });
      }
    }

    for (const item of Object.values(BUNPOU_DATABASE)) {
      results.push({
        id: item.id,
        category: 'bunpou',
        title: item.title,
        reading: item.formula,
        meaning: item.meaningId || '',
        level: item.level || 'N3',
      });
    }

    return results;
  }, [contentMode]);

  // Filtered manual items
  const filteredManualItems = useMemo(() => {
    if (contentMode !== 'manual') return [];
    const q = manualSearch.toLowerCase().trim();

    return allManualItems.filter(item => {
      if (manualCategory !== 'all' && item.category !== manualCategory) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        (item.reading && item.reading.toLowerCase().includes(q)) ||
        item.meaning.toLowerCase().includes(q)
      );
    }).slice(0, 40); // Limit rendered list for fast response
  }, [allManualItems, manualSearch, manualCategory, contentMode]);

  // Calculate estimated items to be created
  const estimatedCount = useMemo(() => {
    if (editingDeck) return 0;
    if (contentMode === 'empty') return 0;
    if (contentMode === 'bookmark') return bookmarkItems.length;
    if (contentMode === 'manual') return selectedManualKeys.size;
    if (contentMode === 'preset') return presetCount;
    return 0;
  }, [editingDeck, contentMode, bookmarkItems.length, selectedManualKeys.size, presetCount]);

  if (!isOpen) return null;

  const handleToggleManualKey = (key: string) => {
    playSound('click', soundEnabled);
    setSelectedManualKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Judul deck wajib diisi');
      return;
    }

    let initialItems: DeckItemRef[] = [];

    if (!editingDeck) {
      if (contentMode === 'preset') {
        initialItems = generatePresetDeckItems({
          type,
          level: presetLevel,
          count: presetCount,
        });
      } else if (contentMode === 'bookmark') {
        const now = new Date().toISOString();
        initialItems = bookmarkItems.map(it => ({ ...it, addedAt: now }));
      } else if (contentMode === 'manual') {
        const now = new Date().toISOString();
        initialItems = Array.from(selectedManualKeys).map(key => {
          const [cat, id] = key.split(':');
          return {
            id,
            category: cat as DeckItemCategory,
            addedAt: now,
          };
        });
      }
    }

    playSound('click', soundEnabled);
    onSave({
      title: trimmed,
      description: description.trim(),
      type,
      coverIcon,
      initialItems: initialItems.length > 0 ? initialItems : undefined,
    });
    onClose();
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] p-3 sm:p-4 bg-surface-ground/80 flex justify-center items-center animate-fade-in">
          {/* Backdrop Click */}
          <div
            className="fixed inset-0 -z-10"
            onClick={() => {
              playSound('click', soundEnabled);
              onClose();
            }}
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            className="w-full max-w-xl border border-border-subtle rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[88vh] bg-surface-card relative"
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-border-subtle flex items-center justify-between bg-surface-inset shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl p-1 rounded-xl bg-surface-card border border-border-subtle">{coverIcon}</span>
                <div>
                  <h3 className="font-heading font-bold text-base sm:text-lg text-text-primary flex items-center gap-2">
                    <span>{editingDeck ? 'Edit Buku Saku' : 'Buat Buku Saku Baru'}</span>
                    {!editingDeck && estimatedCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-gold/15 text-gold border border-border-subtle">
                        +{estimatedCount} materi siap
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-text-secondary">
                    Sesuaikan nama, tipe latihan, dan kustomisasi materi awal
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  playSound('click', soundEnabled);
                  onClose();
                }}
                className="p-1.5 rounded-xl text-text-secondary hover:text-text-primary hover:bg-surface-card transition-colors"
                title="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Scrollable Form Body */}
              <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 min-h-0">
            {/* Title */}
            <div>
              <label className="block text-xs font-bold font-heading uppercase tracking-wider text-text-secondary mb-1">
                Judul Deck <span className="text-wine-accent">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Contoh: Kosakata N3 Bab 1 / Kanji Sulit"
                maxLength={40}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-inset border border-border-subtle focus:border-border-primary focus:outline-none text-sm text-text-primary font-medium"
              />
              {error && <p className="text-xs text-wine-accent font-bold mt-1">{error}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold font-heading uppercase tracking-wider text-text-secondary mb-1">
                Deskripsi / Catatan (Opsional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Catatan target hafalan, minggu belajar, atau materi khusus..."
                rows={2}
                maxLength={120}
                className="w-full px-3.5 py-2 rounded-xl bg-surface-inset border border-border-subtle focus:border-border-primary focus:outline-none text-xs text-text-primary resize-none"
              />
            </div>

            {/* Choose Cover Icon */}
            <div>
              <label className="block text-xs font-bold font-heading uppercase tracking-wider text-text-secondary mb-1.5">
                Pilih Ikon Sampul
              </label>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {AVAILABLE_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => {
                      setCoverIcon(icon);
                      playSound('click', soundEnabled);
                    }}
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl text-base sm:text-lg flex items-center justify-center transition-all border ${
                      coverIcon === icon
                        ? 'bg-surface-elevated border border-border-subtle shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_2px_8px_rgba(0,0,0,0.35)] scale-105'
                        : 'bg-surface-inset border-border-subtle hover:bg-surface-elevated'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Deck Type / Purpose */}
            <div>
              <label className="block text-xs font-bold font-heading uppercase tracking-wider text-text-secondary mb-1.5">
                Fokus / Tipe Deck
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DECK_TYPES.map((dt) => {
                  const isSelected = type === dt.type;
                  return (
                    <button
                      key={dt.type}
                      type="button"
                      onClick={() => {
                        setType(dt.type);
                        playSound('click', soundEnabled);
                      }}
                      className={`p-2.5 rounded-xl text-left border transition-all ${
                        isSelected
                          ? 'bg-surface-elevated border border-border-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_8px_rgba(0,0,0,0.3)]'
                          : 'bg-surface-inset border-border-subtle hover:bg-surface-card'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-heading font-bold ${isSelected ? 'text-gold' : 'text-text-primary'}`}>
                          {dt.label}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-gold" />}
                      </div>
                      <p className="text-[10px] text-text-secondary mt-0.5 leading-snug">
                        {dt.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Deck Content Customization (Only for new deck creation) */}
            {!editingDeck && (
              <div className="pt-3 border-t border-border-subtle space-y-3">
                {onOpenAiCustomizer && (
                  <div className="p-3 rounded-2xl bg-surface-inset border border-border-subtle flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div>
                        <p className="text-xs font-heading font-bold text-text-primary">
                          Buat deck otomatis dari topik?
                        </p>
                        <p className="text-[11px] text-text-secondary">
                          Ketik topik atau pilih tema, deck langsung tersusun dari materi SevnQuest.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        playSound('click', soundEnabled);
                        onOpenAiCustomizer();
                      }}
                      className="btn-physical-primary py-1.5 px-3 rounded-xl text-xs font-bold font-heading shrink-0 cursor-pointer"
                    >
                      Buka Studio AI
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold font-heading uppercase tracking-wider text-text-primary">
                      Kustomisasi Isi Awal Deck
                    </label>
                    <p className="text-[11px] text-text-secondary">
                      Tentukan bagaimana deck ini akan diisi materi
                    </p>
                  </div>
                </div>

                {/* Mode Selector Tabs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-2xl bg-surface-inset border border-border-subtle">
                  {[
                    { id: 'empty', label: '📝 Kosong', sub: 'Mulai Kosong' },
                    { id: 'preset', label: '⚡ Otomatis', sub: 'Preset Level' },
                    { id: 'bookmark', label: '🔖 Bookmark', sub: `${bookmarkItems.length} Materi` },
                    { id: 'manual', label: '🔍 Pilih Sendiri', sub: 'Pilih Manual' },
                  ].map((m) => {
                    const isSelected = contentMode === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setContentMode(m.id as ContentSourceMode);
                          playSound('click', soundEnabled);
                        }}
                        className={`p-2 rounded-xl text-center transition-all ${
                          isSelected
                            ? 'bg-surface-elevated text-text-primary border border-border-primary shadow-sm font-bold'
                            : 'text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        <span className="block text-xs font-heading font-bold leading-none">{m.label}</span>
                        <span className="block text-[10px] text-text-muted mt-1 leading-none">{m.sub}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Mode 1: Preset Generator */}
                {contentMode === 'preset' && (
                  <div className="p-3.5 rounded-2xl bg-surface-inset border border-border-subtle space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-heading font-bold text-text-primary">
                        Pilih Target Level JLPT:
                      </span>
                      <div className="flex items-center gap-1 flex-wrap">
                        {(['all', 'N5', 'N4', 'N3', 'N2', 'N1', 'Kaigo'] as const).map((lvl) => (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => {
                              setPresetLevel(lvl);
                              playSound('click', soundEnabled);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all border ${
                              presetLevel === lvl
                                ? 'bg-surface-elevated text-gold border-border-subtle'
                                : 'bg-surface-card text-text-muted border-border-subtle hover:text-text-secondary'
                            }`}
                          >
                            {lvl === 'all' ? 'Semua' : lvl === 'Kaigo' ? '🩺 Kaigo' : lvl}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-border-subtle/60">
                      <span className="text-xs font-heading font-bold text-text-primary">
                        Jumlah Materi Awal:
                      </span>
                      <div className="flex items-center gap-1.5">
                        {[10, 20, 30, 50].map((count) => (
                          <button
                            key={count}
                            type="button"
                            onClick={() => {
                              setPresetCount(count);
                              playSound('click', soundEnabled);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all border ${
                              presetCount === count
                                ? 'bg-surface-elevated text-text-primary border-border-primary'
                                : 'bg-surface-card text-text-muted border-border-subtle hover:text-text-secondary'
                            }`}
                          >
                            {count} Item
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-surface-card border border-border-subtle text-[11px] text-text-secondary">
                      <span>
                        Sistem akan otomatis mengacak dan mengisi <strong>{presetCount} materi</strong> sesuai tipe{' '}
                        <strong className="text-text-primary">{DECK_TYPES.find(d => d.type === type)?.label}</strong> pada level{' '}
                        <strong className="text-gold">{presetLevel === 'all' ? 'Semua Level' : presetLevel}</strong>.
                      </span>
                    </div>
                  </div>
                )}

                {/* Mode 2: Bookmark Import */}
                {contentMode === 'bookmark' && (
                  <div className="p-3.5 rounded-2xl bg-surface-inset border border-border-subtle space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bookmark className="w-4 h-4 text-gold fill-gold" />
                        <span className="text-xs font-heading font-bold text-text-primary">
                          Impor Buku Saku Bookmark
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold text-gold">
                        {bookmarkItems.length} Materi Tersedia
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary">
                      {bookmarkItems.length > 0
                        ? `Semua ${bookmarkItems.length} materi yang saat ini kamu tandai sebagai favorit di perpustakaan akan langsung disalin ke dalam deck ini.`
                        : 'Buku Saku Bookmark kamu masih kosong. Kamu bisa menandai materi terlebih dahulu di perpustakaan.'}
                    </p>
                  </div>
                )}

                {/* Mode 3: Manual Selection */}
                {contentMode === 'manual' && (
                  <div className="p-3.5 rounded-2xl bg-surface-inset border border-border-subtle space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-heading font-bold text-text-primary">
                        Pilih Materi dari Perpustakaan:
                      </span>
                      <span className="text-xs font-mono font-bold text-gold">
                        {selectedManualKeys.size} Dipilih
                      </span>
                    </div>

                    {/* Search & Category Pills */}
                    <div className="space-y-2">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={manualSearch}
                          onChange={(e) => setManualSearch(e.target.value)}
                          placeholder="Cari kata, kanji, arti..."
                          className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-surface-card border border-border-subtle text-xs text-text-primary"
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-1 pb-1">
                        {[
                          { id: 'all', label: 'Semua' },
                          { id: 'kotoba', label: 'Kosakata' },
                          { id: 'kanji', label: 'Kanji' },
                          { id: 'bunpou', label: 'Tata Bahasa' },
                        ].map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setManualCategory(c.id as any)}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono transition-all border shrink-0 ${
                              manualCategory === c.id
                                ? 'bg-surface-elevated text-text-primary border-border-primary'
                                : 'bg-surface-card text-text-muted border-border-subtle'
                            }`}
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* List */}
                    <div className="max-h-48 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                      {filteredManualItems.map((item) => {
                        const key = `${item.category}:${item.id}`;
                        const isChecked = selectedManualKeys.has(key);

                        return (
                          <div
                            key={key}
                            onClick={() => handleToggleManualKey(key)}
                            className={`p-2 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                              isChecked
                                ? 'bg-surface-elevated border-border-primary'
                                : 'bg-surface-card border-border-subtle hover:border-border-primary/50'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                className="rounded text-gold accent-gold"
                              />
                              <span className="font-bold text-xs font-jp text-text-primary truncate">
                                {item.title}
                              </span>
                              <span className="text-[10px] text-text-muted truncate">
                                {item.meaning}
                              </span>
                            </div>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono border border-border-subtle bg-surface-inset text-text-secondary shrink-0">
                              {item.level}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Mode: Empty */}
                {contentMode === 'empty' && (
                  <div className="p-3.5 rounded-2xl bg-surface-inset border border-border-subtle text-xs text-text-secondary flex items-start gap-2.5">
                    <span className="text-base">📝</span>
                    <div>
                      <p className="font-bold text-text-primary mb-0.5">Deck Kosong (0 Materi Bawaan)</p>
                      <p>Deck akan dibuat dalam keadaan bersih. Kamu bebas menambahkan materi kapan saja lewat tombol <strong>+ Tambah Materi</strong> di dalam deck.</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Fixed Footer Actions */}
          <div className="p-3.5 sm:p-4 border-t border-border-subtle flex items-center justify-end gap-2.5 bg-surface-inset shrink-0">
            <button
              type="button"
              onClick={() => {
                playSound('click', soundEnabled);
                onClose();
              }}
              className="btn-physical-secondary px-4 py-2 rounded-xl text-xs font-bold transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="btn-physical-secondary px-5 py-2.5 rounded-xl text-xs font-heading font-bold transition-all flex items-center gap-2"
            >
              <Check className="w-3.5 h-3.5 text-gold" />
              <span>
                {editingDeck
                  ? 'Simpan Perubahan'
                  : estimatedCount > 0
                  ? `Buat Deck (${estimatedCount} Materi)`
                  : 'Buat Deck Kosong'}
              </span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )}
</AnimatePresence>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
};
