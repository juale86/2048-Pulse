# 03 — Arquitectura técnica

## 1. Stack

| Pieza | Elección | Notas |
|---|---|---|
| Build | **Vite** + **TypeScript** (strict) | `base: './'`, sin CDN, sin ofuscadores |
| Render | **three.js** vanilla | `EffectComposer` + `UnrealBloomPass`, `InstancedMesh`/`Points` + `ShaderMaterial` |
| Audio | **Web Audio API nativa** | Sin librerías. Osciladores, filtros y ganancias automatizados; sin AudioWorklet ni Workers |
| Tests | **Vitest** | Obligatorios en `src/core/` |
| UI | HTML/CSS sobre el canvas | Sin framework |

**Prohibido**: wasm, Web Workers, `eval`, decoders DRACO/KTX2/Basis, fuentes remotas, cualquier petición externa. La geometría se genera por código y las fuentes van en el bundle (woff2).

## 2. Estructura de carpetas

```
index.html                  # canvas + raíz de UI; en prod el plugin inyecta el SDK antes del bundle
vite.config.ts              # base './', plugin playablesSdkInject
.env.development            # VITE_PLAYABLES_SDK=mock
.env.production             # VITE_PLAYABLES_SDK=youtube
.env.mock                   # VITE_PLAYABLES_SDK=mock (para build:mock = vite build --mode mock)
scripts/
  zip.mjs                   # dist/ → 2048-pulse-<versión>.zip
src/
  main.ts                   # bootstrap: SDK → carga → escena → gameReady
  app/
    GameController.ts       # orquesta core ↔ render ↔ audio ↔ save; dueño del estado
    PauseController.ts      # único punto de pausa/reanudación
    BeatClock.ts            # línea de tiempo musical: BPM, cuantización, callbacks en el tiempo del beat
    screens.ts              # máquina de estados: loading | title | playing | gameover
  core/                     # LÓGICA PURA (sin three, audio, DOM ni Math.random)
    types.ts                # Tile, Board, Direction, GameState, GameEvent
    rng.ts                  # PRNG con semilla serializable
    board.ts                # crear, celdas vacías, ¿hay movimientos?
    move.ts                 # slide + merge con trazado por id (para animar)
    spawn.ts                # ficha 2/4 en celda vacía
    scoring.ts              # puntuación base + bonus de récord (par, multiplicador)
    stages.ts               # etapa por ficha récord, remix, sección por segunda ficha
    game.ts                 # newGame(seed), applyMove(state, dir) → { state, events }
    constants.ts            # BOARD_SIZE, PAR_FACTOR, RECORD_BONUS_MIN, …
  platform/
    PlayablesSdk.ts         # interfaz
    YtSdk.ts                # implementación real sobre window.ytgame
    MockSdk.ts              # desarrollo: localStorage + panel de debug
    index.ts                # elige la implementación según import.meta.env.VITE_PLAYABLES_SDK
    SaveManager.ts          # serialización, versión, migraciones, debounce, reintentos
  audio/
    AudioEngine.ts          # AudioContext, buses (música/SFX/delay), mute YT, volúmenes, pausa, reloj → currentTime
    notes.ts                # nombres de nota → MIDI/Hz, escalas, transposición
    StageMusic.ts           # la base de una etapa: drone, pad, bass, arp, perc
    FmVoice.ts              # voz de nota reutilizable: portadora + moduladora FM
    Sfx.ts                  # notas del jugador (6 voces), tick, golpe, drop
    StageAudio.ts           # director: secuenciador de 1/16, secciones, transiciones, game over
  render/
    Renderer.ts             # WebGLRenderer, resize, 0×0, DPR, pérdida de contexto
    PostFx.ts               # composer, bloom, viñeta, aberración
    Quality.ts              # niveles alta/media/baja + auto
    BoardView.ts            # rejilla emisiva
    TileView.ts             # fichas (pool), atlas de números, animaciones
    Particles.ts            # pool GPU de estallidos/materializaciones
    BeatUniforms.ts         # uBeat, uBar, uSection, compartidos por los materiales
    environments/
      abismo.ts             # entorno de partículas de la etapa 1
  input/
    Keyboard.ts
    Pointer.ts              # swipe táctil + arrastre con ratón
    InputQueue.ts           # buffer de 1 + completar animación al instante
    Haptics.ts
  ui/
    Hud.ts  TitleScreen.ts  SettingsModal.ts  GameOverPanel.ts  LoadingScreen.ts  CloudIndicator.ts
    styles.css
  i18n/
    i18n.ts  en.json  es.json
  stages/
    abismo.json             # F1; el resto en F2
    schema.ts               # tipo StageDef + validación
tests/                      # o *.test.ts junto al código de core/
```

