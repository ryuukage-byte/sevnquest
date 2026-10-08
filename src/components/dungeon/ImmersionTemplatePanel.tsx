import React, { useMemo, useState } from 'react';
import { Check, ClipboardCopy, Upload } from 'lucide-react';
import {
  buildImmersionPrompt,
  mergeWordTimings,
  parseImmersionTemplate,
  type ImmersionTemplate,
} from '../../engine/textStudy/immersionTemplate';
import type { CaptionLineInput } from '../../engine/textStudy/captionAnalysis';

interface Props {
  /** ID video yang sedang dibuka (null bila belum ada). */
  videoId: string | null;
  /** Subtitle YouTube yang sudah terambil; dimasukkan ke prompt agar AI tidak mengarang waktu. */
  fetchedLines: CaptionLineInput[] | null;
  onLoad: (template: ImmersionTemplate) => void;
}

type Notice = { kind: 'ok' | 'error'; text: string } | null;

export const ImmersionTemplatePanel: React.FC<Props> = ({ videoId, fetchedLines, onLoad }) => {
  const [json, setJson] = useState('');
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const prompt = useMemo(() => (videoId ? buildImmersionPrompt(videoId, fetchedLines ?? undefined) : ''), [videoId, fetchedLines]);

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard diblokir (mis. http biasa): biarkan pengguna menyalin manual dari kotak prompt.
      setNotice({ kind: 'error', text: 'Gagal menyalin otomatis. Pilih teks prompt di atas lalu salin manual.' });
    }
  };

  const load = () => {
    const result = parseImmersionTemplate(json, videoId ?? undefined);
    if (!result.ok) {
      setNotice({ kind: 'error', text: result.error });
      return;
    }
    const template = fetchedLines ? mergeWordTimings(result.template, fetchedLines) : result.template;
    const withTranslation = template.lines.filter(l => l.translation).length;
    onLoad(template);
    setNotice({
      kind: 'ok',
      text: `Dimuat ${template.lines.length} baris, ${withTranslation} berterjemahan${result.dropped > 0 ? `, ${result.dropped} baris rusak dilewati` : ''}.`,
    });
  };

  return (
    <div className="bg-surface-inset border border-border-subtle rounded-2xl shadow-inner p-4 space-y-4">
      <div className="space-y-2">
        <div className="text-xs font-heading font-bold text-text-primary">1. Salin prompt, tempel ke AI pilihanmu</div>
        {videoId ? (
          <>
            <textarea
              readOnly
              value={prompt}
              rows={5}
              onFocus={e => e.currentTarget.select()}
              className="w-full px-3 py-2 bg-surface-card border border-border-subtle rounded-xl text-[11px] font-mono text-text-secondary leading-relaxed resize-y"
            />
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={copyPrompt} className="btn-physical-secondary flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-heading font-bold cursor-pointer">
                {copied ? <Check className="w-4 h-4" /> : <ClipboardCopy className="w-4 h-4" />}
                <span>{copied ? 'Tersalin' : 'Salin prompt'}</span>
              </button>
              <p className="text-[11px] text-text-muted flex-1 min-w-48 leading-relaxed">
                {fetchedLines
                  ? 'Prompt memuat subtitle yang sudah terambil, jadi AI hanya menerjemahkan dan memperbaiki teks. Waktunya dikunci.'
                  : 'Belum ada subtitle: AI diminta membuatnya sendiri. Ini hanya berhasil dengan AI yang benar-benar bisa membuka isi video, dan waktunya perkiraan.'}
              </p>
            </div>
          </>
        ) : (
          <p className="text-[11px] text-text-muted">Tempel link video di atas lebih dulu supaya prompt-nya bisa dibuat. Atau langsung tempel JSON yang sudah kamu punya di bawah.</p>
        )}
      </div>

      <div className="space-y-2">
        <div className="text-xs font-heading font-bold text-text-primary">2. Tempel JSON hasil AI, lalu jalankan</div>
        <textarea
          value={json}
          onChange={e => {
            setJson(e.target.value);
            setNotice(null);
          }}
          rows={5}
          placeholder='{ "schema": "sevnquest.immersion.v1", "videoId": "…", "lines": [ … ] }'
          className="w-full px-3 py-2 bg-surface-card border border-border-subtle rounded-xl text-[11px] font-mono text-text-primary placeholder:text-text-muted focus:outline-hidden focus:border-border-primary resize-y"
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!json.trim()}
            onClick={load}
            className="btn-physical-primary flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-heading font-black cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-4 h-4" />
            <span>Jalankan JSON</span>
          </button>
          {notice && <p className={`text-xs font-medium ${notice.kind === 'ok' ? 'text-text-secondary' : 'text-crimson'}`}>{notice.text}</p>}
        </div>
      </div>
    </div>
  );
};
