import type { HeroClip } from '../../data/sprites';
import type { WalkableSpace, SpriteAnimator } from '../capabilities';
import type { CharacterController } from '../control/controller';
import { DiagonalFacing, type FacingRule } from '../logic/facing';
import type { Facing } from '../logic/movement';
import type { Vec2 } from '../logic/view';
import type { Pose } from '../states/characterStates';
import { Character, type CharacterBody } from './Character';

/**
 * 대각선 그림을 쓰는 주인공. 모든 자세에 앞 3/4과 뒤 3/4 그림이 있어, 바라보는 방향에 맞는 쪽을 골라 쓴다.
 */
export class Hero extends Character<HeroClip> {
  constructor(
    sprite: SpriteAnimator<HeroClip>,
    body: CharacterBody,
    space: WalkableSpace,
    controller: CharacterController,
    start: Readonly<Vec2>,
    facing: FacingRule = new DiagonalFacing(),
  ) {
    super(sprite, body, space, controller, start, facing);
  }

  protected clipFor(pose: Pose, facing: Readonly<Facing>): HeroClip {
    if (pose === 'attack') return facing.back ? 'backAttack' : 'attack';
    if (pose === 'walk') return facing.back ? 'backWalk' : 'walk';
    return facing.back ? 'backIdle' : 'idle';
  }
}
