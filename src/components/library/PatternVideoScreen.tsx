import React from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { X, ExternalLink } from 'lucide-react';
import type { ShortVideo } from '../../utils/shortVideo';
import { playSound } from '../../utils/audio';
import { useBackButton } from '../../hooks/useBackButton';

const PLATFORM_LABEL: Record<ShortVideo['platform'], string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram Reels',
  youtube: 'YouTube Shorts',
};

interface PatternVideoScreenProps {
  title: string;
  video: ShortVideo;
  onClose: () => void;
  soundEnabled?: boolean;
}

/** Layar berbentuk ponsel yang memutar video penjelasan dari tautan eksternal. Video tidak disimpan di situs. */
export const PatternVideoScreen: React.FC<PatternVideoScreenProps> = ({ title, video, onClose, soundEnabled = true }) => {
  useBackButton(true, () => {
    onClose();
  }, 'pattern_video_screen');

  if (typeof document === 'undefined') return null;

  const platformLabel = PLATFORM_LABEL[video.platform];

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 select-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="fixed inset-0 bg-black/85"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => {
          onClose();
          playSound('click', soundEnabled);
        }}
      />

      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="relative z-10 flex flex-col items-center gap-3 max-w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full flex items-center justify-between gap-3 text-white">
          <div className="min-w-0">
            <p className="text-[10px] font-mono uppercase tracking-wider text-white/60">{platformLabel}</p>
            <h2 className="text-sm font-bold font-jp truncate">{title}</h2>
          </div>
          <button
            type="button"
            onClick={() => {
              onClose();
              playSound('click', soundEnabled);
            }}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors shrink-0 cursor-pointer"
            aria-label="Tutup video"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Bingkai 9:16 seperti layar ponsel */}
        <div className="relative h-[min(70vh,640px)] aspect-[9/16] max-w-full rounded-[2rem] overflow-hidden bg-black border border-white/15 shadow-2xl">
          <iframe
            src={video.embedUrl}
            title={`Video penjelasan: ${title}`}
            className="absolute inset-0 w-full h-full border-0"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>

        <a
          href={video.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-white/80 hover:text-white transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Buka di {platformLabel}</span>
        </a>
      </motion.div>
    </motion.div>,
    document.body
  );
};
