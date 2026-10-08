import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number | string;
}

/**
 * NIHONGO QUEST — LINE-BASED RPG ICONS
 * Clean, minimalist, open-source style vector line icons designed specifically
 * for fantasy RPG & Japanese washi aesthetics.
 * Built with standard 24x24 viewBox, stroke-width 1.75, and round joins.
 */

// 1. Classic Heater Shield (Perisai Ksatria Garis Klasik)
export const RpgShieldIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    width={size}
    height={size}
    className={className}
    {...props}
  >
    <path d="M12 2L4 5v6c0 5.5 3.5 10 8 11 4.5-1 8-5.5 8-11V5l-8-3z" />
    <path d="M12 6v12" />
    <path d="M7 10h10" />
  </svg>
);

// 2. Crossed Blades (Pedang Bersilang Petualang)
export const RpgSwordsIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    width={size}
    height={size}
    className={className}
    {...props}
  >
    {/* Blade 1: Top-left to bottom-right */}
    <path d="M19 5L8.5 15.5" />
    <path d="M16 3l5 5" />
    <path d="M7 14l3 3" />
    <path d="M6 18l-3 3" />
    <path d="M7 21l-4-4" />

    {/* Blade 2: Top-right to bottom-left */}
    <path d="M5 5l10.5 10.5" />
    <path d="M8 3L3 8" />
    <path d="M17 14l-3 3" />
    <path d="M18 18l3 3" />
    <path d="M17 21l4-4" />
  </svg>
);

// 3. Ancient Scroll / Makimono (Gulungan Perkamen / Tata Bahasa)
export const RpgScrollIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    width={size}
    height={size}
    className={className}
    {...props}
  >
    <path d="M19 4H8a3 3 0 0 0-3 3v11a2 2 0 0 0 2 2h11a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3z" />
    <path d="M5 7a3 3 0 0 1 3-3h11" />
    <path d="M5 7v11a2 2 0 0 0 2 2" />
    <line x1="9" y1="9" x2="16" y2="9" />
    <line x1="9" y1="13" x2="14" y2="13" />
  </svg>
);

// 4. Leather-bound Grimoire (Buku Kosakata Bersampul Kulit)
export const RpgBookIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    width={size}
    height={size}
    className={className}
    {...props}
  >
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5z" />
    <line x1="6" y1="6" x2="16" y2="6" />
    <line x1="6" y1="10" x2="16" y2="10" />
    <line x1="6" y1="14" x2="12" y2="14" />
    <path d="M16 2v7l-2.5-1.5L11 9V2" />
  </svg>
);

// 5. Calligraphy Fude Brush (Kuas Kaligrafi Kanji Tinta Hitam)
export const RpgBrushIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    width={size}
    height={size}
    className={className}
    {...props}
  >
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L11 16l-5 1 1-5L18.5 2.5z" />
    <path d="M6 17c-2 1-3.5 3-3.5 4.5 0 .5.5.5 1 .5 1.5 0 3-1.5 4-3.5" />
    <line x1="14.5" y1="6.5" x2="17.5" y2="9.5" />
  </svg>
);

// 6. Archery Target (Papan Sasaran Panah / Simulasi Tryout)
export const RpgTargetIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    width={size}
    height={size}
    className={className}
    {...props}
  >
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1.5" />
    <line x1="12" y1="3" x2="12" y2="5" />
    <line x1="12" y1="19" x2="12" y2="21" />
    <line x1="3" y1="12" x2="5" y2="12" />
    <line x1="19" y1="12" x2="21" y2="12" />
  </svg>
);

// 7. Campfire Flame (Api Unggun Petualang / Streak Belajar)
export const RpgFlameIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    width={size}
    height={size}
    className={className}
    {...props}
  >
    <path d="M12 2c1 3 4 5 4 9a6 6 0 1 1-12 0c0-3 2-5 3.5-7 1.5 2 2.5 3 2.5 4.5 0 1.5 1 2.5 2 2.5s2-1 2-2.5c0-2-1-4.5-2-6.5z" />
  </svg>
);

