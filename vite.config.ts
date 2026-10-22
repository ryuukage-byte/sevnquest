import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig, loadEnv, type Plugin} from 'vite';
import {splitKotobaEntries} from './src/data/kotobaSplit';
import {SPEECH_SOURCE_FILES, buildSpeechHints} from './scripts/speech/speechHints';

const DATA_DB_DIR = path.resolve(__dirname, 'src/data/db');
const KOTOBA_JSON = path.join(DATA_DB_DIR, 'kotoba.json');
const KOTOBA_DETAILS_MODULE = path.resolve(__dirname, 'src/data/kotobaDetails.ts');
const LOAD_DATASET_MODULE = path.resolve(__dirname, 'src/data/loadDataset.ts');
const DATASET_PREFIX = '\0sevn-data:';
// Petunjuk ucapan TTS (dihitung dari data dengan kuromoji, lihat scripts/speech/speechHints.ts).
const SPEECH_HINTS_ID = 'virtual:sevn-speech-hints';
// Dataset di src/data/db sebesar ini ke atas dikirim sebagai berkas .json terpisah (lihat datasetModules).
const DATASET_ASSET_MIN_BYTES = 64 * 1024;

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

  // Satu chunk per dataset: top-level await dalam satu chunk berjalan berurutan, antar-chunk paralel.
  if (id.startsWith(DATASET_PREFIX)) return `data-${id.slice(DATASET_PREFIX.length)}`;
  // Pemuat bersama milik chunk sendiri; bila ikut chunk dataset lain, mengimpornya ikut memicu unduhan dataset itu.
  if (normalized.endsWith('/src/data/loadDataset.ts')) return 'data-loader';
  const json = normalized.match(/\/src\/data\/db\/([^/]+)\.json/);
  if (json) return `data-${json[1].replace(/_/g, '-')}`;
  if (normalized.includes('/src/data/tryouts/')) return 'data-tryouts';
  if (normalized.includes('/src/data/furiganaDictionary.json')) return 'data-furigana';
  if (normalized.includes('/src/data/world/') && normalized.endsWith('.json')) return 'data-world';
  return undefined;
}

