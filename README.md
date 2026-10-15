# Noche de Slashers

Simulador 2D de terror: armas tu grupo (tú y tus amigos, cada uno con sus características), eliges a los asesinos y el lugar, y miras minuto a minuto qué pasa. **No hay escapatoria**: no hay auto, ni canoa, ni policía que llegue. Para sobrevivir a la noche el grupo tiene que **eliminar al asesino**. Al final ves quién sobrevivió y el **parte médico** de cada superviviente: qué heridas tiene, de qué gravedad, si se las curaron y qué trauma le quedó.

También calcula probabilidades simulando 100 noches seguidas.

No necesita instalar nada: es HTML, CSS y JavaScript puro.

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

Luego **Ver la noche** (simulación animada con narración) o **Calcular probabilidades** (100 noches simuladas: en cuántas eliminan al asesino, la probabilidad de sobrevivir de cada persona y con qué heridas suele salir, cuántos sobreviven por noche, cómo termina, cómo mueren y qué heridas son las más comunes). Desde las probabilidades puedes ver la peor y la mejor noche: el resultado es exactamente el mismo que en el cálculo.

Cada noche tiene un número. Si escribes el mismo número en "Noche nº" con el mismo grupo, se repite exactamente igual.

## Qué se simula

**Las personas** perciben con la vista (con campo de visión, luz y oscuridad) y el oído. Tienen miedo, que sube al ver al asesino o un cadáver; si supera su valentía entran en pánico, pero junto al líder y a sus amigos aguantan más. Cuando alguien da la alarma, el más listo o el líder elige cómo acabar con el asesino según lo que tienen y lo que saben:

- **armarse**: ir por los cuchillos, hachas, bates o escopetas que hay en el lugar y luego salir a cazarlo;
- **cazarlo**: ir todos juntos a donde lo vieron por última vez, o patrullar hasta encontrarlo;
- **emboscarlo**: esperarlo armados en el cuarto con menos entradas y caerle encima cuando entre. Si no aparece, salen a buscarlo.

Además disparan (la puntería, la distancia, la oscuridad y el miedo afectan; con cuidado de no darle a un amigo), pelean cuerpo a cuerpo y en grupo, se curan, recogen armas que encuentran, rescatan a quien está agarrado y cometen los errores clásicos: ir solos a ver un ruido, revisar los fusibles, acercarse a comprobar si está muerto…

**Jason y Michael** caen y se vuelven a levantar. Para eliminarlos hay que rematarlos mientras están en el suelo o tumbarlos tres veces. Los demás mueren como cualquiera, aunque Leatherface aguanta muchísimo castigo.

Si amanece y el asesino sigue vivo, la misión fracasa aunque haya supervivientes.

**El parte médico** de cada superviviente dice cómo quedó (ileso, heridas leves, herido, herido de gravedad o en estado crítico), con cada herida según el arma que la causó (corte de machete, costillas rotas, puñalada, desgarro de motosierra, hachazo, flecha clavada, pierna atrapada en un cepo, marcas de estrangulamiento…), si alguien se la vendó y el trauma que le quedó (vio morir a sus amigos, crisis de nervios, estrés postraumático).

**Las armas** se ven en la mano de cada uno: el machete de Jason (que además lanza), el cuchillo de cocina de Michael, el Buck 120 de Ghostface, la motosierra de Leatherface con la cadena girando, el hacha y el arco de los caníbales, y las armas del grupo. Se animan los tajos, las estocadas, el retroceso y el fogonazo de los disparos, y las hojas se manchan de sangre cuando ya mataron.

**Los asesinos** se comportan como en sus películas:

| Asesino | Cómo ataca |
|---|---|
| Jason Voorhees | Casi inmortal: cae y se levanta. Nunca corre, pero aparece donde no lo esperas. Lanza el machete y rompe puertas. |
| Michael Myers | Acecha con paciencia y observa desde lejos. Corta la luz, embosca en cuartos oscuros y desaparece si le das la espalda. |
| Ghostface | Humano, rápido y torpe. Llama por teléfono, separa al grupo con engaños y ataca a quien está solo. Puede dar un último susto. |
| Leatherface | Motosierra casi siempre letal, se le oye desde lejos, atraviesa puertas y aguanta muchísimo castigo. |
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
| `js/render.js` | El dibujo en canvas: mapa, luces, personajes, armas animadas y efectos. |
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
