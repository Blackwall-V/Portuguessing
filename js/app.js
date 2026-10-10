/* Portuguessing — interfaz. Sin dependencias ni build. */
(function () {
  'use strict';

  const { PERIODS, periodFor, pick, numberToPt, priceToPt, formatPrice } = PG;
  const { CATS, decks: DECKS } = PGDATA;

  /* ---------- Estado persistente ---------- */

  const KEY = 'portuguessing.v1';
  const DEFAULTS = {
    variant: 'br', // br | pt
    form: 'f', // f = formal, i = informal
    client: 'm', // género de la persona a la que atiendes
    me: 'm', // tu género (obrigado / obrigada)
    prof: 'tienda',
    period: 'auto', // auto | morning | afternoon | night
    progress: {}, // id → { box 1..5, ok, ko }
    stats: { xp: 0, streak: 0, last: null },
  };

  function loadState() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (raw && typeof raw === 'object') {
        return Object.assign({}, DEFAULTS, raw, { stats: Object.assign({}, DEFAULTS.stats, raw.stats) });
      }
    } catch (e) { /* almacenamiento no disponible */ }
    return JSON.parse(JSON.stringify(DEFAULTS));
  }
  const S = loadState();
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignorar */ }
  }

  /* Estado de la vista (no se guarda) */
  const V = { tab: 'help', cat: 'all', q: '', deck: null, session: null };

  /* ---------- Utilidades ---------- */

  const $ = (sel, root) => (root || document).querySelector(sel);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const deckById = (id) => DECKS.find((d) => d.id === id) || DECKS[0];
  const PHRASES = {};
  DECKS.forEach((d) => d.phrases.forEach((p) => { PHRASES[p.id] = p; }));

  function currentPeriod() {
    return S.period === 'auto' ? periodFor(new Date().getHours()) : S.period;
  }
  function ctx() {
    return { variant: S.variant, form: S.form, client: S.client, me: S.me, period: currentPeriod() };
  }
  function greetingNow() {
    const p = currentPeriod();
    return { Sd: pick({ es: '{esd}', f: '{Sd}' }, ctx()), icon: PERIODS[p].icon };
  }

  const ICON = {
    speaker: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>',
    slow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg>',
    show: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
    help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>',
    learn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9l10-5 10 5-10 5-10-5z"/><path d="M6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  };

  /* ---------- Voz ---------- */

  /* Dentro de la app nativa (Capacitor) se usa la voz del sistema operativo, que funciona
   * sin conexión y suena mejor; en el navegador, la Web Speech API. */
  const Cap = window.Capacitor;
  const isNative = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
  function nativePlugin(name) {
    try { return isNative ? Cap.registerPlugin(name) : null; } catch (e) { return null; }
  }
  const NativeTTS = nativePlugin('TextToSpeech');
  const NativeApp = nativePlugin('App');
  const Haptics = nativePlugin('Haptics');
  const nativeVoice = { 'pt-BR': true, 'pt-PT': true }; // se confirma al arrancar

  const hasWebSpeech = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  const hasSpeech = !!NativeTTS || hasWebSpeech;
  let voices = [];
  function loadVoices() { if (hasWebSpeech) voices = speechSynthesis.getVoices(); }
  if (hasWebSpeech) {
    loadVoices();
    speechSynthesis.addEventListener && speechSynthesis.addEventListener('voiceschanged', loadVoices);
  }
  const speechLang = () => (S.variant === 'pt' ? 'pt-PT' : 'pt-BR');
  function hasPtVoice() {
    return NativeTTS ? nativeVoice[speechLang()] : voices.some((v) => v.lang.toLowerCase().startsWith('pt'));
  }
  function stopSpeech() {
    if (NativeTTS) NativeTTS.stop().catch(() => {});
    else if (hasWebSpeech) speechSynthesis.cancel();
  }
  function haptic(kind) {
    if (!Haptics) return;
    const call = kind === 'ok' ? Haptics.notification({ type: 'SUCCESS' })
      : kind === 'bad' ? Haptics.notification({ type: 'ERROR' }) : Haptics.impact({ style: 'LIGHT' });
    call.catch(() => {});
  }

  function speak(text, slow) {
    if (!hasSpeech) { toast('Tu navegador no tiene voz. Prueba con Chrome, Edge o Safari.'); return; }
    if (NativeTTS) {
      NativeTTS.speak({ text: text.replace(/…/g, ''), lang: speechLang(), rate: slow ? 0.6 : 0.9, pitch: 1, volume: 1, category: 'playback' })
        .catch(() => toast('No se pudo reproducir la voz. Revisa el texto a voz del sistema.'));
      return;
    }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/…/g, ''));
    const lang = speechLang();
    u.lang = lang;
    const norm = (l) => l.replace('_', '-').toLowerCase();
    const v = voices.find((x) => norm(x.lang) === lang.toLowerCase()) || voices.find((x) => norm(x.lang).startsWith('pt'));
    if (v) u.voice = v;
    u.rate = slow ? 0.55 : 0.9;
    speechSynthesis.speak(u);
    if (voices.length && !v) toast('No hay voz en portugués instalada en este dispositivo.');
  }

  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      toast('Copiado');
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast('Copiado'); } catch (e2) { toast('No se pudo copiar'); }
      ta.remove();
    }
  }

  /* ---------- Progreso ---------- */

  const MASTERED = 4;
  const boxOf = (id) => (S.progress[id] ? S.progress[id].box : 0);
  function record(id, correct) {
    const p = S.progress[id] || { box: 0, ok: 0, ko: 0 };
    if (correct) { p.box = Math.min(5, Math.max(1, p.box) + 1); p.ok++; } else { p.box = 1; p.ko++; }
    S.progress[id] = p;
  }
  function deckProgress(d) {
    const done = d.phrases.filter((p) => boxOf(p.id) >= MASTERED).length;
    return { done, total: d.phrases.length, pct: Math.round((done / d.phrases.length) * 100) };
  }
  const dayKey = (d) => d.toLocaleDateString('sv');
  function bumpStreak() {
    const today = dayKey(new Date());
    if (S.stats.last === today) return;
    const y = new Date(); y.setDate(y.getDate() - 1);
    S.stats.streak = S.stats.last === dayKey(y) ? S.stats.streak + 1 : 1;
    S.stats.last = today;
  }
  function currentStreak() {
    const today = dayKey(new Date());
    const y = new Date(); y.setDate(y.getDate() - 1);
    return S.stats.last === today || S.stats.last === dayKey(y) ? S.stats.streak : 0;
  }

  /* ---------- Vista: Ayuda ---------- */

  function seg(name, value, options) {
    return '<div class="seg" role="group">' + options.map(([v, label]) =>
      `<button data-action="set" data-key="${name}" data-value="${v}" aria-pressed="${value === v}">${label}</button>`).join('') + '</div>';
  }

  function visiblePhrases(d) {
    const per = currentPeriod();
    const q = V.q.trim().toLowerCase();
    const c = ctx();
    return d.phrases.filter((ph) => {
      if (ph.when && !ph.when.includes(per)) return false;
      if (V.cat !== 'all' && ph.cat !== V.cat) return false;
      if (q) {
        const t = pick(ph, c);
        if (!(t.pt + ' ' + t.es).toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }

  function phraseCard(ph) {
    const t = pick(ph, ctx());
    const badges = [];
    if (ph.hear) badges.push('<span class="badge hear">👂 Te pueden decir</span>');
    else if (CATS[ph.cat]) badges.push(`<span class="badge">${CATS[ph.cat].icon} ${CATS[ph.cat].label}</span>`);
    if (ph.when) badges.push(`<span class="badge when">${PERIODS[ph.when[0]].icon} ${PERIODS[ph.when[0]].label}</span>`);
    return `<article class="card${ph.hear ? ' hear' : ''}" data-id="${ph.id}">
      <div class="badges">${badges.join('')}</div>
      <div class="pt" lang="pt">${esc(t.pt)}</div>
      <div class="es">${esc(t.es)}</div>
      <div class="actions">
        <button class="icon-btn" data-action="speak" data-id="${ph.id}" aria-label="Escuchar">${ICON.speaker}Escuchar</button>
        <button class="icon-btn" data-action="slow" data-id="${ph.id}" aria-label="Escuchar despacio">${ICON.slow}Lento</button>
        <button class="icon-btn" data-action="copy" data-id="${ph.id}" aria-label="Copiar">${ICON.copy}</button>
        <button class="icon-btn" data-action="show" data-id="${ph.id}" aria-label="Mostrar en pantalla completa">${ICON.show}</button>
      </div>
    </article>`;
  }

  function helpList() {
    const d = deckById(S.prof);
    const list = visiblePhrases(d);
    if (!list.length) return '<p class="empty">No hay frases con ese filtro.</p>';
    return list.map(phraseCard).join('');
  }

  function priceTool() {
    return `<details class="tool" id="priceTool">
      <summary>💶 Decir un precio</summary>
      <div class="tool-body">
        <input class="price-in" id="priceIn" type="number" inputmode="decimal" min="0" max="999999" step="0.01" placeholder="12,50" aria-label="Precio">
        <div class="price-out" id="priceOut"></div>
      </div>
    </details>`;
  }

  function priceOutHtml(raw) {
    const v = parseFloat(String(raw).replace(',', '.'));
    if (!raw || !Number.isFinite(v) || v < 0 || v >= 1000000) return '<small class="es">Escribe un importe para ver cómo se dice.</small>';
    const words = priceToPt(v, S.variant);
    const lines = [
      ['Custa ' + words + '.', 'Cuesta ' + formatPrice(v, S.variant)],
      ['O total é ' + words + '.', 'El total es ' + formatPrice(v, S.variant)],
      ['Fica em ' + words + '.', 'Sale en ' + formatPrice(v, S.variant)],
    ];
    return lines.map(([pt, es], i) => `<div class="price-line">
      <div><b lang="pt">${esc(pt)}</b><br><small class="es">${esc(es)}</small></div>
      <button class="icon-btn" data-action="speak-text" data-text="${esc(pt)}" aria-label="Escuchar">${ICON.speaker}</button>
    </div>`).join('');
  }

  function renderHelp() {
    const d = deckById(S.prof);
    const g = greetingNow();
    const cats = [...new Set(d.phrases.filter((p) => !p.when || p.when.includes(currentPeriod())).map((p) => p.cat))];
    const isFormal = S.form === 'f';
    return `
      <header class="top">
        <div><h1>Ayuda rápida</h1><div class="sub">${esc(d.name)} · ${S.variant === 'pt' ? '🇵🇹 Portugal' : '🇧🇷 Brasil'}</div></div>
        <span class="now" title="Saludo según la hora">${g.icon} ${esc(g.Sd.pt)}</span>
      </header>
      <div class="pills" role="group" aria-label="Profesión">
        ${DECKS.map((x) => `<button class="pill" data-action="prof" data-id="${x.id}" aria-pressed="${x.id === S.prof}">${x.icon} ${esc(x.name)}</button>`).join('')}
      </div>
      <div class="controls">
        <div class="ctl"><span>Trato</span>${seg('form', S.form, [['f', 'Formal'], ['i', 'Informal']])}</div>
        ${isFormal ? `<div class="ctl"><span>Cliente</span>${seg('client', S.client, [['m', 'Señor'], ['f', 'Señora']])}</div>` : ''}
        <div class="ctl"><span>Momento</span>${seg('period', S.period, [['auto', 'Auto'], ['morning', '☀️'], ['afternoon', '🌤️'], ['night', '🌙']])}</div>
      </div>
      ${priceTool()}
      <div class="pills" role="group" aria-label="Categoría">
        <button class="pill small" data-action="cat" data-id="all" aria-pressed="${V.cat === 'all'}">Todas</button>
        ${cats.map((c) => `<button class="pill small" data-action="cat" data-id="${c}" aria-pressed="${V.cat === c}">${CATS[c].icon} ${CATS[c].label}</button>`).join('')}
      </div>
      <input class="search" id="search" type="search" placeholder="Buscar frase…" value="${esc(V.q)}" aria-label="Buscar frase">
      <section id="helpList">${helpList()}</section>`;
  }

  /* ---------- Vista: Aprender ---------- */

  const TIPS = [
    '<b>ão</b> y <b>õe</b> son vocales nasales: <i>pão</i>, <i>informações</i>. No pronuncies la “n” al final.',
    '<b>lh</b> suena como “lli” en español rioplatense suave: <i>filho</i>, <i>trabalho</i>. <b>nh</b> es como la “ñ”: <i>obrigado… manhã</i>.',
    '<b>s</b> entre vocales suena como “z”: <i>casa</i>. A final de sílaba en Portugal suena como “sh”; en Brasil depende de la región.',
    '<b>r</b> inicial y <b>rr</b> suenan fuerte (como una “j” suave en Brasil): <i>rua</i>, <i>carro</i>.',
    '<b>t</b> y <b>d</b> ante “i” (Brasil) suenan “tch” y “dch”: <i>tchía</i> para <i>tia</i>, <i>dchía</i> para <i>dia</i>.',
    'Las vocales átonas se reducen, sobre todo en Portugal: <i>obrigado</i> suena casi “obrigadu”.',
    '<b>Falsos amigos:</b> <i>esquisito</i> = raro; <i>exquisito</i> = <i>delicioso</i>. <i>Embaraçada</i> = confundida/incómoda; <i>embarazada</i> = <i>grávida</i>.',
  ];

  function renderLearn() {
    const total = DECKS.reduce((n, d) => n + d.phrases.length, 0);
    const done = DECKS.reduce((n, d) => n + deckProgress(d).done, 0);
    return `
      <header class="top"><div><h1>Aprender</h1><div class="sub">Practica con las frases de tu trabajo</div></div></header>
      <div class="stats">
        <div class="stat"><b>🔥 ${currentStreak()}</b><span>días seguidos</span></div>
        <div class="stat"><b>⭐ ${S.stats.xp}</b><span>puntos</span></div>
        <div class="stat"><b>${done}/${total}</b><span>dominadas</span></div>
      </div>
      ${DECKS.map((d) => {
        const p = deckProgress(d);
        return `<button class="deck" data-action="open-deck" data-id="${d.id}">
          <span class="ico">${d.icon}</span>
          <span class="meta"><b>${esc(d.name)}</b><small>${esc(d.desc)}</small>
          <span class="bar"><i style="width:${p.pct}%"></i></span></span>
          <small>${p.done}/${p.total}</small>
        </button>`;
      }).join('')}
      <details class="acc"><summary>🔊 Consejos de pronunciación</summary>
        <div class="acc-body"><ul>${TIPS.map((t) => `<li>${t}</li>`).join('')}</ul></div>
      </details>`;
  }

  function renderDeck() {
    const d = deckById(V.deck);
    const p = deckProgress(d);
    return `
      <header class="top"><button class="back" data-action="back">← Volver</button><span class="now">${d.icon} ${esc(d.name)}</span></header>
      <p class="sub" style="color:var(--muted);margin-top:0">${esc(d.desc)} · ${p.done} de ${p.total} dominadas. Se usa el trato y el momento que tengas elegidos en Ayuda (${S.form === 'f' ? 'formal' : 'informal'}).</p>
      <div class="big-actions">
        <button class="big" data-action="start" data-type="cards"><span class="ico">🃏</span><span><b>Tarjetas</b><small>Mira la frase en español y recuerda cómo se dice</small></span></button>
        <button class="big" data-action="start" data-type="quiz"><span class="ico">✅</span><span><b>Quiz</b><small>10 preguntas: elige la traducción correcta</small></span></button>
      </div>
      <h2 style="font-size:1rem;margin:20px 0 8px">Todas las frases</h2>
      ${d.phrases.map(phraseCard).join('')}`;
  }

  /* --- Sesiones --- */

  function startCards(d) {
    const queue = d.phrases
      .map((ph) => ({ ph, score: boxOf(ph.id) + Math.random() * 1.5 }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 10)
      .map((x) => x.ph.id);
    V.session = { type: 'cards', deck: d.id, queue, i: 0, shown: false, right: 0 };
  }

  function startQuiz(d) {
    const c = ctx();
    const types = hasSpeech ? ['es-pt', 'pt-es', 'listen'] : ['es-pt', 'pt-es'];
    const chosen = shuffle(d.phrases).slice(0, 10);
    const questions = chosen.map((ph) => {
      const type = types[Math.floor(Math.random() * types.length)];
      const answerSide = type === 'es-pt' ? 'pt' : 'es';
      const right = pick(ph, c)[answerSide];
      const wrong = [];
      for (const o of shuffle(d.phrases)) {
        if (o.id === ph.id) continue;
        const txt = pick(o, c)[answerSide];
        if (txt !== right && !wrong.includes(txt)) wrong.push(txt);
        if (wrong.length === 3) break;
      }
      return { id: ph.id, type, options: shuffle([right].concat(wrong)), right };
    });
    V.session = { type: 'quiz', deck: d.id, questions, i: 0, answered: null, right: 0 };
  }

  function finish(s) {
    const xp = s.right * 10;
    S.stats.xp += xp;
    bumpStreak();
    save();
    s.done = true;
    s.xp = xp;
  }

  function renderSession() {
    const s = V.session;
    const d = deckById(s.deck);
    const n = s.type === 'cards' ? s.queue.length : s.questions.length;
    const head = `<header class="top"><button class="back" data-action="exit">✕ Salir</button><span class="now">${d.icon} ${esc(d.name)}</span></header>`;

    if (s.done) {
      return head + `<div class="result">
        <div class="score">${s.right}/${n}</div>
        <h2>${s.right === n ? '¡Perfecto!' : s.right >= n * 0.6 ? '¡Muy bien!' : 'Sigue practicando'}</h2>
        <p>Has ganado <b>⭐ ${s.xp}</b> puntos.</p>
        <div class="row" style="flex-direction:column;align-items:stretch">
          <button class="primary-btn" data-action="start" data-type="${s.type}">Otra ronda</button>
          <button class="ghost-btn" data-action="exit">Terminar</button>
        </div></div>`;
    }

    const bar = `<div class="progress"><i style="width:${Math.round((s.i / n) * 100)}%"></i></div>`;

    if (s.type === 'cards') {
      const ph = PHRASES[s.queue[s.i]];
      const t = pick(ph, ctx());
      return head + bar + `<div class="flash">
          <small>${s.i + 1} de ${n} · ¿Cómo se dice en portugués?</small>
          <div class="q">${esc(t.es)}</div>
          ${s.shown ? `<div class="a" lang="pt">${esc(t.pt)}</div>
            <div><button class="icon-btn" data-action="speak" data-id="${ph.id}">${ICON.speaker}Escuchar</button>
            <button class="icon-btn" data-action="slow" data-id="${ph.id}">${ICON.slow}Lento</button></div>` : ''}
        </div>` + (s.shown
        ? `<div class="duo"><button class="ghost-btn danger" data-action="card-answer" data-ok="0">Repasar</button>
           <button class="primary-btn" data-action="card-answer" data-ok="1">Ya lo sé</button></div>`
        : `<div style="margin-top:14px"><button class="primary-btn" data-action="reveal">Mostrar respuesta</button></div>`);
    }

    const q = s.questions[s.i];
    const ph = PHRASES[q.id];
    const t = pick(ph, ctx());
    let prompt;
    if (q.type === 'es-pt') prompt = `<small>¿Cómo se dice en portugués?</small><div class="q">${esc(t.es)}</div>`;
    else if (q.type === 'pt-es') prompt = `<small>¿Qué significa?</small><div class="q" lang="pt">${esc(t.pt)}</div>
      <div><button class="icon-btn" data-action="speak" data-id="${ph.id}">${ICON.speaker}Escuchar</button></div>`;
    else prompt = `<small>Escucha y elige el significado</small>
      <button class="listen-btn" data-action="speak" data-id="${ph.id}" aria-label="Escuchar">${ICON.speaker}</button>
      <div><button class="icon-btn" data-action="slow" data-id="${ph.id}">${ICON.slow}Más lento</button></div>`;
    const answered = s.answered !== null;
    const opts = q.options.map((o, idx) => {
      let cls = 'opt';
      if (answered) {
        if (o === q.right) cls += ' right';
        else if (idx === s.answered) cls += ' wrong';
      }
      const lang = q.type === 'es-pt' ? ' lang="pt"' : '';
      return `<button class="${cls}"${lang} data-action="pick" data-idx="${idx}" ${answered ? 'disabled' : ''}>${esc(o)}</button>`;
    }).join('');
    const fb = answered
      ? `<div class="feedback ${q.options[s.answered] === q.right ? 'ok' : 'bad'}">${q.options[s.answered] === q.right ? '¡Correcto!' : 'Era: ' + esc(q.right)}</div>
         <div style="margin-top:12px"><button class="primary-btn" data-action="next">${s.i + 1 === n ? 'Ver resultado' : 'Siguiente'}</button></div>`
      : '';
    return head + bar + `<div class="flash">${prompt}</div>${opts}${fb}`;
  }

  /* ---------- Vista: Ajustes ---------- */

  let installEvent = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvent = e; if (V.tab === 'settings') render(); });

  function renderSettings() {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const noVoice = !hasSpeech
      ? 'Este navegador no tiene síntesis de voz.'
      : (NativeTTS || voices.length) && !hasPtVoice() ? 'No se encontró una voz en portugués en este dispositivo. Instálala en los ajustes del sistema (Texto a voz).' : '';
    return `
      <header class="top"><div><h1>Ajustes</h1><div class="sub">Personaliza tu portugués</div></div></header>
      <div class="setting"><h3>Variante</h3>
        <p>Cambia vocabulario (<i>banheiro</i> / <i>casa de banho</i>), tuteo y la voz.</p>
        ${seg('variant', S.variant, [['br', '🇧🇷 Brasil'], ['pt', '🇵🇹 Portugal']])}</div>
      <div class="setting"><h3>Trato por defecto</h3>
        <p>Formal: “o senhor / a senhora”. Informal: “você” (Brasil) o “tu” (Portugal).</p>
        ${seg('form', S.form, [['f', 'Formal'], ['i', 'Informal']])}</div>
      <div class="setting"><h3>Yo soy…</h3>
        <p>Para decir <i>obrigado</i> u <i>obrigada</i> correctamente.</p>
        ${seg('me', S.me, [['m', 'Hombre'], ['f', 'Mujer']])}</div>
      <div class="setting"><h3>Voz</h3>
        ${noVoice ? `<div class="note">${esc(noVoice)}</div>` : '<p>Prueba cómo suena con la variante elegida.</p>'}
        <button class="ghost-btn" data-action="speak-text" data-text="Olá! Seja bem-vindo. Em que posso ajudar?">🔊 Probar voz</button></div>
      ${standalone || isNative ? '' : `<div class="setting"><h3>Instalar en el celular</h3>
        ${installEvent
          ? '<p>Instálala y úsala como una app, también sin conexión.</p><button class="primary-btn" data-action="install">Instalar app</button>'
          : ios
            ? '<p>En Safari toca <b>Compartir</b> → <b>Añadir a pantalla de inicio</b>.</p>'
            : '<p>En Chrome abre el menú ⋮ → <b>Instalar app</b> (o <b>Añadir a pantalla de inicio</b>).</p>'}</div>`}
      <div class="setting"><h3>Progreso</h3>
        <p>Puntos: ${S.stats.xp} · Racha: ${currentStreak()} días</p>
        <button class="ghost-btn danger" data-action="reset">Borrar mi progreso</button></div>
      <p class="empty" style="padding-top:8px">Las frases de salud son educativas y no sustituyen a un intérprete profesional.</p>`;
  }

  /* ---------- Render principal ---------- */

  function renderNav() {
    const items = [['help', ICON.help, 'Ayuda'], ['learn', ICON.learn, 'Aprender'], ['settings', ICON.gear, 'Ajustes']];
    $('#nav').innerHTML = '<div class="inner">' + items.map(([id, icon, label]) =>
      `<button data-action="tab" data-id="${id}" ${V.tab === id ? 'aria-current="page"' : ''}>${icon}${label}</button>`).join('') + '</div>';
  }

  function render(keepScroll) {
    const y = window.scrollY;
    let html;
    if (V.session) html = renderSession();
    else if (V.tab === 'help') html = renderHelp();
    else if (V.tab === 'learn') html = V.deck ? renderDeck() : renderLearn();
    else html = renderSettings();
    $('#app').innerHTML = html;
    renderNav();
    $('#nav').hidden = !!V.session;
    if (keepScroll) window.scrollTo(0, y); else window.scrollTo(0, 0);
    const pi = $('#priceIn');
    if (pi) { pi.addEventListener('input', () => { $('#priceOut').innerHTML = priceOutHtml(pi.value); }); $('#priceOut').innerHTML = priceOutHtml(''); }
    const se = $('#search');
    if (se) se.addEventListener('input', () => { V.q = se.value; $('#helpList').innerHTML = helpList(); });
  }

  /* ---------- Pantalla completa para mostrar al cliente ---------- */

  function showBig(ph) {
    const t = pick(ph, ctx());
    const o = $('#overlay');
    o.innerHTML = `<div class="big-pt" lang="pt">${esc(t.pt)}</div><div class="big-es">${esc(t.es)}</div>
      <div class="row"><button data-action="speak" data-id="${ph.id}">🔊 Escuchar</button><button data-action="close-overlay">Cerrar</button></div>`;
    o.hidden = false;
  }

  /* ---------- Eventos ---------- */

  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-action]');
    if (!el) return;
    const a = el.dataset.action;
    const id = el.dataset.id;
    const s = V.session;

    switch (a) {
      case 'tab': V.tab = id; V.deck = null; V.session = null; render(); break;
      case 'set': {
        S[el.dataset.key] = el.dataset.value;
        if (el.dataset.key === 'variant') stopSpeech();
        save(); render(true); break;
      }
      case 'prof': S.prof = id; V.cat = 'all'; V.q = ''; save(); render(); break;
      case 'cat': V.cat = id; render(true); break;
      case 'speak': speak(pick(PHRASES[id], ctx()).pt, false); break;
      case 'slow': speak(pick(PHRASES[id], ctx()).pt, true); break;
      case 'speak-text': speak(el.dataset.text, false); break;
      case 'copy': copyText(pick(PHRASES[id], ctx()).pt); break;
      case 'show': showBig(PHRASES[id]); break;
      case 'close-overlay': $('#overlay').hidden = true; break;
      case 'open-deck': V.deck = id; render(); break;
      case 'back': V.deck = null; render(); break;
      case 'start': {
        const d = deckById(V.deck || (s && s.deck));
        if (el.dataset.type === 'cards') startCards(d); else startQuiz(d);
        render();
        if (V.session.type === 'quiz' && V.session.questions[0].type === 'listen') speak(pick(PHRASES[V.session.questions[0].id], ctx()).pt);
        break;
      }
      case 'exit': V.session = null; render(); break;
      case 'reveal': s.shown = true; render(true); speak(pick(PHRASES[s.queue[s.i]], ctx()).pt); break;
      case 'card-answer': {
        const ok = el.dataset.ok === '1';
        haptic('tap');
        record(s.queue[s.i], ok);
        if (ok) s.right++;
        s.i++; s.shown = false;
        if (s.i >= s.queue.length) finish(s);
        save(); render(); break;
      }
      case 'pick': {
        const q = s.questions[s.i];
        s.answered = Number(el.dataset.idx);
        const ok = q.options[s.answered] === q.right;
        haptic(ok ? 'ok' : 'bad');
        record(q.id, ok);
        if (ok) s.right++;
        save(); render(true); break;
      }
      case 'next': {
        s.i++; s.answered = null;
        if (s.i >= s.questions.length) { finish(s); render(); break; }
        render();
        if (s.questions[s.i].type === 'listen') speak(pick(PHRASES[s.questions[s.i].id], ctx()).pt);
        break;
      }
      case 'install':
        if (installEvent) { installEvent.prompt(); installEvent = null; }
        break;
      case 'reset':
        if (confirm('¿Borrar puntos, racha y progreso de todas las frases?')) {
          S.progress = {}; S.stats = { xp: 0, streak: 0, last: null }; save(); render(true); toast('Progreso borrado');
        }
        break;
      default: break;
    }
  });

  /* Navegación hacia atrás (botón atrás de Android): cierra lo más "profundo" primero. */
  function goBack() {
    if (!$('#overlay').hidden) { $('#overlay').hidden = true; return true; }
    if (V.session) { V.session = null; render(); return true; }
    if (V.deck) { V.deck = null; render(); return true; }
    if (V.tab !== 'help') { V.tab = 'help'; render(); return true; }
    return false;
  }
  if (NativeApp) {
    NativeApp.addListener('backButton', () => {
      if (!goBack()) NativeApp.exitApp();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('#overlay').hidden) $('#overlay').hidden = true;
  });

  /* ---------- Arranque ---------- */

  render();
  if (NativeTTS) {
    ['pt-BR', 'pt-PT'].forEach((lang) => {
      NativeTTS.isLanguageSupported({ lang }).then((r) => {
        nativeVoice[lang] = !!r.supported;
        if (V.tab === 'settings' && !V.session) render(true);
      }).catch(() => {});
    });
  }
  if (!isNative && 'serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* sin soporte offline */ });
  }
})();
