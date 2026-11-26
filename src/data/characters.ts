import type { CharacterBody } from '../game/entities/Character';
import { LUCIEN } from './sprites';

/** 리시엔의 몸 크기와 걷는 속도. */
export const LUCIEN_BODY: CharacterBody = {
  speed: 3.4,
  radius: 0.38,
  height: LUCIEN.height,
};
