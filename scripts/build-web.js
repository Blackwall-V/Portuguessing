/* Copia la web estática a www/ (carpeta que usa Capacitor y GitHub Pages).
 * No hay bundler: los archivos se sirven tal cual. */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(root, 'www');
const items = ['index.html', 'sw.js', 'manifest.webmanifest', 'css', 'js', 'icons'];

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const item of items) {
  fs.cpSync(path.join(root, item), path.join(out, item), { recursive: true });
}
console.log('www/ listo (' + items.join(', ') + ')');
