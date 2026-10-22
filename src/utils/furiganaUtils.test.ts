import test from 'node:test';
import assert from 'node:assert/strict';
import { alignFurigana, getFuriganaSegments } from './furiganaUtils';

const show = (japanese: string, reading: string) =>
  alignFurigana(japanese, reading).segments.map(s => (s.ruby ? `[${s.text}|${s.ruby}]` : s.text)).join('');

test('furigana: angka, huruf Latin, 〇 dan ヶ ikut membawa bacaan (dulu menghasilkan furigana rusak)', () => {
  assert.equal(show('午後６時に家に帰ります。', 'ごごろくじにいえにかえります。'), '[午後６時|ごごろくじ]に[家|いえ]に[帰|かえ]ります。');
  assert.equal(show('父はIT企業に勤めています。', 'ちちはあいてぃーきぎょうにつとめています。'), '[父|ちち]は[IT企業|あいてぃーきぎょう]に[勤|つと]めています。');
  assert.equal(show('令和は、二〇一九年に始まりました。', 'れいわは、にせんじゅうきゅうねんにはじまりました。'),
    '[令和|れいわ]は、[二〇一九年|にせんじゅうきゅうねん]に[始|はじ]まりました。');
  assert.equal(show('私は一ヶ月後に結婚式を挙げる。', 'わたしはいっかげつごにけっこんしきをあげる。'),
    '[私|わたし]は[一ヶ月後|いっかげつご]に[結婚式|けっこんしき]を[挙|あ]げる。');
  assert.equal(show('リンゴを1キロ買いました。', 'りんごを1きろかいました。'), 'リンゴを1キロ[買|か]いました。');
});

test('furigana: penyelarasan dengan backtracking (kana yang sama dengan bacaan kanji)', () => {
  assert.equal(show('私は母は好きです。', 'わたしははははすきです。'), '[私|わたし]は[母|はは]は[好|す]きです。');
  assert.equal(show('傘を持って行きなさい。', 'かさをもっていきなさい。'), '[傘|かさ]を[持|も]って[行|い]きなさい。');
});

test('furigana: bacaan beranotasi (kanji + bacaannya) dipecah per kata', () => {
  assert.equal(show('きのう、友だちと三時間話した。', 'きのう、友ともだちと三さん時間じかん話はなした。'),
    'きのう、[友|とも]だちと[三|さん][時間|じかん][話|はな]した。');
  assert.equal(show('今、何時ですか。', '今いま、何なん時じですか。'), '[今|いま]、[何|なん][時|じ]ですか。');
  assert.equal(show('日本に行く。', '日本[にほん]に行[い]く。'), '[日本|にほん]に[行|い]く。');
});

test('furigana: salah ketik kana di bacaan tidak merusak tampilan; kana selalu dari teks', () => {
  const a = alignFurigana('玄関で靴を脱いでから部屋に入ってください。', 'げんかんでくつをぬいだからへやにはいってください。');
  assert.equal(a.aligned, true);
  assert.equal(a.mismatches, 1);
  assert.equal(a.segments.map(s => s.ruby ? `[${s.text}|${s.ruby}]` : s.text).join(''), '[玄関|げんかん]で[靴|くつ]を[脱|ぬ]いでから[部屋|へや]に[入|はい]ってください。');
});

test('furigana: bacaan yang bukan milik teks ini tidak dipakai (jatuh ke kamus, bukan furigana acak)', () => {
  const a = alignFurigana('毎朝コーヒーを飲みます。', 'まったくちがうぶんしょうですよね');
  assert.equal(a.aligned, false);
  assert.ok(a.segments.every(s => !s.ruby || !s.ruby.includes('ちがう')));
});

test('furigana: tanpa bacaan tetap memakai kamus; teks kana murni tanpa furigana', () => {
  assert.ok(getFuriganaSegments('学校').some(s => s.ruby));
  assert.deepEqual(getFuriganaSegments('ありがとう', 'ありがとう'), [{ text: 'ありがとう', isKanji: false }]);
});

test('furigana: bentuk tulisan alternatif diselaraskan per bentuk; bacaan alternatif pilih yang cocok', () => {
  assert.equal(show('丸い / 円い', 'まるい'), '[丸|まる]い / [円|まる]い');
  assert.equal(show('堅 / 硬/固い', 'かたい'), '[堅|かたい] / [硬|かたい]/[固|かた]い');
  assert.equal(show('お・金持ち', 'かねもち / おかねもち'), 'お・[金持|かねも]ち');
  assert.equal(show('毎月', 'まいげつ / まいつき'), '[毎月|まいげつ]');
});
