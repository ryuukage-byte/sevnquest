interface BootSplashProps {
  /** true bila modul utama gagal dimuat (jaringan putus / chunk basi setelah deploy). */
  failed?: boolean;
  onRetry?: () => void;
}

/**
 * Layar pembuka ringan yang dirender SEGERA oleh main.tsx, sebelum chunk aplikasi + dataset
 * (beberapa MB) selesai diunduh. Tanpa gambar/font eksternal agar tampil di jaringan lambat.
 */
export function BootSplash({ failed = false, onRetry }: BootSplashProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="min-h-[100dvh] flex flex-col items-center justify-center gap-5 px-6 bg-surface-base text-text-primary text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-surface-card border border-border-subtle shadow-md flex items-center justify-center font-heading text-3xl text-gold select-none">
        冒
      </div>
      <div>
        <h1 className="font-heading text-xl font-bold tracking-widest">SevnQuest</h1>
        <p className="mt-1 text-xs font-mono text-text-secondary">
          {failed ? 'Gagal memuat aplikasi. Periksa koneksi lalu coba lagi.' : 'Menyiapkan petualanganmu...'}
        </p>
      </div>
      {failed ? (
        <button
          type="button"
          onClick={onRetry}
          className="btn-physical-primary min-h-[44px] py-2.5 px-6 rounded-xl text-sm font-bold font-heading cursor-pointer"
        >
          Muat Ulang
        </button>
      ) : (
        <div className="w-40 h-2 rounded-full bg-surface-inset border border-border-subtle shadow-inner overflow-hidden">
          <div className="boot-splash-bar h-full w-1/3 rounded-full bg-gold" />
        </div>
      )}
    </div>
  );
}
