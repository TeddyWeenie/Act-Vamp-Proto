/**
 * Every number the cartoon look uses, in one immutable value object.
 * Lengths are written in "character heights" so they follow whatever world scale the game picks:
 * set `characterHeight` to the world height of a standing sprite and the rest scales with it.
 */
export type Rgb = readonly [number, number, number];

export interface ShadeSettings {
  /** Brightness of each toon band, darkest first (0..1). Three bands read as cel shading. */
  readonly bands: readonly number[];
  /** Flat fill light. Already multiplied for three's physical light units (viewer value 0.66 x PI). */
  readonly ambientIntensity: number;
  /** Key light that the bands react to (viewer value 0.52 x PI). */
  readonly sunIntensity: number;
}

export interface OutlineSettings {
  /** Line colour, taken from the sprite's own ink (sRGB hex). */
  readonly color: number;
  /** Line width in character heights. */
  readonly width: number;
  /** How far the shell is slid away from the camera, as a multiple of its width. */
  readonly pushFactor: number;
}

export interface FlattenSettings {
  /** Number of brightness steps the texture is snapped toward. */
  readonly levels: number;
  /** 0 keeps the texture, 1 snaps fully to the steps. */
  readonly strength: number;
  readonly saturation: number;
  /** Multiplied into dark texels: pulls shadows toward the sprite's plum. */
  readonly shadowTint: Rgb;
  /** Multiplied into bright texels: pulls lights toward the sprite's warm cream. */
  readonly lightTint: Rgb;
  /** Small on purpose. Larger values drag the empty gaps of a texture atlas into the walls. */
  readonly mipBias: number;
}

export interface LightSettings {
  /** Matched key light as seen from the camera: [screen right, world up, toward camera]. */
  readonly matchedDirection: Rgb;
  /** World-space direction used when matching is off. */
  readonly unmatchedDirection: Rgb;
  /** Round shadow under a character: [width, depth] in character heights. */
  readonly characterShadow: readonly [number, number];
  /** How far shadows slide away from the light: [screen right, toward camera] in character heights. */
  readonly shadowOffset: readonly [number, number];
  readonly shadowColor: number;
  readonly shadowOpacity: number;
}

export interface GradeSettings {
  readonly saturation: number;
  readonly shadowTint: Rgb;
  readonly lightTint: Rgb;
  /** Added to dark pixels so blacks lean plum instead of grey. */
  readonly lift: Rgb;
  /** 0..1 blend toward an S-curve. */
  readonly contrast: number;
  readonly vignette: number;
  readonly fogColor: number;
  /** Fog start and end, in character heights beyond the point the camera looks at. */
  readonly fogNear: number;
  readonly fogFar: number;
}

export interface CartoonSettings {
  readonly characterHeight: number;
  readonly shade: ShadeSettings;
  readonly outline: OutlineSettings;
  readonly flatten: FlattenSettings;
  readonly light: LightSettings;
  readonly grade: GradeSettings;
}

/** The values tuned in the model viewer on 2026-11-26 (house models next to the Lucien sprite). */
const tuned: CartoonSettings = {
  characterHeight: 1,
  shade: { bands: [0.47, 0.745, 1], ambientIntensity: 0.66 * Math.PI, sunIntensity: 0.52 * Math.PI },
  outline: { color: 0x24121a, width: 0.01, pushFactor: 1.6 },
  flatten: {
    levels: 5, strength: 0.65, saturation: 1.14,
    shadowTint: [0.95, 0.88, 1.0], lightTint: [1.04, 1.0, 0.94], mipBias: 0.6,
  },
  light: {
    matchedDirection: [-1.5, 2.3, 1.0],
    unmatchedDirection: [3, 4, 0.5],
    characterShadow: [0.62, 0.48],
    shadowOffset: [0.036, -0.021],
    shadowColor: 0x100818,
    shadowOpacity: 0.62,
  },
  grade: {
    saturation: 0.94,
    shadowTint: [0.93, 0.89, 1.02], lightTint: [1.03, 1.0, 0.95],
    lift: [0.018, 0.008, 0.035],
    contrast: 0.12, vignette: 0.16,
    fogColor: 0x69637b, fogNear: 0.7, fogFar: 18,
  },
};
export const DEFAULT_CARTOON_SETTINGS: CartoonSettings = Object.freeze(tuned);

/** Copy the defaults with a few groups replaced. Groups are replaced whole, never mutated. */
export function withCartoonSettings(overrides: Partial<CartoonSettings>): CartoonSettings {
  return Object.freeze({ ...DEFAULT_CARTOON_SETTINGS, ...overrides });
}
