import type { SpriteAnimator, WalkableSpace } from '../capabilities';
import type { CharacterController } from '../control/controller';
import type { FacingRule } from '../logic/facing';
import type { Facing } from '../logic/movement';
import type { Vec2 } from '../logic/view';
import type { Pose } from '../states/characterStates';
import { Character, type CharacterBody } from './Character';

/**
 * 방향별 그림 없이 자세 하나에 그림 하나를 쓰는 인물. 동료와 적이 임시 그림으로 설 때 쓴다.
 * 주인공과 같은 Character라서 걷기, 충돌, 가림, 조종을 똑같이 물려받는다.
 */
export class StandIn extends Character<Pose> {
  constructor(
    sprite: SpriteAnimator<Pose>,
    body: CharacterBody,
    space: WalkableSpace,
    controller: CharacterController,
    start: Readonly<Vec2>,
    facing: FacingRule,
  ) {
    super(sprite, body, space, controller, start, facing);
  }

  protected clipFor(pose: Pose, _facing: Readonly<Facing>): Pose {
    return pose;
  }
}
