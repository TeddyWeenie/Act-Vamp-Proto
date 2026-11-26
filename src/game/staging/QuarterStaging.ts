import { LUCIEN_BODY } from '../../data/characters';
import { LUCIEN } from '../../data/sprites';
import { PLAYER_START, TOWN, TOWN_BOUNDS } from '../../data/town';
import type { CollisionSpace } from '../capabilities';
import type { CharacterController } from '../control/controller';
import type { Character } from '../entities/Character';
import { Hero } from '../entities/Hero';
import { DiagonalFacing } from '../logic/facing';
import { QUARTER_VIEW } from '../logic/view';
import type { SpriteSource, Staging } from './Staging';

/** 45도 돌린 쿼터뷰(예전 구도, 비교용). 주인공은 앞 3/4과 뒤 3/4 그림을 좌우로 뒤집어 쓴다. */
export class QuarterStaging implements Staging {
  readonly angle = QUARTER_VIEW;
  readonly town = TOWN;
  readonly bounds = TOWN_BOUNDS;
  readonly viewHeight = 8.6;
  readonly heroHeight = LUCIEN.height;

  async createHero(
    sprites: SpriteSource,
    space: CollisionSpace,
    controller: CharacterController,
  ): Promise<Character<string>> {
    const sprite = await sprites.create(LUCIEN, 'idle');
    const facing = new DiagonalFacing(this.angle.azimuth);
    return new Hero(sprite, LUCIEN_BODY, space, controller, PLAYER_START, facing);
  }
}
