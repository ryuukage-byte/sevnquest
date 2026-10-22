/**
 * Mesin suara Jepang (Web Speech API) untuk seluruh aplikasi.
 *
 * Teks yang diucapkan selalu diturunkan dari teks + furigana yang tampil (speechText.ts), jadi suara tidak
 * pernah membaca kanji berbeda dari furigananya, dan tidak membaca romaji/terjemahan dalam kurung.
 *
 * Keandalan lintas perangkat:
 * - iOS Safari hanya mengizinkan ucapan pertama di dalam ketukan pengguna → speak() dipanggil sinkron bila
 *   tidak ada ucapan yang sedang berjalan (jeda hanya dipakai setelah cancel(), untuk bug Chrome).
 * - Daftar suara dimuat asinkron (Chrome/Android) → ditunggu sebentar sebelum memilih suara.
 * - Chrome memotong ucapan panjang (±15 dtk) → teks dipecah per kalimat.
 * - Sebagian Android tidak memanggil onend → batas waktu cadangan agar tombol tidak macet.
 * - Suara jaringan gagal (offline) → dicoba ulang sekali dengan suara lokal.
 * - Tidak ada suara Jepang / gagal → event `sevn-tts-issue` (ditampilkan App sebagai toast berisi panduan).
 */
import { resolveSpeechText, splitDialogue, type DialoguePart } from './speechText';

export interface SpeakOptions {
  /** Kecepatan dasar pemanggil (1 = normal); dikalikan preferensi kecepatan pengguna. */
  rate?: number;
  /** Furigana yang ditampilkan untuk `text`; ucapan disamakan dengannya. */
  reading?: string;
}

export type SpeechVoiceQuality = 'natural' | 'standard' | 'basic';

export interface JapaneseVoiceInfo {
  id: string;
  name: string;
  quality: SpeechVoiceQuality;
  local: boolean;
}

export type TtsEngine = 'auto' | 'device' | 'cloud';

export interface TtsPrefs {
  /** auto = suara perangkat, atau suara cloud bila perangkat tidak punya suara Jepang. */
  engine?: TtsEngine;
  /** voiceURI pilihan pengguna; kosong = otomatis (suara terbaik). */
  voiceId?: string;
  /** Pengali kecepatan 0,6–1,3. */
  rate?: number;
}

export type TtsIssueKind = 'unsupported' | 'no-voice' | 'failed';

const PREFS_KEY = 'sevnquest_tts_prefs_v1';
const VOICE_WAIT_MS = 1500;

function synth(): SpeechSynthesis | null {
  return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
}

// ---------------------------------------------------------------------------------------------
// Preferensi (per perangkat: daftar suara berbeda di tiap perangkat, jadi tidak ikut cloud save)
// ---------------------------------------------------------------------------------------------

export function getTtsPrefs(): TtsPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? (JSON.parse(raw) as TtsPrefs) : {};
  } catch {
    return {};
  }
}

export function setTtsPrefs(patch: Partial<TtsPrefs>): TtsPrefs {
  const next = { ...getTtsPrefs(), ...patch };
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  } catch {
    /* penyimpanan penuh/diblokir: preferensi berlaku sampai halaman dimuat ulang */
  }
  return next;
}

// ---------------------------------------------------------------------------------------------
// Suara
// ---------------------------------------------------------------------------------------------

let voices: SpeechSynthesisVoice[] = [];
const voiceListeners = new Set<() => void>();

function refreshVoices() {
  const s = synth();
  if (!s) return;
  try {
    voices = s.getVoices();
  } catch {
    voices = [];
  }
  voiceListeners.forEach((fn) => fn());
}

if (synth()) {
  refreshVoices();
  synth()!.addEventListener?.('voiceschanged', refreshVoices);
}

/** Berlangganan perubahan daftar suara (mengembalikan fungsi berhenti). */
export function onVoicesChanged(fn: () => void): () => void {
  voiceListeners.add(fn);
  return () => voiceListeners.delete(fn);
}

