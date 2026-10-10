/* Tests sin dependencias: node tests/run.js */
const assert = require('assert');
const PG = require('../js/lib.js');
const { CATS, decks, mergeExtra } = require('../js/data.js');
const ICONS = require('../js/icons.js');

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

test('numberToPt: millones', () => {
  const n = (x) => PG.numberToPt(x, 'br');
  assert.strictEqual(n(1000000), 'um milhão');
  assert.strictEqual(n(2000000), 'dois milhões');
  assert.strictEqual(n(1500000), 'um milhão e quinhentos mil');
  assert.strictEqual(n(1250000), 'um milhão duzentos e cinquenta mil');
  assert.strictEqual(n(2000500), 'dois milhões e quinhentos');
  assert.strictEqual(n(1500200), 'um milhão quinhentos mil e duzentos');
  assert.strictEqual(n(999999999), 'novecentos e noventa e nove milhões novecentos e noventa e nove mil novecentos e noventa e nove');
});

test('priceToPt', () => {
  assert.strictEqual(PG.priceToPt(1, 'br', 'BRL'), 'um real');
  assert.strictEqual(PG.priceToPt(25, 'br', 'BRL'), 'vinte e cinco reais');
  assert.strictEqual(PG.priceToPt(12.5, 'br', 'BRL'), 'doze reais e cinquenta centavos');
  assert.strictEqual(PG.priceToPt(0.01, 'br', 'BRL'), 'um centavo');
  assert.strictEqual(PG.priceToPt(0, 'br', 'BRL'), 'zero reais');
  assert.strictEqual(PG.priceToPt(1.01, 'pt', 'EUR'), 'um euro e um cêntimo');
  assert.strictEqual(PG.priceToPt(3.2, 'pt', 'EUR'), 'três euros e vinte cêntimos');
  assert.strictEqual(PG.priceToPt(19.99, 'pt', 'EUR'), 'dezanove euros e noventa e nove cêntimos');
});

test('priceToPt: pesos chilenos (CLP) y moneda por defecto', () => {
  assert.strictEqual(PG.DEFAULT_CURRENCY, 'CLP');
  assert.strictEqual(PG.priceToPt(1, 'br', 'CLP'), 'um peso');
  assert.strictEqual(PG.priceToPt(1500, 'br', 'CLP'), 'mil e quinhentos pesos');
  assert.strictEqual(PG.priceToPt(12990, 'br', 'CLP'), 'doze mil novecentos e noventa pesos');
  assert.strictEqual(PG.priceToPt(1000000, 'br', 'CLP'), 'um milhão de pesos');
  assert.strictEqual(PG.priceToPt(2500000, 'br', 'CLP'), 'dois milhões e quinhentos mil pesos');
  assert.strictEqual(PG.priceToPt(1500, 'pt', 'CLP'), 'mil e quinhentos pesos');
  assert.strictEqual(PG.priceToPt(1990.4, 'br', 'CLP'), 'mil novecentos e noventa pesos'); // sin centavos
  assert.strictEqual(PG.priceToPt(1500), 'mil e quinhentos pesos'); // sin moneda → CLP
  assert.strictEqual(PG.priceToPt(1500, 'br', 'XXX'), 'mil e quinhentos pesos'); // desconocida → CLP
  assert.strictEqual(PG.priceToPt(-1, 'br', 'CLP'), '');
  assert.strictEqual(PG.priceToPt(1e9, 'br', 'CLP'), '');
  assert.strictEqual(PG.priceToPt(2.5, 'br', 'USD'), 'dois dólares e cinquenta centavos');
  assert.strictEqual(PG.priceToPt(2.5, 'pt', 'USD'), 'dois dólares e cinquenta cêntimos');
});

test('formatPrice', () => {
  assert.ok(/1\.500/.test(PG.formatPrice(1500, 'br', 'CLP')), PG.formatPrice(1500, 'br', 'CLP'));
  assert.ok(!/,/.test(PG.formatPrice(1500, 'br', 'CLP')), 'CLP sin decimales');
  assert.ok(/12,50/.test(PG.formatPrice(12.5, 'br', 'BRL')));
});

