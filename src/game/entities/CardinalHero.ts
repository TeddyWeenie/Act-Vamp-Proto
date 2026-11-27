import type { CardinalClip } from '../../data/sprites';
import type { WalkableSpace, SpriteAnimator } from '../capabilities';
import type { CharacterController } from '../control/controller';
import { CardinalFacing, type FacingRule } from '../logic/facing';
import type { Facing } from '../logic/movement';
import type { Vec2 } from '../logic/view';
import type { Pose } from '../states/characterStates';
import { Character, type CharacterBody } from './Character';

interface DirectionClips {
  readonly front: CardinalClip;
  readonly back: CardinalClip;
  readonly left: CardinalClip;
  readonly right: CardinalClip;
}

const CLIPS: Readonly<Record<Pose, DirectionClips>> = {
  idle: { front: 'frontIdle', back: 'backIdle', left: 'leftIdle', right: 'rightIdle' },
  walk: { front: 'frontWalk', back: 'backWalk', left: 'leftWalk', right: 'rightWalk' },
  attack: { front: 'frontAttack', back: 'backAttack', left: 'leftAttack', right: 'rightAttack' },
};

/**
 * 앞, 뒤, 왼쪽, 오른쪽 그림을 따로 쓰는 주인공. 위아래좌우 네 방향을 본다.
 * 옆모습을 뒤집어 쓰지 않으므로 무기를 든 손이 방향이나 동작에 따라 바뀌지 않는다.
 */
export class CardinalHero extends Character<CardinalClip> {
  constructor(
    sprite: SpriteAnimator<CardinalClip>,
    body: CharacterBody,
    space: WalkableSpace,
    controller: CharacterController,
    start: Readonly<Vec2>,
    facing: FacingRule = new CardinalFacing(),
  ) {
    super(sprite, body, space, controller, start, facing);
  }

  protected clipFor(pose: Pose, facing: Readonly<Facing>): CardinalClip {
    const views = CLIPS[pose];
    if (facing.side) return facing.left ? views.left : views.right;
    return facing.back ? views.back : views.front;
  }
}
