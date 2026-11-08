import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeUserAgent } from './device';

test('describeUserAgent: nama perangkat ramah', () => {
  assert.equal(describeUserAgent('Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36'), 'Chrome · Android');
  assert.equal(describeUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36 Edg/156.0'), 'Edge · Windows');
  assert.equal(describeUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'), 'Safari · iOS');
  assert.equal(describeUserAgent(''), 'Browser · Perangkat');
});
