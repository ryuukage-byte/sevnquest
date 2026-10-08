import { Suspense, ReactNode } from 'react';
import { ErrorBoundary } from '../ErrorBoundary';

interface ModuleBoundaryProps {
  /** Nama modul (muncul di fallback error & teks loading). */
  label: string;
  /** Dipanggil saat pemain menekan "Coba Pulihkan" pada fallback error. */
  onReset?: () => void;
  children: ReactNode;
}

function ModuleFallback({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center min-h-[240px] py-16 text-sm font-mono text-text-muted"
    >
      Memuat {label}...
    </div>
  );
}

/**
 * Pembungkus per-modul: error di satu modul (Perpustakaan, Buku Saku, dst.) tidak lagi
 * menjatuhkan seluruh aplikasi, dan modul yang di-lazy-load mendapat fallback loading.
 */
export function ModuleBoundary({ label, onReset, children }: ModuleBoundaryProps) {
  return (
    <ErrorBoundary label={label} onReset={onReset}>
      <Suspense fallback={<ModuleFallback label={label} />}>{children}</Suspense>
    </ErrorBoundary>
  );
}
