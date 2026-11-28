import { describe, expect, it } from 'vitest';
import {
  SHADOW_DIRECTION,
  SHADOW_REACH,
  baseOutline,
  castShadowOutline,
  convexHull,
} from '../src/game/logic/shadow';

const area = (points: readonly { x: number; z: number }[]): number => {
  let sum = 0;
  points.forEach((p, i) => {
    const q = points[(i + 1) % points.length]!;
    sum += p.x * q.z - q.x * p.z;
  });
  return Math.abs(sum) / 2;
};

describe('convexHull', () => {
  it('안쪽 점과 한 줄 위의 점을 뺀다', () => {
    const hull = convexHull([
      { x: 0, z: 0 },
      { x: 2, z: 0 },
      { x: 2, z: 2 },
      { x: 0, z: 2 },
      { x: 1, z: 1 },
      { x: 1, z: 0 },
    ]);
    expect(hull).toHaveLength(4);
    expect(area(hull)).toBeCloseTo(4);
  });
});

describe('castShadowOutline', () => {
  const house = { x: 3, z: -2, width: 4, depth: 2, height: 10 };

  it('빛이 비스듬하면 여섯 모서리 도형이 된다', () => {
    expect(castShadowOutline(house)).toHaveLength(6);
  });

  it('바닥 네모를 모두 덮고 빛 반대쪽으로만 뻗는다', () => {
    const outline = castShadowOutline(house);
    const xs = outline.map((p) => p.x);
    const zs = outline.map((p) => p.z);
    expect(Math.min(...xs)).toBeCloseTo(1);
    expect(Math.min(...zs)).toBeCloseTo(-3);
    expect(Math.max(...xs)).toBeCloseTo(5 + SHADOW_DIRECTION.x * house.height * SHADOW_REACH);
    expect(Math.max(...zs)).toBeCloseTo(-1 + SHADOW_DIRECTION.z * house.height * SHADOW_REACH);
  });

  it('높은 건물일수록 그림자가 넓다', () => {
    const low = area(castShadowOutline({ ...house, height: 4 }));
    const high = area(castShadowOutline(house));
    expect(high).toBeGreaterThan(low);
    expect(low).toBeGreaterThan(house.width * house.depth);
  });

  it('높이가 0이면 바닥 네모 그대로다', () => {
    const outline = castShadowOutline({ ...house, height: 0 });
    expect(outline).toHaveLength(4);
    expect(area(outline)).toBeCloseTo(8);
  });
});

describe('둥근 물체의 그림자', () => {
  const tree = { x: 0, z: 0, width: 4, depth: 2, height: 5, round: true };

  it('바닥 테두리가 타원 위에 놓인다', () => {
    for (const point of baseOutline(tree)) {
      expect((point.x / 2) ** 2 + (point.z / 1) ** 2).toBeCloseTo(1);
    }
  });

  it('같은 크기의 상자보다 작고, 빛 반대쪽으로 뻗는다', () => {
    const round = castShadowOutline(tree);
    const box = castShadowOutline({ ...tree, round: false });
    expect(area(round)).toBeLessThan(area(box));
    expect(Math.max(...round.map((p) => p.x))).toBeCloseTo(2 + SHADOW_DIRECTION.x * 5 * SHADOW_REACH);
    expect(Math.min(...round.map((p) => p.x))).toBeCloseTo(-2);
  });
});
