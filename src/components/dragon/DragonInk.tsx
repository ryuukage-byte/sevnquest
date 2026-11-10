import React, { useId } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { dragonMotion, loop, pivot } from './dragonMotion';
import type { DragonSpriteProps } from './DragonSprite';
import { INK_TIER_TONES } from '../../data/dragon/skins';

/**
 * Naga gaya "Tinta Sumi": ilustrasi tinta di atas kertas washi, senada dengan ikon ukiran SevnQuest.
 *
 * Bukan sekadar bentuk berwarna: garis kuas bertebal-tipis (sisi bayangan lebih tebal), lapisan tinta
 * yang meresap (wash), arsiran ukiran di sisi gelap, serat kertas, dan detail anatomi (alis, sisik, cakar,
 * taring, sirip, jambul ekor, tali kalung + lonceng). Warna tinta mengikuti tier (INK_TIER_TONES).
 * Struktur grup & titik putar sama dengan gaya dasar, jadi semua animasi mood berlaku.
 */

const INK = '#1c1a17';
const PAPER = '#efe6d2';
const PAPER_LIGHT = '#f8f2e4';
const HANKO = '#a82025';
const GOLD = '#d9a54a';
const MOUTH = '#5a1a1a';

// --------------------------------------------------------------------------- bentuk dasar
const BODY = 'M60 61 C76 61 86 74 87.5 88 C89 103 77 110.5 60 110.5 C43 110.5 31 103 32.5 88 C34 74 44 61 60 61 Z';
const BELLY = 'M60 70 C70.5 70 76.5 80 76.5 91.5 C76.5 102 69.5 107.5 60 107.5 C50.5 107.5 43.5 102 43.5 91.5 C43.5 80 49.5 70 60 70 Z';
const HEAD = 'M60 16.5 C78.5 16.5 90.5 27.5 90.5 42 C90.5 56.5 77.5 66.5 60 66.5 C42.5 66.5 29.5 56.5 29.5 42 C29.5 27.5 41.5 16.5 60 16.5 Z';
const MUZZLE = 'M43.5 53.5 C44 48 51.5 46 60 46 C68.5 46 76 48 76.5 53.5 C76.5 59.5 69 62.8 60 62.8 C51 62.8 43.5 59.5 43.5 53.5 Z';
const WING = 'M41 70 C34 58 23 50 9.5 49.5 C12.5 54 12.5 59 9.5 63.5 C15.5 62.5 19.5 65.5 19.5 70.5 C24.5 68.5 28.5 70.5 30.5 75.5 C33.5 73.5 37 75.5 38.5 80 Z';
const TAIL = 'M78 99 C90 106 104 101 105 88 C105.5 80 100 75.5 95.5 78.5 C100 80.5 100.5 86 98 90.5 C94.5 96.5 86.5 97.5 80 93.5 Z';
const TUFT = 'M95.5 78.5 C92 72 95 65 101.5 62.5 C100 67 102.5 70 107 70.5 C104 73.5 100.5 76 95.5 78.5 Z';
const FOOT = 'M36.5 107.5 C36 102 42 99.5 48.5 100.5 C54 101.5 56.5 105 55 108.5 C52.5 112 40 112.5 36.5 107.5 Z';
const ARM = 'M43 78 C36.5 79.5 32.5 86 34 91.5 C35 95 39.5 95.5 41.5 92.5 C42.5 88 44.5 84 46 81 Z';
const FIN = 'M32.5 37 C25 31 18.5 30 13.5 31.5 C18 33.5 19 36.5 17 40 C21.5 39 24.5 40.5 25 44.5 C27.5 42.5 30 42.5 31.5 44 Z';
const SHELL = 'M42.5 23.5 L46.5 15 L50.5 20.5 L55 12 L60 19.5 L65 12 L69.5 20.5 L73.5 15 L77.5 23.5 Q60 30.5 42.5 23.5 Z';
const MIRROR = 'translate(120 0) scale(-1 1)';

