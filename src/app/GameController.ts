import type { StageAudio } from '../audio/StageAudio';
import { applyMove, newGame } from '../core/game';
import { nextMilestone, sameStage } from '../core/stages';
import type { Direction, GameEvent, GameState, Section, StageRef } from '../core/types';
import { t } from '../i18n/i18n';
import type { Haptics } from '../input/Haptics';
import type { SaveManager, ScoreReporter } from '../platform/SaveManager';
import type { BeatClock } from './BeatClock';
import type { BeatUniforms } from '../render/BeatUniforms';
import type { Particles } from '../render/Particles';
import type { BoardView } from '../render/BoardView';
import type { Renderer } from '../render/Renderer';
import type { StageVisuals } from '../render/StageVisuals';
import type { TileView } from '../render/TileView';
import { stageBpm, stageDef, stagePalette } from '../stages';
import type { GameOverPanel } from '../ui/GameOverPanel';
import type { Hint } from '../ui/Hint';
import type { Hud } from '../ui/Hud';
import type { TitleScreen } from '../ui/TitleScreen';
import type { Screen } from './screens';

// Sole owner of GameState; routes core events to render, audio, UI and save.
// Logic resolves instantly; only sound and visual pulses are quantized to the beat. See docs/03-arquitectura.md §3.

export interface ControllerDeps {
  tiles: TileView;
  board: BoardView;
  visuals: StageVisuals;
  particles: Particles;
  renderer: Renderer;
  beat: BeatUniforms;
  hud: Hud;
  title: TitleScreen;
  gameOver: GameOverPanel;
  hint: Hint;
  save: SaveManager;
  score: ScoreReporter;
  clock: BeatClock;
  audio: StageAudio;
  /** Stage the visuals and audio start with at boot. */
  initialStage: StageRef;
  haptics: Haptics;
  makeSeed: () => number;
}

const SLIDE_S = 0.09;
const PUNCH_TILE = 512;

export class GameController {
  screen: Screen = 'title';
  /** True while a modal (settings) is open: game input is ignored. */
  modalOpen = false;
  private state: GameState | null = null;
  private bestAtStart = 0;
  /** Stage currently shown (or switching in at the next bar). */
  private shown: StageRef;

  constructor(private readonly d: ControllerDeps) {
    this.shown = d.initialStage;
  }

  showTitle(): void {
    this.screen = 'title';
    this.d.tiles.sync([]);
    this.d.title.show(this.d.save.data.best, this.d.save.data.game !== null);
  }

  start(continueGame: boolean): void {
    const save = this.d.save.data;
    if (continueGame && save.game) {
      this.state = save.game;
    } else {
      this.state = newGame(this.d.makeSeed());
      save.gamesPlayed++;
      save.game = this.state;
      this.d.save.request('now');
    }
    this.bestAtStart = save.best;
    this.screen = 'playing';
    this.d.title.hide();
    this.d.gameOver.hide();
    this.d.tiles.sync(this.state.tiles);
    this.d.hud.render(this.state);
    if (!save.tutorialDone) this.d.hint.show();
    if (sameStage(this.shown, this.state.stage)) {
      this.d.audio.restore();
      this.d.audio.setSection(this.state.section);
    } else {
      this.changeStage(this.state.stage, this.state.section, false);
    }
    this.d.beat.setSection(this.state.section);
  }

  move = (dir: Direction): void => {
    if (this.modalOpen) return;
    if (this.screen === 'title') {
      this.start(this.d.save.data.game !== null);
      return;
    }
    if (this.screen !== 'playing' || !this.state) return;

    this.d.tiles.finishAll();
    const { state, events } = applyMove(this.state, dir);
    this.state = state;
    if (!this.d.save.data.tutorialDone && events[0]?.type === 'Moved') {
      this.d.save.data.tutorialDone = true;
      this.d.hint.hide();
    }
    this.d.tiles.apply(events, performance.now());
    this.d.hud.render(state, events);
    this.react(events);
    this.persist(state, events);
    if (state.over) {
      this.screen = 'gameover';
      this.d.gameOver.show(state, state.score > this.bestAtStart && state.score > 0);
    }
  };

  /** Space / Enter: start from the title, restart after game over. */
  confirm = (): void => {
    if (this.modalOpen) return;
    if (this.screen === 'title') this.start(this.d.save.data.game !== null);
    else if (this.screen === 'gameover') this.restart();
  };

