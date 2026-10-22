// Tunable game constants. See docs/01-gdd.md §3–5.
export const BOARD_SIZE = 4;
export const START_TILES = 2;
export const SPAWN_FOUR_CHANCE = 0.1;

/** Average board value added per valid move: 0.9·2 + 0.1·4. */
export const AVG_SPAWN_VALUE = 2.2;
export const PAR_FACTOR = 1.0;
export const RECORD_BONUS_MIN = 64;
export const MULT_MAX = 3;
export const MULT_MIN = 1;

/** First tile of each stage in the first lap (Abismo, Dunas, Neón, Luciérnagas, Tormenta, Cosmos). */
export const STAGE_START_TILES = [0, 128, 256, 512, 1024, 2048] as const;
export const REMIX_START_TILE = 4096;

/** Section thresholds as fractions of the next stage milestone M. */
export const SECTION_THRESHOLDS: readonly [number, number] = [1 / 8, 1 / 4];
