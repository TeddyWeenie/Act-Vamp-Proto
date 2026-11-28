import type { Vec2 } from './view';

/** 전투 대형의 방향. sides는 아군이 화면 왼쪽, 적이 오른쪽. ranks는 아군이 화면 아래, 적이 위. */
export type FormationAxis = 'sides' | 'ranks';

export interface FormationShape {
  readonly axis: FormationAxis;
  /** 가운데에서 각 편의 줄까지의 거리. */
  readonly reach: number;
  /** 같은 편끼리 떨어지는 간격. */
  readonly spacing: number;
  /** 줄을 비스듬히 세우는 정도. 서로 겹쳐 보이지 않게 한 사람씩 어긋나게 선다. */
  readonly stagger: number;
}

export interface FormationPlan {
  readonly centre: Vec2;
  readonly party: readonly Vec2[];
  readonly enemies: readonly Vec2[];
  /** 아군이 적을 볼 때의 방향. 적은 그 반대를 본다. */
  readonly partyFacing: Vec2;
}

export const DEFAULT_FORMATION: FormationShape = { axis: 'sides', reach: 3.1, spacing: 2.1, stagger: 0.75 };

/** 한 편의 자리를 줄 세운다. side는 가운데에서 어느 쪽인지(-1 또는 1). */
function line(centre: Vec2, count: number, side: number, shape: FormationShape): Vec2[] {
  return Array.from({ length: count }, (_, i) => {
    const along = (i - (count - 1) / 2) * shape.spacing;
    // 가운데 사람이 가장 앞에 서도록, 줄의 끝으로 갈수록 뒤로 물러난다.
    const away = shape.reach + Math.abs(i - (count - 1) / 2) * shape.stagger;
    return shape.axis === 'sides'
      ? { x: centre.x + side * away, z: centre.z + along }
      : { x: centre.x + along, z: centre.z - side * away };
  });
}

/** 가운데를 기준으로 양쪽 편의 자리를 정한다. */
export function layoutFormation(
  centre: Readonly<Vec2>,
  partyCount: number,
  enemyCount: number,
  shape: FormationShape = DEFAULT_FORMATION,
): FormationPlan {
  const c = { x: centre.x, z: centre.z };
  return {
    centre: c,
    party: line(c, partyCount, -1, shape),
    enemies: line(c, enemyCount, 1, shape),
    partyFacing: shape.axis === 'sides' ? { x: 1, z: 0 } : { x: 0, z: -1 },
  };
}

/** 가까운 곳부터 살피는 순서: 제자리, 그다음 점점 넓어지는 여덟 방향. */
function* nearby(origin: Readonly<Vec2>, maxRadius: number, stepSize: number): Generator<Vec2> {
  yield { x: origin.x, z: origin.z };
  for (let radius = stepSize; radius <= maxRadius + 1e-9; radius += stepSize) {
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      yield { x: origin.x + Math.cos(angle) * radius, z: origin.z + Math.sin(angle) * radius };
    }
  }
}

/**
 * 만난 자리 가까이에서, 모든 사람이 건물이나 소품과 겹치지 않고 설 수 있는 대형을 찾는다.
 * 걷던 자리에서 싸우되 캐릭터가 벽이나 계단에 파묻히지 않게 하려는 것이다.
 * 끝내 못 찾으면 만난 자리 그대로의 대형을 돌려준다(그때는 걸어가다 막힌 곳에 선다).
 */
export function findClearFormation(
  origin: Readonly<Vec2>,
  partyCount: number,
  enemyCount: number,
  isClear: (point: Readonly<Vec2>) => boolean,
  shape: FormationShape = DEFAULT_FORMATION,
  maxRadius = 8,
): FormationPlan {
  for (const centre of nearby(origin, maxRadius, 1)) {
    const plan = layoutFormation(centre, partyCount, enemyCount, shape);
    if ([...plan.party, ...plan.enemies].every(isClear)) return plan;
  }
  return layoutFormation(origin, partyCount, enemyCount, shape);
}
