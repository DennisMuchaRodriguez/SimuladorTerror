/* Narración. {n} = persona, {o} = otra persona, {a} = asesino, {l} = lugar, {arma} = arma.
   Cada clave tiene varias versiones; el motor elige una al azar (con semilla). */
(function (G) {
  'use strict';

  const T = {
    // ---------- Ambiente ----------
    llegada: {
      jason: ['Entre los árboles, algo grande se mueve sin prisa. No hace ruido al pisar.', 'Un sonido entrecortado flota en el aire: ki, ki, ki… ma, ma, ma. Nadie lo oye.'],
      michael: ['Una figura con overol oscuro se detiene a lo lejos. Inclina la cabeza y mira hacia las ventanas iluminadas.', 'La Forma ha llegado. No tiene prisa: lleva toda la noche por delante.'],
      ghostface: ['En algún lugar cercano, alguien se ajusta una túnica negra y prueba un distorsionador de voz.', 'Un teléfono marca un número. Del otro lado del distorsionador, alguien sonríe.'],
      leatherface: ['A lo lejos, una motosierra tose, se ahoga y vuelve a arrancar.', 'Algo pesado arrastra los pies cerca de {l}. Huele a carne vieja y gasolina.'],
      canibal: ['Un silbido agudo, casi un canto de pájaro, responde a otro silbido en el bosque. No son pájaros.', 'Ramas que crujen alrededor, en varias direcciones a la vez. Los hermanos rodean la zona.'],
      extranos: ['Una camioneta sin luces se detiene a lo lejos. Siluetas con máscaras bajan sin hablar.', 'Alguien deja un disco de vinilo girando en el porche. Una canción vieja, rayada.'],
      chucky: ['Junto a la puerta hay una caja de cartón con un muñeco pelirrojo dentro. Nadie recuerda haberla dejado ahí.', 'Un muñeco Good Guy sonríe desde un estante. Hace un minuto miraba hacia el otro lado.']
    },
    vistazo: {
      jason: ['{n} cree ver una silueta enorme cerca de {l}. Cuando vuelve a mirar, no hay nada.', '{n} ve a alguien grande, quieto, con algo blanco en la cara. Parpadea y ya no está.'],
      michael: ['{n} ve a un hombre con máscara blanca de pie en {l}, mirándol[o|a] fijo. Cuando vuelve a mirar, se ha ido.', 'Desde {l}, una figura pálida observa a {n} sin moverse. {n} se frota los ojos y la figura ya no está.'],
      ghostface: ['{n} ve una túnica negra cruzar rápido por {l}. Debe ser una broma… ¿no?', 'Una máscara blanca asoma un segundo en {l}. {n} se ríe nervios[o|a]: «Muy gracioso, chicos».'],
      leatherface: ['{n} oye un gruñido y ve una mole con delantal en {l}. ¿Un granjero borracho?'],
      canibal: ['{n} ve una cara deforme entre las hojas, cerca de {l}. Cuando apunta con la linterna, solo hay ramas.', 'Algo se mueve rápido por {l}. {n} jura que era una persona.'],
      extranos: ['{n} ve a alguien con una máscara de muñeca al fondo de {l}. Está de pie, inmóvil. Cuando vuelve a mirar, no hay nadie.', 'Una figura con un saco en la cabeza mira a {n} desde {l}. No dice nada. Se da vuelta y se aleja despacio.'],
      chucky: ['{n} juraría que el muñeco de {l} estaba en otro sitio hace un rato.']
    },
    primeraVista: {
      jason: ['La luz cae sobre una máscara de hockey agrietada. Jason Voorhees levanta el machete.', '{n} lo ve por fin: dos metros de músculo podrido, máscara de hockey, machete. Jason avanza sin correr.'],
      michael: ['Michael Myers sale de la oscuridad de {l}. La máscara blanca no tiene expresión. El cuchillo, sí.', 'Michael está ahí, en {l}, respirando despacio. Ladea la cabeza, como si estudiara a {n}.'],
      ghostface: ['Ghostface irrumpe en {l} con el cuchillo en alto. La máscara grita sin sonido.', 'Una túnica negra y una máscara blanca. Ghostface se lanza hacia {n}.'],
      leatherface: ['La motosierra ruge. Leatherface aparece en {l} con su máscara de piel, chillando como un animal.', 'Un muro de carne con delantal manchado: Leatherface, y la motosierra a pleno.'],
      canibal: ['{a} sale de entre las sombras de {l}: piel deformada, sonrisa rota y un hacha oxidada.', '{a} se ríe con un chillido agudo. Tiene sangre seca hasta los codos.'],
      extranos: ['{a} está en {l}. No dice nada. Solo mira.', '{a} golpea la pared con un cuchillo, despacio, una y otra vez.'],
      chucky: ['El muñeco gira la cabeza hacia {n} y sonríe con todos los dientes. «Hola, soy Chucky. ¿Quieres jugar?»', 'Chucky salta desde {l} con un cuchillo de cocina más grande que su brazo.']
    },
    muneco: ['{n} ve el muñeco pelirrojo en {l}. «Qué feo es esto».', '{n} ve el muñeco en {l} y le da una patadita. «¿De quién es esta cosa?»'],

    cortaLuz: ['La luz parpadea y se apaga en todo el lugar. El silencio pesa más que la oscuridad.', 'Clac. Todo queda a oscuras. Alguien ha tocado la caja de fusibles.'],
    luzVuelve: ['{n} sube la palanca de los fusibles. La luz vuelve, temblorosa.', 'Las luces regresan. {n} suspira de alivio en {l}.'],
    vaAFusibles: ['{n} usa el celular como linterna: «Voy a revisar los fusibles, ya vuelvo». Va sol[o|a] a {l}.', '«Tranquilos, seguro es un fusible». {n} se va sol[o|a] hacia {l}.'],
    fusiblesRotos: ['{n} encuentra la caja de fusibles reventada a golpes. Esto no lo hizo una tormenta.'],
    telefonoCortado: ['{n} levanta el teléfono fijo. No hay tono. Alguien cortó la línea.', 'El teléfono está muerto. {n} sigue el cable con la mirada: está cortado limpio.'],
    sinSenal: ['{n} levanta el celular: sin señal. Ni una barra.'],
    llamandoAyuda: ['{n} marca el 911 con las manos temblando y susurra la dirección.', '{n} consigue hablar con {quien}: «¡Hay alguien matando gente! ¡Vengan ya!»'],
    llamadaHecha: ['{quien} viene en camino. Llegarán en unos {min} minutos. Hay que aguantar.', 'Al otro lado de la línea, una voz cansada promete que {quien} ya va. «Escóndanse y no abran la puerta».'],
    radioUsa: ['{n} enciende la radio de la oficina: «¡Mayday! ¡Necesitamos ayuda en el campamento!»'],
    ayudaLlega: ['Sirenas. Luces rojas y azules barren la oscuridad: ha llegado {quien}.', 'Un vehículo frena de golpe. Las linternas de {quien} cortan la oscuridad.'],
    ayudaAsesinoHuye: ['{a} oye las sirenas y retrocede hacia la oscuridad. Esta noche ya terminó.', 'Cuando {quien} entra, {a} ya no está. Solo quedan huellas de sangre que se pierden afuera.'],
    amanecer: ['El cielo se aclara. Los pájaros vuelven a cantar como si nada hubiera pasado. Un vehículo se acerca por el camino.', 'Amanece. Con la luz llega alguien que ve la sangre y a los que siguen respirando.'],

    // ---------- Normal / tensión ----------
    investigar: ['{n} oye un ruido en {l}. «¿Hola?» Va a ver. Sol[o|a].', '«Seguro es el viento». {n} se levanta y camina hacia {l} para comprobarlo.', '{n} decide investigar el ruido de {l}. Error clásico.'],
    investigarNada: ['{n} revisa {l}. Nada. Vuelve con los demás, sin terminar de creérselo.'],
    separarse: ['{n} se aleja del grupo y va a {l}.', '{n} sale un momento a {l}.'],
    dormir: ['{n} se va a dormir a {l}. Mañana será otro día.', '{n} bosteza y se echa en {l}.'],
    llamadaGF: ['Suena el celular de {n}. Una voz distorsionada pregunta: «¿Cuál es tu película de terror favorita?»', '{n} contesta una llamada. «Hola, {n}. ¿Te gusta tener miedo?» Clic.', 'El teléfono de {n} vibra. «¿Sabes dónde están tus amigos ahora mismo?»'],
    llamadaCebo: ['La voz le dice a {n} que algo le pasó a un amigo en {l}. {n} sale hacia allí, sol[o|a].'],
    tocarPuerta: ['Tres golpes secos en la puerta principal. Pausa. Tres golpes más.', 'Alguien toca la puerta. Una voz de chica pregunta: «¿Está Tamara?»'],
    abrePuerta: ['{n} abre la puerta. No hay nadie. Solo el viento.'],
    tormento: ['Una máscara aparece pegada a la ventana de {l}. Cuando {n} grita, ya no está.', 'Alguien escribió algo con sangre en la ventana de {l}.', 'Un disco empieza a sonar solo en {l}.'],
    chuckyFrase: ['«¡Hola! Soy Chucky, tu amigo hasta el final», dice una vocecita en {l}.', 'Se oye una risita aguda desde {l}.'],
    trampaPuesta: ['{a} tensa un alambre de púas a ras del suelo en {l}.', '{a} esconde un cepo oxidado bajo las hojas de {l}.'],
    sabotajeAuto: ['{a} se agacha junto al vehículo. Algo metálico suena bajo el capó.', '{a} hunde el puño en el motor del vehículo y arranca lo que encuentra.'],

    // ---------- Alarma y planes ----------
    alarma: ['«¡HAY ALGUIEN AQUÍ!», grita {n}. La noche se rompe.', '{n} grita con todas sus fuerzas: «¡CORRAN!»', '«¡Está en {l}! ¡Está en {l}!», grita {n}.'],
    alarmaCuerpo: ['{n} encuentra el cuerpo de {o} en {l} y suelta un alarido que se oye en todo el lugar.', '{n} tropieza con algo en {l}. Es {o}. O lo que queda de {o}.'],
    plan: {
      auto: ['{n} toma el mando: «Al vehículo. Nos vamos de aquí ya».', '«No vamos a pelear con eso. Al vehículo», ordena {n}.'],
      autoLlaves: ['{n} lo tiene claro: «Hay que encontrar las llaves y largarnos». Empiezan a buscar.'],
      llamar: ['«Necesitamos ayuda. Hay que avisar a alguien», decide {n}.', '{n}: «Primero pedimos ayuda. Sin ayuda no salimos de esta».'],
      atrincherarse: ['{n} señala {l}: «Nos encerramos ahí, trabamos la puerta y aguantamos».', '«Barricada en {l}. Que venga si se atreve», dice {n}.'],
      enfrentar: ['{n} cuenta las armas y decide: «Somos más. Vamos a por él».', '«Si nos separamos, nos mata uno por uno. Juntos le damos caza», dice {n}.'],
      huir: ['«A la carretera, corriendo. No miren atrás», ordena {n}.', '{n}: «Salimos a pie. Ya. Todos juntos».'],
      esconderse: ['«Escóndanse. No hagan ruido. Esperen a que amanezca», susurra {n}.'],
      canoa: ['{n} mira el lago: «La canoa. Al agua, ya».']
    },
    planRazon: {
      inmortal: 'Ya lo vieron levantarse: a eso no se le gana peleando.',
      sinArmas: 'No tienen con qué defenderse.',
      armas: 'Tienen armas y son varios.',
      rompePuertas: 'Ya vieron cómo atraviesa las puertas.',
      ayuda: 'La ayuda ya viene en camino; solo hay que aguantar.'
    },
    lider: ['{n} toma el liderazgo del grupo.', 'Sin {o}, {n} asume el mando.'],
    llavesBuscar: ['{n} revuelve {l} buscando las llaves.'],
    llavesEncontradas: ['¡{n} encuentra las llaves en {l}!', '{n} levanta las llaves, que tintinean en {l}: «¡Las tengo!»'],
    llavesConoce: ['{n} conoce el lugar: «Las llaves están en {l}». Van directo a buscarlas.'],
    llavesCuerpo: ['{n} saca las llaves del bolsillo de {o}. No hay tiempo para llorar.'],
    autoDanado: ['{n} gira la llave. Nada. Levanta el capó: alguien arrancó los cables.', 'El motor no responde. {n} ve los cables cortados: «¡Lo sabotearon!»'],
    autoDestruido: ['El vehículo está destrozado: el capó hundido y el motor arrancado a golpes. No va a ir a ningún lado.'],
    reparando: ['{n} se mete bajo el capó con la linterna entre los dientes, uniendo cables a ciegas.'],
    reparado: ['{n} une el último cable. «¡Prueben ahora!»'],
    autoNoArranca: ['El motor tose… y se ahoga. «¡Vamos, vamos, vamos!»', '{n} gira la llave. El motor se ahoga. Otra vez.'],
    autoArranca: ['¡El motor ruge! {n} pisa el acelerador a fondo.', 'Rugido de motor, chirrido de ruedas. ¡Están en marcha!'],
    autoEscapa: ['El vehículo se pierde por el camino con {lista} dentro. Nadie mira atrás.', 'Las luces traseras desaparecen en la noche. {lista} lo lograron.'],
    autoSube: ['{n} se mete al vehículo y traba la puerta.'],
    egoistaHuye: ['{n} mira atrás, mira el volante… y arranca sin esperar a nadie.', '«Lo siento», susurra {n}, y se va dejando a los demás atrás.'],
    atropello: ['¡{n} atropella a {a}! El cuerpo sale despedido contra el pasto.'],
    sacaDelAuto: ['{a} revienta la ventanilla y saca a {n} del vehículo por el cuello.'],
    canoaEscapa: ['{lista} reman con desesperación hacia el centro del lago. La orilla se aleja.'],
    escapePie: ['{n} llega a la carretera y detiene a un camionero. Está a salvo.', '{n} corre sin parar hasta ver las luces de un pueblo. Lo logró.'],
    escapePieAlcanzado: ['{n} sale corriendo por el camino… Encontraron su cuerpo al amanecer, a un kilómetro de allí.'],
    barricada: ['{n} arrastra un mueble contra la puerta de {l}.', '{n} traba la puerta de {l} con lo que encuentra.'],
    barricadaRota: ['La puerta de {l} revienta hacia adentro. {a} entra.', 'Astillas por todos lados: {a} atraviesa la barricada de {l}.'],
    ventanaRota: ['Un estallido de vidrios en {l}: {a} entra por la ventana.'],
    tomaObjeto: ['{n} agarra {obj} en {l}.', '{n} encuentra {obj} en {l} y se lo queda.'],

    // ---------- Combate ----------
    disparoAcierto: ['{n} dispara. El balazo alcanza a {a}, que se tambalea.', '¡BANG! {n} le da a {a} en el pecho.', '{n} aprieta el gatillo y la bala entra en {a}.'],
    disparoInmune: ['{n} le da a {a} de lleno. {a} se detiene un segundo… y sigue caminando.', 'La bala entra en {a}. No parece importarle.'],
    disparoFallo: ['{n} dispara y falla.', '{n} tiene las manos temblando: el tiro sale desviado.'],
    fuegoAmigo: ['¡{n} dispara a ciegas y le da a {o}!'],
    sinBalas: ['Clic. Clic. {n} se ha quedado sin balas.'],
    golpe: ['{n} golpea a {a} con {arma}.', '{n} conecta un golpe con {arma} en la cabeza de {a}.', '{n} le pega a {a} con todas sus fuerzas.'],
    golpeChucky: ['{n} patea a Chucky contra la pared.'],
    asesinoTropieza: ['{a} tropieza con un mueble y cae de bruces.', '{a} se resbala y se da contra la pared. Torpe, como siempre.'],
    ataqueFalla: ['{a} lanza un tajo; {n} lo esquiva por centímetros.', 'La hoja de {a} se clava en la pared junto a la cabeza de {n}.', '{n} se agacha a tiempo. El golpe de {a} corta el aire.'],
    herido: {
      jason: ['El machete de Jason abre el hombro de {n}.', 'Jason lanza a {n} contra la pared. Algo cruje.'],
      michael: ['El cuchillo de Michael se hunde en el costado de {n}.', 'Michael le hace un corte largo a {n} en el brazo.'],
      ghostface: ['Ghostface apuñala a {n} en el brazo.', 'Ghostface le abre un corte a {n} en la espalda.'],
      leatherface: ['La motosierra roza a {n} y le desgarra la pierna.'],
      canibal: ['{a} le clava el hacha a {n} en el muslo.'],
      extranos: ['{a} le hace un corte profundo a {n}.'],
      chucky: ['Chucky le clava el cuchillo a {n} en el tobillo.', 'Chucky le muerde la mano a {n}.']
    },
    flecha: ['Una flecha silba en la oscuridad y se clava en {n}.', 'Desde las sombras, {a} dispara una flecha que atraviesa el brazo de {n}.'],
    flechaFalla: ['Una flecha se clava junto a la cabeza de {n}.'],
    lanzaArma: ['Jason lanza el machete. Gira en el aire y alcanza a {n} en la espalda.'],
    lanzaFalla: ['El machete de Jason pasa girando junto a {n} y se clava en la pared.'],
    agarrado: {
      jason: ['Jason agarra a {n} del cuello y [lo|la] levanta del suelo como si no pesara nada.'],
      michael: ['Michael atrapa a {n} por la garganta y [lo|la] levanta contra la pared.'],
      leatherface: ['Leatherface atrapa a {n} y [lo|la] arrastra hacia atrás.'],
      canibal: ['{a} agarra a {n} del pelo y [lo|la] arrastra.'],
      default: ['{a} atrapa a {n}.']
    },
    zafarse: ['{n} le da un rodillazo a {a} y se suelta.', '{n} se retuerce, muerde, patalea… ¡y se suelta!'],
    liberado: ['{o} golpea a {a} y {n} cae al suelo, libre.'],
    trampa: ['{n} pisa un cepo oculto entre las hojas. El grito se oye a lo lejos.', 'Un alambre de púas atrapa la pierna de {n}.'],
    trampaLibre: ['{n} logra abrir el cepo y sale cojeando.'],
    asesinoAturdido: ['{a} queda aturdido por el golpe.'],
    asesinoDerribado: {
      jason: ['¡Jason cae de espaldas y no se mueve! ¿Está muerto?'],
      michael: ['Michael se desploma en {l}. Inmóvil. Parece muerto.'],
      default: ['{a} cae al suelo y no se mueve.']
    },
    asesinoSeLevanta: {
      jason: ['El dedo de Jason se mueve. Luego la mano. Jason se levanta.'],
      michael: ['Michael se incorpora de golpe, sentado, como si despertara.', 'Michael se pone de pie despacio. Como si nada.'],
      default: ['{a} se levanta.']
    },
    asesinoDesaparece: ['{n} se da vuelta un segundo. Cuando vuelve a mirar, el cuerpo de {a} ya no está.', 'El lugar donde cayó {a} está vacío. Solo queda una mancha en el suelo.'],
    comprobar: ['{n} se acerca despacio a comprobar si {a} está muerto…', '«¿Está muerto?» {n} se agacha junto al cuerpo de {a}.'],
    noComprobar: ['{n} no se acerca a comprobarlo: «No se va a quedar ahí. Vámonos».'],
    rematar: ['{n} no se arriesga: remata a {a} con {arma}, una y otra vez, hasta que deja de moverse.'],
    rematarJason: ['{n} remata a Jason con {arma} hasta separar la cabeza del cuerpo. Esta vez no se levanta.', '{n} remata a Jason con {arma} y lo encadenan entre todos. Esta noche ya no se levanta.'],
    rematarMichael: ['{n} remata a Michael con {arma} y lo deja inmóvil en un charco de sangre. Por esta noche, la Forma se queda en el suelo.'],
    rematarFalla: ['La mano de {a} sale disparada y atrapa el brazo de {n}.'],
    sueter: ['{n} se pone el suéter viejo de Pamela Voorhees: «¡Jason! ¡Soy tu madre! ¡Detente!» Jason se queda inmóvil.'],
    sueterFalla: ['{n} se pone el suéter de Pamela y grita «¡Soy tu madre!». Jason ladea la cabeza… y ve el truco.'],
    asesinoMuere: {
      ghostface: ['Ghostface cae y ya no se levanta. {n} le arranca la máscara: debajo está {quien}.'],
      canibal: ['{a} cae con un último chillido. No se mueve más.'],
      extranos: ['{a} cae al suelo. {n} le quita la máscara: es una persona cualquiera. «¿Por qué nosotros?»', '{a} se desploma. Bajo la máscara hay un rostro normal, casi aburrido.'],
      chucky: ['Chucky queda destrozado en el suelo. Su vocecita se apaga: «No… otra vez no…»'],
      default: ['{a} muere.']
    },
    ultimoSusto: ['Ghostface se incorpora de golpe con el cuchillo en alto. ¡Último susto!'],
    huyeHerido: ['{a} retrocede sangrando y desaparece en la oscuridad.'],
    leatherfaceHuye: ['Leatherface huye aullando, cojeando, y gira con la motosierra en alto en medio del camino. Baila de rabia bajo la luna.'],
    berrinche: ['Leatherface pierde a su presa y gira sobre sí mismo agitando la motosierra, furioso.'],
    martillazo: ['Leatherface aparece de golpe en {l} y descarga un mazo sobre la cabeza de {n}. Cae sin un sonido.'],
    motosierraAhoga: ['La motosierra de Leatherface se ahoga. Tira de la cuerda, una, dos veces.'],
    teletransporte: ['Jason ya no está donde lo vieron por última vez.'],
    teleAparece: ['{n} dobla la esquina y Jason ya está ahí, esperándol[o|a]. Es imposible.'],
    michaelAparece: ['Michael aparece en {l}, en la oscuridad. Como si hubiera estado esperando.'],

    // ---------- Muertes ----------
    muerte: {
      jason: [
        'Jason levanta el machete y lo deja caer una sola vez. {n} no se vuelve a mover.',
        'Jason atraviesa a {n} con el machete y [lo|la] clava contra la pared de {l}.',
        'Jason agarra la cabeza de {n} con una mano y aprieta. El crujido se oye en todo {l}.',
        'Jason estampa a {n} contra el suelo de {l}. El segundo golpe no hacía falta. Lo da igual.'
      ],
      michael: [
        'Michael levanta a {n} con una mano y [lo|la] clava a la pared de {l} con el cuchillo. Después ladea la cabeza, mirando su obra.',
        'Michael ahorca a {n} en silencio en {l}. [Lo|La] sostiene hasta que deja de patalear.',
        'El cuchillo de Michael sube y baja tres veces. {n} se desploma en {l}.'
      ],
      ghostface: [
        'Ghostface apuñala a {n} una y otra vez. {n} se arrastra por {l} dejando un rastro rojo, hasta que deja de moverse.',
        'Ghostface tira a {n} al suelo de {l} y no se detiene hasta que todo queda en silencio.',
        'Ghostface le corta la garganta a {n} en {l} y se queda mirando, con la cabeza ladeada.'
      ],
      leatherface: [
        'La motosierra de Leatherface atraviesa a {n} de lado a lado. El rugido tapa los gritos.',
        'Leatherface levanta a {n} y [lo|la] cuelga de un gancho de carnicero. Luego enciende la motosierra.',
        'La motosierra alcanza a {n} en {l}. No queda mucho que reconocer.'
      ],
      canibal: [
        '{a} parte el cráneo de {n} con el hacha y chilla de alegría.',
        '{a} derriba a {n} en {l} y se ríe mientras [lo|la] remata.',
        '{a} arrastra a {n} hacia las sombras. Los gritos se apagan de golpe.'
      ],
      extranos: [
        '{a} apuñala a {n} despacio, mirándol[o|a] a los ojos a través de la máscara.',
        '{a} entierra el cuchillo en la espalda de {n}. «Porque estabas en casa», responde a la pregunta que nadie hizo.',
        '{n} cae en {l}. {a} se sienta a su lado y espera a que deje de respirar.'
      ],
      chucky: [
        'Chucky le corta los tendones a {n}, que cae, y luego termina el trabajo riéndose a carcajadas.',
        'Chucky apuñala a {n} decenas de veces con frenesí. «¡Juguemos otra vez!»',
        'Chucky hace tropezar a {n} y le cae encima con el cuchillo. Se ríe todo el tiempo.'
      ]
    },
    muerteSorpresa: ['{n} no lo vio venir. {a} salió de la oscuridad de {l} por su espalda.', 'Ni siquiera tuvo tiempo de gritar: {a} atacó a {n} por la espalda en {l}.'],
    muerteDormido: ['{n} dormía en {l}. No llegó a despertar.'],
    muerteEscondite: ['{a} abre de golpe el escondite de {n}. [Lo|La] saca a rastras. Lo que sigue es breve.', '{n} aguanta la respiración en su escondite de {l}. No sirve: {a} sabe exactamente dónde está.'],
    muerteAgarre: {
      jason: ['Jason le aplasta la garganta a {n} con una sola mano y [lo|la] deja caer.'],
      michael: ['Michael sostiene a {n} contra la pared hasta que deja de patalear. Luego [lo|la] suelta, despacio.'],
      leatherface: ['Leatherface cuelga a {n} de un gancho de carnicero.'],
      canibal: ['{a} arrastra a {n} hasta las sombras. Nadie vuelve a oírlo.'],
      default: ['{a} termina con {n}.']
    },
    muerteFlecha: ['Una flecha atraviesa el cuello de {n}. Cae de rodillas en {l}.'],
    muerteHerida: ['{n} se desangra en {l}, apretándose la herida con las dos manos.'],
    muerteFuegoAmigo: ['{n} cae muert[o|a] en {l} por un disparo de {o}. Nadie lo dirá en voz alta.'],

    // ---------- Supervivencia ----------
    esconderse: ['{n} se mete en un escondite de {l} y aguanta la respiración.', '{n} se esconde en {l}, temblando.'],
    escondidoTension: ['{a} pasa a medio metro del escondite de {n}. Se detiene. Escucha. Sigue de largo.'],
    salirEscondite: ['{n} no aguanta más y sale corriendo de su escondite.'],
    panico: ['{n} pierde los nervios y sale corriendo sin rumbo.', '{n} entra en pánico: «¡NO! ¡NO! ¡NO!»', '{n} se queda paralizad[o|a] un segundo y luego huye gritando.'],
    calma: ['{n} respira hondo y recupera el control.'],
    tropiezo: ['{n} tropieza mientras corre y cae de bruces.', '{n} se enreda con algo y cae al suelo.'],
    curar: ['{n} le venda la herida a {o} con lo que encuentra.', '{n} hace presión en la herida de {o}: «Aguanta. No te vas a morir aquí».'],
    heroe: ['{n} se lanza contra {a} para salvar a {o}.', '«¡Corre, {o}! ¡Yo lo distraigo!», grita {n}, y se enfrenta a {a}.'],
    abandona: ['{n} oye los gritos de {o}, duda un segundo… y sigue corriendo.'],
    traidor: ['{n} saca una máscara de Ghostface de la mochila. «¿Sorprendidos? Siempre hay dos».', '{n} se pone la máscara y saca un cuchillo. «Las películas no crean psicópatas, solo los hacen más creativos».'],

    finalCausa: {
      escape: 'Escaparon en el vehículo',
      rescate: 'Llegó la ayuda',
      amanecer: 'Aguantaron hasta el amanecer',
      victoria: 'Detuvieron a los asesinos',
      masacre: 'El asesino ganó',
      huida: 'Huyeron'
    }
  };

  const FRASES = {
    normal: ['¿Alguien quiere otra cerveza?', 'Pongan música', 'Este lugar da miedo', 'Jajaja', '¿Y si vemos una peli?', 'Qué frío hace', 'Mi celu se murió', 'Pásame las papas', '¿Quién trajo esto?', 'Mañana nos vamos temprano'],
    investigar: ['¿Hola?', '¿Hay alguien?', '¿Chicos? No es gracioso', 'Seguro es un gato'],
    alerta: ['¡CORRAN!', '¡Está aquí!', '¡AYUDA!', '¡Por aquí!', '¡Muévanse!'],
    huir: ['¡Corre!', '¡No pares!', '¡Vamos, vamos!', '¡Por aquí!'],
    pelear: ['¡Muérete!', '¡Ven aquí!', '¡Aléjate!', '¡No te tengo miedo!'],
    disparar: ['¡Al suelo!', '¡Toma esto!', '¡Quieto!', '¡Muere!'],
    esconderse: ['(no respires)', '(silencio…)', '(por favor, por favor)', '(no me veas)'],
    panico: ['¡NO NO NO!', '¡Déjame!', '¡Mamá!', '¡AAAAH!'],
    curar: ['Aguanta', 'Déjame ver', 'Presiona aquí'],
    llaves: ['¿Dónde están?', '¡Las llaves!', 'Busquen en los cajones'],
    reparar: ['Dame un minuto', 'Casi…', 'Ilumíname aquí'],
    llamar: ['¡911! ¡Vengan!', '¿Me oyen?', '¡Mayday!'],
    rematar: ['¡Quédate abajo!', '¡Se acabó!'],
    comprobar: ['¿Está muerto?', 'Creo que ya…'],
    barricada: ['¡Traba la puerta!', '¡Ayúdame con esto!'],
    chucky: ['¡Hola, soy Chucky!', '¡Juguemos!', 'Ja ja ja ja'],
    ghostface: ['¿Te gustan las películas de terror?', '¿Quieres jugar?'],
    extranos: ['¿Está Tamara?', 'Porque estabas en casa'],
    jason: ['(ki ki ki… ma ma ma)'],
    michael: ['(respiración lenta)'],
    leatherface: ['¡¡GRRRRRAAAH!!'],
    canibal: ['¡Jijijiji!', '(silbido)']
  };

  G.SIM_TEXTOS = { T, FRASES };
})(typeof window !== 'undefined' ? window : globalThis);
