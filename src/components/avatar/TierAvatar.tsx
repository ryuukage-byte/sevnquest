import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  User,
  Shield,
  Sword,
  Zap,
  Award,
  Crown,
  Sun,
  Flame,
  Swords,
  Trophy
} from 'lucide-react';
import { RPG_TIERS } from '../../data/tiers';

// Directly import avatar assets so Vite bundles and resolves them correctly in all environments
import tier1Img from '../../assets/avatars/tier-1.png';
import tier2Img from '../../assets/avatars/tier-2.png';
import tier3Img from '../../assets/avatars/tier-3.png';
import tier4Img from '../../assets/avatars/tier-4.png';
import tier5Img from '../../assets/avatars/tier-5.png';
import tier6Img from '../../assets/avatars/tier-6.png';
import tier7Img from '../../assets/avatars/tier-7.png';
import tier8Img from '../../assets/avatars/tier-8.png';
import tier9Img from '../../assets/avatars/tier-9.png';
import tier10Img from '../../assets/avatars/tier-10.png';

// Female tier avatars
import femaleTier1Img from '../../assets/avatars/female/tier-1.png';
import femaleTier2Img from '../../assets/avatars/female/tier-2.png';
import femaleTier3Img from '../../assets/avatars/female/tier-3.png';
import femaleTier4Img from '../../assets/avatars/female/tier-4.png';
import femaleTier5Img from '../../assets/avatars/female/tier-5.png';
import femaleTier6Img from '../../assets/avatars/female/tier-6.png';
import femaleTier7Img from '../../assets/avatars/female/tier-7.png';
import femaleTier8Img from '../../assets/avatars/female/tier-8.png';
import femaleTier9Img from '../../assets/avatars/female/tier-9.png';
import femaleTier10Img from '../../assets/avatars/female/tier-10.png';

export const TIER_AVATAR_MAP: Record<number, string> = {
  1: tier1Img,
  2: tier2Img,
  3: tier3Img,
  4: tier4Img,
  5: tier5Img,
  6: tier6Img,
  7: tier7Img,
  8: tier8Img,
  9: tier9Img,
  10: tier10Img,
};

export const TIER_AVATAR_MALE_MAP = TIER_AVATAR_MAP;

export const TIER_AVATAR_FEMALE_MAP: Record<number, string> = {
  1: femaleTier1Img,
  2: femaleTier2Img,
  3: femaleTier3Img,
  4: femaleTier4Img,
  5: femaleTier5Img,
  6: femaleTier6Img,
  7: femaleTier7Img,
  8: femaleTier8Img,
  9: femaleTier9Img,
  10: femaleTier10Img,
};

interface TierAvatarProps {
  tierIndex: number; // 0 to 9
  gender?: 'male' | 'female';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onClick?: () => void;
  interactive?: boolean;
  showRankBadge?: boolean;
}

