import React, { useRef, useState, useEffect, useMemo } from 'react';
import { RotateCcw, Check, PlayCircle, Eye, EyeOff, Loader2, Clock, Volume2, ArrowRight, BookOpen } from 'lucide-react';
import { motion } from 'motion/react';
import HanziWriter from 'hanzi-writer';
import { playSound, speakJapanese } from '../../utils/audio';
import { sendScoreEvent } from '../../lib/supabase';
import { KANA_STROKE_DICT } from '../../data/kanaStrokeDict';
import { getKanjiBaseExp, calculateWritingReward, WritingRewardResult } from '../../utils/rewards';
import { KANJI_DATABASE } from '../../data/kanji';
import { KOTOBA_DATABASE } from '../../data/kotoba';
import { KanjiItem } from '../../types/content';
import { normalizeWordAndReading, getHighlightedYomikata } from '../../utils/readingHighlightUtils';
import { getEnrichedKanjiRelatedWords } from '../../utils/kanjiVocabularyEnricher';
import { RubyText } from './RubyText';

const SMALL_KANA_SET = new Set([
  // Hiragana sutegana
  'ぁ', 'ぃ', 'ぅ', 'ぇ', 'ぉ',
  'っ',
  'ゃ', 'ゅ', 'ょ',
  'ゎ',
  // Katakana sutegana
  'ァ', 'ィ', 'ゥ', 'ェ', 'ォ',
  'ッ',
  'ャ', 'ュ', 'ョ',
  'ヮ',
  'ヵ', 'ヶ',
]);

const isSmallKana = (char: string): boolean => {
  return char.length > 0 && SMALL_KANA_SET.has(char);
};

const HANDAKUTEN_KANA_SET = new Set([
  'ぱ', 'ぴ', 'ぷ', 'ぺ', 'ぽ',
  'パ', 'ピ', 'プ', 'ペ', 'ポ'
]);

/**
 * Japanese Handakuten (Maru / 半濁点 ゜) circular stroke recognition helper.
 * Standard Fréchet distance algorithms fail on small closed circular loops because
 * users naturally draw circles clockwise, counter-clockwise, from top, bottom,
 * or as a quick dot/circle gesture. This interceptor validates that the stroke
 * is localized within the maru target zone (approx (875, 750) in 1024x1024 HanziWriter coords)
 * and allows smooth, frustration-free writing of the maru ring.
 */
function attachMaruHandler(writerInstance: any, char: string) {
  if (!writerInstance) return;
  if (!HANDAKUTEN_KANA_SET.has(char)) return;

  const patchQuiz = (quiz: any) => {
    if (!quiz || quiz._hasMaruPatched) return;
    quiz._hasMaruPatched = true;

    const originalEndUserStroke = quiz.endUserStroke.bind(quiz);

    quiz.endUserStroke = function (this: any) {
      if (!this._userStroke) return;
      const currentStrokeIdx = this._currentStrokeIndex;
      const isLastStroke = currentStrokeIdx === this._character.strokes.length - 1;

      if (isLastStroke) {
        const userPts = this._userStroke.points;
        if (userPts && userPts.length > 0) {
          // If single point (quick touch/circle tap), add a synthetic micro-offset point so HanziWriter doesn't discard it
          if (userPts.length === 1) {
            userPts.push({ x: userPts[0].x + 1, y: userPts[0].y + 1 });
          }

          const sum = userPts.reduce(
            (acc: { x: number; y: number }, pt: { x: number; y: number }) => ({ x: acc.x + pt.x, y: acc.y + pt.y }),
            { x: 0, y: 0 }
          );
          const centroid = { x: sum.x / userPts.length, y: sum.y / userPts.length };
          const distToMaru = Math.hypot(centroid.x - 875, centroid.y - 750);

          // Handakuten Maru (circle ゜) generous hit tolerance:
          // In 1024x1024 Makemeahanzi grid, Maru is centered at (875, 750) with radius ~50.
          // Accept any circular gesture, loop, or touch within radius 320 or in the top-right quadrant (x >= 600, y >= 460)
          if (distToMaru <= 320 || (centroid.x >= 600 && centroid.y >= 460)) {
            this._options.markStrokeCorrectAfterMisses = 1;
            this._mistakesOnStroke = 1;
            return originalEndUserStroke();
          }
        }
      }

      return originalEndUserStroke();
    };
  };

  // If quiz is already instantiated, patch immediately
  if (writerInstance._quiz) {
    patchQuiz(writerInstance._quiz);
  }

  // Hook writerInstance.quiz so whenever quiz starts or restarts asynchronously, the patch is re-applied
  if (!writerInstance._quizHooked) {
    writerInstance._quizHooked = true;
    const origQuiz = writerInstance.quiz.bind(writerInstance);
    writerInstance.quiz = function (...args: any[]) {
      const res = origQuiz(...args);
      if (res && typeof res.then === 'function') {
        return res.then((quizResult: any) => {
          if (writerInstance._quiz) {
            patchQuiz(writerInstance._quiz);
          }
          return quizResult;
        });
      }
      if (writerInstance._quiz) {
        patchQuiz(writerInstance._quiz);
      }
      return res;
    };
  }
}

function transformSmallKanaData(charData: any) {
  if (!charData || !Array.isArray(charData.strokes) || !Array.isArray(charData.medians)) {
    return charData;
  }

  // Authentic Japanese Yokogaki layout:
  // Scale down to ~58% and position in bottom-left quadrant (左下)
  const scale = 0.58;
  const targetCx = 275;
  const targetCy = 140;
  const origCx = 512;
  const origCy = 388;

  const transformedStrokes = charData.strokes.map((pathStr: string) => {
    return pathStr.replace(/([MCZ])([^MCZ]*)/gi, (_match, cmd, args) => {
      if (cmd.toUpperCase() === 'Z') return cmd;
      const numRegex = /[-+]?(?:\d*\.\d+|\d+)/g;
      const nums: number[] = [];
      let m: RegExpExecArray | null;
      while ((m = numRegex.exec(args)) !== null) {
        nums.push(parseFloat(m[0]));
      }
      if (nums.length === 0) return cmd;
      const transformed: string[] = [];
      for (let i = 0; i < nums.length; i += 2) {
        const x = nums[i];
        const y = nums[i + 1];
        if (y !== undefined) {
          const newX = Math.round(targetCx + (x - origCx) * scale);
          const newY = Math.round(targetCy + (y - origCy) * scale);
          transformed.push(`${newX},${newY}`);
        } else {
          transformed.push(Math.round(x).toString());
        }
      }
      return cmd + transformed.join(' ');
    });
  });

  const transformedMedians = charData.medians.map((stroke: number[][]) =>
    stroke.map(([x, y]: number[]) => [
      Math.round(targetCx + (x - origCx) * scale),
      Math.round(targetCy + (y - origCy) * scale)
    ])
  );

  return {
    ...charData,
    strokes: transformedStrokes,
    medians: transformedMedians,
  };
}

const strokeDataCache = new Map<string, any>();
const activeFetches = new Map<string, Promise<any>>();

