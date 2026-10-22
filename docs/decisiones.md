# 2048 Effect — Registro de decisiones (borrador)

Borrador vivo de la entrevista de diseño. Es la fuente para escribir el GDD + spec técnica final.
Investigación de apoyo: `research/tetris-effect-estilos.md`, `research/youtube-playables-requisitos.md`.

## Documento
- **Q1** — GDD + especificación técnica accionable, en español, por fases y con criterios de aceptación.

## Plataforma
- **Destino**: YouTube Playables, en escritorio y móvil.
- **Controles**: flechas, WASD, swipe táctil y arrastre con ratón.
- **Guardado**: en la nube de la cuenta de YouTube del jugador (`saveData`/`loadData`).
  - JSON versionado y pequeño (< 64 KiB), con migraciones de versiones anteriores.
  - Se espera a `loadData` antes de guardar.
  - Prohibido `localStorage` para el progreso; solo lo usa el mock en desarrollo.
- **Leaderboard**: solo el de YouTube vía `ytgame.engagement.sendScore`.
  - Una única métrica: la puntuación del modo infinito.
  - Debe coincidir con el récord del save.
  - No es posible un ranking propio, porque no se permite red externa.

## Juego
- **Q2** — Tablero 4×4 clásico renderizado en 3D. El tamaño es un parámetro interno; el 3D es solo presentación.
- **Modos** — Solo **modo infinito**. Se descartaron el modo viaje con final y el de meta en 2048.
- **Q5** — Reglas de movimiento originales:
  - Spawn: 2 (90%) / 4 (10%).
  - Cada ficha se fusiona como máximo una vez por movimiento.
  - Game over cuando no quedan movimientos.
  - Sin deshacer.
  - Spawn con semilla guardada en el save, para que recargar no cambie las fichas.
- **Q7b** — Puntuación = suma clásica de fusiones + **bonus de récord medido en movimientos** (no en tiempo):
  - Al conseguir una ficha más alta que todas las anteriores: `bonus = valor_ficha × multiplicador`.
  - Multiplicador: 3x si se llega dentro del par de movimientos, 1x desde el doble del par, interpolación lineal entre ambos.
  - Par por hito = mínimo teórico (~2,2 de valor añadido por movimiento) + margen. Constantes configurables, se ajustan jugando.
  - Tardar nunca resta. No hay reloj, así que pausar no da ninguna ventaja.
- **Q8** — Etapas:
  - 6 etapas. Cambian con cada nueva ficha récord: inicio, 128, 256, 512, 1024, 2048.
  - Desde 4096 rotan desde la 1 en versión "remix": +10% BPM, paleta desplazada, percusión extra.
  - 3 secciones musicales por etapa (build-up, medio, clímax). Avanzan cuando la 2.ª ficha más alta llega a M/8 y M/4, siendo M el próximo hito (ej.: en Neón, M=512 → 64 y 128). *Se corrigió la redacción original "½ y ¼", que contradecía el ejemplo acordado.*
  - Etapas definidas como datos (JSON por etapa).
- **Q9** — **Zone: fuera por ahora.** Solo figura como idea futura, sin especificar.
- **Q14** — Etapas:

| # | Desde | Nombre | BPM | Música | Paleta | Entorno |
|---|---|---|---|---|---|---|
| 1 | inicio | Abismo | 90 *(era 88)* | Pads ambientales, campanas | Turquesa · cian · azul profundo | Medusas y plancton bioluminiscente |
| 2 | 128 | Dunas | 100 | Marimba, percusión de mano | Ámbar · dorado · rosa | Arena en remolinos, sol que sube |
| 3 | 256 | Neón | 118 | Synthwave/house | Magenta · cian · violeta | Rascacielos de líneas, lluvia de luz |
| 4 | 512 | Luciérnagas | 104 | Kalimba, texturas orgánicas | Verde · lima · ámbar | Enjambres que siguen las fusiones |
| 5 | 1024 | Tormenta | 128 | Breakbeat, sintes agresivos | Azul eléctrico · blanco · púrpura | Relámpagos en los drops |
| 6 | 2048 | Cosmos | 136 | Coros, pads épicos | Oro · blanco · espectro | Nebulosa y criatura cósmica |

  MVP = etapa 1 (Abismo).