function isJapanese(v: SpeechSynthesisVoice): boolean {
  const lang = (v.lang || '').replace('_', '-').toLowerCase();
  return lang === 'ja' || lang.startsWith('ja-') || lang === 'jpn' || /japanese|日本語/i.test(v.name);
}

/** Skor kualitas: suara neural/natural > Google > Apple Enhanced/Premium > suara sistem lama > eSpeak. */
export function rankVoice(v: Pick<SpeechSynthesisVoice, 'name' | 'localService' | 'default'>): { score: number; quality: SpeechVoiceQuality } {
  const name = v.name || '';
  let score = 0;
  let quality: SpeechVoiceQuality = 'standard';
  if (/natural|neural/i.test(name)) { score = 100; quality = 'natural'; }
  else if (/google/i.test(name)) { score = 90; quality = 'natural'; }
  else if (/premium|enhanced|拡張|高品質|プレミアム/i.test(name)) { score = 85; quality = 'natural'; }
  else if (/kyoko|o-ren|otoya|hattori|sinji|nanami|keita|aoi|daichi|mayu|naoki|shiori/i.test(name)) score = 70;
  else if (/ja-jp-x-|日本語/i.test(name)) score = 65; // suara Google TTS Android
  else if (/haruka|ayumi|ichiro|sayaka/i.test(name)) score = 45; // suara desktop Windows lama
  else if (/espeak|mbrola/i.test(name)) { score = 5; quality = 'basic'; }
  else score = 40;
  if (/network/i.test(name)) score += 3;
  if (v.default) score += 1;
  return { score, quality };
}

function japaneseVoicesRanked(): SpeechSynthesisVoice[] {
  return voices.filter(isJapanese).sort((a, b) => rankVoice(b).score - rankVoice(a).score);
}

const MALE_VOICE = /keita|daichi|naoki|otoya|hattori|sinji|ichiro|takumi|male|男性/i;
const FEMALE_VOICE = /nanami|aoi|mayu|shiori|kyoko|o-ren|haruka|ayumi|sayaka|mizuki|google|female|女性/i;

interface VoicePlan {
  voice: SpeechSynthesisVoice | null;
  pitch: number;
}

/** Suara per pembicara dialog: suara pria/wanita berbeda bila tersedia, selain itu suara yang sama dengan nada berbeda. */
function voiceForSpeaker(speaker: DialoguePart['speaker'], base: SpeechSynthesisVoice | null): VoicePlan {
  if (speaker === 'narrator' || !base) return { voice: base, pitch: 1 };
  const ranked = japaneseVoicesRanked();
  const wantMale = speaker === 'male';
  const pattern = wantMale ? MALE_VOICE : FEMALE_VOICE;
  if (pattern.test(base.name)) return { voice: base, pitch: 1 };
  const other = ranked.find((v) => pattern.test(v.name));
  if (other) return { voice: other, pitch: 1 };
  return { voice: base, pitch: wantMale ? 0.8 : 1.15 };
}

export function listJapaneseVoices(): JapaneseVoiceInfo[] {
  return japaneseVoicesRanked().map((v) => ({
    id: v.voiceURI || v.name,
    name: v.name,
    quality: rankVoice(v).quality,
    local: v.localService,
  }));
}

export function hasJapaneseVoice(): boolean {
  return voices.some(isJapanese);
}

export function getSpeechSupport(): 'ok' | 'no-voice' | 'unsupported' {
  if (!synth()) return 'unsupported';
  return voices.length === 0 || hasJapaneseVoice() ? 'ok' : 'no-voice';
}

function pickVoice(): SpeechSynthesisVoice | null {
  const ranked = japaneseVoicesRanked();
  const wanted = getTtsPrefs().voiceId;
  if (wanted) {
    const chosen = ranked.find((v) => (v.voiceURI || v.name) === wanted);
    if (chosen) return chosen;
  }
  return ranked[0] ?? null;
}

