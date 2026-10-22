// Stage data format. See docs/03-arquitectura.md §7.

export type Wave = 'sine' | 'triangle' | 'sawtooth' | 'square';

export const LAYER_NAMES = ['drone', 'pad', 'melody', 'bass', 'arp', 'perc'] as const;
export type LayerName = (typeof LAYER_NAMES)[number];

/** Default layers per section (docs/02-audio-visual.md §3.1). */
export const DEFAULT_SECTIONS: [LayerName[], LayerName[], LayerName[]] = [
  ['drone', 'pad', 'melody'],
  ['drone', 'pad', 'melody', 'bass'],
  ['drone', 'pad', 'melody', 'bass', 'arp', 'perc'],
];

/** Steps per bar in every pattern string ("x" = hit, "." = rest). */
export const STEPS_PER_BAR = 16;
/** Every loop is 4 bars of 4/4. */
export const LOOP_BARS = 4;
export const STEPS_PER_LOOP = LOOP_BARS * STEPS_PER_BAR;

export interface ChordDef {
  chord: string;
  bars: number;
  /** Voicing, scientific pitch notation. */
  notes: string[];
  root: string;
}

/** FM brightness: modulator at `ratio` × the note, peak deviation `index` × modulator frequency. */
export interface Fm {
  ratio: number;
  index: number;
}

export interface TonalLayer {
  wave: Wave;
  gainDb: number;
  /** Low-pass cutoff in Hz. */
  cutoff: number;
}

export interface StepLayer extends TonalLayer {
  steps: string;
  /** Note decay in seconds. */
  decay: number;
  fm?: Fm;
}

/** The composed melody's timbre; its notes live in each loop. */
export interface MelodyLayer extends TonalLayer {
  /** Note decay in seconds. */
  decay: number;
  fm?: Fm;
}

/**
 * One 4-bar loop, in its own key. Section N of a stage plays loop N.
 * `melody`: space-separated "NOTE:16ths" tokens ("-" = rest) adding up to STEPS_PER_LOOP,
 * e.g. "F#4:8 E4:4 D4:4 …".
 */
export interface LoopDef {
  /** Human label, e.g. "D mayor". */
  key: string;
  /** Scale degrees as note names in one octave, ascending from the tonic. */
  scale: string[];
  chords: ChordDef[];
  melody: string;
}

export interface PercLayer {
  gainDb: number;
  kick: string;
  hat: string;
  snare: string;
}

export interface StageLayers {
  drone?: TonalLayer;
  pad?: TonalLayer;
  melody?: MelodyLayer;
  bass?: StepLayer;
  arp?: StepLayer;
  perc?: PercLayer;
}

export interface StageDef {
  id: string;
  nameKey: string;
  fromTile: number;
  bpm: number;
  /** Serene → brighter → euphoric: one loop per section. */
  loops: [LoopDef, LoopDef, LoopDef];
  sectionThresholds: [number, number];
  layers: StageLayers;
  sections?: [LayerName[], LayerName[], LayerName[]];
  /** Timbre of the player's notes. */
  voice: { wave: Wave; decay: number; cutoff: number; fm?: Fm };
  palette: [string, string, string];
  tileSkin: string;
  environment: string;
}

const WAVES: readonly string[] = ['sine', 'triangle', 'sawtooth', 'square'];
const isFm = (fm: Fm | undefined) => fm === undefined || (fm.ratio > 0 && fm.index >= 0);
const MELODY_TOKEN = /^(-|[A-G](#|b)?-?\d):([1-9]\d*)$/;
/** Melody length in 16ths, or -1 if a token is malformed. */
export function melodySteps(melody: string): number {
  let total = 0;
  for (const tok of melody.trim().split(/\s+/)) {
    const m = MELODY_TOKEN.exec(tok);
    if (!m) return -1;
    total += Number(m[3]);
  }
  return total;
}
const isPattern = (x: unknown) => typeof x === 'string' && /^[x.]+$/.test(x) && x.length === STEPS_PER_BAR;

/** Throws with a readable message if the JSON does not match StageDef. */
export function validateStage(x: unknown): StageDef {
  const s = x as StageDef;
  const fail = (what: string) => {
    throw new Error(`Invalid stage "${String(s?.id)}": ${what}`);
  };
  if (!s || typeof s.id !== 'string') fail('id');
  if (!(s.bpm > 0)) fail('bpm');
  if (!Array.isArray(s.loops) || s.loops.length !== 3) fail('loops');
  s.loops.forEach((loop, i) => {
    if (!Array.isArray(loop.scale) || loop.scale.length === 0) fail(`loop ${i}: scale`);
    if (!Array.isArray(loop.chords) || loop.chords.length === 0) fail(`loop ${i}: chords`);
    for (const c of loop.chords) if (!(c.bars > 0) || c.notes.length === 0 || !c.root) fail(`loop ${i}: chord "${c.chord}"`);
    if (loop.chords.reduce((n, c) => n + c.bars, 0) !== LOOP_BARS) fail(`loop ${i}: chords must add up to ${LOOP_BARS} bars`);
    if (melodySteps(loop.melody) !== STEPS_PER_LOOP) fail(`loop ${i}: melody must add up to ${STEPS_PER_LOOP} 16ths`);
  });
  if (!s.layers || typeof s.layers !== 'object') fail('layers');
  for (const name of Object.keys(s.layers)) if (!(LAYER_NAMES as readonly string[]).includes(name)) fail(`unknown layer "${name}"`);
  for (const name of ['drone', 'pad', 'melody', 'bass', 'arp'] as const) {
    const l = s.layers[name];
    if (l && !WAVES.includes(l.wave)) fail(`layer "${name}": wave`);
  }
  for (const name of ['bass', 'arp'] as const) {
    const l = s.layers[name];
    if (l && (!isPattern(l.steps) || !(l.decay > 0) || !isFm(l.fm))) fail(`layer "${name}": steps/decay/fm`);
  }
  const mel = s.layers.melody;
  if (mel && (!(mel.decay > 0) || !isFm(mel.fm))) fail('layer "melody": decay/fm');
  const perc = s.layers.perc;
  if (perc && !(isPattern(perc.kick) && isPattern(perc.hat) && isPattern(perc.snare))) fail('layer "perc": patterns');
  if (s.sections) {
    if (!Array.isArray(s.sections) || s.sections.length !== 3) fail('sections');
    for (const sec of s.sections) for (const l of sec) if (!s.layers[l]) fail(`section uses missing layer "${l}"`);
  } else {
    for (const sec of DEFAULT_SECTIONS) for (const l of sec) if (!s.layers[l]) fail(`default sections need layer "${l}"`);
  }
  if (!s.voice || !WAVES.includes(s.voice.wave) || !(s.voice.decay > 0) || !isFm(s.voice.fm)) fail('voice');
  if (!Array.isArray(s.palette) || s.palette.length !== 3) fail('palette');
  return s;
}

export function stageSections(s: StageDef): [LayerName[], LayerName[], LayerName[]] {
  return s.sections ?? DEFAULT_SECTIONS;
}
