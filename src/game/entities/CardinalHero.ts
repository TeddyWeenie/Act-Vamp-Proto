import type { CardinalClip } from '../../data/sprites';
import type { CollisionSpace, SpriteAnimator } from '../capabilities';
import type { CharacterController } from '../control/controller';
import { CardinalFacing, type FacingRule } from '../logic/facing';
import type { Facing } from '../logic/movement';
import type { Vec2 } from '../logic/view';
import type { Pose } from '../states/characterStates';
import { Character, type CharacterBody } from './Character';

const CLIPS: Readonly<Record<Pose, { front: CardinalClip; back: CardinalClip; side: CardinalClip }>> = {
  idle: { front: 'frontIdle', back: 'backIdle', side: 'sideIdle' },
  walk: { front: 'frontWalk', back: 'backWalk', side: 'sideWalk' },
  attack: { front: 'frontAttack', back: 'backAttack', side: 'sideAttack' },
};

/**
 * 앞, 뒤, 옆 그림을 쓰는 주인공. 위아래좌우 네 방향을 보며, 옆모습만 좌우로 뒤집어 쓴다.
 */
export class CardinalHero extends Character<CardinalClip> {
  constructor(
    sprite: SpriteAnimator<CardinalClip>,
    body: CharacterBody,
    space: CollisionSpace,
    controller: CharacterController,
    start: Readonly<Vec2>,
    facing: FacingRule = new CardinalFacing(),
  ) {
    super(sprite, body, space, controller, start, facing);
  }

  protected clipFor(pose: Pose, facing: Readonly<Facing>): CardinalClip {
    const views = CLIPS[pose];
    if (facing.side) return views.side;
    return facing.back ? views.back : views.front;
  }
}
