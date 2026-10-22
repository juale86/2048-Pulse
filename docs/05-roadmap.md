# 05 — Roadmap

| Fase | Objetivo | Detalle |
|---|---|---|
| **F0 · Base** | Proyecto que compila, empaqueta y respeta el ciclo de vida de Playables con una escena vacía | Completo (abajo) |
| **F1 · MVP Abismo** | El juego completo y jugable con una etapa | Completo (abajo) |
| F2 · Etapas | Las 6 etapas, transiciones, remix | Resumen |
| F3 · Pulido y certificación | Accesibilidad, rendimiento, tuning, Test Suite, envío | Resumen |
| Futuro | Zone, mando, stems, idiomas, anuncios entre partidas | Sin especificar |

Cada tarea indica en qué documento está su especificación. Una fase está terminada cuando **todos** sus criterios de aceptación se cumplen.

---

## F0 · Base

### Tareas

1. **Proyecto**: Vite + TypeScript strict + Vitest. Dependencias `three` y `tone`. `base: './'`. Estructura de carpetas según [03 §2](03-arquitectura.md#2-estructura-de-carpetas), con los ficheros vacíos o mínimos.
2. **Plataforma** ([03 §5](03-arquitectura.md#5-plataforma-srcplatform)):
   - Interfaz `PlayablesSdk`, `MockSdk` (sin panel de debug todavía) y `YtSdk`.
   - Selección por `VITE_PLAYABLES_SDK` (`.env.development` = mock, `.env.production` = youtube); cualquier otro valor da error.
   - Plugin `playablesSdkInject`.
3. **Renderer** ([03 §8](03-arquitectura.md#8-render)):
   - Canvas a pantalla completa, cámara en perspectiva, fondo oscuro, una rejilla 4×4 de prueba.
   - Resize que ignora 0×0. DPR limitado.
   - Loop con `start()`/`stop()`.
4. **Ciclo de vida**: `main.ts` → `firstFrameReady()` → escena → `gameReady()`. `PauseController` conectado a `onPause`/`onResume`.
5. **Empaquetado**: `npm run zip` genera `2048-pulse-<versión>.zip` a partir de `dist/` y valida los nombres de fichero con la regex de Playables.
6. **Verificación CSP**: probar el build con el CSP de Playables (*local overrides* de DevTools) incluyendo una nota de Web Audio sonando. Documentar el resultado en `docs/decisiones.md`.

### Criterios de aceptación

- [ ] `npm run dev` abre la escena con la rejilla; `npm run build` y `npm test` pasan sin errores.
- [ ] En el build de prod, `<script src="https://www.youtube.com/game_api/v1">` es el **primer** script del `<head>`; en dev no aparece.
- [ ] Un valor inválido de `VITE_PLAYABLES_SDK` hace fallar el build con un mensaje claro.
- [ ] Todas las rutas de `dist/` son relativas; `npm run zip` produce un ZIP que pasa la validación de nombres.
- [ ] Redimensionar la ventana (incluido 9:32 y 32:9) mantiene la rejilla centrada y nítida; forzar un contenedor 0×0 no lanza errores ni crea render targets de 0 px.
- [ ] Llamar a la pausa del mock detiene el `setAnimationLoop` (0 frames renderizados) y la reanudación lo restaura sin salto de `dt`.
- [ ] Cero peticiones de red externas en la pestaña Network (dev y prod).
- [ ] El audio de Web Audio suena bajo el CSP de Playables.
- [ ] No hay ninguna referencia a `window.ytgame` fuera de `YtSdk.ts`.

---

## F1 · MVP Abismo

### Tareas

**Núcleo** ([01 §3–5](01-gdd.md#3-reglas-idénticas-al-2048-original), [03 §4](03-arquitectura.md#4-núcleo-srccore))
1. `rng`, `board`, `move` (con trazado por id), `spawn`, `scoring` (base + bonus de récord), `stages` (etapa y sección; en F1 solo existe Abismo, pero la función devuelve el índice correcto) y `game.applyMove` con eventos.
2. Tests de [03 §4.3](03-arquitectura.md#43-cobertura-mínima-de-tests).

**Plataforma y guardado** ([03 §5–6](03-arquitectura.md#6-guardado))

3. `SaveManager` con esquema v1, migraciones, *debounce*, guardados inmediatos, reintentos con backoff y `CloudIndicator`.
4. `sendScore` con *throttle*; el valor enviado sale siempre de `best` del save.
5. Panel de debug del `MockSdk`: pausa, mute, idioma, fallo de guardado, 0×0, borrar save.

**Entrada** ([01 §7](01-gdd.md#7-entrada))

6. `Keyboard` (flechas y WASD), `Pointer` (swipe y arrastre con umbral y eje dominante ≥ 1,5×), `InputQueue` (completar animación al instante + buffer de 1) y `Haptics`.

**Render** ([02 §4](02-audio-visual.md#4-dirección-visual-base-común-a-todas-las-etapas), [03 §8](03-arquitectura.md#8-render))

7. `BoardView` (rejilla emisiva con pulso de compás) y `TileView` (pool, cubos redondeados, atlas de números, paleta de 3 colores por `log2`, animaciones de slide, pop y spawn).
8. `Particles`: pool GPU para estallidos de fusión y materializaciones de spawn.
9. `BeatUniforms` (`uBeat`, `uBar`, `uSection`) alimentados por el `BeatClock`.
10. Entorno `abismo`: plancton con ruido *curl*, medusas de partículas, destellos de fusión y rayos de luz en la sección 3.
11. `PostFx` (bloom, viñeta, aberración en drops), cámara (inclinación, balanceo y *punch*) y `Quality` (alta/media/baja/auto).
12. Pérdida y restauración del contexto WebGL.

**Audio** ([02 §2–3](02-audio-visual.md#2-mapa-sinestésico), [03 §9](03-arquitectura.md#9-audio))

13. `AudioEngine` (Web Audio pura: buses, delay, mute de YouTube, volúmenes, pausa, conversión de tiempo del `BeatClock`).
14. `BeatClock` (BPM, rampas, cuantización, callbacks en el tiempo del beat).
15. `StageMusic` + `StageAudio` para Abismo: progresión, 5 capas y entrada o salida por sección en límite de compás.
16. `Sfx`: el mapa sinestésico completo con los timbres de Abismo, 6 voces con robo, *ducking* y delay compartido.
17. `stages/abismo.json` + `StageDef` validado.

**UI e i18n** ([01 §6, §9](01-gdd.md#6-flujo-de-pantallas), [03 §11](03-arquitectura.md#11-i18n))

18. `LoadingScreen`, `TitleScreen` (Jugar/Continuar/Nueva partida, récord), `Hud` (puntuación, récord, ficha máxima, bonus `+N ×M`), `SettingsModal` (los 6 ajustes, Esc) y `GameOverPanel` (tablero visible, nuevo récord, "Otra vez").
19. i18n en/es por `getLanguage()` con fallback.
20. Errores: `onerror` y `unhandledrejection` → `logError()`.

### Criterios de aceptación

**Reglas y puntuación**
- [ ] Todos los tests de core pasan y cubren la lista de [03 §4.3](03-arquitectura.md#43-cobertura-mínima-de-tests).
- [ ] Una partida jugada a mano se comporta exactamente como el 2048 original (fusiones, spawn, game over).
- [ ] Al conseguir un récord ≥ 64 aparece `+bonus ×mult` en el HUD y el valor coincide con la fórmula de [01 §4.2](01-gdd.md#42-bonus-de-récord-por-movimientos-no-por-tiempo).
- [ ] Recargar la página a mitad de partida muestra **Continuar** y restaura el mismo tablero, puntuación y RNG: las siguientes fichas son las mismas que habrían salido sin recargar.

**Sensación**
- [ ] Un movimiento anima las fichas en el mismo frame en que se recibe la entrada.
- [ ] Cada movimiento válido suena con una nota del acorde según la dirección; cada fusión suena con una altura que sube con el valor; con varias fusiones suena un arpegio; un movimiento inválido suena como un golpe sordo inmediato.
- [ ] Las notas caen en la subdivisión correcta del `BeatClock` (verificable registrando el tiempo programado frente a la rejilla).
- [ ] Jugar rápido (≥ 8 movimientos/s con teclado) no pierde ninguna entrada ni deja animaciones a medias.
- [ ] Las 3 secciones de Abismo se activan con los umbrales de [01 §5.2](01-gdd.md#52-secciones-dentro-de-una-etapa) y las capas entran en el límite de compás.
- [ ] La rejilla, las fichas y el entorno pulsan con el beat también con el mute de YouTube activado.

**Plataforma**
- [ ] Con el mute de YouTube activado (mock) no sale ningún sonido; al desactivarlo vuelve sin recargar.
- [ ] La música suena en el Título sin interacción previa (si el navegador lo permite) y, si no, en el primer input.
- [ ] La pausa del mock congela render, audio, entrada y animaciones, y fuerza un guardado; la reanudación continúa sin saltos.
- [ ] Forzar fallos de guardado: el juego sigue, aparece la nube tachada, se reintenta y desaparece al recuperarse; tras recargar, el último estado guardado es el más reciente que se pudo enviar.
- [ ] El save es JSON < 1 KiB con `v: 1`; un save corrupto no rompe el juego (arranca con valores por defecto y emite `logWarning`).
- [ ] El `best` del save coincide siempre con el último `sendScore` enviado.
- [ ] Con idioma `es-419` la UI está en español; con `fr-FR`, en inglés.
- [ ] Simular la pérdida de contexto WebGL (`WEBGL_lose_context`) y restaurarlo recupera la escena con la partida intacta.

**Pantalla, entrada y rendimiento**
- [ ] Se juega con flechas, WASD, swipe en móvil y arrastre con ratón. Esc abre y cierra los ajustes.
- [ ] Jugable y legible en 9:32, 9:16, 1:1, 16:9 y 32:9, y nítido en DPR 1, 2 y 3.
- [ ] 60 fps en escritorio medio; la calidad auto baja de nivel en un dispositivo lento y se mantiene ≥ 30 fps.
- [ ] Bundle inicial < 1 MiB gzip; `gameReady` en < 3 s en escritorio; sin tirones por compilación de shaders en la primera fusión.
- [ ] "Efectos reducidos" y "Paleta clásica" funcionan y se guardan.
- [ ] Game over: las fichas quedan visibles, la base se corta al instante (y luego queda un drone bajito) y el panel muestra la puntuación, la ficha máxima y el nuevo récord si aplica.

---

## F2 · Etapas (resumen)

- Detallar y producir las etapas 2–6 (Dunas, Neón, Luciérnagas, Tormenta, Cosmos) al nivel de Abismo en [02 §5](02-audio-visual.md#5-las-6-etapas): progresión, capas, timbres, paleta, piel de fichas y entorno.
- Transición entre etapas ([02 §6](02-audio-visual.md#6-transición-entre-etapas)): drop, dispersión y ensamblado de partículas, *crossfade* de paleta, rampa de BPM y nombre en pantalla.
- Remix desde 4096: +10% de BPM por vuelta (tope +30%), *hue shift* y percusión extra.
- Precarga y precompilación de los entornos sin superar el presupuesto de carga inicial (los entornos 2–6 pueden cargarse en *lazy* tras `gameReady`).

## F3 · Pulido y certificación (resumen)

- Accesibilidad: revisión de contraste, `prefers-reduced-motion` y etiquetas AGI.
- Rendimiento en gama baja (Android WebView, iOS Safari) y memoria < 512 MB.
- Tuning de `PAR_FACTOR`, `RECORD_BONUS_MIN` y los umbrales de sección con partidas reales.
- Decidir el hint de tutorial y el overlay de pausa (ver los riesgos en [04 §3](04-youtube-playables.md#3-riesgos)).
- Checklist completa de [04 §4](04-youtube-playables.md#4-checklist-de-certificación-para-f3-verificable-desde-f1), Test Suite, bundle analyzer, CSP y Dev Link en las 4 plataformas.
- Miniaturas, título y descripción que comuniquen la diferenciación. Envío a certificación.

## Futuro (sin especificar)

- **Zone** (propuesta en `research/tetris-effect-estilos.md` §5).
- Mando (Gamepad API, vibración del mando al ritmo).
- Stems de audio pregrabados por etapa.
- Más idiomas.
- Anuncios de `ytgame.ads` solo entre partidas.
- Modos extra (Theater, Chill, Sprint).
