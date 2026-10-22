# 01 — Game Design Document

## 1. Visión

**2048 Pulse** es el 2048 clásico convertido en un instrumento. Las reglas no cambian. Lo que cambia es que cada jugada produce música y luz, y que la partida es un viaje por 6 mundos que se desbloquean conforme consigues fichas más altas. La referencia emocional es *Tetris Effect*: flow, sinestesia, y un mundo que respira contigo.

- **Plataforma**: YouTube Playables (navegador de escritorio y móvil, apps de YouTube Android/iOS).
- **Público**: general, 13+. No "made for kids".
- **Sesión típica**: de 5 a 20 minutos. La partida se puede retomar en cualquier momento.
- **Idiomas**: inglés (obligatorio) y español.

## 2. Modo de juego

Hay **un único modo: infinito**. La partida dura hasta que el tablero se bloquea. No hay meta final: 2048 es un hito celebrado (llegas a la etapa Cosmos) y se puede seguir más allá.

No hay modos adicionales, ni Zone, ni deshacer, ni anuncios (ver §10 "Fuera de alcance").

## 3. Reglas (idénticas al 2048 original)

- Tablero de **4×4**. El tamaño es una constante interna (`BOARD_SIZE`), no expuesta al jugador.
- **Inicio**: 2 fichas aleatorias.
- **Movimiento**: arriba, abajo, izquierda o derecha. Todas las fichas se desplazan al máximo en esa dirección.
- **Fusión**: dos fichas iguales que chocan se funden en una de valor doble. **Cada ficha se fusiona como máximo una vez por movimiento.** Prioridad: la ficha más cercana al borde de destino se fusiona primero (ej.: `[2,2,2,2] → izquierda → [4,4,_,_]`; `[2,2,2,_] → izquierda → [4,2,_,_]`).
- **Movimiento válido**: aquel que cambia el tablero. Un movimiento inválido no cuenta, no genera ficha y no suma movimientos.
- **Spawn**: tras cada movimiento válido aparece una ficha en una celda vacía aleatoria: **2 (90%) o 4 (10%)**.
- **Game over**: no hay celdas vacías ni fusiones posibles en ninguna dirección.
- **Aleatoriedad con semilla**: el RNG es determinista (p. ej. `sfc32`/`mulberry32`) y su estado se guarda en el save. Recargar la partida no cambia las fichas que van a salir, así que no se puede "rerollear".
- **Sin deshacer.**

## 4. Puntuación

### 4.1 Puntuación base (clásica)

Cada fusión suma el **valor de la ficha resultante** (fusionar dos 64 suma 128).

### 4.2 Bonus de récord (por movimientos, no por tiempo)

Se premia lo **rápido en movimientos** que consigues cada nueva ficha récord.

- **Ficha récord**: una ficha de valor mayor que todas las que hubo antes en la partida. Solo dan bonus los récords **≥ 64** (`RECORD_BONUS_MIN = 64`).
- **Contador**: `movesSinceRecord` cuenta los movimientos válidos desde el récord anterior (o desde el inicio, para el primero). Se reinicia a 0 en cada récord, también en los récords < 64.
- **Par de movimientos** para conseguir el récord `T` partiendo del récord `T/2`:
  - Cada movimiento añade en promedio `0.9·2 + 0.1·4 = 2.2` de valor al tablero.
  - El mínimo teórico es `(T/2) / 2.2` movimientos.
  - `par(T) = ceil( (T/2) / 2.2 × PAR_FACTOR )`, con `PAR_FACTOR = 1.0` (calibrado en F3, ver `docs/decisiones.md`).
  - Ejemplo: `par(256) = ceil(58.2 × 1.0) = 59`.
- **Multiplicador**:
  - `mult = 3` si `moves ≤ par`.
  - `mult = 1` si `moves ≥ 2·par`.
  - Entre medias, interpolación lineal: `mult = 3 − 2·(moves − par)/par`.
- **Bonus**: `bonus = round(T × mult)`. Se suma a la puntuación en el momento del récord.
- Tardar **nunca resta**: el peor caso es `bonus = T`.
- `PAR_FACTOR`, `RECORD_BONUS_MIN` y los límites del multiplicador (3x/1x) son **constantes configurables** que se ajustan jugando en F3.