export const TierAvatar: React.FC<TierAvatarProps> = ({
  tierIndex,
  gender = 'male',
  size = 'lg',
  onClick,
  interactive = true,
  showRankBadge = false,
}) => {
  const [imgError, setImgError] = useState(false);
  const [candidateIndex, setCandidateIndex] = useState(0);

  const safeTierIndex = typeof tierIndex === 'number' && !isNaN(tierIndex) ? tierIndex : 0;
  const currentTier = RPG_TIERS[Math.min(9, Math.max(0, safeTierIndex))] || RPG_TIERS[0];
  const tierNum = currentTier.tier; // 1 to 10

  // Whenever tierIndex, gender, or tierNum changes, reset error state and candidate pointer
  useEffect(() => {
    setImgError(false);
    setCandidateIndex(0);
  }, [safeTierIndex, gender, tierNum]);

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-28 h-28',
    lg: 'w-48 h-48 sm:w-56 sm:h-56',
    xl: 'w-64 h-64 sm:w-72 sm:h-72',
  }[size];

  // Specific visual elements based on Tier 1 to 10
  const isNovice = tierNum === 2;
  const isApprentice = tierNum === 3;
  const isSquire = tierNum === 4;
  const isKnight = tierNum === 5;
  const isEliteKnight = tierNum >= 6;
  const isPaladin = tierNum >= 7;
  const isHero = tierNum >= 8;
  const isChampion = tierNum >= 9;
  const isMythic = tierNum >= 10;

  // Build a progressive candidate URL list for maximum resilience across all environments
  const isFemale = gender === 'female';
  const avatarMap = isFemale ? TIER_AVATAR_FEMALE_MAP : TIER_AVATAR_MALE_MAP;
  const subFolder = isFemale ? 'female/' : '';
  const baseUrl = import.meta.env.BASE_URL || './';
  const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

  const candidates = useMemo(() => {
    const list: string[] = [];
    // 1. Primary bundled asset (hashed URL from Vite)
    if (avatarMap[tierNum]) list.push(avatarMap[tierNum]);
    // 2. Relative public path with clean BASE_URL
    list.push(`${cleanBase}avatars/${subFolder}tier-${tierNum}.png`);
    // 3. Root-relative public path
    list.push(`/avatars/${subFolder}tier-${tierNum}.png`);
    // 4. Dot-relative path (for standalone serving)
    list.push(`./avatars/${subFolder}tier-${tierNum}.png`);
    // 5. Alternate gender fallback if primary is missing
    const alternateMap = isFemale ? TIER_AVATAR_MALE_MAP : TIER_AVATAR_FEMALE_MAP;
    if (alternateMap[tierNum]) list.push(alternateMap[tierNum]);

    return Array.from(new Set(list.filter(Boolean)));
  }, [avatarMap, tierNum, cleanBase, subFolder, isFemale]);

  const currentSrc = candidates[candidateIndex] || candidates[0];

  const handleImageError = () => {
    if (candidateIndex < candidates.length - 1) {
      setCandidateIndex(prev => prev + 1);
    } else {
      setImgError(true);
    }
  };

  const renderFallbackIcon = () => {
    const iconClass = "w-16 h-16 sm:w-20 sm:h-20 text-gold";
    switch (tierNum) {
      case 1: return <User className={iconClass} />;
      case 2: return <Shield className={iconClass} />;
      case 3: return <Sword className={iconClass} />;
      case 4: return <Zap className={iconClass} />;
      case 5: return <Award className={iconClass} />;
      case 6: return <Crown className={iconClass} />;
      case 7: return <Sun className={iconClass} />;
      case 8: return <Flame className={iconClass} />;
      case 9: return <Swords className={iconClass} />;
      case 10: return <Trophy className={iconClass} />;
      default: return <Award className={iconClass} />;
    }
  };

  return (
    <motion.div
      id={`rpg-avatar-tier-${tierNum}`}
      onClick={onClick}
      whileHover={interactive ? { scale: 1.04, y: -4 } : {}}
      whileTap={interactive ? { scale: 0.96 } : {}}
      className={`relative flex flex-col items-center justify-center select-none ${interactive ? 'cursor-pointer group' : ''}`}
    >
      {/* Background Aura & Light Rings */}
      <div className={`relative ${sizeClasses} flex items-center justify-center`}>
        
        {/* Tier 10 Angelic Light Wings */}
        {isMythic && (
          <motion.div
            animate={{ y: [0, -6, 0], scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -top-8 inset-x-[-20%] h-full flex justify-between pointer-events-none opacity-80"
          >
            {/* Left Wing */}
            <svg viewBox="0 0 100 100" className="w-24 h-24 text-amber-300 fill-current -scale-x-100">
              <path d="M10,90 Q40,30 90,10 Q60,40 70,60 Q50,60 50,80 Z" opacity="0.9" />
              <path d="M20,95 Q50,45 95,25 Q70,55 75,75 Z" opacity="0.7" fill="var(--color-amber-300)" />
            </svg>
            {/* Right Wing */}
            <svg viewBox="0 0 100 100" className="w-24 h-24 text-amber-300 fill-current">
              <path d="M10,90 Q40,30 90,10 Q60,40 70,60 Q50,60 50,80 Z" opacity="0.9" />
              <path d="M20,95 Q50,45 95,25 Q70,55 75,75 Z" opacity="0.7" fill="var(--color-amber-300)" />
            </svg>
          </motion.div>
        )}

        {/* Alas patung (solid inset, tanpa glow blur) */}
        <div className="absolute inset-0 rounded-3xl bg-surface-inset/50 border border-border-subtle shadow-inner pointer-events-none" />

        {/* Character Visual Image (Splash Art) */}
        <div className="relative w-full h-full flex items-center justify-center pointer-events-none z-10">
          <motion.div
            animate={isChampion || isMythic ? { y: [0, -8, 0] } : { y: [0, -4, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="relative w-full h-full flex items-center justify-center scale-125 sm:scale-110"
          >
            {imgError ? (
              <div className="flex flex-col items-center justify-center p-4">
                {renderFallbackIcon()}
                <span className="text-[11px] font-heading font-bold text-gold mt-2 tracking-wider">
                  {currentTier.name}
                </span>
              </div>
            ) : (
              <img 
                key={`${tierNum}-${gender}-${candidateIndex}`}
                src={currentSrc}
                alt={`${currentTier.name} Avatar`}
                onError={handleImageError}
                className="w-full h-full object-contain drop-shadow-[0_10px_25px_rgba(0,0,0,0.6)]"
              />
            )}
          </motion.div>
        </div>

      </div>

      {/* Optional Rank Badge & Title Below */}
      {showRankBadge && (
        <div className="mt-3 text-center">
          <div className="text-sm sm:text-base font-bold text-text-primary font-heading flex items-center justify-center gap-1.5">
            <span>{currentTier.name}</span>
          </div>
          <p className="text-[11px] text-text-secondary max-w-[220px] truncate">
            {currentTier.titleName}
          </p>
        </div>
      )}
    </motion.div>
  );
};
