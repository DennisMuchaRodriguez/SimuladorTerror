/* Prueba de balance desde la terminal, sin navegador.
   Uso:
     node herramientas/balance.js [mapa] [asesino=n,...] [noches]
     node herramientas/balance.js casa jason=1 200
     node herramientas/balance.js cabana canibal=3 100
     node herramientas/balance.js casa michael=1 7 --relato   (muestra la narración de la noche con semilla 7) */
'use strict';
const path = require('path');
['datos', 'mapas', 'textos', 'motor'].forEach(f => require(path.join(__dirname, '..', 'js', f + '.js')));
const { GRUPO_EJEMPLO } = globalThis.SIM_DATOS;
const MOTOR = globalThis.SIM_MOTOR;

const args = process.argv.slice(2);
const relato = args.includes('--relato');
const pos = args.filter(a => !a.startsWith('--'));
const mapa = pos[0] || 'casa';
const asesinos = {};
(pos[1] || 'jason=1').split(',').forEach(p => { const [k, v] = p.split('='); asesinos[k] = Number(v || 1); });
const noches = Number(pos[2] || 100);
const config = { mapa, personas: GRUPO_EJEMPLO, asesinos, opciones: { celulares: !args.includes('--sin-celulares'), traidor: args.includes('--traidor') } };

if (relato) {
  const sim = new MOTOR.Simulacion(Object.assign({}, config, { semilla: noches }));
  while (!sim.fin) sim.paso();
  sim.log.forEach(e => console.log(e.hora + '  [' + e.tipo + '] ' + e.texto));
  console.log('\n== ' + sim.fin.titulo + ' (' + sim.fin.causa + ')');
  sim.fin.personas.forEach(p => {
    console.log('  ' + p.nombre.padEnd(10) + (p.vivo || p.traidor ? p.destino : 'Muerto: ' + p.muerte.causa + ' en ' + p.muerte.lugar + ' (' + p.muerte.por + ')'));
    if (!p.parte) return;
    console.log('             ' + p.parte.salud + ' · ' + p.parte.vida + '% de vida');
    p.parte.heridas.forEach(h => console.log('             - ' + h.texto + (h.veces > 1 ? ' x' + h.veces : '') + ' (' + h.gravedad + (h.tratada ? ', ' + h.tratada : '') + ')'));
    p.parte.trauma.forEach(t => console.log('             * ' + t));
  });
  sim.fin.asesinos.forEach(a => console.log('  ' + a.nombre + ': ' + a.estado + ', ' + a.kills + ' víctimas'));
  process.exit(0);
}

const t0 = Date.now();
MOTOR.prepararMapa(mapa);
const t1 = Date.now();
const acc = MOTOR.crearAcumulador(config);
for (let i = 1; i <= noches; i++) MOTOR.acumular(acc, MOTOR.ejecutarUna(config, i * 7919));
const t2 = Date.now();
const pct = v => (100 * v / acc.n).toFixed(0).padStart(3) + '%';
console.log(`Mapa ${mapa} · ${JSON.stringify(asesinos)} · ${acc.n} noches · mapa ${t1 - t0} ms · simulación ${t2 - t1} ms (${((t2 - t1) / acc.n).toFixed(1)} ms/noche)`);
acc.nombres.forEach((n, i) => {
  const causas = Object.entries(acc.muertes[i]).sort((a, b) => b[1] - a[1]).slice(0, 2).map(c => c[0] + ' ' + c[1]).join(', ');
  console.log('  ' + n.padEnd(8) + ' sobrevive ' + pct(acc.vivos[i]) + ' (ilesos ' + pct(acc.ilesos[i]).trim() + ', graves ' + pct(acc.graves[i]).trim() + ')   ' + causas);
});
console.log('  Supervivientes por noche: ' + acc.hist.map((h, i) => i + ':' + pct(h).trim()).join('  '));
console.log('  Finales: ' + Object.entries(acc.finales).map(f => f[0] + ' ' + pct(f[1]).trim()).join(', '));
console.log('  Asesinos eliminados: ' + pct(acc.asesinoCae).trim() + ' · duración media ' + (acc.duracion / acc.n).toFixed(0) + ' s');
