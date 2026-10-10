/* Voz natural en el navegador: Piper (modelo VITS en ONNX) con WebAssembly.
 * No hay servidor. Los archivos se descargan una vez, se guardan en Cache Storage
 * y después todo funciona sin conexión.
 *
 *   PGTTS.install('br', (p) => …)   descarga voz + motor (p = 0..1)
 *   PGTTS.speak('Bom dia', { variant: 'br', slow: false })
 *
 * Piezas (todas de CDN, solo se piden al instalar):
 *   - onnxruntime-web 1.18 (ejecuta el modelo)
 *   - piper_phonemize (espeak-ng en WASM: texto → fonemas)
 *   - modelo de voz de rhasspy/piper-voices (copia de diffusionstudio en Hugging Face)
 */
(function (root) {
  'use strict';

  const ORT_BASE = 'https://cdnjs.cloudflare.com/ajax/libs/onnxruntime-web/1.18.0/';
  const PHON_BASE = 'https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize';
  const HF_BASE = 'https://huggingface.co/diffusionstudio/piper-voices/resolve/main/';
  const CACHE = 'portuguessing-voice-v1';
  const SLOW = 1.7; // length_scale × 1.7 = habla más despacio

  const VOICES = {
    br: { id: 'pt_BR-faber-medium', path: 'pt/pt_BR/faber/medium/pt_BR-faber-medium', label: 'Brasil' },
    pt: { id: 'pt_PT-tugão-medium', path: 'pt/pt_PT/tug%C3%A3o/medium/pt_PT-tug%C3%A3o-medium', label: 'Portugal' },
  };

  /* Tamaños aproximados (bytes), solo para la barra de progreso. */
  const SIZE = { model: 63201294, json: 4855, ortJs: 142930, ortWasm: 10500000, phonWasm: 635212, phonData: 18077249 };
  /* Descarga total aproximada en MB: voz + motor compartido */
  const MB = { first: Math.round((SIZE.model + SIZE.ortJs + SIZE.ortWasm + SIZE.phonWasm + SIZE.phonData) / 1e6), voice: Math.round(SIZE.model / 1e6) };

  const supported = () =>
    typeof WebAssembly === 'object' && typeof caches === 'object' && typeof Blob === 'function' && typeof document === 'object';

  /* WebAssembly SIMD (todos los navegadores actuales). Decide qué binario de ORT usar. */
  const hasSimd = () => WebAssembly.validate(new Uint8Array([
    0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11,
  ]));
  const ortWasmName = () => (hasSimd() ? 'ort-wasm-simd.wasm' : 'ort-wasm.wasm');

  const modelUrl = (v) => HF_BASE + VOICES[v].path + '.onnx';
  const configUrl = (v) => HF_BASE + VOICES[v].path + '.onnx.json';
  const SHARED = () => [
    { url: ORT_BASE + 'ort.wasm.min.js', size: SIZE.ortJs },
    { url: ORT_BASE + ortWasmName(), size: SIZE.ortWasm },
    { url: PHON_BASE + '.js', size: 120714 },
    { url: PHON_BASE + '.wasm', size: SIZE.phonWasm },
    { url: PHON_BASE + '.data', size: SIZE.phonData },
  ];
  const filesFor = (v) => SHARED().concat([{ url: configUrl(v), size: SIZE.json }, { url: modelUrl(v), size: SIZE.model }]);

  /* ---------- Cache Storage ---------- */

  async function cacheHas(url) {
    const c = await caches.open(CACHE);
    return !!(await c.match(url));
  }

  /* Devuelve el contenido (ArrayBuffer) desde la caché o, si no está, lo descarga y lo guarda. */
  async function fetchCached(url, onBytes) {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(url);
    if (hit) return hit.arrayBuffer();
    const res = await fetch(url);
    if (!res.ok) throw new Error('No se pudo descargar (' + res.status + ')');
    const type = res.headers.get('Content-Type') || 'application/octet-stream';
    const chunks = [];
    if (res.body && res.body.getReader) {
      const reader = res.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        if (onBytes) onBytes(value.length);
      }
    } else {
      chunks.push(new Uint8Array(await res.arrayBuffer()));
    }
    const blob = new Blob(chunks, { type });
    await cache.put(url, new Response(blob, { headers: { 'Content-Type': type } }));
    return blob.arrayBuffer();
  }

  async function isInstalled(variant) {
    if (!supported() || !VOICES[variant]) return false;
    try {
      const have = await Promise.all(filesFor(variant).map((f) => cacheHas(f.url)));
      return have.every(Boolean);
    } catch (e) { return false; }
  }

  /* ---------- Motor (se carga una vez por sesión) ---------- */

  let runtime = null;

  function runScript(buffer) {
    const url = URL.createObjectURL(new Blob([buffer], { type: 'text/javascript' }));
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = url;
      s.onload = () => { URL.revokeObjectURL(url); s.remove(); resolve(); };
      s.onerror = () => { URL.revokeObjectURL(url); s.remove(); reject(new Error('No se pudo cargar el motor de voz')); };
      document.head.appendChild(s);
    });
  }

  function loadRuntime() {
    if (runtime) return runtime;
    runtime = (async () => {
      const [ortJs, ortWasm, phonJs, phonWasm, phonData] = await Promise.all(SHARED().map((f) => fetchCached(f.url)));
      await runScript(ortJs);
      await runScript(phonJs);
      const ort = root.ort;
      if (!ort || typeof root.createPiperPhonemize !== 'function') throw new Error('Motor de voz incompleto');
      ort.env.logLevel = 'error';
      ort.env.wasm.numThreads = 1; // sin aislamiento entre orígenes no hay hilos
      const wasmUrl = URL.createObjectURL(new Blob([ortWasm], { type: 'application/wasm' }));
      ort.env.wasm.wasmPaths = { [ortWasmName()]: wasmUrl };
      return { ort, phonWasm, phonData };
    })();
    runtime.catch(() => { runtime = null; });
    return runtime;
  }

  /* Texto → ids de fonemas (espeak-ng en WASM). Cada llamada crea una instancia nueva. */
  async function phonemize(rt, text, espeakVoice) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const done = (fn, v) => { if (!settled) { settled = true; fn(v); } };
      Promise.resolve(root.createPiperPhonemize({
        print: (line) => { try { done(resolve, JSON.parse(line).phoneme_ids); } catch (e) { done(reject, e); } },
        printErr: () => { /* espeak escribe avisos aquí; no son errores */ },
        wasmBinary: rt.phonWasm,
        getPreloadedPackage: () => rt.phonData,
        locateFile: (u) => u,
      })).then((mod) => {
        try {
          mod.callMain(['-l', espeakVoice, '--input', JSON.stringify([{ text }]), '--espeak_data', '/espeak-ng-data']);
        } catch (e) { /* el programa termina con ExitStatus: normal si ya imprimió */ }
        done(reject, new Error('No se pudieron obtener los fonemas'));
      }).catch((e) => done(reject, e));
    });
  }

  /* ---------- Voz cargada en memoria (una a la vez) ---------- */

  let loaded = null; // { variant, config, session }

  async function ensureVoice(variant) {
    if (loaded && loaded.variant === variant) return loaded;
    const rt = await loadRuntime();
    if (loaded) { try { loaded.session.release(); } catch (e) { /* ignorar */ } loaded = null; }
    const [cfgBuf, modelBuf] = await Promise.all([fetchCached(configUrl(variant)), fetchCached(modelUrl(variant))]);
    const config = JSON.parse(new TextDecoder().decode(cfgBuf));
    const session = await rt.ort.InferenceSession.create(modelBuf, { executionProviders: ['wasm'] });
    loaded = { variant, config, session };
    return loaded;
  }

  function pcmToWav(pcm, sampleRate) {
    const view = new DataView(new ArrayBuffer(44 + pcm.length * 2));
    const str = (o, s) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
    str(0, 'RIFF'); view.setUint32(4, 36 + pcm.length * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true); view.setUint16(34, 16, true); str(36, 'data'); view.setUint32(40, pcm.length * 2, true);
    for (let i = 0; i < pcm.length; i++) {
      const v = Math.max(-1, Math.min(1, pcm[i]));
      view.setInt16(44 + i * 2, v < 0 ? v * 32768 : v * 32767, true);
    }
    return new Blob([view.buffer], { type: 'audio/wav' });
  }

  async function synthesize(text, variant, slow) {
    const rt = await loadRuntime();
    const voice = await ensureVoice(variant);
    const { config, session } = voice;
    const ids = await phonemize(rt, text, config.espeak.voice);
    const inf = config.inference;
    const feeds = {
      input: new rt.ort.Tensor('int64', ids, [1, ids.length]),
      input_lengths: new rt.ort.Tensor('int64', [ids.length]),
      scales: new rt.ort.Tensor('float32', [inf.noise_scale, inf.length_scale * (slow ? SLOW : 1), inf.noise_w]),
    };
    if (config.speaker_id_map && Object.keys(config.speaker_id_map).length) {
      feeds.sid = new rt.ort.Tensor('int64', [0]);
    }
    const out = await session.run(feeds);
    return pcmToWav(out.output.data, config.audio.sample_rate);
  }

  /* ---------- Instalar / quitar ---------- */

  async function install(variant, onProgress) {
    if (!supported()) throw new Error('Este navegador no puede ejecutar la voz natural');
    if (!VOICES[variant]) throw new Error('Voz desconocida');
    const files = filesFor(variant);
    const total = files.reduce((n, f) => n + f.size, 0);
    let loadedBytes = 0;
    const report = () => { if (onProgress) onProgress(Math.min(0.97, loadedBytes / total)); };
    for (const f of files) {
      if (await cacheHas(f.url)) { loadedBytes += f.size; report(); continue; }
      await fetchCached(f.url, (n) => { loadedBytes += n; report(); });
    }
    // Prueba real: así se comprueba que todo funciona y no hace falta red después.
    await synthesize('Olá', variant, false);
    if (onProgress) onProgress(1);
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* ignorar */ }
  }

  async function remove(variant) {
    if (!VOICES[variant]) return;
    stop();
    if (loaded && loaded.variant === variant) { try { loaded.session.release(); } catch (e) { /* ignorar */ } loaded = null; }
    const cache = await caches.open(CACHE);
    await cache.delete(modelUrl(variant));
    await cache.delete(configUrl(variant));
    for (const key of audioCache.keys()) if (key.startsWith(variant + '|')) audioCache.delete(key);
    // Si ya no queda ninguna voz, también se borra el motor compartido.
    const other = variant === 'br' ? 'pt' : 'br';
    if (!(await cacheHas(modelUrl(other)))) {
      for (const f of SHARED()) await cache.delete(f.url);
      runtime = null;
    }
  }

  /* ---------- Reproducir ---------- */

  const audioCache = new Map(); // "variant|slow|texto" → Blob
  let seq = 0;
  let audio = null;
  let queue = Promise.resolve();

  function stop() {
    seq++;
    if (audio) { audio.pause(); audio.src = ''; audio = null; }
  }

  /* Genera y reproduce. Solo suena la última petición; las anteriores se descartan.
   * opts: { variant, slow, onLoading(bool) } */
  function speak(text, opts) {
    const variant = (opts && opts.variant) || 'br';
    const slow = !!(opts && opts.slow);
    const mine = ++seq;
    if (audio) { audio.pause(); audio.src = ''; audio = null; }
    const key = variant + '|' + (slow ? 1 : 0) + '|' + text;
    const job = queue.then(async () => {
      if (mine !== seq) return;
      let blob = audioCache.get(key);
      if (!blob) {
        const cold = !loaded || loaded.variant !== variant;
        if (cold && opts && opts.onLoading) opts.onLoading(true);
        try { blob = await synthesize(text, variant, slow); } finally { if (cold && opts && opts.onLoading) opts.onLoading(false); }
        audioCache.set(key, blob);
        if (audioCache.size > 60) audioCache.delete(audioCache.keys().next().value);
      }
      if (mine !== seq) return;
      const url = URL.createObjectURL(blob);
      const a = new Audio(url);
      a.onended = a.onerror = () => { URL.revokeObjectURL(url); if (audio === a) audio = null; };
      audio = a;
      await a.play();
    });
    queue = job.catch(() => { /* la cola sigue aunque falle uno */ });
    return job;
  }

  root.PGTTS = { VOICES, MB, supported, isInstalled, install, remove, speak, stop };
})(typeof self !== 'undefined' ? self : this);
