import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import * as wanakana from 'wanakana';
import { X, ArrowDown, XCircle, CheckCircle2, FlaskConical } from 'lucide-react';
import { KOTOBA_DATABASE } from '../../data/kotoba';
import { searchJapanese } from '../../engine/search/universalSearch';
import { detectVerbGroup } from '../../engine/morphology/inflectionEngine';
import { JapaneseSearchInput } from '../common/JapaneseSearchInput';
import {
  CONJUGATION_FORMS_INFO,
  getTargetFormDisplay,
  tryKotobaWithForm,
} from '../../data/conjugationRules';
import { getWordTypeLabel } from '../../utils/wordType';
import { playSound } from '../../utils/audio';

interface ConjugationSandboxModalProps {
  formId: string;
  soundEnabled?: boolean;
  onClose: () => void;
}

const VERB_GROUP_SHORT = { godan: 'Godan', ichidan: 'Ichidan', suru: 'Irregular', kuru: 'Irregular' } as const;

const GROUP_LABEL = {
  godan: { name: 'Golongan 1 (Godan)', rule: 'godan' },
  ichidan: { name: 'Golongan 2 (Ichidan)', rule: 'ichidan' },
  suru: { name: 'Golongan 3 (Irregular)', rule: 'irregular' },
  kuru: { name: 'Golongan 3 (Irregular)', rule: 'irregular' },
} as const;

