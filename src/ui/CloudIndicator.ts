import { t } from '../i18n/i18n';

// Crossed-out cloud shown while a save is pending or failing. See docs/01-gdd.md §8.
export class CloudIndicator {
  private readonly el = document.createElement('div');

  constructor(root: HTMLElement) {
    this.el.className = 'cloud';
    this.el.hidden = true;
    this.el.title = t('cloud.pending');
    this.el.setAttribute('aria-label', t('cloud.pending'));
    this.el.innerHTML =
      '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.6" d="M7 18h10a4 4 0 0 0 .6-8 6 6 0 0 0-11.4 1.5A3.3 3.3 0 0 0 7 18zM4 4l16 16"/></svg>';
    root.append(this.el);
  }

  show(pending: boolean): void {
    this.el.hidden = !pending;
  }
}
