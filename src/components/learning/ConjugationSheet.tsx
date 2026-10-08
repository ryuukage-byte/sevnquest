import React, { useState } from 'react';
import { X, Volume2, MapPin, GitBranch, Settings2, BookOpen, Layers, HelpCircle } from 'lucide-react';
import {
  ConjugationPattern,
  CONJUGATION_PATTERNS,
  AUXILIARY_ENDINGS,
  VERB_GROUPS_GUIDE,
  getConnectorOrSubBranch,
  getAuxiliaryInfo,
} from '../../data/conjugationBank';
import { getSiblingSubBranches } from '../../data/bunpouSubKnowledge';
import { speakJapanese } from '../../utils/audio';

interface ConjugationSheetProps {
  patternId: string;
  type: 'conjugation' | 'auxiliary' | 'connector';
  onClose: () => void;
}

/**
 * ConjugationSheet — Bottom-sheet modal that displays:
 * 1. Verb conjugation rules & formations (Grup I, II, III).
 * 2. Auxiliary sentence-ending verb inflections (iru, aru, oku, shimau, etc. with tense/politeness conditions).
 * 3. Japanese Verb Groups Guide (Golongan 1 Godan, Golongan 2 Ichidan, Golongan 3 Irregular + tricky exceptions).
 *
 * Theme-consistent with the medieval dark stone/amber/indigo aesthetic.
 */