## Audio
- **Q11** — *(Reemplazada por "Audio v2", 2026-10-20.)* Música **híbrida**: generativa con Tone.js desde el MVP. Más adelante una etapa puede pasar a stems cambiando solo su JSON.
- **Q12** — Mapa sinestésico (los sonidos cambian por etapa):

| Acción | Sonido | Cuantización |
|---|---|---|
| Slide válido | Nota del acorde; ↑ agudo, ↓ grave, ←/→ medio | Siguiente 1/16 |
| Fusión | Altura según log2(valor); varias fusiones forman un arpegio | Con el slide, arpegio en 1/32 |
| Spawn | Percusión suave / tick tonal | Siguiente pulso |
| Movimiento inválido | Golpe sordo, sin nota | Inmediato |
| Nueva ficha récord / cambio de etapa | Drop (crash + nueva capa) | Siguiente compás |
| Game over | La música se desarma capa por capa *(v2: corte instantáneo + drone bajito)* | Inmediato |

  **Regla clave**: la lógica y las animaciones se resuelven al instante. Solo el sonido y el pulso visual se cuantizan.
- Hay que respetar el mute de YouTube (`isAudioEnabled`/`onAudioEnabledChange`). No hay mute general; sí volumen de música y de efectos por separado. El audio arranca sin esperar un gesto del usuario.

## Audio v2 (entrevista del 2026-10-20)

Se sacó todo el audio basado en Tone.js y se rediseñó desde cero, priorizando un consumo mínimo de recursos.

- **A1** — Modelo **híbrido**: una base que nunca se corta y crece con el progreso; encima, las jugadas tocan notas afinadas con esa base.
- **A2** — **Una identidad por etapa** con un motor común configurado por el JSON (tonalidad, escala, timbre, BPM, capas).
- **A3** — La base crece con las **3 secciones** que ya calcula el núcleo; cada cambio de capa entra en el siguiente compás.
- **A4** — Mapa de eventos de Q12 sin cambios, salvo el game over (A10).
- **A5** — **Todo con Web Audio pura**, sin librerías. ZzFX queda como opción solo si algún efecto puntual se queda corto.
- **A6** — **Progresión de acordes** por etapa en el JSON; las notas del jugador siguen el acorde que suena. Una etapa modal usa un único acorde.
- **A7** — Catálogo fijo de 5 capas: `drone`, `pad`, `bass`, `arp`, `perc`. Por defecto: sección 1 = drone + pad · 2 = + bass · 3 = + arp + perc. Patrones y timbres por etapa.
- **A8** — **Delay sincronizado** al tempo compartido + **ducking** de −3 dB con las notas del jugador. Sin reverb.
- **A9** — Vuelven los sliders de **Música** (la base) y **Efectos** (las notas del jugador), 0–100.
- **A10** — Título: suena la sección 1 de la etapa guardada desde que aparece. Game over: **corte instantáneo** (~50 ms) y, 1 s después, entra suave un drone muy bajito.
- **A11** — Cambio de etapa: drop en el siguiente compás + **cruce de 1 compás** + rampa de BPM de 1 compás, a la vez que lo visual.
- **A12** — Remix: **+10% de BPM y +2 semitonos por vuelta**, tope de 3 vueltas.
- **A13** — **6 voces fijas** para el jugador con robo de la más vieja. En **calidad baja** (gobernador de render) el pad pasa a 2 osciladores y se apaga el delay; en alta y media, todo completo.

## Visual
- **Q13** — Dirección base:
  - Fondo casi negro.
  - Rejilla flotante emisiva que pulsa con el beat.
  - Fichas: cubos redondeados emisivos o de cristal, color según la paleta de 3 colores interpolada por log2, número como textura.
  - Animaciones: slide de 80–100 ms ease-out, pop + partículas al fusionar, materialización desde partículas al aparecer.
  - Partículas de entorno reactivas al audio.
  - Cámara frontal con inclinación leve, balanceo al ritmo y punch en las fusiones grandes.
  - Postprocesado: bloom, viñeta y aberración cromática en los drops.
  - HUD mínimo: puntuación, récord, ficha máxima.
  - Accesibilidad: efectos reducidos y paleta clásica.

## Idiomas
- **Q15** — Inglés y español desde el MVP, vía `ytgame.system.getLanguage()`, con fallback a inglés. Textos en JSON por idioma.

