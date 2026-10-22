# CLAUDE.md — 2048 Pulse

Juego tipo 2048 en three.js con estética audio-reactiva estilo Tetris Effect, para **YouTube Playables**.

## Qué leer primero

1. `docs/05-roadmap.md`: en qué fase estamos y qué criterios de aceptación aplican.
2. El documento de la fase o tarea:
   - Reglas y puntuación: `docs/01-gdd.md`.
   - Sonido y visual: `docs/02-audio-visual.md`.
   - Módulos e interfaces: `docs/03-arquitectura.md`.
   - Restricciones de plataforma: `docs/04-youtube-playables.md`.
3. `docs/decisiones.md` solo si necesitas el porqué de una decisión. Si una decisión no está ahí ni en los docs, **pregunta**; no la inventes.

## Reglas duras (romperlas bloquea la certificación de Playables)

- **Cero peticiones de red externas**: sin CDN, sin fuentes remotas, sin analítica. Todo va en el bundle.
- **Progreso solo vía `PlayablesSdk.saveData`**. Nunca `localStorage`/IndexedDB para el progreso; solo `MockSdk` lo usa en desarrollo.
- **`await loadData()` antes de cualquier `saveData()`**.
- **Pausa con `onPause`/`onResume`** del SDK. Prohibido usar `visibilitychange`/`document.hidden`. En pausa se para todo: loop, render, audio, timers y entrada.
- **Idioma vía `getLanguage()`**. Prohibido `navigator.language(s)`.
- **Audio**: respetar `isAudioEnabled`/`onAudioEnabledChange`. Sin botón de mute general. No esperar a un gesto del usuario para que suene.
- **Nunca `preventDefault()` sobre Esc.**
- **Sin wasm, sin Web Workers, sin `eval`**, y sin decoders DRACO/KTX2/Basis.
- **Rutas relativas** (`base: './'`) y nombres de fichero `[A-Za-z0-9._-]`.
- **Tolerar viewport 0×0** (Android arranca así): no llamar a `setSize(0,0)` ni crear render targets de 0 px.
- **Sin links externos, login, QR, botón de salir ni anuncios.**

## Reglas de arquitectura

- `src/core/` es **lógica pura**: sin three, sin audio, sin DOM, sin `Math.random` (usa el RNG con semilla). Todo cambio en core lleva test en Vitest.
- El código del juego nunca llama a `ytgame` directamente: siempre pasa por la interfaz `PlayablesSdk` (`src/platform/`).
- La lógica se resuelve **al instante**. Solo el sonido y el pulso visual se cuantizan al beat.
- Sin asignaciones por frame en el render loop: pools y buffers reutilizados.
- Las etapas son **datos** (`src/stages/*.json`), no código específico.

## Convenciones

- Identificadores y comentarios de código en **inglés**. Documentación en **español**. Textos de UI vía i18n (`en`, `es`).
- TypeScript estricto.
- Comandos previstos: `npm run dev`, `npm run build`, `npm test`, `npm run zip`.
