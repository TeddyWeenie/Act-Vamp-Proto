/** 모델을 감싸는 상자. 바닥 높이와 가운데, 크기만 있으면 된다. */
export interface ShapeBounds {
  readonly centerX: number;
  readonly centerZ: number;
  readonly baseY: number;
  readonly height: number;
  readonly halfWidth: number;
}

/** 만화풍 과장의 세기. 모두 0이면 모양이 그대로다. */
export interface WonkyAmounts {
  /** 꼭대기가 바닥보다 얼마나 넓어지는지(0.1이면 10%). */
  readonly flare: number;
  /** 바닥이 얼마나 오므라드는지. */
  readonly pinch: number;
  /** 꼭대기가 옆으로 밀리는 거리. 건물 높이의 배수로 [x, z]. */
  readonly lean: readonly [number, number];
  /** 지붕 양 끝이 처지는 정도. 건물 높이의 배수. */
  readonly sag: number;
}

export interface Point3 {
  x: number;
  y: number;
  z: number;
}

/**
 * 건물의 한 점을 만화풍으로 옮긴다. 바닥 가운데는 그대로 두고 위로 갈수록 넓어지고 기울고,
 * 지붕 끝은 살짝 처진다. 받은 점을 고쳐서 돌려주므로 정점마다 새 객체를 만들지 않는다.
 */
export function bendPoint(point: Point3, bounds: ShapeBounds, amounts: WonkyAmounts): Point3 {
  if (bounds.height <= 0) return point;
  const t = Math.min(1, Math.max(0, (point.y - bounds.baseY) / bounds.height));
  const rise = t * t;
  const scale = 1 - amounts.pinch * (1 - t) * (1 - t) + amounts.flare * rise;
  const across = bounds.halfWidth > 0 ? (point.x - bounds.centerX) / bounds.halfWidth : 0;
  point.x = bounds.centerX + (point.x - bounds.centerX) * scale + amounts.lean[0] * bounds.height * rise;
  point.z = bounds.centerZ + (point.z - bounds.centerZ) * scale + amounts.lean[1] * bounds.height * rise;
  point.y -= amounts.sag * bounds.height * rise * across * across;
  return point;
}
