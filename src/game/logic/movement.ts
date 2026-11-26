import { groundToScreen, type Vec2 } from './view';

/** 건물이 지면에서 차지하는 축 정렬 사각형. */
export interface Footprint {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface Bounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/**
 * 원(캐릭터 발밑)이 사각형과 겹치면 가장 가까운 바깥으로 밀어낸다.
 * 벽에 비스듬히 부딪히면 벽을 따라 미끄러지는 효과가 난다.
 */
export function pushOutOfFootprint(pos: Vec2, radius: number, box: Footprint): Vec2 {
  const nearestX = Math.max(box.minX, Math.min(pos.x, box.maxX));
  const nearestZ = Math.max(box.minZ, Math.min(pos.z, box.maxZ));
  const dx = pos.x - nearestX;
  const dz = pos.z - nearestZ;
  const distSq = dx * dx + dz * dz;
  if (distSq >= radius * radius) return pos;

  if (distSq > 1e-9) {
    const dist = Math.sqrt(distSq);
    const push = (radius - dist) / dist;
    return { x: pos.x + dx * push, z: pos.z + dz * push };
  }

  // 중심이 사각형 안에 들어온 경우: 가장 가까운 변으로 내보낸다.
  const left = pos.x - box.minX;
  const right = box.maxX - pos.x;
  const near = pos.z - box.minZ;
  const far = box.maxZ - pos.z;
  const min = Math.min(left, right, near, far);
  if (min === left) return { x: box.minX - radius, z: pos.z };
  if (min === right) return { x: box.maxX + radius, z: pos.z };
  if (min === near) return { x: pos.x, z: box.minZ - radius };
  return { x: pos.x, z: box.maxZ + radius };
}

/** 한 걸음 이동하고 건물과 맵 경계를 반영한 위치를 돌려준다. */
export function step(
  pos: Vec2,
  dir: Vec2,
  distance: number,
  radius: number,
  footprints: readonly Footprint[],
  bounds?: Bounds,
): Vec2 {
  let next: Vec2 = { x: pos.x + dir.x * distance, z: pos.z + dir.z * distance };
  // 모서리에서 두 건물에 동시에 걸릴 수 있어 두 번 푼다.
  for (let pass = 0; pass < 2; pass++) {
    for (const box of footprints) next = pushOutOfFootprint(next, radius, box);
  }
  if (bounds) {
    next = {
      x: Math.max(bounds.minX + radius, Math.min(next.x, bounds.maxX - radius)),
      z: Math.max(bounds.minZ + radius, Math.min(next.z, bounds.maxZ - radius)),
    };
  }
  return next;
}

export interface Facing {
  /** 화면 위쪽(카메라 반대편)으로 걷는 중이면 뒷모습. */
  back: boolean;
  /** 원본 그림은 화면 오른쪽을 향한다. 왼쪽으로 갈 때 좌우를 뒤집는다. */
  flip: boolean;
}

/**
 * 이동 방향에서 스프라이트 방향을 고른다. 앞 3/4과 뒤 3/4 두 장을 좌우 반전해 네 방향을 만든다.
 * 거의 수직·수평으로 움직일 때 방향이 떨리지 않도록 이전 값을 유지하는 구간을 둔다.
 */
export function facingFromMove(dir: Vec2, previous: Facing, deadZone = 0.18): Facing {
  const { right, up } = groundToScreen(dir);
  if (Math.hypot(right, up) < 1e-6) return previous;
  return {
    back: Math.abs(up) < deadZone ? previous.back : up > 0,
    flip: Math.abs(right) < deadZone ? previous.flip : right < 0,
  };
}
