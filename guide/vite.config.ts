import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';

// Satu produk = satu sub-situs: VITE_PRODUCT=beginner npm run build  ->  hanya materi produk itu yang ikut bundle.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const product = env.VITE_PRODUCT || 'beginner';
  return {
    base: process.env.GUIDE_BASE ?? '/',
    plugins: [react(), tailwindcss()],
    resolve: { alias: { '@product': path.resolve(__dirname, `src/products/${product}`) } },
  };
});
