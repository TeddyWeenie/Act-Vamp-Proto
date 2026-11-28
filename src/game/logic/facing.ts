import { cardinalFacingFromMove, facingFromMove, type Facing } from './movement';
import { VIEW, type Vec2 } from './view';

/**
 * 걷는 방향에서 캐릭터가 볼 방향을 정하는 규칙.
 * 어떤 방향의 그림을 가졌는지에 따라 달라지므로, 캐릭터는 규칙을 넘겨받아 쓴다.
 */
export interface FacingRule {
  /** 처음 서 있을 때의 방향. */
  readonly initial: Facing;
  next(dir: Readonly<Vec2>, previous: Readonly<Facing>): Facing;
}

/** 앞 3/4과 뒤 3/4 두 그림을 좌우로 뒤집어 쓰는 방식. 대각선 시점에 맞는다. */
export class DiagonalFacing implements FacingRule {
  readonly initial: Facing = { back: false, left: true };

  constructor(private readonly azimuth = VIEW.azimuth) {}

  next(dir: Readonly<Vec2>, previous: Readonly<Facing>): Facing {
    return facingFromMove(dir, previous, undefined, this.azimuth);
  }
}

/** 앞, 뒤, 옆(왼쪽·오른쪽) 가운데 한 방향을 고르는 방식. 화면 축과 나란한 시점에 맞는다. */
export class CardinalFacing implements FacingRule {
  readonly initial: Facing = { back: false, left: true, side: false };

  constructor(private readonly azimuth = VIEW.azimuth) {}

  next(dir: Readonly<Vec2>, previous: Readonly<Facing>): Facing {
    return cardinalFacingFromMove(dir, previous, this.azimuth);
  }
}