let voicesReady: Promise<void> | null = null;
function waitForVoices(): Promise<void> {
  if (voices.length > 0) return Promise.resolve();
  if (!voicesReady) {
    voicesReady = new Promise((resolve) => {
      const started = Date.now();
      const poll = () => {
        refreshVoices();
        if (voices.length > 0 || Date.now() - started > VOICE_WAIT_MS) resolve();
        else window.setTimeout(poll, 150);
      };
      poll();
    });
  }
  return voicesReady;
}

// ---------------------------------------------------------------------------------------------
// Teks ucapan
// ---------------------------------------------------------------------------------------------

type HintsModule = typeof import('../data/speechHints');
let hintsModule: HintsModule | null = null;
let hintsLoading: Promise<void> | null = null;

function ensureHints() {
  if (hintsModule || hintsLoading) return;
  hintsLoading = import('../data/speechHints')
    .then((m) => { hintsModule = m; })
    .catch(() => { hintsLoading = null; });
}

// Muat sejak awal: modul ini hanya diimpor layar lazy, yang sudah menunggu data lengkap (termasuk petunjuk),
// jadi impor ini selesai sebelum ketukan pertama dan ucapan pertama sama dengan berikutnya.
ensureHints();

/** Teks yang benar-benar diucapkan untuk `text` dengan furigana `reading` (sama dengan yang tampil). */
export function speechTextFor(text: string, reading?: string): string {
  ensureHints();
  return resolveSpeechText(text, reading, hintsModule
    ? { hints: hintsModule.SPEECH_HINTS, isKnownPair: hintsModule.isKnownSpeechPair }
    : {});
}

/** Pecah teks panjang per kalimat (lalu per koma) agar tidak terpotong mesin TTS. */
export function splitForSpeech(text: string, maxLen = 110): string[] {
  const sentences = text.match(/[^。！？!?\n]+[。！？!?]*|[。！？!?]+/g) ?? [text];
  const chunks: string[] = [];
  for (const sentence of sentences) {
    const s = sentence.trim();
    if (!s) continue;
    if (s.length <= maxLen) { chunks.push(s); continue; }
    let buf = '';
    for (const part of s.match(/[^、，,]+[、，,]*/g) ?? [s]) {
      if (buf && (buf + part).length > maxLen) { chunks.push(buf); buf = ''; }
      buf += part;
      while (buf.length > maxLen) { chunks.push(buf.slice(0, maxLen)); buf = buf.slice(maxLen); }
    }
    if (buf) chunks.push(buf);
  }
  // Gabungkan potongan pendek berurutan agar intonasi tidak terputus-putus.
  const merged: string[] = [];
  for (const c of chunks) {
    if (merged.length > 0 && (merged[merged.length - 1] + c).length <= maxLen) merged[merged.length - 1] += c;
    else merged.push(c);
  }
  return merged;
}

// ---------------------------------------------------------------------------------------------
// Pemberitahuan masalah
// ---------------------------------------------------------------------------------------------

const ISSUE_MESSAGES: Record<TtsIssueKind, string> = {
  unsupported: 'Browser ini tidak mendukung suara (TTS). Gunakan Chrome, Edge, atau Safari versi terbaru.',
  'no-voice':
    'Suara bahasa Jepang belum terpasang. Android: Setelan → Text-to-speech → Google → pasang suara Jepang. ' +
    'iPhone: Setelan → Aksesibilitas → Konten Lisan → Suara → Jepang. Windows: Setelan → Waktu & Bahasa → Ucapan → tambah Jepang.',
  failed: 'Suara gagal diputar. Ketuk lagi, atau pilih suara lain di Menu → Audio & Suara.',
};
const reportedIssues = new Set<TtsIssueKind>();

