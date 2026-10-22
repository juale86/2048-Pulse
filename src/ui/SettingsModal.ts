import { t } from '../i18n/i18n';
import type { QualitySetting, Settings } from '../platform/SaveManager';

// Settings modal: per-channel volume (no master mute), haptics, reduced effects, classic palette,
// quality. Esc toggles it and is never preventDefault-ed. See docs/01-gdd.md §6.4.
export class SettingsModal {
  private readonly button = document.createElement('button');
  private readonly el = document.createElement('div');
  private settings: Settings;

  constructor(
    root: HTMLElement,
    initial: Settings,
    private readonly onChange: (s: Settings) => void,
    private readonly onOpenChange: (open: boolean) => void,
  ) {
    this.settings = { ...initial };
    this.button.className = 'settings-button';
    this.button.setAttribute('aria-label', t('settings.open'));
    this.button.innerHTML =
      '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M19.4 13a7.7 7.7 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.4 7.4 0 0 0-1.7-1L15 3.3h-4L10.7 6a7.4 7.4 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.7 7.7 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a7.4 7.4 0 0 0 1.7 1l.3 2.6h4l.3-2.6a7.4 7.4 0 0 0 1.7-1l2.5 1 2-3.5zM13 15.5A3.5 3.5 0 1 1 13 8.5a3.5 3.5 0 0 1 0 7z"/></svg>';
    this.button.addEventListener('click', () => this.toggle());
    this.el.className = 'modal';
    this.el.hidden = true;
    this.el.setAttribute('role', 'dialog');
    root.append(this.button, this.el);
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.toggle(); // no preventDefault on Esc (Playables MUST)
    });
  }

  get open(): boolean {
    return !this.el.hidden;
  }

  toggle(): void {
    if (this.open) this.close();
    else this.show();
  }

  close(): void {
    this.el.hidden = true;
    this.onOpenChange(false);
  }

  private show(): void {
    this.render();
    this.el.hidden = false;
    this.onOpenChange(true);
  }

  private update(patch: Partial<Settings>): void {
    this.settings = { ...this.settings, ...patch };
    this.onChange(this.settings);
  }

  private render(): void {
    const s = this.settings;
    this.el.replaceChildren();
    const h = document.createElement('h2');
    h.textContent = t('settings.title');
    this.el.append(h);

    const slider = (label: string, value: number, set: (v: number) => void) => {
      const row = document.createElement('label');
      row.className = 'row';
      row.textContent = label;
      const input = document.createElement('input');
      input.type = 'range';
      input.min = '0';
      input.max = '100';
      input.value = String(value);
      input.addEventListener('input', () => set(Number(input.value)));
      row.append(input);
      this.el.append(row);
    };
    const toggle = (label: string, value: boolean, set: (v: boolean) => void) => {
      const row = document.createElement('label');
      row.className = 'row';
      row.textContent = label;
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = value;
      input.addEventListener('change', () => set(input.checked));
      row.append(input);
      this.el.append(row);
    };

    slider(t('settings.music'), s.music, (music) => this.update({ music }));
    slider(t('settings.sfx'), s.sfx, (sfx) => this.update({ sfx }));
    toggle(t('settings.haptics'), s.haptics, (haptics) => this.update({ haptics }));
    toggle(t('settings.reducedFx'), s.reducedFx, (reducedFx) => this.update({ reducedFx }));
    toggle(t('settings.classicPalette'), s.classicPalette, (classicPalette) => this.update({ classicPalette }));

    const row = document.createElement('label');
    row.className = 'row';
    row.textContent = t('settings.quality');
    const select = document.createElement('select');
    for (const q of ['auto', 'high', 'low'] as QualitySetting[]) {
      const o = document.createElement('option');
      o.value = q;
      o.textContent = t(`quality.${q}`);
      o.selected = s.quality === q;
      select.append(o);
    }
    select.addEventListener('change', () => this.update({ quality: select.value as QualitySetting }));
    row.append(select);
    this.el.append(row);

    const close = document.createElement('button');
    close.className = 'primary';
    close.textContent = t('settings.close');
    close.addEventListener('click', () => this.close());
    this.el.append(close);
  }
}
