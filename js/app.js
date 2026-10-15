/* Interfaz: configurar el grupo, ver la noche en vivo y calcular probabilidades. */
(function () {
  'use strict';
  const D = window.SIM_DATOS, MP = window.SIM_MAPAS, MOTOR = window.SIM_MOTOR, R = window.SIM_RENDER;
  const $ = id => document.getElementById(id);
  const CLAVE = 'noche-slashers-v1';
  const MAX_PERSONAS = 8, MAX_ASESINOS = 6;
  const NOMBRES_EXTRA = ['Sofía', 'Mateo', 'Valentina', 'Santiago', 'Daniela', 'Sebastián', 'Isabella', 'Nicolás', 'Mariana', 'Andrés'];
  const NOMBRES_F = ['Sofía', 'Valentina', 'Daniela', 'Isabella', 'Mariana'];
  const clonar = o => JSON.parse(JSON.stringify(o));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const entero = (v, a, b, def) => { v = parseInt(v, 10); return isNaN(v) ? def : Math.max(a, Math.min(b, v)); };
  const pct = (a, b) => b ? Math.round(100 * a / b) : 0;
  // porcentaje para mostrar: lo que ocurre pero redondea a 0 se muestra como "<1"
  const pctTxt = (a, b) => (a > 0 && pct(a, b) === 0) ? '<1' : String(pct(a, b));

  /* ======================= estado y guardado ======================= */
  function porDefecto() {
    return { personas: clonar(D.GRUPO_EJEMPLO), asesinos: { jason: 1 }, mapa: 'casa', opciones: { celulares: true, traidor: false } };
  }
  function sanear(c) {
    if (!c || !Array.isArray(c.personas) || !c.personas.length) return porDefecto();
    const r = porDefecto();
    r.personas = c.personas.slice(0, MAX_PERSONAS).map(p => {
      const st = {};
      D.STATS.forEach(s => { st[s.id] = entero(p.stats && p.stats[s.id], 1, 10, 5); });
      return {
        nombre: String(p.nombre || 'Sin nombre').slice(0, 24), genero: p.genero === 'f' ? 'f' : 'm', edad: entero(p.edad, 8, 90, 20),
        rol: D.ROLES[p.rol] ? p.rol : 'personalizado', stats: st,
        rasgos: (Array.isArray(p.rasgos) ? p.rasgos : []).filter(x => D.RASGOS[x]).slice(0, 3),
        arma: D.ARMAS[p.arma] ? p.arma : 'ninguna', objeto: D.OBJETOS[p.objeto] ? p.objeto : 'ninguno'
      };
    });
    r.asesinos = {};
    Object.keys(D.ASESINOS).forEach(k => { const n = entero(c.asesinos && c.asesinos[k], 0, MAX_ASESINOS, 0); if (n) r.asesinos[k] = n; });
    r.mapa = MP.MAPAS.some(m => m.id === c.mapa) ? c.mapa : 'casa';
    r.opciones = { celulares: !(c.opciones && c.opciones.celulares === false), traidor: !!(c.opciones && c.opciones.traidor) };
    return r;
  }
  function cargar() { try { const s = localStorage.getItem(CLAVE); return s ? sanear(JSON.parse(s)) : null; } catch (e) { return null; } }
  function guardar() { try { localStorage.setItem(CLAVE, JSON.stringify(cfg)); } catch (e) { /* sin almacenamiento disponible: se sigue sin guardar */ } }

  let cfg = null;
  let sim = null, render = null, semillaActual = 0;
  let pausa = false, vel = 1, acc = 0, ultimo = 0, logVisto = 0, finMostrado = false, fichas = [], cuadro = 0;
  let lote = null;

  /* ======================= configuración ======================= */
  function totalAsesinos() { return Object.values(cfg.asesinos).reduce((a, b) => a + b, 0); }

  function renderGrupo() {
    const cont = $('grupo');
    cont.innerHTML = '';
    cfg.personas.forEach((p, i) => cont.appendChild(tarjetaPersona(p, i)));
    $('btn-agregar').disabled = cfg.personas.length >= MAX_PERSONAS;
    actualizarResumen();
  }

  function opciones(obj, sel) {
    return Object.keys(obj).map(k => '<option value="' + k + '"' + (k === sel ? ' selected' : '') + '>' + esc(obj[k].nombre) + '</option>').join('');
  }

  function tarjetaPersona(p, i) {
    const art = document.createElement('article');
    art.className = 'persona';
    art.style.setProperty('--c', D.COLORES[i % D.COLORES.length]);
    const id = 'p' + i + '-';
    const roles = opciones(D.ROLES, p.rol) + (p.rol === 'personalizado' ? '<option value="personalizado" selected>Personalizado</option>' : '');
    art.innerHTML =
      '<div class="persona-cab">' +
        '<input class="nombre" id="' + id + 'nombre" value="' + esc(p.nombre) + '" maxlength="24" aria-label="Nombre" autocomplete="off">' +
        (i === 0 ? '<span class="insignia" title="Esta persona eres tú">TÚ</span>' : '') +
        '<button class="quitar" type="button" aria-label="Quitar a ' + esc(p.nombre) + '"' + (cfg.personas.length <= 1 ? ' disabled' : '') + '>×</button>' +
      '</div>' +
      '<div class="fila">' +
        '<label class="campo">Rol<select id="' + id + 'rol">' + roles + '</select></label>' +
        '<label class="campo">Edad<input id="' + id + 'edad" type="number" min="8" max="90" value="' + p.edad + '" inputmode="numeric"></label>' +
        '<label class="campo">Es<select id="' + id + 'genero"><option value="m"' + (p.genero !== 'f' ? ' selected' : '') + '>Él</option><option value="f"' + (p.genero === 'f' ? ' selected' : '') + '>Ella</option></select></label>' +
      '</div>' +
      '<div class="stats">' + D.STATS.map(s =>
        '<label class="stat" title="' + esc(s.ayuda) + '"><span>' + s.nombre + '</span><input type="range" min="1" max="10" id="' + id + s.id + '" data-stat="' + s.id + '" value="' + p.stats[s.id] + '"><output>' + p.stats[s.id] + '</output></label>').join('') +
      '</div>' +
      '<div class="fila dos">' +
        '<label class="campo">Arma<select id="' + id + 'arma">' + opciones(D.ARMAS, p.arma) + '</select></label>' +
        '<label class="campo">Lleva<select id="' + id + 'objeto">' + opciones(D.OBJETOS, p.objeto) + '</select></label>' +
      '</div>' +
      '<div class="chips-rasgos" role="group" aria-label="Rasgos de ' + esc(p.nombre) + '">' + Object.keys(D.RASGOS).map(r =>
        '<button type="button" class="chip" data-r="' + r + '" aria-pressed="' + (p.rasgos.indexOf(r) >= 0) + '" title="' + esc(D.RASGOS[r].desc) + '">' + D.RASGOS[r].nombre + '</button>').join('') +
      '</div>' +
      '<p class="ayuda-rasgos">Hasta 3 rasgos. Pasa el cursor por encima de cada uno para ver qué hace.</p>';

    const q = sel => art.querySelector(sel);
    q('.nombre').addEventListener('input', e => { p.nombre = e.target.value.trim() || 'Sin nombre'; guardar(); actualizarResumen(); });
    q('#' + id + 'edad').addEventListener('change', e => { p.edad = entero(e.target.value, 8, 90, 20); e.target.value = p.edad; guardar(); });
    q('#' + id + 'genero').addEventListener('change', e => { p.genero = e.target.value; guardar(); });
    q('#' + id + 'rol').addEventListener('change', e => {
      const r = D.ROLES[e.target.value];
      if (!r) return;
      p.rol = e.target.value; p.stats = Object.assign({}, r.stats); p.rasgos = r.rasgos.slice(); p.arma = r.arma; p.objeto = r.objeto;
      guardar();
      const nueva = tarjetaPersona(p, i);
      art.replaceWith(nueva);
      nueva.querySelector('#' + id + 'rol').focus();
    });
    art.querySelectorAll('input[type=range]').forEach(inp => {
      inp.addEventListener('input', () => {
        p.stats[inp.dataset.stat] = +inp.value;
        inp.nextElementSibling.textContent = inp.value;
        if (p.rol !== 'personalizado') {
          p.rol = 'personalizado';
          const selRol = q('#' + id + 'rol');
          if (!selRol.querySelector('option[value=personalizado]')) selRol.insertAdjacentHTML('beforeend', '<option value="personalizado">Personalizado</option>');
          selRol.value = 'personalizado';
        }
        guardar();
      });
    });
    q('#' + id + 'arma').addEventListener('change', e => { p.arma = e.target.value; guardar(); });
    q('#' + id + 'objeto').addEventListener('change', e => { p.objeto = e.target.value; guardar(); });
    const chips = art.querySelectorAll('.chip');
    const refrescarChips = () => chips.forEach(c => {
      const on = p.rasgos.indexOf(c.dataset.r) >= 0;
      c.setAttribute('aria-pressed', on);
      c.disabled = !on && p.rasgos.length >= 3;
    });
    chips.forEach(c => c.addEventListener('click', () => {
      const r = c.dataset.r, k = p.rasgos.indexOf(r);
      if (k >= 0) p.rasgos.splice(k, 1); else if (p.rasgos.length < 3) p.rasgos.push(r);
      refrescarChips(); guardar();
    }));
    refrescarChips();
    q('.quitar').addEventListener('click', () => {
      if (cfg.personas.length <= 1) return;
      cfg.personas.splice(i, 1); guardar(); renderGrupo();
    });
    return art;
  }

  function agregarPersona() {
    if (cfg.personas.length >= MAX_PERSONAS) return;
    const usados = new Set(cfg.personas.map(p => p.nombre));
    const nombre = NOMBRES_EXTRA.find(n => !usados.has(n)) || ('Persona ' + (cfg.personas.length + 1));
    const r = D.ROLES.normal;
    cfg.personas.push({ nombre, genero: NOMBRES_F.indexOf(nombre) >= 0 ? 'f' : 'm', edad: 20, rol: 'normal', stats: Object.assign({}, r.stats), rasgos: [], arma: r.arma, objeto: r.objeto });
    guardar(); renderGrupo();
    const nuevo = $('grupo').lastElementChild.querySelector('.nombre');
    if (nuevo) { nuevo.focus(); nuevo.select(); }
  }

  function renderAsesinos() {
    const cont = $('asesinos');
    cont.innerHTML = '';
    Object.keys(D.ASESINOS).forEach(clase => {
      const a = D.ASESINOS[clase];
      const art = document.createElement('article');
      art.className = 'asesino';
      art.dataset.clase = clase;
      art.innerHTML =
        '<canvas aria-hidden="true"></canvas>' +
        '<div><h3>' + esc(a.nombre) + '</h3><p class="peli">' + esc(a.pelicula) + '</p></div>' +
        '<p class="resumen">' + esc(a.resumen) + '</p>' +
        '<ul>' + a.rasgosTxt.map(t => '<li>' + esc(t) + '</li>').join('') + '</ul>' +
        '<div class="contador"><span class="etq"></span>' +
          '<button type="button" class="menos" aria-label="Quitar un ' + esc(a.corto) + '">−</button>' +
          '<output aria-live="polite">0</output>' +
          '<button type="button" class="mas" aria-label="Añadir un ' + esc(a.corto) + '">+</button></div>';
      cont.appendChild(art);
      art.querySelector('.menos').addEventListener('click', () => cambiarAsesino(clase, -1));
      art.querySelector('.mas').addEventListener('click', () => cambiarAsesino(clase, +1));
    });
    requestAnimationFrame(() => cont.querySelectorAll('.asesino').forEach(art => R.retrato(art.querySelector('canvas'), art.dataset.clase, 0)));
    actualizarAsesinos();
  }

  function cambiarAsesino(clase, d) {
    const n = (cfg.asesinos[clase] || 0) + d;
    if (n < 0 || (d > 0 && totalAsesinos() >= MAX_ASESINOS)) return;
    if (n === 0) delete cfg.asesinos[clase]; else cfg.asesinos[clase] = n;
    guardar(); actualizarAsesinos(); actualizarResumen();
  }

  function actualizarAsesinos() {
    const total = totalAsesinos();
    document.querySelectorAll('.asesino').forEach(art => {
      const clase = art.dataset.clase, a = D.ASESINOS[clase], n = cfg.asesinos[clase] || 0;
      art.classList.toggle('elegido', n > 0);
      art.querySelector('output').textContent = n;
      art.querySelector('.menos').disabled = n === 0;
      art.querySelector('.mas').disabled = total >= MAX_ASESINOS;
      let etq = n === 0 ? 'No participa' : (n === 1 ? 'Participa' : n + ' a la vez');
      if (a.nombres && n > 0) etq = a.nombres.slice(0, n).join(', ');
      art.querySelector('.etq').textContent = etq;
    });
  }

  function renderMapas() {
    const cont = $('mapas');
    cont.innerHTML = '';
    MP.MAPAS.forEach(m => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'mapa'; b.dataset.id = m.id;
      b.setAttribute('aria-pressed', cfg.mapa === m.id);
      b.innerHTML = '<canvas aria-hidden="true"></canvas><div class="mapa-texto"><h3>' + esc(m.nombre) + '</h3><p>' + esc(m.desc) + '</p><ul>' +
        m.detalles.map(d => '<li>' + esc(d) + '</li>').join('') + '</ul></div>';
      b.addEventListener('click', () => {
        cfg.mapa = m.id; guardar();
        cont.querySelectorAll('.mapa').forEach(x => x.setAttribute('aria-pressed', x.dataset.id === m.id));
        actualizarResumen();
      });
      cont.appendChild(b);
    });
    requestAnimationFrame(() => cont.querySelectorAll('.mapa').forEach(b => R.miniaturaMapa(b.querySelector('canvas'), MOTOR.vistaMapa(b.dataset.id))));
  }

  function actualizarResumen() {
    const mapa = MP.MAPAS.find(m => m.id === cfg.mapa);
    const ases = Object.keys(cfg.asesinos).map(k => {
      const n = cfg.asesinos[k], a = D.ASESINOS[k];
      if (a.nombres) return n + ' ' + a.corto.toLowerCase() + (n === 1 ? '' : (a.corto.endsWith('l') ? 'es' : 's'));
      return n > 1 ? n + '× ' + a.corto : a.corto;
    });
    const ok = ases.length > 0;
    $('resumen').innerHTML = '<b>' + cfg.personas.length + (cfg.personas.length === 1 ? ' persona' : ' personas') + '</b> contra ' +
      (ok ? '<b>' + esc(ases.join(', ')) + '</b>' : '<span class="error">nadie: elige al menos un asesino</span>') +
      ' en <b>' + esc(mapa.nombre.toLowerCase()) + '</b>';
    $('btn-ver').disabled = !ok; $('btn-prob').disabled = !ok;
  }

  function configMotor(semilla) {
    return {
      mapa: cfg.mapa,
      personas: cfg.personas.map(p => ({ nombre: p.nombre, genero: p.genero, edad: p.edad, stats: Object.assign({}, p.stats), rasgos: p.rasgos.slice(), arma: p.arma, objeto: p.objeto })),
      asesinos: Object.assign({}, cfg.asesinos),
      opciones: { celulares: cfg.opciones.celulares, traidor: cfg.opciones.traidor },
      semilla
    };
  }

  function semillaElegida() {
    const v = parseInt($('op-semilla').value, 10);
    return v > 0 ? v : 1 + Math.floor(Math.random() * 999999);
  }

  /* ======================= pantallas ======================= */
  function mostrar(cual) {
    $('pantalla-config').hidden = cual !== 'config';
    $('pantalla-sim').hidden = cual !== 'sim';
    $('pantalla-lote').hidden = cual !== 'lote';
    $('barra-config').hidden = cual !== 'config';
    $('final').hidden = true;
    $('tip').hidden = true;
    window.scrollTo(0, 0);
  }

  /* ======================= simulación en vivo ======================= */
  function iniciarNoche(semilla) {
    if (!totalAsesinos()) return;
    mostrar('sim');
    semillaActual = semilla;
    sim = new MOTOR.Simulacion(configMotor(semilla));
    if (!render) {
      render = new R.Render($('lienzo'));
      render.seguir = window.matchMedia('(max-width: 700px)').matches;
      $('lienzo').addEventListener('click', clicLienzo);
    }
    render.usarSim(sim);
    render.ajustar();
    if (render.w) render.actualizarCamara(0, true);
    acc = 0; logVisto = 0; finMostrado = false; cuadro = 0; chipsHtml = '';
    $('relato').innerHTML = '';
    construirFichas();
    ponerPausa(false);
    actualizarBotonCamara();
  }

  function ponerPausa(v) {
    pausa = v;
    $('btn-pausa').textContent = pausa ? '▶' : '❚❚';
    $('btn-pausa').setAttribute('aria-label', pausa ? 'Continuar' : 'Pausar');
    $('sim-barra').classList.toggle('pausado', pausa);
  }

  function actualizarBotonCamara() {
    $('btn-camara').textContent = render && render.seguir ? 'Ver todo el mapa' : 'Seguir la acción';
  }

  function clicLienzo(ev) {
    if (!render || !sim) return;
    const r = $('lienzo').getBoundingClientRect();
    const e = render.elegir(ev.clientX - r.left, ev.clientY - r.top);
    seleccionar(e && render.seleccion === e ? null : e);
  }

  function seleccionar(e) {
    render.seleccion = e || null;
    if (e) render.seguir = true;
    actualizarBotonCamara();
    fichas.forEach(f => f.el.classList.toggle('sel', f.e === e));
  }

  function bucle(ts) {
    requestAnimationFrame(bucle);
    if (!sim || $('pantalla-sim').hidden) { ultimo = ts; return; }
    const dt = Math.min(0.1, Math.max(0, (ts - ultimo) / 1000));
    ultimo = ts;
    if (!pausa && !sim.fin) {
      acc += dt * vel;
      let n = 0;
      while (acc >= MOTOR.DT && n < 120 && !sim.fin) { sim.paso(); acc -= MOTOR.DT; n++; }
      if (sim.fin) acc = 0;
    }
    render.dibujar(pausa || sim.fin ? 1 : Math.min(1, acc / MOTOR.DT));
    cuadro++;
    actualizarRelato();
    if (cuadro % 6 === 0) { actualizarFichas(); actualizarChips(); }
    $('reloj').textContent = sim.hora();
    if (sim.fin && !finMostrado) {
      finMostrado = true;
      actualizarFichas(); actualizarChips();
      setTimeout(mostrarFinal, 1400);
    }
  }

  /* ---------- panel de estado ---------- */
  function construirFichas() {
    $('estado').innerHTML = ''; fichas = [];
    sim.sob.forEach(s => agregarFicha(s, false));
    sim.ase.forEach(k => agregarFicha(k, true));
  }
  function agregarFicha(e, esAsesino) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ficha' + (esAsesino ? ' asesino-ficha' : '');
    b.style.setProperty('--c', esAsesino ? '#d2463a' : e.color);
    b.innerHTML = '<div class="top"><span class="punto"></span><span class="nom">' + esc(e.nombre) + '</span><span class="tag"></span></div>' +
      '<div class="accion"></div>' +
      '<div class="medidores"><div class="medidor vida"><i></i></div>' + (esAsesino ? '<div></div>' : '<div class="medidor miedo"><i></i></div>') + '</div>' +
      '<div class="etq-med"><span>Vida</span><span class="der">' + (esAsesino ? '' : 'Miedo') + '</span></div>';
    b.addEventListener('click', () => seleccionar(render.seleccion === e ? null : e));
    $('estado').appendChild(b);
    fichas.push({ e, el: b, asesino: esAsesino, accion: b.querySelector('.accion'), tag: b.querySelector('.tag'), vida: b.querySelector('.vida i'), miedo: b.querySelector('.miedo i'), der: b.querySelector('.der') });
  }

  const ACT = { reunion: 'Con el grupo', cocina: 'En la cocina', bano: 'En el baño', afuera: 'Afuera, sin nadie cerca', pasear: 'Dando una vuelta', dormir: 'Va a dormir', trastero: 'Buscando algo' };
  const TAREA = {
    buscarLlaves: 'Busca las llaves en {l}', recogerLlaves: 'Recoge las llaves', reparar: 'Repara el vehículo', llamar: 'Pide ayuda',
    barricada: 'Atranca una entrada', curar: 'Cura a {o}', rematar: 'Remata al asesino', comprobar: 'Se acerca a ver si está muerto',
    investigar: 'Investiga un ruido en {l}', fusibles: 'Va a revisar los fusibles', abrir: 'Va a abrir la puerta', cebo: 'Va a ver qué pasó en {l}', tomar: 'Va a agarrar algo'
  };

  function nombrePlan(pl) {
    if (!pl) return '';
    switch (pl.tipo) {
      case 'auto': return 'escapar en ' + sim.vehiculo;
      case 'llamar': return 'pedir ayuda';
      case 'atrincherarse': return 'atrincherarse en ' + sim.M.salas[pl.refugio].nombre;
      case 'enfrentar': return 'cazar al asesino';
      case 'huir': return 'huir a pie';
      case 'canoa': return 'huir en la canoa';
      default: return 'esconderse hasta que amanezca';
    }
  }

  function textoPersona(s) {
    const o = s.g === 'f' ? 'a' : 'o';
    if (s.esAsesino) return 'Se quitó la careta: es Ghostface';
    if (!s.vivo) return s.muerte ? s.muerte.causa + ' · ' + s.muerte.lugar + ' · ' + s.muerte.hora : 'Muert' + o;
    if (s.escapado) return s.destino;
    if (s.enAuto) return 'Dentro de ' + sim.vehiculo;
    if (s.agarradoPor) { const k = sim.ase.find(x => x.id === s.agarradoPor); return '¡' + (k ? k.corto : 'El asesino') + ' l' + o + ' tiene agarrad' + o + '!'; }
    if (s.atrapado > 0) return 'Atrapad' + o + ' en una trampa';
    const l = sim.lugar(s.x, s.y);
    if (s.oculto) return 'Escondid' + o + ' en ' + l;
    if (s.durmiendo) return 'Duerme en ' + l;
    const it = s.intent || {};
    if (it.modo === 'atacar' && it.k) return 'Pelea con ' + it.k.corto;
    if (it.modo === 'disparar' && it.k) return 'Dispara a ' + it.k.corto + ' (' + s.municion + ' balas)';
    if (it.huyendo) return s.panico ? 'Huye en pánico' : 'Huye de ' + (s.amen ? s.amen.k.corto : 'algo');
    if (s.tarea && TAREA[s.tarea.tipo]) {
      const t = s.tarea;
      return TAREA[t.tipo].replace('{l}', t.tile >= 0 ? sim.lugar(sim.cx(t.tile), sim.cy(t.tile)) : l).replace('{o}', t.o ? (t.o === s ? 'sus heridas' : t.o.nombre) : '');
    }
    if (s.panico) return 'En pánico';
    if (s.alerta < 2 || s.traidor) {
      const a = s.actividad ? ACT[s.actividad.tipo] : null;
      return (a || 'Con el grupo') + (s.sospecha >= 1.5 && !s.traidor ? ' (algo l' + o + ' inquieta)' : '');
    }
    if (sim.plan) {
      const lider = sim.liderPlan();
      if (lider === s) return 'Guía al grupo: ' + nombrePlan(sim.plan);
      if (lider) return 'Sigue a ' + lider.nombre + ' (' + nombrePlan(sim.plan) + ')';
    }
    return 'Alerta en ' + l;
  }

  function textoAsesino(k) {
    if (k.fuera) return 'Todavía no ha llegado';
    if (k.muerto || k.neutralizado || k.huido) return k.estadoFinal || 'Fuera de combate';
    if (k.derribado > 0) return 'En el suelo… por ahora';
    if (k.fingido > 0) return 'Parece muerto';
    if (k.agarre) return 'Tiene agarrado a ' + k.agarre.s.nombre;
    if (k.tareaSab) return { luz: 'Corta la luz', auto: 'Sabotea ' + sim.vehiculo, trampa: 'Pone una trampa' }[k.tareaSab.tipo];
    if (k.arrastrando) return 'Arrastra un cuerpo';
    if (k.retirada > 0) return 'Se retira a recuperarse';
    if (k.aturdido > 0) return 'Aturdido';
    const l = sim.lugar(k.x, k.y);
    const it = k.intent || {};
    if (it.modo === 'cazar' && it.s) return (it.ritmo === 0 ? 'Se acerca en silencio a ' : 'Persigue a ') + it.s.nombre;
    if (it.modo === 'emboscado') return 'Espera escondido en ' + l;
    if (k.busqueda && k.busqueda.length) return 'Revisa los escondites';
    return (k.agresivo ? 'Busca víctimas en ' : 'Acecha desde ') + l;
  }

  function actualizarFichas() {
    const nAse = fichas.filter(f => f.asesino).length;
    if (sim.ase.length > nAse) sim.ase.slice(nAse).forEach(k => agregarFicha(k, true));
    for (const f of fichas) {
      const e = f.e;
      if (f.asesino) {
        f.tag.textContent = e.fuera ? 'En camino' : e.muerto ? 'Muerto' : e.neutralizado ? 'Fuera de combate' : e.huido ? 'Se fue' : e.derribado > 0 ? 'En el suelo' : (e.agresivo ? 'Atacando' : 'Acechando');
        f.accion.textContent = textoAsesino(e);
        f.vida.style.width = Math.max(0, 100 * e.hp / e.hpMax) + '%';
        f.der.textContent = 'Víctimas: ' + e.kills;
        f.el.classList.toggle('muerta', e.muerto || e.neutralizado || e.huido);
      } else {
        const o = e.g === 'f' ? 'a' : 'o';
        let tag;
        if (e.esAsesino) tag = 'Traidor';
        else if (!e.vivo) tag = 'Muert' + o;
        else if (e.escapado) tag = 'A salvo';
        else if (e.enAuto) tag = 'En el vehículo';
        else if (e.panico) tag = 'Pánico';
        else if (e.oculto) tag = 'Escondid' + o;
        else if (e.hp < e.hpMax * 0.5) tag = 'Herid' + o;
        else tag = e.alerta >= 2 ? 'Alerta' : 'Tranquil' + o;
        f.tag.textContent = tag;
        f.accion.textContent = textoPersona(e);
        f.vida.style.width = Math.max(0, 100 * e.hp / e.hpMax) + '%';
        if (f.miedo) f.miedo.style.width = Math.round(e.miedo) + '%';
        f.el.classList.toggle('muerta', !e.vivo || e.esAsesino);
        f.el.classList.toggle('salvo', !!e.escapado);
      }
    }
  }

  let chipsHtml = '';
  function actualizarChips() {
    const partes = ['<span class="estado-chip">Noche nº <b>' + semillaActual + '</b></span>'];
    if (sim.plan) {
      const l = sim.sob.find(s => s.id === sim.plan.lider);
      partes.push('<span class="estado-chip plan">Plan: <b>' + esc(nombrePlan(sim.plan)) + '</b>' + (l ? ' · lo guía ' + esc(l.nombre) : '') + '</span>');
    } else if (!sim.alertaGeneral) partes.push('<span class="estado-chip">Nadie sospecha nada todavía</span>');
    if (!sim.luz) partes.push('<span class="estado-chip alerta">Sin luz</span>');
    if (sim.ayuda) {
      const q = sim.ayuda.quien.charAt(0).toUpperCase() + sim.ayuda.quien.slice(1);
      if (sim.ayuda.fase === 'escena') partes.push('<span class="estado-chip ayuda">' + esc(q) + ' <b>ya llegó</b></span>');
      else {
        const min = Math.max(1, Math.round((sim.horasDesdeInicio(sim.ayuda.llega) - sim.horasDesdeInicio(sim.t)) * 60));
        partes.push('<span class="estado-chip ayuda">' + esc(q) + ' <b>llega en ' + min + ' min</b></span>');
      }
    }
    const personas = sim.sob.filter(s => !s.esAsesino && !s.traidor);
    const muertos = personas.filter(s => !s.vivo).length, salvos = personas.filter(s => s.escapado).length;
    partes.push('<span class="estado-chip">Muertos <b>' + muertos + '</b>' + (salvos ? ' · A salvo <b>' + salvos + '</b>' : '') + '</span>');
    const html = partes.join('');
    if (html !== chipsHtml) { chipsHtml = html; $('chips').innerHTML = html; }
  }

  /* ---------- relato ---------- */
  const ETIQUETA = { ambiente: 'Ambiente', asesino: 'Asesino', grupo: 'Grupo', plan: 'Plan', combate: 'Pelea', muerte: 'Muerte', final: 'Final', dialogo: 'Llamada' };
  function actualizarRelato() {
    if (logVisto >= sim.log.length) return;
    const lista = $('relato');
    const abajo = lista.scrollTop + lista.clientHeight >= lista.scrollHeight - 60;
    const frag = document.createDocumentFragment();
    while (logVisto < sim.log.length) {
      const e = sim.log[logVisto++];
      const li = document.createElement('li');
      li.className = 'ev-' + e.tipo + (e.imp ? ' imp' : '');
      if (e.x !== null && e.x !== undefined) { li.dataset.x = e.x; li.dataset.y = e.y; li.title = 'Ver dónde pasó'; }
      li.innerHTML = '<div class="meta"><time>' + e.hora + '</time><span class="etq">' + (ETIQUETA[e.tipo] || '') + '</span></div><p>' + esc(e.texto) + '</p>';
      frag.appendChild(li);
      if ((e.tipo === 'muerte' || (e.imp && e.tipo === 'combate')) && e.x !== null && render) render.foco = { x: e.x, y: e.y, t: sim.t };
    }
    lista.appendChild(frag);
    if (abajo) lista.scrollTop = lista.scrollHeight;
  }

  /* ---------- final ---------- */
  function mostrarFinal() {
    if (!sim || !sim.fin || $('pantalla-sim').hidden) return;
    const f = sim.fin;
    const personas = f.personas.filter(p => !p.traidor);
    const vivos = personas.filter(p => p.vivo).length;
    const clase = vivos === 0 ? 'masacre' : (vivos === personas.length ? 'bien' : '');
    const lis = f.personas.map(p => {
      let que;
      if (p.traidor) que = 'Se puso la máscara de Ghostface.';
      else if (p.vivo) que = p.destino;
      else { const m = p.muerte; que = m.causa + ' en ' + m.lugar + ' a las ' + m.hora + (m.por ? ' · ' + m.por : ''); }
      return '<li class="' + (p.traidor ? 'traidor' : (p.vivo ? 'vivo' : 'muerto')) + '" style="--c:' + p.color + '"><span class="punto"></span><span class="quien">' + esc(p.nombre) + '</span><span class="que">' + esc(que) + '</span></li>';
    }).join('');
    const ases = f.asesinos.map(a => '<span><b>' + esc(a.nombre) + '</b>: ' + esc(a.estado) + ' · ' + a.kills + (a.kills === 1 ? ' víctima' : ' víctimas') + '</span>').join('');
    const momentos = sim.momentos.slice(1, 19).map(m => '<li><b>' + m.hora + '</b> ' + esc(m.texto) + '</li>').join('');
    const el = $('final');
    el.innerHTML = '<div class="final-caja">' +
      '<p class="final-meta">' + f.hora + ' · Noche nº ' + semillaActual + ' · ' + esc(f.causa) + '</p>' +
      '<h2 id="final-titulo" class="' + clase + '">' + esc(f.titulo) + '</h2>' +
      '<ul class="destinos">' + lis + '</ul>' +
      '<p class="final-asesinos">' + ases + '</p>' +
      '<details><summary>Momentos clave de la noche</summary><ol>' + momentos + '</ol></details>' +
      '<div class="final-botones">' +
        '<button type="button" class="btn btn-primario" data-a="otra">Otra noche</button>' +
        '<button type="button" class="btn btn-sec" data-a="repetir">Repetir esta noche</button>' +
        '<button type="button" class="btn btn-sec" data-a="prob">Calcular probabilidades</button>' +
        '<button type="button" class="btn btn-sec" data-a="mirar">Volver al mapa</button>' +
        '<button type="button" class="btn btn-sec" data-a="config">Cambiar el grupo</button>' +
      '</div></div>';
    el.hidden = false;
    el.querySelector('[data-a=otra]').focus();
    el.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => accionFinal(b.dataset.a)));
  }
  function accionFinal(a) {
    $('final').hidden = true;
    if (a === 'otra') iniciarNoche(1 + Math.floor(Math.random() * 999999));
    else if (a === 'repetir') iniciarNoche(semillaActual);
    else if (a === 'prob') calcularProbabilidades(100, false);
    else if (a === 'config') mostrar('config');
  }

  /* ======================= probabilidades ======================= */
  function calcularProbabilidades(n, sumar) {
    if (!totalAsesinos()) return;
    mostrar('lote');
    const conf = configMotor(0);
    if (!sumar || !lote) lote = { acc: MOTOR.crearAcumulador(conf), noches: [], conf, base: 1 + Math.floor(Math.random() * 900000) };
    const mapa = MP.MAPAS.find(m => m.id === lote.conf.mapa);
    $('lote-desc').textContent = 'Se simulan noches completas con tu grupo (' + lote.conf.personas.map(p => p.nombre).join(', ') + ') en ' + mapa.nombre.toLowerCase() +
      '. En cada noche cambia el azar: quién se separa, quién ve primero al asesino, si un disparo acierta. Así se ve qué tan probable es cada final.';
    $('lote-res').hidden = true;
    ['btn-lote-peor', 'btn-lote-mejor', 'btn-lote-mas'].forEach(id => { $(id).hidden = true; });
    let hechas = 0;
    $('lote-estado').textContent = 'Preparando el mapa…';
    $('lote-barra').style.width = '0%';
    const correr = () => {
      if ($('pantalla-lote').hidden) return;
      const t0 = performance.now();
      while (hechas < n && performance.now() - t0 < 40) {
        const semilla = lote.base + lote.acc.n * 7919;
        const fin = MOTOR.ejecutarUna(lote.conf, semilla);
        MOTOR.acumular(lote.acc, fin);
        const pers = fin.personas.filter(p => !p.traidor);
        lote.noches.push({ semilla, vivos: pers.filter(p => p.vivo).length, total: pers.length });
        hechas++;
      }
      $('lote-barra').style.width = pct(hechas, n) + '%';
      $('lote-estado').textContent = lote.acc.n + ' noches simuladas';
      if (hechas < n) setTimeout(correr, 0); else mostrarLote();
    };
    setTimeout(correr, 30);
  }

  function mostrarLote() {
    const a = lote.acc, N = a.n, noches = lote.noches;
    const alguno = noches.filter(x => x.vivos > 0).length, todos = noches.filter(x => x.vivos === x.total).length, nadie = N - alguno;
    const prom = noches.reduce((s, x) => s + x.vivos, 0) / N;
    const nombres = a.nombres;
    const personaPct = nombres.map((nm, i) => { const posibles = N - a.traidor[i]; return posibles ? a.vivos[i] / posibles : 0; });
    let mejorI = 0, peorI = 0;
    personaPct.forEach((v, i) => { if (v > personaPct[mejorI]) mejorI = i; if (v < personaPct[peorI]) peorI = i; });
    const fmt = v => v.toFixed(1).replace('.', ',');
    const frase = 'En ' + N + ' noches, alguien salió con vida en ' + alguno + '. ' +
      (nombres.length > 1 ? nombres[mejorI] + ' es quien más sobrevive (' + Math.round(personaPct[mejorI] * 100) + '%) y ' + nombres[peorI] + ' quien menos (' + Math.round(personaPct[peorI] * 100) + '%).' : '');
    let html = '<p>' + esc(frase) + '</p><div class="titulares">' +
      titular(pct(alguno, N) + '%', 'Alguien sobrevive') + titular(pct(todos, N) + '%', 'Sobreviven todos') +
      titular(pct(nadie, N) + '%', 'No sobrevive nadie') + titular(fmt(prom), 'Sobrevivientes por noche, de ' + (noches[0] ? noches[0].total : nombres.length)) +
      '</div>';

    html += '<h3>Probabilidad de sobrevivir, persona por persona</h3><div class="barras">' + nombres.map((nm, i) => {
      const causas = Object.entries(a.muertes[i]).sort((x, y) => y[1] - x[1]);
      const muertes = causas.reduce((s, c) => s + c[1], 0);
      const nota = (causas.length ? 'Cuando muere, suele ser: ' + causas[0][0].toLowerCase() + ' (' + pct(causas[0][1], muertes) + '%).' : 'No murió en ninguna noche.') +
        (a.traidor[i] ? ' Fue el traidor en ' + a.traidor[i] + ' noches.' : '');
      const v = Math.round(personaPct[i] * 100);
      return '<div class="barra-fila" data-tip="' + esc(nm + ': sobrevivió ' + a.vivos[i] + ' de ' + (N - a.traidor[i]) + ' noches. ' + nota) + '">' +
        '<span class="quien"><span class="punto" style="--c:' + D.COLORES[i % 8] + '"></span><span>' + esc(nm) + '</span></span>' +
        '<span class="pista"><i style="width:' + v + '%"></i></span><span class="valor">' + v + '%</span>' +
        '<span class="nota">' + esc(nota) + '</span></div>';
    }).join('') + '</div>';

    const maxH = Math.max(1, ...a.hist);
    html += '<h3>¿Cuántos siguen vivos al final?</h3><div class="histograma">' + a.hist.map((h, k) =>
      '<div class="columna" data-tip="' + esc(k + (k === 1 ? ' superviviente' : ' supervivientes') + ': ' + h + ' de ' + N + ' noches') + '"><span class="v">' + pct(h, N) + '%</span><i style="height:' + Math.round(100 * h / maxH * 0.86) + '%"></i></div>').join('') +
      '</div><div class="ejes">' + a.hist.map((h, k) => '<span>' + k + '</span>').join('') + '</div>' +
      '<div class="ejes"><span>personas vivas al terminar la noche</span></div>';

    const NOMBRE_FINAL = { escape: 'Escapan en el vehículo', huida: 'Huyen a pie o en canoa', rescate: 'Llega la ayuda a tiempo', amanecer: 'Aguantan hasta el amanecer', victoria: 'Detienen a los asesinos', masacre: 'Mueren todos' };
    html += '<h3>Cómo termina la noche</h3><table class="tabla"><tbody>' + Object.entries(a.finales).sort((x, y) => y[1] - x[1]).map(f =>
      '<tr><td>' + esc(NOMBRE_FINAL[f[0]] || f[0]) + '</td><td>' + pctTxt(f[1], N) + '%</td></tr>').join('') + '</tbody></table>';

    const totalMuertes = Object.values(a.causas).reduce((s, v) => s + v, 0);
    if (totalMuertes) {
      html += '<h3>Cómo mueren</h3><table class="tabla"><tbody>' + Object.entries(a.causas).sort((x, y) => y[1] - x[1]).map(c =>
        '<tr><td>' + esc(c[0]) + '</td><td>' + pctTxt(c[1], totalMuertes) + '%</td></tr>').join('') + '</tbody></table>';
    }
    html += '<h3>Los asesinos</h3><table class="tabla"><tbody>' + Object.entries(a.asesinos).map(k =>
      '<tr><td>' + esc(k[0]) + ': víctimas por noche</td><td>' + fmt(k[1] / N) + '</td></tr>').join('') +
      '<tr><td>Noches en que todos los asesinos acaban muertos, rematados o huyendo</td><td>' + pct(a.asesinoCae, N) + '%</td></tr></tbody></table>';

    const res = $('lote-res');
    res.innerHTML = html; res.hidden = false;
    $('lote-estado').textContent = N + ' noches simuladas';
    ['btn-lote-peor', 'btn-lote-mejor', 'btn-lote-mas'].forEach(id => { $(id).hidden = false; });
    activarTips(res);
  }
  function titular(num, txt) { return '<div class="titular"><div class="num">' + num + '</div><div class="txt">' + esc(txt) + '</div></div>'; }

  function activarTips(raiz) {
    const tip = $('tip');
    raiz.querySelectorAll('[data-tip]').forEach(el => {
      el.addEventListener('pointerenter', () => { tip.textContent = el.dataset.tip; tip.hidden = false; });
      el.addEventListener('pointermove', ev => {
        const w = tip.offsetWidth, h = tip.offsetHeight;
        tip.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, ev.clientX + 14)) + 'px';
        tip.style.top = Math.max(8, ev.clientY - h - 10) + 'px';
      });
      el.addEventListener('pointerleave', () => { tip.hidden = true; });
    });
  }

  function verNocheDelLote(peor) {
    if (!lote || !lote.noches.length) return;
    const orden = lote.noches.slice().sort((x, y) => peor ? x.vivos - y.vivos : y.vivos - x.vivos);
    iniciarNoche(orden[0].semilla);
  }

  /* ======================= eventos generales ======================= */
  function conectar() {
    $('btn-agregar').addEventListener('click', agregarPersona);
    $('op-celulares').checked = cfg.opciones.celulares;
    $('op-traidor').checked = cfg.opciones.traidor;
    $('op-celulares').addEventListener('change', e => { cfg.opciones.celulares = e.target.checked; guardar(); });
    $('op-traidor').addEventListener('change', e => { cfg.opciones.traidor = e.target.checked; guardar(); });
    $('btn-ver').addEventListener('click', () => iniciarNoche(semillaElegida()));
    $('btn-prob').addEventListener('click', () => calcularProbabilidades(100, false));
    $('btn-pausa').addEventListener('click', () => ponerPausa(!pausa));
    document.querySelectorAll('.velocidades button').forEach(b => b.addEventListener('click', () => {
      vel = +b.dataset.vel;
      document.querySelectorAll('.velocidades button').forEach(x => x.classList.toggle('activo', x === b));
    }));
    $('btn-camara').addEventListener('click', () => {
      render.seguir = !render.seguir;
      if (!render.seguir) seleccionar(null);
      actualizarBotonCamara();
    });
    $('solo-imp').addEventListener('change', e => $('relato').classList.toggle('solo-imp', e.target.checked));
    $('relato').addEventListener('click', ev => {
      const li = ev.target.closest('li[data-x]');
      if (!li || !render) return;
      render.foco = { x: +li.dataset.x, y: +li.dataset.y, t: sim.t };
      render.seleccion = null; render.seguir = true; actualizarBotonCamara();
      if (!pausa) ponerPausa(true);
    });
    $('btn-config').addEventListener('click', () => mostrar('config'));
    $('btn-repetir').addEventListener('click', () => iniciarNoche(semillaActual));
    $('btn-otra').addEventListener('click', () => iniciarNoche(1 + Math.floor(Math.random() * 999999)));
    $('btn-prob-sim').addEventListener('click', () => calcularProbabilidades(100, false));
    $('btn-lote-volver').addEventListener('click', () => mostrar('config'));
    $('btn-lote-peor').addEventListener('click', () => verNocheDelLote(true));
    $('btn-lote-mejor').addEventListener('click', () => verNocheDelLote(false));
    $('btn-lote-mas').addEventListener('click', () => calcularProbabilidades(100, true));
    document.addEventListener('keydown', ev => {
      if (!$('final').hidden && ev.key === 'Escape') { $('final').hidden = true; return; }
      if ($('pantalla-sim').hidden) return;
      const tag = (ev.target && ev.target.tagName) || '';
      if (ev.key === ' ' && tag !== 'INPUT' && tag !== 'BUTTON' && tag !== 'SELECT') { ev.preventDefault(); ponerPausa(!pausa); }
    });
  }

  function arrancar(datos) {
    cfg = datos && datos.cfg ? sanear(datos.cfg) : (cargar() || porDefecto());
    renderGrupo(); renderAsesinos(); renderMapas(); conectar(); actualizarResumen();
    mostrar('config');
    requestAnimationFrame(bucle);
    const h = window.claude && window.claude.hot;
    if (h && h.snapshot) h.snapshot(() => ({ cfg }));
  }

  const hot = window.claude && window.claude.hot;
  if (hot && hot.ready) hot.ready(arrancar); else arrancar((hot && hot.data) || {});
})();
