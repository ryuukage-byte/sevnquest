import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSpeechHint, cleanSpeechText, japaneseSpeechFromPrompt, resolveSpeechText, speechHintKey, splitDialogue, type MorphToken,
} from './speechText';

const tok = (surface: string, reading?: string): MorphToken => ({ surface, reading });

test('ucapan: anotasi non-Jepang tidak ikut dibaca', () => {
  assert.equal(cleanSpeechText('かんけい (kankei)'), 'かんけい');
  assert.equal(cleanSpeechText('毎朝散歩する (jalan-jalan setiap pagi)'), '毎朝散歩する');
  assert.equal(cleanSpeechText('ごと (goto)'), 'ごと');
  assert.equal(cleanSpeechText('〜わけではない'), 'わけではない');
  assert.equal(cleanSpeechText('た.べる'), 'たべる');
  assert.equal(cleanSpeechText('-さん'), 'さん');
  assert.equal(cleanSpeechText('まいつき / まいげつ'), 'まいつき、まいげつ');
  assert.equal(cleanSpeechText('私は（　）を食べます。'), '私は、を食べます。');
  assert.equal(cleanSpeechText('【Level 3: Kanji】\n「彼と私は何の(関係)もありません。」'), '「彼と私は何の(関係)もありません。」');
  assert.equal(cleanSpeechText('シュウ (SHUU)'), 'シュウ');
});

test('ucapan hibrida: unit yang dibaca lain oleh penganalisis diganti kana furigana, sisanya tetap kanji', () => {
  // 開きます: penganalisis membaca ひらきます, furigana data あきます → kana; 押す cocok → tetap kanji.
  const tokens = [tok('この'), tok('ボタン', 'ボタン'), tok('を', 'ヲ'), tok('押す', 'オス'), tok('と', 'ト'), tok('、', '、'),
    tok('ドア', 'ドア'), tok('が', 'ガ'), tok('開き', 'ヒラキ'), tok('ます', 'マス'), tok('。', '。')];
  assert.equal(
    buildSpeechHint('このボタンを押すと、ドアが開きます。', 'このぼたんをおすと、どあがあきます。', tokens),
    'このボタンを押すと、ドアがあきます。',
  );
  // Semua cocok → teks asli tidak berubah (katakana tetap katakana).
  const safe = [tok('私', 'ワタシ'), tok('は', 'ハ'), tok('毎朝', 'マイアサ'), tok('コーヒー', 'コーヒー'), tok('を', 'ヲ'), tok('飲み', 'ノミ'), tok('ます', 'マス'), tok('。', '。')];
  assert.equal(buildSpeechHint('私は毎朝コーヒーを飲みます。', 'わたしはまいあさこーひーをのみます。', safe), '私は毎朝コーヒーを飲みます。');
  // Bacaan yang tidak bisa diselaraskan → tidak ada petunjuk.
  assert.equal(buildSpeechHint('私は毎朝コーヒーを飲みます。', 'ぜんぜんちがうよみかた', safe), null);
});

test('ucapan: pasangan data memakai petunjuk build; pasangan lain mengikuti furigana yang tampil', () => {
  const text = '四月一日は新しい学期が始まる日です。';
  const reading = 'しがつついたちはあたらしいがっきがはじまるひです。';
  const hints = new Map([[speechHintKey(text, reading), 'しがつついたちは新しい学期が始まる日です。']]);
  assert.equal(resolveSpeechText(text, reading, { hints }), 'しがつついたちは新しい学期が始まる日です。');
  // Pasangan data tanpa petunjuk = aman → kanji asli (intonasi alami).
  assert.equal(resolveSpeechText('毎朝', 'まいあさ', { isKnownPair: () => true }), '毎朝');
  // Pasangan tak dikenal (deck kustom) → kana sesuai furigana yang tampil; katakana tetap.
  assert.equal(resolveSpeechText('一日中コーヒーを飲んだ', 'ついたちじゅうこーひーをのんだ'), 'ついたちじゅうコーヒーをのんだ');
  // Tanpa bacaan → teks dibersihkan.
  assert.equal(resolveSpeechText('〜わけではない'), 'わけではない');
  assert.equal(resolveSpeechText('', 'たべる'), 'たべる');
});

test('ucapan: soal campuran hanya membacakan bagian Jepang; dialog dipecah per pembicara tanpa label', () => {
  assert.equal(japaneseSpeechFromPrompt('【Level 1: Kanji】\nApa arti kanji 「関」?'), '関');
  assert.equal(
    japaneseSpeechFromPrompt('Lengkapilah kalimat berikut:\n「私は毎朝（　？　）を飲みます。」\n(Arti: Saya minum)'),
    '私は毎朝（　？　）を飲みます。',
  );
  assert.equal(cleanSpeechText('私は毎朝（　？　）を飲みます。'), '私は毎朝、を飲みます。');
  assert.deepEqual(splitDialogue('二人が話しています。女の人：ねえ、行かない？男の人：いいね！'), [
    { speaker: 'narrator', text: '二人が話しています。' },
    { speaker: 'female', text: 'ねえ、行かない？' },
    { speaker: 'male', text: 'いいね！' },
  ]);
  assert.deepEqual(splitDialogue('こんにちは。'), [{ speaker: 'narrator', text: 'こんにちは。' }]);
});
