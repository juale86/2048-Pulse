# 04 — YouTube Playables aplicado a 2048 Pulse

> Fuente completa con URLs: `research/youtube-playables-requisitos.md` (documentación oficial consultada el 2026-10-19). Este documento traduce esos requisitos a decisiones concretas para este juego. MUST bloquea la certificación; SHOULD mejora la visibilidad.

## 1. Acceso y proceso

- El Developer Portal está en **Private Preview, solo por invitación**. La vía de entrada es el formulario de interés (enlace en el informe de research, §6.3).
- **Publicación**: se sube un ZIP al Developer Portal → *Verify and test* (Dev Link y Test Suite Link) → pruebas en youtube.com, m.youtube.com, Android e iOS → *Submit for Certification* → revisión → lanzamiento con un Partner Manager.
- No se puede enviar otra release mientras una esté en revisión.

## 2. Requisitos y cómo los cumplimos

### 2.1 SDK y ciclo de vida

| Requisito | Nivel | Cómo lo cumplimos |
|---|---|---|
| Cargar `game_api/v1` antes que cualquier código | MUST | Plugin de Vite `playablesSdkInject` (solo en prod) |
| No sobrescribir `ytgame` | MUST | Solo `YtSdk` lo lee |
| `firstFrameReady()` con pantalla de carga visible | MUST | `LoadingScreen` y luego la llamada |
| `gameReady()` solo cuando el juego es interactivo | MUST | Se llama tras `loadData` + escena + `compileAsync`, con el Título ya visible |
| `onPause`/`onResume` paran todo (loop, render, audio, entrada, red) | MUST | `PauseController` |
| Prohibido `visibilitychange` | MUST | Regla dura en CLAUDE.md |
| Guardar en `onPause` | SHOULD | Guardado inmediato en pausa |

### 2.2 Guardado y score

| Requisito | Nivel | Cómo lo cumplimos |
|---|---|---|
| Progreso solo vía `saveData` | MUST | `SaveManager`; `localStorage` solo en `MockSdk` |
| `await loadData` antes de `saveData` | MUST | `SaveManager` bloquea los guardados hasta cargar |
| Aceptar saves de versiones anteriores | MUST | Campo `v` + migraciones con tests |
| Save < 3 MiB (SHOULD < 500 KiB); flush de salida ≤ 64 KiB | MUST | Save < 1 KiB |
| String UTF-16 bien formado | MUST | JSON ASCII |
| Mejor `sendScore` == best del save | MUST | `best` se envía solo desde el valor guardado |
| `sendScore` entero, una sola métrica | MUST | Puntuación del modo infinito |

### 2.3 Técnicos

| Requisito | Nivel | Cómo lo cumplimos |
|---|---|---|
| Bundle inicial < 30 MiB (SHOULD < 15) comprimido | MUST | Objetivo < 5 MiB; MVP < 1 MiB |
| Cada fichero < 30 MiB (SHOULD < 512 KiB) | MUST | three.js ronda los 650 KB minificado: se trocea con `manualChunks` si hace falta (es SHOULD) |
| ≤ 8000 ficheros; nombres `[A-Za-z0-9._-]`; rutas relativas | MUST | `base: './'`; el bundle analyzer lo verifica |
| Carga < 5 s | SHOULD | Objetivo < 3 s en escritorio |
| Heap < 512 MB | MUST | Objetivo < 200 MB, pools, `dispose()` |
| SPA, sin ofuscar | MUST | Vite estándar |
| Sin peticiones externas ni analítica | MUST | Todo en el bundle, fuentes woff2 locales |
| wasm, `eval` y Workers pueden ser motivo de rechazo | Discrecional | No se usan |
| Todos los navegadores de YouTube y apps Android/iOS | MUST | WebGL2, con fallback a WebGL1 en calidad baja |
| Viewport 0×0 en Android al arrancar | MUST | `Renderer` ignora tamaños 0 |

### 2.4 Pantalla

| Requisito | Nivel | Cómo lo cumplimos |
|---|---|---|
| Jugable de 9:32 a 32:9 | MUST | Encuadre adaptativo con HUD arriba o al lado |
| No bloquear la orientación | MUST | — |
| Conservar el estado al redimensionar | MUST | El estado vive en `GameController`, no en el render |
| Nítido en cualquier DPR | MUST | UI en DOM, atlas de números según DPR |
| Sin scrollbars | SHOULD | `overflow: hidden` |

### 2.5 Entrada

| Requisito | Nivel | Cómo lo cumplimos |
|---|---|---|
| Touch en todas las interacciones | MUST | Pointer Events |
| Ratón en todas las interacciones | MUST | El arrastre con ratón mueve las fichas |
| Teclado direccional | SHOULD | Flechas y WASD |
| Esc cierra modales; nunca `preventDefault` sobre Esc | SHOULD / MUST | `SettingsModal` |
| No retrasar ni ignorar la entrada | MUST | Lógica inmediata, buffer de 1, sin bloqueo en transiciones |
| Háptica con interruptor | MUST | Ajuste "Háptica" |
| Objetivos táctiles ≥ 48 dp | SHOULD | Botones de UI |
| Sin botón de salir ni iconos que imiten los de Playables | MUST | El botón de ajustes usa un icono de engranaje, lejos de las esquinas de YouTube |

