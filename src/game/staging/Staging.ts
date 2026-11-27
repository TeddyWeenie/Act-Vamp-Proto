import type { SpriteSheet } from '../../data/sprites';
import type { BuildingPlacement, PropPlacement } from '../../data/town';
import type { CollisionSpace, SpriteAnimator } from '../capabilities';
import type { CharacterController } from '../control/controller';
import type { Character } from '../entities/Character';
import type { Bounds } from '../logic/movement';
import type { ViewAngle } from '../logic/view';

/** 스프라이트 표를 받아 장면에 세울 동작 그림을 만들어 주는 것. */
export interface SpriteSource {
  create<Name extends string>(sheet: SpriteSheet<Name>, first: Name): Promise<SpriteAnimator<Name>>;
}

/**
 * 한 가지 "보는 방식"에 딸린 것들의 묶음: 카메라 각도, 그 각도에 맞게 그린 주인공, 그 각도에서 보기 좋은 마을 배치.
 * 셋은 함께 바뀌어야 하므로 한곳에서 정하고, 게임을 조립하는 쪽은 이 약속만 보고 쓴다.
 */
export interface Staging {
  readonly angle: ViewAngle;
  readonly town: readonly BuildingPlacement[];
  /** 나무나 울타리처럼 세워 놓는 소품. 없으면 빈 목록. */
  readonly props: readonly PropPlacement[];
  readonly bounds: Bounds;
  /** 처음에 화면 세로에 들어오는 월드 길이. 클수록 멀리서 보고, 캐릭터가 작게 보인다. */
  readonly viewHeight: number;
  /** 주인공의 월드 키. 화면 느낌이 선 굵기와 그림자 크기를 맞출 때 쓴다. */
  readonly heroHeight: number;
  createHero(
    sprites: SpriteSource,
    space: CollisionSpace,
    controller: CharacterController,
  ): Promise<Character<string>>;
}
