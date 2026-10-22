# 2048 Pulse

> Nombre interno del proyecto/repo: **2048 Effect**. Nombre público: **2048 Pulse**.

Un 2048 clásico (4×4, reglas originales) renderizado en 3D con three.js, donde **jugar es tocar la música**. Cada deslizamiento, fusión y ficha nueva suena cuantizado al beat, y el mundo de partículas, luz y color reacciona a cada jugada, al estilo sinestésico de *Tetris Effect*. Se publica como **YouTube Playable** para escritorio y móvil.

## Créditos

**2048** es un juego creado por **Gabriele Cirulli** (2014). 2048 Pulse es una reinterpretación audiovisual de sus reglas; la autoría del juego original es suya. El crédito aparece en la pantalla de título y en la ficha del Playable.

## En una frase

2048 de toda la vida, pero cada partida es un viaje audiovisual por 6 etapas, del **Abismo** al **Cosmos**, que avanza con cada nueva ficha récord.

## Pilares

1. **Reglas intactas.** Es el 2048 original. Toda la innovación está en la presentación y en la puntuación por ritmo de progreso.
2. **Sinestesia.** Los efectos de sonido *son* la música. La lógica responde al instante y el sonido y el pulso visual caen en el beat.
3. **Viaje.** Las etapas cambian música, paleta, fichas y entorno con cada ficha récord (128, 256, 512…).
4. **Flow sin reloj.** No hay presión de tiempo. La velocidad se premia en *movimientos*, no en segundos.
5. **Nativo de Playables.** Carga rápida, sin red externa, guardado en la nube de YouTube y respeto al mute y a la pausa de la plataforma.

## Documentación

| Documento | Contenido |
|---|---|
| [CLAUDE.md](CLAUDE.md) | Instrucciones para agentes: qué leer, reglas duras, convenciones |
| [docs/01-gdd.md](docs/01-gdd.md) | Diseño del juego: reglas, puntuación, etapas, flujo de pantallas, entrada |
| [docs/02-audio-visual.md](docs/02-audio-visual.md) | Mapa sinestésico, cuantización, música generativa, dirección visual, las 6 etapas |
| [docs/03-arquitectura.md](docs/03-arquitectura.md) | Stack, módulos, interfaces, eventos, save, calidad, estructura de carpetas |
| [docs/04-youtube-playables.md](docs/04-youtube-playables.md) | Requisitos de Playables aplicados a este juego + checklist de certificación |
| [docs/05-roadmap.md](docs/05-roadmap.md) | Fases. F0 y F1 con tareas y criterios de aceptación; F2, F3 y Futuro en resumen |
| [docs/06-ficha-playable.md](docs/06-ficha-playable.md) | Metadatos para el Developer Portal: título, descripciones en/es, miniaturas, etiquetas |
| [docs/decisiones.md](docs/decisiones.md) | Registro histórico de las decisiones de diseño |
| [research/](research/) | Investigación: estilo de Tetris Effect y requisitos de YouTube Playables |

## Stack

Vite · TypeScript · three.js (vanilla) · Web Audio API nativa · Vitest. Sin wasm, sin Web Workers, sin peticiones externas.

## Estado

F0, F1 y F2 implementadas. F3 está en curso: lo que falta requiere navegador, dispositivos y acceso al Developer Portal. Ver [docs/05-roadmap.md](docs/05-roadmap.md).

```
npm run dev          # desarrollo con MockSdk (panel de debug: tecla `)
npm test             # tests de core, guardado y etapas
npm run build        # build de producción (SDK de YouTube inyectado)
npm run check        # valida dist/ contra las reglas de Playables
npm run zip          # empaqueta dist/ para subir al Developer Portal
npx vite-node scripts/simulate-par.ts 200   # calibración del bonus de récord
```

## Licencia

Copyright (c) 2026 Juan Manuel Aleman. Todos los derechos reservados. Ver [`LICENSE`](LICENSE).