## Flujo de pantallas
- **Q16b**:
  1. **Carga**: `firstFrameReady`, `loadData`, precompilación de shaders y después `gameReady`.
  2. **Título**: la música ya suena; botón Jugar/Continuar. Un swipe o una tecla de dirección también empieza la partida.
  3. **Juego**.
  4. **Ajustes** (modal, se cierra con Esc): volumen de música, volumen de efectos, háptica, efectos reducidos, paleta clásica, calidad.
  5. **Game over**: **las fichas se quedan visibles**, la música se apaga y aparece un panel con la puntuación, la ficha máxima, si hay nuevo récord, y el botón "Otra vez".
  6. **`onPause`**: congelamiento técnico (loop, render, audio, entrada) sin pantalla propia.
  - Guardado tras cada movimiento (con debounce) y en `onPause`.

## Entrada
- **Q17**:
  - **Teclado**: flechas y WASD; Espacio y Enter en los menús; Esc abre y cierra los ajustes sin `preventDefault`.
  - **Pointer Events** (táctil y ratón): umbral de min(30 px, 6% del tablero); el eje dominante debe superar al otro por 1,5x.
  - **Entradas rápidas**: la animación en curso se completa al instante; buffer de 1 movimiento.
  - **Háptica**: pulso en las fusiones y pulso largo en los récords; se puede desactivar.
  - **Mando**: futuro.

## Rendimiento
- **Q18**:
  - **Objetivo de fps**: 60 en escritorio y gama media; 30 estables como mínimo en gama baja.
  - **Niveles de calidad**:
    - Alta: DPR 2, bloom completo, 100% de partículas.
    - Media: DPR 1,5, bloom a ½, 50% de partículas.
    - Baja: DPR 1, bloom barato u off, 20% de partículas.
    - Auto: arranca en media y ajusta cada 10 s si baja de 50 fps o supera 58 fps.
  - **Presupuestos**:
    - Bundle inicial < 5 MiB gzip (MVP < 1 MiB).
    - `gameReady` en < 3 s en escritorio.
    - Heap < 200 MB.
    - Sin crear ni destruir objetos en cada frame.
  - **WebGL**: WebGL2, con fallback a WebGL1 en calidad baja y mensaje si tampoco hay.

## Stack
- **Q10**:
  - Vite + TypeScript (`base: './'`), three.js vanilla (EffectComposer + UnrealBloomPass, InstancedMesh/Points).
  - Tone.js; hay que verificar que su AudioWorklet pasa el CSP, o caer a Web Audio puro.
  - Lógica pura en TS testeada con Vitest.
  - Sin wasm, sin Workers, sin DRACO/Basis; geometría procedural.
- **SDK**: interfaz `PlayablesSdk` con `MockSdk` y `YtSdk`, seleccionada por `VITE_PLAYABLES_SDK` (`mock` en `.env.development`, `youtube` en `.env.production`).
  - Un plugin de Vite inyecta `<script src="https://www.youtube.com/game_api/v1">` en producción, antes del código del juego.

## Roadmap
- **Q19** — Confirmado, con criterios de aceptación por fase:
  - F0 Base (scaffold, SDK + mock, ZIP, escena vacía con resize, 0×0 y pausa).
  - F1 MVP Abismo.
  - F2 Etapas completas.
  - F3 Pulido y certificación.
  - Futuro: Zone, mando, stems, más idiomas.
  - Alcance de trabajo: **solo documentación (.md), sin código.** F0 y F1 detalladas a fondo; F2, F3 y Futuro como resumen.

## Resiliencia
- **Q21**:
  - La partida vive en memoria; si `saveData` falla, el juego sigue sin interrumpirse.
  - Reintentos con backoff (2 s, 5 s, 15 s, 30 s…) y en cada movimiento, enviando solo el estado más reciente.
  - Icono de nube tachada en el HUD mientras haya un guardado pendiente.
  - Si se pierde el contexto WebGL, la escena se reconstruye desde el estado en memoria.
  - Errores reportados con `ytgame.health.logError()`.

## Nombre
- **Q23** — Nombre público: **2048 Pulse**. "2048 Effect" queda solo como nombre interno de la carpeta y el repo, para evitar parecido con la marca "Tetris Effect".