function reportIssue(kind: TtsIssueKind, detail?: string) {
  if (typeof window === 'undefined' || reportedIssues.has(kind)) return;
  reportedIssues.add(kind);
  if (detail) console.warn('[TTS]', kind, detail);
  window.dispatchEvent(new CustomEvent('sevn-tts-issue', { detail: { kind, message: ISSUE_MESSAGES[kind] } }));
}

// ---------------------------------------------------------------------------------------------
// Suara cloud (opsional, /api/tts — suara neural Google bila server dikonfigurasi)
// ---------------------------------------------------------------------------------------------

type CloudState = 'unknown' | 'checking' | 'available' | 'unavailable';
const CLOUD_STATE_KEY = 'sevnquest_tts_cloud';
let cloudState: CloudState = (() => {
  try {
    const v = sessionStorage.getItem(CLOUD_STATE_KEY);
    return v === 'available' || v === 'unavailable' ? v : 'unknown';
  } catch {
    return 'unknown';
  }
})();
let cloudFailures = 0;
const cloudListeners = new Set<() => void>();

function setCloudState(next: CloudState) {
  cloudState = next;
  try {
    if (next === 'available' || next === 'unavailable') sessionStorage.setItem(CLOUD_STATE_KEY, next);
  } catch {
    /* abaikan */
  }
  cloudListeners.forEach((fn) => fn());
}

/** Periksa (sekali per sesi) apakah server menyediakan suara cloud. */
export function probeCloudTts(): Promise<boolean> {
  if (cloudState === 'available' || cloudState === 'unavailable') return Promise.resolve(cloudState === 'available');
  if (typeof fetch === 'undefined') return Promise.resolve(false);
  setCloudState('checking');
  return fetch('/api/tts?probe=1')
    .then((r) => r.ok)
    .catch(() => false)
    .then((ok) => {
      setCloudState(ok ? 'available' : 'unavailable');
      return ok;
    });
}

export function getCloudTtsState(): CloudState {
  return cloudState;
}

export function onCloudTtsChanged(fn: () => void): () => void {
  cloudListeners.add(fn);
  return () => cloudListeners.delete(fn);
}

function shouldUseCloud(): boolean {
  const engine = getTtsPrefs().engine ?? 'auto';
  if (engine === 'device' || cloudState !== 'available') return false;
  if (engine === 'cloud') return true;
  return !synth() || (voices.length > 0 && !hasJapaneseVoice());
}

// Satu elemen audio dipakai ulang: iOS hanya mengizinkan putar dari elemen yang sudah diputar di dalam ketukan.
let cloudAudio: HTMLAudioElement | null = null;

function cloudUrl(text: string, speaker: DialoguePart['speaker'], rate: number): string {
  const params = new URLSearchParams({ text, voice: speaker === 'male' ? 'male' : 'female', rate: rate.toFixed(2) });
  return `/api/tts?${params}`;
}

/** Putar potongan lewat suara cloud; false bila potongan pertama gagal (pemanggil memakai suara perangkat). */
function playCloud(chunks: { text: string; speaker: DialoguePart['speaker'] }[], rate: number, token: number): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof Audio === 'undefined') return resolve(false);
    cloudAudio ||= new Audio();
    const audio = cloudAudio;
    let index = 0;
    let anyPlayed = false;
    const next = () => {
      if (token !== currentToken || index >= chunks.length) return resolve(true);
      const { text, speaker } = chunks[index++];
      audio.onended = () => { anyPlayed = true; cloudFailures = 0; next(); };
      audio.onerror = () => {
        cloudFailures++;
        if (cloudFailures >= 2) setCloudState('unavailable');
        resolve(anyPlayed); // sebagian sudah terputar: jangan ulangi dengan suara perangkat
      };
      audio.src = cloudUrl(text, speaker, rate);
      audio.play().catch(() => {
        audio.onended = null;
        audio.onerror = null;
        resolve(anyPlayed);
      });
    };
    next();
  });
}

