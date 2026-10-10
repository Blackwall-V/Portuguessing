# Portuguessing 🇧🇷🇵🇹

App para aprender portugués pensada para **usarlo en el trabajo**. Funciona en el navegador
y se instala en el celular como una app (PWA), incluso sin conexión.

## Qué hace

**Ayuda rápida** – frases listas para usar según tu profesión:

- **Profesiones:** Tienda, Restaurante, Hotel, Salud/farmacia, Transporte, Oficina, más un bloque Esencial.
- **Formal / informal:** “O que **o senhor** deseja?” vs. “O que **você** precisa?” (en Portugal: “O que **precisas**?”).
- **Cliente señor / señora:** concuerda “o senhor / a senhora”, “bem-vindo / bem-vinda”.
- **Según la hora:** el saludo cambia solo (*Bom dia / Boa tarde / Boa noite*) y hay frases que solo
  aparecen en su momento (desayuno por la mañana, almuerzo por la tarde, cena por la noche).
  Puedes forzar el momento con ☀️ / 🌤️ / 🌙.
- **“Te pueden decir”:** lo que probablemente te diga el cliente, para entenderlo.
- **Decir un precio:** escribe 12,50 y obtén “doze reais e cinquenta centavos” (o euros/cêntimos), con voz.
- **Mostrar en pantalla completa** para enseñarle la frase al cliente, **copiar**, **escuchar** y **escuchar despacio**.

**Aprender** – tarjetas de repaso y quiz (traducir en ambos sentidos y comprensión auditiva) por cada profesión,
con puntos, racha diaria y progreso guardado en tu dispositivo.

**Brasil / Portugal** – cambia vocabulario (*cardápio / ementa*, *banheiro / casa de banho*, *reais / euros*),
el tuteo y la voz (pt-BR / pt-PT).

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

Marcas disponibles: `{Sd}` Bom dia/Boa tarde/Boa noite · `{umbom}` · `{sr}`/`{Sr}` · `{bv}` · `{obg}`/`{Obg}` · `{moeda}`
y, en español, `{esd}` `{esumbuen}` `{esbv}` `{mes}`. `npm test` comprueba que todas las marcas existan y que el modo
Portugal no se llene de brasileñismos.

Para añadir una profesión, crea otra lista con `mk('id')` y agrégala a `decks` al final del archivo.

## Estructura

```
index.html · manifest.webmanifest · sw.js   PWA (instalable y offline)
js/lib.js    lógica pura: hora, formalidad, variantes, números → portugués
js/data.js   frases por profesión
js/app.js    interfaz
css/         estilos (claro y oscuro)
tests/       tests con Node
```

## Notas

- La voz usa la síntesis del dispositivo; si no hay voz en portugués instalada, la app lo avisa.
- Las frases de salud son educativas y no sustituyen a un intérprete profesional.
- Conviene que un hablante nativo revise las frases antes de usarlas en entornos críticos.
