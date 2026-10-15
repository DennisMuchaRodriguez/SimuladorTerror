/* Dibujo en canvas: mapa, luces, personas, asesinos, efectos y globos de diálogo. */
(function (G) {
  'use strict';
  const TS = 16; // píxeles por casilla en el lienzo base

  function hash(i) { let x = (i * 374761393) ^ 0x5bd1e995; x = (x ^ (x >>> 13)) * 1274126177; return ((x ^ (x >>> 16)) >>> 0) / 4294967296; }

  const COL = {
    piso: '#2b241f', piso2: '#30291f', pasto: '#14201a', pasto2: '#182619', tierra: '#3a3125', asfalto: '#1b1d22',
    muro: '#46444f', muroBorde: '#6b6876', puerta: '#7a5532', ventana: '#86b3d6', mueble: '#4a3c31', escondite: '#3e2f3a',
    arbol: '#0f2a18', arbol2: '#1a3d22', agua: '#0c2238', agua2: '#14304d', maiz: '#3d3b16', maiz2: '#6d6a2a', muelle: '#4d3d2a',
    texto: 'rgba(236,229,211,0.42)'
  };

  /* ---------- capa fija del mapa ---------- */
  function dibujarBase(M) {
    const c = document.createElement('canvas');
    c.width = M.W * TS; c.height = M.H * TS;
    const x = c.getContext('2d');
    for (let i = 0; i < M.size; i++) {
      const tx = (i % M.W) * TS, ty = ((i / M.W) | 0) * TS, ch = M.g[i], h = hash(i);
      const interior = M.sala[i] >= 0;
      let suelo = interior ? (h < 0.5 ? COL.piso : COL.piso2) : (h < 0.5 ? COL.pasto : COL.pasto2);
      if (ch === ':') suelo = COL.tierra;
      if (ch === '=' || ch === 'E') suelo = COL.asfalto;
      if (ch === '~' || ch === 'B') suelo = COL.agua;
      if (ch === 'C') suelo = interior ? '#26262b' : COL.tierra;
      x.fillStyle = suelo; x.fillRect(tx, ty, TS, TS);
      if (interior && ch !== '#') { x.fillStyle = 'rgba(0,0,0,0.18)'; x.fillRect(tx, ty + TS - 1, TS, 1); }
      if (!interior && (ch === ',' || ch === 'T')) {
        x.fillStyle = 'rgba(120,160,90,0.10)';
        for (let k = 0; k < 3; k++) x.fillRect(tx + hash(i * 7 + k) * TS, ty + hash(i * 13 + k) * TS, 1, 2);
      }
      if (ch === ':') { x.fillStyle = 'rgba(0,0,0,0.15)'; x.fillRect(tx + h * 12, ty + hash(i + 3) * 12, 2, 2); }
      switch (ch) {
        case '#':
          x.fillStyle = COL.muro; x.fillRect(tx, ty, TS, TS);
          x.fillStyle = COL.muroBorde; x.fillRect(tx, ty, TS, 2);
          break;
        case 'T':
          x.fillStyle = 'rgba(0,0,0,0.35)'; x.beginPath(); x.arc(tx + 9, ty + 10, 7.5, 0, 7); x.fill();
          x.fillStyle = COL.arbol; x.beginPath(); x.arc(tx + 8, ty + 8, 7.5 + h, 0, 7); x.fill();
          x.fillStyle = COL.arbol2; x.beginPath(); x.arc(tx + 6, ty + 6, 3.5, 0, 7); x.fill();
          break;
        case '~':
          x.strokeStyle = COL.agua2; x.lineWidth = 1;
          if (h < 0.4) { x.beginPath(); x.moveTo(tx + 3, ty + 8); x.quadraticCurveTo(tx + 6, ty + 5, tx + 10, ty + 8); x.stroke(); }
          break;
        case 'D':
          x.fillStyle = COL.piso; x.fillRect(tx, ty, TS, TS);
          x.fillStyle = COL.puerta; x.fillRect(tx + 2, ty + 2, TS - 4, TS - 4);
          x.fillStyle = 'rgba(0,0,0,0.3)'; x.fillRect(tx + TS - 6, ty + 7, 2, 2);
          break;
        case 'W':
          x.fillStyle = COL.muro; x.fillRect(tx, ty, TS, TS);
          x.fillStyle = COL.ventana; x.globalAlpha = 0.75; x.fillRect(tx + 2, ty + 6, TS - 4, 4); x.globalAlpha = 1;
          break;
        case 'c':
          x.fillStyle = COL.mueble; x.fillRect(tx + 1, ty + 1, TS - 2, TS - 2);
          x.fillStyle = 'rgba(255,255,255,0.05)'; x.fillRect(tx + 1, ty + 1, TS - 2, 3);
          break;
        case 'h':
          x.fillStyle = COL.escondite; x.fillRect(tx + 2, ty + 2, TS - 4, TS - 4);
          x.strokeStyle = 'rgba(236,229,211,0.18)'; x.strokeRect(tx + 2.5, ty + 2.5, TS - 5, TS - 5);
          x.fillStyle = 'rgba(236,229,211,0.35)'; x.fillRect(tx + TS / 2 - 1, ty + 7, 2, 2);
          break;
        case 'm':
          x.fillStyle = COL.maiz; x.fillRect(tx, ty, TS, TS);
          x.strokeStyle = COL.maiz2; x.lineWidth = 1;
          for (let k = 0; k < 4; k++) { const sx = tx + 2 + k * 4; x.beginPath(); x.moveTo(sx, ty + 15); x.lineTo(sx + hash(i + k) * 2 - 1, ty + 1); x.stroke(); }
          break;
        case 'L':
          x.fillStyle = COL.muelle; x.fillRect(tx, ty + 2, TS, TS - 4);
          x.fillStyle = 'rgba(0,0,0,0.3)'; for (let k = 0; k < 4; k++) x.fillRect(tx + k * 4, ty + 2, 1, TS - 4);
          break;
        case 'B':
          x.fillStyle = '#8a5a2b'; x.beginPath(); x.ellipse(tx + 8, ty + 8, 7, 3.5, 0, 0, 7); x.fill();
          x.fillStyle = '#5e3c1c'; x.beginPath(); x.ellipse(tx + 8, ty + 8, 5, 2, 0, 0, 7); x.fill();
          break;
        case 'E':
          x.strokeStyle = 'rgba(240,176,74,0.5)'; x.lineWidth = 1.5;
          x.beginPath(); x.moveTo(tx + 5, ty + 4); x.lineTo(tx + 10, ty + 8); x.lineTo(tx + 5, ty + 12); x.stroke();
          break;
        case '=':
          if (M.g[i - M.W] === '=' && M.g[i + M.W] === '=' && (i % M.W) % 3 === 0) { x.fillStyle = 'rgba(240,200,90,0.35)'; x.fillRect(tx + 2, ty + 7, 9, 2); }
          break;
      }
    }
    const icono = (tile, txt, color) => {
      if (tile < 0) return;
      const tx = (tile % M.W) * TS, ty = ((tile / M.W) | 0) * TS;
      x.fillStyle = color; x.fillRect(tx + 3, ty + 3, 10, 10);
      x.fillStyle = '#0b0d14'; x.font = 'bold 9px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(txt, tx + 8, ty + 8.5);
    };
    icono(M.telefono, 'T', '#9aa9c4');
    icono(M.radio, 'R', '#9aa9c4');
    icono(M.fusibles, 'F', '#c9b26a');
    if (M.guarida >= 0) {
      const tx = (M.guarida % M.W) * TS, ty = ((M.guarida / M.W) | 0) * TS;
      x.fillStyle = 'rgba(120,20,20,0.5)'; x.beginPath(); x.arc(tx + 8, ty + 8, 9, 0, 7); x.fill();
    }
    x.font = '600 8px Archivo, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = COL.texto;
    M.salas.forEach(s => {
      if (s.tiles.length < 6) return;
      let nombre = s.nombre.replace(/^(el|la|los|las) /, '').toUpperCase();
      const ancho = (s.x1 - s.x0 - 0.6) * TS;
      if (x.measureText(nombre).width > ancho) nombre = nombre.split(' ').pop();
      if (x.measureText(nombre).width > ancho) return;
      x.fillText(nombre, ((s.x0 + s.x1 + 1) / 2) * TS, (s.y0 + 1.6) * TS);
    });
    return c;
  }

  /* ---------- figuras ---------- */
  function dibujarAsesino(x, clase, j, px, py, r, dir, opts) {
    opts = opts || {};
    x.save();
    x.translate(px, py);
    if (opts.caido) { x.rotate(Math.PI / 2); x.scale(1, 0.75); }
    const rr = clase === 'chucky' ? r * 0.72 : r * (clase === 'jason' || clase === 'leatherface' ? 1.15 : 1);
    x.fillStyle = 'rgba(0,0,0,0.45)'; x.beginPath(); x.ellipse(rr * 0.15, rr * 0.25, rr * 1.05, rr * 0.95, 0, 0, 7); x.fill();
    // arma
    x.save(); x.rotate(dir);
    if (clase === 'leatherface') {
      x.fillStyle = '#9a9aa2'; x.fillRect(rr * 0.6, -rr * 0.18, rr * 1.4, rr * 0.36);
      x.fillStyle = '#d0d0d6'; for (let k = 0; k < 5; k++) x.fillRect(rr * 0.7 + k * rr * 0.26, -rr * 0.26, rr * 0.08, rr * 0.08);
      x.fillStyle = '#c9a227'; x.fillRect(rr * 0.35, -rr * 0.25, rr * 0.35, rr * 0.5);
    } else if (clase === 'jason' || clase === 'canibal') {
      x.strokeStyle = '#b8bcc4'; x.lineWidth = rr * 0.18; x.beginPath(); x.moveTo(rr * 0.6, rr * 0.3); x.lineTo(rr * 1.7, rr * 0.1); x.stroke();
    } else {
      x.strokeStyle = '#d4d6dc'; x.lineWidth = rr * 0.14; x.beginPath(); x.moveTo(rr * 0.7, rr * 0.35); x.lineTo(rr * 1.35, rr * 0.25); x.stroke();
    }
    x.restore();
    const cuerpo = { jason: '#4a5440', michael: '#2f3a52', ghostface: '#0e0e12', leatherface: '#6b4a30', canibal: '#4d4a2c', extranos: '#3a3530', chucky: '#3f6fb5' }[clase] || '#333';
    x.fillStyle = cuerpo; x.beginPath(); x.arc(0, 0, rr, 0, 7); x.fill();
    x.strokeStyle = 'rgba(210,70,58,0.9)'; x.lineWidth = Math.max(0.02, rr * 0.12); x.stroke();
    if (clase === 'chucky') {
      x.strokeStyle = '#d33'; x.lineWidth = rr * 0.12;
      for (let k = -1; k <= 1; k++) { x.beginPath(); x.moveTo(-rr * 0.8, k * rr * 0.35); x.lineTo(rr * 0.8, k * rr * 0.35); x.stroke(); }
    }
    const fr = rr * 0.66;
    switch (clase) {
      case 'jason':
        x.fillStyle = '#e8e4d6'; x.beginPath(); x.ellipse(0, 0, fr * 0.85, fr, 0, 0, 7); x.fill();
        x.fillStyle = '#c0392b';
        [[-0.5, -0.55], [0, -0.75], [0.5, -0.55]].forEach(p => { x.beginPath(); x.moveTo(p[0] * fr - fr * 0.14, p[1] * fr); x.lineTo(p[0] * fr + fr * 0.14, p[1] * fr); x.lineTo(p[0] * fr, p[1] * fr + fr * 0.2); x.fill(); });
        x.fillStyle = '#111'; [[-0.32, -0.1], [0.32, -0.1]].forEach(p => { x.beginPath(); x.arc(p[0] * fr, p[1] * fr, fr * 0.15, 0, 7); x.fill(); });
        for (let k = 0; k < 6; k++) { x.beginPath(); x.arc((hash(k + 3) - 0.5) * fr * 1.2, (0.25 + hash(k + 9) * 0.5) * fr, fr * 0.05, 0, 7); x.fill(); }
        break;
      case 'michael':
        x.fillStyle = '#5b4636'; x.beginPath(); x.arc(0, -fr * 0.15, fr * 1.05, Math.PI, 0); x.fill();
        x.fillStyle = '#f2efe6'; x.beginPath(); x.ellipse(0, fr * 0.05, fr * 0.78, fr * 0.92, 0, 0, 7); x.fill();
        x.fillStyle = '#111'; [[-0.3, -0.05], [0.3, -0.05]].forEach(p => { x.beginPath(); x.ellipse(p[0] * fr, p[1] * fr, fr * 0.16, fr * 0.09, 0, 0, 7); x.fill(); });
        x.fillRect(-fr * 0.2, fr * 0.45, fr * 0.4, fr * 0.06);
        break;
      case 'ghostface':
        x.fillStyle = '#f4f4f0'; x.beginPath(); x.ellipse(0, fr * 0.1, fr * 0.72, fr * 1.05, 0, 0, 7); x.fill();
        x.fillStyle = '#111';
        x.beginPath(); x.ellipse(-fr * 0.28, -fr * 0.15, fr * 0.16, fr * 0.3, -0.2, 0, 7); x.fill();
        x.beginPath(); x.ellipse(fr * 0.28, -fr * 0.15, fr * 0.16, fr * 0.3, 0.2, 0, 7); x.fill();
        x.beginPath(); x.ellipse(0, fr * 0.6, fr * 0.14, fr * 0.32, 0, 0, 7); x.fill();
        break;
      case 'leatherface':
        x.fillStyle = '#c9a77c'; x.beginPath(); x.arc(0, 0, fr, 0, 7); x.fill();
        x.strokeStyle = '#5a3b22'; x.lineWidth = fr * 0.08;
        x.beginPath(); x.moveTo(-fr * 0.8, -fr * 0.3); x.lineTo(fr * 0.8, -fr * 0.2); x.stroke();
        x.beginPath(); x.moveTo(-fr * 0.2, -fr * 0.9); x.lineTo(-fr * 0.1, fr * 0.9); x.stroke();
        x.fillStyle = '#2a1a10'; [[-0.35, 0.05], [0.35, 0.1]].forEach(p => { x.beginPath(); x.arc(p[0] * fr, p[1] * fr, fr * 0.13, 0, 7); x.fill(); });
        x.fillRect(-fr * 0.3, fr * 0.5, fr * 0.6, fr * 0.1);
        break;
      case 'canibal':
        x.fillStyle = '#b58a6a'; x.beginPath(); x.ellipse(fr * 0.05, 0, fr * 0.95, fr * 0.85, 0.3, 0, 7); x.fill();
        x.fillStyle = '#7a4f3a'; x.beginPath(); x.arc(fr * 0.35, fr * 0.3, fr * 0.35, 0, 7); x.fill();
        x.fillStyle = '#111'; x.beginPath(); x.arc(-fr * 0.3, -fr * 0.15, fr * 0.2, 0, 7); x.fill();
        x.beginPath(); x.arc(fr * 0.35, -fr * 0.25, fr * 0.09, 0, 7); x.fill();
        x.fillStyle = '#e8d7a0'; x.fillRect(-fr * 0.35, fr * 0.45, fr * 0.7, fr * 0.12);
        if (j === 0) { x.strokeStyle = '#8a6a3a'; x.lineWidth = rr * 0.1; x.beginPath(); x.arc(-rr * 0.9, 0, rr * 0.9, -1.1, 1.1); x.stroke(); }
        break;
      case 'extranos':
        if (j === 0) {
          x.fillStyle = '#a8916a'; x.beginPath(); x.arc(0, 0, fr, 0, 7); x.fill();
          x.fillStyle = '#111'; x.fillRect(-fr * 0.45, -fr * 0.2, fr * 0.25, fr * 0.2); x.fillRect(fr * 0.2, -fr * 0.2, fr * 0.25, fr * 0.2);
          x.strokeStyle = '#5c4a30'; x.lineWidth = fr * 0.08; x.beginPath(); x.moveTo(-fr * 0.5, fr * 0.4); x.lineTo(fr * 0.5, fr * 0.4); x.stroke();
        } else {
          x.fillStyle = j === 1 ? '#e8c27a' : '#2a2018'; x.beginPath(); x.arc(0, -fr * 0.2, fr * 1.05, Math.PI, 0); x.fill();
          x.fillStyle = '#f1ebe0'; x.beginPath(); x.ellipse(0, fr * 0.05, fr * 0.75, fr * 0.88, 0, 0, 7); x.fill();
          x.fillStyle = '#111'; [[-0.3, -0.05], [0.3, -0.05]].forEach(p => { x.beginPath(); x.arc(p[0] * fr, p[1] * fr, fr * 0.11, 0, 7); x.fill(); });
          x.fillStyle = '#b5302b'; x.beginPath(); x.ellipse(0, fr * 0.45, fr * 0.16, fr * 0.08, 0, 0, 7); x.fill();
        }
        break;
      case 'chucky':
        x.fillStyle = '#d4542a'; x.beginPath(); x.arc(0, -fr * 0.2, fr * 1.15, Math.PI * 0.9, Math.PI * 2.1); x.fill();
        x.fillStyle = '#f0c49c'; x.beginPath(); x.arc(0, fr * 0.05, fr * 0.8, 0, 7); x.fill();
        x.fillStyle = '#2a5fa0'; [[-0.3, -0.05], [0.3, -0.05]].forEach(p => { x.beginPath(); x.arc(p[0] * fr, p[1] * fr, fr * 0.13, 0, 7); x.fill(); });
        x.strokeStyle = '#8a3a2a'; x.lineWidth = fr * 0.07; x.beginPath(); x.moveTo(-fr * 0.5, fr * 0.1); x.lineTo(-fr * 0.1, fr * 0.55); x.stroke();
        x.beginPath(); x.arc(0, fr * 0.35, fr * 0.3, 0.2, Math.PI - 0.2); x.stroke();
        break;
    }
    x.restore();
  }

  function prepararLienzo(canvas, w, h) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    const x = canvas.getContext('2d');
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    return x;
  }

  function retrato(canvas, clase, j) {
    const w = canvas.clientWidth || 72, h = canvas.clientHeight || 72;
    const x = prepararLienzo(canvas, w, h);
    x.fillStyle = '#0b0d14'; x.fillRect(0, 0, w, h);
    const g = x.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w * 0.6);
    g.addColorStop(0, 'rgba(240,176,74,0.18)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    dibujarAsesino(x, clase, j || 0, w / 2 - 4, h / 2 + 2, Math.min(w, h) * 0.28, 0.3);
  }

  function miniaturaMapa(canvas, M) {
    const base = dibujarBase(M);
    const w = canvas.clientWidth || 240, h = Math.round(w * M.H / M.W);
    const x = prepararLienzo(canvas, w, h);
    x.imageSmoothingEnabled = true;
    x.drawImage(base, 0, 0, w, h);
    x.fillStyle = 'rgba(5,7,16,0.2)'; x.fillRect(0, 0, w, h);
  }

  /* ---------- render principal ---------- */
  function Render(canvas) {
    this.c = canvas; this.x = canvas.getContext('2d');
    this.luz = document.createElement('canvas');
    this.decal = document.createElement('canvas');
    this.base = null; this.M = null; this.sim = null; this.sangreVista = 0;
    this.cam = { x: 24, y: 15, zoom: 1 };
    this.seguir = false; this.foco = null; this.seleccion = null; this.etiquetas = true;
    this.w = 0; this.h = 0; this.dpr = 1;
  }

  Render.prototype.ajustar = function () {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = this.c.clientWidth, h = this.c.clientHeight;
    if (!w || !h) return;
    if (this.c.width !== Math.round(w * dpr) || this.c.height !== Math.round(h * dpr)) {
      this.c.width = Math.round(w * dpr); this.c.height = Math.round(h * dpr);
    }
    this.dpr = dpr; this.w = w; this.h = h;
  };

  Render.prototype.usarSim = function (sim) {
    this.sim = sim;
    if (this.M !== sim.M) {
      this.M = sim.M;
      this.base = dibujarBase(sim.M);
      this.decal.width = this.base.width; this.decal.height = this.base.height;
      this.cam = { x: sim.M.W / 2, y: sim.M.H / 2, zoom: 1 };
    }
    this.decal.getContext('2d').clearRect(0, 0, this.decal.width, this.decal.height);
    this.sangreVista = 0; this.seleccion = null; this.foco = null;
  };

  Render.prototype.escala = function () {
    const M = this.M;
    return Math.min(this.w / M.W, this.h / M.H) * this.cam.zoom;
  };
  Render.prototype.aPantalla = function (wx, wy) {
    const s = this.escala();
    return [(wx - this.cam.x) * s + this.w / 2, (wy - this.cam.y) * s + this.h / 2];
  };
  Render.prototype.aMundo = function (px, py) {
    const s = this.escala();
    return [(px - this.w / 2) / s + this.cam.x, (py - this.h / 2) / s + this.cam.y];
  };

  Render.prototype.actualizarCamara = function (alpha, instantaneo) {
    const M = this.M, sim = this.sim;
    let tx = M.W / 2, ty = M.H / 2, tz = 1;
    if (this.seguir) {
      tz = 2.1;
      let f = null;
      const e = this.seleccion;
      if (e && !(e.tipo === 'sob' && (!e.vivo || e.escapado || e.enAuto)) && !(e.tipo === 'ase' && e.huido)) f = this.interp(e, alpha);
      if (!f && this.foco && sim.t - this.foco.t < 5) f = this.foco;
      if (!f) {
        let mejor = null, md = 1e9;
        for (const k of sim.ase) {
          if (k.fuera || k.muerto || k.huido || k.neutralizado) continue;
          for (const s of sim.sob) {
            if (!sim.activoSob(s)) continue;
            const d = sim.dist(k, s);
            if (d < md) { md = d; mejor = { x: (k.x + s.x) / 2, y: (k.y + s.y) / 2 }; }
          }
        }
        if (!mejor || md > 18) {
          const vivos = sim.sob.filter(s => sim.activoSob(s));
          if (vivos.length) mejor = { x: vivos.reduce((a, s) => a + s.x, 0) / vivos.length, y: vivos.reduce((a, s) => a + s.y, 0) / vivos.length };
        }
        f = mejor;
      }
      if (f) { tx = f.x; ty = f.y; }
    }
    const k = instantaneo ? 1 : 0.08;
    this.cam.zoom += (tz - this.cam.zoom) * k;
    const s = Math.min(this.w / M.W, this.h / M.H) * this.cam.zoom;
    const mx = this.w / 2 / s, my = this.h / 2 / s;
    tx = mx * 2 >= M.W ? M.W / 2 : Math.max(Math.min(tx, M.W - mx), mx);
    ty = my * 2 >= M.H ? M.H / 2 : Math.max(Math.min(ty, M.H - my), my);
    const kp = instantaneo ? 1 : 0.12;
    this.cam.x += (tx - this.cam.x) * kp; this.cam.y += (ty - this.cam.y) * kp;
  };

  Render.prototype.interp = function (e, a) {
    if (e.px === undefined) return { x: e.x, y: e.y };
    const dx = e.x - e.px, dy = e.y - e.py;
    if (dx * dx + dy * dy > 4) return { x: e.x, y: e.y };
    return { x: e.px + dx * a, y: e.py + dy * a };
  };

  Render.prototype.dibujar = function (alpha) {
    const sim = this.sim;
    if (!sim) return;
    this.ajustar();
    if (!this.w) return;
    this.actualizarCamara(alpha);
    const x = this.x, dpr = this.dpr, s = this.escala();
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    x.fillStyle = '#05060b'; x.fillRect(0, 0, this.w, this.h);
    const o = this.aPantalla(0, 0);
    x.setTransform(dpr * s, 0, 0, dpr * s, dpr * o[0], dpr * o[1]);
    x.imageSmoothingEnabled = true;
    x.drawImage(this.base, 0, 0, this.M.W, this.M.H);
    this.dibujarSangre();
    x.drawImage(this.decal, 0, 0, this.M.W, this.M.H);
    this.dibujarEstadoMapa(x);
    this.dibujarObjetos(x);
    this.dibujarCuerpos(x);
    this.dibujarVehiculos(x, alpha, 'suelo');
    this.dibujarLuz(x, alpha);
    this.dibujarVehiculos(x, alpha, 'luces');
    this.dibujarRuidos(x);
    this.dibujarEntidades(x, alpha);
    this.dibujarEfectos(x);
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.dibujarEtiquetas(x, alpha, s);
    this.dibujarGlobos(x, alpha, s);
    const ap = sim.efectos.find(f => f.tipo === 'apagon' && sim.t - f.t < f.dur);
    if (ap) { x.fillStyle = 'rgba(0,0,0,' + (0.6 * (1 - (sim.t - ap.t) / ap.dur)) + ')'; x.fillRect(0, 0, this.w, this.h); }
  };

  Render.prototype.dibujarSangre = function () {
    const sim = this.sim;
    const nuevas = sim.sangreN - this.sangreVista;
    if (nuevas <= 0) return;
    const d = this.decal.getContext('2d');
    const lista = sim.sangre.slice(Math.max(0, sim.sangre.length - nuevas));
    d.fillStyle = 'rgba(122,14,14,0.75)';
    for (const b of lista) { d.beginPath(); d.arc(b.x * TS, b.y * TS, b.r * TS, 0, 7); d.fill(); }
    this.sangreVista = sim.sangreN;
  };

  Render.prototype.dibujarEstadoMapa = function (x) {
    const sim = this.sim, M = this.M;
    for (let i = 0; i < M.size; i++) {
      if (M.g[i] !== 'D') continue;
      const tx = i % M.W, ty = (i / M.W) | 0;
      if (sim.rotas.has(i)) {
        x.fillStyle = '#2b241f'; x.fillRect(tx, ty, 1, 1);
        x.fillStyle = '#5a3d22'; x.fillRect(tx + 0.1, ty + 0.15, 0.3, 0.12); x.fillRect(tx + 0.55, ty + 0.7, 0.35, 0.12);
      } else if (sim.abierta[i] > sim.t) {
        x.fillStyle = '#2b241f'; x.fillRect(tx + 0.12, ty + 0.12, 0.76, 0.76);
        x.fillStyle = '#7a5532'; x.fillRect(tx + 0.1, ty + 0.1, 0.18, 0.8);
      }
    }
    sim.rotas.forEach(i => {
      if (M.g[i] !== 'W') return;
      const tx = i % M.W, ty = (i / M.W) | 0;
      x.fillStyle = '#46444f'; x.fillRect(tx, ty, 1, 1);
      x.fillStyle = 'rgba(160,200,230,0.8)';
      for (let k = 0; k < 4; k++) x.fillRect(tx + hash(i + k) * 0.8, ty + 0.3 + hash(i * 3 + k) * 0.4, 0.12, 0.08);
    });
    for (const k in sim.barricadas) {
      const i = +k, b = sim.barricadas[k], tx = i % M.W, ty = (i / M.W) | 0;
      x.globalAlpha = 0.5 + 0.5 * Math.max(0, b.hp / b.max);
      x.fillStyle = '#9a7442';
      x.save(); x.translate(tx + 0.5, ty + 0.5); x.rotate(0.6); x.fillRect(-0.55, -0.1, 1.1, 0.2); x.rotate(-1.2); x.fillRect(-0.55, -0.1, 1.1, 0.2); x.restore();
      x.globalAlpha = 1;
    }
    for (const t of sim.trampas) {
      const tx = (t.tile % M.W) + 0.5, ty = ((t.tile / M.W) | 0) + 0.5;
      x.strokeStyle = t.armada ? 'rgba(170,170,180,0.55)' : 'rgba(210,70,58,0.8)'; x.lineWidth = 0.08;
      x.beginPath(); x.arc(tx, ty, 0.28, 0, 7); x.stroke();
      for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; x.beginPath(); x.moveTo(tx + Math.cos(a) * 0.28, ty + Math.sin(a) * 0.28); x.lineTo(tx + Math.cos(a) * 0.12, ty + Math.sin(a) * 0.12); x.stroke(); }
    }
  };

  Render.prototype.dibujarObjetos = function (x) {
    const sim = this.sim, M = this.M;
    for (const it of sim.items) {
      const cx = (it.tile % M.W) + 0.5, cy = ((it.tile / M.W) | 0) + 0.5;
      x.save(); x.translate(cx, cy);
      if (it.tipo === 'botiquin') {
        x.fillStyle = '#e9e5da'; x.fillRect(-0.25, -0.2, 0.5, 0.4);
        x.fillStyle = '#c0392b'; x.fillRect(-0.05, -0.15, 0.1, 0.3); x.fillRect(-0.15, -0.05, 0.3, 0.1);
      } else if (it.tipo === 'sueter') {
        x.fillStyle = '#b77a9a'; x.fillRect(-0.25, -0.2, 0.5, 0.4);
      } else if (it.tipo === 'escopeta' || it.tipo === 'rifle' || it.tipo === 'revolver' || it.tipo === 'pistola') {
        x.rotate(-0.4); x.fillStyle = '#6b4a2b'; x.fillRect(-0.35, -0.06, 0.25, 0.14);
        x.fillStyle = '#9ea3ad'; x.fillRect(-0.12, -0.05, it.tipo === 'revolver' ? 0.3 : 0.5, 0.08);
      } else {
        x.rotate(-0.7); x.fillStyle = it.tipo === 'bate' ? '#a07a4a' : '#c7cbd3';
        x.fillRect(-0.3, -0.04, 0.6, it.tipo === 'hacha' ? 0.08 : 0.07);
        if (it.tipo === 'hacha') { x.fillStyle = '#9ea3ad'; x.fillRect(0.18, -0.16, 0.14, 0.24); }
        if (it.tipo === 'cuchillo') { x.fillStyle = '#3a2a1a'; x.fillRect(-0.3, -0.05, 0.22, 0.1); }
      }
      x.restore();
    }
    const llaves = [];
    if (sim.llavesTile >= 0) llaves.push(sim.llavesTile);
    if (sim.llavesSuelo >= 0) llaves.push(sim.llavesSuelo);
    for (const t of llaves) {
      const cx = (t % M.W) + 0.5, cy = ((t / M.W) | 0) + 0.5;
      x.fillStyle = 'rgba(240,200,80,' + (0.6 + 0.4 * Math.sin(sim.t * 5)) + ')';
      x.beginPath(); x.arc(cx - 0.12, cy, 0.12, 0, 7); x.fill();
      x.fillRect(cx - 0.02, cy - 0.03, 0.3, 0.07); x.fillRect(cx + 0.18, cy, 0.05, 0.12);
    }
  };

  Render.prototype.dibujarCuerpos = function (x) {
    for (const c of this.sim.cuerpos) {
      x.globalAlpha = c.oculto ? 0.45 : 1;
      x.fillStyle = 'rgba(110,10,10,0.8)'; x.beginPath(); x.ellipse(c.x + 0.1, c.y + 0.1, 0.55, 0.4, 0.3, 0, 7); x.fill();
      x.fillStyle = c.color; x.beginPath(); x.ellipse(c.x, c.y, 0.38, 0.24, 0.5, 0, 7); x.fill();
      x.strokeStyle = '#0b0d14'; x.lineWidth = 0.06;
      x.beginPath(); x.moveTo(c.x - 0.12, c.y - 0.08); x.lineTo(c.x + 0.02, c.y + 0.06); x.moveTo(c.x + 0.02, c.y - 0.08); x.lineTo(c.x - 0.12, c.y + 0.06); x.stroke();
      x.globalAlpha = 1;
    }
  };

  Render.prototype.dibujarVehiculos = function (x, a, capa) {
    const sim = this.sim;
    if (capa === 'suelo' && sim.auto && sim.auto.fase !== 'fuera') {
      const v = sim.auto, A = this.M.auto;
      const p = this.interp(v, a);
      const largo = A.vertical ? (A.y1 - A.y0 + 1) : (A.x1 - A.x0 + 1);
      const ancho = A.vertical ? (A.x1 - A.x0 + 1) : (A.y1 - A.y0 + 1);
      x.save(); x.translate(p.x, p.y); x.rotate(v.angulo);
      x.fillStyle = 'rgba(0,0,0,0.45)'; x.fillRect(-largo / 2 + 0.1, -ancho / 2 + 0.15, largo, ancho);
      x.fillStyle = sim.vehiculo === 'el jeep' ? '#55633a' : (sim.vehiculo === 'la camioneta' ? '#7a3b2b' : '#2f5f8a');
      x.fillRect(-largo / 2, -ancho / 2, largo, ancho);
      x.fillStyle = 'rgba(160,200,230,0.55)'; x.fillRect(largo / 2 - 1.2, -ancho / 2 + 0.2, 0.45, ancho - 0.4); x.fillRect(-largo / 2 + 0.4, -ancho / 2 + 0.25, 0.35, ancho - 0.5);
      if (v.danio === 'destruido') { x.fillStyle = 'rgba(20,20,20,0.7)'; x.fillRect(largo / 2 - 0.9, -ancho / 2, 0.9, ancho); }
      if (v.danio === 'cables') { x.fillStyle = '#c98500'; x.fillRect(largo / 2 - 0.5, -0.15, 0.4, 0.3); }
      v.pasajeros.forEach((s, i) => { x.fillStyle = s.color; x.beginPath(); x.arc(-largo / 4 + (i >> 1) * 0.7, (i % 2 ? 0.28 : -0.28), 0.2, 0, 7); x.fill(); });
      x.restore();
    }
    if (capa === 'luces') {
      if (sim.auto && (sim.auto.fase === 'marcha' || sim.auto.fase === 'arrancando')) {
        const v = sim.auto, p = this.interp(v, a);
        const cx = p.x + Math.cos(v.angulo) * 3, cy = p.y + Math.sin(v.angulo) * 3;
        const g = x.createRadialGradient(cx, cy, 0.2, cx, cy, 4);
        g.addColorStop(0, 'rgba(255,240,190,0.35)'); g.addColorStop(1, 'rgba(255,240,190,0)');
        x.fillStyle = g; x.beginPath(); x.arc(cx, cy, 4, 0, 7); x.fill();
      }
      const ay = sim.ayuda;
      if (ay && (ay.fase === 'llegando' || ay.fase === 'escena')) {
        const p = this.interp(ay, a), on = Math.floor(sim.t * 6) % 2 === 1;
        const g = x.createRadialGradient(p.x, p.y, 0.5, p.x, p.y, 7);
        g.addColorStop(0, on ? 'rgba(226,59,59,0.28)' : 'rgba(59,107,226,0.28)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        x.fillStyle = g; x.beginPath(); x.arc(p.x, p.y, 7, 0, 7); x.fill();
        x.save(); x.translate(p.x, p.y); x.rotate(ay.ang || 0);
        x.fillStyle = '#e8e8ea'; x.fillRect(-1.3, -0.6, 2.6, 1.2);
        x.fillStyle = '#16181f'; x.fillRect(-0.4, -0.6, 0.8, 1.2);
        x.fillStyle = on ? '#e23b3b' : '#3b6be2'; x.fillRect(-0.1, -0.55, 0.2, 0.5);
        x.fillStyle = on ? '#3b6be2' : '#e23b3b'; x.fillRect(-0.1, 0.05, 0.2, 0.5);
        x.restore();
      }
    }
  };

  Render.prototype.dibujarLuz = function (x, a) {
    const sim = this.sim, M = this.M, L = this.luz;
    const w = M.W * 8, h = M.H * 8;
    if (L.width !== w) { L.width = w; L.height = h; }
    const l = L.getContext('2d');
    l.globalCompositeOperation = 'source-over';
    l.clearRect(0, 0, w, h);
    for (let i = 0; i < M.size; i++) {
      const interior = M.interior[i];
      let osc = interior ? (sim.luz ? 0.1 : 0.64) : 0.55;
      if (M.g[i] === '#') osc = interior && sim.luz ? 0.15 : 0.6;
      l.fillStyle = 'rgba(3,5,14,' + osc + ')';
      l.fillRect((i % M.W) * 8, ((i / M.W) | 0) * 8, 8, 8);
    }
    l.globalCompositeOperation = 'destination-out';
    const agujero = (cx, cy, r, f) => {
      const g = l.createRadialGradient(cx * 8, cy * 8, 0, cx * 8, cy * 8, r * 8);
      g.addColorStop(0, 'rgba(0,0,0,' + f + ')'); g.addColorStop(1, 'rgba(0,0,0,0)');
      l.fillStyle = g; l.beginPath(); l.arc(cx * 8, cy * 8, r * 8, 0, 7); l.fill();
    };
    for (const lp of M.lamparas) if (!lp.electrica || sim.luz) agujero(lp.x, lp.y, lp.r + 1, 0.85);
    for (const p of sim.sob) {
      if (!sim.activoSob(p) || p.oculto) continue;
      if (!(sim.op.celulares && p.alerta >= 1) && p.objeto !== 'linterna') continue;
      const q = this.interp(p, a);
      agujero(q.x + Math.cos(p.dir) * 1.2, q.y + Math.sin(p.dir) * 1.2, p.objeto === 'linterna' ? 5 : 3.6, 0.75);
    }
    if (sim.auto && (sim.auto.fase === 'marcha' || sim.auto.fase === 'arrancando')) {
      const v = sim.auto, q = this.interp(v, a);
      agujero(q.x + Math.cos(v.angulo) * 3, q.y + Math.sin(v.angulo) * 3, 4.5, 0.8);
    }
    if (sim.ayuda && (sim.ayuda.fase === 'llegando' || sim.ayuda.fase === 'escena')) agujero(sim.ayuda.x, sim.ayuda.y, 7, 0.7);
    x.imageSmoothingEnabled = true;
    x.drawImage(L, 0, 0, M.W, M.H);
  };

  Render.prototype.dibujarRuidos = function (x) {
    const sim = this.sim;
    for (const r of sim.ruidos) {
      const e = (sim.t - r.t) / 1.2;
      if (e < 0 || e > 1 || r.tipo === 'pasos') continue;
      const col = { grito: '210,70,58', disparo: '240,200,90', motosierra: '240,140,60', vidrio: '160,200,230', golpe: '236,229,211', sirena: '120,150,230' }[r.tipo] || '236,229,211';
      x.strokeStyle = 'rgba(' + col + ',' + (0.4 * (1 - e)) + ')';
      x.lineWidth = 0.08;
      x.beginPath(); x.arc(r.x, r.y, Math.min(r.r, 9) * e, 0, 7); x.stroke();
    }
  };

  Render.prototype.dibujarEntidades = function (x, a) {
    const sim = this.sim;
    for (const k of sim.ase) {
      if (k.fuera || k.huido) continue;
      const p = this.interp(k, a);
      const caido = k.derribado > 0 || k.fingido > 0 || k.muerto;
      x.globalAlpha = k.muerto ? 0.55 : 1;
      dibujarAsesino(x, k.clase, k.j, p.x, p.y, 0.42, k.dir, { caido });
      x.globalAlpha = 1;
      if (this.seleccion === k) this.anillo(x, p.x, p.y, 0.72);
      if (!k.muerto && !k.neutralizado) {
        const f = Math.max(0, k.hp / k.hpMax);
        x.fillStyle = 'rgba(0,0,0,0.6)'; x.fillRect(p.x - 0.45, p.y - 0.8, 0.9, 0.12);
        x.fillStyle = k.def.mortal === 'no' ? '#a8a3b8' : '#d2463a'; x.fillRect(p.x - 0.45, p.y - 0.8, 0.9 * f, 0.12);
      }
    }
    for (const p of sim.sob) {
      if (!p.vivo || p.escapado || p.enAuto || p.esAsesino) continue;
      const q = this.interp(p, a);
      const r = 0.36;
      if (p.agarradoPor) { q.x += Math.sin(sim.t * 40) * 0.05; q.y += Math.cos(sim.t * 37) * 0.05; }
      x.globalAlpha = p.oculto ? 0.4 : 1;
      x.fillStyle = 'rgba(0,0,0,0.45)'; x.beginPath(); x.arc(q.x + 0.06, q.y + 0.09, r, 0, 7); x.fill();
      x.fillStyle = p.color; x.beginPath(); x.arc(q.x, q.y, r, 0, 7); x.fill();
      x.fillStyle = 'rgba(236,229,211,0.85)';
      x.beginPath(); x.arc(q.x + Math.cos(p.dir) * r * 0.62, q.y + Math.sin(p.dir) * r * 0.62, r * 0.2, 0, 7); x.fill();
      const f = Math.max(0, p.hp / p.hpMax);
      x.lineWidth = 0.08; x.strokeStyle = 'rgba(0,0,0,0.6)'; x.beginPath(); x.arc(q.x, q.y, r + 0.08, 0, 7); x.stroke();
      x.strokeStyle = f > 0.5 ? '#ece5d3' : (f > 0.25 ? '#f0b04a' : '#d2463a');
      x.beginPath(); x.arc(q.x, q.y, r + 0.08, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2); x.stroke();
      if (p.oculto) { x.setLineDash([0.12, 0.1]); x.strokeStyle = '#ece5d3'; x.beginPath(); x.arc(q.x, q.y, r + 0.22, 0, 7); x.stroke(); x.setLineDash([]); }
      x.globalAlpha = 1;
      if (this.seleccion === p) this.anillo(x, q.x, q.y, 0.64);
      if ((p.arma === 'pistola' || p.arma === 'revolver' || p.arma === 'escopeta' || p.arma === 'rifle') && p.municion > 0 && !p.oculto) {
        x.strokeStyle = '#1a1a1e'; x.lineWidth = 0.1;
        x.beginPath(); x.moveTo(q.x + Math.cos(p.dir) * r, q.y + Math.sin(p.dir) * r); x.lineTo(q.x + Math.cos(p.dir) * (r + 0.3), q.y + Math.sin(p.dir) * (r + 0.3)); x.stroke();
      }
    }
  };

  Render.prototype.anillo = function (x, cx, cy, r) {
    x.strokeStyle = '#f0b04a'; x.lineWidth = 0.09;
    x.beginPath(); x.arc(cx, cy, r, 0, 7); x.stroke();
  };

  Render.prototype.dibujarEfectos = function (x) {
    const sim = this.sim;
    for (const f of sim.efectos) {
      const e = (sim.t - f.t) / f.dur;
      if (e < 0 || e > 1) continue;
      switch (f.tipo) {
        case 'disparo':
          x.strokeStyle = 'rgba(255,220,120,' + (1 - e) + ')'; x.lineWidth = 0.07;
          x.beginPath(); x.moveTo(f.x, f.y); x.lineTo(f.x2, f.y2); x.stroke();
          x.fillStyle = 'rgba(255,230,150,' + (1 - e) + ')'; x.beginPath(); x.arc(f.x, f.y, 0.3 * (1 - e) + 0.1, 0, 7); x.fill();
          break;
        case 'tajo': {
          const ang = Math.atan2(f.y2 - f.y, f.x2 - f.x);
          x.strokeStyle = 'rgba(240,240,245,' + (1 - e) + ')'; x.lineWidth = 0.09;
          x.beginPath(); x.arc(f.x, f.y, 0.85, ang - 0.9 + e * 0.6, ang + 0.4 + e * 0.6); x.stroke();
          break;
        }
        case 'golpe':
          x.strokeStyle = 'rgba(236,229,211,' + (1 - e) + ')'; x.lineWidth = 0.07;
          for (let k = 0; k < 6; k++) { const an = k / 6 * Math.PI * 2; x.beginPath(); x.moveTo(f.x + Math.cos(an) * 0.3, f.y + Math.sin(an) * 0.3); x.lineTo(f.x + Math.cos(an) * (0.45 + e * 0.3), f.y + Math.sin(an) * (0.45 + e * 0.3)); x.stroke(); }
          break;
        case 'herida':
          x.fillStyle = 'rgba(200,30,30,' + (0.8 * (1 - e)) + ')';
          x.beginPath(); x.arc(f.x, f.y, 0.3 + e * 0.6, 0, 7); x.fill();
          break;
        case 'lanza': case 'flecha': {
          const px = f.x + (f.x2 - f.x) * e, py = f.y + (f.y2 - f.y) * e;
          x.save(); x.translate(px, py); x.rotate(f.tipo === 'lanza' ? sim.t * 25 : Math.atan2(f.y2 - f.y, f.x2 - f.x));
          x.strokeStyle = f.tipo === 'lanza' ? '#c7cbd3' : '#a07a4a'; x.lineWidth = 0.08;
          x.beginPath(); x.moveTo(-0.35, 0); x.lineTo(0.35, 0); x.stroke(); x.restore();
          break;
        }
        case 'vidrio':
          x.fillStyle = 'rgba(170,210,240,' + (1 - e) + ')';
          for (let k = 0; k < 7; k++) x.fillRect(f.x + (hash(k + 11) - 0.5) * 2 * e, f.y + (hash(k * 7 + 5) - 0.5) * 2 * e, 0.1, 0.1);
          break;
        case 'golpes':
          x.strokeStyle = 'rgba(236,229,211,' + (0.8 * (1 - e)) + ')'; x.lineWidth = 0.06;
          x.beginPath(); x.arc(f.x, f.y, 0.4 + e * 0.8, 0, 7); x.stroke();
          break;
        case 'caida':
          x.strokeStyle = 'rgba(210,70,58,' + (1 - e) + ')'; x.lineWidth = 0.08;
          x.beginPath(); x.arc(f.x, f.y, 0.5 + e, 0, 7); x.stroke();
          break;
      }
    }
  };

  Render.prototype.dibujarEtiquetas = function (x, a, s) {
    if (!this.etiquetas) return;
    const sim = this.sim;
    const tam = Math.max(9, Math.min(12, s * 0.42));
    const fuente = '600 ' + tam + 'px Archivo, system-ui, sans-serif';
    x.textAlign = 'center';
    const etiqueta = (wx, wy, texto, color) => {
      const pp = this.aPantalla(wx, wy);
      x.font = fuente; x.textBaseline = 'top';
      const w = x.measureText(texto).width;
      x.fillStyle = 'rgba(5,6,11,0.72)'; x.fillRect(pp[0] - w / 2 - 3, pp[1], w + 6, tam + 3);
      x.fillStyle = color; x.fillText(texto, pp[0], pp[1] + 1.5);
    };
    const nombres = s >= 9;
    for (const p of sim.sob) {
      if (!p.vivo || p.escapado || p.enAuto || p.esAsesino) continue;
      const q = this.interp(p, a);
      if (s >= 11) {
        const c = this.aPantalla(q.x, q.y);
        x.font = '700 ' + Math.max(8, s * 0.36) + 'px Archivo, system-ui, sans-serif'; x.textBaseline = 'middle';
        x.fillStyle = '#0b0d14'; x.fillText(p.nombre.charAt(0).toUpperCase(), c[0], c[1] + 0.5);
      }
      if (nombres || this.seleccion === p) {
        const o = p.g === 'f' ? 'a' : 'o';
        let txt = p.nombre;
        if (p.durmiendo) txt += ' · zzz';
        else if (p.agarradoPor) txt += ' · ¡atrapad' + o + '!';
        else if (p.oculto) txt += ' · escondid' + o;
        else if (p.panico) txt += ' · ¡pánico!';
        etiqueta(q.x, q.y + 0.55, txt, '#ece5d3');
      }
    }
    for (const k of sim.ase) {
      if (k.fuera || k.huido) continue;
      const q = this.interp(k, a);
      let txt = k.corto;
      if (k.muerto) txt += ' · muerto';
      else if (k.neutralizado) txt += ' · fuera de combate';
      else if (k.derribado > 0) txt += ' · en el suelo';
      if (nombres || this.seleccion === k) etiqueta(q.x, q.y + 0.62, txt, '#ef8a80');
    }
  };

  Render.prototype.dibujarGlobos = function (x, a, s) {
    const sim = this.sim;
    const tam = Math.max(10, Math.min(13, s * 0.45));
    x.font = '500 ' + tam + 'px Archivo, system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    const globo = (e, colorBorde) => {
      if (!e.habla || e.hablaHasta < sim.t) return;
      const q = this.interp(e, a);
      const p = this.aPantalla(q.x, q.y - 0.7);
      const w = Math.min(220, x.measureText(e.habla).width + 12), h = tam + 8;
      const bx = Math.max(4, Math.min(this.w - w - 4, p[0] - w / 2)), by = Math.max(2, p[1] - h - 6);
      x.globalAlpha = Math.min(1, (e.hablaHasta - sim.t) * 2);
      x.fillStyle = 'rgba(236,229,211,0.94)';
      x.fillRect(bx, by, w, h);
      x.beginPath(); x.moveTo(p[0] - 4, by + h); x.lineTo(p[0] + 4, by + h); x.lineTo(p[0], by + h + 5); x.fill();
      x.strokeStyle = colorBorde; x.lineWidth = 1.5; x.strokeRect(bx, by, w, h);
      x.fillStyle = '#12151f'; x.fillText(e.habla, bx + w / 2, by + h / 2 + 0.5, w - 8);
      x.globalAlpha = 1;
    };
    for (const p of sim.sob) if (p.vivo && !p.escapado && !p.enAuto && !p.esAsesino) globo(p, p.color);
    for (const k of sim.ase) if (!k.fuera && !k.huido && !k.muerto) globo(k, '#d2463a');
  };

  Render.prototype.elegir = function (px, py) {
    if (!this.sim) return null;
    const m = this.aMundo(px, py);
    let mejor = null, md = 1.0;
    const prueba = e => { const d = Math.hypot(e.x - m[0], e.y - m[1]); if (d < md) { md = d; mejor = e; } };
    this.sim.sob.forEach(p => { if (p.vivo && !p.escapado && !p.enAuto && !p.esAsesino) prueba(p); });
    this.sim.ase.forEach(k => { if (!k.fuera && !k.huido) prueba(k); });
    return mejor;
  };

  G.SIM_RENDER = { Render, retrato, miniaturaMapa, dibujarAsesino };
})(typeof window !== 'undefined' ? window : globalThis);
