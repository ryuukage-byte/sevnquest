import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv, type Plugin} from 'vite';

// Pecah bundle supaya (1) kode aplikasi yang sering berubah tidak ikut meng-invalidasi cache
// dependency & dataset besar (JSON puluhan MB), dan (2) browser mengunduh potongan secara paralel.
function manualChunks(id: string): string | undefined {
  const normalized = id.replace(/\\/g, '/');

  if (normalized.includes('/node_modules/')) {
    if (/\/node_modules\/(react|react-dom|scheduler)\//.test(normalized)) return 'vendor-react';
    if (normalized.includes('/node_modules/@supabase/')) return 'vendor-supabase';
    if (/\/node_modules\/(motion|framer-motion|motion-dom|motion-utils)\//.test(normalized)) return 'vendor-motion';
    if (normalized.includes('/node_modules/hanzi-writer')) return 'vendor-hanzi';
    if (normalized.includes('/node_modules/lucide-react/')) return 'vendor-icons';
    return 'vendor';
  }

  const json = normalized.match(/\/src\/data\/db\/([^/]+)\.json/);
  if (json) return `data-${json[1].replace(/_/g, '-')}`;
  if (normalized.includes('/src/data/tryouts/')) return 'data-tryouts';
  if (normalized.includes('/src/data/furiganaDictionary.json')) return 'data-furigana';
  if (normalized.includes('/src/data/world/') && normalized.endsWith('.json')) return 'data-world';
  return undefined;
}

// Di dev, /api/deck-topic memakai handler yang sama dengan fungsi Vercel (api/deck-topic.ts).
function deckAiDevApi(env: Record<string, string>): Plugin {
  return {
    name: 'deck-ai-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/deck-topic', async (req, res) => {
        const send = (status: number, body: unknown) => {
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(body));
        };
        if (req.method !== 'POST') return send(405, {error: 'method_not_allowed'});
        let raw = '';
        for await (const chunk of req) raw += chunk;
        let body: unknown = null;
        try { body = JSON.parse(raw || 'null'); } catch { /* body tidak valid → 400 dari handler */ }
        const mod = await server.ssrLoadModule('/api/deck-topic.ts');
        const out = await mod.planTopic(body, {
          DECK_AI_BASE_URL: env.DECK_AI_BASE_URL,
          DECK_AI_API_KEY: env.DECK_AI_API_KEY,
          DECK_AI_MODEL: env.DECK_AI_MODEL,
        });
        send(out.status, out.body);
      });
    },
  };
}

// Di dev, /api/captions memakai handler yang sama dengan fungsi Vercel (api/captions.ts).
function captionsDevApi(): Plugin {
  return {
    name: 'captions-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/captions', async (req, res) => {
        const mod = await server.ssrLoadModule('/api/captions.ts');
        await mod.default(req, res);
      });
    },
  };
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Target proxy dev/preview. Bisa diganti lewat VITE_SUPABASE_URL tanpa mengubah kode.
  const supabaseTarget = env.VITE_SUPABASE_URL || 'https://iokhdhqnpslpwsxspvaj.supabase.co';
  const supabaseProxy = {
    '/supabase-proxy': {
      target: supabaseTarget,
      changeOrigin: true,
      rewrite: (p: string) => p.replace(/^\/supabase-proxy/, ''),
      secure: true,
    },
  };

  return {
    base: './',
    plugins: [react(), tailwindcss(), deckAiDevApi(env), captionsDevApi()],
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      emptyOutDir: true,
      rollupOptions: {
        output: {manualChunks},
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify - file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: supabaseProxy,
    },
    preview: {
      proxy: supabaseProxy,
    },
  };
});
