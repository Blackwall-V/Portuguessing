# Portuguessing 🇧🇷🇵🇹

App para aprender portugués pensada para **usarlo en el trabajo**. Funciona en el navegador
y se instala en el celular como una app (PWA), incluso sin conexión.

## Qué hace

**Ayuda rápida** – frases listas para usar según tu profesión:

- **Profesiones:** Tienda, Restaurante, Hotel, Salud, Farmacia, Transporte, Oficina, más un bloque Esencial.
- **Formal / informal:** “O que **o senhor** deseja?” vs. “O que **você** precisa?” (en Portugal: “O que **precisas**?”).
- **Cliente señor / señora:** concuerda “o senhor / a senhora”, “bem-vindo / bem-vinda”.
- **Según la hora:** el saludo cambia solo (*Bom dia / Boa tarde / Boa noite*) y hay frases que solo
  aparecen en su momento (desayuno por la mañana, almuerzo por la tarde, cena por la noche).
  Puedes forzar el momento con ☀️ / 🌤️ / 🌙.
- **“Te pueden decir”:** lo que probablemente te diga el cliente, para entenderlo.
- **Decir un precio:** escribe 12.500 y obtén “doze mil e quinhentos pesos”, con voz. Por defecto en pesos chilenos (CLP);
  también hay ARS, BOB, BRL, COP, EUR, MXN, PEN, PYG, USD y UYU (Ajustes → Moneda). Llega hasta 999 999 999.
- **Mostrar en pantalla completa** para enseñarle la frase al cliente, **copiar**, **escuchar** y **escuchar despacio**.

**Aprender** – tarjetas de repaso y quiz (traducir en ambos sentidos y comprensión auditiva) por cada profesión,
con puntos, racha diaria y progreso guardado en tu dispositivo.

**Brasil / Portugal** – cambia vocabulario (*cardápio / ementa*, *banheiro / casa de banho*), el tuteo y la voz
(pt-BR / pt-PT). La moneda es un ajuste aparte, así que puedes atender a un cliente brasileño y cobrar en pesos.

## Usarla

No necesita instalar nada ni compilar:

```bash
npm start          # sirve la carpeta en http://localhost:8080
npm test           # valida los datos y la lógica (sin dependencias)
```

> El modo offline y la instalación en el celular requieren `https` (o `localhost`).

### Publicarla para usarla en el celular

1. En GitHub: **Settings → Pages → Source** → **GitHub Actions**.
2. Haz merge a `main`: el workflow `.github/workflows/pages.yml` ejecuta los tests y publica el sitio.
3. Abre la URL en el celular:
   - **Android (Chrome):** menú ⋮ → *Instalar app*.
   - **iPhone (Safari):** Compartir → *Añadir a pantalla de inicio*.

(Sirve cualquier hosting estático: Netlify, Cloudflare Pages, Vercel…)

## Añadir o cambiar frases

Todo el contenido está en [`js/data.js`](js/data.js):

```js
p('preguntar',                                      // categoría
  ['¿Qué necesita?', '¿Qué necesitas?'],            // español [formal, informal]
  'O que {sr} deseja?',                             // portugués formal (Brasil)
  'O que você precisa?',                            // informal (Brasil)
  { f: 'O que deseja?', i: 'O que precisas?' },     // ajustes para Portugal
  { when: ['morning'] })                            // opcional: solo en ese momento del día
```

Marcas disponibles: `{Sd}` Bom dia/Boa tarde/Boa noite · `{umbom}` · `{sr}`/`{Sr}` · `{bv}` · `{obg}`/`{Obg}` · `{moeda}` ·
`{pa}` `{pb}` `{pc}` (importe de ejemplo con palabras, según la moneda elegida)
y, en español, `{esd}` `{esumbuen}` `{esbv}` `{mes}` `{ea}` `{eb}` `{ec}` (importe con cifras). `npm test` comprueba que todas las marcas existan y que el modo
Portugal no se llene de brasileñismos.

Para añadir una moneda, agrega una entrada a `CURRENCIES` en [`js/lib.js`](js/lib.js) (nombre en portugués y español,
decimales, formato local e importes de ejemplo).

Para añadir una profesión, crea otra lista con `mk('id')` y agrégala a `decks` al final del archivo.

## Sugerencias de los usuarios y frases en vivo

La app trae un botón **Sugerir una frase** (al final de la lista de Ayuda, cuando una búsqueda no encuentra nada, y en
Ajustes). El formulario pide la frase en español, la profesión y, si se sabe, el portugués y un correo opcional.
Si no hay conexión, la sugerencia se guarda en el dispositivo y se envía sola al volver internet.

**Puesta en marcha (una vez):**
1. Crea un formulario en un servicio que acepte JSON, por ejemplo [Formspree](https://formspree.io) (gratis para empezar).
2. Pega su dirección en `suggestUrl` de [`js/config.js`](js/config.js). Sin `suggestUrl` el botón solo aparece en `localhost` (modo prueba).
   Si el servicio exige una clave en cada envío (p. ej. Web3Forms), ponla en `suggestFields`.

**Aprobar una sugerencia (sin publicar una versión nueva de la app):**
1. Revisa la sugerencia en tu correo o en el panel del servicio.
2. Agrégala a [`content/extra.json`](content/extra.json) con el formato de `p(...)`:
   ```json
   { "id": "x-farmacia-001", "deck": "farmacia", "cat": "indicar",
     "es": ["Tómelo con leche.", "Tómalo con leche."],
     "f": "Tome com leite.", "i": "Toma com leite.",
     "p": { "f": "Tome com leite.", "i": "Toma com leite." } }
   ```
   (`id` empieza con `x-` y no se repite; `deck` es el id de la profesión; `hear: true` o `cat: "hear"` para lo que te dicen.)
3. Haz commit a `main`. `npm test` valida el archivo y, si algo está mal, no se publica. Los usuarios ven la frase nueva
   la próxima vez que abran la app con conexión; después queda guardada para usarla sin conexión.

Antes de un uso comercial: publica un aviso de privacidad (la app envía lo que la persona escribe, la variante y el trato
elegidos, y el correo si lo pone) y revisa el texto de las frases con un hablante nativo.

## Estructura

```
index.html · manifest.webmanifest · sw.js   PWA (instalable y offline)
content/extra.json  frases aprobadas que se cargan en vivo
js/config.js  dirección de envío de sugerencias
js/lib.js    lógica pura: hora, formalidad, variantes, monedas, números → portugués
js/icons.js  iconos SVG (por nombre)
js/tts.js    voz natural en el navegador (Piper + ONNX Runtime Web)
js/data.js   frases por profesión
js/app.js    interfaz
css/         estilos (claro y oscuro)
tests/       tests con Node
```

## Notas

- **Voz natural sin instalar nada:** en Ajustes → *Voz natural* se puede descargar una voz neuronal (Piper, ejecutada
  en el propio navegador con WebAssembly). No hay servidor: se descarga una vez (~93 MB la primera voz, ~63 MB la
  segunda), queda guardada en el dispositivo y después funciona sin conexión. Hay una voz de Brasil y otra de Portugal.
  Los archivos vienen de cdnjs, jsDelivr y Hugging Face solo durante la descarga.
- Si no se descarga, la app usa la síntesis del dispositivo; si no hay voz en portugués, lo avisa.
- Las frases de salud son educativas y no sustituyen a un intérprete profesional.
- Conviene que un hablante nativo revise las frases antes de usarlas en entornos críticos.