if (typeof window !== 'undefined' && (getTtsPrefs().engine ?? 'auto') !== 'device') {
  // Cek ketersediaan lebih awal agar ketukan pertama sudah tahu mesin mana yang dipakai.
  window.setTimeout(() => { void probeCloudTts(); }, 0);
}

// ---------------------------------------------------------------------------------------------
// Pemutaran
// ---------------------------------------------------------------------------------------------

let currentToken = 0;
// Chrome bisa membuang utterance yang sudah di-GC sebelum selesai bicara; simpan rujukannya.
const liveUtterances = new Set<SpeechSynthesisUtterance>();

interface SpeechChunk extends VoicePlan {
  text: string;
}

function speakChunks(chunks: SpeechChunk[], rate: number, token: number): Promise<void> {
  const s = synth()!;
  return new Promise((resolve) => {
    let index = 0;
    let retriedWithLocal = false;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      resolve();
    };

    const speakNext = (override?: SpeechSynthesisVoice) => {
      if (token !== currentToken) return finish();
      if (index >= chunks.length) return finish();
      const { text: chunk, voice: planned, pitch } = chunks[index];
      const useVoice = override ?? planned;
      const u = new SpeechSynthesisUtterance(chunk);
      u.lang = useVoice?.lang?.replace('_', '-') || 'ja-JP';
      if (useVoice) u.voice = useVoice;
      u.rate = rate;
      u.pitch = pitch;
      liveUtterances.add(u);

      let settled = false;
      let started = false;
      // Batas waktu cadangan bila onend tidak pernah dipanggil (sebagian Android/Chrome).
      const watchdog = window.setTimeout(() => done(true), Math.max(4000, (chunk.length * 320) / Math.max(rate, 0.5) + 3000));
      const silenceCheck = window.setTimeout(() => {
        if (!started && !settled && token === currentToken) reportIssue(hasJapaneseVoice() ? 'failed' : 'no-voice', 'utterance never started');
      }, 4000);
      function done(next: boolean) {
        if (settled) return;
        settled = true;
        window.clearTimeout(watchdog);
        window.clearTimeout(silenceCheck);
        liveUtterances.delete(u);
        if (!next) return finish();
        index++;
        speakNext(override);
      }

      u.onstart = () => { started = true; };
      u.onend = () => done(true);
      u.onerror = (event) => {
        const err = (event as SpeechSynthesisErrorEvent).error;
        if (err === 'interrupted' || err === 'canceled') return done(false);
        // Suara jaringan (Google/Microsoft online) gagal: coba sekali lagi dengan suara lokal.
        const local = japaneseVoicesRanked().find((v) => v.localService && v !== useVoice);
        if (!retriedWithLocal && local && token === currentToken) {
          retriedWithLocal = true;
          settled = true;
          window.clearTimeout(watchdog);
          window.clearTimeout(silenceCheck);
          liveUtterances.delete(u);
          speakNext(local);
          return;
        }
        // 'not-allowed' = putar otomatis tanpa ketukan pengguna diblokir browser: bukan kerusakan, tanpa toast.
        if (err !== 'not-allowed') reportIssue(hasJapaneseVoice() ? 'failed' : 'no-voice', err);
        done(false);
      };

      try {
        if (s.paused) s.resume();
        s.speak(u);
      } catch (err) {
        reportIssue('failed', String(err));
        done(false);
      }
    };

    speakNext();
  });
}

/**
 * Ucapkan teks Jepang. `options` boleh berupa angka (kecepatan, kompatibel lama) atau { rate, reading }.
 * Promise selesai saat ucapan berakhir, dihentikan, atau gagal (tidak pernah reject).
 */
