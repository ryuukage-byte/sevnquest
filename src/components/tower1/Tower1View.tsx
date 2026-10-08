// ==============================================================================
// MENARA 1 & 2 — peta + penjalan lantai
// Menara 1 (001-016) mengajarkan MELIHAT bahasa Jepang; Menara 2 (017-100) memakainya.
// Arsitektur: docs/TOWER1_ARCHITECTURE.md · docs/TOWER2_ARCHITECTURE.md
// ==============================================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { TOWER1_ROOMS, TOWER1_SKILL_HINT, TOWER1_SKILL_LABEL, TOWER1_SKILL_ORDER } from '../../data/tower1';
import { ALL_FLOORS, ALL_FLOOR_MAP, TOP_FLOOR, loadFloorRooms, towerOf } from '../../data/towers';
import { getFloorState, getRecommendedFloor, starsForAccuracy } from '../../engine/tower1/graph';
import { loadTower1Progress, recordTower1Clear } from '../../engine/tower1/progress';
import { FloorSpec, Room, Tower1Progress } from '../../engine/tower1/types';
import { playSound } from '../../utils/audio';
import { Tower1Map } from './Tower1Map';
import { SKILL_ICON } from './parts';
import { FloorDetailModal } from './FloorDetailModal';
import { FinishInfo, FloorRunner } from './FloorRunner';

interface Props {
  soundEnabled?: boolean;
  onRewardPlayer?: (exp: number, gold: number) => void;
}

const TOWER_INFO = {
  1: {
    kicker: 'Menara 1',
    title: 'Menara Tutorial',
    blurb: 'Belajar MELIHAT bahasa Jepang: aksara, bunyi, dan susunan kalimat. Kamu keluar dengan kompas, bukan kefasihan.',
    tab: 'Menara 1 · 001–016'
  },
  2: {
    kicker: 'Menara 2',
    title: 'Menara Rangkai',
    blurb: 'Belajar MEMAKAI bahasa Jepang: kosakata, kanji, perubahan bentuk, dan pola kalimat dari N5 menuju N4. Setiap kelipatan sepuluh dijaga satu ujian campuran.',
    tab: 'Menara 2 · 017–100'
  }
} as const;

const floorsOf = (tower: 1 | 2) => ALL_FLOORS.filter(f => towerOf(f) === tower);

