/**
 * 건물이 땅에 드리우는 그림자의 모양 계산. 렌더러에 의존하지 않는 순수 함수만 둔다.
 * 빛은 화면 왼쪽 위에서 온다고 약속한다. 캐릭터 그림의 밝은 면과 같은 방향이다.
 */
import type { Vec2 } from './view';

/** 그림자가 뻗는 지면 방향(길이 1). 탑뷰에서는 화면 오른쪽 아래다. */
export const SHADOW_DIRECTION: Readonly<Vec2> = { x: 0.8, z: 0.6 };

/** 건물 높이 1마다 그림자가 뻗는 길이. */
export const SHADOW_REACH = 0.2;

/** 땅에 선 상자 모양 물체의 자리와 높이. */
export interface ShadowCaster {
  readonly x: number;
  readonly z: number;
  readonly width: number;
  readonly depth: number;
  readonly height: number;
}

/**
 * 상자가 땅에 드리우는 그림자의 테두리를 한 방향으로 도는 꼭짓점들로 돌려준다.
 * 바닥 네모와, 그것을 빛 반대쪽으로 민 네모를 함께 감싸는 볼록한 도형이다.
 */
export function castShadowOutline(
  caster: ShadowCaster,
  direction: Readonly<Vec2> = SHADOW_DIRECTION,
  reach = SHADOW_REACH,
): Vec2[] {
  const halfW = caster.width / 2;
  const halfD = caster.depth / 2;
  const dx = direction.x * caster.height * reach;
  const dz = direction.z * caster.height * reach;
  const points: Vec2[] = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const x = caster.x + sx * halfW;
      const z = caster.z + sz * halfD;
      points.push({ x, z }, { x: x + dx, z: z + dz });
    }
  }
  return convexHull(points);
}

/** 점들을 감싸는 볼록 다각형(모노톤 체인). 한 줄 위에 놓인 점은 뺀다. */
export function convexHull(points: readonly Vec2[]): Vec2[] {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.z - b.z);
  if (sorted.length < 3) return sorted;
  const cross = (o: Vec2, a: Vec2, b: Vec2): number => (a.x - o.x) * (b.z - o.z) - (a.z - o.z) * (b.x - o.x);
  const half = (ordered: readonly Vec2[]): Vec2[] => {
    const chain: Vec2[] = [];
    for (const point of ordered) {
      while (chain.length >= 2 && cross(chain[chain.length - 2]!, chain[chain.length - 1]!, point) <= 0)
        chain.pop();
      chain.push(point);
    }
    chain.pop();
    return chain;
  };
  return [...half(sorted), ...half([...sorted].reverse())];
}
