// Audio Utility for Sound FX and Japanese TTS Speech Synthesis

let audioCtx: AudioContext | null = null;
let masterCompressor: DynamicsCompressorNode | null = null;
let cachedNoiseBuffer: AudioBuffer | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function getMasterOutput(ctx: AudioContext): AudioNode {
  if (!masterCompressor) {
    masterCompressor = ctx.createDynamicsCompressor();
    masterCompressor.threshold.setValueAtTime(-16, ctx.currentTime);
    masterCompressor.knee.setValueAtTime(24, ctx.currentTime);
    masterCompressor.ratio.setValueAtTime(8, ctx.currentTime);
    masterCompressor.attack.setValueAtTime(0.003, ctx.currentTime);
    masterCompressor.release.setValueAtTime(0.2, ctx.currentTime);
    masterCompressor.connect(ctx.destination);
  }
  return masterCompressor;
}

// Generate smoothed pink-ish noise buffer for organic swooshes (bamboo / air)
function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (cachedNoiseBuffer && cachedNoiseBuffer.sampleRate === ctx.sampleRate) {
    return cachedNoiseBuffer;
  }
  const length = Math.floor(ctx.sampleRate * 0.25);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    data[i] = (b0 + b1 + b2) * 0.3;
  }
  cachedNoiseBuffer = buffer;
  return buffer;
}

export type SoundType =
  | 'correct'
  | 'wrong'
  | 'levelup'
  | 'levelUp'
  | 'level_up'
  | 'click'
  | 'coin'
  | 'attack'
  | 'fanfare'
  | 'victory'
  | 'open_modal'
  | 'start_game'
  | 'game_over';

export function playSound(type: SoundType, soundEnabled: boolean = true) {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Normalize sound alias
    const normalizedType =
      type === 'victory' || type === 'game_over' ? 'fanfare' :
      type === 'start_game' ? 'attack' :
      (type === 'levelUp' || type === 'level_up') ? 'levelup' : type;

    const now = ctx.currentTime;
    const master = getMasterOutput(ctx);

    if (normalizedType === 'click') {
      // Gentle wooden haptic tap (Mokugyo / pebble tap) - zero harsh highs
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(480, now);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(210, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.025);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.05, now + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.028);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(master);

      osc.start(now);
      osc.stop(now + 0.03);
    } else if (normalizedType === 'correct') {
      // Warm Zen Singing Bowl / Bronze Bell (Rin) chime
      // Fundamental (D5) + subtle harmonic overtone (A5) with smooth attack and long warm decay
      const tones = [
        { freq: 587.33, gainVal: 0.06, decay: 0.75 }, // D5
        { freq: 880.00, gainVal: 0.025, decay: 0.45 }, // A5
        { freq: 1174.66, gainVal: 0.012, decay: 0.30 }, // D6
      ];

      tones.forEach(({ freq, gainVal, decay }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1400, now);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(gainVal, now + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + decay);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(master);

        osc.start(now);
        osc.stop(now + decay);
      });
    } else if (normalizedType === 'wrong') {
      // Soft muted wooden drum tap (tatami / low taiko rim) - warm & non-punitive
      const subTones = [
        { delay: 0.0, startFreq: 140, endFreq: 95, duration: 0.1 },
        { delay: 0.05, startFreq: 110, endFreq: 80, duration: 0.08 },
      ];

      subTones.forEach(({ delay, startFreq, endFreq, duration }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(260, now + delay);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(startFreq, now + delay);
        osc.frequency.exponentialRampToValueAtTime(endFreq, now + delay + duration);

        gain.gain.setValueAtTime(0.0001, now + delay);
        gain.gain.linearRampToValueAtTime(0.06, now + delay + 0.004);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(master);

        osc.start(now + delay);
        osc.stop(now + delay + duration);
      });
    } else if (normalizedType === 'coin') {
      // Water droplet in garden stone basin (Suikinkutsu 水琴窟)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2000, now);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1180, now);
      osc.frequency.exponentialRampToValueAtTime(1420, now + 0.02);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.05, now + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(master);

      osc.start(now);
      osc.stop(now + 0.23);

      // Subtle high ripple overtone
      const ripple = ctx.createOscillator();
      const rippleGain = ctx.createGain();
      ripple.type = 'sine';
      ripple.frequency.setValueAtTime(1770, now + 0.015);
      rippleGain.gain.setValueAtTime(0.0001, now + 0.015);
      rippleGain.gain.linearRampToValueAtTime(0.018, now + 0.02);
      rippleGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
      ripple.connect(rippleGain);
      rippleGain.connect(master);
      ripple.start(now + 0.015);
      ripple.stop(now + 0.17);
    } else if (normalizedType === 'attack') {
      // Bamboo shinai / wooden sword swift air sweep (acoustic whoosh + soft wooden thud)
      const noiseBuffer = getNoiseBuffer(ctx);
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.Q.setValueAtTime(2.2, now);
      bandpass.frequency.setValueAtTime(1400, now);
      bandpass.frequency.exponentialRampToValueAtTime(320, now + 0.13);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.0001, now);
      noiseGain.gain.linearRampToValueAtTime(0.12, now + 0.015);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

      noiseSource.connect(bandpass);
      bandpass.connect(noiseGain);
      noiseGain.connect(master);

      noiseSource.start(now);
      noiseSource.stop(now + 0.15);

      // Soft wooden impact resonance
      const sub = ctx.createOscillator();
      const subGain = ctx.createGain();
      const subFilter = ctx.createBiquadFilter();
      subFilter.type = 'lowpass';
      subFilter.frequency.setValueAtTime(220, now + 0.04);

      sub.type = 'sine';
      sub.frequency.setValueAtTime(120, now + 0.04);
      sub.frequency.exponentialRampToValueAtTime(65, now + 0.12);

      subGain.gain.setValueAtTime(0.0001, now + 0.04);
      subGain.gain.linearRampToValueAtTime(0.06, now + 0.048);
      subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);

      sub.connect(subFilter);
      subFilter.connect(subGain);
      subGain.connect(master);

      sub.start(now + 0.04);
      sub.stop(now + 0.14);
    } else if (normalizedType === 'levelup' || normalizedType === 'fanfare') {
      // Japanese Pentatonic Temple Chimes (Fūrin 風鈴 wind chimes arpeggio)
      // D5, G5, A5, C6, D6 (Yo scale - ethereal, noble, calm)
      const notes = [587.33, 783.99, 880.00, 1046.50, 1174.66];
      notes.forEach((freq, idx) => {
        const noteStart = now + idx * 0.075;
        const decay = 0.65;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1900, noteStart);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0.0001, noteStart);
        gain.gain.linearRampToValueAtTime(0.04, noteStart + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + decay);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(master);

        osc.start(noteStart);
        osc.stop(noteStart + decay);
      });
    } else if (normalizedType === 'open_modal') {
      // Soft Washi sheet unfold / ambient warm breath
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(500, now);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(360, now + 0.08);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.035, now + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(master);

      osc.start(now);
      osc.stop(now + 0.12);
    }
  } catch (e) {
    console.warn('Audio play error', e);
  }
}

