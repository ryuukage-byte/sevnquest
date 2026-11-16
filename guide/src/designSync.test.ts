import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

// Design system Guide harus identik dengan SevnQuest. Jika berbeda: npm run sync-design.
test('sevnquest.css identik dengan src/index.css aplikasi utama', { skip: !existsSync(join(import.meta.dirname, '../../src/index.css')) }, () => {
  const main = readFileSync(join(import.meta.dirname, '../../src/index.css'), 'utf8');
  const copy = readFileSync(join(import.meta.dirname, 'sevnquest.css'), 'utf8');
  assert.equal(copy, main);
});
