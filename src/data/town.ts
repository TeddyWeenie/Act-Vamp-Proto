import type { Bounds } from '../game/logic/movement';

export interface BuildingPlacement {
  model: string;
  x: number;
  z: number;
  /** 90도 단위 회전. 0이면 정면이 +Z(화면 왼쪽 아래), 1이면 +X(화면 오른쪽 아래)를 본다. */
  quarterTurns: 0 | 1 | 2 | 3;
  /** 지붕 꼭대기까지의 월드 높이. */
  height: number;
}

const A = '/assets/models/townhouse-a.glb';
const B = '/assets/models/townhouse-b.glb';

/** 회색종 마을 광장의 임시 배치. 맵 설계가 정해지면 이 표만 바꾸면 된다. */
export const TOWN: readonly BuildingPlacement[] = [
  { model: A, x: -7.2, z: -2.6, quarterTurns: 1, height: 4.3 },
  { model: B, x: -2.4, z: -7.4, quarterTurns: 0, height: 4.1 },
  { model: A, x: 2.8, z: -8.0, quarterTurns: 0, height: 4.5 },
  { model: B, x: -8.0, z: 3.0, quarterTurns: 1, height: 4.1 },
  { model: A, x: 5.6, z: -2.4, quarterTurns: 1, height: 4.3 },
  { model: B, x: 5.4, z: 5.0, quarterTurns: 0, height: 4.1 },
  { model: A, x: -0.4, z: 7.4, quarterTurns: 1, height: 4.3 },
];

export const TOWN_BOUNDS: Bounds = { minX: -12, maxX: 12, minZ: -12, maxZ: 12 };

export const PLAYER_START = { x: 0, z: 0 };
