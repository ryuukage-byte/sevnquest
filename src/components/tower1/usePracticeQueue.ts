import { useCallback, useRef, useState } from 'react';
import { RoomOutcome } from '../../engine/tower1/types';

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

function shuffled(items: number[]): number[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Antrean latihan satu Room:
 *  - soal yang salah dimasukkan kembali ke ujung antrean sampai benar (pengambilan ulang),
 *  - akurasi dihitung dari JAWABAN PERCOBAAN PERTAMA tiap soal,
 *  - Room ujian (passRatio) yang tidak lulus bisa diulang dengan urutan baru.
 */
export function usePracticeQueue(total: number, passRatio?: number) {
  const [run, setRun] = useState(0);
  const [queue, setQueue] = useState<number[]>(() => range(total));
  const [pos, setPos] = useState(0);
  const first = useRef<(boolean | undefined)[]>(Array(total).fill(undefined));

  const current = queue[pos] as number | undefined;
  const done = pos >= queue.length;
  const correctFirst = first.current.filter(v => v === true).length;
  const ratio = total > 0 ? correctFirst / total : 1;
  const failed = done && passRatio !== undefined && ratio < passRatio;
  const outcome: RoomOutcome = { correct: correctFirst, total };

  /** Catat hasil soal saat ini. Soal salah dikembalikan ke antrean. */
  const record = useCallback(
    (correct: boolean) => {
      if (current === undefined) return;
      if (first.current[current] === undefined) first.current[current] = correct;
      if (!correct) setQueue(q => [...q, current]);
    },
    [current]
  );

  const next = useCallback(() => setPos(p => p + 1), []);

  const retry = useCallback(() => {
    first.current = Array(total).fill(undefined);
    setQueue(shuffled(range(total)));
    setPos(0);
    setRun(r => r + 1);
  }, [total]);

  return {
    run,
    current,
    pos,
    done,
    failed,
    ratio,
    outcome,
    /** Jumlah soal yang sudah dilewati dibanding total antrean saat ini. */
    progress: { done: Math.min(pos, queue.length), total: queue.length },
    record,
    next,
    retry
  };
}
