import { CartoonSceneLook } from './CartoonSceneLook';
import { DEFAULT_CARTOON_SETTINGS, withCartoonSettings } from './cartoon';
import { PlainShaper, WonkyShaper } from './shape';
import type { WonkyAmounts } from './shapeMath';

/**
 * 과장된 카툰 캐릭터 그림에 맞춘 건물 수치. 외곽선은 캐릭터 그림의 선 굵기에 맞추고,
 * 색은 더 적은 단계로 평평하게 모으고 채도를 올린다.
 */
const BOLD_SETTINGS = withCartoonSettings({
  shade: { ...DEFAULT_CARTOON_SETTINGS.shade, ambientIntensity: 0.72 * Math.PI },
  outline: { ...DEFAULT_CARTOON_SETTINGS.outline, width: 0.02 },
  flatten: { ...DEFAULT_CARTOON_SETTINGS.flatten, levels: 3, strength: 0.9, saturation: 1.2 },
  grade: { ...DEFAULT_CARTOON_SETTINGS.grade, saturation: 1.06, contrast: 0.14 },
});

const BOLD_SHAPE: WonkyAmounts = { flare: 0.1, pinch: 0.05, lean: [0.05, 0.02], sag: 0.04 };

/** 과장된 카툰 화면(기본): 굵은 선, 평평하고 선명한 색, 살짝 과장한 건물 형태. */
export function boldCartoonLook(characterHeight: number): CartoonSceneLook {
  return new CartoonSceneLook(characterHeight, BOLD_SETTINGS, new WonkyShaper(BOLD_SHAPE));
}

/** 처음 맞춘 차분한 카툰 화면. 비교용으로 남겨 둔다. */
export function softCartoonLook(characterHeight: number): CartoonSceneLook {
  return new CartoonSceneLook(characterHeight, DEFAULT_CARTOON_SETTINGS, new PlainShaper());
}
