import { DeckItemRef } from './rpg';

export interface OfficialChapter {
  id: string;
  bookId: string;
  chapterNumber: number;
  titleJp: string;
  titleId: string;
  subtitle?: string;
  description?: string;
  coverIcon?: string;
  items: DeckItemRef[];
}

export interface OfficialBook {
  id: string;
  title: string;
  japaneseTitle: string;
  subtitle: string;
  description: string;
  level: 'KANA' | 'N5' | 'N4' | 'N3' | 'N2' | 'N1' | 'Kaigo' | 'TEMATIK';
  category?: 'curriculum' | 'thematic';
  coverIcon: string;
  colorTheme: {
    accentColor: string;
    badgeBg: string;
    borderAccent: string;
    cardBg: string;
  };
  chapters: OfficialChapter[];
}
