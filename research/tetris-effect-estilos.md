# Tetris Effect: estilo audiovisual y diseño (investigación para "2048 Effect")

> Fecha: 2026-10-19. Propósito: dar base factual al documento de diseño de un juego tipo 2048 (reglas clásicas 4x4) con la presentación de *Tetris Effect* / *Tetris Effect: Connected*, hecho con three.js en el navegador.
>
> **Convenciones del documento**
> - **[V]** = hecho verificado con fuente citada.
> - **[O]** = observación de reseñas o del juego que no confirma una fuente primaria. Es plausible, pero conviene validarla viendo gameplay.
> - **💡 Propuesta 2048** = sugerencia nuestra para la adaptación. No es un hecho sobre Tetris Effect.

---

## 0. Resumen ejecutivo (lo que más importa trasladar)

1. **Los efectos de sonido son la música.** Cada acción (mover, rotar, soltar, limpiar) dispara una muestra afinada a la escala y al tempo de la pista de la etapa. El objetivo declarado era "crear música a partir de los propios efectos de sonido del juego" [V].
2. **La velocidad sigue a la canción, no a la habilidad.** Cada etapa tiene 3 secciones (cambios a 1/3 y 2/3 de las líneas). La velocidad puede **bajar** entre secciones, por ejemplo Da Vinci 1-3-1 o Yin & Yang 9-5-3 [V]. La música pasa de *build-up* a medio y a final con "drops" en las transiciones [V].
3. **Etapas como álbum conceptual.** Son 27 etapas en 7 áreas que viajan "desde el fondo del océano hasta el espacio y de vuelta". Cada una cambia las piezas (skin), el fondo, la música y los SFX [V].
4. **Zone = parar el tiempo.** Se carga limpiando líneas. Al activarla se congela la gravedad, las líneas limpiadas se apilan abajo y al final explotan todas juntas con un nombre épico (Octoris, Dodecatris…) [V].
5. **Partículas brillantes + bloom + vibración al ritmo.** Las criaturas y los fondos están hechos de partículas de energía, y el mando vibra a tempo [V].
6. **Para 2048:** mover = nota cuantizada, fusión = acorde o percusión según el valor, "secciones" ligadas a la puntuación o a la ficha máxima, y una Zone que congela el spawn y acumula fusiones para un estallido final.

---

## 1. Filosofía central