export const ConjugationSandboxModal: React.FC<ConjugationSandboxModalProps> = ({
  formId,
  soundEnabled = true,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  // Hanya ID kanonik yang disimpan; entitas selalu diambil dari KOTOBA_DATABASE.
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const formInfo = CONJUGATION_FORMS_INFO.find(f => f.id === formId);
  const display = getTargetFormDisplay(formId);

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    // Engine universal: romaji / kana / kanji / arti → entity Kotoba kanonik.
    return searchJapanese(q, { entityTypes: ['kotoba'], limit: 12 });
  }, [query]);

  const item = selectedId ? KOTOBA_DATABASE[selectedId] : null;
  const outcome = item ? tryKotobaWithForm(item, formId) : null;

  const handleClose = () => {
    playSound('click', soundEnabled);
    onClose();
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[80] flex items-center justify-center px-4 py-6 sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="fixed inset-0 bg-black/75" onClick={handleClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        role="dialog"
        aria-modal="true"
        aria-label="Coba dengan Kotoba"
        className="panel panel-stitched relative w-full max-w-lg border border-border-subtle rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border-subtle bg-surface-inset">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-gold shrink-0" />
              <h3 className="text-sm sm:text-base font-bold font-heading text-text-primary">Coba dengan Kotoba</h3>
            </div>
            <p className="text-[11px] font-mono text-text-muted mt-0.5 truncate">
              {display.badge} · {formInfo?.name || display.label}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="btn-physical-secondary p-1.5 rounded-xl"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {/* Pencarian Kotoba */}
          <div className="space-y-2">
            <JapaneseSearchInput
              value={query}
              onChange={setQuery}
              placeholderIme="Cari Kotoba (romaji → kana)..."
              placeholderLatin="Cari Kotoba: kanji, kana, romaji, arti"
              soundEnabled={soundEnabled}
              className="w-full"
              inputClassName="w-full pl-10 pr-20 py-2.5 bg-surface-inset border border-border-subtle rounded-2xl text-sm text-text-primary placeholder:text-text-muted focus:outline-hidden focus:border-border-primary transition-all shadow-inner font-medium font-jp"
              autoFocus
            />

            {results.length > 0 && (
              <ul className="max-h-44 overflow-y-auto rounded-2xl border border-border-subtle divide-y divide-border-subtle bg-surface-inset">
                {results.map(r => (
                  <li key={r.entityId}>
                    <button
                      type="button"
                      onClick={() => {
                        playSound('click', soundEnabled);
                        setSelectedId(r.entityId);
                        setQuery('');
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-surface-elevated/40 transition-colors flex items-center justify-between gap-2"
                    >
                      <span className="min-w-0">
                        <span className="text-sm font-bold font-heading text-text-primary">{r.primaryText}</span>
                        <span className="text-xs font-mono text-text-muted ml-2">{r.reading}</span>
                        <span className="block text-[11px] text-text-secondary truncate">{r.meaning}</span>
                      </span>
                      <span className="text-[10px] font-mono text-text-muted shrink-0">
                        {r.entityType === 'kotoba' && r.entity.wordType === 'verb'
                          ? `${VERB_GROUP_SHORT[detectVerbGroup(r.entity.word, r.entity.reading)]} · ${getWordTypeLabel('verb')}`
                          : r.entityType === 'kotoba' ? getWordTypeLabel(r.entity.wordType) : ''}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {query.trim() && results.length === 0 && (
              <p className="text-xs text-text-muted px-1">
                Tidak menemukan &quot;{query.trim()}&quot;. Coba tulis dengan romaji, kana, atau kanji.
              </p>
            )}
          </div>

          {!item && (
            <p className="text-xs text-text-secondary leading-relaxed">
              Pilih satu Kotoba untuk melihat apakah kata itu bisa memakai {display.badge}, dan bagaimana prosesnya.
              Mencoba di sini tidak mengubah EXP maupun mastery.
            </p>
          )}

          {item && outcome && (
            <div className="space-y-3">
              {/* Identitas */}
              <div className="p-3.5 rounded-2xl bg-surface-inset border border-border-subtle shadow-inner space-y-0.5">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-xl font-bold font-heading text-text-primary">{item.word}</span>
                  <span className="text-xs font-mono text-text-muted">
                    {item.reading || item.word} · {wanakana.toRomaji(item.reading || item.word)}
                  </span>
                </div>
                <p className="text-xs text-text-secondary">{item.meaningId}</p>
                <p className="text-[11px] font-mono text-text-muted">
                  {getWordTypeLabel(item.wordType)}
                  {outcome.valid && ` · ${GROUP_LABEL[outcome.explanation.group].name}`}
                </p>
              </div>

              {outcome.valid ? (
                <>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-state-success font-heading">
                    <CheckCircle2 className="w-4 h-4" /> Bisa memakai {display.badge}
                  </div>

                  {/* Proses */}
                  <ol className="p-3.5 rounded-2xl bg-surface-inset border border-border-subtle shadow-inner space-y-1.5 font-mono text-sm">
                    {outcome.explanation.steps.map((s, i) => (
                      <li key={i} className="space-y-1.5">
                        {i > 0 && (
                          <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
                            <ArrowDown className="w-3 h-3" />
                            {s.kind === 'remove' ? `buang 「${s.part}」` : `tambah 「${s.part}」`}
                          </div>
                        )}
                        <div className={i === outcome.explanation.steps.length - 1 ? 'text-gold font-bold' : 'text-text-primary'}>
                          {s.text || '∅'}
                        </div>
                      </li>
                    ))}
                  </ol>

                  {/* Hasil */}
                  <div className="p-3.5 rounded-2xl bg-surface-inset border border-border-subtle shadow-inner space-y-0.5">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted">Result</span>
                    <div className="text-lg font-bold font-heading text-gold">
                      {outcome.explanation.result.japanese}
                      <span className="text-xs font-mono text-text-muted font-normal ml-2">
                        {outcome.explanation.result.reading} · {wanakana.toRomaji(outcome.explanation.result.reading)}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary">{outcome.meaningId}</p>
                  </div>

                  {/* Rule */}
                  {formInfo && (
                    <div className="p-3.5 rounded-2xl bg-surface-inset border border-border-subtle space-y-1">
                      <span className="text-xs font-bold text-gold font-heading block">
                        Rule · {GROUP_LABEL[outcome.explanation.group].name}
                      </span>
                      <p className="text-xs text-text-secondary whitespace-pre-line leading-relaxed font-mono">
                        {formInfo.ruleExplanation[GROUP_LABEL[outcome.explanation.group].rule]}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-3.5 rounded-2xl bg-surface-inset border border-border-subtle space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-state-danger font-heading">
                    <XCircle className="w-4 h-4" /> Tidak dapat menggunakan {display.badge}
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    <span className="font-bold">Reason:</span> {outcome.reason}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
};