// 8. Antique Hourglass (Jam Pasir / Jam Terbang)
export const RpgHourglassIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    width={size}
    height={size}
    className={className}
    {...props}
  >
    <path d="M5 2h14" />
    <path d="M5 22h14" />
    <path d="M6 2v4a6 6 0 0 0 3 5.2L12 13l3-1.8A6 6 0 0 0 18 6V2" />
    <path d="M6 22v-4a6 6 0 0 1 3-5.2L12 11l3 1.8a6 6 0 0 1 3 5.2v4" />
    <line x1="10" y1="17" x2="14" y2="17" />
  </svg>
);

// 9. Compass Rose (Kompas Petualang / Target JLPT)
export const RpgCompassIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    width={size}
    height={size}
    className={className}
    {...props}
  >
    <circle cx="12" cy="12" r="9" />
    <polygon points="12 6 15 12 12 18 9 12" />
    <line x1="12" y1="3" x2="12" y2="5" />
    <line x1="12" y1="19" x2="12" y2="21" />
    <line x1="3" y1="12" x2="5" y2="12" />
    <line x1="19" y1="12" x2="21" y2="12" />
  </svg>
);

// 10. Torii Gate (Gerbang Kuil Jepang / Peta Belajar JLPT)
export const RpgToriiIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    width={size}
    height={size}
    className={className}
    {...props}
  >
    <path d="M2 5c4.5-1.5 15.5-1.5 20 0" />
    <path d="M4 8h16" />
    <path d="M7 5v14" />
    <path d="M17 5v14" />
    <path d="M10 8v3" />
    <path d="M14 8v3" />
    <path d="M5 19h4" />
    <path d="M15 19h4" />
  </svg>
);

// 11. Antique Crown (Mahkota Juara 1)
export const RpgCrownIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    width={size}
    height={size}
    className={className}
    {...props}
  >
    <path d="M4 18h16l-2-11-4.5 5L12 4l-1.5 8L6 7z" />
    <line x1="4" y1="20" x2="20" y2="20" />
    <circle cx="12" cy="4" r="1" />
    <circle cx="6" cy="7" r="1" />
    <circle cx="18" cy="7" r="1" />
  </svg>
);

// 12. Engraved Medallion (Medali Peringkat)
export const RpgMedalIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    width={size}
    height={size}
    className={className}
    {...props}
  >
    <circle cx="12" cy="14" r="6" />
    <path d="M8.5 8.5L6 3h12l-2.5 5.5" />
    <path d="M12 11v6" />
    <path d="M9.5 14h5" />
  </svg>
);

// 13. Adventurer Crest / Mon (Lencana Lambang Petualang)
export const RpgEmblemIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    width={size}
    height={size}
    className={className}
    {...props}
  >
    <rect x="3" y="3" width="18" height="18" rx="4" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1.5" />
  </svg>
);

// 14. Rune Spark (Rune Kilat / Kuis & Latihan Soal)
export const RpgRuneIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    width={size}
    height={size}
    className={className}
    {...props}
  >
    <path d="M13 2L4 13h7l-1 9 10-12h-7l1-8z" />
  </svg>
);

// 15. Boss Helmet (Helm Bertanduk / Duel Boss)
export const RpgBossIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    width={size}
    height={size}
    className={className}
    {...props}
  >
    <path d="M5 4l3 5c2-1 6-1 8 0l3-5c-1 3-1 6-2 7 2 2 3 5 3 6H4c0-1 1-4 3-6-1-1-1-4-2-7z" />
    <line x1="8" y1="15" x2="16" y2="15" />
    <circle cx="9.5" cy="12.5" r="1" />
    <circle cx="14.5" cy="12.5" r="1" />
  </svg>
);

// 16. Antique Padlock (Gembok Kuno Terkunci)
export const RpgLockIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    width={size}
    height={size}
    className={className}
    {...props}
  >
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    <circle cx="12" cy="16" r="1" />
  </svg>
);

// 17. Hand-drawn Check (Centang Kuas Selesai)
export const RpgCheckIcon: React.FC<IconProps> = ({ className = 'w-4 h-4', size, ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    width={size}
    height={size}
    className={className}
    {...props}
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
