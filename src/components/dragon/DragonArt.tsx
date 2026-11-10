import React, { useId } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { dragonMotion, loop, pivot } from './dragonMotion';
import type { DragonSpriteProps } from './DragonSprite';
import { ART_TIER_LOOKS } from '../../data/dragon/skins';
import tatsuImg from '../../assets/dragon/tatsu.webp';

/**
 * Naga gaya 'image': ilustrasi jadi milik pemilik (tatsu.webp) dipakai apa adanya.
 *
 * Gambarnya satu lapis, jadi yang dianimasikan adalah seluruh badan (naik-turun, miring, lompat, membesar)
 * memakai gerak `root` yang sama dengan gaya lain; kedip, mulut, dan kepak sayap tidak tersedia.
 * Badan navy nyaris menyatu dengan latar navy aplikasi, karena itu gambar diberi tepi cahaya tipis.
 * Tier dibedakan lewat rona badan, warna tepi, aura, dan halo (ART_TIER_LOOKS).
 */
export const DragonArt: React.FC<DragonSpriteProps> = ({ tier, mood = 'idle', size = 96, className, still }) => {
  const uid = useId().replace(/:/g, '');
  const reduce = useReducedMotion();
  const animated = !still && !reduce;
  const { root } = dragonMotion(mood, animated);
  const t = tier.index;
  const look = ART_TIER_LOOKS[Math.min(Math.max(t, 0), ART_TIER_LOOKS.length - 1)];
  const showAura = t >= 4 || mood === 'evolving';
  const auraGrad = `da-aura-${uid}`;

  // Tepi cahaya: dua lapis drop-shadow rapat (garis tepi) + rona tier.
  const rim = `drop-shadow(0 0 0.6px ${look.accent}) drop-shadow(0 0 1.6px ${look.accent}99)`;
  const filter = `${look.filter} ${rim}`.trim();
  // Berpikir: kepala sedikit miring (seluruh badan, karena gambarnya satu lapis).
  const tilt = mood === 'thinking' ? (animated ? { rotate: [-5, -3, -5], transition: loop(2) } : { rotate: -4 }) : {};

  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className={className} role="img" aria-label={`Naga ${tier.name}`} style={{ overflow: 'visible' }}>
      <defs>
        <radialGradient id={auraGrad} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={look.accent} stopOpacity={0.45} />
          <stop offset="100%" stopColor={look.accent} stopOpacity={0} />
        </radialGradient>
      </defs>

      {showAura && (
        <motion.circle
          cx={60} cy={66} r={58} fill={`url(#${auraGrad})`}
          animate={animated ? { opacity: mood === 'evolving' ? [0.6, 1, 0.6] : [0.45, 0.8, 0.45] } : { opacity: 0.65 }}
          transition={loop(mood === 'evolving' ? 0.9 : 3.5)}
        />
      )}
      {mood === 'evolving' && animated && (
        <motion.circle
          cx={60} cy={66} fill="none" stroke={look.accent} strokeWidth={2.5}
          initial={{ r: 20, opacity: 0.9 }}
          animate={{ r: [20, 60], opacity: [0.9, 0] }}
          transition={{ duration: 1.3, repeat: Infinity, ease: 'easeOut' }}
        />
      )}

      <ellipse cx={60} cy={115} rx={27} ry={4} fill="#000" opacity={0.28} />

      <motion.g animate={root} style={pivot(60, 114)}>
        <motion.g animate={tilt} style={pivot(60, 114)}>
          <image href={tatsuImg} x={2} y={0} width={116} height={116} preserveAspectRatio="xMidYMax meet" style={{ filter }} />
        </motion.g>

        {/* Halo emas (Celestial) */}
        {t >= 6 && (
          <motion.ellipse
            cx={62} cy={3} rx={17} ry={4} fill="none" stroke={look.accent} strokeWidth={2.6}
            animate={animated ? { y: [0, -2, 0] } : {}}
            transition={loop(2.6)}
          />
        )}
      </motion.g>

      {/* Titik berpikir */}
      {mood === 'thinking' && (
        <g>
          {[0, 1, 2].map(i => (
            <motion.circle
              key={i}
              cx={98 + i * 7} cy={22 - i * 6} r={2.4 + i * 0.6}
              fill="#e6e0d8" stroke="#0e1226" strokeWidth={1}
              animate={animated ? { opacity: [0.2, 1, 0.2] } : { opacity: 1 }}
              transition={loop(1.2, { delay: i * 0.2 })}
            />
          ))}
        </g>
      )}

      {/* Bicara: garis suara kecil di samping mulut */}
      {mood === 'talking' && (
        <g fill="none" stroke="#e6e0d8" strokeWidth={1.8} strokeLinecap="round">
          {[0, 1].map(i => (
            <motion.path
              key={i}
              d={i === 0 ? 'M97 44 q4 4 0 9' : 'M103 40 q7 8 0 17'}
              animate={animated ? { opacity: [0.15, 1, 0.15] } : { opacity: 0.9 }}
              transition={loop(0.7, { delay: i * 0.18 })}
            />
          ))}
        </g>
      )}
    </svg>
  );
};