// Voice cache for SpeechSynthesis
let cachedVoices: SpeechSynthesisVoice[] = [];

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  cachedVoices = window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoices = window.speechSynthesis.getVoices();
  };
}

function getBestJapaneseVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
  const jaVoices = voices.filter(v => {
    const l = v.lang.replace('_', '-').toLowerCase();
    return l.startsWith('ja') || l.includes('ja-jp');
  });

  if (jaVoices.length === 0) return null;

  // 1. Highest priority: Online / Neural / Natural AI voices (e.g. Microsoft Nanami Natural, Google 日本語)
  const neuralVoice = jaVoices.find(v => 
    /natural|neural|online|google|premium|enhanced/i.test(v.name)
  );
  if (neuralVoice) return neuralVoice;

  // 2. High priority: Known high-quality Japanese voice models
  const qualityVoice = jaVoices.find(v =>
    /nanami|keita|kyoko|otoya|mei|sayaka|haruka|ayumi/i.test(v.name)
  );
  if (qualityVoice) return qualityVoice;

  // 3. Fallback to any Japanese voice
  return jaVoices[0];
}

// Chrome bisa membuang utterance yang sudah di-GC sebelum selesai bicara; simpan rujukannya.
let activeUtterance: SpeechSynthesisUtterance | null = null;

// Japanese Text-to-Speech using browser SpeechSynthesis
export function speakJapanese(text: string, rate: number = 0.95): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      resolve();
      return;
    }

    try {
      window.speechSynthesis.cancel(); // Stop any pending speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = rate;
      utterance.pitch = 1.0;

      // Select highest quality Neural/Natural voice available
      const jaVoice = getBestJapaneseVoice();
      if (jaVoice) {
        utterance.voice = jaVoice;
      }

      activeUtterance = utterance;

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();

      // Chrome sering membuang speak() yang dipanggil tepat setelah cancel(); beri jeda singkat.
      window.setTimeout(() => {
        // Sudah digantikan panggilan lain (soal berpindah / tombol ditekan lagi) atau dihentikan:
        // jangan putar teks lama, kalau tidak suara soal sebelumnya muncul di soal yang baru.
        if (activeUtterance !== utterance) {
          resolve();
          return;
        }
        try {
          window.speechSynthesis.resume();
          window.speechSynthesis.speak(utterance);
        } catch {
          resolve();
        }
      }, 80);
    } catch {
      resolve();
    }
  });
}

export function stopSpeaking() {
  activeUtterance = null; // batalkan utterance yang masih menunggu jeda sebelum speak()
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}
