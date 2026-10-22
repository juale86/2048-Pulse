import type { GameEvent, GameState } from '../core/types';
import { t } from '../i18n/i18n';

// Minimal HUD: score, max tile, record bonus flash. See docs/01-gdd.md §9.
// Sits above the board, or beside it on wide screens where the top margin is too thin
// (docs/03-arquitectura.md §8: "arriba en vertical, a un lado en horizontal").

/** Room the HUD needs above the board, and beside it, in CSS px. */
const TOP_NEEDED = 96;
const SIDE_NEEDED = 150;
export class Hud {
  private readonly el = document.createElement('div');
  private readonly score = document.createElement('div');
  private readonly maxTile = document.createElement('div');
  private readonly bonus = document.createElement('div');
  private readonly stage = document.createElement('div');
  private bonusTimer = 0;
  private stageTimer = 0;

  constructor(root: HTMLElement) {
    this.el.className = 'hud';
    this.score.className = 'hud-score';
    this.maxTile.className = 'hud-small';
    this.bonus.className = 'hud-bonus';
    this.stage.className = 'hud-stage';
    this.el.append(this.score, this.bonus, this.maxTile);
    root.append(this.el, this.stage);
  }

  /** Places the HUD for a viewport of w×h with a square board of `board` px in the middle. */
  layout(w: number, h: number, board: number): void {
    const top = (h - board) / 2;
    const side = (w - board) / 2;
    const beside = top < TOP_NEEDED && side >= SIDE_NEEDED;
    this.el.classList.toggle('side', beside);
    this.el.style.left = beside ? `${side / 2}px` : '';
  }

  /** Big stage name during a transition, fading after ~2 s. */
  showStage(name: string): void {
    this.stage.textContent = name;
    this.stage.classList.add('show');
    clearTimeout(this.stageTimer);
    this.stageTimer = window.setTimeout(() => this.stage.classList.remove('show'), 2000);
  }

  render(state: GameState, events: readonly GameEvent[] = []): void {
    this.score.textContent = `${t('hud.score')} ${state.score.toLocaleString()}`;
    this.maxTile.textContent = `${t('hud.maxTile')} ${state.recordTile}`;
    const rec = events.find((e) => e.type === 'NewRecord');
    if (rec && rec.type === 'NewRecord') {
      this.bonus.textContent = `+${rec.bonus} ×${rec.mult.toFixed(1)}`;
      this.bonus.classList.add('show');
      clearTimeout(this.bonusTimer);
      this.bonusTimer = window.setTimeout(() => this.bonus.classList.remove('show'), 1500);
    }
  }
}
