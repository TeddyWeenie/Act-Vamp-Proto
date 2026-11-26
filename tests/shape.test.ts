import { describe, expect, it } from 'vitest';
import { bendPoint, type ShapeBounds, type WonkyAmounts } from '../src/render/shapeMath';

const BOUNDS: ShapeBounds = { centerX: 0, centerZ: 0, baseY: 0, height: 4, halfWidth: 2 };
const WONKY: WonkyAmounts = { flare: 0.1, pinch: 0.05, lean: [0.05, 0.02], sag: 0.04 };
const NONE: WonkyAmounts = { flare: 0, pinch: 0, lean: [0, 0], sag: 0 };

describe('건물 형태 과장', () => {
  it('세기가 0이면 점이 그대로다', () => {
    expect(bendPoint({ x: 1.5, y: 3, z: -1 }, BOUNDS, NONE)).toEqual({ x: 1.5, y: 3, z: -1 });
  });

  it('바닥 가운데는 움직이지 않는다', () => {
    const base = bendPoint({ x: 0, y: 0, z: 0 }, BOUNDS, WONKY);
    expect(base.x).toBeCloseTo(0, 6);
    expect(base.y).toBeCloseTo(0, 6);
    expect(base.z).toBeCloseTo(0, 6);
  });

  it('바닥은 오므라들고 꼭대기는 넓어진다', () => {
    const low = bendPoint({ x: 2, y: 0, z: 0 }, BOUNDS, { ...WONKY, lean: [0, 0] });
    const high = bendPoint({ x: 2, y: 4, z: 0 }, BOUNDS, { ...WONKY, lean: [0, 0] });
    expect(low.x).toBeCloseTo(1.9, 6);
    expect(high.x).toBeCloseTo(2.2, 6);
  });

  it('위로 갈수록 한쪽으로 기운다', () => {
    const middle = bendPoint({ x: 0, y: 2, z: 0 }, BOUNDS, WONKY);
    const top = bendPoint({ x: 0, y: 4, z: 0 }, BOUNDS, WONKY);
    expect(top.x).toBeCloseTo(0.2, 6);
    expect(top.z).toBeCloseTo(0.08, 6);
    expect(middle.x).toBeGreaterThan(0);
    expect(middle.x).toBeLessThan(top.x);
  });

  it('지붕 끝은 처지고 가운데는 그대로다', () => {
    const ridge = bendPoint({ x: 0, y: 4, z: 0 }, BOUNDS, WONKY);
    const eave = bendPoint({ x: 2, y: 4, z: 0 }, BOUNDS, WONKY);
    expect(ridge.y).toBeCloseTo(4, 6);
    expect(eave.y).toBeCloseTo(4 - 0.16, 6);
  });

  it('상자 밖의 높이도 꼭대기 값으로 묶인다', () => {
    const above = bendPoint({ x: 0, y: 9, z: 0 }, BOUNDS, WONKY);
    expect(above.x).toBeCloseTo(0.2, 6);
  });
});
