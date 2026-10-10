/* Portuguessing — interfaz. Sin dependencias ni build. */
(function () {
  'use strict';

  const { PERIODS, CURRENCIES, DEFAULT_CURRENCY, periodFor, pick, priceToPt, formatPrice, parseAmount } = PG;
  const I = PGICON.icon;
  const CFG = Object.assign({ suggestUrl: '', suggestFields: {}, extraUrl: 'content/extra.json' }, window.PG_CONFIG);
  // Sin dirección de envío configurada, "Sugerir una frase" solo se ve en localhost (modo prueba)
  const canSuggest = !!CFG.suggestUrl || /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const { CATS, decks: DECKS } = PGDATA;

  /* ---------- Estado persistente ---------- */

  const KEY = 'portuguessing.v1';
  const DEFAULTS = {
    variant: 'br', // br | pt (cómo habla tu cliente)
    currency: DEFAULT_CURRENCY, // moneda de los precios (CLP, USD, BRL…)
    natural: '1', // 1 = usar la voz natural descargada si existe; 0 = voz del dispositivo
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
  const V = { tab: 'help', cat: 'all', q: '', deck: null, session: null, tts: { br: false, pt: false }, dl: null, dlError: '' };

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
  const indexPhrases = () => DECKS.forEach((d) => d.phrases.forEach((p) => { PHRASES[p.id] = p; }));
  indexPhrases();

  function currentPeriod() {
    return S.period === 'auto' ? periodFor(new Date().getHours()) : S.period;
  }
  function ctx() {
    return { variant: S.variant, currency: S.currency, form: S.form, client: S.client, me: S.me, period: currentPeriod() };
  }
  function greetingNow() {
    const p = currentPeriod();
    return { Sd: pick({ es: '{esd}', f: '{Sd}' }, ctx()), icon: I(PERIODS[p].icon) };
  }

  /* ---------- Voz ---------- */

  const hasSpeech = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  let voices = [];
  function loadVoices() { if (hasSpeech) voices = speechSynthesis.getVoices(); }
  if (hasSpeech) {
    loadVoices();
    speechSynthesis.addEventListener && speechSynthesis.addEventListener('voiceschanged', loadVoices);
  }
  const speechLang = () => (S.variant === 'pt' ? 'pt-PT' : 'pt-BR');
  function hasPtVoice() { return voices.some((v) => v.lang.toLowerCase().startsWith('pt')); }

  function findVoice() {
    const lang = speechLang();
    const norm = (l) => l.replace('_', '-').toLowerCase();
    return voices.find((x) => norm(x.lang) === lang.toLowerCase()) || voices.find((x) => norm(x.lang).startsWith('pt'));
  }

  /* Sin voz en portugués en el dispositivo: ofrecer descargar la natural (y decir la frase al terminar) */
  function offerNatural(text, slow) {
    if (!PGTTS.supported() || V.tts[S.variant]) return false;
    if (V.dl) { toast('Descargando la voz… espera un momento.'); return true; }
    const mb = V.tts.br || V.tts.pt ? PGTTS.MB.voice : PGTTS.MB.first;
    toast('No hay voz en portugués en este dispositivo. ¿Descargar una voz natural (unos ' + mb + ' MB)?',
      { label: 'Descargar', run: () => ttsInstall(S.variant, () => speak(text, slow)) });
    return true;
  }

  /* Voz del dispositivo (speechSynthesis) */
  function speakSystem(text, slow) {
    const v = hasSpeech ? findVoice() : null;
    if (!v && offerNatural(text, slow)) return;
    if (!hasSpeech) { toast('Tu navegador no tiene voz. Prueba con Chrome, Edge o Safari.'); return; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = speechLang();
    if (v) u.voice = v;
    u.rate = slow ? 0.55 : 0.9;
    // Chrome a veces ignora un speak() que llega justo después de cancel()
    setTimeout(() => speechSynthesis.speak(u), 60);
    if (!v) toast('No hay voz en portugués en este dispositivo.');
  }

  /* Voz natural (descargada) si existe y está activada; si falla, la del dispositivo */
  const useNatural = () => PGTTS.supported() && V.tts[S.variant] && S.natural !== '0';

  function speak(text, slow) {
    const clean = text.replace(/…/g, '');
    if (!useNatural()) { PGTTS.stop(); speakSystem(clean, slow); return; }
    if (hasSpeech) speechSynthesis.cancel();
    PGTTS.speak(clean, { variant: S.variant, slow, onLoading: (on) => { if (on) toast('Preparando la voz…'); } })
      .catch((e) => { console.warn('Voz natural:', e); speakSystem(clean, slow); });
  }

  async function ttsInstall(variant, after) {
    if (V.dl) return;
    V.dl = { variant, label: PGTTS.VOICES[variant].label, pct: 0 };
    V.dlError = '';
    const msg = () => 'Descargando la voz de ' + V.dl.label + '… ' + V.dl.pct + '%';
    if (V.tab === 'settings' && !V.session) refreshSettings();
    else toast(msg(), { sticky: true, kind: 'dl' });
    try {
      await PGTTS.install(variant, (p) => {
        V.dl.pct = Math.round(p * 100);
        const bar = $('#ttsBar'), pct = $('#ttsPct'), t = $('#toast');
        if (bar) bar.style.width = V.dl.pct + '%';
        if (pct) pct.textContent = V.dl.pct + '%';
        if (t.dataset.kind === 'dl' && !t.hidden) $('#toast .t-msg').textContent = msg();
      });
      V.tts[variant] = true;
      if ($('#toast').dataset.kind === 'dl') hideToast();
      if (!after) toast('Voz lista: ya puedes usarla sin conexión');
    } catch (e) {
      console.warn('Descarga de voz:', e);
      V.dlError = 'No se pudo descargar la voz. Revisa tu conexión e inténtalo de nuevo.';
      toast(V.dlError, { label: 'Reintentar', run: () => ttsInstall(variant, after) });
      after = null;
    }
    V.dl = null;
    refreshSettings();
    if (after) after();
  }

  function refreshSettings() {
    if (V.tab === 'settings' && !V.session) render(true);
  }

  if (PGTTS.supported()) {
    Object.keys(PGTTS.VOICES).forEach((v) => PGTTS.isInstalled(v).then((ok) => {
      V.tts[v] = ok;
      if (ok && !V.dl) refreshSettings();
    }));
  }

  /* toast(texto, { label, run, sticky, kind }): con label/run lleva un botón de acción */
  let toastTimer, toastAction = null;
  function toast(msg, opts) {
    const o = opts || {};
    const t = $('#toast');
    toastAction = o.run || null;
    t.dataset.kind = o.kind || '';
    t.innerHTML = `<span class="t-msg">${esc(msg)}</span>` + (o.run ? `<button class="t-act" data-action="toast-act">${esc(o.label)}</button>` : '');
    t.hidden = false;
    clearTimeout(toastTimer);
    if (!o.sticky) toastTimer = setTimeout(() => { t.hidden = true; }, o.run ? 9000 : 2600);
  }
  function hideToast() { clearTimeout(toastTimer); $('#toast').hidden = true; }

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
    return '<div class="seg" role="group">' + options.map(([v, label, aria]) =>
      `<button data-action="set" data-key="${name}" data-value="${v}" aria-pressed="${value === v}"${aria ? ` aria-label="${aria}" title="${aria}"` : ''}>${label}</button>`).join('') + '</div>';
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
    if (ph.hear) badges.push(`<span class="badge hear">${I('ear')}Te pueden decir</span>`);
    else if (CATS[ph.cat]) badges.push(`<span class="badge">${I(CATS[ph.cat].icon)}${CATS[ph.cat].label}</span>`);
    if (ph.when) badges.push(`<span class="badge when">${I(PERIODS[ph.when[0]].icon)}${PERIODS[ph.when[0]].label}</span>`);
    return `<article class="card${ph.hear ? ' hear' : ''}" data-id="${ph.id}">
      <div class="badges">${badges.join('')}</div>
      <div class="pt" lang="pt">${esc(t.pt)}</div>
      <div class="es">${esc(t.es)}</div>
      <div class="actions">
        <button class="icon-btn" data-action="speak" data-id="${ph.id}" aria-label="Escuchar">${I('speaker')}Escuchar</button>
        <button class="icon-btn" data-action="slow" data-id="${ph.id}" aria-label="Escuchar despacio">${I('slow')}Lento</button>
        <button class="icon-btn" data-action="copy" data-id="${ph.id}" aria-label="Copiar">${I('copy')}</button>
        <button class="icon-btn" data-action="show" data-id="${ph.id}" aria-label="Mostrar en pantalla completa">${I('expand')}</button>
      </div>
    </article>`;
  }

  function helpList() {
    const d = deckById(S.prof);
    const list = visiblePhrases(d);
    const cta = canSuggest ? `<div class="suggest-cta"><span>¿Te falta una frase?</span>
      <button class="ghost-btn" data-action="suggest" data-es="${esc(V.q.trim())}">${I('plus')}Sugerir una frase</button></div>` : '';
    if (!list.length) return '<p class="empty">No hay frases con ese filtro.</p>' + cta;
    return list.map(phraseCard).join('') + cta;
  }

  function priceTool() {
    return `<details class="tool" id="priceTool">
      <summary><span class="sum-l">${I('calc')}Decir un precio<span class="chip">${S.currency}</span></span>${I('chevron', 'chev')}</summary>
      <div class="tool-body">
        <input class="price-in" id="priceIn" type="text" inputmode="${CURRENCIES[S.currency].decimals ? 'decimal' : 'numeric'}" autocomplete="off" placeholder="${CURRENCIES[S.currency].decimals ? '12,50' : '12.500'}" aria-label="Precio en ${S.currency}">
        <div class="price-out" id="priceOut"></div>
      </div>
    </details>`;
  }

  function priceOutHtml(raw) {
    const v = parseAmount(raw, S.currency);
    if (!raw || !Number.isFinite(v) || v < 0 || v >= 1e9) return '<small class="es">Escribe un importe para ver cómo se dice.</small>';
    const words = priceToPt(v, S.variant, S.currency);
    const shown = formatPrice(v, S.variant, S.currency);
    const lines = [
      ['Custa ' + words + '.', 'Cuesta ' + shown],
      ['O total é ' + words + '.', 'El total es ' + shown],
      ['Fica em ' + words + '.', 'Sale en ' + shown],
    ];
    return lines.map(([pt, es], i) => `<div class="price-line">
      <div><b lang="pt">${esc(pt)}</b><br><small class="es">${esc(es)}</small></div>
      <button class="icon-btn" data-action="speak-text" data-text="${esc(pt)}" aria-label="Escuchar">${I('speaker')}</button>
    </div>`).join('');
  }

  function renderHelp() {
    const d = deckById(S.prof);
    const g = greetingNow();
    const cats = [...new Set(d.phrases.filter((p) => !p.when || p.when.includes(currentPeriod())).map((p) => p.cat))];
    const isFormal = S.form === 'f';
    return `
      <header class="top">
        <div><h1>Ayuda rápida</h1><div class="sub">${esc(d.name)} · ${S.variant === 'pt' ? 'Portugal' : 'Brasil'}</div></div>
        <span class="now" title="Saludo según la hora">${g.icon}${esc(g.Sd.pt)}</span>
      </header>
      <div class="pills" role="group" aria-label="Profesión">
        ${DECKS.map((x) => `<button class="pill" data-action="prof" data-id="${x.id}" aria-pressed="${x.id === S.prof}">${I(x.icon)}${esc(x.name)}</button>`).join('')}
      </div>
      <div class="controls">
        <div class="ctl"><span>Trato</span>${seg('form', S.form, [['f', 'Formal'], ['i', 'Informal']])}</div>
        ${isFormal ? `<div class="ctl"><span>Cliente</span>${seg('client', S.client, [['m', 'Señor'], ['f', 'Señora']])}</div>` : ''}
        <div class="ctl"><span>Momento</span>${seg('period', S.period, [['auto', 'Auto'], ['morning', I('sun'), 'Mañana'], ['afternoon', I('cloudsun'), 'Tarde'], ['night', I('moon'), 'Noche']])}</div>
      </div>
      ${priceTool()}
      <div class="pills" role="group" aria-label="Categoría">
        <button class="pill small" data-action="cat" data-id="all" aria-pressed="${V.cat === 'all'}">Todas</button>
        ${cats.map((c) => `<button class="pill small" data-action="cat" data-id="${c}" aria-pressed="${V.cat === c}">${I(CATS[c].icon)}${CATS[c].label}</button>`).join('')}
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
        <div class="stat flame">${I('flame')}<b>${currentStreak()}</b><span>días seguidos</span></div>
        <div class="stat">${I('star')}<b>${S.stats.xp}</b><span>puntos</span></div>
        <div class="stat">${I('trophy')}<b>${done}/${total}</b><span>dominadas</span></div>
      </div>
      ${DECKS.map((d) => {
        const p = deckProgress(d);
        return `<button class="deck" data-action="open-deck" data-id="${d.id}">
          <span class="ico">${I(d.icon)}</span>
          <span class="meta"><b>${esc(d.name)}</b><small>${esc(d.desc)}</small>
          <span class="bar"><i style="width:${p.pct}%"></i></span></span>
          <small>${p.done}/${p.total}</small>
        </button>`;
      }).join('')}
      <details class="acc"><summary><span class="sum-l">${I('speaker')}Consejos de pronunciación</span>${I('chevron', 'chev')}</summary>
        <div class="acc-body"><ul>${TIPS.map((t) => `<li>${t}</li>`).join('')}</ul></div>
      </details>`;
  }

  function renderDeck() {
    const d = deckById(V.deck);
    const p = deckProgress(d);
    return `
      <header class="top"><button class="back" data-action="back">${I('back')}Volver</button><span class="now">${I(d.icon)}${esc(d.name)}</span></header>
      <p class="sub" style="color:var(--muted);margin-top:0">${esc(d.desc)} · ${p.done} de ${p.total} dominadas. Se usa el trato y el momento que tengas elegidos en Ayuda (${S.form === 'f' ? 'formal' : 'informal'}).</p>
      <div class="big-actions">
        <button class="big" data-action="start" data-type="cards"><span class="ico">${I('cards')}</span><span><b>Tarjetas</b><small>Mira la frase en español y recuerda cómo se dice</small></span></button>
        <button class="big" data-action="start" data-type="quiz"><span class="ico">${I('quiz')}</span><span><b>Quiz</b><small>10 preguntas: elige la traducción correcta</small></span></button>
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
    const head = `<header class="top"><button class="back" data-action="exit">${I('close')}Salir</button><span class="now">${I(d.icon)}${esc(d.name)}</span></header>`;

    if (s.done) {
      return head + `<div class="result">
        <div class="score">${s.right}/${n}</div>
        <h2>${s.right === n ? '¡Perfecto!' : s.right >= n * 0.6 ? '¡Muy bien!' : 'Sigue practicando'}</h2>
        <p>Has ganado <b class="xp">${I('star')}${s.xp}</b> puntos.</p>
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
            <div><button class="icon-btn" data-action="speak" data-id="${ph.id}">${I('speaker')}Escuchar</button>
            <button class="icon-btn" data-action="slow" data-id="${ph.id}">${I('slow')}Lento</button></div>` : ''}
        </div>` + (s.shown
        ? `<div class="duo"><button class="ghost-btn danger" data-action="card-answer" data-ok="0">${I('retry')}Repasar</button>
           <button class="primary-btn" data-action="card-answer" data-ok="1">${I('check')}Ya lo sé</button></div>`
        : `<div style="margin-top:14px"><button class="primary-btn" data-action="reveal">Mostrar respuesta</button></div>`);
    }

    const q = s.questions[s.i];
    const ph = PHRASES[q.id];
    const t = pick(ph, ctx());
    let prompt;
    if (q.type === 'es-pt') prompt = `<small>¿Cómo se dice en portugués?</small><div class="q">${esc(t.es)}</div>`;
    else if (q.type === 'pt-es') prompt = `<small>¿Qué significa?</small><div class="q" lang="pt">${esc(t.pt)}</div>
      <div><button class="icon-btn" data-action="speak" data-id="${ph.id}">${I('speaker')}Escuchar</button></div>`;
    else prompt = `<small>Escucha y elige el significado</small>
      <button class="listen-btn" data-action="speak" data-id="${ph.id}" aria-label="Escuchar">${I('speaker')}</button>
      <div><button class="icon-btn" data-action="slow" data-id="${ph.id}">${I('slow')}Más lento</button></div>`;
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
      ? `<div class="feedback ${q.options[s.answered] === q.right ? 'ok' : 'bad'}">${q.options[s.answered] === q.right ? I('okcircle') + '¡Correcto!' : I('xcircle') + 'Era: ' + esc(q.right)}</div>
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
      : voices.length && !hasPtVoice() ? 'No se encontró una voz en portugués en este dispositivo.' : '';
    const label = PGTTS.VOICES[S.variant].label;
    const anyInstalled = V.tts.br || V.tts.pt;
    let natural = '';
    if (PGTTS.supported()) {
      if (V.dl) {
        natural = `<p>Descargando la voz de ${esc(V.dl.label)}… no cierres la app.</p>
          <div class="bar"><i id="ttsBar" style="width:${V.dl.pct}%"></i></div><small class="muted" id="ttsPct">${V.dl.pct}%</small>`;
      } else if (V.tts[S.variant]) {
        natural = `<p>Voz natural de ${esc(label)} instalada. Funciona sin conexión.</p>
          ${seg('natural', S.natural, [['1', 'Natural'], ['0', 'Del dispositivo']])}
          <button class="ghost-btn gap" data-action="tts-remove">${I('trash')}Quitar voz de ${esc(label)}</button>`;
      } else {
        natural = `<p>Descarga una voz más clara que funciona sin conexión (unos ${anyInstalled ? PGTTS.MB.voice : PGTTS.MB.first} MB, una sola vez). Mejor con wifi.</p>
          <button class="primary-btn" data-action="tts-install">${I('download')}Descargar voz de ${esc(label)}</button>`;
      }
      if (V.dlError) natural += `<div class="note gap">${esc(V.dlError)}</div>`;
    }
    return `
      <header class="top"><div><h1>Ajustes</h1><div class="sub">Personaliza tu portugués</div></div></header>
      <div class="setting"><h3>Portugués de tu cliente</h3>
        <p>Cambia vocabulario (<i>banheiro</i> / <i>casa de banho</i>), tuteo y la voz.</p>
        ${seg('variant', S.variant, [['br', 'Brasil'], ['pt', 'Portugal']])}</div>
      <div class="setting"><h3>Moneda</h3>
        <p>Para decir precios y para las frases con importes (por ejemplo, en Chile: pesos).</p>
        <select class="select" data-select="currency" aria-label="Moneda">${Object.keys(CURRENCIES).map((code) =>
          `<option value="${code}"${code === S.currency ? ' selected' : ''}>${esc(CURRENCIES[code].country)} · ${code}</option>`).join('')}</select></div>
      <div class="setting"><h3>Trato por defecto</h3>
        <p>Formal: “o senhor / a senhora”. Informal: “você” (Brasil) o “tu” (Portugal).</p>
        ${seg('form', S.form, [['f', 'Formal'], ['i', 'Informal']])}</div>
      <div class="setting"><h3>Yo soy…</h3>
        <p>Para decir <i>obrigado</i> u <i>obrigada</i> correctamente.</p>
        ${seg('me', S.me, [['m', 'Hombre'], ['f', 'Mujer']])}</div>
      <div class="setting"><h3>Voz natural</h3>${natural || '<p>Este navegador no puede descargar voces; se usa la del dispositivo.</p>'}</div>
      <div class="setting"><h3>Probar la voz</h3>
        ${noVoice && !useNatural() ? `<div class="note">${esc(noVoice)}</div>` : '<p>Escucha cómo suena con la variante elegida.</p>'}
        <button class="ghost-btn" data-action="speak-text" data-text="Olá! Seja bem-vindo. Em que posso ajudar?">${I('speaker')}Probar voz</button></div>
      ${standalone ? '' : `<div class="setting"><h3>Instalar en el celular</h3>
        ${installEvent
          ? `<p>Instálala y úsala como una app, también sin conexión.</p><button class="primary-btn" data-action="install">${I('download')}Instalar app</button>`
          : ios
            ? '<p>En Safari toca <b>Compartir</b> → <b>Añadir a pantalla de inicio</b>.</p>'
            : '<p>En Chrome abre el menú ⋮ → <b>Instalar app</b> (o <b>Añadir a pantalla de inicio</b>).</p>'}</div>`}
      ${canSuggest ? `<div class="setting"><h3>Ayúdanos a mejorar</h3>
        <p>¿Te falta una frase en tu trabajo? Cuéntanosla y la agregamos para todos.</p>
        <button class="ghost-btn" data-action="suggest">${I('plus')}Sugerir una frase</button></div>` : ''}
      <div class="setting"><h3>Progreso</h3>
        <p>Puntos: ${S.stats.xp} · Racha: ${currentStreak()} días</p>
        <button class="ghost-btn danger" data-action="reset">${I('trash')}Borrar mi progreso</button></div>
      <p class="empty" style="padding-top:8px">Las frases de salud son educativas y no sustituyen a un intérprete profesional.</p>`;
  }

  /* ---------- Sugerir una frase ---------- */

  const OUTBOX = 'portuguessing.outbox';
  const readOutbox = () => { try { return JSON.parse(localStorage.getItem(OUTBOX) || '[]'); } catch (e) { return []; } };
  const writeOutbox = (list) => { try { localStorage.setItem(OUTBOX, JSON.stringify(list.slice(-20))); } catch (e) { /* ignorar */ } };

  /* 'sent' | 'test'; lanza TypeError si no hay red y Error con .status si el servidor rechaza */
  async function postSuggestion(payload) {
    if (!CFG.suggestUrl) { console.info('[modo prueba] sugerencia no enviada:', payload); return 'test'; }
    const res = await fetch(CFG.suggestUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(Object.assign({}, CFG.suggestFields, payload)),
    });
    if (!res.ok) { const e = new Error('HTTP ' + res.status); e.status = res.status; throw e; }
    return 'sent';
  }

  /* Reenvía lo que quedó pendiente por falta de conexión */
  async function flushOutbox() {
    if (!CFG.suggestUrl) return;
    const keep = [];
    for (const item of readOutbox()) {
      try { await postSuggestion(item); } catch (e) {
        if (!e.status || e.status >= 500 || e.status === 429) keep.push(item); // red o servidor: reintentar luego
      }
    }
    writeOutbox(keep);
  }
  window.addEventListener('online', flushOutbox);

  function openSuggest(prefill) {
    const sh = $('#sheet');
    sh.innerHTML = `<div class="back" data-action="close-sheet"></div>
      <form id="suggestForm" role="dialog" aria-modal="true" aria-labelledby="sgTitle" novalidate>
        <h2 id="sgTitle">Sugerir una frase</h2>
        <p class="lead">Cuéntanos qué te faltó. La revisamos y la agregamos para todos.</p>
        <label>¿Qué quieres decir? <small>(en español)</small>
          <textarea name="es" rows="2" maxlength="300" required placeholder="Ej.: ¿Tiene alguna alergia?">${esc(prefill || '')}</textarea></label>
        <label>Profesión
          <select name="deck">${DECKS.map((d) => `<option value="${d.id}"${d.id === S.prof ? ' selected' : ''}>${esc(d.name)}</option>`).join('')}<option value="otra">Otra</option></select></label>
        <label>Cómo se dice en portugués <small>(opcional, si lo sabes)</small>
          <textarea name="pt" rows="2" maxlength="300" lang="pt"></textarea></label>
        <label>Tu correo <small>(opcional, solo para avisarte cuando esté)</small>
          <input type="email" name="email" maxlength="120" autocomplete="email" inputmode="email"></label>
        <input class="hp" type="text" name="_gotcha" tabindex="-1" autocomplete="off" aria-hidden="true">
        <p class="fine">Se envía lo que escribes aquí, la variante (${S.variant === 'pt' ? 'Portugal' : 'Brasil'}) y el trato elegido. Nada más.</p>
        <div class="note" id="sgError" hidden></div>
        <div class="duo">
          <button type="button" class="ghost-btn" data-action="close-sheet">Cancelar</button>
          <button type="submit" class="primary-btn" id="sgSend">Enviar</button>
        </div>
      </form>`;
    sh.hidden = false;
    setTimeout(() => { const f = $('#sheet textarea[name="es"]'); if (f) f.focus(); }, 50);
  }
  const closeSuggest = () => { $('#sheet').hidden = true; $('#sheet').innerHTML = ''; };

  document.addEventListener('submit', async (ev) => {
    if (ev.target.id !== 'suggestForm') return;
    ev.preventDefault();
    const f = ev.target;
    const val = (n) => f.elements[n].value.trim();
    const err = $('#sgError');
    const fail = (m) => { err.textContent = m; err.hidden = false; };
    err.hidden = true;
    if (val('es').length < 3) { fail('Escribe la frase que te faltó (en español).'); f.elements.es.focus(); return; }
    if (val('email') && !f.elements.email.checkValidity()) { fail('Revisa el correo: no parece válido.'); return; }
    if (val('_gotcha')) { closeSuggest(); toast('Gracias: la revisaremos'); return; } // un bot rellenó el campo oculto
    const deck = DECKS.find((d) => d.id === val('deck'));
    const payload = {
      tipo: 'sugerencia-frase',
      es: val('es'), pt: val('pt'), profesion: deck ? deck.name : 'Otra',
      variante: S.variant, trato: S.form, moneda: S.currency,
      email: val('email'), idioma: navigator.language || '', enviado: new Date().toISOString(),
    };
    payload.message = ['Profesión: ' + payload.profesion, 'Español: ' + payload.es,
      'Portugués: ' + (payload.pt || '(no indicado)'), 'Variante: ' + payload.variante + ' · trato: ' + payload.trato].join('\n');
    const btn = $('#sgSend');
    btn.disabled = true; btn.textContent = 'Enviando…';
    try {
      const r = await postSuggestion(payload);
      closeSuggest();
      toast(r === 'test' ? 'Modo prueba: no se envió (falta suggestUrl en js/config.js)' : 'Gracias: la revisaremos y la agregamos');
    } catch (e) {
      if (!e.status) { // sin red: se guarda y se envía al volver la conexión
        writeOutbox(readOutbox().concat([payload]));
        closeSuggest();
        toast('Sin conexión: la enviaremos cuando vuelvas a tener internet');
      } else {
        btn.disabled = false; btn.textContent = 'Enviar';
        fail('No se pudo enviar. Inténtalo de nuevo en un momento.');
      }
    }
  });

  /* ---------- Frases aprobadas en vivo ---------- */

  async function loadExtra() {
    try {
      const res = await fetch(CFG.extraUrl, { cache: 'no-cache' });
      if (!res.ok) return;
      const { added, rejected } = PGDATA.mergeExtra(await res.json(), PG.TOKEN_NAMES);
      if (rejected.length) console.warn('Frases aprobadas descartadas:', rejected);
      if (added) { indexPhrases(); if (!V.session) render(true); }
    } catch (e) { /* sin conexión o sin archivo: se usan solo las frases incluidas */ }
  }

  /* ---------- Render principal ---------- */

  function renderNav() {
    const items = [['help', I('help'), 'Ayuda'], ['learn', I('learn'), 'Aprender'], ['settings', I('settings'), 'Ajustes']];
    $('#nav').innerHTML = '<div class="inner">' + items.map(([id, icon, label]) =>
      `<button data-action="tab" data-id="${id}" ${V.tab === id ? 'aria-current="page"' : ''}><span class="nav-i">${icon}</span>${label}</button>`).join('') + '</div>';
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
      <div class="row"><button data-action="speak" data-id="${ph.id}">${I('speaker')}Escuchar</button><button data-action="close-overlay">${I('close')}Cerrar</button></div>`;
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
        if (el.dataset.key === 'variant' && hasSpeech) speechSynthesis.cancel();
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
      case 'suggest': openSuggest(el.dataset.es); break;
      case 'close-sheet': closeSuggest(); break;
      case 'toast-act': { const run = toastAction; hideToast(); if (run) run(); break; }
      case 'tts-install': ttsInstall(S.variant); break;
      case 'tts-remove':
        PGTTS.remove(S.variant).then(() => { V.tts[S.variant] = false; refreshSettings(); toast('Voz eliminada'); });
        break;
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

  document.addEventListener('change', (ev) => {
    const el = ev.target.closest('[data-select]');
    if (!el || !(el.value in CURRENCIES)) return;
    S[el.dataset.select] = el.value;
    save(); render(true);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('#overlay').hidden) $('#overlay').hidden = true;
    if (e.key === 'Escape' && !$('#sheet').hidden) closeSuggest();
  });

  /* ---------- Arranque ---------- */

  render();
  loadExtra();
  flushOutbox();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* sin soporte offline */ });
  }
})();