interface DragonArtEggProps {
  size?: number;
  cracks?: number;
  wobble?: boolean;
}

/** Telur Tatsu: navy dengan sabetan perak seperti corak di badannya. */
export const DragonArtEgg: React.FC<DragonArtEggProps> = ({ size = 96, cracks = 0, wobble = true }) => {
  const uid = useId().replace(/:/g, '');
  const reduce = useReducedMotion();
  const fast = cracks > 0;
  const EGG = 'M60 14 C82 14 96 50 96 74 C96 96 80 110 60 110 C40 110 24 96 24 74 C24 50 38 14 60 14 Z';
  const body = `de-body-${uid}`;
  const silver = `de-silver-${uid}`;
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label="Telur naga" style={{ overflow: 'visible' }}>
      <defs>
        <radialGradient id={body} cx="38%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#2f3a68" />
          <stop offset="60%" stopColor="#1e2647" />
          <stop offset="100%" stopColor="#12162e" />
        </radialGradient>
        <linearGradient id={silver} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f4f2ee" />
          <stop offset="100%" stopColor="#a9acb5" />
        </linearGradient>
      </defs>
      <ellipse cx={60} cy={113} rx={24} ry={4} fill="#000" opacity={0.28} />
      <motion.g
        style={{ ...pivot(60, 110), filter: 'drop-shadow(0 0 0.6px #c9d2e6) drop-shadow(0 0 1.6px #c9d2e699)' }}
        animate={wobble && !reduce ? { rotate: fast ? [0, -9, 9, -6, 0] : [0, -4, 4, 0] } : {}}
        transition={{ duration: fast ? 0.5 : 1.2, repeat: Infinity, repeatDelay: fast ? 0.4 : 1.8 }}
      >
        <path d={EGG} fill={`url(#${body})`} stroke="#0e1226" strokeWidth={2} />
        {/* Sabetan perak */}
        <path d="M52 26 C62 34 68 46 66 60 C60 50 54 42 46 38 C50 35 52 31 52 26 Z" fill={`url(#${silver})`} />
        <path d="M34 72 C44 70 54 74 60 84 C50 80 42 80 34 84 C36 80 36 76 34 72 Z" fill={`url(#${silver})`} />
        <path d="M86 70 C80 78 72 82 62 100 C74 96 82 90 88 80 C86 77 86 73 86 70 Z" fill={`url(#${silver})`} opacity={0.9} />
        <path d="M43 30 Q47 23 54 20" stroke="#ffffff" strokeOpacity={0.45} strokeWidth={2.4} strokeLinecap="round" fill="none" />
        {cracks >= 1 && <path d="M60 38 L55 47 L62 53 L57 62" fill="none" stroke="#f4f2ee" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />}
        {cracks >= 2 && <path d="M62 53 L72 57 L76 66" fill="none" stroke="#f4f2ee" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />}
        {cracks >= 3 && <path d="M29 66 L39 61 L45 69 L54 63 L61 71 L71 65 L79 71 L91 65" fill="none" stroke="#f4f2ee" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />}
      </motion.g>
    </svg>
  );
};
