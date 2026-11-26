import { describe, expect, it } from 'vitest';
import { facingFromMove, pushOutOfFootprint, step, type Footprint } from '../src/game/logic/movement';
import { inputToGround } from '../src/game/logic/view';

const house: Footprint = { minX: 2, maxX: 4, minZ: -1, maxZ: 1 };
const front = { back: false, left: false };

describe('건물 충돌', () => {
  it('떨어져 있으면 그대로 둔다', () => {
    const pos = { x: 0, z: 0 };
    expect(pushOutOfFootprint(pos, 0.4, house)).toBe(pos);
  });

  it('벽에 겹치면 반지름만큼 밖으로 밀어낸다', () => {
    const pushed = pushOutOfFootprint({ x: 1.8, z: 0 }, 0.4, house);
    expect(pushed.x).toBeCloseTo(1.6, 6);
    expect(pushed.z).toBeCloseTo(0, 6);
  });

  it('건물 안에 들어가 있으면 가장 가까운 변으로 내보낸다', () => {
    const pushed = pushOutOfFootprint({ x: 2.1, z: 0 }, 0.4, house);
    expect(pushed).toEqual({ x: 1.6, z: 0 });
  });

  it('벽을 향해 계속 걸어도 뚫고 들어가지 못한다', () => {
    let pos = { x: 0, z: 0 };
    for (let i = 0; i < 200; i++) pos = step(pos, { x: 1, z: 0 }, 0.05, 0.4, [house]);
    expect(pos.x).toBeLessThanOrEqual(1.6 + 1e-6);
  });

  it('벽에 비스듬히 부딪히면 벽을 따라 미끄러진다', () => {
    let pos = { x: 1.5, z: -0.5 };
    const dir = { x: Math.SQRT1_2, z: Math.SQRT1_2 };
    for (let i = 0; i < 20; i++) pos = step(pos, dir, 0.05, 0.4, [house]);
    expect(pos.x).toBeLessThanOrEqual(1.6 + 1e-6);
    expect(pos.z).toBeGreaterThan(0);
  });

  it('맵 경계를 넘지 못한다', () => {
    const bounds = { minX: -5, maxX: 5, minZ: -5, maxZ: 5 };
    let pos = { x: 4, z: 0 };
    for (let i = 0; i < 100; i++) pos = step(pos, { x: 1, z: 0 }, 0.1, 0.4, [], bounds);
    expect(pos.x).toBeCloseTo(4.6, 6);
  });
});

describe('스프라이트 방향', () => {
  it('화면 오른쪽 아래로 걸으면 원본 앞모습', () => {
    expect(facingFromMove(inputToGround(1, -1), { back: true, left: true })).toEqual({
      back: false,
      left: false,
    });
  });

  it('화면 왼쪽으로 걸으면 좌우를 뒤집는다', () => {
    expect(facingFromMove(inputToGround(-1, -1), front)).toEqual({ back: false, left: true });
  });

  it('화면 위쪽으로 걸으면 뒷모습', () => {
    expect(facingFromMove(inputToGround(1, 1), front)).toEqual({ back: true, left: false });
    expect(facingFromMove(inputToGround(-1, 1), front)).toEqual({ back: true, left: true });
  });

  it('똑바로 위나 옆으로 걸을 때는 나머지 방향을 유지한다', () => {
    expect(facingFromMove(inputToGround(0, 1), { back: false, left: true })).toEqual({
      back: true,
      left: true,
    });
    expect(facingFromMove(inputToGround(1, 0), { back: true, left: true })).toEqual({
      back: true,
      left: false,
    });
  });

  it('멈춰 있으면 방향이 바뀌지 않는다', () => {
    const previous = { back: true, left: true };
    expect(facingFromMove({ x: 0, z: 0 }, previous)).toBe(previous);
  });
});