### 2.6 Audio

| Requisito | Nivel | Cómo lo cumplimos |
|---|---|---|
| Respetar el mute de YouTube, del sistema y el volumen del dispositivo | MUST | `isAudioEnabled` + `onAudioEnabledChange` en `master` |
| No sonar inesperadamente | MUST | Solo suena cuando YouTube lo permite |
| Sin botón de mute general; controles por canal permitidos | SHOULD | Sliders de música y SFX |
| No depender de un gesto para que suene | Fallo común | `resume()` al cargar, con reintento en el primer input |

### 2.7 Contenido

| Requisito | Nivel | Estado |
|---|---|---|
| Inglés obligatorio | MUST | en + es |
| Idioma vía `getLanguage()`, nunca `navigator.language` | MUST | `i18n.ts` |
| 13+, no "made for kids" | MUST | Contenido abstracto |
| Sin links externos, compartir, login, datos personales, QR | MUST | Nada de eso |
| Sin anuncios ni compras de terceros | MUST | Sin anuncios |
| PI y música totalmente liberadas; sin marcas de terceros | MUST | Música generativa propia, nombre "2048 Pulse" |
| Comunicar cuando no hay más contenido | MUST | Game over claro + "Otra vez" |
| **No ser "sustancialmente idéntico" a otro Playable** (desde 2026-08-25) | MUST | **Riesgo principal** (ver §3) |

## 3. Riesgos

1. **Política anti-duplicados.** Ya existen Playables tipo 2048. La diferenciación tiene que ser evidente en los primeros 10 segundos:
   - La música suena desde el título y cada movimiento toca una nota.
   - Fondo oscuro con partículas en lugar de la paleta beige del original.
   - Las etapas cambian el mundo entero.
   - El bonus de récord por movimientos es una regla de puntuación propia.

   Las miniaturas y la descripción del portal deben comunicarlo.
2. **Estado de pausa.** *(Resuelto.)* Hay overlay "En pausa" en `onPause` (ver `docs/decisiones.md`, Pausa).
3. **Audio y CSP.** *(Resuelto en audio v2.)* El audio es Web Audio nativa sin AudioWorklet ni Blob URLs, así que no depende del CSP.
4. **Tutorial.** *(Resuelto.)* Hint de primera partida que se oculta con el primer movimiento (ver `docs/decisiones.md`, Tutorial).
5. **Acceso.** Sin invitación al Developer Portal no se puede publicar. Conviene enviar el formulario de interés pronto.

## 4. Checklist de certificación

Estado de la auditoría local del 2026-10-21 (F3). ✅ verificado · ⏳ requiere dispositivo real, Dev Link o Test Suite.

- ✅ El script del SDK es el primero del `<head>` en el build de prod; `base: './'` (`npm run check`).
- ✅ Carga visible → `firstFrameReady()` → `loadData` + escena + `compileAsync` → `gameReady()` con el Título interactivo.
- ✅ `onPause`/`onResume` paran y restauran loop, render, audio, entrada y timers; se guarda en pausa (verificado con el mock: reloj congelado y `AudioContext` suspendido).
- ✅ `isAudioEnabled` + `onAudioEnabledChange` aplicados; sin mute general; sliders por canal.
- ✅ El audio intenta sonar sin gesto previo y reintenta en el primer input si el navegador lo bloquea.
- ✅ `getLanguage()`; en + es; fallback a en.
- ✅ Save versionado < 1 KiB; `await loadData` antes de guardar; migraciones con tests; best == `sendScore`.
- ✅ Touch, ratón (arrastre) y teclado; Esc cierra modales sin `preventDefault`. ⏳ Touch en dispositivo real.
- ✅ Responsive de 9:32 a 32:9 con el estado intacto (probado 9:32, 9:16, 1:1, 16:9, 21:9 y 32:9; en pantallas anchas el HUD pasa al costado del tablero). ⏳ Nitidez en DPR 2 y 3 (no se puede emular en la herramienta de prueba).
- ✅ Viewport 0×0 tolerado (canvas a 0 px: sin errores y recupera su tamaño).
- ✅ Cero peticiones externas con el CSP de Playables aplicado (`npm run build:mock && npm run preview:csp`): solo se piden `index.html`, el JS, el CSS y el `favicon` del navegador; sin violaciones de CSP.
- ✅ Sin links, compartir, login, QR ni botón de salir.
- ✅ `npm run check` en verde. ⏳ Bundle analyzer oficial y Test Suite (con el Dev Link).
- ✅ Heap de JS ~22 MB en Chrome de escritorio. ⏳ iOS Safari y Android de gama baja.
- ✅ Háptica con interruptor.
- ⏳ Pruebas con el Dev Link en las 4 plataformas (youtube.com, m.youtube.com, Android, iOS).
- ⏳ Rendimiento real: la calidad auto arranca según el equipo y baja si cae el fps, pero hay que confirmarlo jugando en un equipo modesto (la pestaña controlada por herramientas va a ~1 fps porque Chrome la limita, así que no sirve para medir).
