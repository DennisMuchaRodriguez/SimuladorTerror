/* Escenarios. Cada casilla mide 1 metro.
   Leyenda: # muro · . piso · , pasto · : tierra · = asfalto · T árbol · ~ agua · D puerta · W ventana
            c mueble · h escondite · C auto · E salida a pie · m maizal · L muelle · B canoa */
(function (G) {
  'use strict';

  function rngSemilla(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function Plano(w, h) {
    this.w = w; this.h = h; this.g = [];
    for (let y = 0; y < h; y++) this.g.push(new Array(w).fill(','));
    this.salas = []; this.zonas = []; this.llaves = []; this.items = [];
    this.spawnS = []; this.spawnK = []; this.lamparas = []; this.puntos = [];
  }
  Plano.prototype.dentro = function (x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; };
  Plano.prototype.put = function (x, y, ch) { if (this.dentro(x, y)) this.g[y][x] = ch; };
  Plano.prototype.get = function (x, y) { return this.dentro(x, y) ? this.g[y][x] : '#'; };
  Plano.prototype.rect = function (x0, y0, x1, y1, ch) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.put(x, y, ch);
  };
  Plano.prototype.sala = function (x0, y0, x1, y1, nombre) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const borde = x === x0 || x === x1 || y === y0 || y === y1;
      this.put(x, y, borde ? '#' : '.');
    }
    this.salas.push({ x0, y0, x1, y1, nombre });
  };
  Plano.prototype.zona = function (x0, y0, x1, y1, nombre) { this.zonas.push({ x0, y0, x1, y1, nombre }); };
  Plano.prototype.puertas = function (lista) { lista.forEach(p => this.put(p[0], p[1], 'D')); };
  Plano.prototype.ventanas = function (lista) { lista.forEach(p => this.put(p[0], p[1], 'W')); };
  Plano.prototype.esInterior = function (x, y) {
    return this.salas.some(s => x > s.x0 && x < s.x1 && y > s.y0 && y < s.y1);
  };
  Plano.prototype.suelo = function (x, y) {
    const ch = this.get(x, y);
    if (this.esInterior(x, y)) return '.';
    return (ch === 'T' || ch === '#' || ch === 'c') ? ',' : ch;
  };
  Plano.prototype.despejar = function (x, y, r) {
    for (let yy = y - r; yy <= y + r; yy++) for (let xx = x - r; xx <= x + r; xx++) {
      if (this.get(xx, yy) === 'T') this.put(xx, yy, ',');
    }
  };
  Plano.prototype.llave = function (x, y) { this.put(x, y, this.suelo(x, y)); this.llaves.push([x, y]); };
  Plano.prototype.item = function (x, y, tipo) { this.put(x, y, this.suelo(x, y)); this.items.push({ x, y, tipo }); };
  Plano.prototype.s = function (lista) { lista.forEach(p => { this.put(p[0], p[1], this.suelo(p[0], p[1])); this.spawnS.push(p); }); };
  Plano.prototype.k = function (lista) { lista.forEach(p => { this.despejar(p[0], p[1], 1); this.put(p[0], p[1], this.suelo(p[0], p[1])); this.spawnK.push(p); }); };
  Plano.prototype.punto = function (tipo, x, y) { this.despejar(x, y, 1); this.put(x, y, this.suelo(x, y)); this.puntos.push({ tipo, x, y }); };
  Plano.prototype.lampara = function (x, y, r, electrica) { this.lamparas.push({ x, y, r, electrica: !!electrica }); };
  Plano.prototype.arboles = function (dens, semilla, libres) {
    const r = rngSemilla(semilla);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const v = r();
      if (this.g[y][x] !== ',') continue;
      if (libres.some(l => x >= l[0] && x <= l[2] && y >= l[1] && y <= l[3])) continue;
      if (v < dens) this.put(x, y, 'T');
    }
  };
  Plano.prototype.elipse = function (cx, cy, rx, ry, ch) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) this.put(x, y, ch);
    }
  };

  /* ---------- 1. Casa suburbana ---------- */
  function casa() {
    const m = new Plano(48, 30);
    for (let x = 0; x < 48; x += 3) m.put(x, 0, 'T');
    m.rect(14, 1, 22, 2, '~');
    m.rect(0, 5, 4, 15, '#'); m.rect(43, 5, 47, 15, '#');
    m.rect(0, 25, 47, 25, ':'); m.rect(0, 26, 47, 28, '=');

    m.sala(8, 4, 14, 9, 'el cuarto de huéspedes');
    m.sala(14, 4, 18, 9, 'el baño');
    m.sala(18, 4, 24, 9, 'el cuarto pequeño');
    m.sala(24, 4, 30, 9, 'el dormitorio principal');
    m.sala(8, 9, 30, 13, 'el pasillo');
    m.sala(8, 13, 20, 20, 'la sala');
    m.sala(20, 13, 30, 20, 'la cocina');
    m.sala(30, 11, 40, 20, 'el garaje');

    m.rect(32, 21, 36, 24, ':'); m.rect(14, 21, 14, 24, ':');
    m.puertas([[14, 20], [20, 17], [11, 13], [25, 13], [11, 9], [16, 9], [21, 9], [27, 9], [8, 11], [30, 16], [40, 16],
      [32, 20], [33, 20], [34, 20], [35, 20], [36, 20]]);
    m.ventanas([[11, 4], [8, 6], [21, 4], [27, 4], [30, 6], [8, 16], [10, 20], [18, 20], [24, 20], [27, 20], [40, 13]]);

    m.rect(12, 17, 15, 17, 'c'); m.rect(9, 14, 9, 15, 'c');
    m.rect(21, 14, 24, 14, 'c'); m.put(29, 14, 'c'); m.rect(24, 17, 26, 18, 'c');
    m.rect(9, 5, 10, 6, 'c'); m.put(13, 5, 'h');
    m.put(17, 5, 'h');
    m.rect(19, 5, 20, 6, 'c'); m.put(23, 5, 'h');
    m.rect(25, 5, 26, 7, 'c'); m.put(29, 5, 'h');
    m.put(9, 12, 'h');
    m.rect(33, 13, 35, 17, 'C'); m.rect(38, 18, 39, 19, 'c');
    [[0, 26], [0, 27], [0, 28], [47, 26], [47, 27], [47, 28]].forEach(p => m.put(p[0], p[1], 'E'));

    m.punto('telefono', 28, 14);
    m.punto('fusibles', 39, 12);
    [[19, 11], [22, 16], [28, 8], [31, 12], [10, 19]].forEach(p => m.llave(p[0], p[1]));
    m.item(21, 15, 'cuchillo'); m.item(15, 5, 'botiquin'); m.item(28, 7, 'revolver'); m.item(31, 19, 'bate');
    m.s([[10, 18], [13, 19], [16, 15], [17, 18], [11, 16], [16, 19], [18, 15], [14, 15]]);
    m.k([[6, 2], [41, 2], [2, 20], [45, 20], [30, 23]]);

    m.lampara(6, 25, 4.5, false); m.lampara(24, 25, 4.5, false); m.lampara(42, 25, 4.5, false);
    m.lampara(14, 21.5, 3, true); m.lampara(34, 21.5, 3, true);
    m.zona(0, 25, 47, 29, 'la calle'); m.zona(0, 0, 47, 3, 'el patio trasero'); m.zona(31, 21, 37, 24, 'la entrada del garaje');
    return m;
  }

  /* ---------- 2. Cabaña en el bosque ---------- */
  function cabana() {
    const m = new Plano(48, 30);
    m.arboles(0.32, 7, [[11, 7, 37, 23], [6, 9, 11, 17], [0, 14, 16, 16], [20, 20, 27, 29], [34, 4, 43, 11], [38, 0, 47, 6], [1, 1, 6, 6]]);
    m.sala(16, 13, 26, 19, 'la sala');
    m.sala(16, 9, 21, 13, 'el cuarto de la izquierda');
    m.sala(21, 9, 26, 13, 'el cuarto de la derecha');
    m.sala(26, 9, 31, 14, 'el baño');
    m.sala(26, 14, 31, 19, 'la despensa');
    m.sala(36, 5, 42, 10, 'el cobertizo');
    m.sala(8, 11, 10, 14, 'la letrina');

    m.rect(21, 20, 21, 21, ':'); m.rect(22, 24, 25, 29, ':'); m.rect(0, 15, 15, 15, ':'); m.rect(42, 1, 42, 4, ':');
    m.rect(32, 10, 38, 11, ':');
    m.puertas([[21, 19], [18, 13], [23, 13], [26, 16], [28, 14], [31, 17], [39, 10], [9, 14]]);
    m.ventanas([[18, 19], [24, 19], [16, 16], [18, 9], [24, 9], [31, 11], [42, 7]]);

    m.rect(17, 14, 18, 14, 'c'); m.rect(21, 15, 22, 16, 'c');
    m.rect(17, 10, 18, 11, 'c'); m.put(20, 10, 'h');
    m.rect(24, 10, 25, 11, 'c'); m.put(22, 10, 'h');
    m.put(30, 10, 'h'); m.put(30, 18, 'h'); m.rect(27, 18, 28, 18, 'c');
    m.put(41, 9, 'h');
    m.rect(22, 22, 25, 23, 'C');
    m.put(0, 15, 'E'); [22, 23, 24, 25].forEach(x => m.put(x, 29, 'E'));

    m.punto('fusibles', 41, 6);
    m.punto('guarida', 3, 3);
    m.item(19, 14, 'escopeta'); m.item(25, 14, 'cuchillo'); m.item(27, 10, 'botiquin'); m.item(37, 6, 'hacha');
    m.s([[18, 17], [20, 17], [23, 18], [24, 17], [19, 16], [23, 15], [25, 15], [17, 15]]);
    m.k([[2, 8], [45, 27], [4, 22], [30, 2], [14, 28]]);

    m.lampara(21, 20.5, 3, true); m.lampara(39, 11, 2.5, true);
    m.zona(11, 7, 37, 23, 'el claro'); m.zona(38, 0, 47, 5, 'la colina');
    m.zona(20, 23, 27, 29, 'el camino de tierra'); m.zona(0, 14, 10, 16, 'el sendero');
    return m;
  }

  /* ---------- 3. Campamento del lago ---------- */
  function campamento() {
    const m = new Plano(48, 30);
    m.arboles(0.24, 11, [[15, 2, 45, 25], [42, 13, 47, 29], [14, 13, 20, 19]]);
    m.elipse(4, 20, 11, 10, '~');
    m.rect(9, 17, 14, 17, 'L'); m.put(8, 17, 'B');

    m.sala(26, 3, 36, 11, 'el comedor');
    m.sala(36, 3, 42, 8, 'la cocina del campamento');
    m.sala(36, 8, 42, 11, 'la oficina');
    m.sala(18, 15, 24, 20, 'la cabaña 1');
    m.sala(27, 16, 33, 21, 'la cabaña 2');
    m.sala(36, 16, 42, 21, 'la cabaña 3');
    m.sala(43, 9, 46, 12, 'el cobertizo del generador');

    m.rect(43, 13, 44, 29, ':'); m.rect(31, 12, 31, 13, ':'); m.rect(15, 14, 44, 14, ':'); m.rect(15, 15, 15, 17, ':');
    m.puertas([[31, 11], [36, 5], [36, 10], [42, 5], [21, 15], [30, 16], [39, 16], [44, 12]]);
    m.ventanas([[28, 3], [33, 3], [26, 7], [29, 11], [34, 11], [39, 3], [42, 10], [21, 20], [30, 21], [39, 21], [18, 17], [33, 18], [42, 18]]);

    m.rect(28, 5, 30, 5, 'c'); m.rect(32, 5, 34, 5, 'c'); m.rect(28, 8, 30, 8, 'c'); m.rect(32, 8, 34, 8, 'c');
    m.rect(37, 4, 38, 4, 'c'); m.put(41, 7, 'h'); m.put(38, 9, 'c');
    m.rect(19, 17, 19, 18, 'c'); m.rect(23, 17, 23, 18, 'c'); m.put(19, 19, 'h');
    m.rect(28, 18, 28, 19, 'c'); m.rect(32, 18, 32, 19, 'c'); m.put(28, 20, 'h');
    m.rect(37, 18, 37, 19, 'c'); m.rect(41, 18, 41, 19, 'c'); m.put(41, 20, 'h');
    m.rect(45, 17, 46, 19, 'C');
    m.put(43, 29, 'E'); m.put(44, 29, 'E');

    m.punto('radio', 40, 9);
    m.punto('fusibles', 45, 10);
    [[38, 10], [39, 6], [22, 19], [31, 20], [40, 17]].forEach(p => m.llave(p[0], p[1]));
    m.item(40, 4, 'cuchillo'); m.item(37, 10, 'botiquin'); m.item(44, 11, 'hacha'); m.item(38, 20, 'sueter');
    m.s([[28, 6], [30, 6], [32, 6], [34, 6], [28, 9], [30, 9], [32, 9], [34, 9]]);
    m.k([[2, 2], [24, 1], [46, 2], [22, 28], [30, 28]]);

    m.lampara(31, 12.5, 3, true); m.lampara(21, 14, 2.5, true); m.lampara(30, 15, 2.5, true); m.lampara(39, 15, 2.5, true);
    m.zona(0, 6, 16, 29, 'la orilla del lago'); m.zona(15, 12, 42, 25, 'el campamento'); m.zona(42, 13, 47, 29, 'el camino');
    return m;
  }

  /* ---------- 4. Granja en Texas ---------- */
  function granja() {
    const m = new Plano(48, 30);
    m.rect(0, 0, 13, 23, 'm'); m.rect(0, 12, 13, 12, ':'); m.rect(6, 0, 6, 23, ':');
    m.rect(0, 24, 47, 24, ':'); m.rect(0, 25, 47, 26, '=');
    m.arboles(0.25, 5, [[0, 0, 14, 29], [15, 5, 47, 22], [0, 22, 47, 29]]);

    m.sala(16, 12, 25, 19, 'la sala');
    m.sala(25, 12, 34, 19, 'el comedor');
    m.sala(16, 6, 23, 12, 'la cocina');
    m.sala(23, 6, 29, 12, 'el dormitorio');
    m.sala(29, 6, 34, 12, 'el cuarto del abuelo');
    m.sala(37, 3, 46, 14, 'el granero');
    m.sala(42, 3, 46, 7, 'el cuarto de los ganchos');

    m.rect(20, 20, 20, 23, ':'); m.rect(38, 20, 39, 23, ':'); m.rect(35, 15, 43, 15, ':');
    m.puertas([[20, 19], [25, 15], [19, 12], [26, 12], [31, 12], [16, 9], [34, 15], [40, 14], [41, 14], [42, 14], [43, 14], [37, 8], [44, 7]]);
    m.ventanas([[17, 19], [23, 19], [16, 15], [31, 19], [28, 19], [19, 6], [26, 6], [32, 6], [34, 9], [46, 10]]);

    m.rect(28, 15, 31, 16, 'c'); m.rect(18, 16, 21, 16, 'c'); m.rect(17, 7, 20, 7, 'c');
    m.rect(24, 7, 25, 9, 'c'); m.put(32, 8, 'c');
    m.put(28, 7, 'h'); m.put(33, 7, 'h'); m.put(22, 7, 'h');
    m.put(38, 5, 'h'); m.put(39, 12, 'h'); m.put(45, 12, 'h');
    m.rect(37, 18, 40, 19, 'C');
    [[0, 24], [0, 25], [0, 26], [47, 24], [47, 25], [47, 26]].forEach(p => m.put(p[0], p[1], 'E'));

    m.punto('telefono', 22, 11);
    m.punto('fusibles', 38, 4);
    m.punto('guarida', 44, 5);
    [[21, 9], [27, 10], [33, 18], [40, 10], [32, 10]].forEach(p => m.llave(p[0], p[1]));
    m.item(33, 13, 'rifle'); m.item(18, 8, 'cuchillo'); m.item(41, 12, 'hacha'); m.item(30, 7, 'botiquin');
    m.s([[18, 14], [20, 14], [22, 14], [18, 18], [21, 18], [23, 17], [24, 14], [17, 17]]);
    m.k([[2, 2], [10, 20], [46, 1], [46, 22], [30, 28]]);

    m.lampara(20, 20.5, 3, true); m.lampara(41.5, 15.5, 3, true);
    m.zona(0, 0, 14, 23, 'el maizal'); m.zona(0, 24, 47, 29, 'la carretera');
    return m;
  }

  const MAPAS = [
    {
      id: 'casa', nombre: 'Casa suburbana', construir: casa,
      desc: 'Dos plantas en una: sala, cocina, pasillo, cuatro cuartos y garaje con el auto de los padres. Hay vecinos, señal de celular y la policía tarda poco.',
      detalles: ['Señal de celular en todo el mapa', 'Teléfono fijo en la cocina', 'Llaves del auto: hay que buscarlas', 'Revólver en el dormitorio principal'],
      exterior: 'el jardín', senal: 'global', zonasSenal: [], llaves: 'buscar',
      puertaPrincipal: [14, 20], rutaAuto: [[34, 15], [34, 22.5], [34, 27.2], [51, 27.2]],
      rutaAyuda: [[-3, 27.2], [10, 27.2], [16, 27.2]], ayuda: { quien: 'la policía', eta: [55, 85] },
      intro: 'Una casa de dos plantas en un barrio tranquilo. Los padres se fueron el fin de semana y dejaron el auto en el garaje.',
      hora: 22.5, bosque: false
    },
    {
      id: 'cabana', nombre: 'Cabaña en el bosque', construir: cabana,
      desc: 'Una cabaña aislada en un claro, rodeada de bosque cerrado. Sin señal, salvo en lo alto de la colina. El auto está aparcado fuera.',
      detalles: ['Sin señal: solo en la colina', 'Sin teléfono fijo', 'El conductor tiene las llaves', 'Escopeta vieja sobre la chimenea', 'Hacha en el cobertizo'],
      exterior: 'el bosque', senal: 'zonas', zonasSenal: [[38, 0, 47, 5]], llaves: 'conductor',
      puertaPrincipal: [21, 19], rutaAuto: [[23.5, 22.5], [23.5, 25], [23.5, 32]],
      rutaAyuda: [[23.5, 33], [23.5, 25.5]], ayuda: { quien: 'el sheriff del condado', eta: [130, 180] },
      intro: 'Una cabaña de madera a dos horas del pueblo más cercano. El camino de tierra es la única salida, y el bosque no termina nunca.',
      hora: 22, bosque: true
    },
    {
      id: 'campamento', nombre: 'Campamento del lago', construir: campamento,
      desc: 'Un campamento de verano cerrado junto a un lago: comedor, oficina con radio, tres cabañas, generador y un jeep. Canoa en el muelle.',
      detalles: ['Sin señal de celular', 'Radio en la oficina', 'Llaves del jeep: hay que buscarlas', 'Canoa en el muelle para escapar', 'Hacha junto al generador'],
      exterior: 'el bosque', senal: 'ninguna', zonasSenal: [], llaves: 'buscar',
      puertaPrincipal: [31, 11], rutaAuto: [[46, 18.5], [43.8, 21], [43.8, 32]],
      rutaAyuda: [[43.8, 33], [43.8, 24]], ayuda: { quien: 'los guardabosques', eta: [140, 190] },
      intro: 'Un campamento de verano que lleva años cerrado. Vinieron a limpiarlo antes de la reapertura. El pueblo está a varios kilómetros por un camino de tierra.',
      hora: 22, bosque: true
    },
    {
      id: 'granja', nombre: 'Granja en Texas', construir: granja,
      desc: 'Una granja junto a la carretera: casa vieja, granero enorme y un maizal donde perderse. La camioneta está junto al granero.',
      detalles: ['Señal débil: solo en la carretera', 'Teléfono fijo en la cocina', 'Llaves de la camioneta: hay que buscarlas', 'Rifle de caza en el comedor', 'Maizal: tapa la vista'],
      exterior: 'el patio de la granja', senal: 'zonas', zonasSenal: [[0, 24, 47, 29]], llaves: 'buscar',
      puertaPrincipal: [20, 19], rutaAuto: [[38.5, 18.5], [38.5, 25.5], [51, 25.5]],
      rutaAyuda: [[-3, 25.5], [18, 25.5]], ayuda: { quien: 'el sheriff', eta: [110, 150] },
      intro: 'Se quedaron sin gasolina en una carretera de Texas y caminaron hasta la única casa con luz. Nadie abrió, pero la puerta no tenía llave.',
      hora: 23, bosque: false
    }
  ];

  G.SIM_MAPAS = { MAPAS, rngSemilla };
})(typeof window !== 'undefined' ? window : globalThis);
