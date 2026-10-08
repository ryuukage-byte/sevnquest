import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, ChevronRight, ChevronLeft, Compass, Languages, BookOpen, Repeat, Flame, Sprout, Library, Map as MapIcon,
} from 'lucide-react';
import { playSound } from '../../utils/audio';

export type GuidePath = 'foundation' | 'library' | 'world';

interface StartGuideModalProps {
  isOpen: boolean;
  soundEnabled?: boolean;
  /** Dipanggil saat panduan ditutup atau selesai (tandai sudah dilihat). */
  onClose: () => void;
  /** Dipanggil saat user memilih jalur di langkah terakhir. */
  onPickPath: (path: GuidePath) => void;
}

type Icon = React.ComponentType<{ className?: string }>;

interface Slide {
  id: string;
  label: string;
  title: string;
  body: string;
  icon: Icon;
  points?: { icon: Icon; title: string; text: string }[];
}

const SLIDES: Slide[] = [
  {
    id: 'what',
    label: 'KENALAN',
    title: 'SevnQuest itu apa?',
    body: 'Tempat belajar bahasa Jepang yang dibuat seperti petualangan: dari huruf kana sampai level N1. Kamu belajar materi, langsung berlatih, lalu progresmu dicatat dan diulang pada waktu yang tepat supaya benar-benar menempel.',
    icon: Compass,
  },
  {
    id: 'content',
    label: 'ISI MATERI',
    title: 'Apa yang dipelajari?',
    body: 'Tiga pilar utama. Semuanya saling menopang: kata butuh kanji, kalimat butuh pola.',
    icon: Languages,
    points: [
      { icon: BookOpen, title: 'Kotoba', text: 'Kosakata: arti, bacaan, dan contoh pemakaian.' },
      { icon: Languages, title: 'Kanji', text: 'Bentuk, bacaan, dan cara menulisnya.' },
      { icon: Library, title: 'Pola Kalimat', text: 'Tata bahasa (Bunpou) untuk menyusun kalimat sendiri.' },
    ],
  },
  {
    id: 'loop',
    label: 'SISTEM BELAJAR',
    title: 'Cara kerjanya',
    body: 'EXP bukan sekadar hadiah klik. Ia mengikuti seberapa dalam kamu menguasai sesuatu.',
    icon: Repeat,
    points: [
      { icon: BookOpen, title: '1. Belajar', text: 'Baca materi di Buku Saku atau Library.' },
      { icon: Flame, title: '2. Latihan', text: 'Jawab soal. Salah pun dicatat, jadi tahu titik lemahmu.' },
      { icon: Repeat, title: '3. Mastery', text: 'Item yang sering benar naik penguasaannya; yang lemah diulang di Recall.' },
      { icon: Compass, title: '4. EXP & Progression', text: 'EXP menaikkan level dan tier belajarmu.' },
    ],
  },
  {
    id: 'start',
    label: 'MULAI DARI MANA',
    title: 'Jalur untuk pemula',
    body: 'Belum bisa membaca kana? Mulai dari Foundation: Hiragana, lalu Katakana, baru masuk N5. Kalau sudah, kamu bebas memilih jalurnya.',
    icon: Sprout,
    points: [
      { icon: Sprout, title: 'Belum tahu apa-apa', text: 'Buku Kana Dojo → Hiragana → Katakana → N5.' },
      { icon: Library, title: 'Sudah bisa kana', text: 'Library untuk Kotoba, Kanji, dan Pola Kalimat sesuai levelmu.' },
    ],
  },
  {
    id: 'next',
    label: 'SETELAH ITU',
    title: 'Selesai satu materi, lalu?',
    body: 'Kamu tidak perlu menebak. Beranda akan selalu menunjukkan satu langkah berikutnya: Recall bila ada yang perlu diulang, titik lemah bila terdeteksi, atau lanjut belajar dari Buku Saku. Misi Harian membantu menjaga ritme.',
    icon: BookOpen,
  },
];

export const StartGuideModal: React.FC<StartGuideModalProps> = ({
  isOpen, soundEnabled = true, onClose, onPickPath,
}) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (isOpen) setIndex(0);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const slide = SLIDES[index];
  const Icon = slide.icon;
  const isLast = index === SLIDES.length - 1;

  const go = (next: number) => {
    playSound('click', soundEnabled);
    setIndex(next);
  };

  const pick = (path: GuidePath) => {
    playSound('click', soundEnabled);
    onPickPath(path);
  };

  return (
    <div
      className="fixed inset-0 z-[9980] flex items-center justify-center p-4 bg-slate-950/85"
      role="dialog"
      aria-modal="true"
      aria-label="Panduan SevnQuest"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md panel panel-stitched p-5 sm:p-6 space-y-4 max-h-[92dvh] overflow-y-auto"
      >
        <div className="flex items-center justify-between">
          <span className="breadcrumb-label text-gold-soft">
            {slide.label} · {index + 1}/{SLIDES.length}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary transition-colors"
            title="Tutup"
            aria-label="Tutup panduan"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.15 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 ui-icon-box rounded-xl text-gold shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold font-heading text-text-primary">{slide.title}</h3>
            </div>

            <p className="text-sm text-text-secondary leading-relaxed font-body">{slide.body}</p>

            {slide.points && (
              <ul className="space-y-2">
                {slide.points.map(p => {
                  const PIcon = p.icon;
                  return (
                    <li
                      key={p.title}
                      className="flex items-start gap-3 p-3 rounded-2xl bg-surface-inset border border-border-subtle shadow-inner"
                    >
                      <PIcon className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-sm font-bold font-heading text-text-primary">{p.title}</p>
                        <p className="text-xs text-text-secondary leading-relaxed">{p.text}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {isLast && (
              <div className="space-y-2 pt-1">
                <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-text-secondary">
                  Pilih jalurmu
                </p>
                <button type="button" onClick={() => pick('foundation')} className="btn-physical-primary w-full py-3 px-4 text-sm font-bold font-heading flex items-center justify-between">
                  <span className="flex items-center gap-2"><Sprout className="w-4 h-4" /> Mulai dari Buku Hiragana</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => pick('library')} className="btn-physical-secondary w-full py-3 px-4 text-sm font-bold font-heading flex items-center justify-between">
                  <span className="flex items-center gap-2"><Library className="w-4 h-4" /> Buka Kotoba, Kanji & Pola Kalimat</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => pick('world')} className="btn-physical-secondary w-full py-3 px-4 text-sm font-bold font-heading flex items-center justify-between">
                  <span className="flex items-center gap-2"><MapIcon className="w-4 h-4" /> Jelajahi World</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
          <div className="flex items-center gap-1.5">
            {SLIDES.map((s, i) => (
              <span
                key={s.id}
                className={`h-1.5 rounded-full transition-all ${i === index ? 'w-5 bg-gold' : 'w-1.5 bg-border-subtle'}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {index > 0 && (
              <button type="button" onClick={() => go(index - 1)} className="btn-physical-secondary p-2 rounded-xl" aria-label="Kembali">
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            {!isLast && (
              <button type="button" onClick={() => go(index + 1)} className="btn-physical-primary py-2 px-4 text-xs font-bold font-heading flex items-center gap-1.5">
                <span>Lanjut</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
