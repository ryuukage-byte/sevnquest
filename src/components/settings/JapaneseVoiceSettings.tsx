import React, { useEffect, useState } from 'react';
import { Volume2, AlertTriangle, Sparkles } from 'lucide-react';
import {
  getSpeechSupport,
  getTtsPrefs,
  listJapaneseVoices,
  onVoicesChanged,
  setTtsPrefs,
  speakJapanese,
  type JapaneseVoiceInfo,
} from '../../utils/speech';

const SAMPLE = { text: '今日も一緒に日本語を勉強しましょう。', reading: 'きょうもいっしょににほんごをべんきょうしましょう。' };

const QUALITY_LABEL: Record<JapaneseVoiceInfo['quality'], string> = {
  natural: 'Natural',
  standard: 'Standar',
  basic: 'Robotik',
};

/** Pilihan suara Jepang (per perangkat): suara natural diurutkan paling atas, kecepatan, dan uji suara. */
export const JapaneseVoiceSettings: React.FC = () => {
  const [voices, setVoices] = useState<JapaneseVoiceInfo[]>(() => listJapaneseVoices());
  const [support, setSupport] = useState(() => getSpeechSupport());
  const [prefs, setPrefs] = useState(() => getTtsPrefs());

  useEffect(() => {
    const update = () => {
      setVoices(listJapaneseVoices());
      setSupport(getSpeechSupport());
    };
    update();
    return onVoicesChanged(update);
  }, []);

  const best = voices[0];
  const selected = voices.find(v => v.id === prefs.voiceId);
  const rate = prefs.rate ?? 1;

  const test = () => speakJapanese(SAMPLE.text, { reading: SAMPLE.reading });

  return (
    <div className="pt-3 border-t border-border-subtle space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="text-xs sm:text-sm font-bold text-text-primary font-heading">Suara Jepang (TTS)</h4>
          <p className="text-xs text-text-secondary">
            Suara dibaca sesuai furigana yang tampil. Pilihan suara tersimpan di perangkat ini.
          </p>
        </div>
        <button onClick={test} className="btn btn-pill text-xs gap-2 self-start sm:self-auto text-indigo">
          <Volume2 className="w-4 h-4" />
          <span>Uji Suara</span>
        </button>
      </div>

      {support === 'unsupported' && (
        <p className="text-xs text-wine-accent flex gap-1.5">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Browser ini tidak mendukung suara. Gunakan Chrome, Edge, atau Safari versi terbaru.
        </p>
      )}
      {support === 'no-voice' && (
        <div className="text-xs text-wine-accent space-y-1">
          <p className="flex gap-1.5 font-bold"><AlertTriangle className="w-4 h-4 shrink-0" /> Suara bahasa Jepang belum terpasang di perangkat ini.</p>
          <ul className="list-disc pl-6 text-text-secondary space-y-0.5">
            <li>Android: Setelan → Text-to-speech → Mesin Google → Pasang data suara → Jepang.</li>
            <li>iPhone/iPad: Setelan → Aksesibilitas → Konten Lisan → Suara → Jepang (pilih yang “Ditingkatkan”).</li>
            <li>Windows: Setelan → Waktu &amp; Bahasa → Ucapan → Tambahkan suara → Jepang. Microsoft Edge punya suara “Natural” bawaan.</li>
          </ul>
        </div>
      )}

      {voices.length > 0 && (
        <>
          {best && best.quality !== 'natural' && (
            <p className="text-[11px] text-text-secondary flex gap-1.5">
              <Sparkles className="w-3.5 h-3.5 shrink-0 text-gold" />
              Untuk suara paling natural: pakai Microsoft Edge (suara “Natural”), Google Chrome (“Google 日本語”), atau di
              iPhone unduh suara Jepang “Ditingkatkan/Premium”.
            </p>
          )}
          <label className="block space-y-1">
            <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider font-mono">Suara</span>
            <select
              value={selected ? selected.id : ''}
              onChange={e => setPrefs(setTtsPrefs({ voiceId: e.target.value || undefined }))}
              className="w-full rounded-xl bg-surface-inset border border-border-subtle px-3 py-2 text-xs text-text-primary"
            >
              <option value="">Otomatis — {best ? `${best.name} (${QUALITY_LABEL[best.quality]})` : 'suara terbaik'}</option>
              {voices.map(v => (
                <option key={v.id} value={v.id}>
                  {v.name} · {QUALITY_LABEL[v.quality]}{v.local ? '' : ' · online'}
                </option>
              ))}
            </select>
          </label>
        </>
      )}

      <label className="block space-y-1">
        <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wider font-mono">
          Kecepatan bicara: {rate.toFixed(2)}×
        </span>
        <input
          type="range"
          min={0.6}
          max={1.3}
          step={0.05}
          value={rate}
          onChange={e => setPrefs(setTtsPrefs({ rate: Number(e.target.value) }))}
          className="w-full accent-[var(--color-gold,#d4a73b)]"
        />
      </label>
    </div>
  );
};