export function speakJapanese(text: string, options?: number | SpeakOptions): Promise<void> {
  const opts: SpeakOptions = typeof options === 'number' ? { rate: options } : options ?? {};
  const s = synth();
  const spoken = speechTextFor(text ?? '', opts.reading);
  if (!spoken) return Promise.resolve();

  const token = ++currentToken;
  const prefs = getTtsPrefs();
  const rate = Math.min(2, Math.max(0.5, (opts.rate ?? 0.95) * (prefs.rate ?? 1)));
  const parts = splitDialogue(spoken);

  if (shouldUseCloud()) {
    if (s) s.cancel();
    const cloudChunks = parts.flatMap((part) => splitForSpeech(part.text).map((t) => ({ text: t, speaker: part.speaker })));
    // Dipanggil sinkron (masih di dalam ketukan) agar iOS mengizinkan audio.play().
    return playCloud(cloudChunks, rate, token).then((played) => {
      if (played || token !== currentToken || !s) return;
      return speakDevice(s, parts, rate, token);
    });
  }
  if (!s) {
    reportIssue('unsupported');
    return Promise.resolve();
  }
  return speakDevice(s, parts, rate, token);
}

function speakDevice(s: SpeechSynthesis, parts: DialoguePart[], rate: number, token: number): Promise<void> {
  const busy = s.speaking || s.pending;
  s.cancel();

  const run = () => {
    if (token !== currentToken) return Promise.resolve();
    if (voices.length > 0 && !hasJapaneseVoice()) {
      // Daftar suara baru selesai dimuat dan tidak ada suara Jepang: pakai suara cloud bila tersedia.
      if (shouldUseCloud()) {
        const cloudChunks = parts.flatMap((part) => splitForSpeech(part.text).map((t) => ({ text: t, speaker: part.speaker })));
        return playCloud(cloudChunks, rate, token).then((played) => { if (!played) reportIssue('no-voice'); });
      }
      reportIssue('no-voice');
    }
    const base = pickVoice();
    const chunks: SpeechChunk[] = parts.flatMap((part) => {
      const plan = voiceForSpeaker(part.speaker, base);
      return splitForSpeech(part.text).map((text) => ({ text, ...plan }));
    });
    return speakChunks(chunks, rate, token);
  };

  // Jalur cepat (sinkron, tetap di dalam ketukan pengguna — wajib untuk iOS): suara sudah dimuat & tidak ada
  // ucapan yang baru saja dibatalkan.
  if (voices.length > 0 && !busy) return run();
  // Chrome kerap mengabaikan speak() tepat setelah cancel(); daftar suara juga mungkin belum dimuat.
  return new Promise<void>((resolve) => {
    window.setTimeout(() => {
      waitForVoices().then(run).then(resolve, resolve);
    }, busy ? 60 : 0);
  });
}

export function stopSpeaking() {
  currentToken++;
  if (cloudAudio) {
    cloudAudio.onended = null;
    cloudAudio.onerror = null;
    cloudAudio.pause();
  }
  const s = synth();
  if (s) {
    try {
      s.cancel();
    } catch {
      /* abaikan */
    }
  }
}

// iOS/iPadOS: ucapan di luar ketukan (putar otomatis) diblokir sampai ada satu ucapan di dalam ketukan.
// Buka kuncinya dengan ucapan senyap pada sentuhan pertama.
function installIosUnlock() {
  const ua = navigator.userAgent || '';
  const isIos = /iP(hone|ad|od)/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (!isIos) return;
  const unlock = () => {
    const s = synth();
    if (s && !s.speaking) {
      try {
        const u = new SpeechSynthesisUtterance(' ');
        u.volume = 0;
        s.speak(u);
      } catch {
        /* abaikan */
      }
    }
    document.removeEventListener('touchend', unlock, true);
    document.removeEventListener('click', unlock, true);
  };
  document.addEventListener('touchend', unlock, true);
  document.addEventListener('click', unlock, true);
}

// Ucapan yang tertinggal saat tab disembunyikan terus berbunyi di sebagian Android; hentikan.
if (typeof document !== 'undefined' && synth()) {
  installIosUnlock();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') stopSpeaking();
  });
}
