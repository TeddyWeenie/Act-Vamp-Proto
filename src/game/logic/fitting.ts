import type { Box3D } from './occlusion';

/**
 * 건물 정면에 붙이는 조각(문, 꽃 상자, 등불)의 자리.
 * 건물 크기에 견준 비율로 적어서, 건물 높이를 바꿔도 같은 자리에 붙는다.
 */
export interface FittingSpot {
  /** 정면을 마주 보았을 때 조각 가운데의 가로 위치. 0이 왼쪽 끝, 1이 오른쪽 끝. */
  across: number;
  /** 조각 아래쪽 끝의 높이. 0이 건물 바닥, 1이 지붕 꼭대기. */
  bottom: number;
  /** 조각의 높이. 건물 높이가 1이다. */
  height: number;
  /** 벽에서 앞으로 띄우는 거리. 건물 높이가 1이다. */
  lift: number;
}

/** 모델 좌표로 푼 조각의 가운데 위치와 크기. */
export interface FittingRect {
  x: number;
  y: number;
  width: number;
  height: number;
  lift: number;
}

/**
 * 건물의 겉 상자 안에서 조각이 놓일 자리를 구한다. 건물 정면은 +Z를 본다.
 * aspect는 조각 그림의 가로/세로 비율이고, 조각의 폭은 높이에 이 비율을 곱해 정한다.
 */
export function fittingRect(box: Box3D, spot: FittingSpot, aspect: number): FittingRect {
  const tall = box.max.y - box.min.y;
  const wide = box.max.x - box.min.x;
  const height = spot.height * tall;
  return {
    x: box.min.x + spot.across * wide,
    y: box.min.y + spot.bottom * tall + height / 2,
    width: height * aspect,
    height,
    lift: spot.lift * tall,
  };
}