export const ConjugationSheet: React.FC<ConjugationSheetProps> = ({
  patternId,
  type,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'conjugation' | 'auxiliary' | 'groups'>(() => {
    if (type === 'auxiliary') return 'auxiliary';
    return 'conjugation';
  });

  const [activePatternId, setActivePatternId] = useState<string>(
    type === 'conjugation' ? patternId : 'te_kei'
  );
  const [activeAuxId, setActiveAuxId] = useState<string>(
    type === 'auxiliary' ? patternId : 'aux_iru'
  );
  const [activeConnectorId, setActiveConnectorId] = useState<string>(
    type === 'connector' ? patternId : ''
  );

  const pattern: ConjugationPattern | undefined = CONJUGATION_PATTERNS[activePatternId];
  const auxiliaryInfo = getAuxiliaryInfo(activeAuxId);
  const connectorInfo = type === 'connector' ? getConnectorOrSubBranch(activeConnectorId) : undefined;
  const subBranch = connectorInfo?.subBranch;
  const siblingBranches = type === 'connector' ? getSiblingSubBranches(activeConnectorId) : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-xl rounded-t-3xl panel bg-surface-card border-t border-x border-border-primary shadow-2xl animate-slide-up overflow-hidden max-h-[88vh] flex flex-col"
        style={{
          animation: 'slideUp 0.25s ease-out',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 pb-3 border-b border-border-subtle shrink-0 bg-surface-inset">
          <div className="space-y-1 flex-1 pr-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-lg bg-indigo/15 border border-border-subtle text-indigo text-xs font-mono font-bold">
                {activeTab === 'auxiliary'
                  ? 'Kata Akhiran Bantu'
                  : activeTab === 'groups'
                  ? 'Panduan Golongan 1, 2, 3'
                  : connectorInfo
                  ? 'Sub-Rumus'
                  : 'Konjugasi Kata Kerja'}
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-text-primary font-jp flex items-center gap-2">
              {activeTab === 'auxiliary' && auxiliaryInfo ? (
                <>
                  <span className="text-gold font-mono font-black">{auxiliaryInfo.token}</span>
                  <span className="text-text-muted">—</span>
                  <span>{auxiliaryInfo.nameJa}</span>
                </>
              ) : activeTab === 'groups' ? (
                <span>Panduan Pembagian Golongan Kata Kerja</span>
              ) : pattern ? (
                <>
                  <span className="text-indigo font-mono text-base font-black">{pattern.symbol}</span>
                  <span className="text-text-muted">—</span>
                  <span>{pattern.nameJa}</span>
                </>
              ) : connectorInfo ? (
                <span>{connectorInfo.token}</span>
              ) : null}
            </h3>
            <p className="text-xs text-text-secondary line-clamp-1">
              {activeTab === 'auxiliary' && auxiliaryInfo
                ? auxiliaryInfo.nameId
                : activeTab === 'groups'
                ? 'Godan (Grup 1), Ichidan (Grup 2), dan Irregular (Grup 3)'
                : pattern
                ? `${pattern.nameId} / ${pattern.nameEn}`
                : connectorInfo?.nameId}
            </p>
          </div>

          <button
            onClick={onClose}
            className="btn-physical-secondary p-2 rounded-xl transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 p-2 bg-surface-ground border-b border-border-subtle shrink-0 overflow-x-auto scrollbar-thin">
          <button
            type="button"
            onClick={() => setActiveTab('conjugation')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'conjugation'
                ? 'bg-indigo/20 text-indigo border border-border-subtle shadow-xs'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-card'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Konjugasi Kata Kerja</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('auxiliary')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'auxiliary'
                ? 'bg-gold/20 text-gold border border-border-subtle shadow-xs'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-card'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Kata Akhiran Bantu</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('groups')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'groups'
                ? 'bg-surface-elevated text-text-primary border border-border-primary shadow-xs'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-card'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Golongan 1, 2, 3</span>
          </button>
        </div>

        {/* Quick Switchers */}
        {activeTab === 'conjugation' && (
          <div className="px-3 py-2 bg-surface-inset border-b border-border-subtle flex items-center gap-1.5 overflow-x-auto scrollbar-thin shrink-0">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider shrink-0 mr-1">
              Bentuk:
            </span>
            {Object.values(CONJUGATION_PATTERNS).map((p) => {
              const isActive = p.id === activePatternId;
              return (
                <button
                  key={p.id}
                  onClick={() => setActivePatternId(p.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition-all border ${
                    isActive
                      ? 'seg-active text-gold'
                      : 'bg-surface-card border-border-subtle text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {p.symbol}
                </button>
              );
            })}
          </div>
        )}

        {activeTab === 'auxiliary' && (
          <div className="px-3 py-2 bg-surface-inset border-b border-border-subtle flex items-center gap-1.5 overflow-x-auto scrollbar-thin shrink-0">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider shrink-0 mr-1">
              Akhiran:
            </span>
            {Object.values(AUXILIARY_ENDINGS).map((aux) => {
              const isActive = aux.id === activeAuxId;
              return (
                <button
                  key={aux.id}
                  onClick={() => setActiveAuxId(aux.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-jp font-bold whitespace-nowrap transition-all border ${
                    isActive
                      ? 'seg-active text-gold font-black'
                      : 'bg-surface-card border-border-subtle text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {aux.token}
                </button>
              );
            })}
          </div>
        )}

        {/* Modal Body */}
        <div className="p-4 space-y-4 overflow-y-auto scrollbar-thin flex-1">
          {/* TAB 1: CONJUGATION PATTERNS */}
          {activeTab === 'conjugation' && pattern && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-surface-inset border border-border-subtle space-y-1">
                <p className="text-xs sm:text-sm text-text-primary leading-relaxed">
                  {pattern.shortDescription}
                </p>
              </div>

              <div className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo font-heading flex items-center gap-1.5">
                  <Settings2 className="w-3.5 h-3.5" />
                  Aturan Perubahan 3 Golongan Kata Kerja
                </h4>

                {/* Group I */}
                <div className="p-3.5 rounded-2xl bg-surface-inset border border-border-subtle space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-lg bg-surface-card text-text-primary text-[11px] font-bold border border-border-subtle">
                      Grup I (Golongan 1)
                    </span>
                    <span className="text-[11px] text-text-muted font-jp">五段動詞 / Godan</span>
                  </div>
                  <p className="text-xs sm:text-sm text-text-primary font-jp whitespace-pre-line leading-relaxed pl-1 font-medium">
                    {pattern.formation.groupI}
                  </p>
                </div>

                {/* Group II */}
                <div className="p-3.5 rounded-2xl bg-surface-inset border border-border-subtle space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-lg bg-surface-card text-text-primary text-[11px] font-bold border border-border-subtle">
                      Grup II (Golongan 2)
                    </span>
                    <span className="text-[11px] text-text-muted font-jp">一段動詞 / Ichidan</span>
                  </div>
                  <p className="text-xs sm:text-sm text-text-primary font-jp whitespace-pre-line leading-relaxed pl-1 font-medium">
                    {pattern.formation.groupII}
                  </p>
                </div>

                {/* Group III */}
                <div className="p-3.5 rounded-2xl bg-surface-inset border border-border-subtle space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-lg bg-surface-card text-text-primary text-[11px] font-bold border border-border-subtle">
                      Grup III (Golongan 3)
                    </span>
                    <span className="text-[11px] text-text-muted font-jp">不規則動詞 / Irregular</span>
                  </div>
                  <p className="text-xs sm:text-sm text-text-primary font-jp whitespace-pre-line leading-relaxed pl-1 font-medium">
                    {pattern.formation.groupIII}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AUXILIARY VERBS & SENTENCE ENDINGS */}
          {activeTab === 'auxiliary' && auxiliaryInfo && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-surface-inset border border-border-subtle space-y-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gold font-heading">
                  Nuansa & Karakteristik
                </h4>
                <p className="text-xs sm:text-sm text-text-primary leading-relaxed">
                  {auxiliaryInfo.description}
                </p>
              </div>

              <div className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted font-heading flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-gold" />
                  Tabel Perubahan Bentuk Akhiran Kalimat
                </h4>
                <p className="text-[11px] text-text-secondary leading-relaxed">
                  Kata akhiran ini berkonjugasi sesuai situasi waktu (lampau/sekarang), tingkat kesopanan (biasa/sopan), dan negasi (positif/negatif):
                </p>

                <div className="space-y-2">
                  {auxiliaryInfo.inflections.map((row, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-surface-inset border border-border-subtle flex items-start justify-between gap-3 hover:border-border-primary transition-colors"
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-surface-card border border-border-subtle text-gold text-[10px] font-bold font-mono">
                            {row.formName}
                          </span>
                          <span className="text-xs sm:text-sm font-jp font-bold text-text-primary">
                            {row.japanese}
                          </span>
                          <span className="text-[10px] text-text-muted font-mono">
                            ({row.reading})
                          </span>
                        </div>

                        <p className="text-xs sm:text-sm font-jp font-semibold text-text-primary pl-0.5">
                          {row.example}
                        </p>
                        <p className="text-[11px] text-text-secondary pl-0.5 leading-snug">
                          {row.nuance}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => speakJapanese(row.example.split(' ')[0] || row.japanese)}
                        className="btn-physical-secondary p-2 rounded-xl text-gold transition-colors shrink-0"
                        title="Dengarkan Pengucapan"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: VERB GROUPS GUIDE (GOLONGAN 1, 2, 3) */}
          {activeTab === 'groups' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-surface-inset border border-border-subtle space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo font-heading flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5" />
                  Cara Cepat Membedakan Golongan Kata Kerja
                </h4>
                <p className="text-xs sm:text-sm text-text-primary leading-relaxed">
                  Semua kata kerja bahasa Jepang dalam bentuk kamus (辞書形) berakhiran bunyi vokal <span className="font-bold text-indigo">"-u"</span>. Kata kerja dibagi menjadi 3 golongan utama untuk menentukan rumus perubahannya.
                </p>
              </div>

              <div className="space-y-3">
                {VERB_GROUPS_GUIDE.map((group, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-surface-inset border border-border-subtle space-y-2.5 shadow-xs"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
                      <div>
                        <h4 className="text-sm sm:text-base font-black text-text-primary font-heading">
                          {group.groupName}
                        </h4>
                        <span className="text-[11px] text-indigo font-jp font-bold">
                          {group.japaneseName} ({group.romajiName})
                        </span>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-text-primary leading-relaxed font-medium">
                      {group.definition}
                    </p>

                    <div className="p-3 rounded-xl bg-surface-card border border-border-subtle space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-heading">
                        Aturan Perubahan:
                      </span>
                      <p className="text-xs text-text-primary font-mono whitespace-pre-line leading-relaxed">
                        {group.rule}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-text-muted font-heading">
                        Contoh Kosakata:
                      </span>
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {group.examples.map((ex, exIdx) => (
                          <span
                            key={exIdx}
                            className="px-2 py-0.5 rounded-lg bg-surface-card border border-border-subtle text-xs font-jp text-text-primary"
                          >
                            {ex}
                          </span>
                        ))}
                      </div>
                    </div>

                    {group.exceptions && (
                      <div className="p-2.5 rounded-xl bg-gold/10 border border-border-subtle space-y-1">
                        {group.exceptions.map((exc, excIdx) => (
                          <p
                            key={excIdx}
                            className={`text-xs font-jp ${
                              excIdx === 0
                                ? 'font-bold text-gold'
                                : 'text-text-primary pl-2'
                            }`}
                          >
                            {exc}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border-subtle flex items-center justify-between bg-surface-inset text-center shrink-0">
          <p className="text-[10px] text-text-muted">
            Ketuk di luar atau tombol ✕ untuk menutup
          </p>
          <button
            onClick={onClose}
            className="btn-cta px-4 py-1.5 rounded-xl text-xs font-bold"
          >
            Selesai
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0.5;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};
