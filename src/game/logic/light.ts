/**
 * 장면의 빛을 지면 위의 지도로 다루기 위한 계산. 렌더러에 의존하지 않는 순수 함수만 둔다.
 * 지도 한 칸은 "그 자리가 햇빛을 받는가"를 담고, 캐릭터는 발밑 칸을 읽어 밝기와 색을 정한다.
 */
import type { Bounds } from './movement';
import type { Vec2 } from './view';

/** 빛 지도가 덮는 지면과 그림 크기. */
export interface LightMapLayout {
  readonly minX: number;
  readonly minZ: number;
  /** 덮는 월드 크기. */
  readonly spanX: number;
  readonly spanZ: number;
  /** 지도 그림의 가로세로 칸 수. */
  readonly columns: number;
  readonly rows: number;
}

/** 맵 경계에 여유를 둘러 지도를 잡는다. cellsPerUnit이 작을수록 그림자 가장자리가 부드럽게 번진다. */
export function layoutLightMap(bounds: Bounds, margin: number, cellsPerUnit: number): LightMapLayout {
  const spanX = bounds.maxX - bounds.minX + margin * 2;
  const spanZ = bounds.maxZ - bounds.minZ + margin * 2;
  return {
    minX: bounds.minX - margin,
    minZ: bounds.minZ - margin,
    spanX,
    spanZ,
    columns: Math.max(1, Math.round(spanX * cellsPerUnit)),
    rows: Math.max(1, Math.round(spanZ * cellsPerUnit)),
  };
}

/** 지면 위의 점이 지도 그림의 어느 칸에 놓이는지(소수 포함). 가로는 X, 세로는 Z를 따른다. */
export function toLightMapCell(
  layout: LightMapLayout,
  point: Readonly<Vec2>,
): { column: number; row: number } {
  return {
    column: ((point.x - layout.minX) / layout.spanX) * layout.columns,
    row: ((point.z - layout.minZ) / layout.spanZ) * layout.rows,
  };
}
