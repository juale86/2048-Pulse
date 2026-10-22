# 02 — Audio y visual

> Fundamento: `research/tetris-effect-estilos.md`. En Tetris Effect "los efectos de sonido son la música": cada acción toca un sonido de la etapa, sincronizado con el beat.

## 1. Principio rector

**La lógica es inmediata; el sonido y el pulso son musicales.**

- Al recibir un movimiento, el tablero se resuelve y las fichas empiezan a animarse **en el mismo frame**.
- El sonido tonal y el pulso visual asociados se programan en la **siguiente subdivisión** del `BeatClock`.
- Retraso máximo: una semicorchea. Son 167 ms a 90 BPM y 110 ms a 136 BPM.
- Si en pruebas la cuantización se siente lenta, la opción prevista (no activa por defecto) es añadir un transitorio inmediato sin tono, un "click" muy corto, y dejar la nota tonal cuantizada.

## 2. Mapa sinestésico

Modelo **híbrido**: una base generativa que nunca se corta y crece con el progreso, y encima las jugadas, que tocan notas afinadas con esa base. Cada etapa define el **timbre**; el mapa de eventos es común a todas:

| Evento (core) | Sonido | Cuantización |
|---|---|---|
| `Moved` (movimiento válido) | Nota corta del **acorde actual**. La dirección elige el registro: ↑ agudo (+2 octavas sobre el voicing), ↓ grave (voicing), ←/→ medio (+1 octava). Movimientos consecutivos recorren los tonos del acorde en orden (arpegio emergente) | Siguiente **1/16** |
| `Merged` | Nota más brillante de la **escala** de la etapa. La altura sube con `log2(valor)`: 4 → grado 0, 8 → grado 1, … y si se sale de la escala, sube de octava. Si hay varias fusiones en un mismo movimiento, suenan como **arpegio** ascendente | Con el slide, arpegio en **1/32** |
| `Spawned` | *Tick* muy sutil, casi percusivo (ruido filtrado) | Siguiente **1/8** |
| `Invalid` | Golpe grave y apagado, corto, sin nota | **Inmediato** |
| `NewRecord` / `StageChanged` | **Drop**: impacto grave (barrido de seno + ruido) | Siguiente **compás** |
| `SectionChanged` | La base **modula** al loop de la nueva sección (otra tonalidad, más euforia), sube el tempo y entran o salen capas | Al **terminar el loop** de 4 compases en curso |
| `GameOver` | La base se **corta al instante** (fundido de ~50 ms para evitar el clic). 1 s después entra suave un drone muy bajito que dura mientras se ve el panel | **Inmediato** |

**Mezcla**:
- Las notas del jugador siempre caen en la tonalidad y el acorde de la etapa, así que nunca desafinan.
- Cuando suena una nota del jugador, la base baja un instante (*ducking* de −3 dB).
- Base y notas comparten un **delay sincronizado al tempo** (corchea con puntillo, con realimentación) que hace de "pegamento". No hay reverb.

## 3. Música generativa (Web Audio pura)

Todo se sintetiza en tiempo real con la **Web Audio API nativa**: osciladores, filtros, ganancias y envolventes. No hay librerías de audio ni archivos de sonido. Sin AudioWorklet ni Workers (reglas de Playables).

### 3.1 Modelo

- **Un motor común, una identidad por etapa**: el JSON de la etapa define BPM, sus 3 loops, el timbre de cada capa y el de las notas del jugador.
- **La base es una pieza compuesta, no tonos sueltos.** Cada etapa tiene **3 loops de 4 compases en 4/4**, uno por sección: sereno → más luminoso → eufórico. Cada loop tiene su **propia tonalidad** (la modulación es lo que "levanta"), su progresión (un acorde por compás) y una **melodía compuesta**, escrita como `NOTA:duración` en semicorcheas.
- **Cambio de sección**: espera a que **termine la vuelta de 4 compases** en curso, así la frase se completa; ahí modula al loop nuevo, entran o salen capas y el tempo hace una rampa de 1 compás. Lo visual (`uSection`) cambia al instante. La escalada vuelve a empezar en cada etapa.
- **Tempo**: cada sección suma **+6 BPM** al BPM base de la etapa (Abismo: 90 → 96 → 102).
- **Catálogo fijo de 5 capas**:

| Capa | Qué toca | Nodos |
|---|---|---|
| `drone` | Raíz del acorde, larga, grave y suave, más su octava muy tenue; sin desafinación (no "batido") | 2 osciladores |
| `melody` | La melodía compuesta del loop, con una voz FM suave | 2 voces FM (4 osciladores) que se alternan para que las colas se solapen |
| `pad` | El acorde sostenido, suave, con filtro y una **respiración** lenta de volumen (un ciclo cada ~12 s) | 4 osciladores (2 en calidad baja) + 1 LFO |
| `bass` | Pulso rítmico sobre la raíz, según un patrón de 16 pasos | 1 oscilador |
| `arp` | Notas del acorde según un patrón de 16 pasos | 1 oscilador |
| `perc` | Bombo (barrido de seno), hi-hat y caja (ruido filtrado), con patrones de 16 pasos | 1 oscilador + 1 fuente de ruido en bucle |

- **Sección → capas activas**. Por defecto: sección 1 = `drone` + `pad` + `melody` · 2 = + `bass` · 3 = + `arp` + `perc`. La melodía suena siempre, también en el título. Cada etapa puede cambiarlo en su JSON. Las capas entran y salen en el **límite de compás** con una rampa de 1 negra.
- **Carácter luminoso** en todas las etapas: acordes mayores, con séptima mayor, add9 o sus; nada de menores oscuros sobre un drone grave.
- **Nada de sonido "MIDI"**: solo senos y triángulos. Las notas del jugador, el arpegio y el bajo usan una voz **FM** de 2 osciladores (campana, kalimba, marimba, piano eléctrico) cuyo brillo cae más rápido que el volumen. Leve vibrato compartido en las notas del jugador y ±10% de variación de volumen entre notas.
- **La base tiene que dar calma**: el drone es siempre un seno bajito, los acordes cambian deslizándose suave y el pad desafina sus voces solo ±2 cents (sin batido audible).
- Los patrones son **datos**: cadenas de 16 caracteres (`x` = golpe, `.` = silencio) en el JSON.
- **Remix**: +10% de BPM y +2 semitonos por vuelta, con tope de 3 vueltas.

### 3.2 Presupuesto de recursos

- Todos los nodos de una etapa se crean una sola vez, al crear la etapa. Durante el juego **no se crean nodos**: los osciladores corren siempre y solo se automatizan sus frecuencias y ganancias.
- Las notas del jugador usan un **grupo fijo de 6 voces**; si llegan más notas que voces libres, se reutiliza la más vieja (*robo de voz*).
- Peor caso: ~15 osciladores sonando; ~30 durante el compás de una transición de etapa.
- **Calidad baja** (la del gobernador de render): el `pad` pasa a 2 osciladores y se apaga el delay. Las capas y las notas siguen sonando igual.

### 3.3 Reloj, mute, pausa

- **El `BeatClock` es la línea de tiempo musical única.** Avanza con el loop de render y alimenta el pulso visual, así que lo visual late aunque el audio esté en mute o bloqueado por el navegador.
- El audio **sigue** al `BeatClock`: cada frame se programan por adelantado (~150 ms) los pasos de 1/16 que caen en esa ventana, convirtiendo el tiempo del reloj al `currentTime` del `AudioContext` con un desfase que se corrige suavemente. Nunca se usa `setTimeout` para sonar.
- **Ganancia efectiva**: `ytAudioEnabled ? master × canal : 0`. Con el mute, el contexto sigue corriendo con el master a 0.
- **Arranque**: al cargar se intenta `context.resume()`. Si el navegador lo bloquea, se reintenta en el primer `pointerdown` o `keydown`. El juego **no espera** a ese gesto para funcionar.
- **Pausa**: `onPause` para el loop de render (y con él el `BeatClock`) y hace `context.suspend()`; `onResume` lo reanuda.
- **Título**: la base de la etapa guardada (o Abismo) suena en la **sección 1** desde que aparece la pantalla.

