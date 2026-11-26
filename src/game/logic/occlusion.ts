import type { Vec3 } from './view';

export interface Box3D {
  min: Vec3;
  max: Vec3;
}

/**
 * 점에서 방향 dir로 뻗은 반직선이 상자와 만나는지 검사한다(슬랩 방식).
 * 카메라가 정사영이라 "점에서 카메라 쪽으로 쏜 반직선이 건물에 닿는가"가 곧 "그 점이 건물에 가려지는가"다.
 */
export function rayHitsBox(origin: Vec3, dir: Vec3, box: Box3D): boolean {
  let tMin = 0;
  let tMax = Infinity;
  for (const axis of ['x', 'y', 'z'] as const) {
    const o = origin[axis];
    const d = dir[axis];
    const lo = box.min[axis];
    const hi = box.max[axis];
    if (Math.abs(d) < 1e-9) {
      if (o < lo || o > hi) return false;
      continue;
    }
    let t1 = (lo - o) / d;
    let t2 = (hi - o) / d;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }
  return true;
}

/** 캐릭터의 발, 몸통, 머리 높이 가운데 하나라도 건물 뒤에 있으면 가려진 것으로 본다. */
export function isOccluded(
  feet: { x: number; z: number },
  heights: readonly number[],
  towardCamera: Vec3,
  box: Box3D,
): boolean {
  return heights.some((y) => rayHitsBox({ x: feet.x, y, z: feet.z }, towardCamera, box));
}

/** 불투명도를 목표값으로 부드럽게 옮긴다. 프레임 길이에 상관없이 같은 속도로 변한다. */
export function approach(current: number, target: number, dt: number, rate = 9): number {
  const k = 1 - Math.exp(-rate * dt);
  const next = current + (target - current) * k;
  return Math.abs(next - target) < 0.002 ? target : next;
}