/** Memuat Room sebuah lantai (Menara 2 dimuat malas) lalu menjalankannya. */
const ActiveFloor: React.FC<{
  spec: FloorSpec;
  soundEnabled: boolean;
  onFinish: (accuracy: number) => FinishInfo;
  onExit: () => void;
  onOpenFloor: (id: number) => void;
}> = ({ spec, soundEnabled, onFinish, onExit, onOpenFloor }) => {
  const [rooms, setRooms] = useState<Room[] | null>(() => TOWER1_ROOMS[spec.id] ?? null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (rooms) return;
    let cancelled = false;
    loadFloorRooms(spec.id)
      .then(r => { if (!cancelled) setRooms(r); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [rooms, spec.id]);

  if (!rooms) {
    return (
      <div className="panel panel-stitched rounded-3xl p-6 border border-border-subtle shadow-md flex flex-col items-center gap-3 text-center">
        {failed ? (
          <>
            <p className="text-sm text-text-secondary">Lantai {spec.code} gagal dimuat. Periksa koneksi lalu coba lagi.</p>
            <button type="button" onClick={onExit} className="btn-physical-secondary px-4 py-2 rounded-xl text-sm font-bold font-heading">Kembali ke Menara</button>
          </>
        ) : (
          <>
            <Loader2 className="w-6 h-6 text-gold animate-spin" />
            <p className="text-sm text-text-secondary">Menyiapkan Lantai {spec.code} · {spec.name}…</p>
          </>
        )}
      </div>
    );
  }

  return (
    <FloorRunner
      spec={spec}
      rooms={rooms}
      soundEnabled={soundEnabled}
      onFinish={onFinish}
      onExit={onExit}
      onOpenFloor={onOpenFloor}
    />
  );
};

export const Tower1View: React.FC<Props> = ({ soundEnabled = true, onRewardPlayer }) => {
  const [progress, setProgress] = useState<Tower1Progress>(() => loadTower1Progress());
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);

  const recommendedId = useMemo(() => getRecommendedFloor(ALL_FLOORS, progress), [progress]);
  const [tower, setTower] = useState<1 | 2>(() => {
    const rec = getRecommendedFloor(ALL_FLOORS, loadTower1Progress());
    return rec && ALL_FLOOR_MAP[rec].tower === 2 ? 2 : 1;
  });

  const towerFloors = useMemo(() => floorsOf(tower), [tower]);
  const built = towerFloors.filter(f => f.status === 'ready');
  const clearedBuilt = built.filter(f => progress.cleared[f.id]).length;
  const recommended = recommendedId ? ALL_FLOOR_MAP[recommendedId] : null;
  const info = TOWER_INFO[tower];
  const allDone = recommendedId === null && ALL_FLOORS.every(f => progress.cleared[f.id]);

  const openFloor = (id: number) => {
    playSound('click', soundEnabled);
    setSelectedId(null);
    setActiveId(id);
  };

  const finish = useCallback(
    (floorId: number, accuracy: number): FinishInfo => {
      const spec = ALL_FLOOR_MAP[floorId];
      const availableBefore = new Set(ALL_FLOORS.filter(f => getFloorState(f, progress) === 'available').map(f => f.id));
      const res = recordTower1Clear(floorId, accuracy);
      setProgress(res.progress);
      const unlocked = ALL_FLOORS.filter(
        f => getFloorState(f, res.progress) === 'available' && !availableBefore.has(f.id)
      ).map(f => ({ id: f.id, code: f.code, name: f.name }));
      const nextId = getRecommendedFloor(ALL_FLOORS, res.progress);
      const nextSpec = nextId ? ALL_FLOOR_MAP[nextId] : null;
      const stars = starsForAccuracy(accuracy);
      if (res.firstClear) onRewardPlayer?.(spec.reward.exp, spec.reward.gold);
      return { stars, accuracy, firstClear: res.firstClear, exp: spec.reward.exp, gold: spec.reward.gold, unlocked, next: nextSpec ? { id: nextSpec.id, code: nextSpec.code, name: nextSpec.name } : null };
    },
    [progress, onRewardPlayer]
  );

  // --------------------------------------------------------------------------
  // LANTAI AKTIF
  // --------------------------------------------------------------------------
  if (activeId !== null && ALL_FLOOR_MAP[activeId]) {
    return (
      <ActiveFloor
        key={activeId}
        spec={ALL_FLOOR_MAP[activeId]}
        soundEnabled={soundEnabled}
        onFinish={accuracy => finish(activeId, accuracy)}
        onExit={() => {
          const t = towerOf(ALL_FLOOR_MAP[activeId]);
          setTower(t);
          setActiveId(null);
        }}
        onOpenFloor={id => setActiveId(ALL_FLOOR_MAP[id] ? id : null)}
      />
    );
  }

  // --------------------------------------------------------------------------
  // PETA
  // --------------------------------------------------------------------------
  const selected = selectedId !== null ? ALL_FLOOR_MAP[selectedId] : null;

  return (
    <div className="w-full space-y-4">
      <div className="panel panel-stitched rounded-3xl p-4 sm:p-5 border border-border-subtle shadow-md space-y-4">
        <div className="flex gap-1.5" role="tablist" aria-label="Pilih menara">
          {([1, 2] as const).map(t => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tower === t}
              onClick={() => { playSound('click', soundEnabled); setTower(t); setSelectedId(null); }}
              className={`flex-1 py-2 rounded-xl text-[11px] sm:text-xs font-bold font-heading ${tower === t ? 'btn-physical-primary' : 'btn-physical-secondary'}`}
            >
              {TOWER_INFO[t].tab}
            </button>
          ))}
        </div>

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gold font-heading block">{info.kicker}</span>
            <h2 className="text-lg sm:text-xl font-bold text-text-primary font-heading">{info.title}</h2>
            <p className="text-xs sm:text-sm text-text-secondary leading-relaxed mt-0.5">{info.blurb}</p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] text-text-muted block">Selesai</span>
            <span className="text-lg font-bold text-gold font-mono">{clearedBuilt}/{built.length}</span>
          </div>
        </div>

        <div className="h-2 w-full rpg-progress-track rounded-full overflow-hidden" aria-label={`Progres ${info.kicker}`}>
          <div className="h-full bg-indigo rounded-full transition-all duration-300" style={{ width: `${built.length ? (clearedBuilt / built.length) * 100 : 0}%` }} />
        </div>

        {recommended ? (
          <button
            type="button"
            onClick={() => openFloor(recommended.id)}
            className="btn-physical-primary w-full py-3 rounded-2xl font-bold text-sm font-heading flex items-center justify-between gap-3 px-4"
          >
            <span className="flex items-center gap-2 min-w-0">
              <span className="truncate">
                {Object.keys(progress.cleared).length === 0 ? 'Mulai' : 'Lanjutkan'}: Lantai {recommended.code} · {recommended.name}
              </span>
            </span>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </button>
        ) : allDone ? (
          <p className="text-xs text-text-secondary p-3 rounded-2xl bg-surface-inset border border-border-subtle shadow-inner">
            Kamu telah menyelesaikan seluruh {TOP_FLOOR} lantai. Ulangi lantai mana pun untuk menyegarkan ingatan.
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-1.5" aria-label="Jenis ruangan">
          {TOWER1_SKILL_ORDER.map(sk => (
            <span key={sk} title={TOWER1_SKILL_HINT[sk]} className="ui-chip px-2.5 py-1 text-[10px] font-bold inline-flex items-center gap-1">
              {SKILL_ICON[sk]}
              {TOWER1_SKILL_LABEL[sk]}
            </span>
          ))}
        </div>
        <p className="text-[11px] text-text-muted leading-relaxed">
          Ketuk sebuah lantai untuk melihat isinya. Setiap lantai punya beberapa ruangan, dan tiap ruangan melatih satu jenis kemampuan. Lantai terkunci menampilkan prasyaratnya.
        </p>
      </div>

      <Tower1Map
        key={tower}
        floors={towerFloors}
        progress={progress}
        recommendedId={recommendedId}
        selectedId={selectedId}
        tower={tower}
        onSelect={id => {
          playSound('open_modal', soundEnabled);
          setSelectedId(id);
        }}
      />

      {selected && (
        <FloorDetailModal
          spec={selected}
          state={getFloorState(selected, progress)}
          progress={progress}
          isRecommended={recommendedId === selected.id}
          onEnter={() => openFloor(selected.id)}
          onClose={() => setSelectedId(null)}
          onSelectFloor={id => {
            const target = ALL_FLOOR_MAP[id];
            if (target) { setTower(towerOf(target)); setSelectedId(id); }
          }}
        />
      )}
    </div>
  );
};
