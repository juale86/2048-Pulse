# YouTube Playables: requisitos técnicos, SDK y certificación

> Investigación hecha el 2026-10-19 sobre la documentación oficial (versión en inglés, que es la normativa: "Translated requirements are provided for reference only").
> Proyecto: juego tipo 2048 en three.js (Vite + TypeScript), visuales audio-reactivos (bloom, partículas), música generativa con Web Audio / Tone.js, para escritorio y móvil, controles flechas/WASD + swipe.
>
> **Leyenda**
> - ✅ **Confirmado**: está escrito en la documentación oficial (se cita la URL).
> - ⚠️ **Inferencia / incierto**: deducción nuestra a partir de la documentación, o tema que la documentación no trata. Hay que validarlo con el Test Suite o con el Partner Manager.
>
> Los niveles MUST / SHOULD / MAY siguen la RFC 2119. Incumplir un MUST bloquea la publicación. Cumplir los SHOULD puede mejorar la visibilidad ([overview](https://developers.google.com/youtube/gaming/playables/certification/requirements)).

## Fuentes primarias consultadas

| Tema | URL |
|---|---|
| Portada de Playables (última actualización 2026-08-31) | https://developers.google.com/youtube/gaming/playables |
| Getting started (carga del SDK) | https://developers.google.com/youtube/gaming/playables/reference/getting_started |
| Referencia del SDK | https://developers.google.com/youtube/gaming/playables/reference/sdk |
| Tipos TypeScript (`index.d.ts`) | https://www.youtube.com/playablesportal/static/youtube_ytgame_web_deploy_mpm_files/index.d.ts |
| Requisitos de publicación (resumen) | https://developers.google.com/youtube/gaming/playables/certification/requirements |
| Integración | https://developers.google.com/youtube/gaming/playables/certification/requirements_integration |
| Estabilidad y rendimiento | https://developers.google.com/youtube/gaming/playables/certification/requirements_stability |
| Diseño | https://developers.google.com/youtube/gaming/playables/certification/requirements_design |
| Privacidad y datos (incluye ofuscación, WASM y SPA) | https://developers.google.com/youtube/gaming/playables/certification/requirements_privacydata |
| i18n / L10n | https://developers.google.com/youtube/gaming/playables/certification/requirements_i18n_l10n |
| Monetización | https://developers.google.com/youtube/gaming/playables/certification/requirements_monetization |
| Trust & Safety | https://developers.google.com/youtube/gaming/playables/certification/requirements_trustsafety |
| Accesibilidad | https://developers.google.com/youtube/gaming/playables/certification/requirements_accessibility |
| Buenas prácticas de diseño | https://developers.google.com/youtube/gaming/playables/certification/best_practices_design |
| Historial de cambios | https://developers.google.com/youtube/gaming/playables/certification/revisionhistory |
| FAQ general | https://developers.google.com/youtube/gaming/playables/support/faq |
| FAQ de certificación | https://developers.google.com/youtube/gaming/playables/support/certification_faq |
| Guía del Test Suite (CSP) | https://developers.google.com/youtube/gaming/playables/reference/test_suite_guide |
| Test Suite (alojado) | https://developers.google.com/youtube/gaming/playables/test_suite |
| Bundle analyzer | https://developers.google.com/youtube/gaming/playables/samples/bundle_analyzer |
| Developer Portal | https://developers.google.com/youtube/gaming/playables/developer_portal |
| Ejemplos open source | https://github.com/google/web-game-samples |

---

## 1. Integración del SDK

### 1.1 Carga
- ✅ Se carga con esta etiqueta en el `index.html` de la raíz del bundle:
  ```html
  <script src="https://www.youtube.com/game_api/v1"></script>
  ```
  El SDK **MUST** cargarse antes que cualquier código del juego, y esto se valida al publicar. Servido en local, el SDK no hace nada (no-op). ([getting_started](https://developers.google.com/youtube/gaming/playables/reference/getting_started), [integración §1](https://developers.google.com/youtube/gaming/playables/certification/requirements_integration))
- ✅ Expone el global `ytgame`, que **MUST NOT** sobrescribirse. Namespaces: `ads`, `engagement`, `game`, `health`, `system`. También expone `SdkError`, `SdkErrorType`, `IN_PLAYABLES_ENV` y `SDK_VERSION`. ([SDK](https://developers.google.com/youtube/gaming/playables/reference/sdk))
- ✅ Hay tipos TypeScript oficiales en `index.d.ts` (enlace en la tabla de fuentes). ([getting_started](https://developers.google.com/youtube/gaming/playables/reference/getting_started))
- ✅ Para detectar el entorno, la referencia propone `typeof ytgame !== "undefined" && ytgame.IN_PLAYABLES_ENV`. Su propio ejemplo usa `saveData` dentro de Playables y `localStorage` fuera de él. ([SDK](https://developers.google.com/youtube/gaming/playables/reference/sdk))
- ⚠️ **Vite**: la etiqueta del SDK tiene que ser un `<script>` clásico y síncrono, colocado antes del `<script type="module">` que inyecta Vite. Los módulos se difieren, así que con ese orden el SDK ya está cargado cuando arranca el juego. Como `ytgame` llega por URL y no por npm, conviene una capa `platform/` con un *adapter* que tenga un mock para desarrollo local.

### 1.2 Ciclo de vida: llamadas obligatorias
| API | Firma | Reglas (✅) |
|---|---|---|
| `ytgame.game.firstFrameReady()` | `(): void` | **MUST** llamarse; si no, el juego no se muestra. Debe ir antes de `gameReady()` y mientras se ve una pantalla de carga o splash que diga claramente que se está cargando. |
| `ytgame.game.gameReady()` | `(): void` | **MUST** llamarse solo cuando el juego ya acepta interacción (menú principal o partida lista). **MUST NOT** llamarse con un splash o loading todavía en pantalla, o la certificación falla. YouTube no quita su spinner hasta esta llamada. |

Fuentes: [SDK](https://developers.google.com/youtube/gaming/playables/reference/sdk), [integración §2](https://developers.google.com/youtube/gaming/playables/certification/requirements_integration)

### 1.3 Pausa y reanudación
- ✅ `ytgame.system.onPause(cb)` y `onResume(cb)` devuelven una función para quitar el callback. `onPause` salta en **todas** las pausas, salir del juego incluido. Después hay una ventana corta para guardar estado y no está garantizado que haya un resume. ([SDK](https://developers.google.com/youtube/gaming/playables/reference/sdk))
- ✅ Tras `onPause` el juego **MUST** detener toda la ejecución (game loop, música, interacciones, llamadas de red y render), y **MUST** reanudarla solo con `onResume`. ([integración §6](https://developers.google.com/youtube/gaming/playables/certification/requirements_integration))
- ✅ **MUST NOT** usar la Page Visibility API (`visibilitychange`) ni APIs web parecidas. Solo valen `onPause`/`onResume`. ([integración §6](https://developers.google.com/youtube/gaming/playables/certification/requirements_integration))
- ✅ SHOULD guardar el progreso en `onPause`. ([integración §6](https://developers.google.com/youtube/gaming/playables/certification/requirements_integration))
- ✅ Buenas prácticas: mostrar un estado de pausa claro, con su botón de reanudar, para que no parezca que el juego se ha colgado. ([best practices](https://developers.google.com/youtube/gaming/playables/certification/best_practices_design))

### 1.4 Audio (API)
- ✅ `ytgame.system.isAudioEnabled(): boolean` sirve para inicializar el estado del audio (SHOULD). ([SDK](https://developers.google.com/youtube/gaming/playables/reference/sdk))
- ✅ `ytgame.system.onAudioEnabledChange((enabled) => …)` es obligatoria (MUST) para actualizar el estado del audio. ([SDK](https://developers.google.com/youtube/gaming/playables/reference/sdk), [integración §5](https://developers.google.com/youtube/gaming/playables/certification/requirements_integration))
- La sección 4 detalla las reglas de audio.

### 1.5 Idioma
- ✅ `ytgame.system.getLanguage(): Promise<string>` devuelve una etiqueta BCP-47 (`"en-US"`, `"es-419"`…). Es el idioma configurado en YouTube. No hay que guardar el idioma en el cloud save ni detectarlo por otros medios. ([SDK](https://developers.google.com/youtube/gaming/playables/reference/sdk))
- ✅ **MUST NOT** usar `navigator.language` ni `navigator.languages`. ([i18n](https://developers.google.com/youtube/gaming/playables/certification/requirements_i18n_l10n))

### 1.6 Guardado en la nube
- ✅ `ytgame.game.loadData(): Promise<string>` y `ytgame.game.saveData(data: string): Promise<void>`. La serialización corre por cuenta del juego (p. ej. JSON). ([SDK](https://developers.google.com/youtube/gaming/playables/reference/sdk))
- ✅ `data` debe ser un string UTF-16 bien formado (se puede comprobar con `String.isWellFormed()`) y no pasar de **3 MiB**. Si se excede, el error es `SIZE_LIMIT_EXCEEDED`. ([SDK](https://developers.google.com/youtube/gaming/playables/reference/sdk))
- ✅ Tamaño de la partida guardada: **MUST < 3 MiB** y **SHOULD < 500 KiB**. ([estabilidad §4](https://developers.google.com/youtube/gaming/playables/certification/requirements_stability))
- ✅ Reglas de integración ([integración §4](https://developers.google.com/youtube/gaming/playables/certification/requirements_integration)):
  - **MUST** llamar a `saveData` cuando haya progreso material que el jugador espera ver guardado. Solo quedan exentos los juegos diseñados para empezar de cero en cada sesión.
  - **MUST NOT** guardar el progreso por ningún otro mecanismo, así que nada de `localStorage` o IndexedDB para el progreso dentro de Playables.
  - **MUST** esperar con `await` a que `loadData` termine bien antes de cualquier `saveData`. Si no, el guardado se rechaza.
  - **MUST** aceptar saves de versiones anteriores sin errores ni crashes (los datos necesitan un campo de versión y migraciones).
  - SHOULD guardar automáticamente en los hitos importantes. Al salir se hace un *flush* final, pero es best-effort y **solo admite hasta 64 KiB**.
- ✅ Si se usa `sendScore`, el mejor score enviado **MUST** coincidir con el mejor score del save. ([integración §3](https://developers.google.com/youtube/gaming/playables/certification/requirements_integration))
- ⚠️ En un 2048, el estado del tablero (16 celdas), el score, el best y la configuración caben de sobra en menos de 1 KiB, muy por debajo del flush de 64 KiB. Propuesta: guardar tras cada movimiento con *debounce* y además en `onPause`.

### 1.7 Score y engagement
- ✅ `ytgame.engagement.sendScore({ value })`: `value` es un entero ≤ `Number.MAX_SAFE_INTEGER`; si no, se rechaza. Debe medir una sola dimensión de progreso, siempre la misma. YouTube muestra el score más alto, así que el high score del juego tiene que cuadrar con lo enviado. Es opcional (MAY). ([SDK](https://developers.google.com/youtube/gaming/playables/reference/sdk), [integración §3](https://developers.google.com/youtube/gaming/playables/certification/requirements_integration))
- ✅ `ytgame.engagement.openYTContent({ id, contentType? })` abre un vídeo (`VIDEO`, el valor por defecto) u otro Playable (`PLAYABLE`). En la web suele abrirse en otra pestaña. En móvil, un vídeo va al miniplayer y un Playable reemplaza al actual. ([SDK](https://developers.google.com/youtube/gaming/playables/reference/sdk))

### 1.8 Salud y logs
- ✅ `ytgame.health.logError()` y `ytgame.health.logWarning()` no reciben parámetros. Son best-effort y tienen límite de frecuencia, así que pueden perder datos. ([SDK](https://developers.google.com/youtube/gaming/playables/reference/sdk))
- ⚠️ Conviene llamarlas desde `window.onerror`, `unhandledrejection` y `webglcontextlost`.

### 1.9 Errores
- ✅ `ytgame.SdkError extends Error` con `errorType: SdkErrorType`, que puede ser `API_UNAVAILABLE` (temporal: pedir al jugador que reintente), `INVALID_PARAMS`, `SIZE_LIMIT_EXCEEDED` o `UNKNOWN`. Los ejemplos avisan de que el `error` capturado puede ser `undefined`. ([SDK](https://developers.google.com/youtube/gaming/playables/reference/sdk))

### 1.10 Anuncios (opcional)
- ✅ `ytgame.ads.requestInterstitialAd()` y `requestRewardedAd(rewardId)`. Ninguna garantiza que el anuncio llegue a mostrarse. Si se usan, el juego tiene que seguir respetando mute y pausa, y hay que activar la monetización en el Developer Portal. ([SDK](https://developers.google.com/youtube/gaming/playables/reference/sdk), [monetización](https://developers.google.com/youtube/gaming/playables/certification/requirements_monetization))

---

## 2. Requisitos técnicos

### 2.1 Tamaños y ficheros ([estabilidad](https://developers.google.com/youtube/gaming/playables/certification/requirements_stability))
| Requisito | MUST | SHOULD |
|---|---|---|
| Bundle inicial (bytes descargados desde el inicio de carga hasta `gameReady`, **tras compresión HTTP**) | < 30 MiB | < 15 MiB |
| Bundle total (todos los ficheros alojados) | < 250 MiB (con excepciones a negociar) | carga mínima y lazy loading del resto |
| Cada fichero individual | < 30 MiB (**límite duro, sin excepciones**, según la [FAQ de certificación](https://developers.google.com/youtube/gaming/playables/support/certification_faq)) | < 512 KiB |
| Número de ficheros | ≤ 8000 | — |
| Partida guardada | < 3 MiB | < 500 KiB |
| Tiempo hasta interactivo | — | < 5 s |
| Heap JS pico | **MUST NOT** superar 512 MB | — |

- ✅ Nombres de fichero: solo alfanuméricos y `_`, `-`, `.`. El regex del analizador oficial es `^[a-zA-Z0-9\-\._]+$`. ([estabilidad §9](https://developers.google.com/youtube/gaming/playables/certification/requirements_stability), [bundle analyzer](https://developers.google.com/youtube/gaming/playables/samples/bundle_analyzer))
- ✅ Referencias entre ficheros: **solo rutas relativas**. Las absolutas no cargan. ([estabilidad §8](https://developers.google.com/youtube/gaming/playables/certification/requirements_stability)) ⚠️ En Vite hace falta `base: './'`.
- ✅ El bundle se sube como **ZIP** al Developer Portal. ([developer portal](https://developers.google.com/youtube/gaming/playables/developer_portal))
- ✅ YouTube comprime en la ingesta. No se recomienda precomprimir, y hoy **no hay Brotli ni cabeceras HTTP personalizadas**. ([FAQ cert.](https://developers.google.com/youtube/gaming/playables/support/certification_faq))
- ✅ El bundle analyzer oficial es un script Python que comprueba tamaño por fichero, tamaño total, número de ficheros y nombres. ([bundle analyzer](https://developers.google.com/youtube/gaming/playables/samples/bundle_analyzer))
- ⚠️ Tipos de fichero permitidos: no hay lista blanca explícita. La guía del CSP sí deja ver lo que funciona: imágenes y media desde `'self'`, `blob:` y `data:` (este último solo para imágenes), y fuentes desde `'self'`, `data:` y Google Fonts. Otros requisitos mencionan HTML, JS, WASM y media ([estabilidad §3](https://developers.google.com/youtube/gaming/playables/certification/requirements_stability)).
- ⚠️ El SHOULD de 512 KiB por fichero choca con three.js: el chunk minificado ronda los 600–700 KB antes de gzip. Se puede trocear con `manualChunks` o simplemente aceptarlo, porque es SHOULD.

### 2.2 Red y autocontención ([privacidad](https://developers.google.com/youtube/gaming/playables/certification/requirements_privacydata), [FAQ cert.](https://developers.google.com/youtube/gaming/playables/support/certification_faq))
- ✅ **MUST NOT** hacer llamadas externas a ninguna URL o servicio, salvo las APIs de Google/YouTube que exijan otros requisitos. **MUST NOT** intentar saltarse esa prevención.
- ✅ No se permite analítica propia, ni siquiera interna.
- ✅ Todos los datos del juego deben venir en el bundle. Los datos remotos están en piloto solo con títulos seleccionados.
- ✅ **MUST NOT** generar ni mostrar gráficos que parezcan o funcionen como códigos QR.
- ✅ CSP con el que YouTube sirve los Playables, según la [guía del Test Suite](https://developers.google.com/youtube/gaming/playables/reference/test_suite_guide):
  ```
  default-src 'none'; script-src 'report-sample' 'self' 'unsafe-eval' 'unsafe-inline' blob: https://www.youtube.com/game_api/v0 https://www.youtube.com/game_api/v0/ https://www.youtube.com/game_api/v1 https://www.youtube.com/game_api/v1/; object-src 'none'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' blob: data:; media-src 'self' blob:; font-src 'self' data: https://fonts.googleapis.com https://fonts.gstatic.com; connect-src 'self' blob: data:; sandbox allow-pointer-lock allow-same-origin allow-scripts; base-uri 'self'; manifest-src 'self'; worker-src 'self' blob:
  ```
- ✅ Si se crea un `<script>` desde JS, hay que copiarle el `nonce` de la página (`script.nonce = document.querySelector('script[nonce]')?.nonce`). ([FAQ cert.](https://developers.google.com/youtube/gaming/playables/support/certification_faq))
- ⚠️ El CSP permite Google Fonts, pero lo prudente es autoalojar las fuentes (woff2 en el bundle) para no depender de terceros.

### 2.3 Arquitectura, código y lenguaje ([privacidad §5–8](https://developers.google.com/youtube/gaming/playables/certification/requirements_privacydata))
- ✅ **MUST** ser una SPA.
- ✅ **MUST NOT** ofuscar. Se permite minificar (quitar espacios y comentarios, acortar nombres, unir ficheros), y transpilar TS a JS no cuenta como ofuscación. ⚠️ La salida por defecto de Vite/esbuild/terser es aceptable. Hay que evitar plugins ofuscadores.
- ✅ El tamaño y la complejidad del código (JS, scripts y WASM) quedan limitados a lo que las herramientas de YouTube puedan analizar, y ese límite puede cambiar.
- ✅ YouTube puede rechazar, a su discreción, juegos que no pueda evaluar por usar **WebAssembly, `eval()` o Web Workers**. No es una prohibición tajante, pero sí un riesgo de certificación.

### 2.4 Plataforma y gráficos ([estabilidad §7](https://developers.google.com/youtube/gaming/playables/certification/requirements_stability), [FAQ](https://developers.google.com/youtube/gaming/playables/support/faq))
- ✅ **MUST** basarse en Web APIs estándar (los ejemplos citados son JavaScript, Canvas y WebGL).
- ✅ **MUST** funcionar en todos los navegadores que soporta YouTube (Edge, Chrome, Firefox, etc.) y en la app de YouTube para Android e iOS.
- ✅ three.js aparece entre los motores ya usados en Playables. ([portada](https://developers.google.com/youtube/gaming/playables))
- ✅ En iOS los Playables corren sobre Safari/WebKit. Pasar de 512 MB de heap suele provocar crashes y recargas. ([FAQ](https://developers.google.com/youtube/gaming/playables/support/faq))
- ✅ En Android el juego se carga primero en un WebView oculto con **viewport de 0×0**. El código tiene que arrancar igualmente, sin colgarse ni fallar con tamaño 0, y aplicar el alto en `resize` solo cuando `innerHeight` no sea cero. ([FAQ cert.](https://developers.google.com/youtube/gaming/playables/support/certification_faq))
- ⚠️ **WebGL2 / WebGPU**: la documentación no los menciona. three.js actual usa WebGL2. WebGL2 está disponible en los navegadores modernos (Safari incluido desde la versión 15), así que el riesgo es bajo. WebGPU **no** debe ser obligatorio: el requisito de compatibilidad con todos los navegadores y con los WebViews obliga a tener *fallback* a WebGL2.
- ⚠️ **FPS**: no hay un objetivo de fps documentado. Sí cuentan "MUST NOT unintentionally delay or ignore user input" ([diseño §2](https://developers.google.com/youtube/gaming/playables/certification/requirements_design)), el SHOULD de carga en menos de 5 s y la prohibición de crashes.
- ⚠️ **Gama baja de Android**: no hay especificación mínima de dispositivo. Se recomienda un sistema de calidad adaptativa (DPR, resolución del bloom y número de partículas).

### 2.5 Orientación, aspecto y resize ([diseño §1](https://developers.google.com/youtube/gaming/playables/certification/requirements_design))
- ✅ **MUST** ser responsive y jugable en cualquier relación de aspecto. Ejemplos citados: 9:32, 9:21, 9:16, 3:4, 1:1, 4:3, 16:9, 21:9, 32:9. **MUST** adaptarse solo cuando cambia el viewport.
- ✅ SHOULD ocupar todo el viewport. Si no lo hace, **MUST** quedar centrado con pillarbox o letterbox.
- ✅ **MUST NOT** bloquear la orientación ni la postura del dispositivo (foldables).
- ✅ **MUST** conservar el estado al redimensionar.
- ✅ **MUST** verse nítido (sin blur, pixelado ni estirado) en cualquier resolución y densidad. ⚠️ Hay que manejar `devicePixelRatio`, con un tope por rendimiento que no llegue a emborronar el texto de la UI (mejor UI en DOM o SDF).
- ✅ Buenas prácticas: sin scrollbars por desbordamiento. Probar foldables con la emulación de DevTools o de Android Studio. ([best practices](https://developers.google.com/youtube/gaming/playables/certification/best_practices_design), [FAQ](https://developers.google.com/youtube/gaming/playables/support/faq))

### 2.6 Almacenamiento
- ✅ El progreso se guarda **solo** con `saveData` ([integración §4](https://developers.google.com/youtube/gaming/playables/certification/requirements_integration)). La referencia muestra `localStorage` como alternativa **fuera** de Playables ([SDK](https://developers.google.com/youtube/gaming/playables/reference/sdk)).
- ⚠️ No hay ninguna regla explícita que prohíba `localStorage`, cookies o IndexedDB para otros fines. Aun así, mejor guardar también las preferencias (volúmenes, háptica, calidad) en el cloud save, que es multiplataforma, y no tocar `localStorage` dentro de Playables. El idioma **no** va en el save: se lee siempre con `getLanguage()`.

---

## 3. Entrada ([diseño §2](https://developers.google.com/youtube/gaming/playables/certification/requirements_design), [best practices](https://developers.google.com/youtube/gaming/playables/certification/best_practices_design))
- ✅ **MUST** admitir **touch** en todas las interacciones.
- ✅ **MUST** admitir **ratón** en todas las interacciones. ⚠️ En un 2048 eso significa que el *swipe* también tiene que funcionar arrastrando con el ratón. Lo más sencillo es unificar con Pointer Events.
- ✅ SHOULD admitir teclado para entrada direccional (flechas/WASD). Las buenas prácticas piden teclado para todo el gameplay y la navegación.
- ✅ SHOULD cerrar modales y diálogos con **Esc**, además de un botón visible de cerrar.
- ✅ **MUST NOT** llamar a `preventDefault()` en eventos de **Esc**: en Safari a pantalla completa impide salir. Tampoco hay que asignar acciones a una pulsación larga de Esc.
- ✅ **MUST NOT** retrasar ni ignorar la entrada sin querer. **MUST NOT** haber errores en los componentes de UI.
- ✅ Háptica: MAY usarse, pero si se usa, **MUST** tener un interruptor on/off.
- ✅ Objetivos táctiles de al menos 48×48 dp con 8 dp de separación. Estados visuales distintos para enabled, disabled, hover, focus y pressed.
- ✅ **MUST NOT** incluir un botón de salir del juego ni iconos que imiten las acciones de Playables (cerrar, mute, menú) cerca de ellas. ([diseño §6.4](https://developers.google.com/youtube/gaming/playables/certification/requirements_design))
- ✅ Portapapeles: **MUST NOT** acceder a él salvo cuando el jugador pega de forma explícita. ([privacidad §4.1](https://developers.google.com/youtube/gaming/playables/certification/requirements_privacydata))
- ⚠️ **Gamepad**: la documentación no dice nada. Sería un extra opcional.
- ⚠️ **Pointer Lock**: el sandbox del CSP lo permite (`allow-pointer-lock`), pero un 2048 no lo necesita.
- ⚠️ **Fullscreen**: no hay ningún requisito ni prohibición explícita. El sandbox del CSP no incluye un token de fullscreen, y YouTube ya gestiona su propio contenedor. Recomendación: no llamar a `requestFullscreen`.
- ⚠️ Usar `preventDefault` en flechas y espacio para evitar el scroll es razonable, porque solo Esc está prohibido. En el canvas, `touch-action: none` evita que el swipe se interprete como gesto de scroll o zoom.

---

## 4. Audio ([integración §5](https://developers.google.com/youtube/gaming/playables/certification/requirements_integration), [FAQ cert.](https://developers.google.com/youtube/gaming/playables/support/certification_faq))
- ✅ **MUST** respetar el mute y el ajuste de audio del **sistema**, el **volumen del dispositivo** y el **mute de YouTube** (este último con `isAudioEnabled` y `onAudioEnabledChange`).
- ✅ Con el mute de YouTube activo, **no** puede salir audio, y los controles del juego **MUST NOT** cambiar eso. Sin mute de YouTube, los controles del juego MAY afectar a la salida.
- ✅ **MUST NOT** sonar de forma inesperada.
- ✅ SHOULD NOT mostrar un botón de mute general dentro del juego, porque ya está el de YouTube. MAY haber controles por canal (música y SFX), y las buenas prácticas los recomiendan (sliders o toggles por canal).
- ✅ Tras `onPause` también se para la música.
- ✅ El fallo de certificación más común en audio son los juegos que **esperan una interacción del usuario para empezar a sonar**. Los Playables pueden recibir el foco automáticamente, y el juego tiene que contemplar ese caso. ([FAQ cert.](https://developers.google.com/youtube/gaming/playables/support/certification_faq)) Los [samples](https://github.com/google/web-game-samples) incluyen un ejemplo de configuración de audio.
- ⚠️ Propuesta de implementación:
  - Un `AudioContext` único con un `GainNode` maestro. Ganancia efectiva = `ytAudioEnabled ? (master * canal) : 0`.
  - Al iniciar, intentar `ctx.resume()` si `isAudioEnabled()`, y reintentarlo en el primer `pointerdown`/`keydown` por si el navegador lo bloquea.
  - En `onPause`, `ctx.suspend()` y parar el transport de Tone.js. En `onResume`, reanudar solo si el audio sigue habilitado.
  - Las visuales audio-reactivas tienen que seguir funcionando con el audio silenciado. Un `AnalyserNode` colocado **después** del gain maestro devuelve ceros, así que hay que analizar la señal **antes** del gain maestro, o tirar del estado del secuenciador, para que el visual no "muera" con el mute.

---

## 5. Contenido y UX

### 5.1 Prohibido o restringido
- ✅ Links externos clicables (los de canal son la excepción), prompts de compartir, acuerdos de usuario adicionales y botón de salir. ([diseño §6](https://developers.google.com/youtube/gaming/playables/certification/requirements_design))
- ✅ Monetización, anuncios y compras con servicios de terceros. Solo valen los anuncios de `ytgame.ads`. ([monetización](https://developers.google.com/youtube/gaming/playables/certification/requirements_monetization))
- ✅ Pedir o recoger datos personales (nombre, edad, ubicación, usuario, contraseña) o mostrar algo que parezca un login o un registro de cuenta. ([privacidad §4.2](https://developers.google.com/youtube/gaming/playables/certification/requirements_privacydata))
- ✅ QR. ([privacidad §3](https://developers.google.com/youtube/gaming/playables/certification/requirements_privacydata))
- ✅ Logos o branding en miniaturas, títulos o descripciones. ([diseño §4](https://developers.google.com/youtube/gaming/playables/certification/requirements_design))

### 5.2 Edad, derechos y originalidad ([trust & safety](https://developers.google.com/youtube/gaming/playables/certification/requirements_trustsafety))
- ✅ Hay que cumplir las Community Guidelines. El juego **no** puede ser "made for kids": tiene que ser apto para público general de 13 años en adelante.
- ✅ Derechos de PI y de música totalmente liberados. Sin trademarks ni trade dress de terceros.
- ✅ Desde el 25 de agosto de 2026 no se permiten juegos duplicados o "sustancialmente idénticos" a Playables existentes. ([revision history](https://developers.google.com/youtube/gaming/playables/certification/revisionhistory)) ⚠️ **Riesgo relevante para un clon de 2048**: ya existen Playables tipo 2048. El concepto audio-reactivo tiene que ser un diferenciador claro, y conviene evitar el nombre, la paleta y el look del 2048 original (el original es MIT, pero el riesgo aquí es la similitud con otros Playables). La música generativa simplifica los derechos musicales.
- ✅ Los enlaces de desarrollo y staging no se pueden compartir fuera.

### 5.3 Localización ([i18n](https://developers.google.com/youtube/gaming/playables/certification/requirements_i18n_l10n))
- ✅ **MUST** estar en inglés. Usar `getLanguage()` es MAY. Están prohibidas las APIs web de idioma.
- ⚠️ Lo práctico es ofrecer inglés y español, con *fallback* a `en`, y casar las etiquetas BCP-47 por prefijo (`es-419` → `es`).

### 5.4 Carga, primer frame y fin de contenido
- ✅ Hay que mostrar una pantalla de carga explícita, llamar a `firstFrameReady()`, y después llamar a `gameReady()` solo cuando el juego sea interactivo (ver §1.2).
- ✅ **MUST** comunicar cuando no queda más contenido. ([diseño §5](https://developers.google.com/youtube/gaming/playables/certification/requirements_design)) ⚠️ En un 2048 infinito puede bastar con un game over claro y un "nueva partida".
- ✅ Buenas prácticas: tutorial breve y contextual, contraste WCAG (4.5:1 / 3:1) y texto escalable. ([best practices](https://developers.google.com/youtube/gaming/playables/certification/best_practices_design))

### 5.5 Accesibilidad ([accesibilidad](https://developers.google.com/youtube/gaming/playables/certification/requirements_accessibility))
- ✅ SHOULD apuntar a WCAG AA y añadir las etiquetas AGI (Accessible Games Initiative). **MUST NOT** declarar etiquetas falsas.
- ⚠️ Con visuales muy intensos (bloom y partículas reactivas) conviene una opción de "reducir efectos o destellos" (fotosensibilidad). No es obligatorio según la documentación, pero ayuda en la revisión de Trust & Safety y con las etiquetas AGI.

### 5.6 Metadatos ([diseño §4](https://developers.google.com/youtube/gaming/playables/certification/requirements_design))
- ✅ Miniaturas en varias relaciones de aspecto, descripción, título, género y datos del publisher/developer. Se rellenan en el Developer Portal.

---

## 6. Pruebas, certificación y acceso

### 6.1 Herramientas
- ✅ **SDK Test Suite** alojado en https://developers.google.com/youtube/gaming/playables/test_suite. Acepta juegos servidos desde `localhost` **sin HTTPS** (desde junio de 2024). Tiene botón de refresco, comprueba nombres de fichero, simula la pantalla de carga y alterna el audio en pausa/resume. Mide el bundle inicial: si el servidor local no comprime, el tamaño saldrá inflado, así que hay que activar gzip en local. ([revision history](https://developers.google.com/youtube/gaming/playables/certification/revisionhistory), [FAQ cert.](https://developers.google.com/youtube/gaming/playables/support/certification_faq))
- ✅ **Prueba del CSP**: con *local overrides* de Chrome DevTools se aplica la cabecera `Content-Security-Policy` del §2.2 al `index.html` y se buscan violaciones. ([test suite guide](https://developers.google.com/youtube/gaming/playables/reference/test_suite_guide))
- ✅ **Bundle analyzer** (Python). ([enlace](https://developers.google.com/youtube/gaming/playables/samples/bundle_analyzer))
- ✅ **WebViews móviles**: apps de terceros tipo "WebView Tester" o apps open source. ([FAQ](https://developers.google.com/youtube/gaming/playables/support/faq))
- ✅ **Developer Portal**: después de "Create release" aparece la pestaña *Verify and test*, con un **YouTube Dev Link** y un **Test Suite Link**. Hay que probar en youtube.com, m.youtube.com y las apps de Android e iOS, y luego pulsar "Submit for Certification". ([developer portal](https://developers.google.com/youtube/gaming/playables/developer_portal))
- ⚠️ La página del Test Suite se renderiza con JS y no se pudo leer su lista completa de comprobaciones. Lo que se sabe de ella sale del historial de cambios y de las FAQ.

### 6.2 Certificación
- ✅ Cada Playable pasa revisión antes del lanzamiento: APIs y restricciones técnicas, Trust & Safety, privacidad, historial del creador en YouTube y rendimiento de sus Playables anteriores. ([overview](https://developers.google.com/youtube/gaming/playables/certification/requirements))
- ✅ No se puede enviar otra release mientras haya una en revisión. Para desbloquearla hay que pedir a Playables Ops que rechace la release en staging. ([developer portal](https://developers.google.com/youtube/gaming/playables/developer_portal))
- ✅ El lanzamiento puede ser gradual: acceso limitado, rollouts escalonados o ajustes automáticos. ([FAQ](https://developers.google.com/youtube/gaming/playables/support/faq))
- ✅ La publicación pasa por un **Partner Manager**. ([overview](https://developers.google.com/youtube/gaming/playables/certification/requirements))

### 6.3 Cómo conseguir acceso
- ✅ El acceso de desarrolladores está en "early access". La vía es el **formulario de interés**: https://docs.google.com/forms/d/e/1FAIpQLSdvdQ0lgIq2369aemj1O6w8R8FwGn9O5ARRGODDDUbVINCRJQ/viewform ([portada](https://developers.google.com/youtube/gaming/playables))
- ✅ El Developer Portal está en **Private Preview, solo por invitación**, y puede requerir acuerdos adicionales. Hace falta un canal ya dado de alta en Playables, con permiso de manager o editor. ([developer portal](https://developers.google.com/youtube/gaming/playables/developer_portal))
- ⚠️ No se documentan requisitos de región ni de YPP, ni plazos de respuesta.
- Comunidad: Discord https://discord.gg/eEFBtMswKT ([portada](https://developers.google.com/youtube/gaming/playables)).

---

## 7. Implicaciones para three.js, Tone.js, shaders y wasm (⚠️ salvo donde se indica)

1. **Vite**
   - `base: './'` para que todas las rutas sean relativas (✅ requisito).
   - Revisar que los nombres generados (`assets/index-AbC123.js`) cumplen el regex (los hashes de Vite suelen llevar `-` y `_`, que están permitidos).
   - Nada de CDNs: todo va en el bundle.
   - Sin ofuscadores.
   - Ojo con plugins que inyecten `<script>` dinámicos, porque necesitarían el `nonce` (✅ FAQ cert.). `import()` dinámico y `modulepreload` cargan desde `'self'` y no tienen ese problema.
2. **Loaders de three.js**
   - Los decoders de DRACO, KTX2/Basis y Meshopt suelen apuntar a CDNs (gstatic o unpkg). Hay que copiarlos al bundle y usar rutas relativas, o mejor no usarlos: un 2048 puede hacerse todo con geometría procedural y SDF.
   - DRACO y Basis usan **wasm y Workers**, justo lo que YouTube cita como posible motivo de rechazo (✅ privacidad §7). Conviene evitarlos.
3. **Fuentes y texto**: en `troika-three-text` y similares hay que evitar la descarga de fuentes por defecto desde CDN (troika usa un Worker y, si no se configura, una fuente remota). Mejor una fuente local o la UI en DOM/CSS sobre el canvas.
4. **Tone.js / AudioWorklet**
   - Tone.js crea sus worklets a partir de un **Blob URL**. Según la especificación de CSP, `addModule()` se rige por `script-src`, y este incluye `blob:`, así que en principio funciona. Hay que verificarlo con los *local overrides* del CSP.
   - Los AudioWorklets no son Web Workers, pero un revisor podría tratarlos igual. Si se puede, usar nodos nativos de Web Audio (osciladores, biquads, gain) sin worklets propios. Tone.js funciona sin worklets salvo en contados nodos.
   - Peso: Tone.js completo son unos 300–350 KB minificados, cerca del SHOULD de 512 KiB por fichero. Importar solo lo necesario, o escribir un sintetizador propio pequeño.
   - Respetar mute y pausa de forma centralizada (§4). Con el `Transport` parado en `onPause` no debe quedar ningún `setInterval` o `setTimeout` de scheduling vivo.
5. **Pausa real del render**
   - En `onPause`, `renderer.setAnimationLoop(null)`, parar timers y tweens y suspender el `AudioContext`. No basta con "congelar la lógica": el requisito exige parar también el **render** (✅).
   - No usar `document.hidden` ni `visibilitychange` (✅ prohibido). Al reanudar, reiniciar el reloj (`clock.getDelta()`) para evitar un salto de dt gigante.
6. **Viewport 0×0 en Android (✅ FAQ)**: no llamar a `renderer.setSize(0, 0)` ni crear render targets de 0 px (composer de bloom). Hay que posponer el `setSize` y el redimensionado del `EffectComposer` y de `UnrealBloomPass` hasta que `innerWidth` e `innerHeight` sean mayores que 0. Un `ResizeObserver` o el evento `resize` sirven.
7. **Hitches de compilación de shaders**
   - Precompilar antes de `gameReady()` con `renderer.compileAsync(scene, camera)` (three r158+), con todos los materiales y variantes ya en escena (incluidas las de partículas y postprocesado), y quizá renderizar un frame fuera de pantalla.
   - Así el coste queda dentro de la pantalla de carga, se evitan los tirones en el primer merge (que irían contra "MUST NOT delay input") y se cuenta en el SHOULD de menos de 5 s.
   - Evitar crear materiales nuevos en caliente: reutilizarlos y usar `InstancedMesh` para fichas y partículas.
8. **Memoria (✅ 512 MB de heap; iOS muy sensible)**
   - Hacer `dispose()` de geometrías, texturas y render targets.
   - Topar el DPR (p. ej. `min(devicePixelRatio, 2)`) y la resolución del bloom (½ o ¼).
   - Usar *pools* de partículas.
   - Ojo: la memoria de GPU no cuenta como heap JS, pero en iOS presiona igual el proceso de WebKit.
9. **Pérdida de contexto WebGL**: gestionar `webglcontextlost` y `webglcontextrestored`, y avisar con `ytgame.health.logError()`.
10. **wasm**: no está prohibido (el CSP incluye `'unsafe-eval'`, que habilita la compilación wasm), pero es un riesgo discrecional de certificación (✅ privacidad §7). Recomendación: **cero wasm y cero Web Workers**. Para un 2048 no hacen falta.
11. **Calidad adaptativa**: medir el tiempo de frame en los primeros segundos y bajar de nivel (bloom off, menos partículas, DPR 1) en gama baja. No hay un fps objetivo documentado, pero la respuesta a la entrada sí es obligatoria.
12. **Mock local del SDK**: como el SDK no hace nada en local, hay que implementar un `FakeYtGame` (save en memoria o localStorage, botones de debug para pausa, resume y mute) y probar luego con el Test Suite real.

---

## 8. Checklist resumido para el spec

- [ ] `<script src="https://www.youtube.com/game_api/v1">` antes del bundle de Vite. `base: './'`.
- [ ] Pantalla de carga, `firstFrameReady()`, precompilado de shaders y `loadData`, y después `gameReady()`.
- [ ] `onPause`/`onResume`: parar el render loop, la lógica, el audio y los timers. Guardar en `onPause`.
- [ ] `isAudioEnabled` + `onAudioEnabledChange` aplicados al gain maestro. Sin botón de mute general; sí sliders de música y SFX.
- [ ] Audio robusto sin depender de un gesto, con reintento al primer input.
- [ ] `getLanguage()` y no `navigator.language`. Inglés obligatorio, más español.
- [ ] Save versionado, menor de 64 KiB, `await loadData` antes de cualquier `saveData`, best score igual a `sendScore`.
- [ ] Touch, ratón (arrastrar) y teclado (flechas/WASD). Esc cierra modales sin `preventDefault`.
- [ ] Responsive de 9:32 a 32:9, sin bloquear orientación, estado intacto al redimensionar, nítido en cualquier DPR.
- [ ] Viewport 0×0 tolerado.
- [ ] Cero peticiones externas: fuentes, decoders y analítica, todo fuera o dentro del bundle.
- [ ] Sin links externos, sin compartir, sin login, sin QR, sin botón de salir.
- [ ] Bundle inicial menor de 15 MiB (sobrado), ficheros menores de 512 KiB idealmente, nombres `[A-Za-z0-9._-]`.
- [ ] Heap menor de 512 MB. Probar en iOS Safari y en el WebView de Android de gama baja.
- [ ] Diferenciación clara frente a otros Playables tipo 2048 (política anti-duplicados).
- [ ] Validar con el Test Suite, los *overrides* del CSP y el bundle analyzer, y después con el Dev Link en las 4 plataformas.
