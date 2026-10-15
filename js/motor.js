/* Motor de simulación. No depende del navegador: se puede ejecutar en Node para medir resultados.
   Una casilla = 1 metro. Un paso de simulación = 0,1 segundos. */
(function (G) {
  'use strict';
  const D = G.SIM_DATOS, MP = G.SIM_MAPAS, TX = G.SIM_TEXTOS;
  const T = TX.T, FR = TX.FRASES;
  const DT = 0.1;
  const T_FIN = 900; // límite de la noche (segundos de simulación): si amanece y el asesino sigue vivo, perdieron
  const INF = 65535;

  const COSTO_S = { '.': 10, ',': 10, ':': 10, '=': 10, 'D': 11, 'W': 45, 'h': 12, 'm': 15, 'L': 10, 'B': 10, 'E': 10 };
  const COSTO_K = Object.assign({}, COSTO_S, { W: 16 });
  const BLOQUEA_VISTA = { '#': 1, 'T': 1, 'D': 1, 'm': 1 };
  const VALOR_ARMA = { ninguna: 0, cuchillo: 3, bate: 4, machete: 5, hacha: 6, pistola: 8, revolver: 8, rifle: 9, escopeta: 10 };
  const NOMBRE_OBJ = { cuchillo: 'un cuchillo de cocina', bate: 'un bate de béisbol', hacha: 'un hacha', machete: 'un machete', pistola: 'una pistola', revolver: 'un revólver cargado', escopeta: 'una escopeta', rifle: 'un rifle de caza', botiquin: 'un botiquín', sueter: 'un suéter viejo de mujer' };
  const IDENTIDADES = ['el exnovio de {o}', 'el vecino de enfrente', 'un compañero de clase al que nadie invitó', 'el repartidor de pizza', 'el hermano mayor de {o}', 'el profesor de literatura'];

  const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);

  /* ======================= Preparación del mapa ======================= */
  const cacheMapas = {};

  function dial(N, adjStart, adjNode, w, tabla) {
    const C = 64;
    const cubos = [];
    for (let i = 0; i < C; i++) cubos.push([]);
    for (let s = 0; s < N; s++) {
      const base = s * N;
      tabla.fill(INF, base, base + N);
      tabla[base + s] = 0;
      cubos[0].push(s);
      let pend = 1, d = 0;
      while (pend > 0) {
        const cubo = cubos[d % C];
        while (cubo.length) {
          const u = cubo.pop(); pend--;
          if (tabla[base + u] !== d) continue;
          for (let e = adjStart[u]; e < adjStart[u + 1]; e++) {
            const v = adjNode[e], nd = d + w[e];
            if (nd < tabla[base + v]) { tabla[base + v] = nd; cubos[nd % C].push(v); pend++; }
          }
        }
        d++;
      }
    }
  }

  function prepararMapa(id) {
    if (cacheMapas[id]) return cacheMapas[id];
    const def = MP.MAPAS.find(m => m.id === id);
    const p = def.construir();
    const W = p.w, H = p.h, size = W * H;
    const g = new Array(size);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) g[y * W + x] = p.g[y][x];
    const costS = new Uint8Array(size), costK = new Uint8Array(size), vista = new Uint8Array(size);
    const interior = new Uint8Array(size), sala = new Int16Array(size).fill(-1);
    for (let i = 0; i < size; i++) {
      costS[i] = COSTO_S[g[i]] || 0; costK[i] = COSTO_K[g[i]] || 0; vista[i] = BLOQUEA_VISTA[g[i]] ? 1 : 0;
    }
    const salas = p.salas.map((r, ri) => {
      const s = { nombre: r.nombre, x0: r.x0, y0: r.y0, x1: r.x1, y1: r.y1, puertas: [], ventanas: [], tiles: [] };
      for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) {
        const i = y * W + x;
        interior[i] = 1;
        const borde = x === r.x0 || x === r.x1 || y === r.y0 || y === r.y1;
        if (!borde) sala[i] = ri;
      }
      return s;
    });
    salas.forEach((s, ri) => {
      for (let y = s.y0; y <= s.y1; y++) for (let x = s.x0; x <= s.x1; x++) {
        const i = y * W + x;
        const borde = x === s.x0 || x === s.x1 || y === s.y0 || y === s.y1;
        if (borde) { if (g[i] === 'D') s.puertas.push(i); else if (g[i] === 'W') s.ventanas.push(i); }
        else if (sala[i] === ri && costS[i] > 0) s.tiles.push(i);
      }
    });

    const ci = new Int32Array(size).fill(-1), nodos = [];
    for (let i = 0; i < size; i++) if (costS[i] > 0) { ci[i] = nodos.length; nodos.push(i); }
    const N = nodos.length;
    const adjStart = new Int32Array(N + 1), tmpNode = [], tmpFac = [];
    const libre = (x, y) => x >= 0 && y >= 0 && x < W && y < H && costS[y * W + x] > 0;
    const DIRS = [[1, 0, 10], [-1, 0, 10], [0, 1, 10], [0, -1, 10], [1, 1, 14], [1, -1, 14], [-1, 1, 14], [-1, -1, 14]];
    for (let n = 0; n < N; n++) {
      adjStart[n] = tmpNode.length;
      const i = nodos[n], x = i % W, y = (i / W) | 0;
      for (const d of DIRS) {
        const nx = x + d[0], ny = y + d[1];
        if (!libre(nx, ny)) continue;
        if (d[2] === 14 && (!libre(x + d[0], y) || !libre(x, y + d[1]))) continue;
        tmpNode.push(ci[ny * W + nx]); tmpFac.push(d[2]);
      }
    }
    adjStart[N] = tmpNode.length;
    const adjNode = Int32Array.from(tmpNode);
    const wS = new Uint8Array(adjNode.length), wK = new Uint8Array(adjNode.length);
    for (let e = 0; e < adjNode.length; e++) {
      const t = nodos[adjNode[e]];
      wS[e] = Math.round(costS[t] * tmpFac[e] / 10);
      wK[e] = Math.round(costK[t] * tmpFac[e] / 10);
    }
    const distS = new Uint16Array(N * N), distK = new Uint16Array(N * N);
    dial(N, adjStart, adjNode, wS, distS);
    dial(N, adjStart, adjNode, wK, distK);

    const idx = (x, y) => y * W + x;
    const punto = tipo => { const q = p.puntos.find(pp => pp.tipo === tipo); return q ? idx(q.x, q.y) : -1; };
    const escondites = [], salidas = [], autoTiles = [];
    let canoa = -1;
    for (let i = 0; i < size; i++) {
      if (g[i] === 'h') escondites.push(i);
      else if (g[i] === 'E') salidas.push(i);
      else if (g[i] === 'C') autoTiles.push(i);
      else if (g[i] === 'B') canoa = i;
    }
    let auto = null;
    if (autoTiles.length) {
      let x0 = 99, y0 = 99, x1 = -1, y1 = -1;
      autoTiles.forEach(i => { const x = i % W, y = (i / W) | 0; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
      const acceso = [];
      autoTiles.forEach(i => {
        const x = i % W, y = (i / W) | 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const j = idx(x + dx, y + dy);
          if (libre(x + dx, y + dy) && acceso.indexOf(j) < 0) acceso.push(j);
        }
      });
      auto = { tiles: autoTiles, acceso, x0, y0, x1, y1, cx: (x0 + x1 + 1) / 2, cy: (y0 + y1 + 1) / 2, vertical: (y1 - y0) > (x1 - x0) };
    }
    const enZonas = (zonas, x, y) => zonas.some(z => x >= z[0] && x <= z[2] && y >= z[1] && y <= z[3]);
    const senalTiles = [];
    if (def.senal === 'zonas') nodos.forEach(i => { if (enZonas(def.zonasSenal, i % W, (i / W) | 0)) senalTiles.push(i); });

    const puertaP = idx(def.puertaPrincipal[0], def.puertaPrincipal[1]);
    const act = { reunion: p.spawnS.map(q => idx(q[0], q[1])), cocina: [], bano: [], dormir: [], afuera: [], pasear: [], trastero: [] };
    const salaReunion = sala[act.reunion[0]];
    salas.forEach((s, ri) => {
      const n = s.nombre;
      if (/cocina/.test(n)) act.cocina.push(...s.tiles);
      else if (/baño|letrina/.test(n)) act.bano.push(...s.tiles);
      else if (/(cuarto|dormitorio|cabaña)/.test(n) && !/ganchos/.test(n)) act.dormir.push(...s.tiles);
      else if (/garaje|granero|cobertizo|oficina|despensa/.test(n)) act.trastero.push(...s.tiles);
      if (!/ganchos|letrina/.test(n) && ri !== salaReunion) act.pasear.push(...s.tiles);
    });
    // afuera: alrededor de cualquier puerta o ventana del edificio (a fumar, a hablar por teléfono, a tomar aire)
    for (let i = 0; i < size; i++) {
      if (g[i] !== 'D' && g[i] !== 'W') continue;
      const ox = i % W, oy = (i / W) | 0;
      for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) {
        const x = ox + dx, y = oy + dy, j = idx(x, y);
        if (!libre(x, y) || interior[j] || g[j] === 'E' || Math.abs(dx) + Math.abs(dy) < 2) continue;
        if (act.afuera.indexOf(j) < 0) act.afuera.push(j);
      }
    }

    const M = {
      id, def, W, H, size, g, costS, costK, vista, interior, sala, salas, ci, nodos, n: N,
      adjStart, adjNode, wS, wK, distS, distK,
      telefono: punto('telefono'), radio: punto('radio'), fusibles: punto('fusibles'), guarida: punto('guarida'),
      llaves: p.llaves.map(q => idx(q[0], q[1])), items: p.items.map(q => ({ tile: idx(q.x, q.y), tipo: q.tipo })),
      spawnS: p.spawnS.map(q => idx(q[0], q[1])), spawnK: p.spawnK.map(q => idx(q[0], q[1])),
      lamparas: p.lamparas, zonas: p.zonas, escondites, salidas, canoa, auto, senalTiles, puertaP, act
    };
    cacheMapas[id] = M;
    return M;
  }

  /* ======================= Simulación ======================= */
  function Simulacion(config, opciones) {
    opciones = opciones || {};
    this.cfg = config;
    this.registrar = opciones.registrar !== false;
    this.semilla = (config.semilla >>> 0) || 1;
    this.rng = MP.rngSemilla(this.semilla);
    // la narración usa su propio generador: así ver una noche o calcularla en lote da el mismo resultado
    this.rngT = MP.rngSemilla((this.semilla ^ 0x9e3779b9) >>> 0);
    const M = this.M = prepararMapa(config.mapa);
    this.def = M.def;
    this.t = 0; this.tick = 0; this.tFin = T_FIN;
    this.op = Object.assign({ celulares: true, traidor: false }, config.opciones || {});
    this.luz = true; this.fusiblesRotos = false; this.lineaTel = M.telefono >= 0; this.radioOk = M.radio >= 0;
    this.log = []; this.efectos = []; this.ruidos = []; this.sangre = []; this.sangreN = 0; this.cuerpos = [];
    this.trampas = []; this.barricadas = {}; this.rotas = new Set(); this.abierta = new Float32Array(M.size);
    this.plan = null; this.planesFallidos = {}; this.alertaGeneral = false; this.tAlerta = -1;
    this.con = { asesinos: {}, inmortal: {}, resistente: {}, rompePuertas: false, autoDanado: false, autoDestruido: false, lineaCortada: false, llaves: -1 };
    this.ayuda = null; this.fin = null; this.momentos = [];
    this.limiteLog = {};
    this.llavesTile = -1; this.llavesSuelo = -1;
    this.items = M.items.filter(it => it.tipo !== 'sueter' || (config.asesinos && config.asesinos.jason > 0)).map(it => Object.assign({}, it));
    this.buscadas = new Set();
    this.vehiculo = { casa: 'el auto', cabana: 'el auto', campamento: 'el jeep', granja: 'la camioneta' }[M.id] || 'el auto';

    // ---------- sobrevivientes ----------
    const spawns = M.spawnS.slice();
    this.sob = (config.personas || []).slice(0, 8).map((p, i) => this.crearSob(p, i, spawns[i % spawns.length]));
    if (M.auto) {
      this.auto = {
        x: M.auto.cx, y: M.auto.cy, px: M.auto.cx, py: M.auto.cy, vertical: M.auto.vertical, danio: null, fase: 'aparcado',
        pasajeros: [], conductor: null, espera: 0, intentos: 0, cdArranque: 0, rutaI: 0, vel: 0, angulo: M.auto.vertical ? Math.PI / 2 : 0
      };
      if (this.def.llaves === 'conductor' && this.sob.length) {
        const c = this.sob[Math.floor(this.rng() * this.sob.length)];
        c.llaves = true;
      } else if (M.llaves.length) {
        this.llavesTile = M.llaves[Math.floor(this.rng() * M.llaves.length)];
      }
    } else this.auto = null;
    this.sob.forEach(s => {
      this.items.forEach(it => { if (M.sala[it.tile] >= 0 && /cocina/.test(M.salas[M.sala[it.tile]].nombre)) s.itemsConocidos.add(it.tile); });
      if (s.rasgos.has('conoce')) {
        this.items.forEach(it => s.itemsConocidos.add(it.tile));
        if (this.llavesTile >= 0) s.sabeLlaves = true;
      }
    });
    if (this.op.traidor && this.sob.length >= 3) {
      const ti = (typeof this.op.traidorIdx === 'number' && this.op.traidorIdx >= 0 && this.op.traidorIdx < this.sob.length)
        ? this.op.traidorIdx : Math.floor(this.rng() * this.sob.length);
      this.sob[ti].traidor = true;
    }

    // ---------- asesinos ----------
    this.ase = [];
    const lista = config.asesinos || {};
    let orden = 0;
    Object.keys(D.ASESINOS).forEach(clase => {
      const n = Math.min(4, lista[clase] | 0);
      for (let j = 0; j < n; j++) this.ase.push(this.crearAsesino(clase, j, orden++));
    });

    this.narrar('ambiente', this.def.intro + ' ' + this.textoGrupo(), null, true);
  }

  const S = Simulacion.prototype;

  /* ---------- utilidades ---------- */
  S.r = function (a, b) { return a + (b - a) * this.rng(); };
  S.elegir = function (arr) { return arr[Math.floor(this.rng() * arr.length)]; };
  S.elegirT = function (arr) { return arr[Math.floor(this.rngT() * arr.length)]; };
  S.idx = function (x, y) { return Math.floor(y) * this.M.W + Math.floor(x); };
  S.tileDe = function (e) { return this.idx(e.x, e.y); };
  S.cx = function (i) { return (i % this.M.W) + 0.5; };
  S.cy = function (i) { return ((i / this.M.W) | 0) + 0.5; };
  S.dist = function (a, b) { const dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); };
  S.dS = function (a, b) {
    const M = this.M;
    if (a < 0 || b < 0 || a >= M.size || b >= M.size) return 999;
    const ia = M.ci[a], ib = M.ci[b];
    if (ia < 0 || ib < 0) return 999;
    const v = M.distS[ia * M.n + ib]; return v === INF ? 999 : v / 10;
  };
  S.dK = function (a, b) {
    const M = this.M;
    if (a < 0 || b < 0 || a >= M.size || b >= M.size) return 999;
    const ia = M.ci[a], ib = M.ci[b];
    if (ia < 0 || ib < 0) return 999;
    const v = M.distK[ia * M.n + ib]; return v === INF ? 999 : v / 10;
  };
  // Reloj de la noche: los primeros 5 minutos de simulación avanzan despacio (1 s = 20 s de reloj),
  // luego se acelera para que el final coincida con el amanecer (6:00).
  S.horasDesdeInicio = function (t) {
    const lento = 300, r1 = 20 / 3600;
    if (t <= lento) return t * r1;
    const resto = (30 - this.def.hora) - lento * r1;
    return lento * r1 + (t - lento) / (this.tFin - lento) * resto;
  };
  S.hora = function (t) {
    let h = this.def.hora + this.horasDesdeInicio(t === undefined ? this.t : t);
    if (h >= 24) h -= 24;
    const hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
    return (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm;
  };
  S.lugar = function (x, y) {
    const M = this.M, i = this.idx(x, y);
    if (i >= 0 && i < M.size && M.sala[i] >= 0) return M.salas[M.sala[i]].nombre;
    for (const z of M.zonas) if (x >= z.x0 && x <= z.x1 + 1 && y >= z.y0 && y <= z.y1 + 1) return z.nombre;
    return this.def.exterior;
  };
  S.puertaAbierta = function (i) { return this.abierta[i] > this.t || this.rotas.has(i); };
  S.bloqueaVista = function (i) {
    const M = this.M;
    if (!M.vista[i]) return false;
    if (M.g[i] === 'D') return !this.puertaAbierta(i);
    return true;
  };
  // Línea de visión entre dos puntos (recorrido de casillas)
  S.los = function (x0, y0, x1, y1) {
    const M = this.M;
    let tx = Math.floor(x0), ty = Math.floor(y0);
    const ex = Math.floor(x1), ey = Math.floor(y1);
    if (tx === ex && ty === ey) return true;
    const dx = x1 - x0, dy = y1 - y0;
    const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1;
    let tMaxX = dx !== 0 ? (sx > 0 ? (tx + 1 - x0) : (x0 - tx)) / Math.abs(dx) : Infinity;
    let tMaxY = dy !== 0 ? (sy > 0 ? (ty + 1 - y0) : (y0 - ty)) / Math.abs(dy) : Infinity;
    const tdX = dx !== 0 ? 1 / Math.abs(dx) : Infinity, tdY = dy !== 0 ? 1 / Math.abs(dy) : Infinity;
    for (let k = 0; k < 120; k++) {
      if (tMaxX < tMaxY) { tMaxX += tdX; tx += sx; } else { tMaxY += tdY; ty += sy; }
      if (tx === ex && ty === ey) return true;
      if (tx < 0 || ty < 0 || tx >= M.W || ty >= M.H) return false;
      if (this.bloqueaVista(ty * M.W + tx)) return false;
    }
    return false;
  };
  S.iluminado = function (x, y) {
    const M = this.M, i = this.idx(x, y);
    if (i >= 0 && i < M.size && M.interior[i] && this.luz) return true;
    for (const l of M.lamparas) {
      if (l.electrica && !this.luz) continue;
      const dx = x - l.x, dy = y - l.y;
      if (dx * dx + dy * dy < l.r * l.r) return true;
    }
    return false;
  };
  S.tieneLuz = function (s) { return !s.oculto && s.alerta >= 1 && (this.op.celulares || s.objeto === 'linterna'); };

  S.txt = function (clave, sub, vars) {
    if (!this.registrar) return '';
    let v = T[clave];
    if (sub !== undefined && sub !== null && v && !Array.isArray(v)) v = v[sub] || v.default;
    if (!v) return '';
    const s = Array.isArray(v) ? this.elegirT(v) : v;
    return this.componer(s, vars);
  };
  // Sustituye {variables}, resuelve [masculino|femenino] según la persona {n} y contrae "de el" / "a el"
  S.componer = function (s, vars) {
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => vars[k] !== undefined ? vars[k] : m);
    const per = vars && vars.n ? this.sob.find(p => p.nombre === vars.n) : null;
    const f = per && per.g === 'f';
    s = s.replace(/\[([^|\]]*)\|([^\]]*)\]/g, (m, a, b) => f ? b : a);
    return s.replace(/\bde el /g, 'del ').replace(/\ba el /g, 'al ');
  };
  S.narrar = function (tipo, texto, foco, importante) {
    if (!this.registrar || !texto) return;
    const e = { t: this.t, hora: this.hora(), tipo, texto, x: foco ? foco.x : null, y: foco ? foco.y : null, imp: !!importante };
    this.log.push(e);
    if (importante) this.momentos.push(e);
  };
  // Evita repetir el mismo tipo de mensaje demasiado seguido
  S.puede = function (clave, seg) {
    const u = this.limiteLog[clave];
    if (u !== undefined && this.t - u < seg) return false;
    this.limiteLog[clave] = this.t; return true;
  };
  S.decir = function (e, grupo, dur) {
    if (!this.registrar) return;
    const lista = Array.isArray(grupo) ? grupo : FR[grupo];
    if (!lista) return;
    e.habla = this.elegirT(lista); e.hablaHasta = this.t + (dur || 2.2);
  };
  S.efecto = function (tipo, x, y, extra) {
    if (!this.registrar) return;
    this.efectos.push(Object.assign({ tipo, x, y, t: this.t, dur: 0.6 }, extra || {}));
  };
  S.manchar = function (x, y, cant) {
    if (!this.registrar) return;
    for (let i = 0; i < cant; i++) { this.sangre.push({ x: x + (this.rngT() - 0.5), y: y + (this.rngT() - 0.5), r: 0.08 + this.rngT() * 0.2 }); this.sangreN++; }
    if (this.sangre.length > 900) this.sangre.splice(0, this.sangre.length - 900);
  };

  S.textoGrupo = function () {
    const n = this.sob.length;
    const nums = ['Nadie', 'Una persona', 'Dos amigos', 'Tres amigos', 'Cuatro amigos', 'Cinco amigos', 'Seis amigos', 'Siete amigos', 'Ocho amigos'];
    const desc = this.sob.map(s => {
      const extra = [];
      if (D.ARMAS[s.arma].tipo === 'fuego') extra.push('con ' + D.ARMAS[s.arma].nombre.toLowerCase());
      else if (s.arma !== 'ninguna') extra.push('con ' + D.ARMAS[s.arma].nombre.toLowerCase());
      if (s.rasgos.has('estratega')) extra.push('el cerebro del grupo');
      if (s.rasgos.has('peleador')) extra.push('sabe pelear');
      if (s.rasgos.has('medico')) extra.push('estudia medicina');
      if (s.rasgos.has('atleta')) extra.push('corre como nadie');
      if (s.rasgos.has('lider')) extra.push(s.g === 'f' ? 'la que manda' : 'el que manda');
      return s.nombre + (extra.length ? ' (' + extra.join(', ') + ')' : '');
    });
    return nums[n] + (n === 1 ? ' pasa' : ' pasan') + ' la noche aquí: ' + desc.join(', ') + '.';
  };

  /* ---------- creación ---------- */
  S.crearSob = function (p, i, tile) {
    const st = Object.assign({ fue: 5, vel: 5, int: 5, val: 5, sig: 5, pun: 3 }, p.stats || {});
    const rasgos = new Set(p.rasgos || []);
    const arma = D.ARMAS[p.arma] ? p.arma : 'ninguna';
    const hpMax = 88 + st.fue * 2.5 + (rasgos.has('peleador') ? 6 : 0);
    const s = {
      id: 's' + i, tipo: 'sob', i, nombre: p.nombre || ('Persona ' + (i + 1)), edad: p.edad || 20, g: p.genero === 'f' ? 'f' : 'm',
      color: D.COLORES[i % D.COLORES.length], st, rasgos, arma, municion: D.ARMAS[arma].municion || 0,
      objeto: D.OBJETOS[p.objeto] ? p.objeto : 'ninguno',
      x: this.cx(tile), y: this.cy(tile), px: 0, py: 0, dir: this.rng() * Math.PI * 2,
      paso: -1, pasoDesde: -1, pasoMeta: -1, hpMax, hp: hpMax, stamina: 100, miedo: 0, alerta: 0, sospecha: 0,
      intent: { modo: 'quieto' }, tarea: null, actividad: null, actHasta: 0, cdPensar: this.rng() * 0.3,
      conoce: {}, itemsConocidos: new Set(), cuerposVistos: new Set(), sabeLlaves: false, llaves: false,
      oculto: false, calidadEsc: 0, tOculto: 0, escondite: -1, durmiendo: false, panico: false,
      aturdido: 0, atrapado: 0, agarradoPor: null, sangrado: false, vendado: false,
      cdDisparo: 0, cdGolpe: 0, cdHuida: 0, huidaTile: -1, quitando: 0,
      enAuto: false, vivo: true, escapado: false, destino: '', muerte: null,
      traidor: false, esAsesino: false, sueter: false, sueterUsos: 0, cdSueter: 0, ultimaAmenaza: -99,
      habla: '', hablaHasta: 0, amen: null, puesto: -1, heridas: [], vioMorir: [], miedoMax: 0, ultimoGolpe: -9, ultimoDisparo: -9,
      est: { danio: 0, disparos: 0, aciertos: 0, salvo: 0 }
    };
    s.px = s.x; s.py = s.y;
    return s;
  };

  S.crearAsesino = function (clase, j, orden) {
    const def = D.ASESINOS[clase], M = this.M;
    let nombre = def.nombre;
    if (def.nombres) nombre = def.nombres[j % def.nombres.length];
    else if (j > 0) nombre = def.nombre + ' #' + (j + 1);
    let spawn = this.elegir(M.spawnK);
    if ((clase === 'leatherface' || clase === 'canibal') && M.guarida >= 0) spawn = M.guarida;
    const k = {
      id: 'k' + orden, tipo: 'ase', clase, def, j, nombre, corto: def.nombres ? nombre : def.corto,
      x: this.cx(spawn), y: this.cy(spawn), px: 0, py: 0, dir: 0, spawn,
      paso: -1, pasoDesde: -1, pasoMeta: -1, hp: def.hp, hpMax: def.hp,
      llegada: 16 + orden * 6 + this.r(0, 22) + (clase === 'extranos' ? 10 : 0),
      fuera: true, intent: { modo: 'quieto' }, objetivo: null, pista: null, vistos: {}, busqueda: null, busquedaProg: 0,
      cdAtaque: 0, aturdido: 0, derribado: 0, derribos: 0, balas: 0,
      neutralizado: false, muerto: false, huido: false, huyendo: false, fingido: 0, usoUltimoSusto: false,
      agarre: null, arrastrando: null, tareas: [], tareaSab: null, emboscada: -1,
      cd: { tele: this.r(15, 30), lanza: 10, arco: 0, llamada: this.r(10, 25), tocar: this.r(5, 15), tormento: this.r(20, 40), frase: this.r(15, 30), ruido: 0, emboscada: 0 },
      kills: 0, visto: false, agresivo: false, retirada: 0, retiradaHecha: false, emboscadaHasta: 0,
      cdPensar: this.rng() * 0.3, habla: '', hablaHasta: 0, traidorDe: null, tTele: -99, atropellado: 0, cebo: null, ultimoAtaque: -9, danoCaido: 0
    };
    k.px = k.x; k.py = k.y;
    const hab = def.habilidades;
    if (hab.indexOf('cortaLuz') >= 0 && M.fusibles >= 0 && !this.sabLuz && this.rng() < 0.75) { this.sabLuz = true; k.tareas.push({ tipo: 'luz', tile: M.fusibles }); }
    if (hab.indexOf('trampas') >= 0) this.tilesTrampa(2).forEach(t => k.tareas.push({ tipo: 'trampa', tile: t }));
    for (let i = k.tareas.length - 1; i > 0; i--) { const r = Math.floor(this.rng() * (i + 1)); const tmp = k.tareas[i]; k.tareas[i] = k.tareas[r]; k.tareas[r] = tmp; }
    return k;
  };

  // Casillas de exterior por donde probablemente pasen al huir
  S.tilesTrampa = function (n) {
    const M = this.M, metas = [];
    if (M.auto) metas.push(M.auto.acceso[0]);
    M.salidas.forEach(e => metas.push(e));
    if (M.canoa >= 0) metas.push(M.canoa);
    const res = [];
    if (!metas.length) return res;
    for (let k = 0; k < n * 4 && res.length < n; k++) {
      const meta = this.elegir(metas);
      let cur = M.puertaP, pasos = 0;
      const objetivo = 4 + Math.floor(this.rng() * 10);
      while (pasos < objetivo && cur !== meta) { const nx = this.siguiente(cur, meta, 'S'); if (nx < 0) break; cur = nx; pasos++; }
      if (!M.interior[cur] && M.g[cur] !== 'D' && res.indexOf(cur) < 0 && !this.trampas.some(t => t.tile === cur)) res.push(cur);
    }
    return res;
  };

  /* ---------- movimiento ---------- */
  S.siguiente = function (cur, meta, perfil) {
    const M = this.M;
    if (cur < 0 || meta < 0 || cur >= M.size || meta >= M.size) return -1;
    const a = M.ci[cur], g = M.ci[meta];
    if (a < 0 || g < 0) return -1;
    const tabla = perfil === 'K' ? M.distK : M.distS, w = perfil === 'K' ? M.wK : M.wS, N = M.n;
    if (tabla[a * N + g] === INF) return -1;
    let best = -1, bv = 1e9;
    for (let e = M.adjStart[a]; e < M.adjStart[a + 1]; e++) {
      const v = M.adjNode[e], val = w[e] + tabla[v * N + g];
      if (val < bv) { bv = val; best = v; }
    }
    return best >= 0 ? M.nodos[best] : -1;
  };

  // Devuelve true al llegar. vel en casillas por segundo.
  S.mover = function (e, meta, vel, perfil) {
    const M = this.M;
    if (meta === undefined || meta === null || meta < 0) return true;
    let cur = this.tileDe(e);
    if (cur < 0 || cur >= M.size || M.ci[cur] < 0) {
      const c = this.idx(e.px, e.py);
      if (c >= 0 && c < M.size && M.ci[c] >= 0) { e.x = this.cx(c); e.y = this.cy(c); cur = c; } else return false;
    }
    if (M.g[cur] === 'D') this.abierta[cur] = this.t + 2.5;
    const costo = (perfil === 'K' ? M.costK : M.costS)[cur] || 10;
    const paso = vel * DT * (10 / costo);
    if (paso <= 0) return false;
    if (cur === meta) {
      const tx = this.cx(cur), ty = this.cy(cur), dx = tx - e.x, dy = ty - e.y, d = Math.sqrt(dx * dx + dy * dy);
      if (d <= paso || d < 0.05) { e.x = tx; e.y = ty; return true; }
      e.x += dx / d * paso; e.y += dy / d * paso; e.dir = Math.atan2(dy, dx);
      return d < 0.35;
    }
    if (e.paso < 0 || e.pasoDesde !== cur || e.pasoMeta !== meta) {
      e.paso = this.siguiente(cur, meta, perfil); e.pasoDesde = cur; e.pasoMeta = meta;
    }
    if (e.paso < 0) return false;
    const bar = this.barricadas[e.paso];
    if (bar) {
      if (e.tipo === 'ase') { this.golpearBarricada(e, e.paso); return false; }
      e.quitando += DT;
      if (e.quitando > 2) { delete this.barricadas[e.paso]; e.quitando = 0; }
      return false;
    }
    const tx = this.cx(e.paso), ty = this.cy(e.paso), dx = tx - e.x, dy = ty - e.y, d = Math.sqrt(dx * dx + dy * dy);
    if (d > 0.001) e.dir = Math.atan2(dy, dx);
    if (d <= paso) { e.x = tx; e.y = ty; } else { e.x += dx / d * paso; e.y += dy / d * paso; }
    const nuevo = this.tileDe(e);
    if (nuevo !== cur) this.entrarCasilla(e, nuevo);
    return false;
  };

  S.entrarCasilla = function (e, i) {
    const M = this.M;
    if (M.g[i] === 'D') this.abierta[i] = this.t + 2.5;
    if (M.g[i] === 'W' && e.tipo === 'ase' && !this.rotas.has(i)) {
      this.rotas.add(i);
      this.ruido('vidrio', this.cx(i), this.cy(i), 14, { k: e, deAsesino: true });
      this.efecto('vidrio', this.cx(i), this.cy(i), { dur: 1 });
      if (this.sob.some(s => this.activoSob(s) && this.dist(s, e) < 8) && this.puede('ventana', 10))
        this.narrar('asesino', this.txt('ventanaRota', null, { a: e.nombre, l: this.lugar(this.cx(this.vecinaInterior(i)), this.cy(this.vecinaInterior(i))) }), e, false);
    }
    if (e.tipo === 'sob') {
      const tr = this.trampas.find(t => t.tile === i && t.armada);
      if (tr) {
        tr.armada = false; tr.vista = true;
        const ve = e.st.int >= 8 && this.rng() < 0.3 && e.intent.ritmo !== 2;
        if (!ve) {
          e.atrapado = this.r(6, 11);
          this.danioSob(e, this.r(14, 24), null, 'trampa');
          if (e.vivo) {
            this.narrar('combate', this.txt('trampa', null, { n: e.nombre }), e, true);
            this.ruido('grito', e.x, e.y, 18, { alerta: true, fuente: e });
            this.decir(e, 'panico');
          }
        }
      }
    }
  };

  /* ---------- ruido ---------- */
  S.ruido = function (tipo, x, y, radio, datos) {
    datos = datos || {};
    if (this.registrar && radio >= 5) this.ruidos.push({ tipo, x, y, r: radio, t: this.t });
    const fuente = datos.fuente;
    for (const s of this.sob) {
      if (!this.activoSob(s) || s === fuente) continue;
      const d = this.dist(s, { x, y });
      if (d > radio) continue;
      let alc = radio * (this.los(s.x, s.y, x, y) ? 1 : 0.6);
      if (s.durmiendo) alc *= 0.55;
      if (d > alc) continue;
      this.oirSob(s, tipo, x, y, datos);
    }
    if (datos.deAsesino) return;
    for (const k of this.ase) {
      if (k.fuera || k.muerto || k.neutralizado) continue;
      const d = this.dist(k, { x, y });
      if (d > radio || d > radio * (this.los(k.x, k.y, x, y) ? 1 : 0.65)) continue;
      if (!k.objetivo) k.pista = { x, y, t: this.t, tile: this.idx(x, y) };
    }
  };

  S.oirSob = function (s, tipo, x, y, datos) {
    const k = datos.k;
    if (tipo === 'pasos' && !datos.deAsesino) return;
    if (!s.durmiendo && !s.agarradoPor) s.dir = Math.atan2(y - s.y, x - s.x);
    if (k && datos.deAsesino && s.alerta >= 2) {
      const prev = s.conoce[k.id];
      if (!prev || this.t - prev.t > 1.5) s.conoce[k.id] = { x: k.x, y: k.y, t: this.t - 1, oido: true };
      return;
    }
    if (s.alerta >= 2) {
      if (datos.alerta && k && !s.conoce[k.id]) s.conoce[k.id] = { x: k.x, y: k.y, t: this.t - 2, oido: true };
      return;
    }
    if (s.durmiendo && (datos.alerta || tipo === 'disparo' || tipo === 'motosierra')) s.durmiendo = false;
    if (datos.alerta || tipo === 'disparo' || tipo === 'motosierra') {
      if (k) s.conoce[k.id] = { x: k.x, y: k.y, t: this.t - 1, oido: true };
      this.alertar(s, k || null, tipo);
      return;
    }
    if (s.durmiendo) return;
    if (tipo === 'pasos') { s.sospecha += 0.2; return; }
    if (tipo === 'sirena' || tipo === 'motor' || tipo === 'voz') return;
    s.sospecha += 1; s.miedo = clamp(s.miedo + 5, 0, 100);
    if (s.sospecha >= 4 && s.st.int >= 6) { this.alertar(s, null, 'sospecha'); return; }
    if (s.tarea) return;
    const curioso = s.st.val >= 5 && !s.rasgos.has('miedoso');
    if (curioso && this.rng() < 0.55) {
      const tile = this.idx(x, y);
      if (tile >= 0 && tile < this.M.size && this.M.ci[tile] >= 0) {
        s.tarea = { tipo: 'investigar', tile, dur: 3, prog: 0 };
        this.decir(s, 'investigar');
        if (this.solo(s) && this.puede('investigar', 25)) this.narrar('grupo', this.txt('investigar', null, { n: s.nombre, l: this.lugar(x, y) }), s, false);
      }
    }
  };

  S.solo = function (s) {
    return !this.sob.some(o => o !== s && this.activoSob(o) && this.dist(o, s) < 5);
  };
  S.aislado = function (s) {
    for (const o of this.sob) {
      if (o === s || !this.activoSob(o) || o.traidor) continue;
      const d = this.dist(o, s);
      if (d < 4.5 || (d < 9 && this.los(o.x, o.y, s.x, s.y))) return false;
    }
    return true;
  };

  /* ======================= Ciclo principal ======================= */
  S.paso = function () {
    if (this.fin) return;
    this.t += DT; this.tick++;
    for (const e of this.sob) { e.px = e.x; e.py = e.y; }
    for (const e of this.ase) { e.px = e.x; e.py = e.y; }
    if (this.auto) { this.auto.px = this.auto.x; this.auto.py = this.auto.y; }
    if (this.ayuda) { this.ayuda.px = this.ayuda.x; this.ayuda.py = this.ayuda.y; }
    this.entorno();
    for (let i = 0; i < this.ase.length; i++) this.tickAsesino(this.ase[i]);
    for (const s of this.sob) this.tickSob(s);
    if (this.auto) this.tickAuto();
    this.separar();
    this.comprobarFin();
    if (this.registrar && this.tick % 10 === 0) {
      this.efectos = this.efectos.filter(f => this.t - f.t < f.dur);
      this.ruidos = this.ruidos.filter(r => this.t - r.t < 1.2);
    }
  };

  S.entorno = function () {
    // mensajes por celular a quienes todavía no saben nada
    if (this.alertaGeneral && this.op.celulares && this.def.senal === 'global' && this.tick % 5 === 0) {
      for (const s of this.sob) {
        if (this.activoSob(s) && !s.traidor && s.alerta < 2 && this.t - this.tAlerta > 6 + s.i * 2) {
          if (s.durmiendo && this.rng() < 0.6) continue;
          s.durmiendo = false;
          this.alertar(s, null, 'mensaje', true);
        }
      }
    }
    const a = this.ayuda;
    if (a) {
      if (a.fase === 'camino' && this.t >= a.llega - 6) {
        a.fase = 'llegando'; a.x = a.ruta[0][0]; a.y = a.ruta[0][1]; a.px = a.x; a.py = a.y; a.i = 1;
        this.ruido('sirena', this.M.W / 2, this.M.H / 2, 60, {});
      }
      if (a.fase === 'llegando' || a.fase === 'escena') {
        if (a.i < a.ruta.length) {
          const p = a.ruta[a.i], dx = p[0] - a.x, dy = p[1] - a.y, d = Math.sqrt(dx * dx + dy * dy), v = 9 * DT;
          a.ang = Math.atan2(dy, dx);
          if (d <= v) { a.x = p[0]; a.y = p[1]; a.i++; } else { a.x += dx / d * v; a.y += dy / d * v; }
        }
        if (a.fase === 'llegando' && this.t >= a.llega) {
          a.fase = 'escena';
          this.narrar('ambiente', this.txt('ayudaLlega', null, { quien: a.quien }), { x: a.x, y: a.y }, true);
          const activos = this.ase.filter(k => this.activoK(k));
          if (activos.length) this.narrar('asesino', this.txt('ayudaAsesinoHuye', null, { a: activos.map(k => k.nombre).join(' y '), quien: a.quien }), activos[0], false);
        }
      }
    }
  };

  S.separar = function () {
    const lst = this.sob.filter(s => this.activoSob(s) && !s.oculto && !s.agarradoPor);
    for (let i = 0; i < lst.length; i++) for (let j = i + 1; j < lst.length; j++) {
      const a = lst[i], b = lst[j];
      const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy;
      if (d2 > 0.3 || d2 < 1e-6) continue;
      const d = Math.sqrt(d2), f = (0.55 - d) * 0.25;
      const ux = dx / d * f, uy = dy / d * f;
      this.empujar(a, -ux, -uy); this.empujar(b, ux, uy);
    }
  };
  S.empujar = function (e, dx, dy) {
    const nx = e.x + dx, ny = e.y + dy, i = this.idx(nx, ny);
    if (i >= 0 && i < this.M.size && this.M.costS[i] > 0 && this.M.g[i] !== 'W') { e.x = nx; e.y = ny; }
  };

  /* ======================= Sobrevivientes ======================= */
  S.activoSob = function (s) { return s.vivo && !s.escapado && !s.enAuto && !s.esAsesino; };

  S.tickSob = function (s) {
    if (!this.activoSob(s)) return;
    if (s.cdDisparo > 0) s.cdDisparo -= DT;
    if (s.cdGolpe > 0) s.cdGolpe -= DT;
    if (s.cdSueter > 0) s.cdSueter -= DT;
    if (s.sangrado && !s.vendado) {
      s.hp -= 0.32 * DT;
      if (this.tick % 15 === 0) this.manchar(s.x, s.y, 1);
      if (s.hp <= 0) { this.morir(s, s.ultimoAtacante || null, 'herida'); return; }
    }
    if (s.agarradoPor) return;
    if (s.atrapado > 0) {
      s.atrapado -= DT;
      if (this.tick % 5 === 0 && this.rng() < 0.03 + s.st.fue * 0.012) s.atrapado = 0;
      if (this.tick % 5 === 0 && this.sob.some(o => o !== s && this.activoSob(o) && this.dist(o, s) < 1.5 && !o.panico)) s.atrapado -= 1;
      if (s.atrapado <= 0) this.narrar('grupo', this.txt('trampaLibre', null, { n: s.nombre }), s, false);
      if (this.tick % 3 === 0) this.percibir(s);
      return;
    }
    if (s.aturdido > 0) { s.aturdido -= DT; return; }
    if ((this.tick + s.i) % 2 === 0) this.percibir(s);
    // el miedo baja si no hay amenaza a la vista
    if (this.t - s.ultimaAmenaza > 4) {
      let cerca = 0, lid = false;
      for (const o of this.sob) {
        if (o === s || !this.activoSob(o)) continue;
        if (Math.abs(o.x - s.x) + Math.abs(o.y - s.y) < 4) { cerca++; if (o.rasgos.has('lider')) lid = true; }
      }
      s.miedo = clamp(s.miedo - (1.1 + (cerca ? 1.4 : 0) + (lid ? 1.2 : 0) + s.st.val * 0.1) * DT, 0, 100);
    }
    if (s.miedo > s.miedoMax) s.miedoMax = s.miedo;
    if (s.traidor && !s.esAsesino) this.comprobarTraidor(s);
    if (!this.activoSob(s)) return;
    s.cdPensar -= DT;
    if (s.cdPensar <= 0) { s.cdPensar = 0.3 + this.rng() * 0.1; this.pensarSob(s); }
    this.actuarSob(s);
  };

  S.rangoVistaSob = function (s, x, y) {
    if (s.durmiendo) return 0;
    let r;
    if (this.iluminado(x, y)) r = 13;
    else r = s.objeto === 'linterna' ? 7 : (this.op.celulares && s.alerta >= 1 ? 5.5 : 3.6);
    if (s.oculto) r = Math.min(r, 4);
    if (s.rasgos.has('distraido') && s.alerta < 2) r *= 0.7;
    return r;
  };

  S.percibir = function (s) {
    for (const k of this.ase) {
      if (k.fuera || k.muerto || k.huido) continue;
      if (k.neutralizado && !k.huyendo) continue;
      const d = this.dist(s, k);
      const rango = this.rangoVistaSob(s, k.x, k.y);
      if (d > rango) continue;
      if (!this.los(s.x, s.y, k.x, k.y)) continue;
      const info = s.conoce[k.id];
      const yaViendo = info && this.t - info.t < 0.5 && !info.oido;
      if (!yaViendo && d > 1.5) {
        // campo de visión: quien no está alerta solo ve lo que tiene delante
        const ang = Math.atan2(k.y - s.y, k.x - s.x);
        const da = Math.abs(((ang - s.dir) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI);
        if (da > (s.alerta >= 2 ? 2.0 : 1.05)) continue;
      }
      let p = 1.25 - d / rango * 0.7 - k.def.sigilo * 0.06 + s.st.int * 0.015;
      if (s.alerta < 2) p *= 0.6;
      if (k.intent.ritmo === 2 || k.agarre || k.cdAtaque > 0) p = 0.98;
      if (k.intent.modo === 'quieto' && !k.agresivo) p *= 0.7;
      if (k.def.pequeno) p *= 0.75;
      if (!yaViendo && this.rng() > clamp(p, 0.05, 0.98) * 0.6) continue;
      const caido = k.derribado > 0 || k.fingido > 0;
      s.conoce[k.id] = { x: k.x, y: k.y, t: this.t, derribado: caido };
      if (caido) continue;
      s.ultimaAmenaza = this.t;
      s.miedo = clamp(s.miedo + k.def.terror * (2.4 + 9 / (d + 1)) * (s.rasgos.has('miedoso') ? 1.4 : 1) * 0.2, 0, 100);
      if (s.alerta >= 2) {
        this.con.asesinos[k.id] = { x: k.x, y: k.y, t: this.t };
        if (!k.visto) this.primeraVista(s, k);
        if (k.tTele > this.t - 5 && k.clase === 'jason' && this.puede('teleAparece', 25)) this.narrar('asesino', this.txt('teleAparece', null, { n: s.nombre }), k, true);
        continue;
      }
      // todavía no está alerta
      if (k.def.habilidades.indexOf('muneco') >= 0 && k.kills === 0 && !k.agresivo && !k.visto) {
        if (!s.vioMuneco) { s.vioMuneco = true; if (this.puede('muneco', 60)) this.narrar('ambiente', this.txt('muneco', null, { n: s.nombre, l: this.lugar(k.x, k.y) }), k, false); }
        continue;
      }
      // una figura quieta afuera, en la oscuridad, es ambigua: genera sospecha antes que pánico
      const afuera = !this.M.interior[this.tileDe(k)];
      const acechando = k.intent.modo !== 'cazar' && k.cdAtaque <= 0 && !k.agarre && (afuera ? d > 2.5 : d > 5.5);
      if (acechando) {
        if (!info || this.t - info.t > 6) {
          s.sospecha += 1 + s.st.int * 0.08; s.miedo = clamp(s.miedo + 10, 0, 100);
          this.decir(s, ['¿Vieron eso?', '¿Quién anda ahí?', '¿Hola…?']);
          if (this.puede('vistazo' + k.clase, 20)) this.narrar('ambiente', this.txt('vistazo', k.clase, { n: s.nombre, l: this.lugar(k.x, k.y) }), k, false);
        }
        // con máscaras de broma (Ghostface, los Extraños) o un muñeco, la gente tarda más en creérselo
        const hab = k.def.habilidades;
        const broma = hab.indexOf('llamadas') >= 0 || hab.indexOf('tormento') >= 0 || hab.indexOf('muneco') >= 0;
        if (s.sospecha >= (broma ? 4.5 : 3)) this.alertar(s, k, 'vista');
      } else {
        this.alertar(s, k, 'vista');
      }
    }
    // cuerpos
    for (const c of this.cuerpos) {
      if (c.oculto || s.cuerposVistos.has(c.id)) continue;
      const d = this.dist(s, c);
      if (d > Math.min(8, this.rangoVistaSob(s, c.x, c.y) + 1) || !this.los(s.x, s.y, c.x, c.y)) continue;
      s.cuerposVistos.add(c.id);
      s.miedo = clamp(s.miedo + 30, 0, 100);
      if (c.llaves && this.llavesSuelo === c.tile) this.con.llaves = c.tile;
      if (!c.descubierto) {
        c.descubierto = true;
        this.narrar('grupo', this.txt('alarmaCuerpo', null, { n: s.nombre, o: c.nombre, l: this.lugar(c.x, c.y) }), c, true);
        this.ruido('grito', s.x, s.y, 16, { alerta: true, fuente: s });
      }
      this.alertar(s, null, 'cuerpo');
    }
    // objetos y llaves a la vista
    if (s.alerta >= 1 || this.tick % 10 === 0) {
      for (const it of this.items) {
        if (s.itemsConocidos.has(it.tile)) continue;
        const ix = this.cx(it.tile), iy = this.cy(it.tile);
        const dx = ix - s.x, dy = iy - s.y;
        if (dx * dx + dy * dy < 25 && this.los(s.x, s.y, ix, iy)) s.itemsConocidos.add(it.tile);
      }
      if (this.llavesTile >= 0 && !s.sabeLlaves) {
        const lx = this.cx(this.llavesTile), ly = this.cy(this.llavesTile);
        if (Math.abs(lx - s.x) + Math.abs(ly - s.y) < 2.2) s.sabeLlaves = true;
      }
    }
  };

  S.primeraVista = function (s, k) {
    k.visto = true;
    this.narrar('asesino', this.txt('primeraVista', k.clase, { n: s.nombre, a: k.nombre, l: this.lugar(k.x, k.y) }), k, true);
  };

  S.alertar = function (s, k, motivo, silencioso) {
    if (s.alerta >= 2 || !this.activoSob(s)) return;
    s.alerta = 2; s.durmiendo = false; s.actividad = null; s.tAlertaPropia = this.t;
    if (s.tarea && ['investigar', 'fusibles', 'abrir', 'cebo'].indexOf(s.tarea.tipo) >= 0) s.tarea = null;
    if (k) { s.conoce[k.id] = { x: k.x, y: k.y, t: this.t }; this.con.asesinos[k.id] = { x: k.x, y: k.y, t: this.t }; s.ultimaAmenaza = this.t; }
    s.miedo = clamp(s.miedo + 15, 0, 100);
    if (!this.alertaGeneral && !s.traidor) {
      this.alertaGeneral = true; this.tAlerta = this.t;
      if (motivo !== 'cuerpo' && motivo !== 'muerte') this.narrar('grupo', this.txt('alarma', null, { n: s.nombre, l: k ? this.lugar(k.x, k.y) : this.lugar(s.x, s.y) }), s, true);
      if (k && !k.visto && motivo === 'vista') this.primeraVista(s, k);
    }
    if (!silencioso && !s.oculto && !s.traidor) {
      this.decir(s, 'alerta');
      this.ruido('grito', s.x, s.y, 15, { alerta: true, k, fuente: s });
    }
  };

  S.umbralPanico = function (s) {
    let u = 48 + s.st.val * 4.5;
    if (s.rasgos.has('lider')) u += 6;
    if (s.rasgos.has('miedoso')) u -= 15;
    let cerca = 0;
    for (const o of this.sob) {
      if (o === s || !this.activoSob(o) || o.oculto || this.dist(o, s) >= 4) continue;
      cerca++;
      if (o.rasgos.has('lider')) u += 6;
    }
    u += Math.min(3, cerca) * 3; // juntos se aguanta mejor el miedo
    return u;
  };

  // Amenaza más cercana que esta persona conoce de primera mano
  S.amenaza = function (s) {
    let mejor = null;
    for (const k of this.ase) {
      if (k.fuera || k.muerto || k.neutralizado || k.huido) continue;
      const info = s.conoce[k.id];
      if (!info || this.t - info.t > 5) continue;
      const visible = this.t - info.t < 0.45 && !info.oido;
      const pos = visible ? k : info;
      const d = this.dist(s, pos);
      const dp = visible ? Math.min(this.dS(this.tileDe(s), this.tileDe(k)), d * 1.6 + 3) : d;
      if (!mejor || dp < mejor.dp) mejor = { k, d, dp, visible, info, derribado: k.derribado > 0 || k.fingido > 0 };
    }
    return mejor;
  };

  /* ---------- decisiones ---------- */
  S.pensarSob = function (s) {
    const amen = this.amenaza(s);
    s.amen = amen;
    if (s.alerta < 2 || s.traidor) { this.pensarNormal(s); return; }
    if (s.oculto) { this.pensarOculto(s, amen); return; }
    const umbral = this.umbralPanico(s);
    if (!s.panico && s.miedo > umbral) {
      s.panico = true; s.tarea = null; s.huidaTile = -1;
      this.decir(s, 'panico');
      if (this.puede('panico' + s.id, 25)) this.narrar('grupo', this.txt('panico', null, { n: s.nombre }), s, false);
      if (this.plan && this.plan.lider === s.id) this.plan.lider = null;
    } else if (s.panico && s.miedo < umbral - 25) {
      s.panico = false;
      if (this.puede('calma' + s.id, 25)) this.narrar('grupo', this.txt('calma', null, { n: s.nombre }), s, false);
    }
    const amenActiva = amen && !amen.derribado;
    if (amenActiva && amen.d < 1.7) {
      if (this.debePelear(s, amen.k)) { this.intentAtacar(s, amen.k); return; }
      this.intentHuir(s, amen); return;
    }
    if (amenActiva && s.sueter && amen.k.clase === 'jason' && amen.visible && amen.d < 4 && s.cdSueter <= 0 && s.sueterUsos < 2 && s.st.int >= 6) {
      this.usarSueter(s, amen.k); return;
    }
    if (s.panico) {
      if (amenActiva && amen.dp < 14) { this.intentHuir(s, amen); return; }
      if (!this.buscarEscondite(s, true)) s.intent = { modo: 'quieto' };
      return;
    }
    // el asesino está en el suelo: es el momento de acabar con él
    if (amen && amen.derribado && amen.visible && amen.d < 12 && amen.k.def.mortal === 'no' && this.decidirDerribado(s, amen.k)) return;
    if (amenActiva && this.puedeDisparar(s, amen)) { s.intent = { modo: 'disparar', k: amen.k }; return; }
    const ap = this.aliadoEnPeligro(s);
    if (ap && this.ayudaria(s, ap)) {
      if (ap.a.ayudadoPor !== s.id) {
        ap.a.ayudadoPor = s.id;
        if (this.puede('heroe' + s.id, 20)) this.narrar('combate', this.txt('heroe', null, { n: s.nombre, a: ap.k.nombre, o: ap.a.nombre }), s, true);
      }
      this.intentAtacar(s, ap.k); return;
    } else if (ap && s.rasgos.has('egoista') && this.puede('abandona' + s.id, 40)) {
      this.narrar('grupo', this.txt('abandona', null, { n: s.nombre, o: ap.a.nombre }), s, false);
    }
    // la meta es eliminarlo: si el plan lo permite y puede pelear, se le va encima
    if (amenActiva && amen.visible && amen.d < 10 && this.vaAlAtaque(s, amen)) { this.intentAtacar(s, amen.k); return; }
    if (amenActiva && this.peligroso(s, amen)) { this.intentHuir(s, amen); return; }
    s.huidaTile = -1;
    if (this.pensarApoyo(s)) return;
    this.pensarPlan(s);
  };

  // ¿Se lanza a pelear? Depende del plan, de su arma, de su valor y de cuántos lo acompañan
  S.vaAlAtaque = function (s, amen) {
    const pl = this.plan;
    if (s.panico || !pl || !this.puedeLuchar(s)) return false;
    if (pl.tipo === 'enfrentar') return true;
    if (pl.tipo === 'emboscada') return amen.d < 4.5 || (this.enRefugio(s) && this.M.sala[this.tileDe(amen.k)] === pl.refugio);
    return amen.d < 3 && this.aliadosCerca(s, 5) >= 2;
  };
  S.puedeLuchar = function (s) {
    const arma = D.ARMAS[s.arma];
    if (arma.tipo === 'fuego') return s.municion > 0 || s.st.val >= 6;
    return VALOR_ARMA[s.arma] >= 3 || s.rasgos.has('peleador') || s.st.fue >= 7 || (s.st.val >= 7 && this.aliadosCerca(s, 4) >= 2);
  };
  S.aliadosCerca = function (s, r) {
    let n = 0;
    for (const o of this.sob) if (o !== s && this.activoSob(o) && !o.traidor && !o.oculto && this.dist(o, s) < r) n++;
    return n;
  };
  S.debePelear = function (s, k) {
    if (k.def.pequeno) return !s.panico || this.rng() < 0.5;
    const arma = D.ARMAS[s.arma];
    if (arma.tipo === 'fuego' && s.municion > 0 && !s.panico) return true;
    if (s.panico) return this.rng() < 0.12;
    let coraje = s.st.val + s.st.fue * 0.5 + (s.rasgos.has('peleador') ? 3 : 0) + (VALOR_ARMA[s.arma] >= 5 ? 2 : 0) + (s.rasgos.has('heroe') ? 2 : 0);
    coraje += this.aliadosCerca(s, 4) * 1.5; // en grupo se atreven más
    if (this.con.inmortal[k.clase]) coraje -= 2;
    if (k.agarre && k.agarre.s !== s) coraje += 3;
    if (this.acorralado(s, k)) coraje += 6;
    return coraje >= 12.5;
  };
  S.acorralado = function (s, k) {
    const cur = this.tileDe(s), kt = this.tileDe(k);
    const M = this.M;
    if (cur < 0 || cur >= M.size) return true;
    const a = M.ci[cur];
    if (a < 0) return true;
    const base = this.dK(kt, cur);
    for (let e = M.adjStart[a]; e < M.adjStart[a + 1]; e++) {
      const v = M.nodos[M.adjNode[e]];
      if (this.dK(kt, v) > base + 0.5) return false;
    }
    return true;
  };

  S.puedeDisparar = function (s, amen) {
    const arma = D.ARMAS[s.arma];
    if (arma.tipo !== 'fuego' || s.municion <= 0 || !amen.visible) return false;
    if (amen.d > arma.alcance) return false;
    if (s.panico && this.rng() < 0.5) return false;
    if (!this.los(s.x, s.y, amen.k.x, amen.k.y)) return false;
    // con un amigo pegado al asesino, solo dispara quien tiene buena puntería
    if (s.st.pun < 8 && this.aliadoEnLinea(s, amen.k)) return false;
    return true;
  };
  S.aliadoEnLinea = function (s, k) {
    const d = this.dist(s, k);
    for (const o of this.sob) {
      if (o === s || !this.activoSob(o) || o.oculto) continue;
      if (this.dist(o, k) < 1.3) return true;
      const dd = this.dist(s, o);
      if (dd > d) continue;
      const adelante = (o.x - s.x) * (k.x - s.x) + (o.y - s.y) * (k.y - s.y) > 0;
      const cruz = Math.abs((k.x - s.x) * (s.y - o.y) - (s.x - o.x) * (k.y - s.y)) / Math.max(0.01, d);
      if (adelante && cruz < 0.7) return true;
    }
    return false;
  };
  S.meleeCapaz = function (s) {
    return (VALOR_ARMA[s.arma] >= 3 || s.rasgos.has('peleador') || s.st.fue >= 8) && s.st.val >= 5 && !s.panico && D.ARMAS[s.arma].tipo !== 'fuego';
  };

  S.aliadoEnPeligro = function (s) {
    let mejor = null;
    for (const a of this.sob) {
      if (a === s || !this.activoSob(a)) continue;
      const d = this.dist(a, s);
      if (d > 7) continue;
      let k = null;
      if (a.agarradoPor) k = this.ase.find(x => x.id === a.agarradoPor);
      else for (const kk of this.ase) {
        if (!this.activoK(kk) || kk.derribado > 0) continue;
        if (kk.objetivo === a && this.dist(kk, a) < 1.8) { k = kk; break; }
      }
      if (!k || !this.los(s.x, s.y, k.x, k.y)) continue;
      if (!mejor || d < mejor.d) mejor = { a, k, d };
    }
    return mejor;
  };

  S.ayudaria = function (s, ap) {
    if (s.panico || s.rasgos.has('egoista')) return false;
    if (D.ARMAS[s.arma].tipo === 'fuego' && s.municion > 0) return false;
    if (s.rasgos.has('heroe')) return true;
    if (ap.a.agarradoPor && s.st.val >= 5) return true;
    if (s.rasgos.has('peleador') && s.st.val >= 5) return true;
    return s.st.val >= 6 && this.puedeLuchar(s);
  };
  S.peligroso = function (s, amen) {
    const k = amen.k;
    let radio = k.objetivo === s ? 11 : 7;
    if (!k.def.corre) radio -= 1.5;
    const pl = this.plan;
    if (pl && (pl.tipo === 'enfrentar' || pl.tipo === 'emboscada')) radio = this.puedeLuchar(s) ? 2 : 4.5;
    if (pl && pl.tipo === 'emboscada' && this.enRefugio(s) && !this.refugioRoto()) radio = 2;
    return amen.dp < radio;
  };
  // Devuelve true si la persona se ocupa del asesino caído (rematarlo, golpearlo o dispararle)
  S.decidirDerribado = function (s, k) {
    if (s.panico) return false;
    const sabe = s.rasgos.has('estratega') || s.st.int >= 7 || this.con.inmortal[k.clase];
    if (!sabe && s.st.int < 5 && s.st.val >= 5 && !s.comprobado) {
      s.comprobado = true;
      s.tarea = { tipo: 'comprobar', k, tile: this.tileDe(k), dur: 2.5, prog: 0 };
      this.decir(s, 'comprobar');
      if (this.puede('comprobar', 30)) this.narrar('grupo', this.txt('comprobar', null, { n: s.nombre, a: k.nombre }), s, false);
      return this.hacerTarea(s);
    }
    if (!sabe && s.st.val < 6) return false;
    const arma = D.ARMAS[s.arma];
    if (arma.tipo === 'melee' && s.arma !== 'ninguna') {
      if (!s.tarea || s.tarea.tipo !== 'rematar') {
        s.tarea = { tipo: 'rematar', k, tile: this.tileDe(k), dur: Math.max(3, 6 - s.st.fue * 0.3), prog: 0 };
        this.decir(s, 'rematar');
      }
      return this.hacerTarea(s);
    }
    if (arma.tipo === 'fuego' && s.municion > 0) { s.intent = { modo: 'disparar', k }; return true; }
    s.intent = { modo: 'atacar', k, ritmo: 2 };
    return true;
  };
  S.usarSueter = function (s, k) {
    s.sueterUsos++; s.cdSueter = 20;
    if (this.rng() < (s.sueterUsos === 1 ? 0.65 : 0.3)) {
      k.aturdido = this.r(7, 10);
      this.narrar('combate', this.txt('sueter', null, { n: s.nombre }), s, true);
    } else this.narrar('combate', this.txt('sueterFalla', null, { n: s.nombre }), s, true);
    s.intent = { modo: 'quieto' };
  };

  S.intentAtacar = function (s, k) {
    s.intent = { modo: 'atacar', k, ritmo: 2 };
    if (this.rng() < 0.15) this.decir(s, 'pelear');
  };

  S.intentHuir = function (s, amen) {
    s.cdHuida -= 0.3;
    if (s.huidaTile < 0 || s.cdHuida <= 0 || this.tileDe(s) === s.huidaTile) {
      s.huidaTile = this.elegirHuida(s, amen);
      s.cdHuida = 0.9;
    }
    if (s.huidaTile < 0) { this.intentAtacar(s, amen.k); return; }
    s.intent = { modo: 'ir', tile: s.huidaTile, ritmo: 2, huyendo: true };
    if (this.rng() < 0.08) this.decir(s, s.panico ? 'panico' : 'huir');
    if (s.panico && this.rng() < 0.025 * (1.3 - s.st.vel / 10)) {
      s.aturdido = 1.4;
      if (this.rng() < 0.5) this.registrarHerida(s, 8, null, 'caida');
      if (this.puede('tropiezo', 15)) this.narrar('grupo', this.txt('tropiezo', null, { n: s.nombre }), s, false);
    }
    if (amen && !amen.visible && amen.d > 5 && (s.st.sig >= 7 || s.panico || (this.plan && this.plan.tipo === 'esconderse'))) {
      this.buscarEscondite(s, false, 5);
    }
  };

  S.elegirHuida = function (s, amen) {
    const M = this.M, cur = this.tileDe(s);
    const amenazas = [];
    for (const k of this.ase) {
      if (!this.activoK(k) || k.derribado > 0) continue;
      const info = s.conoce[k.id];
      if (!info || this.t - info.t > 6) continue;
      amenazas.push(this.t - info.t < 0.5 ? this.tileDe(k) : this.idx(info.x, info.y));
    }
    if (!amenazas.length && amen) amenazas.push(this.idx(amen.info.x, amen.info.y));
    const cands = [];
    const add = (tile, bonus) => { if (tile >= 0 && tile < M.size && M.ci[tile] >= 0) cands.push([tile, bonus]); };
    const pl = this.plan;
    if (pl && pl.meta >= 0 && !s.panico) add(pl.meta, 6);
    const lid = this.liderPlan();
    if (lid && lid !== s && !s.panico) add(this.tileDe(lid), 4);
    if (pl && pl.refugio !== undefined && !this.refugioRoto()) add(pl.puntoRefugio, 5);
    M.escondites.forEach(t => { if (Math.abs(this.cx(t) - s.x) + Math.abs(this.cy(t) - s.y) < 14) add(t, (s.st.sig >= 7 || s.panico) ? 5 : 2); });
    for (let i = 0; i < 14; i++) add(M.nodos[Math.floor(this.rng() * M.n)], 0);
    let mejor = -1, mv = -1e9;
    for (const c of cands) {
      const tile = c[0], bonus = c[1];
      const ds = this.dS(cur, tile);
      if (ds > 60) continue;
      let dk = 999;
      for (const a of amenazas) dk = Math.min(dk, this.dK(a, tile));
      if (dk <= ds * 0.9 + 1) continue;
      const v = (dk - ds * 1.1) * 0.6 + bonus - ds * 0.12;
      if (v > mv) { mv = v; mejor = tile; }
    }
    return mejor;
  };

  S.buscarEscondite = function (s, panico, radioMax) {
    const M = this.M, cur = this.tileDe(s);
    if (M.g[cur] === 'h' && !this.sob.some(o => o !== s && o.oculto && o.escondite === cur)) { this.esconder(s, 1); return true; }
    let mejor = -1, mv = 1e9;
    for (const t of M.escondites) {
      if (this.sob.some(o => o !== s && this.activoSob(o) && o.escondite === t)) continue;
      const d = this.dS(cur, t);
      if (d > (radioMax || 25)) continue;
      let peligro = 0;
      for (const k of this.ase) {
        const info = s.conoce[k.id];
        if (info && this.t - info.t < 8) peligro += Math.max(0, 10 - this.dK(this.idx(info.x, info.y), t)) * 2;
      }
      const v = d + peligro;
      if (v < mv) { mv = v; mejor = t; }
    }
    if (mejor < 0) {
      if (panico) {
        const lid = this.liderPlan();
        if (lid && lid !== s) { s.intent = { modo: 'ir', tile: this.tileDe(lid), ritmo: 2 }; return true; }
        if (M.g[cur] === 'm' || !this.iluminado(s.x, s.y)) { this.esconder(s, M.g[cur] === 'm' ? 0.75 : 0.45); return true; }
      }
      return false;
    }
    s.escondite = mejor;
    s.intent = { modo: 'ir', tile: mejor, ritmo: panico ? 2 : 1, esconderse: true };
    return true;
  };

  S.esconder = function (s, calidad) {
    if (s.oculto) return;
    s.oculto = true; s.calidadEsc = calidad; s.tOculto = this.t; s.intent = { modo: 'quieto' }; s.tarea = null;
    s.escondite = this.tileDe(s);
    this.decir(s, 'esconderse', 3);
    if (this.puede('esconder' + s.id, 30)) this.narrar('grupo', this.txt('esconderse', null, { n: s.nombre, l: this.lugar(s.x, s.y) }), s, false);
  };

  S.pensarOculto = function (s, amen) {
    s.intent = { modo: 'quieto' };
    if (amen && !amen.derribado && amen.d < 3.5) {
      const p = (0.03 + (10 - s.st.val) * 0.012) * (s.rasgos.has('miedoso') ? 1.6 : 1);
      if (this.rng() < p) {
        s.oculto = false; s.panico = true; s.escondite = -1;
        this.narrar('grupo', this.txt('salirEscondite', null, { n: s.nombre }), s, true);
        this.decir(s, 'panico');
        return;
      }
    }
    const tranquilo = this.t - s.ultimaAmenaza > 28;
    const planEsc = this.plan && this.plan.tipo === 'esconderse';
    if (tranquilo && !planEsc && s.miedo < 45 && !this.ayuda) { s.oculto = false; s.escondite = -1; s.panico = false; }
    if (tranquilo && s.panico && s.miedo < this.umbralPanico(s) - 25) s.panico = false;
  };

  S.pensarApoyo = function (s) {
    if (s.amen && s.amen.visible && s.amen.d < 10) return false;
    const puedeCurar = s.rasgos.has('medico') || s.objeto === 'botiquin';
    if (puedeCurar && (!s.tarea || s.tarea.tipo === 'curar')) {
      let herido = null;
      for (const o of this.sob) {
        if (!this.activoSob(o) || o.oculto) continue;
        if ((o.sangrado && !o.vendado) || o.hp < o.hpMax * 0.45) {
          if (o !== s && this.dist(o, s) > 9) continue;
          if (o.curadoHasta && o.curadoHasta > this.t) continue;
          herido = o; break;
        }
      }
      if (herido) {
        if (!s.tarea || s.tarea.tipo !== 'curar' || s.tarea.o !== herido)
          s.tarea = { tipo: 'curar', o: herido, dur: s.rasgos.has('medico') ? 5 : 8, prog: 0 };
        return this.hacerTarea(s);
      }
    }
    if (!s.tarea || s.tarea.tipo === 'tomar') {
      let mejor = null, mv = 1e9;
      for (const it of this.items) {
        if (!s.itemsConocidos.has(it.tile) || !this.utilParaMi(s, it.tipo)) continue;
        if (this.sob.some(o => o !== s && o.tarea && o.tarea.tipo === 'tomar' && o.tarea.it === it)) continue;
        const d = this.dS(this.tileDe(s), it.tile);
        if (d < 14 && d < mv) { mv = d; mejor = it; }
      }
      if (mejor) {
        if (!s.tarea || s.tarea.it !== mejor) s.tarea = { tipo: 'tomar', it: mejor, tile: mejor.tile, dur: 0.6, prog: 0 };
        return this.hacerTarea(s);
      }
      if (s.tarea && s.tarea.tipo === 'tomar') s.tarea = null;
    }
    return false;
  };

  S.utilParaMi = function (s, tipo) {
    if (tipo === 'botiquin') return s.objeto === 'ninguno';
    if (tipo === 'sueter') return !s.sueter && s.st.int >= 6;
    if (VALOR_ARMA[tipo] === undefined) return false;
    const actual = VALOR_ARMA[s.arma] + (D.ARMAS[s.arma].tipo === 'fuego' && s.municion === 0 ? -6 : 0);
    return VALOR_ARMA[tipo] > actual + (D.ARMAS[tipo].tipo === 'fuego' ? 0 : 0.5);
  };

  /* ---------- fase tranquila ---------- */
  S.pensarNormal = function (s) {
    if (s.tarea) { this.hacerTarea(s); return; }
    if (s.durmiendo) { s.intent = { modo: 'quieto' }; return; }
    if (!s.actividad || this.t > s.actHasta) this.elegirActividad(s);
    const a = s.actividad;
    if (!a) { s.intent = { modo: 'quieto' }; return; }
    if (this.tileDe(s) === a.tile) {
      s.intent = { modo: 'quieto' };
      if (a.tipo === 'dormir' && !s.durmiendo && s.alerta < 2) { s.durmiendo = true; s.actHasta = 1e9; }
      if (a.tipo !== 'dormir' && this.rng() < 0.03) this.decir(s, 'normal');
    } else s.intent = { modo: 'ir', tile: a.tile, ritmo: s.alerta >= 2 ? 1 : 0 };
  };

  S.elegirActividad = function (s) {
    const A = this.M.act, frac = this.t / this.tFin;
    const op = [['reunion', 5]];
    if (s.traidor) op.push(['pasear', 3]);
    if (A.trastero.length) op.push(['trastero', 0.7]);
    if (A.cocina.length) op.push(['cocina', 1.4]);
    if (A.bano.length) op.push(['bano', 0.9]);
    if (A.afuera.length) op.push(['afuera', 0.8 + (s.rasgos.has('distraido') ? 1.6 : 0)]);
    if (A.pasear.length) op.push(['pasear', 0.8 + (s.rasgos.has('distraido') ? 1 : 0)]);
    if (A.dormir.length && frac > 0.06 && !s.traidor) op.push(['dormir', (frac - 0.04) * 14]);
    const tot = op.reduce((a, b) => a + b[1], 0);
    let r = this.rng() * tot, tipo = 'reunion';
    for (const o of op) { r -= o[1]; if (r <= 0) { tipo = o[0]; break; } }
    const lista = A[tipo] && A[tipo].length ? A[tipo] : A.reunion;
    let tile = this.elegir(lista);
    if (tipo === 'reunion') tile = A.reunion[s.i % A.reunion.length];
    s.actividad = { tipo, tile };
    s.actHasta = this.t + this.r(18, 45);
    if (tipo !== 'reunion' && this.registrar && !s.traidor) {
      const l = this.lugar(this.cx(tile), this.cy(tile));
      if (tipo === 'dormir' && this.puede('dormir', 30)) this.narrar('grupo', this.txt('dormir', null, { n: s.nombre, l }), s, false);
      else if ((tipo === 'afuera' || tipo === 'bano') && this.puede('separarse', 40)) this.narrar('grupo', this.txt('separarse', null, { n: s.nombre, l }), s, false);
    }
  };

  /* ---------- tareas ---------- */
  // Ejecuta la tarea actual. Devuelve true si la persona está ocupada con ella.
  S.hacerTarea = function (s) {
    const ta = s.tarea;
    if (!ta) return false;
    let tile = ta.tile;
    const cuerpoACuerpo = ta.tipo === 'curar' || ta.tipo === 'rematar' || ta.tipo === 'comprobar';
    if (ta.tipo === 'curar') {
      if (!this.activoSob(ta.o) || ta.o.oculto) { s.tarea = null; return false; }
      tile = this.tileDe(ta.o);
    }
    if (ta.tipo === 'rematar' || ta.tipo === 'comprobar') {
      if (ta.k.derribado <= 0 || ta.k.neutralizado) { s.tarea = null; return false; }
      tile = this.tileDe(ta.k);
    }
    const llegado = cuerpoACuerpo ? (ta.tipo === 'curar' && ta.o === s ? true : this.dist(s, { x: this.cx(tile), y: this.cy(tile) }) < 1.4) : this.tileDe(s) === tile;
    if (!llegado) {
      const urg = ta.tipo === 'cebo' || ta.tipo === 'rematar' || (this.alertaGeneral && s.alerta >= 2 && ta.tipo !== 'investigar');
      s.intent = { modo: 'ir', tile, ritmo: urg ? (s.amen && s.amen.visible ? 2 : 1) : 0 };
      return true;
    }
    s.intent = { modo: 'quieto', tarea: true };
    ta.prog += 0.3;
    if (ta.tipo === 'rematar') {
      const k = ta.k;
      if (this.rng() < (k.derribado < 6 ? 0.1 : 0.025)) {
        this.levantarse(k, true);
        this.narrar('combate', this.txt('rematarFalla', null, { n: s.nombre, a: k.nombre }), s, true);
        s.tarea = null; this.agarrar(k, s, true); return true;
      }
    }
    if (ta.tipo === 'comprobar' && ta.k.derribado > 0 && ta.k.derribado < 5) {
      this.levantarse(ta.k, false); s.tarea = null;
      this.atacar(ta.k, s, true, 'sorpresa'); return true;
    }
    if (ta.prog >= ta.dur) this.completarTarea(s, ta);
    return true;
  };

  S.completarTarea = function (s, ta) {
    s.tarea = null;
    const l = this.lugar(s.x, s.y);
    switch (ta.tipo) {
      case 'investigar':
        s.actividad = null;
        if (this.solo(s) && this.puede('investigarNada', 30)) this.narrar('grupo', this.txt('investigarNada', null, { n: s.nombre, l }), s, false);
        break;
      case 'abrir':
        this.narrar('ambiente', this.txt('abrePuerta', null, { n: s.nombre }), s, false);
        s.sospecha += 1; s.miedo = clamp(s.miedo + 8, 0, 100);
        break;
      case 'cebo':
        s.actividad = null; s.sospecha += 2;
        break;
      case 'fusibles':
        if (this.fusiblesRotos) {
          this.narrar('ambiente', this.txt('fusiblesRotos', null, { n: s.nombre }), s, false);
          this.alertar(s, null, 'fusibles');
        } else {
          this.luz = true;
          this.narrar('ambiente', this.txt('luzVuelve', null, { n: s.nombre, l }), s, false);
        }
        break;
      case 'tomar': {
        const it = ta.it, i = this.items.indexOf(it);
        if (i < 0) break;
        this.items.splice(i, 1);
        if (it.tipo === 'botiquin') s.objeto = 'botiquin';
        else if (it.tipo === 'sueter') s.sueter = true;
        else { s.arma = it.tipo; s.municion = D.ARMAS[it.tipo].municion || 0; }
        const imp = it.tipo === 'escopeta' || it.tipo === 'revolver' || it.tipo === 'rifle' || it.tipo === 'sueter';
        this.narrar('grupo', this.txt('tomaObjeto', null, { n: s.nombre, obj: NOMBRE_OBJ[it.tipo] || it.tipo, l }), s, imp);
        break;
      }
      case 'curar': {
        const o = ta.o;
        o.sangrado = false; o.vendado = true; o.curadoHasta = this.t + 30;
        o.heridas.forEach(h => { if (!h.tratada) h.tratada = s === o ? 'se vendó solo' : 'vendada por ' + s.nombre; });
        o.hp = Math.min(o.hpMax, o.hp + (s.rasgos.has('medico') ? 25 : 12) + (s.objeto === 'botiquin' ? 8 : 0));
        if (o !== s) { s.est.salvo++; this.decir(s, 'curar'); this.narrar('grupo', this.txt('curar', null, { n: s.nombre, o: o.nombre }), s, false); }
        break;
      }
      case 'buscarLlaves':
        this.buscadas.add(ta.tile);
        if (this.llavesTile === ta.tile) {
          this.llavesTile = -1; s.llaves = true;
          this.narrar('grupo', this.txt('llavesEncontradas', null, { n: s.nombre, l }), s, true);
          this.decir(s, ['¡Las tengo!', '¡Llaves!']);
        }
        break;
      case 'recogerLlaves':
        if (this.llavesSuelo === ta.tile || (this.llavesSuelo >= 0 && Math.abs(this.cx(this.llavesSuelo) - s.x) + Math.abs(this.cy(this.llavesSuelo) - s.y) < 2.5)) {
          const c = this.cuerpos.find(cc => cc.llaves);
          this.llavesSuelo = -1; s.llaves = true;
          if (c) c.llaves = false;
          this.narrar('grupo', this.txt('llavesCuerpo', null, { n: s.nombre, o: c ? c.nombre : 'alguien' }), s, true);
        }
        break;
      case 'reparar':
        if (this.auto && this.auto.danio === 'cables') {
          this.auto.danio = null; this.con.autoDanado = false;
          this.narrar('grupo', this.txt('reparado', null, { n: s.nombre }), s, true);
        }
        break;
      case 'llamar':
        this.completarLlamada(s, ta);
        break;
      case 'barricada':
        if (!this.barricadas[ta.abertura] && !this.rotas.has(ta.abertura)) {
          const hp = (this.M.g[ta.abertura] === 'D' ? 90 : 60) + s.st.fue * 8;
          this.barricadas[ta.abertura] = { hp, max: hp };
          if (this.puede('barricada', 8)) this.narrar('grupo', this.txt('barricada', null, { n: s.nombre, l: this.lugar(this.cx(this.vecinaInterior(ta.abertura)), this.cy(this.vecinaInterior(ta.abertura))) }), s, false);
        }
        break;
      case 'rematar': {
        const k = ta.k;
        k.neutralizado = true; k.derribado = 0;
        k.estadoFinal = 'Eliminado: ' + s.nombre + ' lo remató en el suelo';
        const clave = k.clase === 'jason' ? 'rematarJason' : (k.clase === 'michael' ? 'rematarMichael' : 'rematar');
        this.narrar('combate', this.txt(clave, null, { n: s.nombre, a: k.nombre, arma: 'el ' + D.ARMAS[s.arma].nombre.toLowerCase() }), s, true);
        this.manchar(k.x, k.y, 8);
        break;
      }
    }
  };

  /* ---------- planes ---------- */
  S.participantes = function () {
    return this.sob.filter(s => this.activoSob(s) && s.alerta >= 2 && !s.traidor && !s.oculto && !s.panico && !s.agarradoPor && s.atrapado <= 0);
  };

  S.liderPlan = function () {
    if (!this.plan) return null;
    let l = this.plan.lider ? this.sob.find(s => s.id === this.plan.lider) : null;
    if (l && this.activoSob(l) && !l.panico && !l.oculto && l.alerta >= 2) return l;
    const parts = this.participantes();
    if (!parts.length) return null;
    const anterior = l;
    parts.sort((a, b) => this.puntajeLider(b) - this.puntajeLider(a));
    l = parts[0];
    this.plan.lider = l.id;
    if (anterior && this.puede('lider', 20)) this.narrar('grupo', this.txt('lider', null, { n: l.nombre, o: anterior.nombre }), l, false);
    return l;
  };
  S.puntajeLider = function (s) { return (s.rasgos.has('lider') ? 5 : 0) + s.st.int * 0.6 + s.st.val * 0.5 + (s.rasgos.has('estratega') ? 2 : 0); };

  S.medioLlamada = function () { return null; }; // no hay rescate: hay que eliminar al asesino
  S.elegirRefugio = function (desde, n) {
    const M = this.M;
    let mejor = null, mv = 1e9;
    M.salas.forEach((r, ri) => {
      if (r.tiles.length < n + 1 || /ganchos|letrina/.test(r.nombre)) return;
      if (this.ase.some(k => this.activoK(k) && M.sala[this.tileDe(k)] === ri)) return;
      const d = this.dS(desde, r.tiles[0]);
      if (d > 45) return;
      const v = r.puertas.length * 3 + r.ventanas.length * 2.2 + d * 0.12 + (r.tiles.length > 40 ? 2 : 0);
      if (v < mv) { mv = v; mejor = ri; }
    });
    return mejor;
  };

  S.elegirPlan = function () {
    const parts = this.participantes();
    if (!parts.length) return;
    const lider = parts.slice().sort((a, b) => this.puntajeLider(b) - this.puntajeLider(a))[0];
    const M = this.M, desde = this.tileDe(lider), int = lider.st.int + (lider.rasgos.has('estratega') ? 2 : 0);
    const conBala = s => D.ARMAS[s.arma].tipo === 'fuego' && s.municion > 0;
    const nArmas = parts.filter(conBala).length;
    const nFilo = parts.filter(s => D.ARMAS[s.arma].tipo === 'melee' && VALOR_ARMA[s.arma] >= 3).length;
    const nPelea = parts.filter(s => s.rasgos.has('peleador') || s.st.fue >= 8).length;
    const nSin = parts.filter(s => !conBala(s) && VALOR_ARMA[s.arma] < 3).length;
    const prom = k => parts.reduce((a, s) => a + s.st[k], 0) / parts.length;
    const conocidos = this.ase.filter(k => this.con.asesinos[k.id] && this.activoK(k));
    const nAse = Math.max(1, conocidos.length);
    const inmortal = conocidos.some(k => this.con.inmortal[k.clase] || this.con.resistente[k.id]);
    const grande = conocidos.some(k => ['jason', 'michael', 'leatherface'].indexOf(k.clase) >= 0);
    const utiles = this.itemsParaGrupo(parts);
    const sc = {};
    const ruido = () => (this.rng() - 0.5) * Math.max(3, (13 - int) * 3);
    const fallo = tipo => this.planesFallidos[tipo] && this.t < this.planesFallidos[tipo];
    if (utiles.length && nSin > 0) sc.armarse = 36 + nSin * 7 + Math.min(utiles.length, nSin) * 4 - nArmas * 6;
    sc.enfrentar = 22 + nArmas * 13 + nFilo * 6 + nPelea * 6 + prom('val') * 2 - (nAse - 1) * 10 - (grande ? 6 : 0) - nSin * 3;
    const ri = this.elegirRefugio(desde, parts.length);
    if (ri !== null) sc.emboscada = 28 + nSin * 3 + (grande ? 8 : 0) + (inmortal ? 6 : 0) + (nAse > 1 ? 6 : 0);
    let tipo = null, mv = -1e9;
    for (const k in sc) {
      if (fallo(k)) continue;
      const v = sc[k] + ruido();
      if (v > mv) { mv = v; tipo = k; }
    }
    if (!tipo) tipo = 'enfrentar';
    const pl = { tipo, lider: lider.id, inicio: this.t, meta: -1 };
    let l = '';
    if (tipo === 'emboscada') {
      pl.refugio = ri; const r = M.salas[ri];
      pl.puntoRefugio = this.puntoLejosDeAberturas(r); pl.meta = pl.puntoRefugio; l = r.nombre;
    }
    this.plan = pl;
    if (!this.registrar) return;
    let razon = '';
    if (inmortal) razon = ' ' + T.planRazon.inmortal;
    else if (tipo === 'enfrentar' && nArmas) razon = ' ' + T.planRazon.armas;
    else if (tipo === 'armarse') razon = ' ' + T.planRazon.sinArmas;
    this.narrar('plan', this.txt('plan', tipo, { n: lider.nombre, l }) + razon, lider, true);
    const grito = { armarse: ['¡Agarren algo para pelear!'], enfrentar: ['¡Vamos a por él!'], emboscada: ['¡Todos adentro, lo esperamos!'] }[tipo];
    this.decir(lider, grito || 'alerta');
  };

  // Objetos útiles que alguien del grupo conoce (se lo cuentan entre ellos)
  S.itemsParaGrupo = function (parts) {
    return this.items.filter(it => {
      if (it.tipo === 'botiquin' || it.tipo === 'sueter') return false;
      if (!parts.some(s => s.itemsConocidos.has(it.tile))) return false;
      return parts.some(s => this.utilParaMi(s, it.tipo));
    });
  };
  S.fallarPlan = function (seg) {
    if (!this.plan) return;
    this.planesFallidos[this.plan.tipo] = this.t + (seg || 60);
    this.plan = null;
    this.sob.forEach(s => {
      s.puesto = -1;
      if (s.tarea && ['barricada', 'buscarLlaves', 'reparar', 'llamar', 'recogerLlaves'].indexOf(s.tarea.tipo) >= 0) s.tarea = null;
    });
  };
  S.puntoLejosDeAberturas = function (r) {
    let mejor = r.tiles[0], mv = -1;
    for (const t of r.tiles) {
      if (this.M.g[t] === 'h') continue;
      const d = this.distAberturas(r, t);
      if (d > mv) { mv = d; mejor = t; }
    }
    return mejor;
  };
  S.distAberturas = function (r, t) {
    let dmin = 99;
    for (const a of r.puertas.concat(r.ventanas)) dmin = Math.min(dmin, Math.abs(this.cx(a) - this.cx(t)) + Math.abs(this.cy(a) - this.cy(t)));
    return dmin;
  };
  S.enRefugio = function (s) { return this.plan && this.plan.refugio !== undefined && this.M.sala[this.tileDe(s)] === this.plan.refugio; };
  S.refugioRoto = function () {
    if (!this.plan || this.plan.refugio === undefined) return false;
    const r = this.M.salas[this.plan.refugio];
    return this.ase.some(k => this.activoK(k) && this.M.sala[this.tileDe(k)] === this.plan.refugio) || r.puertas.some(p => this.rotas.has(p));
  };

  S.pensarPlan = function (s) {
    if (s.tarea && ['rematar', 'comprobar', 'tomar', 'curar'].indexOf(s.tarea.tipo) >= 0) { if (this.hacerTarea(s)) return; }
    if (!this.plan) this.elegirPlan();
    const pl = this.plan;
    if (!pl) { s.intent = { modo: 'quieto' }; return; }
    const lider = this.liderPlan();
    if (!lider) { s.intent = { modo: 'quieto' }; return; }
    let amenazaGrupo = false;
    for (const p of this.sob) if (this.activoSob(p) && p.amen && p.amen.visible && p.amen.d < 12) { amenazaGrupo = true; break; }
    const ritmo = amenazaGrupo ? 2 : 1;
    switch (pl.tipo) {
      case 'armarse': return this.planArmarse(s, pl, lider, ritmo);
      case 'emboscada': return this.planRefugio(s, pl, lider, ritmo);
      default: return this.planEnfrentar(s, pl, lider, ritmo);
    }
  };

  S.planArmarse = function (s, pl, lider, ritmo) {
    const parts = this.participantes();
    const utiles = this.itemsParaGrupo(parts);
    if (!utiles.length || this.t - pl.inicio > 70) { this.fallarPlan(40); this.elegirPlan(); return; }
    if (s.tarea && s.tarea.tipo === 'tomar') { this.hacerTarea(s); return; }
    let mejor = null, mv = 1e9;
    for (const it of utiles) {
      if (!this.utilParaMi(s, it.tipo)) continue;
      if (this.sob.some(o => o !== s && o.tarea && o.tarea.tipo === 'tomar' && o.tarea.it === it)) continue;
      const d = this.dS(this.tileDe(s), it.tile);
      if (d < 35 && d < mv) { mv = d; mejor = it; }
    }
    if (mejor) {
      s.itemsConocidos.add(mejor.tile);
      s.tarea = { tipo: 'tomar', it: mejor, tile: mejor.tile, dur: 0.6, prog: 0 };
      this.hacerTarea(s); return;
    }
    if (s === lider) { s.intent = { modo: 'ir', tile: utiles[0].tile, ritmo: Math.max(1, ritmo) }; return; }
    this.seguir(s, lider, ritmo);
  };
  S.seguir = function (s, lider, ritmo) {
    if (s === lider) return;
    const d = this.dist(s, lider);
    if (d > 2.4) s.intent = { modo: 'ir', tile: this.tileDe(lider), ritmo: d > 8 ? Math.max(ritmo, 1) : ritmo };
    else s.intent = { modo: 'quieto' };
  };

  S.liderEspera = function (lider, ritmo) {
    if (ritmo === 2) return false;
    return this.participantes().some(p => p !== lider && this.dist(p, lider) > 7);
  };

  S.planAuto = function (s, pl, lider, ritmo) {
    const M = this.M;
    if (this.con.autoDestruido || !this.auto || this.auto.fase !== 'aparcado') { this.fallarPlan(); return; }
    const holder = this.sob.find(o => o.llaves && this.activoSob(o));
    const conductorAdentro = this.auto.pasajeros.some(o => o.llaves);
    if (s.tarea && (s.tarea.tipo === 'buscarLlaves' || s.tarea.tipo === 'reparar' || s.tarea.tipo === 'recogerLlaves')) { this.hacerTarea(s); return; }
    if (!holder && !conductorAdentro) {
      if (this.llavesSuelo >= 0 && this.con.llaves >= 0) {
        if (s === lider) { s.tarea = { tipo: 'recogerLlaves', tile: this.llavesSuelo, dur: 2, prog: 0 }; this.hacerTarea(s); }
        else this.seguir(s, lider, ritmo);
        return;
      }
      if (this.llavesTile < 0) { this.fallarPlan(); return; }
      const sabe = this.sob.some(o => this.activoSob(o) && o.sabeLlaves);
      let cands = sabe ? [this.llavesTile] : M.llaves.filter(t => !this.buscadas.has(t));
      if (!cands.length) cands = [this.llavesTile];
      if (sabe && !this.narroSabe) { this.narroSabe = true; const q = this.sob.find(o => o.sabeLlaves && this.activoSob(o)); this.narrar('grupo', this.txt('llavesConoce', null, { n: q.nombre, l: this.lugar(this.cx(this.llavesTile), this.cy(this.llavesTile)) }), q, false); }
      const busca = s === lider || (s.st.int >= 5 && cands.length > 1 && this.dist(s, lider) < 10);
      if (busca) {
        const ocupadas = new Set(this.sob.filter(o => o !== s && o.tarea && o.tarea.tipo === 'buscarLlaves').map(o => o.tarea.tile));
        let mejor = -1, mv = 1e9;
        for (const t of cands) { if (ocupadas.has(t) && cands.length > 1) continue; const d = this.dS(this.tileDe(s), t); if (d < mv) { mv = d; mejor = t; } }
        if (mejor >= 0 && (s === lider || mv < 12)) {
          s.tarea = { tipo: 'buscarLlaves', tile: mejor, dur: Math.max(2, 6.5 - s.st.int * 0.45), prog: 0 };
          if (s === lider && this.puede('llavesBuscar', 25)) this.narrar('grupo', this.txt('llavesBuscar', null, { n: s.nombre, l: this.lugar(this.cx(mejor), this.cy(mejor)) }), s, false);
          if (this.rng() < 0.2) this.decir(s, 'llaves');
          this.hacerTarea(s); return;
        }
      }
      this.seguir(s, lider, ritmo); return;
    }
    const acceso = this.accesoCercano(s);
    if (this.tileDe(s) !== acceso) {
      if (s !== holder && s !== lider && this.dist(s, lider) > 10 && !conductorAdentro) { this.seguir(s, lider, ritmo); return; }
      s.intent = { modo: 'ir', tile: acceso, ritmo: Math.max(ritmo, 1) };
      return;
    }
    const a = this.auto;
    if (!this.con.autoRevisado && (s.llaves || s.rasgos.has('mecanico'))) {
      this.con.autoRevisado = true;
      if (a.danio === 'destruido') { this.con.autoDestruido = true; this.narrar('grupo', this.txt('autoDestruido', null, { n: s.nombre }), s, true); this.fallarPlan(); return; }
      if (a.danio === 'cables') { this.con.autoDanado = true; this.narrar('grupo', this.txt('autoDanado', null, { n: s.nombre }), s, true); }
    }
    if (a.danio === 'cables' && this.con.autoDanado) {
      const presentes = this.sob.filter(o => this.activoSob(o) && this.dist(o, { x: this.cx(acceso), y: this.cy(acceso) }) < 4);
      const rep = presentes.sort((x, y) => this.puntajeRep(y) - this.puntajeRep(x))[0];
      if (rep === s) {
        s.tarea = { tipo: 'reparar', tile: this.tileDe(s), dur: Math.max(10, 42 - s.st.int * 2.6 - (s.rasgos.has('mecanico') ? 16 : 0)), prog: 0 };
        this.narrar('grupo', this.txt('reparando', null, { n: s.nombre }), s, false);
        this.decir(s, 'reparar');
        this.hacerTarea(s); return;
      }
      s.intent = { modo: 'quieto' }; return;
    }
    if (a.danio === 'destruido') {
      if (!this.con.autoDestruido) { this.con.autoDestruido = true; this.narrar('grupo', this.txt('autoDestruido', null, { n: s.nombre }), s, true); }
      this.fallarPlan(); return;
    }
    this.subirAuto(s);
  };
  S.puntajeRep = function (s) { return s.st.int + (s.rasgos.has('mecanico') ? 8 : 0); };
  S.accesoCercano = function (s) {
    const cur = this.tileDe(s);
    let mejor = this.M.auto.acceso[0], mv = 1e9;
    for (const t of this.M.auto.acceso) { const d = this.dS(cur, t); if (d < mv) { mv = d; mejor = t; } }
    return mejor;
  };

  S.subirAuto = function (s) {
    const a = this.auto;
    if (a.fase !== 'aparcado' && a.fase !== 'arrancando') return;
    if (a.pasajeros.indexOf(s) >= 0) return;
    s.enAuto = true; s.intent = { modo: 'quieto' }; s.tarea = null;
    a.pasajeros.push(s);
    if (s.llaves) { a.conductor = s; a.espera = 0; }
    if (this.puede('autoSube', 4)) this.narrar('grupo', this.txt('autoSube', null, { n: s.nombre }), s, false);
  };

  S.tickAuto = function () {
    const a = this.auto;
    if (a.fase === 'fuera') return;
    if (a.fase === 'aparcado') {
      if (!a.conductor) {
        // si hay pasajeros esperando y el conductor murió, se bajan
        if (a.pasajeros.length && !this.sob.some(o => o.llaves && this.activoSob(o)) && this.t % 5 < DT) this.bajarDelAuto();
        return;
      }
      a.espera += DT;
      const parts = this.participantes();
      const kCerca = this.ase.some(k => this.activoK(k) && k.derribado <= 0 && this.dist(k, a) < 7);
      const faltan = parts.filter(s => !s.enAuto).length;
      let salir = faltan === 0 || a.espera > 14 || kCerca;
      if (a.conductor.rasgos.has('egoista') && (a.espera > 3 || this.ase.some(k => this.activoK(k) && this.dist(k, a) < 12))) {
        if (faltan > 0 && !a.egoNarrado) { a.egoNarrado = true; this.narrar('grupo', this.txt('egoistaHuye', null, { n: a.conductor.nombre }), a, true); }
        salir = true;
      }
      if (a.danio) {
        if (!this.con.autoRevisado) {
          this.con.autoRevisado = true;
          if (a.danio === 'cables') { this.con.autoDanado = true; this.narrar('grupo', this.txt('autoDanado', null, { n: a.conductor.nombre }), a, true); }
          else { this.con.autoDestruido = true; this.narrar('grupo', this.txt('autoDestruido', null, { n: a.conductor.nombre }), a, true); }
        }
        this.bajarDelAuto();
        if (a.danio === 'destruido') this.fallarPlan();
        return;
      }
      if (salir) { a.fase = 'arrancando'; a.cdArranque = 1.4; }
      return;
    }
    if (a.fase === 'arrancando') {
      this.atacarAuto();
      if (a.fase !== 'arrancando') return;
      a.cdArranque -= DT;
      if (a.cdArranque <= 0) {
        a.intentos++;
        const pFalla = a.intentos === 1 ? 0.3 : (a.intentos === 2 ? 0.15 : 0.05);
        if (this.rng() < pFalla) {
          a.cdArranque = 1.6;
          if (this.puede('noArranca', 3)) this.narrar('grupo', this.txt('autoNoArranca', null, { n: a.conductor.nombre }), a, false);
          this.ruido('motor', a.x, a.y, 12, {});
        } else {
          a.fase = 'marcha'; a.rutaI = 1; a.vel = 1.5;
          this.narrar('grupo', this.txt('autoArranca', null, { n: a.conductor.nombre }), a, true);
          this.ruido('motor', a.x, a.y, 25, {});
        }
      }
      return;
    }
    if (a.fase === 'marcha') {
      if (a.vel < 3) this.atacarAuto();
      if (a.fase !== 'marcha') return;
      const ruta = this.def.rutaAuto;
      a.vel = Math.min(8, a.vel + 3 * DT);
      if (a.rutaI >= ruta.length) { this.autoSale(); return; }
      const p = ruta[a.rutaI], dx = p[0] - a.x, dy = p[1] - a.y, d = Math.sqrt(dx * dx + dy * dy), v = a.vel * DT;
      if (d > 0.01) a.angulo = Math.atan2(dy, dx);
      if (d <= v) { a.x = p[0]; a.y = p[1]; a.rutaI++; } else { a.x += dx / d * v; a.y += dy / d * v; }
      for (const k of this.ase) {
        if (!this.activoK(k) || k.atropellado > this.t) continue;
        if (this.dist(k, a) < 1.3) {
          k.atropellado = this.t + 3;
          this.narrar('combate', this.txt('atropello', null, { n: a.conductor.nombre, a: k.nombre }), k, true);
          this.herirAsesino(k, 150, 'auto', a.conductor);
          if (!k.muerto && k.derribado <= 0) k.aturdido = 3;
        }
      }
      if (a.x < -1 || a.y < -1 || a.x > this.M.W + 1 || a.y > this.M.H + 1) this.autoSale();
    }
  };

  S.atacarAuto = function () {
    const a = this.auto;
    for (const k of this.ase) {
      if (!this.activoK(k) || k.derribado > 0 || k.aturdido > 0 || k.fingido > 0) continue;
      if (k.def.habilidades.indexOf('atacaAuto') < 0 || this.dist(k, a) > 2.2) continue;
      if (this.rng() < 0.03 && a.pasajeros.length) {
        const v = this.elegir(a.pasajeros);
        a.pasajeros.splice(a.pasajeros.indexOf(v), 1);
        v.enAuto = false; v.x = k.x; v.y = k.y;
        const eraConductor = a.conductor === v;
        this.narrar('combate', this.txt('sacaDelAuto', null, { n: v.nombre, a: k.nombre }), k, true);
        this.morir(v, k, 'auto');
        if (eraConductor) {
          this.cuerpos.forEach(c => { if (c.id === v.id) c.llaves = false; });
          this.llavesSuelo = -1;
          const otro = a.pasajeros[0];
          if (otro) { a.conductor = otro; otro.llaves = true; }
          else { a.conductor = null; a.fase = 'aparcado'; }
        }
      }
    }
  };

  S.bajarDelAuto = function () {
    const a = this.auto, M = this.M;
    a.pasajeros.forEach((s, i) => {
      s.enAuto = false;
      const t = M.auto.acceso[i % M.auto.acceso.length];
      s.x = this.cx(t); s.y = this.cy(t); s.px = s.x; s.py = s.y; s.paso = -1;
    });
    a.pasajeros = []; a.conductor = null; a.espera = 0;
  };

  S.autoSale = function () {
    const a = this.auto;
    a.fase = 'fuera';
    const nombres = a.pasajeros.map(s => s.nombre);
    a.pasajeros.forEach(s => { s.escapado = true; s.enAuto = false; s.destino = 'Escapó en ' + this.vehiculo; s.tEscape = this.t; });
    if (nombres.length) this.narrar('final', this.txt('autoEscapa', null, { lista: this.listaNombres(nombres) }), { x: a.x, y: a.y }, true);
    const lf = this.ase.find(k => k.clase === 'leatherface' && this.activoK(k));
    if (lf && this.dist(lf, a) < 20) { this.narrar('asesino', this.txt('berrinche', null, {}), lf, false); lf.aturdido = 4; }
    if (this.plan && this.plan.tipo === 'auto') { this.fallarPlan(); this.planesFallidos.auto = 1e9; }
  };

  S.listaNombres = function (n) {
    if (n.length <= 1) return n.join('');
    return n.slice(0, -1).join(', ') + ' y ' + n[n.length - 1];
  };

  S.planLlamar = function (s, pl, lider, ritmo) {
    if (this.ayuda || this.ayudaPedida) { this.fallarPlan(); this.planesFallidos.llamar = 1e9; return; }
    const medio = pl.medio;
    if (s.tarea && s.tarea.tipo === 'llamar') { this.hacerTarea(s); return; }
    if (s !== lider) { this.seguir(s, lider, ritmo); return; }
    const tile = medio.tipo === 'celular' ? this.tileDe(s) : medio.tile;
    s.tarea = { tipo: 'llamar', tile, dur: medio.tipo === 'radio' ? 9 : 6, prog: 0, medio };
    this.decir(s, 'llamar');
    this.hacerTarea(s);
  };

  S.completarLlamada = function (s, ta) {
    const medio = ta.medio;
    if (medio.tipo === 'telefono' && !this.lineaTel) {
      this.con.lineaCortada = true;
      this.narrar('grupo', this.txt('telefonoCortado', null, { n: s.nombre }), s, true);
      this.fallarPlan(); return;
    }
    if (medio.tipo === 'radio' && !this.radioOk) {
      this.con.radioRota = true;
      this.narrar('grupo', s.nombre + ' enciende la radio: está destrozada a golpes.', s, true);
      this.fallarPlan(); return;
    }
    const quien = this.def.ayuda.quien;
    const eta = this.r(this.def.ayuda.eta[0], this.def.ayuda.eta[1]);
    this.ayudaPedida = true;
    this.ayuda = { llega: this.t + eta, quien, fase: 'camino', ruta: this.def.rutaAyuda, x: -5, y: -5, px: -5, py: -5, ang: 0, i: 0 };
    if (medio.tipo === 'radio') this.narrar('grupo', this.txt('radioUsa', null, { n: s.nombre }), s, true);
    else this.narrar('grupo', this.txt('llamandoAyuda', null, { n: s.nombre, quien }), s, true);
    const min = Math.max(3, Math.round((this.horasDesdeInicio(this.t + eta) - this.horasDesdeInicio(this.t)) * 60));
    this.narrar('plan', this.txt('llamadaHecha', null, { quien: quien.charAt(0).toUpperCase() + quien.slice(1), min }), s, true);
    this.fallarPlan();
    this.planesFallidos.llamar = 1e9;
  };

  S.planRefugio = function (s, pl, lider, ritmo) {
    const M = this.M, r = M.salas[pl.refugio];
    if (this.refugioRoto() && this.ase.some(k => this.activoK(k) && s.conoce[k.id] && this.t - s.conoce[k.id].t < 2 && M.sala[this.tileDe(k)] === pl.refugio)) {
      this.fallarPlan(); return;
    }
    if (!this.enRefugio(s)) {
      if (s.tarea && s.tarea.tipo === 'barricada') s.tarea = null;
      s.intent = { modo: 'ir', tile: pl.puntoRefugio, ritmo: Math.max(ritmo, 1) }; return;
    }
    if (s.tarea && s.tarea.tipo === 'barricada') { this.hacerTarea(s); return; }
    // no trabar mientras alguien del grupo siga afuera
    const afuera = this.participantes().some(p => !this.enRefugio(p) && this.dist(p, s) < 25);
    const pendientes = r.puertas.concat(r.ventanas).filter(a => !this.barricadas[a] && !this.rotas.has(a));
    const libres = pendientes.filter(a => !this.sob.some(o => o !== s && o.tarea && o.tarea.tipo === 'barricada' && o.tarea.abertura === a));
    if (libres.length && (!afuera || r.ventanas.indexOf(libres[0]) >= 0)) {
      const ab = libres[0];
      const adentro = this.casillaInterior(ab, pl.refugio);
      if (adentro >= 0) {
        s.tarea = { tipo: 'barricada', tile: adentro, abertura: ab, dur: M.g[ab] === 'D' ? 4.5 : 5.5, prog: 0 };
        if (this.rng() < 0.3) this.decir(s, 'barricada');
        this.hacerTarea(s); return;
      }
    }
    if (s.puesto < 0 || M.sala[s.puesto] !== pl.refugio) {
      const ocupados = new Set(this.sob.filter(o => o !== s && o.puesto >= 0).map(o => o.puesto));
      const ts = r.tiles.filter(t => !ocupados.has(t) && M.g[t] !== 'h');
      ts.sort((a, b) => this.distAberturas(r, b) - this.distAberturas(r, a));
      s.puesto = ts.length ? ts[0] : pl.puntoRefugio;
    }
    if (!libres.length && !pl.listo) pl.listo = this.t;
    let reciente = -99;
    for (const k of this.ase) { const c = this.con.asesinos[k.id]; if (c && this.activoK(k)) reciente = Math.max(reciente, c.t); }
    if (pl.listo && this.t - pl.listo > 45 && this.t - reciente > 25) {
      this.narrar('plan', this.txt('salenACazar', null, { n: (this.liderPlan() || s).nombre }), s, true);
      this.fallarPlan(50); this.elegirPlan(); return;
    }
    s.intent = { modo: 'ir', tile: s.puesto, ritmo: 0 };
  };
  S.casillaInterior = function (ab, ri) {
    const M = this.M, x = ab % M.W, y = (ab / M.W) | 0;
    for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const j = (y + d[1]) * M.W + x + d[0];
      if (j >= 0 && j < M.size && M.sala[j] === ri && M.costS[j] > 0) return j;
    }
    return -1;
  };

  S.planEnfrentar = function (s, pl, lider, ritmo) {
    if (s !== lider) { this.seguir(s, lider, ritmo); return; }
    if (this.liderEspera(lider, ritmo)) { s.intent = { modo: 'quieto' }; return; }
    // ir a la última posición conocida del asesino
    let mejor = null;
    for (const k of this.ase) {
      const c = this.con.asesinos[k.id];
      if (!c || !this.activoK(k)) continue;
      if (!mejor || c.t > mejor.t) mejor = c;
    }
    if (mejor && this.t - mejor.t < 40 && this.dist(s, mejor) > 1.5) {
      s.intent = { modo: 'ir', tile: this.idx(mejor.x, mejor.y), ritmo: Math.max(1, ritmo) };
      return;
    }
    // sin pistas: revisar la casa y los alrededores, cuarto por cuarto
    if (!pl.patrulla || this.tileDe(s) === pl.patrulla || this.t - (pl.tPatrulla || 0) > 22) {
      const A = this.M.act, lista = A.pasear.concat(A.afuera.length ? A.afuera : []);
      let t = this.elegir(lista);
      for (let i = 0; i < 6 && this.dist(s, { x: this.cx(t), y: this.cy(t) }) < 8; i++) t = this.elegir(lista);
      pl.patrulla = t; pl.tPatrulla = this.t;
    }
    s.intent = { modo: 'ir', tile: pl.patrulla, ritmo: 1 };
  };
  S.planHuir = function (s, pl, lider, ritmo) {
    const meta = pl.meta;
    if (s !== lider && this.dist(s, lider) > 6 && this.dS(this.tileDe(s), meta) > this.dS(this.tileDe(lider), meta)) { this.seguir(s, lider, ritmo); return; }
    if (s === lider && this.liderEspera(lider, ritmo)) { s.intent = { modo: 'quieto' }; return; }
    s.intent = { modo: 'ir', tile: meta, ritmo: Math.max(ritmo, 1) };
  };

  S.planEsconderse = function (s) {
    if (s.escondite >= 0 && s.intent.esconderse) return;
    if (!this.buscarEscondite(s, false, 30)) {
      if (!this.iluminado(s.x, s.y)) this.esconder(s, 0.45);
      else s.intent = { modo: 'ir', tile: this.elegir(this.M.act.pasear.length ? this.M.act.pasear : this.M.spawnS), ritmo: 1 };
    }
  };

  /* ---------- acción ---------- */
  S.velSob = function (s, ritmo) {
    const st = s.st;
    let v;
    if (ritmo === 2 && s.stamina > 3) v = 3.5 + st.vel * 0.3 + (s.rasgos.has('atleta') ? 0.35 : 0);
    else if (ritmo >= 1) v = 2.5 + st.vel * 0.12;
    else v = 1.35;
    if (s.hp < s.hpMax * 0.45) v *= 0.72;
    if (s.edad > 35) v *= Math.max(0.6, 1 - (s.edad - 35) * 0.009);
    if (s.edad < 14) v *= 0.88;
    return v;
  };

  S.actuarSob = function (s) {
    const it = s.intent || { modo: 'quieto' };
    if (it.modo === 'quieto' && (this.tick + s.i * 7) % 30 === 0 && this.rng() < 0.6) s.dir = this.rng() * Math.PI * 2;
    if (it.modo === 'ir' && it.ritmo === 2) s.stamina = Math.max(0, s.stamina - (9.5 - s.st.vel * 0.45 - (s.rasgos.has('atleta') ? 1.5 : 0)) * DT);
    else s.stamina = Math.min(100, s.stamina + 5 * DT);
    if (s.oculto) return;
    if (it.modo === 'ir') {
      const llego = this.mover(s, it.tile, this.velSob(s, it.ritmo), 'S');
      if (it.ritmo === 2 && this.tick % 5 === 0) this.ruido('pasos', s.x, s.y, 3 + (10 - s.st.sig) * 0.4, { fuente: s });
      if (llego) {
        if (it.esconderse && this.M.g[this.tileDe(s)] === 'h') this.esconder(s, 1);
        this.llegarA(s, this.tileDe(s));
      }
      return;
    }
    if (it.modo === 'atacar') {
      const k = it.k;
      if (!k || !this.activoK(k)) { s.intent = { modo: 'quieto' }; return; }
      const d = this.dist(s, k);
      const arma = D.ARMAS[s.arma];
      if (arma.tipo === 'fuego' && s.municion > 0 && d < arma.alcance && this.los(s.x, s.y, k.x, k.y)) {
        s.dir = Math.atan2(k.y - s.y, k.x - s.x);
        if (s.cdDisparo <= 0) this.disparar(s, k);
        return;
      }
      if (d > 1.25) { this.mover(s, this.tileDe(k), this.velSob(s, 2), 'S'); return; }
      s.dir = Math.atan2(k.y - s.y, k.x - s.x);
      if (s.cdGolpe <= 0) this.golpear(s, k);
      return;
    }
    if (it.modo === 'disparar') {
      const k = it.k;
      if (!k || !this.activoK(k)) { s.intent = { modo: 'quieto' }; return; }
      s.dir = Math.atan2(k.y - s.y, k.x - s.x);
      if (s.cdDisparo <= 0 && s.municion > 0) this.disparar(s, k);
    }
  };

  S.llegarA = function () { /* ya no hay escapes: llegar a la carretera, al vehículo o a la canoa no salva a nadie */ };
  S.escaparPie = function (s, modo) {
    let perseg = null;
    for (const k of this.ase) {
      if (!this.activoK(k) || k.derribado > 0) continue;
      if ((k.objetivo === s && this.dist(k, s) < 14) || this.dist(k, s) < 7) { perseg = k; break; }
    }
    if (modo === 'canoa') {
      const jason = this.ase.find(kk => kk.clase === 'jason' && this.activoK(kk));
      if (jason && this.rng() < 0.15) {
        this.narrar('final', this.componer('{n} rema hacia el centro del lago. Cuando por fin se relaja, Jason emerge del agua y [lo|la] arrastra al fondo.', { n: s.nombre }), s, true);
        this.morir(s, jason, 'canoa', true);
        return;
      }
      s.escapado = true; s.destino = 'Escapó en la canoa'; s.tEscape = this.t;
      this.narrar('final', this.txt('canoaEscapa', null, { lista: s.nombre }), s, true);
      return;
    }
    if (perseg) {
      const vs = 3.5 + s.st.vel * 0.3 + (s.rasgos.has('atleta') ? 0.35 : 0);
      let p = perseg.def.corre
        ? 0.5 + (perseg.def.velCorrer - vs) * 0.14 - s.stamina / 300
        : 0.4;
      if (s.hp < s.hpMax * 0.45) p += 0.2;
      if (this.rng() < clamp(p, 0.08, 0.85)) {
        this.narrar('muerte', this.txt('escapePieAlcanzado', null, { n: s.nombre }), s, true);
        this.morir(s, perseg, 'alcanzado', true);
        return;
      }
    }
    s.escapado = true; s.tEscape = this.t;
    s.destino = this.def.bosque ? 'Huyó a pie por el camino' : 'Huyó a pie por la carretera';
    this.narrar('final', this.txt('escapePie', null, { n: s.nombre, l: this.lugar(s.x, s.y) }), s, true);
  };

  /* ---------- combate de las personas ---------- */
  S.disparar = function (s, k) {
    const arma = D.ARMAS[s.arma];
    if (s.municion <= 0) return;
    s.municion--; s.est.disparos++; s.ultimoDisparo = this.t;
    s.cdDisparo = arma.cadencia * (1 + s.miedo / 220);
    const d = this.dist(s, k);
    const oscuro = !this.iluminado(k.x, k.y) && s.objeto !== 'linterna';
    let p = 0.28 + s.st.pun * 0.058 - d * 0.022 - (oscuro ? 0.12 : 0) - s.miedo * 0.0025 + (arma.cerca && d < 5 ? 0.22 : 0)
      - (k.def.pequeno ? 0.22 : 0) + (k.derribado > 0 ? 0.3 : 0) - (k.intent.ritmo === 2 ? 0.05 : 0);
    p = clamp(p, 0.05, 0.93);
    this.ruido('disparo', s.x, s.y, 35, { fuente: s });
    this.efecto('disparo', s.x, s.y, { x2: k.x, y2: k.y, dur: 0.25 });
    if (this.rng() < 0.25) this.decir(s, 'disparar', 1.2);
    if (this.rng() < p) {
      s.est.aciertos++;
      let dmg = this.r(arma.danio[0], arma.danio[1]);
      if (arma.cerca) dmg *= d < 3 ? 1 : (d < 6 ? 0.7 : 0.4);
      const inmune = k.def.armaduraBala >= 0.5;
      if (this.puede('disparoAc' + s.id, 4))
        this.narrar('combate', this.txt(inmune ? 'disparoInmune' : 'disparoAcierto', null, { n: s.nombre, a: k.nombre }), k, false);
      this.herirAsesino(k, dmg, 'bala', s);
    } else {
      for (const o of this.sob) {
        if (o === s || !this.activoSob(o) || o.oculto) continue;
        const dd = this.dist(s, o);
        if (dd > d) continue;
        const cruz = Math.abs((k.x - s.x) * (s.y - o.y) - (s.x - o.x) * (k.y - s.y)) / Math.max(0.01, d);
        const adelante = (o.x - s.x) * (k.x - s.x) + (o.y - s.y) * (k.y - s.y) > 0;
        if (adelante && cruz < 0.4 && this.rng() < 0.07) {
          this.narrar('combate', this.txt('fuegoAmigo', null, { n: s.nombre, o: o.nombre }), o, true);
          o.fuegoAmigoDe = s.nombre;
          this.danioSob(o, this.r(arma.danio[0], arma.danio[1]) * 0.6, null, 'fuegoAmigo');
          return;
        }
      }
      if (this.puede('disparoF' + s.id, 6)) this.narrar('combate', this.txt('disparoFallo', null, { n: s.nombre, l: this.lugar(k.x, k.y) }), s, false);
    }
    if (s.municion === 0) { this.narrar('combate', this.txt('sinBalas', null, { n: s.nombre }), s, false); this.decir(s, ['Clic… clic…']); }
  };

  S.golpear = function (s, k) {
    const arma = D.ARMAS[s.arma];
    const sinBalas = arma.tipo === 'fuego';
    const danioBase = sinBalas ? arma.culata : arma.danio;
    s.cdGolpe = sinBalas ? 1.0 : arma.cadencia;
    s.ultimoGolpe = this.t; s.cuerpoACuerpo = true;
    const pele = s.rasgos.has('peleador');
    const p = 0.5 + s.st.fue * 0.025 + (pele ? 0.15 : 0) - k.def.esquiva + (k.derribado > 0 || k.agarre ? 0.3 : 0) + (k.aturdido > 0 ? 0.15 : 0);
    this.ruido('pelea', s.x, s.y, 9, { fuente: s });
    if (this.rng() < clamp(p, 0.1, 0.95)) {
      const dmg = this.r(danioBase[0], danioBase[1]) * (0.7 + s.st.fue * 0.06) * (pele ? 1.35 : 1);
      this.efecto('golpe', k.x, k.y, { dur: 0.3 });
      const nombreArma = s.arma === 'ninguna' ? 'los puños' : (sinBalas ? 'la culata' : 'el ' + arma.nombre.toLowerCase());
      if (this.puede('golpe' + s.id, 5)) this.narrar('combate', this.txt(k.def.pequeno ? 'golpeChucky' : 'golpe', null, { n: s.nombre, a: k.nombre, arma: nombreArma }), k, false);
      if (!sinBalas && arma.aturde && this.rng() < arma.aturde) k.aturdido = Math.max(k.aturdido, k.def.pequeno ? 1.5 : 0.6);
      if (k.def.pequeno && s.st.fue >= 6) k.aturdido = Math.max(k.aturdido, 1.2);
      this.herirAsesino(k, dmg, 'melee', s);
    }
  };

  /* ======================= Asesinos ======================= */
  S.activoK = function (k) { return !k.fuera && !k.muerto && !k.neutralizado && !k.huido; };

  S.tickAsesino = function (k) {
    if (k.fuera) {
      if (this.t >= k.llegada && !this.ayuda) this.aparecer(k);
      return;
    }
    if (k.huido || k.muerto) return;
    if (k.huyendo || (this.ayuda && this.ayuda.fase === 'escena' && !k.neutralizado)) { this.retirarse(k); return; }
    if (k.neutralizado) return;
    if (k.cdAtaque > 0) k.cdAtaque -= DT;
    for (const c in k.cd) if (k.cd[c] > 0) k.cd[c] -= DT;
    if (k.fingido > 0) {
      k.fingido -= DT;
      if (k.fingido <= 0) {
        k.hp = 30; k.agresivo = true;
        this.narrar('combate', this.txt('ultimoSusto', null, {}), k, true);
        const v = this.sobrevivienteCercano(k, 3);
        if (v) { k.objetivo = v; k.cdAtaque = 0; this.atacar(k, v, true, 'sorpresa'); }
      }
      return;
    }
    if (k.derribado > 0) {
      k.derribado -= DT;
      if (k.derribado <= 0) this.levantarse(k);
      return;
    }
    if (k.agarre) { this.tickAgarre(k); return; }
    if (k.aturdido > 0) { k.aturdido -= DT; return; }
    if (k.tareaSab) { this.tickSabotaje(k); return; }
    if (k.retirada > 0) {
      k.retirada -= DT;
      this.mover(k, k.spawn, k.def.velCorrer, 'K');
      if (k.retirada <= 0) { k.hp = Math.min(k.hpMax, k.hp + k.hpMax * 0.25); k.agresivo = true; }
      return;
    }
    if (k.arrastrando) { this.tickArrastre(k); return; }
    if ((this.tick + 1) % 2 === 0) this.percibirK(k);
    this.habilidades(k);
    k.cdPensar -= DT;
    if (k.cdPensar <= 0) { k.cdPensar = 0.3; this.pensarK(k); }
    this.actuarK(k);
  };

  S.sobrevivienteCercano = function (k, r) {
    let mejor = null, md = r;
    for (const s of this.sob) {
      if (!this.activoSob(s) || s.traidor) continue;
      const d = this.dist(s, k);
      if (d < md) { md = d; mejor = s; }
    }
    return mejor;
  };

  S.aparecer = function (k) {
    k.fuera = false;
    const hab = k.def.habilidades;
    const iAuto = k.tareas.findIndex(t => t.tipo === 'auto');
    if (iAuto >= 0 && this.auto && !this.M.interior[this.M.auto.acceso[0]] && this.rng() < 0.5) {
      k.tareas.splice(iAuto, 1);
      this.auto.danio = k.def.sabotaje === 'destruido' ? 'destruido' : 'cables';
    }
    if (hab.indexOf('cortaTelefono') >= 0 && this.lineaTel) this.lineaTel = false;
    if ((hab.indexOf('cortaTelefono') >= 0 || k.clase === 'jason') && this.radioOk && this.M.radio >= 0 && this.rng() < 0.45) this.radioOk = false;
    this.yaLlego = this.yaLlego || {};
    if (!this.yaLlego[k.clase]) {
      this.yaLlego[k.clase] = true;
      this.narrar('asesino', this.txt('llegada', k.clase, { l: this.lugar(k.x, k.y) }), k, false);
    }
  };

  S.retirarse = function (k) {
    const llego = this.mover(k, k.spawn, k.def.corre ? k.def.velCorrer : k.def.velCaminar, 'K');
    if (llego || (this.ayuda && this.t > this.ayuda.llega + 5)) {
      const herido = k.huyendo;
      k.huido = true; k.huyendo = false;
      if (!k.estadoFinal) k.estadoFinal = herido ? 'Huyó herido' : 'Desapareció en la noche';
    }
  };

  S.percibirK = function (k) {
    const def = k.def;
    for (const s of this.sob) {
      if (!this.activoSob(s) || s.traidor || s.oculto) continue;
      const d = this.dist(s, k);
      const lit = this.iluminado(s.x, s.y) || this.tieneLuz(s);
      let rango = lit ? def.vision : def.visionOscura;
      if (this.M.g[this.tileDe(s)] === 'm') rango *= 0.45;
      if (d > rango) continue;
      if (!this.los(k.x, k.y, s.x, s.y)) continue;
      const ya = k.vistos[s.id] && this.t - k.vistos[s.id].t < 0.6;
      const p = clamp(1.1 - d / rango * 0.5 - s.st.sig * 0.035 * (s.intent.ritmo === 2 ? 0.4 : 1), 0.15, 1);
      if (!ya && this.rng() > p) continue;
      k.vistos[s.id] = { x: s.x, y: s.y, t: this.t, s };
    }
    for (const s of this.sob) {
      if (!s.oculto || !this.activoSob(s)) continue;
      const v = k.vistos[s.id];
      if (v && this.t - v.t < 2 && s.tOculto >= v.t - 0.5) s.sabidoPor = (s.sabidoPor || '') + k.id + ',';
    }
  };

  S.puntajeObjetivo = function (k, s, info) {
    let v = -this.dist(k, info);
    if (this.aislado(s)) v += 6;
    if (s.alerta < 2) v += 5;
    if (s.hp < s.hpMax * 0.5) v += 4;
    if (D.ARMAS[s.arma].tipo === 'fuego' && s.municion > 0 && k.def.mortal !== 'no') v -= 6;
    if (k.def.habilidades.indexOf('manada') < 0 && this.ase.some(o => o !== k && o.objetivo === s)) v -= 12;
    if (k.cebo === s) v += 15;
    return v;
  };

  S.pensarK = function (k) {
    const def = k.def;
    if (!k.agresivo) {
      if (this.t > k.llegada + def.paciencia || (k.kills > 0 && def.evitaGrupos < 0.6) || (this.alertaGeneral && def.evitaGrupos < 0.5) ||
        (this.alertaGeneral && this.t - this.tAlerta > 40) || (this.ayuda && this.ayuda.fase === 'camino')) k.agresivo = true;
    }
    if (k.tareas.length && !this.alertaGeneral && !k.objetivo) {
      const ta = k.tareas[0];
      if (this.tileDe(k) === ta.tile) {
        k.tareas.shift();
        k.tareaSab = { tipo: ta.tipo, prog: 0, dur: ta.tipo === 'auto' ? 4 : (ta.tipo === 'trampa' ? 2.5 : 3), tile: ta.tile };
        k.intent = { modo: 'quieto' }; return;
      }
      k.intent = { modo: 'ir', tile: ta.tile, ritmo: 0 }; return;
    }
    let mejor = null, mv = -1e9;
    for (const id in k.vistos) {
      const v = k.vistos[id];
      if (this.t - v.t > 6) continue;
      const s = v.s;
      if (!this.activoSob(s) || s.traidor) continue;
      if (s.oculto && !(s.sabidoPor && s.sabidoPor.indexOf(k.id + ',') >= 0)) continue;
      const pos = s.oculto ? { x: s.x, y: s.y, t: this.t } : v;
      const val = this.puntajeObjetivo(k, s, pos) - (this.t - v.t) * 2;
      if (val > mv) { mv = val; mejor = { s, info: pos }; }
    }
    if (mejor) {
      const s = mejor.s;
      const ais = this.aislado(s);
      const cerca = this.dist(k, s) < 1.8;
      if (!k.agresivo && !ais && k.cebo !== s && !cerca) { this.acechar(k, s, mejor.info); return; }
      if (k.agresivo && k.cebo !== s && !cerca && this.acompanantes(s) > this.toleranciaGrupo(k)) { this.acechar(k, s, mejor.info); return; }
      k.objetivo = s;
      const tile = this.idx(mejor.info.x, mejor.info.y);
      const d = this.dist(k, mejor.info);
      let ritmo = (k.agresivo || d < 7 || s.alerta >= 2) ? 2 : 1;
      const viendo = this.t - mejor.info.t < 0.7;
      // a una víctima desprevenida se le acerca caminando, sin ruido, y solo se lanza al final
      const sabeDeMi = s.conoce[k.id] && this.t - s.conoce[k.id].t < 2;
      if (s.alerta < 2 && !sabeDeMi && def.sigilo >= 6 && d > 2.2) {
        ritmo = 0;
        // si la víctima mira hacia él, se queda inmóvil hasta que se dé vuelta
        const ang = Math.atan2(k.y - s.y, k.x - s.x);
        const da = Math.abs(((ang - s.dir) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI);
        if (da < 1.3 && !s.durmiendo && this.los(s.x, s.y, k.x, k.y)) { k.objetivo = s; k.intent = { modo: 'quieto' }; return; }
        // si otra persona podría verlo, da un rodeo por la oscuridad
        if (this.observadoPor(k.x, k.y, s)) {
          const t = this.puntoOculto(k, mejor.info);
          k.objetivo = s; k.intent = t >= 0 ? { modo: 'ir', tile: t, ritmo: 0, sigilo: true } : { modo: 'quieto' };
          return;
        }
      }
      k.intent = { modo: 'cazar', s, tile, ritmo, sigilo: ritmo === 0 };
      if (viendo) this.ataqueDistancia(k, s, d);
      return;
    }
    k.objetivo = null;
    if (k.cebo && this.activoSob(k.cebo) && k.cebo.tarea && k.cebo.tarea.tipo === 'cebo') {
      const dt = this.dist(k, { x: this.cx(k.ceboTile), y: this.cy(k.ceboTile) });
      if (dt > 2.5) { k.intent = { modo: 'ir', tile: k.ceboTile, ritmo: 0, sigilo: true }; return; }
      k.intent = { modo: 'emboscado', tile: k.ceboTile }; k.emboscadaHasta = this.t + 3;
      return;
    }
    if (def.habilidades.indexOf('teletransporte') >= 0 || def.habilidades.indexOf('teletransporteCorto') >= 0) {
      if (this.intentarTele(k)) return;
    }
    if (k.pista && this.t - k.pista.t < 25) {
      if (this.tileDe(k) === k.pista.tile || this.dist(k, k.pista) < 1) {
        this.iniciarBusqueda(k, k.pista.tile); k.pista = null;
      } else { k.intent = { modo: 'ir', tile: k.pista.tile, ritmo: k.agresivo ? 1 : 0 }; return; }
    }
    if (k.busqueda && k.busqueda.length) { this.continuarBusqueda(k); return; }
    if (def.habilidades.indexOf('emboscada') >= 0 && k.cd.emboscada <= 0 && this.rng() < 0.35) {
      const t = this.puntoEmboscada(k);
      k.cd.emboscada = 50;
      if (t >= 0) { k.emboscada = t; k.emboscadaHasta = this.t + this.r(18, 30); }
    }
    if (k.emboscada >= 0 && this.t < k.emboscadaHasta) {
      if (k.intent.modo !== 'emboscado') k.intent = { modo: 'ir', tile: k.emboscada, ritmo: 0, emboscada: true };
      return;
    }
    k.emboscada = -1;
    if (!k.patrulla || this.tileDe(k) === k.patrulla || this.rng() < 0.02) k.patrulla = this.puntoPatrulla(k);
    k.intent = { modo: 'ir', tile: k.patrulla, ritmo: k.agresivo ? 1 : 0 };
  };

  // Cuántas personas acompañan a alguien (a la vista y cerca)
  S.acompanantes = function (s) {
    let n = 0;
    for (const o of this.sob) {
      if (o === s || !this.activoSob(o) || o.traidor || o.oculto) continue;
      const d = this.dist(o, s);
      if (d < 3.5 || (d < 7 && this.los(o.x, o.y, s.x, s.y))) n++;
    }
    return n;
  };
  // Cuánta gente junta se atreve a atacar este asesino
  S.toleranciaGrupo = function (k) {
    const e = k.def.evitaGrupos;
    let tol = e >= 0.8 ? 0 : (e >= 0.5 ? 1 : (e >= 0.3 ? 2 : 99));
    if (k.def.habilidades.indexOf('manada') >= 0) {
      for (const o of this.ase) if (o !== k && o.clase === k.clase && this.activoK(o) && this.dist(o, k) < 15) tol++;
    }
    if (this.t > this.tFin * 0.5) tol++;
    if (k.kills >= 2) tol++;
    if (this.ayuda) tol++; // tiene que terminar antes de que llegue la ayuda
    return tol;
  };

  S.puntoPatrulla = function (k) {
    const M = this.M;
    const vivos = this.sob.filter(s => this.activoSob(s) && !s.traidor);
    if (!k.agresivo && vivos.length) {
      // antes de atacar: rondar por fuera, a oscuras, mirando por las ventanas
      for (let i = 0; i < 30; i++) {
        const t = M.nodos[Math.floor(this.rng() * M.n)];
        if (M.interior[t]) continue;
        const x = this.cx(t), y = this.cy(t);
        if (this.iluminado(x, y) && this.rng() < 0.8) continue;
        let dmin = 99;
        for (const s of vivos) dmin = Math.min(dmin, Math.abs(s.x - x) + Math.abs(s.y - y));
        if (dmin >= 4 && dmin <= 13) return t;
      }
    }
    if (vivos.length && this.rng() < (k.agresivo ? 0.75 : 0.5)) {
      const s = this.elegir(vivos);
      const r = k.agresivo ? 6 : 12;
      for (let i = 0; i < 16; i++) {
        const t = M.nodos[Math.floor(this.rng() * M.n)];
        if (Math.abs(this.cx(t) - s.x) + Math.abs(this.cy(t) - s.y) < r) return t;
      }
    }
    if (M.act.pasear.length && this.rng() < 0.6) return this.elegir(M.act.pasear);
    return M.nodos[Math.floor(this.rng() * M.n)];
  };

  S.puntoEmboscada = function (k) {
    const M = this.M;
    const cands = M.escondites.filter(t => !this.sob.some(s => s.escondite === t && s.oculto));
    let mejor = -1, mv = 1e9;
    for (let i = 0; i < 8 && cands.length; i++) {
      const t = this.elegir(cands);
      if (this.sob.some(s => this.activoSob(s) && Math.abs(s.x - this.cx(t)) + Math.abs(s.y - this.cy(t)) < 6)) continue;
      const d = this.dK(this.tileDe(k), t);
      if (d < mv) { mv = d; mejor = t; }
    }
    return mejor;
  };

  S.acechar = function (k, s, info) {
    const d = this.dist(k, info);
    k.objetivo = null;
    const visto = s.conoce[k.id] && this.t - s.conoce[k.id].t < 0.5;
    if (visto && k.def.habilidades.indexOf('observar') >= 0) {
      if (!k.observaHasta) k.observaHasta = this.t + this.r(3, 6);
      if (this.t < k.observaHasta) { k.intent = { modo: 'quieto' }; return; }
    }
    const expuesto = this.visibleParaAlguien(k.x, k.y);
    if ((visto || expuesto) && d < 14) {
      k.observaHasta = 0;
      const t = this.puntoOculto(k, info);
      k.intent = { modo: 'ir', tile: t >= 0 ? t : k.spawn, ritmo: 0, sigilo: true }; return;
    }
    if (d > 10) { k.intent = { modo: 'ir', tile: this.idx(info.x, info.y), ritmo: 0, sigilo: true }; return; }
    if (d < 5) { const t = this.puntoOculto(k, info); k.intent = { modo: 'ir', tile: t >= 0 ? t : k.spawn, ritmo: 0, sigilo: true }; return; }
    k.intent = { modo: 'quieto' };
  };
  // ¿Alguien despierto lo tiene delante, a la vista y dentro de su alcance? (excepto 'salvo')
  S.observadoPor = function (x, y, salvo) {
    for (const s of this.sob) {
      if (s === salvo || !this.activoSob(s) || s.durmiendo || s.traidor || s.oculto) continue;
      const d = this.dist(s, { x, y });
      if (d > this.rangoVistaSob(s, x, y)) continue;
      const ang = Math.atan2(y - s.y, x - s.x);
      const da = Math.abs(((ang - s.dir) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI);
      if (da > (s.alerta >= 2 ? 2.0 : 1.1)) continue;
      if (this.los(s.x, s.y, x, y)) return true;
    }
    return false;
  };
  // Un sitio a oscuras y lejos de los demás, para atraer a alguien con una llamada
  S.puntoAislado = function (victima) {
    const M = this.M;
    let mejor = -1, mv = -1e9;
    for (let i = 0; i < 40; i++) {
      const t = M.nodos[Math.floor(this.rng() * M.n)];
      const x = this.cx(t), y = this.cy(t);
      const dv = this.dS(this.tileDe(victima), t);
      if (dv > 25 || dv < 4) continue;
      let dmin = 99;
      for (const o of this.sob) if (o !== victima && this.activoSob(o)) dmin = Math.min(dmin, this.dist(o, { x, y }));
      if (dmin < 7) continue;
      const v = dmin - dv * 0.3 - (this.iluminado(x, y) ? 6 : 0);
      if (v > mv) { mv = v; mejor = t; }
    }
    return mejor;
  };
  S.visibleParaAlguien = function (x, y) {
    for (const s of this.sob) {
      if (!this.activoSob(s) || s.durmiendo || s.traidor) continue;
      const d = Math.abs(s.x - x) + Math.abs(s.y - y);
      if (d < 12 && this.los(s.x, s.y, x, y) && this.dist(s, { x, y }) < this.rangoVistaSob(s, x, y)) return true;
    }
    return false;
  };
  // Casilla cercana desde donde acechar sin ser visto, a 5-11 m de la víctima
  S.puntoOculto = function (k, info) {
    const M = this.M;
    let mejor = -1, mv = 1e9;
    const kx = Math.floor(k.x), ky = Math.floor(k.y);
    for (let i = 0; i < 14; i++) {
      const x = kx + Math.floor(this.rng() * 11) - 5, y = ky + Math.floor(this.rng() * 11) - 5;
      if (x < 0 || y < 0 || x >= M.W || y >= M.H) continue;
      const t = y * M.W + x;
      if (M.ci[t] < 0 || M.g[t] === 'W' || M.g[t] === 'D') continue;
      const cx = x + 0.5, cy = y + 0.5;
      const dObj = Math.sqrt((cx - info.x) * (cx - info.x) + (cy - info.y) * (cy - info.y));
      if (dObj < 5 || dObj > 11) continue;
      if (this.visibleParaAlguien(cx, cy)) continue;
      const v = this.dK(this.tileDe(k), t) + (this.iluminado(cx, cy) ? 4 : 0);
      if (v < mv) { mv = v; mejor = t; }
    }
    return mejor;
  };

  S.intentarTele = function (k) {
    if (k.cd.tele > 0) return false;
    const corto = k.def.habilidades.indexOf('teletransporte') < 0;
    let obj = null, mt = -1;
    for (const id in k.vistos) {
      const v = k.vistos[id];
      if (!this.activoSob(v.s) || v.s.oculto || v.s.traidor) continue;
      if (v.t > mt) { mt = v.t; obj = v.s; }
    }
    if (!obj && k.agresivo) {
      const vivos = this.sob.filter(s => this.activoSob(s) && !s.oculto && !s.traidor);
      if (vivos.length) obj = this.elegir(vivos);
    }
    if (!obj) return false;
    const dk = this.dK(this.tileDe(k), this.tileDe(obj));
    if (dk < (corto ? 8 : 13)) return false;
    for (const s of this.sob) if (this.activoSob(s) && s.conoce[k.id] && this.t - s.conoce[k.id].t < 2) return false;
    const M = this.M;
    const dest = obj.intent && obj.intent.modo === 'ir' && obj.intent.tile >= 0 ? obj.intent.tile : this.tileDe(obj);
    const dx0 = this.cx(dest), dy0 = this.cy(dest);
    for (let i = 0; i < 40; i++) {
      const t = M.nodos[Math.floor(this.rng() * M.n)];
      const x = this.cx(t), y = this.cy(t);
      const dd = Math.abs(x - dx0) + Math.abs(y - dy0);
      if (dd < 3 || dd > (corto ? 7 : 9)) continue;
      if (M.g[t] === 'W' || M.g[t] === 'D' || M.g[t] === 'E') continue;
      let vis = false;
      for (const s of this.sob) {
        if (!this.activoSob(s)) continue;
        const ds = Math.abs(s.x - x) + Math.abs(s.y - y);
        if (ds < 3.5 || (ds < 14 && this.los(s.x, s.y, x, y))) { vis = true; break; }
      }
      if (vis) continue;
      k.x = x; k.y = y; k.px = x; k.py = y; k.paso = -1;
      k.cd.tele = corto ? this.r(40, 65) : this.r(35, 55);
      k.tTele = this.t; k.agresivo = true;
      k.vistos[obj.id] = { x: obj.x, y: obj.y, t: this.t - 1, s: obj };
      if (this.puede('tele' + k.id, 30)) this.narrar('asesino', this.txt(corto ? 'michaelAparece' : 'teletransporte', null, { l: this.lugar(x, y) }), null, false);
      return true;
    }
    k.cd.tele = 5;
    return false;
  };

  S.iniciarBusqueda = function (k, tile) {
    const M = this.M, x = this.cx(tile), y = this.cy(tile);
    const lista = M.escondites.filter(t => Math.abs(this.cx(t) - x) + Math.abs(this.cy(t) - y) < 9);
    lista.sort((a, b) => this.dK(tile, a) - this.dK(tile, b));
    k.busqueda = lista.slice(0, 5);
    k.busquedaProg = 0;
  };

  S.continuarBusqueda = function (k) {
    const t = k.busqueda[0];
    if (this.dist(k, { x: this.cx(t), y: this.cy(t) }) >= 1.5) { k.intent = { modo: 'ir', tile: t, ritmo: 0 }; return; }
    k.intent = { modo: 'quieto' };
    k.busquedaProg += 0.3;
    if (k.busquedaProg < 1.2) return;
    k.busquedaProg = 0; k.busqueda.shift();
    const s = this.sob.find(o => o.oculto && this.activoSob(o) && this.tileDe(o) === t);
    if (s) this.revisarEscondido(k, s, true);
  };

  S.revisarEscondido = function (k, s, directo) {
    const sabe = s.sabidoPor && s.sabidoPor.indexOf(k.id + ',') >= 0;
    const p = (directo ? 0.42 : 0.12) + (sabe ? 0.55 : 0) + k.def.vision * 0.008 - s.st.sig * 0.035 - (s.calidadEsc - 0.5) * 0.2;
    if (this.rng() < clamp(p, 0.04, 0.97)) {
      k.objetivo = s; k.cdAtaque = 0;
      k.vistos[s.id] = { x: s.x, y: s.y, t: this.t, s };
      this.atacar(k, s, true, 'escondite');
    } else if (directo && this.puede('tension' + s.id, 15)) {
      this.narrar('combate', this.txt('escondidoTension', null, { n: s.nombre, a: k.nombre }), s, false);
    }
  };

  S.ataqueDistancia = function (k, s, d) {
    const hab = k.def.habilidades;
    if (hab.indexOf('lanzaArma') >= 0 && k.cd.lanza <= 0 && d > 3 && d < 9 && s.intent.modo === 'ir' && s.intent.ritmo === 2) {
      k.cd.lanza = 30; k.ultimoAtaque = this.t;
      this.efecto('lanza', k.x, k.y, { x2: s.x, y2: s.y, dur: 0.4 });
      if (this.rng() < 0.55) {
        s.aturdido = 1.2;
        const dmg = this.r(30, 62);
        if (s.hp - dmg > 0) this.narrar('combate', this.txt('lanzaArma', null, { n: s.nombre }), s, true);
        this.danioSob(s, dmg, k, 'lanza');
      } else this.narrar('combate', this.txt('lanzaFalla', null, { n: s.nombre }), s, false);
      return;
    }
    if (hab.indexOf('arco') >= 0 && k.j === 0 && k.cd.arco <= 0 && d > 3 && d < 13) {
      k.cd.arco = 3.2; k.ultimoAtaque = this.t;
      const oscuro = !this.iluminado(s.x, s.y) && !this.tieneLuz(s);
      const p = (0.62 - d * 0.025) * (oscuro ? 0.8 : 1);
      this.efecto('flecha', k.x, k.y, { x2: s.x, y2: s.y, dur: 0.35 });
      if (this.rng() < p) {
        const dmg = this.r(22, 42);
        if (s.hp - dmg > 0) this.narrar('combate', this.txt('flecha', null, { n: s.nombre, a: k.nombre }), s, false);
        this.danioSob(s, dmg, k, 'flecha');
      } else if (this.puede('flechaF', 8)) this.narrar('combate', this.txt('flechaFalla', null, { n: s.nombre }), s, false);
      k.intent = { modo: 'quieto' };
    }
  };

  S.habilidades = function (k) {
    const hab = k.def.habilidades;
    if (hab.indexOf('motosierra') >= 0 && k.objetivo && k.cd.ruido <= 0) {
      k.cd.ruido = 1;
      this.ruido('motosierra', k.x, k.y, 18, { k, deAsesino: true });
    }
    if (this.alertaGeneral) return;
    if (hab.indexOf('llamadas') >= 0 && k.cd.llamada <= 0 && (this.op.celulares || this.lineaTel)) {
      k.cd.llamada = this.r(35, 55);
      const vivos = this.sob.filter(s => this.activoSob(s) && !s.durmiendo && !s.traidor);
      if (vivos.length) {
        const s = this.elegir(vivos);
        s.miedo = clamp(s.miedo + 12, 0, 100); s.sospecha += 1;
        this.decir(s, ['¿Quién habla?', '¿Hola? ¿Quién es?']);
        k.habla = this.elegirT(FR.ghostface); k.hablaHasta = this.t + 2.5;
        this.narrar('dialogo', this.txt('llamadaGF', null, { n: s.nombre }), s, true);
        const dest = this.puntoAislado(s);
        if (dest >= 0 && s.st.val >= 4 && s.st.int <= 8 && this.rng() < 0.55 && !s.tarea) {
          s.tarea = { tipo: 'cebo', tile: dest, dur: 6, prog: 0 };
          k.cebo = s; k.ceboTile = dest;
          this.narrar('dialogo', this.txt('llamadaCebo', null, { n: s.nombre, l: this.lugar(this.cx(dest), this.cy(dest)) }), s, false);
        }
        if (s.sospecha >= 3 && s.st.int >= 6) this.alertar(s, null, 'llamada');
      }
    }
    if (hab.indexOf('tocarPuerta') >= 0 && k.j === 0 && k.cd.tocar <= 0) {
      k.cd.tocar = this.r(30, 45);
      const pp = this.M.puertaP;
      this.narrar('ambiente', this.txt('tocarPuerta', null, {}), { x: this.cx(pp), y: this.cy(pp) }, false);
      this.efecto('golpes', this.cx(pp), this.cy(pp), { dur: 1.2 });
      const vivos = this.sob.filter(s => this.activoSob(s) && !s.durmiendo && !s.tarea && s.alerta < 2 && !s.traidor);
      vivos.forEach(s => { s.sospecha += 0.8; s.miedo = clamp(s.miedo + 5, 0, 100); });
      const v = vivos.sort((a, b) => b.st.val - a.st.val)[0];
      if (v) {
        const vi = this.vecinaInterior(pp);
        if (this.M.sala[vi] >= 0) v.tarea = { tipo: 'abrir', tile: vi, dur: 2, prog: 0 };
      }
    }
    if (hab.indexOf('tormento') >= 0 && k.j === 0 && k.cd.tormento <= 0) {
      k.cd.tormento = this.r(40, 60);
      const vivos = this.sob.filter(s => this.activoSob(s) && !s.durmiendo && s.alerta < 2 && !s.traidor);
      if (vivos.length) {
        const s = this.elegir(vivos);
        vivos.forEach(o => { o.sospecha += 0.7; o.miedo = clamp(o.miedo + 6, 0, 100); });
        this.narrar('ambiente', this.txt('tormento', null, { n: s.nombre, l: this.lugar(s.x, s.y) }), s, false);
        if (s.sospecha >= 3) this.alertar(s, null, 'tormento');
      }
    }
    if (hab.indexOf('frases') >= 0 && k.cd.frase <= 0) {
      k.cd.frase = this.r(30, 50);
      k.habla = this.elegirT(FR.chucky); k.hablaHasta = this.t + 2;
      if (this.sob.some(s => this.activoSob(s) && this.dist(s, k) < 8)) {
        this.narrar('dialogo', this.txt('chuckyFrase', null, { l: this.lugar(k.x, k.y) }), k, false);
        this.ruido('voz', k.x, k.y, 6, {});
      }
    }
  };

  S.vecinaInterior = function (i) {
    const M = this.M, x = i % M.W, y = (i / M.W) | 0;
    for (const d of [[0, -1], [0, 1], [1, 0], [-1, 0]]) {
      const j = (y + d[1]) * M.W + x + d[0];
      if (j >= 0 && j < M.size && M.sala[j] >= 0 && M.costS[j] > 0) return j;
    }
    return i;
  };

  S.tickSabotaje = function (k) {
    const ta = k.tareaSab;
    ta.prog += DT;
    if (ta.prog < ta.dur) return;
    k.tareaSab = null;
    if (ta.tipo === 'luz') {
      this.luz = false;
      if (k.clase === 'jason') this.fusiblesRotos = true;
      this.narrar('ambiente', this.txt('cortaLuz', null, {}), null, true);
      this.efecto('apagon', 0, 0, { dur: 1.5 });
      const vivos = this.sob.filter(s => this.activoSob(s) && !s.traidor);
      vivos.forEach(s => { s.miedo = clamp(s.miedo + 8, 0, 100); s.sospecha += 1; if (s.durmiendo && this.rng() < 0.3) s.durmiendo = false; });
      if (!this.alertaGeneral) {
        const cand = vivos.filter(s => !s.durmiendo && !s.tarea && s.alerta < 2)
          .sort((a, b) => (b.st.val + (b.rasgos.has('mecanico') ? 3 : 0)) - (a.st.val + (a.rasgos.has('mecanico') ? 3 : 0)))[0];
        if (cand && this.M.fusibles >= 0) {
          cand.tarea = { tipo: 'fusibles', tile: this.M.fusibles, dur: 5, prog: 0 };
          this.narrar('grupo', this.txt('vaAFusibles', null, { n: cand.nombre, l: this.lugar(this.cx(this.M.fusibles), this.cy(this.M.fusibles)) }), cand, false);
        }
      }
    } else if (ta.tipo === 'auto') {
      if (this.auto && this.auto.fase === 'aparcado') {
        this.auto.danio = k.def.sabotaje === 'destruido' ? 'destruido' : 'cables';
        this.narrar('asesino', this.txt('sabotajeAuto', null, { a: k.nombre }), k, false);
      }
    } else if (ta.tipo === 'trampa') {
      this.trampas.push({ tile: ta.tile, armada: true, vista: false });
      if (this.puede('trampa', 60)) this.narrar('asesino', this.txt('trampaPuesta', null, { a: k.nombre, l: this.lugar(this.cx(ta.tile), this.cy(ta.tile)) }), k, false);
    }
  };

  S.actuarK = function (k) {
    const def = k.def, it = k.intent || { modo: 'quieto' };
    let vel = def.velCaminar;
    if (it.ritmo === 2 && def.corre) vel = def.velCorrer;
    else if (it.ritmo >= 1) vel = def.corre ? def.velCaminar * 1.6 : def.velCorrer;
    if (it.sigilo) vel *= 0.8;
    if (def.habilidades.indexOf('bosque') >= 0 && this.def.bosque && !this.M.interior[this.tileDe(k)]) vel *= 1.12;
    if (k.hp < k.hpMax * 0.3 && def.mortal !== 'no') vel *= 0.8;
    if (it.modo === 'cazar') {
      const s = it.s;
      if (!this.activoSob(s)) { k.intent = { modo: 'quieto' }; return; }
      const v = k.vistos[s.id];
      const visible = v && this.t - v.t < 0.7;
      const d = this.dist(k, s);
      if (d <= def.alcance && (visible || d < 1)) {
        k.dir = Math.atan2(s.y - k.y, s.x - k.x);
        this.atacar(k, s, false);
        return;
      }
      const tile = visible ? this.tileDe(s) : it.tile;
      const llego = this.mover(k, tile, vel, 'K');
      if (llego && !visible) { k.objetivo = null; this.iniciarBusqueda(k, tile); k.intent = { modo: 'quieto' }; }
      if (this.tick % 5 === 0) this.pasosAsesino(k, it.ritmo);
      return;
    }
    if (it.modo === 'ir') {
      const llego = this.mover(k, it.tile, vel, 'K');
      if (this.tick % 5 === 0) this.pasosAsesino(k, it.ritmo);
      if (it.emboscada && llego) k.intent = { modo: 'emboscado', tile: it.tile };
      this.revisarAlPasar(k);
      return;
    }
    if (it.modo === 'emboscado') {
      const v = this.sobrevivienteCercano(k, 1.6);
      if (v) { k.objetivo = v; k.emboscadaHasta = 0; this.atacar(k, v, false); }
      if (this.t > k.emboscadaHasta) { k.intent = { modo: 'quieto' }; k.emboscada = -1; }
      return;
    }
    this.revisarAlPasar(k);
  };

  S.pasosAsesino = function (k, ritmo) {
    const r = ritmo === 2 ? (k.def.sigilo >= 8 ? 4 : 6.5) : (k.def.sigilo >= 8 ? 1.2 : 2.5);
    if (r >= 2) this.ruido('pasos', k.x, k.y, r, { k, deAsesino: true });
  };

  S.revisarAlPasar = function (k) {
    if (this.tick % 5 !== 0) return;
    for (const s of this.sob) {
      if (!s.oculto || !this.activoSob(s)) continue;
      if (this.dist(s, k) < 1.6) this.revisarEscondido(k, s, false);
    }
  };

  S.golpearBarricada = function (k, tile) {
    const b = this.barricadas[tile];
    if (!b) return;
    b.hp -= k.def.fuerzaPuerta * DT;
    if (this.tick % 6 === 0) {
      this.ruido('golpe', this.cx(tile), this.cy(tile), 13, { k, deAsesino: true });
      this.efecto('golpes', this.cx(tile), this.cy(tile), { dur: 0.5 });
    }
    if (b.hp <= 0) {
      delete this.barricadas[tile];
      this.rotas.add(tile);
      if (k.def.fuerzaPuerta >= 30) this.con.rompePuertas = true;
      const vi = this.vecinaInterior(tile);
      this.narrar('asesino', this.txt('barricadaRota', null, { a: k.nombre, l: this.lugar(this.cx(vi), this.cy(vi)) }), k, true);
      this.ruido('golpe', this.cx(tile), this.cy(tile), 16, { k, deAsesino: true });
    }
  };

  /* ---------- ataques del asesino ---------- */
  S.atacar = function (k, s, forzado, contexto) {
    if (!this.activoSob(s)) return;
    if (k.cdAtaque > 0 && !forzado) return;
    const def = k.def;
    k.cdAtaque = def.cadencia * this.r(0.85, 1.15);
    k.ultimoAtaque = this.t;
    const info = s.conoce[k.id];
    let sorpresa = s.alerta < 2 || s.durmiendo || !info || this.t - info.t > 2.5 || s.oculto || contexto === 'sorpresa';
    // quien lo acaba de ver a un metro no tiene tiempo de reaccionar
    const reaccionTardia = !sorpresa && this.t - (s.tAlertaPropia || -99) < 1.2;
    let ctx = contexto || (s.durmiendo ? 'dormido' : (sorpresa ? 'sorpresa' : 'normal'));
    if (s.oculto) { s.oculto = false; s.escondite = -1; ctx = 'escondite'; sorpresa = true; }
    if (def.habilidades.indexOf('torpe') >= 0 && !sorpresa && this.rng() < 0.07) {
      k.aturdido = 1.6;
      this.narrar('combate', this.txt('asesinoTropieza', null, { a: k.nombre }), k, false);
      return;
    }
    if (def.agarre && !sorpresa && !s.agarradoPor && this.rng() < def.agarre) { this.agarrar(k, s, false); return; }
    if (def.habilidades.indexOf('motosierra') >= 0 && !sorpresa && this.rng() < 0.05) {
      k.aturdido = 2.4;
      this.narrar('combate', this.txt('motosierraAhoga', null, {}), k, false);
      return;
    }
    const esquiva = sorpresa ? 0 : (s.st.vel * 0.024 + (s.rasgos.has('peleador') ? 0.1 : 0) + (s.intent.modo === 'atacar' ? 0.03 : 0));
    const p = sorpresa ? 0.97 : (reaccionTardia ? 0.9 : clamp(def.precision - esquiva, 0.25, 0.95));
    this.efecto('tajo', k.x, k.y, { x2: s.x, y2: s.y, dur: 0.25 });
    this.ruido('pelea', k.x, k.y, sorpresa && def.sigilo >= 8 ? 3 : 9, { k, deAsesino: true });
    if (this.rng() < p) {
      let dmg = this.r(def.danio[0], def.danio[1]) * (sorpresa ? 2.3 : (reaccionTardia ? 1.6 : 1));
      if (def.habilidades.indexOf('martillazo') >= 0 && sorpresa && !k.martillazo) { k.martillazo = true; dmg = 200; ctx = 'martillazo'; }
      this.danioSob(s, dmg, k, ctx);
      if (sorpresa && s.vivo) { s.aturdido = Math.max(s.aturdido, 1.1); k.cdAtaque = Math.min(k.cdAtaque, 0.6); }
    } else if (this.puede('falla' + k.id, 4)) {
      this.narrar('combate', this.txt('ataqueFalla', null, { a: k.nombre, n: s.nombre }), s, false);
    }
  };

  S.agarrar = function (k, s, sorpresa) {
    k.agarre = { s, t: this.r(2.4, 3.8) * (sorpresa ? 0.8 : 1) };
    s.agarradoPor = k.id; s.intent = { modo: 'quieto' }; s.tarea = null; s.oculto = false;
    this.narrar('combate', this.txt('agarrado', k.clase, { n: s.nombre, a: k.nombre }), s, true);
    this.decir(s, 'panico');
    this.ruido('grito', s.x, s.y, 16, { alerta: true, k, fuente: s });
    this.alertar(s, k, 'agarre', true);
  };

  S.tickAgarre = function (k) {
    const g = k.agarre, s = g.s;
    if (!this.activoSob(s)) { k.agarre = null; return; }
    const nx = k.x + Math.cos(k.dir) * 0.5, ny = k.y + Math.sin(k.dir) * 0.5;
    const ni = this.idx(nx, ny);
    if (ni >= 0 && ni < this.M.size && this.M.costS[ni] > 0) { s.x = nx; s.y = ny; } else { s.x = k.x; s.y = k.y; }
    g.t -= DT;
    if (this.tick % 5 === 0) {
      const p = 0.05 + s.st.fue * 0.012 + (s.rasgos.has('peleador') ? 0.08 : 0) + (VALOR_ARMA[s.arma] >= 3 && D.ARMAS[s.arma].tipo === 'melee' ? 0.03 : 0);
      if (this.rng() < p) {
        this.soltar(k);
        k.aturdido = 0.8;
        this.narrar('combate', this.txt('zafarse', null, { n: s.nombre, a: k.nombre }), s, true);
        this.registrarHerida(s, 25, k, 'estrangulamiento');
        s.cuerpoACuerpo = true; s.fueAgarrado = true;
        s.miedo = clamp(s.miedo + 15, 0, 100);
        return;
      }
    }
    if (g.t <= 0) { this.soltar(k); this.danioSob(s, 999, k, 'agarre'); }
  };
  S.soltar = function (k) {
    if (!k.agarre) return;
    const s = k.agarre.s;
    s.agarradoPor = null; s.ayudadoPor = null;
    k.agarre = null;
  };

  S.danioSob = function (s, dmg, k, ctx) {
    if (!this.activoSob(s)) return;
    s.hp -= dmg;
    if (k) s.ultimoAtacante = k;
    this.manchar(s.x, s.y, Math.min(10, 2 + dmg / 12));
    this.efecto('herida', s.x, s.y, { dur: 0.5 });
    s.miedo = clamp(s.miedo + 18, 0, 100);
    if (s.hp <= 0) { this.morir(s, k, ctx); return; }
    this.registrarHerida(s, dmg, k, ctx);
    if (s.hp < s.hpMax * 0.5 && !s.vendado) s.sangrado = true;
    s.aturdido = Math.max(s.aturdido, 0.25);
    if (k && dmg >= 15 && ctx !== 'flecha' && ctx !== 'lanza' && ctx !== 'trampa' && this.puede('herido' + s.id, 4))
      this.narrar('combate', this.txt('herido', k.clase, { n: s.nombre, a: k.nombre }), s, false);
    if (k) this.alertar(s, k, 'herida');
  };

  const GRAVEDAD = { leve: 0, moderada: 1, grave: 2 };
  const PARTES = ['el brazo izquierdo', 'el brazo derecho', 'la pierna izquierda', 'la pierna derecha', 'el costado', 'el hombro', 'la espalda', 'el abdomen', 'la cara', 'la mano'];
  // Guarda una herida para el parte médico final
  S.registrarHerida = function (s, dmg, k, ctx) {
    const gravedad = dmg < 20 ? 'leve' : (dmg < 45 ? 'moderada' : 'grave');
    const parte = this.elegirT(PARTES);
    let texto;
    if (ctx === 'trampa') texto = 'Pierna atrapada en un cepo';
    else if (ctx === 'flecha') texto = 'Flecha clavada en ' + parte;
    else if (ctx === 'lanza') texto = 'Machetazo en la espalda';
    else if (ctx === 'fuegoAmigo') texto = 'Herida de bala en ' + parte;
    else if (ctx === 'estrangulamiento') texto = 'Marcas de estrangulamiento en el cuello';
    else if (ctx === 'caida') texto = 'Golpes y raspones por una caída';
    else if (k) {
      switch (k.clase) {
        case 'jason': texto = this.rngT() < 0.35 ? 'Costillas rotas' : 'Corte de machete en ' + parte; break;
        case 'michael': texto = 'Puñalada en ' + parte; break;
        case 'ghostface': texto = 'Puñalada en ' + parte; break;
        case 'leatherface': texto = 'Desgarro de motosierra en ' + parte; break;
        case 'canibal': texto = 'Hachazo en ' + parte; break;
        case 'extranos': texto = 'Corte profundo en ' + parte; break;
        case 'chucky': texto = this.rngT() < 0.4 ? 'Mordida en la mano' : 'Puñalada en el tobillo'; break;
        default: texto = 'Herida en ' + parte;
      }
    } else texto = 'Herida en ' + parte;
    const igual = s.heridas.find(h => h.texto === texto && !h.tratada);
    if (igual) {
      igual.veces = (igual.veces || 1) + 1;
      if (GRAVEDAD[gravedad] > GRAVEDAD[igual.gravedad]) igual.gravedad = gravedad;
      return;
    }
    s.heridas.push({ texto, gravedad, hora: this.hora(), por: k ? k.corto : '', tratada: '', veces: 1 });
  };

  // Parte médico y psicológico de quien sobrevivió
  S.parteMedico = function (s) {
    const f = Math.max(0, s.hp) / s.hpMax;
    const o = s.g === 'f' ? 'a' : 'o';
    let salud;
    if (!s.heridas.length && f > 0.95) salud = 'Iles' + o;
    else if (f > 0.7) salud = 'Heridas leves';
    else if (f > 0.4) salud = 'Herid' + o;
    else salud = 'Herid' + o + ' de gravedad';
    if (s.sangrado && !s.vendado && f < 0.5) salud = 'En estado crítico';
    const trauma = [];
    if (s.vioMorir.length) trauma.push('Vio morir a ' + this.listaNombres(s.vioMorir));
    if (s.fueAgarrado) trauma.push('El asesino l' + o + ' tuvo agarrad' + o + ' y logró zafarse');
    else if (s.cuerpoACuerpo) trauma.push('Peleó cuerpo a cuerpo con el asesino');
    const graves = s.heridas.filter(h => h.gravedad === 'grave').length;
    const golpe = s.miedoMax / 100 + s.vioMorir.length * 0.35 + graves * 0.25 + (s.fueAgarrado ? 0.3 : 0) - (s.st.val - 5) * 0.06;
    if (golpe >= 1.75) trauma.push('Estrés postraumático: no podrá dormir con la luz apagada');
    else if (golpe >= 1.3) trauma.push('Crisis de nervios: no para de temblar');
    else if (golpe >= 0.85) trauma.push('Muy asustad' + o + ', pero enter' + o);
    return { salud, vida: Math.round(f * 100), heridas: s.heridas.slice(), trauma };
  };
  S.morir = function (s, k, ctx, sinTexto) {
    if (!s.vivo) return;
    s.vivo = false; s.hp = 0; s.intent = { modo: 'quieto' }; s.tarea = null; s.oculto = false; s.enAuto = false;
    if (s.agarradoPor) { const kk = this.ase.find(x => x.id === s.agarradoPor); if (kk) kk.agarre = null; s.agarradoPor = null; }
    const l = this.lugar(s.x, s.y);
    const tile = this.tileDe(s);
    const vars = { n: s.nombre, a: k ? k.nombre : '', l, o: s.fuegoAmigoDe || '' };
    let texto = '';
    if (this.registrar) {
      if (ctx === 'sorpresa' && k && this.rngT() < 0.5) texto = this.txt('muerteSorpresa', null, vars);
      else if (ctx === 'dormido') texto = this.txt('muerteDormido', null, vars);
      else if (ctx === 'escondite' && k) texto = this.txt('muerteEscondite', null, vars);
      else if (ctx === 'agarre' && k) texto = this.txt('muerteAgarre', k.clase, vars);
      else if (ctx === 'flecha') texto = this.txt('muerteFlecha', null, vars);
      else if (ctx === 'herida') texto = this.txt('muerteHerida', null, vars);
      else if (ctx === 'fuegoAmigo') texto = this.txt('muerteFuegoAmigo', null, vars);
      else if (ctx === 'martillazo') texto = this.txt('martillazo', null, vars);
      else if (k) texto = this.txt('muerte', k.clase, vars);
      else texto = this.txt('muerteHerida', null, vars);
    }
    const causa = {
      sorpresa: 'Atacado por sorpresa', dormido: 'Asesinado mientras dormía', escondite: 'Descubierto en su escondite',
      agarre: 'Atrapado sin escapatoria', flecha: 'Flechazo', herida: 'Se desangró', fuegoAmigo: 'Fuego amigo',
      martillazo: 'Martillazo por sorpresa', lanza: 'Machete lanzado', auto: 'Sacado del vehículo', alcanzado: 'Alcanzado mientras huía',
      trampa: 'Cayó en una trampa', canoa: 'Arrastrado al fondo del lago'
    }[ctx] || 'Asesinado de frente';
    s.muerte = { t: this.t, hora: this.hora(), lugar: l, por: k ? k.nombre : (ctx === 'fuegoAmigo' ? 'Fuego amigo de ' + (s.fuegoAmigoDe || '?') : 'Sus heridas'), causa, texto, clase: k ? k.clase : null };
    const c = { id: s.id, x: s.x, y: s.y, nombre: s.nombre, color: s.color, t: this.t, tile, llaves: s.llaves, descubierto: false, oculto: ctx === 'alcanzado' || ctx === 'canoa' };
    this.cuerpos.push(c);
    if (s.llaves) { s.llaves = false; this.llavesSuelo = tile; }
    this.manchar(s.x, s.y, 12);
    if (k) { k.kills++; k.objetivo = null; if (k.cebo === s) k.cebo = null; }
    if (!sinTexto) this.narrar('muerte', texto, s, true);
    const silenciosa = (ctx === 'sorpresa' || ctx === 'dormido' || ctx === 'martillazo') && k && k.def.sigilo >= 7;
    if (!c.oculto) this.ruido('grito', s.x, s.y, silenciosa ? 3 : 15, { alerta: true, k, fuente: s });
    for (const o of this.sob) {
      if (!this.activoSob(o) || o === s || o.traidor || c.oculto) continue;
      const d = this.dist(o, s);
      if (d < 10 && this.los(o.x, o.y, s.x, s.y) && this.rangoVistaSob(o, s.x, s.y) + 2 > d) {
        o.miedo = clamp(o.miedo + 40, 0, 100);
        if (o.vioMorir.indexOf(s.nombre) < 0) o.vioMorir.push(s.nombre);
        o.cuerposVistos.add(s.id); c.descubierto = true;
        if (c.llaves) this.con.llaves = tile;
        this.alertar(o, k, 'muerte');
      }
    }
    if (k && k.def.habilidades.indexOf('arrastrar') >= 0 && this.rng() < 0.55 && !c.oculto) {
      const dest = this.M.guarida >= 0 ? this.M.guarida : k.spawn;
      if (!this.sob.some(o => this.activoSob(o) && this.dist(o, k) < 7)) k.arrastrando = { c, dest, hasta: this.t + 20 };
    }
  };

  S.tickArrastre = function (k) {
    const a = k.arrastrando;
    const llego = this.mover(k, a.dest, k.def.velCaminar * 0.7, 'K');
    a.c.x = k.x - Math.cos(k.dir) * 0.6; a.c.y = k.y - Math.sin(k.dir) * 0.6;
    if (this.tick % 8 === 0) this.manchar(a.c.x, a.c.y, 1);
    const molestan = this.sob.some(s => this.activoSob(s) && this.dist(s, k) < 5 && s.conoce[k.id] && this.t - s.conoce[k.id].t < 1);
    if (llego || this.t > a.hasta || molestan) {
      if (llego) a.c.oculto = true;
      a.c.tile = this.tileDe(k);
      if (a.c.llaves) this.llavesSuelo = a.c.tile;
      k.arrastrando = null;
    }
  };

  S.herirAsesino = function (k, dmg, tipo, atacante) {
    if (k.muerto || k.neutralizado || k.fuera) return;
    const def = k.def;
    const arm = tipo === 'bala' ? def.armaduraBala : (tipo === 'auto' ? 0.2 : def.armaduraMelee);
    const real = dmg * (1 - arm);
    if (k.derribado > 0) {
      // rematarlo mientras está en el suelo
      k.danoCaido += real; k.derribado += real * 0.01;
      if (atacante && atacante.est) atacante.est.danio += real;
      this.manchar(k.x, k.y, 1);
      if (k.danoCaido >= k.hpMax * 0.3) this.eliminarInmortal(k, atacante, 'remate');
      return;
    }
    if (k.fingido > 0) { this.matarAsesino(k, atacante, true); return; }
    k.hp -= real;
    if (atacante && atacante.est) atacante.est.danio += real;
    this.manchar(k.x, k.y, 2);
    this.efecto('golpe', k.x, k.y, { dur: 0.3 });
    if (tipo === 'bala') {
      k.aturdido = Math.max(k.aturdido, def.aturdeBala * this.r(0.6, 1.4));
      k.balas++;
      if (def.mortal === 'no' && k.balas >= 3 && k.hp > 0) this.con.resistente[k.id] = true;
    }
    if (atacante && atacante.tipo === 'sob' && this.activoSob(atacante)) {
      k.vistos[atacante.id] = { x: atacante.x, y: atacante.y, t: this.t, s: atacante };
      if (!k.agarre && (!k.objetivo || this.dist(k, atacante) < this.dist(k, k.objetivo) - 2)) k.objetivo = atacante;
    }
    if (k.agarre && this.rng() < 0.35 + real / 80) {
      const v = k.agarre.s;
      this.soltar(k);
      if (atacante && atacante.est) { atacante.est.salvo++; this.narrar('combate', this.txt('liberado', null, { o: atacante.nombre, a: k.nombre, n: v.nombre }), v, true); }
    }
    if (k.hp > 0) {
      if (def.huyeHerido && k.hp < k.hpMax * def.huyeHerido && !k.retiradaHecha) {
        k.retiradaHecha = true; k.retirada = this.r(22, 35); k.objetivo = null;
        this.narrar('combate', this.txt('huyeHerido', null, { a: k.nombre }), k, true);
      }
      return;
    }
    if (k.agarre) this.soltar(k);
    if (def.mortal === 'no') {
      k.hp = 0; k.derribos++; k.danoCaido = 0;
      k.objetivo = null; k.intent = { modo: 'quieto' };
      if (k.derribos >= 3) { this.eliminarInmortal(k, atacante, 'tercera'); return; }
      k.derribado = this.r(def.revive[0], def.revive[1]);
      this.narrar('combate', this.txt('asesinoDerribado', k.clase, { a: k.nombre, l: this.lugar(k.x, k.y) }), k, true);
      this.efecto('caida', k.x, k.y, { dur: 1 });
      return;
    }
    if (def.mortal === 'huye') {
      k.neutralizado = true; k.huyendo = true; k.estadoFinal = 'Huyó herido';
      this.narrar('combate', this.txt(k.clase === 'leatherface' ? 'leatherfaceHuye' : 'huyeHerido', null, { a: k.nombre }), k, true);
      return;
    }
    if (def.habilidades.indexOf('ultimoSusto') >= 0 && !k.usoUltimoSusto && this.rng() < 0.35) {
      k.usoUltimoSusto = true; k.fingido = this.r(3, 7); k.objetivo = null;
      this.narrar('combate', k.nombre + ' cae al suelo y no se mueve.', k, true);
      return;
    }
    this.matarAsesino(k, atacante, false);
  };

  // Jason o Michael quedan fuera de combate para el resto de la noche
  S.eliminarInmortal = function (k, atacante, como) {
    if (k.neutralizado) return;
    k.neutralizado = true; k.derribado = 0; k.hp = 0;
    const n = atacante && atacante.nombre ? atacante.nombre : 'el grupo';
    if (como === 'tercera') {
      k.estadoFinal = 'Eliminado: cayó por tercera vez y ya no se levantó';
      this.narrar('combate', this.txt('asesinoFinal', k.clase, { a: k.nombre, n }), k, true);
    } else {
      k.estadoFinal = 'Eliminado: ' + n + ' lo remató en el suelo';
      this.narrar('combate', this.txt('remataCaido', null, { a: k.nombre, n }), k, true);
    }
    this.manchar(k.x, k.y, 8);
  };

  S.matarAsesino = function (k, atacante, susto) {
    k.muerto = true; k.fingido = 0; k.hp = 0;
    if (k.agarre) this.soltar(k);
    const n = atacante && atacante.nombre ? atacante.nombre : 'Alguien';
    k.estadoFinal = 'Eliminado' + (atacante && atacante.nombre ? ' por ' + atacante.nombre : '');
    if (susto) this.narrar('combate', n + ' no se deja engañar: remata a ' + k.nombre + ' antes de que vuelva a levantarse.', k, true);
    let quien = k.traidorDe;
    if (!quien && this.registrar) {
      const vivos = this.sob.filter(s => s.vivo && !s.esAsesino);
      quien = this.elegirT(IDENTIDADES).replace('{o}', vivos.length ? this.elegirT(vivos).nombre : 'alguien');
    }
    this.narrar('combate', this.txt('asesinoMuere', k.clase, { a: k.nombre, n, quien }), k, true);
    this.manchar(k.x, k.y, 8);
  };

  S.levantarse = function (k, sinTexto) {
    k.derribado = 0;
    k.hp = k.hpMax * 0.55;
    this.con.inmortal[k.clase] = true;
    const testigo = this.sob.find(s => this.activoSob(s) && this.dist(s, k) < 12 && this.los(s.x, s.y, k.x, k.y));
    k.agresivo = true;
    if (k.def.habilidades.indexOf('desaparecer') >= 0 && !testigo) {
      const M = this.M;
      for (let i = 0; i < 30; i++) {
        const t = M.nodos[Math.floor(this.rng() * M.n)];
        const x = this.cx(t), y = this.cy(t);
        if (Math.abs(x - k.x) + Math.abs(y - k.y) > 14) continue;
        if (this.sob.some(s => this.activoSob(s) && this.dist(s, { x, y }) < 12 && this.los(s.x, s.y, x, y))) continue;
        const ox = k.x, oy = k.y;
        k.x = x; k.y = y; k.px = x; k.py = y; k.paso = -1;
        const visor = this.sob.find(s => this.activoSob(s) && s.conoce[k.id]);
        if (!sinTexto && visor) this.narrar('asesino', this.txt('asesinoDesaparece', null, { n: visor.nombre, a: k.nombre }), { x: ox, y: oy }, true);
        return;
      }
    }
    if (!sinTexto) this.narrar('asesino', this.txt('asesinoSeLevanta', k.clase, { a: k.nombre, n: testigo ? testigo.nombre : '' }), k, true);
    if (testigo) testigo.miedo = clamp(testigo.miedo + 25, 0, 100);
  };

  /* ---------- traidor ---------- */
  S.comprobarTraidor = function (s) {
    if (this.t < 50) return;
    const frac = this.t / this.tFin;
    const otrosActivos = this.ase.some(k => this.activoK(k) || k.fuera);
    let victima = null;
    if (this.alertaGeneral || frac > 0.45) {
      for (const o of this.sob) {
        if (o === s || !this.activoSob(o) || o.traidor) continue;
        if (this.dist(o, s) < 2.2) {
          const testigos = this.sob.some(w => w !== s && w !== o && this.activoSob(w) && this.dist(w, s) < 7 && this.los(w.x, w.y, s.x, s.y));
          if (!testigos) { victima = o; break; }
        }
      }
    }
    const forzado = frac > 0.72 || (!otrosActivos && this.t > 60);
    if (!victima && !forzado) return;
    s.esAsesino = true;
    const k = this.crearAsesino('ghostface', 1, this.ase.length);
    k.nombre = 'Ghostface (' + s.nombre + ')'; k.corto = s.nombre; k.traidorDe = s.nombre;
    k.tareas = []; k.fuera = false; k.llegada = this.t; k.agresivo = true; k.visto = true;
    k.x = s.x; k.y = s.y; k.px = s.x; k.py = s.y; k.spawn = this.elegir(this.M.spawnK);
    this.ase.push(k);
    s.destino = 'Era el asesino';
    this.narrar('asesino', this.txt('traidor', null, { n: s.nombre }), s, true);
    if (victima) { k.objetivo = victima; this.atacar(k, victima, true, 'sorpresa'); }
    else {
      const cerca = this.sob.filter(o => this.activoSob(o) && !o.traidor);
      cerca.forEach(o => { if (this.dist(o, k) < 10) this.alertar(o, k, 'vista'); });
    }
  };

  /* ======================= Final ======================= */
  S.comprobarFin = function () {
    let vivos = 0;
    for (const s of this.sob) if (!s.esAsesino && !s.traidor && s.vivo) vivos++;
    if (vivos === 0) { this.terminar('masacre'); return; }
    const traidorPend = this.sob.some(s => s.traidor && !s.esAsesino && s.vivo);
    const activos = this.ase.some(k => !k.muerto && !k.neutralizado && !k.huido);
    if (this.ase.length && !activos && !traidorPend) {
      if (!this.tVictoria) this.tVictoria = this.t;
      if (this.t - this.tVictoria > 3) { this.terminar('victoria'); return; }
    }
    if (this.t >= this.tFin) this.terminar('sinResolver');
  };
  S.terminar = function (tipo) {
    if (this.fin) return;
    const personas = this.sob.filter(s => !s.esAsesino && !s.traidor);
    const vivos = personas.filter(s => s.vivo);
    const sueltos = this.ase.filter(k => !k.muerto && !k.neutralizado && !k.huido);
    const nombres = l => this.listaNombres(l.map(k => k.nombre));
    if (tipo === 'sinResolver' && vivos.length === 0) tipo = 'masacre';
    if (tipo === 'victoria') this.narrar('final', this.txt('finalVictoria', null, { a: nombres(this.ase) }), null, true);
    if (tipo === 'sinResolver') this.narrar('final', this.txt('finalSinResolver', null, { a: nombres(sueltos) }), sueltos[0] || null, true);
    vivos.forEach(s => { s.destino = 'Sobrevivió'; });
    const n = personas.length;
    let titulo;
    if (tipo === 'masacre') titulo = 'Nadie sobrevivió';
    else if (tipo === 'victoria') titulo = this.ase.length === 1 ? 'Eliminaron a ' + this.ase[0].nombre : 'Eliminaron a los asesinos';
    else titulo = 'Amaneció y ' + nombres(sueltos) + (sueltos.length > 1 ? ' siguen vivos' : ' sigue vivo');
    let subtitulo;
    if (vivos.length === 0) subtitulo = 'No quedó nadie del grupo.';
    else if (vivos.length === n) subtitulo = n === 1 ? 'Sobrevivió.' : 'Sobrevivieron todos.';
    else if (vivos.length === 1) subtitulo = 'Solo ' + vivos[0].nombre + ' sobrevivió.';
    else subtitulo = 'Sobrevivieron ' + vivos.length + ' de ' + n + '.';
    this.fin = {
      tipo, titulo, subtitulo, causa: T.finalCausa[tipo] || '', hora: this.hora(), t: this.t, eliminados: tipo === 'victoria',
      personas: this.sob.map(s => {
        const trai = s.esAsesino || s.traidor;
        const vivo = s.vivo && !trai;
        return {
          nombre: s.nombre, color: s.color, g: s.g, vivo, traidor: trai,
          destino: trai ? 'Era Ghostface' : (vivo ? 'Sobrevivió' : 'Muerto'),
          muerte: s.muerte, est: s.est, parte: vivo ? this.parteMedico(s) : null
        };
      }),
      asesinos: this.ase.map(k => ({
        nombre: k.nombre, clase: k.clase, kills: k.kills, derribos: k.derribos,
        estado: k.muerto || k.neutralizado ? (k.estadoFinal || 'Eliminado') : (k.huido ? (k.estadoFinal || 'Se fue') : (k.fuera ? 'Nunca llegó' : 'Sigue vivo'))
      }))
    };
  };
  /* ======================= Lotes (probabilidades) ======================= */
  function ejecutarUna(config, semilla) {
    const sim = new Simulacion(Object.assign({}, config, { semilla }), { registrar: false });
    let guard = 0;
    while (!sim.fin && guard < 20000) { sim.paso(); guard++; }
    if (!sim.fin) sim.terminar('amanecer');
    return sim.fin;
  }

  function crearAcumulador(config) {
    const nombres = (config.personas || []).map(p => p.nombre);
    return {
      n: 0, nombres, vivos: nombres.map(() => 0), muertes: nombres.map(() => ({})), traidor: nombres.map(() => 0),
      hist: new Array(nombres.length + 1).fill(0), finales: {}, asesinoCae: 0, duracion: 0, causas: {}, asesinos: {},
      ilesos: nombres.map(() => 0), graves: nombres.map(() => 0), heridas: {}
    };
  }
  function acumular(acc, fin) {
    acc.n++;
    let v = 0;
    fin.personas.forEach((p, i) => {
      if (p.traidor) { acc.traidor[i]++; return; }
      if (p.vivo) {
        acc.vivos[i]++; v++;
        if (p.parte) {
          if (/^Iles/.test(p.parte.salud)) acc.ilesos[i]++;
          if (/gravedad|crítico/.test(p.parte.salud)) acc.graves[i]++;
          p.parte.heridas.forEach(h => { const tipo = h.texto.replace(/ en .*/, ''); acc.heridas[tipo] = (acc.heridas[tipo] || 0) + 1; });
        }
      }
      else if (p.muerte) { const c = p.muerte.causa; acc.muertes[i][c] = (acc.muertes[i][c] || 0) + 1; acc.causas[c] = (acc.causas[c] || 0) + 1; }
    });
    acc.hist[Math.min(v, acc.hist.length - 1)]++;
    acc.finales[fin.tipo] = (acc.finales[fin.tipo] || 0) + 1;
    if (fin.eliminados) acc.asesinoCae++;
    fin.asesinos.forEach(a => { acc.asesinos[a.nombre] = (acc.asesinos[a.nombre] || 0) + a.kills; });
    acc.duracion += fin.t;
  }

  // Versión liviana del mapa (sin tablas de distancias), para dibujar miniaturas
  const cacheVistas = {};
  function vistaMapa(id) {
    if (cacheMapas[id]) return cacheMapas[id];
    if (cacheVistas[id]) return cacheVistas[id];
    const def = MP.MAPAS.find(m => m.id === id);
    const p = def.construir();
    const W = p.w, H = p.h, size = W * H;
    const g = new Array(size), interior = new Uint8Array(size), sala = new Int16Array(size).fill(-1);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) g[y * W + x] = p.g[y][x];
    const salas = p.salas.map((r, ri) => {
      let n = 0;
      for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) {
        const i = y * W + x; interior[i] = 1;
        if (x > r.x0 && x < r.x1 && y > r.y0 && y < r.y1) { sala[i] = ri; n++; }
      }
      return { nombre: r.nombre, x0: r.x0, y0: r.y0, x1: r.x1, y1: r.y1, tiles: { length: n } };
    });
    const punto = tipo => { const q = p.puntos.find(pp => pp.tipo === tipo); return q ? q.y * W + q.x : -1; };
    cacheVistas[id] = { id, def, W, H, size, g, interior, sala, salas, telefono: punto('telefono'), radio: punto('radio'), fusibles: punto('fusibles'), guarida: punto('guarida') };
    return cacheVistas[id];
  }

  G.SIM_MOTOR = { Simulacion, prepararMapa, vistaMapa, ejecutarUna, crearAcumulador, acumular, DT, T_FIN };
})(typeof window !== 'undefined' ? window : globalThis);