/**
 * Goresan kuas: garis tipis sepanjang jalur + bagian tengah lebih tebal, sehingga ujungnya meruncing.
 * (pathLength=100 membuat pola dash tidak bergantung pada panjang jalur sebenarnya.)
 */
const Brush: React.FC<{ d: string; w?: number; color?: string; opacity?: number }> = ({ d, w = 1.3, color = INK, opacity = 1 }) => (
  <g opacity={opacity} fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} strokeWidth={w} />
    <path d={d} pathLength={100} strokeWidth={w * 2} strokeDasharray="0 22 56 22" />
  </g>
);

export const DragonInk: React.FC<DragonSpriteProps> = ({ tier, mood = 'idle', size = 96, className, still }) => {
  const uid = useId().replace(/:/g, '');
  const reduce = useReducedMotion();
  const animated = !still && !reduce;
  const { root, head, wing, wingR, tail, arm, blink, happyEyes } = dragonMotion(mood, animated);
  const t = tier.index;
  const tone = INK_TIER_TONES[Math.min(Math.max(t, 0), INK_TIER_TONES.length - 1)];
  const showAura = t >= 4 || mood === 'evolving';

  const id = (k: string) => `ik-${k}-${uid}`;
  const url = (k: string) => `url(#${id(k)})`;

  // Tanduk: makin panjang di tier tinggi; cincin ruas di pangkal.
  const hornLen = 7 + 15 * tier.horn;
  const tipX = 40 - hornLen * 0.45;
  const tipY = 25 - hornLen;
  const Horn = (
    <g>
      <path
        d={`M41 28 Q${tipX - 1} ${tipY + hornLen * 0.55} ${tipX} ${tipY} Q${tipX + 7} ${tipY + hornLen * 0.5} 51 23 Z`}
        fill={tone.horn}
        stroke={INK}
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
      <path d={`M${tipX + 1.2} ${tipY + 3} Q${tipX + 1.5} ${tipY + hornLen * 0.5} 44 26`} fill="none" stroke={PAPER} strokeOpacity={0.55} strokeWidth={0.9} strokeLinecap="round" />
      <path d="M42.6 25.4 L47.4 23.9 M41.6 22.2 L45.6 20.9" stroke={PAPER} strokeOpacity={0.5} strokeWidth={0.8} strokeLinecap="round" />
    </g>
  );

  const Eye = (cx: number) => (
    <g>
      <ellipse cx={cx} cy={38.5} rx={7.3} ry={8.3} fill="#fffdf7" stroke={INK} strokeWidth={1.1} />
      <circle cx={cx + 1} cy={39.5} r={5} fill={tone.iris} />
      <circle cx={cx + 1} cy={40} r={2.5} fill={INK} />
      <circle cx={cx + 3} cy={36.6} r={1.7} fill="#ffffff" />
      <circle cx={cx - 1} cy={42} r={0.8} fill="#ffffff" opacity={0.9} />
    </g>
  );
  // Kelopak atas tebal + kibasan bulu mata ke luar (kiri); kanan dicerminkan.
  const LidL = <Brush d="M39.5 36 C41 30.5 46 29 50 30 C52.5 30.7 54 32.5 54.8 34.5" w={1.3} />;
  const LashL = <path d="M39.8 35.6 L36.8 33.8" stroke={INK} strokeWidth={1.1} strokeLinecap="round" />;

  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className={className} role="img" aria-label={`Naga ${tier.name}`} style={{ overflow: 'visible' }}>
      <defs>
        {/* Serat kertas washi + garis tinta sedikit bergetar */}
        <filter id={id('paper')} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="7" result="wob" />
          <feDisplacementMap in="SourceGraphic" in2="wob" scale="1.3" xChannelSelector="R" yChannelSelector="G" result="ink" />
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="3" result="grain" />
          <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0.11  0 0 0 0 0.1  0 0 0 0 0.09  0 0 0 0.16 0" result="grainInk" />
          <feComposite in="grainInk" in2="ink" operator="in" result="grainOnShape" />
          <feMerge>
            <feMergeNode in="ink" />
            <feMergeNode in="grainOnShape" />
          </feMerge>
        </filter>
        {/* Tinta meresap: tepi lapisan bayangan melembut */}
        <filter id={id('bleed')} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
        <clipPath id={id('body')}><path d={BODY} /></clipPath>
        <clipPath id={id('head')}><path d={HEAD} /></clipPath>
        <clipPath id={id('wing')}><path d={WING} /></clipPath>
        <radialGradient id={id('aura')} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={tone.accent} stopOpacity={0.4} />
          <stop offset="100%" stopColor={tone.accent} stopOpacity={0} />
        </radialGradient>
        <linearGradient id={id('wingwash')} x1="1" y1="0" x2="0" y2="0.6">
          <stop offset="0%" stopColor={tone.wash} stopOpacity={0.55} />
          <stop offset="100%" stopColor={tone.wash} stopOpacity={0.12} />
        </linearGradient>
      </defs>

      {/* Aura tinta (Elder ke atas, dan saat evolusi) */}
      {showAura && (
        <motion.circle
          cx={60} cy={68} r={56} fill={url('aura')}
          animate={animated ? { opacity: mood === 'evolving' ? [0.6, 1, 0.6] : [0.45, 0.75, 0.45] } : { opacity: 0.6 }}
          transition={loop(mood === 'evolving' ? 0.9 : 3.5)}
        />
      )}
      {mood === 'evolving' && animated && (
        <motion.circle
          cx={60} cy={68} fill="none" stroke={tone.accent} strokeWidth={2.4} strokeDasharray="160 30"
          initial={{ r: 20, opacity: 0.9 }}
          animate={{ r: [20, 60], opacity: [0.9, 0] }}
          transition={{ duration: 1.3, repeat: Infinity, ease: 'easeOut' }}
        />
      )}

      {/* Bayangan tinta di tanah */}
      <ellipse cx={60} cy={114} rx={28} ry={4.5} fill={INK} opacity={0.22} filter={url('bleed')} />

      <motion.g animate={root} style={pivot(60, 112)} filter={url('paper')}>
        {/* ---------------------------------------------------------------- Ekor */}
        <motion.g animate={tail} style={pivot(82, 98)}>
          <path d={TAIL} fill={PAPER} stroke={INK} strokeWidth={1.3} strokeLinejoin="round" />
          <Brush d="M80 97 C91 102 101 97 103 88" w={1.4} color={tone.wash} opacity={0.6} />
          <path d="M89.5 97 L91.8 92.6 L93.6 97 Z M96.2 92.6 L99.4 89.3 L99.8 93.8 Z" fill={tone.horn} stroke={INK} strokeWidth={0.7} strokeLinejoin="round" />
          <path d={TUFT} fill={tone.wash} fillOpacity={0.9} stroke={INK} strokeWidth={0.9} strokeLinejoin="round" />
          <Brush d="M97 76.5 C97 71 99 67 102.5 64.5 M99.5 75.5 C101.5 73 103.5 72 106 71.5" w={0.6} color={PAPER} opacity={0.6} />
        </motion.g>

        {/* ---------------------------------------------------------------- Sayap */}
        {[false, true].map(right => (
          <g key={right ? 'r' : 'l'} transform={right ? MIRROR : undefined}>
            <motion.g animate={right ? wingR : wing} style={pivot(40, 70)}>
              <g transform={`translate(40 70) scale(${tier.wing}) translate(-40 -70)`}>
                <path d={WING} fill={PAPER} />
                <path d={WING} fill={url('wingwash')} />
                <g clipPath={url('wing')}>
                  <path d="M14 60 L36 70 M18 66 L35 73 M24 71 L34 76" stroke={INK} strokeOpacity={0.25} strokeWidth={0.6} />
                </g>
                <path d={WING} fill="none" stroke={INK} strokeWidth={1.2} strokeLinejoin="round" />
                <Brush d="M41 70 C34 58 23 50 9.5 49.5" w={1.5} />
                <path d="M39 68 L12 62 M38 72.5 L20 70.5 M37.5 76 L30.5 75.5" stroke={INK} strokeWidth={0.8} strokeLinecap="round" opacity={0.85} />
              </g>
            </motion.g>
          </g>
        ))}

        {/* ---------------------------------------------------------------- Badan */}
        <path d={BODY} fill={PAPER} />
        <g clipPath={url('body')}>
          <ellipse cx={80} cy={97} rx={15} ry={17} fill={tone.wash} opacity={0.2} filter={url('bleed')} />
          <ellipse cx={60} cy={65} rx={20} ry={5.5} fill={INK} opacity={0.18} filter={url('bleed')} />
          {[71, 74.5, 78, 81.5, 85].map(x => (
            <path key={x} d={`M${x} 84 L${x + 6} 109`} stroke={INK} strokeOpacity={0.2} strokeWidth={0.6} />
          ))}
        </g>
        <path d={BELLY} fill={PAPER_LIGHT} stroke={INK} strokeWidth={0.9} strokeOpacity={0.7} />
        {/* Ruas perut: goresan kuas meruncing */}
        <Brush d="M47.5 80 Q60 84 72.5 80" w={0.8} opacity={0.6} />
        <Brush d="M45 88.5 Q60 93 75 88.5" w={0.8} opacity={0.6} />
        <Brush d="M44.5 97 Q60 101.5 75.5 97" w={0.8} opacity={0.6} />
        <Brush d="M47.5 104 Q60 107 72.5 104" w={0.7} opacity={0.5} />
        <path d={BODY} fill="none" stroke={INK} strokeWidth={1.4} />
        {/* Garis berat di sisi bayangan */}
        <Brush d="M87.5 88 C89 103 77 110.5 60 110.5 C50 110.5 42 108 37.5 103" w={1.5} />

        {/* Tali kalung merah + lonceng emas */}
        <path d="M43.5 66.5 Q60 74.5 76.5 66.5" fill="none" stroke={INK} strokeWidth={3.6} strokeLinecap="round" opacity={0.35} />
        <path d="M43.5 66.5 Q60 74.5 76.5 66.5" fill="none" stroke={HANKO} strokeWidth={2.4} strokeLinecap="round" />
        <path d="M58.6 72.6 L57.2 78 M61.4 72.6 L62.8 78" stroke={HANKO} strokeWidth={1.1} strokeLinecap="round" />
        <circle cx={60} cy={75.6} r={2.7} fill={GOLD} stroke={INK} strokeWidth={0.8} />
        <path d="M58.6 76.4 L61.4 76.4" stroke={INK} strokeWidth={0.7} strokeLinecap="round" />

        {/* ---------------------------------------------------------------- Kaki */}
        {[false, true].map(right => (
          <g key={right ? 'fr' : 'fl'} transform={right ? MIRROR : undefined}>
            <path d={FOOT} fill={PAPER} stroke={INK} strokeWidth={1.3} strokeLinejoin="round" />
            <path d="M42.8 105.6 L42.8 110 M48.5 105 L48.5 110.6" stroke={INK} strokeWidth={0.7} strokeOpacity={0.6} strokeLinecap="round" />
            <path d="M38.6 110.3 L40.2 112.6 L41.6 110.4 Z M44.4 111 L46 113.3 L47.4 111.1 Z M50.2 110.8 L51.8 113 L53 110.6 Z" fill={INK} />
          </g>
        ))}

        {/* ---------------------------------------------------------------- Lengan */}
        <path d={ARM} fill={PAPER} stroke={INK} strokeWidth={1.2} strokeLinejoin="round" />
        <path d="M35.2 93.4 L34.2 96 M38 94.8 L37.6 97.4 M40.8 94 L41.2 96.6" stroke={INK} strokeWidth={1} strokeLinecap="round" />
        <motion.g animate={arm} style={pivot(80, 80)}>
          <g transform={MIRROR}>
            <path d={ARM} fill={PAPER} stroke={INK} strokeWidth={1.2} strokeLinejoin="round" />
            <path d="M35.2 93.4 L34.2 96 M38 94.8 L37.6 97.4 M40.8 94 L41.2 96.6" stroke={INK} strokeWidth={1} strokeLinecap="round" />
          </g>
        </motion.g>

        {/* ---------------------------------------------------------------- Kepala */}
        <motion.g animate={head} style={pivot(60, 64)}>
          {Horn}
          <g transform={MIRROR}>{Horn}</g>

          {/* Jambul duri (Young ke atas) */}
          {t >= 2 && (
            <path
              d="M51 21 C51.5 16.5 53 13.5 55 12 C55.5 15.5 56.5 17.5 58 19.5 C58.5 13.5 60 9.5 62.5 6.5 C63 11 64 15.5 66.5 19 C67.5 16 69 14 71 13 C70.5 16.5 70 19 70.5 21.5 Z"
              fill={tone.horn} stroke={INK} strokeWidth={1} strokeLinejoin="round"
            />
          )}

          {/* Sirip telinga berbulu */}
          {[false, true].map(right => (
            <g key={right ? 'er' : 'el'} transform={right ? MIRROR : undefined}>
              <path d={FIN} fill={PAPER} stroke={INK} strokeWidth={1.1} strokeLinejoin="round" />
              <path d={FIN} fill={tone.wash} opacity={0.28} />
              <path d="M31 38.5 L16.5 32.6 M30.5 41.5 L19.5 39" stroke={INK} strokeWidth={0.7} strokeLinecap="round" opacity={0.8} />
            </g>
          ))}

          <path d={HEAD} fill={PAPER} />
          <g clipPath={url('head')}>
            <ellipse cx={80} cy={50} rx={11} ry={13} fill={tone.wash} opacity={0.1} filter={url('bleed')} />
          </g>
          <path d={HEAD} fill="none" stroke={INK} strokeWidth={1.4} />
          <Brush d="M90.5 42 C90.5 56.5 77.5 66.5 60 66.5 C52 66.5 45 64.5 39.5 60.5" w={1.4} />

          {/* Sisik di dahi */}
          <path
            d="M49.5 25.6 q2.6 2.6 5.2 0 M57.4 23.4 q2.6 2.6 5.2 0 M65.3 25.6 q2.6 2.6 5.2 0 M53.4 29.6 q2.6 2.6 5.2 0 M61.4 29.6 q2.6 2.6 5.2 0"
            fill="none" stroke={INK} strokeWidth={0.8} strokeOpacity={0.45} strokeLinecap="round"
          />

          {/* Alis kuas */}
          <Brush d={mood === 'thinking' ? 'M42 25.8 C44.5 23.4 48.5 23.4 51 24.8' : 'M42 27.4 C44.5 25 48.5 25 51 26.4'} w={0.75} opacity={0.85} />
          <g transform={MIRROR}><Brush d="M42 27.4 C44.5 25 48.5 25 51 26.4" w={0.75} opacity={0.85} /></g>

          {/* Moncong + lubang hidung */}
          <path d={MUZZLE} fill={PAPER_LIGHT} />
          <Brush d="M44.2 56 C46.5 60.6 52.5 62.8 60 62.8 C67.5 62.8 73.5 60.6 75.8 56" w={0.8} opacity={0.75} />
          <path d="M56.2 49.6 q-1 0.5 -0.7 1.6 M63.8 49.6 q1 0.5 0.7 1.6" fill="none" stroke={INK} strokeWidth={1.2} strokeLinecap="round" />

          {/* Pipi: titik tinta merah hanko */}
          <ellipse cx={36.5} cy={50.5} rx={4.6} ry={2.7} fill={HANKO} opacity={0.5} filter={url('bleed')} />
          <ellipse cx={83.5} cy={50.5} rx={4.6} ry={2.7} fill={HANKO} opacity={0.5} filter={url('bleed')} />

          {/* Mata */}
          {happyEyes ? (
            <>
              <Brush d="M41 41 Q47 32.5 53 41" w={1.6} />
              <Brush d="M67 41 Q73 32.5 79 41" w={1.6} />
            </>
          ) : (
            <>
              <motion.g animate={blink} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>{Eye(47)}</motion.g>
              <motion.g animate={blink} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>{Eye(73)}</motion.g>
              {LidL}{LashL}
              <g transform={MIRROR}>{LidL}{LashL}</g>
            </>
          )}

          {/* Mulut + taring kecil */}
          {mood === 'talking' ? (
            <motion.ellipse
              cx={60} cy={58.5} rx={3.8} fill={MOUTH}
              initial={{ ry: 1.2 }}
              animate={animated ? { ry: [1.2, 3.2, 1.4, 2.8, 1.2] } : { ry: 2 }}
              transition={loop(0.6)}
            />
          ) : happyEyes || mood === 'greeting' ? (
            <>
              <path d="M53 56.5 Q60 65.5 67 56.5 Z" fill={MOUTH} stroke={INK} strokeWidth={1} strokeLinejoin="round" />
              <path d="M57 60.6 Q60 58.8 63 60.6 Q60 62.6 57 60.6 Z" fill={HANKO} opacity={0.85} />
            </>
          ) : mood === 'thinking' ? (
            <Brush d="M56 58.5 Q60 57.2 64 58.5" w={0.9} />
          ) : (
            <>
              <Brush d="M53.8 57.2 Q60 61.8 66.2 57.2" w={0.9} />
              <path d="M62.6 58.9 L63.6 61.1 L64.7 58.3 Z" fill="#fffdf7" stroke={INK} strokeWidth={0.55} strokeLinejoin="round" />
            </>
          )}

          {/* Kumis (Elder ke atas) */}
          {t >= 4 && (
            <>
              <Brush d="M47 55.5 C38 56.5 30 61.5 23 59.5 C20.5 58.6 19.5 56.6 20.5 54.6" w={0.9} color={tone.accent} />
              <g transform={MIRROR}><Brush d="M47 55.5 C38 56.5 30 61.5 23 59.5 C20.5 58.6 19.5 56.6 20.5 54.6" w={0.9} color={tone.accent} /></g>
            </>
          )}

          {/* Batu segel di dahi (Ancient ke atas) */}
          {t >= 5 && (
            <g>
              <circle cx={60} cy={24} r={3.6} fill={HANKO} stroke={tone.accent} strokeWidth={1.1} />
              <rect x={58.6} y={22.6} width={2.8} height={2.8} fill="none" stroke={PAPER} strokeWidth={0.6} opacity={0.8} />
            </g>
          )}

          {/* Cangkang telur di kepala (Hatchling) */}
          {t === 0 && (
            <g>
              <path d={SHELL} fill={PAPER_LIGHT} stroke={INK} strokeWidth={1.1} strokeLinejoin="round" />
              <ellipse cx={51.5} cy={22.5} rx={2} ry={1.5} fill={tone.wash} opacity={0.45} />
              <ellipse cx={66.5} cy={21.5} rx={1.6} ry={1.2} fill={tone.wash} opacity={0.45} />
              <path d="M44.5 23.2 Q60 28.6 75.5 23.2" fill="none" stroke={INK} strokeOpacity={0.3} strokeWidth={0.6} />
            </g>
          )}
        </motion.g>

        {/* Halo ensō (Celestial): lingkaran zen terbuka dari satu goresan kuas emas */}
        {t >= 6 && (
          <motion.g animate={animated ? { y: [0, -2, 0] } : {}} transition={loop(2.6)}>
            <Brush d="M47.5 9 C47 4.5 54 2.2 60.5 2.2 C67.5 2.2 74 4.5 74 8.2 C74 11.6 67.5 13.2 60 13.2 C55 13.2 51 12.5 49 11.2" w={1.4} color={tone.accent} />
          </motion.g>
        )}
      </motion.g>

      {/* Titik berpikir: tetesan tinta */}
      {mood === 'thinking' && (
        <g>
          {[0, 1, 2].map(i => (
            <motion.circle
              key={i}
              cx={96 + i * 7} cy={22 - i * 6} r={2.2 + i * 0.6}
              fill={INK}
              animate={animated ? { opacity: [0.15, 0.8, 0.15] } : { opacity: 0.7 }}
              transition={loop(1.2, { delay: i * 0.2 })}
            />
          ))}
        </g>
      )}
    </svg>
  );
};

