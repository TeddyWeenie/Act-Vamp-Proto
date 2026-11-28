import { describe, expect, it } from 'vitest';
import { fittingRect } from '../src/game/logic/fitting';

const house = { min: { x: -2, y: 0, z: -1.5 }, max: { x: 2, y: 8, z: 1.5 } };

describe('fittingRect', () => {
  it('puts the piece by fractions of the building box', () => {
    const rect = fittingRect(house, { across: 0.5, bottom: 0.1, height: 0.25, lift: 0.01 }, 0.5);
    expect(rect.x).toBeCloseTo(0);
    expect(rect.height).toBeCloseTo(2);
    expect(rect.width).toBeCloseTo(1);
    // 아래쪽 끝이 0.8에 오므로 가운데는 그보다 높이의 절반만큼 위다.
    expect(rect.y).toBeCloseTo(1.8);
    expect(rect.lift).toBeCloseTo(0.08);
  });

  it('counts across from the left edge of the front', () => {
    expect(fittingRect(house, { across: 0, bottom: 0, height: 0.1, lift: 0 }, 1).x).toBeCloseTo(-2);
    expect(fittingRect(house, { across: 1, bottom: 0, height: 0.1, lift: 0 }, 1).x).toBeCloseTo(2);
  });

  it('keeps the same place on the wall when the building is taller', () => {
    const taller = { min: { x: -3, y: 0, z: -2 }, max: { x: 3, y: 12, z: 2 } };
    const spot = { across: 0.25, bottom: 0.5, height: 0.2, lift: 0.02 };
    const small = fittingRect(house, spot, 2);
    const big = fittingRect(taller, spot, 2);
    expect(big.y / 12).toBeCloseTo(small.y / 8);
    expect(big.width / big.height).toBeCloseTo(small.width / small.height);
  });
});