  /**
   * Dev-only: turns the smallest tile into the next stage milestone; the next valid move
   * then triggers NewRecord + StageChanged.
   */
  debugInjectMilestone(): void {
    if (!this.state || this.screen !== 'playing') return;
    const m = nextMilestone(this.state.stage);
    const tiles = [...this.state.tiles];
    let idx = 0;
    tiles.forEach((tile, i) => {
      if (tile.value < tiles[idx].value) idx = i;
    });
    tiles[idx] = { ...tiles[idx], value: m };
    this.state = { ...this.state, tiles };
    this.d.tiles.sync(tiles);
  }

  restart = (): void => {
    this.start(false);
  };

  /**
   * At the next bar: cross-fades the music and ramps the tempo over one bar, disperses/assembles
   * the worlds and cross-fades tile and grid colors. See docs/02-audio-visual.md §6.
   */
  private changeStage(to: StageRef, section: Section, announce: boolean): void {
    const { clock, audio, visuals, tiles, board, hud } = this.d;
    const time = clock.next('1m');
    const bar = clock.seconds('1m');
    const palette = stagePalette(to);
    this.shown = to;
    audio.transition(to, section, time, bar);
    clock.setBpmAt(stageBpm(to, section), bar, time);
    clock.at(time, () => {
      visuals.transition(to, bar);
      tiles.setPalette(palette, bar);
      board.setColor(palette[1]);
      if (announce) {
        const name = t(stageDef(to).nameKey);
        hud.showStage(to.lap > 0 ? t('stage.remix').replace('{name}', name) : name);
      }
    });
  }

  private react(events: readonly GameEvent[]): void {
    const { clock, audio, beat, particles, tiles, renderer, haptics, visuals } = this.d;
    // Notes first: the drop and this move's notes belong to the stage being left.
    this.accents(events);
    if (events.some((e) => e.type === 'NewRecord' || e.type === 'StageChanged')) {
      const drop = clock.next('1m');
      audio.drop(drop);
      clock.at(drop, () => {
        beat.accent(1.2);
        renderer.postFx.drop();
        renderer.punch(1);
        visuals.onDrop();
        if (this.state) particles.shockwave(tiles.colorOf(this.state.recordTile));
      });
    }
    for (const e of events) {
      if (e.type === 'Merged') {
        const p = tiles.cellPosition(e.into);
        particles.burst(p.x, p.y, tiles.colorOf(e.value), e.value, SLIDE_S);
        visuals.onMerge(p.x, p.y, e.value);
        haptics.pulse(15);
        if (e.value >= PUNCH_TILE) renderer.punch(0.6);
      } else if (e.type === 'Spawned') {
        audio.spawned(clock.next('8n'));
        const p = tiles.cellPosition(e.tile);
        particles.converge(p.x, p.y, tiles.colorOf(e.tile.value), SLIDE_S);
      } else if (e.type === 'NewRecord') {
        haptics.pulse(60);
      } else if (e.type === 'StageChanged') {
        haptics.pulse(60);
        this.changeStage(e.to, this.state?.section ?? 0, true);
      } else if (e.type === 'SectionChanged') {
        audio.setSection(e.section);
        beat.setSection(e.section);
      } else if (e.type === 'Invalid') {
        audio.invalid();
      } else if (e.type === 'GameOver') {
        audio.gameOver();
      }
    }
  }

  /** Move note + accent on the next 16th; merges follow in ascending value, one 32nd apart. */
  private accents(events: readonly GameEvent[]): void {
    const { clock, audio, beat } = this.d;
    const moved = events.find((e): e is Extract<GameEvent, { type: 'Moved' }> => e.type === 'Moved');
    if (!moved) return;
    const time = clock.next('16n');
    audio.moved(moved.dir, time);
    clock.at(time, () => beat.accent(0.3));
    const values: number[] = [];
    for (const e of events) if (e.type === 'Merged') values.push(e.value);
    const step = clock.seconds('32n');
    values.sort((a, b) => a - b).forEach((value, i) => {
      audio.merged(value, time + i * step);
      clock.at(time + i * step, () => beat.accent(0.4 + Math.log2(value) * 0.04));
    });
  }

  private persist(state: GameState, events: readonly GameEvent[]): void {
    const save = this.d.save.data;
    save.game = state.over ? null : state;
    if (state.score > save.best) {
      save.best = state.score;
      this.d.score.changed();
    }
    save.bestTile = Math.max(save.bestTile, state.recordTile);
    const important = events.some((e) => e.type === 'NewRecord' || e.type === 'GameOver');
    this.d.save.request(important ? 'now' : 'debounced');
    if (state.over) this.d.score.flush();
  }
}
