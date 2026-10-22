import { t } from '../i18n/i18n';

// First-game hint under the board; fades out on the first valid move and never returns.
// See docs/04-youtube-playables.md §3 (tutorial).
export class Hint {
  private readonly el = document.createElement('div');

  constructor(root: HTMLElement) {
    this.el.className = 'hint';
    this.el.hidden = true;
    this.el.textContent = t('hint.move');
    root.append(this.el);
  }

  show(): void {
    this.el.hidden = false;
  }

  hide(): void {
    this.el.hidden = true;
  }
}