## Estructura de documentos
- **Q22**:
  - Raíz: `README.md` y `CLAUDE.md`.
  - `docs/`: `01-gdd.md`, `02-audio-visual.md`, `03-arquitectura.md`, `04-youtube-playables.md`, `05-roadmap.md`, `decisiones.md`.
  - `research/` se mantiene sin cambios.

## Monetización
- **Q24** — Sin anuncios ni compras. `ytgame.ads` queda como posible idea futura (solo entre partidas, nunca durante).

## Decisiones de implementación (F1)
> Las entradas sobre Tone.js (F1, F2, F3) quedan como historia: el motor de Tone.js se eliminó el 2026-10-20 (ver "Audio v2").

- **Reloj de Tone.js sin Web Worker.** Por defecto Tone usa un Worker (Blob) para su reloj, y eso es un riesgo de certificación. Se crea el contexto con `clockSource: 'timeout'` (`initToneContext()` en `AudioEngine.ts`) antes de cualquier otro uso de Tone. El código del Worker sigue presente en el bundle aunque no se ejecuta.
- **Mute de YouTube.** El `AudioContext` sigue corriendo con el master a 0, así el Transport mantiene vivo el pulso visual. No sale ningún sonido.
- **Chunks** separados para `three` y `tone`, cada uno por debajo de 512 KiB (SHOULD de Playables).
- **`StageDef.progression`** incluye `notes` (voicing) y `root`, para no tener que parsear nombres de acorde.

## Decisiones de implementación (F2)
- **Entornos.** Los 6 se crean al arrancar y sus shaders se precompilan juntos, así no hay tirones al cambiar de etapa. Solo el activo es visible. La transición usa `uPresence`: el mundo saliente se dispersa y el entrante se ensambla.
- **Audio por etapa.** `StageAudio` crea la música y los SFX de la etapa nueva en el siguiente compás. La anterior se desvanece en 1 compás y se libera 3 compases después. El BPM hace una rampa de 1 compás.
- **Remix.** Suma una capa `remixPerc` (hats en 1/16) activa en todas las secciones, +10% de BPM por vuelta (máximo +30%) y desplaza el tono de la paleta 0,11 por vuelta.
- **Debug.** El panel del mock tiene un botón "Next-stage tile", que convierte la ficha más pequeña en el próximo hito para probar transiciones.

## Decisiones de implementación (F3)
- **`PAR_FACTOR` pasa de 1.5 a 1.0.** Se calibró con `scripts/simulate-par.ts`: un bot heurístico, 200 partidas, mediana de ficha máxima 256.
  - Con 1.5, la mediana llegaba siempre dentro del par (3x para todos) y el bonus no distinguía.
  - Con 1.0, la mediana recibe ~2,1x, el p25 ~2,6x y el p75 ~1,5x.
  - Motivo: el tablero gana 2,2 de valor por movimiento, así que los movimientos hasta un récord se concentran en ~1,2–1,75× el mínimo teórico.
  - Hay que revisarlo con partidas humanas.
- **Tone.js sin Worker en el bundle.** El plugin `stripToneWorker` de Vite reemplaza `Ticker._createWorker` por un `throw`, y Tone cae a `setTimeout`. `npm run check` falla si aparece `new Worker(`.
- **`npm run check`** valida el bundle con las reglas de Playables: nombres, tamaños, nº de ficheros, SDK primero, rutas relativas, Workers y URLs externas.
- **`npm run zip`** genera el ZIP en Node puro. El `tar` de Git Bash generaba un `.tar` con extensión `.zip`.

## Bugs de audio corregidos (F3)
- **Solo sonaba con la pestaña en segundo plano.**
  - Síntoma medido: el reloj del `AudioContext` avanzaba al 55–83% del tiempo real con el juego visible (buffers sin llenar → cortes o silencio).
  - Causa: `latencyHint: 'interactive'` (~10 ms de buffer) más un reloj `setTimeout` con solo 50 ms de anticipación, mientras WebGL ocupaba el hilo principal.
  - Arreglo: `latencyHint: 'playback'` y `lookAhead: 0.15`. Todo lo musical va cuantizado y programado por adelantado, así que la latencia extra no se percibe.
  - Verificado en Chrome: tasa 1,00 estable jugando.