// Dataset besar (src/data/db/*.json ≥ 64 KB) di build produksi:
// - dikirim sebagai berkas assets/<nama>-<hash>.json, bukan literal di dalam skrip. Modul penggantinya hanya
//   `export default await loadDataset(url)` (top-level await), jadi konsumen tetap memakai impor sinkron biasa.
//   Teks JSON dibuang setelah di-parse; literal di dalam skrip menetap di memori selama aplikasi hidup.
// - dataset yang dibutuhkan jalur boot (graf impor statis App.tsx) di-preload dari index.html agar unduhannya
//   paralel dengan chunk JS.
// Kamus kotoba (±8,7 MB) juga dipecah: setiap impor `db/kotoba.json` menerima bagian INTI (field jalur boot)
// sebagai satu modul bersama, kecuali src/data/kotobaDetails.ts yang menerima bagian DETAIL (contoh kalimat,
// kolokasi, definisi) dan menggabungkannya ke objek inti yang sama setelah aplikasi tampil (src/data/fullData.ts).
// Saat dev dataset tetap inline. Tes (tsx) tidak memakai plugin ini dan selalu melihat JSON utuh.
function datasetModules(): Plugin {
  let isBuild = false;
  let base = './';
  const files = new Map<string, string>(); // nama dataset -> berkas sumber
  const cache = new Map<string, {mtime: number; json: string}>();
  const kotobaParts = () => {
    const mtime = fs.statSync(KOTOBA_JSON).mtimeMs;
    const hit = cache.get('kotoba');
    if (hit?.mtime === mtime) return {core: hit.json, detail: cache.get('kotoba-detail')!.json};
    const {core, detail} = splitKotobaEntries(JSON.parse(fs.readFileSync(KOTOBA_JSON, 'utf8')));
    cache.set('kotoba', {mtime, json: JSON.stringify(core)});
    cache.set('kotoba-detail', {mtime, json: JSON.stringify(detail)});
    return {core: cache.get('kotoba')!.json, detail: cache.get('kotoba-detail')!.json};
  };
  const datasetJson = (name: string): string => {
    if (name === 'kotoba') return kotobaParts().core;
    if (name === 'kotoba-detail') return kotobaParts().detail;
    const file = files.get(name)!;
    const mtime = fs.statSync(file).mtimeMs;
    const hit = cache.get(name);
    if (hit?.mtime === mtime) return hit.json;
    const json = JSON.stringify(JSON.parse(fs.readFileSync(file, 'utf8')));
    cache.set(name, {mtime, json});
    return json;
  };
  let speechHints: {key: string; json: Promise<string>} | null = null;
  const speechHintsJson = () => {
    const key = SPEECH_SOURCE_FILES.map((f) => fs.statSync(path.join(DATA_DB_DIR, f)).mtimeMs).join('|');
    if (speechHints?.key !== key) {
      speechHints = {
        key,
        json: buildSpeechHints(DATA_DB_DIR, path.resolve(__dirname, 'node_modules/kuromoji/dict')).then((h) => JSON.stringify(h)),
      };
    }
    return speechHints.json;
  };
  return {
    name: 'sevn-datasets',
    enforce: 'pre',
    configResolved(config) {
      isBuild = config.command === 'build';
      base = config.base;
    },
    async resolveId(source, importer, options) {
      if (source === SPEECH_HINTS_ID) {
        SPEECH_SOURCE_FILES.forEach((f) => files.set(`speech-hints:${f}`, path.join(DATA_DB_DIR, f)));
        return DATASET_PREFIX + 'speech-hints';
      }
      if (!importer || !/\.json$/.test(source)) return null;
      const resolved = await this.resolve(source, importer, {...options, skipSelf: true});
      if (!resolved) return null;
      const file = path.normalize(resolved.id.split('?')[0]);
      if (file === KOTOBA_JSON) {
        files.set('kotoba', file).set('kotoba-detail', file);
        return DATASET_PREFIX + (path.normalize(importer) === KOTOBA_DETAILS_MODULE ? 'kotoba-detail' : 'kotoba');
      }
      if (path.dirname(file) !== DATA_DB_DIR || fs.statSync(file).size < DATASET_ASSET_MIN_BYTES) return null;
      const name = path.basename(file, '.json').replace(/_/g, '-');
      files.set(name, file);
      return DATASET_PREFIX + name;
    },
    async load(id) {
      if (!id.startsWith(DATASET_PREFIX)) return null;
      const name = id.slice(DATASET_PREFIX.length);
      let json: string;
      if (name === 'speech-hints') {
        SPEECH_SOURCE_FILES.forEach((f) => this.addWatchFile(path.join(DATA_DB_DIR, f)));
        json = await speechHintsJson();
      } else {
        this.addWatchFile(files.get(name)!);
        json = datasetJson(name);
      }
      if (!isBuild) return {code: `export default JSON.parse(${JSON.stringify(json)});`, map: {mappings: ''}};
      const ref = this.emitFile({type: 'asset', name: `${name}.json`, source: json});
      return {
        code:
          `import {loadDataset} from ${JSON.stringify(LOAD_DATASET_MODULE)};\n` +
          `export default await loadDataset(import.meta.ROLLUP_FILE_URL_${ref});\n`,
        map: {mappings: ''},
      };
    },
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        if (!ctx.bundle) return;
        const chunks = Object.values(ctx.bundle).filter((c) => c.type === 'chunk');
        const appModule = path.resolve(__dirname, 'src/App.tsx');
        const app = chunks.find((c) => c.isDynamicEntry && c.moduleIds.some((m) => path.normalize(m) === appModule));
        if (!app) return;
        const byName = new Map(chunks.map((c) => [c.fileName, c]));
        const seen = new Set<string>();
        const preload = new Set<string>();
        const stack = [app.fileName];
        while (stack.length) {
          const chunk = byName.get(stack.pop()!);
          if (!chunk || seen.has(chunk.fileName)) continue;
          seen.add(chunk.fileName);
          chunk.referencedFiles.filter((f) => f.endsWith('.json')).forEach((f) => preload.add(f));
          stack.push(...chunk.imports);
        }
        return [...preload].map((file) => ({
          tag: 'link',
          attrs: {rel: 'preload', as: 'fetch', crossorigin: true, href: `${base}${file}`},
          injectTo: 'head' as const,
        }));
      },
    },
  };
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
    plugins: [datasetModules(), react(), tailwindcss(), deckAiDevApi(env), captionsDevApi()],
    // JSON lain (kecil / fitur lazy): satu ekspor default berupa literal objek. Tanpa named export per kunci,
    // dan bukan JSON.parse("...") yang membuat string sumbernya menetap di heap selama aplikasi hidup.
    json: {namedExports: false, stringify: false},
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      emptyOutDir: true,
      // Top-level await (modul dataset) butuh Chrome 89 / Firefox 89 / Safari 15. Aplikasi sudah mensyaratkan
      // lebih baru dari itu (regex lookbehind di utils/mastery.ts, Tailwind v4: Safari 16.4+).
      target: ['es2022', 'chrome89', 'edge89', 'firefox89', 'safari15'],
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
