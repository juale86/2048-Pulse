import { t } from '../i18n/i18n';

// Shown while the platform has the game paused (onPause → onResume) so it never looks frozen.
// No resume button: YouTube triggers onResume. See docs/04-youtube-playables.md §3.
export class PauseOverlay {
  private readonly el = document.createElement('div');

  constructor(root: HTMLElement) {
    this.el.className = 'pause';
    this.el.hidden = true;
    this.el.textContent = t('pause.title');
    root.append(this.el);
  }

  pause(): void {
    this.el.hidden = false;
  }

  resume(): void {
    this.el.hidden = true;
  }
}
