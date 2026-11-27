import type { CharacterBody } from '../game/entities/Character';
import { LUCIEN, LUCIEN_CARDINAL } from './sprites';

/** 쿼터뷰 리시엔의 몸 크기와 걷는 속도. */
export const LUCIEN_BODY: CharacterBody = {
  speed: 3.4,
  radius: 0.38,
  height: LUCIEN.height,
};

/** 탑뷰 리시엔의 몸 크기와 걷는 속도. 그림 키가 커진 만큼 몸 둘레와 걸음도 함께 키웠다. */
export const LUCIEN_TOP_BODY: CharacterBody = {
  speed: 3.8,
  radius: 0.45,
  height: LUCIEN_CARDINAL.height,
};