> El bonus no depende del tiempo real: pausar, pensar o salir de la pestaña no da ninguna ventaja. Todo es entero y determinista.

### 4.3 Récord personal y leaderboard

- `best` = la mayor puntuación final o en curso jamás alcanzada. Se guarda en el save.
- Cuando `best` aumenta, se envía con `sendScore({ value: best })`, con *throttle*: como mucho una vez cada 10 s, más un envío en game over y otro en `onPause`. El mejor valor enviado **siempre coincide** con el `best` del save (requisito de Playables).
- No hay leaderboard propio: Playables no permite servidores externos. Qué muestra YouTube con estos scores lo decide la plataforma.

## 5. Etapas

### 5.1 Estructura

Hay 6 etapas. **La etapa la decide la ficha récord** de la partida y cambia en el momento en que aparece:

| Etapa | Desde la ficha | Nombre |
|---|---|---|
| 1 | inicio | Abismo |
| 2 | 128 | Dunas |
| 3 | 256 | Neón |
| 4 | 512 | Luciérnagas |
| 5 | 1024 | Tormenta |
| 6 | 2048 | Cosmos |
| 1R | 4096 | Abismo (remix) |
| 2R | 8192 | Dunas (remix) |
| … | ×2 | rotación continua |

- **Remix (desde 4096)**: la secuencia vuelve a empezar desde la etapa 1 con **+10% de BPM**, la paleta desplazada en tono (*hue shift*) y una capa extra de percusión. Si se completa una segunda vuelta, cada vuelta suma otro +10% de BPM hasta un tope de +30%.
- El **tablero se conserva** al cambiar de etapa. Solo cambian la música, la paleta, la apariencia de las fichas, el entorno y el set de sonidos.
- Detalle audiovisual de cada etapa: [02-audio-visual.md](02-audio-visual.md).

### 5.2 Secciones dentro de una etapa

Cada etapa tiene **3 secciones musicales** (build-up → medio → clímax), igual que Tetris Effect. Sea `M` el valor del próximo hito de etapa y `s` la **segunda ficha más alta** del tablero:

| Sección | Condición | Ejemplo en Neón (M = 512) |
|---|---|---|
| 1 · build-up | `s < M/8` | segunda ficha < 64 |
| 2 · medio | `s ≥ M/8` | hay un 64 además del 256 |
| 3 · clímax | `s ≥ M/4` | hay un 128 además del 256: la siguiente etapa está cerca |

