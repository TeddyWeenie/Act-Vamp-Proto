import type { FittingSpot } from '../game/logic/fitting';
import type { Bounds } from '../game/logic/movement';

/**
 * 건물 정면에 따로 붙이는 종이 조각. 문고리나 꽃처럼 작은 장식은 3D 모델에 구워 넣으면 뭉개지므로,
 * 모델에서는 빼고 따로 그린 그림을 벽 앞에 붙인다.
 */
export interface FittingPlacement extends FittingSpot {
  image: string;
}

/** 건물 한 종류: 3D 모델과 그 정면에 붙는 조각들. */
export interface BuildingKind {
  model: string;
  fittings?: readonly FittingPlacement[];
}

export interface BuildingPlacement extends BuildingKind {
  x: number;
  z: number;
  /** 90도 단위 회전. 0이면 정면이 +Z, 1이면 +X를 본다. 쿼터뷰에서는 각각 화면 왼쪽 아래와 오른쪽 아래, 탑뷰에서는 화면 아래와 오른쪽이다. */
  quarterTurns: 0 | 1 | 2 | 3;
  /** 지붕 꼭대기까지의 월드 높이. */
  height: number;
}

/**
 * 종이 오리기 화풍의 민가. 모델에는 문짝, 꽃 상자, 등불이 없고(문 자리는 어두운 빈 문간), 그 셋은 조각으로 붙는다.
 * 집 종류가 늘면 여기에 종류를 더하고 아래 표에서 골라 쓴다.
 */
const HOUSE: BuildingKind = {
  model: '/assets/models/townhouse.glb',
  fittings: [
    { image: '/assets/fittings/door.png', across: 0.504, bottom: 0.0865, height: 0.249, lift: 0.004 },
    { image: '/assets/fittings/flowerbox.png', across: 0.5, bottom: 0.39, height: 0.108, lift: 0.02 },
    { image: '/assets/fittings/lantern.png', across: 0.25, bottom: 0.2, height: 0.13, lift: 0.02 },
  ],
};

/** 회색종 마을 광장의 임시 배치. 맵 설계가 정해지면 이 표만 바꾸면 된다. */
export const TOWN: readonly BuildingPlacement[] = [
  { ...HOUSE, x: -7.2, z: -2.6, quarterTurns: 1, height: 4.3 },
  { ...HOUSE, x: -2.4, z: -7.4, quarterTurns: 0, height: 4.1 },
  { ...HOUSE, x: 2.8, z: -8.0, quarterTurns: 0, height: 4.5 },
  { ...HOUSE, x: -8.0, z: 3.0, quarterTurns: 1, height: 4.1 },
  { ...HOUSE, x: 5.6, z: -2.4, quarterTurns: 1, height: 4.3 },
  { ...HOUSE, x: 5.4, z: 5.0, quarterTurns: 0, height: 4.1 },
  { ...HOUSE, x: -0.4, z: 7.4, quarterTurns: 1, height: 4.3 },
];

/**
 * 비스듬한 탑뷰용 배치. 북쪽 줄은 정면이 화면을 보고, 동서의 집은 광장을 보고,
 * 남쪽 줄은 뒷모습과 지붕이 보인다. 남쪽 줄 바로 위를 지나가면 건물이 캐릭터를 가린다.
 * 집 높이는 문이 캐릭터 키와 비슷해지도록 잡았다. 캐릭터가 문보다 크면 그림을 오려 붙인 것처럼 보인다.
 */
export const TOWN_TOP: readonly BuildingPlacement[] = [
  { ...HOUSE, x: -11.4, z: -8.6, quarterTurns: 0, height: 7.6 },
  { ...HOUSE, x: -3.8, z: -9.0, quarterTurns: 0, height: 7.2 },
  { ...HOUSE, x: 3.8, z: -8.6, quarterTurns: 0, height: 8.0 },
  { ...HOUSE, x: 11.4, z: -9.0, quarterTurns: 0, height: 7.2 },
  { ...HOUSE, x: -14.6, z: 0.4, quarterTurns: 1, height: 7.2 },
  { ...HOUSE, x: 14.6, z: 1.0, quarterTurns: 3, height: 7.6 },
  { ...HOUSE, x: -6.2, z: 10.0, quarterTurns: 2, height: 7.6 },
  { ...HOUSE, x: 6.0, z: 9.6, quarterTurns: 0, height: 7.2 },
];

/** 세워 놓는 소품 한 종류: 그림과 크기, 길을 막는 자리, 그림자, 캐릭터를 가리는 부분. */
export interface PropKind {
  image: string;
  /** 그림 전체의 월드 높이. */
  height: number;
  /** 길을 막는 바닥 크기. 나무는 줄기만큼만 막는다. */
  block: { width: number; depth: number };
  /** 그림자를 드리우는 덩어리의 바닥 크기와 높이. round이면 둥근 그림자가 된다. */
  shadow: { width: number; depth: number; height: number; round?: boolean };
  /**
   * 캐릭터를 통째로 가릴 수 있는 부분(나무의 잎 덩어리). 그림 크기에 견준 비율이다.
   * 캐릭터의 몸통이나 머리가 이 뒤에 들어가면 소품이 옅어진다. 적지 않으면 옅어지지 않고 발치만 살짝 가린다.
   */
  cover?: { bottom: number; top: number; width: number };
}

export interface PropPlacement extends PropKind {
  x: number;
  z: number;
}

const TREE: PropKind = {
  image: '/assets/props/tree.png',
  height: 6.8,
  block: { width: 0.9, depth: 0.5 },
  shadow: { width: 2.7, depth: 1.8, height: 5.0, round: true },
  cover: { bottom: 0.42, top: 0.97, width: 0.85 },
};

const FENCE: PropKind = {
  image: '/assets/props/fence.png',
  height: 1.25,
  block: { width: 1.5, depth: 0.3 },
  shadow: { width: 1.5, depth: 0.15, height: 0.8 },
};

const BARREL: PropKind = {
  image: '/assets/props/barrel.png',
  height: 2.0,
  block: { width: 1.2, depth: 0.6 },
  shadow: { width: 1.2, depth: 0.6, height: 1.2 },
};

/**
 * 비스듬한 탑뷰 광장의 소품. 길 앞쪽에 나무와 울타리를 두어 지나가는 캐릭터를 살짝 가리고,
 * 문 앞은 막지 않도록 비워 둔다.
 * 나무 그늘 아래에서는 캐릭터도 함께 어두워진다. 빛 효과를 끄면(?air=off) 놓지 않는다.
 */
export const TOWN_TOP_PROPS: readonly PropPlacement[] = [
  { ...TREE, x: 1.2, z: -3.9 },
  { ...FENCE, x: 7.1, z: -4.9 },
  { ...FENCE, x: 8.4, z: -4.9 },
  { ...BARREL, x: 6.3, z: -5.8 },
  { ...BARREL, x: -1.5, z: -6.2 },
  { ...TREE, x: -8.6, z: -4.6 },
  { ...TREE, x: 9.4, z: 3.4 },
  { ...FENCE, x: -3.4, z: 4.6 },
  { ...FENCE, x: -2.1, z: 4.6 },
  { ...TREE, x: -9.8, z: 5.6 },
];

export const TOWN_BOUNDS: Bounds = { minX: -12, maxX: 12, minZ: -12, maxZ: 12 };
export const TOWN_TOP_BOUNDS: Bounds = { minX: -20, maxX: 20, minZ: -20, maxZ: 20 };

export const PLAYER_START = { x: 0, z: 0 };
