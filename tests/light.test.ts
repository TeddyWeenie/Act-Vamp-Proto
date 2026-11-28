import { describe, expect, it } from 'vitest';
import { layoutLightMap, toLightMapCell } from '../src/game/logic/light';

describe('빛 지도', () => {
  const layout = layoutLightMap({ minX: -20, maxX: 20, minZ: -10, maxZ: 10 }, 4, 3);

  it('맵 경계에 여유를 둘러 덮는다', () => {
    expect(layout.minX).toBe(-24);
    expect(layout.minZ).toBe(-14);
    expect(layout.spanX).toBe(48);
    expect(layout.spanZ).toBe(28);
    expect(layout.columns).toBe(144);
    expect(layout.rows).toBe(84);
  });

  it('지면의 점을 지도 칸으로 옮긴다', () => {
    expect(toLightMapCell(layout, { x: -24, z: -14 })).toEqual({ column: 0, row: 0 });
    expect(toLightMapCell(layout, { x: 24, z: 14 })).toEqual({ column: 144, row: 84 });
    const centre = toLightMapCell(layout, { x: 0, z: 0 });
    expect(centre.column).toBeCloseTo(72);
    expect(centre.row).toBeCloseTo(42);
  });
});