## 4. Dirección visual base (común a todas las etapas)

| Elemento | Especificación |
|---|---|
| Fondo | Casi negro (≈ `#03050a`) con un gradiente sutil del color dominante de la etapa |
| Tablero | Rejilla flotante de líneas finas emisivas, sin caja sólida. El brillo del marco pulsa en cada compás |
| Fichas | Cubos redondeados (`RoundedBoxGeometry`) emisivos o de cristal. El color sale de la **paleta de 3 colores** de la etapa, interpolado por `log2(valor)`. La intensidad emisiva sube con el valor. El número va en la cara frontal, en **bordó profundo** (`#4a0e22`) o **rosa palo** (`#f2c4d0`, atenuado bajo el umbral del bloom), el que dé más contraste (textura de canvas por valor, en atlas; SDF si hace falta nitidez) |
| Pulso global | Uniform `uBeat` que pasa de 0 a 1 y decae en cada negra. Lo usan la rejilla, el entorno y el bloom. **Las fichas no laten**: se quitó su pulso de escala y emisión por pedido (2026-10-21) |
| Slide | 80–100 ms, *ease-out* |
| Fusión | "Pop" de escala (1.0 → 1.2 → 1.0, ~150 ms) y **estallido de partículas** del color de la ficha. La cantidad crece con `log2(valor)` |
| Spawn | La ficha se materializa a partir de partículas que convergen (~120 ms) |
| Récord / cambio de etapa | Flash breve y aberración cromática; las partículas del entorno se dispersan y se rearman con la nueva etapa (ver §6) |
| Entorno | Sistema de partículas propio de cada etapa (`Points` + `ShaderMaterial`, blending aditivo) que reacciona al beat, a las fusiones y a la intensidad de la sección |
| Cámara | Perspectiva frontal con ~8° de inclinación. Balanceo lento al ritmo (±0.5°) y *punch* (zoom de 2%) en fusiones ≥ 512 y en drops. El tablero siempre se lee con claridad |
| Postprocesado | Bloom (`UnrealBloomPass`), viñeta suave y aberración cromática **solo** en drops |
| UI | HTML/CSS superpuesto al canvas (texto nítido en cualquier DPR, accesible) |

### Accesibilidad

- **Efectos reducidos**: 30% de partículas, sin balanceo ni *punch* de cámara, sin flashes ni aberración. Se activa por defecto si `prefers-reduced-motion` está activo.
- **Paleta clásica**: los colores del 2048 tradicional en las fichas, para máxima legibilidad. El entorno de la etapa se mantiene.
- Contraste del texto de las fichas y del HUD ≥ 4.5:1.

## 5. Las 6 etapas

