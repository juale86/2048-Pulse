import { t } from '../i18n/i18n';

// Title over the empty board, crediting the original 2048 (no link: Playables forbids external
// links). See docs/01-gdd.md §6.2.
export class TitleScreen {
  private readonly el = document.createElement('div');

  constructor(
    root: HTMLElement,
    private readonly onStart: (continueGame: boolean) => void,
  ) {
    this.el.className = 'title';
    this.el.hidden = true;
    root.append(this.el);
  }

  get visible(): boolean {
    return !this.el.hidden;
  }

  show(best: number, hasGame: boolean): void {
    this.el.replaceChildren();
    const logo = document.createElement('h1');
    logo.textContent = '2048 Pulse';
    const bestEl = document.createElement('p');
    bestEl.className = 'title-best';
    bestEl.textContent = best > 0 ? `${t('title.best')} ${best.toLocaleString()}` : '';
    const play = document.createElement('button');
    play.className = 'primary';
    play.textContent = hasGame ? t('title.continue') : t('title.play');
    play.addEventListener('click', () => this.onStart(hasGame));
    this.el.append(logo, bestEl, play);
    if (hasGame) {
      const fresh = document.createElement('button');
      fresh.className = 'link';
      fresh.textContent = t('title.new');
      fresh.addEventListener('click', () => this.onStart(false));
      this.el.append(fresh);
    }
    const credit = document.createElement('p');
    credit.className = 'title-credit';
    credit.textContent = t('title.credit');
    this.el.append(credit);
    this.el.hidden = false;
  }

  hide(): void {
    this.el.hidden = true;
  }
}
