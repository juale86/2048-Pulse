// Minimal i18n: BCP-47 prefix match, fallback to English. See docs/03-arquitectura.md §11.
import en from './en.json';
import es from './es.json';

type Dict = Record<string, string>;
const DICTS: Record<string, Dict> = { en, es };
let current: Dict = en;

/** `tag` comes from PlayablesSdk.getLanguage() (never navigator.language). */
export function setLanguage(tag: string): void {
  const prefix = tag.toLowerCase().split('-')[0];
  current = DICTS[prefix] ?? en;
}

export function t(key: string): string {
  const v = current[key] ?? (en as Dict)[key];
  if (v === undefined && import.meta.env.DEV) console.warn(`[i18n] missing key: ${key}`);
  return v ?? key;
}