### Hechos [V]
- **Sinestesia como hilo conductor.** Mizuguchi lleva la sinestesia por toda su obra: *Rez*, *Lumines*, *Child of Eden* y *Tetris Effect* ([Wikipedia – Tetsuya Mizuguchi](https://en.wikipedia.org/wiki/Tetsuya_Mizuguchi)). Sobre Tetris Effect dijo que el equipo trabajó en diseñar el juego "de una forma 'sinestésica', mezclando sonido y visuales", y que "visualizar el sonido de forma que produzca efectos especiales bellos y envolventes" pidió mucho ensayo y error ([GamesBeat](https://gamesbeat.com/tetsuya-mizuguchi-interview-taking-tetris-on-a-ps-vr-acid-trip/)).
- **Kandinsky.** *Rez* se llamó originalmente "Project K" en homenaje a Kandinsky, cuyas "teorías sobre la sinestesia" fueron una inspiración principal. El juego está dedicado a él ([Wikipedia – Rez](https://en.wikipedia.org/wiki/Rez_(video_game))). Mizuguchi: "Amo a los artistas de hace cien años, amo sus conceptos" ([New Statesman](https://www.newstatesman.com/culture/2017/07/how-tetsuya-mizuguchi-reinvented-video-games-his-love-synaesthesia)). *No encontré una fuente que vincule a Kandinsky con Tetris Effect en concreto*: la influencia llega a través de la línea Rez → Lumines → TE.
- **Origen en la experiencia de club o festival.** Mizuguchi recuerda una fiesta en Zúrich con "mil personas, no bailando sino moviéndose", con la música, los sonidos, el movimiento y los colores cambiando a la vez. De ahí sacó la palabra *sinestesia* ([New Statesman](https://www.newstatesman.com/culture/2017/07/how-tetsuya-mizuguchi-reinvented-video-games-his-love-synaesthesia)).
- **Flow / zona.** La idea original con Henk Rogers fue un Tetris con música y un estado de "zona": "juegas Tetris, se acelera y entras en estado de flow". Si esa experiencia de zona pudiera generar música, "se sentiría mucho más evocadora" ([Wccftech](https://wccftech.com/interview-tetsuya-mizuguchi-synesthesia-tetris-effect-rez-lumines/amp/); [Wikipedia – Tetris Effect](https://en.wikipedia.org/wiki/Tetris_Effect)). El nombre alude al fenómeno real de seguir viendo bloques al cerrar los ojos.
- **Viaje emocional.** "Quería demostrar que, aunque sea Tetris, puede ser una experiencia emocional." Si los jugadores lo hubieran visto como "Tetris con buena música", habría sido "un fracaso" ([Wccftech](https://wccftech.com/interview-tetsuya-mizuguchi-synesthesia-tetris-effect-rez-lumines/amp/)). "La música es una parte absolutamente esencial del diseño", y la meta era "hacer la música más emotiva que nunca". Además querían "introducir narrativa" sin perder la familiaridad ([GamesBeat](https://gamesbeat.com/tetsuya-mizuguchi-interview-taking-tetris-on-a-ps-vr-acid-trip/)).
- **Tres sentidos.** Mizuguchi trabaja con "tres elementos: visión, audio y háptica" ([Wccftech](https://wccftech.com/interview-tetsuya-mizuguchi-synesthesia-tetris-effect-rez-lumines/amp/)).
- **Proceso iterativo por sensación.** El equipo preguntaba "¿qué sentiste?" y ajustaba en consecuencia, buscando "un 'wow' pequeño" ([Wccftech](https://wccftech.com/interview-tetsuya-mizuguchi-synesthesia-tetris-effect-rez-lumines/amp/)). Ishihara (director): hay que "mezclar unas cuantas cosas que tengan sentido para acercarse a la sensación de sinestesia"; el diseño permitía un "clic instantáneo de los sentidos" ([Inverse](https://www.inverse.com/gaming/lumines-arise-preview-synethesia)).
- **Música original.** Toda la música es original (Hydelic / Noboru Mutoh, más artistas invitados) y no se usan licencias. Sonido y visuales los hacen equipos distintos a partir de un concept art común ([Inverse](https://www.inverse.com/gaming/lumines-arise-preview-synethesia); [Wikipedia](https://en.wikipedia.org/wiki/Tetris_Effect)).
- **Sobreestímulo como reto.** Según la entrevista de Unreal Engine con MacDonald y Uchida (CTO de Monstars), los visuales a veces sobreestimulan a propósito como reto añadido y otras veces ayudan a entrar en flow ([Unreal Engine – resumen vía búsqueda; la página devolvió 403 al leerla](https://www.unrealengine.com/en-US/developer-interviews/how-tetris-effect-became-a-modern-work-of-art)).

### 💡 Propuesta 2048
- **Lema de diseño:** "cada deslizamiento es una nota; cada fusión, un acorde". La partida debe sonar a música aunque el jugador no lo intente.
- Diseñar el **viaje emocional** como un arco: calma oscura → luz → clímax → catarsis. Ligarlo a la progresión del 2048 (256 → 512 → 1024 → 2048).
- Adoptar el método "¿qué sentiste?": hacer playtests cortos por etapa y ajustar por sensación, no solo por métricas.

---

## 2. Sistemas audio-reactivos

### Hechos [V]
- **SFX recortados y sincronizados con cada acción.** "Cortamos el sonido y luego lo sincronizamos con cada acción" para "crear música solo con los efectos de sonido del juego" ([Wccftech](https://wccftech.com/interview-tetsuya-mizuguchi-synesthesia-tetris-effect-rez-lumines/amp/)). La TetrisWiki define el juego por su "música y visuales que reaccionan a las acciones del jugador" ([tetris.wiki](https://tetris.wiki/Tetris_Effect)).
- **Cada acción suena distinto según la etapa.** Mover, rotar, soltar y limpiar producen sonido. En la etapa neoyorquina (*Downtown Jazz*) cada movimiento o rotación toca notas de piano "desacompasadas", y el jugador acaba improvisando jazz libre ([PCWorld](https://www.pcworld.com/article/397831/tetris-effect-review.html)). Otros ejemplos de SFX temáticos: engranajes de madera en *Da Vinci* y nieve crujiendo en *Aurora Peak* (PCWorld), y crujidos de molinos en otra etapa ([Trusted Reviews](https://www.trustedreviews.com/reviews/tetris-effect)). Cada etapa tiene "su propio skin de bloques, gráficos de fondo y sonido" ([Hard Drop](https://harddrop.com/wiki/Tetris_Effect)).
- **Rotar al ritmo.** Al rotar suena un fragmento corto "que encaja con el beat" de la música ([GameRevolution](https://www.gamerevolution.com/review/455063-tetris-effect-review-synesthetic-aesthetic)).
- **Cuantización (precedente directo en Rez).** En Rez se diseñó un mecanismo para "cuantizar las notas, de modo que, sin importar la imprecisión del jugador", caigan en el beat ([Wikipedia – Rez](https://en.wikipedia.org/wiki/Rez_(video_game))). *Para Tetris Effect no encontré documentación explícita de la rejilla de cuantización.* Las reseñas describen que los SFX "suenan a tiempo" con las rotaciones y caídas [O].
- **Tres fases musicales por etapa.** Cada canción se construye en oleadas (*build-up*, medio, final), y "drops" fuertes marcan las transiciones ([GameRevolution](https://www.gamerevolution.com/review/455063-tetris-effect-review-synesthetic-aesthetic)). La banda sonora avanza de estrofa a estribillo según limpias líneas ([NME](https://www.nme.com/reviews/tetris-effect-connected-review-3068174)).
- **Tempo ↔ velocidad.** La velocidad de caída sigue el ánimo y el tempo de la música en lugar de subir siempre ([NME](https://www.nme.com/reviews/tetris-effect-connected-review-3068174)). Las piezas se aceleran con el tempo y se relajan cuando termina una sección ([Kotaku](https://kotaku.com/tetris-effect-the-kotaku-review-1830325513)).
- **La primera etapa empieza casi en silencio.** En *The Deep*, la fase 1 es casi silenciosa (un bajo punteado y corales que parpadean despacio). En la fase 2 entra el bajo y aparecen mantarrayas ([Tetris Wiki Fandom – The Deep, vía buscador](https://tetris.fandom.com/wiki/The_Deep)). Empieza oscura y la luz aparece al limpiar las primeras líneas ([PCWorld](https://www.pcworld.com/article/397831/tetris-effect-review.html)).
- **Revive rítmico (Connected).** El jugador eliminado revive pulsando al ritmo de la música de la etapa ([tetris.wiki](https://tetris.wiki/Tetris_Effect)).
- **La capa de SFX se mezcla por encima de la pista** de forma que la música sigue sonando a música (Edge, citado vía [PressReader](https://www.pressreader.com/australia/edge/20181206/282132112516020)).

### Observaciones [O]
- Las limpiezas de línea disparan frases o *stingers* más largos (coros, *swells*), y un Tetris (4 líneas) suena más intenso que un single.
- Al soltar la pieza (*hard drop*) suena un golpe percusivo, y al encajar (*lock*) un sonido corto tonal.

### 💡 Propuesta 2048
| Acción 2048 | Evento sonoro | Cuantización |
|---|---|---|
| Deslizar (↑↓←→) | Nota de la escala de la etapa. La dirección elige el grado (p. ej. ← = I, ↑ = III, → = V, ↓ = VI), o se recorre un arpegio | Al siguiente 1/16 (o 1/8 en etapas lentas). La lógica del juego se resuelve **inmediatamente**; solo se retrasa el sonido y el "pulso" visual |
| Movimiento sin efecto | Nota apagada / filtrada (*ghost note*) | 1/16 |
| Fusión | Acorde o golpe cuya altura sube con log2(valor): 4 → nota grave, 2048 → nota aguda o acorde completo | 1/16. Varias fusiones en un movimiento se arpegian en semicorcheas |
| Spawn de ficha nueva | *Tick* percusivo suave (hi-hat / shaker) | 1/8 |
| Nuevo récord de ficha (128, 256…) | *Stinger* + avance de sección musical | Al siguiente compás |
| Game over | La música baja por filtro paso bajo y *reverb tail* | Inmediato |
- **Secciones musicales por progreso:** 3 secciones por etapa, con el cambio en 1/3 y 2/3 de una "meta" (p. ej. fusiones totales o puntuación). Cada sección añade o quita *stems* (pad → +bajo → +batería y lead), siempre en límite de compás.
- **"Velocidad" en 2048:** no hay gravedad, así que el equivalente es el **BPM y la densidad**. Opcionalmente, en modos con reloj (Ultra), un spawn extra o la presión de tiempo pueden seguir el tempo. El BPM puede bajar entre secciones para respirar, igual que Da Vinci 1-3-1.
- **Mezcla:** SFX tonales afinados a la tonalidad de la pista, con *ducking* leve de la música cuando suenan, y bus de reverb compartido para que todo "pegue".

---

## 3. Lenguaje visual

### Hechos [V]
- **Partículas de energía.** En *The Deep*, la fauna marina está hecha de "partículas de energía", y las mantarrayas rodean la cámara con la Tierra al fondo ([Fandom, vía buscador](https://tetris.fandom.com/wiki/The_Deep)). Las partículas estallan a tempo con el beat ([PCWorld](https://www.pcworld.com/article/397831/tetris-effect-review.html)). Los visuales combinan efectos de partículas e imágenes de estética synth ([Kotaku](https://kotaku.com/tetris-effect-the-kotaku-review-1830325513)).
- **Todo pulsa.** Web oficial: "todo, hasta los propios Tetriminos, pulsa, baila, destella y explota en perfecta sincronía con cómo juegas" ([tetriseffect.game](https://www.tetriseffect.game/)).
- **Las piezas cambian por etapa.** Cada etapa reestiliza los bloques, y existe la opción de usar los colores clásicos ([Screen Rant](https://screenrant.com/tetris-effect-review/); [Kotaku](https://kotaku.com/tetris-effect-the-kotaku-review-1830325513)).
- **Paletas por fase.** *Pharaoh's Code* se basa en triángulos y usa blanco, rojo y azul claro como colores primarios en sus tres fases. En *Karma Wheel*, tambores flanquean la Matrix y se multiplican por fase hasta llenar el fondo ([Fandom, vía buscador](https://tetris.fandom.com/wiki/Karma_Wheel)).
- **El entorno reacciona a las limpiezas.** En *Jeweled Veil* las joyas se balancean con cada limpieza de línea; *Forest Dawn* es un bosque bajo la lluvia que se ilumina al acercarse el amanecer ([Trusted Reviews](https://www.trustedreviews.com/reviews/tetris-effect); [Kotaku](https://kotaku.com/tetris-effect-the-kotaku-review-1830325513)). Los entornos "destellan y explotan" según se intensifica la música, y las transiciones van "llenas de purpurina" ([GameRevolution](https://www.gamerevolution.com/review/455063-tetris-effect-review-synesthetic-aesthetic)).
- **Etapas que se transforman en plena partida.** Fondos grandes, como un escenario de festival ([NME](https://www.nme.com/reviews/tetris-effect-connected-review-3068174)). Una etapa empieza dentro de un transbordador y termina orbitando la Tierra entre satélites ([Kotaku](https://kotaku.com/tetris-effect-the-kotaku-review-1830325513)).
- **Zone Brilliance.** Con 8 o más líneas en Zone se aplica a toda la pantalla un **efecto de inversión de color**, con intensidad ajustable MIN/MID/MAX ([tetris.wiki](https://tetris.wiki/Tetris_Effect)).
- **Accesibilidad visual.** Se pueden atenuar los efectos visuales ([Kotaku](https://kotaku.com/tetris-effect-the-kotaku-review-1830325513)).
- **VR.** El tablero queda fijo delante y el escenario se curva hacia la visión periférica ([Kotaku](https://kotaku.com/tetris-effect-the-kotaku-review-1830325513)). Se cuidó evitar el mareo ([GamesBeat](https://gamesbeat.com/tetsuya-mizuguchi-interview-taking-tetris-on-a-ps-vr-acid-trip/)).
- **Motor.** Unreal Engine 4 (luego UE5 para la versión de PS5/PSVR2) ([Wikipedia](https://en.wikipedia.org/wiki/Tetris_Effect); [Unreal Engine](https://www.unrealengine.com/en-US/developer-interviews/how-tetris-effect-became-a-modern-work-of-art)).
- **Connected:** Ishihara quería construir sobre galaxias y universos como símbolo del mundo de TE ([Unwinnable](https://unwinnable.com/2021/10/30/connecting-with-tetrominoes/)).

### Observaciones [O]
- El tablero (Matrix) es casi un marco fino translúcido. El fondo suele ser negro u oscuro con un elemento luminoso, lo que maximiza el contraste del bloom.
- La cámara es mayormente estática respecto al tablero; lo que se mueve es el fondo. Hay ligeros *punch-in* o sacudidas en las limpiezas grandes.
- Al limpiar líneas, la fila se desintegra en partículas que salen disparadas hacia el entorno.

### 💡 Propuesta 2048
- **Fondo negro + 1 color dominante por fase**, al estilo Pharaoh's Code: una paleta de 3 colores, uno por sección.
- **Fichas como objetos emisivos:** el skin de las fichas cambia por etapa (cristal, coral luminoso, tinta, neón…), con un modo "colores clásicos" opcional.
- **Fusión = estallido de partículas** que viajan del tablero al fondo y "alimentan" al entorno: cada fusión hace crecer o iluminar al elemento central de la etapa (ballena, ciudad, aurora).
- **Pulso global al beat:** escala de las fichas 1.0 → 1.03 en cada negra y brillo del marco en cada compás.
- **Equivalente a Zone Brilliance:** inversión de color o *flash* cromático cuando la combinación supera un umbral.
- **Cámara:** tablero fijo y legible; el parallax y el movimiento van en el fondo. *Micro-shake* solo en fusiones de 512 o más.
- **Ajuste de "intensidad de efectos"** (bajo/medio/alto) y respeto de `prefers-reduced-motion`.

---

## 4. Journey Mode

### Estructura [V]
- **27 etapas en 7 áreas**, desbloqueadas en orden ([tetris.wiki](https://tetris.wiki/Tetris_Effect)). La web oficial habla de un "viaje de 32 etapas desde las profundidades del océano hasta la inmensidad del espacio y de vuelta" ([tetriseffect.game](https://www.tetriseffect.game/)); la diferencia probablemente se debe a que cuenta etapas ocultas o añadidas. Lleva unas 2–3 h y está pensado para una sola sesión ([PCWorld](https://www.pcworld.com/article/397831/tetris-effect-review.html)).
- **Meta de líneas por etapa:** 30 (Beginner), 36 (Normal) y 48 (Expert). *Metamorphosis* pide 90 en cualquier dificultad. **Las líneas limpiadas en Zone no cuentan** para la meta ([tetris.wiki](https://tetris.wiki/Tetris_Effect)).
- **3 secciones por etapa**, cada una con su nivel de velocidad. Los cortes caen en 1/3 y 2/3 de la meta (10/20, 12/24, 16/32; 30/60 en la final) ([Hard Drop](https://harddrop.com/wiki/Tetris_Effect)).
- **Practice Mode:** áreas 1–4 sin game over y con gravedad baja ([tetris.wiki](https://tetris.wiki/Tetris_Effect)).
- **Etapas ocultas:** *1989* (homenaje a Game Boy) y *1984* (homenaje a Electronika 60) ([tetris.wiki](https://tetris.wiki/Tetris_Effect)).

### Lista de etapas
Velocidades = niveles de gravedad por sección **(Beginner / Normal / Expert)**, de [tetris.wiki](https://tetris.wiki/Tetris_Effect). Pista musical según [ludo.guide](https://www.ludo.guide/guide/tetris-effect-connected/ii-game-modes) y [Wikipedia](https://en.wikipedia.org/wiki/Tetris_Effect). En la columna de tema/visuales, [V] lleva fuente; lo marcado *(inferido)* sale del nombre o la pista y debe confirmarse viendo gameplay.

| Área | Etapa | Pista | Velocidad B / N / E | Tema / visuales |
|---|---|---|---|---|
| 1 | The Deep | "Connected (Yours Forever)" (voz: Kathleen) | 1-1-1 / 1-2-3 / 6-7-8 | Fondo marino oscuro; fauna de partículas, mantarrayas y ballenas; la Tierra al fondo; empieza casi en silencio [V] |
| 1 | Pharaoh's Code | "Next Chapter" | 2-2-2 / 3-4-5 / 8-9-10 | Egipto, geometría triangular; blanco → rojo → azul claro por fase [V] |
| 1 | Karma Wheel | "Pulse" | 3-3-3 / 4-5-6 / 10-11-12 | Basada en percusión; los tambores se multiplican hasta llenar el fondo [V] |
| 2 | Jellyfish Chorus | "Joy" | 1-1-3 / 1-1-5 / 6-6-10 | Medusas, coro *(inferido)* |
| 2 | Da Vinci | "Bright Shadow" | 1-3-1 / 1-5-1 / 6-10-6 | Engranajes y máquinas renacentistas; SFX de engranajes de madera [V] |
| 2 | Prayer Circles | "Spring Field" | 3-1-3 / 5-1-5 / 10-6-10 | Ritual / plegaria *(inferido)* |
| 2 | Ritual Passion | "Flames" | 1-3-7 / 1-5-9 / 6-12-15 | Fuego, ritual tribal intenso *(inferido)* |
| 3 | Deserted | "Lunar Discourse" | 4-2-2 / 6-3-3 / 11-8-6 | Desierto nocturno / luna *(inferido)* |
| 3 | Dolphin Surf | "You and I" | 2-7-3 / 4-9-6 / 10-15-12 | Delfines, océano *(inferido)* |
| 3 | Downtown Jazz | "City Lights" | 2-6-2 / 4-8-5 / 9-14-10 | Nueva York de noche: neón, tráfico, rascacielos; los inputs tocan piano de jazz [V] |
| 3 | Spirit Canyon | "New Beginnings" | 1-3-8 / 3-5-10 / 8-10-16 | Cañón, espiritual *(inferido)* |
| 4 | Jeweled Veil | "Temptation" | 2-2-4 / 4-4-6 / 9-9-10 | Joyas que se balancean con cada limpieza [V] |
| 4 | Forest Dawn | "Boscage" | 5-5-5 / 7-7-7 / 12-12-12 | Bosque bajo la lluvia que se ilumina hacia el amanecer [V] |
| 4 | Kaleidoscope | "3 Senses" | 5-7-2 / 7-10-3 / 12-16-8 | Patrones caleidoscópicos *(inferido)* |
| 4 | Turtle Dreams | "Around Me" | 6-6-6 / 8-8-8 / 13-13-13 | Tortugas marinas, onírico *(inferido)* |
| 4 | Celebration | "All Nations" | 1-6-9 / 1-8-11 / 6-15-18 | Celebración global, festiva *(inferido)* |
| 5 | Sunset Breeze | "Moments" | 4-1-4 / 7-3-7 / 12-8-12 | Atardecer, brisa (posiblemente molinos) *(inferido)* |
| 5 | Aurora Peak | "Snows" | 3-6-7 / 5-8-9 / 10-13-16 | Montaña nevada bajo auroras boreales; nieve crujiendo [V] |
| 5 | Zen Blossoms | "Unfolds" | 1-4-6 / 3-6-8 / 8-11-13 | Cerezos / estética zen japonesa *(inferido)* |
| 5 | Yin & Yang | "Chains" | 9-5-3 / 11-7-5 / 16-12-10 | Dualidad, Asia oriental *(inferido)* |
| 5 | Hula Soul | "'Aumakua" | 1-7-10 / 3-10-12 / 8-16-20 | Hawái: hula, volcán (Giant Bomb menciona "hulas volcánicos" y "ballenas espaciales") [O] |
| 6 | Starfall | "Secrets" | 6-9-4 / 9-12-7 / 15-18-12 | Lluvia de estrellas *(inferido)* |
| 6 | Balloon High | "Look Up" | 2-9-3 / 5-12-6 / 10-18-11 | Globos aerostáticos, cielo *(inferido)* |
| 6 | Mermaid Cove | "World of Colors" | 4-4-7 / 7-7-10 / 12-12-14 | Sirenas, arrecife colorido *(inferido)* |
| 6 | Orbit | "Hometown" | 4-6-8 / 7-8-11 / 13-14-17 | Transbordador → órbita terrestre; charla de radio de astronautas [V/O] |
| 6 | Stratosphere | — | 8-9-10 / 10-11-13 / 16-18-20 | Estratosfera / ascenso *(inferido)* |
| 7 | Metamorphosis | "Always Been, but Never Dreamed" | 7-4-10 / 10-7-13 / 16-13-20 | Final cósmico de 90 líneas, síntesis del viaje *(inferido)* |

### Patrones clave [V, deducidos de la tabla]
- La velocidad **no es monótona**. Hay curvas en "valle" (Da Vinci 1-3-1, Kaleidoscope 5-7-2), en "pico invertido" (Prayer Circles 3-1-3, Sunset Breeze 4-1-4) y descendentes (Yin & Yang 9-5-3, Deserted 4-2-2). La forma la dicta la canción.
- Hay etapas "planas" que funcionan como descanso (Forest Dawn 5-5-5, Turtle Dreams 6-6-6) intercaladas con etapas de clímax (Hula Soul 1-7-10, Celebration 1-6-9).
- La dificultad global sube por área, pero dentro de un área se alternan tensión y respiro.
- Puntuación SS por área en Normal: 61,2k (A1) → 81,6k (A2–3) → 102k (A4–6) → 51,6k (A7, porque la final es más corta en tiempo efectivo) ([tetris.wiki](https://tetris.wiki/Tetris_Effect)).

### Transiciones [V/O]
- Las transiciones entre secciones llegan con "drops" de beat y el escenario se transforma [V] ([GameRevolution](https://www.gamerevolution.com/review/455063-tetris-effect-review-synesthetic-aesthetic)). Entre etapas hay una transición "llena de purpurina" [V]. El tablero se mantiene y el mundo se funde alrededor sin pantallas de carga visibles [O].

### 💡 Propuesta 2048
- **Journey de 2048:** 6–8 etapas para un MVP (no 27), agrupadas en 3 áreas (Océano → Tierra/Ciudad → Cielo/Espacio), más una final.
- **Problema:** 2048 no tiene "líneas". Métricas alternativas para la meta de etapa:
  - **Opción A (recomendada):** *fusiones* acumuladas, con meta de 30/36/48 fusiones por dificultad y cortes de sección en 1/3 y 2/3.
  - **Opción B:** puntos de etapa.
  - **Opción C:** alcanzar una ficha objetivo (128 → 256 → 512). Encaja de forma natural con 3 secciones, pero se vuelve lenta.
- **Continuidad del tablero:** al pasar de etapa el tablero **se conserva** (las fichas siguen) y solo cambian el skin, la música y el fondo. Así se mantiene la regla clásica de 2048 en una partida larga. Alternativa: resetear el tablero en cada etapa (más parecido a TE, pero rompe la escalada a 2048).
- **"Velocidad" por sección** = BPM + densidad visual + (en dificultad alta) un *timer* de *auto-spawn* o tiempo límite por movimiento. Copiar las curvas no monótonas.
- **Game over en Journey:** reiniciar la etapa actual, no el Journey entero. Practice = deshacer ilimitado.

---

## 5. La mecánica Zone

### Hechos [V]
- **Carga:** al limpiar líneas, cada X líneas (según dificultad) se llena **1/4 del medidor**. En Zone Marathon, 1/4 cada 8 líneas ([tetris.wiki](https://tetris.wiki/Tetris_Effect)). Kotaku menciona que los combos también cargan [V].
- **Activación:** manual, con el medidor parcial o lleno. La duración es proporcional a la carga, con un **máximo de 20 s** en Journey ([tetris.wiki](https://tetris.wiki/Tetris_Effect)).
- **Reglas durante Zone:** la **gravedad se detiene** (la pieza acaba bloqueándose tras un retardo si toca la pila). Las líneas limpiadas **se empujan al fondo** del tablero en lugar de desaparecer; esto también saca a la vista bloques enterrados y permite rescatar un tablero malo ([tetris.wiki](https://tetris.wiki/Tetris_Effect); [Kotaku](https://kotaku.com/tetris-effect-the-kotaku-review-1830325513)). Sirve para salvarse del game over o para puntuar ([tetriseffect.game](https://www.tetriseffect.game/)).
- **Final y payoff:** al agotarse el tiempo, todas las líneas acumuladas abajo **desaparecen con una explosión** ([tetris.wiki](https://tetris.wiki/Tetris_Effect)). Cada clear recibe un nombre según el número de líneas: Tetris (4–7), **Octoris** (8–11), **Dodecatris** (12–15), **Decahexatris** (16–17), **Perfectris** (18–19), **Ultimatris** (20), Kirbtris (21), Impossibilitris (22), Infinitris (23), Electris (24), WTFtris (25+).
- **Puntuación:** +1x por cada Octoris o superior, +1x si se activa a carga completa (máx. 3x). Los puntos se **retienen hasta el final** de Zone y hay un bonus de +100 por línea ([tetris.wiki](https://tetris.wiki/Tetris_Effect)).
- **Zone Brilliance:** inversión de color a pantalla completa a partir de 8 líneas en Zone [V].
- Las líneas de Zone no cuentan para la meta de la etapa [V].

### Observaciones [O]
- Al entrar en Zone, la música se apaga o se filtra (paso bajo, ambiente) y el contador de líneas se muestra en grande. El estallido final va con un *swell* musical y el nombre del clear en tipografía grande.
- Mizuguchi la califica de mecánica "bastante ambiciosa" ([GamesBeat](https://gamesbeat.com/tetsuya-mizuguchi-interview-taking-tetris-on-a-ps-vr-acid-trip/)) [V].

### 💡 Propuesta 2048 — "Zone" para 2048
- **Carga:** cada fusión suma al medidor (más si la ficha es grande, p. ej. `log2(valor) - 1`). El medidor tiene 4 segmentos y cada fusión de ficha récord da un segmento extra.
- **Efecto (elegir uno en el prototipo):**
  1. **"Tiempo congelado" (recomendado):** durante N movimientos o S segundos **no aparecen fichas nuevas**. El jugador puede reordenar el tablero y encadenar fusiones; es el análogo directo de "la gravedad se detiene". Las fusiones hechas en Zone se "apilan": los puntos se retienen y se muestran como contador creciente.
  2. **"Fusiones apiladas":** las fichas fusionadas en Zone se marcan (brillantes) y al terminar Zone estallan todas a la vez, con multiplicador. Por ejemplo, las de valor ≥ X se convierten en puntos y liberan su celda, lo que da espacio de rescate como en TE.
- **Duración:** proporcional a la carga, máx. ~20 s o ~12 movimientos.
- **Presentación:** desaturar o invertir la paleta, filtro paso bajo en la música, pulso del beat más lento (*half-time*), un contador grande de fusiones en Zone y, al final, estallido de partículas + nombre del logro (p. ej. 4 fusiones "Quadra", 8 "Octa", 12 "Dodeca", 16 "Hexadeca", tablero vacío "Perfect"). Multiplicador hasta 3x.
- Las fusiones en Zone **no cuentan** para la meta de etapa (como en TE), para evitar saltarse el contenido.

---

## 6. Otros modos (Effect Modes) [V]
Fuente: [tetris.wiki](https://tetris.wiki/Tetris_Effect). La web oficial habla de 17 Effect Modes ([tetriseffect.game](https://www.tetriseffect.game/)).

| Grupo | Modo | Resumen |
|---|---|---|
| Classic | Marathon | 150 líneas (opción Endless), nivel inicial hasta 15 |
| Classic | Zone Marathon | Marathon con Zone (1/4 de medidor cada 8 líneas) |
| Classic | Ultra | Ataque de puntuación de 3 min |
| Classic | Sprint | 40 líneas contrarreloj |
| Classic | Master | 20G, 30 niveles, 300 líneas |
| Classic | Classic Score Attack | Reglas y visuales de NES |
| Relax | Chill Marathon | Sin game over (al llegar arriba se limpia el campo), meta de 150–600 líneas |
| Relax | Quick Play | Eliges etapa, nivel y meta |
| Relax | Playlist | 4 etapas temáticas seguidas (Sea, Wind, World) |
| Focus | All Clear | Perfect clears contra reloj |
| Focus | Combo | Combos contra reloj |
| Focus | Target | Limpiar bloques gema |
| Adventurous | Countdown | 5 min; caen piezas I en columnas aleatorias |
| Adventurous | Purify | 3 min; limpiar bloques grises e "infectados" |
| Adventurous | Mystery | Marathon con efectos aleatorios temporales (piezas gigantes, bombas, sin hold, tablero invertido…) |

**Connected (multijugador):** cooperativo de 3 contra jefes IA (con nombres zodiacales). Al llenarse el medidor compartido, los tableros se **fusionan en uno** y los jugadores colocan por turnos; también incluye Zone Battle, Score Attack, Connected VS y Weekend Ritual (evento comunitario de 24 h que desbloquea avatares) ([tetris.wiki](https://tetris.wiki/Tetris_Effect); [NME](https://www.nme.com/reviews/tetris-effect-connected-review-3068174)).

### 💡 Propuesta 2048 (modos baratos de implementar)
- **Marathon:** 2048 clásico infinito con cualquier etapa como "skin + música".
- **Ultra:** máxima puntuación en 3 min.
- **Sprint:** llegar a 512 o 1024 lo antes posible.
- **Chill:** sin game over; al bloquearse, el tablero "se disuelve" en partículas y la partida sigue con el contador acumulado.
- **Quick Play / Theater:** elegir etapa libremente.
- **Mystery:** eventos temporales (ficha bomba, ficha ×2, tablero 5x5 temporal, controles invertidos, sin spawn durante 3 movimientos).
- **Purify:** fichas "infectadas" que solo desaparecen al fusionarse con un valor concreto.

---

## 7. UI/HUD, menús, VR y háptica

### Hechos [V]
- **Menú de Effect Modes y avatares:** el menú muestra al jugador, a sus amigos y a otros jugadores como avatares **orbitando la Tierra**, con su nivel visible. Los avatares raros salen de los Weekend Rituals, y hay rankings ([Kotaku](https://kotaku.com/tetris-effect-the-kotaku-review-1830325513)). Un sistema de niveles de jugador (XP) desbloquea retos, avatares y la etapa *1989* en el nivel 50 ([Wikipedia](https://en.wikipedia.org/wiki/Tetris_Effect); [tetris.wiki](https://tetris.wiki/Tetris_Effect)).
- **Theater:** modo para ver y oír las canciones con sus visualizadores sin jugar ([GameRevolution](https://www.gamerevolution.com/review/455063-tetris-effect-review-synesthetic-aesthetic)).
- **Opciones visuales:** skins clásicos de pieza, atenuar efectos e intensidad de Zone Brilliance ([Kotaku](https://kotaku.com/tetris-effect-the-kotaku-review-1830325513); [tetris.wiki](https://tetris.wiki/Tetris_Effect)).
- **VR:** PSVR (PS4), Rift/Vive (PC), Quest (2020) y PSVR2 (PS5, UE5) ([Wikipedia](https://en.wikipedia.org/wiki/Tetris_Effect)). En VR el entorno envuelve al jugador y el tablero queda fijo delante ([Kotaku](https://kotaku.com/tetris-effect-the-kotaku-review-1830325513)). Se anunció *Tetris Effect* para realidad mixta en Quest para 2027 ([tetriseffect.game](https://www.tetriseffect.game/)).
- **Háptica:** el DualShock vibra **a tempo con la música**, no solo con los eventos ([SCMP](https://amp.scmp.com/lifestyle/entertainment/article/2176107/tetris-effect-takes-immersion-new-level-sights-sounds-and); [Way Too Many Games](https://waytoomany.games/2018/11/12/review-tetris-effect-psvr/); [TechRaptor](https://techraptor.net/content/tetris-effect-review)). La vibración coincide con las notas y el brillo visual ([Kotaku](https://kotaku.com/tetris-effect-the-kotaku-review-1830325513)).
- **Trance Vibrator:** era un periférico de *Rez* (PS2), no de Tetris Effect. Servía para sentir la música fuera de las manos ([Wikipedia – Rez](https://en.wikipedia.org/wiki/Rez_(video_game))). Mizuguchi ha experimentado con trajes de 26 vibradores y quiere transmitir "el bombo, el hi-hat o las voces" por la háptica ([Wccftech](https://wccftech.com/interview-tetsuya-mizuguchi-synesthesia-tetris-effect-rez-lumines/amp/)).

### Observaciones [O]
- El HUD es mínimo: puntuación, nivel, líneas o meta, pieza siguiente, hold y medidor de Zone, todo pegado al tablero en tipografía fina y monocroma. No hay paneles opacos.

### 💡 Propuesta 2048
- **HUD:** puntuación + progreso de etapa (anillo fino alrededor del tablero) + medidor de Zone de 4 segmentos. Tipografía fina con letras espaciadas, blanco al ~70 % de opacidad y sin cajas.
- **Menú principal:** Tierra o planeta en three.js con avatares o etapas orbitando; cada etapa desbloqueada es un orbe que, al pasar el cursor, reproduce 4 compases de su música.
- **Theater:** reproductor de etapas con autoplay de un bot 2048 simple (expectimax corto) para que suene y se vea solo, útil como salvapantallas y demo.
- **Háptica web:** `navigator.vibrate()` en móvil (Android) para pulsos al beat y en las fusiones grandes; `Gamepad.vibrationActuator.playEffect('dual-rumble', …)` para mandos en Chromium. Siempre opcional.
- **WebXR (fase futura):** three.js tiene `WebXRManager`; el tablero flota delante y el entorno es esférico.

---

## 8. Implementación en navegador con three.js (propuestas técnicas)

> Todo esto es **💡 propuesta**. Los efectos se describen por su apariencia en TE; la técnica es nuestra.

### 8.1 Arquitectura de audio (la base de todo)
- **Reloj maestro = AudioContext.** Con [Tone.js](https://tonejs.github.io/) se usan `Tone.Transport` (BPM y compás) y `Tone.Transport.nextSubdivision('16n')` para cuantizar; se programa con `player.start(time)` o `sampler.triggerAttackRelease(note, '16n', time)`. Nunca se usa `setTimeout` para audio.
- **Lógica inmediata y feedback cuantizado:** el movimiento se resuelve y anima al instante (*tween* de ~80–120 ms). El *sonido* y el *pulso visual* asociados se programan en la siguiente subdivisión, con un retraso máximo de 1/16 (≈125 ms a 120 BPM). Para evitar sensación de *lag*, se reproduce un transitorio muy corto e inmediato (*click* sin tono) y la nota tonal va cuantizada.
- **Música por stems:** cada etapa tiene 3–5 loops sincronizados (pad, bajo, batería, lead, voz) en `Tone.Player`s con `loop` y `sync()`. Las secciones suben o bajan su ganancia en el límite de compás (`Transport.scheduleOnce(fn, '@1m')`).
- **Escala por etapa:** cada etapa define `{bpm, key, scale, sampler, stems, sfxMap}`. Las notas de los movimientos salen de la escala, así que nunca desafinan.
- **Visuales sincronizados al beat:** `Tone.Draw.schedule(cb, time)` alinea los eventos visuales con el audio. También se puede usar `Tone.Analyser`/`AnalyserNode` (FFT) para que las bandas de graves modulen el bloom y los mediados la emisión de partículas.
- **Zone:** `Tone.Filter` paso bajo con rampa a ~400 Hz, `playbackRate` o *half-time* en la batería, y al salir un *riser* + *impact* programados en el siguiente compás.
- **Desbloqueo de audio:** `await Tone.start()` en el primer gesto del usuario (requisito de autoplay de los navegadores).

### 8.2 Render
| Efecto TE | Aproximación WebGL / three.js |
|---|---|
| Glow / bloom intenso | `EffectComposer` + `UnrealBloomPass` (fichas y partículas con color HDR > 1 y `toneMapping = ACESFilmicToneMapping`). Opcional: `pmndrs/postprocessing` (`SelectiveBloom`), más eficiente. La `strength` del bloom se modula con el bombo |
| Criaturas y mundos de partículas (mantas, ballenas) | `THREE.Points` con `BufferGeometry` + `ShaderMaterial` (blending aditivo, `depthWrite:false`). Las posiciones salen de muestrear la superficie de un modelo low-poly (`MeshSurfaceSampler`) y se animan en el *vertex shader* con ruido curl y tiempo. 20k–100k puntos van bien en GPU de gama media |
| Estallidos al fusionar | Pool de partículas en GPU (un buffer circular de N partículas con atributos `startTime`, `velocity`, `color`; la física se calcula en el *vertex shader* a partir de `uTime - startTime`). Cero asignaciones por frame. Para > 200k partículas, simulación GPGPU con `GPUComputationRenderer` |
| Fichas (16 celdas) | `InstancedMesh` (`RoundedBoxGeometry`) con `instanceColor`, o un `Mesh` por ficha (son pocas). El número se pinta con textura SDF (troika-three-text) o un atlas por valor. Material emisivo con `emissiveIntensity` ligado al valor y al beat |
| Todo pulsa | Un uniform global `uBeat` (0→1 decaído exponencialmente en cada negra) compartido por todos los materiales (escala, emisión, desplazamiento del fondo) |
| Zone Brilliance (inversión) | Un `ShaderPass` final: `mix(color, 1.0 - color, uInvert)` + aberración cromática + viñeta, animado por *tween* |
| Fondos que se transforman por sección | Cada etapa es una escena con 3 "estados". Se hace *crossfade* de uniforms (color, densidad de partículas, cámara del fondo) en el límite de compás. Paleta de 3 colores por sección (como Pharaoh's Code) |
| Transición entre etapas | Las partículas del mundo anterior se "dispersan" (*curl noise*, aumento de velocidad, *fade*) mientras las del siguiente se ensamblan desde el centro; *flash* blanco breve en el *drop* |
| Cámara | Tablero fijo en espacio de pantalla (cámara ortográfica o *overlay* separado). Mundo con cámara en perspectiva, deriva lenta y parallax ligado al ratón o al giroscopio |
| Rendimiento | Presupuesto: 1–3 *draw calls* para fichas y 1 por sistema de partículas. Bloom a media resolución, `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`, escalado dinámico de calidad si los FPS bajan de 50, y preset "efectos bajos" |

### 8.3 Datos de etapa (esquema sugerido)
```js
{
  id: 'the-deep',
  area: 1,
  bpm: 96, key: 'D', scale: 'dorian',
  goal: { beginner: 30, normal: 36, expert: 48 },   // fusiones
  sections: [ // cortes a 1/3 y 2/3
    { stems: ['pad'],               palette: ['#02040a', '#0a6cff', '#7ff'], tempoMul: 1.0 },
    { stems: ['pad', 'bass'],        palette: [...], tempoMul: 1.0 },
    { stems: ['pad', 'bass', 'drums', 'lead'], palette: [...], tempoMul: 1.0 },
  ],
  sfx: { move: 'kalimba', merge: 'choir', spawn: 'shaker', record: 'swell' },
  tileSkin: 'bioluminescent',
  world: 'ocean-particles'
}
```

---

## 9. Lagunas y siguientes pasos
- **No verificado con fuente primaria:** la rejilla exacta de cuantización de TE, los efectos sonoros concretos de cada etapa y las descripciones visuales de unas 15 etapas (marcadas *(inferido)*). Recomendación: ver el Journey completo en YouTube (vídeos sin comentarios) y anotar por etapa la paleta, el SFX de los movimientos, el elemento central y la transformación por sección.
- **Fuentes que no se pudieron leer (403/402):** la entrevista de Unreal Engine (MacDonald/Uchida), el reportaje de VGC por el 4.º aniversario, la entrevista del Japan Times (2025) y las páginas de etapa de Fandom. Vale la pena leerlas manualmente.
- **Discrepancias:** 27 etapas (wikis) frente a 30 (Wikipedia) frente a 32 (web oficial actual). Effect Modes: 15 (reseñas de 2018) frente a 17 (web oficial / Connected).

## Fuentes principales
- Entrevistas: [Wccftech (2019)](https://wccftech.com/interview-tetsuya-mizuguchi-synesthesia-tetris-effect-rez-lumines/amp/) · [GamesBeat (2018)](https://gamesbeat.com/tetsuya-mizuguchi-interview-taking-tetris-on-a-ps-vr-acid-trip/) · [Inverse (Ishihara)](https://www.inverse.com/gaming/lumines-arise-preview-synethesia) · [New Statesman (2017)](https://www.newstatesman.com/culture/2017/07/how-tetsuya-mizuguchi-reinvented-video-games-his-love-synaesthesia) · [Unreal Engine (2019)](https://www.unrealengine.com/en-US/developer-interviews/how-tetris-effect-became-a-modern-work-of-art) · [Unwinnable (Connected)](https://unwinnable.com/2021/10/30/connecting-with-tetrominoes/)
- Oficial: [tetriseffect.game](https://www.tetriseffect.game/)
- Wikis: [TetrisWiki](https://tetris.wiki/Tetris_Effect) · [Hard Drop](https://harddrop.com/wiki/Tetris_Effect) · [Wikipedia – Tetris Effect](https://en.wikipedia.org/wiki/Tetris_Effect) · [Wikipedia – Rez](https://en.wikipedia.org/wiki/Rez_(video_game)) · [ludo.guide](https://www.ludo.guide/guide/tetris-effect-connected/ii-game-modes)
- Reseñas: [Kotaku](https://kotaku.com/tetris-effect-the-kotaku-review-1830325513) · [PCWorld](https://www.pcworld.com/article/397831/tetris-effect-review.html) · [GameRevolution](https://www.gamerevolution.com/review/455063-tetris-effect-review-synesthetic-aesthetic) · [NME](https://www.nme.com/reviews/tetris-effect-connected-review-3068174) · [Screen Rant](https://screenrant.com/tetris-effect-review/) · [Trusted Reviews](https://www.trustedreviews.com/reviews/tetris-effect) · [SCMP](https://amp.scmp.com/lifestyle/entertainment/article/2176107/tetris-effect-takes-immersion-new-level-sights-sounds-and) · [Way Too Many Games](https://waytoomany.games/2018/11/12/review-tetris-effect-psvr/) · [TechRaptor](https://techraptor.net/content/tetris-effect-review)
- Técnicas: [three.js docs](https://threejs.org/docs/) (EffectComposer, UnrealBloomPass, InstancedMesh, Points, MeshSurfaceSampler, GPUComputationRenderer, WebXRManager) · [Tone.js](https://tonejs.github.io/) · [pmndrs/postprocessing](https://github.com/pmndrs/postprocessing)
