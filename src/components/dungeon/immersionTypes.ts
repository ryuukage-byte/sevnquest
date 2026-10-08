import type { CaptionLineInput } from '../../engine/textStudy/captionAnalysis';

export type LyricLine = CaptionLineInput;

export type CaptionState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; lines: LyricLine[]; kind: 'manual' | 'auto' | 'template' }
  | { status: 'error'; message: string };

export type SubDungeon = 'music' | 'video';