- **Excepción "Start time must be strictly greater than previous start time".**
  - Causa: dos movimientos dentro de la misma corchea programaban dos spawns en el mismo instante sobre un sinte monofónico. La excepción cortaba la reacción al movimiento, incluido el guardado.
  - Arreglo: guardia `monotonic()` en todos los instrumentos monofónicos, y `StageAudio.handle` captura cualquier error de audio (`logWarning`) para que nunca detenga la lógica.
- **Pads con "Max polyphony exceeded".** Polifonía 16 en pads y drones.

## Tutorial
- **Hint de primera partida** (confirmado): el texto "Desliza o usa las flechas para mover" aparece bajo el tablero y se oculta con el primer movimiento válido. No vuelve a salir: queda guardado como `tutorialDone` en el save.

## Pausa
- **Overlay de pausa** (confirmado, reemplaza "sin pantalla propia" de Q16b): en `onPause` se atenúa el tablero y aparece "En pausa", que desaparece solo en `onResume`. No tiene botón, porque reanudar lo dispara YouTube.

## Decisiones de implementación (F3, 2026-10-21)
- **Calidad según el equipo** (pedido: "si es de bajos recursos deberíamos bajar la calidad"). En auto, el nivel inicial sale de `deviceMemory`, `hardwareConcurrency`, el tipo de puntero y el renderer WebGL (ver `docs/03-arquitectura.md` §8.1). El gobernador baja de inmediato por debajo de 30 fps. La calidad baja también aliviana el audio (A13).
- **HUD al costado en pantallas anchas.** En 32:9 y 16:9 el marcador se superponía a la primera fila. `Hud.layout` lo mueve a la izquierda del tablero cuando arriba no hay ≥ 96 px.
- **Números de las fichas en canvas por CPU** (`willReadFrequently`). Con el canvas acelerado por GPU, algunas etiquetas creadas al arrancar salían con garabatos (Intel Iris Xe mientras compilan shaders). Fallo intermitente: no se confirmó la causa, pero el canvas por CPU no lo mostró.
- **Fichas más mates y sin blanco puro.** Luminancia máxima del color de ficha 0,62 y rugosidad 0,6: el blanco de Cosmos y el reflejo de la luz en la celda superior derecha superaban el umbral del bloom y tapaban el número.
- **Sin MSAA ni rejilla difuminada** (pedido del 2026-10-21: "se usan muchos recursos… que se vean los píxeles y sea fluido"). Se había agregado MSAA 2–4× en el postprocesado, una rejilla por shader con halo y 8 segmentos de redondeo en las fichas; se revirtió todo a líneas de 1 px, sin MSAA y 4 segmentos. La fluidez manda sobre el suavizado de bordes.
- **Calidad baja sin postprocesado** (feedback del 2026-10-21: "en el celular se ve un poco difuminado y lento"). En el celular el juego dibujaba a 1–1,5× sobre pantallas de 2,5–3× (borroso) y aun en calidad baja pasaba por el composer (textura intermedia + 2 pasadas a pantalla completa). Ahora la calidad baja dibuja directo al canvas con el antialiasing nativo y sube su densidad máxima de 1× a 2×. Se suma el indicador `DebugStats` (solo dev/mock) y `npm run preview:lan`.
- **El mock pausa al ocultarse la página** (feedback del 2026-10-21: "el sonido se escucha incluso cuando bloqueas el celular"). En YouTube es el host el que manda `onPause` al bloquear o salir; el mock no lo hacía, así que en `preview:lan` el audio seguía. Ahora `MockSdk` traduce `visibilitychange` a `onPause`/`onResume`, como haría YouTube. La regla de no usar `visibilitychange` sigue valiendo para el código del juego. Además, el reintento de audio por gesto quedó armado siempre (y escucha `pointerup`/`touchend`, que son los toques que el navegador cuenta como activación): al desbloquear, el navegador del celular puede dejar el `AudioContext` suspendido hasta el próximo toque.
- **Números en bordó y fichas sin latido** (pedido del 2026-10-21: "el difuminado de los números 2 y 4 no me gusta… bordó o algo entre cómodo de leer y bello… sacales el heartbeat"). El texto blanco en fichas oscuras superaba el umbral del bloom y quedaba con halo. Ahora cada número es bordó profundo o rosa palo, el de mayor contraste WCAG, con el claro atenuado bajo el umbral. Se quitó el pulso de escala y emisión de las fichas; la rejilla y el entorno siguen latiendo.
- **Crédito al creador original** (pedido del 2026-10-21). "Based on 2048 by Gabriele Cirulli" / "Basado en 2048 de Gabriele Cirulli" en la pantalla de título (sin link, por las reglas de Playables), al final de las descripciones de la ficha y en el README.
- **`npm run preview:csp`** sirve `dist/` con el CSP de Playables para probar violaciones en local.
- **`__pulse.capture()`** (solo dev) renderiza miniaturas a cualquier tamaño y las guarda en `marketing/thumbnails/` vía un endpoint del servidor de Vite (`captureEndpoint`). No entra en el bundle.

