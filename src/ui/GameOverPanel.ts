import type { GameState } from '../core/types';
import { t } from '../i18n/i18n';

// Panel over the still-visible board. See docs/01-gdd.md §6.5.
export class GameOverPanel {
  private readonly el = document.createElement('div');

  constructor(root: HTMLElement, private readonly onAgain: () => void) {
    this.el.className = 'gameover';
    this.el.hidden = true;
    root.append(this.el);
  }

  get visible(): boolean {
    return !this.el.hidden;
  }

  show(state: GameState, newRecord: boolean): void {
    this.el.replaceChildren();
    const title = document.createElement('h2');
    title.textContent = t('gameover.title');
    this.el.append(title);
    if (newRecord) {
      const rec = document.createElement('p');
      rec.className = 'gameover-record';
      rec.textContent = t('gameover.newRecord');
      this.el.append(rec);
    }
    const score = document.createElement('p');
    score.textContent = `${t('gameover.score')}: ${state.score.toLocaleString()}`;
    const tile = document.createElement('p');
    tile.textContent = `${t('gameover.maxTile')}: ${state.recordTile}`;
    const again = document.createElement('button');
    again.className = 'primary';
    again.textContent = t('gameover.again');
    again.addEventListener('click', this.onAgain);
    this.el.append(score, tile, again);
    this.el.hidden = false;
  }

  hide(): void {
    this.el.hidden = true;
  }
}
