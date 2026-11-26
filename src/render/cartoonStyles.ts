import { CHARACTER_CEL_TONE, GROUND_CEL_TONE } from '../data/artStyle';
import { CartoonSceneLook } from './CartoonSceneLook';
import { DEFAULT_CARTOON_SETTINGS } from './cartoon';
import { CanvasRepaint, CelPainter } from './treatment';

/**
 * 기본 화면: 건물과 바닥의 텍스처를 캐릭터 그림과 같은 채색 방식(평평한 색면, 같은 밝기와 선명함)으로 다시 칠한다.
 * 형태와 색상은 그대로다.
 */
export function celMatchedLook(characterHeight: number): CartoonSceneLook {
  return new CartoonSceneLook(
    characterHeight,
    DEFAULT_CARTOON_SETTINGS,
    new CanvasRepaint(new CelPainter(CHARACTER_CEL_TONE)),
    new CanvasRepaint(new CelPainter(GROUND_CEL_TONE)),
  );
}

/** 다시 칠하기 전의 카툰 화면. 비교용으로 남겨 둔다. */
export function softCartoonLook(characterHeight: number): CartoonSceneLook {
  return new CartoonSceneLook(characterHeight);
}
