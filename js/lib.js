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
    morning: { label: 'Mañana', icon: '☀️' },
    afternoon: { label: 'Tarde', icon: '🌤️' },
    night: { label: 'Noche', icon: '🌙' },
  };

  function periodFor(hour) {
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    return 'night';
  }

  /* ---------- Tokens ----------
   * Los textos llevan marcas como {Sd} o {sr}; se resuelven al mostrarlos
   * según la hora, el género del cliente / del hablante y el país. */

  const SD = { morning: 'bom dia', afternoon: 'boa tarde', night: 'boa noite' };
  const UMBOM = { morning: 'um bom dia', afternoon: 'uma boa tarde', night: 'uma boa noite' };
  const ESD = { morning: 'Buenos días', afternoon: 'Buenas tardes', night: 'Buenas noches' };
  const ESUN = { morning: 'un buen día', afternoon: 'una buena tarde', night: 'una buena noche' };

  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  function tokenTable(ctx) {
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
      moeda: ctx.variant === 'pt' ? 'euros' : 'reais',
      esd: ESD[ctx.period],
      esumbuen: ESUN[ctx.period],
      esbv: cm ? 'bienvenido' : 'bienvenida',
      mes: ctx.variant === 'pt' ? 'euros' : 'reales',
    };
    return t;
  }

  function fill(text, ctx) {
    const t = tokenTable(ctx);
    return text.replace(/\{(\w+)\}/g, (m, k) => (k in t ? t[k] : m));
  }

  const TOKEN_NAMES = Object.keys(
    tokenTable({ period: 'morning', client: 'm', me: 'm', variant: 'br' })
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

  /* ---------- Números en portugués (0 – 999 999) ---------- */

  function numberToPt(n, variant) {
    n = Math.floor(Number(n));
    if (!Number.isFinite(n) || n < 0 || n > 999999) return String(n);
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
    const thousands = Math.floor(n / 1000);
    const rest = n % 1000;
    let out = '';
    if (thousands) out = thousands === 1 ? 'mil' : below1000(thousands) + ' mil';
    if (rest) {
      const joiner = rest < 100 || rest % 100 === 0 ? ' e ' : ' ';
      out += (out ? joiner : '') + below1000(rest);
    }
    return out;
  }

  /* ---------- Precios ---------- */

  function splitMoney(value) {
    const cents = Math.round(Number(value) * 100);
    return { whole: Math.floor(cents / 100), cents: cents % 100 };
  }

  function priceToPt(value, variant) {
    if (!Number.isFinite(Number(value)) || value < 0 || value >= 1000000) return '';
    const pt = variant === 'pt';
    const { whole, cents } = splitMoney(value);
    const unit = pt ? ['euro', 'euros'] : ['real', 'reais'];
    const sub = pt ? ['cêntimo', 'cêntimos'] : ['centavo', 'centavos'];
    const parts = [];
    if (whole > 0 || cents === 0) {
      parts.push(numberToPt(whole, variant) + ' ' + (whole === 1 ? unit[0] : unit[1]));
    }
    if (cents > 0) {
      parts.push(numberToPt(cents, variant) + ' ' + (cents === 1 ? sub[0] : sub[1]));
    }
    return parts.join(' e ');
  }

  function formatPrice(value, variant) {
    const v = Number(value);
    if (!Number.isFinite(v)) return '';
    try {
      return new Intl.NumberFormat(variant === 'pt' ? 'pt-PT' : 'pt-BR', {
        style: 'currency',
        currency: variant === 'pt' ? 'EUR' : 'BRL',
      }).format(v);
    } catch (e) {
      return v.toFixed(2);
    }
  }

  return { PERIODS, periodFor, fill, pick, numberToPt, priceToPt, formatPrice, TOKEN_NAMES };
});
