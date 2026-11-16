import { ArrowRight, BookOpen, CircleHelp, Hand } from 'lucide-react';
import { LESSONS, PRODUCT, getLesson } from '../products';
import { loadProgress } from '../lib/storage';

/** Materi pertama (menurut urutan jalur) yang belum selesai. */
function nextChapter() {
  const progress = loadProgress();
  for (const path of PRODUCT.paths) {
    for (const c of path.chapters) {
      if (c.lessonId && getLesson(c.lessonId) && !progress[c.lessonId]?.completed) return { chapter: c, started: !!progress[c.lessonId] };
    }
  }
  return null;
}

export default function Home({ go }: { go: (to: string) => void }) {
  const next = nextChapter();
  const lesson = next?.chapter.lessonId ? getLesson(next.chapter.lessonId) : undefined;
  const done = LESSONS.filter(l => loadProgress()[l.id]?.completed).length;
  const steps = [
    { icon: BookOpen, text: 'Baca pelan-pelan.' },
    { icon: Hand, text: 'Tekan tombol LANJUT.' },
    { icon: CircleHelp, text: 'Jawab soal latihannya.' },
  ];
  return (
    <div className="flex flex-col gap-6 pt-4">
      <section className="panel panel-stitched text-center flex flex-col items-center gap-4 py-10">
        <h1 className="font-heading text-3xl sm:text-5xl text-text-primary m-0">{PRODUCT.heroTitle}</h1>
        <p className="text-text-secondary text-lg leading-relaxed max-w-md m-0">{PRODUCT.heroSubtitle}</p>
        {lesson ? (
          <>
            <button className="btn rpg-btn rpg-btn-primary !text-lg !px-8 !py-4 w-full max-w-sm" onClick={() => go(`/learn/${lesson.id}`)}>
              {next?.started ? 'LANJUTKAN BELAJAR' : 'MULAI BELAJAR'} <ArrowRight size={20} aria-hidden />
            </button>
            <p className="text-text-secondary text-base m-0">Materi berikutnya: <strong className="text-text-primary">{lesson.title}</strong> ({lesson.minutes} menit)</p>
          </>
        ) : (
          <p className="text-state-success text-lg font-bold m-0">Selamat! Semua materi sudah selesai.</p>
        )}
        {done > 0 && <p className="text-caption-meta m-0">{done} dari {LESSONS.length} materi selesai</p>}
      </section>

      <section className="panel flex flex-col gap-4">
        <h2 className="text-heading-section">Cara belajarnya gampang</h2>
        <ol className="list-none p-0 m-0 flex flex-col gap-3">
          {steps.map((s, i) => (
            <li key={s.text} className="flex items-center gap-3 text-lg text-text-primary">
              <span className="rpg-badge-reward !text-base !px-3 !py-2 shrink-0">{i + 1}</span>
              <span>{s.text}</span>
            </li>
          ))}
        </ol>
        <p className="text-text-secondary text-base m-0">Tidak ada batas waktu. Boleh berhenti kapan saja, kemajuanmu tersimpan otomatis di perangkat ini.</p>
      </section>

      <button className="skeuo-btn !text-sm !py-3 self-center" onClick={() => go('/discover')}>LIHAT SEMUA MATERI</button>
    </div>
  );
}