Los campos de una etapa se corresponden con su JSON (ver [03-arquitectura.md](03-arquitectura.md#7-datos-de-etapa)). Las paletas son orientativas y se afinan al implementar cada etapa.

### 1 · Abismo (desde el inicio) — **etapa del MVP**

- **Ambiente**: océano profundo, calma, oscuridad que se va iluminando. Empieza casi en silencio, como *The Deep* de Tetris Effect.
- **BPM**: 90 (+6 por sección).
- **Loops**: 1 · Re mayor `Dmaj9 – Bm7 – Gmaj7 – Asus2` · 2 · Mi mayor `Emaj9 – C♯m7 – Amaj7 – B6` · 3 · Sol mayor `Cmaj9 – D6 – Bm7 – Em7` (IV–V–iii–vi, el más eufórico).
- **Capas por sección**:
  1. `drone` (seno grave, bajito) + `pad` (seno con filtro cerrado, respirando).
  2. + `bass` (sub-bajo de seno en negras).
  3. + `arp` (triángulo en corcheas) + `perc` suave (bombo apagado y hi-hat ligero).
- **Notas del jugador**: celesta FM (seno), caída larga.
- **Paleta**: turquesa `#1de9b6` · cian `#00b8d4` · azul profundo `#0d47a1`.
- **Fichas**: cristal bioluminiscente, núcleo emisivo turquesa.
- **Entorno**: plancton (puntos que derivan con ruido *curl*) y 2 o 3 medusas de partículas que laten con el beat. Cada fusión emite un destello que viaja hacia el plancton más cercano. En la sección 3 aparecen rayos de luz desde arriba.

### 2 · Dunas (desde 128)

- **Ambiente**: amanecer en el desierto, cálido. **BPM**: 100. **Loops**: La mixolidio → Si mixolidio → Re mayor.
- **Música**: marimba FM, percusión de mano, drones.
- **Paleta**: ámbar · dorado · rosa.
- **Entorno**: arena en remolinos y un sol que sube con las secciones.

### 3 · Neón (desde 256)

- **Ambiente**: ciudad nocturna, energía. **BPM**: 118. **Loops** (*city pop*): Do mayor → Re mayor → Mi mayor.
- **Música**: house luminoso, piano eléctrico FM, bajo pulsante.
- **Paleta**: magenta · cian · violeta.
- **Entorno**: rascacielos de líneas y lluvia de luz.

### 4 · Luciérnagas (desde 512)

- **Ambiente**: bosque nocturno, un respiro. **BPM**: 104. **Loops**: Sol pentatónica → La pentatónica → Do pentatónica.
- **Música**: kalimba FM, texturas orgánicas.
- **Paleta**: verde · lima · ámbar.
- **Entorno**: enjambres de luciérnagas que siguen las fusiones.

### 5 · Tormenta (desde 1024)

- **Ambiente**: energía, clímax (sin oscuridad: la intensidad viene del ritmo). **BPM**: 128. **Loops**: Si♭ mayor → Do mayor → Re mayor.
- **Música**: breakbeat, piano eléctrico y marimba FM.
- **Paleta**: azul eléctrico · blanco · púrpura.
- **Entorno**: nubes de partículas y relámpagos sincronizados con los drops.

### 6 · Cosmos (desde 2048)

- **Ambiente**: trascendencia, final emocional. **BPM**: 136. **Loops**: Mi lidio → Sol lidio → La mayor.
- **Música**: coros, pads épicos, todas las capas.
- **Paleta**: oro · blanco · espectro completo.
- **Entorno**: nebulosa y una criatura cósmica de partículas.

### Remix (desde 4096)

Repite la secuencia desde la etapa 1 con +10% de BPM y +2 semitonos por vuelta (tope de 3 vueltas) y la paleta desplazada en tono.

> Las etapas 2–6 están en resumen. La línea **Música** es la intención de estilo; lo que suena de verdad está en su JSON (timbres y patrones de las 5 capas).

## 6. Transición entre etapas

Se dispara en `StageChanged`. Dura 1 compás, alineado al `BeatClock`:

1. **Beat 1 del siguiente compás**: drop (impact + crash), flash blanco de ~100 ms y aberración cromática.
2. Las partículas del entorno anterior se **dispersan** (más velocidad y ruido *curl*, *fade out*) mientras las del nuevo se **ensamblan** desde el centro.
3. Durante ~1 compás se hace *crossfade* de los uniforms de paleta en fichas, rejilla y fondo.
4. La base de la etapa vieja se desvanece en 1 compás mientras entra la nueva, tocando el loop de la sección que calcula el núcleo (normalmente el 1). El BPM pasa al de esa sección con una rampa de 1 compás. A diferencia de un cambio de sección, aquí no se espera al final del loop: el cambio de etapa cae en el compás del drop.
5. El nombre de la etapa aparece grande y se desvanece.

Durante la transición **la entrada nunca se bloquea**.
