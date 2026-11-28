/**
 * 고정 시점 카메라의 방향 계산. 렌더러에 의존하지 않는 순수 함수만 둔다.
 * 좌표계: 지면은 XZ 평면, Y가 위.
 */
export interface Vec2 {
  x: number;
  z: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** 카메라가 장면을 바라보는 고정 각도. */
export interface ViewAngle {
  /** 지면에서 올려다본 카메라의 높이각(라디안). 클수록 위에서 내려다본다. */
  readonly elevation: number;
  /** 수직축을 중심으로 돌린 각(라디안). 0이면 화면 가로세로가 지면의 X·Z축과 나란하다. */
  readonly azimuth: number;
}

/** 위에서 45도로 내려다보고, 지면 격자가 마름모로 보이도록 45도 돌린 시점. */
export const QUARTER_VIEW: ViewAngle = {
  elevation: Math.PI / 4,
  azimuth: Math.PI / 4,
};

/** 따로 정하지 않았을 때 쓰는 시점. */
export const VIEW = QUARTER_VIEW;

/** 비스듬한 탑뷰: 돌리지 않고 위에서 비스듬히 내려다본다. 화면의 위아래좌우가 지면의 축과 맞는다. */
export function topView(elevationDegrees = 50): ViewAngle {
  return { elevation: (elevationDegrees * Math.PI) / 180, azimuth: 0 };
}

/** 장면에서 카메라를 향하는 단위 벡터. */
export function towardCamera(elevation = VIEW.elevation, azimuth = VIEW.azimuth): Vec3 {
  return {
    x: Math.cos(elevation) * Math.sin(azimuth),
    y: Math.sin(elevation),
    z: Math.cos(elevation) * Math.cos(azimuth),
  };
}

/** 화면 오른쪽에 해당하는 지면 방향. */
export function screenRight(azimuth = VIEW.azimuth): Vec2 {
  return { x: Math.cos(azimuth), z: -Math.sin(azimuth) };
}

/** 화면 위쪽(카메라에서 멀어지는 쪽)에 해당하는 지면 방향. */
export function screenUp(azimuth = VIEW.azimuth): Vec2 {
  return { x: -Math.sin(azimuth), z: -Math.cos(azimuth) };
}

/**
 * 화면 기준 입력(오른쪽 +x, 위쪽 +y)을 지면 이동 방향으로 바꾼다.
 * 대각선 입력이 더 빠르지 않도록 길이를 1로 맞춘다.
 */
export function inputToGround(ix: number, iy: number, azimuth = VIEW.azimuth): Vec2 {
  const length = Math.hypot(ix, iy);
  if (length < 1e-6) return { x: 0, z: 0 };
  const r = screenRight(azimuth);
  const u = screenUp(azimuth);
  return {
    x: (r.x * ix + u.x * iy) / length,
    z: (r.z * ix + u.z * iy) / length,
  };
}

/** 지면 이동 방향을 화면 기준 성분으로 되돌린다. 스프라이트 방향을 고를 때 쓴다. */
export function groundToScreen(dir: Vec2, azimuth = VIEW.azimuth): { right: number; up: number } {
  const r = screenRight(azimuth);
  const u = screenUp(azimuth);
  return { right: dir.x * r.x + dir.z * r.z, up: dir.x * u.x + dir.z * u.z };
}
