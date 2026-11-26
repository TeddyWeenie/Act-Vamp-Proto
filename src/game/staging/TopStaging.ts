import { LUCIEN_BODY } from '../../data/characters';
import { LUCIEN_CARDINAL } from '../../data/sprites';
import { PLAYER_START, TOWN_BOUNDS, TOWN_TOP } from '../../data/town';
import type { CollisionSpace } from '../capabilities';
import type { CharacterController } from '../control/controller';
import { CardinalHero } from '../entities/CardinalHero';
import type { Character } from '../entities/Character';
import { CardinalFacing } from '../logic/facing';
import { topView, type ViewAngle } from '../logic/view';
import type { SpriteSource, Staging } from './Staging';

/**
 * 비스듬한 탑뷰(시안). 카메라를 돌리지 않고 위에서 비스듬히 내려다본다.
 * 주인공은 앞, 뒤, 옆 그림을 쓰고 옆모습만 좌우로 뒤집는다.
 */
export class TopStaging implements Staging {
  readonly angle: ViewAngle;
  readonly town = TOWN_TOP;
  readonly bounds = TOWN_BOUNDS;
  readonly heroHeight = LUCIEN_CARDINAL.height;

  /** elevationDegrees: 카메라가 지면에서 올라간 각도. 클수록 지붕이 많이 보이고 벽이 적게 보인다. */
  constructor(elevationDegrees?: number) {
    this.angle = topView(elevationDegrees);
  }

  async createHero(
    sprites: SpriteSource,
    space: CollisionSpace,
    controller: CharacterController,
  ): Promise<Character<string>> {
    const sprite = await sprites.create(LUCIEN_CARDINAL, 'frontIdle');
    const facing = new CardinalFacing(this.angle.azimuth);
    return new CardinalHero(sprite, LUCIEN_BODY, space, controller, PLAYER_START, facing);
  }
}
