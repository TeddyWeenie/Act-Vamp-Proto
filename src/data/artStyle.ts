import type { CelTone } from '../render/celPalette';

/**
 * 캐릭터 그림(과장된 카툰 화풍)의 채색 방식. 리시엔 기준 그림에서 잰 값이며(2026-11-26),
 * 앞으로 그릴 캐릭터도 같은 화풍 문구로 그리므로 같은 값을 따른다. 건물 텍스처를 이 값에 맞춰 다시 칠한다.
 *
 * 잰 결과: 캐릭터 그림은 칠해진 면의 73%가 완전히 평평하고, 밝은 면의 밝기(Oklab L)가 0.90, 색의 선명함이 건물의 약 1.4배였다.
 * 건물 텍스처는 평평한 면이 13~38%뿐이고 밝은 면이 0.56~0.79로 어두웠다.
 */
export const CHARACTER_CEL_TONE: CelTone = {
  colors: 18,
  lightLevel: 0.9,
  maxLightGain: 1.45,
  chromaGain: 1.4,
  lightnessWeight: 0.5,
};

/** 바닥은 캐릭터가 묻히지 않도록 밝히지 않고, 색면으로 모으기만 한다. */
export const GROUND_CEL_TONE: CelTone = {
  ...CHARACTER_CEL_TONE,
  colors: 8,
  maxLightGain: 1,
  chromaGain: 1.2,
};
