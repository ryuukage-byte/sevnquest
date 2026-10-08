import { Castle, Compass, Scroll, BookText, PenTool, BookMarked, Trophy, Settings } from 'lucide-react';

const VintageFilter = () => (
  <svg style={{ width: 0, height: 0, position: 'absolute' }} aria-hidden="true">
    <defs>
      <filter id="vintage-ink" x="-20%" y="-20%" width="140%" height="140%">
        {/* Create shaky, hand-drawn linework effect */}
        <feTurbulence type="fractalNoise" baseFrequency="0.08" numOctaves="2" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" xChannelSelector="R" yChannelSelector="G" result="displaced" />
        
        {/* Add slight roughening to simulate ink bleed */}
        <feMorphology operator="dilate" radius="0.3" in="displaced" result="bled" />
        
        {/* Subtle noise for texture */}
        <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="1" result="textureNoise" />
        <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 3 -1" in="textureNoise" result="texture" />
        
        <feComposite operator="in" in="bled" in2="texture" result="texturedInk" />
        <feComposite operator="over" in="texturedInk" in2="bled" result="final" />
      </filter>
    </defs>
  </svg>
);

const withVintageEngraving = (IconComponent: React.ComponentType<any>) => {
  return ({ className = '', style, ...props }: any) => (
    <>
      <VintageFilter />
      <IconComponent 
        className={className} 
        style={{ filter: 'url(#vintage-ink)', strokeLinecap: 'round', strokeLinejoin: 'round', ...style }} 
        strokeWidth={1.75}
        {...props} 
      />
    </>
  );
};

export const CastleIcon = withVintageEngraving(Castle);
export const CompassIcon = withVintageEngraving(Compass);
export const ScrollIcon = withVintageEngraving(Scroll);
export const BookIcon = withVintageEngraving(BookText);
export const QuillIcon = withVintageEngraving(PenTool);
export const BookmarkIcon = withVintageEngraving(BookMarked);
export const TrophyIcon = withVintageEngraving(Trophy);
export const SettingsIcon = withVintageEngraving(Settings);