## 3. Flujo de datos

```
 Input ──► InputQueue ──► GameController ──► core.applyMove(state, dir)
                               │                     │
                               │◄──── { state, events[] }
                               │
          ┌────────────────────┼─────────────────────┬──────────────────┐
          ▼                    ▼                     ▼                  ▼
   TileView/Particles     StageAudio + Sfx       Hud / UI          SaveManager
   (animan YA)            (BeatClock cuantiza)                     (debounce 1 s)
                               │
                               └──► BeatUniforms (pulso visual cuantizado)
```

- `GameController` es el **único dueño** del `GameState`. Los demás reciben eventos y nunca modifican el estado.
- `core` devuelve **eventos**. Render y audio solo reaccionan a eventos y al estado. Nunca reproducen ni recalculan reglas.

## 4. Núcleo (`src/core`)

### 4.1 Tipos principales

```ts
type Direction = 'up' | 'down' | 'left' | 'right';

interface Tile { id: number; value: number; row: number; col: number; }

interface GameState {
  size: number;                 // 4
  tiles: Tile[];
  nextTileId: number;
  rng: RngState;                // serializable
  score: number;
  recordTile: number;           // ficha más alta de la partida
  movesSinceRecord: number;
  totalMoves: number;
  stage: StageRef;              // { index: 0..5, lap: 0.. }
  section: 0 | 1 | 2;
  over: boolean;
}

type GameEvent =
  | { type: 'Moved'; dir: Direction; moves: { id: number; from: Cell; to: Cell }[] }
  | { type: 'Merged'; into: Cell; value: number; consumedIds: [number, number]; newId: number }
  | { type: 'Spawned'; tile: Tile }
  | { type: 'Invalid'; dir: Direction }
  | { type: 'ScoreAdded'; base: number }
  | { type: 'NewRecord'; value: number; moves: number; par: number; mult: number; bonus: number }
  | { type: 'StageChanged'; from: StageRef; to: StageRef }
  | { type: 'SectionChanged'; section: 0 | 1 | 2 }
  | { type: 'GameOver'; score: number; recordTile: number };
```

### 4.2 Contrato de `applyMove`

```ts
function applyMove(state: GameState, dir: Direction): { state: GameState; events: GameEvent[] };
```

- Es **pura**: no muta la entrada y la misma entrada da siempre la misma salida.
- Si el movimiento es inválido: `events = [Invalid]` y el estado no cambia (tampoco el RNG ni los contadores).
- Orden de eventos en un movimiento válido: `Moved` → `Merged`* → `ScoreAdded` → `NewRecord`? → `StageChanged`? → `SectionChanged`? → `Spawned` → `GameOver`?
- Un movimiento puede crear como mucho un récord, porque el récord es la ficha máxima tras el movimiento. Si una fusión salta a la vez un hito de etapa, se emite un solo `StageChanged`.

### 4.3 Cobertura mínima de tests

- Slide y merge en las 4 direcciones, incluidos `[2,2,2,2]`, `[2,2,2,_]`, `[4,4,8,8]`, `[2,_,2,4]` y la regla de una sola fusión por ficha.
- Movimiento inválido: sin spawn, sin cambio de RNG, sin contadores.
- Spawn: distribución ~90/10 con una semilla fija sobre N tiradas; solo en celdas vacías.
- Game over: detección correcta con tablero lleno con y sin fusiones posibles.
- Determinismo: misma semilla + misma secuencia de movimientos = mismo estado final.
- `par(T)`, multiplicador en los límites (≤ par, 2·par, intermedio) y bonus entero.
- Etapa por récord (64→1, 128→2, … 2048→6, 4096→1R) y sección por segunda ficha.
- Serialización: `GameState` → JSON → `GameState` sin pérdida.

## 5. Plataforma (`src/platform`)

### 5.1 Interfaz

```ts
interface PlayablesSdk {
  firstFrameReady(): void;
  gameReady(): void;
  onPause(cb: () => void): () => void;
  onResume(cb: () => void): () => void;
  isAudioEnabled(): boolean;
  onAudioEnabledChange(cb: (enabled: boolean) => void): () => void;
  getLanguage(): Promise<string>;
  loadData(): Promise<string>;
  saveData(data: string): Promise<void>;
  sendScore(value: number): Promise<void>;
  logError(): void;
  logWarning(): void;
}
```