- `s` nunca baja dentro de una etapa: una ficha solo desaparece al fusionarse en otra mayor. Por eso las secciones solo avanzan.
- Los cambios de sección se aplican al **terminar el loop de 4 compases** que está sonando: ahí la música modula a una progresión más eufórica y el tempo sube (ver [02 §3.1](02-audio-visual.md#31-modelo)). Lo visual cambia al instante.
- Los umbrales (`M/8`, `M/4`) son configurables por etapa.

## 6. Flujo de pantallas

```
Carga ──► Título ──► Juego ──► Game over ──► (Otra vez) ──► Juego
              ▲         │
              │         └── Ajustes (modal, Esc)
              └──────────── (Continuar si hay partida guardada)
```

1. **Carga**: fondo oscuro con un pulso de luz y el texto "Loading…". Llama a `firstFrameReady()`, hace `loadData()`, construye la escena y precompila shaders. Al terminar llama a `gameReady()`.
2. **Título**:
   - El tablero vacío flota en el entorno de Abismo y la música ambiental **ya suena**.
   - Muestra el logo "2048 Pulse", el récord personal y el botón **Jugar**, o **Continuar** si hay una partida guardada.
   - Un swipe, una flecha o WASD también empiezan la partida (o la continúan).
   - Hay un enlace secundario "Nueva partida" cuando existe partida guardada.
3. **Juego**: tablero y HUD mínimo (puntuación, récord, ficha máxima), un botón discreto de ajustes en una esquina y el indicador de nube cuando hay un guardado pendiente.
4. **Ajustes** (modal, se cierra con Esc o con su botón de cerrar):
   - Volumen de música (0–100).
   - Volumen de efectos (0–100).
   - Háptica (on/off, activada por defecto).
   - Efectos reducidos (on/off).
   - Paleta clásica (on/off).
   - Calidad (auto/alta/baja).
   - **No hay mute general** (Playables).
   - Abrir los ajustes durante la partida **no** pausa nada: no hay reloj que proteger.
5. **Game over**:
   - **Las fichas se quedan visibles** en el tablero tal como quedaron.
   - La música se va apagando capa a capa.
   - Encima aparece un panel con la puntuación final, la ficha máxima, la etiqueta "¡Nuevo récord!" si aplica y el botón **Otra vez**.
6. **Pausa de plataforma (`onPause`)**: se congela todo (loop, render, audio, entrada) y se muestra un overlay mínimo con el tablero atenuado y el texto "En pausa", sin botón. Todo se reanuda tal cual en `onResume`.

## 7. Entrada

| Entrada | Acción |
|---|---|
| Flechas / WASD | Mover |
| Swipe táctil / arrastre con ratón | Mover (Pointer Events, mismo código para ambos) |
| Espacio / Enter | Confirmar en menús (Jugar, Otra vez) |
| Esc | Abrir y cerrar ajustes. **Nunca** `preventDefault` sobre Esc |

- **Umbral de gesto**: `min(30 px, 6% del lado del tablero)`. La dirección la decide el eje dominante, que debe superar al otro por **≥1,5×**. Los gestos ambiguos se ignoran.
- Se llama a `preventDefault` en flechas y espacio (solo dentro del juego) para evitar el scroll. El canvas lleva `touch-action: none`.
- **Entradas rápidas**: si llega un movimiento durante una animación, la animación se **completa al instante** y el nuevo movimiento se aplica en el acto. Hay un buffer de **1** movimiento. Nunca se pierden ni se retrasan entradas.
- **Háptica** (si está activada y hay soporte): pulso corto (~15 ms) en cada fusión y pulso largo (~60 ms) en cada récord y cambio de etapa. Sin soporte no se hace nada.
- Objetivos táctiles de los botones: ≥ 48×48 dp con 8 dp de separación.
- **Mando**: fuera de alcance (Futuro).

## 8. Guardado

Todo se guarda en la nube de YouTube (`saveData`/`loadData`). Esquema y lógica en [03-arquitectura.md](03-arquitectura.md#6-guardado).

- **Qué se guarda**: récord personal, ficha máxima histórica, partidas jugadas, ajustes y **partida en curso** (tablero, puntuación, estado del RNG, récord de la partida, movimientos desde el récord).
- **Cuándo**: tras cada movimiento (*debounce* de 1 s), en cada récord, en game over y en `onPause`.
- **Resiliencia**:
  - Si guardar falla (sin conexión), el juego sigue.
  - Se reintenta con backoff y aparece un icono de nube tachada mientras haya un guardado pendiente.
  - Si se pierde el contexto WebGL, la escena se reconstruye desde el estado en memoria.

## 9. HUD

Mínimo y sin cajas: tipografía fina, blanco al ~70% de opacidad, pegado al tablero.

- **Puntuación** (grande), **récord** (pequeño) y **ficha máxima** de la partida (pequeño).
- **Bonus de récord**: al conseguir uno, aparece brevemente junto a la puntuación con el formato `+384 ×1.5`.
- **Nombre de etapa**: aparece grande durante la transición y se desvanece en unos 2 s.
- **Indicador de nube tachada**: solo cuando hay un guardado pendiente.

## 10. Fuera de alcance (ideas futuras, sin especificar)

- **Zone**: medidor y estado especial al estilo Tetris Effect. Ver la propuesta en `research/tetris-effect-estilos.md` §5.
- Mando (Gamepad API).
- Stems de audio pregrabados.
- Más idiomas.
- Anuncios (`ytgame.ads`), solo entre partidas y nunca durante una.
- Modos extra: Theater, Chill, Sprint…
