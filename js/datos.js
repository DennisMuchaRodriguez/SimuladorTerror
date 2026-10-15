/* Datos del simulador: estadísticas, roles, rasgos, armas y asesinos.
   Los asesinos están modelados según cómo se comportan en sus películas. */
(function (G) {
  'use strict';

  const STATS = [
    { id: 'fue', nombre: 'Fuerza', ayuda: 'Daño cuerpo a cuerpo, forcejeos, barricadas' },
    { id: 'vel', nombre: 'Velocidad', ayuda: 'Velocidad al correr y aguante' },
    { id: 'int', nombre: 'Inteligencia', ayuda: 'Calidad del plan, encontrar cosas, reparar' },
    { id: 'val', nombre: 'Valentía', ayuda: 'Resistencia al pánico, se atreve a pelear' },
    { id: 'sig', nombre: 'Sigilo', ayuda: 'Esconderse y moverse sin ruido' },
    { id: 'pun', nombre: 'Puntería', ayuda: 'Precisión con armas de fuego' }
  ];

  const RASGOS = {
    lider: { nombre: 'Líder', desc: 'Mantiene unido al grupo y calma a los demás.' },
    estratega: { nombre: 'Estratega', desc: 'Elige mejores planes y sabe que el asesino puede levantarse.' },
    peleador: { nombre: 'Sabe pelear', desc: 'Golpea más fuerte, esquiva y se zafa de agarres.' },
    atleta: { nombre: 'Atleta', desc: 'Corre más rápido y aguanta más tiempo.' },
    medico: { nombre: 'Médico', desc: 'Cura heridas y detiene sangrados.' },
    mecanico: { nombre: 'Mecánico', desc: 'Repara autos, generadores y radios.' },
    heroe: { nombre: 'Héroe', desc: 'Arriesga la vida para salvar a otros.' },
    egoista: { nombre: 'Egoísta', desc: 'Si tiene la oportunidad, se salva solo.' },
    miedoso: { nombre: 'Miedoso', desc: 'Entra en pánico con facilidad.' },
    distraido: { nombre: 'Fiestero', desc: 'Se aleja del grupo y tarda en darse cuenta del peligro.' },
    conoce: { nombre: 'Conoce el lugar', desc: 'Sabe dónde están las llaves, las armas y las salidas.' }
  };

  const ARMAS = {
    ninguna: { nombre: 'Sin arma', tipo: 'melee', danio: [4, 9], cadencia: 0.8 },
    cuchillo: { nombre: 'Cuchillo', tipo: 'melee', danio: [14, 26], cadencia: 0.8 },
    bate: { nombre: 'Bate', tipo: 'melee', danio: [13, 23], cadencia: 1.0, aturde: 0.6 },
    machete: { nombre: 'Machete', tipo: 'melee', danio: [20, 36], cadencia: 1.0 },
    hacha: { nombre: 'Hacha', tipo: 'melee', danio: [26, 44], cadencia: 1.3, aturde: 0.4 },
    pistola: { nombre: 'Pistola', tipo: 'fuego', danio: [22, 34], municion: 15, alcance: 14, cadencia: 0.7, culata: [6, 11] },
    revolver: { nombre: 'Revólver', tipo: 'fuego', danio: [28, 42], municion: 6, alcance: 13, cadencia: 1.0, culata: [6, 11] },
    escopeta: { nombre: 'Escopeta', tipo: 'fuego', danio: [45, 80], municion: 6, alcance: 8, cadencia: 1.4, cerca: true, culata: [9, 15] },
    rifle: { nombre: 'Rifle de caza', tipo: 'fuego', danio: [40, 66], municion: 5, alcance: 22, cadencia: 1.8, culata: [9, 15] }
  };

  const OBJETOS = {
    ninguno: { nombre: 'Nada' },
    linterna: { nombre: 'Linterna' },
    botiquin: { nombre: 'Botiquín' }
  };

  // Plantillas de personaje. Al elegir un rol se rellenan las estadísticas.
  const ROLES = {
    normal: { nombre: 'Normal', stats: { fue: 5, vel: 5, int: 5, val: 5, sig: 5, pun: 3 }, rasgos: [], arma: 'ninguna', objeto: 'ninguno' },
    lider: { nombre: 'Líder', stats: { fue: 6, vel: 6, int: 7, val: 8, sig: 5, pun: 4 }, rasgos: ['lider'], arma: 'ninguna', objeto: 'linterna' },
    armado: { nombre: 'Armado', stats: { fue: 6, vel: 5, int: 5, val: 7, sig: 4, pun: 7 }, rasgos: [], arma: 'pistola', objeto: 'ninguno' },
    inteligente: { nombre: 'Inteligente', stats: { fue: 4, vel: 5, int: 9, val: 6, sig: 6, pun: 4 }, rasgos: ['estratega'], arma: 'ninguna', objeto: 'linterna' },
    peleador: { nombre: 'Peleador', stats: { fue: 9, vel: 6, int: 5, val: 8, sig: 4, pun: 4 }, rasgos: ['peleador'], arma: 'bate', objeto: 'ninguno' },
    atleta: { nombre: 'Atleta', stats: { fue: 6, vel: 9, int: 5, val: 6, sig: 5, pun: 3 }, rasgos: ['atleta'], arma: 'ninguna', objeto: 'ninguno' },
    medico: { nombre: 'Médico', stats: { fue: 4, vel: 5, int: 8, val: 6, sig: 5, pun: 3 }, rasgos: ['medico'], arma: 'ninguna', objeto: 'botiquin' },
    mecanico: { nombre: 'Mecánico', stats: { fue: 7, vel: 5, int: 7, val: 6, sig: 4, pun: 4 }, rasgos: ['mecanico'], arma: 'ninguna', objeto: 'linterna' },
    sigiloso: { nombre: 'Sigiloso', stats: { fue: 5, vel: 7, int: 6, val: 5, sig: 9, pun: 3 }, rasgos: [], arma: 'cuchillo', objeto: 'ninguno' },
    cazador: { nombre: 'Cazador', stats: { fue: 7, vel: 5, int: 6, val: 8, sig: 7, pun: 9 }, rasgos: [], arma: 'rifle', objeto: 'linterna' },
    miedoso: { nombre: 'Miedoso', stats: { fue: 4, vel: 6, int: 5, val: 2, sig: 6, pun: 2 }, rasgos: ['miedoso'], arma: 'ninguna', objeto: 'ninguno' },
    fiestero: { nombre: 'Fiestero', stats: { fue: 6, vel: 5, int: 3, val: 6, sig: 2, pun: 3 }, rasgos: ['distraido'], arma: 'ninguna', objeto: 'ninguno' }
  };

  // Paleta categórica validada (contraste y daltonismo) sobre el fondo oscuro del mapa.
  const COLORES = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];

  // El primero es "tú": el nombre se cambia en la configuración.
  const GRUPO_EJEMPLO = [
    { nombre: 'Alex', genero: 'm', edad: 20, rol: 'lider', yo: true },
    { nombre: 'Marcos', genero: 'm', edad: 21, rol: 'armado' },
    { nombre: 'Lucía', genero: 'f', edad: 20, rol: 'inteligente' },
    { nombre: 'Diego', genero: 'm', edad: 22, rol: 'peleador' },
    { nombre: 'Camila', genero: 'f', edad: 19, rol: 'atleta' }
  ].map(function (p) {
    const r = ROLES[p.rol];
    return { nombre: p.nombre, genero: p.genero, edad: p.edad, rol: p.rol, yo: !!p.yo, stats: Object.assign({}, r.stats), rasgos: r.rasgos.slice(), arma: r.arma, objeto: r.objeto };
  });

  /* ---------------- Asesinos ----------------
     hp/armadura: cuánto castigo aguantan. armaduraBala reduce el daño de las balas.
     velCaminar/velCorrer: metros (casillas) por segundo. Una persona normal esprinta a ~5 m/s.
     sigilo (1-10): qué tan difícil es verlos. paciencia: segundos acechando antes de ir a por todo.
     evitaGrupos: 0 = le dan igual los grupos, 1 = solo ataca a gente aislada.
     mortal: 'si' muere, 'huye' escapa herido, 'no' cae y se vuelve a levantar. */
  const ASESINOS = {
    jason: {
      nombre: 'Jason Voorhees', pelicula: 'Viernes 13 (1980–2009)', corto: 'Jason',
      resumen: 'Fuerza sobrehumana, casi inmortal, nunca corre pero siempre te alcanza. Machete. Mata rápido y sin ruido.',
      rasgosTxt: ['Cae y se levanta: hay que rematarlo en el suelo o tumbarlo 3 veces', 'Aparece donde no lo esperas', 'Lanza el machete', 'Atraviesa puertas y ventanas', 'Las balas apenas lo frenan'],
      hp: 300, armaduraBala: 0.5, armaduraMelee: 0.35, aturdeBala: 0.4,
      velCaminar: 1.65, velCorrer: 1.75, corre: false,
      vision: 13, visionOscura: 10, sigilo: 7, terror: 1.3,
      fuerzaPuerta: 34, danio: [45, 92], cadencia: 1.6, alcance: 1.35, precision: 0.82, agarre: 0.3,
      paciencia: 35, evitaGrupos: 0.15, esquiva: 0.02,
      mortal: 'no', revive: [28, 50],
      habilidades: ['teletransporte', 'lanzaArma', 'cortaLuz', 'atacaAuto'],
      sabotaje: 'destruido', arma: 'machete',
      colores: { cuerpo: '#4a5440', cara: '#e8e4d6' }
    },
    michael: {
      nombre: 'Michael Myers', pelicula: 'Halloween (1978–2022)', corto: 'Michael',
      resumen: 'La Forma. Acecha durante horas, observa desde lejos, ataca en silencio. Recibe balas y se vuelve a levantar.',
      rasgosTxt: ['Acecho paciente: te observa', 'Se levanta si no lo rematas, y desaparece si le das la espalda', 'Emboscadas en cuartos oscuros', 'Corta el teléfono y la luz', 'Nunca corre'],
      hp: 300, armaduraBala: 0.45, armaduraMelee: 0.32, aturdeBala: 0.5,
      velCaminar: 1.45, velCorrer: 1.55, corre: false,
      vision: 13, visionOscura: 10, sigilo: 9, terror: 1.4,
      fuerzaPuerta: 22, danio: [48, 92], cadencia: 1.7, alcance: 1.25, precision: 0.86, agarre: 0.4,
      paciencia: 60, evitaGrupos: 0.55, esquiva: 0.02,
      mortal: 'no', revive: [18, 38],
      habilidades: ['observar', 'emboscada', 'cortaTelefono', 'cortaLuz', 'desaparecer', 'teletransporteCorto', 'atacaAuto'],
      arma: 'cuchillo de cocina',
      colores: { cuerpo: '#2f3a52', cara: '#f2efe6' }
    },
    ghostface: {
      nombre: 'Ghostface', pelicula: 'Scream (1996–2023)', corto: 'Ghostface',
      resumen: 'Humano, rápido y listo. Llama por teléfono para jugar con sus víctimas y separarlas. Es torpe y se le puede matar.',
      rasgosTxt: ['Llamadas: "¿Te gustan las películas de terror?"', 'Separa al grupo', 'Corre rápido', 'Torpe: tropieza y recibe golpes', 'Mortal, pero da un último susto'],
      hp: 125, armaduraBala: 0, armaduraMelee: 0.05, aturdeBala: 1.0,
      velCaminar: 1.5, velCorrer: 5.1, corre: true,
      vision: 12, visionOscura: 6.5, sigilo: 7, terror: 1.0,
      fuerzaPuerta: 6, danio: [24, 46], cadencia: 0.9, alcance: 1.15, precision: 0.76, agarre: 0,
      paciencia: 35, evitaGrupos: 0.6, esquiva: 0.1, huyeHerido: 0.35,
      mortal: 'si', revive: null,
      habilidades: ['llamadas', 'torpe', 'ultimoSusto'],
      arma: 'cuchillo Buck 120',
      colores: { cuerpo: '#141418', cara: '#f4f4f0' }
    },
    leatherface: {
      nombre: 'Leatherface', pelicula: 'La masacre de Texas (1974–2022)', corto: 'Leatherface',
      resumen: 'Enorme, salvaje y ruidoso. La motosierra lo delata, pero atraviesa puertas en segundos. Arrastra a sus víctimas.',
      rasgosTxt: ['Motosierra: casi siempre letal', 'Se le oye desde lejos', 'Rompe puertas en segundos', 'Martillazo por sorpresa', 'Aguanta muchísimo castigo'],
      hp: 300, armaduraBala: 0.15, armaduraMelee: 0.15, aturdeBala: 0.5,
      velCaminar: 1.6, velCorrer: 4.5, corre: true,
      vision: 10, visionOscura: 6.5, sigilo: 3, terror: 1.5,
      fuerzaPuerta: 45, danio: [62, 125], cadencia: 1.3, alcance: 1.45, precision: 0.76, agarre: 0.2,
      paciencia: 12, evitaGrupos: 0.1, esquiva: 0.0,
      mortal: 'si', revive: null,
      habilidades: ['motosierra', 'martillazo', 'arrastrar', 'berrinche', 'atacaAuto'],
      arma: 'motosierra',
      colores: { cuerpo: '#6b4a30', cara: '#c9a77c' }
    },
    canibal: {
      nombre: 'Caníbal', pelicula: 'Camino hacia el terror (2003)', corto: 'Caníbal',
      nombres: ['Tres Dedos', 'Diente de Sierra', 'Un Ojo', 'Cara Cortada'],
      resumen: 'Hermanos deformes que cazan en manada. Conocen el bosque, ponen trampas, disparan flechas y se llevan los cuerpos.',
      rasgosTxt: ['Cazan en manada', 'Trampas de alambre y cepos', 'Arco y flechas (el primero)', 'Más rápidos en el bosque', 'Se llevan los cuerpos'],
      hp: 130, armaduraBala: 0.05, armaduraMelee: 0.1, aturdeBala: 0.7,
      velCaminar: 1.6, velCorrer: 4.9, corre: true,
      vision: 12, visionOscura: 9, sigilo: 7, terror: 1.2,
      fuerzaPuerta: 14, danio: [28, 58], cadencia: 1.3, alcance: 1.2, precision: 0.72, agarre: 0.15,
      paciencia: 40, evitaGrupos: 0.35, esquiva: 0.05, huyeHerido: 0.25,
      mortal: 'si', revive: null,
      habilidades: ['manada', 'trampas', 'arco', 'arrastrar', 'bosque', 'atacaAuto'],
      sabotaje: 'cables', arma: 'hacha',
      colores: { cuerpo: '#4d4a2c', cara: '#b58a6a' }
    },
    extranos: {
      nombre: 'Los Extraños', pelicula: 'Los Extraños (2008)', corto: 'Extraño',
      nombres: ['El Hombre de la Máscara', 'Dollface', 'Pin-Up Girl'],
      resumen: 'Enmascarados que te torturan psicológicamente: tocan la puerta, aparecen en las ventanas y esperan. Atacan cuando ya no puedes más.',
      rasgosTxt: ['Tocan la puerta: "¿Está Tamara?"', 'Aparecen en las ventanas', 'Muy pacientes', 'Atacan juntos cuando el grupo está agotado', 'Humanos: se les puede matar'],
      hp: 120, armaduraBala: 0, armaduraMelee: 0.05, aturdeBala: 0.9,
      velCaminar: 1.35, velCorrer: 4.4, corre: true,
      vision: 12, visionOscura: 7, sigilo: 8, terror: 1.15,
      fuerzaPuerta: 10, danio: [30, 62], cadencia: 1.2, alcance: 1.2, precision: 0.76, agarre: 0,
      paciencia: 110, evitaGrupos: 0.7, esquiva: 0.05, huyeHerido: 0.3,
      mortal: 'si', revive: null,
      habilidades: ['tocarPuerta', 'tormento', 'cortaTelefono', 'manada'],
      sabotaje: 'cables', arma: 'cuchillo',
      colores: { cuerpo: '#3a3530', cara: '#e9dcc4' }
    },
    chucky: {
      nombre: 'Chucky', pelicula: 'Muñeco diabólico (1988–2019)', corto: 'Chucky',
      resumen: 'Un muñeco poseído: pequeño, difícil de ver y de acertar, pero débil. Nadie lo toma en serio hasta que es tarde.',
      rasgosTxt: ['Parece un muñeco: nadie se alarma', 'Pequeño: difícil de acertar', 'Se esconde en cualquier rincón', 'Débil: se le puede patear', 'Emboscadas'],
      hp: 75, armaduraBala: 0, armaduraMelee: 0, aturdeBala: 1.2, pequeno: true,
      velCaminar: 1.2, velCorrer: 3.4, corre: true,
      vision: 9, visionOscura: 6, sigilo: 10, terror: 0.75,
      fuerzaPuerta: 2, danio: [14, 34], cadencia: 0.8, alcance: 1.0, precision: 0.72, agarre: 0,
      paciencia: 40, evitaGrupos: 0.9, esquiva: 0.25,
      mortal: 'si', revive: null,
      habilidades: ['muneco', 'emboscada', 'frases'],
      arma: 'cuchillo',
      colores: { cuerpo: '#3f6fb5', cara: '#f0c49c' }
    }
  };

  G.SIM_DATOS = { STATS, RASGOS, ARMAS, OBJETOS, ROLES, COLORES, GRUPO_EJEMPLO, ASESINOS };
})(typeof window !== 'undefined' ? window : globalThis);
