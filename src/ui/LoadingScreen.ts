// Explicit loading screen shown while firstFrameReady → gameReady. See docs/01-gdd.md §6.1.
export class LoadingScreen {
  private readonly el = document.createElement('div');

  constructor(root: HTMLElement) {
    this.el.className = 'loading';
    this.el.innerHTML = '<div class="loading-pulse"></div><div class="loading-text"></div>';
    root.append(this.el);
  }

  setText(text: string): void {
    this.el.querySelector('.loading-text')!.textContent = text;
  }

  hide(): void {
    this.el.remove();
  }
}
