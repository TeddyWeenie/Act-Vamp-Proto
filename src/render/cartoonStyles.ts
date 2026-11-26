import { HERO_ROOF_SWAPS, HERO_TONE_SWAPS } from '../data/palettes';
import { CartoonSceneLook } from './CartoonSceneLook';
import { DEFAULT_CARTOON_SETTINGS } from './cartoon';
import { ColorLut } from './ColorLut';
import { PaletteSwap, type ColorSwap, type SwapOptions } from './colorMath';
import { NoTreatment, TextureRepaint } from './treatment';

/** 건물 색 계열끼리 섞이지 않을 만큼 좁게, 같은 색의 밝은 곳과 그늘은 함께 잡히게 한 값. */
const SWAP_OPTIONS: SwapOptions = { reach: 0.05, lightnessWeight: 0.35 };

function repainted(characterHeight: number, swaps: readonly ColorSwap[]): CartoonSceneLook {
  const lut = new ColorLut(new PaletteSwap(swaps, SWAP_OPTIONS));
  return new CartoonSceneLook(characterHeight, DEFAULT_CARTOON_SETTINGS, new TextureRepaint(lut));
}

/** 기본 화면: 건물의 나무, 벽, 돌 색을 주인공 그림의 색 계열로 옮긴다. 형태와 지붕 색은 그대로다. */
export function heroToneLook(characterHeight: number): CartoonSceneLook {
  return repainted(characterHeight, HERO_TONE_SWAPS);
}

/** 지붕까지 주인공 코트의 진홍으로 옮긴 화면. */
export function heroColorLook(characterHeight: number): CartoonSceneLook {
  return repainted(characterHeight, [...HERO_TONE_SWAPS, ...HERO_ROOF_SWAPS]);
}

/** 색을 옮기기 전의 카툰 화면. 비교용으로 남겨 둔다. */
export function softCartoonLook(characterHeight: number): CartoonSceneLook {
  return new CartoonSceneLook(characterHeight, DEFAULT_CARTOON_SETTINGS, new NoTreatment());
}
