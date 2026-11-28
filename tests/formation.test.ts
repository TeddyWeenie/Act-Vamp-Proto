import { describe, expect, it } from 'vitest';
import { DEFAULT_FORMATION, findClearFormation, layoutFormation } from '../src/game/logic/formation';

describe('전투 대형', () => {
  it('좌우 대형은 아군을 왼쪽에, 적을 오른쪽에 세우고 서로 마주 보게 한다', () => {
    const plan = layoutFormation({ x: 2, z: 1 }, 3, 2);
    expect(plan.party.every((p) => p.x < 2)).toBe(true);
    expect(plan.enemies.every((p) => p.x > 2)).toBe(true);
    expect(plan.partyFacing).toEqual({ x: 1, z: 0 });
    // 가운데 사람이 가장 앞에 선다.
    expect(plan.party[1]!.x).toBeGreaterThan(plan.party[0]!.x);
    expect(plan.party[1]!.z).toBeCloseTo(1);
  });

  it('위아래 대형은 아군을 화면 아래에, 적을 위에 세운다', () => {
    const plan = layoutFormation({ x: 0, z: 0 }, 3, 2, { ...DEFAULT_FORMATION, axis: 'ranks' });
    expect(plan.party.every((p) => p.z > 0)).toBe(true);
    expect(plan.enemies.every((p) => p.z < 0)).toBe(true);
    expect(plan.partyFacing).toEqual({ x: 0, z: -1 });
  });

  it('같은 편끼리 겹치지 않을 만큼 떨어져 선다', () => {
    const plan = layoutFormation({ x: 0, z: 0 }, 3, 2);
    for (const side of [plan.party, plan.enemies]) {
      for (let i = 1; i < side.length; i++) {
        expect(Math.hypot(side[i]!.x - side[i - 1]!.x, side[i]!.z - side[i - 1]!.z)).toBeGreaterThan(1.8);
      }
    }
  });

  it('만난 자리가 막혀 있으면 가까운 빈 곳으로 대형을 옮긴다', () => {
    // x가 0보다 작은 곳은 모두 벽이라고 친다.
    const isClear = (p: { x: number; z: number }) => p.x > 0.5;
    const plan = findClearFormation({ x: 0, z: 0 }, 3, 2, isClear);
    expect([...plan.party, ...plan.enemies].every(isClear)).toBe(true);
    expect(Math.hypot(plan.centre.x, plan.centre.z)).toBeLessThanOrEqual(8);
  });

  it('비어 있으면 만난 자리 그대로 선다', () => {
    const plan = findClearFormation({ x: 3, z: -2 }, 3, 2, () => true);
    expect(plan.centre).toEqual({ x: 3, z: -2 });
  });
});
