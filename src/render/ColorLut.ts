import type { ColorMap } from './colorMath';

/** 한 축의 격자 간격(0~255 기준). 4면 격자점이 65개다. */
const STEP = 4;
const SIZE = 256 / STEP + 1;

/**
 * 색 바꾸기를 미리 계산해 둔 표. 텍스처는 수백만 점이라 점마다 계산하지 않고,
 * 가장 가까운 격자점에 적어 둔 색을 그대로 가져온다.
 */
export class ColorLut {
  private readonly table: Uint8Array;

  constructor(map: ColorMap) {
    this.table = new Uint8Array(SIZE * SIZE * SIZE * 3);
    const level = (index: number) => Math.min(255, index * STEP) / 255;
    let at = 0;
    for (let r = 0; r < SIZE; r++) {
      for (let g = 0; g < SIZE; g++) {
        for (let b = 0; b < SIZE; b++) {
          const to = map.map([level(r), level(g), level(b)]);
          for (let c = 0; c < 3; c++) this.table[at++] = Math.round(Math.min(1, Math.max(0, to[c])) * 255);
        }
      }
    }
  }

  /** RGBA 8비트 화소 배열을 그 자리에서 고친다. 알파는 건드리지 않는다. */
  repaint(pixels: Uint8ClampedArray): void {
    const half = STEP >> 1;
    for (let i = 0; i < pixels.length; i += 4) {
      const r = (pixels[i] + half) >> 2;
      const g = (pixels[i + 1] + half) >> 2;
      const b = (pixels[i + 2] + half) >> 2;
      const at = ((r * SIZE + g) * SIZE + b) * 3;
      pixels[i] = this.table[at];
      pixels[i + 1] = this.table[at + 1];
      pixels[i + 2] = this.table[at + 2];
    }
  }
}