test('parseAmount', () => {
  const a = (r, c) => PG.parseAmount(r, c);
  // CLP: puntos y comas son separadores de miles
  assert.strictEqual(a('1.500', 'CLP'), 1500);
  assert.strictEqual(a('15000', 'CLP'), 15000);
  assert.strictEqual(a('$ 1.250.000', 'CLP'), 1250000);
  // con decimales
  assert.strictEqual(a('12,50', 'USD'), 12.5);
  assert.strictEqual(a('12.5', 'BRL'), 12.5);
  assert.strictEqual(a('1.234,56', 'ARS'), 1234.56);
  assert.strictEqual(a('1,234.56', 'USD'), 1234.56);
  assert.strictEqual(a('1.234', 'USD'), 1234);
  assert.strictEqual(a('0,5', 'EUR'), 0.5);
  assert.ok(Number.isNaN(a('', 'CLP')));
  assert.ok(Number.isNaN(a('abc', 'CLP')));
});

test('monedas: tabla completa y frases con importe', () => {
  for (const [code, c] of Object.entries(PG.CURRENCIES)) {
    assert.ok(c.country && c.pt.length === 2 && c.es.length === 2 && c.sample.length === 3, code);
    assert.ok([0, 2].includes(c.decimals), code);
    assert.ok(PG.formatPrice(c.sample[0], 'br', code), code);
    for (const variant of ['br', 'pt']) {
      const w = PG.priceToPt(c.sample[0], variant, code);
      assert.ok(w && !/\d/.test(w), code + ': ' + w);
    }
  }
  const ph = { es: 'Cuesta {ea}.', f: 'Custa {pa}.' };
  const r = PG.pick(ph, Object.assign({ variant: 'br', form: 'f', client: 'm', me: 'm', period: 'morning' }, { currency: 'CLP' }));
  assert.strictEqual(r.pt, 'Custa doze mil e quinhentos pesos.');
  assert.ok(/12\.500/.test(r.es), r.es);
  const r2 = PG.pick(ph, { variant: 'br', form: 'f', client: 'm', me: 'm', period: 'morning', currency: 'BRL' });
  assert.strictEqual(r2.pt, 'Custa vinte e cinco reais.');
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

/* Comprobaciones de una frase: campos, marcas y que todo resuelva en todas las combinaciones */
function checkPhrase(ph) {
  const known = new Set(PG.TOKEN_NAMES);
  assert.ok(CATS[ph.cat], ph.id + ': categoría desconocida ' + ph.cat);
  assert.ok(ph.es && ph.f, ph.id + ': falta es/f');
  if (Array.isArray(ph.es)) assert.strictEqual(ph.es.length, 2, ph.id);
  const all = [].concat(ph.es, ph.f, ph.i || [], ph.p ? [ph.p.f || [], ph.p.i || []] : []).flat();
  for (const s of all) for (const m of String(s).matchAll(/\{(\w+)\}/g)) assert.ok(known.has(m[1]), ph.id + ': token {' + m[1] + '}');
  if (ph.when) for (const w of ph.when) assert.ok(PG.PERIODS[w], ph.id + ': when ' + w);
  // Todo resuelve sin llaves sobrantes en todas las combinaciones relevantes
  for (const variant of ['br', 'pt']) for (const form of ['f', 'i']) for (const client of ['m', 'f']) for (const currency of Object.keys(PG.CURRENCIES)) {
    const r = PG.pick(ph, ctx({ variant, form, client, currency }));
    assert.ok(r.pt.trim() && r.es.trim() && !/[{}]/.test(r.pt + r.es), ph.id);
    if (variant === 'pt') { // (reais/centavos no cuentan: dependen de la moneda, no del portugués)
      const br = /(?<![\p{L}])(você|vocês|pra|pro|sacola|cardápio|café da manhã|banheiro|celular|estoque|endereço|ligação|tá)(?![\p{L}])/iu.exec(r.pt);
      assert.ok(!br, ph.id + ' (Portugal) contiene brasileñismo: ' + (br && br[0]) + ' → ' + r.pt);
    }
  }
}

test('datos: ids únicos, campos y tokens válidos, sin BR/PT mezclado', () => {
  const ids = new Set();
  let total = 0;
  for (const d of decks) {
    assert.ok(d.phrases.length >= 12, d.id + ' debería tener al menos 12 frases');
    for (const ph of d.phrases) {
      total++;
      assert.ok(!ids.has(ph.id), 'id repetido ' + ph.id); ids.add(ph.id);
      checkPhrase(ph);
    }
  }
  assert.ok(total >= 120, 'total de frases: ' + total);
  console.log('      (' + total + ' frases en ' + decks.length + ' decks)');
});

test('frases aprobadas: mergeExtra acepta las válidas y descarta las malas', () => {
  const copy = () => JSON.parse(JSON.stringify(decks));
  const good = { id: 'x-farmacia-001', deck: 'farmacia', cat: 'indicar', es: ['Tómelo con leche.', 'Tómalo con leche.'],
    f: 'Tome com leite.', i: 'Toma com leite.', p: { f: 'Tome com leite.', i: 'Toma com leite.' } };
  const t = copy();
  const before = t.find((d) => d.id === 'farmacia').phrases.length;
  const r = mergeExtra([good], PG.TOKEN_NAMES, t);
  assert.deepStrictEqual([r.added, r.rejected.length], [1, 0]);
  const added = t.find((d) => d.id === 'farmacia').phrases;
  assert.strictEqual(added.length, before + 1);
  checkPhrase(added[added.length - 1]);
  assert.strictEqual(PG.pick(added[added.length - 1], ctx({ form: 'i' })).pt, 'Toma com leite.');

  const bad = [
    null, 'texto', {},
    Object.assign({}, good, { id: 'sin-prefijo' }),
    Object.assign({}, good, { id: 'x-dup' }), Object.assign({}, good, { id: 'x-dup' }), // la 2.ª repite id
    Object.assign({}, good, { id: 'x-deck', deck: 'no-existe' }),
    Object.assign({}, good, { id: 'x-cat', cat: 'nada' }),
    Object.assign({}, good, { id: 'x-tok', f: 'Olá {nada}' }),
    Object.assign({}, good, { id: 'x-es', es: ['solo uno'] }),
    Object.assign({}, good, { id: 'x-when', when: ['mediodia'] }),
    Object.assign({}, good, { id: 'x-vacio', f: '   ' }),
    Object.assign({}, good, { id: 'x-p', p: { x: 'no' } }),
  ];
  const t2 = copy();
  const r2 = mergeExtra(bad, PG.TOKEN_NAMES, t2);
  assert.strictEqual(r2.added, 1); // solo la primera x-dup
  assert.strictEqual(r2.rejected.length, bad.length - 1);
  assert.strictEqual(mergeExtra({}, PG.TOKEN_NAMES, copy()).added, 0); // no es una lista
  // "hear" se marca solo
  const t3 = copy();
  mergeExtra([Object.assign({}, good, { id: 'x-hear', cat: 'hear' })], PG.TOKEN_NAMES, t3);
  assert.ok(t3.find((d) => d.id === 'farmacia').phrases.pop().hear);
});

test('content/extra.json: todo lo publicado es válido (si no, no se publica)', () => {
  const fs = require('fs'), path = require('path');
  const list = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'content', 'extra.json'), 'utf8'));
  const t = JSON.parse(JSON.stringify(decks));
  const r = mergeExtra(list, PG.TOKEN_NAMES, t);
  assert.deepStrictEqual(r.rejected, [], 'frases rechazadas: ' + JSON.stringify(r.rejected));
  t.forEach((d) => d.phrases.filter((ph) => ph.extra).forEach(checkPhrase));
  console.log('      (' + r.added + ' frases aprobadas publicadas)');
});

test('iconos: todos los nombres usados existen y no quedan emojis', () => {
  const names = [].concat(
    Object.values(CATS).map((c) => c.icon),
    decks.map((d) => d.icon),
    Object.values(PG.PERIODS).map((p) => p.icon)
  );
  for (const n of names) assert.ok(ICONS.NAMES.includes(n), 'icono desconocido: ' + n);
  assert.ok(ICONS.icon('speaker').startsWith('<svg'));
  assert.strictEqual(ICONS.icon('no-existe'), '');
  const emoji = /\p{Extended_Pictographic}/u;
  const fs = require('fs'), path = require('path');
  for (const f of ['js/app.js', 'js/data.js', 'js/lib.js', 'index.html']) {
    const src = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
    assert.ok(!emoji.test(src.replace(/\/\*[\s\S]*?\*\//g, '')), f + ' contiene emojis');
  }
});

console.log(passed + ' tests ok' + (process.exitCode ? ' — con fallos' : ''));
