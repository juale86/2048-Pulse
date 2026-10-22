import './ui/styles.css';
import { GameController } from './app/GameController';
import { PauseController } from './app/PauseController';
import { BOARD_SIZE } from './core/constants';
import { setLanguage, t } from './i18n/i18n';
import { Haptics } from './input/Haptics';
import { InputQueue } from './input/InputQueue';
import { Keyboard } from './input/Keyboard';
import { Pointer } from './input/Pointer';
import { sdk } from './platform';
import { MockSdk } from './platform/MockSdk';
import { SaveManager, ScoreReporter, type Settings } from './platform/SaveManager';
import { BeatClock } from './app/BeatClock';
import { AudioEngine } from './audio/AudioEngine';
import { StageAudio } from './audio/StageAudio';
import { BeatUniforms } from './render/BeatUniforms';
import { BoardView } from './render/BoardView';
import { Particles } from './render/Particles';
import { PRESETS, QualityGovernor, initialLevel, readDeviceHints, type QualityLevel } from './render/Quality';
import { Renderer } from './render/Renderer';
import { StageVisuals } from './render/StageVisuals';
import { TileView } from './render/TileView';
import { stageBpm, stagePalette } from './stages';
import { CloudIndicator } from './ui/CloudIndicator';
import { DebugStats } from './ui/DebugStats';
import { GameOverPanel } from './ui/GameOverPanel';
import { Hint } from './ui/Hint';
import { Hud } from './ui/Hud';
import { LoadingScreen } from './ui/LoadingScreen';
import { PauseOverlay } from './ui/PauseOverlay';
import { SettingsModal } from './ui/SettingsModal';
import { TitleScreen } from './ui/TitleScreen';

// Boot: loading → firstFrameReady → language + loadData → scene + audio → precompile → title → gameReady.
// See docs/01-gdd.md §6 and docs/04-youtube-playables.md §2.1.

window.addEventListener('error', () => sdk.logError());
window.addEventListener('unhandledrejection', () => sdk.logError());

const REDUCED_FX_FACTOR = 0.3;