interface DragonInkEggProps {
  size?: number;
  cracks?: number;
  wobble?: boolean;
}

/** Telur naga gaya Tinta Sumi: kertas washi, bercak tinta, garis retak kuas. */
export const DragonInkEgg: React.FC<DragonInkEggProps> = ({ size = 96, cracks = 0, wobble = true }) => {
  const uid = useId().replace(/:/g, '');
  const reduce = useReducedMotion();
  const fast = cracks > 0;
  const EGG = 'M60 14 C82 14 96 50 96 74 C96 96 80 110 60 110 C40 110 24 96 24 74 C24 50 38 14 60 14 Z';
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label="Telur naga" style={{ overflow: 'visible' }}>
      <defs>
        <filter id={`ie-paper-${uid}`} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="7" result="wob" />
          <feDisplacementMap in="SourceGraphic" in2="wob" scale="1.3" xChannelSelector="R" yChannelSelector="G" result="ink" />
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="3" result="grain" />
          <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0.11  0 0 0 0 0.1  0 0 0 0 0.09  0 0 0 0.16 0" result="grainInk" />
          <feComposite in="grainInk" in2="ink" operator="in" result="grainOnShape" />
          <feMerge><feMergeNode in="ink" /><feMergeNode in="grainOnShape" /></feMerge>
        </filter>
        <filter id={`ie-bleed-${uid}`} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.8" /></filter>
        <clipPath id={`ie-clip-${uid}`}><path d={EGG} /></clipPath>
      </defs>
      <ellipse cx={60} cy={113} rx={25} ry={4.5} fill={INK} opacity={0.22} filter={`url(#ie-bleed-${uid})`} />
      <motion.g
        style={pivot(60, 110)}
        animate={wobble && !reduce ? { rotate: fast ? [0, -9, 9, -6, 0] : [0, -4, 4, 0] } : {}}
        transition={{ duration: fast ? 0.5 : 1.2, repeat: Infinity, repeatDelay: fast ? 0.4 : 1.8 }}
        filter={`url(#ie-paper-${uid})`}
      >
        <path d={EGG} fill={PAPER} />
        <g clipPath={`url(#ie-clip-${uid})`}>
          <ellipse cx={84} cy={84} rx={20} ry={30} fill={INK} opacity={0.14} filter={`url(#ie-bleed-${uid})`} />
          {[74, 78, 82, 86, 90].map(x => <path key={x} d={`M${x} 66 L${x + 6} 104`} stroke={INK} strokeOpacity={0.28} strokeWidth={0.7} />)}
          {/* Bercak tinta */}
          <ellipse cx={45} cy={48} rx={6.5} ry={8.5} fill={INK} opacity={0.75} transform="rotate(-18 45 48)" />
          <ellipse cx={73} cy={70} rx={8.5} ry={6} fill={INK} opacity={0.7} transform="rotate(12 73 70)" />
          <ellipse cx={49} cy={88} rx={5.5} ry={4.5} fill={INK} opacity={0.7} />
          <ellipse cx={69} cy={34} rx={3.5} ry={4.5} fill={INK} opacity={0.65} />
          <circle cx={58} cy={64} r={2} fill={HANKO} opacity={0.85} />
        </g>
        <path d={EGG} fill="none" stroke={INK} strokeWidth={1.6} />
        <Brush d="M96 74 C96 96 80 110 60 110 C47 110 37 104 31 96" w={1.4} />
        <path d="M43 29 Q47 23 53 21" stroke="#ffffff" strokeOpacity={0.8} strokeWidth={2.4} strokeLinecap="round" fill="none" />
        {cracks >= 1 && <Brush d="M60 38 L55 47 L62 53 L57 62" w={1.1} />}
        {cracks >= 2 && <Brush d="M62 53 L72 57 L76 66" w={1.1} />}
        {cracks >= 3 && <Brush d="M29 66 L39 61 L45 69 L54 63 L61 71 L71 65 L79 71 L91 65" w={1.2} />}
      </motion.g>
    </svg>
  );
};