export const getCachedStrokeData = (char: string): any | null => {
  if (!char) return null;
  if (strokeDataCache.has(char)) {
    return strokeDataCache.get(char);
  }
  if (KANA_STROKE_DICT[char]) {
    const data = isSmallKana(char)
      ? transformSmallKanaData(KANA_STROKE_DICT[char])
      : KANA_STROKE_DICT[char];
    strokeDataCache.set(char, data);
    return data;
  }
  try {
    const raw = localStorage.getItem(`nq_stroke_${char}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.strokes)) {
        strokeDataCache.set(char, parsed);
        return parsed;
      }
    }
  } catch {
    // Ignore storage parse error
  }
  return null;
};

const saveStrokeDataToCache = (char: string, data: any) => {
  if (!char || !data) return;
  strokeDataCache.set(char, data);
  try {
    localStorage.setItem(`nq_stroke_${char}`, JSON.stringify(data));
  } catch {
    // Silently ignore if localStorage is full or disabled
  }
};

async function fetchWithTimeout(url: string, timeoutMs = 10000): Promise<any> {
  const controller = new AbortController();
  let timedOut = false;
  const id = setTimeout(() => {
    timedOut = true;
    try {
      controller.abort();
    } catch (_) {}
  }, timeoutMs);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const contentType = res.headers.get('content-type') || '';
    if (contentType && !contentType.includes('json') && !contentType.includes('application/octet-stream')) {
      throw new Error(`Invalid content-type: ${contentType}`);
    }
    const data = await res.json();
    if (!data || !Array.isArray(data.strokes)) throw new Error('Invalid stroke data');
    return data;
  } catch (err: any) {
    clearTimeout(id);
    if (timedOut) {
      throw new Error(`Request timed out after ${timeoutMs}ms: ${url}`);
    }
    throw err;
  }
}

async function fetchFastest(urls: string[], timeoutMs = 10000): Promise<any> {
  if (urls.length === 0) throw new Error('No URLs provided');
  if (urls.length === 1) return fetchWithTimeout(urls[0], timeoutMs);

  return new Promise((resolve, reject) => {
    let settled = false;
    let failedCount = 0;
    const errors: any[] = [];
    const abortControllers = urls.map(() => new AbortController());

    urls.forEach((url, idx) => {
      const controller = abortControllers[idx];
      let hasTimedOut = false;
      const timer = setTimeout(() => {
        hasTimedOut = true;
        try {
          controller.abort();
        } catch (_) {}
      }, timeoutMs);

      fetch(url, { signal: controller.signal })
        .then(async res => {
          clearTimeout(timer);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const contentType = res.headers.get('content-type') || '';
          if (contentType && !contentType.includes('json') && !contentType.includes('application/octet-stream')) {
            throw new Error(`Invalid content-type: ${contentType}`);
          }
          const data = await res.json();
          if (!data || !Array.isArray(data.strokes)) throw new Error('Invalid stroke data');
          return data;
        })
        .then(data => {
          if (!settled) {
            settled = true;
            // Cleanly abort remaining requests without throwing unhandled rejections
            abortControllers.forEach((ac, i) => {
              if (i !== idx) {
                try { ac.abort(); } catch (_) {}
              }
            });
            resolve(data);
          }
        })
        .catch(err => {
          clearTimeout(timer);
          errors.push(hasTimedOut ? new Error(`Timeout: ${url}`) : err);
          failedCount++;
          if (failedCount === urls.length && !settled) {
            settled = true;
            reject(new Error(`All ${urls.length} mirrors failed. Last error: ${errors[errors.length - 1]?.message || 'Unknown error'}`));
          }
        });
    });
  });
}

const getLocalStrokePaths = (dir: 'kanji-strokes' | 'kana-strokes', filename: string): string[] => {
  const base = import.meta.env.BASE_URL || '/';
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  // Set: dengan base './' kandidat pertama dan ketiga identik; dulu keduanya di-fetch dua kali (2,5 dtk timeout masing-masing).
  return Array.from(new Set([
    `${cleanBase}data/${dir}/${filename}`,
    `/data/${dir}/${filename}`,
    `./data/${dir}/${filename}`,
  ]));
};

const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false;

async function tryFetchLocal(dir: 'kanji-strokes' | 'kana-strokes', filename: string): Promise<any | null> {
  const paths = getLocalStrokePaths(dir, filename);
  for (const path of paths) {
    try {
      const data = await fetchWithTimeout(path, 2500);
      if (data && Array.isArray(data.strokes)) {
        return data;
      }
    } catch {
      // Continue to next path candidate
    }
  }
  return null;
}

export const fetchSingleCharStrokeData = async (char: string): Promise<any> => {
  const cached = getCachedStrokeData(char);
  if (cached) return cached;

  if (activeFetches.has(char)) {
    return activeFetches.get(char)!;
  }

  const code = char.charCodeAt(0);
  const isKana = (code >= 0x3040 && code <= 0x30ff) || (code >= 0x31f0 && code <= 0x31ff);
  const encoded = encodeURIComponent(char);
  const hex = code.toString(16).toLowerCase();

  const fetchPromise = (async () => {
    let rawData: any = null;

    if (isKana) {
      // 1. Try local kana files first
      rawData = await tryFetchLocal('kana-strokes', `${encoded}.json`);
      if (!rawData) {
        rawData = await tryFetchLocal('kana-strokes', `${hex}.json`);
      }
      if (!rawData) {
        rawData = await tryFetchLocal('kanji-strokes', `${encoded}.json`);
      }
      if (!rawData) {
        rawData = await tryFetchLocal('kanji-strokes', `${hex}.json`);
      }
      // 2. Fallback to fast CDN mirrors with 10s timeout if local missing (dilewati saat offline)
      if (!rawData && isOffline()) {
        throw new Error(`Data goresan "${char}" tidak tersedia offline`);
      }
      if (!rawData) {
        rawData = await fetchFastest([
          `https://unpkg.com/hanzi-writer-data-jp@0.0.1/${encoded}.json`,
          `https://cdn.jsdelivr.net/npm/hanzi-writer-data-jp@0.0.1/${encoded}.json`,
          `https://fastly.jsdelivr.net/npm/hanzi-writer-data-jp@0.0.1/${encoded}.json`
        ], 10000);
      }
    } else {
      // Kanji: 1. Try bundled local kanji stroke data FIRST (Instant 0ms-2ms local load!)
      rawData = await tryFetchLocal('kanji-strokes', `${encoded}.json`);
      if (!rawData) {
        rawData = await tryFetchLocal('kanji-strokes', `${hex}.json`);
      }

      // 2. Fallback to CDNs only if character is not bundled locally (dilewati saat offline)
      if (!rawData && isOffline()) {
        throw new Error(`Data goresan "${char}" tidak tersedia offline`);
      }
      if (!rawData) {
        const primaryMirrors = [
          `https://unpkg.com/hanzi-writer-data-jp@0.0.1/${encoded}.json`,
          `https://cdn.jsdelivr.net/npm/hanzi-writer-data-jp@0.0.1/${encoded}.json`,
          `https://fastly.jsdelivr.net/npm/hanzi-writer-data-jp@0.0.1/${encoded}.json`
        ];

        try {
          rawData = await fetchFastest(primaryMirrors, 10000);
        } catch {
          const fallbackMirrors = [
            `https://unpkg.com/hanzi-writer-data@2.0.1/${encoded}.json`,
            `https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/${encoded}.json`,
            `https://fastly.jsdelivr.net/npm/hanzi-writer-data@2.0.1/${encoded}.json`
          ];
          try {
            rawData = await fetchFastest(fallbackMirrors, 10000);
          } catch {
            rawData = await fetchWithTimeout(
              `https://cdn.jsdelivr.net/gh/MadLadSquad/hanzi-writer-data-youyin/data/${encoded}.json`,
              10000
            );
          }
        }
      }
    }

    const finalData = isSmallKana(char) ? transformSmallKanaData(rawData) : rawData;
    saveStrokeDataToCache(char, finalData);
    activeFetches.delete(char);
    return finalData;
  })().catch(err => {
    activeFetches.delete(char);
    throw err;
  });

  activeFetches.set(char, fetchPromise);
  return fetchPromise;
};

