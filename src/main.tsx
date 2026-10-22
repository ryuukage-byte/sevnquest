import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { BootSplash } from './components/common/BootSplash.tsx';
import { DATASET_LOAD_ERROR } from './data/loadDataset.ts';

const root = createRoot(document.getElementById('root')!);

// Tampilkan splash dulu; App + dataset materi (beberapa MB) dimuat sebagai chunk terpisah.
root.render(<BootSplash />);

function loadApp() {
  root.render(<BootSplash />);
  import('./App.tsx')
    .then(({ default: App }) => {
      root.render(
        <StrictMode>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </StrictMode>,
      );
    })
    .catch((err) => {
      console.error('Gagal memuat modul utama aplikasi:', err);
      // Modul yang gagal DIEVALUASI (dataset gagal diunduh) tersimpan sebagai gagal oleh browser: impor ulang
      // hanya mengulang galat yang sama, jadi muat ulang halaman.
      const evaluationFailed = String(err instanceof Error ? err.message : err).includes(DATASET_LOAD_ERROR);
      root.render(<BootSplash failed onRetry={evaluationFailed ? () => window.location.reload() : loadApp} />);
    });
}

loadApp();

// Hitung pengunjung (termasuk tamu) setelah aplikasi tampil, tanpa menahan render awal.
setTimeout(() => {
  import('./lib/visitors.ts').then((m) => m.registerVisit()).catch(() => {});
}, 4000);