async function main(): Promise<void> {
  const ui = document.getElementById('ui') as HTMLElement;
  const canvas = document.getElementById('game') as HTMLCanvasElement;

  const loading = new LoadingScreen(ui);
  sdk.firstFrameReady();
  setLanguage(await sdk.getLanguage());
  loading.setText(t('loading'));

  const cloud = new CloudIndicator(ui);
  const save = new SaveManager(sdk, (pending) => cloud.show(pending));
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  await save.load(reducedMotion);
  const score = new ScoreReporter(sdk, () => save.data.best);

  const initialStage = save.data.game?.stage ?? { index: 0, lap: 0 };
  const palette = stagePalette(initialStage);

  // Render
  const renderer = new Renderer(canvas, (lost) => {
    if (lost) sdk.logError();
  });
  const beat = new BeatUniforms();
  const board = new BoardView(renderer.scene, BOARD_SIZE);
  board.setColor(palette[1]);
  const tiles = new TileView(renderer.scene, BOARD_SIZE, palette);
  const particles = new Particles(renderer.scene, beat);
  const visuals = new StageVisuals(renderer.scene, beat, initialStage);
  renderer.beat = () => beat.uBeat.value;
  renderer.onResize((_w, _h, dpr) => {
    particles.setPixelRatio(dpr);
    visuals.setPixelRatio(dpr);
  });

  // Musical timeline + audio (audio follows the clock)
  const clock = new BeatClock(stageBpm(initialStage));
  clock.onBeat(() => beat.beat());
  clock.onBar(() => beat.bar());
  const audio = new AudioEngine(sdk.isAudioEnabled());
  sdk.onAudioEnabledChange((enabled) => audio.setYtEnabled(enabled));
  const stageAudio = new StageAudio(audio, clock, initialStage, () => sdk.logWarning());

  // Settings & quality
  const haptics = new Haptics();
  let settings: Settings = save.data.settings;
  let level: QualityLevel = 'medium';
  const applyQuality = () => {
    const p = PRESETS[level];
    const fx = settings.reducedFx ? REDUCED_FX_FACTOR : 1;
    renderer.setMaxDpr(p.maxDpr);
    renderer.postFx.configure({
      enabled: p.post,
      bloom: p.bloom,
      bloomStrength: p.bloomStrength,
      vignette: p.vignette,
      aberration: p.aberration && !settings.reducedFx,
    });
    particles.fraction = p.particles * fx;
    visuals.setFraction(p.particles * fx);
  };
  const quality = new QualityGovernor((l) => {
    level = l;
    applyQuality();
    stageAudio.setLight(l === 'low');
  });
  // Modest devices start low instead of waiting for the governor to notice (docs/03-arquitectura.md §8.1).
  quality.setAutoStart(initialLevel(readDeviceHints(renderer.gl.getContext())));
  const applySettings = (s: Settings) => {
    settings = s;
    audio.setVolumes(s.music, s.sfx);
    haptics.enabled = s.haptics;
    renderer.reduced = s.reducedFx;
    renderer.postFx.reduced = s.reducedFx;
    tiles.setClassic(s.classicPalette);
    quality.setMode(s.quality);
  };
  applySettings(settings);

  // Game
  const hud = new Hud(ui);
  const layoutHud = (w: number, h: number) => hud.layout(w, h, renderer.boardPixels());
  renderer.onResize(layoutHud);
  layoutHud(canvas.clientWidth, canvas.clientHeight);
  const makeSeed = () => crypto.getRandomValues(new Uint32Array(1))[0];
  let controller!: GameController;
  const title = new TitleScreen(ui, (cont) => controller.start(cont));
  const gameOver = new GameOverPanel(ui, () => controller.restart());
  const hint = new Hint(ui);
  controller = new GameController({
    tiles, board, visuals, particles, renderer, beat, hud, title, gameOver, hint, save, score, clock, audio: stageAudio, initialStage, haptics, makeSeed,
  });
  new SettingsModal(
    ui,
    settings,
    (s) => {
      applySettings(s);
      save.data.settings = s;
      save.request('debounced');
    },
    (open) => (controller.modalOpen = open),
  );

  if (import.meta.env.DEV) {
    // Dev-only handle for inspecting audio/render state from the browser console.
    // capture(name, w, h): renders one frame at w×h CSS px without the HUD and saves it as
    // marketing/thumbnails/<name>.png through the dev server (see captureEndpoint in vite.config.ts).
    const capture = async (name: string, w: number, h: number) => {
      const frame = () => new Promise((r) => requestAnimationFrame(r));
      const saved = { w: canvas.style.width, h: canvas.style.height, ui: ui.style.display };
      Object.assign(canvas.style, { width: `${w}px`, height: `${h}px`, right: 'auto', bottom: 'auto' });
      ui.style.display = 'none';
      window.dispatchEvent(new Event('resize'));
      for (let i = 0; i < 20; i++) await frame(); // let the resize and effects settle
      renderer.postFx.render(0, beat.uBeat.value);
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
      const size = `${canvas.width}x${canvas.height}`;
      Object.assign(canvas.style, { width: saved.w, height: saved.h, right: '', bottom: '' });
      ui.style.display = saved.ui;
      window.dispatchEvent(new Event('resize'));
      if (!blob) throw new Error('capture failed');
      await fetch(`/__capture?name=${encodeURIComponent(name)}`, { method: 'POST', body: blob });
      return `${name}.png ${size}`;
    };
    Object.assign(window, { __pulse: { clock, audio, stageAudio, quality, renderer, visuals, controller, capture } });
  }
  if (import.meta.env.DEV && sdk instanceof MockSdk) {
    sdk.addDebugAction('⏭ Next-stage tile (then move)', () => controller.debugInjectMilestone());
  }

  const input = new InputQueue(controller.move);
  new Keyboard(input.push, controller.confirm);
  new Pointer(canvas, input.push, () => renderer.boardPixels());

  // Stats overlay for device testing: dev server and mock builds only, and only with `?debug` in
  // the URL. Never in the YouTube build (the whole check is compiled out there).
  const stats =
    import.meta.env.VITE_PLAYABLES_SDK === 'mock' && new URLSearchParams(location.search).has('debug')
      ? new DebugStats(ui, { level: () => level, dpr: () => renderer.pixelRatio, post: () => renderer.postFx.enabled, canvas })
      : null;

  renderer.onFrame((now, dt) => {
    stats?.tick(dt);
    clock.update(audio.clockStep(dt));
    stageAudio.update();
    beat.update(now, dt);
    tiles.update(now);
    tiles.tick(dt);
    particles.flush();
    board.pulse(beat.uBar.value, dt);
    visuals.update(dt);
    quality.sample(dt);
    renderer.swayPhase = (clock.beats / 16) % 1;
  });

  // Pause: everything stops on onPause and resumes on onResume (never visibilitychange).
  const pause = new PauseController(sdk);
  pause.add(new PauseOverlay(ui));
  pause.add({ pause: () => (input.paused = true), resume: () => (input.paused = false) });
  // The beat clock advances only with the render loop, so stopping it also stops the beat.
  pause.add({ pause: () => renderer.stop(), resume: () => renderer.start() });
  pause.add({ pause: () => audio.pause(), resume: () => audio.resume() });
  pause.add({
    pause: () => {
      save.pause();
      score.flush();
    },
    resume: () => save.resume(),
  });

  // Warm up shaders with a tile on screen so the first move never hitches.
  tiles.sync([{ id: -1, value: 2, row: 0, col: 0 }]);
  particles.burst(0, 0, tiles.colorOf(2), 2);
  visuals.revealAllForWarmup();
  await renderer.precompile();
  visuals.show(initialStage);
  quality.hold(2);

  // Title: the base already plays in section 1 (docs/02-audio-visual.md §3.3).
  audio.unlock();
  stageAudio.setSection(0, true);
  renderer.start();

  loading.hide();
  controller.showTitle();
  sdk.gameReady();
}

void main();
