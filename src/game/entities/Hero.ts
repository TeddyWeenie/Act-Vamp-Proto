import type { HeroClip } from '../../data/sprites';
import type { CollisionSpace, SpriteAnimator } from '../capabilities';
import type { CharacterController } from '../control/controller';
import type { Facing } from '../logic/movement';
import type { Vec2 } from '../logic/view';
import type { Pose } from '../states/characterStates';
import { Character, type CharacterBody } from './Character';

/**
 * 주인공. 앞모습과 뒷모습 그림을 모두 가지고 있어 걷는 방향에 따라 골라 쓴다.
 * 공격 그림은 앞모습만 있다.
 */
export class Hero extends Character<HeroClip> {
  constructor(
    sprite: SpriteAnimator<HeroClip>,
    body: CharacterBody,
    space: CollisionSpace,
    controller: CharacterController,
    start: Readonly<Vec2>,
  ) {
    super(sprite, body, space, controller, start);
  }

  protected clipFor(pose: Pose, facing: Readonly<Facing>): HeroClip {
    if (pose === 'attack') return 'attack';
    if (pose === 'walk') return facing.back ? 'backWalk' : 'walk';
    return facing.back ? 'backIdle' : 'idle';
  }
}