## Decisiones de implementación (audio v2)
- **`BeatClock` como línea de tiempo única.** Reemplaza al `Transport` de Tone. Avanza con el loop de render, así que el pulso visual late aunque el audio esté en mute o bloqueado, y se detiene solo en pausa. El audio lo sigue convirtiendo sus tiempos al `currentTime` del `AudioContext`.
- **El reloj avanza con el tiempo del audio cuando el audio corre.** Si solo avanzara con el `dt` de los frames, con FPS muy bajos (por ejemplo una pestaña en segundo plano: medido 0,1× del tiempo real) la música se ralentizaría. Mientras el `AudioContext` corre, cada frame avanza el `BeatClock` lo que avanzó el audio (vía `getOutputTimestamp`, tope de 0,25 s por frame); si el audio está suspendido o bloqueado, avanza con el `dt` del frame.
- **Base más tranquila** (feedback de escucha, 2026-10-20: "un poco pesado de escuchar, no me genera paz"). El drone desafinado 7 cents y el pad a ±4 cents generaban un batido constante. Ahora: drone en seno a −24 dB con su octava al 25%, pad a ±2 cents con respiración lenta (LFO de 0,08 Hz, ±20%), deslizamiento de acordes más lento y pads 4 dB más bajos y más oscuros en todas las etapas.
- **Armonía luminosa y timbres FM** (feedback de escucha, 2026-10-20: "me generan un poco de mala vibra… menos parecidos a los midi o una armonía más alegre"; elegida la opción "todo luminoso"). Las 6 etapas pasan a tonalidades mayores o lidias (Abismo Re mayor, Dunas La mixolidio, Neón Do mayor *city pop*, Luciérnagas Sol pentatónica, Tormenta Si♭ mayor, Cosmos Mi lidio); Tormenta saca su energía del ritmo, no de la oscuridad. Se eliminan dientes de sierra y cuadradas; jugador, arpegio y bajo usan `FmVoice` (celesta, kalimba, marimba, piano eléctrico) con vibrato leve y variación de volumen.
- **Base compuesta en loops** (pedido del 2026-10-20: "que no sea solo modificar tonos sino una melodía tranquila… loop de 4 compases en 4/4… 90 BPM… al avanzar, modulación a otra progresión más eufórica"; elegida la opción C, nivel = sección).
  - Cada etapa tiene 3 loops de 4 compases (uno por sección), cada uno en su tonalidad, con progresión de un acorde por compás y melodía compuesta. Reemplazan a `scale`/`progression`.
  - El cambio de sección espera al final del loop en curso para no cortar la frase; ahí modula, cambian las capas y el tempo sube con rampa de 1 compás. Lo visual cambia al instante.
  - Tempo: Abismo pasa de 88 a **90 BPM**; cada sección suma +6 BPM sobre el BPM base de la etapa.
  - Nueva capa `melody` (2 voces FM alternadas), activa en todas las secciones y en el título.
- **Sin nodos nuevos durante el juego.** Los osciladores de cada etapa corren siempre y solo se automatizan; las fuentes de ruido son buffers en bucle. Solo se crean nodos al cambiar de etapa.

## Pendiente de confirmar
- Nada.

## Riesgos conocidos
- Desde 2026-08-25 YouTube rechaza los Playables "sustancialmente idénticos" a otros existentes. El giro audio-reactivo tiene que diferenciar claramente el juego de otros 2048.
- El acceso al Developer Portal es solo por invitación (Private Preview).
