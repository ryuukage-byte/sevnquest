// Menyalin design system SevnQuest (src/index.css) ke guide/src/sevnquest.css agar tampilan identik.
import { copyFileSync } from 'node:fs';
copyFileSync(new URL('../../src/index.css', import.meta.url), new URL('../src/sevnquest.css', import.meta.url));
console.log('sevnquest.css disinkronkan dari ../src/index.css');
