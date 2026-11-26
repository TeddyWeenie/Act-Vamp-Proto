import type { Bounds } from '../game/logic/movement';

export interface BuildingPlacement {
  model: string;
  x: number;
  z: number;
  /** 90도 단위 회전. 0이면 정면이 +Z, 1이면 +X를 본다. 쿼터뷰에서는 각각 화면 왼쪽 아래와 오른쪽 아래, 탑뷰에서는 화면 아래와 오른쪽이다. */
  quarterTurns: 0 | 1 | 2 | 3;
  /** 지붕 꼭대기까지의 월드 높이. */
  height: number;
}

/** 깔끔한 표면으로 다시 그린 민가. 집 종류가 늘면 여기에 모델을 더하고 아래 표에서 골라 쓴다. */
const HOUSE = '/assets/models/townhouse.glb';

/** 회색종 마을 광장의 임시 배치. 맵 설계가 정해지면 이 표만 바꾸면 된다. */
export const TOWN: readonly BuildingPlacement[] = [
  { model: HOUSE, x: -7.2, z: -2.6, quarterTurns: 1, height: 4.3 },
  { model: HOUSE, x: -2.4, z: -7.4, quarterTurns: 0, height: 4.1 },
  { model: HOUSE, x: 2.8, z: -8.0, quarterTurns: 0, height: 4.5 },
  { model: HOUSE, x: -8.0, z: 3.0, quarterTurns: 1, height: 4.1 },
  { model: HOUSE, x: 5.6, z: -2.4, quarterTurns: 1, height: 4.3 },
  { model: HOUSE, x: 5.4, z: 5.0, quarterTurns: 0, height: 4.1 },
  { model: HOUSE, x: -0.4, z: 7.4, quarterTurns: 1, height: 4.3 },
];

/**
 * 비스듬한 탑뷰용 배치. 북쪽 줄은 정면이 화면을 보고, 동서의 집은 광장을 보고,
 * 남쪽 줄은 뒷모습과 지붕이 보인다. 남쪽 줄 바로 위를 지나가면 건물이 캐릭터를 가린다.
 */
export const TOWN_TOP: readonly BuildingPlacement[] = [
  { model: HOUSE, x: -6.4, z: -5.2, quarterTurns: 0, height: 4.3 },
  { model: HOUSE, x: -2.2, z: -5.6, quarterTurns: 0, height: 4.1 },
  { model: HOUSE, x: 2.0, z: -5.2, quarterTurns: 0, height: 4.5 },
  { model: HOUSE, x: 6.2, z: -5.6, quarterTurns: 0, height: 4.1 },
  { model: HOUSE, x: -8.4, z: 0.2, quarterTurns: 1, height: 4.1 },
  { model: HOUSE, x: 8.4, z: 0.6, quarterTurns: 3, height: 4.3 },
  { model: HOUSE, x: -3.6, z: 5.6, quarterTurns: 2, height: 4.3 },
  { model: HOUSE, x: 3.4, z: 5.2, quarterTurns: 0, height: 4.1 },
];

export const TOWN_BOUNDS: Bounds = { minX: -12, maxX: 12, minZ: -12, maxZ: 12 };

export const PLAYER_START = { x: 0, z: 0 };