export const preloadStrokeData = (word: string): Promise<any[]> => {
  if (!word) return Promise.resolve([]);
  const chars = Array.from(new Set(word.split('')));
  return Promise.all(chars.map(c => fetchSingleCharStrokeData(c).catch(() => null)));
};

export interface KanjiWritingCanvasProps {
  kanjiChar?: string;
  character?: string; // Backwards compatible alias
  level?: string;
  totalSheets?: number; // default: 1 (sandbox mode)
  onCompleteSheet?: (sheetNumber: number, score: number, reward?: WritingRewardResult) => void;
  onFinish?: (reward?: WritingRewardResult) => void; // Callback when sheet is completed and user finishes
  onComplete?: () => void; // Backwards compatible alias for onFinish
  soundEnabled?: boolean;
  autoAdvance?: boolean;
  leniency?: number;
  averageDistanceThreshold?: number;
  strokeCount?: number;
  meaning?: string;
  meaningId?: string; // Backwards compatible alias
  kunyomi?: string | string[];
  onyomi?: string | string[];
  reading?: string;
  romaji?: string;
  relatedWords?: Array<{ word: string; reading: string; meaningId: string; meaningEn?: string }>;
  showStopwatch?: boolean; // Stopwatch on writing canvas (default: true)
  showPromptHeader?: boolean; // Complete prompt header with readings & audio (default: true)
  showDirectionGuide?: boolean; // Show stroke direction guide (default: true)
  onReady?: () => void; // Triggered when stroke data is ready and canvas is interactive
  showCompletionDetail?: boolean; // When true, shows detail review card on complete instead of immediate onFinish (default: !autoAdvance)
  nextButtonLabel?: string; // Custom label for next button on detail review card
  onCancel?: () => void; // Optional cancel/back callback (e.g. return to library overview)
  className?: string;
}

/**
 * Strips dictionary punctuation and redundant prefixes/suffixes from readings.
 * Ensures clean, concise display (max 3 primary readings) on mobile without multi-line clutter.
 */
function cleanReadingsList(readings: string[]): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const r of readings) {
    const cleaned = r
      .replace(/\s*\([A-Za-z0-9\s-]+\)/g, '')
      .replace(/[.-]/g, '')
      .trim();
    if (!cleaned) continue;

    const isPrefixed = r.startsWith('-');
    if (!seen.has(cleaned)) {
      seen.add(cleaned);
      if (!isPrefixed) {
        result.unshift(cleaned);
      } else {
        result.push(cleaned);
      }
    }
  }

  return result.slice(0, 3);
}

