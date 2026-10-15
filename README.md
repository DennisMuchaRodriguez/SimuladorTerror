# Noche de Slashers

Simulador 2D de supervivencia: armas tu grupo (tú y tus amigos, cada uno con sus características), eliges a los asesinos y el lugar, y miras minuto a minuto si sobreviven a la noche. También calcula probabilidades simulando 100 noches seguidas.

No necesita instalar nada: es HTML, CSS y JavaScript puro. Está fuera de `Assets/`, así que Unity no lo importa.

## Cómo abrirlo

- Doble clic en `index.html` (funciona sin servidor).
- O genera un solo archivo para pasárselo a tus amigos:
  ```
  node herramientas/empaquetar.js NocheDeSlashers.html
  ```

## Cómo se usa

1. **Tu grupo**: hasta 8 personas. La primera eres tú. Cada una tiene:
   - un rol rápido (Líder, Armado, Inteligente, Peleador, Atleta, Médico, Mecánico, Cazador, Miedoso, Fiestero…);
   - seis características del 1 al 10: fuerza, velocidad, inteligencia, valentía, sigilo y puntería;
   - un arma (cuchillo, bate, machete, hacha, pistola, revólver, escopeta, rifle) y un objeto (linterna o botiquín);
   - hasta 3 rasgos: líder, estratega, sabe pelear, atleta, médico, mecánico, héroe, egoísta, miedoso, fiestero o conoce el lugar.
2. **Los asesinos**: cuántos de cada uno (hasta 6 en total).
3. **El lugar**: casa suburbana, cabaña en el bosque, campamento del lago o granja en Texas.
4. **Reglas**: con o sin celulares, y la opción de que uno de tus amigos sea un Ghostface traidor.

Luego **Ver la noche** (simulación animada con narración) o **Calcular probabilidades** (100 noches simuladas, con la probabilidad de sobrevivir de cada persona, cuántos sobreviven por noche, cómo termina y cómo mueren). Desde las probabilidades puedes ver la peor y la mejor noche: el resultado es exactamente el mismo que en el cálculo.

Cada noche tiene un número. Si escribes el mismo número en "Noche nº" con el mismo grupo, se repite exactamente igual.

## Qué se simula

**Las personas** perciben con la vista (con campo de visión, luz y oscuridad) y el oído. Tienen miedo, que sube al ver al asesino o un cadáver; si supera su valentía entran en pánico y huyen o se esconden. Cuando alguien da la alarma, el más listo o el líder elige un plan según lo que tienen y lo que saben:

- buscar las llaves, reparar el vehículo si lo sabotearon y escapar;
- pedir ayuda (celular con o sin señal, teléfono fijo o radio) y aguantar hasta que llegue;
- atrincherarse en el cuarto con menos puertas y ventanas;
- cazar al asesino si tienen armas y no parece inmortal;
- huir a pie o en canoa;
- esconderse hasta el amanecer.

Además disparan (la puntería, la distancia, la oscuridad y el miedo afectan), pelean cuerpo a cuerpo, se curan, recogen armas que encuentran, rescatan a quien está agarrado, rematan a un asesino caído (si saben que se levanta) y cometen los errores clásicos: ir solos a ver un ruido, revisar los fusibles, acercarse a comprobar si está muerto…

**Los asesinos** se comportan como en sus películas:

| Asesino | Cómo ataca |
|---|---|
| Jason Voorhees | Casi inmortal: cae y se levanta. Nunca corre, pero aparece donde no lo esperas. Lanza el machete, rompe puertas y destroza el vehículo. |
| Michael Myers | Acecha con paciencia y observa desde lejos. Corta el teléfono y la luz, embosca en cuartos oscuros y desaparece si le das la espalda. |
| Ghostface | Humano, rápido y torpe. Llama por teléfono, separa al grupo con engaños y ataca a quien está solo. Puede dar un último susto. |
| Leatherface | Motosierra casi siempre letal, se le oye desde lejos, atraviesa puertas. Si lo hieren mucho, huye bailando con la motosierra. |
| Caníbales (Camino hacia el terror) | Cazan en manada, ponen trampas, el primero dispara flechas y son más rápidos en el bosque. Arrastran los cuerpos. |
| Los Extraños | Muy pacientes: tocan la puerta, aparecen en las ventanas y atacan juntos cuando el grupo está agotado. |
| Chucky | Parece un muñeco: nadie se alarma. Pequeño, difícil de ver y de acertar, pero débil. |

## Archivos

| Archivo | Qué contiene |
|---|---|
| `js/datos.js` | Características, roles, rasgos, armas y los asesinos (vida, velocidad, sigilo, habilidades…). |
| `js/mapas.js` | Los cuatro lugares, construidos casilla por casilla (1 casilla = 1 metro). |
| `js/textos.js` | Todas las frases de la narración y de los globos de diálogo. |
| `js/motor.js` | La simulación. No depende del navegador. |
| `js/render.js` | El dibujo en canvas: mapa, luces, personajes y efectos. |
| `js/app.js` | La interfaz: configuración, simulación en vivo y probabilidades. |
| `herramientas/balance.js` | Prueba de balance desde la terminal. |
| `herramientas/empaquetar.js` | Genera la versión de un solo archivo. |

## Probar el balance desde la terminal

```
node herramientas/balance.js casa jason=1 200
node herramientas/balance.js cabana canibal=3 100
node herramientas/balance.js granja leatherface=1,canibal=2 100 --sin-celulares
node herramientas/balance.js casa michael=1 7 --relato     # narra la noche nº 7
```

Para cambiar a un asesino, edita sus números en `js/datos.js` (por ejemplo `hp`, `velCorrer`, `sigilo`, `paciencia` o `evitaGrupos`) y vuelve a correr `balance.js` para ver el efecto.
