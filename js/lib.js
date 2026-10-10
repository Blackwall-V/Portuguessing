/* Lógica pura (sin DOM): momento del día, tokens de contexto, elección de
 * texto según formalidad/variante y números → portugués. Se usa en el
 * navegador (window.PG) y en los tests de Node (require). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PG = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- Momento del día ---------- */

  const PERIODS = {
    morning: { label: 'Mañana', icon: 'sun' },
    afternoon: { label: 'Tarde', icon: 'cloudsun' },
    night: { label: 'Noche', icon: 'moon' },
  };

  function periodFor(hour) {
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    return 'night';
  }

  /* ---------- Monedas ----------
   * pt/es: [singular, plural] tal como se dicen en cada idioma.
   * decimals: 0 si se paga sin centavos (CLP, COP, PYG).
   * sample: tres importes de ejemplo realistas para las frases con precio. */

  const CURRENCIES = {
    CLP: { country: 'Chile', pt: ['peso', 'pesos'], es: ['peso', 'pesos'], decimals: 0, locale: 'es-CL', sample: [12500, 40000, 25000] },
    ARS: { country: 'Argentina', pt: ['peso', 'pesos'], es: ['peso', 'pesos'], decimals: 2, locale: 'es-AR', sample: [20000, 45000, 30000] },
    BOB: { country: 'Bolivia', pt: ['boliviano', 'bolivianos'], es: ['boliviano', 'bolivianos'], decimals: 2, locale: 'es-BO', sample: [50, 120, 80] },
    BRL: { country: 'Brasil', pt: ['real', 'reais'], es: ['real', 'reales'], decimals: 2, locale: 'pt-BR', sample: [25, 40, 30] },
    COP: { country: 'Colombia', pt: ['peso', 'pesos'], es: ['peso', 'pesos'], decimals: 0, locale: 'es-CO', sample: [25000, 40000, 30000] },
    EUR: { country: 'Portugal y Europa', pt: ['euro', 'euros'], es: ['euro', 'euros'], decimals: 2, locale: 'es-ES', sample: [25, 40, 30] },
    MXN: { country: 'México', pt: ['peso', 'pesos'], es: ['peso', 'pesos'], decimals: 2, locale: 'es-MX', sample: [250, 400, 300] },
    PEN: { country: 'Perú', pt: ['sol', 'sóis'], es: ['sol', 'soles'], decimals: 2, locale: 'es-PE', sample: [25, 40, 30] },
    PYG: { country: 'Paraguay', pt: ['guarani', 'guaranis'], es: ['guaraní', 'guaraníes'], decimals: 0, locale: 'es-PY', sample: [100000, 200000, 150000] },
    USD: { country: 'Estados Unidos', pt: ['dólar', 'dólares'], es: ['dólar', 'dólares'], decimals: 2, locale: 'es-CL', sample: [25, 40, 30] },
    UYU: { country: 'Uruguay', pt: ['peso', 'pesos'], es: ['peso', 'pesos'], decimals: 2, locale: 'es-UY', sample: [500, 900, 700] },
  };
  const DEFAULT_CURRENCY = 'CLP';
  const MAX_PRICE = 1000000000; // exclusivo
  const currencyOf = (code) => CURRENCIES[code] || CURRENCIES[DEFAULT_CURRENCY];

  /* ---------- Tokens ----------
   * Los textos llevan marcas como {Sd} o {sr}; se resuelven al mostrarlos
   * según la hora, el género del cliente / del hablante y el país. */

  const SD = { morning: 'bom dia', afternoon: 'boa tarde', night: 'boa noite' };
  const UMBOM = { morning: 'um bom dia', afternoon: 'uma boa tarde', night: 'uma boa noite' };
  const ESD = { morning: 'Buenos días', afternoon: 'Buenas tardes', night: 'Buenas noches' };
  const ESUN = { morning: 'un buen día', afternoon: 'una buena tarde', night: 'una buena noche' };

  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  function tokenTable(ctx) {
    const cur = currencyOf(ctx.currency);
    const cm = ctx.client !== 'f'; // cliente masculino
    const mm = ctx.me !== 'f'; // hablante masculino
    const t = {
      sd: SD[ctx.period],
      Sd: cap(SD[ctx.period]),
      umbom: UMBOM[ctx.period],
      sr: cm ? 'o senhor' : 'a senhora',
      Sr: cm ? 'O senhor' : 'A senhora',
      bv: cm ? 'bem-vindo' : 'bem-vinda',
      obg: mm ? 'obrigado' : 'obrigada',
      Obg: mm ? 'Obrigado' : 'Obrigada',
      moeda: cur.pt[1],
      esd: ESD[ctx.period],
      esumbuen: ESUN[ctx.period],
      esbv: cm ? 'bienvenido' : 'bienvenida',
      mes: cur.es[1],
      // importes de ejemplo: pa/pb/pc en portugués (con palabras), ea/eb/ec en español (con cifras)
      pa: priceToPt(cur.sample[0], ctx.variant, ctx.currency),
      pb: priceToPt(cur.sample[1], ctx.variant, ctx.currency),
      pc: priceToPt(cur.sample[2], ctx.variant, ctx.currency),
      ea: formatPrice(cur.sample[0], ctx.variant, ctx.currency),
      eb: formatPrice(cur.sample[1], ctx.variant, ctx.currency),
      ec: formatPrice(cur.sample[2], ctx.variant, ctx.currency),
    };
    return t;
  }

  function fill(text, ctx) {
    const t = tokenTable(ctx);
    return text.replace(/\{(\w+)\}/g, (m, k) => (k in t ? t[k] : m));
  }

  const TOKEN_NAMES = Object.keys(
    tokenTable({ period: 'morning', client: 'm', me: 'm', variant: 'br', currency: DEFAULT_CURRENCY })
  );

  /* ---------- Elegir el texto correcto de una frase ----------
   * Frase: { es, f, i?, p?: {f?, i?}, hear? }
   *   f = formal, i = informal (Brasil); p = ajustes para Portugal.
   *   es puede ser string o [formal, informal]. */

  function pick(ph, ctx) {
    const form = ph.hear ? 'f' : ctx.form === 'i' ? 'i' : 'f';
    let pt;
    if (ctx.variant === 'pt' && ph.p) {
      pt = ph.p[form];
      if (pt == null && form === 'i') pt = ph.p.f;
    }
    if (pt == null) pt = form === 'i' ? (ph.i != null ? ph.i : ph.f) : ph.f;
    const es = Array.isArray(ph.es) ? (form === 'i' ? ph.es[1] : ph.es[0]) : ph.es;
    return { pt: fill(pt, ctx), es: fill(es, ctx), form };
  }

  /* ---------- Números en portugués (0 – 999 999 999) ---------- */

  function numberToPt(n, variant) {
    n = Math.floor(Number(n));
    if (!Number.isFinite(n) || n < 0 || n > 999999999) return String(n);
    const pt = variant === 'pt';
    const U = [
      'zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez',
      'onze', 'doze', 'treze', pt ? 'catorze' : 'quatorze', 'quinze',
      pt ? 'dezasseis' : 'dezesseis', pt ? 'dezassete' : 'dezessete', 'dezoito',
      pt ? 'dezanove' : 'dezenove',
    ];
    const T = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
    const H = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

    function below1000(x) {
      if (x < 20) return U[x];
      if (x < 100) return T[Math.floor(x / 10)] + (x % 10 ? ' e ' + U[x % 10] : '');
      if (x === 100) return 'cem';
      return H[Math.floor(x / 100)] + (x % 100 ? ' e ' + below1000(x % 100) : '');
    }

    if (n === 0) return U[0];
    const millions = Math.floor(n / 1000000);
    const thousands = Math.floor(n / 1000) % 1000;
    const rest = n % 1000;
    const segs = [];
    if (millions) segs.push({ v: millions, t: millions === 1 ? 'um milhão' : below1000(millions) + ' milhões' });
    if (thousands) segs.push({ v: thousands, t: thousands === 1 ? 'mil' : below1000(thousands) + ' mil' });
    if (rest) segs.push({ v: rest, t: below1000(rest) });
    // "e" solo antes del último grupo, y solo si es menor que 100 o centenas redondas
    return segs.map((g, k) => {
      if (k === 0) return g.t;
      const last = k === segs.length - 1;
      return (last && (g.v < 100 || g.v % 100 === 0) ? ' e ' : ' ') + g.t;
    }).join('');
  }

  /* ---------- Precios ---------- */

  function splitMoney(value, decimals) {
    if (decimals === 0) return { whole: Math.round(Number(value)), cents: 0 };
    const cents = Math.round(Number(value) * 100);
    return { whole: Math.floor(cents / 100), cents: cents % 100 };
  }

  function priceToPt(value, variant, currency) {
    if (!Number.isFinite(Number(value)) || value < 0 || value >= MAX_PRICE) return '';
    const cur = currencyOf(currency);
    const pt = variant === 'pt';
    const { whole, cents } = splitMoney(value, cur.decimals);
    const sub = pt ? ['cêntimo', 'cêntimos'] : ['centavo', 'centavos'];
    const parts = [];
    if (whole > 0 || cents === 0) {
      // "um milhão de pesos", "dois milhões de reais": lleva "de" cuando termina en millón exacto
      const de = whole >= 1000000 && whole % 1000000 === 0 ? ' de ' : ' ';
      parts.push(numberToPt(whole, variant) + de + (whole === 1 ? cur.pt[0] : cur.pt[1]));
    }
    if (cents > 0) {
      parts.push(numberToPt(cents, variant) + ' ' + (cents === 1 ? sub[0] : sub[1]));
    }
    return parts.join(' e ');
  }

  function formatPrice(value, variant, currency) {
    const v = Number(value);
    if (!Number.isFinite(v)) return '';
    const cur = currencyOf(currency);
    const code = CURRENCIES[currency] ? currency : DEFAULT_CURRENCY;
    try {
      return new Intl.NumberFormat(cur.locale, {
        style: 'currency',
        currency: code,
        minimumFractionDigits: cur.decimals,
        maximumFractionDigits: cur.decimals,
      }).format(v);
    } catch (e) {
      return v.toFixed(cur.decimals);
    }
  }

  /* Lee lo que escribe la persona: "12,50", "12.50", "1.500", "1.234,56".
   * En monedas sin decimales (CLP…) cualquier punto o coma es separador de miles.
   * Con decimales, un separador seguido de exactamente 3 cifras es de miles. */
  function parseAmount(raw, currency) {
    const s = String(raw == null ? '' : raw).replace(/[^\d.,]/g, '');
    if (!/\d/.test(s)) return NaN;
    if (currencyOf(currency).decimals === 0) return Number(s.replace(/[.,]/g, ''));
    const last = Math.max(s.lastIndexOf('.'), s.lastIndexOf(','));
    if (last === -1) return Number(s);
    const after = s.slice(last + 1);
    const before = s.slice(0, last).replace(/[.,]/g, '');
    if (after.length === 0 || after.length === 3) return Number(before + after);
    return Number(before + '.' + after);
  }

  return {
    PERIODS, CURRENCIES, DEFAULT_CURRENCY, periodFor, fill, pick,
    numberToPt, priceToPt, formatPrice, parseAmount, TOKEN_NAMES,
  };
});