export const KanjiWritingCanvas: React.FC<KanjiWritingCanvasProps> = ({
  kanjiChar: rawKanjiChar,
  character,
  level,
  totalSheets = 1,
  onCompleteSheet,
  onFinish,
  onComplete,
  soundEnabled = true,
  autoAdvance = false,
  leniency,
  averageDistanceThreshold,
  strokeCount,
  meaning,
  meaningId,
  kunyomi,
  onyomi,
  reading,
  romaji,
  relatedWords,
  showStopwatch = true,
  showPromptHeader = true,
  showDirectionGuide: _showDirectionGuide = true,
  onReady,
  showCompletionDetail,
  nextButtonLabel,
  onCancel,
  className = '',
}) => {
  const kanjiChar = rawKanjiChar || character || '';
  const isKana = kanjiChar.length > 0 && kanjiChar.charCodeAt(0) >= 0x3040 && kanjiChar.charCodeAt(0) <= 0x30ff;
  const isHiragana = kanjiChar.length > 0 && kanjiChar.charCodeAt(0) >= 0x3040 && kanjiChar.charCodeAt(0) <= 0x309f;
  const isKatakana = kanjiChar.length > 0 && kanjiChar.charCodeAt(0) >= 0x30a0 && kanjiChar.charCodeAt(0) <= 0x30ff;
  const isSmall = isSmallKana(kanjiChar);
  const effectiveShowCompletionDetail = showCompletionDetail ?? !autoAdvance;

  // Database lookup fallback for complete character metadata
  const dbItem = useMemo(() => {
    return KANJI_DATABASE[kanjiChar] || null;
  }, [kanjiChar]);

  const effectiveMeaning = meaning || meaningId || dbItem?.meaningId || dbItem?.meaningEn || '';

  const onyomiList: string[] = useMemo(() => {
    if (onyomi) return Array.isArray(onyomi) ? onyomi : [onyomi];
    if (dbItem?.onyomi) return Array.isArray(dbItem.onyomi) ? dbItem.onyomi : [dbItem.onyomi];
    return [];
  }, [onyomi, dbItem]);

  const kunyomiList: string[] = useMemo(() => {
    if (kunyomi) return Array.isArray(kunyomi) ? kunyomi : [kunyomi];
    if (dbItem?.kunyomi) return Array.isArray(dbItem.kunyomi) ? dbItem.kunyomi : [dbItem.kunyomi];
    return [];
  }, [kunyomi, dbItem]);

  const cleanOnyomiList = useMemo(() => {
    return cleanReadingsList(onyomiList);
  }, [onyomiList]);

  const cleanKunyomiList = useMemo(() => {
    return cleanReadingsList(kunyomiList);
  }, [kunyomiList]);

  const effectiveRomaji = useMemo(() => {
    if (romaji) return romaji;
    if (isKana) {
      return kunyomiList[0] || onyomiList[0] || kanjiChar;
    }
    return '';
  }, [romaji, isKana, kunyomiList, onyomiList, kanjiChar]);

  const effectiveRelatedWords = useMemo(() => {
    if (isKana || !kanjiChar) {
      return relatedWords || dbItem?.relatedWords || [];
    }
    return getEnrichedKanjiRelatedWords(kanjiChar, relatedWords || dbItem?.relatedWords, 6);
  }, [relatedWords, dbItem, kanjiChar, isKana]);

  const promptKanjiItem: KanjiItem = useMemo(() => {
    return {
      id: dbItem?.id || `kj_${kanjiChar}`,
      character: kanjiChar,
      meaningId: effectiveMeaning,
      meaningEn: dbItem?.meaningEn || '',
      onyomi: onyomiList,
      kunyomi: kunyomiList,
      jlpt: level || dbItem?.jlpt || (isKana ? 'KANA' : 'N5'),
      strokeCount: strokeCount || dbItem?.strokeCount || 1,
      radical: dbItem?.radical || '',
      radicalName: dbItem?.radicalName || '',
      relatedWords: effectiveRelatedWords,
      questions: dbItem?.questions || [],
    };
  }, [dbItem, kanjiChar, effectiveMeaning, onyomiList, kunyomiList, level, isKana, strokeCount, effectiveRelatedWords]);

  // Dynamic calibration: Kana has sweeping curves (e.g. stroke 2 of か & カ) requiring ~400 threshold and 1.05 leniency
  // to avoid false rejections, while Kanji uses 360 threshold and 1.0 leniency.
  // Small Kana (sutegana) scaled in bottom-left quadrant uses 1.15 leniency and 440 threshold.
  const effectiveLeniency = leniency ?? (isSmall ? 1.15 : (isKana ? 1.05 : 1.0));
  const effectiveDistanceThreshold = averageDistanceThreshold ?? (isSmall ? 440 : (isKana ? 400 : 360));

  const gridCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const writerContainerRef = useRef<HTMLDivElement | null>(null);
  const writerRef = useRef<HanziWriter | null>(null);

  const [currentSheet, setCurrentSheet] = useState(1);
  const [completedSheets, setCompletedSheets] = useState<number[]>([]);
  const [showGuide, setShowGuide] = useState(false);
  const [isQuizComplete, setIsQuizComplete] = useState(false);
  const [mistakesCount, setMistakesCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLoading, setIsLoading] = useState(() => !getCachedStrokeData(kanjiChar));
  const [canvasSize, setCanvasSize] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 640) {
      return 340;
    }
    return 320;
  });

  // Performance factors for dynamic EXP
  const [watermarkEverUsed, setWatermarkEverUsed] = useState(false);
  const [animationCount, setAnimationCount] = useState(0);
  const [lastReward, setLastReward] = useState<WritingRewardResult | null>(null);

  // Progressive Stroke Memory State
  const [currentStrokeIndex, setCurrentStrokeIndex] = useState(0);
  const [totalCharStrokes, setTotalCharStrokes] = useState(strokeCount || 0);

  // Stopwatch State per Canvas Sheet (1 canvas = 1 sheet)
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showDetailReview, setShowDetailReview] = useState(false);

  // Reset timer & sheet state whenever the character changes
  useEffect(() => {
    setCurrentSheet(1);
    setCompletedSheets([]);
    setElapsedSeconds(0);
    setIsTimerRunning(false);
    setWatermarkEverUsed(false);
    setAnimationCount(0);
    setLastReward(null);
    setCurrentStrokeIndex(0);
    setShowDetailReview(false);
  }, [kanjiChar]);

  // Timer interval - strictly runs only when character is ready and not yet completed
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && !isLoading && !isQuizComplete) {
      interval = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, isLoading, isQuizComplete]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Reset stroke memory & canvas stopwatch when character or sheet changes
  useEffect(() => {
    setCurrentStrokeIndex(0);
    setMistakesCount(0);
    const alreadyDone = completedSheets.includes(currentSheet);
    setIsQuizComplete(alreadyDone);
    setElapsedSeconds(0);
    setIsTimerRunning(!alreadyDone && !isLoading);
  }, [kanjiChar, currentSheet, completedSheets, isLoading]);

  // Light Mode Detection for genuine Hosho paper & chocolate ink styling
  const [isLightMode, setIsLightMode] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('theme-light')
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const isLight = document.documentElement.classList.contains('theme-light');
      setIsLightMode(isLight);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Fallback for non-CJK / Kana characters without stroke data
  const [hasStrokeData, setHasStrokeData] = useState(true);
  const fallbackCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingFallbackRef = useRef(false);
  const hasRewardedRef = useRef<Record<number, boolean>>({});

  // Reset rewarded ref when character changes
  useEffect(() => {
    hasRewardedRef.current = {};
  }, [kanjiChar]);

  // Auto-advance logic (sub-character in Kotoba practice)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isQuizComplete && autoAdvance) {
      timer = setTimeout(() => {
        completeCurrentSheet();
      }, 600);
    }
    return () => clearTimeout(timer);
  }, [isQuizComplete, autoAdvance]);

  // Auto-transition to detail review upon completing strokes (matching Kotoba writing flow)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isQuizComplete && effectiveShowCompletionDetail && !autoAdvance && !showDetailReview) {
      timer = setTimeout(() => {
        setShowDetailReview(true);
      }, 700);
    }
    return () => clearTimeout(timer);
  }, [isQuizComplete, effectiveShowCompletionDetail, autoAdvance, showDetailReview]);

  // Measure container size dynamically with ResizeObserver
  useEffect(() => {
    const container = gridCanvasRef.current?.parentElement;
    if (!container) return;

    const updateSize = () => {
      const el = gridCanvasRef.current?.parentElement;
      if (el && el.offsetWidth > 0) {
        const target = Math.min(340, Math.floor(el.offsetWidth));
        setCanvasSize(prev => (Math.abs(prev - target) > 6 ? target : prev));
      }
    };

    updateSize();

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        updateSize();
      });
      ro.observe(container);
    }

    window.addEventListener('resize', updateSize);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  // 1. Background Grid Setup (HTML5 Canvas 2D Context)
  useEffect(() => {
    const canvas = gridCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    canvas.width = canvasSize * dpr;
    canvas.height = canvasSize * dpr;
    ctx.scale(dpr, dpr);

    // Background: Dark Washi Indigo (#191d26) vs Light Washi Sand (#f1efe8)
    ctx.clearRect(0, 0, canvasSize, canvasSize);
    ctx.fillStyle = isLightMode ? '#f1efe8' : '#191d26';
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    // Grid lines: Dark Sashiko (rgba(111, 147, 207, 0.20)) vs Light Sashiko (rgba(37, 62, 99, 0.18))
    ctx.strokeStyle = isLightMode ? 'rgba(37, 62, 99, 0.18)' : 'rgba(111, 147, 207, 0.20)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    // Horizontal & Vertical Crosshairs
    ctx.beginPath();
    ctx.moveTo(canvasSize / 2, 0);
    ctx.lineTo(canvasSize / 2, canvasSize);
    ctx.moveTo(0, canvasSize / 2);
    ctx.lineTo(canvasSize, canvasSize / 2);
    ctx.stroke();

    // Diagonal Guidelines
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(canvasSize, canvasSize);
    ctx.moveTo(canvasSize, 0);
    ctx.lineTo(0, canvasSize);
    ctx.stroke();
  }, [canvasSize, isLightMode]);

  // 2. HanziWriter Setup (Layer Interaktif)
  useEffect(() => {
    if (!writerContainerRef.current) return;
    if (!kanjiChar) {
      setIsLoading(false);
      return;
    }
    if (canvasSize === 0) return;

    writerContainerRef.current.innerHTML = '';
    const initialCached = getCachedStrokeData(kanjiChar);
    setIsLoading(!initialCached);
    if (initialCached) {
      setElapsedSeconds(0);
      setIsTimerRunning(true);
      onReady?.();
    } else {
      setIsTimerRunning(false);
      setElapsedSeconds(0);
    }
    setHasStrokeData(true);
    let isCancelled = false;

    try {
      const writer = HanziWriter.create(writerContainerRef.current, kanjiChar, {
        width: canvasSize,
        height: canvasSize,
        padding: 15,
        showOutline: showGuide,
        strokeAnimationSpeed: 1.2,
        delayBetweenStrokes: 100,
        strokeColor: isLightMode ? '#262420' : '#f8fafc',
        highlightColor: '#e2555b',
        drawingColor: isLightMode ? '#262420' : '#f8fafc',
        outlineColor: isLightMode ? 'rgba(37, 62, 99, 0.20)' : 'rgba(151, 181, 224, 0.25)',
        showHintAfterMisses: 2,
        drawingWidth: isSmall ? 10 : 12,
        leniency: effectiveLeniency,
        averageDistanceThreshold: effectiveDistanceThreshold,
        charDataLoader: (char, onComplete, onError) => {
          const cached = getCachedStrokeData(char);
          if (cached) {
            setIsLoading(false);
            setElapsedSeconds(0);
            setIsTimerRunning(true);
            onComplete(cached);
            onReady?.();
            return;
          }

          fetchSingleCharStrokeData(char)
            .then(data => {
              if (isCancelled) return;
              if (data && Array.isArray(data.strokes)) {
                setTotalCharStrokes(data.strokes.length);
              }
              setIsLoading(false);
              setElapsedSeconds(0);
              setIsTimerRunning(true);
              onComplete(data);
              onReady?.();
            })
            .catch(err => {
              if (isCancelled) return;
              console.warn(`[KanjiWritingCanvas] Failed to load stroke data for '${char}':`, err);
              setIsLoading(false);
              setIsTimerRunning(false);
              setHasStrokeData(false);
              onError(err);
            });
        }
      });

      writerRef.current = writer;

      // Extract total strokes count from character data
      writer.getCharacterData().then(charData => {
        if (!isCancelled && charData && Array.isArray(charData.strokes)) {
          setTotalCharStrokes(charData.strokes.length);
        }
      }).catch(() => {});

      startQuiz(0);
    } catch (err) {
      console.warn(`[KanjiWritingCanvas] Error initializing HanziWriter for '${kanjiChar}':`, err);
      setIsLoading(false);
      setHasStrokeData(false);
    }

    return () => {
      isCancelled = true;
      if (writerRef.current) {
        try {
          writerRef.current.cancelQuiz();
        } catch {
          // ignore
        }
      }
      if (writerContainerRef.current) {
        writerContainerRef.current.innerHTML = '';
      }
    };
  }, [kanjiChar, currentSheet, canvasSize, isLightMode, effectiveLeniency, effectiveDistanceThreshold]);

  // Sync watermark outline visibility
  useEffect(() => {
    if (writerRef.current && hasStrokeData) {
      try {
        if (showGuide) {
          writerRef.current.showOutline();
        } else {
          writerRef.current.hideOutline();
        }
      } catch {
        // ignore
      }
    }
  }, [showGuide, hasStrokeData]);

  const startQuiz = (startStroke = currentStrokeIndex) => {
    if (!writerRef.current) return;
    setIsQuizComplete(false);

    try {
      attachMaruHandler(writerRef.current, kanjiChar);

      const quizPromise = writerRef.current.quiz({
        leniency: effectiveLeniency,
        averageDistanceThreshold: effectiveDistanceThreshold,
        quizStartStrokeNum: startStroke,
        acceptBackwardsStrokes: isKana,
        showHintAfterMisses: 2,
        onMistake: () => {
          setMistakesCount(prev => prev + 1);
        },
        onCorrectStroke: (strokeData: any) => {
          const nextStroke = (strokeData.strokeNum ?? 0) + 1;
          setCurrentStrokeIndex(nextStroke);
        },
        onComplete: () => {
          setIsQuizComplete(true);
          setIsTimerRunning(false); // Stop stopwatch for this canvas immediately
          setCurrentStrokeIndex(totalCharStrokes || strokeCount || 0);
          playSound('fanfare', soundEnabled);

          // Guarantee reward & study stats recording immediately upon completing strokes
          if (!hasRewardedRef.current[currentSheet]) {
            hasRewardedRef.current[currentSheet] = true;
            setCompletedSheets(prev => prev.includes(currentSheet) ? prev : [...prev, currentSheet]);
            const score = Math.max(0, 100 - (mistakesCount * 15));
            const baseExp = getKanjiBaseExp({
              character: kanjiChar,
              strokeCount: totalCharStrokes || strokeCount,
              jlpt: level,
            });
            const reward = calculateWritingReward({
              baseExp,
              mistakesCount,
              watermarkUsed: watermarkEverUsed || showGuide,
              animationCount,
              elapsedSeconds,
              strokeCount: totalCharStrokes || strokeCount,
            });
            setLastReward(reward);
            onCompleteSheet?.(currentSheet, score, reward);
            if (score >= 60) {
              sendScoreEvent('kanji_write', `${kanjiChar}_sheet_${currentSheet}`, true);
            }
          }
        }
      });

      if (quizPromise && typeof quizPromise.then === 'function') {
        quizPromise.then(() => {
          attachMaruHandler(writerRef.current, kanjiChar);
        });
      }
    } catch {
      // ignore
    }
  };

  // Progressive Stroke Memory: Animate only the remaining uncompleted strokes!
  const animateOrder = () => {
    if (!writerRef.current || isAnimating) return;
    setAnimationCount(prev => prev + 1);
    try {
      setIsAnimating(true);
      writerRef.current.cancelQuiz();

      const fromStroke = currentStrokeIndex;
      const total = totalCharStrokes || strokeCount || 8;

      if (fromStroke === 0) {
        // Full character animation from stroke 0
        writerRef.current.animateCharacter({
          onComplete: () => {
            setIsAnimating(false);
            if (!isQuizComplete) {
              startQuiz(0);
            }
          }
        });
      } else {
        // Animate ONLY remaining strokes from currentStrokeIndex to end!
        let currentS = fromStroke;
        const playNext = () => {
          if (currentS >= total || !writerRef.current) {
            setIsAnimating(false);
            if (!isQuizComplete) {
              // Seamlessly resume quiz right where user left off
              startQuiz(fromStroke);
            }
            return;
          }
          writerRef.current.animateStroke(currentS, {
            onComplete: () => {
              currentS++;
              playNext();
            }
          });
        };
        playNext();
      }
    } catch {
      setIsAnimating(false);
      startQuiz(currentStrokeIndex);
    }
  };

  const clearCanvas = () => {
    playSound('click', soundEnabled);
    setShowDetailReview(false);
    hasRewardedRef.current[currentSheet] = false;
    setCompletedSheets(prev => prev.filter(s => s !== currentSheet));
    setCurrentStrokeIndex(0);
    setMistakesCount(0);
    setIsQuizComplete(false);
    setElapsedSeconds(0); // Reset stopwatch whenever Kanji is repeated
    setIsTimerRunning(true);
    setWatermarkEverUsed(false);
    setAnimationCount(0);
    setLastReward(null);

    if (!hasStrokeData && fallbackCanvasRef.current) {
      const ctx = fallbackCanvasRef.current.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, fallbackCanvasRef.current.width, fallbackCanvasRef.current.height);
      return;
    }

    if (writerRef.current) {
      setTimeout(() => {
        if (writerRef.current) {
          try {
            writerRef.current.cancelQuiz();
            writerRef.current.showOutline();
            writerRef.current.hideCharacter();
            startQuiz(0);
          } catch (err) {
            console.warn('Canvas reset error:', err);
          }
        }
      }, 16);
    }
  };

  const completeCurrentSheet = () => {
    const isAlreadyCompleted = completedSheets.includes(currentSheet);

    // If already scored and on the final sheet, clicking "Selesai" finishes
    if (completedSheets.includes(currentSheet) && currentSheet >= totalSheets) {
      playSound('fanfare', soundEnabled);
      setIsTimerRunning(false);
      if (effectiveShowCompletionDetail) {
        setShowDetailReview(true);
      } else {
        onFinish?.(lastReward || undefined);
        onComplete?.();
      }
      return;
    }

    // If already completed and not final sheet, advance to next sheet
    if (isAlreadyCompleted && currentSheet < totalSheets) {
      playSound('click', soundEnabled);
      setCurrentSheet(prev => prev + 1);
      setIsQuizComplete(false);
      setElapsedSeconds(0);
      setIsTimerRunning(true);
      setWatermarkEverUsed(false);
      setAnimationCount(0);
      if (!hasStrokeData && fallbackCanvasRef.current) {
        const ctx = fallbackCanvasRef.current.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, fallbackCanvasRef.current.width, fallbackCanvasRef.current.height);
      }
      return;
    }

    // If not completed yet and quiz is not completed, cannot save
    if (!isQuizComplete && !hasRewardedRef.current[currentSheet]) return;

    if (!hasRewardedRef.current[currentSheet]) {
      hasRewardedRef.current[currentSheet] = true;
      playSound('correct', soundEnabled);
      const updated = [...completedSheets, currentSheet];
      setCompletedSheets(updated);
      const score = Math.max(0, 100 - (mistakesCount * 15));

      // Dynamic EXP Calculation
      const baseExp = getKanjiBaseExp({
        character: kanjiChar,
        strokeCount: totalCharStrokes || strokeCount,
        jlpt: level,
      });

      const reward = calculateWritingReward({
        baseExp,
        mistakesCount,
        watermarkUsed: watermarkEverUsed || showGuide,
        animationCount,
        elapsedSeconds,
        strokeCount: totalCharStrokes || strokeCount,
      });
      setLastReward(reward);
      onCompleteSheet?.(currentSheet, score, reward);

      if (score >= 60) {
        sendScoreEvent('kanji_write', `${kanjiChar}_sheet_${currentSheet}`, true);
      }
    }

    // If on Sheet 1〜(totalSheets - 1), advance to next sheet
    if (currentSheet < totalSheets) {
      setCurrentSheet(prev => prev + 1);
      setIsQuizComplete(false);
      setElapsedSeconds(0);
      setIsTimerRunning(true);
      setMistakesCount(0);
      setWatermarkEverUsed(false);
      setAnimationCount(0);
      if (!hasStrokeData && fallbackCanvasRef.current) {
        const ctx = fallbackCanvasRef.current.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, fallbackCanvasRef.current.width, fallbackCanvasRef.current.height);
      }
    } else {
      // Finished all sheets (or single sheet in sandbox mode)
      playSound('fanfare', soundEnabled);
      setIsTimerRunning(false);
      if (effectiveShowCompletionDetail) {
        setShowDetailReview(true);
      } else {
        onFinish?.(lastReward || undefined);
        onComplete?.();
      }
    }
  };

  const handleProceedNext = () => {
    playSound('click', soundEnabled);
    onFinish?.(lastReward || undefined);
    onComplete?.();
  };

  // Fallback drawing handlers (only active when CDN has no stroke order data, e.g. rare characters/kana)
  const startFallbackDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!fallbackCanvasRef.current) return;
    isDrawingFallbackRef.current = true;
    const canvas = fallbackCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const moveFallbackDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingFallbackRef.current || !fallbackCanvasRef.current) return;
    const canvas = fallbackCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = isLightMode ? '#262420' : '#f8fafc';
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    if (!isQuizComplete) {
      setIsQuizComplete(true);
      setIsTimerRunning(false);
    }
  };

  const stopFallbackDraw = () => {
    isDrawingFallbackRef.current = false;
  };

  return (
    <div className={`flex flex-col items-center w-full max-w-lg mx-auto ${className}`}>
      {showDetailReview && (
        <div className="w-full max-w-lg mx-auto flex flex-col items-center animate-fade-in mb-3">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="w-full space-y-4 sm:space-y-5 text-left panel panel-stitched p-4 sm:p-6 rounded-3xl border border-border-subtle bg-surface-card shadow-xl"
        >
          {/* Top Meta Bar */}
          <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-border-subtle text-xs font-mono">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded-lg border font-bold ${
                isHiragana
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-border-subtle'
                  : isKatakana
                    ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-border-subtle'
                    : 'bg-surface-inset text-wine-accent border-border-subtle'
              }`}>
                {isHiragana ? 'Hiragana' : isKatakana ? 'Katakana' : `JLPT ${level || promptKanjiItem.jlpt || 'N5'} Kanji`}
              </span>
              <span className="px-2.5 py-0.5 rounded-lg bg-surface-inset text-text-secondary border border-border-subtle font-medium">
                {totalCharStrokes || strokeCount || 1} Goresan
              </span>
              {promptKanjiItem.radical && (
                <span className="px-2 py-0.5 rounded-lg bg-surface-inset text-text-muted border border-border-subtle font-jp text-[11px]">
                  {isKana ? 'Kategori: ' : '部首: '}{promptKanjiItem.radical}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="px-2.5 py-0.5 rounded-lg bg-surface-inset text-gold font-bold border border-border-subtle flex items-center gap-1.5 shadow-sm" title="Waktu Menulis">
                <Clock className="w-3.5 h-3.5 text-gold" />
                <span>{formatTime(elapsedSeconds)}</span>
              </span>
              {lastReward && (
                <span className="px-2.5 py-0.5 rounded-lg bg-surface-inset text-red-700 dark:text-amber-400 font-bold border border-border-subtle shadow-sm">
                  +{lastReward.expGained} EXP
                </span>
              )}
            </div>
          </div>

          {/* Hero Section: Giant Character & Readings */}
          <div className="flex flex-col sm:flex-row items-center gap-4 py-1">
            {/* Hanko Motif Giant Character Frame */}
            <div className="relative group w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-surface-inset border border-border-subtle flex items-center justify-center text-5xl sm:text-6xl font-bold text-wine-accent font-jp shadow-inner shrink-0 select-none">
              {kanjiChar}
              <button
                type="button"
                onClick={() => {
                  const toSpeak = cleanKunyomiList[0] || cleanOnyomiList[0] || kanjiChar;
                  speakJapanese(toSpeak);
                  playSound('click', soundEnabled);
                }}
                className="btn-physical-secondary absolute -bottom-2 -right-2 p-2 rounded-full hover:text-wine-accent transition-all cursor-pointer"
                title="Dengar pelafalan"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>

            {/* Readings list */}
            <div className="flex-1 w-full space-y-2 text-center sm:text-left">
              {isKana ? (
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider font-mono">
                    Pelafalan Romaji & Suara
                  </span>
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <span className="text-xl font-bold font-mono text-text-primary px-3 py-1 rounded-xl bg-surface-inset border border-border-subtle">
                      {effectiveRomaji}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        speakJapanese(kanjiChar);
                        playSound('click', soundEnabled);
                      }}
                      className="btn-physical-secondary px-3 py-1.5 rounded-xl text-wine-accent font-bold flex items-center gap-1.5 text-xs font-mono transition-colors"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Putar Audio</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                  {/* Onyomi */}
                  <div className="p-2.5 rounded-xl bg-surface-inset border border-border-subtle space-y-1">
                    <span className="text-[10px] font-bold text-wine-accent uppercase tracking-wider font-mono block">
                      音読み (Onyomi)
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {cleanOnyomiList.length > 0 ? (
                        cleanOnyomiList.map((on, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              speakJapanese(on.split(' ')[0]);
                              playSound('click', soundEnabled);
                            }}
                            className="px-2 py-0.5 rounded-lg bg-surface-card text-wine-accent border border-border-subtle font-bold hover:border-border-strong flex items-center gap-1 text-xs font-jp transition-colors cursor-pointer"
                            title="Klik untuk mendengar"
                          >
                            <span>{on}</span>
                            <Volume2 className="w-3 h-3 text-wine-accent/60" />
                          </button>
                        ))
                      ) : (
                        <span className="text-text-muted text-xs italic">-</span>
                      )}
                    </div>
                  </div>

                  {/* Kunyomi */}
                  <div className="p-2.5 rounded-xl bg-surface-inset border border-border-subtle space-y-1">
                    <span className="text-[10px] font-bold text-state-success uppercase tracking-wider font-mono block">
                      訓読み (Kunyomi)
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {cleanKunyomiList.length > 0 ? (
                        cleanKunyomiList.map((kun, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              speakJapanese(kun.replace(/[.-]/g, ''));
                              playSound('click', soundEnabled);
                            }}
                            className="px-2 py-0.5 rounded-lg bg-surface-card text-state-success border border-border-subtle font-bold hover:border-border-strong flex items-center gap-1 text-xs font-jp transition-colors cursor-pointer"
                            title="Klik untuk mendengar"
                          >
                            <span>{kun}</span>
                            <Volume2 className="w-3 h-3 text-state-success/60" />
                          </button>
                        ))
                      ) : (
                        <span className="text-text-muted text-xs italic">-</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Meaning Description Box */}
          <div className="space-y-1 bg-surface-inset p-3.5 rounded-2xl border border-border-subtle shadow-inner">
            <h3 className="text-base sm:text-lg font-bold font-heading text-text-primary">
              {effectiveMeaning || 'Karakter Jepang'}
            </h3>
            {dbItem?.meaningEn && (
              <p className="text-xs text-text-secondary">
                English: {dbItem.meaningEn}
                {dbItem.radicalName ? ` • Radikal: ${dbItem.radicalName}` : ''}
              </p>
            )}
          </div>

          {/* Related Words / Kosakata Terkait */}
          {effectiveRelatedWords && effectiveRelatedWords.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-wine-accent" /> Contoh Kosakata Terkait
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {effectiveRelatedWords.slice(0, 4).map((rw, i) => {
                  const { displayWord, displayReading } = normalizeWordAndReading(rw.word, rw.reading);
                  return (
                    <div
                      key={i}
                      onClick={() => {
                        speakJapanese(displayReading || displayWord);
                        playSound('click', soundEnabled);
                      }}
                      className="p-2.5 rounded-xl bg-surface-inset hover:bg-surface-elevated border border-border-subtle hover:border-border-primary transition-all cursor-pointer flex items-center justify-between gap-2 shadow-xs group"
                      title="Klik untuk mendengar pelafalan"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="font-bold font-jp text-sm text-text-primary flex items-center gap-1">
                          <RubyText
                            japanese={displayWord}
                            reading={displayReading}
                            showFurigana={true}
                            highlightKanji={kanjiChar}
                          />
                        </div>
                        <p className="text-[11px] text-text-secondary truncate">
                          {rw.meaningId}
                        </p>
                      </div>
                      <Volume2 className="w-3.5 h-3.5 text-text-muted group-hover:text-text-primary shrink-0 transition-colors" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Buttons: Ulangi Menulis & Lanjut ke Kanji Berikutnya */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2 w-full">
            <button
              type="button"
              onClick={clearCanvas}
              className="btn-physical-secondary flex-1 py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-wine-accent" />
              <span>Ulangi Menulis</span>
            </button>
            <button
              type="button"
              onClick={handleProceedNext}
              className="flex-1 btn btn-cta py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>{nextButtonLabel || (isKana ? 'Lanjut ke Aksara Berikutnya' : 'Lanjut ke Kanji Berikutnya')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {onCancel && (
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  playSound('click', soundEnabled);
                  onCancel();
                }}
                className="text-xs text-text-muted hover:text-text-primary underline underline-offset-2 font-bold transition-colors cursor-pointer"
              >
                Kembali ke Detail Materi
              </button>
            </div>
          )}
        </motion.div>
      </div>
    )}

    {/* Interactive Writing Canvas Container: preserved in DOM to prevent HanziWriter context loss */}
    <div className={`flex flex-col items-center w-full max-w-md mx-auto space-y-2 sm:space-y-3 ${showDetailReview ? 'hidden' : 'flex'}`}>
      {/* Compact Prompt & Yomikata Header */}
      {showPromptHeader && (
        <div className="w-full max-w-[320px] sm:max-w-[340px] flex flex-col items-center space-y-1.5 text-center">
          {/* Example Words / Compounds in Pure Hiragana: compact, sleek chips (NO KANJI SPOILER) */}
          {effectiveRelatedWords && effectiveRelatedWords.length > 0 ? (
            <div className={`w-full grid gap-1.5 ${
              effectiveRelatedWords.slice(0, 6).length === 1
                ? 'grid-cols-1 max-w-[180px]'
                : effectiveRelatedWords.slice(0, 6).length === 2
                  ? 'grid-cols-2'
                  : effectiveRelatedWords.slice(0, 6).length === 4
                    ? 'grid-cols-2'
                    : 'grid-cols-3'
            }`}>
              {effectiveRelatedWords.slice(0, 6).map((rw, i) => {
                const cleanAudioWord = rw.reading.replace(/[.-]/g, '').trim() || rw.word;
                return (
                  <div
                    key={i}
                    className="flex flex-col items-center justify-center py-1 px-1.5 rounded-xl bg-surface-card/80 hover:bg-surface-elevated border border-border-subtle hover:border-border-strong transition-all group cursor-pointer w-full text-center shadow-xs min-h-[42px]"
                    onClick={() => speakJapanese(cleanAudioWord)}
                    title={`Dengar pengucapan: ${rw.reading} - ${rw.meaningId}`}
                  >
                    <div className="flex items-center justify-center gap-1 w-full min-w-0">
                      <span className="text-xs sm:text-sm font-bold font-jp truncate">
                        {getHighlightedYomikata(rw.word, rw.reading, promptKanjiItem)}
                      </span>
                      <Volume2 className="w-3 h-3 text-text-muted opacity-40 group-hover:text-gold transition-opacity shrink-0" />
                    </div>
                    {rw.meaningId && (
                      <span className="text-[9px] text-text-secondary truncate w-full leading-tight mt-0.5 font-normal">
                        {rw.meaningId}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-card/80 hover:bg-surface-elevated border border-border-subtle hover:border-border-strong transition-all group cursor-pointer max-w-[200px]"
              onClick={() =>
                speakJapanese(
                  cleanKunyomiList[0] || cleanOnyomiList[0] || reading || (isKana ? kanjiChar : '')
                )
              }
              title="Klik untuk mendengar audio"
            >
              <div className="text-xs sm:text-sm font-bold font-jp text-text-primary flex items-center gap-1">
                <span>
                  {cleanKunyomiList[0] || cleanOnyomiList[0] || reading || (isKana ? kanjiChar : '')}
                </span>
                <Volume2 className="w-3 h-3 text-text-muted opacity-50 group-hover:text-gold transition-colors" />
              </div>
              {effectiveMeaning && (
                <span className="text-[10px] text-text-secondary truncate font-medium">
                  • {effectiveMeaning}
                </span>
              )}
            </div>
          )}

          {/* Clean, Unified Readings (ON/KUN) & Meaning in 1 Single Line */}
          <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-xs w-full py-0.5">
            {isKana ? (
              <div className="flex items-center gap-1">
                <span className="text-text-muted font-bold bg-surface-inset px-1.5 py-0.5 rounded text-[9px] font-mono border border-border-subtle">
                  ROMAJI
                </span>
                <span className="text-wine-accent font-mono font-bold text-xs tracking-wider">
                  {effectiveRomaji}
                </span>
              </div>
            ) : (
              <>
                {cleanOnyomiList.length > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-text-muted font-bold bg-surface-inset px-1.5 py-0.5 rounded text-[9px] font-mono border border-border-subtle">
                      ON
                    </span>
                    <span className="text-red-700 dark:text-amber-400 font-jp tracking-wider font-semibold text-xs">
                      {cleanOnyomiList.join(', ')}
                    </span>
                  </div>
                )}
                {cleanKunyomiList.length > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-text-muted font-bold bg-surface-inset px-1.5 py-0.5 rounded text-[9px] font-mono border border-border-subtle">
                      KUN
                    </span>
                    <span className="text-emerald-800 dark:text-emerald-400 font-jp tracking-wider font-semibold text-xs">
                      {cleanKunyomiList.join(', ')}
                    </span>
                  </div>
                )}
                {effectiveMeaning && (
                  <span className="text-[11px] text-text-secondary font-medium truncate max-w-[240px]">
                    • {effectiveMeaning}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Multi-Sheet Indicator Tabs (Only shown if totalSheets > 1) */}
      {totalSheets > 1 && (
        <div className="w-full max-w-[320px] sm:max-w-[340px]">
          <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
            <span className="font-bold text-text-primary font-heading text-[11px]">
              Sheet {currentSheet}/{totalSheets}
            </span>
            <span className="font-mono text-[11px]">{completedSheets.length} / {totalSheets} Selesai</span>
          </div>
          <div
            className="grid gap-1.5"
            style={{ gridTemplateColumns: `repeat(${totalSheets}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: totalSheets }, (_, i) => i + 1).map((sheetNum) => {
              const isCompleted = completedSheets.includes(sheetNum);
              const isCurrent = currentSheet === sheetNum;
              return (
                <button
                  key={sheetNum}
                  type="button"
                  onClick={() => {
                    if (currentSheet !== sheetNum) {
                      setCurrentSheet(sheetNum);
                      const alreadyDone = completedSheets.includes(sheetNum);
                      setIsQuizComplete(alreadyDone);
                      setElapsedSeconds(0);
                      setIsTimerRunning(!alreadyDone);
                      setMistakesCount(0);
                      setWatermarkEverUsed(false);
                      setAnimationCount(0);
                      playSound('click', soundEnabled);
                    }
                  }}
                  className={`py-1 rounded-lg text-xs font-bold transition-all ${
                    isCurrent
                      ? 'seg-active text-gold font-black scale-105'
                      : isCompleted
                        ? 'bg-surface-elevated text-wine-accent border border-border-subtle font-bold'
                        : 'bg-surface-inset text-text-muted hover:bg-surface-elevated'
                  }`}
                >
                  #{sheetNum}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Canvas Top Bar / Stopwatch, Mistakes & Watermark Guide Toggle */}
      <div className="flex items-center justify-between w-full max-w-[320px] sm:max-w-[340px] px-1 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          {showStopwatch && (
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-surface-inset border border-border-subtle flex items-center gap-1 shadow-sm transition-opacity ${
                isLoading ? 'text-text-muted opacity-60' : 'text-text-primary'
              }`}
              title={isLoading ? 'Menyiapkan karakter...' : `Stopwatch (${isTimerRunning ? 'Berjalan' : 'Selesai'})`}
            >
              <Clock className={`w-3 h-3 ${isLoading ? 'text-text-muted' : 'text-gold'}`} />
              <span>{formatTime(elapsedSeconds)}</span>
              {totalSheets > 1 && (
                <span className="text-[9px] text-text-muted font-normal">/kanvas #{currentSheet}</span>
              )}
            </span>
          )}
          {isQuizComplete && lastReward ? (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-surface-elevated text-gold border border-border-subtle font-mono animate-scale-up shadow-sm">
              +{lastReward.expGained} EXP!
            </span>
          ) : totalCharStrokes > 0 && !isQuizComplete ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-surface-inset border border-border-subtle text-text-primary">
              Goresan {Math.min(currentStrokeIndex + 1, totalCharStrokes)}/{totalCharStrokes}
            </span>
          ) : null}
          {mistakesCount > 0 && !isQuizComplete ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-inset text-rose-400 border border-border-subtle flex items-center gap-1 font-mono">
              Salah: {mistakesCount}
            </span>
          ) : !totalCharStrokes && !isQuizComplete ? (
            <span className="text-[11px] text-text-muted font-heading">
              Area Menulis
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all flex items-center gap-1.5 shadow-sm select-none cursor-pointer ${
              showGuide
                ? 'bg-surface-elevated text-wine-accent border border-border-subtle hover:bg-surface-card'
                : 'bg-surface-inset text-text-muted border border-border-subtle hover:bg-surface-elevated'
            }`}
            title="Tampilkan / Sembunyikan garis panduan karakter"
          >
            {showGuide ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            <span>{showGuide ? 'Watermark ON' : 'Watermark OFF'}</span>
          </button>
        </div>
      </div>

      {/* Interactive Writing Canvas with Japanese Grid */}
      <div className="relative w-full aspect-square max-w-[320px] sm:max-w-[340px] rounded-3xl overflow-hidden border border-border-subtle shadow-2xl bg-surface-inset touch-none">
        {/* Background Grid Canvas */}
        <canvas
          ref={gridCanvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />

        {/* HanziWriter SVG Container */}
        {hasStrokeData && (
          <div
            ref={writerContainerRef}
            className={`absolute inset-0 w-full h-full z-10 transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
          />
        )}

        {/* Fallback Canvas for Non-CJK/Kana Characters */}
        {!hasStrokeData && (
          <div className="absolute inset-0 z-10">
            {showGuide && (
              <div className={`absolute inset-0 flex pointer-events-none select-none text-text-primary/20 font-jp font-bold ${
                isSmall
                  ? 'items-end justify-start p-8 text-7xl'
                  : 'items-center justify-center text-9xl'
              }`}>
                {kanjiChar}
              </div>
            )}
            <canvas
              ref={fallbackCanvasRef}
              width={canvasSize}
              height={canvasSize}
              onMouseDown={startFallbackDraw}
              onMouseMove={moveFallbackDraw}
              onMouseUp={stopFallbackDraw}
              onMouseLeave={stopFallbackDraw}
              onTouchStart={startFallbackDraw}
              onTouchMove={moveFallbackDraw}
              onTouchEnd={stopFallbackDraw}
              className="absolute inset-0 w-full h-full cursor-crosshair"
            />
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-surface-card/80 rounded-3xl">
            <Loader2 className="w-8 h-8 text-wine-accent animate-spin mb-2" />
            <span className="text-xs font-bold text-wine-accent font-heading tracking-widest animate-pulse">Menyiapkan Karakter...</span>
          </div>
        )}
      </div>

      {/* Action Controls: Compact Unified 3-Button Dock */}
      <div className="grid grid-cols-3 gap-2 w-full max-w-[320px] sm:max-w-[340px]">
        {/* Button 1: Animasi */}
        <button
          type="button"
          onClick={animateOrder}
          disabled={isAnimating || !hasStrokeData}
          className="btn-physical-secondary py-2.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 whitespace-nowrap select-none cursor-pointer"
          title="Tampilkan animasi goresan"
        >
          <PlayCircle className="w-4 h-4 text-wine-accent shrink-0" />
          <span>Animasi</span>
        </button>

        {/* Button 2: Ulangi */}
        <button
          type="button"
          onClick={clearCanvas}
          className="btn-physical-secondary py-2.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap select-none cursor-pointer"
          title="Bersihkan kanvas untuk menulis ulang"
        >
          <RotateCcw className="w-4 h-4 shrink-0" />
          <span>Ulangi</span>
        </button>

        {/* Button 3: Selesai / Next Sheet */}
        <button
          type="button"
          onClick={completeCurrentSheet}
          disabled={(!isQuizComplete && hasStrokeData) && !completedSheets.includes(currentSheet)}
          className={`py-2.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 select-none cursor-pointer ${
            isQuizComplete || completedSheets.includes(currentSheet) || !hasStrokeData
              ? 'btn-physical-primary font-black'
              : 'bg-surface-inset text-text-muted cursor-not-allowed border border-border-subtle'
          }`}
          title="Simpan dan selesaikan kanji ini"
        >
          <Check className="w-4 h-4 shrink-0 stroke-[3]" />
          <span className="truncate">
            {completedSheets.includes(currentSheet)
              ? currentSheet >= totalSheets
                ? 'Selesai'
                : `Next #${currentSheet + 1}`
              : totalSheets > 1
                ? `#${currentSheet}`
                : 'Selesai'}
          </span>
        </button>
      </div>
    </div>
    </div>
  );
};
