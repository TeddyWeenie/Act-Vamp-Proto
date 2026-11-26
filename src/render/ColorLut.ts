import type { ColorMap } from './colorMath';

/** 한 축의 격자 간격(0~255 기준). 4면 격자점이 65개다. */
const STEP = 4;
const SIZE = 256 / STEP + 1;

/**
 * 색 옮기기를 미리 계산해 둔 표. 텍스처는 수백만 점이라 점마다 계산하지 않고,
 * 가까운 격자점의 이동량(옮긴 색 − 원래 색)만 더한다. 이동량은 색에 따라 천천히 변하므로 무늬가 뭉개지지 않는다.
 */
export class ColorLut {
  private readonly shifts: Int16Array;

  constructor(map: ColorMap) {
    this.shifts = new Int16Array(SIZE * SIZE * SIZE * 3);
    let at = 0;
    for (let r = 0; r < SIZE; r++) {
      for (let g = 0; g < SIZE; g++) {
        for (let b = 0; b < SIZE; b++) {
          const from = [r, g, b].map((v) => Math.min(255, v * STEP));
          const to = map.map([from[0] / 255, from[1] / 255, from[2] / 255]);
          for (let c = 0; c < 3; c++) this.shifts[at++] = Math.round(to[c] * 255) - from[c];
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
      // Uint8ClampedArray가 0~255 밖의 값을 잘라 준다.
      pixels[i] += this.shifts[at];
      pixels[i + 1] += this.shifts[at + 1];
      pixels[i + 2] += this.shifts[at + 2];
    }
  }
}
