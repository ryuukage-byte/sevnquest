import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { BootSplash } from './components/common/BootSplash.tsx';

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
      root.render(<BootSplash failed onRetry={loadApp} />);
    });
}

loadApp();

// Hitung pengunjung (termasuk tamu) setelah aplikasi tampil, tanpa menahan render awal.
setTimeout(() => {
  import('./lib/visitors.ts').then((m) => m.registerVisit()).catch(() => {});
}, 4000);
