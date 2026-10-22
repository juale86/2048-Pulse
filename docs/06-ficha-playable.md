# 06 — Ficha del Playable (Developer Portal)

> Borrador de los metadatos que se cargan en el Developer Portal. Restricciones de Playables:
> - Sin logos ni branding en miniaturas, títulos o descripciones.
> - Sin links externos.
> - Inglés obligatorio.
> - Sin marcas de terceros: no mencionar "Tetris" ni "Tetris Effect".
>
> El objetivo es dejar claro desde el primer vistazo que no es "otro 2048" (política anti-duplicados, ver [04 §3](04-youtube-playables.md#3-riesgos)).

## Título

**2048 Pulse**

## Género y etiquetas

- **Género**: Puzzle.
- **Etiquetas sugeridas**: puzzle, music, rhythm, relaxing, numbers, merge, ambient, synesthesia.
- **Público**: general, 13+ (no "made for kids").

## Descripción corta (≤ 80 caracteres)

- **EN**: Merge tiles, play the music. A 2048 that turns every move into sound and light.
- **ES**: Une fichas, toca la música. Un 2048 donde cada movimiento es sonido y luz.

## Descripción larga

### EN

Classic 2048 rules, reimagined as an instrument.

Every slide plays a note. Every merge rings higher as your tiles grow. New tiles fall on the beat, and the whole world pulses with the music you create.

Reach a new record tile and the journey moves on: from the glowing Abyss to desert Dunes, a Neon city, a forest of Fireflies, the Storm, and finally the Cosmos. Each world has its own music, colors and creatures made of light. Go beyond 2048 and the journey loops back as a faster remix.

- The 2048 you know: same rules, no undo, no timer.
- A speed bonus measured in moves, not seconds: think as long as you like.
- A calm, composed soundtrack that lifts toward euphoria as your board grows: every world changes key and tempo three times.
- Six audiovisual worlds and endless remix laps.
- Your progress is saved to your account automatically.
- Reduced-effects mode and a classic color palette for comfort and readability.

Based on the original 2048 by Gabriele Cirulli.

### ES

Las reglas clásicas del 2048, convertidas en un instrumento.

Cada deslizamiento toca una nota. Cada fusión suena más aguda a medida que crecen tus fichas. Las fichas nuevas caen al ritmo, y todo el mundo late con la música que vas creando.

Consigue una nueva ficha récord y el viaje avanza: del luminoso Abismo a las Dunas del desierto, una ciudad de Neón, un bosque de Luciérnagas, la Tormenta y, por fin, el Cosmos. Cada mundo tiene su propia música, sus colores y sus criaturas hechas de luz. Supera 2048 y el viaje vuelve a empezar como un remix más rápido.

- El 2048 de siempre: mismas reglas, sin deshacer, sin reloj.
- Un bonus de velocidad medido en movimientos, no en segundos: piensa todo lo que quieras.
- Una banda sonora compuesta y tranquila que se eleva hacia la euforia a medida que crece tu tablero: cada mundo cambia de tonalidad y de tempo tres veces.
- Seis mundos audiovisuales y vueltas de remix sin fin.
- Tu progreso se guarda automáticamente en tu cuenta.
- Modo de efectos reducidos y paleta clásica para mayor comodidad y legibilidad.

Basado en el 2048 original de Gabriele Cirulli.

## Miniaturas (brief)

El Portal pide varias relaciones de aspecto. Prepararlas al menos en 16:9, 1:1 y 9:16, capturadas del juego real y **sin logo ni texto superpuesto**.

**Generadas** (2026-10-21) en `marketing/thumbnails/`, 1920×1080, 1080×1080 y 1080×1920, sin HUD:
`neon-climax-*`, `abismo-*`, `cosmos-*` (escenas 1–3). Falta la 4 (transición).

Para regenerarlas a otro tamaño: `npm run dev`, abrir la partida deseada y ejecutar en la consola `await __pulse.capture('nombre', ancho, alto)`. Solo existe en desarrollo; guarda el PNG en `marketing/thumbnails/` a través del servidor de Vite.

| # | Escena | Qué debe comunicar |
|---|---|---|
| 1 | Neón en clímax (sección 3): tablero con fichas 128–256 brillando sobre la ciudad de líneas | Que no es un 2048 plano: luz, música, energía |
| 2 | Abismo: medusas de partículas detrás del tablero, rayos de luz | Calma, belleza, flow |
| 3 | Cosmos: la criatura cósmica de partículas cruzando junto al tablero, ficha 2048 | La recompensa del viaje |
| 4 | Momento de transición: un mundo dispersándose y el siguiente ensamblándose | El viaje entre mundos |

**Consejos de captura:**
- Calidad alta y efectos completos.
- Ocultar el HUD si distrae.
- Fondo oscuro de borde a borde.
- Que las fichas sigan siendo legibles a tamaño miniatura.

## Etiquetas de accesibilidad (AGI)

Solo se declara lo que de verdad se cumple (las etiquetas falsas están prohibidas):

- Sin presión de tiempo.
- Opción de reducir efectos y destellos.
- Paleta de alto contraste alternativa (paleta clásica).
- Jugable sin sonido: toda la información es visual.
- Controles con una sola mano: swipe o teclas.

Pendiente: revisar la lista oficial de etiquetas AGI en el Portal antes de declararlas.
