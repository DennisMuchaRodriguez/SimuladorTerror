/* Junta index.html, estilos.css y js/*.js en un solo archivo HTML (fácil de compartir).
   Uso:
     node herramientas/empaquetar.js NocheDeSlashers.html
     node herramientas/empaquetar.js salida.html --fragmento   (sin <html>/<head>/<body>, para incrustar en otra página) */
'use strict';
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const args = process.argv.slice(2);
const salida = args.find(a => !a.startsWith('--')) || path.join(raiz, 'NocheDeSlashers.html');
const fragmento = args.includes('--fragmento');

let html = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(raiz, 'estilos.css'), 'utf8');
html = html.replace('<link rel="stylesheet" href="estilos.css">', () => '<style>\n' + css + '</style>');
html = html.replace(/<script src="(js\/[^"]+)"><\/script>/g, (m, archivo) => {
  const js = fs.readFileSync(path.join(raiz, archivo), 'utf8').replace(/<\/script/gi, '<\\/script');
  return '<script>\n' + js + '</script>';
});
if (fragmento) {
  html = html
    .replace(/<!doctype html>\s*/i, '')
    .replace(/<html[^>]*>\s*/i, '').replace(/<\/html>\s*/i, '')
    .replace(/<head>\s*/i, '').replace(/<\/head>\s*/i, '')
    .replace(/<body>\s*/i, '').replace(/<\/body>\s*/i, '')
    .replace(/<meta charset="utf-8">\s*/i, '')
    .replace(/<meta name="viewport"[^>]*>\s*/i, '');
}
fs.writeFileSync(salida, html);
console.log('Escrito ' + salida + ' (' + Math.round(html.length / 1024) + ' KB)');
