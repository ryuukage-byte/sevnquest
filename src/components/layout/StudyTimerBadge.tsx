import { memo } from 'react';
import { Clock } from 'lucide-react';
import { useStudyTimeTracker } from '../../hooks/useStudyTimeTracker';
import { formatStudyTime, formatDetailedStudyTime } from '../../utils/time';

interface StudyTimerBadgeProps {
  isStudying: boolean;
  initialTodaySeconds: number;
  initialTotalSeconds: number;
  lastStudyDate?: string;
  onSave: (todaySeconds: number, totalSeconds: number, studyDate: string) => void;
}

/**
 * Lencana waktu belajar di header.
 * Hook pelacak waktu memperbarui state TIAP DETIK; dulu hook ini hidup di App sehingga seluruh
 * pohon aplikasi (semua tab yang tetap ter-mount) ikut re-render setiap detik saat belajar.
 * Dengan mengisolasinya di komponen ini, hanya lencana yang re-render.
 */
export const StudyTimerBadge = memo(function StudyTimerBadge({
  isStudying,
  initialTodaySeconds,
  initialTotalSeconds,
  lastStudyDate,
  onSave,
}: StudyTimerBadgeProps) {
  const { todaySeconds, isTimerActive } = useStudyTimeTracker({
    isStudying,
    initialTodaySeconds,
    initialTotalSeconds,
    lastStudyDate,
    onSave,
  });

  return (
    <div
      className={`py-1.5 px-3 rounded-xl bg-surface-inset border text-xs font-mono font-bold flex items-center gap-1.5 shadow-inner transition-all select-none ${
        isTimerActive
          ? 'border-border-subtle text-gold'
          : 'border-border-subtle text-text-secondary'
      }`}
      title={`Waktu Belajar Hari Ini: ${formatDetailedStudyTime(todaySeconds)}${
        isTimerActive ? ' • Sesi belajar sedang aktif' : ' • Jeda'
      }`}
    >
      <Clock className={`w-3.5 h-3.5 shrink-0 ${isTimerActive ? 'text-gold animate-pulse' : 'text-text-muted'}`} />
      <span className="font-mono text-[11px] sm:text-xs">{formatStudyTime(todaySeconds)}</span>
    </div>
  );
});
