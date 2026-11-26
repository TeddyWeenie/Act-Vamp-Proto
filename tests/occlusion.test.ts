import { describe, expect, it } from 'vitest';
import { approach, isOccluded, rayHitsBox, type Box3D } from '../src/game/logic/occlusion';
import { towardCamera } from '../src/game/logic/view';

const house: Box3D = { min: { x: -1, y: 0, z: -1 }, max: { x: 1, y: 4, z: 1 } };
const cam = towardCamera();
const heights = [0.25, 1.1, 1.9];

describe('건물에 가려지는지 판정', () => {
  it('건물 뒤(카메라 반대편)에 서면 가려진다', () => {
    expect(isOccluded({ x: -2, z: -2 }, heights, cam, house)).toBe(true);
  });

  it('건물 앞(카메라 쪽)에 서면 가려지지 않는다', () => {
    expect(isOccluded({ x: 2, z: 2 }, heights, cam, house)).toBe(false);
  });

  it('건물 옆에 서면 가려지지 않는다', () => {
    expect(isOccluded({ x: 4, z: -4 }, heights, cam, house)).toBe(false);
  });

  it('건물 높이보다 멀리 떨어지면 가려지지 않는다', () => {
    // 45도에서는 높이 4인 건물이 뒤쪽으로 지면 거리 4만큼만 가린다.
    expect(isOccluded({ x: -5, z: -5 }, heights, cam, house)).toBe(false);
  });

  it('머리만 가려져도 가려진 것으로 본다', () => {
    // 높이 1.5~1.8에만 걸친 얇은 처마. 발 높이 광선은 아래로 지나가고 허리 높이 광선만 걸린다.
    const eave: Box3D = { min: { x: -1, y: 1.5, z: -1 }, max: { x: 1, y: 1.8, z: 1 } };
    expect(rayHitsBox({ x: 0.6, y: 0.25, z: 0.6 }, cam, eave)).toBe(false);
    expect(rayHitsBox({ x: 0.6, y: 1.1, z: 0.6 }, cam, eave)).toBe(true);
    expect(isOccluded({ x: 0.6, z: 0.6 }, heights, cam, eave)).toBe(true);
  });
});

describe('불투명도 변화', () => {
  it('목표값에 가까워지다가 정확히 도달한다', () => {
    let opacity = 1;
    for (let i = 0; i < 120; i++) opacity = approach(opacity, 0.3, 1 / 60);
    expect(opacity).toBe(0.3);
  });

  it('프레임 길이가 달라도 같은 시간 뒤에는 비슷한 값이다', () => {
    let fast = 1;
    for (let i = 0; i < 12; i++) fast = approach(fast, 0.3, 1 / 60);
    let slow = 1;
    for (let i = 0; i < 4; i++) slow = approach(slow, 0.3, 1 / 20);
    expect(fast).toBeCloseTo(slow, 6);
  });
});
