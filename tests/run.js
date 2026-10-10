/* Tests sin dependencias: node tests/run.js */
const assert = require('assert');
const PG = require('../js/lib.js');
const { CATS, decks } = require('../js/data.js');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ok  ' + name); }
  catch (e) { console.error('FAIL  ' + name + '\n      ' + e.message); process.exitCode = 1; }
}

test('periodFor', () => {
  assert.strictEqual(PG.periodFor(4), 'night');
  assert.strictEqual(PG.periodFor(5), 'morning');
  assert.strictEqual(PG.periodFor(11), 'morning');
  assert.strictEqual(PG.periodFor(12), 'afternoon');
  assert.strictEqual(PG.periodFor(17), 'afternoon');
  assert.strictEqual(PG.periodFor(18), 'night');
  assert.strictEqual(PG.periodFor(23), 'night');
});

test('numberToPt', () => {
  const n = (x, v) => PG.numberToPt(x, v || 'br');
  assert.strictEqual(n(0), 'zero');
  assert.strictEqual(n(1), 'um');
  assert.strictEqual(n(16), 'dezesseis');
  assert.strictEqual(n(16, 'pt'), 'dezasseis');
  assert.strictEqual(n(21), 'vinte e um');
  assert.strictEqual(n(25), 'vinte e cinco');
  assert.strictEqual(n(100), 'cem');
  assert.strictEqual(n(101), 'cento e um');
  assert.strictEqual(n(123), 'cento e vinte e três');
  assert.strictEqual(n(200), 'duzentos');
  assert.strictEqual(n(1000), 'mil');
  assert.strictEqual(n(1001), 'mil e um');
  assert.strictEqual(n(1200), 'mil e duzentos');
  assert.strictEqual(n(1234), 'mil duzentos e trinta e quatro');
  assert.strictEqual(n(2500), 'dois mil e quinhentos');
  assert.strictEqual(n(21000), 'vinte e um mil');
  assert.strictEqual(n(100000), 'cem mil');
  assert.strictEqual(n(999999), 'novecentos e noventa e nove mil novecentos e noventa e nove');
});

test('priceToPt', () => {
  assert.strictEqual(PG.priceToPt(1, 'br'), 'um real');
  assert.strictEqual(PG.priceToPt(25, 'br'), 'vinte e cinco reais');
  assert.strictEqual(PG.priceToPt(12.5, 'br'), 'doze reais e cinquenta centavos');
  assert.strictEqual(PG.priceToPt(0.01, 'br'), 'um centavo');
  assert.strictEqual(PG.priceToPt(0, 'br'), 'zero reais');
  assert.strictEqual(PG.priceToPt(1.01, 'pt'), 'um euro e um cêntimo');
  assert.strictEqual(PG.priceToPt(3.2, 'pt'), 'três euros e vinte cêntimos');
  assert.strictEqual(PG.priceToPt(19.99, 'pt'), 'dezanove euros e noventa e nove cêntimos');
});

const ctx = (o) => Object.assign({ variant: 'br', form: 'f', client: 'm', me: 'm', period: 'morning' }, o);

test('tokens según hora y género', () => {
  const ph = { es: '{esd}', f: '{Sd}, {sr}. {Obg}. {bv}.' };
  assert.strictEqual(PG.pick(ph, ctx()).pt, 'Bom dia, o senhor. Obrigado. bem-vindo.');
  assert.strictEqual(PG.pick(ph, ctx({ period: 'afternoon', client: 'f', me: 'f' })).pt, 'Boa tarde, a senhora. Obrigada. bem-vinda.');
  assert.strictEqual(PG.pick(ph, ctx({ period: 'night' })).es, 'Buenas noches');
});

test('formal / informal / Portugal', () => {
  const ph = { es: ['¿Qué necesita?', '¿Qué necesitas?'], f: 'O que {sr} deseja?', i: 'O que você precisa?', p: { f: 'O que deseja?', i: 'O que precisas?' } };
  assert.strictEqual(PG.pick(ph, ctx()).pt, 'O que o senhor deseja?');
  assert.strictEqual(PG.pick(ph, ctx({ form: 'i' })).pt, 'O que você precisa?');
  assert.strictEqual(PG.pick(ph, ctx({ variant: 'pt' })).pt, 'O que deseja?');
  assert.strictEqual(PG.pick(ph, ctx({ variant: 'pt', form: 'i' })).pt, 'O que precisas?');
  assert.strictEqual(PG.pick(ph, ctx({ form: 'i' })).es, '¿Qué necesitas?');
  // sin informal: usa el formal
  assert.strictEqual(PG.pick({ es: 'x', f: 'Sim.' }, ctx({ form: 'i' })).pt, 'Sim.');
  // las frases "hear" ignoran la formalidad
  assert.strictEqual(PG.pick({ es: 'x', f: 'A', i: 'B', hear: true }, ctx({ form: 'i' })).pt, 'A');
});

test('datos: ids únicos, campos y tokens válidos, sin BR/PT mezclado', () => {
  const ids = new Set();
  const known = new Set(PG.TOKEN_NAMES);
  let total = 0;
  for (const d of decks) {
    assert.ok(d.phrases.length >= 12, d.id + ' debería tener al menos 12 frases');
    for (const ph of d.phrases) {
      total++;
      assert.ok(!ids.has(ph.id), 'id repetido ' + ph.id); ids.add(ph.id);
      assert.ok(CATS[ph.cat], ph.id + ': categoría desconocida ' + ph.cat);
      assert.ok(ph.es && ph.f, ph.id + ': falta es/f');
      if (Array.isArray(ph.es)) assert.strictEqual(ph.es.length, 2, ph.id);
      const all = [].concat(ph.es, ph.f, ph.i || [], ph.p ? [ph.p.f || [], ph.p.i || []] : []).flat();
      for (const s of all) for (const m of String(s).matchAll(/\{(\w+)\}/g)) assert.ok(known.has(m[1]), ph.id + ': token {' + m[1] + '}');
      if (ph.when) for (const w of ph.when) assert.ok(PG.PERIODS[w], ph.id + ': when ' + w);
      // Todo resuelve sin llaves sobrantes en las 8 combinaciones relevantes
      for (const variant of ['br', 'pt']) for (const form of ['f', 'i']) for (const client of ['m', 'f']) {
        const r = PG.pick(ph, ctx({ variant, form, client }));
        assert.ok(r.pt.trim() && r.es.trim() && !/[{}]/.test(r.pt + r.es), ph.id);
        if (variant === 'pt') {
          const br = /(?<![\p{L}])(você|vocês|pra|pro|sacola|cardápio|café da manhã|banheiro|celular|estoque|reais|centavos|endereço|ligação|tá)(?![\p{L}])/iu.exec(r.pt);
          assert.ok(!br, ph.id + ' (Portugal) contiene brasileñismo: ' + (br && br[0]) + ' → ' + r.pt);
        }
      }
    }
  }
  assert.ok(total >= 120, 'total de frases: ' + total);
  console.log('      (' + total + ' frases en ' + decks.length + ' decks)');
});

console.log(passed + ' tests ok' + (process.exitCode ? ' — con fallos' : ''));