### 5.2 Selección por entorno

- `src/platform/index.ts` exporta `sdk: PlayablesSdk` según `import.meta.env.VITE_PLAYABLES_SDK`:
  - `mock` → `MockSdk`.
  - `youtube` → `YtSdk`.
- Con cualquier otro valor, el build falla con un error claro.
- El resto del código **solo** importa `sdk` desde `platform`. Nunca toca `window.ytgame`.
- **Plugin de Vite `playablesSdkInject`**: si el valor es `youtube`, inserta `<script src="https://www.youtube.com/game_api/v1"></script>` como **primer** script del `<head>`, clásico y síncrono, antes del módulo de Vite. Con `mock` no inserta nada.
- Scripts:
  - `npm run dev` → mock.
  - `npm run build` → youtube.
  - `npm run build:mock` → build de producción con el mock, útil para probar el bundle sin YouTube.

### 5.3 `MockSdk`

- `loadData`/`saveData` sobre `localStorage` (clave `2048pulse.save`), con latencia simulada configurable.
- Panel de debug (solo en dev, se abre con `` ` ``) con botones para:
  - Pausa y reanudación.
  - Alternar el mute de YouTube.
  - Cambiar el idioma (`en-US`, `es-419`, `fr-FR`).
  - Forzar fallos de guardado (`API_UNAVAILABLE`).
  - Simular un viewport 0×0.
  - Borrar el save.
- `sendScore`, `logError` y `logWarning` escriben en consola.
- Simula al host de YouTube: cuando la página se oculta (bloquear el celular, cambiar de pestaña o de app) emite `onPause`, y al volver emite `onResume`. Es el **único** lugar con `visibilitychange`; el juego sigue sin usarlo.

### 5.4 `YtSdk`

Es un *wrapper* fino sobre `window.ytgame`. Usa los tipos oficiales (`index.d.ts`, ver `research/youtube-playables-requisitos.md`) y normaliza los errores a `SdkError` con `errorType`.

## 6. Guardado

### 6.1 Esquema (v1)

```ts
interface SaveV1 {
  v: 1;
  best: number;              // == mayor valor enviado con sendScore
  bestTile: number;
  gamesPlayed: number;
  settings: {
    music: number;           // 0..100
    sfx: number;             // 0..100
    haptics: boolean;
    reducedFx: boolean;
    classicPalette: boolean;
    quality: 'auto' | 'high' | 'low';
  };
  game: SerializedGameState | null;   // null si no hay partida en curso
}
```

- El save **no** guarda el idioma: se lee siempre con `getLanguage()`.
- El tamaño esperado es menor de 1 KiB, muy por debajo de los límites de Playables (64 KiB en el *flush* final de salida, 3 MiB en total).

### 6.2 `SaveManager`

- **Arranque**:
  - `await sdk.loadData()` antes de cualquier guardado.
  - String vacío → save por defecto.
  - JSON inválido → `logWarning()` y save por defecto. Nunca un crash.
- **Migraciones**: `migrate(raw): SaveLatest`, con una cadena `v1 → v2 → …`. Hay tests con fixtures de cada versión.
- **Cuándo se guarda**:
  - Tras cada movimiento, con *debounce* de 1 s.
  - Inmediatamente en `NewRecord`, en `GameOver` y en `onPause`.
- **Reintentos**:
  - Si `saveData` falla, se reintenta a 2 s, 5 s, 15 s y 30 s (tope 30 s).
  - También en cada movimiento nuevo.
  - Siempre se envía el estado **más reciente**; los saves intermedios se descartan.
- **Indicador de nube**: el `CloudIndicator` aparece si un guardado lleva más de 3 s pendiente o ha fallado, y se oculta al confirmarse.
- **Score**: cuando cambia `best`, se programa `sendScore(best)` con el *throttle* descrito en [01-gdd.md](01-gdd.md#43-récord-personal-y-leaderboard).

## 7. Datos de etapa

`src/stages/<id>.json`, validado al cargar contra `StageDef`:

```ts
interface StageDef {
  id: string;                       // "abismo"
  nameKey: string;                  // clave i18n
  fromTile: number;                 // 0 para la primera; 128, 256, …
  bpm: number;
  loops: [LoopDef, LoopDef, LoopDef];    // uno por sección: sereno → luminoso → eufórico
  sectionThresholds: [number, number];   // fracciones de M: [1/8, 1/4]
  layers: {                         // catálogo fijo; una etapa puede omitir capas
    drone?: TonalLayer;
    pad?: TonalLayer;
    melody?: MelodyLayer;
    bass?: StepLayer;
    arp?: StepLayer;
    perc?: PercLayer;
  };
  sections?: [LayerName[], LayerName[], LayerName[]];  // por defecto: [drone,pad,melody] · +bass · +arp+perc
  voice: { wave: Wave; decay: number; cutoff: number; fm?: Fm };  // timbre de las notas del jugador
  palette: [string, string, string];
  tileSkin: string;                 // "bioluminescent"
  environment: string;              // "abismo" → render/environments/abismo.ts
}

type Wave = 'sine' | 'triangle' | 'sawtooth' | 'square';
type LayerName = 'drone' | 'pad' | 'melody' | 'bass' | 'arp' | 'perc';
interface LoopDef {                 // 4 compases de 4/4, en su propia tonalidad
  key: string;                      // etiqueta: "D mayor"
  scale: string[];                  // ["D","E","F#",…], ascendente desde la tónica
  chords: { chord: string; bars: number; notes: string[]; root: string }[];  // suman 4 compases; voicing explícito
  melody: string;                   // "F#4:8 E4:4 D4:4 …": NOTA:semicorcheas ("-" = silencio), suman 64
}
interface MelodyLayer extends TonalLayer { decay: number; fm?: Fm }
interface TonalLayer { wave: Wave; gainDb: number; cutoff: number }   // cutoff del paso bajo, Hz
interface StepLayer extends TonalLayer { steps: string; decay: number; fm?: Fm }  // steps: 16 caracteres "x" / "."
interface Fm { ratio: number; index: number }   // moduladora a ratio × nota; desviación pico = index × su frecuencia
interface PercLayer { gainDb: number; kick: string; hat: string; snare: string }
```

## 8. Render

- **Renderer**:
  - `toneMapping = ACESFilmic` y salida sRGB.
  - Sin MSAA en el postprocesado: se probó y se quitó por rendimiento (ver `docs/decisiones.md`, F3).
  - Un único `setAnimationLoop`, que se detiene en pausa.
- **Resize**:
  - Se escucha `resize` y `ResizeObserver` sobre el contenedor.
  - Si `width` o `height` valen 0, se ignora: no hay `setSize` ni se redimensiona el composer.
  - El tablero se encuadra para caber en cualquier relación de aspecto, de 9:32 a 32:9, con margen para el HUD. El HUD va arriba si sobran ≥ 96 px sobre el tablero; si no, y hay ≥ 150 px al costado, va a la izquierda centrado en vertical (`Hud.layout`).
  - Al redimensionar no se pierde el estado.
- **DPR**: `min(devicePixelRatio, maxDpr de la calidad)`.
- **Precompilación**: antes de `gameReady`, todos los materiales (fichas, partículas, entorno, postprocesado) están en escena y se llama a `renderer.compileAsync(scene, camera)`, más un render fuera de pantalla.
- **Pérdida de contexto WebGL**:
  - En `webglcontextlost`: `preventDefault`, parar el loop y `logError()`.
  - En `webglcontextrestored`: reconstruir el renderer, los materiales y la escena desde el `GameState` en memoria.
- **Sin asignaciones por frame**: pool de `TileView` (16 fichas activas + margen para las animaciones de fusión) y buffer circular de partículas en GPU (los atributos `startTime`, `velocity` y `color` se calculan en el *vertex shader*).
- **Atlas de números**: textura de canvas generada al cargar con los valores de 2 a 131072. Se regenera si cambia el DPR de forma significativa.

### 8.1 Calidad

| Nivel | DPR máx. | Postprocesado | Bloom | Partículas | Extras |
|---|---|---|---|---|---|
| Alta | 2 | Sí | Resolución completa | 100% | Viñeta y aberración |
| Media | 1.5 | Sí | ½ resolución | 50% | Viñeta |
| Baja | 2 | **No**: render directo al canvas, con el antialiasing nativo | — | 20% | — |

En baja no hay pasadas a pantalla completa (lo más caro en GPU de celular), así que se puede subir la densidad a 2× y verse nítido. Se pierden bloom, viñeta, flashes y aberración.

- **Auto** (por defecto):
  - **Nivel inicial según el equipo** (`initialLevel`): baja si hay ≤ 4 GB de RAM (`navigator.deviceMemory`), ≤ 4 núcleos o el renderer WebGL es por software (SwiftShader, llvmpipe…); alta si es un escritorio sin pantalla táctil con ≥ 8 GB y ≥ 8 núcleos; media en el resto o si el navegador no informa nada.
  - Calcula la media de fps de una ventana de 3 s.
  - Baja de nivel si la media es menor de 50 y sube si es mayor de 58, con como mucho 1 cambio cada 10 s.
  - **Por debajo de 30 fps baja enseguida**, sin esperar el enfriamiento.
  - No mide durante las transiciones de etapa.
- "Efectos reducidos" multiplica además las partículas por 0.3 y desactiva cámara y flashes.
- **Indicador de diagnóstico** (`DebugStats`): en desarrollo y en builds mock muestra fps, nivel, densidad de render (usada/del dispositivo), resolución del canvas y si hay postprocesado. Nunca en el build de YouTube.
- **Probar en el celular**: `npm run build:mock && npm run preview:lan` y abrir `http://<IP del Wi-Fi>:4173` desde un dispositivo en la misma red. El servidor de desarrollo (`dev:lan`) sirve código sin optimizar y no es representativo para medir.

## 9. Audio

Detalle del diseño en [02-audio-visual.md §3](02-audio-visual.md#3-música-generativa-web-audio-pura).

- `AudioEngine`:
  - Un solo `AudioContext` con `latencyHint: 'playback'` (buffers grandes: con WebGL ocupando el hilo principal, los buffers chicos se quedaban sin llenar).
  - **Buses**: `music → duck → master` y `sfx → master`; los dos mandan un poco de señal a un `delay` sincronizado al tempo que vuelve a `master`.
  - **Ganancia**: `master = ytEnabled ? 1 : 0`, y cada canal aplica su volumen de ajustes.
  - **Reloj**: `toAudio(t)` convierte un tiempo del `BeatClock` al `currentTime` con un desfase que se corrige suave cada frame (y salta si la diferencia supera 80 ms, por ejemplo tras una pausa).
- `BeatClock` (en `app/`): línea de tiempo única. `next(sub)` da el tiempo de la siguiente subdivisión y `at(t, cb)` ejecuta un callback en ese tiempo. Avanza solo con el loop de render.
- `StageAudio`: cada frame programa los pasos de 1/16 que caen en los próximos ~150 ms. Gestiona secciones (el cambio de loop y de tempo se encola para el próximo límite de loop), transiciones (cruce de 1 compás), game over y el remix. Es dueño del tempo por sección (`stageBpm(ref, section)`).
- `StageMusic`: todos los nodos de una etapa se crean al crearla y se liberan 2 compases después de dejarla. En juego solo se automatizan parámetros.
- `Sfx`: grupo fijo de 6 voces con robo de la más vieja, más los nodos fijos del tick, el golpe y el drop.
- **Pausa**: `PauseController` para el render (y con él el `BeatClock`) y llama a `context.suspend()`; al reanudar, `context.resume()`.
- **Errores**: cualquier excepción de audio se captura, se reporta con `logWarning()` y nunca corta la lógica.

## 10. Pausa (`PauseController`)

Es el único punto que reacciona a `sdk.onPause`/`onResume`.

- **En pausa**:
  - `renderer.setAnimationLoop(null)`, tweens congelados y temporizadores de guardado pausados (excepto el guardado inmediato).
  - Audio suspendido.
  - Entrada ignorada.
  - Se dispara el guardado inmediato.
- **Al reanudar**: el reloj se reinicia (sin un `dt` gigante), se restauran loop, audio y entrada.
- Prohibido `visibilitychange`.

## 11. i18n

- `getLanguage()` devuelve una etiqueta BCP-47. Se casa por prefijo (`es-419` → `es`) y lo que no sea `es` cae a `en`.
- Los textos viven en `en.json`/`es.json` con claves planas (`hud.score`, `stage.abismo`, …). Si falta una clave en `es`, se usa la de `en` y se avisa en consola en dev.

## 12. Errores y salud

- `window.onerror`, `unhandledrejection` y `webglcontextlost` llaman a `sdk.logError()`.
- Los fallos recuperables (save inválido, falta una clave i18n en prod) llaman a `sdk.logWarning()`.
- Ningún error de audio o render debe detener la lógica del juego.
